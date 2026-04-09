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
// 🟢 歷史紀錄：從 Daemon 記憶體秒殺渲染 (精準雷達追蹤版)
// ============================================================================
document.addEventListener('click', (event) => {
    const menuBtn = event.target.closest('#left-menu-btn');
    if (menuBtn) {
        // 稍微拉長一點點等待時間 (500ms)，確保你的通用面板 DOM 完全長出來
        setTimeout(() => {
            // 🚀 升級 3：精準雷達尋找 UI 容器
            // 這裡涵蓋了絕大多數 tsukinkanban 可能用到的面板內容區塊 Class
            const safeZone = document.querySelector('.content-area, .menu-content, .menu-card-inner, .panel-content, .main-menu-container');

            if (safeZone) {
                let anchor = document.getElementById('native-history-anchor');
                if (!anchor) {
                    anchor = document.createElement('div');
                    anchor.id = 'native-history-anchor';
                    anchor.style.cssText = 'margin-top: 32px; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; padding-bottom: 40px;';
                    // 精準塞進 UI 內容區的底部
                    safeZone.appendChild(anchor);
                }

                // 從記憶體叫出資料並渲染
                __renderStaticHistory(anchor);
            } else {
                console.warn("⚠️ [History UI] 找不到合適的選單容器，請確認你的 HTML Class！");
            }
        }, 500); 
    }
});

function __renderStaticHistory(container) {
    const historyList = window.appHistoryCache;

    // 如果精靈還在抓，或是抓不到資料的防呆顯示
    if (!historyList) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary, #8e8e93); font-size: 0.9em; padding: 20px;">
                <div style="opacity: 0.6; margin-bottom: 8px; display: flex; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </div>
                履歴データを同期中...
                <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
            </div>`;
        return;
    }

    if (historyList.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary, #8e8e93); font-size: 0.9em; padding: 20px;">履歴データがありません</div>';
        return;
    }

    let htmlStr = '<div style="display: flex; flex-direction: column; gap: 16px;">';
    htmlStr += '<div style="font-size: 0.75em; font-weight: 700; color: var(--text-secondary, #8e8e93); text-transform: uppercase; letter-spacing: 1px;">Timeline</div>';

    historyList.forEach(info => {
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
                                <span style="font-family: monospace; font-size: 0.9em; opacity: 0.6; width: 45px; flex-shrink: 0;">${key}</span>
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
            htmlStr += `
                <div style="padding-bottom: 8px;">
                    <div style="font-weight: 700; font-size: 1em; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; color: #fff;">
                        <span style="width: 6px; height: 6px; background: #0a84ff; border-radius: 50%;"></span>
                        ${info.name}
                    </div>
                    <div style="padding-left: 14px; color: rgba(255,255,255,0.85);">
                        ${parsedItems.join('')}
                    </div>
                </div>
            `;
        }
    });

    htmlStr += '</div>';
    
    // 秒殺顯示在面板內
    container.innerHTML = htmlStr;
}