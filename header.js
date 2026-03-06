// header.js - 頂部搜尋與膠囊選單邏輯

export function initHeader(onSearchCallback, getActiveCardId) {
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-container');
    let isComposing = false;

    window.toggleSearch = function(show) {
        const dismissIcon = document.getElementById('dismiss-icon');
        
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
            onSearchCallback(''); 
            if (dismissIcon && getActiveCardId()) {
                dismissIcon.style.opacity = '1';
            }
        }
    };

    window.handleCapsuleMainClick = function() {
        console.log('Plus Action Triggered');
        // 🟢 未來的膠囊變形與展開隱藏 SVG 的邏輯可以寫在這裡
    };

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