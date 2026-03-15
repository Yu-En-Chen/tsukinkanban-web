// db-add-panel.js - 新增與管理卡片的獨立沙盒資料庫 (Sandbox DB)

// 引入主資料庫的讀寫功能，用來進行「複製」與「覆寫」
import { getAllUserPreferences, saveRoutePreference } from './db.js';

const DB_NAME = 'TsukinKanban_SandboxDB'; // 獨立的沙盒資料庫名稱
const STORE_NAME = 'sandboxPreferences';
const DB_VERSION = 1;
const FALLBACK_KEY = 'TsukinKanban_Sandbox_Fallback'; // 獨立的沙盒備援鑰匙

let useFallback = false;

// ==========================================
// 🟢 備用方案 (LocalStorage) 的讀寫邏輯
// ==========================================
function getFallbackData() {
    try {
        const raw = localStorage.getItem(FALLBACK_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error('[Sandbox-DB] 讀取備用空間失敗', e);
        return {};
    }
}

function saveFallbackData(data) {
    try {
        const map = getFallbackData();
        map[data.id] = data;
        localStorage.setItem(FALLBACK_KEY, JSON.stringify(map));
    } catch (e) {
        console.error('[Sandbox-DB] 備用空間寫入失敗', e);
    }
}

function clearFallbackData() {
    try {
        localStorage.removeItem(FALLBACK_KEY);
    } catch (e) {}
}

// ==========================================
// 🟢 核心 IndexedDB 邏輯 (含自動降級機制)
// ==========================================
function initSandboxDB() {
    return new Promise((resolve) => {
        if (!window.indexedDB) {
            useFallback = true;
            return resolve(null);
        }
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => {
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
            useFallback = true;
            resolve(null);
        }
    });
}

// 1. 獲取沙盒內的所有資料
export async function getAllSandboxPreferences() {
    try {
        const db = await initSandboxDB();
        if (useFallback || !db) return getFallbackData();

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
                request.onerror = () => {
                    useFallback = true;
                    resolve(getFallbackData());
                };
            } catch (err) {
                useFallback = true;
                resolve(getFallbackData());
            }
        });
    } catch (error) {
        return {};
    }
}

// 2. 清空沙盒資料 (為了重新從主 DB 複製做準備)
async function clearSandboxDB() {
    const db = await initSandboxDB();
    if (useFallback || !db) {
        clearFallbackData();
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => {
                useFallback = true;
                clearFallbackData();
                resolve();
            };
        } catch (err) {
            useFallback = true;
            clearFallbackData();
            resolve();
        }
    });
}

// 3. 儲存單筆沙盒資料 (你在管理面板修改、拖曳排序時呼叫)
export async function saveSandboxPreference(data) {
    const db = await initSandboxDB();
    if (useFallback || !db) {
        saveFallbackData(data);
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            data.updatedAt = Date.now(); // 壓上時間戳記
            const request = store.put(data);
            request.onsuccess = () => resolve();
            request.onerror = () => {
                useFallback = true;
                saveFallbackData(data);
                resolve();
            };
        } catch (err) {
            useFallback = true;
            saveFallbackData(data);
            resolve();
        }
    });
}

// ============================================================================
// 🚀 核心連動邏輯 (跨 DB 複製與覆寫引擎)
// ============================================================================

// 🌟 A. 載入並複製：打開管理面板時呼叫，將主 DB 資料完整拷貝進沙盒
export async function cloneFromMainDB() {
    console.log('[Sandbox-DB] 開始從主資料庫拷貝最新狀態...');
    await clearSandboxDB(); // 先把沙盒洗乾淨
    
    const mainData = await getAllUserPreferences();
    const keys = Object.keys(mainData);
    
    for (const key of keys) {
        await saveSandboxPreference(mainData[key]);
    }
    console.log(`[Sandbox-DB] 拷貝完成，共載入 ${keys.length} 筆設定到沙盒中。`);
    return await getAllSandboxPreferences();
}

// 🌟 B. 確定並覆寫：使用者按下「儲存設定」時呼叫，將沙盒資料倒回主 DB
export async function commitToMainDB() {
    console.log('[Sandbox-DB] 準備將沙盒設定覆寫回主系統...');
    const sandboxData = await getAllSandboxPreferences();
    const keys = Object.keys(sandboxData);
    
    for (const key of keys) {
        const item = sandboxData[key];
        
        // 呼叫主 DB (db.js) 的儲存功能寫入
        // 💡 提示：未來我們在 db.js 擴充了 isVisible 或 order 欄位後，只要在這裡一起傳過去即可！
        await saveRoutePreference(item.id, item.customName, item.customHex);
    }
    
    console.log(`[Sandbox-DB] 覆寫完成！主資料庫已更新 ${keys.length} 筆資料。`);
    return true;
}