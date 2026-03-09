// db.js - 使用者偏好設定的本地資料庫引擎 (IndexedDB 搭配 LocalStorage 備援)

const DB_NAME = 'TsukinKanbanDB';
const STORE_NAME = 'userPreferences';
const DB_VERSION = 1;
const FALLBACK_KEY = 'TsukinKanban_Preferences_Fallback';

// 🟢 標記是否被 iOS 阻擋，若被阻擋則全域切換為備用方案
let useFallback = false;

// ==========================================
// 備用方案 (LocalStorage) 的讀寫邏輯
// ==========================================
function getFallbackData() {
    try {
        const raw = localStorage.getItem(FALLBACK_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error('[DB-Fallback] 讀取備用空間失敗', e);
        return {};
    }
}

function saveFallbackData(data) {
    try {
        const map = getFallbackData();
        map[data.id] = data; // 以 id 為 key 存入補丁資料
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(map));
        console.log(`[DB-Fallback] 備用空間寫入成功: ${data.id}`);
    } catch (e) {
        console.error('[DB-Fallback] 備用空間寫入失敗 (儲存空間可能已滿)', e);
    }
}

function removeFallbackData(id) {
    try {
        const map = getFallbackData();
        delete map[id];
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(map));
    } catch (e) {}
}


// ==========================================
// 核心 IndexedDB 邏輯 (含自動降級機制)
// ==========================================

// 1. 初始化並開啟資料庫
export function initDB() {
    return new Promise((resolve) => {
        // 如果瀏覽器連 IndexedDB 都不支援，直接進備用模式
        if (!window.indexedDB) {
            useFallback = true;
            return resolve(null);
        }

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            // 🟢 iOS 阻擋攔截點：如果開啟失敗(如無痕模式)，自動切換備用方案
            request.onerror = (e) => {
                console.warn('[DB] IndexedDB 遭系統拒絕存取，已啟動 LocalStorage 備援機制');
                useFallback = true;
                resolve(null); 
            };
            
            request.onsuccess = (e) => resolve(e.target.result);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        } catch (err) {
            console.warn('[DB] 建立資料庫發生例外異常，已啟動備援機制');
            useFallback = true;
            resolve(null);
        }
    });
}

// 2. 獲取所有使用者的自訂偏好設定
export async function getAllUserPreferences() {
    try {
        const db = await initDB();
        
        // 如果標記為備用模式，直接回傳 LocalStorage 資料
        if (useFallback || !db) {
            return getFallbackData();
        }

        return new Promise((resolve) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const prefsMap = {};
                    request.result.forEach(item => { prefsMap[item.id] = item; });
                    resolve(prefsMap);
                };
                
                // 🟢 讀取時發生 iOS 阻擋，降級處理
                request.onerror = () => {
                    console.warn('[DB] 讀取事務失敗，切換至備援資料');
                    useFallback = true;
                    resolve(getFallbackData());
                };
            } catch (err) {
                console.warn('[DB] 建立讀取事務失敗，切換至備援資料');
                useFallback = true;
                resolve(getFallbackData());
            }
        });
    } catch (error) {
        console.error('[DB] 嚴重錯誤，回傳空資料庫以免崩潰', error);
        return {}; 
    }
}

// 3. 儲存或更新單一路線的自訂設定
export async function saveRoutePreference(id, customName, customHex) {
    const db = await initDB();
    const data = { 
        id: id, 
        customName: customName, 
        customHex: customHex, 
        updatedAt: Date.now() 
    };

    // 如果已經是備用模式，直接寫入 LocalStorage
    if (useFallback || !db) {
        saveFallbackData(data);
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data);
            
            request.onsuccess = () => {
                console.log(`[DB] 路線 ${id} 的自訂設定已儲存 (IndexedDB)`);
                resolve();
            };
            
            // 🟢 寫入時發生 iOS 阻擋，自動把這筆資料轉存 LocalStorage
            request.onerror = () => {
                console.warn('[DB] IndexedDB 寫入失敗，轉交備援機制處理');
                useFallback = true;
                saveFallbackData(data);
                resolve();
            };
        } catch (err) {
            console.warn('[DB] 建立寫入事務失敗，轉交備援機制處理');
            useFallback = true;
            saveFallbackData(data);
            resolve();
        }
    });
}

// 4. 重置/刪除單一路線的自訂設定
export async function resetRoutePreference(id) {
    const db = await initDB();
    
    if (useFallback || !db) {
        removeFallbackData(id);
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => {
                useFallback = true;
                removeFallbackData(id);
                resolve();
            };
        } catch (err) {
            useFallback = true;
            removeFallbackData(id);
            resolve();
        }
    });
}