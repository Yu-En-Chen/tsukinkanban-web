import * as db from '../data/db.js';

export function startRouteEditMode(cardId, currentLineIds) {
    const innerCard = document.querySelector('#detail-card-container .detail-card-inner');
    const extensionCard = document.querySelector('#detail-card-container .detail-extension-card');
    const scrollWrapper = document.getElementById('card-extension-container');

    if (!innerCard || !extensionCard || !scrollWrapper) return;

    // ==========================================
    // 🎬 第一階段：沈浸式過渡動畫
    // ==========================================
    const innerRect = innerCard.getBoundingClientRect();
    const moveUpDist = innerRect.height + 16; 
    const exactNewHeight = window.innerHeight - innerRect.top;
    
    const originalScrollHeight = scrollWrapper.style.height;
    const originalExtensionHeight = extensionCard.style.height;

    innerCard.style.transition = 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease';
    innerCard.style.transform = `translateY(-${moveUpDist}px) scale(0.95)`;
    innerCard.style.opacity = '0';
    innerCard.style.pointerEvents = 'none';

    extensionCard.style.transition = 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)';
    extensionCard.style.transform = `translateY(-${moveUpDist}px)`;
    extensionCard.style.height = `${exactNewHeight}px`;

    scrollWrapper.style.transition = 'height 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)';
    scrollWrapper.style.height = `${exactNewHeight}px`;

    // ==========================================
    // 🛠️ 第二階段：雙欄分離架構與隱形地基
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
            <div style="font-size: 1.6em; font-weight: 800; color: #fff; letter-spacing: 0.5px;">路線を編集</div>
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
            background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.05); 
            padding: 0 16px; border-radius: 999px; height: 48px; 
            transition: transform 0.2s, opacity 0.2s, background 0.2s; 
            user-select: none; -webkit-user-select: none;
        `;

        capsule.innerHTML = `
            <div class="drag-handle" style="cursor: grab; padding-right: 12px; color: var(--text-secondary); touch-action: none; display: flex; align-items: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-icon lucide-list"><path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/></svg>
            </div>
            <div style="flex: 1; min-width: 0; pointer-events: none; display: flex; align-items: center;">
                <div style="font-weight: 800; font-size: 1.05em; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transform: translateY(-0.5px);">${lineData.name}</div>
            </div>
        `;
        capsulesCol.appendChild(capsule);

        // 2. 生成垃圾桶 (放在右欄，與膠囊平行但互不干擾)
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-route-btn';
        delBtn.style.cssText = `
            background: rgba(255, 69, 58, 0.15); border: none; border-radius: 50%; 
            width: 48px; height: 48px; padding: 0; color: #ff453a; cursor: pointer; 
            display: flex; align-items: center; justify-content: center; 
            transition: background 0.2s, transform 0.2s, opacity 0.2s;
        `;
        delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        
        // 刪除邏輯：動態對應左欄的膠囊位置
        delBtn.onclick = () => {
            const index = Array.from(deleteBtnsCol.children).indexOf(delBtn);
            const targetCapsule = capsulesCol.children[index];
            
            targetCapsule.style.transform = 'scale(0.95)';
            targetCapsule.style.opacity = '0';
            delBtn.style.transform = 'scale(0.95)';
            delBtn.style.opacity = '0';
            
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
    const iconSave = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;

    const createBtn = (iconHtml, text, isPrimary, onClick) => {
        const btn = document.createElement('button');
        btn.className = 'flight-action-btn';
        if (isPrimary) {
            btn.style.background = 'rgba(255, 255, 255, 0.2)'; 
            btn.style.color = '#fff';
        }
        btn.innerHTML = `${iconHtml}<span style="font-size: 0.95em; letter-spacing: -0.5px; font-weight: ${isPrimary ? '800' : 'normal'};">${text}</span>`;
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
            
            innerCard.style.transform = '';
            innerCard.style.opacity = '1';
            innerCard.style.pointerEvents = 'auto';
            
            extensionCard.style.transform = '';
            extensionCard.style.height = originalExtensionHeight;
            scrollWrapper.style.height = originalScrollHeight;
            
            setTimeout(() => {
                innerCard.style.transition = '';
                extensionCard.style.transition = '';
                scrollWrapper.style.transition = '';
            }, 550);
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
            
            // ✨ 物理鎖死：強制把幽靈長寬設為當下測量到的像素值，杜絕變形！
            // ✨ 核心修復：使用 Object.assign 保留原本的 flex 排版，只附加浮空的屬性
            Object.assign(ghost.style, {
                position: 'fixed',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                zIndex: '9999',
                opacity: '0.95',
                pointerEvents: 'none',
                transform: 'scale(1.03)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxSizing: 'border-box', // 確保 padding 計算正確
                margin: '0'
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