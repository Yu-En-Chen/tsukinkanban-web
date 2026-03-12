// clock.js - 獨立的動態滾動時鐘模組

export function initDynamicClock() {
    // 專責更新單一數字軌道的函式
    function updateDigit(id, newValue) {
        const digitContainer = document.getElementById(id);
        if (!digitContainer) return;

        const track = digitContainer.querySelector('.ticker-track');
        const oldSpan = track.querySelector('.old-val');
        const newSpan = track.querySelector('.new-val');
        const currentValue = digitContainer.dataset.value;

        // 1. 初始載入：不播放動畫，直接設定預設值
        if (currentValue === undefined) {
            digitContainer.dataset.value = newValue;
            oldSpan.textContent = newValue;
            newSpan.textContent = newValue;
            return;
        }

        // 2. 數值發生變化：觸發「由上到下」滾動動畫
        if (currentValue !== newValue) {
            // 由於動畫是往下掉，所以新數字放在上方(new-val)，舊數字放在下方(old-val)
            oldSpan.textContent = currentValue; 
            newSpan.textContent = newValue;     

            // 拔除並重新加入 class 以重置 CSS 動畫
            track.classList.remove('rolling');
            void track.offsetWidth; // 觸發瀏覽器 Reflow (強制重繪)
            track.classList.add('rolling');

            digitContainer.dataset.value = newValue;
        }
    }

    // 核心計時引擎
    function tickClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');

        // 把字串拆成 4 個獨立的字元，餵給 4 個軌道
        updateDigit('hour-tens', h[0]);
        updateDigit('hour-units', h[1]);
        updateDigit('min-tens', m[0]);
        updateDigit('min-units', m[1]);
    }

    // 立即啟動第一次渲染
    tickClock();

    // 啟動每秒監控 (用 1000ms 最保險，避免剛好跨越分鐘切換點時漏接)
    setInterval(tickClock, 1000);
}