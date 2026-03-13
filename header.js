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

    window.slideCapsuleMode = function (toBlankMode) {
        const capsule = document.getElementById('action-capsule');
        const searchTrigger = document.getElementById('search-trigger');
        const leftBtn = document.getElementById('capsule-main-btn');
        const rightBtn = document.getElementById('capsule-secondary-btn');
        const searchIcon = searchTrigger ? searchTrigger.querySelector('.search-icon') : null;

        if (!capsule || !leftBtn || !rightBtn) return;

        if (toBlankMode) {
            // 🛑 切換時：封殺按鈕原本的點擊功能
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
                    // 🟢 一次性注入三個 SVG：歷史、同步(無指針)、打勾
                    searchIcon.innerHTML = `
                      <svg class="icon-blank-mode history-icon lucide lucide-history" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                          <path d="M3 3v5h5"/>
                          <path d="M12 7v5l4 2"/>
                      </svg>
                      <svg class="icon-blank-mode sync-icon lucide lucide-rotate-ccw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                          <path d="M3 3v5h5"/>
                      </svg>
                      <svg class="icon-blank-mode check-icon lucide lucide-check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M20 6 9 17l-5-5"/>
                      </svg>
                      <svg class="icon-blank-mode x-icon lucide lucide-x-icon lucide-x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
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

                        // 🟢 滑入動畫 (300ms) 結束後，綁定連鎖點擊事件與 DB 還原邏輯
                        setTimeout(() => {
                            if (searchTrigger) {
                                searchTrigger.onclick = () => {
                                    // 🟢 霸王色全域防護鎖：攔截動畫期間的所有重複點擊，並給予「微互動縮放」與震動回饋
                                    if (window.pSyncing) {
                                        if (typeof window.triggerBump === 'function') window.triggerBump(searchTrigger);
                                        return;
                                    }
    
                                    // 1. 正式上鎖！這會瞬間癱瘓畫面上所有的滑動手勢、複製貼上與膠囊按鈕
                                    window.pSyncing = true;
    
                                    // 🟢 防呆：如果使用者正在編輯輸入框，強制收起並儲存目前的字，以免動畫打架
                                    if (window.pActiveEditType && typeof window.closeGhostEditMode === 'function') {
                                        window.closeGhostEditMode(true, null, true);
                                    }
    
                                    // 2. 啟動視覺回饋：右上角歷史按鈕開始旋轉
                                    searchTrigger.classList.add('action-spinning');
                                    if (navigator.vibrate) navigator.vibrate(20);
                                    
                                    // ✨ 同步指令 1：觸發底下兩個文字輸入框的下降與旋轉動畫！
                                    if (window.startInputUndoAnimation) window.startInputUndoAnimation();
    
                                    let isRestoreSuccess = false;
    
                                    // 3. 轉到一半 (500ms) 時：正式觸發資料庫還原
                                    setTimeout(async () => {
                                        try {
                                            if (window.undoCardPreference) {
                                                isRestoreSuccess = await window.undoCardPreference();
                                            }
                                        } catch (error) {
                                            console.error("背景還原過程中發生錯誤:", error);
                                            isRestoreSuccess = false;
                                        }
                                    }, 500);
    
                                    // 4. 1秒後 (轉完一圈)，根據結果給予不同動畫
                                    setTimeout(() => {
                                        searchTrigger.classList.remove('action-spinning');
                                        
                                        if (isRestoreSuccess) {
                                            searchTrigger.classList.add('action-success');
                                            if (navigator.vibrate) navigator.vibrate([30, 50, 30]); // 成功雙次震動
                                        } else {
                                            searchTrigger.classList.add('action-error');
                                            if (navigator.vibrate) navigator.vibrate([20, 30, 20, 30]); // 錯誤短促連續震動
                                        }
                                        
                                        // ✨ 同步指令 2：觸發底下輸入框的連動結果動畫 (落下打勾或打叉)
                                        if (window.finishInputUndoAnimation) window.finishInputUndoAnimation(isRestoreSuccess);
    
                                        // 5. 停留，讓大腦接收視覺資訊後開始 Reset
                                        const holdTime = isRestoreSuccess ? 500 : 600;
    
                                        setTimeout(() => {
                                            searchTrigger.classList.remove('action-success', 'action-error');
                                            searchTrigger.classList.add('action-resetting');
                                            
                                            // ✨ 同步指令 3：觸發底下輸入框的連動重置動畫 (文字浮上來歸位)
                                            if (window.resetInputUndoAnimation) window.resetInputUndoAnimation();
    
                                            requestAnimationFrame(() => {
                                                requestAnimationFrame(() => {
                                                    searchTrigger.classList.add('action-resetting-active');
    
                                                    // 6. 動畫全部結束，清除狀態
                                                    setTimeout(() => {
                                                        searchTrigger.classList.remove('action-resetting', 'action-resetting-active');
                                                        
                                                        // 🟢 任務完成，徹底解鎖，將所有的控制權還給使用者！
                                                        window.pSyncing = false; 
                                                    }, 400); 
                                                });
                                            });
                                        }, holdTime); 
                                    }, 1000); 
                                };
                                searchTrigger.style.pointerEvents = 'auto';
                            }
                        }, 300);
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
                                // 強制清除所有可能殘留的狀態
                                searchTrigger.classList.remove('action-spinning', 'action-success', 'action-error', 'action-resetting', 'action-resetting-active');
                                // 🟢 恢復原生搜尋功能
                                searchTrigger.onclick = () => window.toggleSearch(true);
                                searchTrigger.style.pointerEvents = 'auto';
                            }
                        }, 300);
                    });
                });
            }, 300);
        }
    };

    window.slideInfoCapsuleMode = function (toInfoMode) {
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

    window.toggleSearch = function (show) {
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

    window.toggleCapsuleMenu = function () {
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

    window.handleCapsuleMainClick = function () {
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

    window.handleCapsuleSecondaryClick = function () {
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
                window.toggleMainMenu();
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

// 🟢 全新的主選單控制引擎
window.toggleMainMenu = function () {
    // 切換 Body 的狀態標籤，CSS 就會自動接管物理動畫
    const isMenuOpen = document.body.classList.toggle('main-menu-active');

    // 同時綁定遮罩的點擊關閉事件 (防呆機制)
    const mask = document.getElementById('search-mask');
    if (isMenuOpen && mask) {
        mask.onclick = () => window.toggleMainMenu();
    } else if (mask) {
        // 關閉時把遮罩的點擊事件還給搜尋框
        mask.onclick = () => window.toggleSearch(false);
    }

    if (isMenuOpen) {
        console.log('🚀 主選單展開：右舷母艦已退避，Z 軸景深已啟動！');
        // 未來你的主選單 UI 展開邏輯可以寫在這裡
    } else {
        console.log('主選單關閉：艦隊歸位');
        // 關閉主選單的 UI 邏輯寫在這裡
    }
};