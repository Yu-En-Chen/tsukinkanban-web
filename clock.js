// clock.js - 靈動膠囊 (Dynamic Island) 本體伸縮 + Q彈回彈版

export function initDynamicClock() {
    const clockContainer = document.getElementById('entry-time-display');
    const leftCapsule = document.querySelector('.left-capsule.top-capsule');
    const syncIcon = document.querySelector('.left-capsule-icon');
    
    if (!clockContainer || !leftCapsule) return;

    // 🟢 設定膠囊的尺寸極限
    const MAX_W = 95; // 原始寬度
    const MIN_W = 44; // 縮到最小變成 44x44 的正圓形
    const RANGE = MAX_W - MIN_W;

    // 開場時計算：膠囊現在應該縮小到多寬？
    const initialS = new Date().getSeconds();
    const initialRatio = Math.max(0, initialS / 58);
    leftCapsule.style.setProperty('--capsule-dur', '0s'); // 第一下沒有動畫
    leftCapsule.style.setProperty('--capsule-width', `${MAX_W - (RANGE * initialRatio)}px`);

    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, '0');
    const currentM = String(now.getMinutes()).padStart(2, '0');
    let lastTimeString = localStorage.getItem('tsukin_last_time') || (currentH + currentM);
    let lastMinute = -1; 

    // 初始化時間數字
    const ids = ['hour-tens', 'hour-units', 'min-tens', 'min-units'];
    ids.forEach((id, index) => {
        const digitContainer = document.getElementById(id);
        if (!digitContainer) return;

        const oldChar = lastTimeString[index];
        const oldSpan = digitContainer.querySelector('.old-val');
        const newSpan = digitContainer.querySelector('.new-val');

        if (oldSpan) oldSpan.textContent = oldChar;
        if (newSpan) newSpan.textContent = oldChar;
        digitContainer.dataset.value = oldChar; 
    });

    requestAnimationFrame(() => {
        clockContainer.classList.add('ready');
    });

    function updateDigit(id, newValue) {
        const digitContainer = document.getElementById(id);
        if (!digitContainer) return;

        const track = digitContainer.querySelector('.ticker-track');
        const oldSpan = track.querySelector('.old-val');
        const newSpan = track.querySelector('.new-val');
        const currentValue = digitContainer.dataset.value || '0';

        if (currentValue !== newValue) {
            oldSpan.textContent = currentValue; 
            newSpan.textContent = newValue;     

            track.classList.remove('rolling');
            void track.offsetWidth; 
            track.classList.add('rolling');

            digitContainer.dataset.value = newValue;
        }
    }

    // 核心計時引擎
    function tickClock() {
        const timeNow = new Date();
        const h = String(timeNow.getHours()).padStart(2, '0');
        const m = String(timeNow.getMinutes()).padStart(2, '0');
        const s = timeNow.getSeconds();

        updateDigit('hour-tens', h[0]);
        updateDigit('hour-units', h[1]);
        updateDigit('min-tens', m[0]);
        updateDigit('min-units', m[1]);

        // 🟢 操控膠囊本人的寬度
        if (s === 0) {
            // 第 0 秒：賦予蘋果彈簧曲線，Q 彈回滿 (95px)
            leftCapsule.style.setProperty('--capsule-dur', '0.8s');
            leftCapsule.style.setProperty('--capsule-ease', 'var(--apple-spring)');
            leftCapsule.style.setProperty('--capsule-width', `${MAX_W}px`);
        } else {
            // 第 1~58 秒：線性縮小，右邊不動，左邊像被吃掉一樣往右縮
            const ratio = Math.max(0, s / 58);
            leftCapsule.style.setProperty('--capsule-dur', '1s');
            leftCapsule.style.setProperty('--capsule-ease', 'linear');
            leftCapsule.style.setProperty('--capsule-width', `${MAX_W - (RANGE * ratio)}px`);
        }

        // 觸發 SVG 逆時針旋轉
        if (lastMinute !== -1 && lastMinute !== m) {
            if (syncIcon) {
                syncIcon.classList.remove('syncing');
                void syncIcon.offsetWidth; 
                syncIcon.classList.add('syncing');
                
                setTimeout(() => {
                    syncIcon.classList.remove('syncing');
                }, 1000);
            }
        }
        lastMinute = m; 

        localStorage.setItem('tsukin_last_time', h + m);
    }

    setTimeout(tickClock, 300);
    setInterval(tickClock, 1000);
}