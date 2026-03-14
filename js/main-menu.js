// main-menu.js - 獨立主選單的唯一控制中心
import { menuContents } from '../data/menu-content.js';
import { initSponsorCarousel } from '../data/sponsors.js';

window.initDynamicMainMenu = function () {
    let container = document.getElementById('dynamic-main-menu');
    if (container) return; // 防呆：已存在就不重複建立

    container = document.createElement('div');
    container.id = 'dynamic-main-menu';

    // 掛載到最外層，逃脫裁切限制
    document.body.appendChild(container);

    const menuItems = [
        // 1. 表示設定 (顯示/畫面設定) - 使用螢幕圖示
        { icon: '<circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 1 0 10 10"/>',
             text: '表示設定' },
        
        // 2. 利用規約 (使用須知) - 使用文件圖示
        { icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
             text: '利用規約' },
        
        // 3. 技術情報 (技術資料) - 使用 CPU/晶片圖示
        { icon: '<path d="M12 12h.01"/><path d="M16 12h.01"/><path d="m17 7 5 5-5 5"/><path d="m7 7-5 5 5 5"/><path d="M8 12h.01"/>',
             text: 'データ元' },
        
        // 4. 当サイトについて (關於我們) - 使用 Info 圖示
        { icon: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
             text: 'アバウト' },
        
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

    capsule.onclick = () => {
        const content = menuContents[item.text] || `
            <div style="opacity: 0.8;">
                <p>這裡是「<b>${item.text}</b>」的專屬內容區塊。</p>
                <p>此區塊尚未在外部檔案中設定專屬內容。</p>
            </div>
        `;
        
        window.openUniversalPage(item.text, content);

        // ✨ 如果開啟的是贊助者頁面，等動畫稍微跑完後 (50ms)，初始化輪播圖！
        if (item.text === 'サポーター') {
            setTimeout(() => {
                initSponsorCarousel();
            }, 50);
        }
    };

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

// ============================================================================
// 🟢 動態通用子頁面引擎 (Universal Page Engine)
// ============================================================================

// 🚀 新增：返回主選單的功能
window.backToMainMenu = function() {
    window.closeUniversalPage();
    // 延遲一點點打開主選單，創造像 iOS 的「堆疊退回 (Stack Pop)」視覺感
    setTimeout(() => {
        window.toggleMainMenu();
    }, 150);
};

window.openUniversalPage = function(title, contentHTML) {
    let wrapper = document.getElementById('universal-page-wrapper');
    let navBtns = document.getElementById('universal-nav-buttons');
    const searchContainer = document.getElementById('search-container');

    // 1. 如果 DOM 還沒建立過，就動態生成它
    if (!wrapper) {
        // A. 內容區塊 (移除了原本醜醜的 close-btn)
        wrapper = document.createElement('div');
        wrapper.id = 'universal-page-wrapper';
        wrapper.className = 'universal-page-wrapper';
        wrapper.innerHTML = `
            <div class="universal-page-header">
                <h2 id="universal-page-title"></h2>
            </div>
            <div id="universal-page-content" class="universal-page-content"></div>
        `;
        searchContainer.appendChild(wrapper);

        // B. 🚀 全新導航雙圓按鈕 (含完美膠囊外框)
        navBtns = document.createElement('div');
        navBtns.id = 'universal-nav-buttons';
        navBtns.className = 'universal-nav-container'; 
        navBtns.innerHTML = `
            <div class="universal-nav-matrix"></div>
            
            <div class="universal-nav-circles">
                <button class="universal-nav-btn" onclick="window.backToMainMenu()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                </button>
                <button class="universal-nav-btn" onclick="window.closeUniversalPage()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                </button>
            </div>
        `;
        searchContainer.appendChild(navBtns);
    }

    // 2. 填入標題與內容
    document.getElementById('universal-page-title').textContent = title;
    document.getElementById('universal-page-content').innerHTML = contentHTML;

    // 3. 如果外部的主選單膠囊群還是開著的，先優雅地收起它們
    if (document.body.classList.contains('main-menu-active')) {
        window.toggleMainMenu();
    }

    // 4. 強制瀏覽器重繪
    void wrapper.offsetWidth;

    // 5. 加上狀態類別，觸發 CSS 展開玻璃與顯示內容
    document.body.classList.add('universal-active');
    
    if (window.navigator.vibrate) window.navigator.vibrate(10);
};

window.closeUniversalPage = function() {
    document.body.classList.remove('universal-active');

    if (window.navigator.vibrate) window.navigator.vibrate(5);
    
    // 關閉後徹底清理 DOM，保持 HTML 乾淨
    setTimeout(() => {
        const wrapper = document.getElementById('universal-page-wrapper');
        const navBtns = document.getElementById('universal-nav-buttons');
        if (wrapper && !document.body.classList.contains('universal-active')) {
            wrapper.remove();
            if (navBtns) navBtns.remove();
        }
    }, 500);
};