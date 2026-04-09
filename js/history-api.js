// js/history-api.js

/**
 * 將歷史紀錄載入到指定的 DOM 容器中
 * @param {HTMLElement} container - 準備用來裝歷史紀錄的 DOM 元素
 */
export async function loadHistoryInto(container) {
    if (!container) return;

    // 1. 顯示高質感的 Loading 狀態 (無縫融入暗色面板)
    container.innerHTML = `
        <div style="padding: 30px 20px; text-align: center; color: var(--text-secondary, #8e8e93);">
            <div style="margin-bottom: 12px; display: flex; justify-content: center; opacity: 0.7;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
            </div>
            <p style="font-size: 0.85em; font-weight: 600; letter-spacing: 0.5px;">運行履歴を同期中...</p>
            <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
        </div>
    `;

    try {
        const fetchTasks = [];

        // 2. 蒐集主畫面上正在追蹤的卡片路線 ID
        if (window.appRailwayData && window.appRailwayData.length > 0) {
            window.appRailwayData.forEach(card => {
                if (card.targetLineIds) {
                    card.targetLineIds.forEach(id => {
                        const isFlight = card.isFlightCard;
                        const type = isFlight ? 'flight' : 'railway';
                        
                        let finalId = id;
                        if (isFlight && !id.includes('Departure_') && !id.includes('Arrival_')) {
                            finalId = `Departure_${id}`; 
                        }

                        const url = `https://tsukinkanban-odpt.onrender.com/api/history/${type}/${finalId}`;
                        
                        // 取得漂亮的中文/日文名稱 (例如 "千代田線")
                        let routeName = (window.MasterRouteDictionary && window.MasterRouteDictionary[id]) 
                                        ? window.MasterRouteDictionary[id].name : id;
                        routeName = routeName.replace('Departure_', '出發 ').replace('Arrival_', '抵達 ');

                        // 封裝請求，遇到 404 或 CORS 默默回傳 null，不讓系統崩潰
                        const requestPromise = fetch(url)
                            .then(async res => {
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                const data = await res.json();
                                return { name: routeName, data: data };
                            })
                            .catch(err => null);

                        fetchTasks.push(requestPromise);
                    });
                }
            });
        }

        if (fetchTasks.length === 0) {
            container.innerHTML = ``; // 沒路線時保持乾淨，不顯示任何東西
            return;
        }

        // 3. 同時發射所有 API 請求 (併發)
        const results = await Promise.allSettled(fetchTasks);

        const validHistoryList = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value !== null) {
                const info = result.value;
                // 確認真的有資料才加入
                if ((Array.isArray(info.data) && info.data.length > 0) || 
                    (typeof info.data === 'object' && Object.keys(info.data).length > 0)) {
                    validHistoryList.push(info);
                }
            }
        });

        // 4. 呼叫渲染函式
        renderHistoryUI(container, validHistoryList);

    } catch (error) {
        container.innerHTML = ``; // 發生嚴重錯誤時默默隱藏，不破壞使用者體驗
    }
}

/**
 * 內部渲染函式：負責過濾髒資料與排版
 */
function renderHistoryUI(container, historyList) {
    if (historyList.length === 0) {
        container.innerHTML = '';
        return;
    }

    let htmlStr = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 10px 0 30px 0;">';
    htmlStr += '<div style="font-size: 0.75em; font-weight: 700; color: var(--text-secondary, #8e8e93); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; padding-left: 4px;">Timeline</div>';

    historyList.forEach(info => {
        const routeName = info.name;
        
        // 🧹 智慧資料清洗器 (拔除 odpt.Railway 等冗餘 ID)
        const parseHistoryData = (data) => {
            let items = [];
            if (Array.isArray(data)) {
                data.forEach(item => items.push(`<span>${item}</span>`));
            } else if (typeof data === 'object') {
                for (const [key, val] of Object.entries(data)) {
                    if (key.includes('odpt.') || key.includes('Departure_') || key.includes('Arrival_')) {
                        if (typeof val === 'object') items = items.concat(parseHistoryData(val));
                    } else {
                        // 提取乾淨的 時間 與 狀態
                        let displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
                        // 若狀態有「遅延」或「見合」，自動變成紅色
                        let valColor = displayVal.includes('遅延') || displayVal.includes('見合') ? '#ff453a' : '#fff';
                        
                        items.push(`
                            <div style="display: flex; gap: 12px; align-items: baseline; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <span style="font-family: monospace; font-size: 0.9em; opacity: 0.6; width: 45px; flex-shrink: 0;">${key}</span>
                                <span style="font-weight: 500; font-size: 0.95em; color: ${valColor};">${displayVal}</span>
                            </div>
                        `);
                    }
                }
            }
            return items;
        };

        const parsedItems = parseHistoryData(info.data);

        if (parsedItems.length > 0) {
            // 最多顯示最新 4 筆動態
            const displayItems = parsedItems.slice(0, 4); 

            // 卡片 UI 設計
            htmlStr += `
                <div class="history-item-card" style="background: rgba(30, 30, 32, 0.5); border-radius: 16px; padding: 16px; border: 1px solid rgba(255, 255, 255, 0.08);">
                    <div style="font-weight: 700; font-size: 1.05em; color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <div style="width: 8px; height: 8px; background: #0a84ff; border-radius: 50%; box-shadow: 0 0 8px rgba(10,132,255,0.6);"></div>
                        ${routeName}
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        ${displayItems.join('')}
                    </div>
                </div>
            `;
        }
    });
    
    htmlStr += '</div>';

    // 漸顯過場動畫
    container.style.opacity = '0';
    container.innerHTML = htmlStr;
    requestAnimationFrame(() => {
        container.style.transition = 'opacity 0.4s ease';
        container.style.opacity = '1';
    });
}