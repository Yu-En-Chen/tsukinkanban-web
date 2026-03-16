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

// 🟢 2. 負責綁定面板內的微互動、拖曳與點擊事件
window.initDisplaySettingsEvents = function() {
    const segControl = document.getElementById('render-mode-control');
    const segBtns = document.querySelectorAll('#render-mode-control .seg-btn');
    const segBg = document.querySelector('#render-mode-control .seg-bg');
    
    let activeIndex = 0; // 0=品質, 1=動作
    let isDragging = false;
    let startX = 0;
    let currentTranslate = 0;
    let bgWidth = 0;

    // 🎯 核心切換功能 (供點擊與拖曳放開時呼叫)
    function setSegment(index) {
        activeIndex = index;
        segBtns.forEach(b => b.classList.remove('active'));
        segBtns[index].classList.add('active');
        
        // 恢復彈簧動畫
        segBg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
        if (index === 0) segBg.style.transform = 'translateX(0)';
        else segBg.style.transform = 'translateX(100%)';
        
        console.log('描畫模式切換為：', segBtns[index].dataset.val);
        if (window.navigator.vibrate) window.navigator.vibrate(10);
    }

    // A. 點擊事件
    segBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            if (isDragging) return; // 如果正在拖曳，就不觸發點擊
            setSegment(index);
        });
    });

    // B. 手指拖曳 (Swipe) 物理引擎
    if (segControl && segBg) {
        segControl.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            bgWidth = segBg.offsetWidth; // 取得滑塊的實際寬度
            
            // 拔掉動畫，讓滑塊完全「零延遲」跟著手指
            segBg.style.transition = 'none';
            
            // 判斷目前是從 0 出發，還是從右邊 (bgWidth) 出發
            currentTranslate = activeIndex === 0 ? 0 : bgWidth;
        }, { passive: true });

        segControl.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const deltaX = e.touches[0].clientX - startX;
            let newTranslate = currentTranslate + deltaX;

            // 物理邊界鎖定：不准滑出左右膠囊範圍
            if (newTranslate < 0) newTranslate = 0;
            if (newTranslate > bgWidth) newTranslate = bgWidth;

            // 絕對跟手位移
            segBg.style.transform = `translateX(${newTranslate}px)`;
        }, { passive: true });

        segControl.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            // 讀取手指放開瞬間的像素位置
            const match = segBg.style.transform.match(/translateX\(([-\d.]+)px\)/);
            if (match) {
                const finalTranslate = parseFloat(match[1]);
                // 如果滑超過中線，就吸附到右邊 (動作)；否則吸附回左邊 (品質)
                if (finalTranslate > bgWidth / 2) setSegment(1);
                else setSegment(0);
            } else {
                setSegment(activeIndex);
            }
            
            // 延遲 50ms 解除拖曳狀態，避免誤觸 click 事件
            setTimeout(() => { isDragging = false; }, 50);
        });
    }

    // C. 綁定 iOS 原生開關的狀態變更
    const switches = ['reduce-motion', 'reduce-blur', 'disable-gradient', 'default-cursor'];
    switches.forEach(id => {
        const el = document.getElementById(`setting-${id}`);
        if (el) {
            el.addEventListener('change', (e) => {
                console.log(`設定 [${id}] 狀態改變：`, e.target.checked);
                if (window.navigator.vibrate) window.navigator.vibrate(5);
            });
        }
    });
};