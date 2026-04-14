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
 * 將所有卡片設定匯出並複製到剪貼簿
 */
export async function exportDataToClipboard() {
    try {
        const allData = await getAllUserPreferences();
        // 轉為帶有縮排的 JSON 字串，方便使用者閱讀與修改
        const jsonString = JSON.stringify(allData, null, 2);
        
        await navigator.clipboard.writeText(jsonString);
        console.log('[DB] 資料已成功複製到剪貼簿');
        return true;
    } catch (error) {
        console.error('[DB] 匯出失敗:', error);
        return false;
    }
}

/**
 * 匯入並嚴格驗證 JSON 字串，通過後覆寫資料庫
 */
export async function importDataAndOverwrite(jsonString) {
    try {
        const parsedData = JSON.parse(jsonString);

        if (typeof parsedData !== 'object' || parsedData === null) {
            throw new Error("格式錯誤：不是有效的設定檔物件");
        }

        // ==========================================
        // 🛡️ 第 1 關：驗證卡片總數量
        // ==========================================
        // 排除掉系統用來記錄排序的保留字
        const cardKeys = Object.keys(parsedData).filter(key => key !== '__DISPLAY_ORDER__');
        
        if (cardKeys.length > 5) {
            throw new Error(`匯入失敗：卡片數量不可大於 5 張 (目前為 ${cardKeys.length} 張)`);
        }

        // ==========================================
        // 🛡️ 準備環境：獲取全域路線字典 (用來檢查路線是否存在)
        // ==========================================
        let routeDict = {};
        try {
            if (window.MasterRouteDictionary) {
                routeDict = window.MasterRouteDictionary;
            } else {
                // 如果 window 尚未掛載，嘗試從 LocalStorage 抓快取
                const cachedDict = localStorage.getItem('Tsukin_Cached_Dict');
                if (cachedDict) routeDict = JSON.parse(cachedDict);
            }
        } catch (e) {
            console.warn('[DB] 無法取得路線字典，跳過路線存在性驗證');
        }
        const hasDict = Object.keys(routeDict).length > 0;
        
        // 建立色碼正規表達式 (支援 #FFF 與 #FFFFFF 格式)
        const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;

        // ==========================================
        // 🛡️ 第 2 關：逐一驗證每張卡片的細節參數
        // ==========================================
        for (const key of cardKeys) {
            const card = parsedData[key];
            const displayId = card.customName || key;

            // 1. 檢查名稱長度
            if (card.customName && card.customName.length > 10) {
                throw new Error(`匯入失敗：卡片 [${displayId}] 的名稱不可超過 10 個字元`);
            }

            // 2. 檢查色碼格式
            if (card.customHex && !hexRegex.test(card.customHex)) {
                throw new Error(`匯入失敗：卡片 [${displayId}] 的色碼格式不正確 (${card.customHex})`);
            }

            // 3. 檢查追蹤路線
            if (card.targetLineIds) {
                if (!Array.isArray(card.targetLineIds)) {
                    throw new Error(`匯入失敗：卡片 [${displayId}] 的追蹤路線格式錯誤`);
                }
                
                // 檢查數量 (小於 6，也就是最多 5 條)
                if (card.targetLineIds.length >= 6) {
                    throw new Error(`匯入失敗：卡片 [${displayId}] 的路線總數不可大於 5 條`);
                }

                // 檢查路線是否真實存在
                if (hasDict) {
                    for (const routeId of card.targetLineIds) {
                        // ✈️ 飛機航班防呆：航班 ID 通常不會有 '.' 或 ':'
                        // 我們只針對「鐵路」做字典驗證，放行飛機
                        const isLikelyFlight = !routeId.includes('.') && !routeId.includes(':');
                        
                        if (!isLikelyFlight && !routeDict[routeId]) {
                            throw new Error(`匯入失敗：系統字典中找不到路線代碼 [${routeId}]`);
                        }
                    }
                }
            }
        }

        // ==========================================
        // 💾 驗證全數通過，開始安全覆寫資料庫
        // ==========================================
        const db = await initDB();

        // 🟢 備用模式 (LocalStorage)
        if (useFallback || !db) {
            localStorage.setItem(FALLBACK_KEY, JSON.stringify(parsedData));
            console.log('[DB-Fallback] 匯入成功，資料已完全覆寫');
            return true;
        }

        // 🟢 IndexedDB 模式
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            // 暴力清空目前資料庫
            const clearRequest = store.clear();
            
            clearRequest.onsuccess = () => {
                const keys = Object.keys(parsedData);
                let completed = 0;

                if (keys.length === 0) {
                    resolve(true); // 匯入空資料也算成功
                    return;
                }

                keys.forEach(key => {
                    const putReq = store.put(parsedData[key]);
                    putReq.onsuccess = () => {
                        completed++;
                        if (completed === keys.length) resolve(true);
                    };
                    putReq.onerror = () => reject(new Error("寫入單筆資料發生異常"));
                });
            };
            
            clearRequest.onerror = () => reject(new Error("無法清空舊資料庫"));
        });

    } catch (error) {
        console.error('[DB-Import] 拒絕匯入:', error.message);
        throw error; // 必須往上丟，讓 UI 層的 Alert 可以抓到錯誤訊息！
    }
}