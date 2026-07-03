// clock.js - 左側膠囊時鐘：最終同步時刻顯示與分鐘動畫

export function initDynamicClock() {
    const clockContainer = document.getElementById('entry-time-display');
    const leftCapsule = document.querySelector('.left-capsule.top-capsule');
    const syncIcon = document.querySelector('.left-capsule-icon');
    
    if (!clockContainer || !leftCapsule) return;

    // 膠囊的尺寸極限
    const MAX_W = 95;
    const MIN_W = 50; // 50 可讓膠囊在圖示置中時提早回彈
    const RANGE = MAX_W - MIN_W;

    // 追趕同步：讓膠囊寬度對齊當前秒數
    function resyncCapsule() {
        const currentS = new Date().getSeconds();
        
        // 0-1 秒交由 tickClock 處理，避免動畫互相干擾
        if (currentS === 0 || currentS === 1) return;

        const currentRatio = currentS / 60; 
        const currentW = MAX_W - (RANGE * currentRatio);

        // 先以 0.8 秒彈簧曲線追上當前應有的寬度
        leftCapsule.style.setProperty('--capsule-dur', '0.8s');
        leftCapsule.style.setProperty('--capsule-ease', 'var(--apple-spring)');
        leftCapsule.style.setProperty('--capsule-width', `${currentW}px`);

        // 到位後接續剩餘秒數的線性收縮
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

    // 初始化時先同步一次
    resyncCapsule();

    // 從背景切回前景時重新校準
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            resyncCapsule();
            // 並立即觸發一次 API 更新，確保資料最新
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

    // 全域接口：以日本標準時間 (JST) 顯示最後同步時刻
    window.updateSystemSyncTime = function(dateObj) {
        if (!dateObj) return;

        // 記錄本次成功同步時的裝置時間戳
        localStorage.setItem('tsukin_last_sync_device_time', Date.now().toString());

        // 轉換為東京時間
        const jstString = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Tokyo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(dateObj);

        const [hourPart, minPart] = jstString.split(':');
        const h = String(hourPart).padStart(2, '0');
        const m = String(minPart).padStart(2, '0');

        updateDigit('hour-tens', h[0]);
        updateDigit('hour-units', h[1]);
        updateDigit('min-tens', m[0]);
        updateDigit('min-units', m[1]);

        // 跑馬燈數字對螢幕閱讀器是亂碼，改由容器的 aria-label 唸出完整時間
        const syncClockEl = document.getElementById('entry-time-display');
        if (syncClockEl) syncClockEl.setAttribute('aria-label', `最終同期時刻 ${h}:${m}`);

        localStorage.setItem('tsukin_last_time', h + m);

        // 同步成功後清除警告顏色
        const clockContainer = document.getElementById('entry-time-display');
        const capsule = document.querySelector('.left-capsule.top-capsule');
        if (clockContainer) clockContainer.classList.remove('sync-warning-yellow', 'sync-warning-red');
        if (capsule) capsule.classList.remove('sync-warning-yellow', 'sync-warning-red');
    };

    // 計時引擎：膠囊動畫、背景 API 觸發與斷線偵測
    function tickClock() {
        const timeNow = new Date();
        const m = String(timeNow.getMinutes()).padStart(2, '0');

        // 斷線偵測：檢查距離上次成功同步經過多久
        const lastSyncTimeStr = localStorage.getItem('tsukin_last_sync_device_time');
        if (lastSyncTimeStr) {
            const elapsedMs = Date.now() - parseInt(lastSyncTimeStr, 10);
            const elapsedMinutes = elapsedMs / (1000 * 60); // 換算成分鐘
            
            const clockContainer = document.getElementById('entry-time-display');
            const capsule = document.querySelector('.left-capsule.top-capsule');

            if (clockContainer && capsule) {
                if (elapsedMinutes >= 5) {
                    // 超過 5 分鐘：亮紅燈
                    clockContainer.classList.remove('sync-warning-yellow');
                    clockContainer.classList.add('sync-warning-red');
                    capsule.classList.remove('sync-warning-yellow');
                    capsule.classList.add('sync-warning-red');
                } else if (elapsedMinutes >= 1) {
                    // 1 到 5 分鐘：亮黃燈
                    clockContainer.classList.remove('sync-warning-red');
                    clockContainer.classList.add('sync-warning-yellow');
                    capsule.classList.remove('sync-warning-red');
                    capsule.classList.add('sync-warning-yellow');
                } else {
                    // 1 分鐘以內：正常狀態，清除顏色
                    clockContainer.classList.remove('sync-warning-yellow', 'sync-warning-red');
                    capsule.classList.remove('sync-warning-yellow', 'sync-warning-red');
                }
            }
        }

        // 以「分鐘變化」而非「第 0 秒」判斷換分，避免瀏覽器節流造成漏秒
        if (lastMinute !== -1 && m !== lastMinute) {
            
            // 分鐘跳動的瞬間
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

            // 分鐘變化時觸發背景 API 更新
            if (window.triggerBackgroundUpdate) {
                window.triggerBackgroundUpdate();
            }

            // 1 秒後接續整分鐘的線性收縮
            setTimeout(() => {
                leftCapsule.style.setProperty('--capsule-dur', '59s');
                leftCapsule.style.setProperty('--capsule-ease', 'linear');
                leftCapsule.style.setProperty('--capsule-width', `${MIN_W}px`);
            }, 1000);
        }

        lastMinute = m; 
    }

    // 啟動
    setTimeout(tickClock, 300);
    setInterval(tickClock, 1000);
}