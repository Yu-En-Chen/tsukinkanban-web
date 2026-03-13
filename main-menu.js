// main-menu.js - 獨立主選單的唯一控制中心

window.initDynamicMainMenu = function () {
    let container = document.getElementById('dynamic-main-menu');
    if (container) return; // 防呆：已存在就不重複建立

    container = document.createElement('div');
    container.id = 'dynamic-main-menu';
    
    // 掛載到最外層，逃脫裁切限制
    document.body.appendChild(container);

    const menuItems = [
        { icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', text: '防護中心' },
        { icon: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', text: '系統資訊' },
        { icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>', text: '聯絡我們' },
        { icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', text: '資料匯出' },
        { icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>', text: '偏好設定' }
    ];

    menuItems.forEach((item, index) => {
        const capsule = document.createElement('div');
        capsule.className = 'main-menu-capsule'; 
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