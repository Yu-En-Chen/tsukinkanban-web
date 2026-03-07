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
    <div id="p-edit-row" style="
        --btn-height: 44px; 
        display: flex; gap: 8px; margin-bottom: 12px; position: relative;
        
        /* 🟢 魔法機制：把容器左右各拉長 15px，再用 padding 把按鈕推回原本視覺上的位置 */
        width: calc(100% + 30px); 
        margin-left: -15px; 
        padding: 0 15px;
        
        /* 🟢 這樣遮罩的透明漸層 (0~15px) 就會完美落在空白的 padding 上，平時絕對不吃按鈕！ */
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 15px, black calc(100% - 15px), transparent 100%);
        mask-image: linear-gradient(to right, transparent 0%, black 15px, black calc(100% - 15px), transparent 100%);
    ">
        
        <button id="p-btn-label" class="info-tag-item interactive-btn" style="
            cursor: pointer; height: var(--btn-height); padding: 0 16px; border-radius: 100px;
            font-size: 0.95rem; display: flex; align-items: center; justify-content: center;
            white-space: nowrap; flex-shrink: 0; max-width: 120px; overflow: hidden;
            transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), padding 0.4s var(--apple-spring), margin 0.4s var(--apple-spring);
        ">
            <span style="white-space: nowrap;">表示名</span>
        </button>

        <div id="p-btn-input-container" class="info-tag-item interactive-btn" style="
            cursor: pointer; height: var(--btn-height); border-radius: 100px;
            font-size: 0.95rem; display: flex; align-items: center; justify-content: flex-start;
            white-space: nowrap; overflow: hidden; flex-grow: 1; position: relative; padding: 0 16px;
            transition: all 0.4s var(--apple-spring);
        " onclick="window.toggleEditNameMode()">
            
            <span id="p-display-name" style="
                transition: opacity 0.3s ease, transform 0.4s var(--apple-spring);
                width: 100%; text-align: left; overflow: hidden; text-overflow: ellipsis;
            ">${targetName}</span>

            <input id="p-real-input" type="text" placeholder="${targetName}" maxlength="10" oninput="window.updateCharCount(this.value)" style="
                position: absolute; left: 16px; right: 16px; top: 0; bottom: 0;
                background: transparent; border: none; color: inherit; font-family: inherit;
                font-size: 0.95rem; outline: none; opacity: 0; pointer-events: none;
                transition: opacity 0.3s ease, transform 0.4s var(--apple-spring);
                transform: translateY(15px);
            ">
        </div>

        <button id="p-btn-circle-1" class="info-tag-item interactive-btn" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0;
            border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0;
            transition: all 0.4s var(--apple-spring);
        " onclick="window.closeEditNameMode(event)">
            
            <svg id="p-icon-clipboard" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" 
                 style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); transition: transform 0.4s var(--apple-spring); opacity: 0.8; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/>
            </svg>
            
            <svg id="p-icon-x" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" 
                 style="position: absolute; top: 50%; left: 50%; transform: translate(-250%, -50%); transition: transform 0.4s var(--apple-spring); opacity: 0.8; width: 22px; height: 22px; stroke-width: 2.5px;">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
        </button>

        <button id="p-btn-circle-2" class="info-tag-item interactive-btn" style="
            cursor: pointer; height: var(--btn-height); width: var(--btn-height); padding: 0;
            border-radius: 50%; position: relative; overflow: hidden; display: block; flex-shrink: 0;
            transition: transform 0.4s var(--apple-spring), max-width 0.4s var(--apple-spring), margin 0.4s var(--apple-spring), padding 0.4s var(--apple-spring);
            max-width: var(--btn-height);
        ">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" 
                 style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.8; width: 20px; height: 20px; stroke-width: 2px;">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>
            </svg>
        </button>
    </div>
    
    <p class="description" style="font-size: clamp(0.85rem, 3vw, 0.95rem); margin-bottom: 12px; display: flex; justify-content: space-between; padding: 0 4px;">
        <span>　- 十文字以內 -</span>
        <span id="p-char-count" style="opacity: 0; transition: opacity 0.4s var(--apple-spring); font-family: monospace; font-size: 0.9em; margin-right: 4px;">0/10</span>
    </p>
    
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
    window.toggleEditNameMode = function() {
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
        displayName.style.opacity = '0';
        displayName.style.transform = 'translateY(-15px)';

        realInput.value = ''; // 🟢 每次打開都是全空的
        window.updateCharCount(''); // 重置字數顯示為 0/10
        
        realInput.style.opacity = '1';
        realInput.style.pointerEvents = 'auto';
        realInput.style.transform = 'translateY(0)';
        realInput.focus(); // 自動聚焦彈出鍵盤

        // 🟢 字數統計浮現
        if(charCount) charCount.style.opacity = '0.8';

        // 4. SVG 「向右不淡化」實體切換 (總行程的一半 = 0.2s 時觸發)
        setTimeout(() => {
            if (row.dataset.editing !== 'true') return;
            iconClip.style.transform = 'translate(150%, -50%)'; // 原本的向右滑出
            iconX.style.transform = 'translate(-50%, -50%)';    // X 從左側補位
        }, 200);
    };

    window.closeEditNameMode = function(e) {
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
        if(finalVal !== '') {
            displayName.textContent = finalVal;
        }

        // 3. 輸入框原路收回
        displayName.style.opacity = '1';
        displayName.style.transform = 'translateY(0)';

        realInput.style.opacity = '0';
        realInput.style.pointerEvents = 'none';
        realInput.style.transform = 'translateY(15px)';
        realInput.blur(); // 收起鍵盤

        // 🟢 字數統計淡出隱藏
        if(charCount) charCount.style.opacity = '0';

        // 4. SVG 原路切換回歸
        setTimeout(() => {
            if (row.dataset.editing === 'true') return;
            iconClip.style.transform = 'translate(-50%, -50%)'; // 回歸置中
            iconX.style.transform = 'translate(-250%, -50%)';   // 往左退回待命
        }, 200);
    };

    // 🟢 綁定在 Input 上的即時字數更新器
    window.updateCharCount = function(val) {
        const countElement = document.getElementById('p-char-count');
        if(countElement) {
            countElement.textContent = val.length + '/10';
        }
    };