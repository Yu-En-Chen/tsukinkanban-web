import * as db from '../data/db.js';

// 全域狀態鎖與計時器（須宣告在所有 function 之外）
let isEditRouteAnimating = false;
let editLockTimer = null;
let editGestureAbortController = null; // 手勢生命週期控制器

export function startRouteEditMode(cardId, currentLineIds) {

    // 1. 動畫進行中時擋下重複點擊
    if (isEditRouteAnimating) {
        console.log('動畫進行中，阻擋重複開啟');
        return;
    }

    // 啟動前先移除殘留的舊監聽器
    if (editGestureAbortController) {
        editGestureAbortController.abort();
    }
    editGestureAbortController = new AbortController();
    const { signal } = editGestureAbortController;

    const innerCard = document.querySelector('#detail-card-container .detail-card-inner');
    const extensionCard = document.querySelector('#detail-card-container .detail-extension-card');
    const scrollWrapper = document.getElementById('card-extension-container');

    if (!innerCard || !extensionCard || !scrollWrapper) return;

    // 2. 上鎖：進場動畫開始
    isEditRouteAnimating = true;

    // 3. 暫停整個區域的點擊，防止連點
    scrollWrapper.style.pointerEvents = 'none';

    // 4. 900ms 後解鎖
    if (editLockTimer) clearTimeout(editLockTimer);
    editLockTimer = setTimeout(() => {
        isEditRouteAnimating = false;
        // 用 removeProperty 還原，避免覆蓋原有的 CSS 設定
        if (scrollWrapper) scrollWrapper.style.removeProperty('pointer-events');
    }, 900);

    // ==========================================
    // 第一階段：過渡動畫（僅使用 GPU 屬性）
    // ==========================================
    const innerRect = innerCard.getBoundingClientRect();
    const moveUpDist = innerRect.height + 16;
    const exactNewHeight = window.innerHeight - innerRect.top;

    const originalScrollHeight = scrollWrapper.style.height;
    // 記錄進入編輯模式前的高度與捲動位置
    const originalScrollTop = scrollWrapper.scrollTop;
    const origClientHeight = scrollWrapper.clientHeight;

    // 效能：只用 transform 等 GPU 屬性，不動 height
    innerCard.style.willChange = 'transform, opacity, -webkit-mask-position';
    innerCard.style.WebkitBackfaceVisibility = 'hidden';
    extensionCard.style.willChange = 'transform';

    const feather = 45;
    // 遮罩漸層使用多節點透明度 (0.15 -> 0.5 -> 0.85)，
    // 消除線性漸層的邊緣斷層 (Mach Bands)
    innerCard.style.WebkitMaskImage = `linear-gradient(to bottom, 
        transparent 0px, 
        transparent 2px, 
        rgba(0,0,0,0.02) 6px,   /* 極慢起步，騙過眼睛 */
        rgba(0,0,0,0.09) 12px, 
        rgba(0,0,0,0.25) 18px, 
        rgba(0,0,0,0.50) 24px,  /* 中點 */
        rgba(0,0,0,0.75) 30px, 
        rgba(0,0,0,0.91) 36px, 
        rgba(0,0,0,0.98) 40px,  /* 極慢收尾 */
        black ${feather}px, 
        black 100%)`;
    innerCard.style.WebkitMaskSize = '100% 3000px';
    innerCard.style.WebkitMaskPosition = `0px -${feather}px`;
    innerCard.style.WebkitMaskRepeat = 'no-repeat';

    // 內部容器高度直接設到位（此時透明，不影響視覺）
    scrollWrapper.style.height = `${exactNewHeight}px`;
    void innerCard.offsetHeight; // 強制 reflow

    const easeBezier = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const duration = '0.85s';

    // ==========================================
    // 內容掉落動畫
    // ==========================================
    let shredderRafId = null;

    const runShredderAnimation = (startY, targetY, durationMs) => {
        if (shredderRafId) cancelAnimationFrame(shredderRafId);

        const startTime = performance.now();
        const easeOutQuint = t => 1 - Math.pow(1 - t, 5);

        const isClosing = targetY === 0;
        const startOpacity = parseFloat(editContainer.style.opacity) || (isClosing ? 1 : 0);
        const targetOpacity = isClosing ? 0 : 1;

        const step = (now) => {
            let progress = (now - startTime) / durationMs;
            if (progress >= 1) progress = 1;

            const currentY = startY + (targetY - startY) * easeOutQuint(progress);

            innerCard.style.transform = `translateY(-${currentY}px)`;
            extensionCard.style.transform = `translateY(-${currentY}px)`;

            const currentMaskPos = `0px ${currentY - feather}px`;
            innerCard.style.setProperty('-webkit-mask-position', currentMaskPos, 'important');
            innerCard.style.setProperty('mask-position', currentMaskPos, 'important');

            // 透明倍率 4.5：
            // 舊內容在掉落前 22% 內完全淡出，避免殘影
            let opacityProgress = isClosing ? (progress * 4.5) : progress;
            if (opacityProgress > 1) opacityProgress = 1;

            const currentOpacity = startOpacity + (targetOpacity - startOpacity) * opacityProgress;
            editContainer.style.opacity = currentOpacity.toString();
            btnContainer.style.opacity = currentOpacity.toString();

            // 2. 位移處理：
            // 僅在關閉 (isClosing) 時讓舊內容隨背景往下掉
            if (isClosing) {
                const dropOffset = moveUpDist - currentY;
                editContainer.style.transform = `translateY(${dropOffset}px)`;
                btnContainer.style.transform = `translateY(${dropOffset}px)`;
            } else {
                // 開啟時清除多餘位移，新內容隨卡片同速上升
                editContainer.style.transform = '';
                btnContainer.style.transform = '';

                // 開啟動畫的收尾淡化：綁定 Y 軸座標，
                // 在行程 60% 處開始淡化
                const fadeStartDistance = targetY * 0.6;
                if (currentY > fadeStartDistance) {
                    // 隨座標接近終點，透明度由 1 降至 0
                    const tailOpacity = 1 - ((currentY - fadeStartDistance) / (targetY - fadeStartDistance));
                    innerCard.style.opacity = Math.max(0, tailOpacity).toString();
                } else {
                    innerCard.style.opacity = '1';
                }
            }

            if (progress < 1) {
                shredderRafId = requestAnimationFrame(step);
            } else {
                shredderRafId = null;
                // 動畫結束後解鎖，恢復點擊
                innerCard.style.pointerEvents = 'auto';
            }
        };
        shredderRafId = requestAnimationFrame(step);
    };

    // ==========================================
    // 頂部膠囊與下方按鈕的同步動畫
    // ==========================================
    const targetIds = ['action-capsule', 'left-menu-btn', 'search-trigger'];

    targetIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.setProperty('pointer-events', 'none', 'important');

            if (id === 'action-capsule') {
                el.querySelectorAll('.capsule-btn-item').forEach(btn => btn.style.setProperty('overflow', 'hidden', 'important'));
            } else {
                el.style.setProperty('overflow', 'hidden', 'important');
            }

            el.querySelectorAll('svg').forEach(svg => svg.style.setProperty('will-change', 'translate, opacity', 'important'));
        }
    });

    // 雙重 requestAnimationFrame 確保初始狀態先被繪製
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            targetIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.querySelectorAll('svg').forEach(svg => {
                        // 時間 (0.85s) 與曲線對齊卡片動畫，
                        // 位移與透明度同步
                        svg.style.setProperty('transition', `translate 0.85s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1)`, 'important');
                        svg.style.setProperty('translate', '0px -48px', 'important');
                        svg.style.setProperty('opacity', '0', 'important');
                    });
                }
            });
        });
    });

    // ==========================================
    // 第二階段：替換為編輯內容
    // ==========================================
    const originalChildren = Array.from(scrollWrapper.children);

    const editContainer = document.createElement('div');
    editContainer.id = 'edit-mode-container';
    editContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; opacity: 0; transition: opacity 0.3s ease; flex-shrink: 0;';

    const dict = window.MasterRouteDictionary || {};
    const cardName = window.appRailwayData?.find(c => c.id === cardId)?.name || 'カスタムカード';

    // 建立雙欄排版（左欄膠囊、右欄刪除鈕）
    editContainer.innerHTML = `
        <div style="padding: 12px 4px 20px 4px; display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 1.6em; font-weight: 800; color: var(--text-main); opacity: 0.8; letter-spacing: 0.5px;">路線を編集</div>
            <div style="font-size: 0.95em; color: var(--text-secondary); font-weight: 600;">${cardName}</div>
        </div>
        <div id="edit-list-wrapper" style="position: relative; display: flex; gap: 12px;">
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; gap: 12px; pointer-events: none; z-index: -1;">
                ${Array(6).fill('<div style="height: 48px; border-radius: 999px; background: transparent;"></div>').join('')}
            </div>
            <div id="capsules-col" style="flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0;"></div>
            <div id="delete-btns-col" style="display: flex; flex-direction: column; gap: 12px; width: 48px; flex-shrink: 0;"></div>
        </div>
    `;

    const capsulesCol = editContainer.querySelector('#capsules-col');
    const deleteBtnsCol = editContainer.querySelector('#delete-btns-col');

    currentLineIds.forEach(lineId => {
        const lineData = dict[lineId];
        if (!lineData) return;

        // 1. 生成膠囊（左欄）
        const capsule = document.createElement('div');
        capsule.className = 'edit-route-item';
        capsule.setAttribute('data-line-id', lineId);

        capsule.style.cssText = `
            display: flex; align-items: center; 
            background: var(--search-bg); /* 關鍵：使用與按鈕相同的背景變數 */
            border: 1px solid var(--border-color); /* 自動切換深淺的邊框 */
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            padding: 0 16px; border-radius: 999px; height: 48px; 
            transition: transform 0.2s, opacity 0.2s, background 0.2s; 
            user-select: none; -webkit-user-select: none;
            box-sizing: border-box;
        `;

        // 只有一條路線時，隱藏拖曳手把並停用點擊
        const isSingle = currentLineIds.length <= 1;
        const handleStyle = isSingle ? 'opacity: 0; pointer-events: none;' : 'opacity: 1; pointer-events: auto;';

        capsule.innerHTML = `
            <div class="drag-handle" style="cursor: grab; padding-right: 12px; color: var(--text-secondary); touch-action: none; display: flex; align-items: center; transition: opacity 0.3s ease; ${handleStyle}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-icon lucide-list"><path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/></svg>
            </div>
            <div style="flex: 1; min-width: 0; pointer-events: none; display: flex; align-items: center;">
                <div style="font-weight: 800; font-size: 1.05em; color: var(--text-main); opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transform: translateY(-0.5px);">${lineData.name}</div>
            </div>
        `;
        capsulesCol.appendChild(capsule);

        // 2. 生成刪除按鈕（右欄）
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-route-btn';
        delBtn.style.cssText = `
            background: var(--search-bg); 
            border: 1px solid var(--border-color); 
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border-radius: 50%; 
            width: 48px; height: 48px; padding: 0; 
            color: #ff453a; 
            cursor: pointer; 
            display: flex; align-items: center; justify-content: center; 
            transition: background 0.2s, transform 0.2s, opacity 0.2s;
            box-sizing: border-box;
        `;
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;

        // 刪除邏輯：依剩餘數量調整介面
        delBtn.onclick = () => {
            const index = Array.from(deleteBtnsCol.children).indexOf(delBtn);
            const targetCapsule = capsulesCol.children[index];

            // 標記刪除中，後續計算才準確
            targetCapsule.classList.add('deleting');

            targetCapsule.style.transform = 'scale(0.95)';
            targetCapsule.style.opacity = '0';
            delBtn.style.transform = 'scale(0.95)';
            delBtn.style.opacity = '0';

            // 只剩一個膠囊時，淡出它的拖曳手把
            const remainingCapsules = Array.from(capsulesCol.children).filter(c => !c.classList.contains('deleting'));
            if (remainingCapsules.length <= 1 && remainingCapsules[0]) {
                const lastHandle = remainingCapsules[0].querySelector('.drag-handle');
                if (lastHandle) {
                    lastHandle.style.opacity = '0';
                    lastHandle.style.pointerEvents = 'none';
                }
            }

            setTimeout(() => {
                targetCapsule.remove();
                delBtn.remove();
            }, 200);
        };
        deleteBtnsCol.appendChild(delBtn);
    });

    const btnContainer = document.createElement('div');
    btnContainer.className = 'flight-action-buttons-container';
    btnContainer.style.cssText = `
        position: sticky; bottom: 0; z-index: 100;
        margin-top: auto; padding-top: 16px;
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
        opacity: 0; transition: opacity 0.4s ease; flex-shrink: 0;
    `;

    const iconCancel = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`;
    const iconSave = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;

    const createBtn = (iconHtml, text, isPrimary, onClick) => {
        const btn = document.createElement('button');
        btn.className = 'flight-action-btn';
        btn.style.color = 'var(--text-main)';
        btn.innerHTML = `${iconHtml}<span style="font-size: 1.1em; letter-spacing: -0.5px; font-weight: 800;">${text}</span>`;
        btn.onclick = (e) => { e.stopPropagation(); onClick(e); };
        return btn;
    };

    const restoreUI = (options = {}) => {
        if (isEditRouteAnimating) return;
        isEditRouteAnimating = true;
        scrollWrapper.style.pointerEvents = 'none';

        const isSeamless = options.isSeamless || false;
        if (!isSeamless && shredderRafId) cancelAnimationFrame(shredderRafId);

        const currentEditTransform = editContainer.style.transform;
        const currentBtnTransform = btnContainer.style.transform;
        editContainer.style.transform = '';
        btnContainer.style.transform = '';

        const editRect = editContainer.getBoundingClientRect();
        const btnRect = btnContainer.getBoundingClientRect();
        const scrollRect = scrollWrapper.getBoundingClientRect();

        const editTop = editRect.top - scrollRect.top + scrollWrapper.scrollTop;
        const btnTop = btnRect.top - scrollRect.top + scrollWrapper.scrollTop;
        const editLeft = editRect.left - scrollRect.left + scrollWrapper.scrollLeft;
        const btnLeft = btnRect.left - scrollRect.left + scrollWrapper.scrollLeft;

        editContainer.style.transition = 'none';
        btnContainer.style.transition = 'none';

        editContainer.style.position = 'absolute';
        editContainer.style.top = `${editTop}px`;
        editContainer.style.left = `${editLeft}px`;
        editContainer.style.width = `${editRect.width}px`;
        editContainer.style.pointerEvents = 'none';
        editContainer.style.transform = currentEditTransform;

        btnContainer.style.position = 'absolute';
        btnContainer.style.top = `${btnTop}px`;
        btnContainer.style.bottom = 'auto';
        btnContainer.style.left = `${btnLeft}px`;
        btnContainer.style.width = `${btnRect.width}px`;
        btnContainer.style.marginTop = '0';
        btnContainer.style.pointerEvents = 'none';
        btnContainer.style.transform = currentBtnTransform;

        // 即時取得當下的 DOM，背景已被替換也能正確命中
        const contentToReveal = Array.from(scrollWrapper.children).filter(child =>
            child.id !== 'edit-mode-container' &&
            child.id !== 'ghost-container' &&
            child !== btnContainer
        );

        contentToReveal.forEach(child => {
            child.style.transition = 'none';
            child.style.opacity = '0';
            child.style.display = '';
        });

        innerCard.style.willChange = 'transform, opacity, -webkit-mask-position';
        innerCard.style.WebkitBackfaceVisibility = 'hidden';
        extensionCard.style.willChange = 'transform';

        scrollWrapper.style.height = `${origClientHeight + moveUpDist}px`;
        scrollWrapper.scrollTo({ top: 0, behavior: 'smooth' });

        void scrollWrapper.offsetHeight;

        contentToReveal.forEach(child => {
            child.style.transition = 'opacity 0.4s ease-out 0.2s';
            child.style.opacity = '1';
        });

        innerCard.style.transition = 'none';
        extensionCard.style.transition = 'none';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!isSeamless) runShredderAnimation(moveUpDist, 0, 850);

                innerCard.style.pointerEvents = 'auto';
                innerCard.style.opacity = '1';

                const targetIds = ['action-capsule', 'left-menu-btn', 'search-trigger'];
                targetIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.querySelectorAll('svg').forEach(svg => {
                            svg.style.setProperty('transition', `translate 0.85s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease`, 'important');
                            svg.style.removeProperty('translate');
                            svg.style.removeProperty('opacity');
                        });
                    }
                });
            });
        });

        setTimeout(() => {
            editContainer.remove();
            btnContainer.remove();

            contentToReveal.forEach(child => {
                child.style.transition = '';
                child.style.opacity = '';
            });

            innerCard.style.transform = '';
            innerCard.style.WebkitMaskPosition = '';
            innerCard.style.maskPosition = '';
            extensionCard.style.transform = '';
            extensionCard.style.transition = '';

            // 4. 不能直接清空：須還原 script.js 計算的 100dvh 捲動高度
            scrollWrapper.style.height = originalScrollHeight;
            scrollWrapper.style.minHeight = '';
            scrollWrapper.style.paddingBottom = '';

            innerCard.style.transition = 'none';
            innerCard.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
            innerCard.style.WebkitMaskImage = '';
            innerCard.style.WebkitMaskSize = '';
            innerCard.style.WebkitMaskPosition = '';
            innerCard.style.WebkitMaskRepeat = '';
            innerCard.style.willChange = 'auto';
            innerCard.style.WebkitBackfaceVisibility = '';
            extensionCard.style.willChange = 'auto';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    innerCard.style.transition = `box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1)`;
                    innerCard.style.boxShadow = '';
                    setTimeout(() => { innerCard.style.transition = ''; }, 400);
                });
            });

            const targetIds = ['action-capsule', 'left-menu-btn', 'search-trigger'];
            targetIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.removeProperty('pointer-events');
                    if (id === 'action-capsule') el.querySelectorAll('.capsule-btn-item').forEach(btn => btn.style.removeProperty('overflow'));
                    else el.style.removeProperty('overflow');
                    el.querySelectorAll('svg').forEach(svg => {
                        svg.style.removeProperty('transition');
                        svg.style.removeProperty('will-change');
                    });
                }
            });

            isEditRouteAnimating = false;
            if (scrollWrapper) scrollWrapper.style.removeProperty('pointer-events');

            // 4. 清理完成後解鎖
            isEditRouteAnimating = false;
            if (scrollWrapper) scrollWrapper.style.removeProperty('pointer-events');

            // 退場後註銷滑動區的所有手勢監聽
            if (editGestureAbortController) {
                editGestureAbortController.abort();
                editGestureAbortController = null;
            }

        }, 850);
    };

    btnContainer.appendChild(createBtn(iconCancel, 'キャンセル', false, restoreUI));
    btnContainer.appendChild(createBtn(iconSave, '保存', true, async () => {
        if (isEditRouteAnimating) return;

        const newOrder = Array.from(capsulesCol.querySelectorAll('.edit-route-item:not(.deleting)'))
            .map(item => item.getAttribute('data-line-id'));

        await db.updateCardRoutes(cardId, newOrder);

        // 退場前等待背景 DOM 更新為最新排序
        if (window.refreshAppAfterEdit) {
            await window.refreshAppAfterEdit();

            // 先隱藏新產生的路線卡片，交由 restoreUI 淡入，避免閃現
            Array.from(scrollWrapper.children).forEach(child => {
                if (child.id !== 'edit-mode-container' && child !== btnContainer && child.id !== 'ghost-container') {
                    child.style.display = 'none';
                }
            });
        }

        // 觸發面板收起動畫（restoreUI 會取得最新 DOM）
        restoreUI();
    }));

    // =========================================================
    // 入場交疊淡出（Entrance Cross-fade）
    // =========================================================

    // 1. 記錄當前的捲動位置
    const currentScrollTop = scrollWrapper.scrollTop;

    // 2. 建立 Ghost 容器（視覺替身圖層）
    // 繼承原容器的排版屬性（含 padding 與 gap），避免走位
    const wrapperStyle = getComputedStyle(scrollWrapper);
    const ghostContainer = document.createElement('div');
    ghostContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        box-sizing: border-box;
        padding: ${wrapperStyle.padding};
        display: ${wrapperStyle.display};
        flex-direction: ${wrapperStyle.flexDirection || 'column'};
        gap: ${wrapperStyle.gap || '0px'};
        pointer-events: none;
        z-index: 10;
        transition: opacity 0.3s ease-out;
        transform: translateY(-${currentScrollTop}px);
    `;

    // 3. 將原內容 clone 進 Ghost
    originalChildren.forEach(child => {
        // cloneNode(true) 深拷貝作為視覺替身
        const clone = child.cloneNode(true);
        // 保留原有的 inline margin
        clone.style.margin = child.style.margin || getComputedStyle(child).margin;
        ghostContainer.appendChild(clone);

        // 注意：
        // 原始子節點不移除、只隱藏 (display: none)，
        // 關閉 (restoreUI) 時才能找回並還原
        child.style.display = 'none';
    });

    // 4. 準備編輯介面
    editContainer.style.opacity = '0';
    btnContainer.style.opacity = '0';

    // Ghost 與新內容一起放入容器
    scrollWrapper.appendChild(ghostContainer);
    scrollWrapper.appendChild(editContainer);
    scrollWrapper.appendChild(btnContainer);

    // 5. 捲動歸零（替身已用 translateY 抵銷位移）
    scrollWrapper.scrollTop = 0;

    // 強制瀏覽器重繪
    void scrollWrapper.offsetWidth;

    // 6. 替身淡出
    ghostContainer.style.opacity = '0';

    // =========================================================
    // 新內容進場
    // =========================================================
    innerCard.style.transition = 'none';
    extensionCard.style.transition = 'none';
    innerCard.style.pointerEvents = 'none';
    innerCard.style.opacity = '1';

    innerCard.style.transform = `translateY(0px)`;
    extensionCard.style.transform = `translateY(0px)`;
    const initialMaskPos = `0px -${feather}px`;
    innerCard.style.setProperty('-webkit-mask-position', initialMaskPos, 'important');
    innerCard.style.setProperty('mask-position', initialMaskPos, 'important');

    // 啟動新內容上升動畫
    runShredderAnimation(0, moveUpDist, 850);

    // 7. 300ms 後移除替身節點（原內容仍隱藏保留於 DOM）
    setTimeout(() => {
        if (ghostContainer) ghostContainer.remove();
    }, 300);

    // ============================================================================
    // 下拉關閉手勢（1:1 跟手、GPU 幀同步）
    // ============================================================================
    let touchStartY = 0;
    let pullDelta = 0;
    let isDraggingModal = false;
    let rafTicking = false;

    scrollWrapper.addEventListener('touchstart', (e) => {
        // 動畫中禁止啟動下拉
        if (isEditRouteAnimating) return;

        // 多點觸控防護 1：兩指以上時不啟動手勢
        if (e.touches.length > 1) return;

        // 底部操作按鈕區 (.flight-action-buttons-container) 不觸發下拉
        if (e.target.closest('.drag-handle') || e.target.closest('.delete-route-btn') || e.target.closest('.flight-action-buttons-container')) return;
        if (scrollWrapper.scrollTop > 0) return;

        if (shredderRafId) cancelAnimationFrame(shredderRafId);

        // 手勢啟動時暫停底部按鈕的點擊
        if (btnContainer) btnContainer.style.pointerEvents = 'none';

        touchStartY = e.touches[0].clientY;
        isDraggingModal = true;
        pullDelta = 0;

        // 移除過渡動畫，改由手勢直接控制
        innerCard.style.transition = 'none';
        extensionCard.style.transition = 'none';

    }, { passive: true, signal });

    scrollWrapper.addEventListener('touchmove', (e) => {
        if (!isDraggingModal) return;

        // 多點觸控防護 2：滑動途中偵測到第二根手指時
        if (e.touches.length > 1) {
            // 1. 中止手勢
            isDraggingModal = false;

            // 2. 恢復按鈕點擊
            if (btnContainer) btnContainer.style.removeProperty('pointer-events');

            // 3. 從目前位置回彈至頂部
            innerCard.style.transition = `opacity 0.3s ease`;
            extensionCard.style.transition = 'none';
            const currentY = moveUpDist - pullDelta;
            runShredderAnimation(currentY, moveUpDist, 400);

            // 4. 恢復透明度、數值歸零
            innerCard.style.opacity = '0';
            pullDelta = 0;
            return;
        }

        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY;

        if (deltaY > 0) {
            if (e.cancelable) e.preventDefault();
            pullDelta = deltaY * 0.5;
            const threshold = moveUpDist / 3;

            if (pullDelta > threshold) {
                isDraggingModal = false;
                const currentY = moveUpDist - pullDelta;
                runShredderAnimation(currentY, 0, 350);
                restoreUI({ isSeamless: true });
                return;
            }

            if (!rafTicking) {
                requestAnimationFrame(() => {
                    if (!isDraggingModal) { rafTicking = false; return; }
                    innerCard.style.transform = `translateY(-${moveUpDist - pullDelta}px)`;
                    extensionCard.style.transform = `translateY(-${moveUpDist - pullDelta}px)`;
                    const contentParallax = pullDelta * 0.22;
                    editContainer.style.transform = `translateY(${contentParallax}px)`;
                    btnContainer.style.transform = `translateY(${contentParallax}px)`;
                    const currentMaskPos = `0px ${moveUpDist - feather - pullDelta}px`;
                    innerCard.style.setProperty('-webkit-mask-position', currentMaskPos);
                    innerCard.style.setProperty('mask-position', currentMaskPos);
                    const dynamicOpacity = Math.min(pullDelta / 40, 1);
                    innerCard.style.opacity = dynamicOpacity.toString();
                    rafTicking = false;
                });
                rafTicking = true;
            }
        }
    }, { passive: false, signal });

    scrollWrapper.addEventListener('touchend', () => {
        if (!isDraggingModal) return;
        isDraggingModal = false;

        // 放開後延遲 100ms 才恢復按鈕點擊，
        // 避開 touchend 瞬間的幽靈點擊 (Ghost Click)
        setTimeout(() => {
            if (btnContainer) btnContainer.style.removeProperty('pointer-events');
        }, 100);

        if (pullDelta > 90) {
            const currentY = moveUpDist - pullDelta;
            runShredderAnimation(currentY, 0, 350);
            restoreUI({ isSeamless: true });
        } else if (pullDelta > 0) {
            innerCard.style.transition = `opacity 0.3s ease`;
            extensionCard.style.transition = 'none';
            const currentY = moveUpDist - pullDelta;
            runShredderAnimation(currentY, moveUpDist, 400);
            innerCard.style.opacity = '0';
        }
        pullDelta = 0;
    }, { signal });

    // ============================================================================
    // 桌面版滾輪／觸控板的下拉關閉（防抖、鎖定與靈敏度調校）
    // ============================================================================
    let wheelPullDelta = 0;
    let wheelRafTicking = false;
    let wheelBounceTimer = null;
    let isWheelDragging = false; 
    let isRebounding = false; // 回彈期間鎖定，保護動畫完整

    scrollWrapper.addEventListener('wheel', (e) => {
        // 防護 1：動畫中或回彈中不接受新訊號（避免頓挫）
        if (isEditRouteAnimating || isRebounding) return;

        // 防護 2：僅在列表頂部且往下拉 (deltaY < 0) 時啟動
        if ((scrollWrapper.scrollTop <= 0 && e.deltaY < 0) || isWheelDragging) {
            
            if (e.cancelable) e.preventDefault(); 
            isWheelDragging = true;
            
            // 死區濾波 (Deadzone)：
            // 忽略小於 2 的微弱訊號，濾除觸控板抖動
            if (Math.abs(e.deltaY) < 2) return; 

            // 靈敏度 0.25 搭配死區，取得穩定的阻尼手感
            wheelPullDelta += -(e.deltaY) * 0.25; 
            if (wheelPullDelta < 0) wheelPullDelta = 0;

            // 觸發門檻 (Threshold)：
            // 行程 1/4.5（上限 100px），明確滑動即可關閉
            const threshold = Math.min(moveUpDist / 4.5, 100);

            if (wheelPullDelta > threshold) {
                // 達到門檻，觸發關閉
                isWheelDragging = false;
                wheelPullDelta = 0;
                if (wheelBounceTimer) clearTimeout(wheelBounceTimer);
                
                runShredderAnimation(moveUpDist - threshold, 0, 350);
                restoreUI({ isSeamless: true });
                return;
            }

            // 視覺回饋：跟隨觸控板位移
            if (!wheelRafTicking) {
                requestAnimationFrame(() => {
                    if (!isWheelDragging) { wheelRafTicking = false; return; }
                    
                    innerCard.style.transition = 'none';
                    extensionCard.style.transition = 'none';
                    if (editContainer) editContainer.style.transition = 'none';
                    if (btnContainer) btnContainer.style.transition = 'none';
                    
                    const currentY = moveUpDist - wheelPullDelta;
                    innerCard.style.transform = `translateY(-${currentY}px)`;
                    extensionCard.style.transform = `translateY(-${currentY}px)`;
                    
                    const contentParallax = wheelPullDelta * 0.22;
                    if (editContainer) editContainer.style.transform = `translateY(${contentParallax}px)`;
                    if (btnContainer) btnContainer.style.transform = `translateY(${contentParallax}px)`;
                    
                    const dynamicOpacity = Math.min(wheelPullDelta / 40, 1);
                    innerCard.style.opacity = dynamicOpacity.toString();

                    const currentMaskPos = `0px ${currentY - feather}px`;
                    innerCard.style.setProperty('-webkit-mask-position', currentMaskPos, 'important');
                    innerCard.style.setProperty('mask-position', currentMaskPos, 'important');
                    
                    wheelRafTicking = false;
                });
                wheelRafTicking = true;
            }

            // 回彈機制
            if (wheelBounceTimer) clearTimeout(wheelBounceTimer);
            wheelBounceTimer = setTimeout(() => {
                if (wheelPullDelta > 0 && isWheelDragging && !isEditRouteAnimating) {
                    isWheelDragging = false;
                    
                    // 啟動回彈鎖定 (Rebound Lock)
                    isRebounding = true; // 回彈期間不接受新訊號
                    
                    const currentY = moveUpDist - wheelPullDelta;
                    runShredderAnimation(currentY, moveUpDist, 400);
                    
                    innerCard.style.transition = `opacity 0.3s ease`;
                    innerCard.style.opacity = '0'; 
                    
                    wheelPullDelta = 0;

                    // 400ms 動畫結束後解鎖
                    setTimeout(() => {
                        isRebounding = false;
                    }, 400);
                }
            }, 150); 
            
        } else {
            isWheelDragging = false;
            wheelPullDelta = 0;
        }
    }, { passive: false, signal });

    initDragAndDrop(editContainer);
}

// ============================================================================
// 膠囊拖曳排序（僅左欄膠囊，不影響右欄刪除鈕）
// ============================================================================
function initDragAndDrop(container) {
    // 拖曳僅在左欄內部發生
    const capsulesCol = container.querySelector('#capsules-col');
    const items = capsulesCol.querySelectorAll('.edit-route-item');

    let draggingItem = null;
    let ghost = null;
    let startY = 0;
    let initialTop = 0;
    let touchTimeout = null;

    items.forEach(item => {
        const handle = item.querySelector('.drag-handle');

        const onDragStart = (clientY) => {
            if (navigator.vibrate) navigator.vibrate(50);
            draggingItem = item;
            startY = clientY;

            const rect = item.getBoundingClientRect();
            ghost = item.cloneNode(true);

            // 拖曳替身沿用系統 CSS 變數，外觀與原膠囊一致
            Object.assign(ghost.style, {
                position: 'fixed',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                zIndex: '9999',
                opacity: '1',
                pointerEvents: 'none',
                transform: 'scale(1.04)',
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',

                // 拖曳時的顏色與邊框跟隨系統變數
                background: 'var(--search-bg)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid var(--border-color)',

                // 套用既有的陰影樣式
                boxShadow: 'var(--ray-shadow-active)',

                boxSizing: 'border-box',
                borderRadius: '999px',
                margin: '0',
                display: 'flex',
                alignItems: 'center'
            });
            document.body.appendChild(ghost);

            // 原膠囊設為 opacity: 0，以透明佔位維持排版
            item.style.opacity = '0';
            initialTop = rect.top;

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchmove', onDragMove, { passive: false });
            document.addEventListener('touchend', onDragEnd);
        };

        handle.addEventListener('mousedown', (e) => { e.preventDefault(); onDragStart(e.clientY); });
        handle.addEventListener('touchstart', (e) => {
            touchTimeout = setTimeout(() => { onDragStart(e.touches[0].clientY); }, 400);
        }, { passive: true });

        handle.addEventListener('touchmove', () => clearTimeout(touchTimeout), { passive: true });
        handle.addEventListener('touchend', () => clearTimeout(touchTimeout));
        handle.addEventListener('touchcancel', () => clearTimeout(touchTimeout));
    });

    const onDragMove = (e) => {
        if (!draggingItem || !ghost) return;
        if (e.cancelable) e.preventDefault();
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const deltaY = clientY - startY;
        ghost.style.top = `${initialTop + deltaY}px`;

        const elements = document.elementsFromPoint(window.innerWidth / 2, clientY);
        const target = elements.find(el => el.classList.contains('edit-route-item') && el !== draggingItem);

        if (target) {
            const targetRect = target.getBoundingClientRect();
            const targetMid = targetRect.top + targetRect.height / 2;
            // 只交換左欄膠囊位置，右欄刪除鈕不動
            if (clientY < targetMid) capsulesCol.insertBefore(draggingItem, target);
            else capsulesCol.insertBefore(draggingItem, target.nextSibling);
        }
    };

    const onDragEnd = () => {
        if (!draggingItem || !ghost) return;
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        ghost.remove();
        ghost = null;
        draggingItem.style.opacity = '1';
        draggingItem = null;
    };
}