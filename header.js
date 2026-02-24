// header.js - 頂部搜尋與膠囊選單邏輯

export function initHeader(onSearchCallback, getActiveCardId) {
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-container');
    let isComposing = false;

    // 將 HTML 需要呼叫的函數綁定到 window 上，確保 onclick 有效
    window.toggleSearch = function(show) {
        const dismissIcon = document.getElementById('dismiss-icon');
        
        if (show) {
            const capsule = document.getElementById('action-capsule');
            if (capsule && capsule.classList.contains('menu-expanded')) {
                capsule.classList.remove('menu-expanded');
                searchContainer.classList.remove('menu-open'); 
                document.body.classList.remove('menu-active');
            }
        }

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

    window.handleCapsuleMainClick = function() {
        const capsule = document.getElementById('action-capsule');
        if (capsule.classList.contains('menu-expanded')) {
            window.toggleCapsuleMenu();
        } else {
            console.log('Plus Action Triggered');
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
    searchInput.addEventListener('compositionstart', () => { isComposing = true; });
    searchInput.addEventListener('compositionend', (e) => { 
        isComposing = false; 
        onSearchCallback(e.target.value); 
    });
    searchInput.addEventListener('input', (e) => { 
        if (!isComposing) onSearchCallback(e.target.value); 
    });
}
