// personalization.js - 個性化設定 (Customize) 專用彈窗引擎

import { saveRoutePreference, resetRoutePreference } from '../data/db.js';
import { railwayData } from '../data/data.js';

// =========================================================
// 🟢 網頁級別最優先寫死的系統導航防護 (全域封鎖)
// =========================================================
(function injectGlobalNavigationBlocker() {
    if (window._pGlobalNavBlockerActive) return;
    window._pGlobalNavBlockerActive = true;

    const blockEdgeSwipe = (e) => {
        if (e.touches && e.touches.length > 0 && e.touches[0].clientX < 30) {
            e.preventDefault();
            e.stopPropagation();
        }
    };
    window.addEventListener('touchstart', blockEdgeSwipe, { passive: false, capture: true });
    window.addEventListener('touchmove', blockEdgeSwipe, { passive: false, capture: true });
    // 👇 全域動畫鎖與微互動攔截器 👇
    document.addEventListener('click', (e) => {
        // 檢查是否正在播放下載同步動畫
        if (window.pSyncing) {
            // 偵測點擊是否發生在 通知(左)、搜尋(右)、調色盤(左上) 按鈕上
            const protectedBtn = e.target.closest('.left-circle-btn, .search-trigger, #capsule-main-btn');
            if (protectedBtn) {
                e.preventDefault();
                e.stopPropagation(); // ⛔ 霸王色霸氣：在點擊事件抵達原本的 onclick 前，強制斬斷！
                
                // 🥊 呼叫系統內建的微互動引擎，讓按鈕「扣」的震動一下，暗示使用者目前鎖定中
                if (typeof window.triggerBump === 'function') {
                    window.triggerBump(protectedBtn);
                }
            }
        }
    }, { capture: true }); // 開啟 capture 捕獲階段，保證我們是全站第一個拿到點擊事件的！ // 👆

    try {
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', function (e) {
            history.pushState(null, null, location.href);
            if (document.getElementById('dynamic-blank-overlay') && typeof window.closeBlankOverlay === 'function') {
                window.closeBlankOverlay();
            }
        }, { capture: true });
    } catch(err) {}

    const applyOverscroll = () => {
        document.documentElement.style.setProperty('overscroll-behavior', 'none', 'important');
        document.body.style.setProperty('overscroll-behavior', 'none', 'important');
    };
    applyOverscroll();
    window.addEventListener('DOMContentLoaded', applyOverscroll);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (window.pActiveEditType && typeof window.closeGhostEditMode === 'function') {
                window.closeGhostEditMode(true);
            }
        } else {
            if (window.pScrollManager && window.pScrollManager.isLocked) {
                const forceResetScroll = () => {
                    window.scrollTo(0, 0);
                    document.body.scrollTop = 0;
                    document.documentElement.scrollTop = 0;
                };
                setTimeout(forceResetScroll, 50);
                setTimeout(forceResetScroll, 300);
            }
        }
    });
    // =========================================================
    // 🟢 桌面版鍵盤快捷鍵：方向鍵關閉卡片
    // =========================================================
    window.addEventListener('keydown', (e) => {
        // 防呆 1：如果使用者正在輸入框裡面打字（例如搜尋框、編輯名稱），不要攔截方向鍵
        const activeElement = document.activeElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
        if (isTyping) return;

        // 【左鍵 ArrowLeft】 -> 關閉「個性化設定卡片 (Customize)」
        if (e.key === 'ArrowLeft') {
            const blankOverlay = document.getElementById('dynamic-blank-overlay');
            if (blankOverlay && typeof window.closeBlankOverlay === 'function') {
                e.preventDefault(); 
                window.closeBlankOverlay(true); // 傳入 true 模擬手勢關閉，觸發流暢動畫
                return;
            }
        }

        // 【下鍵 ArrowDown】 -> 關閉「詳情卡片 (Detail Card)」
        if (e.key === 'ArrowDown') {
            // 防呆 2：如果「個性化設定卡片」還開著，先擋住！不要讓下鍵一次關掉兩層
            const blankOverlay = document.getElementById('dynamic-blank-overlay');
            if (blankOverlay) return;

            // 判斷詳情卡片是否有展開 (根據你專案中 card-stack 有 has-active 來判斷)
            const hasActiveCard = document.querySelector('.card-stack.has-active') || document.body.classList.contains('detail-active');
            
            if (hasActiveCard && typeof window.closeAllCards === 'function') {
                e.preventDefault();
                window.closeAllCards(true); // 呼叫全域的卡片關閉函數
            }
        }
    });
    
})();

export function initPersonalization(applyThemeToCard, getActiveCardId) {
    window.DISMISS_ICON_TARGET_ROTATION = 90;

    window.triggerSaveCustomization = function(editType, finalVal) {
        const activeId = getActiveCardId();
        if (!activeId || activeId === 'fixed-bottom') return;

        const routeData = window.appRailwayData.find(r => r.id === activeId);
        if (!routeData) return;

        // 🟢 終極防護網：攔截「未改變」的幽靈存檔！
        if (editType === 'name' && routeData.name === finalVal) {
            console.log("[攔截] 名稱未變更，拒絕污染歷史紀錄");
            return;
        }
        if (editType === 'color' && routeData.hex.toLowerCase() === finalVal.toLowerCase()) {
            console.log("[攔截] 顏色未變更，拒絕污染歷史紀錄");
            return;
        }

        // ✨ 在確認數值真的有變後，才將修改前的狀態打包成救生圈
        const oldState = {
            customName: routeData.name,
            customHex: routeData.hex
        };

        if (editType === 'name') routeData.name = finalVal;
        if (editType === 'color') routeData.hex = finalVal;

        // 🟢 [新增] 無損重繪魔法：強制清除瀏覽器對 CSS 變數的快取殘影
        const forceRepaint = (el) => {
            if (!el) return;
            void el.offsetHeight; 
            const tags = el.querySelectorAll('.info-tag-item, .info-capsule, .info-circle, .flight-action-btn');
            tags.forEach(tag => {
                const originalDisplay = tag.style.display; 
                tag.style.display = 'none';
                void tag.offsetHeight;
                tag.style.display = originalDisplay; 
            });
        };

        // 同步更新：個性化卡片 (Blank Overlay)
        const customizeCard = document.querySelector('#dynamic-blank-overlay .detail-card-inner');
        if (customizeCard) {
            applyThemeToCard(customizeCard, routeData.hex);
            forceRepaint(customizeCard); // ✨ 執行重繪
        }

        // 同步更新：中層的詳情卡片 (Detail Card)
        const detailCard = document.querySelector('#detail-card-container .detail-card-inner');
        if (detailCard) {
            applyThemeToCard(detailCard, routeData.hex);
            forceRepaint(detailCard); // ✨ 執行重繪
            const detailNameNode = detailCard.querySelector('.line-name');
            if (detailNameNode) detailNameNode.textContent = routeData.name;
        }

        // 同步更新：底層的主列表卡片 (Main Card)
        const mainCard = document.getElementById(`card-${activeId}`);
        if (mainCard) {
            applyThemeToCard(mainCard, routeData.hex);
            forceRepaint(mainCard); // ✨ 執行重繪
            const mainNameNode = mainCard.querySelector('.line-name');
            if (mainNameNode) mainNameNode.textContent = routeData.name;
        }

        // 呼叫 DB，並把救生圈 (oldState) 丟過去當備份
        saveRoutePreference(activeId, routeData.name, routeData.hex, oldState)
            .then(() => console.log(`[DB] 成功寫入永久儲存 -> ${activeId}: ${routeData.name} / ${routeData.hex}`))
            .catch(err => console.error('[DB] 寫入 IndexedDB 失敗:', err));
    };

    window.openBlankOverlay = function (hexColor) {
        if (document.getElementById('dynamic-blank-overlay') || window.isFlipAnimating) return;
        window.isFlipAnimating = true;

        const activeId = getActiveCardId(); 

        if (!hexColor) {
            if (activeId) {
                const currentData = window.appRailwayData.find(l => l.id === activeId);
                if (currentData) hexColor = currentData.hex;
            }
            if (!hexColor) hexColor = '#2C2C2E';
        }

        const originalInner = document.querySelector('#detail-card-container .detail-card-inner');
        const originalContainer = document.getElementById('detail-card-container');
        if (!originalInner || !originalContainer) {
            window.isFlipAnimating = false;
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'dynamic-blank-overlay';
        overlay.className = 'detail-overlay active';

        const container = document.createElement('div');
        container.className = 'perspective-container is-flipping';
        container.style.cssText = 'width: 100%; display: flex; justify-content: center; margin-top: calc(env(safe-area-inset-top) + 160px);';

        const card = document.createElement('div');
        card.className = 'detail-card-inner flip-in-start';
        applyThemeToCard(card, hexColor);

        let targetName = '未知名稱';
        let targetHex = hexColor || '#2C2C2E';

        if (activeId) {
            if (activeId === 'fixed-bottom') {
                targetName = '運行情報';
            } else {
                const currentData = window.appRailwayData.find(l => l.id === activeId);
                if (currentData) {
                    targetName = currentData.name;
                    targetHex = currentData.hex;
                }
            }
        }

        card.innerHTML = `
<div class="card-header" style="padding-bottom: 5px; margin-bottom: 15px;">
    <span class="line-name">カスタマイズ</span>
</div>

<div class="card-content" id="p-ghost-wrapper" style="position: relative;">
    <style>
        #p-edit-row, #p-color-edit-row {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
        }
        #p-ghost-input {
            -webkit-touch-callout: default;
            -webkit-user-select: text;
            user-select: text;
        }
        
        .info-tag-item, #p-ghost-input, #p-shared-status, svg {
            will-change: transform, max-width, opacity;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            transform: translate3d(0, 0, 0); 
        }

        .p-bump-active {
            transform: scale(0.92) translate3d(0,0,0) !important;
            opacity: 0.8 !important;
            transition: transform 0.15s cubic-bezier(0.34, 1.6, 0.64, 1), opacity 0.15s ease !important;
        }

        @keyframes p-spin-ease {
            0% { transform: rotate(0deg) translate3d(0,0,0); animation-timing-function: linear; }
            87.5% { transform: rotate(315deg) translate3d(0,0,0); animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1); }
            100% { transform: rotate(360deg) translate3d(0,0,0); }
        }
        @keyframes p-shake-anim {
            0%, 100% { transform: translate3d(0, 0, 0); }
            20% { transform: translate3d(-4px, 0, 0); }
            40% { transform: translate3d(4px, 0, 0); }
            60% { transform: translate3d(-4px, 0, 0); }
            80% { transform: translate3d(4px, 0, 0); }
        }
        .p-spin { animation: p-spin-ease 0.8s infinite; }
        .p-shake-active { animation: p-shake-anim 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    </style>

    <div id="p-edit-row" style="--btn-height: 44px; display: flex; gap: 8px; position: relative;
        /* 👇 左右安全區擴展至 25px */
        width: calc(100% + 50px); margin-left: -25px; 
        /* 👇 上下安全區擴展至 35px，保證吃下 33px 的陰影 */
        padding: 35px 25px; 
        margin-top: -35px; margin-bottom: -23px; 
        /* 👇 遮罩漸層也必須同步向內推 25px */
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 25px, black calc(100% - 25px), transparent 100%);
        mask-image: linear-gradient(to right, transparent 0%, black 25px, black calc(100% - 25px), transparent 100%);">

        <button id="p-btn-label" class="info-tag-item interactive-btn" onclick="window.toggleGhostEditMode('name', event, this)" style="
            cursor: pointer; height: var(--btn-height); padding: 0 16px; border-radius: 100px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; white-space: nowrap; flex-shrink: 0; max-width: 120px; overflow: hidden; transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), padding 0.4s var(--apple-spring), margin 0.4s var(--apple-spring);">
            <span style="white-space: nowrap;">表示名</span>
        </button>

        <div id="p-btn-input-container" class="info-tag-item interactive-btn" onclick="window.toggleGhostEditMode('name', event, this)" style="
            cursor: pointer; height: var(--btn-height); border-radius: 100px; display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden; flex-grow: 1; position: relative; padding: 0 16px; transition: transform 0.4s var(--apple-spring), box-shadow 0.4s var(--apple-spring);">
            
            <span id="p-display-name" style="transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem; font-family: inherit; font-weight: inherit; transform: translate3d(0, 0, 0);">${targetName}</span>

            <span id="p-shared-status" style="position: absolute; left: 16px; right: 16px; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-family: inherit; font-weight: inherit; opacity: 0; pointer-events: none; transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); transform: translate3d(0, 0, 0);">
                <span id="p-shared-status-text" style="display:inline-block;"></span>
            </span>
        </div>

        <button id="p-btn-circle-1" class="info-tag-item interactive-btn" onclick="window.handleCopyAction(event, 'name', this)" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: transform 0.4s var(--apple-spring), box-shadow 0.4s var(--apple-spring);">
            <span id="p-icon-clipboard" style="position: absolute; top: 50%; left: 50%; transform: translate3d(-50%, -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 21.1px; height: 20.7px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>
            </span>
            <span id="p-icon-check" style="position: absolute; top: 50%; left: 50%; transform: translate3d(calc(-50% + 40px), -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
            <svg id="p-icon-x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate3d(-250%, -50%, 0); transition: transform 0.4s var(--apple-spring); opacity: 0.8; width: 22px; height: 22px; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <button id="p-btn-circle-2" class="info-tag-item interactive-btn" onclick="window.handlePasteAction(event, 'name', this)" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), margin 0.4s var(--apple-spring), padding 0.4s var(--apple-spring); max-width: var(--btn-height);">
            <span id="p-icon-paste-default" style="position: absolute; top: 50%; left: 50%; transform: translate3d(-50%, -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
            </span>
            <span id="p-icon-paste-loader" style="position: absolute; top: 50%; left: 50%; transform: translate3d(calc(-50% - 40px), -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg class="p-spin lucide lucide-loader-circle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </span>
            <span id="p-icon-paste-error" style="position: absolute; top: 50%; left: 50%; transform: translate3d(-50%, calc(-50% - 40px), 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </span>
            <span id="p-icon-paste-check" style="position: absolute; top: 50%; left: 50%; transform: translate3d(calc(-50% - 40px), -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
        </button>
    </div>
    
    <p class="description" style="font-size: clamp(0.85rem, 3vw, 0.95rem); margin-bottom: 12px; display: flex; justify-content: space-between; padding: 0 4px;">
        <span id="p-desc-name" style="transition: opacity 0.2s ease;">　- 十文字以內 -</span>
        <span id="p-char-count" style="opacity: 0; transition: opacity 0.4s var(--apple-spring); font-family: monospace; font-size: 0.9em; margin-right: 4px;">0/10</span>
    </p>

    <div id="p-color-edit-row" style="--btn-height: 44px; display: flex; gap: 8px; position: relative;
        /* 👇 左右安全區擴展至 25px */
        width: calc(100% + 50px); margin-left: -25px; 
        /* 👇 上下安全區擴展至 35px，保證吃下 33px 的陰影 */
        padding: 35px 25px; 
        margin-top: -35px; margin-bottom: -23px; 
        /* 👇 遮罩漸層也必須同步向內推 25px */
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 25px, black calc(100% - 25px), transparent 100%);
        mask-image: linear-gradient(to right, transparent 0%, black 25px, black calc(100% - 25px), transparent 100%);">

        <button id="p-btn-color-label" class="info-tag-item interactive-btn" onclick="window.toggleGhostEditMode('color', event, this)" style="
            cursor: pointer; height: var(--btn-height); padding: 0 16px; border-radius: 100px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; white-space: nowrap; flex-shrink: 0; max-width: 120px; overflow: hidden; transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), padding 0.4s var(--apple-spring), margin 0.4s var(--apple-spring);">
            <span style="white-space: nowrap;">カラー</span>
        </button>

        <div id="p-btn-color-input-container" class="info-tag-item interactive-btn" onclick="window.toggleGhostEditMode('color', event, this)" style="
            cursor: pointer; height: var(--btn-height); border-radius: 100px; display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden; flex-grow: 1; position: relative; padding: 0 16px; transition: transform 0.4s var(--apple-spring), box-shadow 0.4s var(--apple-spring);">
            
            <span id="p-display-color" style="transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem; font-family: monospace; font-weight: inherit; transform: translate3d(0, 0, 0);">${targetHex.toUpperCase()}</span>

            <span id="p-color-shared-status" style="position: absolute; left: 16px; right: 16px; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-family: inherit; font-weight: inherit; opacity: 0; pointer-events: none; transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); transform: translate3d(0, 0, 0);">
                <span id="p-color-shared-status-text" style="display:inline-block;"></span>
            </span>
        </div>

        <button id="p-btn-color-circle-1" class="info-tag-item interactive-btn" onclick="window.handleCopyAction(event, 'color', this)" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: transform 0.4s var(--apple-spring), box-shadow 0.4s var(--apple-spring);">
            <span id="p-color-icon-clipboard" style="position: absolute; top: 50%; left: 50%; transform: translate3d(-50%, -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 21.1px; height: 20.7px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>
            </span>
            <span id="p-color-icon-check" style="position: absolute; top: 50%; left: 50%; transform: translate3d(calc(-50% + 40px), -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
            <svg id="p-color-icon-x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate3d(-250%, -50%, 0); transition: transform 0.4s var(--apple-spring); opacity: 0.8; width: 22px; height: 22px; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <button id="p-btn-color-circle-2" class="info-tag-item interactive-btn" onclick="window.handlePasteAction(event, 'color', this)" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), margin 0.4s var(--apple-spring), padding 0.4s var(--apple-spring); max-width: var(--btn-height);">
            <span id="p-color-icon-paste-default" style="position: absolute; top: 50%; left: 50%; transform: translate3d(-50%, -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
            </span>
            <span id="p-color-icon-paste-loader" style="position: absolute; top: 50%; left: 50%; transform: translate3d(calc(-50% - 40px), -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg class="p-spin lucide lucide-loader-circle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </span>
            <span id="p-color-icon-paste-error" style="position: absolute; top: 50%; left: 50%; transform: translate3d(-50%, calc(-50% - 40px), 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </span>
            <span id="p-color-icon-paste-check" style="position: absolute; top: 50%; left: 50%; transform: translate3d(calc(-50% - 40px), -50%, 0); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
        </button>
    </div>
    
    <p id="p-desc-color" class="description" style="font-size: clamp(0.85rem, 3vw, 0.95rem); margin-bottom: 12px; transition: opacity 0.2s ease;">　- HEX形式で入力してください -</p>

    <input id="p-ghost-input" type="text" enterkeyhint="done" autocomplete="off" spellcheck="false"
        oninput="window.handleGhostInput(this.value)" 
        onkeydown="window.handleGhostKey(event)" 
        onblur="window.handleGhostBlur(event)" 
        style="
        position: absolute;
        box-sizing: border-box; /* 👈 新增：完美貼合容器尺寸 */
        height: 44px;
        margin: 0; padding: 0 16px;
        background: transparent; border: none; outline: none;
        color: inherit; font-size: 0.95rem; font-weight: inherit; 
        text-align: center; /* 👈 修改：原生輸入法即時置中引擎 */
        opacity: 0; pointer-events: none; z-index: 100;
        transition: opacity 0.25s ease;
    ">
</div>
`;

        container.appendChild(card);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (window.pActiveEditType) return; 
            if (!e.target.closest('.detail-card-inner')) window.closeBlankOverlay();
        });

        const clearInlineStyles = (el) => {
            if (!el) return;
            el.style.removeProperty('transform');
            el.style.removeProperty('transition');
            el.style.removeProperty('box-shadow');
            el.style.removeProperty('opacity');
            el.style.removeProperty('transform-origin');
        };

        let swipeStartX = 0;
        let swipeStartY = 0;
        let isSwiping = false;
        let swipeLocked = false;
        const swipeTolerance = 0.6;
        const triggerThreshold = window.innerWidth / 3;

        overlay.addEventListener('touchstart', (e) => {
            if (window.pSyncing) return;
            if (e.touches.length > 1 || window.isFlipAnimating) return;
            swipeStartX = e.touches[0].clientX;
            swipeStartY = e.touches[0].clientY;
            isSwiping = false;
            swipeLocked = false;
        }, { passive: true });

        overlay.addEventListener('touchmove', (e) => {
            if (window.pSyncing) return;
            if (window.isFlipAnimating || swipeStartX === 0) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = currentX - swipeStartX;
            const deltaY = currentY - swipeStartY;

            const leftBtn = document.getElementById('capsule-main-btn');
            const rightBtn = document.getElementById('capsule-secondary-btn');
            const dismissIcon = document.getElementById('dismiss-icon');
            const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;
            const searchIconContainer = document.querySelector('#search-trigger .search-icon');

            if (!swipeLocked) {
                if (deltaX < -5) {
                    if (Math.abs(deltaY) < Math.abs(deltaX) * swipeTolerance) {
                        isSwiping = true;
                        swipeLocked = true;
                    } else {
                        swipeLocked = true;
                    }
                } else if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                    swipeLocked = true;
                }
            }

            if (isSwiping) {
                e.preventDefault();
                const resistance = 0.5;
                const dragDistance = Math.abs(deltaX) * resistance;
                const maxDist = window.innerWidth * 0.6;
                let progress = Math.max(0, Math.min(dragDistance / maxDist, 1));

                if (Math.abs(deltaX) >= triggerThreshold) {
                    isSwiping = false;
                    container.classList.remove('is-swiping');
                    clearInlineStyles(card);
                    clearInlineStyles(leftBtn);
                    clearInlineStyles(rightBtn);
                    clearInlineStyles(searchIconContainer);
                    window.closeBlankOverlay(true);
                    return;
                }

                card.classList.add('hardware-accelerated');
                container.classList.add('is-flipping');
                container.classList.add('is-swiping');

                card.style.setProperty('transition', 'none', 'important');
                card.style.setProperty('transform', `scale(1) rotateY(${-90 * progress}deg)`, 'important');
                const shadowFadeProgress = Math.min(progress * 2, 1);
                card.style.setProperty('box-shadow', `0 20px 40px rgba(0,0,0,${0.2 * (1 - shadowFadeProgress)})`, 'important');
                container.style.setProperty('--swipe-shadow-opacity', `${shadowFadeProgress}`, 'important');

                if (leftBtn && rightBtn) {
                    leftBtn.style.setProperty('transition', 'none', 'important');
                    leftBtn.style.setProperty('transform', `translate3d(${-30 * progress}px, 0, 0)`, 'important');
                    rightBtn.style.setProperty('transition', 'none', 'important');
                    rightBtn.style.setProperty('transform', `translate3d(${-30 * progress}px, 0, 0)`, 'important');
                }

                if (searchIconContainer) {
                    searchIconContainer.style.setProperty('transition', 'none', 'important');
                    searchIconContainer.style.setProperty('transform', `translate3d(${-30 * progress}px, 0, 0)`, 'important');
                }

                if (dismissIcon) {
                    dismissIcon.style.removeProperty('opacity');
                    dismissIcon.style.opacity = '1';
                }
                if (dismissSvg) {
                    dismissSvg.style.setProperty('transform-origin', '50% 50%', 'important');
                    dismissSvg.style.setProperty('transition', 'none', 'important');
                    const currentAngle = window.DISMISS_ICON_TARGET_ROTATION * (1 - progress);
                    dismissSvg.style.setProperty('transform', `rotate(${currentAngle}deg)`, 'important');
                }
            }
        }, { passive: false });

        overlay.addEventListener('touchend', (e) => {
            if (window.pSyncing) return;
            if (!isSwiping) {
                swipeStartX = 0;
                return;
            }
            isSwiping = false;

            const currentX = e.changedTouches[0].clientX;
            const deltaX = currentX - swipeStartX;
            const resistance = 0.5;
            const dragDistance = Math.abs(deltaX) * resistance;
            const maxDist = window.innerWidth * 0.6;
            let progress = Math.max(0, Math.min(dragDistance / maxDist, 1));
            const flippedDegrees = 90 * progress;

            const leftBtn = document.getElementById('capsule-main-btn');
            const rightBtn = document.getElementById('capsule-secondary-btn');
            const dismissIcon = document.getElementById('dismiss-icon');
            const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;
            const searchIconContainer = document.querySelector('#search-trigger .search-icon');

            if (flippedDegrees > 20 || deltaX < -50) {
                container.classList.remove('is-swiping');
                clearInlineStyles(card);
                clearInlineStyles(leftBtn);
                clearInlineStyles(rightBtn);
                clearInlineStyles(searchIconContainer);
                window.closeBlankOverlay(true);
            } else {
                container.classList.remove('is-swiping');
                container.classList.remove('is-flipping');
                container.style.removeProperty('--swipe-shadow-opacity');

                card.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15), box-shadow 0.3s linear', 'important');
                card.style.setProperty('transform', `scale(1) rotateY(0deg)`, 'important');
                card.style.setProperty('box-shadow', 'var(--ray-shadow-active)', 'important');

                if (leftBtn && rightBtn) {
                    leftBtn.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                    leftBtn.style.setProperty('transform', `translate3d(0px, 0, 0)`, 'important');
                    rightBtn.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                    rightBtn.style.setProperty('transform', `translate3d(0px, 0, 0)`, 'important');
                }

                if (searchIconContainer) {
                    searchIconContainer.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                    searchIconContainer.style.setProperty('transform', `translate3d(0px, 0, 0)`, 'important');
                }

                if (dismissSvg) {
                    dismissSvg.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                    dismissSvg.style.setProperty('transform', `rotate(${window.DISMISS_ICON_TARGET_ROTATION}deg)`, 'important');
                }

                setTimeout(() => {
                    clearInlineStyles(card);
                    clearInlineStyles(leftBtn);
                    clearInlineStyles(rightBtn);
                    clearInlineStyles(searchIconContainer);
                    container.classList.remove('is-flipping');
                    card.classList.remove('hardware-accelerated');
                }, 500);
            }
            swipeStartX = 0;
        });

        // =========================================================
        // 🟢 桌面版觸控板 (Trackpad) 橫向滑動關閉引擎 (已修復慣性卡頓)
        // =========================================================
        let wheelDeltaX = 0;
        let wheelTimer = null;
        let isWheelSwiping = false;
        let wheelGestureLocked = false; // 🛑 鎖定閥門：用來阻斷觸控板的「滑動慣性」

        overlay.addEventListener('wheel', (e) => {
            // 如果已經在翻轉、或已經觸發關閉、或「閥門已上鎖」，直接忽略所有的殘留慣性事件
            if (window.pSyncing || window.isFlipAnimating || wheelGestureLocked) return;

            // 1. 偵測是否為「橫向滑動」
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.preventDefault(); // 🛑 攔截瀏覽器預設的上一頁/下一頁

                if (!isWheelSwiping) {
                    isWheelSwiping = true;
                    wheelDeltaX = 0;
                }

                // 2. 累加滑動距離 (降低敏感度 * 0.4，避免太快撞到 90 度)
                wheelDeltaX -= e.deltaX * 0.4;
                if (wheelDeltaX > 0) wheelDeltaX = 0; // 只允許向左滑關閉

                const leftBtn = document.getElementById('capsule-main-btn');
                const rightBtn = document.getElementById('capsule-secondary-btn');
                const dismissIcon = document.getElementById('dismiss-icon');
                const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;
                const searchIconContainer = document.querySelector('#search-trigger .search-icon');

                const resistance = 0.5;
                const dragDistance = Math.abs(wheelDeltaX) * resistance;
                const maxDist = window.innerWidth * 0.6;
                let progress = Math.max(0, Math.min(dragDistance / maxDist, 1));

                // 🎯 核心修復：不等待觸控板慣性停止！只要滑超過一定距離 (progress > 0.2)，直接「瞬間觸發」關閉
                if (progress > 0.2 || wheelDeltaX < -100) {
                    wheelGestureLocked = true; // 鎖上閥門，這張卡片壽命結束前不再接受任何 wheel
                    isWheelSwiping = false;
                    clearTimeout(wheelTimer);

                    container.classList.remove('is-swiping');
                    clearInlineStyles(card);
                    clearInlineStyles(leftBtn);
                    clearInlineStyles(rightBtn);
                    clearInlineStyles(searchIconContainer);
                    
                    window.closeBlankOverlay(true);
                    return; // 直接中斷執行
                }

                // 3. 尚未達到閾值前，呈現跟手的 3D 視覺效果
                card.classList.add('hardware-accelerated');
                container.classList.add('is-flipping');
                container.classList.add('is-swiping');

                card.style.setProperty('transition', 'none', 'important');
                card.style.setProperty('transform', `scale(1) rotateY(${-90 * progress}deg)`, 'important');
                const shadowFadeProgress = Math.min(progress * 2, 1);
                card.style.setProperty('box-shadow', `0 20px 40px rgba(0,0,0,${0.2 * (1 - shadowFadeProgress)})`, 'important');
                container.style.setProperty('--swipe-shadow-opacity', `${shadowFadeProgress}`, 'important');

                if (leftBtn && rightBtn) {
                    leftBtn.style.setProperty('transition', 'none', 'important');
                    leftBtn.style.setProperty('transform', `translate3d(${-30 * progress}px, 0, 0)`, 'important');
                    rightBtn.style.setProperty('transition', 'none', 'important');
                    rightBtn.style.setProperty('transform', `translate3d(${-30 * progress}px, 0, 0)`, 'important');
                }

                if (searchIconContainer) {
                    searchIconContainer.style.setProperty('transition', 'none', 'important');
                    searchIconContainer.style.setProperty('transform', `translate3d(${-30 * progress}px, 0, 0)`, 'important');
                }

                if (dismissIcon) dismissIcon.style.opacity = '1';
                if (dismissSvg) {
                    dismissSvg.style.setProperty('transform-origin', '50% 50%', 'important');
                    dismissSvg.style.setProperty('transition', 'none', 'important');
                    const currentAngle = window.DISMISS_ICON_TARGET_ROTATION * (1 - progress);
                    dismissSvg.style.setProperty('transform', `rotate(${currentAngle}deg)`, 'important');
                }

                // 4. 定時器「只」用來處理力道太輕、中途放棄的彈性回歸
                clearTimeout(wheelTimer);
                wheelTimer = setTimeout(() => {
                    isWheelSwiping = false;
                    wheelDeltaX = 0;

                    container.classList.remove('is-swiping', 'is-flipping');
                    container.style.removeProperty('--swipe-shadow-opacity');

                    card.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15), box-shadow 0.3s linear', 'important');
                    card.style.setProperty('transform', `scale(1) rotateY(0deg)`, 'important');
                    card.style.setProperty('box-shadow', 'var(--ray-shadow-active)', 'important');

                    if (leftBtn && rightBtn) {
                        leftBtn.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                        leftBtn.style.setProperty('transform', `translate3d(0px, 0, 0)`, 'important');
                        rightBtn.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                        rightBtn.style.setProperty('transform', `translate3d(0px, 0, 0)`, 'important');
                    }

                    if (searchIconContainer) {
                        searchIconContainer.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                        searchIconContainer.style.setProperty('transform', `translate3d(0px, 0, 0)`, 'important');
                    }

                    if (dismissSvg) {
                        dismissSvg.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                        dismissSvg.style.setProperty('transform', `rotate(${window.DISMISS_ICON_TARGET_ROTATION}deg)`, 'important');
                    }

                    setTimeout(() => {
                        if (wheelGestureLocked) return;
                        clearInlineStyles(card);
                        clearInlineStyles(leftBtn);
                        clearInlineStyles(rightBtn);
                        clearInlineStyles(searchIconContainer);
                        container.classList.remove('is-flipping');
                        card.classList.remove('hardware-accelerated');
                    }, 500);
                }, 100); 
            }
        }, { passive: false });

        originalContainer.classList.add('perspective-container', 'is-flipping');
        originalInner.classList.remove('flip-back-in');
        originalInner.classList.add('flip-out');
        originalInner.classList.add('hardware-accelerated');
        card.classList.add('hardware-accelerated');

        if (window.slideCapsuleMode) window.slideCapsuleMode(true);

        const dismissIcon = document.getElementById('dismiss-icon');
        const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;

        if (dismissIcon) {
            dismissIcon.style.removeProperty('opacity');
            dismissIcon.style.opacity = '1';
        }
        if (dismissSvg) {
            dismissSvg.style.setProperty('transform-origin', '50% 50%', 'important');
            void dismissSvg.offsetWidth;
            dismissSvg.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.0, 0.0, 0.2, 1)', 'important');
            dismissSvg.style.setProperty('transform', `rotate(${window.DISMISS_ICON_TARGET_ROTATION}deg)`, 'important');
        }

        setTimeout(() => {
            card.classList.remove('flip-in-start');
            card.classList.add('flip-in-active');

            if (window.pScrollManager) window.pScrollManager.lock();

            setTimeout(() => {
                originalInner.classList.remove('hardware-accelerated');
                card.classList.remove('hardware-accelerated');
                originalContainer.classList.remove('is-flipping');
                container.classList.remove('is-flipping');
                window.isFlipAnimating = false;
            }, 450);
        }, 300);
    };

    window.closeBlankOverlay = function (isFromGesture = false) {
        if (window.pSyncing && !isFromGesture) return;
        if (window.isFlipAnimating) return;
        window.isFlipAnimating = true;

        if (window.pScrollManager) {
            window.pScrollManager.unlock();
        }

        if (window.pActiveEditType) {
            const ghost = document.getElementById('p-ghost-input');
            if (ghost) {
                let val = ghost.value.trim();
                let type = window.pActiveEditType;
                let isValid = true;
                
                if (type === 'color') {
                    val = val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/＃/g, '#').toUpperCase();
                    if (!/^#?([A-F0-9]{3}|[A-F0-9]{6})$/.test(val)) isValid = false;
                    else val = val.startsWith('#') ? val : '#' + val;
                } else if (type === 'name') {
                    if (val.length === 0 || val.length > 10) isValid = false;
                }
                
                if (isValid && window.triggerSaveCustomization) {
                    window.triggerSaveCustomization(type, val);
                }
            }
            ghost.blur();
            window.pActiveEditType = null;
        }

        const overlay = document.getElementById('dynamic-blank-overlay');
        const blankCard = overlay ? overlay.querySelector('.detail-card-inner') : null;
        const originalContainer = document.getElementById('detail-card-container');
        const originalInner = originalContainer ? originalContainer.querySelector('.detail-card-inner') : null;
        const blankContainer = overlay ? overlay.querySelector('.perspective-container') : null;

        if (!overlay || !blankCard || !originalInner || !originalContainer) {
            window.isFlipAnimating = false;
            return;
        }

        overlay.style.pointerEvents = 'none';

        blankCard.classList.add('hardware-accelerated');
        originalInner.classList.add('hardware-accelerated');
        originalContainer.classList.add('is-flipping');
        if (blankContainer) blankContainer.classList.add('is-flipping');

        blankCard.classList.remove('flip-in-active');
        blankCard.classList.add('flip-out-reverse');

        if (window.slideCapsuleMode) window.slideCapsuleMode(false);

        const dismissIcon = document.getElementById('dismiss-icon');
        const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;

        if (dismissIcon) {
            dismissIcon.style.removeProperty('opacity');
            dismissIcon.style.opacity = '1';
        }

        if (dismissSvg) {
            dismissSvg.style.setProperty('transform-origin', '50% 50%', 'important');
            if (!isFromGesture) {
                dismissSvg.style.setProperty('transition', 'none', 'important');
                dismissSvg.style.setProperty('transform', `rotate(${window.DISMISS_ICON_TARGET_ROTATION}deg)`, 'important');
                void dismissSvg.offsetWidth;
            }
            dismissSvg.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.0, 0.0, 0.2, 1)', 'important');
            dismissSvg.style.setProperty('transform', 'rotate(0deg)', 'important');
        }

        setTimeout(() => {
            originalInner.classList.remove('flip-out');
            originalInner.classList.add('flip-back-start');

            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.1s ease';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    originalInner.classList.remove('flip-back-start');
                    originalInner.classList.add('flip-back-active');
                });
            });

            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                originalInner.classList.remove('flip-back-active');
                originalContainer.classList.remove('perspective-container', 'is-flipping');
                originalInner.classList.remove('hardware-accelerated');

                if (dismissIcon) dismissIcon.style.opacity = '1';
                if (dismissSvg) {
                    dismissSvg.style.removeProperty('transform');
                    dismissSvg.style.removeProperty('transition');
                    dismissSvg.style.removeProperty('transform-origin');
                }
                window.isFlipAnimating = false;
            }, 450);
        }, 300);
    };

    // 🟢 實作雲端同步的三段式 SVG 下落切換動畫，徹底解決抽搐與文字起落方向
    window.triggerCloudSync = function() {
        if (window.pSyncing) {
            const btn = document.getElementById('capsule-secondary-btn');
            if (btn) window.triggerBump(btn);
            return;
        }

        window.pSyncing = true;

        if (window.pActiveEditType) {
            window.closeGhostEditMode(true, null, true);
        }

        const rightBtn = document.getElementById('capsule-secondary-btn');
        if (!rightBtn) {
            window.pSyncing = false;
            return;
        }

        rightBtn.style.position = 'relative';

        const svgSync = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud-sync-icon lucide-cloud-sync"><path d="m17 18-1.535 1.605a5 5 0 0 1-8-1.5"/><path d="M17 22v-4h-4"/><path d="M20.996 15.251A4.5 4.5 0 0 0 17.495 8h-1.79a7 7 0 1 0-12.709 5.607"/><path d="M7 10v4h4"/><path d="m7 14 1.535-1.605a5 5 0 0 1 8 1.5"/></svg>`;
        const svgCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud-check-icon lucide-cloud-check"><path d="m17 15-5.5 5.5L9 18"/><path d="M5.516 16.07A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 3.501 7.327"/></svg>`;

        // 🟢 精準抓取原有的唯一的 SVG，避免抓到新增的 wrappers
        let originalSvg = Array.from(rightBtn.children).find(el => el.tagName.toLowerCase() === 'svg');

        const createWrapper = (svgStr) => {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'absolute';
            wrapper.style.inset = '0';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';
            wrapper.style.pointerEvents = 'none'; 
            wrapper.style.transform = 'translate3d(0, -40px, 0)'; 
            wrapper.style.opacity = '0';
            wrapper.innerHTML = svgStr;
            
            // 🟢 修復：強制覆蓋膠囊的 CSS 霸王條款，使其與下方輸入框的 SVG 完美一致
            const innerSvg = wrapper.querySelector('svg');
            if (innerSvg) {
                innerSvg.style.setProperty('width', '20px', 'important');
                innerSvg.style.setProperty('height', '20px', 'important');
                innerSvg.style.setProperty('stroke-width', '1.7px', 'important');
                innerSvg.style.setProperty('opacity', '0.8', 'important');
            }
            return wrapper;
        };
        const syncWrapper = createWrapper(svgSync);
        const checkWrapper = createWrapper(svgCheck);
        
        rightBtn.appendChild(syncWrapper);
        rightBtn.appendChild(checkWrapper);

        const nameEls = getElements('name');
        const colorEls = getElements('color');

        function setupStatusSvg(els) {
            if (!els.sharedStatus) return null;
            if (els.sharedText) els.sharedText.style.display = 'none';

            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.inset = '0';
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';

            const createIcon = (svgStr) => {
                const el = document.createElement('div');
                el.innerHTML = svgStr;
                el.style.position = 'absolute';
                el.style.transform = 'translate3d(0, -40px, 0)';
                el.style.opacity = '0';
                el.style.width = '20px';
                el.style.height = '20px';
                const innerSvg = el.firstElementChild;
                if (innerSvg) {
                    innerSvg.style.width = '100%';
                    innerSvg.style.height = '100%';
                }
                return el;
            };

            const s1Svg = createIcon(svgSync);
            const s2Svg = createIcon(svgCheck);

            container.appendChild(s1Svg);
            container.appendChild(s2Svg);
            els.sharedStatus.appendChild(container);

            return { s1Svg, s2Svg, container };
        }

        const nameSvgs = setupStatusSvg(nameEls);
        const colorSvgs = setupStatusSvg(colorEls);

        // --- 動畫開始 ---
        setTimeout(() => {
            if (originalSvg) {
                originalSvg.style.setProperty('transition', 'transform 0.55s var(--spring-release), opacity 0.4s ease', 'important');
                originalSvg.style.setProperty('transform', 'translate3d(0, 40px, 0)', 'important');
                originalSvg.style.setProperty('opacity', '0', 'important');
            }

            [nameEls, colorEls].forEach(els => {
                if (els.display) {
                    els.display.style.transition = 'opacity 0.4s ease, transform 0.55s var(--spring-release)';
                    els.display.style.transform = 'translate3d(0, 40px, 0)';
                    els.display.style.opacity = '0';
                }
                if (els.sharedStatus) {
                    els.sharedStatus.style.transition = 'opacity 0.3s ease';
                    els.sharedStatus.style.transform = 'translate3d(0, 0, 0)';
                    els.sharedStatus.style.opacity = '1';
                }
            });

            syncWrapper.style.transition = 'transform 0.55s var(--spring-release), opacity 0.4s ease';
            syncWrapper.style.transform = 'translate3d(0, 0, 0)';
            syncWrapper.style.opacity = '1';

            [nameSvgs, colorSvgs].forEach(svgs => {
                if (svgs) {
                    svgs.s1Svg.style.transition = 'transform 0.55s var(--spring-release), opacity 0.4s ease';
                    svgs.s1Svg.style.transform = 'translate3d(0, 0, 0)';
                    svgs.s1Svg.style.opacity = '1';
                }
            });
        }, 50);

        setTimeout(() => {
            syncWrapper.style.transform = 'translate3d(0, 40px, 0)';
            syncWrapper.style.opacity = '0';
            
            [nameSvgs, colorSvgs].forEach(svgs => {
                if (svgs) {
                    svgs.s1Svg.style.transform = 'translate3d(0, 40px, 0)';
                    svgs.s1Svg.style.opacity = '0';
                }
            });

            checkWrapper.style.transition = 'transform 0.55s var(--spring-release), opacity 0.4s ease';
            checkWrapper.style.transform = 'translate3d(0, 0, 0)';
            checkWrapper.style.opacity = '1';

            [nameSvgs, colorSvgs].forEach(svgs => {
                if (svgs) {
                    svgs.s2Svg.style.transition = 'transform 0.55s var(--spring-release), opacity 0.4s ease';
                    svgs.s2Svg.style.transform = 'translate3d(0, 0, 0)';
                    svgs.s2Svg.style.opacity = '1';
                }
            });
            // 🟢 【新增】：在這裡加入資料重置與 DOM 更新邏輯！
            // 趁文字飛到空中隱藏時 (900ms) 偷偷換掉，等 1800ms 降落時就會是全新預設狀態
            // 🟢 【升級版】：非破壞性重置！將恢復預設視為一次「編輯」，並把當前狀態存入歷史紀錄
            const activeId = getActiveCardId();
            if (activeId && activeId !== 'fixed-bottom') {
                const currentData = window.appRailwayData.find(r => r.id === activeId);
                if (!currentData) return;

                // 1. 先嘗試從系統內建的 railwayData 找預設值 (針對原生卡片)
                let defaultData = railwayData.find(r => r.id === activeId);

                // ✨ 2. 核心修復：如果找不到，代表這是「手動新增的自訂卡片」！我們動態為它生成預設值
                if (!defaultData && currentData.isCustom) {
                    
                    // ✈️ 狀況 A：如果是飛機航班 (優先判定，避免被火車邏輯誤攔截)
                    if (currentData.isFlightCard) {
                        const flightId = (currentData.flightData && currentData.flightData.id) || 
                                         (currentData.targetLineIds && currentData.targetLineIds[0]) || 
                                         'フライト';
                        
                        // ✨ 核心修復：讓「還原預設值」也具備動態 CI 顏色辨識能力
                        let defaultHex = '#0a84ff'; // 預設藍色
                        if (currentData.flightData && currentData.flightData.airline) {
                            const airlineStr = currentData.flightData.airline.toUpperCase();
                            if (airlineStr.includes('ANA') || airlineStr.includes('全日本空輸')) defaultHex = '#112233';
                            else if (airlineStr.includes('JAL') || airlineStr.includes('日本航空')) defaultHex = '#8B0000';
                            else if (airlineStr.includes('SKYMARK') || airlineStr.includes('スカイマーク')) defaultHex = '#F3CA00';
                            else if (airlineStr.includes('PEACH') || airlineStr.includes('ピーチ')) defaultHex = '#B82A7A';
                            else if (airlineStr.includes('JETSTAR') || airlineStr.includes('ジェットスター')) defaultHex = '#FF6600';
                            else if (airlineStr.includes('STARFLYER') || airlineStr.includes('スターフライヤー') || airlineStr.includes('STAR FLYER')) defaultHex = '#1A1A1A';
                            else if (airlineStr.includes('AIRDO') || airlineStr.includes('エア・ドゥ')) defaultHex = '#00A0E9';
                            else if (airlineStr.includes('SOLASEED') || airlineStr.includes('ソラシド')) defaultHex = '#87C643';
                        }
                        
                        defaultData = { name: flightId, hex: defaultHex };
                    }
                    // 🚄 狀況 B：如果是綁定雲端字典的火車路線
                    else if (currentData.targetLineIds && currentData.targetLineIds.length > 0 && window.MasterRouteDictionary) {
                        const firstRouteId = currentData.targetLineIds[0];
                        const dictRoute = window.MasterRouteDictionary[firstRouteId];
                        if (dictRoute) {
                            defaultData = { name: dictRoute.name, hex: dictRoute.hex || '#2C2C2E' };
                        }
                    } 
                    
                    // ⬜ 狀況 C：如果都沒有（例如火車字典查不到），代表這是一張純白的自訂卡片
                    if (!defaultData) {
                        defaultData = { name: '新規カード', hex: '#2C2C2E' };
                    }
                }

                // 3. 確認有預設值後，執行還原邏輯
                if (defaultData) {
                    // 防呆：檢查是否已經是預設狀態，避免無意義的存檔
                    if (currentData.name === defaultData.name && currentData.hex.toLowerCase() === defaultData.hex.toLowerCase()) {
                        console.log("[雲端同步] 已經是預設狀態，無需覆蓋歷史紀錄");
                    } else {
                        // ✨ 核心魔法：將被洗掉前的「目前客製化狀態」打包成救生圈
                        const oldState = {
                            customName: currentData.name,
                            customHex: currentData.hex
                        };

                        // 更新全域記憶體資料為預設值
                        currentData.name = defaultData.name;
                        currentData.hex = defaultData.hex;

                        // 改用 saveRoutePreference，把預設值存進去，並把舊顏色當作歷史紀錄傳給 DB！
                        saveRoutePreference(activeId, defaultData.name, defaultData.hex, oldState)
                            .then(() => console.log(`[DB] 已恢復預設值，並成功將客製化狀態保留於歷史紀錄中！`))
                            .catch(err => console.error('[DB] 寫入 IndexedDB 失敗:', err));

                        // 🟢 [進化版] 終極無損重繪魔法：對付 setTimeout 的批次優化陷阱
                        const forceRepaint = (el) => {
                            if (!el) return;
                            const tags = el.querySelectorAll('.info-tag-item, .info-capsule, .info-circle, .flight-action-btn');
                            tags.forEach(tag => {
                                const originalDisplay = tag.style.display; 
                                tag.style.display = 'none';
                                // ⚠️ 關鍵：使用 getComputedStyle 強制瀏覽器立刻結算這一步的樣式
                                window.getComputedStyle(tag).display; 
                                tag.style.display = originalDisplay; 
                            });
                        };

                        // 1. 先把新的顏色變數寫入卡片
                        const customizeCard = document.querySelector('#dynamic-blank-overlay .detail-card-inner');
                        const detailCard = document.querySelector('#detail-card-container .detail-card-inner');
                        const mainCard = document.getElementById(`card-${activeId}`);

                        if (customizeCard) applyThemeToCard(customizeCard, defaultData.hex);
                        if (detailCard) {
                            applyThemeToCard(detailCard, defaultData.hex);
                            const detailNameNode = detailCard.querySelector('.line-name');
                            if (detailNameNode) detailNameNode.textContent = defaultData.name;
                        }
                        if (mainCard) {
                            applyThemeToCard(mainCard, defaultData.hex);
                            const mainNameNode = mainCard.querySelector('.line-name');
                            if (mainNameNode) mainNameNode.textContent = defaultData.name;
                        }

                        // 2. 更新準備降落的文字框內容
                        if (nameEls.display) nameEls.display.textContent = defaultData.name;
                        if (colorEls.display) colorEls.display.textContent = defaultData.hex.toUpperCase();

                        // ✨ 3. 關鍵修復：把重繪動作推遲到「下一幀」，保證 CSS 變數已經徹底寫入 DOM
                        requestAnimationFrame(() => {
                            forceRepaint(customizeCard);
                            forceRepaint(detailCard);
                            forceRepaint(mainCard);
                        });
                    }
                }
            } // 結束 if (activeId && ...)
        }, 900);

        setTimeout(() => {
            checkWrapper.style.transform = 'translate3d(0, 40px, 0)';
            checkWrapper.style.opacity = '0';

            [nameSvgs, colorSvgs].forEach(svgs => {
                if (svgs) {
                    svgs.s2Svg.style.transform = 'translate3d(0, 40px, 0)';
                    svgs.s2Svg.style.opacity = '0';
                }
            });

            if (originalSvg) {
                // 🟢 修復：確保 -40px 的狀態被瀏覽器確實繪製，恢復由上往下的掉落感
                originalSvg.style.setProperty('transition', 'none', 'important');
                originalSvg.style.setProperty('transform', 'translate3d(0, -40px, 0)', 'important');
                
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        originalSvg.style.setProperty('transition', 'opacity 0.4s ease, transform 0.55s var(--spring-release)', 'important');
                        originalSvg.style.setProperty('transform', 'translate3d(0, 0, 0)', 'important');
                        originalSvg.style.setProperty('opacity', '1', 'important');
                    });
                });
            }
            
            [nameEls, colorEls].forEach(els => {
                if (els.display) {
                    els.display.style.transition = 'none';
                    // 🟢 文字從上方落下復原 (-40px -> 0px)
                    els.display.style.transform = 'translate3d(0, -40px, 0)';
                    void els.display.offsetWidth;
                    els.display.style.transition = 'opacity 0.4s ease, transform 0.55s var(--spring-release)';
                    els.display.style.transform = 'translate3d(0, 0, 0)';
                    els.display.style.opacity = '1';
                }
                if (els.sharedStatus) {
                    els.sharedStatus.style.transition = 'opacity 0.3s ease';
                    els.sharedStatus.style.opacity = '0';
                }
            });
        }, 1800);

        setTimeout(() => {
            syncWrapper.remove();
            checkWrapper.remove();
            if (originalSvg) {
                originalSvg.style.removeProperty('transition');
                originalSvg.style.removeProperty('transform');
                originalSvg.style.removeProperty('opacity');
            }

            [nameEls, colorEls].forEach((els, index) => {
                if (els.sharedText) els.sharedText.style.display = '';
                const svgs = index === 0 ? nameSvgs : colorSvgs;
                if (svgs && svgs.container) svgs.container.remove();
                if (els.sharedStatus) {
                    // ✨ 修復：明確設為 0 與原點，不可使用空字串，否則會喚醒幽靈文字
                    els.sharedStatus.style.transform = 'translate3d(0, 0, 0)';
                    els.sharedStatus.style.opacity = '0';
                }
                if (els.display) {
                    els.display.style.transition = '';
                    // ✨ 修復：確保文字絕對歸位
                    els.display.style.transform = 'translate3d(0, 0, 0)';
                }
            });

            window.pSyncing = false;
        }, 2500);
    };
}

// (這裡應該是你原本 window.triggerCloudSync 函數的結尾大括號 } )

    // =========================================================
    // 🟢 個性化面板：連動「歷史紀錄 (Undo)」按鈕的輸入框動畫引擎
    // =========================================================
    window.startInputUndoAnimation = function() {
        const nameEls = getElements('name');
        const colorEls = getElements('color');
        
        // 防呆：如果輸入框不存在或沒顯示（代表沒打開客製化卡片），直接跳過不執行
        if (!nameEls || !nameEls.display || !colorEls || !colorEls.display) return; 

        // 確保沒有殘留的舊動畫
        if (window.activeUndoSvgs) {
            window.resetInputUndoAnimation(true);
        }

        const svgSync = `<svg class="undo-sync-icon lucide lucide-rotate-ccw" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
        const svgCheck = `<svg class="undo-check-icon lucide lucide-check" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
        const svgError = `<svg class="undo-error-icon lucide lucide-x" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

        function setup(els) {
            if (!els.sharedStatus) return null;
            if (els.sharedText) els.sharedText.style.display = 'none';

            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.inset = '0';
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
            container.style.pointerEvents = 'none'; // 防止干擾點擊

            const createIcon = (svgStr) => {
                const el = document.createElement('div');
                el.innerHTML = svgStr;
                el.style.position = 'absolute';
                // 預設藏在上方待命
                el.style.transform = 'translate3d(0, -40px, 0)';
                el.style.opacity = '0';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                return el;
            };

            const syncIcon = createIcon(svgSync);
            const checkIcon = createIcon(svgCheck);
            const errorIcon = createIcon(svgError);

            container.appendChild(syncIcon);
            container.appendChild(checkIcon);
            container.appendChild(errorIcon);
            els.sharedStatus.appendChild(container);

            return { container, syncIcon, checkIcon, errorIcon, els };
        }

        window.activeUndoSvgs = {
            name: setup(nameEls),
            color: setup(colorEls)
        };

        // 🟢 階段一：開始動畫 (文字往下掉消失，Sync 圖示從上方掉入並同步旋轉)
        setTimeout(() => {
            [window.activeUndoSvgs.name, window.activeUndoSvgs.color].forEach(item => {
                if (!item) return;
                const { els, syncIcon } = item;

                // 原有文字下降消失
                els.display.style.transition = 'opacity 0.4s ease, transform 0.55s var(--spring-release)';
                els.display.style.transform = 'translate3d(0, 40px, 0)';
                els.display.style.opacity = '0';

                // 顯示共用狀態列
                els.sharedStatus.style.transition = 'opacity 0.3s ease';
                els.sharedStatus.style.transform = 'translate3d(0, 0, 0)';
                els.sharedStatus.style.opacity = '1';

                // Sync 圖示優雅掉入並一秒轉一圈 (100% 對齊右上角歷史按鈕節奏)
                syncIcon.style.transition = 'transform 1s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.3s ease';
                syncIcon.style.transform = 'translate3d(0, 0, 0) rotate(-360deg)';
                syncIcon.style.opacity = '1';
            });
        }, 50);
    };

    window.finishInputUndoAnimation = function(isSuccess) {
        if (!window.activeUndoSvgs) return;

        // 🟢 階段二：根據成敗，將 Sync 圖示丟掉，換成打勾或打叉
        [window.activeUndoSvgs.name, window.activeUndoSvgs.color].forEach(item => {
            if (!item) return;
            const { syncIcon, checkIcon, errorIcon } = item;
            
            // Sync 圖示轉完後直接往下掉出畫面 (維持旋轉角度避免彈回)
            syncIcon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 1, 1), opacity 0.2s linear';
            syncIcon.style.transform = 'translate3d(0, 40px, 0) rotate(-360deg)';
            syncIcon.style.opacity = '0';

            // 成功/失敗圖示從上方掉入，並帶有彈跳感
            const targetIcon = isSuccess ? checkIcon : errorIcon;
            targetIcon.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease-out';
            targetIcon.style.transform = 'translate3d(0, 0, 0)';
            targetIcon.style.opacity = '1';
            
            if (!isSuccess) {
                // 錯誤時額外觸發左右搖頭震盪，對齊 UI 手感
                setTimeout(() => {
                    targetIcon.classList.add('p-shake-active');
                }, 150);
            }
        });
    };

    window.resetInputUndoAnimation = function(immediate = false) {
        if (!window.activeUndoSvgs) return;

        // 🟢 階段三：清理戰場，讓最新的文字重新浮上來
        [window.activeUndoSvgs.name, window.activeUndoSvgs.color].forEach(item => {
            if (!item) return;
            const { container, checkIcon, errorIcon, els } = item;
            
            if (!immediate) {
                // 圖示往上飛走消失
                checkIcon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 1, 1), opacity 0.2s linear';
                checkIcon.style.transform = 'translate3d(0, -40px, 0)';
                checkIcon.style.opacity = '0';
                
                errorIcon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 1, 1), opacity 0.2s linear';
                errorIcon.style.transform = 'translate3d(0, -40px, 0)';
                errorIcon.style.opacity = '0';

                // 讓文字瞬間傳送到下方待命，然後浮上來回到正中央
                els.display.style.transition = 'none';
                els.display.style.transform = 'translate3d(0, 40px, 0)'; 
                void els.display.offsetWidth; // 強制瀏覽器重繪
                
                els.display.style.transition = 'opacity 0.4s ease, transform 0.55s var(--spring-release)';
                els.display.style.transform = 'translate3d(0, 0, 0)';
                els.display.style.opacity = '1';

                els.sharedStatus.style.transition = 'opacity 0.3s ease';
                els.sharedStatus.style.opacity = '0';

                setTimeout(() => {
                    container.remove();
                    if (els.sharedText) els.sharedText.style.display = '';
                    
                    // ✨ 修復：明確設為 0 與原點，徹底封殺幽靈文字
                    els.sharedStatus.style.transform = 'translate3d(0, 0, 0)';
                    els.sharedStatus.style.opacity = '0';
                    
                    els.display.style.transition = '';
                    els.display.style.transform = 'translate3d(0, 0, 0)';
                }, 500);
            } else {
                // 強制清理 (防呆)
                container.remove();
                if (els.sharedText) els.sharedText.style.display = '';
                
                // ✨ 修復：防呆狀態下也必須確保設為 0
                els.sharedStatus.style.transform = 'translate3d(0, 0, 0)';
                els.sharedStatus.style.opacity = '0';
                
                els.display.style.transition = '';
                els.display.style.transform = 'translate3d(0, 0, 0)';
                els.display.style.opacity = '1';
            }
        });
        window.activeUndoSvgs = null;
    };

// =========================================================
// 🟢 幽靈輸入框核心邏輯與絕對高度霸權守護
// =========================================================

const pState = {
    name: { isCopying: false, isPasting: false },
    color: { isCopying: false, isPasting: false }
};

window.pActiveEditType = null; 
window.pGhostMarker = false; 
window.pSyncing = false; 

window.triggerBump = function(el) {
    if (!el) return;
    el.classList.add('p-bump-active');
    setTimeout(() => el.classList.remove('p-bump-active'), 150);
};

function triggerDescToggle(isActive) {
    const descName = document.getElementById('p-desc-name');
    const descColor = document.getElementById('p-desc-color');
    if (!descName || !descColor) return;

    descName.style.transition = 'opacity 0.2s linear';
    descColor.style.transition = 'opacity 0.2s linear';
    descName.style.opacity = '0';
    descColor.style.opacity = '0';

    setTimeout(() => {
        if (isActive) {
            descName.textContent = '　- Enterキーで入力 -';
            descColor.textContent = '　- # 省略可 -';
        } else {
            descName.textContent = '　- 十文字以內 -';
            descColor.textContent = '　- HEX形式で入力してください -';
            /*需更改原始提示才不會出現bug*/
        }
        
        setTimeout(() => {
            descName.style.transition = 'opacity 0.2s linear';
            descColor.style.transition = 'opacity 0.2s linear';
            descName.style.opacity = '1';
            descColor.style.opacity = '1';
        }, 1000); 
    }, 200); 
}

function getOffset(el, parent) {
    let top = 0, left = 0;
    while (el && el !== parent) {
        top += el.offsetTop;
        left += el.offsetLeft;
        el = el.offsetParent;
    }
    return { top, left };
}

window.pScrollManager = {
    isLocked: false,
    scrollY: 0,
    lock: function() {
        if (this.isLocked) return; 
        
        requestAnimationFrame(() => {
            if (!this.isLocked) {
                this.scrollY = window.scrollY; 
                this.isLocked = true;

                document.body.style.setProperty('position', 'fixed', 'important');
                document.body.style.setProperty('top', `-${this.scrollY}px`, 'important');
                document.body.style.setProperty('left', '0', 'important');
                document.body.style.setProperty('right', '0', 'important');
                document.body.style.setProperty('width', '100%', 'important');
                document.body.style.setProperty('height', '100%', 'important');
                document.body.style.setProperty('overflow', 'hidden', 'important');
                document.documentElement.style.setProperty('overflow', 'hidden', 'important');
                document.documentElement.style.setProperty('height', '100%', 'important');
                
                document.addEventListener('touchmove', window._pLockScroll, { passive: false, capture: true });
                document.addEventListener('touchstart', window._pPreventBlur, { passive: false, capture: true });
                document.addEventListener('touchend', window._pPreventBlur, { passive: false, capture: true });
                document.addEventListener('mousedown', window._pPreventBlur, { passive: false, capture: true });
            }
        });
    },
    unlock: function() {
        if (!this.isLocked) return; 
        this.isLocked = false;
        
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('top');
        document.body.style.removeProperty('left');
        document.body.style.removeProperty('right');
        document.body.style.removeProperty('width');
        document.body.style.removeProperty('height');
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('height');
        
        document.removeEventListener('touchmove', window._pLockScroll, { capture: true });
        document.removeEventListener('touchstart', window._pPreventBlur, { capture: true });
        document.removeEventListener('touchend', window._pPreventBlur, { capture: true });
        document.removeEventListener('mousedown', window._pPreventBlur, { capture: true });

        window.scrollTo(0, this.scrollY); 
    }
};

window._pLockScroll = function (e) {
    if (e.target.id !== 'p-ghost-input') e.preventDefault();
};

window._pPreventBlur = function(e) {
    if (!window.pActiveEditType) return;
    if (e.target.id === 'p-ghost-input') return;

    const btn = e.target.closest('.interactive-btn');
    if (btn) {
        e.preventDefault(); 
        if (e.type === 'touchend' || e.type === 'mousedown') btn.click();
        return;
    }

    let clientY = 0;
    if (e.touches && e.touches.length > 0) clientY = e.touches[0].clientY;
    else if (e.clientY) clientY = e.clientY;

    const card = document.querySelector('.detail-card-inner');
    if (card && clientY < card.getBoundingClientRect().top) {
        return; 
    }
    
    e.preventDefault();
};

const getElements = (type) => {
    const isColor = type === 'color';
    return {
        type: type,
        row: document.getElementById(isColor ? 'p-color-edit-row' : 'p-edit-row'),
        container: document.getElementById(isColor ? 'p-btn-color-input-container' : 'p-btn-input-container'),
        label: document.getElementById(isColor ? 'p-btn-color-label' : 'p-btn-label'),
        circle2: document.getElementById(isColor ? 'p-btn-color-circle-2' : 'p-btn-circle-2'),
        display: document.getElementById(isColor ? 'p-display-color' : 'p-display-name'),
        clip: document.getElementById(isColor ? 'p-color-icon-clipboard' : 'p-icon-clipboard'),
        check: document.getElementById(isColor ? 'p-color-icon-check' : 'p-icon-check'),
        x: document.getElementById(isColor ? 'p-color-icon-x' : 'p-icon-x'),
        pasteDef: document.getElementById(isColor ? 'p-color-icon-paste-default' : 'p-icon-paste-default'),
        pasteLoader: document.getElementById(isColor ? 'p-color-icon-paste-loader' : 'p-icon-paste-loader'),
        pasteError: document.getElementById(isColor ? 'p-color-icon-paste-error' : 'p-icon-paste-error'),
        pasteCheck: document.getElementById(isColor ? 'p-color-icon-paste-check' : 'p-icon-paste-check'),
        sharedStatus: document.getElementById(isColor ? 'p-color-shared-status' : 'p-shared-status'),
        sharedText: document.getElementById(isColor ? 'p-color-shared-status-text' : 'p-shared-status-text')
    };
};

window.checkFontFamily = function(val) {
    const ghost = document.getElementById('p-ghost-input');
    const nameDisplay = document.getElementById('p-display-name');
    const family = (val.length > 0 && /^[\x00-\x7F]*$/.test(val)) ? 'monospace' : 'inherit';
    
    if (ghost) ghost.style.fontFamily = family;
    if (nameDisplay) nameDisplay.style.fontFamily = family;
};

window.handleGhostInput = function(val) {
    if (!window.pActiveEditType) return;
    
    const ghost = document.getElementById('p-ghost-input');
    
    let processedVal = val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    if (window.pActiveEditType === 'name') {
        if (val !== processedVal && ghost) {
            const start = ghost.selectionStart;
            const end = ghost.selectionEnd;
            ghost.value = processedVal;
            ghost.setSelectionRange(start, end);
        }
        const countElement = document.getElementById('p-char-count');
        if (countElement) countElement.textContent = processedVal.length + '/10';
        window.checkFontFamily(processedVal);
    } else {
        processedVal = processedVal.replace(/＃/g, '#').toUpperCase();
        if (val !== processedVal && ghost) {
            const start = ghost.selectionStart;
            const end = ghost.selectionEnd;
            ghost.value = processedVal;
            ghost.setSelectionRange(start, end);
        }
    }
};

window.handleGhostBlur = function(e) {
    if (!window.pActiveEditType) return;
    if (document.activeElement && document.activeElement.id === 'p-ghost-input') return;
    
    const ghost = document.getElementById('p-ghost-input');
    const type = window.pActiveEditType;
    let val = ghost.value.trim();
    let isValid = true;
    
    if (type === 'color') {
        val = val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/＃/g, '#').toUpperCase();
        const hexRegex = /^#?([A-F0-9]{3}|[A-F0-9]{6})$/;
        if (!hexRegex.test(val)) {
            isValid = false; 
        } else {
            val = val.startsWith('#') ? val : '#' + val;
            ghost.value = val;
        }
    } else if (type === 'name') {
        if (val.length === 0 || val.length > 10) isValid = false;
    }
    
    window.closeGhostEditMode(true, null, isValid);
};

window.handleGhostKey = function(e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        if (e.isComposing) return;
        
        const ghost = e.target;
        let val = ghost.value.trim();
        
        if (window.pActiveEditType === 'color') {
            val = val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
                return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
            }).replace(/＃/g, '#').toUpperCase();
            
            const hexRegex = /^#?([A-F0-9]{3}|[A-F0-9]{6})$/;
            if (!hexRegex.test(val)) {
                ghost.classList.remove('p-shake-active');
                void ghost.offsetWidth; 
                ghost.classList.add('p-shake-active');
                setTimeout(() => ghost.classList.remove('p-shake-active'), 400);
                return; 
            }
            if (!val.startsWith('#')) val = '#' + val;
            ghost.value = val;
        } else {
            if (val.length > 10) return;
        }
        
        window.closeGhostEditMode(false, null, true);
    }
};

window.toggleGhostEditMode = function(type, e, element) {
    if (window.pSyncing) { 
        if (element) window.triggerBump(element);
        return;
    }

    if (pState[type] && (pState[type].isCopying || pState[type].isPasting)) {
        if (element) window.triggerBump(element);
        return;
    }

    if (window.pGhostMarker) {
        if (element) window.triggerBump(element);
        return;
    }
    
    window.pGhostMarker = true;
    setTimeout(() => { window.pGhostMarker = false; }, 400);

    if (window.pActiveEditType === type) return;

    const isFirstOpen = !window.pActiveEditType;
    const ghost = document.getElementById('p-ghost-input');
    const wrapper = document.getElementById('p-ghost-wrapper');
    const els = getElements(type);

    if (window.pActiveEditType) {
        const oldType = window.pActiveEditType;
        const oldEls = getElements(oldType);
        
        if (ghost) {
            let valOld = ghost.value.trim();
            let isOldValid = true;
            
            if (oldType === 'color') {
                valOld = valOld.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/＃/g, '#').toUpperCase();
                if (!/^#?([A-F0-9]{3}|[A-F0-9]{6})$/.test(valOld)) isOldValid = false;
                else valOld = valOld.startsWith('#') ? valOld : '#' + valOld;
            } else if (oldType === 'name') {
                if (valOld.length === 0 || valOld.length > 10) isOldValid = false;
            }

            if (isOldValid && window.triggerSaveCustomization) {
                window.triggerSaveCustomization(oldType, valOld);
                if (oldEls.display) oldEls.display.textContent = valOld;
            }
        }

        oldEls.row.dataset.editing = 'false';
        oldEls.label.style.maxWidth = '120px';
        oldEls.label.style.padding = '0 16px';
        oldEls.label.style.marginRight = '0px';
        oldEls.label.style.transform = 'translate3d(0px, 0, 0)';
        oldEls.circle2.style.maxWidth = 'var(--btn-height)';
        oldEls.circle2.style.padding = '0px';
        oldEls.circle2.style.marginLeft = '0px';
        oldEls.circle2.style.transform = 'translate3d(0px, 0, 0)';
        
        oldEls.display.style.transition = 'opacity 0.2s ease';
        oldEls.display.style.opacity = '1';
        
        setTimeout(() => {
            if (window.pActiveEditType !== oldEls.type) {
                oldEls.clip.style.transform = 'translate3d(-50%, -50%, 0)';
                oldEls.x.style.transform = 'translate3d(-250%, -50%, 0)';
            }
        }, 200);
    }

    if (isFirstOpen) triggerDescToggle(true);

    window.pActiveEditType = type;
    els.row.dataset.editing = 'true';
    pState[type].isCopying = false;
    pState[type].isPasting = false;

    els.label.style.maxWidth = '0px';
    els.label.style.padding = '0px';
    els.label.style.marginRight = '-8px';
    els.label.style.transform = 'translate3d(-30px, 0, 0)';

    els.circle2.style.maxWidth = '0px';
    els.circle2.style.padding = '0px';
    els.circle2.style.marginLeft = '-8px';
    els.circle2.style.transform = 'translate3d(30px, 0, 0)';

    els.display.style.transition = 'opacity 0.2s ease';
    els.display.style.opacity = '0';
    
    ghost.style.transition = 'none'; 
    ghost.value = els.display.textContent;
    ghost.maxLength = type === 'color' ? 7 : 10;
    if (type === 'name') window.handleGhostInput(ghost.value);
    else ghost.style.fontFamily = 'monospace';

    if (type !== 'name') {
        const countElement = document.getElementById('p-char-count');
        if (countElement) countElement.style.opacity = '0';
    }

    // 🟢 核心修復：放棄 appendChild 遷移，改用 RAF 視覺追蹤引擎 (拯救 Android 鍵盤與絲滑度)
    // 1. 將輸入框永遠鎖定在 wrapper 根部，絕對不跨容器移動 DOM，確保 Android 系統不收起鍵盤！
    if (ghost.parentNode !== wrapper) {
        wrapper.appendChild(ghost);
    }
    
    // 2. 鎖定 Y 軸與高度 (這兩個不會隨動畫變動)
    const offset = getOffset(els.container, wrapper);
    ghost.style.top = offset.top + 'px';
    ghost.style.height = els.container.offsetHeight + 'px';
    
    // 3. 啟動 60fps 追蹤迴圈，讓隱形輸入框跟隨 Flexbox 動畫一起變大與平移
    const startTime = Date.now();
    const trackAnim = () => {
        if (window.pActiveEditType !== type) return; // 終止條件：使用者切換到其他框
        
        const currentOffset = getOffset(els.container, wrapper);
        ghost.style.left = currentOffset.left + 'px';
        ghost.style.width = els.container.offsetWidth + 'px';
        
        // 追蹤 500ms (確保涵蓋 400ms 的 spring 動畫與一點點緩衝)
        if (Date.now() - startTime < 500) {
            requestAnimationFrame(trackAnim);
        }
    };
    trackAnim();
    
    ghost.style.pointerEvents = 'auto';
    ghost.focus({ preventScroll: true });

    void ghost.offsetWidth;

    ghost.style.transition = 'opacity 0.25s ease';
    setTimeout(() => {
        if (window.pActiveEditType === type) ghost.style.opacity = '1';
    }, 50); 

    setTimeout(() => {
        if (window.pActiveEditType === type) {
            els.clip.style.transform = 'translate3d(150%, -50%, 0)';
            els.x.style.transform = 'translate3d(-50%, -50%, 0)';
            if (type === 'name') {
                const countElement = document.getElementById('p-char-count');
                if (countElement) countElement.style.opacity = '0.8';
            }
        }
    }, 200);
};

window.closeGhostEditMode = function(forceImmediate = false, triggerElement = null, shouldSave = false) {
    if (!window.pActiveEditType) return;

    if (window.pGhostMarker && !forceImmediate) {
        if (triggerElement) window.triggerBump(triggerElement);
        return;
    }

    window.pGhostMarker = true;
    setTimeout(() => { window.pGhostMarker = false; }, 400);

    const type = window.pActiveEditType;
    const els = getElements(type);
    const ghost = document.getElementById('p-ghost-input');

    window.pActiveEditType = null;
    els.row.dataset.editing = 'false';

    triggerDescToggle(false);

    els.label.style.maxWidth = '120px';
    els.label.style.padding = '0 16px';
    els.label.style.marginRight = '0px';
    els.label.style.transform = 'translate3d(0px, 0, 0)';

    els.circle2.style.maxWidth = 'var(--btn-height)';
    els.circle2.style.padding = '0px';
    els.circle2.style.marginLeft = '0px';
    els.circle2.style.transform = 'translate3d(0px, 0, 0)';

    if (shouldSave) {
        let finalVal = ghost.value.trim();
        if (finalVal !== '') {
            finalVal = type === 'color' ? finalVal.toUpperCase() : finalVal;
            els.display.textContent = finalVal;
            
            if (window.triggerSaveCustomization) {
                window.triggerSaveCustomization(type, finalVal);
            }
        }
    }

    els.display.style.transition = 'opacity 0.2s ease';
    els.display.style.opacity = '1';

    ghost.style.transition = 'opacity 0.15s ease';
    ghost.style.opacity = '0';
    ghost.style.pointerEvents = 'none';
    ghost.blur(); 

    if (type === 'name') {
        const countElement = document.getElementById('p-char-count');
        if (countElement) countElement.style.opacity = '0';
    }

    setTimeout(() => {
        if (window.pActiveEditType !== type) {
            els.clip.style.transform = 'translate3d(-50%, -50%, 0)';
            els.x.style.transform = 'translate3d(-250%, -50%, 0)';
        }
    }, 200);
};

window.handleCopyAction = function(e, type, element) {
    if (e) e.stopPropagation();
    if (window.pSyncing) {
        if (element) window.triggerBump(element);
        return;
    }
    if (window.pActiveEditType === type) {
        window.closeGhostEditMode(false, element);
        return;
    }
    
    if (window.pGhostMarker || pState[type].isCopying || pState[type].isPasting) {
        if (element) window.triggerBump(element);
        return;
    }

    const els = getElements(type);
    const textToCopy = els.display ? els.display.textContent : "";

    if (textToCopy) {
        window.pGhostMarker = true;
        setTimeout(() => { window.pGhostMarker = false; }, 400);
        pState[type].isCopying = true; 
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            if (els.sharedStatus) {
                els.sharedStatus.style.transition = 'none';
                els.sharedStatus.style.transform = 'translate3d(40px, 0, 0)';
                void els.sharedStatus.offsetWidth; 
                els.sharedStatus.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
            }
            if (els.sharedText) els.sharedText.textContent = 'コピーしました';

            if (els.clip) els.clip.style.transform = 'translate3d(calc(-50% - 40px), -50%, 0)';
            if (els.check) els.check.style.transform = 'translate3d(-50%, -50%, 0)';
            
            if (els.display) {
                els.display.style.transform = 'translate3d(-40px, 0, 0)';
                els.display.style.opacity = '0';
            }
            if (els.sharedStatus) {
                els.sharedStatus.style.transform = 'translate3d(0px, 0, 0)';
                els.sharedStatus.style.opacity = '1';
            }

            setTimeout(() => {
                if (els.clip) els.clip.style.transform = 'translate3d(-50%, -50%, 0)';
                if (els.check) els.check.style.transform = 'translate3d(calc(-50% + 40px), -50%, 0)';
                
                if (els.display) {
                    els.display.style.transform = 'translate3d(0px, 0, 0)';
                    els.display.style.opacity = '1';
                }
                if (els.sharedStatus) {
                    els.sharedStatus.style.transform = 'translate3d(40px, 0, 0)';
                    els.sharedStatus.style.opacity = '0';
                }
                setTimeout(() => pState[type].isCopying = false, 600);
            }, 1000);
        }).catch(err => { pState[type].isCopying = false; });
    }
};

window.handlePasteAction = function(e, type, element) {
    if (e) e.stopPropagation();
    if (window.pSyncing) {
        if (element) window.triggerBump(element);
        return;
    }
    if (window.pActiveEditType === type) return; 

    if (window.pGhostMarker || pState[type].isCopying || pState[type].isPasting) {
        if (element) window.triggerBump(element);
        return;
    }

    window.pGhostMarker = true;
    setTimeout(() => { window.pGhostMarker = false; }, 400);
    pState[type].isPasting = true;
    
    const els = getElements(type);
    const errorSvg = els.pasteError ? els.pasteError.querySelector('svg') : null;

    if (els.sharedText) els.sharedText.classList.remove('p-shake-active');
    if (errorSvg) errorSvg.classList.remove('p-shake-active');

    navigator.clipboard.readText().then(text => {
        let val = text.trim();
        let resType = 'success';
        let finalVal = val;
        let errorMsg = '';

        if (!val) {
            resType = 'error';
            errorMsg = '剪貼簿無內容';
        } else {
            val = val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
                return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
            });

            if (type === 'color') {
                let colorVal = val.replace(/＃/g, '#').toUpperCase();
                if (/^#?([A-F0-9]{3}|[A-F0-9]{6})$/.test(colorVal)) {
                    finalVal = colorVal.startsWith('#') ? colorVal : '#' + colorVal;
                } else {
                    resType = 'error';
                    errorMsg = '形式エラー';
                }
            } else if (type === 'name') {
                finalVal = val;
            }
        }

        if (els.sharedStatus) {
            els.sharedStatus.style.transition = 'none';
            els.sharedStatus.style.transform = resType === 'error' ? 'translate3d(0, -40px, 0)' : 'translate3d(-40px, 0, 0)';
            void els.sharedStatus.offsetWidth; 
            els.sharedStatus.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
        }
        
        if (els.display) {
            els.display.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
            els.display.style.transform = resType === 'error' ? 'translate3d(0, 40px, 0)' : 'translate3d(40px, 0, 0)';
            els.display.style.opacity = '0';
        }
        
        if (els.sharedStatus) {
            els.sharedStatus.style.transform = 'translate3d(0px, 0, 0)';
            els.sharedStatus.style.opacity = '1';
        }

        if (resType === 'error') {
            handleResult(errorMsg, 'error');
        } else {
            handleResult('ペーストしました', 'success', finalVal);
        }
    }).catch(err => {
        if (els.sharedStatus) {
            els.sharedStatus.style.transition = 'none';
            els.sharedStatus.style.transform = 'translate3d(0, -40px, 0)';
            void els.sharedStatus.offsetWidth; 
            els.sharedStatus.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
        }
        
        if (els.display) {
            els.display.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
            els.display.style.transform = 'translate3d(0, 40px, 0)';
            els.display.style.opacity = '0';
        }
        
        if (els.sharedStatus) {
            els.sharedStatus.style.transform = 'translate3d(0, 0, 0)';
            els.sharedStatus.style.opacity = '1';
        }
        
        handleResult('権限拒否', 'error');
    });

    function handleResult(msg, resType, val) {
        if (els.sharedText) els.sharedText.textContent = msg;

        if (resType === 'error') {
            if (els.pasteDef) {
                els.pasteDef.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteDef.style.transform = 'translate3d(-50%, calc(-50% + 40px), 0)';
            }
            if (els.pasteError) {
                els.pasteError.style.transition = 'none';
                els.pasteError.style.transform = 'translate3d(-50%, calc(-50% - 40px), 0)';
                void els.pasteError.offsetWidth;
                els.pasteError.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteError.style.transform = 'translate3d(-50%, -50%, 0)';
            }

            setTimeout(() => {
                if (els.sharedText) els.sharedText.classList.add('p-shake-active');
                if (errorSvg) errorSvg.classList.add('p-shake-active');
            }, 50);

            setTimeout(() => revert('error'), 800);
        } else {
            if (els.pasteDef) {
                els.pasteDef.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteDef.style.transform = 'translate3d(calc(-50% + 40px), -50%, 0)';
            }
            if (els.pasteCheck) {
                els.pasteCheck.style.transition = 'none';
                els.pasteCheck.style.transform = 'translate3d(calc(-50% - 40px), -50%, 0)';
                void els.pasteCheck.offsetWidth;
                els.pasteCheck.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteCheck.style.transform = 'translate3d(-50%, -50%, 0)';
            }
            
            if (val) {
                let finalVal = type === 'color' ? val.toUpperCase() : val;
                if (els.display) els.display.textContent = finalVal;
                if (type === 'name') window.handleGhostInput(val); 
                
                if (window.triggerSaveCustomization) {
                    window.triggerSaveCustomization(type, finalVal);
                }
            }
            setTimeout(() => revert('success'), 800);
        }
    }

    function revert(resType) {
        if (els.display) {
            els.display.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
            els.display.style.transform = 'translate3d(0px, 0, 0)';
            els.display.style.opacity = '1';
        }
        
        if (els.sharedStatus) {
            els.sharedStatus.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
            if (resType === 'error') {
                els.sharedStatus.style.transform = 'translate3d(0, -40px, 0)'; 
            } else {
                els.sharedStatus.style.transform = 'translate3d(-40px, 0, 0)'; 
            }
            els.sharedStatus.style.opacity = '0';
        }

        if (resType === 'error') {
            if (els.pasteError) els.pasteError.style.transform = 'translate3d(-50%, calc(-50% - 40px), 0)'; 
            if (els.pasteDef) {
                els.pasteDef.style.transition = 'none';
                els.pasteDef.style.transform = 'translate3d(-50%, calc(-50% + 40px), 0)'; 
                void els.pasteDef.offsetWidth; 
                els.pasteDef.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteDef.style.transform = 'translate3d(-50%, -50%, 0)'; 
            }
        } else {
            if (els.pasteCheck) els.pasteCheck.style.transform = 'translate3d(calc(-50% - 40px), -50%, 0)'; 
            if (els.pasteDef) {
                els.pasteDef.style.transition = 'none';
                els.pasteDef.style.transform = 'translate3d(calc(-50% + 40px), -50%, 0)'; 
                void els.pasteDef.offsetWidth;
                els.pasteDef.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteDef.style.transform = 'translate3d(-50%, -50%, 0)'; 
            }
        }

        setTimeout(() => {
            if (els.sharedText) els.sharedText.classList.remove('p-shake-active');
            if (errorSvg) errorSvg.classList.remove('p-shake-active');
            pState[type].isPasting = false;
        }, 600);
    }
};