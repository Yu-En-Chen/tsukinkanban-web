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
        
        const historyHTML = generateHistoryHTML();
        if (window.openUniversalPage) {
            // ✨ 換上專業的日文標題
            window.openUniversalPage('通知・履歴', historyHTML);
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
// 🟢 歷史紀錄：HTML 視圖生成器 (翻譯與過濾升級版)
// ============================================================================
function generateHistoryHTML() {
    const historyList = window.appHistoryCache;

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

    if (historyList.length === 0) {
        return '<div style="text-align: center; color: var(--text-secondary, #8e8e93); font-size: 0.9em; padding: 20px;">履歴データがありません</div>';
    }

    let htmlStr = '<div style="display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px;">';

    // 🚫 定義不需要顯示的系統雜訊欄位
    const skipKeys = ['timestamp', 'route_id', 'type', 'fid', 'airport', 'url', 'status_type', 'advanced_details'];
    
    // 🌐 翻譯字典 (如果設定為空字串 ''，則代表「不顯示標題，只顯示內文」)
    const keyMap = {
        'delay_minutes': '遅延',
        'scheduled': '定刻',
        'latest': '変更',
        'gate': '搭乗口',
        'terminal': 'ターミナル',
        'status_text': '', // 隱藏標題，只顯示如 "平常運転" 的字眼
        'message': '',     // 隱藏標題，只顯示公告本文
        'note': ''         // 隱藏標題，只顯示航班備註
    };

    historyList.forEach(info => {
        // 確保資料是陣列
        if (!Array.isArray(info.data) || info.data.length === 0) return;

        // 反轉陣列讓最新資料在最上面，並限制最多顯示 3 筆歷史
        const snapshots = info.data.slice().reverse().slice(0, 3);

        let routeHtml = `
            <div>
                <div style="font-weight: 700; font-size: 1.05em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: #fff;">
                    <span style="width: 8px; height: 8px; background: #0a84ff; border-radius: 50%;"></span>
                    ${info.name}
                </div>
                <div style="display: flex; flex-direction: column; gap: 16px; padding-left: 14px; border-left: 2px solid rgba(255,255,255,0.15); margin-left: 3px;">
        `;

        snapshots.forEach((snapshot, index) => {
            // 轉換時間格式 (擷取時與分)
            let timeStr = "";
            if (snapshot.timestamp) {
                const d = new Date(snapshot.timestamp);
                timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            }

            // 第一筆 (最新) 保持全亮，舊的歷史紀錄讓它稍微變暗以區分層次
            const opacity = index === 0 ? '1' : '0.6';

            let snapHtml = `<div style="display: flex; flex-direction: column; gap: 8px; opacity: ${opacity};">`;
            
            if (timeStr) {
                snapHtml += `<div style="font-size: 0.75em; color: #0a84ff; font-weight: 600; letter-spacing: 0.5px;">${timeStr} 更新</div>`;
            }

            for (const [k, v] of Object.entries(snapshot)) {
                if (skipKeys.includes(k) || v === null || v === "") continue;

                let label = keyMap[k] !== undefined ? keyMap[k] : k;
                let displayVal = v;

                // 針對延遲時間做特別處理
                if (k === 'delay_minutes') {
                    if (v === 0) continue; // 沒有延遲(0)就不必顯示這一行了
                    displayVal = `${v} 分`;
                }

                if (label === '') {
                    // ✨ 標題為空：只顯示乾淨的內文 (自動換行防呆已經包含在內)
                    snapHtml += `
                        <div style="font-weight: 500; font-size: 0.95em; color: inherit; word-break: break-word; overflow-wrap: break-word; line-height: 1.5;">
                            ${displayVal}
                        </div>
                    `;
                } else {
                    // ✨ 有標題：顯示「標題 + 內文」 (使用你上回合要的 Flexbox 排版與自動換行)
                    snapHtml += `
                        <div style="display: flex; gap: 12px; align-items: baseline; width: 100%;">
                            <span style="font-family: monospace; font-size: 0.85em; opacity: 0.6; width: 55px; flex-shrink: 0;">${label}</span>
                            <span style="font-weight: 500; font-size: 0.95em; color: inherit; word-break: break-word; overflow-wrap: break-word; flex: 1; min-width: 0; line-height: 1.4;">${displayVal}</span>
                        </div>
                    `;
                }
            }
            snapHtml += `</div>`;
            routeHtml += snapHtml;
        });

        routeHtml += `</div></div>`;
        htmlStr += routeHtml;
    });

    htmlStr += '</div>';
    return htmlStr;
}