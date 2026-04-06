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
        <svg class="icon-menu-mode lucide lucide-cog-icon lucide-cog" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 10.27 7 3.34"/><path d="m11 13.73-4 6.93"/><path d="M12 22v-2"/><path d="M12 2v2"/><path d="M14 12h8"/><path d="m17 20.66-1-1.73"/><path d="m17 3.34-1 1.73"/><path d="M2 12h2"/><path d="m20.66 17-1.73-1"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m3.34 7 1.73 1"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8"/>
        </svg>
    `,
    nativeRight: `
        <svg class="icon-default" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
        </svg>
        <svg class="icon-hidden lucide lucide-external-link-icon lucide-external-link" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        </svg>
        <svg class="icon-menu-mode lucide lucide-archive-x-icon lucide-archive-x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="m9.5 17 5-5"/><path d="m9.5 12 5 5"/>
        </svg>
    `,
    blankLeft: `
        <svg class="icon-blank-mode lucide lucide-chevron-left-icon lucide-chevron-left" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
        </svg>
        <svg class="icon-menu-mode lucide lucide-cog-icon lucide-cog" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 10.27 7 3.34"/><path d="m11 13.73-4 6.93"/><path d="M12 22v-2"/><path d="M12 2v2"/><path d="M14 12h8"/><path d="m17 20.66-1-1.73"/><path d="m17 3.34-1 1.73"/><path d="M2 12h2"/><path d="m20.66 17-1.73-1"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m3.34 7 1.73 1"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8"/>
        </svg>
    `,
    blankRight: `
        <svg class="icon-blank-mode lucide lucide-cloud-download-icon lucide-cloud-download" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 13v8l-4-4"/><path d="m12 21 4-4"/><path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284"/>
        </svg>
        <svg class="icon-menu-mode lucide lucide-archive-x-icon lucide-archive-x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="m9.5 17 5-5"/><path d="m9.5 12 5 5"/>
        </svg>
    `,
    infoLeft: `
        <svg class="icon-info-mode lucide lucide-chevron-left-icon lucide-chevron-left" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
        </svg>
        <svg class="icon-menu-mode lucide lucide-cog-icon lucide-cog" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 10.27 7 3.34"/><path d="m11 13.73-4 6.93"/><path d="M12 22v-2"/><path d="M12 2v2"/><path d="M14 12h8"/><path d="m17 20.66-1-1.73"/><path d="m17 3.34-1 1.73"/><path d="M2 12h2"/><path d="m20.66 17-1.73-1"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m3.34 7 1.73 1"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8"/>
        </svg>
    `,
    infoRight: `
        <svg class="icon-info-mode lucide lucide-info" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
        </svg>
        <svg class="icon-menu-mode lucide lucide-archive-x-icon lucide-archive-x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="m9.5 17 5-5"/><path d="m9.5 12 5 5"/>
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

    // 🟢 全新的主選單控制引擎 (防彈版)

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
                if (typeof window.openAddPanel === 'function') window.openAddPanel();
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
            if (btn) {
                btn.style.transform = 'scale(0.92)';
                btn.style.opacity = '0.8';
                setTimeout(() => { btn.style.transform = ''; btn.style.opacity = ''; }, 150);
            }
            return;
        }

        const capsule = document.getElementById('action-capsule');
        const mode = capsule ? (capsule.dataset.mode || 'native') : 'native';

        if (mode === 'native') {
            if (capsule.classList.contains('detail-active')) {
                // ====================================================
                // 🟢 官網外部連結跳轉邏輯 (External Link Action) - 已修復 Dialog 問題
                // ====================================================
                const activeId = typeof getActiveCardId === 'function' ? getActiveCardId() : null;
                
                if (!activeId || activeId === 'fixed-bottom') return;

                const currentData = window.appRailwayData ? window.appRailwayData.find(r => r.id === activeId) : null;
                if (!currentData) return;

                let linksToCheck = [];
                
                // 💡 關鍵修復：拔除 isCustom 限制。只要卡片有綁定路線 ID，就去字典查官網！
                if (currentData.targetLineIds && currentData.targetLineIds.length > 0) {
                    currentData.targetLineIds.forEach(id => {
                        const dictRoute = window.MasterRouteDictionary ? window.MasterRouteDictionary[id] : null;
                        if (dictRoute) {
                            const url = dictRoute.url || dictRoute.companyUrl || dictRoute.website;
                            if (url) {
                                linksToCheck.push({
                                    // 優先使用公司名稱作為按鈕文字，若無則用路線名稱
                                    name: dictRoute.company || dictRoute.name || '公式サイト',
                                    url: url
                                });
                            }
                        }
                    });
                }

                // 過濾重複的網址
                const uniqueLinks = [];
                const seenUrls = new Set();
                linksToCheck.forEach(link => {
                    if (!seenUrls.has(link.url)) {
                        seenUrls.add(link.url);
                        uniqueLinks.push(link);
                    }
                });

                // 【修復 2】沒有網址時：直接在這裡實作微互動，不依賴外部函數
                if (uniqueLinks.length === 0) {
                    const btn = document.getElementById('capsule-secondary-btn');
                    if (btn) {
                        // 按鈕縮小的微互動
                        btn.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.6, 0.64, 1), opacity 0.15s ease';
                        btn.style.transform = 'scale(0.85)';
                        btn.style.opacity = '0.7';
                        if (navigator.vibrate) navigator.vibrate(20); // 呼叫實體馬達輕微震動
                        
                        setTimeout(() => {
                            btn.style.transform = 'scale(1)';
                            btn.style.opacity = '1';
                            setTimeout(() => { btn.style.transition = ''; }, 150); // 清理過渡狀態
                        }, 150);
                    }
                    return;
                }

                if (uniqueLinks.length === 1) {
                    // 只有一個官網，直接開啟
                    window.open(uniqueLinks[0].url, '_blank');
                } else {
                    // 【全面升級】有多個不同官網：呼叫 iOS Action Sheet (底部垂直表單)
                    if (typeof window.iosActionSheet === 'function') {
                        
                        // 將 uniqueLinks 陣列轉換成 iosActionSheet 需要的格式 { text, value }
                        const actionButtons = uniqueLinks.map(link => ({
                            text: link.name,
                            value: link.url
                        }));
                        
                        window.iosActionSheet(
                            '公式サイト',
                            '複数の路線が含まれています。\nどちらのサイトを開きますか？',
                            actionButtons
                        ).then(selectedUrl => {
                            // 當 Promise resolve 時，檢查是否有選擇網址 (若是點擊取消則 selectedUrl 會是 null)
                            if (selectedUrl) {
                                window.open(selectedUrl, '_blank');
                            }
                        });

                    } else if (typeof window.iosConfirm === 'function') {
                        // 防呆降級方案：萬一新函數還沒載入，至少保底用舊的
                        window.iosConfirm(
                            '公式サイト',
                            '複数の路線が含まれています。\nどちらのサイトを開きますか？',
                            uniqueLinks[0].name, 
                            uniqueLinks[1].name  
                        ).then(isConfirm => {
                            if (isConfirm) window.open(uniqueLinks[0].url, '_blank');
                            else window.open(uniqueLinks[1].url, '_blank');
                        });
                    } else {
                        // 最終保底
                        window.open(uniqueLinks[0].url, '_blank');
                    }
                }
                // ====================================================
            } else {
                if (typeof window.toggleMainMenu === 'function') window.toggleMainMenu();
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
    if (document.hidden) {
        // 每次觸發時，重新去畫面上抓取元素，而不是使用未定義的全域變數
        const input = document.getElementById('search-input');
        if (input) input.blur();
    }
});

window.addEventListener('blur', () => {
    const input = document.getElementById('search-input');
    if (input) input.blur();
});
