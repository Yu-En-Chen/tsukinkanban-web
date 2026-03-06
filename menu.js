// menu.js - 左側選單互動邏輯 (圖層解耦版)

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('left-menu-btn');
    const closeBtn = document.getElementById('menu-close-btn'); // 🟢 抓取新的獨立關閉按鈕

    // 1. 安全檢查
    if (!menuBtn || !closeBtn) {
        console.error('Menu buttons not found!');
        return;
    }

    // 2. 🟢 開啟選單 (由漢堡按鈕觸發)
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        menuBtn.classList.add('is-expanded');
        document.body.classList.add('menu-active');
    });

    // 3. 🟢 關閉選單 (由全新的獨立 X 按鈕觸發)
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        menuBtn.classList.remove('is-expanded');
        document.body.classList.remove('menu-active');
    });
    
    // 4. 點擊 Esc 鍵關閉 (桌面版友善功能)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuBtn.classList.contains('is-expanded')) {
            menuBtn.classList.remove('is-expanded');
            document.body.classList.remove('menu-active'); 
        }
    });
});
