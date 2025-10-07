/***********************
 content.js
 - Injected into LinkedIn
 - Extracts session cookies (JSESSIONID & li_at)
 - Sends CSRF + session info to background.js
 - Handles invalidated extension context safely
 ***********************/

/* global chrome */

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function sendSessionInfo() {
  const jsession = getCookie("JSESSIONID");   // CSRF token cookie
  const liAt = getCookie("li_at");            // main auth cookie

  const csrf = jsession ? jsession.replace(/"/g, "") : null;

  if (csrf) {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
      try {
        chrome.runtime.sendMessage(
          { type: "LI_SESSION", csrf, liAt },
          (resp) => {
            if (chrome.runtime.lastError) {
              console.warn("⚠️ Could not send CSRF:", chrome.runtime.lastError.message);
            } else {
              console.log("✅ CSRF + session info sent to background:", { csrf, liAt }, "ack:", resp);
            }
          }
        );
      } catch (err) {
        console.warn("⚠️ Extension context invalidated, skipping send");
      }
    } else {
      console.warn("⚠️ Extension runtime not available (probably reloaded).");
    }
  } else {
    console.log("⚠️ CSRF token not found");
  }
}

// Confirm injection
console.log("✅ Content script loaded on", window.location.href);

// Send immediately
sendSessionInfo();

// Refresh every 30s (in case cookies rotate or refresh)
setInterval(sendSessionInfo, 30000);
