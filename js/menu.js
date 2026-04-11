// js/menu.js - 左側選單互動邏輯 (響應式自動更新版)

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('left-menu-btn');

    if (!menuBtn) return;

    menuBtn.onclick = null;

    // 1. 純粹的觸發按鈕
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
    // 🚀 核心升級：監聽小精靈的「資料更新」廣播，達成無縫即時替換
    // ============================================================================
    window.addEventListener('historyDataUpdated', () => {
        const root = document.getElementById('history-ui-root');
        
        // 只有當「歷史紀錄面板」正在開啟狀態時，我們才執行畫面更新
        if (root && document.body.classList.contains('universal-active')) {
            console.log('🔄 背景資料已同步！正在無縫更新歷史紀錄畫面...');

            // 1. 記憶術：掃描現在有哪些資料夾是「展開」的，把名字記下來
            const openGroups = Array.from(root.querySelectorAll('.history-group.is-open'))
                                    .map(g => g.querySelector('.history-summary').innerText.trim());

            // 2. 瞬間替換 HTML
            root.outerHTML = generateHistoryHTML();

            // 3. 重新啟動動畫引擎，並恢復使用者的閱讀進度
            setTimeout(() => {
                initHistoryAccordions();
                
                const newRoot = document.getElementById('history-ui-root');
                if (newRoot) {
                    const newGroups = newRoot.querySelectorAll('.history-group');
                    newGroups.forEach(group => {
                        const title = group.querySelector('.history-summary').innerText.trim();
                        // 如果這個資料夾剛剛是打開的，我們就偷偷用程式點擊它一次，讓它優雅地滑開
                        if (openGroups.includes(title)) {
                            group.querySelector('.history-summary').click();
                        }
                    });
                }
            }, 50);
        }
    });

    // Esc 鍵直接連動關閉通用底版
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (window.closeUniversalPage) window.closeUniversalPage(true);
        }
    });
});

// ============================================================================
// ✨ 物理級滑順動畫引擎
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
// 🟢 歷史紀錄：HTML 視圖生成器
// ============================================================================
function generateHistoryHTML() {
    const historyList = window.appHistoryCache;

    // 🟢 替整個 UI 包上一層帶有 ID 的防護罩，這是為了讓上面的更新引擎可以整包替換
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
                background: rgba(128, 128, 128, 0.08);
                border-radius: 32px; 
                overflow: hidden;
                border: 1px solid rgba(128, 128, 128, 0.15);
                margin-bottom: 12px;
                transition: background 0.35s ease; 
            }
            .history-group.is-open {
                background: rgba(128, 128, 128, 0.15);
            }
            .history-summary {
                padding: 16px 24px;
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
            groupedData.set(card.id, {
                cardName: cardName,
                routes: []
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
        // ✨ 核心升級：路線智慧排序引擎 (最新更新的路線置頂)
        // ==========================================
        validRoutes.sort((a, b) => {
            // 取得 A 路線與 B 路線的「最新一筆」紀錄 (陣列的最後一個元素)
            const latestA = a.data[a.data.length - 1] || {};
            const latestB = b.data[b.data.length - 1] || {};
            
            // 兼容抓取鐵路 (update_time) 或飛機 (system_updated) 的時間
            const timeA = latestA.update_time || latestA.system_updated || "";
            const timeB = latestB.update_time || latestB.system_updated || "";
            
            // 使用字串比對進行「降冪排序」(時間越新的越上面)
            // 因為 ISO 時間或 HH:MM:SS 格式都具備完美的字串可比對性
            return timeB.localeCompare(timeA);
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

        if (validRoutes.length === 0) {
            htmlStr += `
                <div style="text-align: center; padding: 12px 0; color: inherit; opacity: 0.5; font-size: 0.9em; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
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
                    // ✨ 核心修復：抓取「鐵路時間」或「飛機時間」並過濾秒數
                    // ==========================================
                    let displayTime = snapshot.update_time || snapshot.system_updated;
                    
                    if (displayTime && typeof displayTime === 'string') {
                        displayTime = displayTime.replace(/(\d{2}:\d{2}):\d{2}/, '$1');
                    }

                    // ==========================================
                    // 飛機資料的「預處理」
                    // ==========================================
                    if (info.isFlight) {
                        if (snapshot.status && !snapshot.status_text) {
                            snapshot.status_text = snapshot.status;
                        }

                        // 🟢 ✨ 核心升級：括號淨化器
                        // 將 "【狀況】 內容..." 轉換為優雅的 "狀況: 內容..."；若無內容則只留 "狀況"
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
                        
                        // ✨ 將時間變數改為 displayTime
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

                    // 🔴 異常狀態區塊
                    let snapHtml = `<div style="display: flex; flex-direction: column; gap: 8px; opacity: ${opacity}; ${colorStyle} ${dividerStyle}">`;
                    let isTimeRendered = false; 

                    // ==========================================
                    // ✨ 核心升級：強制資訊層級排序器
                    // 保證「狀態」永遠在最上面，「備註/公告」永遠在最下面
                    // ==========================================
                    const sortedEntries = Object.entries(snapshot).sort((a, b) => {
                        if (a[0] === 'status_text') return -1; // 把 status_text 往上推
                        if (b[0] === 'status_text') return 1;
                        if (a[0] === 'note') return 1;         // 把 note 往下壓
                        if (b[0] === 'note') return -1;
                        return 0;
                    });

                    // ✨ 迴圈改為讀取排好序的 sortedEntries
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

    htmlStr += '</div>';
    rootHtmlStr += htmlStr + '</div>';
    return rootHtmlStr;
}