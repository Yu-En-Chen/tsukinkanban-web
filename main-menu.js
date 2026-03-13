// main-menu.js - 獨立主選單的唯一控制中心

window.initDynamicMainMenu = function () {
    let container = document.getElementById('dynamic-main-menu');
    if (container) return; // 防呆：已存在就不重複建立

    container = document.createElement('div');
    container.id = 'dynamic-main-menu';

    // 掛載到最外層，逃脫裁切限制
    document.body.appendChild(container);

    const menuItems = [
        // 1. 表示設定 (顯示/畫面設定) - 使用螢幕圖示
        { icon: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
             text: '表示設定' },
        
        // 2. 利用規約 (使用須知) - 使用文件圖示
        { icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
             text: '利用規約' },
        
        // 3. 技術情報 (技術資料) - 使用 CPU/晶片圖示
        { icon: '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/>',
             text: '技術情報' },
        
        // 4. 当サイトについて (關於我們) - 使用 Info 圖示
        { icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
             text: '当サイトについて' },
        
        // 5. サポーター (支持我們) - 使用愛心/贊助圖示
        { icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
             text: 'サポーター' }
    ];

    // 🟢 只改這一段迴圈裡的 className，其他維持不變
    menuItems.forEach((item, index) => {
        const capsule = document.createElement('div');

        // ✨ 將你原生強大的 interactive-btn 裝備回來！
        capsule.className = 'main-menu-capsule interactive-btn';

        capsule.style.setProperty('--stagger-in', `${index * 0.06}s`);
        capsule.style.setProperty('--stagger-out', `${(4 - index) * 0.03}s`);

        capsule.innerHTML = `
        <div class="capsule-content">
            <span class="capsule-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${item.icon}
                </svg>
            </span>
            <span class="capsule-text">${item.text}</span>
        </div>
    `;
        container.appendChild(capsule);
    });
};

// 🎯 這是全域唯一的 toggleMainMenu 函數！
window.toggleMainMenu = function () {
    const isCurrentlyOpen = document.body.classList.contains('main-menu-active');
    const mask = document.getElementById('search-mask');

    if (!isCurrentlyOpen) {
        // 1. 生成 DOM
        window.initDynamicMainMenu();

        // 2. 魔法重繪：讓瀏覽器承認新 DOM 的隱藏狀態
        void document.body.offsetHeight;

        // 3. 加上標籤，觸發 CSS 彈簧波浪進場
        document.body.classList.add('main-menu-active');

        if (mask) {
            mask.dataset.originalOnclick = mask.getAttribute('onclick');
            mask.onclick = () => window.toggleMainMenu();
        }
        if (window.navigator.vibrate) window.navigator.vibrate(10);

    } else {
        document.body.classList.remove('main-menu-active');
        if (mask) {
            mask.onclick = null;
            if (mask.dataset.originalOnclick) mask.setAttribute('onclick', mask.dataset.originalOnclick);
            else mask.setAttribute('onclick', 'toggleSearch(false)');
        }
        if (window.navigator.vibrate) window.navigator.vibrate(5);
    }
};