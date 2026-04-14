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

// 3. 儲存或更新單一路線的自訂設定 (自動備份上一筆 + 飛機名稱防呆校正)
export async function saveRoutePreference(id, customName, customHex) {
    const db = await initDB();

    // ==========================================
    // 🟢 航班名稱強制校正引擎 (Smart Name Enforcer)
    // ==========================================
    const enforceFlightName = (nameInput, currentData) => {
        const targetIds = currentData.targetLineIds || [];
        // 利用特徵判斷是否為飛機 (ID 沒有 . 且沒有 :)
        if (targetIds.length > 0 && !targetIds[0].includes('.') && !targetIds[0].includes(':')) {
            const flightNum = targetIds[0];
            
            // 如果輸入的名字是空的，或者「沒有包含」航班號碼 (支援大小寫容錯)
            if (!nameInput || !nameInput.toUpperCase().includes(flightNum.toUpperCase())) {
                // 如果全空，直接還原航班號；如果有打字，就把航班號補在最前面加上空格
                return (!nameInput || nameInput.trim() === '') ? flightNum : `${flightNum} ${nameInput.trim()}`;
            }
        }
        return nameInput; // 如果原本就乖乖包含了，就維持原樣！
    };

    // 🟢 備用模式 (LocalStorage) 的讀取與備份邏輯
    if (useFallback || !db) {
        const map = getFallbackData();
        const currentData = map[id] || {}; 
        let previousState = null;

        if (currentData && currentData.customName) {
            previousState = {
                customName: currentData.customName,
                customHex: currentData.customHex
            };
        }

        // ✨ 存檔前，先經過校正引擎的洗禮
        const finalName = enforceFlightName(customName, currentData);

        const data = { 
            ...currentData, 
            id: id, 
            customName: finalName, // 🚨 存入校正後的名字
            customHex: customHex, 
            updatedAt: Date.now(),
            previousState: previousState 
        };
        saveFallbackData(data);
        return Promise.resolve();
    }

    // 🟢 IndexedDB 模式的讀取與備份邏輯
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const currentData = getRequest.result || {}; 
                let previousState = null;
                
                if (currentData && currentData.customName) {
                    previousState = {
                        customName: currentData.customName,
                        customHex: currentData.customHex
                    };
                }

                // ✨ 存檔前，先經過校正引擎的洗禮
                const finalName = enforceFlightName(customName, currentData);

                const data = { 
                    ...currentData, 
                    id: id, 
                    customName: finalName, // 🚨 存入校正後的名字
                    customHex: customHex, 
                    updatedAt: Date.now(),
                    previousState: previousState 
                };

                const putRequest = store.put(data);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => {
                    useFallback = true;
                    saveFallbackData(data);
                    resolve();
                };
            };
            
            getRequest.onerror = () => {
                // 極端錯誤捕捉
                const data = { id, customName, customHex, updatedAt: Date.now(), previousState: null };
                useFallback = true;
                saveFallbackData(data);
                resolve();
            };
        } catch (err) {
            useFallback = true;
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

// 5. 🟢 新增：恢復上一筆設定 (Undo)
export async function restorePreviousPreference(id) {
    const db = await initDB();

    // 處理備用模式 (LocalStorage)
    if (useFallback || !db) {
        const map = getFallbackData();
        const currentData = map[id];
        
        if (currentData && currentData.previousState) {
            // 將當前狀態與備份狀態互換 (這樣再次呼叫就會變成 Redo)
            const tempName = currentData.customName;
            const tempHex = currentData.customHex;
            
            currentData.customName = currentData.previousState.customName;
            currentData.customHex = currentData.previousState.customHex;
            
            currentData.previousState = {
                customName: tempName,
                customHex: tempHex
            };
            currentData.updatedAt = Date.now();
            
            saveFallbackData(currentData);
            return Promise.resolve(currentData); // 回傳恢復後的資料
        }
        return Promise.resolve(null); // 沒有備份可供恢復
    }

    // 處理 IndexedDB 模式
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const currentData = getRequest.result;
                
                // 檢查是否有備份資料
                if (currentData && currentData.previousState) {
                    // 將當前狀態與備份狀態互換
                    const tempName = currentData.customName;
                    const tempHex = currentData.customHex;
                    
                    currentData.customName = currentData.previousState.customName;
                    currentData.customHex = currentData.previousState.customHex;
                    
                    currentData.previousState = {
                        customName: tempName,
                        customHex: tempHex
                    };
                    currentData.updatedAt = Date.now();

                    const putRequest = store.put(currentData);
                    putRequest.onsuccess = () => {
                        console.log(`[DB] 路線 ${id} 已成功恢復為上一筆紀錄`);
                        resolve(currentData); // 回傳恢復後的資料讓前端 UI 更新
                    };
                    putRequest.onerror = () => resolve(null);
                } else {
                    resolve(null); // 沒有備份可供恢復
                }
            };
            getRequest.onerror = () => resolve(null);
        } catch (err) {
            useFallback = true;
            resolve(null);
        }
    });
}

// 6. 🟢 新增：儲存卡片顯示順序 (Drag & Drop 專用)
export async function saveDisplayOrder(orderedIds) {
    const db = await initDB();
    const data = { 
        id: '__DISPLAY_ORDER__', // 使用一個特殊的保留字作為 ID
        order: orderedIds, 
        updatedAt: Date.now() 
    };

    if (useFallback || !db) {
        saveFallbackData(data);
        console.log('[DB] 新的卡片順序已儲存 (備用空間)');
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data);
            request.onsuccess = () => {
                console.log('[DB] 新的卡片順序已儲存');
                resolve();
            };
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
// 🟢 物理刪除引擎：徹底銷毀卡片設定與排序殘留 (修復資料表與加入備援邏輯)
// ============================================================================
export async function deleteRoutePreference(id) {
    const db = await initDB();

    // 🟢 處理備用模式 (LocalStorage) 的刪除邏輯
    if (useFallback || !db) {
        removeFallbackData(id);
        
        // 順便把排序裡面的紀錄也清掉
        const map = getFallbackData();
        if (map['__DISPLAY_ORDER__'] && map['__DISPLAY_ORDER__'].order) {
            map['__DISPLAY_ORDER__'].order = map['__DISPLAY_ORDER__'].order.filter(oid => oid !== id);
            localStorage.setItem(FALLBACK_KEY, JSON.stringify(map));
        }
        console.log(`[DB-Fallback] 卡片 ${id} 已徹底刪除`);
        return Promise.resolve();
    }

    // 🟢 處理 IndexedDB 模式的刪除邏輯
    return new Promise((resolve) => {
        try {
            // ✨ 修正：使用正確的 STORE_NAME，而不是硬寫的 'preferences'
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // 1. 刪除該卡片的資料
            store.delete(id);
            
            // 2. 順便把排序裡面的紀錄也清掉，防止出現幽靈空缺
            const orderReq = store.get('__DISPLAY_ORDER__');
            orderReq.onsuccess = () => {
                const orderData = orderReq.result;
                if (orderData && orderData.order) {
                    orderData.order = orderData.order.filter(oid => oid !== id);
                    store.put(orderData);
                }
            };

            transaction.oncomplete = () => {
                console.log(`[DB] 卡片 ${id} 已徹底刪除`);
                resolve(true);
            };
            
            transaction.onerror = () => {
                useFallback = true;
                removeFallbackData(id);
                resolve(true);
            };
        } catch (err) {
            useFallback = true;
            removeFallbackData(id);
            resolve(true);
        }
    });
}

// ============================================================================
// 🟢 新增：更新卡片內的路線列表 (支援 Drag & Drop 排序與刪除)
// ============================================================================
export async function updateCardRoutes(id, newTargetLineIds) {
    const db = await initDB();

    // 🟢 處理備用模式 (LocalStorage)
    if (useFallback || !db) {
        const map = getFallbackData();
        let currentData = map[id] || { id: id }; // 若無舊資料則新建
        let previousState = null;

        // 備份舊狀態 (提供給 Undo 引擎使用)
        if (currentData.targetLineIds || currentData.customName || currentData.customHex) {
            previousState = {
                customName: currentData.customName,
                customHex: currentData.customHex,
                targetLineIds: currentData.targetLineIds ? [...currentData.targetLineIds] : []
            };
        }

        currentData.targetLineIds = newTargetLineIds;
        currentData.updatedAt = Date.now();
        currentData.previousState = previousState;

        saveFallbackData(currentData);
        console.log(`[DB-Fallback] 路線 ${id} 的列表已更新`);
        return Promise.resolve();
    }

    // 🟢 處理 IndexedDB 模式
    return new Promise((resolve) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                let currentData = getRequest.result || { id: id };
                let previousState = null;

                if (currentData.targetLineIds || currentData.customName || currentData.customHex) {
                    previousState = {
                        customName: currentData.customName,
                        customHex: currentData.customHex,
                        targetLineIds: currentData.targetLineIds ? [...currentData.targetLineIds] : []
                    };
                }

                currentData.targetLineIds = newTargetLineIds;
                currentData.updatedAt = Date.now();
                currentData.previousState = previousState;

                const putRequest = store.put(currentData);
                putRequest.onsuccess = () => {
                    console.log(`[DB] 路線 ${id} 的列表已更新`);
                    resolve();
                };
                putRequest.onerror = () => {
                    useFallback = true;
                    saveFallbackData(currentData);
                    resolve();
                };
            };

            getRequest.onerror = () => {
                const data = { id, targetLineIds: newTargetLineIds, updatedAt: Date.now(), previousState: null };
                useFallback = true;
                saveFallbackData(data);
                resolve();
            };
        } catch (err) {
            useFallback = true;
            resolve();
        }
    });
}

// ============================================================================
// 🟢 匯出與匯入引擎 (Data Export / Import Engine)
// ============================================================================

/**
 * 匯出「去識別化」的完整資料陣列 (僅限目前可見卡片)
 * 包含：顯示名稱、色碼、追蹤路線及其順序
 */
export async function exportDataToClipboard() {
    try {
        const allData = await getAllUserPreferences();
        const displayOrder = allData['__DISPLAY_ORDER__'];
        
        // 1. 取得目前畫面上卡片的 ID 順序
        let visibleIds = [];
        if (displayOrder && Array.isArray(displayOrder.order)) {
            visibleIds = displayOrder.order;
        } else if (window.appRailwayData) {
            visibleIds = window.appRailwayData.map(c => c.id);
        }

        // 2. 轉換為去識別化的結構陣列 (不含 Card ID)
        const exportList = visibleIds.map(id => {
            const dbCard = allData[id] || {};
            const domCard = window.appRailwayData ? window.appRailwayData.find(c => c.id === id) : null;
            
            return {
                name: dbCard.customName || (domCard ? domCard.name : ""),
                hex: dbCard.customHex || (domCard ? domCard.hex : ""),
                // 匯出 targetLineIds 並維持其陣列順序
                routes: dbCard.targetLineIds || (domCard ? domCard.targetLineIds : [])
            };
        });

        if (exportList.length === 0) throw new Error("エクスポートするデータがありません。");

        // 3. 複製 JSON 到剪貼簿
        await navigator.clipboard.writeText(JSON.stringify(exportList));
        console.log('[DB] 完整設定已匯出 (去識別化):', exportList);
        return true;
    } catch (error) {
        console.error('[DB] 匯出失敗:', error);
        throw error;
    }
}

/**
 * 匯入完整資料陣列 (Nuke & Pave 徹底重建版)
 * 特性：清空現有資料庫，使用預設 ID 強制重建，具備自我修復 (Self-Healing) 能力。
 */
export async function importDataAndOverwrite(jsonString) {
    try {
        const parsedList = JSON.parse(jsonString);

        // ==========================================
        // 🛡️ 第一階段：全域與格式嚴格驗證 (Fail-Fast)
        // ==========================================
        if (!Array.isArray(parsedList)) throw new Error("フォーマットエラー：無効なバックアップデータです。");
        if (parsedList.length > 5) throw new Error("インポート失敗：カードは最大5枚までです。(最多 5 張卡片)");

        const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
        
        parsedList.forEach((item, index) => {
            const cardNum = index + 1;
            if (item.name && item.name.length > 10) throw new Error(`${cardNum}枚目のカード名が長すぎます。(名稱過長)`);
            if (item.hex && !hexRegex.test(item.hex)) throw new Error(`${cardNum}枚目のカラーコードが不正です。(色碼格式錯誤)`);
            
            if (item.routes) {
                // 驗證：每張卡片最多 6 條追蹤路線
                if (item.routes.length > 6) throw new Error(`${cardNum}枚目の追跡路線は最大6つまでです。(路線不可超過6條)`);
                
                // ✈️ 驗證：飛機航班不可與鐵道混合
                // 判斷邏輯：沒有包含 ':' 或 '.' 的通常是航班 (如 CI100)，有包含的是 ODPT 鐵道 ID
                const hasFlight = item.routes.some(r => !r.includes(':') && !r.includes('.'));
                const hasTrain = item.routes.some(r => r.includes(':') || r.includes('.'));
                
                if (hasFlight && hasTrain) {
                    throw new Error(`${cardNum}枚目のカード：飛行機の便と鉄道を同じカードに混ぜることはできません。(飛機與鐵道不可混搭)`);
                }
            }
        });

        // ==========================================
        // 🎯 第二階段：準備乾淨的資料與固定 ID
        // ==========================================
        // 使用系統最穩定的 5 個原生 ID 作為宿主
        const FIXED_IDS = ['tokyo', 'kanagawa', 'saitama', 'chiba', 'airport'];
        const newOrder = [];
        const newDbData = {};

        // 將匯入的資料，依序灌入這些原生 ID 中
        parsedList.forEach((source, index) => {
            const cardId = FIXED_IDS[index];
            newOrder.push(cardId);
            newDbData[cardId] = {
                id: cardId,
                customName: source.name || '',
                customHex: source.hex || '',
                targetLineIds: source.routes || [],
                updatedAt: Date.now()
            };
        });

        // 🟢 強制生成新的排序檔，徹底切斷與舊髒資料的連結
        newDbData['__DISPLAY_ORDER__'] = {
            order: newOrder,
            updatedAt: Date.now()
        };

        // ==========================================
        // 💥 第三階段：核平資料庫並寫入 (Nuke and Pave)
        // ==========================================
        const db = await initDB();

        // 模式 A：LocalStorage
        if (useFallback || !db) {
            // 直接無情覆寫整個 LocalStorage，連清空都不用，直接蓋過去
            localStorage.setItem(FALLBACK_KEY, JSON.stringify(newDbData));
            console.log('[DB-Fallback] 髒資料已徹底清除，系統透過匯入完成重建');
            return parsedList.length;
        }

        // 模式 B：IndexedDB
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // 1. 暴力清空目前資料庫內的所有卡片與排序檔
            const clearReq = store.clear();
            
            clearReq.onsuccess = () => {
                let processed = 0;
                const keys = Object.keys(newDbData);
                
                if (keys.length === 0) resolve(0);

                // 2. 寫入全新的、乾淨的資料
                keys.forEach(key => {
                    store.put(newDbData[key]).onsuccess = () => {
                        processed++;
                        if (processed === keys.length) {
                            console.log('[DB] 髒資料已徹底清除，系統透過匯入完成重建');
                            resolve(parsedList.length);
                        }
                    };
                });
            };
            
            clearReq.onerror = () => reject(new Error("古いデータのクリアに失敗しました。(舊資料清空失敗)"));
        });

    } catch (error) {
        console.error('[DB-Import] 拒絕匯入，維持原狀:', error.message);
        throw error;
    }
}
// ============================================================================
// 🎨 純色票主題引擎 (Color Theme Export / Import Engine) - 完美對接畫面版
// ============================================================================

/**
 * 依照主畫面顯示順序，匯出當前「可見卡片」的色票陣列 (支援混合預設色)
 */
export async function exportColorsToClipboard() {
    try {
        const allData = await getAllUserPreferences();
        const displayOrder = allData['__DISPLAY_ORDER__'];
        const colorTheme = []; 

        // 🎯 獲取目前畫面上卡片的 ID 陣列
        let visibleCardIds = [];
        if (displayOrder && Array.isArray(displayOrder.order)) {
            visibleCardIds = displayOrder.order;
        } else if (window.appRailwayData && window.appRailwayData.length > 0) {
            // 如果沒排序過，直接從畫面的全域變數抓取
            visibleCardIds = window.appRailwayData.map(card => card.id);
        }

        // 遍歷卡片，抓出使用者自訂顏色，若無自訂則抓取預設顏色
        visibleCardIds.forEach(cardId => {
            const dbCard = allData[cardId];
            const domCard = window.appRailwayData ? window.appRailwayData.find(c => c.id === cardId) : null;
            
            // 優先使用自訂色，其次使用系統預設色
            const finalHex = (dbCard && dbCard.customHex) ? dbCard.customHex : (domCard ? domCard.hex : null);
            
            if (finalHex) {
                colorTheme.push(finalHex);
            }
        });

        if (colorTheme.length === 0) {
            throw new Error("エクスポートできるカラーがありません。");
        }

        const jsonString = JSON.stringify(colorTheme);
        await navigator.clipboard.writeText(jsonString);
        
        console.log('[DB] 顏色主題已匯出 (包含預設色):', colorTheme);
        return true;
    } catch (error) {
        console.error('[DB] 顏色匯出失敗:', error);
        throw error; 
    }
}

/**
 * 匯入純色票陣列，並依照「當下畫面」的卡片順序依序套用 (自動為未編輯卡片建檔)
 */
export async function importColorsOnly(jsonString) {
    try {
        const parsedColors = JSON.parse(jsonString);

        if (!Array.isArray(parsedColors)) {
            throw new Error("フォーマットエラー：有効なカラーテーマではありません。");
        }

        const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
        for (const hex of parsedColors) {
            if (typeof hex !== 'string' || !hexRegex.test(hex)) {
                throw new Error(`インポート失敗：カラーコードの形式が正しくありません (${hex})`);
            }
        }

        const db = await initDB();
        const allData = await getAllUserPreferences();
        const displayOrder = allData['__DISPLAY_ORDER__'];
        
        // 🎯 取得目前使用者畫面上「可見」的卡片順序 (解決全新狀態找不到卡片的 Bug)
        let visibleCardIds = [];
        if (displayOrder && Array.isArray(displayOrder.order)) {
            visibleCardIds = displayOrder.order;
        } else if (window.appRailwayData && window.appRailwayData.length > 0) {
            // 🟢 神奇魔法：從 script.js 的全域變數取得實際在畫面上的卡片順序
            visibleCardIds = window.appRailwayData.map(card => card.id);
        } else {
            visibleCardIds = Object.keys(allData).filter(k => k !== '__DISPLAY_ORDER__').slice(0, 5);
        }

        let updatedCount = 0;
        const maxItems = Math.min(parsedColors.length, visibleCardIds.length);

        if (maxItems === 0) {
            throw new Error("適用するカードがありません。");
        }

        // ==========================================
        // 🟢 備用模式 (LocalStorage)
        // ==========================================
        if (useFallback || !db) {
            const map = getFallbackData();

            for (let i = 0; i < maxItems; i++) {
                const cardId = visibleCardIds[i];
                
                // ✨ 核心修復：如果這張卡片從來沒被編輯過（不在 DB 內），就幫它動態建檔！
                if (!map[cardId]) {
                    map[cardId] = { id: cardId };
                }
                map[cardId].customHex = parsedColors[i];
                map[cardId].updatedAt = Date.now();
                updatedCount++;
            }

            localStorage.setItem(FALLBACK_KEY, JSON.stringify(map));
            console.log(`[DB-Fallback] 成功套用 ${updatedCount} 張卡片的顏色並強制建檔`);
            return updatedCount;
        }

        // ==========================================
        // 🟢 IndexedDB 模式
        // ==========================================
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            let processedCount = 0;

            for (let i = 0; i < maxItems; i++) {
                const cardId = visibleCardIds[i];
                const newHex = parsedColors[i];

                const getReq = store.get(cardId);
                
                getReq.onsuccess = () => {
                    // ✨ 核心修復：如果 getReq.result 是 undefined (也就是全新卡片)
                    // 我們就在這裡生成一個包含基礎 ID 的全新物件！
                    const cardData = getReq.result || { id: cardId };
                    
                    cardData.customHex = newHex; // 強制寫入新顏色
                    cardData.updatedAt = Date.now();
                    
                    const putReq = store.put(cardData); // 存進資料庫
                    
                    putReq.onsuccess = () => {
                        updatedCount++;
                        processedCount++;
                        if (processedCount === maxItems) resolve(updatedCount);
                    };
                    putReq.onerror = () => {
                        processedCount++;
                        if (processedCount === maxItems) resolve(updatedCount);
                    };
                };
                
                getReq.onerror = () => {
                    processedCount++;
                    if (processedCount === maxItems) resolve(updatedCount);
                };
            }
        });

    } catch (error) {
        console.error('[DB-Import-Color] 顏色匯入失敗:', error.message);
        throw error;
    }
}