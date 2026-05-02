// ============================================================
// WORKBOX SW COMPLETO - VERSÃO COM CONFIRMAÇÃO DE CACHE E CORREÇÃO DE CONFLITO
// ============================================================

if (!self.define) {
  let e, s = {};
  const a = (a, i) => (a = new URL(a + ".js", i).href,
    s[a] || new Promise(s => {
      if ("document" in self) {
        const e = document.createElement("script");
        e.src = a;
        e.onload = s;
        document.head.appendChild(e);
      } else {
        importScripts(a);
        s();
      }
    }).then(() => {
      let e = s[a];
      if (!e) throw new Error(`Module ${a} didn’t register`);
      return e;
    })
  );

  self.define = (i, r) => {
    const n = e || ("document" in self ? document.currentScript.src : "") || location.href;
    if (s[n]) return;
    let t = {};
    const c = e => a(e, n);
    const o = { module: { uri: n }, exports: t, require: c };
    s[n] = Promise.all(i.map(e => o[e] || c(e))).then(e => (r(...e), t));
  };
}

define(["./workbox-58cdce56"], function (e) {
  "use strict";

  self.skipWaiting();
  e.clientsClaim();

  // ============================================================
  // 🔥 PRECACHE
  // ============================================================
  e.precacheAndRoute(self.__WB_MANIFEST || [], {
    ignoreURLParametersMatching: []
  });

  e.cleanupOutdatedCaches();

  // ============================================================
  // 🔥 DASHBOARD PRINCIPAL (CRÍTICO) - ALTERADO PARA CacheFirst
  // ============================================================
  e.registerRoute(
    ({ url }) => url.pathname === "/dashboard",
    new e.CacheFirst({
      cacheName: "dashboard-main",
      networkTimeoutSeconds: 2,
      plugins: [
        new e.ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 604800 }),
        {
          handlerDidError: async () => {
            console.log("[SW] fallback dashboard");
            return caches.match("/dashboard");
          }
        }
      ]
    }),
    "GET"
  );

  // ============================================================
  // 🔥 PACIENTES (CORE DO OFFLINE)
  // ============================================================
  e.registerRoute(
    ({ url }) => url.pathname.includes("/dashboard/encontrista/"),
    new e.CacheFirst({
      cacheName: "dashboard-patient-pages",
      matchOptions: { ignoreSearch: true },
      plugins: [
        new e.ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 604800 }),
        {
          handlerDidError: async ({ request }) => {
            const clean = new URL(request.url).pathname;
            console.log("[SW] fallback paciente:", clean);
            return caches.match(clean);
          }
        }
      ]
    }),
    "GET"
  );

  // ============================================================
  // 🔥 OUTRAS ROTAS DO DASHBOARD (SEM CONFLITO)
  // ============================================================
  e.registerRoute(
    ({ url }) =>
      url.pathname.startsWith("/dashboard") &&
      !url.pathname.includes("/encontrista/") &&
      url.pathname !== "/dashboard",
    new e.StaleWhileRevalidate({
      cacheName: "dashboard-pages",
      plugins: [
        new e.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 604800 })
      ]
    }),
    "GET"
  );

  // ============================================================
  // 🔥 NAVEGAÇÃO GLOBAL (COM EXCLUSÕES DAS ROTAS DE DASHBOARD)
  // ============================================================
  e.registerRoute(
    ({ request, url }) =>
      request.mode === "navigate" &&
      url.pathname !== "/dashboard" &&
      !url.pathname.includes("/dashboard/encontrista/"),
    new e.NetworkFirst({
      cacheName: "pages-cache",
      networkTimeoutSeconds: 2,
      plugins: [
        new e.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 604800 }),
        {
          handlerDidError: async ({ request }) => {
            const clean = new URL(request.url).pathname;
            console.log("[SW] fallback navegação:", clean);
            return caches.match(clean);
          }
        }
      ]
    }),
    "GET"
  );

  // ============================================================
  // 🔥 STATIC
  // ============================================================
  e.registerRoute(
    /\.(?:js|css|mjs|json)$/,
    new e.StaleWhileRevalidate({
      cacheName: "static-resources"
    })
  );

  // ============================================================
  // 🔥 IMAGENS
  // ============================================================
  e.registerRoute(
    /\.(?:png|jpg|jpeg|svg|webp|gif)$/,
    new e.CacheFirst({
      cacheName: "images"
    })
  );

  // ============================================================
  // 🔥 CACHE MANUAL VIA CLIENT
  // ============================================================
  self.addEventListener("message", (event) => {
    const data = event.data;
    const clientId = event.source?.id;

    // ===============================
    // 🔥 PACIENTE
    // ===============================
    if (data.type === "CACHE_PATIENT_PAGE") {
      event.waitUntil((async () => {
        const cache = await caches.open("dashboard-patient-pages");

        const response = await fetch(data.url, {
          credentials: "same-origin",
          headers: {
            "RSC": "1",
            "Next-Router-Prefetch": "1",
            "Next-Router-State-Tree": ""
          }
        });

        if (!response.ok) return;

        const clean = new URL(data.url).pathname;

        await cache.put(clean, response.clone());

        // Flight (Next.js)
        const match = clean.match(/\/dashboard\/encontrista\/(\d+)/);
        if (match) {
          const id = match[1];
          const buildId = self.__NEXT_DATA__?.buildId || "";
          const flight = `/_next/data/${buildId}/dashboard/encontrista/${id}.json`;
          await cache.put(flight, response.clone());
        }

        notifyClients(clean);
        confirmToClient(clientId, clean);
      })());
    }

    // ===============================
    // 🔥 DASHBOARD CORRETO
    // ===============================
    if (data.type === "CACHE_DASHBOARD") {
      event.waitUntil((async () => {
        const cache = await caches.open("dashboard-main");

        const response = await fetch(data.url, {
          credentials: "same-origin"
        });

        if (!response.ok) return;

        const clean = new URL(data.url).pathname;

        await cache.put(clean, response.clone());

        notifyClients(clean);
        confirmToClient(clientId, clean);
      })());
    }

    // ===============================
    // 🔥 DASHBOARD (via CACHE_PAGE - mantido)
    // ===============================
    if (data.type === "CACHE_PAGE") {
      event.waitUntil((async () => {
        const cache = await caches.open("dashboard-main");

        const response = await fetch(data.url, {
          credentials: "same-origin"
        });

        if (!response.ok) return;

        const clean = new URL(data.url).pathname;

        await cache.put(clean, response.clone());

        notifyClients(clean);
        confirmToClient(clientId, clean);
      })());
    }
  });

  // ============================================================
  // 🔥 ACK PARA CLIENT (broadcast)
  // ============================================================
  function notifyClients(url) {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "CACHE_DONE",
          url
        });
      });
    });
  }

  // ============================================================
  // 🔥 CONFIRMAÇÃO ESPECÍFICA PARA O CLIENTE ORIGEM
  // ============================================================
  function confirmToClient(clientId, url) {
    if (!clientId) return;
    self.clients.get(clientId).then((client) => {
      if (client) {
        client.postMessage({
          type: "CACHE_CONFIRMED",
          url: url,
          success: true
        });
      }
    });
  }

  // ============================================================
  // 🔥 ACTIVATE
  // ============================================================
  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });

});