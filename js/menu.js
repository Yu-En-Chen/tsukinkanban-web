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
// 🟢 歷史紀錄：HTML 視圖生成器 (淺色模式修復 & 時間極簡版)
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

    // 🚫 定義不需要顯示的系統雜訊欄位 (✨ 加入 update_time 攔截，不讓它當成普通欄位印出)
    const skipKeys = ['timestamp', 'route_id', 'type', 'fid', 'airport', 'url', 'status_type', 'advanced_details', 'update_time'];
    
    // 🌐 翻譯字典
    const keyMap = {
        'delay_minutes': '遅延',
        'scheduled': '定刻',
        'latest': '変更',
        'gate': '搭乗口',
        'terminal': 'ターミナル',
        'status_text': '', 
        'message': '',     
        'note': ''         
    };

    historyList.forEach(info => {
        if (!Array.isArray(info.data) || info.data.length === 0) return;

        const snapshots = info.data.slice().reverse().slice(0, 3);

        // ✨ 修正 1：移除 color: #fff 改用 inherit。並將 border-left 改為中性灰色透明，確保在淺色模式也清晰可見
        let routeHtml = `
            <div>
                <div style="font-weight: 700; font-size: 1.05em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: inherit;">
                    <span style="width: 8px; height: 8px; background: #0a84ff; border-radius: 50%;"></span>
                    ${info.name}
                </div>
                <div style="display: flex; flex-direction: column; gap: 16px; padding-left: 14px; border-left: 2px solid rgba(128,128,128,0.25); margin-left: 3px;">
        `;

        snapshots.forEach((snapshot, index) => {
            // 第一筆 (最新) 保持全亮，舊的歷史紀錄稍微變暗
            const opacity = index === 0 ? '1' : '0.6';

            // ✨ 修正 2：徹底移除了本地端計算「xx:xx 更新」的邏輯
            let snapHtml = `<div style="display: flex; flex-direction: column; gap: 8px; opacity: ${opacity};">`;
            
            for (const [k, v] of Object.entries(snapshot)) {
                if (skipKeys.includes(k) || v === null || v === "") continue;

                let label = keyMap[k] !== undefined ? keyMap[k] : k;
                let displayVal = v;

                if (k === 'delay_minutes') {
                    if (v === 0) continue; 
                    displayVal = `${v} 分`;
                }

                if (label === '') {
                    snapHtml += `
                        <div style="font-weight: 500; font-size: 0.95em; color: inherit; word-break: break-word; overflow-wrap: break-word; line-height: 1.5;">
                            ${displayVal}
                        </div>
                    `;
                } else {
                    snapHtml += `
                        <div style="display: flex; gap: 12px; align-items: baseline; width: 100%;">
                            <span style="font-family: monospace; font-size: 0.85em; opacity: 0.6; width: 55px; flex-shrink: 0;">${label}</span>
                            <span style="font-weight: 500; font-size: 0.95em; color: inherit; word-break: break-word; overflow-wrap: break-word; flex: 1; min-width: 0; line-height: 1.4;">${displayVal}</span>
                        </div>
                    `;
                }
            }

            // ✨ 修正 3：把原生 API 提供的事件時間 (update_time) 取出，不做任何修飾，直接放在右下角
            if (snapshot.update_time) {
                snapHtml += `<div style="text-align: right; font-size: 0.75em; opacity: 0.45; margin-top: 2px;">${snapshot.update_time}</div>`;
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