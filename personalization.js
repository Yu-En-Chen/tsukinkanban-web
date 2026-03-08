// personalization.js - 個性化設定 (Customize) 專用彈窗引擎

// =========================================================
// 🟢 網頁級別最優先寫死的系統導航防護 (全域封鎖)
// =========================================================
(function injectGlobalNavigationBlocker() {
    if (window._pGlobalNavBlockerActive) return;
    window._pGlobalNavBlockerActive = true;

    // 1. 絕對封鎖邊緣右滑 (iOS 返回手勢) - 使用 capture 搶奪最高優先級
    const blockEdgeSwipe = (e) => {
        if (e.touches && e.touches.length > 0 && e.touches[0].clientX < 30) {
            e.preventDefault();
            e.stopPropagation();
        }
    };
    window.addEventListener('touchstart', blockEdgeSwipe, { passive: false, capture: true });
    window.addEventListener('touchmove', blockEdgeSwipe, { passive: false, capture: true });

    // 2. 歷史紀錄陷阱 (封鎖 Android 實體返回與瀏覽器上一頁)
    try {
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', function (e) {
            history.pushState(null, null, location.href);
            // 若面板開著，按實體返回鍵等同於「關閉面板」
            if (document.getElementById('dynamic-blank-overlay') && typeof window.closeBlankOverlay === 'function') {
                window.closeBlankOverlay();
            }
        }, { capture: true });
    } catch(err) {}

    // 3. 全域頁面彈性封鎖 (Overscroll) - 保證永不橡皮筋
    const applyOverscroll = () => {
        document.documentElement.style.setProperty('overscroll-behavior', 'none', 'important');
        document.body.style.setProperty('overscroll-behavior', 'none', 'important');
    };
    applyOverscroll();
    window.addEventListener('DOMContentLoaded', applyOverscroll);
})();

export function initPersonalization(applyThemeToCard, getActiveCardId) {
    window.DISMISS_ICON_TARGET_ROTATION = 90;

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
        /* 幽靈輸入框獨佔選取權 */
        #p-ghost-input {
            -webkit-touch-callout: default;
            -webkit-user-select: text;
            user-select: text;
        }
        /* 🟢 動畫冷卻期間的微互動效果 (敷衍狂點專用) */
        .p-bump-active {
            transform: scale(0.92) !important;
            opacity: 0.8 !important;
            transition: transform 0.15s cubic-bezier(0.34, 1.6, 0.64, 1), opacity 0.15s ease !important;
        }

        @keyframes p-spin-ease {
            0% { transform: rotate(0deg); animation-timing-function: ease-in-out; }
            100% { transform: rotate(360deg); }
        }
        @keyframes p-shake-anim {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-4px); }
            40% { transform: translateX(4px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
        }
        .p-spin { animation: p-spin-ease 1.2s infinite; }
        .p-shake-active { animation: p-shake-anim 0.4s cubic-bezier(.36,.07,.19,.97) both; }
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
            
            <span id="p-display-name" style="transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem; font-family: inherit; font-weight: inherit; transform: translateX(0px);">${targetName}</span>

            <span id="p-shared-status" style="position: absolute; left: 16px; right: 16px; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-family: inherit; font-weight: inherit; opacity: 0; pointer-events: none; transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); transform: translateX(0px);">
                <span id="p-shared-status-text" style="display:inline-block;"></span>
            </span>
            </div>

        <button id="p-btn-circle-1" class="info-tag-item interactive-btn" onclick="window.handleCopyAction(event, 'name', this)" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: transform 0.4s var(--apple-spring), box-shadow 0.4s var(--apple-spring);">
            <span id="p-icon-clipboard" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 21.1px; height: 20.7px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>
            </span>
            <span id="p-icon-check" style="position: absolute; top: 50%; left: 50%; transform: translate(calc(-50% + 40px), -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
            <svg id="p-icon-x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-250%, -50%); transition: transform 0.4s var(--apple-spring); opacity: 0.8; width: 22px; height: 22px; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <button id="p-btn-circle-2" class="info-tag-item interactive-btn" onclick="window.handlePasteAction(event, 'name', this)" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), margin 0.4s var(--apple-spring), padding 0.4s var(--apple-spring); max-width: var(--btn-height);">
            <span id="p-icon-paste-default" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
            </span>
            <span id="p-icon-paste-loader" style="position: absolute; top: 50%; left: 50%; transform: translate(calc(-50% - 40px), -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg class="p-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </span>
            <span id="p-icon-paste-error" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, calc(-50% - 40px)); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </span>
            <span id="p-icon-paste-check" style="position: absolute; top: 50%; left: 50%; transform: translate(calc(-50% - 40px), -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
        </button>
    </div>
    
    <p class="description" style="font-size: clamp(0.85rem, 3vw, 0.95rem); margin-bottom: 12px; display: flex; justify-content: space-between; padding: 0 4px;">
        <span>　- 十文字以內 -</span>
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
            
            <span id="p-display-color" style="transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem; font-family: monospace; font-weight: inherit; transform: translateX(0px);">${targetHex.toUpperCase()}</span>

            <span id="p-color-shared-status" style="position: absolute; left: 16px; right: 16px; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-family: inherit; font-weight: inherit; opacity: 0; pointer-events: none; transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); transform: translateX(0px);">
                <span id="p-color-shared-status-text" style="display:inline-block;"></span>
            </span>
        </div>

        <button id="p-btn-color-circle-1" class="info-tag-item interactive-btn" onclick="window.handleCopyAction(event, 'color', this)" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: transform 0.4s var(--apple-spring), box-shadow 0.4s var(--apple-spring);">
            <span id="p-color-icon-clipboard" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 21.1px; height: 20.7px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>
            </span>
            <span id="p-color-icon-check" style="position: absolute; top: 50%; left: 50%; transform: translate(calc(-50% + 40px), -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
            <svg id="p-color-icon-x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-250%, -50%); transition: transform 0.4s var(--apple-spring); opacity: 0.8; width: 22px; height: 22px; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <button id="p-btn-color-circle-2" class="info-tag-item interactive-btn" onclick="window.handlePasteAction(event, 'color', this)" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), margin 0.4s var(--apple-spring), padding 0.4s var(--apple-spring); max-width: var(--btn-height);">
            <span id="p-color-icon-paste-default" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
            </span>
            <span id="p-color-icon-paste-loader" style="position: absolute; top: 50%; left: 50%; transform: translate(calc(-50% - 40px), -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg class="p-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            </span>
            <span id="p-color-icon-paste-error" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, calc(-50% - 40px)); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </span>
            <span id="p-color-icon-paste-check" style="position: absolute; top: 50%; left: 50%; transform: translate(calc(-50% - 40px), -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
        </button>
    </div>
    
    <p class="description" style="font-size: clamp(0.85rem, 3vw, 0.95rem); margin-bottom: 12px;">　- HEX形式で入力してください -</p>

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
        transition: top 0.3s var(--apple-spring), opacity 0.3s ease;
    ">
</div>
`;

        container.appendChild(card);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (window.pActiveEditType) return; // 編輯中強制封鎖背景點擊
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
            if (e.touches.length > 1 || window.isFlipAnimating) return;
            swipeStartX = e.touches[0].clientX;
            swipeStartY = e.touches[0].clientY;
            isSwiping = false;
            swipeLocked = false;
        }, { passive: true });

        overlay.addEventListener('touchmove', (e) => {
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
                    leftBtn.style.setProperty('transform', `translateX(${-30 * progress}px)`, 'important');
                    rightBtn.style.setProperty('transition', 'none', 'important');
                    rightBtn.style.setProperty('transform', `translateX(${-30 * progress}px)`, 'important');
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
                    leftBtn.style.setProperty('transform', `translateX(0px)`, 'important');
                    rightBtn.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                    rightBtn.style.setProperty('transform', `translateX(0px)`, 'important');
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
        if (window.isFlipAnimating) return;
        window.isFlipAnimating = true;

        if (window.pScrollManager) {
            window.pScrollManager.absoluteLockEndTime = 0;
            window.pScrollManager.unlock(false);
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
}

// =========================================================
// 🟢 幽靈輸入框核心邏輯與高度霸權守護
// =========================================================

const pState = {
    name: { isCopying: false, isPasting: false },
    color: { isCopying: false, isPasting: false }
};

window.pActiveEditType = null; // 當下正被幽靈附身的對象
window.pGlobalAnimating = false; // 0.5s 全域物理冷卻鎖

function triggerBump(el) {
    if (!el) return;
    el.classList.add('p-bump-active');
    setTimeout(() => el.classList.remove('p-bump-active'), 150);
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

window._pLockScroll = function (e) {
    if (e.target.id !== 'p-ghost-input') e.preventDefault();
};

window._pPreventBlur = function(e) {
    if (!window.pActiveEditType) return;
    if (e.target.id === 'p-ghost-input') return;

    // 焦點防護盾：強制攔截操作按鈕的點擊，並主動派發，讓系統焦點永遠出不去
    const btn = e.target.closest('.interactive-btn');
    if (btn) {
        e.preventDefault(); 
        if (e.type === 'touchend' || e.type === 'mousedown') btn.click();
        return;
    }

    // 判斷是否點擊到卡片上方安全區 (放行讓鍵盤自然收起)
    let clientY = 0;
    if (e.touches && e.touches.length > 0) clientY = e.touches[0].clientY;
    else if (e.clientY) clientY = e.clientY;

    const card = document.querySelector('.detail-card-inner');
    if (card && clientY < card.getBoundingClientRect().top) {
        return; 
    }
    
    e.preventDefault();
};

// 🟢 1秒絕對高度管理器 (Absolute Height Lock)
window.pScrollManager = {
    isLocked: false,
    scrollY: 0,
    unlockTimer: null,
    absoluteLockEndTime: 0,

    lock: function(forceDuration = 0) {
        clearTimeout(this.unlockTimer);

        if (forceDuration > 0) {
            this.absoluteLockEndTime = Math.max(this.absoluteLockEndTime, Date.now() + forceDuration);
        }

        if (this.isLocked) return; 
        
        requestAnimationFrame(() => {
            if (!this.isLocked) {
                this.scrollY = window.scrollY; 
                this.isLocked = true;

                document.body.style.setProperty('position', 'fixed', 'important');
                document.body.style.setProperty('top', `-${this.scrollY}px`, 'important');
                document.body.style.setProperty('width', '100%', 'important');
                document.body.style.setProperty('overflow', 'hidden', 'important');
                document.documentElement.style.setProperty('overflow', 'hidden', 'important');
                
                document.addEventListener('touchmove', window._pLockScroll, { passive: false, capture: true });
                document.addEventListener('touchstart', window._pPreventBlur, { passive: false, capture: true });
                document.addEventListener('touchend', window._pPreventBlur, { passive: false, capture: true });
                document.addEventListener('mousedown', window._pPreventBlur, { passive: false, capture: true });
            }
        });
    },
    unlock: function(instant = true) {
        clearTimeout(this.unlockTimer);
        if (!this.isLocked) return; 

        const doUnlock = () => {
            // 如果幽靈還在工作，絕對不解鎖
            if (window.pActiveEditType) return;

            // 🟢 如果還在 1 秒絕對防護期內，強制延後，保證切換時高度 1px 都不跳！
            const remaining = this.absoluteLockEndTime - Date.now();
            if (remaining > 0) {
                this.unlockTimer = setTimeout(doUnlock, remaining);
                return;
            }

            this.isLocked = false;
            document.body.style.removeProperty('position');
            document.body.style.removeProperty('top');
            document.body.style.removeProperty('width');
            document.body.style.removeProperty('overflow');
            document.documentElement.style.removeProperty('overflow');
            
            document.removeEventListener('touchmove', window._pLockScroll, { capture: true });
            document.removeEventListener('touchstart', window._pPreventBlur, { capture: true });
            document.removeEventListener('touchend', window._pPreventBlur, { capture: true });
            document.removeEventListener('mousedown', window._pPreventBlur, { capture: true });

            window.scrollTo(0, this.scrollY); 
        };

        this.unlockTimer = setTimeout(doUnlock, instant ? 50 : 300);
    }
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
    if (!ghost) return;
    if (val.length > 0 && /^[\x00-\x7F]*$/.test(val)) {
        ghost.style.fontFamily = 'monospace';
    } else {
        ghost.style.fontFamily = 'inherit';
    }
};

window.handleGhostInput = function(val) {
    if (!window.pActiveEditType) return;
    if (window.pActiveEditType === 'name') {
        const countElement = document.getElementById('p-char-count');
        if (countElement) countElement.textContent = val.length + '/10';
        window.checkFontFamily(val);
    } else {
        const ghost = document.getElementById('p-ghost-input');
        const upper = val.toUpperCase();
        if (val !== upper && ghost) ghost.value = upper;
    }
};

// 🟢 鍵盤收起強制監視器
window.handleGhostBlur = function(e) {
    setTimeout(() => {
        if (window.pScrollManager.absoluteLockActive) return;
        if (!window.pActiveEditType) return;
        // 若焦點不在幽靈身上，代表鍵盤真被收起了，無條件強制退場！
        if (document.activeElement && document.activeElement.id === 'p-ghost-input') return;
        window.closeGhostEditMode(true);
    }, 50);
};

window.handleGhostKey = function(e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        if (e.isComposing) return;
        const val = e.target.value.trim();
        const max = window.pActiveEditType === 'color' ? 7 : 10;
        if (val.length > max) return;
        window.closeGhostEditMode();
    }
};

window.toggleGhostEditMode = function(type, e, element) {
    // 0.5s 全域物理冷卻鎖
    if (window.pGlobalAnimating) {
        if (element) triggerBump(element);
        return;
    }
    window.pGlobalAnimating = true;
    setTimeout(() => { window.pGlobalAnimating = false; }, 500);

    // 只要有動作，啟動 1 秒鐘絕對高度防護罩
    window.pScrollManager.lock(1000);

    if (window.pActiveEditType === type) return;

    const ghost = document.getElementById('p-ghost-input');
    const wrapper = document.getElementById('p-ghost-wrapper');
    const els = getElements(type);

    // 若從 A 切到 B，先把 A 的殼原路關閉 (不呼叫 blur)
    if (window.pActiveEditType) {
        const oldEls = getElements(window.pActiveEditType);
        oldEls.row.dataset.editing = 'false';
        oldEls.label.style.maxWidth = '120px';
        oldEls.label.style.padding = '0 16px';
        oldEls.label.style.marginRight = '0px';
        oldEls.label.style.transform = 'translateX(0px)';
        oldEls.circle2.style.maxWidth = 'var(--btn-height)';
        oldEls.circle2.style.padding = '0px';
        oldEls.circle2.style.marginLeft = '0px';
        oldEls.circle2.style.transform = 'translateX(0px)';
        
        let finalVal = ghost.value.trim();
        if (finalVal !== '') {
            oldEls.display.textContent = window.pActiveEditType === 'color' ? finalVal.toUpperCase() : finalVal;
        }
        oldEls.display.style.opacity = '1';
        
        setTimeout(() => {
            if (window.pActiveEditType !== oldEls.type) {
                oldEls.clip.style.transform = 'translate(-50%, -50%)';
                oldEls.x.style.transform = 'translate(-250%, -50%)';
            }
        }, 200);
    }

    // 啟動 B 的殼
    window.pActiveEditType = type;
    els.row.dataset.editing = 'true';
    pState[type].isCopying = false;
    pState[type].isPasting = false;

    els.label.style.maxWidth = '0px';
    els.label.style.padding = '0px';
    els.label.style.marginRight = '-8px';
    els.label.style.transform = 'translateX(-30px)';

    els.circle2.style.maxWidth = '0px';
    els.circle2.style.padding = '0px';
    els.circle2.style.marginLeft = '-8px';
    els.circle2.style.transform = 'translateX(30px)';

    els.display.style.transition = 'none';
    els.display.style.opacity = '0';
    
    // 設定並投射幽靈
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
    
    ghost.style.opacity = '1';
    ghost.style.pointerEvents = 'auto';
    
    // 聚焦！鍵盤順滑開啟或保持不動
    ghost.focus();

    setTimeout(() => {
        if (window.pActiveEditType === type) {
            els.clip.style.transform = 'translate(150%, -50%)';
            els.x.style.transform = 'translate(-50%, -50%)';
            if (type === 'name') {
                const countElement = document.getElementById('p-char-count');
                if (countElement) countElement.style.opacity = '0.8';
            }
        }
    }, 200);
};

window.closeGhostEditMode = function(forceImmediate = false, triggerElement = null) {
    if (!window.pActiveEditType) return;

    if (window.pGlobalAnimating && !forceImmediate) {
        if (triggerElement) triggerBump(triggerElement);
        return;
    }

    window.pGlobalAnimating = true;
    setTimeout(() => { window.pGlobalAnimating = false; }, 500);

    const type = window.pActiveEditType;
    const els = getElements(type);
    const ghost = document.getElementById('p-ghost-input');

    window.pActiveEditType = null;
    els.row.dataset.editing = 'false';

    els.label.style.maxWidth = '120px';
    els.label.style.padding = '0 16px';
    els.label.style.marginRight = '0px';
    els.label.style.transform = 'translateX(0px)';

    els.circle2.style.maxWidth = 'var(--btn-height)';
    els.circle2.style.padding = '0px';
    els.circle2.style.marginLeft = '0px';
    els.circle2.style.transform = 'translateX(0px)';

    let finalVal = ghost.value.trim();
    if (finalVal !== '') {
        els.display.textContent = type === 'color' ? finalVal.toUpperCase() : finalVal;
    }

    els.display.style.transition = '';
    els.display.style.opacity = '1';

    ghost.style.opacity = '0';
    ghost.style.pointerEvents = 'none';
    ghost.blur(); // 真正收起鍵盤

    if (!forceImmediate) window.pScrollManager.absoluteLockEndTime = 0;
    window.pScrollManager.unlock(false);

    if (type === 'name') {
        const countElement = document.getElementById('p-char-count');
        if (countElement) countElement.style.opacity = '0';
    }

    setTimeout(() => {
        if (window.pActiveEditType !== type) {
            els.clip.style.transform = 'translate(-50%, -50%)';
            els.x.style.transform = 'translate(-250%, -50%)';
        }
    }, 200);
};

// 🟢 複製與貼上邏輯 (方向完美校準)
window.handleCopyAction = function(e, type, element) {
    if (e) e.stopPropagation();
    if (window.pActiveEditType === type) {
        window.closeGhostEditMode(false, element);
        return;
    }
    if (window.pGlobalAnimating || pState[type].isCopying || pState[type].isPasting) {
        if (element) triggerBump(element);
        return;
    }

    const els = getElements(type);
    const textToCopy = els.display ? els.display.textContent : "";

    if (textToCopy) {
        window.pGlobalAnimating = true;
        setTimeout(() => { window.pGlobalAnimating = false; }, 500);
        pState[type].isCopying = true; 
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            // 複製：向左移動
            if (els.sharedStatus) {
                els.sharedStatus.style.transition = 'none';
                els.sharedStatus.style.transform = 'translateX(40px)';
                void els.sharedStatus.offsetWidth; 
                els.sharedStatus.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
            }
            if (els.sharedText) els.sharedText.textContent = '已複製';

            if (els.clip) els.clip.style.transform = 'translate(calc(-50% - 40px), -50%)';
            if (els.check) els.check.style.transform = 'translate(-50%, -50%)';
            
            if (els.display) {
                els.display.style.transform = 'translateX(-40px)';
                els.display.style.opacity = '0';
            }
            if (els.sharedStatus) {
                els.sharedStatus.style.transform = 'translateX(0px)';
                els.sharedStatus.style.opacity = '1';
            }

            setTimeout(() => {
                if (els.clip) els.clip.style.transform = 'translate(-50%, -50%)';
                if (els.check) els.check.style.transform = 'translate(calc(-50% + 40px), -50%)';
                
                if (els.display) {
                    els.display.style.transform = 'translateX(0px)';
                    els.display.style.opacity = '1';
                }
                if (els.sharedStatus) {
                    els.sharedStatus.style.transform = 'translateX(40px)';
                    els.sharedStatus.style.opacity = '0';
                }
                setTimeout(() => pState[type].isCopying = false, 600);
            }, 1000);
        }).catch(err => { pState[type].isCopying = false; });
    }
};

window.handlePasteAction = function(e, type, element) {
    if (e) e.stopPropagation();
    if (window.pActiveEditType === type) return; 

    if (window.pGlobalAnimating || pState[type].isCopying || pState[type].isPasting) {
        if (element) triggerBump(element);
        return;
    }

    window.pGlobalAnimating = true;
    setTimeout(() => { window.pGlobalAnimating = false; }, 500);
    pState[type].isPasting = true;
    
    const els = getElements(type);
    const errorSvg = els.pasteError ? els.pasteError.querySelector('svg') : null;

    if (els.sharedText) els.sharedText.classList.remove('p-shake-active');
    if (errorSvg) errorSvg.classList.remove('p-shake-active');

    // 貼上：向右移動
    if (els.sharedStatus) {
        els.sharedStatus.style.transition = 'none';
        els.sharedStatus.style.transform = 'translateX(-40px)';
        void els.sharedStatus.offsetWidth; 
        els.sharedStatus.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
    }
    if (els.sharedText) els.sharedText.textContent = "請同意許可";

    if (els.display) {
        els.display.style.transform = 'translateX(40px)';
        els.display.style.opacity = '0';
    }
    if (els.sharedStatus) {
        els.sharedStatus.style.transform = 'translateX(0px)';
        els.sharedStatus.style.opacity = '1';
    }

    if (els.pasteDef) els.pasteDef.style.transform = 'translate(calc(-50% + 40px), -50%)';
    if (els.pasteLoader) els.pasteLoader.style.transform = 'translate(-50%, -50%)';

    navigator.clipboard.readText().then(text => {
        const val = text.trim();
        if (!val) handleResult('剪貼簿無內容', 'error');
        else handleResult('已貼上', 'success', val);
    }).catch(err => {
        handleResult('未同意權限', 'error');
    });

    function handleResult(msg, resType, val) {
        if (els.sharedText) els.sharedText.textContent = msg;

        if (resType === 'error') {
            if (els.pasteLoader) els.pasteLoader.style.transform = 'translate(-50%, calc(-50% + 40px))';
            if (els.pasteError) {
                els.pasteError.style.transition = 'none';
                els.pasteError.style.transform = 'translate(-50%, calc(-50% - 40px))';
                void els.pasteError.offsetWidth;
                els.pasteError.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteError.style.transform = 'translate(-50%, -50%)';
            }
            setTimeout(() => {
                if (els.sharedText) els.sharedText.classList.add('p-shake-active');
                if (errorSvg) errorSvg.classList.add('p-shake-active');
            }, 50);
            setTimeout(() => revert('error'), 800);
        } else {
            if (els.pasteLoader) els.pasteLoader.style.transform = 'translate(calc(-50% + 40px), -50%)';
            if (els.pasteCheck) {
                els.pasteCheck.style.transition = 'none';
                els.pasteCheck.style.transform = 'translate(calc(-50% - 40px), -50%)';
                void els.pasteCheck.offsetWidth;
                els.pasteCheck.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteCheck.style.transform = 'translate(-50%, -50%)';
            }
            if (val) {
                const finalVal = type === 'color' ? val.substring(0, 7).toUpperCase() : val.substring(0, 10); 
                if (els.display) els.display.textContent = finalVal;
            }
            setTimeout(() => revert('success'), 800);
        }
    }

    function revert(resType) {
        if (els.display) {
            els.display.style.transform = 'translateX(0px)';
            els.display.style.opacity = '1';
        }
        if (els.sharedStatus) {
            els.sharedStatus.style.transform = 'translateX(-40px)';
            els.sharedStatus.style.opacity = '0';
        }
        if (resType === 'error') {
            if (els.pasteError) els.pasteError.style.transform = 'translate(-50%, calc(-50% - 40px))';
            if (els.pasteDef) {
                els.pasteDef.style.transition = 'none';
                els.pasteDef.style.transform = 'translate(-50%, calc(-50% + 40px))';
                void els.pasteDef.offsetWidth; 
                els.pasteDef.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteDef.style.transform = 'translate(-50%, -50%)';
            }
        } else {
            if (els.pasteCheck) els.pasteCheck.style.transform = 'translate(calc(-50% + 40px), -50%)';
            if (els.pasteDef) {
                els.pasteDef.style.transition = 'none';
                els.pasteDef.style.transform = 'translate(calc(-50% - 40px), -50%)';
                void els.pasteDef.offsetWidth;
                els.pasteDef.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
                els.pasteDef.style.transform = 'translate(-50%, -50%)';
            }
        }
        setTimeout(() => {
            if (els.sharedText) els.sharedText.classList.remove('p-shake-active');
            if (errorSvg) errorSvg.classList.remove('p-shake-active');
            pState[type].isPasting = false;
        }, 600);
    }
};