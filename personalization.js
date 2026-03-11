// personalization.js - 個性化設定 (Customize) 專用彈窗引擎

import { saveRoutePreference, resetRoutePreference } from './db.js';
import { railwayData } from './data.js';

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
})();

export function initPersonalization(applyThemeToCard, getActiveCardId) {
    window.DISMISS_ICON_TARGET_ROTATION = 90;

    window.triggerSaveCustomization = function(editType, finalVal) {
        const activeId = getActiveCardId();
        if (!activeId || activeId === 'fixed-bottom') return;

        const routeData = window.appRailwayData.find(r => r.id === activeId);
        if (!routeData) return;

        if (editType === 'name') routeData.name = finalVal;
        if (editType === 'color') routeData.hex = finalVal;

        const customizeCard = document.querySelector('#dynamic-blank-overlay .detail-card-inner');
        if (customizeCard) applyThemeToCard(customizeCard, routeData.hex);

        const detailCard = document.querySelector('#detail-card-container .detail-card-inner');
        if (detailCard) {
            applyThemeToCard(detailCard, routeData.hex);
            const detailNameNode = detailCard.querySelector('.line-name');
            if (detailNameNode) detailNameNode.textContent = routeData.name;
        }

        const mainCard = document.getElementById(`card-${activeId}`);
        if (mainCard) {
            applyThemeToCard(mainCard, routeData.hex);
            const mainNameNode = mainCard.querySelector('.line-name');
            if (mainNameNode) mainNameNode.textContent = routeData.name;
        }

        saveRoutePreference(activeId, routeData.name, routeData.hex)
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
        /* =========================================
           🟢 終極色彩校正：解決亮黃色 (#FFD306) 對比度問題
           ========================================= */
        
        /* 1. 智慧適應：文字、備註與 SVG 圖示顏色 */
        #p-display-name, #p-shared-status-text, #p-char-count, 
        #p-display-color, #p-color-shared-status-text, 
        #p-desc-name, #p-desc-color,
        #p-ghost-wrapper .info-tag-item {
            /* 繼承詳情卡片的動態文字色，確保在亮色背景自動轉深 */
            color: var(--text-secondary) !important;
            fill: var(--text-secondary) !important;
        }

        /* 2. 動態按鈕底色：解決亮色系下的「灰霧感」 */
        #p-ghost-wrapper .info-tag-item {
            /* 強制讓按鈕底色使用色彩引擎算出的 tagBg (在亮色系會變深，增加對比) */
            background: var(--tag-bg) !important;
            /* 增加邊框權重：讓按鈕輪廓在亮色背景下更清晰 */
            border: 1px solid var(--border-color) !important;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        /* 3. 漸層切割效果：僅套用於文字部分，提升立體感 */
        #p-display-name, #p-char-count, #p-display-color, #p-desc-name, #p-desc-color {
            background-image: var(--text-bg-gradient-secondary, none) !important;
            -webkit-background-clip: var(--text-clip, border-box) !important;
            background-clip: var(--text-clip, border-box) !important;
            -webkit-text-fill-color: var(--text-fill, var(--text-secondary)) !important;
        }

        /* 4. 幽靈輸入框：保持純色防止游標消失 */
        #p-ghost-input {
            color: var(--text-secondary) !important;
            caret-color: var(--text-secondary) !important;
        }
    </style>

    <div id="p-edit-row" style="--btn-height: 44px; display: flex; gap: 8px; position: relative;
        width: calc(100% + 30px); margin-left: -15px; padding: 20px 15px; margin-top: -20px; margin-bottom: -8px; 
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 15px, black calc(100% - 15px), transparent 100%);
        mask-image: linear-gradient(to right, transparent 0%, black 15px, black calc(100% - 15px), transparent 100%);">
        
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
        width: calc(100% + 30px); margin-left: -15px; padding: 0px 15px; margin-bottom: 12px; 
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 15px, black calc(100% - 15px), transparent 100%);
        mask-image: linear-gradient(to right, transparent 0%, black 15px, black calc(100% - 15px), transparent 100%);">
        
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
        height: 44px;
        margin: 0; padding: 0 16px;
        background: transparent; border: none; outline: none;
        color: inherit; font-size: 0.95rem; font-weight: inherit; text-align: left;
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

            if (flippedDegrees > 20 || deltaX < -50) {
                container.classList.remove('is-swiping');
                clearInlineStyles(card);
                clearInlineStyles(leftBtn);
                clearInlineStyles(rightBtn);
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

                if (dismissSvg) {
                    dismissSvg.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                    dismissSvg.style.setProperty('transform', `rotate(${window.DISMISS_ICON_TARGET_ROTATION}deg)`, 'important');
                }

                setTimeout(() => {
                    clearInlineStyles(card);
                    clearInlineStyles(leftBtn);
                    clearInlineStyles(rightBtn);
                    container.classList.remove('is-flipping');
                    card.classList.remove('hardware-accelerated');
                }, 500);
            }
            swipeStartX = 0;
        });

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
            const activeId = getActiveCardId();
            if (activeId && activeId !== 'fixed-bottom') {
                resetRoutePreference(activeId).then(() => {
                    console.log(`[DB] 已清除 ${activeId} 的客製化設定，恢復預設值`);
                    
                    // 1. 找出 data.js 中的原始預設值
                    const defaultData = railwayData.find(r => r.id === activeId);
                    if (defaultData) {
                        // 2. 更新當前的全域記憶體資料
                        const currentData = window.appRailwayData.find(r => r.id === activeId);
                        if (currentData) {
                            currentData.name = defaultData.name;
                            currentData.hex = defaultData.hex;
                        }
                        
                        // 3. 即時更新畫面上的三張卡片顏色與標題
                        const customizeCard = document.querySelector('#dynamic-blank-overlay .detail-card-inner');
                        if (customizeCard) applyThemeToCard(customizeCard, defaultData.hex);

                        const detailCard = document.querySelector('#detail-card-container .detail-card-inner');
                        if (detailCard) {
                            applyThemeToCard(detailCard, defaultData.hex);
                            const detailNameNode = detailCard.querySelector('.line-name');
                            if (detailNameNode) detailNameNode.textContent = defaultData.name;
                        }

                        const mainCard = document.getElementById(`card-${activeId}`);
                        if (mainCard) {
                            applyThemeToCard(mainCard, defaultData.hex);
                            const mainNameNode = mainCard.querySelector('.line-name');
                            if (mainNameNode) mainNameNode.textContent = defaultData.name;
                        }

                        // 4. 更新準備降落的文字框內容
                        if (nameEls.display) nameEls.display.textContent = defaultData.name;
                        if (colorEls.display) colorEls.display.textContent = defaultData.hex.toUpperCase();
                    }
                });
            }
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
                    els.sharedStatus.style.transform = '';
                    els.sharedStatus.style.opacity = '';
                }
                if (els.display) {
                    els.display.style.transition = '';
                    els.display.style.transform = '';
                }
            });

            window.pSyncing = false;
        }, 2500);
    };
}

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

    const offset = getOffset(els.container, wrapper);
    ghost.style.top = offset.top + 'px';
    ghost.style.left = (offset.left + 16) + 'px';
    ghost.style.width = (els.container.offsetWidth - 32) + 'px';
    
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
            if (els.sharedText) els.sharedText.textContent = '已複製';

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
                    errorMsg = '格式錯誤';
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
            handleResult('已貼上', 'success', finalVal);
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
        
        handleResult('未同意權限', 'error');
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