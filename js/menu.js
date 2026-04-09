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
// 🟢 歷史紀錄抓取引擎 (附加模組)
// ============================================================================

// 1. 🚀 使用「Capture 捕獲階段 (true)」強制攔截點擊，無視任何 stopPropagation！
document.addEventListener('click', (event) => {
    const menuBtn = event.target.closest('#left-menu-btn');
    if (menuBtn) {
        console.log("🟢 [History API] 成功攔截漢堡按鈕點擊！準備喚醒 API 引擎...");
        
        // 延遲 400 毫秒，等你的母艦動畫跑完
        setTimeout(() => {
            console.log("🟢 [History API] 開始渲染骨架屏並抓取資料！");
            let historyContainer = document.getElementById('history-content-area');

            if (!historyContainer) {
                historyContainer = document.createElement('div');
                historyContainer.id = 'history-content-area';
                // 💡 強制加上 z-index: 99999 避免被你的背景或毛玻璃遮擋
                historyContainer.style.cssText = 'position: relative; z-index: 99999; margin-top: 24px; width: 100%; padding: 0 16px; box-sizing: border-box;';

                // 尋找母艦的白色面板，如果找不到就塞進 body
                const menuBody = document.querySelector('.menu-card-inner') || 
                                 document.querySelector('.main-menu-container') || 
                                 document.body; 
                
                menuBody.appendChild(historyContainer);
            }

            // 觸發防彈版 API 引擎
            fetchAndRenderHistory('history-content-area');
        }, 400); 
    }
}, true); // 👈 這裡的 true 就是魔法！代表在「捕獲階段」優先執行

// 2. 防彈版歷史紀錄抓取 API (Promise.allSettled)
async function fetchAndRenderHistory(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // A. 鋪上美觀的骨架屏
    container.innerHTML = `
        <div class="history-loading-state" style="padding: 30px 20px; text-align: center; color: var(--text-secondary);">
            <div style="opacity: 0.6; margin-bottom: 12px; display: flex; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
            </div>
            <p style="font-size: 0.9em; font-weight: 600;">履歴データを取得中...</p>
            <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
        </div>
    `;

    try {
        const fetchTasks = [];

        // B. 蒐集常駐卡片並組裝動態網址
        if (window.appRailwayData && window.appRailwayData.length > 0) {
            window.appRailwayData.forEach(card => {
                if (card.targetLineIds) {
                    card.targetLineIds.forEach(id => {
                        const isFlight = card.isFlightCard;
                        const type = isFlight ? 'flight' : 'railway';
                        
                        // 飛機 ID 防呆處理 (嘗試加上 Departure_)
                        let finalId = id;
                        if (isFlight && !id.includes('Departure_') && !id.includes('Arrival_')) {
                            finalId = `Departure_${id}`; 
                        }

                        const url = `https://tsukinkanban-odpt.onrender.com/api/history/${type}/${finalId}`;

                        const routeName = (window.MasterRouteDictionary && window.MasterRouteDictionary[id]) 
                                     ? window.MasterRouteDictionary[id].name 
                                     : (card.name || finalId);

                        // 發送請求，並在內部把 404/CORS 錯誤默默吃掉，不讓系統崩潰
                        const requestPromise = fetch(url)
                            .then(async res => {
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                const data = await res.json();
                                return { name: routeName, data: data };
                            })
                            .catch(err => {
                                console.warn(`[History] ${routeName} 無法取得資料 (可能是後端無資料導致的 CORS):`, err);
                                return null; 
                            });

                        fetchTasks.push(requestPromise);
                    });
                }
            });
        }

        if (fetchTasks.length === 0) {
            container.innerHTML = `
                <div style="padding: 30px 20px; text-align: center; color: var(--text-secondary); font-size: 0.9em; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(0,0,0,0.2);">
                    追跡している路線はありません
                </div>`;
            return;
        }

        // C. Promise.allSettled 魔法：成功失敗我都等，絕不當機！
        const results = await Promise.allSettled(fetchTasks);

        // D. 篩選出成功的真實資料
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

        // E. 渲染畫面
        renderHistoryUI(container, validHistoryList);

    } catch (error) {
        console.error('[History Engine] 嚴重網路錯誤:', error);
        container.innerHTML = `
            <div style="padding: 30px 20px; text-align: center; color: #ff453a; font-size: 0.9em; font-weight: 600; border: 1px solid rgba(255,69,58,0.2); border-radius: 16px; background: rgba(255,69,58,0.05);">
                ⚠️ ネットワークエラーが発生しました
            </div>`;
    }
}

// 3. UI 渲染模組
function renderHistoryUI(container, historyList) {
    let htmlStr = '<div class="history-list-wrapper" style="display: flex; flex-direction: column; gap: 12px;">';
    
    if (historyList.length === 0) {
        htmlStr += '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">履歴データがありません<br><span style="font-size: 0.8em; opacity: 0.6;">(または通信エラー)</span></div>';
    } else {
        historyList.forEach(info => {
            const routeName = info.name;
            const historyData = info.data;

            let historyHtml = '';
            if (Array.isArray(historyData)) {
                historyHtml = historyData.map(h => `
                    <div style="display: flex; gap: 8px; margin-top: 4px;">
                        <span style="color: #0a84ff;">•</span>
                        <span>${h}</span>
                    </div>`).join('');
            } else if (typeof historyData === 'object') {
                 historyHtml = Object.entries(historyData).map(([key, val]) => `
                    <div style="display: flex; gap: 8px; margin-top: 4px;">
                        <span style="color: #0a84ff;">•</span>
                        <span>${key}: ${val}</span>
                    </div>`).join('');
            } else {
                historyHtml = `<span>${historyData}</span>`;
            }

            htmlStr += `
                <div class="history-item" style="background: rgba(30, 30, 32, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); padding: 16px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <div style="font-weight: 800; font-size: 1.05em; margin-bottom: 8px; color: #fff;">${routeName}</div>
                    <div style="font-size: 0.85em; opacity: 0.85; line-height: 1.6; color: var(--text-secondary);">
                        ${historyHtml}
                    </div>
                </div>
            `;
        });
    }
    htmlStr += '</div>';

    container.style.opacity = '0';
    container.innerHTML = htmlStr;
    
    requestAnimationFrame(() => {
        container.style.transition = 'opacity 0.5s ease';
        container.style.opacity = '1';
    });
}