// js/menu.js - 左側選單互動邏輯

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('left-menu-btn');

    if (!menuBtn) return;

    menuBtn.onclick = null;

    // 1. 純粹的觸發按鈕
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        console.log('Menu Clicked - Opening Universal Page for History');
        
        const historyHTML = generateHistoryHTML();
        if (window.openUniversalPage) {
            window.openUniversalPage('通知・履歴', historyHTML);
            
            // ✨ 核心升級：在通用底版渲染完成後，啟動我們的平滑手風琴引擎！
            setTimeout(() => {
                initHistoryAccordions();
            }, 50);
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
// ✨ 物理級滑順動畫引擎 (取代原生生硬的 details)
// ============================================================================
function initHistoryAccordions() {
    const groups = document.querySelectorAll('.history-group');
    
    groups.forEach(group => {
        const summary = group.querySelector('.history-summary');
        const wrapper = group.querySelector('.history-content-wrapper');
        
        summary.addEventListener('click', () => {
            const isOpen = group.classList.contains('is-open');
            
            if (isOpen) {
                // 🔴 準備關閉：先將高度鎖定為當前的 Pixel 數值，讓瀏覽器有動畫的基準點
                wrapper.style.maxHeight = wrapper.scrollHeight + 'px'; 
                group.classList.remove('is-open');
                
                // 利用 double requestAnimationFrame 強制瀏覽器重繪，再縮成 0
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        wrapper.style.maxHeight = '0px';
                        wrapper.style.opacity = '0';
                    });
                });
            } else {
                // 🟢 準備展開：計算內部真實高度並設定
                group.classList.add('is-open');
                wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
                wrapper.style.opacity = '1';
                
                // 動畫結束後（0.35s），解除高度鎖定，以防未來內部文字換行導致被裁切
                setTimeout(() => {
                    if (group.classList.contains('is-open')) {
                        wrapper.style.maxHeight = 'none';
                    }
                }, 350);
            }
        });
    });
}

// ============================================================================
// 🟢 歷史紀錄：HTML 視圖生成器 (無形變極致滑順版)
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

    // 1. ✨ CSS 升級：固定圓角，拔除形變抽搐感
    let htmlStr = `
        <style>
            .history-group {
                background: rgba(128, 128, 128, 0.08);
                /* ✨ 核心修正：固定 32px。閉合時它會自動形成完美膠囊，展開時會成為平滑拉長的大圓角 */
                border-radius: 32px; 
                overflow: hidden;
                border: 1px solid rgba(128, 128, 128, 0.15);
                margin-bottom: 12px;
                /* ✨ 拔除了 border-radius 的動畫，現在只過渡背景色，視覺極度穩定 */
                transition: background 0.35s ease; 
            }
            .history-group.is-open {
                background: rgba(128, 128, 128, 0.15);
                /* 🔴 不再改變 border-radius */
            }
            .history-summary {
                padding: 16px 24px; /* ✨ 稍微增加上下 padding，讓膠囊更飽滿完美 */
                font-weight: 600;
                font-size: 1.05em;
                color: inherit;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
                transition: opacity 0.2s;
            }
            .history-summary:active {
                opacity: 0.7; 
            }
            .history-arrow {
                transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 0.6; /* 讓圖示稍微帶有透明度，質感更好 */
            }
            /* ✨ 展開時，讓 SVG 旋轉 180 度變成向上 */
            .history-group.is-open .history-arrow {
                transform: rotate(-180deg);
            }
            .history-content-wrapper {
                max-height: 0px; 
                opacity: 0;
                overflow: hidden;
                transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .history-content {
                padding: 0 24px 24px 24px;
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
        </style>
        
        <div style="padding-top: 18px; padding-bottom: 40px;">
    `;

    // 2. ✨ 將資料嚴格依據主畫面的「當前順序」與「顯示狀態」進行分群
    const groupedData = new Map(); // 使用 Map 來完美繼承 JavaScript 陣列的插入順序

    // 步驟 A：以主畫面卡片為藍圖，建立排序資料夾
    if (window.appRailwayData) {
        window.appRailwayData.forEach(card => {
            // 🟢 瞬間同步：如果卡片在設定中被隱藏，連資料夾都不建！舊快取會自動失效
            if (card.isHidden === true || card.hidden === true || card.enabled === false || card.visible === false) return;
            
            const cardName = card.name || card.title || 'その他の路線';
            groupedData.set(card.id, {
                cardName: cardName,
                routes: []
            });
        });
    }

    // 步驟 B：將快取裡的歷史紀錄，精準投遞到合法資料夾中
    historyList.forEach(info => {
        // 只有當這筆歷史紀錄的歸屬卡片目前「活在主畫面上」時，才放入資料夾
        if (info.cardId && groupedData.has(info.cardId)) {
            groupedData.get(info.cardId).routes.push(info);
        }
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

    // 3. ✨ 渲染出一個個的手風琴資料夾 (改為讀取 Map)
    for (const [cardId, group] of groupedData.entries()) {
        const cardName = group.cardName;
        
        // 過濾掉沒有實質歷史資料的路線
        const validRoutes = group.routes.filter(info => Array.isArray(info.data) && info.data.length > 0);
        if (validRoutes.length === 0) continue;

        htmlStr += `
            <div class="history-group">
                <div class="history-summary">
                    <div style="display: flex; align-items: center;">
                        ${cardName}
                    </div>
                    <svg class="history-arrow" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                <div class="history-content-wrapper">
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

        htmlStr += `</div></div></div>`; 
    }

    htmlStr += '</div>';
    return htmlStr;
}