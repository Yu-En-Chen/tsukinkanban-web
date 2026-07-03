// js/menu.js - 通知・履歷面板：開啟、即時更新與視圖生成

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('left-menu-btn');

    if (!menuBtn) return;

    menuBtn.onclick = null;

    // 觸發按鈕：開啟歷史紀錄頁
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const historyHTML = generateHistoryHTML();
        if (window.openUniversalPage) {
            window.openUniversalPage('通知・履歴', historyHTML);
            setTimeout(() => { initHistoryAccordions(); }, 50);
        }
    });

    // ============================================================================
    // 監聽 history-daemon 的資料更新事件，面板開啟時無縫替換內容
    // ============================================================================
    window.addEventListener('historyDataUpdated', () => {
        const root = document.getElementById('history-ui-root');
        
        // 僅在歷史紀錄面板開啟時更新畫面
        if (root && document.body.classList.contains('universal-active')) {
            console.log('背景資料已同步！正在無縫更新歷史紀錄畫面...');

            // 1. 記下目前展開中的分組，替換後恢復
            const openGroups = Array.from(root.querySelectorAll('.history-group.is-open'))
                                    .map(g => g.querySelector('.history-summary').innerText.trim());

            // 2. 替換 HTML
            root.outerHTML = generateHistoryHTML();

            // 3. 重新綁定手風琴事件，並恢復展開狀態
            setTimeout(() => {
                initHistoryAccordions();
                
                const newRoot = document.getElementById('history-ui-root');
                if (newRoot) {
                    const newGroups = newRoot.querySelectorAll('.history-group');
                    newGroups.forEach(group => {
                        const title = group.querySelector('.history-summary').innerText.trim();
                        // 原本展開的分組以程式觸發點擊，恢復展開
                        if (openGroups.includes(title)) {
                            group.querySelector('.history-summary').click();
                        }
                    });
                }
            }, 50);
        }
    });

    // Esc 鍵關閉通用子頁面
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (window.closeUniversalPage) window.closeUniversalPage(true);
        }
    });
});

// ============================================================================
// 手風琴展開／收合動畫
// ============================================================================
function initHistoryAccordions() {
    const groups = document.querySelectorAll('.history-group');
    
    groups.forEach(group => {
        const summary = group.querySelector('.history-summary');
        const wrapper = group.querySelector('.history-content-wrapper');
        
        summary.addEventListener('click', () => {
            const isOpen = group.classList.contains('is-open');
            
            if (isOpen) {
                wrapper.style.maxHeight = wrapper.scrollHeight + 'px'; 
                group.classList.remove('is-open');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        wrapper.style.maxHeight = '0px';
                        wrapper.style.opacity = '0';
                    });
                });
            } else {
                group.classList.add('is-open');
                wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
                wrapper.style.opacity = '1';
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
// 歷史紀錄：HTML 視圖生成器
// ============================================================================
function generateHistoryHTML() {
    const historyList = window.appHistoryCache;

    // 外層加上固定 ID，讓上方的更新邏輯可以整包替換
    let rootHtmlStr = '<div id="history-ui-root" style="width: 100%;">';

    // 狀態 1：完全沒有快取資料 (等待首度同步)
    if (!historyList) {
        rootHtmlStr += `
            <div style="text-align: center; color: var(--text-secondary, #8e8e93); font-size: 0.9em; padding: 20px;">
                <div style="opacity: 0.6; margin-bottom: 8px; display: flex; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </div>
                履歴データを同期中...
                <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
            </div></div>`;
        return rootHtmlStr;
    }

    let htmlStr = `
        <style>
            @keyframes spin { 100% { transform: rotate(360deg); } }
            .history-group {
                background: rgba(128, 128, 128, 0.1);
                border-radius: 32px; 
                overflow: hidden;
                margin-bottom: 12px;
                transition: background 0.35s ease; 
            }
            .history-group.is-open {
                background: rgba(128, 128, 128, 0.15);
            }
            .history-summary {
                padding: 16px 24px;
                font-weight: 700; /* 變更為標準粗體 */
                font-size: 0.95em;
                color: inherit;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
                transition: opacity 0.2s;
            }
            .history-summary:active { opacity: 0.7; }
            .history-arrow {
                transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 0.6;
            }
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

    const groupedData = new Map();
    const hasAnyCardRendered = document.querySelector('.card') !== null;

    if (window.appRailwayData) {
        window.appRailwayData.forEach(card => {
            if (card.isHidden === true || card.hidden === true || card.enabled === false || card.visible === false) return;
            
            let domCard = document.querySelector(`.card#${card.id}`) || 
                          document.querySelector(`.card#card-${card.id}`) || 
                          document.querySelector(`.card[data-id="${card.id}"]`);
            
            if (!domCard) domCard = document.getElementById(`card-${card.id}`); 

            if (!domCard) {
                if (hasAnyCardRendered) return; 
            } else {
                const style = window.getComputedStyle(domCard);
                if (style.display === 'none' || domCard.classList.contains('hidden') || domCard.closest('.hidden')) {
                    return; 
                }
            }

            const cardName = card.name || card.title || 'その他の路線';
            // 判斷這張卡片是否有設定任何路線 (相容鐵道與飛機格式)
            const targetIds = card.targetLineIds || card.targetAirports || card.airports || (card.airport ? [card.airport] : []);
            
            groupedData.set(card.id, {
                cardName: cardName,
                routes: [],
                hasRoutes: targetIds.length > 0 // 標記這張卡片是否為空
            });
        });
    }

    historyList.forEach(info => {
        if (info.cardId && groupedData.has(info.cardId)) {
            groupedData.get(info.cardId).routes.push(info);
        }
    });

    const skipKeys = ['timestamp', 'route_id', 'type', 'fid', 'airport', 'url', 'status_type', 'advanced_details', 'update_time', 'delay_minutes', 'system_updated'];
    const keyMap = {
        'delay_minutes': '遅延', 'scheduled': '定刻', 'latest': '変更',
        'gate': '搭乗口', 'terminal': 'ターミナル', 'status_text': '', 
        'message': '', 'note': ''         
    };

    for (const [cardId, group] of groupedData.entries()) {
        const cardName = group.cardName;
        const validRoutes = group.routes.filter(info => Array.isArray(info.data) && info.data.length > 0);

        // ==========================================
        // 跨夜排序：00:00 ~ 02:30 視為前一天的延伸
        // ==========================================
        validRoutes.sort((a, b) => {
            const latestA = a.data[a.data.length - 1] || {};
            const latestB = b.data[b.data.length - 1] || {};
            
            const timeA = latestA.update_time || latestA.system_updated || "";
            const timeB = latestB.update_time || latestB.system_updated || "";
            
            // 時間轉換為排序權重
            const getSortWeight = (timeStr) => {
                if (!timeStr) return -1;
                
                const match = timeStr.match(/(\d{1,2}):(\d{2})/);
                if (match) {
                    const hour = parseInt(match[1], 10);
                    const minute = parseInt(match[2], 10);
                    
                    // 先算出當天累計分鐘數
                    let totalMinutes = (hour * 60) + minute;
                    
                    // 00:00 ~ 02:30 (累計 <= 150 分鐘) 視為前一天延伸，
                    // 加上 24 小時 (1440 分鐘) 使其排在最後
                    if (totalMinutes <= 150) {
                        totalMinutes += 1440;
                    }
                    
                    return totalMinutes;
                }
                return 0; 
            };

            return getSortWeight(timeB) - getSortWeight(timeA);
        });
        // ==========================================

        htmlStr += `
            <div class="history-group">
                <div class="history-summary">
                    <div style="display: flex; align-items: center;">${cardName}</div>
                    <svg class="history-arrow" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                <div class="history-content-wrapper">
                    <div class="history-content">
        `;

        if (!group.hasRoutes) {
            // 狀態 A：卡片內沒有任何路線
            htmlStr += `
                <div style="text-align: center; padding: 16px 0; color: inherit; opacity: 0.6; font-size: 0.9em; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    追跡している路線はありません
                </div>
            `;
        } else if (validRoutes.length === 0) {
            // 狀態 B：有路線，資料尚在同步中
            htmlStr += `
                <div style="text-align: center; padding: 16px 0; color: inherit; opacity: 0.6; font-size: 0.9em; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    履歴データを同期中...
                </div>
            `;
        } else {
            validRoutes.forEach(info => {
                const snapshots = info.data.slice().reverse();
                let routeHtml = `
                    <div>
                        <div style="font-weight: 700; font-size: 0.95em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: inherit; opacity: 0.9;">
                            <span style="width: 6px; height: 6px; background: #0a84ff; border-radius: 50%;"></span>
                            ${info.name}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 16px; padding-left: 14px; border-left: 2px solid rgba(128,128,128,0.25); margin-left: 3px;">
                `;

                snapshots.forEach((snapshot, index) => {
                    const isLatest = index === 0;
                    const opacity = isLatest ? '1' : '0.65';
                    const colorStyle = isLatest ? 'color: inherit;' : 'color: #8e8e93;';
                    const timeOpacity = isLatest ? '0.5' : '0.85'; 
                    
                    const isLast = index === snapshots.length - 1;
                    const dividerStyle = isLast ? '' : 'border-bottom: 1px dashed rgba(128, 128, 128, 0.25); padding-bottom: 12px;';

                    // ==========================================
                    // 取得鐵路或航班的時間欄位，並去除秒數
                    // ==========================================
                    let displayTime = snapshot.update_time || snapshot.system_updated;
                    
                    if (displayTime && typeof displayTime === 'string') {
                        displayTime = displayTime.replace(/(\d{2}:\d{2}):\d{2}/, '$1');
                    }

                    // ==========================================
                    // 航班資料預處理
                    // ==========================================
                    if (info.isFlight) {
                        if (snapshot.status && !snapshot.status_text) {
                            snapshot.status_text = snapshot.status;
                        }

                        // 備註格式整理：
                        // 「【狀況】 內容」轉為「狀況: 內容」；若無內容則只留「狀況」
                        if (typeof snapshot.status_text === 'string') {
                            snapshot.status_text = snapshot.status_text.replace(/【/g, '').replace(/】\s*/g, '　：　').replace(/: $/, '');
                        }
                        if (typeof snapshot.note === 'string') {
                            snapshot.note = snapshot.note.replace(/【/g, '').replace(/】\s*/g, ': ').replace(/: $/, '');
                        }
                    }

                    const isNormalOperation = snapshot.status_text && (
                        snapshot.status_text.includes('平常') || 
                        snapshot.status_text.includes('通常') ||
                        (info.isFlight && (snapshot.status_text.includes('定刻') || snapshot.status_text.includes('On Time')))
                    );
                    
                    if (isNormalOperation) {
                        let snapHtml = `<div style="display: flex; flex-direction: column; gap: 6px; width: 100%; opacity: ${opacity}; ${colorStyle} ${dividerStyle}">`;
                        
                        snapHtml += `
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                                <span style="font-weight: 500; font-size: 0.95em; color: inherit;">${snapshot.status_text}</span>
                                ${displayTime ? `<span style="font-size: 0.75em; opacity: ${timeOpacity}; flex-shrink: 0; padding-top: 2px;">${displayTime}</span>` : ''}
                            </div>
                        `;

                        if (info.isFlight && snapshot.note) {
                            snapHtml += `<div style="font-weight: 500; font-size: 0.9em; color: inherit; word-break: break-word; overflow-wrap: break-word; line-height: 1.5; opacity: 0.85;">${snapshot.note}</div>`;
                        }
                        
                        snapHtml += `</div>`;
                        routeHtml += snapHtml;
                        return; 
                    }

                    if (snapshot.status_text && snapshot.status_text.includes('運行異常あり')) {
                        snapshot.status_text = '運行異常あり';
                    }

                    // 異常狀態區塊
                    let snapHtml = `<div style="display: flex; flex-direction: column; gap: 8px; opacity: ${opacity}; ${colorStyle} ${dividerStyle}">`;
                    let isTimeRendered = false; 

                    // ==========================================
                    // 資訊層級排序：
                    // 「狀態」固定在最上、「備註/公告」固定在最下
                    // ==========================================
                    const sortedEntries = Object.entries(snapshot).sort((a, b) => {
                        if (a[0] === 'status_text') return -1; // 把 status_text 往上推
                        if (b[0] === 'status_text') return 1;
                        if (a[0] === 'note') return 1;         // 把 note 往下壓
                        if (b[0] === 'note') return -1;
                        return 0;
                    });

                    for (const [k, v] of sortedEntries) {
                        if (skipKeys.includes(k) || v === null || v === "") continue;

                        if (info.isFlight && k !== 'status_text' && k !== 'note') {
                            continue; 
                        }

                        let label = keyMap[k] !== undefined ? keyMap[k] : k;
                        let displayVal = v;
                        
                        if (k === 'status_text') {
                            snapHtml += `
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                                    <span style="font-weight: 500; font-size: 0.95em; color: inherit; word-break: break-word; overflow-wrap: break-word; line-height: 1.5; padding-right: 12px;">${displayVal}</span>
                                    ${displayTime ? `<span style="font-size: 0.75em; opacity: ${timeOpacity}; flex-shrink: 0; padding-top: 2px;">${displayTime}</span>` : ''}
                                </div>
                            `;
                            isTimeRendered = true;
                        } else if (info.isFlight && k === 'note') {
                            snapHtml += `<div style="font-weight: 500; font-size: 0.9em; color: inherit; word-break: break-word; overflow-wrap: break-word; line-height: 1.5; opacity: 0.85;">${displayVal}</div>`;
                        } else if (label === '') {
                            snapHtml += `<div style="font-weight: 500; font-size: 0.95em; color: inherit; word-break: break-word; overflow-wrap: break-word; line-height: 1.5;">${displayVal}</div>`;
                        } else {
                            snapHtml += `
                                <div style="display: flex; gap: 12px; align-items: baseline; width: 100%;">
                                    <span style="font-family: monospace; font-size: 0.85em; opacity: ${isLatest ? '0.6' : '0.85'}; width: 55px; flex-shrink: 0;">${label}</span>
                                    <span style="font-weight: 500; font-size: 0.95em; color: inherit; word-break: break-word; overflow-wrap: break-word; flex: 1; min-width: 0; line-height: 1.4;">${displayVal}</span>
                                </div>
                            `;
                        }
                    }

                    if (displayTime && !isTimeRendered) {
                        snapHtml += `<div style="text-align: right; font-size: 0.75em; opacity: ${timeOpacity}; margin-top: 2px;">${displayTime}</div>`;
                    }

                    snapHtml += `</div>`;
                    routeHtml += snapHtml;
                });
                routeHtml += `</div></div>`;
                htmlStr += routeHtml;
            });
        }

        htmlStr += `</div></div></div>`; 
    }

    if (groupedData.size === 0) {
        rootHtmlStr += '<div style="text-align: center; color: var(--text-secondary, #8e8e93); font-size: 0.9em; padding: 20px;">表示可能な路線がありません</div></div>';
        return rootHtmlStr;
    }

    // ==========================================
    // 底部的系統規則說明
    // ==========================================
    htmlStr += `
        <div style="text-align: center; margin-top: 24px; padding-bottom: 8px; font-size: 0.75em; color: #8e8e93; opacity: 0.8; line-height: 1.6; letter-spacing: 0.02em;">
             各路線の履歴は最新5件まで表示されます。<br>
             鉄道の履歴データは毎日03:00にリセットされます。
        </div>
    `;

    htmlStr += '</div>';
    rootHtmlStr += htmlStr + '</div>';
    return rootHtmlStr;
}