// clock.js - 完美機械翻頁 + 智慧圓角電池消耗版

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
        
        // 🟢 開場時計算：剩下多少「寬度百分比」
        const initialS = new Date().getSeconds();
        const initialRatio = Math.max(0, 1 - (initialS / 58));
        progressBar.style.width = `${initialRatio * 100}%`; // 改用 width
        
        leftCapsule.insertBefore(progressBar, leftCapsule.firstChild);

        setTimeout(() => {
            progressBar.style.transition = 'width 1s linear'; // 動畫改為 width
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

        // 2. 🟢 更新電池寬度進度
        if (progressBar) {
            if (s === 0) {
                // 第 0 秒：瞬間回滿寬度 100%
                progressBar.style.transition = 'none';
                progressBar.style.width = '100%'; // 回滿
                void progressBar.offsetWidth; 
                progressBar.style.transition = 'width 1s linear';
            } else {
                // 第 1~58 秒：寬度不斷縮小。因為釘在右側，所以會像 iOS 電池一樣往右縮短
                const ratio = Math.max(0, 1 - (s / 58));
                progressBar.style.width = `${ratio * 100}%`;
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