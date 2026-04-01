import * as db from '../data/db.js';

// 🛡️ 絕對防禦：全域狀態鎖與計時器 (必須在所有 function 外面！)
let isEditRouteAnimating = false;
let editLockTimer = null;

export function startRouteEditMode(cardId, currentLineIds) {

    // 🚨 1. 第一層防呆：如果動畫還在跑，立刻擋掉第二次點擊！
    if (isEditRouteAnimating) {
        console.log('動畫進行中，阻擋重複開啟');
        return;
    }

    const innerCard = document.querySelector('#detail-card-container .detail-card-inner');
    const extensionCard = document.querySelector('#detail-card-container .detail-extension-card');
    const scrollWrapper = document.getElementById('card-extension-container');

    if (!innerCard || !extensionCard || !scrollWrapper) return;

    // 🔒 2. 上鎖：標記進場動畫開始
    isEditRouteAnimating = true;

    // 🛡️ 3. 物理盾：瞬間剝奪整個區域的點擊能力，防止連點按鈕
    scrollWrapper.style.pointerEvents = 'none';

    // 🔓 4. 解鎖計時器：900ms 後準時解開防護罩
    if (editLockTimer) clearTimeout(editLockTimer);
    editLockTimer = setTimeout(() => {
        isEditRouteAnimating = false;
        // ✨ 改用 removeProperty，避免覆蓋你原本的 CSS 設定！
        if (scrollWrapper) scrollWrapper.style.removeProperty('pointer-events');
    }, 900);

    // ==========================================
    // 🎬 第一階段：沈浸式過渡動畫 (純 GPU 零卡頓極致版)
    // ==========================================
    const innerRect = innerCard.getBoundingClientRect();
    const moveUpDist = innerRect.height + 16;
    const exactNewHeight = window.innerHeight - innerRect.top;

    const originalScrollHeight = scrollWrapper.style.height;
    // ✨ 紀錄進入編輯模式前的精準狀態 (高度與捲動軸位置)
    const originalScrollTop = scrollWrapper.scrollTop;
    const origClientHeight = scrollWrapper.clientHeight;

    // 🚀 效能解鎖 1：只給予純 GPU 屬性的加速，【拔除對 Height 的依賴】！
    innerCard.style.willChange = 'transform, opacity, -webkit-mask-position';
    innerCard.style.WebkitBackfaceVisibility = 'hidden';
    extensionCard.style.willChange = 'transform'; // 只要位移就好，不准算高度

    const feather = 45;
    // ✨ 核心調校：不增加 45px 總範圍，利用多節點透明度 (0.15 -> 0.5 -> 0.85) 
    // 徹底消除線性漸層的邊緣斷層 (Mach Bands)，創造如同實體毛玻璃邊緣般的柔和消散感！
    innerCard.style.WebkitMaskImage = `linear-gradient(to bottom, 
        transparent 0px, 
        transparent 2px, 
        rgba(0,0,0,0.02) 6px,   /* 極慢起步，騙過眼睛 */
        rgba(0,0,0,0.09) 12px, 
        rgba(0,0,0,0.25) 18px, 
        rgba(0,0,0,0.50) 24px,  /* 完美中點 */
        rgba(0,0,0,0.75) 30px, 
        rgba(0,0,0,0.91) 36px, 
        rgba(0,0,0,0.98) 40px,  /* 極慢收尾 */
        black ${feather}px, 
        black 100%)`;
    innerCard.style.WebkitMaskSize = '100% 3000px';
    innerCard.style.WebkitMaskPosition = `0px -${feather}px`;
    innerCard.style.WebkitMaskRepeat = 'no-repeat';

    // 🛑 瞬間完成，拒絕逐格運算：直接將內部容器高度設到位，因為它是透明的視覺不影響
    scrollWrapper.style.height = `${exactNewHeight}px`;
    void innerCard.offsetHeight; // 強制重繪

    const easeBezier = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const duration = '0.85s';

    // ==========================================
    // ⚙️ 核心實體引擎：加入時空錯位與內容掉落
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

            // ✨ 修復 2：將透明倍率拉高到 4.5 倍！
            // 讓舊內容在掉落的前 22% (不到 0.2 秒) 就徹底煙消雲散，絕對不留殘影！
            let opacityProgress = isClosing ? (progress * 4.5) : progress;
            if (opacityProgress > 1) opacityProgress = 1;

            const currentOpacity = startOpacity + (targetOpacity - startOpacity) * opacityProgress;
            editContainer.style.opacity = currentOpacity.toString();
            btnContainer.style.opacity = currentOpacity.toString();

            // ✨ 2. 空間錯位魔法修復：
            // 只有在「關閉(isClosing)」時，才讓舊內容貼死背景往下掉
            if (isClosing) {
                const dropOffset = moveUpDist - currentY;
                editContainer.style.transform = `translateY(${dropOffset}px)`;
                btnContainer.style.transform = `translateY(${dropOffset}px)`;
            } else {
                // 🚨 點擊開啟時：清除所有多餘位移！讓新內容乖乖待在卡片裡，跟著卡片 1:1 原速往上爬升
                editContainer.style.transform = '';
                btnContainer.style.transform = '';

                // ✨ [新增] 尾巴消除魔法 (只針對開啟動畫)：綁定 Y 軸物理座標
                // 設定在抵達終點前 (行程的 60% 處) 開始連動淡化
                const fadeStartDistance = targetY * 0.6;
                if (currentY > fadeStartDistance) {
                    // 隨座標逼近終點，透明度從 1 精準滑落到 0
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
                // 確保動畫落地後解開物理鎖，恢復點擊
                innerCard.style.pointerEvents = 'auto';
            }
        };
        shredderRafId = requestAnimationFrame(step);
    };

    // ==========================================
    // 🛸 終極母艦控制：包含膠囊與下方雙圓扣
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

    // 🚀 效能解鎖 2：使用雙重 requestAnimationFrame！
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            targetIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.querySelectorAll('svg').forEach(svg => {
                        // ✨ 完美同步魔法：將時間(0.85s)與曲線(cubic-bezier)完全對齊 JS 實體引擎！
                        // 讓位移與透明度都與卡片上升的時間一模一樣 (0.85s)
                        svg.style.setProperty('transition', `translate 0.85s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1)`, 'important');
                        svg.style.setProperty('translate', '0px -48px', 'important');
                        svg.style.setProperty('opacity', '0', 'important');
                    });
                }
            });
        });
    });

    // ==========================================
    // 🛠️ 第二階段：替換為編輯內容
    // ==========================================
    const originalChildren = Array.from(scrollWrapper.children);

    const editContainer = document.createElement('div');
    editContainer.id = 'edit-mode-container';
    editContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; opacity: 0; transition: opacity 0.3s ease; flex-shrink: 0;';

    const dict = window.MasterRouteDictionary || {};
    const cardName = window.appRailwayData?.find(c => c.id === cardId)?.name || 'カスタムカード';

    // ✨ 核心升級：建立包含「隱形地基」的雙欄排版
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

        // 1. 生成膠囊 (放在左欄)
        const capsule = document.createElement('div');
        capsule.className = 'edit-route-item';
        capsule.setAttribute('data-line-id', lineId);

        capsule.style.cssText = `
            display: flex; align-items: center; 
            background: var(--search-bg); /* ⬅️ 關鍵：使用與按鈕相同的背景變數 */
            border: 1px solid var(--border-color); /* ⬅️ 自動切換深淺的邊框 */
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            padding: 0 16px; border-radius: 999px; height: 48px; 
            transition: transform 0.2s, opacity 0.2s, background 0.2s; 
            user-select: none; -webkit-user-select: none;
            box-sizing: border-box;
        `;

        // ✨ 初始判定：如果只有一條，直接把手把隱藏 (opacity: 0) 並且鎖死點擊 (pointer-events: none)
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

        // 2. 生成垃圾桶 (放在右欄)
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

        // 刪除邏輯：動態對應並判定剩餘數量
        delBtn.onclick = () => {
            const index = Array.from(deleteBtnsCol.children).indexOf(delBtn);
            const targetCapsule = capsulesCol.children[index];

            // ✨ 標記這個膠囊「正在被刪除」，這樣後面的計算才會準確
            targetCapsule.classList.add('deleting');

            targetCapsule.style.transform = 'scale(0.95)';
            targetCapsule.style.opacity = '0';
            delBtn.style.transform = 'scale(0.95)';
            delBtn.style.opacity = '0';

            // ✨ 動態淡出：檢查還剩下幾個沒被刪除的膠囊？如果只剩 1 個，就把它的手把淡出！
            const remainingCapsules = Array.from(capsulesCol.children).filter(c => !c.classList.contains('deleting'));
            if (remainingCapsules.length <= 1 && remainingCapsules[0]) {
                const lastHandle = remainingCapsules[0].querySelector('.drag-handle');
                if (lastHandle) {
                    lastHandle.style.opacity = '0';
                    lastHandle.style.pointerEvents = 'none'; // 物理鎖死
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

    // 加上 options 參數
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

        // ✨ 動態獲取當下的真實 DOM，不管背景有沒有被偷換過，都能精準命中！
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

            // 4. ✨ 核心修復：不能清空！必須還原最初在 script.js 精準計算的 100dvh 捲動高度
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
        }, 850);
    };

    btnContainer.appendChild(createBtn(iconCancel, 'キャンセル', false, restoreUI));
    btnContainer.appendChild(createBtn(iconSave, '保存', true, async () => {
        if (isEditRouteAnimating) return;

        const newOrder = Array.from(capsulesCol.querySelectorAll('.edit-route-item:not(.deleting)'))
            .map(item => item.getAttribute('data-line-id'));

        await db.updateCardRoutes(cardId, newOrder);

        // ✨ 核心修復：在退場前，等待背景將真實 DOM 抽換為最新排序
        if (window.refreshAppAfterEdit) {
            await window.refreshAppAfterEdit();

            // 🚨 防止剛長出來的新路線卡片瞬間閃現！先把他們藏起來，交由 restoreUI 優雅淡入
            Array.from(scrollWrapper.children).forEach(child => {
                if (child.id !== 'edit-mode-container' && child !== btnContainer && child.id !== 'ghost-container') {
                    child.style.display = 'none';
                }
            });
        }

        // 觸發面板收起動畫 (現在 restoreUI 會抓到最新的 DOM)
        restoreUI();
    }));

    // =========================================================
    // 🚀 入場十字交疊淡出引擎 (Entrance Cross-fade Engine - 完美克隆凍結版)
    // =========================================================

    // ✨ 1. 記錄當前的捲動位置
    const currentScrollTop = scrollWrapper.scrollTop;

    // ✨ 2. 建立 Ghost 容器 (幽靈圖層)
    // 為了防止內容被放大或走位，我們必須「精準繼承」原容器的排版屬性 (包含 Padding 與 Gap)
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

    // ✨ 3. 將真正的內容「拍照 (Clone)」並放入 Ghost 中
    originalChildren.forEach(child => {
        // 使用 cloneNode(true) 進行深拷貝，製作視覺替身
        const clone = child.cloneNode(true);
        // 保留原本可能存在的 inline margin
        clone.style.margin = child.style.margin || getComputedStyle(child).margin;
        ghostContainer.appendChild(clone);

        // 🚨 解決空白問題的關鍵：
        // 真正的子節點我們「絕對不拔除」，只是把它們藏起來 (display: none)
        // 這樣關閉 (restoreUI) 的時候，才能找得到它們並喚醒！
        child.style.display = 'none';
    });

    // ✨ 4. 準備新內容 (編輯介面)
    editContainer.style.opacity = '0';
    btnContainer.style.opacity = '0';

    // 將 替身(Ghost) 與 新內容 放進容器
    scrollWrapper.appendChild(ghostContainer);
    scrollWrapper.appendChild(editContainer);
    scrollWrapper.appendChild(btnContainer);

    // ✨ 5. 安心歸零捲動軸 (因為替身已經透過 translateY 完美抵銷了高度)
    scrollWrapper.scrollTop = 0;

    // 強制瀏覽器重繪
    void scrollWrapper.offsetWidth;

    // ✨ 6. 發動替身淡出
    ghostContainer.style.opacity = '0';

    // =========================================================
    // 🚀 新內容預先歸位與發射
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

    // 發射！啟動新內容上升引擎！
    runShredderAnimation(0, moveUpDist, 850);

    // ✨ 7. 300ms 後，徹底清除替身節點 (保持 DOM 乾淨，真正的內容依然安全地沉睡在 DOM 裡)
    setTimeout(() => {
        if (ghostContainer) ghostContainer.remove();
    }, 300);

    // ============================================================================
    // ✋ 頂級互動：全域「1:1 跟手下拉關閉」手勢引擎 (GPU 幀同步完美版)
    // ============================================================================
    let touchStartY = 0;
    let pullDelta = 0;
    let isDraggingModal = false;
    let rafTicking = false;

    scrollWrapper.addEventListener('touchstart', (e) => {
        // 🚨 手勢防護：動畫中禁止發動下拉！
        if (isEditRouteAnimating) return;

        // 🚨 多點觸控防護 1：如果一開始就有兩根以上手指碰到螢幕，直接拒絕啟動手勢！
        if (e.touches.length > 1) return;

        // ✨ 核心修復：把底部的操作按鈕區 (.flight-action-buttons-container) 加入免死金牌名單！
        if (e.target.closest('.drag-handle') || e.target.closest('.delete-route-btn') || e.target.closest('.flight-action-buttons-container')) return;
        if (scrollWrapper.scrollTop > 0) return;

        if (shredderRafId) cancelAnimationFrame(shredderRafId);

        // 🛡️ 【新增防護】：下拉手勢一啟動，立刻沒收底部按鈕的點擊權限
        if (btnContainer) btnContainer.style.pointerEvents = 'none';

        touchStartY = e.touches[0].clientY;
        isDraggingModal = true;
        pullDelta = 0;

        // 拔除系統動畫
        innerCard.style.transition = 'none';
        extensionCard.style.transition = 'none';

    }, { passive: true });

    scrollWrapper.addEventListener('touchmove', (e) => {
        if (!isDraggingModal) return;

        // 🚨 多點觸控防護 2：滑動到一半時，如果偵測到第二根手指（例如試圖去按保存）
        if (e.touches.length > 1) {
            // 1. 強制沒收手勢控制權
            isDraggingModal = false;

            // 2. 提前把按鈕的點擊能力還給系統
            if (btnContainer) btnContainer.style.removeProperty('pointer-events');

            // 3. 🚀 發射回彈引擎：從當下卡在半空中的位置，順滑彈回頂部！
            innerCard.style.transition = `opacity 0.3s ease`;
            extensionCard.style.transition = 'none';
            const currentY = moveUpDist - pullDelta;
            runShredderAnimation(currentY, moveUpDist, 400);

            // 4. 恢復透明度與數值歸零
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
    }, { passive: false });

    scrollWrapper.addEventListener('touchend', () => {
        if (!isDraggingModal) return;
        isDraggingModal = false;

        // 🛡️ 【新增防護】：手指放開後，延遲 100ms 再把按鈕點擊權限還給使用者
        // 這能完美避開觸控螢幕在 touchend 瞬間所觸發的幽靈點擊 (Ghost Click) 事件
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
    });

    initDragAndDrop(editContainer);
}

// ============================================================================
// 👻 幽靈拖曳引擎：純粹膠囊拖曳版 (不會碰到右側垃圾桶)
// ============================================================================
function initDragAndDrop(container) {
    // 拖曳只在左欄內部發生！
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

            // ✨ 核心修復：幽靈物件全面導入系統變數，質感完美對齊！
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

                // ✨ 改動 3：拖曳時的顏色與邊框，完全跟隨系統變數
                background: 'var(--search-bg)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid var(--border-color)',

                // ✨ 改動 4：直接召喚你寫好的神級光追陰影！
                boxShadow: 'var(--ray-shadow-active)',

                boxSizing: 'border-box',
                borderRadius: '999px',
                margin: '0',
                display: 'flex',
                alignItems: 'center'
            });
            document.body.appendChild(ghost);

            // ✨ 將原本的膠囊設為 opacity: 0，它變成一塊完美的透明磚塊幫我們撐住排版！
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
            // 交換膠囊在左欄中的位置，右欄垃圾桶文風不動！
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