import * as db from '../data/db.js';

export function startRouteEditMode(cardId, currentLineIds) {
    const innerCard = document.querySelector('#detail-card-container .detail-card-inner');
    const extensionCard = document.querySelector('#detail-card-container .detail-extension-card');
    const scrollWrapper = document.getElementById('card-extension-container');

    if (!innerCard || !extensionCard || !scrollWrapper) return;

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
            
            // ✨ 核心修正 1：改為 translate，保護原本的 transform！
            el.querySelectorAll('svg').forEach(svg => svg.style.setProperty('will-change', 'translate, opacity', 'important'));
        }
    });

    // 🚀 效能解鎖 2：使用雙重 requestAnimationFrame！
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // 🚨 請把這裡原本寫的 innerCard.style.transition... 等等全部刪除
            // 🚨 請務必把這行刪除：runShredderAnimation(0, moveUpDist, 850); 
            // (因為我們已經在上面 400ms 的 setTimeout 裡面發射過了！)

            // ✨ 這個 RAF 裡面「只保留」右側母艦 SVG 的動畫：
            targetIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.querySelectorAll('svg').forEach(svg => {
                        svg.style.setProperty('transition', `translate ${duration} ${easeBezier}, opacity 0.3s ease 0.1s`, 'important');
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
        const isSeamless = options.isSeamless || false;

        // 🛑 只有「非手勢」的按鈕關閉時，才需要強制煞停 JS 引擎
        if (!isSeamless && shredderRafId) {
            cancelAnimationFrame(shredderRafId);
        }

        // =========================================================
        // 🚀 第一步：啟動十字交疊淡入淡出引擎 (Cross-fade Engine)
        // =========================================================
        const currentEditTransform = editContainer.style.transform;
        const currentBtnTransform = btnContainer.style.transform;
        editContainer.style.transform = '';
        btnContainer.style.transform = '';

        const editRect = editContainer.getBoundingClientRect();
        const btnRect = btnContainer.getBoundingClientRect();
        const scrollRect = scrollWrapper.getBoundingClientRect();

        const editTop = editRect.top - scrollRect.top + scrollWrapper.scrollTop;
        const btnTop = btnRect.top - scrollRect.top + scrollWrapper.scrollTop;
        
        // ✨ 修復 3：精準計算 Left 座標與實際 Width，不再粗暴使用 left:0 和 100%！
        const editLeft = editRect.left - scrollRect.left + scrollWrapper.scrollLeft;
        const btnLeft = btnRect.left - scrollRect.left + scrollWrapper.scrollLeft;

        editContainer.style.transition = 'none';
        btnContainer.style.transition = 'none';

        // 懸空編輯區塊 (精準鎖死寬度與左側距離)
        editContainer.style.position = 'absolute';
        editContainer.style.top = `${editTop}px`;
        editContainer.style.left = `${editLeft}px`; 
        editContainer.style.width = `${editRect.width}px`; 
        editContainer.style.pointerEvents = 'none';
        editContainer.style.transform = currentEditTransform; 

        // 懸空底部按鈕 (精準鎖死寬度與左側距離)
        btnContainer.style.position = 'absolute';
        btnContainer.style.top = `${btnTop}px`;
        btnContainer.style.bottom = 'auto'; 
        btnContainer.style.left = `${btnLeft}px`;
        btnContainer.style.width = `${btnRect.width}px`;
        btnContainer.style.marginTop = '0';
        btnContainer.style.pointerEvents = 'none';
        btnContainer.style.transform = currentBtnTransform; 

        // 2. 喚醒原本的清單，放入排版中，但先保持完全透明 (opacity: 0)
        originalChildren.forEach(child => {
            child.style.transition = 'none';
            child.style.opacity = '0';
            child.style.display = '';
        });

        const easeBezier = 'cubic-bezier(0.16, 1, 0.3, 1)';
        const duration = '0.85s';
        const feather = 45;

        // 重新分配 GPU
        innerCard.style.willChange = 'transform, opacity, -webkit-mask-position';
        innerCard.style.WebkitBackfaceVisibility = 'hidden';
        extensionCard.style.willChange = 'transform';

        // 抵銷位移的撐高，防止排版坍塌
        scrollWrapper.style.height = `${origClientHeight + moveUpDist}px`;

        // ✨ 觸發原生平滑捲動，讓清單優雅地洗牌回到最上方
        scrollWrapper.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // 3. 強制瀏覽器重繪 (Reflow)，確認隱形與排版已生效
        void scrollWrapper.offsetHeight;

        // 4. 發動原本清單的平滑淡入！(延遲 0.2s 讓舊內容先死透，完美錯開)
        originalChildren.forEach(child => {
            child.style.transition = 'opacity 0.4s ease-out 0.2s';
            child.style.opacity = '1';
        });

        // =========================================================
        // 🚀 第二步：啟動降落引擎
        // =========================================================
        innerCard.style.transition = 'none';
        extensionCard.style.transition = 'none';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (!isSeamless) {
                    // 🔘 按鈕關閉：發射 JS 實體引擎接管降落！(耗時 850ms)
                    // 💡 注意：引擎會自動把懸空的 editContainer 透明度平滑降到 0，達成完美交疊！
                    runShredderAnimation(moveUpDist, 0, 850);
                }

                innerCard.style.pointerEvents = 'auto';
                innerCard.style.opacity = '1';

                // ✨ 右側 SVG 按鈕降落還原
                const targetIds = ['action-capsule', 'left-menu-btn', 'search-trigger'];
                targetIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.querySelectorAll('svg').forEach(svg => {
                            svg.style.setProperty('transition', `translate ${duration} ${easeBezier}, opacity 0.3s ease`, 'important');
                            svg.style.removeProperty('translate');
                            svg.style.removeProperty('opacity');
                        });
                    }
                });
            });
        });

        // =========================================================
        // 🧹 850ms 動畫徹底落地後的現場清理
        // =========================================================
        setTimeout(() => {
            // 1. 徹底移除已經淡出完畢的編輯容器
            editContainer.remove();
            btnContainer.remove();

            // 2. 清理原本清單的 inline-style
            originalChildren.forEach(child => {
                child.style.transition = '';
                child.style.opacity = '';
            });

            // 3. 擦乾淨降落引擎的痕跡
            innerCard.style.transform = '';
            innerCard.style.WebkitMaskPosition = '';
            innerCard.style.maskPosition = '';
            extensionCard.style.transform = '';
            extensionCard.style.transition = '';

            // 4. 恢復 scrollWrapper 原始高度
            scrollWrapper.style.height = originalScrollHeight;

            // 5. 陰影呼吸外擴復原
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
                    innerCard.style.transition = `box-shadow 0.4s ${easeBezier}`;
                    innerCard.style.boxShadow = '';

                    setTimeout(() => {
                        innerCard.style.transition = '';
                    }, 400);
                });
            });

            // 清理右側按鈕的鎖定殘留
            const targetIds = ['action-capsule', 'left-menu-btn', 'search-trigger'];
            targetIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.removeProperty('pointer-events');

                    if (id === 'action-capsule') {
                        el.querySelectorAll('.capsule-btn-item').forEach(btn => btn.style.removeProperty('overflow'));
                    } else {
                        el.style.removeProperty('overflow');
                    }

                    el.querySelectorAll('svg').forEach(svg => {
                        svg.style.removeProperty('transition');
                        svg.style.removeProperty('will-change');
                    });
                }
            });
        }, 850);
    }; 

    btnContainer.appendChild(createBtn(iconCancel, 'キャンセル', false, restoreUI));
    btnContainer.appendChild(createBtn(iconSave, '保存', true, async () => {
        // ✨ 保存時只抓取左欄(膠囊)的最新的順序即可，非常安全！
        const newOrder = Array.from(capsulesCol.querySelectorAll('.edit-route-item'))
                              .map(item => item.getAttribute('data-line-id'));
        await db.saveCardPreference(cardId, { targetLineIds: newOrder });
        
        restoreUI();
        setTimeout(async () => {
            if (window.buildAndRender) await window.buildAndRender();
            if (window.closeAllCards) window.closeAllCards(true);
        }, 300);
    }));

    // =========================================================
    // 🚀 入場十字交疊淡出引擎 (Entrance Cross-fade Engine)
    // =========================================================
    // 1. 量測並凍結舊清單的精準座標 (懸空化)
    const scrollRect = scrollWrapper.getBoundingClientRect();
    originalChildren.forEach(child => {
        const rect = child.getBoundingClientRect();
        const top = rect.top - scrollRect.top + scrollWrapper.scrollTop;
        const left = rect.left - scrollRect.left + scrollWrapper.scrollLeft;
        
        child.style.position = 'absolute';
        child.style.top = `${top}px`;
        child.style.left = `${left}px`;
        child.style.width = `${rect.width}px`;
        child.style.pointerEvents = 'none'; // 鎖死防誤觸
        child.style.transition = 'none';
    });

    // 2. 放入新清單
    scrollWrapper.appendChild(editContainer);
    scrollWrapper.appendChild(btnContainer);
    scrollWrapper.scrollTop = 0; 
    
    // 強制重繪
    void scrollWrapper.offsetWidth;

    // 3. 發動舊清單的優雅淡出 (在 0.4s 內化為迷霧)
    originalChildren.forEach(child => {
        child.style.transition = 'opacity 0.4s ease-out';
        child.style.opacity = '0';
    });

    // 4. 400ms 後徹底清理並隱藏舊清單
    setTimeout(() => {
        originalChildren.forEach(child => {
            child.style.display = 'none'; 
            child.style.position = '';
            child.style.top = '';
            child.style.left = '';
            child.style.width = '';
            child.style.opacity = '';
            child.style.transition = '';
            child.style.pointerEvents = '';
        });
        
        // ✨ 核心修復：把發射按鈕移進來！
        // 確保 400ms 過去、舊資訊完全化為透明死透後，才正式啟動新內容的往上爬升！
        runShredderAnimation(0, moveUpDist, 850);
    }, 400);

    // =========================================================
    // 🚀 新內容預先歸位 (在終點正下方的黑暗中靜靜等待)
    // =========================================================
    // 1. 拔除暴衝的 translateY，只保持透明，讓它預設待在卡片的底部
    editContainer.style.opacity = '0';
    btnContainer.style.opacity = '0';
    editContainer.style.transform = ''; 
    btnContainer.style.transform = '';

    innerCard.style.transition = 'none';
    extensionCard.style.transition = 'none';
    innerCard.style.pointerEvents = 'none';
    innerCard.style.opacity = '1';

    // 2. ✨ 鎖定卡片與遮罩的「等待期狀態」
    // 因為我們要等 400ms，必須先鎖死卡片位置，防止在等待期間畫面被提前向下撐破！
    innerCard.style.transform = `translateY(0px)`;
    extensionCard.style.transform = `translateY(0px)`;
    const initialMaskPos = `0px -${feather}px`;
    innerCard.style.setProperty('-webkit-mask-position', initialMaskPos, 'important');
    innerCard.style.setProperty('mask-position', initialMaskPos, 'important');
    
    // ============================================================================
    // ✋ 頂級互動：全域「1:1 跟手下拉關閉」手勢引擎 (GPU 幀同步完美版)
    // ============================================================================
    let touchStartY = 0;
    let pullDelta = 0;
    let isDraggingModal = false;
    let rafTicking = false; 

    scrollWrapper.addEventListener('touchstart', (e) => {
        // 🛑 防呆機制：拖曳把手、刪除按鈕、或畫面已經往下滾動時，不啟動下拉
        if (e.target.closest('.drag-handle') || e.target.closest('.delete-route-btn')) return;
        if (scrollWrapper.scrollTop > 0) return;

        if (shredderRafId) cancelAnimationFrame(shredderRafId);

        touchStartY = e.touches[0].clientY;
        isDraggingModal = true;
        pullDelta = 0;

        // 拔除系統動畫
        innerCard.style.transition = 'none';
        extensionCard.style.transition = 'none';
        
    }, { passive: true });

    scrollWrapper.addEventListener('touchmove', (e) => {
        if (!isDraggingModal) return;

        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY;

        if (deltaY > 0) { 
            if (e.cancelable) e.preventDefault(); // 阻斷原生滾動

            pullDelta = deltaY * 0.85; 

            // ✨ 終極進化：可反悔區域縮短為「總行程的一半」
            const threshold = moveUpDist / 2;
            
            // ✨ 一旦拉超過一半，立刻沒收控制權，系統無縫接手直接關閉！
            if (pullDelta > threshold) {
                isDraggingModal = false; 
                
                // 🚀 核心爆發：發射 JS 實體引擎！直接從指尖當下的位置，順滑重力降落到底部 (耗時約 350ms)
                const currentY = moveUpDist - pullDelta;
                runShredderAnimation(currentY, 0, 350);
                
                // 呼叫退出清理，並掛上「無縫接力」的免死金牌！
                restoreUI({ isSeamless: true });             
                return;                  
            }
            
            // 🚀 核心破解：使用 requestAnimationFrame 鎖定渲染幀
            if (!rafTicking) {
                requestAnimationFrame(() => {
                    // 防呆保險：如果在等待 GPU 畫圖的極短瞬間，已經移交控制權了，就終止繪製避免畫面抖動
                    if (!isDraggingModal) { rafTicking = false; return; }
                    
                    innerCard.style.transform = `translateY(-${moveUpDist - pullDelta}px)`;
                    extensionCard.style.transform = `translateY(-${moveUpDist - pullDelta}px)`;
                    
                    // ✨ 讓內容也同步貼死背景物理滑落，完全對齊原生 iOS 手感！
                    editContainer.style.transform = `translateY(${pullDelta}px)`;
                    btnContainer.style.transform = `translateY(${pullDelta}px)`;

                    const currentMaskPos = `0px ${moveUpDist - feather - pullDelta}px`;
                    innerCard.style.setProperty('-webkit-mask-position', currentMaskPos);
                    innerCard.style.setProperty('mask-position', currentMaskPos);

                    // ✨ 動態透明度魔法：在前 40px 的拉動距離內，透明度從 0 滑順過渡到 1
                    // 這樣卡片就像是從「迷霧中」被拉出來一樣，絕對不會有生硬的閃現！
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

        if (pullDelta > 90) { 
            // 💥 拉超過 90px 鬆手：同樣呼叫 JS 引擎順滑降落！
            const currentY = moveUpDist - pullDelta;
            runShredderAnimation(currentY, 0, 350);
            restoreUI({ isSeamless: true }); 
        } else if (pullDelta > 0) {
            // 拔除 CSS 位移過渡，只留 opacity
            innerCard.style.transition = `opacity 0.3s ease`;
            extensionCard.style.transition = 'none';

            // 🚀 發射！啟動 JS 幀同步引擎 (從手指放開的位置 -> 彈回頂部，耗時 400ms)
            const currentY = moveUpDist - pullDelta;
            runShredderAnimation(currentY, moveUpDist, 400);
            
            // 彈回頂部後隱形
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
            if(navigator.vibrate) navigator.vibrate(50);
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
            document.addEventListener('touchmove', onDragMove, {passive: false});
            document.addEventListener('touchend', onDragEnd);
        };

        handle.addEventListener('mousedown', (e) => { e.preventDefault(); onDragStart(e.clientY); });
        handle.addEventListener('touchstart', (e) => {
            touchTimeout = setTimeout(() => { onDragStart(e.touches[0].clientY); }, 400); 
        }, {passive: true});

        handle.addEventListener('touchmove', () => clearTimeout(touchTimeout), {passive: true});
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