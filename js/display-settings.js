// ============================================================================
// js/display-settings.js - 「表示設定」面板 UI 與互動控制器
// ============================================================================

// 🟢 1. 負責生成設定面板的 HTML 結構
window.getDisplaySettingsHTML = function() {
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
    // B. Windows/Android 使用 Blink 卻不是用 Firefox (你的特殊建議)
    else if (isWindowsOrAndroid && isBlink && !isFirefox) {
         browserRecommendationHTML = `
            <div class="settings-browser-recommendation">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                <div class="recommendation-text">
                    最高のパフォーマンスと視覚効果を得るため、<br><strong>Firefox</strong> ブラウザのご利用を推奨します。
                </div>
            </div>
        `;
    }
    
    // 偵測 Debug Log (開發完可刪除)
    console.log(`[偵測結果] Apple: ${isApple}, Safari: ${isSafari}, Blink: ${isBlink}, Firefox: ${isFirefox}`);

    return `

    <div class="settings-container">
        <p class="settings-description">アプリの動作や視覚効果をカスタマイズできます。</p>
        
        ${browserRecommendationHTML}

        <div class="settings-group">
            <div class="settings-row">
                <span class="settings-label">描画モード</span>
                <div class="segmented-control" id="render-mode-control">
                    <div class="seg-bg"></div>
                    <button class="seg-btn active" data-val="quality">品質</button>
                    <button class="seg-btn" data-val="performance">動作</button>
                </div>
            </div>
        </div>

        <div class="settings-group">
            <div class="settings-row">
                <span class="settings-label">視差効果を減らす</span>
                <label class="ios-switch">
                    <input type="checkbox" id="setting-reduce-motion">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-row">
                <span class="settings-label">透明度を下げる</span>
                <label class="ios-switch">
                    <input type="checkbox" id="setting-reduce-blur">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-row">
                <span class="settings-label">カラーグラデーションをオフ</span>
                <label class="ios-switch">
                    <input type="checkbox" id="setting-disable-gradient">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="settings-row">
                <span class="settings-label">ステータスアイコンのコントラストを高める</span>
                <label class="ios-switch">
                    <input type="checkbox" id="setting-high-contrast-icons">
                    <span class="slider"></span>
                </label>
            </div>
            
            ${isDesktop ? `
            <div class="settings-row">
                <span class="settings-label">システムカーソルを使用</span>
                <label class="ios-switch">
                    <input type="checkbox" id="setting-default-cursor">
                    <span class="slider"></span>
                </label>
            </div>
            ` : ''}
        </div>

        <div class="settings-group">
            <div class="settings-row">
                <span class="settings-label">下部カードのプレビュー</span>
                <label class="ios-switch">
                    <input type="checkbox" id="setting-bottom-card-preview">
                    <span class="slider"></span>
                </label>
            </div>
        </div>

    </div>
    `;
};

// 🟢 2. 負責綁定面板內的微互動、拖曳與點擊事件
window.initDisplaySettingsEvents = function() {
    const segBtns = document.querySelectorAll('#render-mode-control .seg-btn');
    const segBg = document.querySelector('#render-mode-control .seg-bg');
    
    // 🎯 核心切換功能 (純淨點擊版，絕對防呆儲存)
    function setSegment(index, save = true) {
        if (!segBtns[index]) return;
        
        // 切換按鈕視覺
        segBtns.forEach(b => b.classList.remove('active'));
        segBtns[index].classList.add('active');
        
        // 切換背景滑塊
        if (segBg) {
            segBg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
            segBg.style.transform = index === 0 ? 'translateX(0)' : 'translateX(100%)';
        }
        
        const mode = index === 0 ? 'quality' : 'performance';
        
        // ✨ 強制控制光影凍結標籤
        if (mode === 'performance') {
            document.body.classList.add('performance-mode');
        } else {
            document.body.classList.remove('performance-mode');
        }
        
        // 💾 雙重儲存保險 (強制寫入 LocalStorage 與 IndexedDB)
        if (save) {
            try { localStorage.setItem('tsukin_setting_renderMode', mode); } catch(e) {}
            
            import('../data/db-settings.js').then(db => {
                if (db.saveDisplaySetting) {
                    db.saveDisplaySetting('renderMode', mode);
                    console.log('✅ 描画モード已儲存：', mode);
                }
            }).catch(e => console.error(e));
            
            if (window.navigator.vibrate) window.navigator.vibrate(10);
        }
    }

    // =========================================================
    // A. 暴力點擊綁定：移除複雜手勢計算，點擊誰就切換誰並強制存檔
    // =========================================================
    segBtns.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            setSegment(index, true); 
        });
    });

    // =========================================================
    // B. 初始化讀取與其他設定開關
    // =========================================================
    import('../data/db-settings.js').then(dbSettings => {
        
        // 🎯 0. 讀取並初始化描畫模式
        if (dbSettings.getDisplaySetting) {
            dbSettings.getDisplaySetting('renderMode', 'quality').then(dbMode => {
                // 優先信任 LocalStorage，防止非同步載入導致狀態閃爍
                const localMode = localStorage.getItem('tsukin_setting_renderMode') || dbMode;
                setSegment(localMode === 'performance' ? 1 : 0, false); 
            });
        }

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

        // 🎯 3. 新增：開啟底部卡片預覽設定 (預設關閉 false)
        const bottomPreviewSwitch = document.getElementById('setting-bottom-card-preview');
        if (bottomPreviewSwitch && dbSettings.getDisplaySetting) {
            dbSettings.getDisplaySetting('bottomCardPreview', false).then(isPreviewEnabled => {
                bottomPreviewSwitch.checked = isPreviewEnabled;
                if (isPreviewEnabled) document.body.classList.add('enable-bottom-preview');
            });

            bottomPreviewSwitch.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                dbSettings.saveDisplaySetting('bottomCardPreview', isChecked);
                
                // 立即套用 Class 讓 CSS 能夠抓取
                document.body.classList.toggle('enable-bottom-preview', isChecked);
                
                console.log(`設定 [底部卡片預覽] 切換為：`, isChecked);
                if (window.navigator.vibrate) window.navigator.vibrate(5);
            });
        }

        // 🎯 4. 其他開關 (預留未來擴充)
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