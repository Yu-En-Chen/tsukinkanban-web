// add-panel.js - 新增卡片與路線的管理面板引擎

window.openAddPanel = function() {
    const contentHTML = `
        <div class="add-panel-container">
            
            <button class="add-menu-btn" onclick="alert('增加新卡片 - 機能開発中')">
                <div class="add-menu-icon" style="background: rgba(10, 132, 255, 0.15); color: #0a84ff;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="18" height="14" x="3" y="5" rx="2" ry="2"/>
                        <path d="M12 8v8"/><path d="M8 12h8"/>
                    </svg>
                </div>
                <div class="add-menu-text">
                    <div class="add-menu-title">新しい看板を追加</div>
                    <div class="add-menu-desc">新規路線や駅を検索して看板を作成します</div>
                </div>
                <div class="add-menu-chevron">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
            </button>

            <button class="add-menu-btn" onclick="alert('添加新路線 - 機能開発中')">
                <div class="add-menu-icon" style="background: rgba(48, 209, 88, 0.15); color: #30d158;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h21v10"/><path d="M16 11h6"/><path d="M19 8v6"/>
                    </svg>
                </div>
                <div class="add-menu-text">
                    <div class="add-menu-title">既存の看板に路線を追加</div>
                    <div class="add-menu-desc">作成済みの看板に別の路線を統合します</div>
                </div>
                <div class="add-menu-chevron">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
            </button>

            <button class="add-menu-btn" onclick="alert('管理既有卡片 - 機能開発中')">
                <div class="add-menu-icon" style="background: rgba(94, 92, 230, 0.15); color: #5e5ce6;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m16 13 5.223 5.222a.5.5 0 0 1 0 .706l-2.122 2.122a.5.5 0 0 1-.706 0L13 16"/><path d="m14 14-1-1"/><path d="M8 12 6 8.5 2 7l4.5-2L8 2l2 4.5L14 8l-2 4.5z"/>
                    </svg>
                </div>
                <div class="add-menu-text">
                    <div class="add-menu-title">看板の管理・編集</div>
                    <div class="add-menu-desc">並び替え、削除、名称の変更を行います</div>
                </div>
                <div class="add-menu-chevron">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
            </button>
            
        </div>
    `;

    // 呼叫我們剛剛修好的通用面板引擎
    window.openUniversalPage('新規追加', contentHTML);
};