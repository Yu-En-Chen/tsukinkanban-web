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

    // 🟢 3. 監聽網頁可視狀態：從背景切回前景時，重新校準！
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            resyncCapsule();
            // ✨ 核心防護：切回畫面時，不囉唆立刻強制更新一次 API，確保資料最新！
            if (window.triggerBackgroundUpdate) {
                window.triggerBackgroundUpdate();
            }
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

    // 🟢 [更新] 全域接口：強制使用「日本標準時間 (JST)」顯示最後同步時間
    window.updateSystemSyncTime = function(dateObj) {
        if (!dateObj) return;

        // 核心魔法：無論手機在哪個時區，強制轉換為日本東京時間 (Asia/Tokyo)
        const jstString = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // 強制 24 小時制
        }).format(dateObj);

        // jstString 會安全地輸出如 "09:05" 或 "23:45" 的格式
        const [hourPart, minPart] = jstString.split(':');

        const h = String(hourPart).padStart(2, '0');
        const m = String(minPart).padStart(2, '0');

        updateDigit('hour-tens', h[0]);
        updateDigit('hour-units', h[1]);
        updateDigit('min-tens', m[0]);
        updateDigit('min-units', m[1]);

        // 儲存最後同步的日本時間到快取
        localStorage.setItem('tsukin_last_time', h + m);
    };

    // 核心計時引擎
    function tickClock() {
        const timeNow = new Date();
        const h = String(timeNow.getHours()).padStart(2, '0');
        const m = String(timeNow.getMinutes()).padStart(2, '0');
        const s = timeNow.getSeconds();

        // --- 🟢 終極防漏秒引擎：依賴「分鐘的改變」，而不依賴脆弱的「第 0 秒」 ---
        if (lastMinute !== -1 && m !== lastMinute) {
            
            // 分鐘正式跳動的那一刻 (相當於原本的第 0 秒)
            leftCapsule.style.setProperty('--capsule-dur', '0.8s');
            leftCapsule.style.setProperty('--capsule-ease', 'var(--apple-spring)');
            leftCapsule.style.setProperty('--capsule-width', `${MAX_W}px`);

            if (syncIcon) {
                syncIcon.animate([
                    { transform: 'translate(50%, -50%) rotate(0deg)' },
                    { transform: 'translate(50%, -50%) rotate(-360deg)' }
                ], {
                    duration: 1000, 
                    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' 
                });
            }

            // ⏱️ ✨ 不管瀏覽器怎麼 lag，只要分鐘變了，就絕對能觸發背景 API 更新！
            if (window.triggerBackgroundUpdate) {
                window.triggerBackgroundUpdate();
            }

            // 預約 1 秒後才接續長期的收縮指令 (取代原本的 s === 1)
            setTimeout(() => {
                leftCapsule.style.setProperty('--capsule-dur', '59s');
                leftCapsule.style.setProperty('--capsule-ease', 'linear');
                leftCapsule.style.setProperty('--capsule-width', `${MIN_W}px`);
            }, 1000);
        }

        lastMinute = m; 
    }

    // 開場立即啟動
    setTimeout(tickClock, 300);
    setInterval(tickClock, 1000);
}