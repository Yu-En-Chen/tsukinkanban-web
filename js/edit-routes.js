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
    innerCard.style.WebkitMaskImage = `linear-gradient(to bottom, transparent 0px, transparent 10px, black ${feather}px, black 100%)`;
    innerCard.style.WebkitMaskSize = '100% 3000px'; 
    innerCard.style.WebkitMaskPosition = `0px -${feather}px`;
    innerCard.style.WebkitMaskRepeat = 'no-repeat';

    // 🛑 瞬間完成，拒絕逐格運算：直接將內部容器高度設到位，因為它是透明的視覺不影響
    scrollWrapper.style.height = `${exactNewHeight}px`;
    void innerCard.offsetHeight; // 強制重繪

    const easeBezier = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const duration = '0.85s';

    // ==========================================
    // 🛸 頂級防護：自動貼上追蹤器、鎖死母艦，並觸發拉霸動畫
    // ==========================================
    // ✨ 核心修正：換成你 HTML 中真實的母艦 ID！
    const mainMenu = document.getElementById('action-capsule');
    
    if (mainMenu) {
        mainMenu.style.pointerEvents = 'none'; 
        
        // 抓出母艦裡面的按鈕
        const topButtons = mainMenu.querySelectorAll('button');
        topButtons.forEach(btn => {
            btn.classList.add('mothership-btn-wrapper'); 
            
            // ✨ 核心修正：因為你的按鈕裡面會切換多張 SVG，我們把它們「全部」抓出來貼標籤！
            const svgs = btn.querySelectorAll('svg');
            svgs.forEach(svg => {
                svg.classList.add('mothership-svg-icon'); 
            });
        });
    }
    
    // ✨ 4. 啟動總開關！CSS 會瞬間命中帶有追蹤器的 SVG，並把它們往上滑出
    document.body.classList.add('route-edit-active');

    // 🚀 效能解鎖 2：使用雙重 requestAnimationFrame！
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // 1. 主卡片：位移與遮罩
            // ✨ 核心魔法 1：恢復「絕對靜止」的完美傳送門，拔除遮罩的超車！
            // ✨ 核心魔法 2：壓秒消影！opacity 延遲 0.35s 才開始淡出，在卡片快到頂時完美融化最後的殘影！
            innerCard.style.transition = `transform ${duration} ${easeBezier}, opacity 0.2s ease 0.35s, -webkit-mask-position ${duration} ${easeBezier}`;
            innerCard.style.transform = `translateY(-${moveUpDist}px)`;
            innerCard.style.pointerEvents = 'none';
            
            // 遮罩精準等比位移，將裁切線死死釘在螢幕上
            innerCard.style.WebkitMaskPosition = `0px ${moveUpDist - feather}px`;
            innerCard.style.opacity = '0';

            // 2. 實心玻璃面板：
            extensionCard.style.transition = `transform ${duration} ${easeBezier}`;
            extensionCard.style.transform = `translateY(-${moveUpDist}px)`;

            // ✨ 讓母艦的 SVG 圖示跟著主卡片一起「往上滑並淡出」
            menuIcons.forEach(icon => {
                icon.style.willChange = 'transform, opacity';
                // 同步時間與曲線，稍微延遲 0.1s 淡出看起來更自然
                icon.style.transition = `transform ${duration} ${easeBezier}, opacity 0.3s ease 0.1s`;
                // 往上滑動 24px (大約是圖示的高度)，製造被推出邊界的錯覺
                icon.style.transform = `translateY(-24px)`; 
                icon.style.opacity = '0';
            });
        });
    });

    // 🧹 動畫結束後回收 GPU 資源
    setTimeout(() => {
        if (innerCard) {
            innerCard.style.willChange = 'auto';
            innerCard.style.WebkitBackfaceVisibility = '';
            // 確保歸零
            innerCard.style.opacity = '0'; 
        }
        if (extensionCard) extensionCard.style.willChange = 'auto';
    }, 550);

    // ==========================================
    // 🛠️ 第二階段：替換為編輯內容
    // ==========================================
    const originalChildren = Array.from(scrollWrapper.children);
    originalChildren.forEach(child => child.style.display = 'none');

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

    const restoreUI = () => {
        editContainer.style.opacity = '0';
        btnContainer.style.opacity = '0';
        
        setTimeout(() => {
            editContainer.remove();
            btnContainer.remove();
            originalChildren.forEach(child => child.style.display = ''); 
            
            const easeBezier = 'cubic-bezier(0.16, 1, 0.3, 1)';
            const duration = '0.85s';
            const feather = 45;

            // 重新分配 GPU
            innerCard.style.willChange = 'transform, opacity, -webkit-mask-position';
            innerCard.style.WebkitBackfaceVisibility = 'hidden';
            extensionCard.style.willChange = 'transform';
            
            // ✨ 核心修復：在下滑期間，讓容器「往下長」抵銷位移，徹底消滅裁切斷層！
            scrollWrapper.style.height = `${origClientHeight + moveUpDist}px`;
            
            // ✨ 新增細節：關閉時，觸發原生平滑捲動，讓清單優雅地洗牌回到最上方！
            scrollWrapper.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            void innerCard.offsetHeight;

            // ✨ 核心修正 1：在下滑前瞬間恢復實體透明度 (opacity: 1)
            // 由於卡片目前完全位於虛擬界線上方（被遮罩完全隱藏），瞬間恢復為 1 絕對不會閃爍。
            innerCard.style.transition = 'none';
            innerCard.style.opacity = '1';

            // 雙重 RAF 確保回程也極度滑順
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // ✨ 核心修正 2：拔除 opacity 的漸變，讓卡片維持 100% 實心被遮罩「精準吐出來」
                    innerCard.style.transition = `transform ${duration} ${easeBezier}, -webkit-mask-position ${duration} ${easeBezier}`;
                    innerCard.style.transform = '';
                    innerCard.style.pointerEvents = 'auto';
                    innerCard.style.WebkitMaskPosition = `0px -${feather}px`; 
                    
                    extensionCard.style.transition = `transform ${duration} ${easeBezier}`;
                    extensionCard.style.transform = '';

                    // ✨ 撕下標籤！CSS 偵測到標籤消失，就會自動把 SVG 降落還原回來
                    document.body.classList.remove('route-edit-active');
                });
            });
            
            // 🧹 850ms 動畫結束後
            setTimeout(() => {
                extensionCard.style.transition = '';
                
                // ✨ 動畫完全落地後，才把容器無縫縮回原本的尺寸 (此時底部已在螢幕外，絕對看不出破綻)
                scrollWrapper.style.height = originalScrollHeight;
                
                // ✨ 完美整合：解除遮罩與陰影呼吸外擴
                // 先將陰影設為透明，避免拔除遮罩時產生粗暴的爆閃
                innerCard.style.transition = 'none'; 
                innerCard.style.boxShadow = '0 0 0 rgba(0,0,0,0)'; 
                
                // 安全拔除遮罩
                innerCard.style.WebkitMaskImage = '';
                innerCard.style.WebkitMaskSize = '';
                innerCard.style.WebkitMaskPosition = '';
                innerCard.style.WebkitMaskRepeat = '';

                // 回收 GPU
                innerCard.style.willChange = 'auto';
                innerCard.style.WebkitBackfaceVisibility = '';
                extensionCard.style.willChange = 'auto';

                // ✨ 下一幀觸發陰影「像呼吸一樣」優雅舒展外擴
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        innerCard.style.transition = `box-shadow 0.4s ${easeBezier}`;
                        innerCard.style.boxShadow = ''; // 恢復 CSS 中原本的高級陰影
                        
                        setTimeout(() => {
                            innerCard.style.transition = '';
                        }, 400);
                    });
                });
                // ✨ 動畫徹底落地結束後，才把母艦的點擊權限還給使用者
                if (mainMenu) mainMenu.style.pointerEvents = ''; 
                
            }, 850);
        }, 300);
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

    scrollWrapper.appendChild(editContainer);
    scrollWrapper.appendChild(btnContainer);
    scrollWrapper.scrollTop = 0; // 強制歸零捲動軸

    void editContainer.offsetWidth;
    editContainer.style.opacity = '1';
    btnContainer.style.opacity = '1';

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