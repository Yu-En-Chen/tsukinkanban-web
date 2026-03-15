// add-panel.js - 新增卡片與路線的管理面板引擎 (極簡版)

window.openAddPanel = function() {
    const contentHTML = `
        <div class="add-panel-container">
            
            <button class="add-menu-btn" onclick="alert('新しいカードを追加 - 機能開発中')">
                <div class="add-menu-text">
                    <div class="add-menu-title">新しいカードを追加</div>
                </div>
                <div class="add-menu-chevron">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
            </button>

            <button class="add-menu-btn" onclick="alert('既存のカードに路線を追加 - 機能開発中')">
                <div class="add-menu-text">
                    <div class="add-menu-title">既存のカードに路線を追加</div>
                </div>
                <div class="add-menu-chevron">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
            </button>

            <button class="add-menu-btn" onclick="alert('カードの管理・編集 - 機能開発中')">
                <div class="add-menu-text">
                    <div class="add-menu-title">カードの管理・編集</div>
                </div>
                <div class="add-menu-chevron">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
            </button>
            
        </div>
    `;

    // 呼叫通用面板引擎
    window.openUniversalPage('新規追加', contentHTML);
};