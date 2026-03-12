// clock.js - 完美機械翻頁 + 電量消耗微互動版

export function initDynamicClock() {
    const clockContainer = document.getElementById('entry-time-display');
    const leftCapsule = document.querySelector('.left-capsule');
    const syncIcon = document.querySelector('.left-capsule-icon');
    
    if (!clockContainer) return;

    // 🟢 1. 動態生成「電量進度條」並注入膠囊中，保持 HTML 乾淨
    let progressBar = null;
    if (leftCapsule) {
        progressBar = document.createElement('div');
        progressBar.className = 'minute-progress-bar';
        
        // 取得當前秒數，設定初始電量比例 (避免重整時電量不連貫)
        const initialS = new Date().getSeconds();
        const initialRatio = 1 - (initialS / 60);
        progressBar.style.transform = `scaleX(${initialRatio})`;
        
        leftCapsule.insertBefore(progressBar, leftCapsule.firstChild);

        // 確保第一下沒有動畫，0.1秒後再掛上 1 秒的線性過渡
        setTimeout(() => {
            progressBar.style.transition = 'transform 1s linear';
        }, 100);
    }

    // 取得現在的真實時間與記憶體
    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, '0');
    const currentM = String(now.getMinutes()).padStart(2, '0');
    let lastTimeString = localStorage.getItem('tsukin_last_time') || (currentH + currentM);
    
    // 用來記錄上一次的分鐘，用以觸發旋轉動畫
    let lastMinute = -1; 

    // 初始化：瞬間把 DOM 替換成上次離開的時間
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

    // 替換完畢後，優雅地把時鐘淡入 (配合 style.css 的 .ready)
    requestAnimationFrame(() => {
        clockContainer.classList.add('ready');
    });

    // 專責更新單一數字軌道的函式
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

    // 核心計時與動畫引擎
    function tickClock() {
        const timeNow = new Date();
        const h = String(timeNow.getHours()).padStart(2, '0');
        const m = String(timeNow.getMinutes()).padStart(2, '0');
        const s = timeNow.getSeconds();

        // 1. 更新翻頁時鐘
        updateDigit('hour-tens', h[0]);
        updateDigit('hour-units', h[1]);
        updateDigit('min-tens', m[0]);
        updateDigit('min-units', m[1]);

        // 2. 🟢 更新電量消耗進度條
        if (progressBar) {
            if (s === 0) {
                // 當 0 秒時，拔除動畫瞬間填滿電量
                progressBar.style.transition = 'none';
                progressBar.style.transform = 'scaleX(1)';
                void progressBar.offsetWidth; // 強制重繪
                progressBar.style.transition = 'transform 1s linear';
            } else {
                // 根據秒數精準扣除電量
                const ratio = 1 - (s / 60);
                progressBar.style.transform = `scaleX(${ratio})`;
            }
        }

        // 3. 🟢 判斷分鐘是否發生變化 (觸發旋轉動畫)
        if (lastMinute !== -1 && lastMinute !== m) {
            if (syncIcon) {
                // 重置並掛上旋轉 class
                syncIcon.classList.remove('syncing');
                void syncIcon.offsetWidth; 
                syncIcon.classList.add('syncing');
                
                // 1.5 秒後動畫播完自動清除，等待下一次觸發
                setTimeout(() => {
                    syncIcon.classList.remove('syncing');
                }, 1500);
            }
        }
        lastMinute = m; // 記錄當下分鐘

        localStorage.setItem('tsukin_last_time', h + m);
    }

    // 延遲 0.3 秒後啟動。
    setTimeout(tickClock, 300);

    // 啟動每秒監控
    setInterval(tickClock, 1000);
}