// add-panel.js - 新增卡片與路線的管理面板引擎 (沙盒連動版)

let isSandboxInitialized = false;

window.openAddPanel = function () {
    const contentHTML = `
        <div class="add-panel-container" id="add-panel-container">
            
            <div class="add-menu-item" id="add-item-1">
                <button class="add-menu-btn" onclick="window.toggleAddMenuItem('add-item-1')">
                    <div class="add-menu-text">
                        <div class="add-menu-title">新しいカードを追加</div>
                    </div>
                    <div class="add-menu-chevron">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                </button>
                <div class="add-menu-content-wrapper">
                    <div class="add-menu-content">
                        ${typeof window.getAddNewCardHTML === 'function' ? window.getAddNewCardHTML() : '<p style="text-align: center; opacity: 0.6; padding-top: 40px;">モジュールを読み込み中...</p>'}
                    </div>
                </div>
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
                        <div class="add-menu-inner">
                            <p style="text-align: center; opacity: 0.6; padding-top: 40px;">ここに路線追加のUIが入ります</p>
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

    // 🟢 第一次打開時：在背景偷偷初始化沙盒並拷貝主資料庫
    if (!isSandboxInitialized) {
        import('../data/db-add-panel.js').then(module => {
            return module.cloneFromMainDB();
        }).then(() => {
            isSandboxInitialized = true;
            window.renderManagementCards(); // 拷貝完成，繪製膠囊！
        }).catch(err => {
            console.error("[Sandbox] 初始化拷貝失敗:", err);
            window.renderManagementCards(); // 就算失敗也用當前資料硬扛繪製
        });
    } else {
        // 如果之前打開過了，就直接繪製即可
        window.renderManagementCards();
    }
};

// ✨ 展開/收起與「隱藏其他人」的專屬控制器（外部滾動徹底凍結版）
window.toggleAddMenuItem = function (id) {
    const container = document.getElementById('add-panel-container');
    const item = document.getElementById(id);
    const isExpanded = item.classList.contains('is-expanded');

    // 🟢 抓取外層所有可能產生滾動的容器
    const uniContent = document.getElementById('universal-page-content');
    const uniWrapper = document.getElementById('universal-page-wrapper');

    if (isExpanded) {
        // 收合時：恢復原本狀態
        item.classList.remove('is-expanded');
        container.classList.remove('has-expanded');

        // 🟢 歸還滾動權限（解除鎖定）
        if (uniContent) uniContent.style.overflowY = '';
        if (uniWrapper) uniWrapper.style.overflowY = '';
        document.body.style.overflow = '';
    } else {
        // 展開時：關閉其他人並展開自己
        document.querySelectorAll('.add-menu-item').forEach(el => {
            el.classList.remove('is-expanded');
        });
        item.classList.add('is-expanded');
        container.classList.add('has-expanded');

        // 🟢 徹底凍結：從外層 wrapper 到 body，把上下滾動權限全部沒收！
        // 這樣在面板外部的上空或下方滑動時，畫面絕對不會再被拉扯。
        if (uniContent) uniContent.style.overflowY = 'hidden';
        if (uniWrapper) uniWrapper.style.overflowY = 'hidden';
        document.body.style.overflow = 'hidden';
    }
};

// 🟢 終極安全裝置：當使用者按「＜」或「Ｘ」直接關閉整個通用面板時，確保自動解鎖！
if (!window.hasInjectedScrollLockHook) {
    const originalClose = window.closeUniversalPage;
    if (typeof originalClose === 'function') {
        window.closeUniversalPage = function (closeAll = false) {
            // 面板關閉瞬間，強制解除 body 與 wrapper 的鎖定防呆
            document.body.style.overflow = '';
            const uniWrapper = document.getElementById('universal-page-wrapper');
            if (uniWrapper) uniWrapper.style.overflowY = '';

            // 執行原本的關閉邏輯
            originalClose(closeAll);
        };
        window.hasInjectedScrollLockHook = true; // 防止重複註冊
    }
}

// 🟢 渲染管理面板：區分可見與隱藏卡片
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

    // 取得隱藏名單
    const dbSandbox = await import('../data/db-add-panel.js');
    const hiddenIds = dbSandbox.getHiddenCards ? dbSandbox.getHiddenCards() : [];
    
    // 只讓可見區的卡片可以被拖拉
    initDragAndDrop(visibleList);

    // =========================================================
    // ✨ 終極純物理自適應引擎：無視數量，完全以實際螢幕高度為準！
    // =========================================================
    const innerContainer = list.closest('.add-menu-inner');
    if (innerContainer) {
        // 必須使用 requestAnimationFrame，確保瀏覽器已經把剛剛生成的卡片都畫到畫面上，高度才量得準！
        requestAnimationFrame(() => {
            // 如果「內容實際總高 (scrollHeight)」 大於 「容器可視高度 (clientHeight)」，代表被螢幕切到了！
            if (innerContainer.scrollHeight > innerContainer.clientHeight+ 50) {
                innerContainer.style.overflowY = 'auto';
                innerContainer.style.overscrollBehavior = 'contain';
            } else {
                // 如果裝得下，就拉回頂部並完美鎖死維持手感
                innerContainer.scrollTop = 0; 
                innerContainer.style.overflowY = 'hidden';
            }
        });
    }
    // =========================================================
    
    const currentCards = window.appRailwayData || [];
    let visibleCount = 0;

    currentCards.forEach(card => {
        const isHidden = hiddenIds.includes(card.id);

        const capsule = document.createElement('div');
        capsule.dataset.id = card.id; 

        // 共通色彩計算...
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
            // ✨ 如果是被隱藏的卡片，變身為小膠囊並放入隱藏區
            capsule.className = 'manage-hidden-capsule';
            capsule.textContent = card.name.substring(0, 2); // 縮短為兩個字元
            capsule.onclick = () => window.toggleVisibility(card.id);
            hiddenList.appendChild(capsule);
        } else {
            // ✨ 如果是正常卡片，放入上方可見區
            visibleCount++;
            capsule.className = 'manage-card-capsule';

            // personal防呆：不給眼睛、不給隱藏
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

    // ✨ 填補虛線空位：確保畫面上永遠有 5 格的位置
    for (let i = visibleCount; i < 5; i++) {
        const empty = document.createElement('div');
        empty.className = 'empty-slot';
        empty.innerHTML = `<span style="opacity: 0.5;">空き枠</span>`;
        visibleList.appendChild(empty);
    }

    // 只讓可見區的卡片可以被拖拉
    initDragAndDrop(visibleList);
};

// 🟢 切換隱藏狀態的控制器
window.toggleVisibility = async function(id) {
    if (id === 'personal') return; 

    const dbSandbox = await import('../data/db-add-panel.js');
    let hiddenIds = dbSandbox.getHiddenCards();
    
    if (hiddenIds.includes(id)) {
        // 從隱藏名單中移除 (顯示)
        hiddenIds = hiddenIds.filter(hid => hid !== id);
    } else {
        // 加入隱藏名單 (最多 6 個 = 3格 x 2行)
        if (hiddenIds.length >= 6) {
            alert("非表示にできるカードは最大6枚です。");
            return;
        }
        hiddenIds.push(id);
    }
    
    // 將最新名單存入沙盒
    dbSandbox.saveHiddenCards(hiddenIds);
    
    // 重新繪製管理面板
    window.renderManagementCards();
    
    // 即時更新首頁畫面
    const visibleData = window.appRailwayData.filter(r => !hiddenIds.includes(r.id));
    if (typeof window.renderMainCards === 'function') {
        window.renderMainCards(visibleData);
    }

    // ✨ 將剩下的可見卡片傳給 db.js 儲存，完美避開隱藏卡片！
    const visibleCapsules = document.querySelectorAll('#manage-visible-list .manage-card-capsule');
    const visibleIds = Array.from(visibleCapsules).map(c => c.dataset.id);
    import('../data/db.js').then(module => {
        if(module.saveDisplayOrder) module.saveDisplayOrder(visibleIds);
    });
};

// ============================================================================
// 🟢 拖拉排序引擎 (純物理絕對跟手修正版)
// ============================================================================
function initDragAndDrop(list) {
    let dragEl = null, ghostEl = null, placeholder = null;
    let startY = 0; // 拔除有缺陷的 initialTop

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
            
            // ✨ 阻止電腦版瀏覽器原生的 SVG/圖片拖曳干擾！
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

        // ✨ 核心修正：將父容器設為相對定位 (relative)，並計算絕對精準的內部偏移量！
        // 這樣可以完美無視外層面板的所有 transform 縮放與位移動畫！
        dragEl.parentNode.style.position = 'relative';
        const parentRect = dragEl.parentNode.getBoundingClientRect();
        
        const relativeTop = rect.top - parentRect.top + dragEl.parentNode.scrollTop;
        const relativeLeft = rect.left - parentRect.left + dragEl.parentNode.scrollLeft;

        ghostEl.style.display = 'flex';
        ghostEl.style.position = 'absolute'; // ✨ 改為 absolute
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
        
        // 幽靈卡片純粹的物理位移
        const deltaY = clientY - startY;
        ghostEl.style.transform = `translateY(${deltaY}px) scale(1.08)`;

        // ✨ 頂級水平雷射掃描引擎 (無視空隙，純算 Y 軸座標！)
        const listContainer = document.getElementById('manage-visible-list');
        const siblings = [...listContainer.querySelectorAll('.manage-card-capsule:not(.is-dragging-active)')];
        
        // 從上到下掃描，找到第一張「中心點」在我們鼠標水平線下方的卡片
        const nextElement = siblings.find(sibling => {
            const rect = sibling.getBoundingClientRect();
            const siblingCenterY = rect.top + rect.height / 2;
            // 如果鼠標高過這張卡片的中心點，代表我們想排在它前面！
            return clientY < siblingCenterY;
        });

        // 執行雷射換位判定
        if (nextElement) {
            listContainer.insertBefore(placeholder, nextElement);
        } else {
            // 如果鼠標比所有彩色卡片都低，就插在有效卡片的最後面（要避開虛線空格）
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

        // ✨ 吸附時也必須相對於父容器計算目標位置
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