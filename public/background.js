/***********************
 background.js (MV3 service worker)
 - Request queue with randomized delay
 - Caching using chrome.storage.local with TTL
 - Handles messages: GET_CONNECTIONS, GET_PERSON, GET_COMPANY, LI_SESSION
 ***********************/

/* global chrome */

const TTL_MS = 7 * 60 * 1000; // 7 minutes
const MAX_RETRIES = 3;
let csrfToken = null;
let liAtToken = null; // for future use if needed

// ----- util: chrome.storage.local helpers -----
function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => resolve(res[key]));
  });
}
function storageSet(key, value) {
  return new Promise((resolve) => {
    const obj = {};
    obj[key] = value;
    chrome.storage.local.set(obj, () => resolve());
  });
}
function storageRemove(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], () => resolve());
  });
}

// ----- cache helpers -----
async function getCache(key, ttl = TTL_MS) {
  const rec = await storageGet(key);
  if (!rec) return null;
  try {
    if (Date.now() - rec.ts < ttl) return rec.data;
    await storageRemove(key);
    return null;
  } catch {
    await storageRemove(key);
    return null;
  }
}
async function setCache(key, data) {
  await storageSet(key, { ts: Date.now(), data });
}

// ----- RequestQueue -----
class RequestQueue {
  constructor(maxRetries = MAX_RETRIES) {
    this.q = [];
    this.running = false;
    this.maxRetries = maxRetries;
  }

  enqueue(id, fn) {
    return new Promise((resolve, reject) => {
      this.q.push({ id, fn, resolve, reject, retries: 0 });
      this._next();
    });
  }

  async _next() {
    if (this.running) return;
    const task = this.q.shift();
    if (!task) return;
    this.running = true;
    try {
      const delay = 300 + Math.floor(Math.random() * 700); // 300–1000ms
      await new Promise((r) => setTimeout(r, delay));
      const res = await task.fn();
      task.resolve(res);
    } catch (err) {
      task.retries++;
      if (task.retries <= this.maxRetries) {
        const backoff =
          500 * Math.pow(2, task.retries) + Math.floor(Math.random() * 300);
        console.warn(
          `⚠️ Retry ${task.retries} for task ${task.id} after ${backoff}ms`
        );
        setTimeout(() => this.q.unshift(task), backoff);
      } else {
        task.reject(err);
      }
    } finally {
      this.running = false;
      setTimeout(() => this._next(), 0);
    }
  }
}

const rq = new RequestQueue();

// ----- fetch helper using user's session -----
// ----- fetch helper using user's session -----
async function fetchWithSession(url, opts = {}) {
  const headers = new Headers(opts.headers || {});

  // Required LinkedIn headers
  if (csrfToken) {
    headers.set("csrf-token", csrfToken);
  }
  headers.set("x-restli-protocol-version", "2.0.0");
  headers.set("accept", "application/vnd.linkedin.normalized+json+2.1");
  headers.set("x-li-lang", "en_US");
  headers.set(
    "x-li-track",
    JSON.stringify({
      clientVersion: "1.11.*",
      osName: "web",
      timezoneOffset: -new Date().getTimezoneOffset(),
    })
  );

  // Extra: add same-origin cookies
  const res = await fetch(url, {
    ...opts,
    headers,
    credentials: "include", // ensures cookies like JSESSIONID, li_at are sent
    mode: "cors",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("❌ Fetch error", res.status, url, "csrf:", csrfToken, "body:", text);
    throw new Error(`Fetch failed ${res.status}: ${text}`);
  }

  try {
    return await res.json();
  } catch {
    throw new Error("Invalid JSON response from LinkedIn");
  }
}



// ----- LinkedIn endpoints -----
const CONNECTIONS_ENDPOINT =
  "https://www.linkedin.com/voyager/api/relationships/connections?q=viewer&start=0&count=50";

function PERSON_ENDPOINT(personId) {
  return `https://www.linkedin.com/voyager/api/identity/profiles/${encodeURIComponent(
    personId
  )}`;
}
function COMPANY_ENDPOINT(companyId) {
  return `https://www.linkedin.com/voyager/api/companies/${encodeURIComponent(
    companyId
  )}`;
}

// ----- Methods -----
// ----- Mocked LinkedIn connections -----
async function getConnections() {
  const cacheKey = "cache:connections:list";
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log("✅ Loaded connections from cache");
    return cached;
  }

  console.log("🌐 Fetching mock connections (local)");
  const data = await fetch(chrome.runtime.getURL("public/connections.json")).then((r) => r.json());


  // Simulate LinkedIn-like throttling using RequestQueue
  const persons = await Promise.all(
    data.elements.map((item, index) =>
      rq.enqueue(item.id, async () => {
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));
        console.log(`✅ Processed ${item.fullName}`);
        return item;
      })
    )
  );

  await setCache(cacheKey, persons);
  console.log("💾 Cached connections for 7 minutes");
  return persons;
}


async function getPersonDetails(personId) {
  const cacheKey = `cache:person:${personId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const all = await getConnections();
  const person = all.find((p) => p.id === personId);
  await setCache(cacheKey, person);
  return person;
}

async function getCompanyDetails(companyId) {
  const cacheKey = `cache:company:${companyId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const all = await getConnections();
  const company = all.find((p) => p.companyId === companyId);
  const companyObj = {
    id: companyId,
    name: company?.companyName || "Unknown Company",
    logoUrl: `https://logo.clearbit.com/${(
      company?.companyName || "example"
    ).replace(/\s+/g, "").toLowerCase()}.com`
  };
  await setCache(cacheKey, companyObj);
  return companyObj;
}


// ----- Unified message listener -----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "GET_CONNECTIONS") {
        const list = await getConnections();
        sendResponse({ ok: true, data: list });
      } else if (msg?.type === "GET_PERSON") {
        const p = await getPersonDetails(msg.id);
        sendResponse({ ok: true, data: p });
      } else if (msg?.type === "GET_COMPANY") {
        const c = await getCompanyDetails(msg.id);
        sendResponse({ ok: true, data: c });
      } else if (msg?.type === "LI_SESSION") {
        csrfToken = msg.csrf || null;
        liAtToken = msg.liAt || null;
        console.log("✅ background: CSRF token updated:", csrfToken);
        if (liAtToken) console.log("✅ background: li_at token received");
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (err) {
      console.error("❌ Error handling message", msg, err);
      sendResponse({ ok: false, error: err.message || String(err) });
    }
  })();

  return true; // async
});
