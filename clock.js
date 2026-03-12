// clock.js - 完美機械翻頁 + 實體方塊位移消耗版

export function initDynamicClock() {
    const clockContainer = document.getElementById('entry-time-display');
    const leftCapsule = document.querySelector('.left-capsule');
    const syncIcon = document.querySelector('.left-capsule-icon');
    
    if (!clockContainer) return;

    // 1. 動態生成「電量進度條實體」
    let progressBar = null;
    if (leftCapsule) {
        progressBar = document.createElement('div');
        progressBar.className = 'minute-progress-bar';
        
        // 🟢 開場時計算要向右滑出多少百分比
        const initialS = new Date().getSeconds();
        const initialRatio = Math.max(0, initialS / 58);
        progressBar.style.transform = `translateX(${initialRatio * 100}%)`;
        
        leftCapsule.insertBefore(progressBar, leftCapsule.firstChild);

        setTimeout(() => {
            progressBar.style.transition = 'transform 1s linear';
        }, 100);
    }

    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, '0');
    const currentM = String(now.getMinutes()).padStart(2, '0');
    let lastTimeString = localStorage.getItem('tsukin_last_time') || (currentH + currentM);
    let lastMinute = -1; 

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

        // 2. 🟢 更新實體方塊位移進度 (向右滑出)
        if (progressBar) {
            if (s === 0) {
                // 第 0 秒：拔除動畫，實體瞬間歸位 (填滿)
                progressBar.style.transition = 'none';
                progressBar.style.transform = 'translateX(0%)';
                void progressBar.offsetWidth; 
                progressBar.style.transition = 'transform 1s linear';
            } else {
                // 第 1~58 秒：實體不斷往右邊位移滑出
                const ratio = Math.max(0, s / 58);
                progressBar.style.transform = `translateX(${ratio * 100}%)`;
            }
        }

        if (lastMinute !== -1 && lastMinute !== m) {
            if (syncIcon) {
                syncIcon.classList.remove('syncing');
                void syncIcon.offsetWidth; 
                syncIcon.classList.add('syncing');
                
                setTimeout(() => {
                    syncIcon.classList.remove('syncing');
                }, 1500);
            }
        }
        lastMinute = m; 

        localStorage.setItem('tsukin_last_time', h + m);
    }

    setTimeout(tickClock, 300);
    setInterval(tickClock, 1000);
}