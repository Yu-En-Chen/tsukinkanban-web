// menu.js - 左側選單互動邏輯

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('left-menu-btn');

    // 1. 安全檢查：如果找不到按鈕就報錯停止
    if (!menuBtn) {
        console.error('Menu button not found!');
        return;
    }

    // 2. 清除 HTML 可能殘留的 onclick 設定
    menuBtn.onclick = null;

    // 3. 綁定點擊事件
    menuBtn.addEventListener('click', (e) => {
        // 防止事件穿透到下層 (如 header 或 search-mask)
        e.stopPropagation();
        e.preventDefault();

        // 切換展開/收縮 Class
        const isExpanded = menuBtn.classList.toggle('is-expanded');

        // Log 狀態方便確認是否成功觸發
        if (isExpanded) {
            console.log('Menu: Expanded (Open)');
        } else {
            console.log('Menu: Collapsed (Close)');
        }
    });
    
    // 4. 點擊 Esc 鍵關閉 (桌面版友善功能)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuBtn.classList.contains('is-expanded')) {
            menuBtn.classList.remove('is-expanded');
            console.log('Menu: Closed by ESC');
        }
    });
});