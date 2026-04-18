/**
 * history-daemon.js
 * 負責在背景定時驅動歷史紀錄的更新
 */
import { HistoryEngine } from '../data/history-engine.js';

export const HistoryDaemon = {
    isUpdating: false,

    /**
     * 初始化背景更新程序
     */
    init() {
        console.log("🛡️ [HistoryDaemon] 背景監測程序已啟動");
        
        // 初始載入一次整包資料
        this.updateAll();

        // 設定每 60 秒定期刷新一次全域歷史快取
        // 配合 Cloudflare 的 1 分鐘快取，這是一個最經濟的查詢頻率
        setInterval(() => {
            this.updateAll();
        }, 60 * 1000);
    },

    /**
     * 執行整包更新
     */
    async updateAll() {
        if (this.isUpdating) return;
        this.isUpdating = true;

        const success = await HistoryEngine.fetchAllHistory();
        
        if (success) {
            // 觸發自定義事件，告知 UI 元件歷史資料已更新 (如果有卡片正展開，可以監聽此事件重新渲染)
            window.dispatchEvent(new CustomEvent('historyUpdated'));
        }

        this.isUpdating = false;
    }
};