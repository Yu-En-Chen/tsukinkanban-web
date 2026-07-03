// js/history-daemon.js

window.appHistoryCache = null;
window.isFetchingHistory = false;

async function fetchHistoryDaemon() {
    if (window.isFetchingHistory) return;
    window.isFetchingHistory = true;

    try {
        // 重試機制：
        // 主畫面資料尚未就緒時，每秒重試直到取得為止
        if (!window.appRailwayData || window.appRailwayData.length === 0) {
            window.isFetchingHistory = false;
            setTimeout(fetchHistoryDaemon, 1000); 
            return;
        }

        // 確認主畫面已渲染出卡片
        const hasAnyCardRendered = document.querySelector('.card') !== null;

        // 迴圈開始前一次載入整包歷史紀錄 (走 Cloudflare 快取)
        let allHistoryData = { railway: {}, flight: {} };
        try {
            // 刻意不加時間戳參數，以命中 Cloudflare 的 1 分鐘邊緣快取
            const allRes = await fetch('https://api.tsukinkanban.com/api/history/all');
            if (allRes.ok) {
                allHistoryData = await allRes.json();
            }
        } catch (e) {
            console.error("無法獲取整包歷史資料:", e);
        }

        const fetchTasks = [];
        window.appRailwayData.forEach(card => {
            
            // ==========================================
            // 隱藏卡片攔截：被隱藏或移除的卡片不發送 API 請求
            // ==========================================
            // 1. 資料層檢查：涵蓋常見的「關閉/隱藏」欄位
            if (card.isHidden === true || 
                card.hidden === true || 
                card.enabled === false || 
                card.visible === false || 
                card.display === false) {
                return; 
            }

            // 2. DOM 層檢查 (Scoped Selector)
            // 僅比對帶有 .card 類別的元素，避免誤抓設定選單裡的同名開關
            let domCard = document.querySelector(`.card#${card.id}`) || 
                          document.querySelector(`.card#card-${card.id}`) || 
                          document.querySelector(`.card[data-id="${card.id}"]`);
            
            // 後備：卡片缺少 .card 類別時，退回以 ID 格式尋找
            if (!domCard) {
                 domCard = document.getElementById(`card-${card.id}`); 
            }

            if (!domCard) {
                // 畫面上有其他卡片、唯獨找不到這張主卡片時，
                // 代表它已被設定面板從 DOM 移除
                if (hasAnyCardRendered) {
                    return; // 不發送 API
                }
            } else {
                // 檢查卡片是否帶有隱藏用的 class
                const style = window.getComputedStyle(domCard);
                if (style.display === 'none' || 
                    domCard.classList.contains('hidden') || 
                    domCard.classList.contains('is-hidden') || 
                    domCard.closest('.hidden')) {
                    return; // 隱藏中，不發送 API
                }
            }
            // ==========================================

            // ==========================================
            // 只有實際存在於主畫面且可見的卡片才會發送請求
            // ==========================================
            
            // 1. 判斷是否為航班卡片
            const isFlight = card.isFlightCard === true || card.isFlight === true || card.type === 'flight';
            const targetIds = card.targetLineIds || card.targetAirports || card.airports || (card.airport ? [card.airport] : []);

            if (targetIds && targetIds.length > 0) {
                targetIds.forEach(id => {
                    const type = isFlight ? 'flight' : 'railway';
                    let finalId = id;
                    
                    if (isFlight && !id.includes('Departure_') && !id.includes('Arrival_')) {
                        finalId = `Departure_${id}`; 
                    }

                    let routeName = (window.MasterRouteDictionary && window.MasterRouteDictionary[id]) ? window.MasterRouteDictionary[id].name : id;
                    routeName = routeName.replace('Departure_', '出發 ').replace('Arrival_', '抵達 ');
                    
                    // 不再逐卡發送 fetch，改從整包 allHistoryData 中挑出對應資料
                    const routeHistory = (allHistoryData[type] && allHistoryData[type][finalId]) ? allHistoryData[type][finalId] : [];

                    // 以 Promise.resolve() 模擬 fetch 回傳格式，沿用既有的處理流程
                    const req = Promise.resolve({ 
                        cardId: card.id, 
                        cardName: card.name || card.title || '卡片路線',
                        name: routeName, 
                        isFlight: isFlight,
                        data: routeHistory // 與原本 json.history 相同的陣列格式
                    });
                    
                    fetchTasks.push(req);
                });
            }
        }); // 結束 window.appRailwayData.forEach

        if (fetchTasks.length === 0) {
            window.appHistoryCache = [];
            Promise.all(fetchTasks).then(results => {
                // 寫入快取
                window.appHistoryCache = results.filter(r => r !== null);
                
                // ==========================================
                // 廣播資料更新事件，通知開啟中的面板刷新
                // ==========================================
                window.dispatchEvent(new CustomEvent('historyDataUpdated'));
            });
            window.isFetchingHistory = false;
            setTimeout(fetchHistoryDaemon, 60000); // 1分鐘後再檢查一次
            return;
        }

        const results = await Promise.allSettled(fetchTasks);
        const validList = [];
        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
                const info = res.value;
                if ((Array.isArray(info.data) && info.data.length > 0) || (typeof info.data === 'object' && Object.keys(info.data).length > 0)) {
                    validList.push(info);
                }
            }
        });

        // 將最新資料寫入全域變數
        window.appHistoryCache = validList;
        console.log("[History Daemon] 背景精靈抓取成功！已存入記憶體：", validList);
        Promise.all(fetchTasks).then(results => {
            // 寫入快取
            window.appHistoryCache = results.filter(r => r !== null);
            
            // ==========================================
            // 廣播資料更新事件，通知開啟中的面板刷新
            // ==========================================
            window.dispatchEvent(new CustomEvent('historyDataUpdated'));
        });

    } catch (err) {
        console.error("[History Daemon] 背景更新失敗:", err);
    } finally {
        window.isFetchingHistory = false;
        // 之後每 60 秒背景自動更新一次
        setTimeout(fetchHistoryDaemon, 60000);
    }
}

// 頁面載入時啟動
fetchHistoryDaemon();