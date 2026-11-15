// ============================================================================
// data/db-settings.js - 顯示設定的儲存（IndexedDB + LocalStorage 備援）
// ============================================================================

const SETTINGS_DB = 'TsukinSettingsDB';
const SETTINGS_STORE = 'settings';

// 開啟設定用的資料庫，並保證裡面有 settings 這個儲存區。
//
// 以前「讀取」會用版本 1 開啟資料庫，卻沒有建立儲存區：第一次打開設定頁（還沒有任何設定）
// 時，資料庫就以「版本 1、沒有儲存區」的狀態被建立；之後「寫入」同樣開版本 1，不會再觸發
// 建立儲存區的時機，transaction 直接丟出 NotFoundError。也就是 IndexedDB 這一份其實一直沒寫進去
//（設定本身靠 LocalStorage 那一份存活）。
//
// 這裡不指定版本開啟；發現缺儲存區時升一版補上，既有的壞資料庫會自己修好。
function openSettingsDB() {
    return new Promise((resolve, reject) => {
        let settled = false;
        const fail = (err) => { if (!settled) { settled = true; reject(err); } };

        const open = (version) => {
            const request = version ? indexedDB.open(SETTINGS_DB, version) : indexedDB.open(SETTINGS_DB);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
            };

            request.onsuccess = (e) => {
                const db = e.target.result;
                // 其他分頁要升版時讓路，避免把對方卡住
                db.onversionchange = () => db.close();

                // 等待期間已經放棄（被其他分頁擋住等）：用不到這條連線了
                if (settled) { db.close(); return; }

                if (db.objectStoreNames.contains(SETTINGS_STORE)) {
                    settled = true;
                    resolve(db);
                    return;
                }

                // 舊版留下的「沒有儲存區的資料庫」：升一版把儲存區補上（只試一次）
                const nextVersion = db.version + 1;
                db.close();
                if (version) return fail(new Error('settings store is missing'));
                open(nextVersion);
            };

            request.onerror = () => fail(request.error);
            // 其他分頁還開著舊連線：不等它，這次先靠 LocalStorage
            request.onblocked = () => fail(new Error('settings database is blocked by another tab'));
        };

        try {
            open();
        } catch (e) {
            fail(e);
        }
    });
}

export async function saveDisplaySetting(key, value) {
    // 1. LocalStorage 備援（快速寫入，下次載入不閃爍）
    try { localStorage.setItem(`tsukin_setting_${key}`, JSON.stringify(value)); } catch(e) {}

    // 2. IndexedDB 永久儲存 (獨立的 Settings Store，不干擾卡片資料)
    let db = null;
    try {
        db = await openSettingsDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(SETTINGS_STORE, 'readwrite');
            tx.objectStore(SETTINGS_STORE).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    } catch(e) {
        console.warn("IndexedDB 儲存失敗，已使用 LocalStorage 備援", e);
    } finally {
        if (db) db.close();
    }
}

export async function getDisplaySetting(key, defaultValue) {
    // 優先從 LocalStorage 讀取（利於 UI 首次渲染）
    try {
        const localVal = localStorage.getItem(`tsukin_setting_${key}`);
        if (localVal !== null) return JSON.parse(localVal);
    } catch(e) {}

    // 備用：如果 LocalStorage 遺失，從 IndexedDB 讀取
    let db = null;
    try {
        db = await openSettingsDB();
        const stored = await new Promise((resolve, reject) => {
            const tx = db.transaction(SETTINGS_STORE, 'readonly');
            const getReq = tx.objectStore(SETTINGS_STORE).get(key);
            getReq.onsuccess = () => resolve(getReq.result);
            getReq.onerror = () => reject(getReq.error);
        });
        if (stored === undefined) return defaultValue;

        // 把找回來的值補回 LocalStorage：啟動時套用設定讀的是 LocalStorage 那一份
        try { localStorage.setItem(`tsukin_setting_${key}`, JSON.stringify(stored)); } catch(e) {}
        return stored;
    } catch(e) {
        return defaultValue;
    } finally {
        if (db) db.close();
    }
}
