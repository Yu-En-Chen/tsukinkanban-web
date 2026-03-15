// add-panel.js - 新增卡片與路線的管理面板引擎 (沙盒連動版)

let isSandboxInitialized = false;

window.openAddPanel = function() {
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
                        <div class="add-menu-inner">
                            <p style="text-align: center; opacity: 0.6; padding-top: 40px;">ここに新規カード作成のUIが入ります</p>
                        </div>
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
                            <div id="manage-cards-list" style="display: none; flex-direction: column; gap: 12px; padding-bottom: 20px;"></div>
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
window.toggleAddMenuItem = function(id) {
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
        window.closeUniversalPage = function(closeAll = false) {
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

// 🟢 渲染管理面板裡的彩色卡片膠囊 (完美漸層色彩版 + 拖拉排序引擎)
window.renderManagementCards = function() {
    const loading = document.getElementById('manage-cards-loading');
    const list = document.getElementById('manage-cards-list');
    if (!loading || !list) return;

    loading.style.display = 'none';
    list.style.display = 'flex';
    list.innerHTML = ''; 

    const currentCards = window.appRailwayData || [];

    currentCards.forEach(card => {
        const capsule = document.createElement('div');
        capsule.className = 'manage-card-capsule';
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

        // ✨ 修正排版：名字在左，把拖拉用 SVG 移回右側！
        capsule.innerHTML = `
            <div class="manage-card-name">${card.name}</div>
            <div class="manage-card-drag">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
            </div>
        `;
        list.appendChild(capsule);
    });

    initDragAndDrop(list);
};

// ============================================================================
// 🟢 頂級順滑拖拉排序引擎 (修復手機座標遺失與畫面聯動)
// ============================================================================
function initDragAndDrop(list) {
    let dragEl = null, ghostEl = null, placeholder = null;
    let startY = 0, initialTop = 0;

    const handles = list.querySelectorAll('.manage-card-drag');
    
    handles.forEach(handle => {
        const capsule = handle.closest('.manage-card-capsule');
        let pressTimer = null, checkY = 0;
        
        // ✨ 手機觸控修復：必須在 setTimeout 之前，先把座標「死死記住」！
        handle.addEventListener('touchstart', e => {
            if (e.touches.length > 1) return;
            const currentY = e.touches[0].clientY;
            const currentX = e.touches[0].clientX;
            checkY = currentY;
            
            pressTimer = setTimeout(() => {
                startDrag(capsule, currentY, currentX);
                if (navigator.vibrate) navigator.vibrate(15);
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
            startDrag(capsule, e.clientY, e.clientX);
        });
    });

    function startDrag(el, clientY, clientX) {
        dragEl = el;
        const rect = dragEl.getBoundingClientRect();
        initialTop = rect.top;
        startY = clientY;

        placeholder = document.createElement('div');
        placeholder.className = 'manage-card-placeholder';
        placeholder.style.height = `${rect.height}px`;
        dragEl.parentNode.insertBefore(placeholder, dragEl);
        
        dragEl.style.display = 'none';

        ghostEl = dragEl.cloneNode(true);
        ghostEl.style.display = 'flex';
        ghostEl.classList.add('is-dragging');
        ghostEl.style.position = 'fixed';
        ghostEl.style.top = `${initialTop}px`;
        ghostEl.style.left = `${rect.left}px`;
        ghostEl.style.width = `${rect.width}px`;
        document.body.appendChild(ghostEl);
        
        // ✨ { passive: false } 確保能呼叫 e.preventDefault() 鎖死背景捲動
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('mousemove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
        document.addEventListener('mouseup', onDragEnd);
    }

    function onDragMove(e) {
        if (!ghostEl) return;
        // ✨ 鎖定原生捲動：不管怎麼滑，頁面都不會跟著走，只有彩色膠囊會動！
        if (e.cancelable) e.preventDefault(); 
        
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const deltaY = clientY - startY;
        
        ghostEl.style.transform = `translateY(${deltaY}px) scale(1.03)`;

        const elemUnder = document.elementFromPoint(clientX, clientY);
        if (!elemUnder) return;
        const target = elemUnder.closest('.manage-card-capsule:not(.is-dragging)');
        
        if (target) {
            const targetRect = target.getBoundingClientRect();
            const isBottomHalf = clientY > targetRect.top + targetRect.height / 2;
            if (isBottomHalf) {
                target.parentNode.insertBefore(placeholder, target.nextSibling);
            } else {
                target.parentNode.insertBefore(placeholder, target);
            }
        }
    }

    function onDragEnd() {
        if (!ghostEl) return;
        
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        document.removeEventListener('mouseup', onDragEnd);

        const rect = placeholder.getBoundingClientRect();
        ghostEl.style.transition = 'top 0.2s ease, left 0.2s ease, transform 0.2s ease';
        ghostEl.style.top = `${rect.top}px`;
        ghostEl.style.left = `${rect.left}px`;
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
        const capsules = document.querySelectorAll('#manage-cards-list .manage-card-capsule');
        const newOrder = Array.from(capsules).map(c => c.dataset.id);
        
        // 1. 修改全域順序
        window.appRailwayData.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));

        // 2. ✨ 呼叫剛才開放的權限，讓主畫面立刻依新順序重新洗牌渲染！
        if (typeof window.renderMainCards === 'function') {
            window.renderMainCards(window.appRailwayData);
        }

        // 3. 寫入資料庫永久保存
        import('../data/db.js').then(module => {
            if(module.saveDisplayOrder) module.saveDisplayOrder(newOrder);
        });
    }
}