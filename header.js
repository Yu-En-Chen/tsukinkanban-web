// header.js - 頂部搜尋與膠囊選單邏輯

const CAPSULE_SVGS = {
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
    blankLeft: `
        <svg class="icon-blank-mode lucide lucide-chevron-left-icon lucide-chevron-left" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
        </svg>
    `,
    blankRight: `
        <svg class="icon-blank-mode lucide lucide-cloud-download-icon lucide-cloud-download" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 13v8l-4-4"/><path d="m12 21 4-4"/><path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"/>
        </svg>
    `,
    infoLeft: `
        <svg class="icon-info-mode lucide lucide-chevron-left-icon lucide-chevron-left" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
        </svg>
    `,
    infoRight: `
        <svg class="icon-info-mode lucide lucide-info" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
    `
};

export function initHeader(onSearchCallback, getActiveCardId) {
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-container');
    let isComposing = false;

    // 🟢 強制展開膠囊內按鈕的點擊熱區，讓右側按鈕和左側一樣好按
    const expandClickArea = () => {
        const lBtn = document.getElementById('capsule-main-btn');
        const rBtn = document.getElementById('capsule-secondary-btn');
        if (lBtn) {
            lBtn.style.flex = '1';
            lBtn.style.display = 'flex';
            lBtn.style.alignItems = 'center';
            lBtn.style.justifyContent = 'center';
            lBtn.style.height = '100%';
            lBtn.style.cursor = 'pointer';
        }
        if (rBtn) {
            rBtn.style.flex = '1';
            rBtn.style.display = 'flex';
            rBtn.style.alignItems = 'center';
            rBtn.style.justifyContent = 'center';
            rBtn.style.height = '100%';
            rBtn.style.cursor = 'pointer';
        }
    };
    expandClickArea();

    window.slideCapsuleMode = function(toBlankMode) {
        const capsule = document.getElementById('action-capsule');
        const searchTrigger = document.getElementById('search-trigger'); // 綁定搜尋按鈕
        const leftBtn = document.getElementById('capsule-main-btn');
        const rightBtn = document.getElementById('capsule-secondary-btn');
        const searchIcon = searchTrigger ? searchTrigger.querySelector('.search-icon') : null;
    
        if (!capsule || !leftBtn || !rightBtn) return;
    
        if (toBlankMode) {
            // 🛑 切換時：封殺搜尋按鈕原本的點擊功能，並禁止 Hover 放大的微互動
            if (searchTrigger) {
                searchTrigger.onclick = null;
                searchTrigger.style.pointerEvents = 'none';
            }
    
            capsule.classList.remove('slide-in-active');
            capsule.classList.add('slide-out-right');
            
            if (searchTrigger) {
                searchTrigger.classList.remove('slide-in-active');
                searchTrigger.classList.add('slide-out-right');
            }
    
            setTimeout(() => {
                leftBtn.innerHTML = CAPSULE_SVGS.blankLeft;
                rightBtn.innerHTML = CAPSULE_SVGS.blankRight;
                capsule.dataset.mode = 'blank';
                
                if (searchIcon) {
                    searchIcon.innerHTML = `
                        <svg class="icon-blank-mode lucide lucide-history-icon lucide-history" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                            <path d="M12 7v5l4 2"/>
                        </svg>
                    `;
                }
    
                capsule.classList.remove('slide-out-right');
                capsule.classList.add('slide-in-left-start');
                
                if (searchTrigger) {
                    searchTrigger.classList.remove('slide-out-right');
                    searchTrigger.classList.add('slide-in-left-start');
                }
    
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        capsule.classList.remove('slide-in-left-start');
                        capsule.classList.add('slide-in-active');
                        
                        if (searchTrigger) {
                            searchTrigger.classList.remove('slide-in-left-start');
                            searchTrigger.classList.add('slide-in-active');
                        }
                    });
                });
            }, 300); 
    
        } else {
            capsule.classList.remove('slide-in-active');
            capsule.classList.add('slide-out-left');
            
            if (searchTrigger) {
                searchTrigger.classList.remove('slide-in-active');
                searchTrigger.classList.add('slide-out-left');
            }
    
            setTimeout(() => {
                leftBtn.innerHTML = CAPSULE_SVGS.nativeLeft;
                rightBtn.innerHTML = CAPSULE_SVGS.nativeRight;
                capsule.dataset.mode = 'native';
                
                if (searchIcon) {
                    searchIcon.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m21 21-4.34-4.34"/>
                            <circle cx="11" cy="11" r="8"/>
                        </svg>
                    `;
                }
    
                capsule.classList.remove('slide-out-left');
                capsule.classList.add('slide-in-right-start');
                
                if (searchTrigger) {
                    searchTrigger.classList.remove('slide-out-left');
                    searchTrigger.classList.add('slide-in-right-start');
                }
    
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        capsule.classList.remove('slide-in-right-start');
                        capsule.classList.add('slide-in-active');
                        
                        if (searchTrigger) {
                            searchTrigger.classList.remove('slide-in-right-start');
                            searchTrigger.classList.add('slide-in-active');
                        }
                        
                        setTimeout(() => { 
                            capsule.classList.remove('slide-in-active'); 
                            if (searchTrigger) {
                                searchTrigger.classList.remove('slide-in-active');
                                // 🟢 動畫完全結束後：恢復搜尋按鈕功能與互動熱區
                                searchTrigger.onclick = () => window.toggleSearch(true);
                                searchTrigger.style.pointerEvents = 'auto';
                            }
                        }, 300);
                    });
                });
            }, 300);
        }
    };

    window.slideInfoCapsuleMode = function(toInfoMode) {
        const capsule = document.getElementById('action-capsule');
        const leftBtn = document.getElementById('capsule-main-btn');
        const rightBtn = document.getElementById('capsule-secondary-btn');
        if (!capsule || !leftBtn || !rightBtn) return;

        if (toInfoMode) {
            capsule.classList.remove('slide-in-active');
            capsule.classList.add('slide-out-right');

            setTimeout(() => {
                leftBtn.innerHTML = CAPSULE_SVGS.infoLeft;
                rightBtn.innerHTML = CAPSULE_SVGS.infoRight;
                capsule.dataset.mode = 'info';

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

    window.toggleSearch = function(show) {
        const dismissIcon = document.getElementById('dismiss-icon');
        if (show) {
            const capsule = document.getElementById('action-capsule');
            if (capsule && capsule.classList.contains('menu-expanded')) {
                capsule.classList.remove('menu-expanded');
                searchContainer.classList.remove('menu-open'); 
                document.body.classList.remove('menu-active');
            }
            searchContainer.classList.add('active');
            document.body.classList.add('searching'); 
            if (dismissIcon) dismissIcon.style.opacity = '0';
            
            // 🟢 救命關鍵：拔掉 setTimeout！必須在點擊瞬間同步聚焦，手機才會放行小鍵盤。
            // 加入 preventScroll: true 防止瀏覽器因為聚焦隱藏物件而亂捲動畫面
            if (searchInput) {
                searchInput.focus({ preventScroll: true });
            }
            
        } else {
            searchContainer.classList.remove('active');
            document.body.classList.remove('searching'); 
            if (searchInput) {
                searchInput.value = '';
                searchInput.blur(); // 確保關閉搜尋時必定收起鍵盤
            }
            onSearchCallback('');
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

    window.handleCapsuleMainClick = function() {
        if (window.pSyncing) {
            const btn = document.getElementById('capsule-main-btn');
            if (btn && typeof window.triggerBump === 'function') window.triggerBump(btn);
            return;
        }

        const capsule = document.getElementById('action-capsule');
        const mode = capsule ? (capsule.dataset.mode || 'native') : 'native';

        if (mode === 'native') {
            if (capsule.classList.contains('detail-active')) {
                if (typeof window.openBlankOverlay === 'function') window.openBlankOverlay();
            } else if (capsule.classList.contains('menu-expanded')) {
                window.toggleCapsuleMenu();
            } else {
                console.log('Plus Action Triggered');
            }
        } else if (mode === 'blank') {
            if (typeof window.closeBlankOverlay === 'function') window.closeBlankOverlay();
        } else if (mode === 'info') {
            if (typeof window.closeInfoOverlay === 'function') window.closeInfoOverlay();
        }
    };

    window.handleCapsuleSecondaryClick = function() {
        if (window.pSyncing) {
            const btn = document.getElementById('capsule-secondary-btn');
            if (btn && typeof window.triggerBump === 'function') window.triggerBump(btn);
            return;
        }

        const capsule = document.getElementById('action-capsule');
        const mode = capsule ? (capsule.dataset.mode || 'native') : 'native';

        if (mode === 'native') {
            if (capsule.classList.contains('detail-active')) {
                console.log('External Link Action Triggered');
            } else {
                window.toggleCapsuleMenu();
            }
        } else if (mode === 'blank') {
            if (typeof window.triggerCloudSync === 'function') window.triggerCloudSync();
        } else if (mode === 'info') {
            console.log('Info Details Triggered');
        }
    };

    document.addEventListener('click', (e) => {
        const capsule = document.getElementById('action-capsule');
        if (capsule && capsule.classList.contains('menu-expanded') && !capsule.contains(e.target)) {
            capsule.classList.remove('menu-expanded');
            searchContainer.classList.remove('menu-open');
            document.body.classList.remove('menu-active');
        }
    });

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

// 🟢 鍵盤防護機制：偵測到切換 App、回桌面、或點開其他分頁時，強制關閉鍵盤
document.addEventListener('visibilitychange', () => {
    if (document.hidden && searchInput) {
        searchInput.blur();
    }
});

window.addEventListener('blur', () => {
    if (searchInput) {
        searchInput.blur();
    }
});