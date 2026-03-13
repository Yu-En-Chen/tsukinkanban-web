// clock.js - 靈動膠囊 (CSS引擎接管絲滑版 + API防抽搐版)

export function initDynamicClock() {
    const clockContainer = document.getElementById('entry-time-display');
    const leftCapsule = document.querySelector('.left-capsule.top-capsule');
    const syncIcon = document.querySelector('.left-capsule-icon');
    
    if (!clockContainer || !leftCapsule) return;

    // 膠囊的尺寸極限
    const MAX_W = 95;
    const MIN_W = 50; // 🟢 將原本的 44 改成 50，讓它在 SVG 完美置中的瞬間提早回彈！
    const RANGE = MAX_W - MIN_W;

    // --- 🟢 1. 獨立出「追趕同步」引擎 ---
    function resyncCapsule() {
        const currentS = new Date().getSeconds();
        
        // 防呆：如果剛好是 0 秒或 1 秒，交給底下的 tickClock 核心引擎處理即可，避免動畫打架
        if (currentS === 0 || currentS === 1) return;

        const currentRatio = currentS / 60; 
        const currentW = MAX_W - (RANGE * currentRatio);

        // 1. 瞬間喚醒：使用 0.8 秒彈簧曲線，讓膠囊快速滑順「追趕」到當下該有的寬度
        leftCapsule.style.setProperty('--capsule-dur', '0.8s');
        leftCapsule.style.setProperty('--capsule-ease', 'var(--apple-spring)');
        leftCapsule.style.setProperty('--capsule-width', `${currentW}px`);

        // 2. 追趕到位後，無縫接軌進入「剩下的線性倒數」
        setTimeout(() => {
            const newS = new Date().getSeconds();
            if (newS !== 0 && newS !== 1) { 
                const remainingS = 60 - newS;
                leftCapsule.style.setProperty('--capsule-dur', `${remainingS}s`);
                leftCapsule.style.setProperty('--capsule-ease', 'linear');
                leftCapsule.style.setProperty('--capsule-width', `${MIN_W}px`);
            }
        }, 800);
    }

    // 🟢 2. 開場立即執行一次同步
    resyncCapsule();

    // 🟢 3. 監聽網頁可視狀態：從背景切回前景時，重新校準膠囊進度！
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            resyncCapsule();
        }
    });

    // --- 初始化時間數字 ---
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

        // --- 🟢 2. CSS 連續引擎指揮中心 ---
        if (s === 0) {
            // 第 0 秒：賦予蘋果彈簧曲線，瞬間 Q 彈回滿 (95px)
            leftCapsule.style.setProperty('--capsule-dur', '0.8s');
            leftCapsule.style.setProperty('--capsule-ease', 'var(--apple-spring)');
            leftCapsule.style.setProperty('--capsule-width', `${MAX_W}px`);

            // 🟢 終極 API 旋轉法：不用 class 切換，保證 100% 不抽搐！
            if (syncIcon) {
                syncIcon.animate([
                    { transform: 'translate(50%, -50%) rotate(0deg)' },
                    { transform: 'translate(50%, -50%) rotate(-360deg)' }
                ], {
                    duration: 1000, // 精準 1 秒鐘
                    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' // 母艦級變速曲線
                });
            }
        } else if (s === 1) {
            // 第 1 秒：彈簧動畫剛結束，下達「接下來 59 秒請慢慢縮小到 50px」的長期指令
            leftCapsule.style.setProperty('--capsule-dur', '59s');
            leftCapsule.style.setProperty('--capsule-ease', 'linear');
            leftCapsule.style.setProperty('--capsule-width', `${MIN_W}px`);
        }

        lastMinute = m; 
        localStorage.setItem('tsukin_last_time', h + m);
    }

    // 開場立即啟動
    setTimeout(tickClock, 300);
    setInterval(tickClock, 1000);
}