// js/history-daemon.js

window.appHistoryCache = null;
window.isFetchingHistory = false;

async function fetchHistoryDaemon() {
    if (window.isFetchingHistory) return;
    window.isFetchingHistory = true;

    try {
        // 🚀 升級 1：死纏爛打機制
        // 如果主畫面的資料還沒長出來，就等 1 秒後再試一次，直到抓到為止！
        if (!window.appRailwayData || window.appRailwayData.length === 0) {
            window.isFetchingHistory = false;
            setTimeout(fetchHistoryDaemon, 1000); 
            return;
        }

        // 🚀 升級：確認主畫面是否「已經有卡片渲染出來」
        const hasAnyCardRendered = document.querySelector('.card') !== null;

        const fetchTasks = [];
        window.appRailwayData.forEach(card => {
            
            // ==========================================
            // ✨ 效能優化：終極防漏網智慧攔截器 (修復設定選單干擾 Bug)
            // ==========================================
            // 1. 資料層擴充攔截：涵蓋各種常見的「關閉/隱藏」資料標籤
            if (card.isHidden === true || 
                card.hidden === true || 
                card.enabled === false || 
                card.visible === false || 
                card.display === false) {
                return; 
            }

            // 2. ✨ 精準視覺尋找 (Scoped Selector)
            // 強制只找帶有 .card 類別的元素，絕對不抓「設定選單」裡面的同名開關！
            let domCard = document.querySelector(`.card#${card.id}`) || 
                          document.querySelector(`.card#card-${card.id}`) || 
                          document.querySelector(`.card[data-id="${card.id}"]`);
            
            // 防呆：如果你的卡片忘記加上 .card 類別，退一步只找特定 ID 格式
            if (!domCard) {
                 domCard = document.getElementById(`card-${card.id}`); 
            }

            if (!domCard) {
                // 🔴 如果畫面上已經有其他卡片了，但偏偏「找不到」這張主卡片
                // 代表這張卡片被設定面板從 HTML 裡徹底移除了
                if (hasAnyCardRendered) {
                    return; // 🛑 徹底終止！不發送 API
                }
            } else {
                // 🟢 檢查這張實體卡片是不是被加上了隱藏用的 class
                const style = window.getComputedStyle(domCard);
                if (style.display === 'none' || 
                    domCard.classList.contains('hidden') || 
                    domCard.classList.contains('is-hidden') || 
                    domCard.closest('.hidden')) {
                    return; // 🛑 隱藏中，不發送 API
                }
            }
            // ==========================================

            // ==========================================
            // 👇 只有「真正活在主畫面上、且肉眼可見」的卡片，才會來到這裡發請求
            // ==========================================
            
            // 1. 精準辨識是否為飛機卡片
            const isFlight = card.isFlightCard === true || card.isFlight === true || card.type === 'flight';
            
            // 2. ✨ 核心修復：完美兼容鐵路與飛機的路線 ID 陣列
            const targetIds = card.targetLineIds || card.targetAirports || card.airports || (card.airport ? [card.airport] : []);

            if (targetIds && targetIds.length > 0) {
                targetIds.forEach(id => {
                    const type = isFlight ? 'flight' : 'railway';
                    let finalId = id;
                    
                    if (isFlight && !id.includes('Departure_') && !id.includes('Arrival_')) {
                        finalId = `Departure_${id}`; 
                    }

                    const url = `https://api.tsukinkanban.com/api/history/${type}/${finalId}`;
                    let routeName = (window.MasterRouteDictionary && window.MasterRouteDictionary[id]) ? window.MasterRouteDictionary[id].name : id;
                    routeName = routeName.replace('Departure_', '出發 ').replace('Arrival_', '抵達 ');

                    const req = fetch(url).then(async res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const json = await res.json();
                        return { 
                            cardId: card.id, 
                            cardName: card.name || card.title || '卡片路線',
                            name: routeName, 
                            isFlight: isFlight, // ✨ 將「這是飛機」的標記傳送給選單
                            data: json.history || [] 
                        };
                    }).catch(() => null);
                    
                    fetchTasks.push(req);
                });
            }
        }); // 結束 window.appRailwayData.forEach

        if (fetchTasks.length === 0) {
            window.appHistoryCache = [];
            Promise.all(fetchTasks).then(results => {
                // 原本儲存快取的程式碼
                window.appHistoryCache = results.filter(r => r !== null);
                
                // ==========================================
                // ✨ 核心升級：廣播訊號！告訴全宇宙「資料更新好了！」
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

        // 🚀 升級 2：將最新資料寫入全域變數，並在 Console 報告好消息
        window.appHistoryCache = validList;
        console.log("🟢 [History Daemon] 背景精靈抓取成功！已存入記憶體：", validList);
        Promise.all(fetchTasks).then(results => {
            // 原本儲存快取的程式碼
            window.appHistoryCache = results.filter(r => r !== null);
            
            // ==========================================
            // ✨ 核心升級：廣播訊號！告訴全宇宙「資料更新好了！」
            // ==========================================
            window.dispatchEvent(new CustomEvent('historyDataUpdated'));
        });

    } catch (err) {
        console.error("🔴 [History Daemon] 背景更新失敗:", err);
    } finally {
        window.isFetchingHistory = false;
        // 抓完一次後，固定每 60 秒背景自動更新一次
        setTimeout(fetchHistoryDaemon, 60000);
    }
}

// 網頁載入時，立刻啟動精靈！
fetchHistoryDaemon();