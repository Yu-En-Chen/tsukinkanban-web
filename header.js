// header.js - 頂部搜尋與膠囊選單邏輯

// 🟢 1. 建立 SVG 狀態資料庫 (將 HTML 獨立出來，乾淨且擴充性極強)
const CAPSULE_SVGS = {
    // 【原生狀態】首頁與詳情卡片使用的 SVG (加號 / 調色盤)
    nativeLeft: `
        <svg class="icon-default" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14 M12 5v14"/>
        </svg>
        <svg class="icon-hidden lucide lucide-palette-icon lucide-palette" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/>
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
        </svg>
    `,
    // 【原生狀態】右側 (選單點點點 / 外部連結)
    nativeRight: `
        <svg class="icon-default" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
        </svg>
        <svg class="icon-hidden lucide lucide-external-link-icon lucide-external-link" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        </svg>
    `,
    
    // 🟢【空白頁狀態】開啟 BlankOverlay 時專用的新 SVG (返回 / 雲端下載)
    blankLeft: `
        <svg class="icon-blank-mode lucide lucide-chevron-left-icon lucide-chevron-left" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
        </svg>
    `,
    blankRight: `
        <svg class="icon-blank-mode lucide lucide-cloud-download-icon lucide-cloud-download" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 13v8l-4-4"/><path d="m12 21 4-4"/><path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"/>
        </svg>
    `
};

export function initHeader(onSearchCallback, getActiveCardId) {
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-container');
    let isComposing = false;

    // =========================================================
    // 🟢 2. 膠囊 2D 滑動切換引擎 (完美對齊卡片動畫曲線)
    // =========================================================
    window.slideCapsuleMode = function(toBlankMode) {
        const capsule = document.getElementById('action-capsule');
        const leftBtn = document.getElementById('capsule-main-btn');
        const rightBtn = document.getElementById('capsule-secondary-btn');
        if (!capsule || !leftBtn || !rightBtn) return;

        if (toBlankMode) {
            capsule.classList.remove('slide-in-active');
            capsule.classList.add('slide-out-right');

            setTimeout(() => {
                leftBtn.innerHTML = CAPSULE_SVGS.blankLeft;
                rightBtn.innerHTML = CAPSULE_SVGS.blankRight;
                capsule.dataset.mode = 'blank';

                capsule.classList.remove('slide-out-right');
                capsule.classList.add('slide-in-left-start');

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        capsule.classList.remove('slide-in-left-start');
                        capsule.classList.add('slide-in-active');
                    });
                });
            }, 300); 

        } else {
            capsule.classList.remove('slide-in-active');
            capsule.classList.add('slide-out-left');

            setTimeout(() => {
                leftBtn.innerHTML = CAPSULE_SVGS.nativeLeft;
                rightBtn.innerHTML = CAPSULE_SVGS.nativeRight;
                capsule.dataset.mode = 'native';

                capsule.classList.remove('slide-out-left');
                capsule.classList.add('slide-in-right-start');

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        capsule.classList.remove('slide-in-right-start');
                        capsule.classList.add('slide-in-active');
                        setTimeout(() => { capsule.classList.remove('slide-in-active'); }, 300);
                    });
                });
            }, 300);
        }
    };

    // =========================================================
    // 🟢 3. 搜尋框變形與選單邏輯 (滿血復活版)
    // =========================================================
    window.toggleSearch = function(show) {
        const dismissIcon = document.getElementById('dismiss-icon');
        
        // 點擊搜尋時，如果膠囊選單開著，先把它關掉
        if (show) {
            const capsule = document.getElementById('action-capsule');
            if (capsule && capsule.classList.contains('menu-expanded')) {
                capsule.classList.remove('menu-expanded');
                searchContainer.classList.remove('menu-open'); 
                document.body.classList.remove('menu-active');
            }
        }

        // 正式執行搜尋框動畫
        if (show) {
            searchContainer.classList.add('active');
            document.body.classList.add('searching'); 
            if (dismissIcon) dismissIcon.style.opacity = '0';
            setTimeout(() => { searchInput.focus(); }, 300);
        } else {
            searchContainer.classList.remove('active');
            document.body.classList.remove('searching'); 
            searchInput.value = '';
            searchInput.blur();
            onSearchCallback(''); // 觸發清空搜尋
            if (dismissIcon && getActiveCardId()) {
                dismissIcon.style.opacity = '1';
            }
        }
    };

    window.toggleCapsuleMenu = function() {
        const capsule = document.getElementById('action-capsule');
        if (capsule.classList.contains('menu-expanded')) {
            capsule.classList.remove('menu-expanded');
            searchContainer.classList.remove('menu-open'); 
            document.body.classList.remove('menu-active');
        } else {
            capsule.classList.add('animating-shrink');
            setTimeout(() => {
                capsule.classList.remove('animating-shrink');
                capsule.classList.add('menu-expanded');
                searchContainer.classList.add('menu-open'); 
                document.body.classList.add('menu-active');
            }, 150);
        }
    };

    // =========================================================
    // 🟢 4. 膠囊按鈕智慧點擊判斷
    // =========================================================
    window.handleCapsuleMainClick = function() {
        const capsule = document.getElementById('action-capsule');
        const mode = capsule ? (capsule.dataset.mode || 'native') : 'native';

        if (mode === 'native') {
            if (capsule.classList.contains('detail-active')) {
                // 詳情頁狀態：打開空白卡片 (調色盤)
                if (typeof window.openBlankOverlay === 'function') window.openBlankOverlay();
            } else if (capsule.classList.contains('menu-expanded')) {
                // 選單展開時：點擊左側直接關閉選單
                window.toggleCapsuleMenu();
            } else {
                // 首頁狀態：預留給新增功能 (加號)
                console.log('Plus Action Triggered');
            }
        } else if (mode === 'blank') {
            // 空白卡片狀態：返回並關閉 (左箭頭)
            if (typeof window.closeBlankOverlay === 'function') window.closeBlankOverlay();
        }
    };

    window.handleCapsuleSecondaryClick = function() {
        const capsule = document.getElementById('action-capsule');
        const mode = capsule ? (capsule.dataset.mode || 'native') : 'native';

        if (mode === 'native') {
            if (capsule.classList.contains('detail-active')) {
                // 詳情頁狀態：打開外部連結
                console.log('External Link Action Triggered');
            } else {
                // 首頁狀態：打開下拉選單
                window.toggleCapsuleMenu();
            }
        } else if (mode === 'blank') {
            // 空白卡片狀態：觸發下載
            console.log('Cloud Download Action Triggered');
        }
    };

    // 點擊空白處關閉選單
    document.addEventListener('click', (e) => {
        const capsule = document.getElementById('action-capsule');
        if (capsule && capsule.classList.contains('menu-expanded') && !capsule.contains(e.target)) {
            capsule.classList.remove('menu-expanded');
            searchContainer.classList.remove('menu-open');
            document.body.classList.remove('menu-active');
        }
    });

    // 搜尋輸入監聽
    if (searchInput) {
        searchInput.addEventListener('compositionstart', () => { isComposing = true; });
        searchInput.addEventListener('compositionend', (e) => { 
            isComposing = false; 
            onSearchCallback(e.target.value); 
        });
        searchInput.addEventListener('input', (e) => { 
            if (!isComposing) onSearchCallback(e.target.value); 
        });
    }
}