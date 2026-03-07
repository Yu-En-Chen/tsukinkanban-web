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
    <div style="--btn-height: 44px; display: grid; grid-template-columns: max-content 1fr var(--btn-height) var(--btn-height); gap: 8px; margin-bottom: 12px;">
        <button class="info-tag-item" style="cursor: pointer; height: var(--btn-height); padding: 0 16px; border-radius: 100px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; white-space: nowrap;">表示名</button>
        <button class="info-tag-item" style="cursor: pointer; height: var(--btn-height); padding: 0 16px; border-radius: 100px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${targetName}</button>

        <button class="info-tag-item" style="cursor: pointer; height: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0.8; visibility: visible; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 22px; height: 22px; stroke-width: 2.5px;">
                <path d="M20 6 9 17l-5-5"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 22px; height: 22px; stroke-width: 2.5px;">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
        </button>

        <button class="info-tag-item" style="cursor: pointer; height: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0.8; visibility: visible; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/>
            </svg>
        </button>
    </div>
    
    <p class="description" style="font-size: clamp(0.85rem, 3vw, 0.95rem); margin-bottom: 12px;">　- 十文字以內 -</p>

    <div style="--btn-height: 44px; display: grid; grid-template-columns: max-content 1fr var(--btn-height) var(--btn-height); gap: 8px; margin-bottom: 12px;">
        <button class="info-tag-item" style="cursor: pointer; height: var(--btn-height); padding: 0 16px; border-radius: 100px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; white-space: nowrap;">カラー</button>
        <button class="info-tag-item" style="cursor: pointer; height: var(--btn-height); padding: 0 16px; border-radius: 100px; font-size: 0.95rem; font-family: monospace; display: flex; align-items: center; justify-content: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${targetHex.toUpperCase()}</button>

        <button class="info-tag-item" style="cursor: pointer; height: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0.8; visibility: visible; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 22px; height: 22px; stroke-width: 2.5px;">
                <path d="M20 6 9 17l-5-5"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 22px; height: 22px; stroke-width: 2.5px;">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
        </button>

        <button class="info-tag-item" style="cursor: pointer; height: var(--btn-height); padding: 0; border-radius: 50%; position: relative; overflow: hidden; display: block;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0.8; visibility: visible; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease; opacity: 0; visibility: hidden; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m15 11-6 6"/><path d="m9 11 6 6"/>
            </svg>
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