// clock.js - 獨立的動態滾動時鐘模組 (支援記憶與開場動畫版)

export function initDynamicClock() {
    // 🟢 1. 從瀏覽器本機記憶體讀取「上次離開時的時間」
    // 如果是第一次開網頁，找不到記憶，就預設給它 '0000'
    let lastTimeString = localStorage.getItem('tsukin_last_time') || '0000';

    // 🟢 2. 初始化：強行把 DOM 的初始狀態寫成「舊的時間」
    const ids = ['hour-tens', 'hour-units', 'min-tens', 'min-units'];
    ids.forEach((id, index) => {
        const digitContainer = document.getElementById(id);
        if (!digitContainer) return;

        const oldChar = lastTimeString[index];
        const track = digitContainer.querySelector('.ticker-track');
        const oldSpan = track.querySelector('.old-val');
        const newSpan = track.querySelector('.new-val');

        // 讓它一開始就顯示舊數字
        oldSpan.textContent = oldChar;
        newSpan.textContent = oldChar;
        
        // 騙過系統，把舊數字當成「當前狀態」
        digitContainer.dataset.value = oldChar; 
    });

    // 專責更新單一數字軌道的函式
    function updateDigit(id, newValue) {
        const digitContainer = document.getElementById(id);
        if (!digitContainer) return;

        const track = digitContainer.querySelector('.ticker-track');
        const oldSpan = track.querySelector('.old-val');
        const newSpan = track.querySelector('.new-val');
        const currentValue = digitContainer.dataset.value;

        // 只要數值有變化，就觸發「由上到下」滾動動畫
        // (因為我們前面騙了系統，所以第一次校時絕對會觸發動畫！)
        if (currentValue !== newValue) {
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
        const currentTimeString = h + m;

        // 把字串拆成 4 個獨立的字元，餵給 4 個軌道
        updateDigit('hour-tens', h[0]);
        updateDigit('hour-units', h[1]);
        updateDigit('min-tens', m[0]);
        updateDigit('min-units', m[1]);

        // 🟢 3. 每次滴答，都把最新時間存入記憶體
        localStorage.setItem('tsukin_last_time', currentTimeString);
    }

    // 🟢 4. 開機動畫：為了讓使用者剛開網頁時能親眼「看到」翻頁的過程
    // 我們刻意延遲 0.3 秒才觸發第一次校時！
    setTimeout(tickClock, 300);

    // 啟動每秒監控
    setInterval(tickClock, 1000);
}