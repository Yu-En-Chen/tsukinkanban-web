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

window.toggleAddMenuItem = function(id) {
    const container = document.getElementById('add-panel-container');
    const item = document.getElementById(id);
    const isExpanded = item.classList.contains('is-expanded');

    if (isExpanded) {
        item.classList.remove('is-expanded');
        container.classList.remove('has-expanded');
    } else {
        document.querySelectorAll('.add-menu-item').forEach(el => {
            el.classList.remove('is-expanded');
        });
        item.classList.add('is-expanded');
        container.classList.add('has-expanded');
    }
};

// 🟢 渲染管理面板裡的彩色卡片膠囊
window.renderManagementCards = function() {
    const loading = document.getElementById('manage-cards-loading');
    const list = document.getElementById('manage-cards-list');
    if (!loading || !list) return;

    // 隱藏載入文字，顯示列表
    loading.style.display = 'none';
    list.style.display = 'flex';
    list.innerHTML = ''; // 清空舊資料

    // 抓取全域當前合併後的卡片資料 (這是最準確的)
    const currentCards = window.appRailwayData || [];

    currentCards.forEach(card => {
        const capsule = document.createElement('div');
        capsule.className = 'manage-card-capsule';
        capsule.style.background = card.hex; // 注入該路線的色碼

        // ✨ 自動反差色引擎：計算背景亮度，決定文字用黑色還是白色
        const hex = card.hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        capsule.style.color = luminance > 0.6 ? 'rgba(0, 0, 0, 0.85)' : '#ffffff';

        // 注入 HTML (左側標題 + 右側預留的排序把手)
        capsule.innerHTML = `
            <div class="manage-card-name">${card.name}</div>
            <div class="manage-card-drag">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
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
};