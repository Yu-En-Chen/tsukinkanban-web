// js/history-engine.js

export async function loadNativeHistory(targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    // 1. 純淨的 Loading 狀態 (完全繼承父層 CSS)
    container.innerHTML = `
        <div style="padding: 20px 0; text-align: center; color: var(--text-secondary, #8e8e93); font-size: 0.9em;">
            <div style="opacity: 0.6; margin-bottom: 8px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
            </div>
            運行履歴を同期中...
        </div>
    `;

    try {
        const fetchTasks = [];

        // 2. 蒐集路線 ID 並發送 API
        if (window.appRailwayData && window.appRailwayData.length > 0) {
            window.appRailwayData.forEach(card => {
                if (card.targetLineIds) {
                    card.targetLineIds.forEach(id => {
                        const type = card.isFlightCard ? 'flight' : 'railway';
                        let finalId = id;
                        if (card.isFlightCard && !id.includes('Departure_') && !id.includes('Arrival_')) {
                            finalId = `Departure_${id}`; 
                        }

                        const url = `https://api.tsukinkanban.com/api/history/${type}/${finalId}?t=${Date.now()}`;
                        let routeName = (window.MasterRouteDictionary && window.MasterRouteDictionary[id]) ? window.MasterRouteDictionary[id].name : id;
                        routeName = routeName.replace('Departure_', '出發 ').replace('Arrival_', '抵達 ');

                        const requestPromise = fetch(url, { cache: 'no-store' })
                            .then(async res => {
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                return { name: routeName, data: await res.json() };
                            }).catch(() => null);

                        fetchTasks.push(requestPromise);
                    });
                }
            });
        }

        if (fetchTasks.length === 0) {
            container.innerHTML = ''; return;
        }

        const results = await Promise.allSettled(fetchTasks);
        const validHistoryList = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                const info = result.value;
                if ((Array.isArray(info.data) && info.data.length > 0) || (typeof info.data === 'object' && Object.keys(info.data).length > 0)) {
                    validHistoryList.push(info);
                }
            }
        });

        // 3. 渲染純淨的 UI 列表
        renderCleanHistory(container, validHistoryList);

    } catch (error) {
        container.innerHTML = '';
    }
}

function renderCleanHistory(container, historyList) {
    if (historyList.length === 0) {
        container.innerHTML = ''; return;
    }

    let htmlStr = '<div style="display: flex; flex-direction: column; gap: 16px;">';
    htmlStr += '<div style="font-size: 0.75em; font-weight: 700; color: var(--text-secondary, #8e8e93); text-transform: uppercase; letter-spacing: 1px;">Timeline</div>';

    historyList.forEach(info => {
        // 智慧清洗冗餘 ID
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
                                <span style="font-family: monospace; font-size: 0.9em; opacity: 0.6; width: 45px;">${key}</span>
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
            // 這個區塊不設定強制背景，完全靠攏你母艦的 CSS
            htmlStr += `
                <div style="padding-bottom: 8px;">
                    <div style="font-weight: 700; font-size: 1em; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                        <span style="width: 6px; height: 6px; background: #0a84ff; border-radius: 50%;"></span>
                        ${info.name}
                    </div>
                    <div style="padding-left: 14px;">
                        ${parsedItems.join('')}
                    </div>
                </div>
            `;
        }
    });
    
    htmlStr += '</div>';
    
    container.style.opacity = '0';
    container.innerHTML = htmlStr;
    requestAnimationFrame(() => {
        container.style.transition = 'opacity 0.4s ease';
        container.style.opacity = '1';
    });
}