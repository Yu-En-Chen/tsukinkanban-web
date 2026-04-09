// js/menu.js - 左側選單互動邏輯 (極簡觸發器版)

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('left-menu-btn');

    if (!menuBtn) {
        console.error('Menu button not found!');
        return;
    }

    menuBtn.onclick = null;

    // 1. 純粹的觸發按鈕，不再切換任何狀態
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        console.log('Menu Clicked - Opening Universal Page for History');
        
        // 🟢 產生 HTML 並直接丟給通用底版
        const historyHTML = generateHistoryHTML();
        if (window.openUniversalPage) {
            // 呼叫通用底版，畫面會被 universal-active 接管
            window.openUniversalPage('Timeline', historyHTML);
        }
    });

    // 2. Esc 鍵直接連動關閉通用底版
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (window.closeUniversalPage) window.closeUniversalPage(true);
        }
    });
});

// ============================================================================
// 🟢 歷史紀錄：HTML 視圖生成器 (純函數，不再直接操作 DOM)
// ============================================================================
function generateHistoryHTML() {
    const historyList = window.appHistoryCache;

    // 狀態 1：載入中防呆
    if (!historyList) {
        return `
            <div style="text-align: center; color: var(--text-secondary, #8e8e93); font-size: 0.9em; padding: 20px;">
                <div style="opacity: 0.6; margin-bottom: 8px; display: flex; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </div>
                履歴データを同期中...
                <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
            </div>`;
    }

    // 狀態 2：無資料防呆
    if (historyList.length === 0) {
        return '<div style="text-align: center; color: var(--text-secondary, #8e8e93); font-size: 0.9em; padding: 20px;">履歴データがありません</div>';
    }

    // 狀態 3：正式組裝 HTML
    let htmlStr = '<div style="display: flex; flex-direction: column; gap: 16px; padding-bottom: 40px;">';

    historyList.forEach(info => {
        const parseData = (data) => {
            let items = [];
            if (Array.isArray(data)) {
                data.forEach(item => items.push(`<span>${item}</span>`));
            } else if (typeof data === 'object') {
                for (const [key, val] of Object.entries(data)) {
                    if (key.includes('odpt.') || key.includes('Departure_') || key.includes('Arrival_')) {
                        if (typeof val === 'object') items = items.concat(parseData(val));
                    } else {
                        let displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
                        let valColor = displayVal.includes('遅延') || displayVal.includes('見合') ? '#ff453a' : 'inherit';
                        items.push(`
                            <div style="display: flex; gap: 12px; align-items: baseline; padding: 4px 0; border-bottom: 1px solid rgba(128,128,128,0.15);">
                                <span style="font-family: monospace; font-size: 0.9em; opacity: 0.6; width: 45px; flex-shrink: 0;">${key}</span>
                                <span style="font-weight: 500; font-size: 0.95em; color: ${valColor};">${displayVal}</span>
                            </div>
                        `);
                    }
                }
            }
            return items;
        };

        const parsedItems = parseData(info.data).slice(0, 4);

        if (parsedItems.length > 0) {
            htmlStr += `
                <div style="padding-bottom: 8px;">
                    <div style="font-weight: 700; font-size: 1em; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; color: #fff;">
                        <span style="width: 6px; height: 6px; background: #0a84ff; border-radius: 50%;"></span>
                        ${info.name}
                    </div>
                    <div style="padding-left: 14px; color: rgba(255,255,255,0.85);">
                        ${parsedItems.join('')}
                    </div>
                </div>
            `;
        }
    });

    htmlStr += '</div>';
    return htmlStr; // 將完整的 HTML 回傳給 Universal Page
}