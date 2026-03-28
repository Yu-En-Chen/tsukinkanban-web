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
    
    // 微調：讓高度剛好填滿螢幕剩下的空間
    const exactNewHeight = window.innerHeight - innerRect.top;
    
    const originalScrollHeight = scrollWrapper.style.height;
    const originalExtensionHeight = extensionCard.style.height;

    // 1. 把主卡片往上推並淡出
    innerCard.style.transition = 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.4s ease';
    innerCard.style.transform = `translateY(-${moveUpDist}px) scale(0.95)`;
    innerCard.style.opacity = '0';
    innerCard.style.pointerEvents = 'none';

    // 2. 把實心玻璃面板往上拉並加長
    extensionCard.style.transition = 'transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)';
    extensionCard.style.transform = `translateY(-${moveUpDist}px)`;
    extensionCard.style.height = `${exactNewHeight}px`;

    // 3. 把內部滾動容器加長
    scrollWrapper.style.transition = 'height 0.55s cubic-bezier(0.2, 0.8, 0.2, 1)';
    scrollWrapper.style.height = `${exactNewHeight}px`;

    // ==========================================
    // 🛠️ 第二階段：替換為編輯內容
    // ==========================================
    const originalChildren = Array.from(scrollWrapper.children);
    originalChildren.forEach(child => child.style.display = 'none');

    const editContainer = document.createElement('div');
    editContainer.id = 'edit-mode-container';
    // ✨ 終極修復：拔除 min-height: 100%，讓它根據路線數量自然生長，並防止強制產生捲動軸！
    // 加上 flex-shrink: 0 防止被擠壓。底下的按鈕會靠著 margin-top: auto 自動沉底。
    editContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; opacity: 0; transition: opacity 0.3s ease; flex-shrink: 0;';

    const dict = window.MasterRouteDictionary || {};
    const cardName = window.appRailwayData?.find(c => c.id === cardId)?.name || 'カスタムカード';
    
    editContainer.innerHTML = `
        <div style="padding: 12px 4px 20px 4px; display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 1.6em; font-weight: 800; color: #fff; letter-spacing: 0.5px;">路線の編集</div>
            <div style="font-size: 0.95em; color: var(--text-secondary); font-weight: 600;">${cardName}</div>
        </div>
        <div id="edit-list-wrapper" style="display: flex; flex-direction: column; gap: 12px;"></div>
    `;

    const listWrapper = editContainer.querySelector('#edit-list-wrapper');

    currentLineIds.forEach(lineId => {
        const lineData = dict[lineId];
        if (!lineData) return;

        const item = document.createElement('div');
        item.className = 'edit-route-item';
        item.setAttribute('data-line-id', lineId);
        
        // ✨ 改動 1：將外層變成一個「透明的排版容器」，讓膠囊與按鈕能分開並保持 12px 的間距
        item.style.cssText = `
            display: flex; align-items: center; gap: 12px; 
            transition: transform 0.2s, opacity 0.2s; 
            user-select: none; -webkit-user-select: none;
        `;

        // ✨ 改動 2：
        // - 左邊：全圓角膠囊 (border-radius: 999px)，高度縮減至 48px，只保留路線名稱
        // - 右邊：正圓形刪除按鈕 (border-radius: 50%, width: 48px, height: 48px)，大小與膠囊完美等高
        item.innerHTML = `
            <div class="route-capsule" style="display: flex; align-items: center; flex: 1; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.05); padding: 0 16px; border-radius: 999px; height: 48px; min-width: 0;">
                <div class="drag-handle" style="cursor: grab; padding-right: 12px; color: var(--text-secondary); touch-action: none; display: flex; align-items: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/></svg>
                </div>
                <div style="flex: 1; min-width: 0; pointer-events: none; display: flex; align-items: center;">
                    <div style="font-weight: 800; font-size: 1.05em; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transform: translateY(-0.5px);">${lineData.name}</div>
                </div>
            </div>
            <button class="delete-route-btn" style="flex-shrink: 0; background: rgba(255, 69, 58, 0.15); border: none; border-radius: 50%; width: 48px; height: 48px; padding: 0; color: #ff453a; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
        `;
        listWrapper.appendChild(item);
    });

    // ✨ 終極置底視覺微調 (純淨懸浮導覽列版)
    const btnContainer = document.createElement('div');
    btnContainer.className = 'flight-action-buttons-container';
    btnContainer.style.cssText = `
        /* 加入 Sticky 讓它永遠吸附在底部，z-index 確保它浮在路線清單之上 */
        position: sticky;
        bottom: 0;
        z-index: 100;
        
        margin-top: auto; 
        padding-top: 16px; /* 稍微縮小頂部間距，讓路線滑過去時更俐落 */
        /* ✨ 完美契合：維持 16px 的邊距，永遠保持等距美學！ */
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
        opacity: 0;
        transition: opacity 0.4s ease;
        flex-shrink: 0;
        
        /* 💡 絕對不加漸層背景，保留原本最乾淨的玻璃質感與尺寸！ */
    `;

    const iconCancel = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`;
    const iconSave = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;

    const createBtn = (iconHtml, text, isPrimary, onClick) => {
        const btn = document.createElement('button');
        btn.className = 'flight-action-btn';
        
        // ✨ 核心修復 3：不再亂改 inline 顏色！讓它繼承你原本漂漂亮亮的 CSS 玻璃樣式！
        // 我們唯一做的區別是：主按鈕(保存)的字體稍微加粗一點點
        const textWeight = isPrimary ? '800' : 'normal';
        
        btn.innerHTML = `${iconHtml}<span style="font-size: 0.95em; letter-spacing: -0.5px; font-weight: ${textWeight};">${text}</span>`;
        btn.onclick = (e) => {
            e.stopPropagation(); // 防止點擊穿透
            onClick(e);
        };
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
        const newOrder = Array.from(editContainer.querySelectorAll('.edit-route-item'))
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
    // ✨ 核心修復：強制將捲動軸歸零到最頂部，防止瀏覽器的「捲動記憶」讓畫面置底！
    scrollWrapper.scrollTop = 0;

    // 強制觸發瀏覽器重繪
    void editContainer.offsetWidth;
    void btnContainer.offsetWidth;

    editContainer.style.opacity = '1';
    btnContainer.style.opacity = '1';

    initDragAndDrop(editContainer);
}

// 👻 拖曳引擎邏輯維持原樣...
function initDragAndDrop(container) {
    let draggingItem = null;
    let ghost = null;
    let startY = 0;
    let initialTop = 0;
    let touchTimeout = null;

    const items = container.querySelectorAll('.edit-route-item');

    items.forEach(item => {
        const handle = item.querySelector('.drag-handle');
        const delBtn = item.querySelector('.delete-route-btn');

        delBtn.onclick = () => {
            item.style.transform = 'scale(0.95)';
            item.style.opacity = '0';
            setTimeout(() => item.remove(), 200);
        };

        const onDragStart = (clientY) => {
            if(navigator.vibrate) navigator.vibrate(50);
            draggingItem = item;
            startY = clientY;
            
            const rect = item.getBoundingClientRect();
            ghost = item.cloneNode(true);
            
            // ✨ 改動 3：幽靈外層保持透明，稍微放大
            ghost.style.cssText = `
                position: fixed; top: ${rect.top}px; left: ${rect.left}px; 
                width: ${rect.width}px; height: ${rect.height}px; 
                z-index: 9999; opacity: 0.95; 
                pointer-events: none; 
                transform: scale(1.02);
            `;
            
            // ✨ 讓懸浮在空中的膠囊亮起並產生陰影，更有「被拿起來」的物理真實感
            const ghostCapsule = ghost.querySelector('.route-capsule');
            if (ghostCapsule) {
                ghostCapsule.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)';
                ghostCapsule.style.background = 'rgba(255, 255, 255, 0.15)'; // 提亮
                ghostCapsule.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }
            
            document.body.appendChild(ghost);

            item.style.opacity = '0.2'; 
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
            if (clientY < targetMid) container.insertBefore(draggingItem, target);
            else container.insertBefore(draggingItem, target.nextSibling);
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