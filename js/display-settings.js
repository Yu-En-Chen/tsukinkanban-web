// ============================================================================
// js/display-settings.js - 「表示設定」面板 UI 與互動控制器
// ============================================================================

// 🟢 1. 負責生成設定面板的 HTML 結構
window.getDisplaySettingsHTML = function () {
    const isDesktop = window.matchMedia('(pointer: fine)').matches;

    const ua = navigator.userAgent;
    const platform = navigator.platform || '';

    // ✨ 終極精準偵測引擎
    // 1. 判斷是否為 Apple 裝置 (iOS 或 Mac)
    const isApple = /(Mac|iPhone|iPod|iPad)/i.test(platform) || /(Mac|iPhone|iPod|iPad)/i.test(ua);

    // 2. 判斷是否為「純正」的 Safari
    // 關鍵：Safari 的 UA 必須包含 Safari 但「絕對不能」包含 Chrome, CriOS, Edg... 等字眼
    const isSafari = isApple && /Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR|FxiOS|Firefox|Line|FBAV|FBAN|Instagram|MicroMessenger|WeChat|Threads|Twitter/i.test(ua);

    // 3. 判斷是否為 Blink 核心 (Chrome, Edge, Opera)
    const isBlink = /Chrome|CriOS|Edg|OPR/i.test(ua);

    // 4. 判斷是否為 Firefox
    const isFirefox = /Firefox|FxiOS/i.test(ua);

    // 5. 判斷環境類型
    const isWindowsOrAndroid = /(Windows|Android)/i.test(ua);

    let browserRecommendationHTML = '';

    // 🎯 偵測邏輯分發
    // A. Apple 裝置卻不是用 Safari (包含 Mac Chrome, iPhone Chrome 等)
    if (isApple && !isSafari) {
        browserRecommendationHTML = `
            <div class="settings-browser-recommendation">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                <div class="recommendation-text">
                    最高のパフォーマンスと視覚効果を得るため、<br><strong>Safari</strong> ブラウザのご利用を推奨します。
                </div>
            </div>
        `;
    }
    // B. Windows/Android
    else if (isWindowsOrAndroid) {
        // 💡 UserAgentをチェックして、AndroidかWindowsかを動的に判定する
        const isAndroidDevice = /Android/i.test(navigator.userAgent);
        const deviceName = isAndroidDevice ? 'Android' : 'Windows';

        browserRecommendationHTML = `
        <div class="settings-browser-recommendation">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <div class="recommendation-text">
                最高の視覚効果と物理アニメーションは、<strong>iOS の Safari</strong> に最適化されています。
                <br>
                ${deviceName} 端末では、一部の視覚効果が制限されます。
            </div>
        </div>
    `;
    }

    // 🟢 讀取目前的效能模式狀態
    const isLiteMode = localStorage.getItem('tsukin_lite_mode') === 'true';

    // 🟢 判斷是否需要強制鎖定 (非蘋果設備)
    const isLocked = !isApple;

    return `
    <div class="settings-container">
        <p class="settings-description">アプリの動作や視覚効果をカスタマイズできます。</p>
        
        ${browserRecommendationHTML}

        <div class="settings-group">
            <div class="settings-row" style="height: 60px; padding-top: 0; padding-bottom: 0;">
                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <span class="settings-label">描画モード</span>
                </div>
                
                <div class="segmented-control" id="render-mode-control" style="${isLocked ? 'opacity: 0.6; pointer-events: none;' : ''}">
                    <div class="seg-bg" style="transform: translateX(${isLiteMode ? '100%' : '0'});"></div>
                    <button class="seg-btn ${!isLiteMode ? 'active' : ''}" data-val="performance">品質</button>
                    <button class="seg-btn ${isLiteMode ? 'active' : ''}" data-val="quality">軽量</button>
                </div>
            </div>
        </div>

        ${isDesktop ? `
        <div class="settings-group">
            <div class="settings-row" style="height: 60px; padding-top: 0; padding-bottom: 0;">
                <span class="settings-label">システムカーソルを使用</span>
                <label class="ios-switch">
                    <input type="checkbox" id="setting-default-cursor">
                    <span class="slider"></span>
                </label>
            </div>
        </div>
        ` : ''}

        <div style="height: 40px; flex-shrink: 0; width: 100%; pointer-events: none;"></div>

        <div class="settings-group">
            <div class="settings-row clickable-row" id="row-export-all">
                <span class="settings-label">設定をエクスポート</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
            </div>
            
            <div class="settings-row clickable-row" id="row-import-all">
                <span class="settings-label">設定をインポート</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
            </div>
        </div>

    </div>
    `;
};

// 🟢 2. 負責綁定面板內的微互動、拖曳與點擊事件
window.initDisplaySettingsEvents = function () {
    const segControl = document.getElementById('render-mode-control');
    const segBtns = document.querySelectorAll('#render-mode-control .seg-btn');
    const segBg = document.querySelector('#render-mode-control .seg-bg');

    // ==========================================
    // ✨ 升級細節 1：精準初始化
    // 在綁定事件前，先讀取記憶體，確保 JS 內部的 index 與畫面一模一樣
    // ==========================================
    const isAppleDevice = /Macintosh|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // 如果 localStorage 裡面記住的是 true (輕量模式)，就把 activeIndex 設為 1 (右邊)，否則設為 0 (左邊)
    let activeIndex = localStorage.getItem('tsukin_lite_mode') === 'true' ? 1 : 0;

    let startX = 0;
    let currentTranslate = 0;
    let bgWidth = 0;
    let hasMoved = false;

    // ==========================================
    // 🎯 核心切換功能 (連接資料庫與畫面渲染)
    // ==========================================
    function setSegment(index) {
        // ✨ 升級細節 2：雙重防呆鎖定
        // 雖然我們在 HTML 把 Android 按鈕變半透明了，但為了防止有使用者亂點或系統 Bug，
        // 這裡再加一道鎖：只要不是蘋果設備，嚴格禁止 index 變成 0 (品質模式)
        if (!isAppleDevice && index === 0) return;

        // 1. 更新按鈕的視覺 UI (文字變色)
        activeIndex = index;
        segBtns.forEach(b => b.classList.remove('active'));
        segBtns[index].classList.add('active');

        // 準備滑塊的彈簧動畫
        segBg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15)';

        // ✨ 升級細節 3：執行真正的資料儲存與畫面渲染
        if (index === 0) {
            // 🍎 選擇「品質」模式
            segBg.style.transform = 'translateX(0)'; // 滑塊推到左邊
            localStorage.setItem('tsukin_lite_mode', 'false'); // 存入記憶體

            // 【關鍵魔法】瞬間拔除降級標籤，網頁會立刻恢復毛玻璃特效！
            document.documentElement.classList.remove('is-android-fallback');
            console.log('描画モード：品質 (高階視覺開啟)');

        } else {
            // 🚀 選擇「軽量」模式
            segBg.style.transform = 'translateX(100%)'; // 滑塊推到右邊
            localStorage.setItem('tsukin_lite_mode', 'true'); // 存入記憶體

            // 【關鍵魔法】瞬間打上降級標籤，網頁會立刻變成流暢的實心背景！
            document.documentElement.classList.add('is-android-fallback');
            console.log('描画モード：軽量 (效能模式開啟)');
        }

        // 觸發手機微震動回饋，增加 Native App 手感
        if (window.navigator.vibrate) window.navigator.vibrate(10);
    }

    // A. 點擊事件 (永遠有效，除非使用者進行了大幅度拖曳)
    segBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            if (hasMoved) return; // 只有在確認是拖曳時才擋下點擊
            setSegment(index);
        });
    });

    // B. 手指拖曳 (Swipe) 物理引擎
    if (segControl && segBg) {
        segControl.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            bgWidth = segBg.offsetWidth;
            currentTranslate = activeIndex === 0 ? 0 : bgWidth;
            hasMoved = false; // 每次觸碰螢幕時重置

            // 準備跟隨手指，拔除延遲動畫
            segBg.style.transition = 'none';
        }, { passive: true });

        segControl.addEventListener('touchmove', (e) => {
            const deltaX = e.touches[0].clientX - startX;

            // ✨ 容錯機制：手指移動超過 3px 才算是「刻意拖曳」，過濾掉點擊時的微手震！
            if (Math.abs(deltaX) > 3) {
                hasMoved = true;
            }

            // 如果還沒超過 3px (還在手震範圍內)，就不移動背景
            if (!hasMoved) return;

            let newTranslate = currentTranslate + deltaX;
            if (newTranslate < 0) newTranslate = 0;
            if (newTranslate > bgWidth) newTranslate = bgWidth;

            segBg.style.transform = `translateX(${newTranslate}px)`;
        }, { passive: true });

        segControl.addEventListener('touchend', () => {
            if (!hasMoved) {
                // 如果判定只是「點擊」，把動畫加回來，剩下的切換邏輯交給 Click 事件處理！
                segBg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
                return;
            }

            // 如果是「拖曳放開」，執行物理吸附
            const match = segBg.style.transform.match(/translateX\(([-\d.]+)px\)/);
            if (match) {
                const finalTranslate = parseFloat(match[1]);
                if (finalTranslate > bgWidth / 2) setSegment(1);
                else setSegment(0);
            } else {
                setSegment(activeIndex);
            }

            // 給予 50ms 延遲解除狀態，防止原生點擊事件趁虛而入
            setTimeout(() => { hasMoved = false; }, 50);
        });
        // ==========================================
        // 💾 資料備份按鈕互動 (暫時先做樣式與點擊測試)
        // ==========================================
        const rowExport = document.getElementById('row-export-all');
        const rowImport = document.getElementById('row-import-all');

        if (rowExport) {
            rowExport.addEventListener('click', async () => {
                // 1. 觸發微震動，給予使用者物理回饋
                if (window.navigator.vibrate) window.navigator.vibrate(10);
    
                // 2. 呼叫底部選單 (Action Sheet)
                const exportChoice = await window.iosActionSheet(
                    'エクスポート', // 標題
                    'どのデータをエクスポートしますか？', // 說明文字
                    [
                        { text: 'すべての設定をエクスポート', value: 'all' },
                        { text: 'カラーテーマのみエクスポート', value: 'colors' }
                    ],
                    'キャンセル' // 取消按鈕
                );
    
                // 3. 根據使用者的選擇執行動作
                try {
                    if (exportChoice === 'all') {
                        await window.DEBUG_DB.exportAll();
                        
                        // 利用 iosConfirm 來做單按鈕的「成功提示」(將 cancelText 設為 null 即可隱藏取消按鈕)
                        await window.iosConfirm('エクスポート完了', 'すべての設定をクリップボードにコピーしました！', 'OK', null);
                        
                    } else if (exportChoice === 'colors') {
                        await window.DEBUG_DB.exportColors();
                        
                        await window.iosConfirm('エクスポート完了', 'カラーテーマをクリップボードにコピーしました！\n友達にシェアしてみましょう。', 'OK', null);
                    }
                    // 如果 exportChoice 是 null (代表使用者點擊了取消或背景)，則什麼都不做，完美結束。
                } catch (err) {
                    // 如果匯出失敗 (例如根本還沒設定過顏色)
                    await window.iosConfirm('エラー', err.message, 'OK', null);
                }
            });
        }

        if (rowImport) {
            rowImport.addEventListener('click', () => {
                console.log('執行：設定導入');
                // 未來對接：window.DEBUG_DB.importAll();
                if (window.navigator.vibrate) window.navigator.vibrate(10);
            });
        }

        // ✨ 注入按鈕樣式 (確保形狀、大小、顏色與切換器一致)
        if (!document.getElementById('clickable-row-style')) {
            const style = document.createElement('style');
            style.id = 'clickable-row-style';
            style.innerHTML = `
                .clickable-row {
                    cursor: pointer;
                    transition: background-color 0.2s ease, transform 0.1s ease;
                    -webkit-tap-highlight-color: transparent;
                    user-select: none;
                }
                /* 滑鼠懸停效果 */
                .clickable-row:hover {
                    background-color: rgba(255, 255, 255, 0.05);
                }
                /* 按下時的物理縮放與變色 */
                .clickable-row:active {
                    background-color: rgba(255, 255, 255, 0.12);
                    transform: scale(0.98);
                }
                /* Icon 顏色與標籤一致 */
                .settings-icon {
                    color: rgba(255, 255, 255, 0.6);
                    transition: color 0.2s ease;
                }
                .clickable-row:active .settings-icon {
                    color: white;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // C. 動態設定開關邏輯 (連接資料庫)
    // ✨ 這裡改成引入 db-settings.js
    import('../data/db-settings.js').then(dbSettings => {

        // 🎯 1. 系統鼠標設定 (預設為 false：代表啟用自訂鼠標)
        const cursorSwitch = document.getElementById('setting-default-cursor');
        if (cursorSwitch && dbSettings.getDisplaySetting) {

            // 初始化：從資料庫讀取並設定開關狀態
            dbSettings.getDisplaySetting('useSystemCursor', false).then(useSystem => {
                cursorSwitch.checked = useSystem;
            });

            // 監聽變更：寫入資料庫並「即時」切換畫面鼠標
            cursorSwitch.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                dbSettings.saveDisplaySetting('useSystemCursor', isChecked); // 寫入雙引擎資料庫

                // 立即套用視覺效果
                if (isChecked) {
                    document.body.classList.add('use-system-cursor');
                } else {
                    document.body.classList.remove('use-system-cursor');
                }

                console.log(`設定 [系統鼠標] 切換為：`, isChecked ? '開啟 (隱藏自訂)' : '關閉 (顯示自訂)');
                if (window.navigator.vibrate) window.navigator.vibrate(5);
            });
        }

        // 🎯 2. 新增：提高狀態符號對比度設定
        const highContrastSwitch = document.getElementById('setting-high-contrast-icons');
        if (highContrastSwitch && dbSettings.getDisplaySetting) {
            dbSettings.getDisplaySetting('highContrastIcons', false).then(isHighContrast => {
                highContrastSwitch.checked = isHighContrast;
                if (isHighContrast) document.body.classList.add('high-contrast-icons');
            });

            highContrastSwitch.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                dbSettings.saveDisplaySetting('highContrastIcons', isChecked);

                // 立即套用 Class 讓 CSS 能夠抓取
                document.body.classList.toggle('high-contrast-icons', isChecked);

                console.log(`設定 [提高狀態符號對比度] 切換為：`, isChecked);
                if (window.navigator.vibrate) window.navigator.vibrate(5);
            });
        }

        // 🎯 3. 其他開關 (預留未來擴充)
        const otherSwitches = ['reduce-motion', 'reduce-blur', 'disable-gradient'];
        otherSwitches.forEach(id => {
            const el = document.getElementById(`setting-${id}`);
            if (el) {
                el.addEventListener('change', (e) => {
                    console.log(`設定 [${id}] 狀態改變：`, e.target.checked);
                    if (window.navigator.vibrate) window.navigator.vibrate(5);
                });
            }
        });
    });
};