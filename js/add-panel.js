// add-panel.js - 新增卡片與路線的管理面板引擎 (手風琴展開版)

window.openAddPanel = function() {
    const contentHTML = `
        <div class="add-panel-container">
            
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
                        <div class="add-menu-inner">
                            <p style="text-align: center; opacity: 0.6; padding-top: 40px;">ここに管理・編集のUIが入ります</p>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    `;

    window.openUniversalPage('新規追加', contentHTML);
};

// ✨ 展開/收起的專屬控制器
window.toggleAddMenuItem = function(id) {
    const item = document.getElementById(id);
    const isExpanded = item.classList.contains('is-expanded');

    // 1. 先把所有其他已展開的選項收起來 (手風琴特性)
    document.querySelectorAll('.add-menu-item').forEach(el => {
        el.classList.remove('is-expanded');
    });

    // 2. 如果原本是收起的，就把它展開
    if (!isExpanded) {
        item.classList.add('is-expanded');
        
        // 3. ✨ 核心魔法：等待 150ms 讓 CSS 展開動畫啟動後，直接把它「平滑滾動到畫面最頂端」！
        // 這樣上下的其他按鈕就會瞬間被推出螢幕外。
        setTimeout(() => {
            item.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    }
};