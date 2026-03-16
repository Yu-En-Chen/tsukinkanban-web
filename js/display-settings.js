// ============================================================================
// js/display-settings.js - 「表示設定」面板 UI 與互動控制器
// ============================================================================

// 🟢 1. 負責生成設定面板的 HTML 結構
window.getDisplaySettingsHTML = function() {
    // 判斷是否為「精確指標裝置 (如電腦滑鼠)」
    const isDesktop = window.matchMedia('(pointer: fine)').matches;
    
    return `
    <div class="settings-container">
        <p class="settings-description">アプリの動作や視覚効果をカスタマイズできます。</p>
        
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

// 🟢 2. 負責綁定面板內的微互動與點擊事件
window.initDisplaySettingsEvents = function() {
    // A. 綁定分段控制器 (Segmented Control) 的滑動邏輯
    const segBtns = document.querySelectorAll('#render-mode-control .seg-btn');
    const segBg = document.querySelector('#render-mode-control .seg-bg');
    
    segBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            segBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 背景白塊平滑滑動
            if (index === 0) segBg.style.transform = 'translateX(0)';
            else segBg.style.transform = 'translateX(100%)';
            
            // TODO: 未來在此接入 DB 儲存與 CSS 變數切換
            console.log('描畫模式切換為：', btn.dataset.val);
            if (window.navigator.vibrate) window.navigator.vibrate(10);
        });
    });

    // B. 綁定 iOS 原生開關的狀態變更
    const switches = ['reduce-motion', 'reduce-blur', 'disable-gradient', 'default-cursor'];
    switches.forEach(id => {
        const el = document.getElementById(`setting-${id}`);
        if (el) {
            el.addEventListener('change', (e) => {
                // TODO: 未來在此接入 DB 儲存與 CSS 變數切換
                console.log(`設定 [${id}] 狀態改變：`, e.target.checked);
                if (window.navigator.vibrate) window.navigator.vibrate(5);
            });
        }
    });
};