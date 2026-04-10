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

        const fetchTasks = [];
        window.appRailwayData.forEach(card => {
            
            // ==========================================
            // ✨ 效能優化：智慧攔截「已隱藏」的卡片
            // ==========================================
            // 1. 資料層攔截：如果屬性被標記為隱藏，直接跳過
            if (card.isHidden === true || card.hidden === true) return;

            // 2. 視圖層攔截：去畫面上找這張卡片，如果被 CSS 隱藏了 (例如 display: none)，也跳過
            // (支援多種常見的 ID 命名與 data 綁定方式，確保一定找得到)
            const domCard = document.getElementById(card.id) || 
                            document.getElementById(`card-${card.id}`) || 
                            document.querySelector(`[data-id="${card.id}"]`);
            
            if (domCard) {
                const style = window.getComputedStyle(domCard);
                // 只要卡片在畫面上消失，就不浪費資源去抓它的 API
                if (style.display === 'none' || domCard.classList.contains('hidden')) {
                    return; // return 在 forEach 中等同於 continue，會跳過這張卡片進入下一張
                }
            }
            // ==========================================

            if (card.targetLineIds) {
                card.targetLineIds.forEach(id => {
                    const type = card.isFlightCard ? 'flight' : 'railway';
                    let finalId = id;
                    if (card.isFlightCard && !id.includes('Departure_') && !id.includes('Arrival_')) {
                        finalId = `Departure_${id}`; 
                    }

                    const url = `https://tsukinkanban-odpt.onrender.com/api/history/${type}/${finalId}`;
                    let routeName = (window.MasterRouteDictionary && window.MasterRouteDictionary[id]) ? window.MasterRouteDictionary[id].name : id;
                    routeName = routeName.replace('Departure_', '出發 ').replace('Arrival_', '抵達 ');

                    const req = fetch(url).then(async res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const json = await res.json();
                        // 只抽取有效的 history 陣列
                        return { name: routeName, data: json.history || [] };
                    }).catch(() => null);
                    
                    fetchTasks.push(req);
                });
            }
        });

        if (fetchTasks.length === 0) {
            window.appHistoryCache = [];
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