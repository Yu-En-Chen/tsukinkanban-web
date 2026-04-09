// js/history-daemon.js

// 準備一個全域變數，當作歷史紀錄的「記憶體」
window.appHistoryCache = null;
window.isFetchingHistory = false;

async function fetchHistoryDaemon() {
    // 防呆：如果前一次還沒抓完，就不要重複抓
    if (window.isFetchingHistory) return;
    window.isFetchingHistory = true;

    try {
        // 確認主程式的路線資料已經準備好了
        if (!window.appRailwayData || window.appRailwayData.length === 0) {
            window.isFetchingHistory = false;
            return;
        }

        const fetchTasks = [];
        window.appRailwayData.forEach(card => {
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
                        return { name: routeName, data: await res.json() };
                    }).catch(() => null);
                    
                    fetchTasks.push(req);
                });
            }
        });

        if (fetchTasks.length === 0) {
            window.appHistoryCache = [];
            window.isFetchingHistory = false;
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

        // ✨ 抓取成功！將乾淨的資料寫入全域記憶體中
        window.appHistoryCache = validList;
        console.log("🟢 [History Daemon] 背景更新完成，最新資料已就緒！");

    } catch (err) {
        console.error("🔴 [History Daemon] 背景更新失敗:", err);
    } finally {
        window.isFetchingHistory = false;
    }
}

// 🚀 啟動機制：
// 1. 網頁剛打開時，等待 2 秒（讓 script.js 畫完主畫面），抓取第一次
setTimeout(fetchHistoryDaemon, 2000);

// 2. 之後每 60 秒 (60000 毫秒) 自動在背景更新一次
setInterval(fetchHistoryDaemon, 60000);