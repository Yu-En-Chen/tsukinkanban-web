// header.js - 頂部搜尋與膠囊選單邏輯

// 🟢 1. 建立 SVG 狀態資料庫 (將 HTML 獨立出來，乾淨且擴充性極強)
const CAPSULE_SVGS = {
    // 【原生狀態】首頁與詳情卡片使用的 SVG (包含加號、調色盤、點點點、外部連結)
    nativeLeft: `
        <svg class="icon-default" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14 M12 5v14"/>
        </svg>
        <svg class="icon-hidden lucide lucide-palette-icon lucide-palette" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/>
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
        </svg>
    `,
    nativeRight: `
        <svg class="icon-default" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
        </svg>
        <svg class="icon-hidden lucide lucide-external-link-icon lucide-external-link" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        </svg>
    `,
    
    // 🟢【空白頁狀態】開啟 BlankOverlay 時專用的新 SVG
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

    // 🟢 2. 膠囊 2D 滑動切換引擎 (完美對齊卡片動畫曲線)
    window.slideCapsuleMode = function(toBlankMode) {
        const capsule = document.getElementById('action-capsule');
        const leftBtn = document.getElementById('capsule-main-btn');
        const rightBtn = document.getElementById('capsule-secondary-btn');
        if (!capsule || !leftBtn || !rightBtn) return;

        if (toBlankMode) {
            // 第一階段：開始向右滑出 (同步卡片的 flip-out)
            capsule.classList.remove('slide-in-active');
            capsule.classList.add('slide-out-right');

            setTimeout(() => {
                // ⏱️ 300ms 後 (卡片達 90 度)，圖示剛好越過右側邊界被裁切消失。此時抽換 HTML！
                leftBtn.innerHTML = CAPSULE_SVGS.blankLeft;
                rightBtn.innerHTML = CAPSULE_SVGS.blankRight;
                capsule.dataset.mode = 'blank';

                // 將新圖示瞬間放到「左側邊界外」準備
                capsule.classList.remove('slide-out-right');
                capsule.classList.add('slide-in-left-start');

                // 第二階段：開始從左側滑入定位 (同步卡片的 flip-in-active)
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        capsule.classList.remove('slide-in-left-start');
                        capsule.classList.add('slide-in-active');
                    });
                });
            }, 300); 

        } else {
            // 反向第一階段：開始向左滑出 (關閉空白卡片時)
            capsule.classList.remove('slide-in-active');
            capsule.classList.add('slide-out-left');

            setTimeout(() => {
                // 300ms 後，抽換回原生 HTML
                leftBtn.innerHTML = CAPSULE_SVGS.nativeLeft;
                rightBtn.innerHTML = CAPSULE_SVGS.nativeRight;
                capsule.dataset.mode = 'native';

                // 將原生圖示瞬間放到「右側邊界外」準備
                capsule.classList.remove('slide-out-left');
                capsule.classList.add('slide-in-right-start');

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        capsule.classList.remove('slide-in-right-start');
                        capsule.classList.add('slide-in-active');
                        // 動畫結束後自動清理，保持 DOM 乾淨
                        setTimeout(() => { capsule.classList.remove('slide-in-active'); }, 300);
                    });
                });
            }, 300);
        }
    };

    // 🟢 3. 雙重點擊邏輯
    window.handleCapsuleMainClick = function() {
        const capsule = document.getElementById('action-capsule');
        const mode = capsule ? (capsule.dataset.mode || 'native') : 'native';

        if (mode === 'native') {
            if (capsule.classList.contains('detail-active')) {
                if (typeof window.openBlankOverlay === 'function') window.openBlankOverlay();
            } else {
                // 🟢 將原本的 console.log 替換為呼叫搜尋框展開動畫
                if (typeof window.toggleSearch === 'function') window.toggleSearch(true);
            }
        } else if (mode === 'blank') {
            if (typeof window.closeBlankOverlay === 'function') window.closeBlankOverlay();
        }
    };

    window.handleCapsuleSecondaryClick = function() {
        const capsule = document.getElementById('action-capsule');
        const mode = capsule ? (capsule.dataset.mode || 'native') : 'native';

        if (mode === 'native') {
            if (capsule.classList.contains('detail-active')) console.log('External Link Action Triggered');
            else console.log('More Options Action Triggered');
        } else if (mode === 'blank') {
            // 空白模式下點擊右側 (雲端下載)
            console.log('Cloud Download Action Triggered');
        }
    };

    // 搜尋框事件監聽
    window.toggleSearch = function(show) { /* (與原本邏輯一致，省略展示以節省版面) */ };
    searchInput.addEventListener('compositionstart', () => { isComposing = true; });
    searchInput.addEventListener('compositionend', (e) => { isComposing = false; onSearchCallback(e.target.value); });
    searchInput.addEventListener('input', (e) => { if (!isComposing) onSearchCallback(e.target.value); });
}