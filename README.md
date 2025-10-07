---

# 🧩 LinkedIn Connections Dashboard — Chrome Extension


---

## 📘 Overview

This project was developed as part of the **LinkedIn Connections Dashboard Take-Home Assignment**.
The goal was to build a Chrome Extension that fetches a user’s LinkedIn connections and displays them in a clean, responsive dashboard, implementing caching, throttling, and filtering features.

Since LinkedIn recently migrated most of its user data access behind **private, dynamically generated GraphQL endpoints** (and deprecated the older public Voyager REST endpoints), direct fetching of live connections is no longer feasible through a Chrome extension without breaching LinkedIn’s automation policies.

Therefore, this solution implements the **complete extension architecture and functionality**, but uses **mocked data** (`connections.json`) to simulate LinkedIn’s API response safely — preserving the technical depth and logic the task requires.

---

## 🚀 Features Implemented

✅ **Chrome Extension Architecture**

* Background service worker (`background.js`) managing caching and throttled requests
* Content script (`content.js`) responsible for cookie/session detection
* Popup UI built using **React (Vite)** + **TailwindCSS**

✅ **Caching Layer**

* Implemented via `chrome.storage.local`
* Time-to-live (TTL): 7 minutes
* Person and company data cached separately

✅ **Request Queue & Throttling**

* Custom queue class ensures serialized execution of API calls
* Adds random delay (300–1000 ms) to mimic human browsing
* Supports retries and exponential back-off

✅ **Dashboard UI**

* Displays connection details: profile picture, name, position, and company
* Filter by company
* Fully responsive Tailwind layout

✅ **Mock API Simulation**

* `connections.json` (in `/public`) serves as the data source instead of live LinkedIn requests
* The background script fetches this file using `chrome.runtime.getURL()` and applies the same caching + throttling logic

---

## 🧠 Architecture

```
linkedin-connections-extension/
│
├── manifest.json
├── vite.config.js
├── postcss.config.js
├── tailwind.config.js
│
├── public/
│   ├── background.js
│   ├── content.js
│   ├── connections.json      ← Mock LinkedIn connections data
│
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── components/
    │   └── ConnectionItem.jsx
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/atharvanaik/linkedin-connections-dashboard.git
cd linkedin-connections-dashboard
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Build for Production

```bash
npm run build
```

### 4️⃣ Load Extension in Chrome

1. Open **chrome://extensions/**
2. Enable **Developer Mode**
3. Click **“Load unpacked”**
4. Select the `dist/` folder generated after build
5. Click the extension icon on LinkedIn — you’ll see the dashboard

---

## 🧩 Caching Strategy

* Data is stored in `chrome.storage.local` with timestamps.
* When data is fetched:

  * If cache exists and is younger than 7 minutes → data is loaded instantly.
  * If expired → it is re-fetched and re-cached.
* Each dataset (connections, company, person) is cached independently.

---

## 🕐 Throttling & Queue Implementation

Implemented via a `RequestQueue` class that:

* Enqueues every API (mock) request.
* Waits a random 300–1000 ms between executions.
* Retries up to 3 times with exponential back-off.
* Ensures rate-limit compliance if real APIs were used.

---

## 🧪 Mock Data

The extension fetches `connections.json` to simulate LinkedIn’s connection API.

Example record:

```json
{
  "id": "1",
  "fullName": "Atharva Naik",
  "profilePicture": "https://randomuser.me/api/portraits/men/32.jpg",
  "position": "Software Engineer",
  "companyName": "Guardwel Industries",
  "companyId": "101"
}
```

---

## 🧱 Limitations & Assumptions

* Live LinkedIn data fetching is not included due to **API deprecation and restricted access**.
* All functionality (fetch, cache, queue, UI, filtering) is implemented with **mocked data** to safely demonstrate full extension flow.
* If LinkedIn exposes a stable GraphQL API in the future, only `getConnections()` in `background.js` would need to be updated.

---

## 📚 What Was Reverse-Engineered

* The original Voyager REST endpoint:

  ```
  https://www.linkedin.com/voyager/api/relationships/connections?q=viewer&start=0&count=50
  ```
* However, this now returns HTTP 400/403 due to private GraphQL migration.
* Verified headers, CSRF token patterns, and cookies through DevTools to understand LinkedIn’s session model, but refrained from any scraping.

---

## 🧭 Conclusion

This implementation delivers a **production-ready Chrome Extension structure** demonstrating:

* Proper service-worker communication
* Effective caching & throttling logic
* Robust UI for viewing, filtering, and managing data
  Even though the LinkedIn API access is simulated, the project fulfills the architectural and technical objectives outlined in the assignment.

---

## 👨‍💻 Author

**Athrva Naik**
B.E. Information Technology, Thakur College of Engineering and Technology
[LinkedIn](https://www.linkedin.com/in/athrvanaik/) • [GitHub](https://github.com/athrvanaik)

---

Would you like me to also make a **one-paragraph README summary** (for the GitHub repo description section) that captures this in 3–4 sentences?
