// db.js - 使用者偏好設定的本地資料庫引擎 (IndexedDB)

const DB_NAME = 'TsukinKanbanDB';
const STORE_NAME = 'userPreferences';
const DB_VERSION = 1;

// 1. 初始化並開啟資料庫
export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (e) => reject('IndexedDB 開啟失敗:', e.target.error);
        request.onsuccess = (e) => resolve(e.target.result);
        
        // 如果是第一次開啟，或是版本升級，就建立儲存空間
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // 使用路線的 'id' 作為唯一鍵值
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

// 2. 獲取所有使用者的自訂偏好設定 (背景默默讀取)
export async function getAllUserPreferences() {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = () => {
                // 將陣列轉換成 Object Map 方便快速尋找，例如： { 'yamanote': { customName: '...', customHex: '...' } }
                const prefsMap = {};
                request.result.forEach(item => { prefsMap[item.id] = item; });
                resolve(prefsMap);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('讀取使用者偏好設定失敗', error);
        return {}; // 失敗就回傳空物件，確保網頁不崩潰
    }
}

// 3. 儲存或更新單一路線的自訂設定 (未來給儲存按鈕用的)
export async function saveRoutePreference(id, customName, customHex) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // 儲存的補丁資料結構
        const data = { 
            id: id, 
            customName: customName, 
            customHex: customHex, 
            updatedAt: Date.now() 
        };
        
        const request = store.put(data);
        request.onsuccess = () => {
            console.log(`[DB] 路線 ${id} 的自訂設定已儲存`);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

// 4. 重置/刪除單一路線的自訂設定 (未來給「一鍵還原預設」按鈕用的)
export async function resetRoutePreference(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}