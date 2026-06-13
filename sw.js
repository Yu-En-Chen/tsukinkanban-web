const CACHE_NAME = 'tsukin-kanban-cache-v1'; // 如果更新了架構，把 v1 改 v2 強制刷新

// 1. 核心預先快取：只放最基礎、絕對不能失敗的檔案
const coreUrls = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/script.js'
];

// 安裝階段：寫入核心骨架
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] 預先快取核心檔案');
      return cache.addAll(coreUrls);
    })
  );
  self.skipWaiting(); // 強制立刻接管控制權
});

// 啟動階段：清除舊版快取（如果你以後改了 CACHE_NAME）
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截請求階段：邊走邊抓的魔法就在這裡
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // 規則 A：絕對不快取外部 API 資料（保持即時性）
  if (requestUrl.hostname.includes('api.odpt.org') || requestUrl.hostname.includes('api.tsukinkanban.com')) {
    return; // 直接放行，交給網路
  }

  // 規則 B：攔截所有自己的靜態檔案 (js, css, data, img)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. 如果快取裡已經有了，直接秒回傳（離線也能開）
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. 如果快取沒有，去網路抓
      return fetch(event.request).then(networkResponse => {
        // 檢查抓回來的是不是正常的檔案（狀態碼 200）
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // 3. 判斷這是不是我們想要「自動備份」的資料夾
        const path = requestUrl.pathname;
        if (path.includes('/js/') || path.includes('/css/') || path.includes('/data/') || path.includes('/img/')) {
          
          // ⚠️ 資深工程師的細節：Response 是一個 Stream（串流），只能讀取一次。
          // 我們必須複製 (clone) 一份，一份存進快取，一份還給瀏覽器顯示。
          const responseToCache = networkResponse.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] 自動動態快取:', path);
            cache.put(event.request, responseToCache);
          });
        }

        // 最後把網路抓到的原始檔案還給網頁
        return networkResponse;
        
      }).catch(err => {
        // 如果斷網了，而且快取裡剛好也沒有這個檔案，會走到這裡
        console.warn('[Service Worker] 離線且無快取:', event.request.url);
        // 你可以在這裡實作一個統一的「離線圖片」回傳，但以你的架構目前不用
      });
    })
  );
});