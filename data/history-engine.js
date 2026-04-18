/**
 * HistoryEngine.js
 * 負責處理鐵路與航班歷史紀錄的獲取與管理
 */

// 🚀 全域快取：存放從 /api/history/all 抓回來的整包資料
let globalHistoryCache = {
    railway: {},
    flight: {}
};

export const HistoryEngine = {
    /**
     * 從全域快取中取得特定路線的歷史紀錄
     * @param {string} routeId 路線 ID
     * @param {string} type 'railway' 或 'flight'
     * @returns {Array} 歷史紀錄陣列
     */
    getHistoryFromCache(routeId, type = 'railway') {
        if (globalHistoryCache[type] && globalHistoryCache[type][routeId]) {
            return globalHistoryCache[type][routeId];
        }
        return [];
    },

    /**
     * 🚀 核心：一次性抓取所有歷史紀錄
     * 設定 cache: 'no-store' 強制手機瀏覽器不使用本地快取，每次都跟 Cloudflare 要資料
     */
    async fetchAllHistory() {
        const url = 'https://api.tsukinkanban.com/api/history/all';
        try {
            const response = await fetch(url, { 
                method: 'GET',
                cache: 'no-store', // ⚡ 強制瀏覽器發送網路請求，不使用手機本地快取
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // 更新全域快取
                globalHistoryCache.railway = data.railway || {};
                globalHistoryCache.flight = data.flight || {};
                console.log("📊 [HistoryEngine] 整包歷史紀錄更新完成 (via Cloudflare)");
                return true;
            }
        } catch (error) {
            console.warn("⚠️ [HistoryEngine] 無法從伺服器獲取歷史紀錄:", error);
        }
        return false;
    },

    /**
     * 相容舊邏輯的入口，現在它會先查快取，若快取為空則嘗試更新
     */
    async fetchHistory(routeId, type = 'railway') {
        // 如果快取裡完全沒東西，先執行一次抓取
        if (Object.keys(globalHistoryCache.railway).length === 0 && 
            Object.keys(globalHistoryCache.flight).length === 0) {
            await this.fetchAllHistory();
        }
        
        return this.getHistoryFromCache(routeId, type);
    }
};