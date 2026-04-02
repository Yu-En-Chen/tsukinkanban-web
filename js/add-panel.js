// add-panel.js - 新增卡片與路線的管理面板引擎 (沙盒連動版)

let isSandboxInitialized = false;

window.openAddPanel = function () {
    const contentHTML = `
        <div class="add-panel-container" id="add-panel-container">
            
            <div class="add-menu-item" id="add-item-1">
                <button class="add-menu-btn" onclick="window.createNewCardAndEdit()">
                    <div class="add-menu-text">
                        <div class="add-menu-title">新しいカードを追加</div>
                    </div>
                    <div class="add-menu-chevron">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                </button>
            </div>

            <div class="add-menu-item" id="add-item-2">
                <button class="add-menu-btn" onclick="window.toggleAddMenuItem('add-item-2')">
                    <div class="add-menu-text">
                        <div class="add-menu-title">既存のカードに路線を追加</div>
                    </div>
                    <div class="add-menu-chevron">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </button>
                <div class="add-menu-content-wrapper">
                    <div class="add-menu-content">
                        <div class="add-menu-inner" style="padding: 16px;">
                            
                            <div style="position: relative; margin-bottom: 12px;">
                                <input type="text" id="dict-search-input" placeholder="路線名や会社名で検索..." 
                                       oninput="window.handleDictSearch()"
                                       style="width: 100%; padding: 12px 16px 12px 38px; border-radius: 12px; border: none; background: rgba(120, 120, 128, 0.12); color: inherit; font-size: 16px; outline: none; box-sizing: border-box;">
                                <svg style="position: absolute; left: 12px; top: 12px; opacity: 0.5;" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                            
                            <div id="dict-search-results" style="max-height: 45vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                                <p style="text-align: center; opacity: 0.5; padding: 20px 0; font-size: 0.9em;">追加したい路線を検索してください</p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div class="add-menu-item" id="add-item-3">
                <button class="add-menu-btn" onclick="window.toggleAddMenuItem('add-item-3')">
                    <div class="add-menu-text">
                        <div class="add-menu-title">カードの管理・編集</div>
                    </div>
                    <div class="add-menu-chevron">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </button>
                <div class="add-menu-content-wrapper">
                    <div class="add-menu-content">
                        <div class="add-menu-inner" style="padding-top: 10px;">
                            <p id="manage-cards-loading" style="text-align: center; opacity: 0.6; padding-top: 40px;">データを読み込み中...</p>
                            <div id="manage-cards-list" style="display: none; flex-direction: column; gap: 12px; padding-bottom: 20px;">
                            <div id="manage-visible-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
                            <div class="manage-separator"></div>
                            <div id="manage-hidden-list" class="manage-hidden-area"></div>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    `;

    window.openUniversalPage('新規追加', contentHTML);

    if (!isSandboxInitialized) {
        import('../data/db-add-panel.js').then(module => {
            return module.cloneFromMainDB();
        }).then(() => {
            isSandboxInitialized = true;
            window.renderManagementCards(); 
        }).catch(err => {
            console.error("[Sandbox] 初始化拷貝失敗:", err);
            window.renderManagementCards(); 
        });
    } else {
        window.renderManagementCards();
    }
};

// ============================================================================
// ✨ 雲端字典專屬：極速搜尋過濾引擎 (Dictionary Search)
// ============================================================================
window.handleDictSearch = function() {
    const keyword = document.getElementById('dict-search-input').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('dict-search-results');

    // 1. 如果輸入框是空的，顯示預設提示
    if (!keyword) {
        resultsContainer.innerHTML = '<p style="text-align: center; opacity: 0.5; padding: 20px 0; font-size: 0.9em;">追加したい路線を検索してください</p>';
        return;
    }

    // 2. 防呆：檢查字典有沒有從雲端抓成功
    if (!window.MasterRouteDictionary) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #ff453a; padding: 20px 0;">サーバーから辞書データを取得できません</p>';
        return;
    }

    const dict = window.MasterRouteDictionary;
    const results = [];

    // 3. 遍歷整個雲端字典進行關鍵字比對 (支援搜路線名、公司名、甚至是羅馬拼音如果有的話)
    for (const rw_id in dict) {
        const route = dict[rw_id];
        
        // 基礎全形轉半形/假名轉換可以在這裡做，目前先用最基礎的小寫比對
        if (route.name.toLowerCase().includes(keyword) || 
            route.company.toLowerCase().includes(keyword)) {
            results.push(route);
        }
    }

    // 4. 如果沒搜到東西
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; opacity: 0.5; padding: 20px 0; font-size: 0.9em;">該当する路線が見つかりません</p>';
        return;
    }

    // 5. 為了效能，最多只顯示前 30 筆結果，防止畫面卡頓
    const displayResults = results.slice(0, 30);

    resultsContainer.innerHTML = displayResults.map(route => `
        <div style="padding: 12px 16px; background: rgba(120, 120, 128, 0.08); border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 4px;"
             onclick="window.selectDictionaryRoute('${route.id}')">
            <div style="font-weight: 600; font-size: 1.05em; display: flex; align-items: center; justify-content: space-between;">
                ${route.name}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.4;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
            <div style="font-size: 0.8em; opacity: 0.6;">${route.company}</div>
        </div>
    `).join('');
};

// ============================================================================
// ✨ 選擇路線後的行為 (未來將會把這個 ID 綁定到使用者的卡片上)
// ============================================================================
window.selectDictionaryRoute = async function(routeId) {
    const route = window.MasterRouteDictionary[routeId];
    if (!route) return;

    // 先跳出確認視窗，讓使用者知道他選中了什麼
    const confirm = await window.iosConfirm(
        "路線の追加", 
        `「${route.company} ${route.name}」を選択しました。\nこの路線をカードに追加しますか？\n(カードへの紐付け機能は次回実装予定です)`,
        "OK", "キャンセル"
    );
    
    if (confirm) {
         console.log(`[準備綁定路線] ID: ${routeId}, Name: ${route.name}`);
         // 未來這裡會呼叫 db.js 把 routeId 塞進目前卡片的 targetLineIds 裡面
    }
};

window.toggleAddMenuItem = function (id) {
    const container = document.getElementById('add-panel-container');
    const item = document.getElementById(id);
    const isExpanded = item.classList.contains('is-expanded');

    const uniContent = document.getElementById('universal-page-content');
    const uniWrapper = document.getElementById('universal-page-wrapper');

    if (isExpanded) {
        item.classList.remove('is-expanded');
        container.classList.remove('has-expanded');

        if (uniContent) uniContent.style.overflowY = '';
        if (uniWrapper) uniWrapper.style.overflowY = '';
        document.body.style.overflow = '';
    } else {
        document.querySelectorAll('.add-menu-item').forEach(el => {
            el.classList.remove('is-expanded');
        });
        item.classList.add('is-expanded');
        container.classList.add('has-expanded');

        if (uniContent) uniContent.style.overflowY = 'hidden';
        if (uniWrapper) uniWrapper.style.overflowY = 'hidden';
        document.body.style.overflow = 'hidden';
    }
};

if (!window.hasInjectedScrollLockHook) {
    const originalClose = window.closeUniversalPage;
    if (typeof originalClose === 'function') {
        window.closeUniversalPage = function (closeAll = false) {
            document.body.style.overflow = '';
            const uniWrapper = document.getElementById('universal-page-wrapper');
            if (uniWrapper) uniWrapper.style.overflowY = '';
            originalClose(closeAll);
        };
        window.hasInjectedScrollLockHook = true; 
    }
}

window.renderManagementCards = async function() {
    const loading = document.getElementById('manage-cards-loading');
    const list = document.getElementById('manage-cards-list');
    const visibleList = document.getElementById('manage-visible-list');
    const hiddenList = document.getElementById('manage-hidden-list');
    
    if (!loading || !list) return;

    loading.style.display = 'none';
    list.style.display = 'flex';
    visibleList.innerHTML = ''; 
    hiddenList.innerHTML = '';

    const dbSandbox = await import('../data/db-add-panel.js');
    const hiddenIds = dbSandbox.getHiddenCards ? dbSandbox.getHiddenCards() : [];
    
    initDragAndDrop(visibleList);

    const innerContainer = list.closest('.add-menu-inner');
    if (innerContainer) {
        requestAnimationFrame(() => {
            if (innerContainer.scrollHeight > innerContainer.clientHeight+ 50) {
                innerContainer.style.overflowY = 'auto';
                innerContainer.style.overscrollBehavior = 'contain';
            } else {
                innerContainer.scrollTop = 0; 
                innerContainer.style.overflowY = 'hidden';
            }
        });
    }
    
    // 🛡️ 防護罩：管理面板永遠只畫出「真實存在」的卡片，徹底過濾幽靈
    const currentCards = window.appRailwayData ? window.appRailwayData.filter(r => !r.isTemporarySearch && r.id !== 'temp-search-route') : [];
    let visibleCount = 0;

    currentCards.forEach(card => {
        const isHidden = hiddenIds.includes(card.id);

        const capsule = document.createElement('div');
        capsule.dataset.id = card.id; 

        let hex = card.hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
        const rF = r / 255, gF = g / 255, bF = b / 255;
        const max = Math.max(rF, gF, bF), min = Math.min(rF, gF, bF);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case rF: h = (gF - bF) / d + (gF < bF ? 6 : 0); break;
                case gF: h = (bF - rF) / d + 2; break;
                case bF: h = (rF - gF) / d + 4; break;
            }
            h /= 6;
        }
        h *= 360; s *= 100; l *= 100;

        let topShift = 17, bottomShift = 17;
        if (l > 95) { topShift = 0; bottomShift = 35; }
        else if (l > 60) { topShift = 4; bottomShift = 14; }
        else if (l < 5) { topShift = 26; bottomShift = 0; }
        else if (l < 40) { topShift = 14; bottomShift = 4; }

        capsule.style.background = `linear-gradient(135deg, hsl(${h}, ${s}%, ${Math.min(100, l + topShift)}%), hsl(${h}, ${s}%, ${Math.max(0, l - bottomShift)}%))`;
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        capsule.style.color = luminance > 0.55 ? 'rgba(0, 0, 0, 0.85)' : '#ffffff';
        if (l > 95) capsule.style.border = '1px solid rgba(0,0,0,0.08)';

        if (isHidden) {
            capsule.className = 'manage-hidden-capsule';
            capsule.textContent = card.name.substring(0, 2); 
            capsule.onclick = () => window.toggleVisibility(card.id);
            hiddenList.appendChild(capsule);
        } else {
            visibleCount++;
            capsule.className = 'manage-card-capsule';

            const eyeIconHTML = card.id === 'personal'
                ? `<div style="width: 20px; height: 20px; pointer-events: none;"></div>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9;"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`;

            capsule.innerHTML = `
                <div class="manage-card-visibility" ${card.id !== 'personal' ? `onclick="window.toggleVisibility('${card.id}')"` : 'style="cursor: default;"'}>
                    ${eyeIconHTML}
                </div>
                <div class="manage-card-name">${card.name}</div>
                <div class="manage-card-drag">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9;">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                </div>
            `;
            visibleList.appendChild(capsule);
        }
    });

    const hasCustomHidden = hiddenIds.some(hid => hid.startsWith('new-card-') || hid.startsWith('custom-'));
    
    if (hasCustomHidden) {
        const deleteAllBtn = document.createElement('div');
        deleteAllBtn.className = 'manage-hidden-capsule delete-all-hidden-btn';
        deleteAllBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
        deleteAllBtn.onclick = () => window.deleteAllHiddenCards();
        hiddenList.appendChild(deleteAllBtn);
    }

    for (let i = visibleCount; i < 5; i++) {
        const empty = document.createElement('div');
        empty.className = 'empty-slot';
        empty.innerHTML = `<span style="opacity: 0.5;">空き枠</span>`;
        visibleList.appendChild(empty);
    }

    initDragAndDrop(visibleList);
};

window.toggleVisibility = async function(id) {
    if (id === 'personal') return; 

    const dbSandbox = await import('../data/db-add-panel.js');
    let hiddenIds = dbSandbox.getHiddenCards();
    
    if (hiddenIds.includes(id)) {
        const visibleCount = window.appRailwayData.filter(r => !hiddenIds.includes(r.id)).length;
        if (visibleCount >= 5) {
            await window.iosConfirm(
                "表示上限に達しました", 
                "表示できるカードは最大5枚です。\nこれ以上表示する場合は、先に他のカードを非表示にしてください。",
                "OK", null 
            );
            return; 
        }
        hiddenIds = hiddenIds.filter(hid => hid !== id);
    } else {
        if (hiddenIds.length >= 5) {
            const oldestCustomId = hiddenIds.find(hid => hid.startsWith('new-card-') || hid.startsWith('custom-'));

            if (oldestCustomId) {
                const targetCard = window.appRailwayData.find(c => c.id === oldestCustomId);
                const targetName = targetCard ? targetCard.name : 'カスタムカード';

                const confirmDelete = await window.iosConfirm(
                    "非表示の上限に達しました", 
                    `非表示にできるカードは最大5枚です。\nこれ以上隠す場合、\n「${targetName}」\nが完全に削除されます。\n続行しますか？`,
                    "削除して続行", "キャンセル", true
                );
                if (!confirmDelete) return; 

                hiddenIds = hiddenIds.filter(hid => hid !== oldestCustomId);
                window.appRailwayData = window.appRailwayData.filter(r => r.id !== oldestCustomId);
                const db = await import('../data/db.js');
                if (db.deleteRoutePreference) await db.deleteRoutePreference(oldestCustomId);
                
                hiddenIds.push(id);
            } else {
                await window.iosConfirm(
                    "非表示の上限に達しました", 
                    "非表示にできるカードは最大5枚です。\n現在非表示のカードはすべて「初期カード」のため削除できません。\n先に他のカードを表示してください。",
                    "OK", null
                );
                return;
            }
        } else {
            hiddenIds.push(id);
        }
    }
    
    dbSandbox.saveHiddenCards(hiddenIds);
    window.renderManagementCards();
    
    const visibleData = window.appRailwayData.filter(r => !hiddenIds.includes(r.id));
    if (typeof window.renderMainCards === 'function') window.renderMainCards(visibleData);

    const visibleCapsules = document.querySelectorAll('#manage-visible-list .manage-card-capsule');
    const visibleIds = Array.from(visibleCapsules).map(c => c.dataset.id);
    import('../data/db.js').then(module => {
        if(module.saveDisplayOrder) module.saveDisplayOrder(visibleIds);
    });
};

function initDragAndDrop(list) {
    let dragEl = null, ghostEl = null, placeholder = null;
    let startY = 0; 

    const handles = list.querySelectorAll('.manage-card-drag');
    
    handles.forEach(handle => {
        const capsule = handle.closest('.manage-card-capsule');
        let pressTimer = null, checkY = 0;
        
        handle.addEventListener('touchstart', e => {
            if (e.touches.length > 1) return;
            const currentY = e.touches[0].clientY;
            const currentX = e.touches[0].clientX;
            checkY = currentY;
            
            pressTimer = setTimeout(() => {
                startDrag(capsule, currentY, currentX);
                if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
            }, 400); 
        }, { passive: true });
        
        handle.addEventListener('touchmove', e => {
            if (pressTimer && Math.abs(e.touches[0].clientY - checkY) > 10) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        }, { passive: true });
        
        const clearTouch = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
        handle.addEventListener('touchend', clearTouch);
        handle.addEventListener('touchcancel', clearTouch);
        
        handle.addEventListener('mousedown', e => {
            if (e.button !== 0) return; 
            e.preventDefault(); 
            startDrag(capsule, e.clientY, e.clientX);
        });
    });

    function startDrag(el, clientY, clientX) {
        dragEl = el;
        const rect = dragEl.getBoundingClientRect();
        startY = clientY;

        ghostEl = dragEl.cloneNode(true);
        placeholder = document.createElement('div');
        placeholder.className = 'manage-card-placeholder';
        placeholder.style.height = `${rect.height}px`;
        dragEl.parentNode.insertBefore(placeholder, dragEl);
        
        dragEl.style.display = 'none';

        dragEl.parentNode.style.position = 'relative';
        const parentRect = dragEl.parentNode.getBoundingClientRect();
        
        const relativeTop = rect.top - parentRect.top + dragEl.parentNode.scrollTop;
        const relativeLeft = rect.left - parentRect.left + dragEl.parentNode.scrollLeft;

        ghostEl.style.display = 'flex';
        ghostEl.style.position = 'absolute'; 
        ghostEl.style.top = `${relativeTop}px`;
        ghostEl.style.left = `${relativeLeft}px`;
        ghostEl.style.width = `${rect.width}px`;
        ghostEl.style.zIndex = '999999'; 
        
        ghostEl.classList.add('is-dragging-active');
        ghostEl.style.transition = 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)';
        dragEl.parentNode.appendChild(ghostEl);

        requestAnimationFrame(() => {
            ghostEl.style.transform = `translateY(0px) scale(1.08)`;
        });
        
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('mousemove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
        document.addEventListener('mouseup', onDragEnd);
    }

    function onDragMove(e) {
        if (!ghostEl) return;
        if (e.cancelable) e.preventDefault(); 
        
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        const deltaY = clientY - startY;
        ghostEl.style.transform = `translateY(${deltaY}px) scale(1.08)`;

        const listContainer = document.getElementById('manage-visible-list');
        const siblings = [...listContainer.querySelectorAll('.manage-card-capsule:not(.is-dragging-active)')];
        
        const nextElement = siblings.find(sibling => {
            const rect = sibling.getBoundingClientRect();
            const siblingCenterY = rect.top + rect.height / 2;
            return clientY < siblingCenterY;
        });

        if (nextElement) {
            listContainer.insertBefore(placeholder, nextElement);
        } else {
            const firstEmptySlot = listContainer.querySelector('.empty-slot');
            if (firstEmptySlot) {
                listContainer.insertBefore(placeholder, firstEmptySlot);
            } else {
                listContainer.appendChild(placeholder);
            }
        }
    }

    function onDragEnd() {
        if (!ghostEl) return;
        
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        document.removeEventListener('mouseup', onDragEnd);

        const pRect = placeholder.getBoundingClientRect();
        const parentRect = placeholder.parentNode.getBoundingClientRect();
        
        const relativeTop = pRect.top - parentRect.top + placeholder.parentNode.scrollTop;
        const relativeLeft = pRect.left - parentRect.left + placeholder.parentNode.scrollLeft;

        ghostEl.style.transition = 'top 0.2s ease, left 0.2s ease, transform 0.2s ease';
        ghostEl.style.top = `${relativeTop}px`;
        ghostEl.style.left = `${relativeLeft}px`;
        ghostEl.style.transform = 'scale(1)'; 

        setTimeout(() => {
            placeholder.parentNode.insertBefore(dragEl, placeholder);
            dragEl.style.display = 'flex';
            placeholder.remove();
            ghostEl.remove();
            
            saveNewOrder();
            
            dragEl = null; ghostEl = null; placeholder = null;
        }, 200);
    }

    function saveNewOrder() {
        const capsules = document.querySelectorAll('#manage-visible-list .manage-card-capsule');
        const visibleIds = Array.from(capsules).map(c => c.dataset.id);
        
        import('../data/db-add-panel.js').then(sandbox => {
            const hiddenIds = sandbox.getHiddenCards();
            
            const newOrder = [...visibleIds, ...hiddenIds];
            window.appRailwayData.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));

            const visibleData = window.appRailwayData.filter(r => !hiddenIds.includes(r.id));
            if (typeof window.renderMainCards === 'function') {
                window.renderMainCards(visibleData);
            }

            import('../data/db.js').then(module => {
                if(module.saveDisplayOrder) module.saveDisplayOrder(visibleIds);
            });
        });
    }
}

// ✨ 讓函數可以接收 prefillData (預填資料)
window.createNewCardAndEdit = async function(prefillData = null) {
    if (!window.appRailwayData) window.appRailwayData = [];

    // 🧹 ✨ 核心修復：在做任何事之前，先「超渡」殘留的幽靈卡片！
    // 必須在「檢查數量上限」前執行，否則被 return 擋下後，幽靈卡片會殘留在記憶體裡，
    // 導致使用者在管理面板看到它，誤以為系統偷偷把它存起來了！
    window.appRailwayData = window.appRailwayData.filter(r => !r.isTemporarySearch && r.id !== 'temp-search-route');

    if (!isSandboxInitialized) {
        try {
            const initModule = await import('../data/db-add-panel.js');
            if (initModule.cloneFromMainDB) await initModule.cloneFromMainDB();
            isSandboxInitialized = true;
        } catch(e) {
            console.error("[Sandbox] 初始化失敗:", e);
        }
    }

    const dbSandbox = await import('../data/db-add-panel.js');
    const hiddenIds = dbSandbox.getHiddenCards ? dbSandbox.getHiddenCards() : [];

    // 這裡的計算已經很安全了，因為前面已經把幽靈卡片清掉了
    const visibleCount = window.appRailwayData.filter(r => !hiddenIds.includes(r.id)).length;

    if (visibleCount >= 5) {
        const goToManage = await window.iosConfirm(
            "表示上限に達しました", 
            "表示できるカードは最大5枚です。\nこれ以上追加する場合は、既存のカードを非表示にしてください。",
            "管理画面へ", 
            "キャンセル" 
        );

        if (goToManage) {
            const addPanel = document.getElementById('add-panel-container');
            if (!addPanel) {
                if (window.openAddPanel) window.openAddPanel();
                setTimeout(() => {
                    const manageItem = document.getElementById('add-item-3');
                    if (manageItem && !manageItem.classList.contains('is-expanded')) {
                        window.toggleAddMenuItem('add-item-3');
                    }
                }, 350); 
            } else {
                const manageItem = document.getElementById('add-item-3');
                const scrollContainer = document.getElementById('universal-page-content') || document.getElementById('universal-page-wrapper');
                if (manageItem && scrollContainer) {
                    const targetY = scrollContainer.scrollTop + manageItem.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top - 24;
                    scrollContainer.style.overflowY = 'auto';
                    scrollContainer.scrollTo({ top: targetY, behavior: 'smooth' });
                    setTimeout(() => {
                        if (!manageItem.classList.contains('is-expanded')) window.toggleAddMenuItem('add-item-3');
                    }, 350);
                } else {
                    window.toggleAddMenuItem('add-item-3');
                }
            }
        }
        return; // 🛑 完美停止：幽靈已被清除，資料庫也不會被寫入！
    }

    if (typeof window.closeUniversalPage === 'function') window.closeUniversalPage(true);

    setTimeout(async () => {
        const existingNumbers = window.appRailwayData
            .map(c => c.id)
            .filter(id => id.startsWith('new-card-') || id.startsWith('custom-'))
            .map(id => parseInt(id.replace('new-card-', '').replace('custom-', ''), 10))
            .filter(num => !isNaN(num))
            .sort((a, b) => a - b);
            
        let nextNum = 1;
        for (let num of existingNumbers) {
            if (num === nextNum) nextNum++;
            else if (num > nextNum) break; 
        }
        const newId = `new-card-${nextNum}`;

        const newName = prefillData && prefillData.name ? prefillData.name : '新規カード';
        const newHex = prefillData && prefillData.hex ? prefillData.hex : '#2C2C2E';
        const newTargetLineIds = prefillData && prefillData.targetLineIds ? prefillData.targetLineIds : [];
        const newStatus = prefillData && prefillData.status ? prefillData.status : '平常運転';

        const newCard = {
            id: newId,
            name: newName,
            kana: 'しんきかーど',
            status: 'カスタム',      
            desc: prefillData && prefillData.desc ? prefillData.desc : 'カスタム追加されたカード', 
            detail: prefillData && prefillData.detail ? prefillData.detail : ['カスタマイズ可能', '-', '-', '-'],   
            hex: newHex,
            isCustom: true,
            targetLineIds: newTargetLineIds,
            detailedLines: prefillData && prefillData.detailedLines ? prefillData.detailedLines : [],
            statusFlags: prefillData && prefillData.statusFlags ? prefillData.statusFlags : [false, false, false, false, false, false, false],
            
            // ✈️ 關鍵修復：新卡片生成時，必須確認並繼承飛機的血統！
            isFlightCard: prefillData && prefillData.isFlightCard ? prefillData.isFlightCard : false,
            flightData: prefillData && prefillData.flightData ? prefillData.flightData : null
        };

        // 🧹 清除幽靈標記，避免這張實體卡片被系統當作預覽卡片刪掉
        delete newCard.isTemporarySearch;
        // 🧹 如果系統有綁定舊的 DOM 元素緩存，一併清掉強制系統重繪
        delete newCard.cardElement;

        // 直接將新卡片加入最前面
        window.appRailwayData.unshift(newCard);

        const updatedVisibleData = window.appRailwayData.filter(r => !hiddenIds.includes(r.id));
        const visibleIds = updatedVisibleData.map(c => c.id);

        const db = await import('../data/db.js');
        if (db.saveDisplayOrder) db.saveDisplayOrder(visibleIds);
        
        if (db.saveRoutePreference) {
            await db.saveRoutePreference(newId, newName, newHex, newTargetLineIds.length > 0 ? newTargetLineIds : null);
        }
        
        if (newTargetLineIds.length > 0 && db.updateCardRoutes) {
            await db.updateCardRoutes(newId, newTargetLineIds);
        }

        if (typeof window.renderMainCards === 'function') {
            window.renderMainCards(updatedVisibleData);
        }

        setTimeout(() => {
            const targetCard = document.getElementById(`card-${newId}`);
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

                setTimeout(() => {
                    targetCard.click(); 

                    setTimeout(() => {
                        if (typeof window.openBlankOverlay === 'function') {
                            window.openBlankOverlay(newCard.hex);
                            setTimeout(() => {
                                const nameLabel = document.getElementById('p-btn-label');
                                if (nameLabel) nameLabel.click();
                            }, 550); 
                        }
                    }, 650); 
                }, 350); 
            }
        }, 100); 

    }, 300);
};

window.deleteAllHiddenCards = async function() {
    const dbSandbox = await import('../data/db-add-panel.js');
    const hiddenIds = dbSandbox.getHiddenCards();
    
    const customHiddenIds = hiddenIds.filter(hid => hid.startsWith('new-card-') || hid.startsWith('custom-'));
    if (customHiddenIds.length === 0) return;

    const confirmDelete = await window.iosConfirm(
        "カスタムカードを削除", 
        "非表示の「カスタムカード」をすべて完全に削除します。\n(初期カードは削除されず残ります)\n\nこの操作は取り消せません。",
        "すべて削除", 
        "キャンセル", 
        true 
    );
    if (!confirmDelete) return;

    window.appRailwayData = window.appRailwayData.filter(r => !customHiddenIds.includes(r.id));

    const db = await import('../data/db.js');
    if (db.deleteRoutePreference) {
        for (const id of customHiddenIds) {
            await db.deleteRoutePreference(id);
        }
    }

    const remainingHiddenIds = hiddenIds.filter(hid => !customHiddenIds.includes(hid));
    dbSandbox.saveHiddenCards(remainingHiddenIds);

    window.renderManagementCards();

    const visibleCapsules = document.querySelectorAll('#manage-visible-list .manage-card-capsule');
    const visibleIds = Array.from(visibleCapsules).map(c => c.dataset.id);
    if(db.saveDisplayOrder) db.saveDisplayOrder(visibleIds);
};