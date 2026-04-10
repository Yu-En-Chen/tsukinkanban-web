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
            window.openUniversalPage('通知・履歴（Beta）', historyHTML);
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
// 🟢 歷史紀錄：HTML 視圖生成器 (全圓角膠囊美學版)
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

    // 1. ✨ 注入專屬 CSS：動態形變的膠囊選單
    let htmlStr = `
        <style>
            .history-group {
                background: rgba(128, 128, 128, 0.08);
                border-radius: 100px; /* ✨ 閉合時：完美的膠囊形狀 (左右正圓) */
                overflow: hidden;
                border: 1px solid rgba(128, 128, 128, 0.15);
                margin-bottom: 12px;
                /* 讓圓角與背景色在點擊時有果凍般的平滑過渡 */
                transition: all 0.17s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .history-group[open] {
                background: rgba(128, 128, 128, 0.15);
                border-radius: 28px; /* ✨ 展開時：稍微減少圓角弧度，避免底下內容被切斷 */
            }
            .history-summary {
                padding: 14px 24px; /* ✨ 左右增加 padding (24px) 來完美貼合大圓角 */
                font-weight: 600;
                font-size: 1.05em;
                color: inherit;
                cursor: pointer;
                list-style: none; /* 隱藏原生箭頭 */
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
            }
            .history-summary::-webkit-details-marker {
                display: none; /* 針對 Safari 隱藏原生箭頭 */
            }
            /* 自訂精緻箭頭 */
            .history-summary::after {
                content: '';
                display: inline-block;
                width: 8px;
                height: 8px;
                border-right: 2px solid rgba(128,128,128,0.8);
                border-bottom: 2px solid rgba(128,128,128,0.8);
                transform: rotate(45deg);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                margin-right: 4px;
            }
            .history-group[open] .history-summary::after {
                transform: rotate(225deg);
                margin-top: 4px;
            }
            .history-content {
                padding: 0 24px 24px 24px; /* ✨ 配合上方的左右 24px 間距 */
                display: flex;
                flex-direction: column;
                gap: 24px;
                animation: slideDown 0.3s ease-out forwards;
            }
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
        
        <div style="padding-top: 18px; padding-bottom: 40px;">
    `;

    // 2. 將資料依據卡片名稱進行分群 (Grouping)
    const groupedData = {};
    historyList.forEach(info => {
        const groupName = info.cardName || 'その他の路線';
        if (!groupedData[groupName]) {
            groupedData[groupName] = [];
        }
        groupedData[groupName].push(info);
    });

    const skipKeys = ['timestamp', 'route_id', 'type', 'fid', 'airport', 'url', 'status_type', 'advanced_details', 'update_time'];
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

    // 3. 渲染出一個個的手風琴資料夾
    let isFirstGroup = true;

    for (const [cardName, routes] of Object.entries(groupedData)) {
        const validRoutes = routes.filter(info => Array.isArray(info.data) && info.data.length > 0);
        if (validRoutes.length === 0) continue;

        const isOpen = isFirstGroup ? 'open' : '';
        isFirstGroup = false;

        htmlStr += `
            <details class="history-group" ${isOpen}>
                <summary class="history-summary">
                    <div style="display: flex; align-items: center;">
                        ${cardName}
                    </div>
                </summary>
                <div class="history-content">
        `;

        // 在資料夾內部渲染該卡片專屬的路線
        validRoutes.forEach(info => {
            const snapshots = info.data.slice().reverse().slice(0, 3);

            let routeHtml = `
                <div>
                    <div style="font-weight: 700; font-size: 0.95em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: inherit; opacity: 0.9;">
                        <span style="width: 6px; height: 6px; background: #0a84ff; border-radius: 50%;"></span>
                        ${info.name}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 16px; padding-left: 14px; border-left: 2px solid rgba(128,128,128,0.25); margin-left: 3px;">
            `;

            snapshots.forEach((snapshot, index) => {
                const opacity = index === 0 ? '1' : '0.6';
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
                        snapHtml += `<div style="font-weight: 500; font-size: 0.95em; color: inherit; word-break: break-word; overflow-wrap: break-word; line-height: 1.5;">${displayVal}</div>`;
                    } else {
                        snapHtml += `
                            <div style="display: flex; gap: 12px; align-items: baseline; width: 100%;">
                                <span style="font-family: monospace; font-size: 0.85em; opacity: 0.6; width: 55px; flex-shrink: 0;">${label}</span>
                                <span style="font-weight: 500; font-size: 0.95em; color: inherit; word-break: break-word; overflow-wrap: break-word; flex: 1; min-width: 0; line-height: 1.4;">${displayVal}</span>
                            </div>
                        `;
                    }
                }

                if (snapshot.update_time) {
                    snapHtml += `<div style="text-align: right; font-size: 0.75em; opacity: 0.45; margin-top: 2px;">${snapshot.update_time}</div>`;
                }

                snapHtml += `</div>`;
                routeHtml += snapHtml;
            });

            routeHtml += `</div></div>`;
            htmlStr += routeHtml;
        });

        htmlStr += `</div></details>`;
    }

    htmlStr += '</div>';
    return htmlStr;
}