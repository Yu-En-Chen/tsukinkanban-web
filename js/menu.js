// menu.js - 左側選單互動邏輯

import { loadNativeHistory } from './history-engine.js';

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
        e.stopPropagation();
        e.preventDefault();

        const isExpanded = menuBtn.classList.toggle('is-expanded');

        document.body.classList.toggle('menu-active', isExpanded);
        // 🟢 新增：賦予專屬類別，徹底避免 CSS :has() 導致的當機
        document.body.classList.toggle('hamburger-active', isExpanded);

        if (isExpanded) {
            console.log('Menu: Expanded (Open)');
        } else {
            console.log('Menu: Collapsed (Close)');
        }
        
        loadNativeHistory('native-history-anchor');
    });

    // 4. 點擊 Esc 鍵關閉
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuBtn.classList.contains('is-expanded')) {
            menuBtn.classList.remove('is-expanded');
            document.body.classList.remove('menu-active');
            // 🟢 新增：同步移除專屬類別
            document.body.classList.remove('hamburger-active');
            console.log('Menu: Closed by ESC');
        }
    });
});