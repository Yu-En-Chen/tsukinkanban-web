// personalization.js - 個性化設定 (Customize) 專用彈窗引擎

export function initPersonalization(applyThemeToCard, getActiveCardId) {
    // 🔧 【箭頭 SVG 旋轉角度設定】
    window.DISMISS_ICON_TARGET_ROTATION = 90;

    window.openBlankOverlay = function (hexColor) {
        if (document.getElementById('dynamic-blank-overlay') || window.isFlipAnimating) return;
        window.isFlipAnimating = true;

        const activeId = getActiveCardId(); // 🟢 取得當下展開的卡片 ID

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

        // 🟢 取得當前打開卡片的名稱與顏色 (用以動態顯示於按鈕)
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

        // 🟢 注入左上角標題、分層文字說明與包含 SVG 的網格
        card.innerHTML = `
<div class="card-header" style="padding-bottom: 5px; margin-bottom: 15px;">
    <span class="line-name">カスタマイズ</span>
</div>

<div class="card-content">
    <style>
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
        
        <button id="p-btn-label" class="info-tag-item interactive-btn" onclick="window.toggleEditMode('name')" style="
            cursor: pointer; height: var(--btn-height); padding: 0 16px; border-radius: 100px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; white-space: nowrap; flex-shrink: 0; max-width: 120px; overflow: hidden; transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), padding 0.4s var(--apple-spring), margin 0.4s var(--apple-spring);">
            <span style="white-space: nowrap;">表示名</span>
        </button>

        <div id="p-btn-input-container" class="info-tag-item interactive-btn" onclick="window.toggleEditMode('name')" style="
            cursor: pointer; height: var(--btn-height); border-radius: 100px; display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden; flex-grow: 1; position: relative; padding: 0 16px; transition: all 0.4s var(--apple-spring);">
            
            <span id="p-display-name" style="transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem; font-family: inherit; font-weight: inherit; transform: translateX(0px);">${targetName}</span>

            <span id="p-shared-status" style="position: absolute; left: 16px; right: 16px; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-family: inherit; font-weight: inherit; opacity: 0; pointer-events: none; transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); transform: translateX(0px);">
                <span id="p-shared-status-text" style="display:inline-block;"></span>
            </span>

            <input id="p-real-input" type="text" placeholder="${targetName}" maxlength="10" enterkeyhint="done" oninput="window.updateCharCount(this.value)" onkeydown="window.handleInputEnter(event, 'name')" style="
                position: absolute; left: 16px; right: 16px; top: 0; bottom: 0; margin: 0; padding: 0; height: 100%; background: transparent; border: none; color: inherit; font-family: inherit; font-weight: inherit; font-size: 0.95rem; text-align: center; outline: none; opacity: 0; pointer-events: none; transition: opacity 0.3s ease, transform 0.4s var(--apple-spring); transform: translateY(15px);">
        </div>

        <button id="p-btn-circle-1" class="info-tag-item interactive-btn" onclick="window.handleCopyAction(event, 'name')" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: all 0.4s var(--apple-spring);">
            <span id="p-icon-clipboard" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 21.1px; height: 20.7px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>
            </span>
            <span id="p-icon-check" style="position: absolute; top: 50%; left: 50%; transform: translate(calc(-50% - 40px), -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
            <svg id="p-icon-x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-250%, -50%); transition: transform 0.4s var(--apple-spring); opacity: 0.8; width: 22px; height: 22px; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <button id="p-btn-circle-2" class="info-tag-item interactive-btn" onclick="window.handlePasteAction(event, 'name')" style="
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
        
        <button id="p-btn-color-label" class="info-tag-item interactive-btn" onclick="window.toggleEditMode('color')" style="
            cursor: pointer; height: var(--btn-height); padding: 0 16px; border-radius: 100px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; white-space: nowrap; flex-shrink: 0; max-width: 120px; overflow: hidden; transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), padding 0.4s var(--apple-spring), margin 0.4s var(--apple-spring);">
            <span style="white-space: nowrap;">カラー</span>
        </button>

        <div id="p-btn-color-input-container" class="info-tag-item interactive-btn" onclick="window.toggleEditMode('color')" style="
            cursor: pointer; height: var(--btn-height); border-radius: 100px; display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden; flex-grow: 1; position: relative; padding: 0 16px; transition: all 0.4s var(--apple-spring);">
            
            <span id="p-display-color" style="transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem; font-family: monospace; font-weight: inherit; transform: translateX(0px);">${targetHex.toUpperCase()}</span>

            <span id="p-color-shared-status" style="position: absolute; left: 16px; right: 16px; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; font-family: inherit; font-weight: inherit; opacity: 0; pointer-events: none; transition: opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); transform: translateX(0px);">
                <span id="p-color-shared-status-text" style="display:inline-block;"></span>
            </span>

            <input id="p-color-real-input" type="text" placeholder="${targetHex.toUpperCase()}" maxlength="7" enterkeyhint="done" onkeydown="window.handleInputEnter(event, 'color')" style="
                position: absolute; left: 16px; right: 16px; top: 0; bottom: 0; margin: 0; padding: 0; height: 100%; background: transparent; border: none; color: inherit; font-family: monospace; font-weight: inherit; font-size: 0.95rem; text-align: center; outline: none; opacity: 0; pointer-events: none; transition: opacity 0.3s ease, transform 0.4s var(--apple-spring); transform: translateY(15px);">
        </div>

        <button id="p-btn-color-circle-1" class="info-tag-item interactive-btn" onclick="window.handleCopyAction(event, 'color')" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0; transition: all 0.4s var(--apple-spring);">
            <span id="p-color-icon-clipboard" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 21.1px; height: 20.7px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>
            </span>
            <span id="p-color-icon-check" style="position: absolute; top: 50%; left: 50%; transform: translate(calc(-50% - 40px), -50%); transition: transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1); display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; width: 100%; height: 100%; stroke-width: 2px;"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>
            </span>
            <svg id="p-color-icon-x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-250%, -50%); transition: transform 0.4s var(--apple-spring); opacity: 0.8; width: 22px; height: 22px; stroke-width: 2.5px;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <button id="p-btn-color-circle-2" class="info-tag-item interactive-btn" onclick="window.handlePasteAction(event, 'color')" style="
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
</div>
`;

        container.appendChild(card);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
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
// 🟢 輸入框絲滑變形動畫引擎 (0.4s Apple Spring + 邊緣物理遮罩)
// =========================================================

// 🟢 全域防捲動攔截器 (只允許在輸入框內操作，其他滑動一律禁止)
window._pLockScroll = function (e) {
    if (e.target.id !== 'p-real-input') {
        e.preventDefault();
    }
};

window.toggleEditNameMode = function () {
    const row = document.getElementById('p-edit-row');
    if (!row || row.dataset.editing === 'true') return;
    row.dataset.editing = 'true'; // 上鎖

    const label = document.getElementById('p-btn-label');
    const circle2 = document.getElementById('p-btn-circle-2');
    const displayName = document.getElementById('p-display-name');
    const realInput = document.getElementById('p-real-input');
    const iconClip = document.getElementById('p-icon-clipboard');
    const iconX = document.getElementById('p-icon-x');
    const charCount = document.getElementById('p-char-count');

    // 1. 向左推擠「表示名」
    // 💡 拔除 opacity: 0，讓按鈕維持實體，完全依靠外層的 mask-image 邊緣淡化防穿幫
    label.style.maxWidth = '0px';
    label.style.padding = '0px';
    label.style.marginRight = '-8px'; // 抵銷 gap
    label.style.transform = 'translateX(-30px)';

    // 2. 向右推擠「圓形按鈕 2」
    // 💡 拔除 opacity: 0，靠右側邊緣遮罩吃掉
    circle2.style.maxWidth = '0px';
    circle2.style.padding = '0px';
    circle2.style.marginLeft = '-8px'; // 抵銷 gap
    circle2.style.transform = 'translateX(30px)';

    // 3. 輸入框浮現 (打開時強制清空，並顯示 Placeholder)
    displayName.style.transition = 'none'; // 🟢 拔除 CSS 過渡，強制瞬間執行
    displayName.style.opacity = '0';
    displayName.style.transform = 'translateY(0)';

    realInput.value = ''; // 🟢 每次打開都是全空的
    window.updateCharCount(''); // 重置字數顯示為 0/10

    realInput.style.opacity = '1';
    realInput.style.pointerEvents = 'auto';
    realInput.style.transform = 'translateY(0)';
    realInput.focus(); // 自動聚焦彈出鍵盤

    // 🟢 終極畫面鎖定 (解決 iOS 鍵盤無視 overflow 的問題)
    // 1. 記錄當下捲動高度
    window._pScrollY = window.scrollY;

    // 2. 鎖死 Body 位置與尺寸
    document.body.style.setProperty('position', 'fixed', 'important');
    document.body.style.setProperty('top', `-${window._pScrollY}px`, 'important');
    document.body.style.setProperty('width', '100%', 'important');

    // 3. 關閉橡皮筋邊緣回彈與滾動鏈
    document.body.style.setProperty('overscroll-behavior', 'none', 'important');
    document.documentElement.style.setProperty('overscroll-behavior', 'none', 'important');

    // 4. 原有的攔截與隱藏
    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.addEventListener('touchmove', window._pLockScroll, { passive: false });

    // 🟢 字數統計浮現
    if (charCount) charCount.style.opacity = '0.8';

    // 4. SVG 「向右不淡化」實體切換 (總行程的一半 = 0.2s 時觸發)
    setTimeout(() => {
        if (row.dataset.editing !== 'true') return;
        iconClip.style.transform = 'translate(150%, -50%)'; // 原本的向右滑出
        iconX.style.transform = 'translate(-50%, -50%)';    // X 從左側補位
    }, 200);
};

window.closeEditNameMode = function (e) {
    e.stopPropagation(); // 防止點擊穿透
    const row = document.getElementById('p-edit-row');
    if (!row || row.dataset.editing !== 'true') return;
    row.dataset.editing = 'false'; // 解鎖

    const label = document.getElementById('p-btn-label');
    const circle2 = document.getElementById('p-btn-circle-2');
    const displayName = document.getElementById('p-display-name');
    const realInput = document.getElementById('p-real-input');
    const iconClip = document.getElementById('p-icon-clipboard');
    const iconX = document.getElementById('p-icon-x');
    const charCount = document.getElementById('p-char-count');

    // 1. 原路恢復「表示名」
    label.style.maxWidth = '120px';
    label.style.padding = '0 16px';
    label.style.marginRight = '0px';
    label.style.transform = 'translateX(0px)';

    // 2. 原路恢復「圓形按鈕 2」
    circle2.style.maxWidth = 'var(--btn-height)';
    circle2.style.padding = '0px';
    circle2.style.marginLeft = '0px';
    circle2.style.transform = 'translateX(0px)';

    // 🟢 判斷輸入內容：如果有打字就更新，沒打字就維持原樣
    const finalVal = realInput.value.trim();
    if (finalVal !== '') {
        displayName.textContent = finalVal;
    }

    // 3. 輸入框原路收回
    displayName.style.opacity = '1';
    displayName.style.transform = 'translateX(-10px)';

    realInput.style.opacity = '0';
    realInput.style.pointerEvents = 'none';
    realInput.style.transform = 'translateX(-10px)';
    realInput.blur(); // 收起鍵盤

    // 🟢 解除所有鎖定並恢復原狀
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('overscroll-behavior');
    document.documentElement.style.removeProperty('overscroll-behavior');
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
    document.removeEventListener('touchmove', window._pLockScroll);

    // 恢復解除鎖定前的捲動高度
    if (window._pScrollY !== undefined) {
        window.scrollTo(0, window._pScrollY);
    }

    // 🟢 字數統計淡出隱藏
    if (charCount) charCount.style.opacity = '0';

    // 4. SVG 原路切換回歸
    setTimeout(() => {
        if (row.dataset.editing === 'true') return;
        iconClip.style.transform = 'translate(-50%, -50%)'; // 回歸置中
        iconX.style.transform = 'translate(-250%, -50%)';   // 往左退回待命
    }, 200);
};

// 🟢 綁定在 Input 上的即時字數更新器
window.updateCharCount = function (val) {
    const countElement = document.getElementById('p-char-count');
    if (countElement) {
        countElement.textContent = val.length + '/10';
    }
};

// 🟢 鍵盤「完成/Enter」鍵的條件攔截器
window.handleInputEnter = function (e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();

        if (e.isComposing) return;

        const val = e.target.value.trim();
        const len = val.length;

        // 🟢 超過 10 個字：拒絕執行 (鎖定鍵盤)
        if (len > 10) {
            return;
        }

        // 🟢 0 個字 或 1~10 個字：皆執行關閉
        // (若為 0 字，closeEditNameMode 內建邏輯會自動忽略修改，達成「單純關閉」的效果)
        window.closeEditNameMode(e);

        // 🟢 解除所有鎖定並恢復原狀
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('top');
        document.body.style.removeProperty('width');
        document.body.style.removeProperty('overscroll-behavior');
        document.documentElement.style.removeProperty('overscroll-behavior');
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
        document.removeEventListener('touchmove', window._pLockScroll);

        // 恢復解除鎖定前的捲動高度
        if (window._pScrollY !== undefined) {
            window.scrollTo(0, window._pScrollY);
        }
    }
};

// =========================================================
// 🟢 統一互動引擎 (DRY 架構：共用表示名與 HEX 顏色的邏輯)
// =========================================================

// 狀態管理物件
const pState = {
    name: { isCopying: false, isPasting: false },
    color: { isCopying: false, isPasting: false }
};

// 元素選取映射器
const getElements = (type) => {
    const isColor = type === 'color';
    return {
        row: document.getElementById(isColor ? 'p-color-edit-row' : 'p-edit-row'),
        label: document.getElementById(isColor ? 'p-btn-color-label' : 'p-btn-label'),
        circle2: document.getElementById(isColor ? 'p-btn-color-circle-2' : 'p-btn-circle-2'),
        display: document.getElementById(isColor ? 'p-display-color' : 'p-display-name'),
        input: document.getElementById(isColor ? 'p-color-real-input' : 'p-real-input'),
        clip: document.getElementById(isColor ? 'p-color-icon-clipboard' : 'p-icon-clipboard'),
        check: document.getElementById(isColor ? 'p-color-icon-check' : 'p-icon-check'),
        x: document.getElementById(isColor ? 'p-color-icon-x' : 'p-icon-x'),
        pasteDef: document.getElementById(isColor ? 'p-color-icon-paste-default' : 'p-icon-paste-default'),
        pasteLoader: document.getElementById(isColor ? 'p-color-icon-paste-loader' : 'p-icon-paste-loader'),
        pasteError: document.getElementById(isColor ? 'p-color-icon-paste-error' : 'p-icon-paste-error'),
        pasteCheck: document.getElementById(isColor ? 'p-color-icon-paste-check' : 'p-icon-paste-check'),
        sharedStatus: document.getElementById(isColor ? 'p-color-shared-status' : 'p-shared-status'),
        sharedText: document.getElementById(isColor ? 'p-color-shared-status-text' : 'p-shared-status-text'),
        maxLength: isColor ? 7 : 10
    };
};

window.updateCharCount = function (val) {
    const countElement = document.getElementById('p-char-count');
    if (countElement) countElement.textContent = val.length + '/10';
};

window._pLockScroll = function (e) {
    if (e.target.tagName !== 'INPUT') e.preventDefault();
};

// 🟢 統一開啟編輯模式
window.toggleEditMode = function (type) {
    const otherType = type === 'name' ? 'color' : 'name';
    const otherEls = getElements(otherType);
    if (otherEls.row && otherEls.row.dataset.editing === 'true') {
        window.closeEditMode(otherType);
    }

    const els = getElements(type);
    if (!els.row || els.row.dataset.editing === 'true') return;
    
    els.row.dataset.editing = 'true';
    pState[type].isCopying = true; 

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
    els.display.style.transform = 'translateY(0)';

    els.input.value = '';
    if (type === 'name') window.updateCharCount('');

    els.input.style.opacity = '1';
    els.input.style.pointerEvents = 'auto';
    els.input.style.transform = 'translateY(0)';
    els.input.focus();

    window._pScrollY = window.scrollY;
    document.body.style.setProperty('position', 'fixed', 'important');
    document.body.style.setProperty('top', `-${window._pScrollY}px`, 'important');
    document.body.style.setProperty('width', '100%', 'important');
    document.body.style.setProperty('overscroll-behavior', 'none', 'important');
    document.documentElement.style.setProperty('overscroll-behavior', 'none', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.addEventListener('touchmove', window._pLockScroll, { passive: false });

    setTimeout(() => {
        if (els.row.dataset.editing !== 'true') return;
        els.clip.style.transform = 'translate(150%, -50%)';
        els.x.style.transform = 'translate(-50%, -50%)';
    }, 200);
};

// 🟢 統一關閉編輯模式
window.closeEditMode = function (type, e) {
    if (e) e.stopPropagation();
    const els = getElements(type);
    if (!els.row || els.row.dataset.editing !== 'true') return;
    
    els.row.dataset.editing = 'false';

    els.label.style.maxWidth = '120px';
    els.label.style.padding = '0 16px';
    els.label.style.marginRight = '0px';
    els.label.style.transform = 'translateX(0px)';

    els.circle2.style.maxWidth = 'var(--btn-height)';
    els.circle2.style.padding = '0px';
    els.circle2.style.marginLeft = '0px';
    els.circle2.style.transform = 'translateX(0px)';

    const finalVal = els.input.value.trim();
    if (finalVal !== '') {
        els.display.textContent = type === 'color' ? finalVal.toUpperCase() : finalVal;
    }

    els.display.style.transition = '';
    els.display.style.opacity = '1';
    els.display.style.transform = 'translateX(-10px)';

    els.input.style.opacity = '0';
    els.input.style.pointerEvents = 'none';
    els.input.style.transform = 'translateX(-10px)';
    els.input.blur();

    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('overscroll-behavior');
    document.documentElement.style.removeProperty('overscroll-behavior');
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
    document.removeEventListener('touchmove', window._pLockScroll);

    if (window._pScrollY !== undefined) window.scrollTo(0, window._pScrollY);

    if (type === 'name') {
        const charCount = document.getElementById('p-char-count');
        if (charCount) charCount.style.opacity = '0';
    }

    setTimeout(() => {
        if (els.row.dataset.editing === 'true') return;
        els.clip.style.transform = 'translate(-50%, -50%)';
        els.x.style.transform = 'translate(-250%, -50%)';
    }, 200);

    setTimeout(() => { pState[type].isCopying = false; }, 500);
};

// 🟢 統一輸入驗證攔截
window.handleInputEnter = function (e, type) {
    if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        if (e.isComposing) return;
        const val = e.target.value.trim();
        const els = getElements(type);
        if (val.length > els.maxLength) return;
        window.closeEditMode(type, e);
    }
};

// 🟢 統一複製動作
window.handleCopyAction = function(e, type) {
    const els = getElements(type);
    if (els.row && els.row.dataset.editing === 'true') {
        window.closeEditMode(type, e);
        return;
    }
    if (pState[type].isCopying || pState[type].isPasting) return;

    const textToCopy = els.display ? els.display.textContent : "";

    if (textToCopy) {
        pState[type].isCopying = true; 
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            if (els.sharedStatus) {
                els.sharedStatus.style.transition = 'none';
                els.sharedStatus.style.transform = 'translateX(40px)';
                void els.sharedStatus.offsetWidth; 
                els.sharedStatus.style.transition = 'opacity 0.3s linear, transform 0.5s cubic-bezier(0.34, 1.6, 0.64, 1)';
            }
            if (els.sharedText) els.sharedText.textContent = '已複製';

            if (els.clip) els.clip.style.transform = 'translate(calc(-50% + 40px), -50%)';
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
                if (els.check) els.check.style.transform = 'translate(calc(-50% - 40px), -50%)';
                
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
        }).catch(err => {
            console.error('複製失敗:', err);
            pState[type].isCopying = false; 
        });
    }
};

// 🟢 統一貼上動作
window.handlePasteAction = function(e, type) {
    if (e) e.stopPropagation();
    
    const els = getElements(type);
    if (els.row && els.row.dataset.editing === 'true') return; 
    if (pState[type].isCopying || pState[type].isPasting) return;

    pState[type].isPasting = true;
    
    const errorSvg = els.pasteError ? els.pasteError.querySelector('svg') : null;

    if (els.sharedText) els.sharedText.classList.remove('p-shake-active');
    if (errorSvg) errorSvg.classList.remove('p-shake-active');

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
        if (!val) {
            handleResult('剪貼簿無內容', 'error');
        } else {
            handleResult('已貼上', 'success', val);
        }
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
                if (els.input) els.input.value = finalVal;
                if (type === 'name') window.updateCharCount(finalVal);
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