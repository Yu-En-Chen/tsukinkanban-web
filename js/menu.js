// js/menu.js

// ============================================================================
// 🟢 1. 綁定「漢堡按鈕 (left-menu-btn)」點擊事件
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('left-menu-btn');
    if (!menuBtn) return;

    menuBtn.addEventListener('click', () => {
        setTimeout(() => {
            let historyContainer = document.getElementById('history-content-area');

            if (!historyContainer) {
                historyContainer = document.createElement('div');
                historyContainer.id = 'history-content-area';
                historyContainer.style.cssText = 'margin-top: 24px; width: 100%; padding: 0 16px; box-sizing: border-box;';

                const menuBody = document.querySelector('.menu-card-inner') || 
                                 document.querySelector('.main-menu-container') || 
                                 document.body; 
                
                menuBody.appendChild(historyContainer);
            }

            fetchAndRenderHistory('history-content-area');
        }, 150); 
    });
});

// ============================================================================
// 🟢 2. 歷史紀錄抓取引擎 (防彈版：Promise.allSettled)
// ============================================================================
async function fetchAndRenderHistory(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // A. 鋪上骨架屏
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
        const fetchTasks = []; // 裝載所有請求任務的清單

        // B. 蒐集畫面上所有卡片的 ID，並組裝專屬的網址
        if (window.appRailwayData && window.appRailwayData.length > 0) {
            window.appRailwayData.forEach(card => {
                if (card.targetLineIds) {
                    card.targetLineIds.forEach(id => {
                        const isFlight = card.isFlightCard;
                        const type = isFlight ? 'flight' : 'railway';
                        
                        // 針對你提到的航班 ID 問題，做個簡單的防呆猜測
                        // 如果是飛機，嘗試加上 Departure_ (如果原本沒有的話)，具體看你後端怎麼吃
                        let finalId = id;
                        if (isFlight && !id.includes('Departure_') && !id.includes('Arrival_')) {
                             // 這裡假設預設抓出發，如果你們有 isDeparture 屬性可以改用 card.isDeparture ? 'Departure_' : 'Arrival_'
                            finalId = `Departure_${id}`; 
                        }

                        // 💡 你提供的完美動態網址結構！
                        const url = `https://tsukinkanban-odpt.onrender.com/api/history/${type}/${finalId}`;

                        // 取得顯示名稱
                        const routeName = (window.MasterRouteDictionary && window.MasterRouteDictionary[id]) 
                                     ? window.MasterRouteDictionary[id].name 
                                     : (card.name || finalId);

                        // 🚀 將請求封裝成獨立的 Promise (把錯誤全部攔截在裡面)
                        const requestPromise = fetch(url)
                            .then(async res => {
                                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                                const data = await res.json();
                                return { name: routeName, data: data };
                            })
                            .catch(err => {
                                // 💡 魔法就在這裡：就算發生 CORS 錯誤，也不會報錯中斷！
                                // 只會默默在 Console 留個紀錄，然後回傳 null，假裝沒歷史紀錄而已。
                                console.warn(`[History] ${routeName} 無法取得資料 (可能是後端無資料導致的 CORS 阻擋):`, err);
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

        // C. 🚀 終極防護：Promise.allSettled
        // 等待所有請求跑完，不管是成功還是失敗，絕不當機！
        const results = await Promise.allSettled(fetchTasks);

        // D. 過濾出成功的資料，並去除 null 的空資料
        const validHistoryList = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value !== null) {
                const info = result.value;
                // 確認回傳的 JSON 真的有內容 (陣列有長度 或 物件有 key)
                if ((Array.isArray(info.data) && info.data.length > 0) || 
                    (typeof info.data === 'object' && Object.keys(info.data).length > 0)) {
                    validHistoryList.push(info);
                }
            }
        });

        // E. 渲染畫面
        renderHistoryUI(container, validHistoryList);

    } catch (error) {
        // 因為上面已經做了最高級別的攔截，這裡幾乎不會被觸發了，除非斷網
        console.error('[History Engine] 嚴重錯誤:', error);
        container.innerHTML = `
            <div style="padding: 30px 20px; text-align: center; color: #ff453a; font-size: 0.9em; font-weight: 600; border: 1px solid rgba(255,69,58,0.2); border-radius: 16px; background: rgba(255,69,58,0.05);">
                ⚠️ ネットワークエラーが発生しました
            </div>`;
    }
}

// ============================================================================
// 🟢 3. 畫面渲染函式 (UI Renderer)
// ============================================================================
function renderHistoryUI(container, historyList) {
    let htmlStr = '<div class="history-list-wrapper" style="display: flex; flex-direction: column; gap: 12px;">';
    
    if (historyList.length === 0) {
        htmlStr += '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">履歴データがありません<br><span style="font-size: 0.8em; opacity: 0.6;">(または通信エラー)</span></div>';
    } else {
        historyList.forEach(info => {
            const routeName = info.name;
            const historyData = info.data;

            // 智慧排版引擎：自適應陣列或物件結構
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