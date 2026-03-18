// dictionary-db.js - 專門處理大型路線字典的本地資料庫 (IndexedDB + LocalStorage 備援)

const DB_NAME = 'TsukinDictDB';
const STORE_NAME = 'routeDictionary';
const DB_VERSION = 1;
const FALLBACK_DATA_KEY = 'Tsukin_Dict_Data_Fallback';
const FALLBACK_VERSION_KEY = 'Tsukin_Dict_Version_Fallback';

let useFallback = false;

// ==========================================
// 1. 備用方案 (LocalStorage)
// ==========================================
function getFallbackDict() {
    try {
        const version = localStorage.getItem(FALLBACK_VERSION_KEY);
        const dataStr = localStorage.getItem(FALLBACK_DATA_KEY);
        if (version && dataStr) {
            return { version: version, routes: JSON.parse(dataStr) };
        }
    } catch (e) {
        console.error('[Dict-Fallback] 讀取備用字典失敗', e);
    }
    return null;
}

function saveFallbackDict(version, routes) {
    try {
        localStorage.setItem(FALLBACK_VERSION_KEY, version);
        localStorage.setItem(FALLBACK_DATA_KEY, JSON.stringify(routes));
        console.log(`[Dict-Fallback] 字典已更新至備用空間 (版本: ${version})`);
    } catch (e) {
        console.error('[Dict-Fallback] 備用空間寫入失敗 (儲存空間可能已滿)', e);
    }
}

// ==========================================
// 2. 核心 IndexedDB 初始化
// ==========================================
function initDictDB() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            useFallback = true;
            return resolve(null);
        }

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                console.warn('[Dict-DB] IndexedDB 遭系統拒絕，啟動 LocalStorage 備援');
                useFallback = true;
                resolve(null); 
            };
            
            request.onsuccess = (e) => resolve(e.target.result);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // 我們只需要存一筆 master 資料，所以 keyPath 設為 id
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        } catch (err) {
            useFallback = true;
            resolve(null);
        }
    });
}

// 讀取本地 IndexedDB 字典
async function getLocalDict() {
    const db = await initDictDB();
    if (useFallback || !db) return getFallbackDict();

    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('master_dict'); // 我們固定用 'master_dict' 當作主鍵
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => {
                useFallback = true;
                resolve(getFallbackDict());
            };
        } catch (err) {
            useFallback = true;
            resolve(getFallbackDict());
        }
    });
}

// 寫入本地 IndexedDB 字典
async function saveLocalDict(version, routes) {
    const db = await initDictDB();
    
    if (useFallback || !db) {
        saveFallbackDict(version, routes);
        return;
    }

    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // 將整包字典包裝成一個物件存入
            const dataToSave = {
                id: 'master_dict',
                version: version,
                routes: routes,
                updatedAt: Date.now()
            };

            const request = store.put(dataToSave);
            request.onsuccess = () => {
                console.log(`[Dict-DB] 路線字典已成功存入 IndexedDB (版本: ${version})`);
                resolve();
            };
            request.onerror = () => {
                useFallback = true;
                saveFallbackDict(version, routes);
                resolve();
            };
        } catch (err) {
            useFallback = true;
            saveFallbackDict(version, routes);
            resolve();
        }
    });
}

// ==========================================
// 3. 🟢 外部呼叫主入口：智慧同步引擎
// ==========================================
export async function syncAndLoadDictionary(apiUrl) {
    // 先抓出本地現有的字典與版本號
    const localData = await getLocalDict();
    const localVersion = localData ? localData.version : null;

    try {
        // 每次都去敲後端，檢查有沒有新版本
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('伺服器連線失敗');
        
        const apiData = await response.json();
        
        // ✨ 比對版本號
        if (!localData || apiData.version !== localVersion) {
            console.log("🔄 發現新版路線字典，下載並非同步更新本地資料庫中...");
            
            // 寫入資料庫
            await saveLocalDict(apiData.version, apiData.routes);
            window.MasterRouteDictionary = apiData.routes;
            
        } else {
            console.log("✅ 路線字典已是最新版，直接使用本地 DB 快取");
            window.MasterRouteDictionary = localData.routes;
        }
    } catch (error) {
        console.warn("⚠️ 無法連線至伺服器獲取字典，嘗試使用本地舊快取...", error);
        
        // 如果斷網了，至少拿出本地資料庫的舊資料擋著用
        if (localData && localData.routes) {
            window.MasterRouteDictionary = localData.routes;
        } else {
            console.error("致命錯誤：沒有任何可用的路線字典！");
            window.MasterRouteDictionary = {};
        }
    }
    
    return window.MasterRouteDictionary;
}