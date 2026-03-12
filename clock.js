// clock.js - 配合同步攔截腳本的完美機械翻頁版

export function initDynamicClock() {
    // 專責更新單一數字軌道的函式
    function updateDigit(id, newValue) {
        const digitContainer = document.getElementById(id);
        if (!digitContainer) return;

        const track = digitContainer.querySelector('.ticker-track');
        const oldSpan = track.querySelector('.old-val');
        const newSpan = track.querySelector('.new-val');
        
        // 讀取目前的數值，如果沒有(代表是這輩子第一次開網頁)，預設就是 HTML 寫死的 '0'
        const currentValue = digitContainer.dataset.value || '0';

        // 只要數值有變化，就觸發「由上到下」滾動動畫
        if (currentValue !== newValue) {
            oldSpan.textContent = currentValue; 
            newSpan.textContent = newValue;     

            // 拔除並重新加入 class 以重置 CSS 動畫
            track.classList.remove('rolling');
            void track.offsetWidth; 
            track.classList.add('rolling');

            digitContainer.dataset.value = newValue;
        }
    }

    // 核心計時引擎
    function tickClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');

        updateDigit('hour-tens', h[0]);
        updateDigit('hour-units', h[1]);
        updateDigit('min-tens', m[0]);
        updateDigit('min-units', m[1]);

        // 每次滴答，都把最新時間存入記憶體
        localStorage.setItem('tsukin_last_time', h + m);
    }

    // 🟢 延遲 0.3 秒後啟動。
    // 如果是第一次開，會從 00:00 機械翻頁到現在時間。
    // 如果是重整，畫面一開始就是記憶的時間 (絕對不閃爍)，過 0.3 秒後若時間有變，再滑順地翻頁。
    setTimeout(tickClock, 300);

    // 啟動每秒監控
    setInterval(tickClock, 1000);
}