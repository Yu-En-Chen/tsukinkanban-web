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

        // 🚀 升級：用來確認主畫面是否「已經有卡片渲染出來」了
        const hasAnyCardRendered = document.querySelector('.card') !== null;

        const fetchTasks = [];
        window.appRailwayData.forEach(card => {
            
            // ==========================================
            // ✨ 效能優化：終極視圖攔截器 (修復幽靈卡片 Bug)
            // ==========================================
            // 1. 資料層攔截
            if (card.isHidden === true || card.hidden === true) return;

            // 2. 尋找畫面上的實體卡片
            const domCard = document.getElementById(card.id) || 
                            document.getElementById(`card-${card.id}`) || 
                            document.querySelector(`[data-id="${card.id}"]`);
            
            if (!domCard) {
                // 🔴 關鍵修復：如果畫面已經畫好其他卡片了，但偏偏「找不到」這張卡片
                // 代表這張卡片根本沒被產生在 HTML 裡 (被使用者的隱藏設定過濾掉了)
                if (hasAnyCardRendered) {
                    return; // 🛑 徹底終止！不發送 API
                }
            } else {
                // 如果卡片還存在 DOM 裡，檢查它是不是被 CSS 隱藏了 (例如 display: none)
                const style = window.getComputedStyle(domCard);
                if (style.display === 'none' || domCard.classList.contains('hidden') || domCard.closest('.hidden')) {
                    return; // 🛑 隱藏中，不發送 API
                }
            }
            // ==========================================

            // 👇 只有「真正活在畫面上、且肉眼可見」的卡片，才會來到這裡發請求
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