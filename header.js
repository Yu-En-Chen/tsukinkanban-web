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

    // 🟢 左側按鈕邏輯 (加號 / 調色盤)
    window.handleCapsuleMainClick = function() {
        // 抓取膠囊本體，檢查目前是否處於「詳情展開」的狀態
        const capsule = document.getElementById('action-capsule');
        const isDetailActive = capsule && capsule.classList.contains('detail-active');

        if (isDetailActive) {
            // 👉 狀態 A：目前顯示的是「調色盤」
            console.log('Palette Action Triggered');
            
            // 觸發你的 BlankOverlay 空白頁面引擎
            if (typeof window.openBlankOverlay === 'function') {
                window.openBlankOverlay(); 
            }
        } else {
            // 👉 狀態 B：目前顯示的是預設的「加號」
            console.log('Plus Action Triggered');
            // 未來這裡可以放新增路線的邏輯
        }
    };

    // 🟢 右側按鈕邏輯 (點點點 / 外部連結)
    window.handleCapsuleSecondaryClick = function() {
        const capsule = document.getElementById('action-capsule');
        const isDetailActive = capsule && capsule.classList.contains('detail-active');

        if (isDetailActive) {
            // 👉 狀態 A：目前顯示的是「外部連結」
            console.log('External Link Action Triggered');
            // 未來這裡可以放開啟外部網頁的邏輯
        } else {
            // 👉 狀態 B：目前顯示的是預設的「點點點」
            console.log('More Options Action Triggered');
            // 未來這裡可以放設定選單的邏輯
        }
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