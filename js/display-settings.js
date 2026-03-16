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
    </div>
    `;
};

// 🟢 2. 負責綁定面板內的微互動、拖曳與點擊事件
window.initDisplaySettingsEvents = function() {
    const segControl = document.getElementById('render-mode-control');
    const segBtns = document.querySelectorAll('#render-mode-control .seg-btn');
    const segBg = document.querySelector('#render-mode-control .seg-bg');
    
    let activeIndex = 0; // 0=品質, 1=動作
    let startX = 0;
    let currentTranslate = 0;
    let bgWidth = 0;
    
    // ✨ 核心升級：用來精準區分「點擊」還是「刻意滑動」的旗標
    let hasMoved = false; 

    // 🎯 核心切換功能
    function setSegment(index) {
        activeIndex = index;
        segBtns.forEach(b => b.classList.remove('active'));
        segBtns[index].classList.add('active');
        
        segBg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
        if (index === 0) segBg.style.transform = 'translateX(0)';
        else segBg.style.transform = 'translateX(100%)';
        
        console.log('描画モード切り替え：', segBtns[index].dataset.val);
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

        // 🎯 2. 其他開關 (暫時保留 Console 預留未來擴充)
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