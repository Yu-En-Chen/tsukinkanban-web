// menu.js - 左側選單互動邏輯

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('left-menu-btn');

    // 1. 安全檢查：如果找不到按鈕就報錯停止
    if (!menuBtn) {
        console.error('Menu button not found!');
        return;
    }

    // 2. 清除 HTML 可能殘留的 onclick 設定
    menuBtn.onclick = null;

    // 3. 綁定點擊事件
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const isExpanded = menuBtn.classList.toggle('is-expanded');

        document.body.classList.toggle('menu-active', isExpanded);
        // 🟢 新增：賦予專屬類別，徹底避免 CSS :has() 導致的當機
        document.body.classList.toggle('hamburger-active', isExpanded);

        if (isExpanded) {
            console.log('Menu: Expanded (Open)');
        } else {
            console.log('Menu: Collapsed (Close)');
        }
    });

    // 4. 點擊 Esc 鍵關閉
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuBtn.classList.contains('is-expanded')) {
            menuBtn.classList.remove('is-expanded');
            document.body.classList.remove('menu-active');
            // 🟢 新增：同步移除專屬類別
            document.body.classList.remove('hamburger-active');
            console.log('Menu: Closed by ESC');
        }
    });
});

// ============================================================================
// 🟢 歷史紀錄抓取引擎 (暴力疊加防彈版 + 8 級偵測)
// ============================================================================

// 1. 強制攔截漢堡按鈕點擊
document.addEventListener('click', (event) => {
    // 檢查是否點到漢堡按鈕
    const menuBtn = event.target.closest('#left-menu-btn');
    if (menuBtn) {
        console.log("🟢 [History API] 1. 成功攔截點擊！");
        
        // 延遲 400 毫秒
        setTimeout(() => {
            console.log("🟢 [History API] 2. 準備生成 DOM 容器...");
            let historyContainer = document.getElementById('history-content-area');

            if (!historyContainer) {
                historyContainer = document.createElement('div');
                historyContainer.id = 'history-content-area';
                
                // 🚀 暴力破解：直接覆蓋在整個螢幕最上層，絕對不被任何東西遮擋！
                historyContainer.style.cssText = `
                    position: fixed;
                    top: 80px; /* 避開頂部的搜尋列與按鈕 */
                    left: 0;
                    width: 100%;
                    bottom: 0;
                    overflow-y: auto;
                    z-index: 2147483647; /* 網頁允許的最大層級，天王老子來了都擋不住 */
                    padding: 20px;
                    box-sizing: border-box;
                    background: rgba(15, 15, 18, 0.95); /* 深色背景保證對比度 */
                    backdrop-filter: blur(10px);
                    color: white; /* 強制白字 */
                `;
                // 綁定在 body 上，避免被選單重置腳本洗掉
                document.body.appendChild(historyContainer); 
                console.log("🟢 [History API] 3. 容器已強力綁定到 document.body！");
            } else {
                // 如果已經存在，確保它是顯示的
                historyContainer.style.display = 'block';
            }

            // 觸發抓取引擎
            fetchAndRenderHistory('history-content-area');
        }, 400); 
    }

    // 💡 點擊「關閉按鈕」時，把我們的歷史面板也隱藏起來
    const closeMenuBtn = event.target.closest('.close-btn'); // 如果你的關閉按鈕是這個 class
    if (closeMenuBtn) {
        const historyContainer = document.getElementById('history-content-area');
        if (historyContainer) historyContainer.style.display = 'none';
    }
}, true);


// 2. 防彈版歷史紀錄抓取 API
async function fetchAndRenderHistory(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    console.log("🟢 [History API] 4. 開始渲染 Loading 骨架屏...");
    container.innerHTML = `
        <div style="padding: 30px 20px; text-align: center; color: #fff;">
            <div style="margin-bottom: 12px; display: flex; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
            </div>
            <p style="font-size: 1.1em; font-weight: bold;">履歴データを取得中...</p>
            <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
        </div>
    `;

    try {
        const fetchTasks = [];

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
                        const routeName = (window.MasterRouteDictionary && window.MasterRouteDictionary[id]) ? window.MasterRouteDictionary[id].name : finalId;

                        const requestPromise = fetch(url)
                            .then(async res => {
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                const data = await res.json();
                                return { name: routeName, data: data };
                            })
                            .catch(err => {
                                console.warn(`⚠️ [History] ${routeName} 無法取得資料:`, err);
                                return null; 
                            });

                        fetchTasks.push(requestPromise);
                    });
                }
            });
        }

        console.log(`🟢 [History API] 5. 畫面上共找到 ${fetchTasks.length} 條路線，準備發射 API...`);

        if (fetchTasks.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding: 20px;">追跡している路線はありません</div>`;
            return;
        }

        console.log("🟢 [History API] 6. Promise.allSettled 發射，等待後端回應...");
        const results = await Promise.allSettled(fetchTasks);
        console.log("🟢 [History API] 7. 後端回應完畢！原始資料:", results);

        const validHistoryList = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value !== null) {
                const info = result.value;
                if ((Array.isArray(info.data) && info.data.length > 0) || 
                    (typeof info.data === 'object' && Object.keys(info.data).length > 0)) {
                    validHistoryList.push(info);
                }
            }
        });

        console.log(`🟢 [History API] 8. 過濾後有真實資料的路線共 ${validHistoryList.length} 條，準備渲染 UI！`);
        renderHistoryUI(container, validHistoryList);

    } catch (error) {
        console.error('🔴 [History API] 嚴重網路錯誤:', error);
        container.innerHTML = `<div style="text-align: center; color: #ff453a;">⚠️ ネットワークエラー</div>`;
    }
}

// 3. UI 渲染模組
function renderHistoryUI(container, historyList) {
    let htmlStr = '<div style="display: flex; flex-direction: column; gap: 12px; padding-bottom: 50px;">';
    
    if (historyList.length === 0) {
        htmlStr += '<div style="text-align: center; padding: 20px;">履歴データがありません</div>';
    } else {
        historyList.forEach(info => {
            const routeName = info.name;
            const historyData = info.data;

            let historyHtml = '';
            if (Array.isArray(historyData)) {
                historyHtml = historyData.map(h => `<div style="margin-top: 4px; display: flex; gap:8px;"><span style="color:#0a84ff;">•</span><span>${h}</span></div>`).join('');
            } else if (typeof historyData === 'object') {
                 historyHtml = Object.entries(historyData).map(([key, val]) => `<div style="margin-top: 4px; display: flex; gap:8px;"><span style="color:#0a84ff;">•</span><span>${key}: ${val}</span></div>`).join('');
            } else {
                historyHtml = `<span>${historyData}</span>`;
            }

            htmlStr += `
                <div style="background: rgba(255, 255, 255, 0.1); padding: 16px; border-radius: 16px;">
                    <div style="font-weight: 800; font-size: 1.1em; margin-bottom: 8px;">${routeName}</div>
                    <div style="font-size: 0.9em; opacity: 0.9; line-height: 1.6;">${historyHtml}</div>
                </div>
            `;
        });
    }
    htmlStr += '</div>';
    container.innerHTML = htmlStr;
}

// ============================================================================
// 🟢 歷史紀錄 API 外掛模組 (免 Import 安全版)
// ============================================================================

document.addEventListener('click', (event) => {
    // 監聽左上角的漢堡按鈕
    const menuBtn = event.target.closest('#left-menu-btn');
    if (menuBtn) {
        // 等待 400 毫秒，讓你的通用面板動畫順利滑出
        setTimeout(() => {
            // 尋找通用面板的內容容器
            const panelContainer = document.querySelector('.menu-card-inner') || 
                                   document.querySelector('.main-menu-container') || 
                                   document.body;

            // 建立一個專屬的 div 給歷史紀錄
            let historyBox = document.getElementById('history-extension-box');
            if (!historyBox) {
                historyBox = document.createElement('div');
                historyBox.id = 'history-extension-box';
                // 加上間距，讓它乖乖排在 supporter 等內容的下方
                historyBox.style.cssText = 'width: 100%; margin-top: 16px; padding: 0 16px 40px 16px; box-sizing: border-box;';
                
                panelContainer.appendChild(historyBox);
            }

            // 喚醒底下的歷史紀錄 API 引擎
            __runHistoryExtensionAPI(historyBox);
        }, 400);
    }
});

// 封裝好的 API 引擎 (加上 __ 雙底線避免跟你原本的變數撞名)
async function __runHistoryExtensionAPI(container) {
    if (!container) return;

    // 1. 質感 Loading
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

        // 2. 蒐集卡片並組裝動態網址
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
                        
                        let routeName = (window.MasterRouteDictionary && window.MasterRouteDictionary[id]) ? window.MasterRouteDictionary[id].name : id;
                        routeName = routeName.replace('Departure_', '出發 ').replace('Arrival_', '抵達 ');

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
            container.innerHTML = ``; 
            return;
        }

        const results = await Promise.allSettled(fetchTasks);

        const validHistoryList = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value !== null) {
                const info = result.value;
                if ((Array.isArray(info.data) && info.data.length > 0) || 
                    (typeof info.data === 'object' && Object.keys(info.data).length > 0)) {
                    validHistoryList.push(info);
                }
            }
        });

        // 3. 渲染美化 UI
        __renderHistoryCards(container, validHistoryList);

    } catch (error) {
        container.innerHTML = ``; 
    }
}

// 封裝好的 UI 渲染引擎
function __renderHistoryCards(container, historyList) {
    if (historyList.length === 0) {
        container.innerHTML = '';
        return;
    }

    let htmlStr = '<div style="display: flex; flex-direction: column; gap: 12px; padding: 10px 0;">';
    htmlStr += '<div style="font-size: 0.75em; font-weight: 700; color: var(--text-secondary, #8e8e93); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; padding-left: 4px;">Timeline</div>';

    historyList.forEach(info => {
        const routeName = info.name;
        
        // 清洗冗餘 ID 邏輯
        const parseHistoryData = (data) => {
            let items = [];
            if (Array.isArray(data)) {
                data.forEach(item => items.push(`<span>${item}</span>`));
            } else if (typeof data === 'object') {
                for (const [key, val] of Object.entries(data)) {
                    if (key.includes('odpt.') || key.includes('Departure_') || key.includes('Arrival_')) {
                        if (typeof val === 'object') items = items.concat(parseHistoryData(val));
                    } else {
                        let displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
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
            const displayItems = parsedItems.slice(0, 4); 

            // 暗色毛玻璃卡片 UI
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

    container.style.opacity = '0';
    container.innerHTML = htmlStr;
    requestAnimationFrame(() => {
        container.style.transition = 'opacity 0.4s ease';
        container.style.opacity = '1';
    });
}