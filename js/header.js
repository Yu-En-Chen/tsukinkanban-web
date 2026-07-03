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

// 無障礙：各模式下三顆按鈕的語音標籤 (螢幕閱讀器唸的名字)
const CAPSULE_ARIA_LABELS = {
    native: { left: 'カードを追加', right: 'メニュー', search: '路線検索を開く' },
    blank: { left: '戻る', right: 'クラウド同期', search: '元に戻す' },
    info: { left: '戻る', right: '詳細情報', search: '路線検索を開く' }
};

// 模式切換 (innerHTML 換掉 SVG) 之後呼叫：更新 aria-label，並把新注入的裝飾 SVG 從朗讀中排除
function applyCapsuleAria(mode) {
    const labels = CAPSULE_ARIA_LABELS[mode] || CAPSULE_ARIA_LABELS.native;
    const targets = [
        [document.getElementById('capsule-main-btn'), labels.left],
        [document.getElementById('capsule-secondary-btn'), labels.right],
        [document.getElementById('search-trigger'), labels.search]
    ];
    targets.forEach(([el, label]) => {
        if (!el) return;
        el.setAttribute('aria-label', label);
        el.querySelectorAll('svg').forEach(svg => {
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('focusable', 'false');
        });
    });
}

export function initHeader(onSearchCallback, getActiveCardId) {
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-container');
    let isComposing = false;

    // 展開膠囊內按鈕的點擊範圍，讓左右兩顆一樣好按
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

    // 初始狀態的語音標籤
    applyCapsuleAria('native');

    // search-trigger 是 div 假按鈕 (role="button")，補上 Enter / Space 鍵盤觸發
    const searchTriggerEl = document.getElementById('search-trigger');
    if (searchTriggerEl) {
        searchTriggerEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                searchTriggerEl.click();
            }
        });
    }

    window.slideCapsuleMode = function (toBlankMode) {
        const capsule = document.getElementById('action-capsule');
        const searchTrigger = document.getElementById('search-trigger');
        const leftBtn = document.getElementById('capsule-main-btn');
        const rightBtn = document.getElementById('capsule-secondary-btn');
        const searchIcon = searchTrigger ? searchTrigger.querySelector('.search-icon') : null;

        if (!capsule || !leftBtn || !rightBtn) return;

        if (toBlankMode) {
            // 切換期間停用原本的點擊行為
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
                applyCapsuleAria('blank');

                if (searchIcon) {
                    // 一次注入四個狀態 SVG：歷史、同步、打勾、打叉
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

                        // 滑入動畫 (300ms) 結束後，綁定點擊事件與 DB 還原邏輯
                        setTimeout(() => {
                            if (searchTrigger) {
                                searchTrigger.onclick = () => {
                                    // 全域鎖：動畫期間攔截重複點擊，僅給予縮放與震動回饋
                                    if (window.pSyncing) {
                                        if (typeof window.triggerBump === 'function') window.triggerBump(searchTrigger);
                                        return;
                                    }
    
                                    // 1. 上鎖：暫停滑動手勢、複製貼上與膠囊按鈕
                                    window.pSyncing = true;
    
                                    // 使用者正在編輯輸入框時，先收起並儲存，避免動畫衝突
                                    if (window.pActiveEditType && typeof window.closeGhostEditMode === 'function') {
                                        window.closeGhostEditMode(true, null, true);
                                    }
    
                                    // 2. 視覺回饋：按鈕開始旋轉
                                    searchTrigger.classList.add('action-spinning');
                                    if (navigator.vibrate) navigator.vibrate(20);
                                    
                                    // 連動 1：觸發輸入框的下降與旋轉動畫
                                    if (window.startInputUndoAnimation) window.startInputUndoAnimation();
    
                                    let isRestoreSuccess = false;
    
                                    // 3. 旋轉至一半 (500ms) 時觸發資料庫還原
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
    
                                    // 4. 一秒後 (轉完一圈) 依結果顯示成功或失敗動畫
                                    setTimeout(() => {
                                        searchTrigger.classList.remove('action-spinning');
                                        
                                        if (isRestoreSuccess) {
                                            searchTrigger.classList.add('action-success');
                                            if (navigator.vibrate) navigator.vibrate([30, 50, 30]); // 成功：雙次震動
                                        } else {
                                            searchTrigger.classList.add('action-error');
                                            if (navigator.vibrate) navigator.vibrate([20, 30, 20, 30]); // 失敗：短促連續震動
                                        }
                                        
                                        // 連動 2：輸入框顯示結果動畫 (打勾或打叉)
                                        if (window.finishInputUndoAnimation) window.finishInputUndoAnimation(isRestoreSuccess);
    
                                        // 5. 停留片刻讓使用者看清結果，再開始重置
                                        const holdTime = isRestoreSuccess ? 500 : 600;
    
                                        setTimeout(() => {
                                            searchTrigger.classList.remove('action-success', 'action-error');
                                            searchTrigger.classList.add('action-resetting');
                                            
                                            // 連動 3：輸入框重置動畫 (文字歸位)
                                            if (window.resetInputUndoAnimation) window.resetInputUndoAnimation();
    
                                            requestAnimationFrame(() => {
                                                requestAnimationFrame(() => {
                                                    searchTrigger.classList.add('action-resetting-active');
    
                                                    // 6. 動畫全部結束，清除狀態
                                                    setTimeout(() => {
                                                        searchTrigger.classList.remove('action-resetting', 'action-resetting-active');
                                                        
                                                        // 完成，解除全域鎖
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
                applyCapsuleAria('native');

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
                                // 清除可能殘留的動畫狀態
                                searchTrigger.classList.remove('action-spinning', 'action-success', 'action-error', 'action-resetting', 'action-resetting-active');
                                // 恢復搜尋功能
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
                applyCapsuleAria('info');

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
                applyCapsuleAria('native');

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

            // 注意：必須在點擊事件內同步 focus，行動瀏覽器才會允許彈出鍵盤（不可包在 setTimeout 裡）
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
                // 官方網站外部連結
                // ====================================================
                const activeId = typeof getActiveCardId === 'function' ? getActiveCardId() : null;
                
                if (!activeId || activeId === 'fixed-bottom') return;

                const currentData = window.appRailwayData ? window.appRailwayData.find(r => r.id === activeId) : null;
                if (!currentData) return;

                let linksToCheck = [];
                
                // 判斷是否為航班卡片
                if (currentData.isFlightCard && currentData.flightData) {
                    const fData = currentData.flightData;
                    const airlineStr = (fData.airline || '').toUpperCase();
                    
                    // 1. 加入航空公司官網
                    if (airlineStr.includes('ANA') || airlineStr.includes('全日本空輸')) {
                        linksToCheck.push({ name: 'ANA 公式サイト', url: 'https://www.ana.co.jp/' });
                    } else if (airlineStr.includes('JAL') || airlineStr.includes('日本航空')) {
                        linksToCheck.push({ name: 'JAL 公式サイト', url: 'https://www.jal.co.jp/' });
                    } else if (airlineStr.includes('SKYMARK') || airlineStr.includes('スカイマーク')) {
                        linksToCheck.push({ name: 'Skymark 公式サイト', url: 'https://www.skymark.co.jp/' });
                    } else if (airlineStr.includes('PEACH') || airlineStr.includes('ピーチ')) {
                        linksToCheck.push({ name: 'Peach 公式サイト', url: 'https://www.flypeach.com/' });
                    } else if (airlineStr.includes('JETSTAR') || airlineStr.includes('ジェットスター')) {
                        linksToCheck.push({ name: 'Jetstar 公式サイト', url: 'https://www.jetstar.com/jp/ja/home' });
                    } else if (airlineStr.includes('AIRDO') || airlineStr.includes('エア・ドゥ')) {
                        linksToCheck.push({ name: 'AIRDO 公式サイト', url: 'https://www.airdo.jp/' });
                    } else if (airlineStr.includes('SOLASEED') || airlineStr.includes('ソラシド')) {
                        linksToCheck.push({ name: 'ソラシドエア 公式サイト', url: 'https://www.solaseedair.jp/' });
                    } else if (airlineStr.includes('STARFLYER') || airlineStr.includes('スターフライヤー') || airlineStr.includes('STAR FLYER')) {
                        linksToCheck.push({ name: 'スターフライヤー 公式サイト', url: 'https://www.starflyer.jp/' });
                    }

                    // 判斷卡片是否已加入常駐牌組
                    let isSavedInDeck = false;
                    
                    // 檢查 1：是否存在於已儲存的路線資料庫
                    if (window.db_savedRoutes && Array.isArray(window.db_savedRoutes)) {
                        isSavedInDeck = window.db_savedRoutes.some(route => route.id === activeId);
                    } else {
                        // 檢查 2 (Fallback)：以 ID 命名規則判斷 (搜尋卡片帶有 search 字樣)
                        isSavedInDeck = !activeId.includes('search') && !activeId.includes('temp');
                    }

                    // 2. 尚未加入常駐時才顯示機場官網
                    if (!isSavedInDeck) {
                        const airportStr = fData.airport || '';
                        if (airportStr === 'HND' || airportStr === '羽田') {
                            linksToCheck.push({ name: '羽田空港 公式サイト', url: 'https://tokyo-haneda.com/' });
                        } else if (airportStr === 'NRT' || airportStr === '成田') {
                            linksToCheck.push({ name: '成田空港 公式サイト', url: 'https://www.narita-airport.jp/jp/' });
                        }
                    }

                } else if (currentData.targetLineIds && currentData.targetLineIds.length > 0) {
                    // 鐵道卡片：從 MasterRouteDictionary 查對應官網
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

                // 過濾重複網址
                const uniqueLinks = [];
                const seenUrls = new Set();
                linksToCheck.forEach(link => {
                    if (!seenUrls.has(link.url)) {
                        seenUrls.add(link.url);
                        uniqueLinks.push(link);
                    }
                });

                // 沒有可用網址時，僅給予按鈕縮放回饋
                if (uniqueLinks.length === 0) {
                    const btn = document.getElementById('capsule-secondary-btn');
                    if (btn) {
                        // 按鈕縮放回饋
                        btn.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.6, 0.64, 1), opacity 0.15s ease';
                        btn.style.transform = 'scale(0.85)';
                        btn.style.opacity = '0.7';
                        if (navigator.vibrate) navigator.vibrate(20); // 輕微震動
                        
                        setTimeout(() => {
                            btn.style.transform = 'scale(1)';
                            btn.style.opacity = '1';
                            setTimeout(() => { btn.style.transition = ''; }, 150); // 清理過渡狀態
                        }, 150);
                    }
                    return;
                }

                if (uniqueLinks.length === 1) {
                    // 只有一個官網時直接開啟
                    window.open(uniqueLinks[0].url, '_blank');
                } else {
                    // 依卡片類型調整提示文案
                    const sheetMessage = currentData.isFlightCard 
                        ? '航空会社と空港のサイトが含まれています。\nどちらのサイトを開きますか？'
                        : '複数の路線が含まれています。\nどちらのサイトを開きますか？';

                    // 多個官網：以 Action Sheet 讓使用者選擇
                    if (typeof window.iosActionSheet === 'function') {
                        
                        // 轉換為 iosActionSheet 需要的 { text, value } 格式
                        const actionButtons = uniqueLinks.map(link => ({
                            text: link.name,
                            value: link.url
                        }));
                        
                        window.iosActionSheet(
                            '公式サイト',
                            sheetMessage,
                            actionButtons
                        ).then(selectedUrl => {
                            // 取消時 selectedUrl 為 null
                            if (selectedUrl) {
                                window.open(selectedUrl, '_blank');
                            }
                        });

                    } else if (typeof window.iosConfirm === 'function') {
                        // 降級方案：iosActionSheet 尚未載入時改用 iosConfirm
                        window.iosConfirm(
                            '公式サイト',
                            sheetMessage,
                            uniqueLinks[0].name, 
                            uniqueLinks[1].name  
                        ).then(isConfirm => {
                            if (isConfirm) window.open(uniqueLinks[0].url, '_blank');
                            else window.open(uniqueLinks[1].url, '_blank');
                        });
                    } else {
                        // 最終降級：直接開啟第一個網址
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

// 切換 App、回桌面或切換分頁時，強制收起鍵盤
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // 每次觸發時重新取得元素
        const input = document.getElementById('search-input');
        if (input) input.blur();
    }
});

window.addEventListener('blur', () => {
    const input = document.getElementById('search-input');
    if (input) input.blur();
});
