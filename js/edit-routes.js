import * as db from '../data/db.js';

export function startRouteEditMode(cardId, currentLineIds) {
    const scrollWrapper = document.getElementById('card-extension-container');
    if (!scrollWrapper) return;

    // 1. 隱藏原本的所有內容 (包含原有的按鈕)
    const originalChildren = Array.from(scrollWrapper.children);
    originalChildren.forEach(child => child.style.display = 'none');

    // 2. 建立編輯模式專屬的容器
    const editContainer = document.createElement('div');
    editContainer.id = 'edit-mode-container';
    editContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; flex: 1; padding-bottom: 24px; margin-top: 8px;';
    
    const dict = window.MasterRouteDictionary || {};

    // 渲染目前的路線清單
    currentLineIds.forEach(lineId => {
        // ✨ 替換成這樣：直接從字典裡拿資料
        const lineData = dict[lineId];
        if (!lineData) return;

        const item = document.createElement('div');
        item.className = 'edit-route-item';
        item.setAttribute('data-line-id', lineId);
        
        // 高度縮小、精簡顯示的 CSS 設計
        item.style.cssText = `
            display: flex; 
            align-items: center; 
            background: rgba(255, 255, 255, 0.08); 
            padding: 12px 16px; 
            border-radius: 12px; 
            transition: transform 0.2s, opacity 0.2s; 
            user-select: none; 
            -webkit-user-select: none;
        `;

        item.innerHTML = `
            <div class="drag-handle" style="cursor: grab; padding-right: 16px; opacity: 0.5; touch-action: none;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/></svg>
            </div>
            <div style="flex: 1; min-width: 0; pointer-events: none;">
                <div style="font-weight: 700; font-size: 1.05em; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lineData.name}</div>
                <div style="font-size: 0.75em; color: var(--text-secondary);">${lineData.company}</div>
            </div>
            <button class="delete-route-btn" style="background: none; border: none; padding: 8px; margin: -8px -8px -8px 8px; color: #ff453a; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.9;">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
            </button>
        `;
        editContainer.appendChild(item);
    });

    // 3. 建立底部的新按鈕 (保存 與 取消)
    const btnContainer = document.createElement('div');
    btnContainer.className = 'flight-action-buttons-container';
    btnContainer.style.marginTop = 'auto'; // 將按鈕推到最底部

    const iconCancel = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`;
    const iconSave = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;

    const createBtn = (iconHtml, text, isPrimary, onClick) => {
        const btn = document.createElement('button');
        btn.className = 'flight-action-btn';
        if (isPrimary) btn.style.background = 'rgba(255, 255, 255, 0.15)'; // 高亮保存按鈕
        btn.innerHTML = `${iconHtml}<span style="font-size: 0.95em; letter-spacing: -0.5px;">${text}</span>`;
        btn.onclick = onClick;
        return btn;
    };

    // [取消動作]
    btnContainer.appendChild(createBtn(iconCancel, 'キャンセル', false, () => {
        editContainer.remove();
        btnContainer.remove();
        originalChildren.forEach(child => child.style.display = ''); // 恢復原狀
    }));

    // [保存動作]
    btnContainer.appendChild(createBtn(iconSave, '保存', true, async () => {
        // 抓取畫面上排序過後、尚未被刪除的最新路線 ID 陣列
        const newOrder = Array.from(editContainer.querySelectorAll('.edit-route-item'))
                              .map(item => item.getAttribute('data-line-id'));

        // 寫入使用者的 IndexedDB
        await db.saveCardPreference(cardId, { targetLineIds: newOrder });

        // 觸發全域重繪並關閉卡片，讓使用者看到最新狀態
        if (window.buildAndRender) await window.buildAndRender();
        if (window.closeAllCards) window.closeAllCards(true);
    }));

    scrollWrapper.appendChild(editContainer);
    scrollWrapper.appendChild(btnContainer);

    // 4. 啟動拖曳與刪除引擎
    initDragAndDrop(editContainer);
}

// ============================================================================
// 👻 核心邏輯：幽靈拖曳與刪除引擎 (支援滑鼠與 400ms 觸控長按)
// ============================================================================
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

        // ✨ 刪除邏輯：優雅的縮小消失動畫
        delBtn.onclick = () => {
            item.style.transform = 'scale(0.95)';
            item.style.opacity = '0';
            setTimeout(() => item.remove(), 200);
        };

        // ✨ 拖曳啟動邏輯
        const onDragStart = (clientY) => {
            if(navigator.vibrate) navigator.vibrate(50); // Haptic 手機微震動回饋
            draggingItem = item;
            startY = clientY;
            
            // 建立「幽靈元素 (Ghost)」讓它浮在畫面最上層跟著游標走
            const rect = item.getBoundingClientRect();
            ghost = item.cloneNode(true);
            ghost.style.cssText = `
                position: fixed; top: ${rect.top}px; left: ${rect.left}px; 
                width: ${rect.width}px; height: ${rect.height}px; 
                z-index: 9999; opacity: 0.95; 
                box-shadow: 0 12px 24px rgba(0,0,0,0.3); pointer-events: none; 
                transform: scale(1.02);
            `;
            document.body.appendChild(ghost);

            item.style.opacity = '0.3'; // 原本的元素變成半透明佔位符
            initialTop = rect.top;

            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
            document.addEventListener('touchmove', onDragMove, {passive: false});
            document.addEventListener('touchend', onDragEnd);
        };

        // 🖱️ 桌面版：滑鼠按下去立刻拖曳
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            onDragStart(e.clientY);
        });

        // 📱 手機版：400毫秒長按判定
        handle.addEventListener('touchstart', (e) => {
            touchTimeout = setTimeout(() => {
                onDragStart(e.touches[0].clientY);
            }, 400); 
        }, {passive: true});

        // 防呆：如果 400ms 內手指滑動了 (代表用戶想滾動頁面)，就取消拖曳判定！
        handle.addEventListener('touchmove', () => clearTimeout(touchTimeout), {passive: true});
        handle.addEventListener('touchend', () => clearTimeout(touchTimeout));
        handle.addEventListener('touchcancel', () => clearTimeout(touchTimeout));
    });

    // 拖曳移動中的判定與換位
    const onDragMove = (e) => {
        if (!draggingItem || !ghost) return;
        e.preventDefault(); // 拖曳時禁止網頁背景滾動

        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        const deltaY = clientY - startY;
        ghost.style.top = `${initialTop + deltaY}px`; // 幽靈跟著游標走

        // 碰撞偵測 (找出游標現在指著哪一條路線)
        const elements = document.elementsFromPoint(window.innerWidth / 2, clientY);
        const target = elements.find(el => el.classList.contains('edit-route-item') && el !== draggingItem);

        if (target) {
            const targetRect = target.getBoundingClientRect();
            const targetMid = targetRect.top + targetRect.height / 2;
            // 上下半部判定，決定插在前面還是後面
            if (clientY < targetMid) container.insertBefore(draggingItem, target);
            else container.insertBefore(draggingItem, target.nextSibling);
        }
    };

    // 拖曳結束：清除幽靈、歸位
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