// ============================================================================
// data/db-settings.js - 顯示設定專用儲存引擎 (IndexedDB + LocalStorage 零延遲備援)
// ============================================================================

export async function saveDisplaySetting(key, value) {
    // 1. LocalStorage 備援 (極速寫入，確保下次載入時畫面不閃爍)
    try { localStorage.setItem(`tsukin_setting_${key}`, JSON.stringify(value)); } catch(e) {}

    // 2. IndexedDB 永久儲存 (獨立的 Settings Store，不干擾卡片資料)
    try {
        const request = indexedDB.open('TsukinSettingsDB', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('settings', 'readwrite');
            tx.objectStore('settings').put(value, key);
        };
    } catch(e) {
        console.warn("IndexedDB 儲存失敗，已使用 LocalStorage 備援", e);
    }
}

export async function getDisplaySetting(key, defaultValue) {
    return new Promise((resolve) => {
        // 優先嘗試從 LocalStorage 「瞬間」讀取 (對 UI 渲染最有利)
        try {
            const localVal = localStorage.getItem(`tsukin_setting_${key}`);
            if (localVal !== null) return resolve(JSON.parse(localVal));
        } catch(e) {}

        // 備用：如果 LocalStorage 遺失，從 IndexedDB 讀取
        try {
            const request = indexedDB.open('TsukinSettingsDB', 1);
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('settings')) return resolve(defaultValue);
                const tx = db.transaction('settings', 'readonly');
                const getReq = tx.objectStore('settings').get(key);
                getReq.onsuccess = () => resolve(getReq.result !== undefined ? getReq.result : defaultValue);
                getReq.onerror = () => resolve(defaultValue);
            };
            request.onerror = () => resolve(defaultValue);
        } catch(e) {
            resolve(defaultValue);
        }
    });
}