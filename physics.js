// physics.js - 獨立的光影與滑動物理引擎模組

export function initPhysics(mainStack, getActiveCardId, closeAllCards) {
    let startTouchY = 0;
    let currentPullY = 0;
    let isDragging = false;
    let rafId = null;
    let wheelDeltaSum = 0;
    let wheelTimer;
    let bounceTimer = null; // 🟢 新增：用於防止連續滑動時的計時器衝突

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const touchSettings = { pullFactor: 2.2, tension: 0.7, spreadRatio: 0.18 };
    const mouseSettings = { pullFactor: 0.3, tension: 0.7, spreadRatio: 0.15 };
    const config = isTouchDevice ? touchSettings : mouseSettings;

    let currentGlareAngle = 135; 
    let targetGlareAngle = 135;  
    let isGlareAnimating = false; 

    function updateGlare(angle) {
        targetGlareAngle = angle;
        startGlareLoop();
    }

    const updateGlareTarget = () => {
        const baseAngle = 135;
        const pullSensitivity = 0.7;   
        const scrollSensitivity = 0.7; 

        const pullOffset = currentPullY * pullSensitivity; 
        const scrollOffset = mainStack.scrollTop * scrollSensitivity; 
        
        let calculated = baseAngle + pullOffset - scrollOffset;
        targetGlareAngle = Math.max(95, Math.min(175, calculated));
        
        startGlareLoop();
    };

    const startGlareLoop = () => {
        if (!isGlareAnimating) {
            isGlareAnimating = true;
            animateGlareLoop();
        }
    };

    const animateGlareLoop = () => {
        const smoothing = 0.08;
        const diff = targetGlareAngle - currentGlareAngle;
        
        if (Math.abs(diff) > 0.01 || isDragging) {
            currentGlareAngle += diff * smoothing;
            document.documentElement.style.setProperty('--glare-angle', `${currentGlareAngle}deg`);
            requestAnimationFrame(animateGlareLoop);
        } else {
            isGlareAnimating = false;
            if (Math.abs(diff) > 0) {
                 currentGlareAngle = targetGlareAngle;
                 document.documentElement.style.setProperty('--glare-angle', `${currentGlareAngle}deg`);
            }
        }
    };

    startGlareLoop();

const updateUI = () => {
        let displayY = 0;
        let spreadValue = 0;
        let tiltAngle = 0; // 🟢 新增：儲存 3D 傾斜角度

        updateGlareTarget();

        if (currentPullY > 0) {
            // 🔽 1. 下拉位移與展開 (維持你滿意的彈力手感)
            displayY = currentPullY * 0.05; 
            let rawSpread = currentPullY * 0.4; 
            let maxLimit = 42; 
            spreadValue = (rawSpread * maxLimit) / (rawSpread + maxLimit); 
            
            // 🟢 2. 微 3D 傾斜阻尼公式
            // 公式與展開相同，讓旋轉角度也是「越拉越緊，最後平滑煞停」
            let rawTilt = currentPullY * 0.03; 
            let maxTilt = 3; // 絕對極限值：最大只允許傾斜 3 度
            
            // 加上負號，代表往下拖曳時，卡片的「上方」會往後倒，產生像是百葉窗或被手指壓扁的透視感
            tiltAngle = -((rawTilt * maxTilt) / (rawTilt + maxTilt)); 
            
        } else if (currentPullY < 0) {
            // 🔼 上滑壓縮 (維持之前的完美阻尼)
            let absPull = Math.abs(currentPullY);
            let rawCompress = absPull * 0.45;
            let maxCompress = 35; 
            spreadValue = -((rawCompress * maxCompress) / (rawCompress + maxCompress));

            let maxMove = mainStack.offsetTop + 60; 
            displayY = -((absPull * maxMove) / (absPull + maxMove));
        }

        // 將所有的物理計算結果寫入 DOM
        mainStack.style.transform = `translate3d(0, ${displayY}px, 0)`;
        mainStack.style.setProperty('--stack-spread', `${spreadValue}px`);
        mainStack.style.setProperty('--tilt-angle', `${tiltAngle}deg`); // 🟢 寫入角度變數
        
        rafId = null;
    };

    const resetBounce = () => {
        if (!isDragging) return;
        const CLOSE_GESTURE_THRESHOLD = 60; 
        const activeId = getActiveCardId();

        if (activeId && currentPullY > CLOSE_GESTURE_THRESHOLD) {
            closeAllCards();
            return;
        }
        isDragging = false;
        
        // 強制重繪：確保瀏覽器徹底清除 dragging 狀態後再加入回彈動畫
        void mainStack.offsetHeight; 

        mainStack.classList.remove('dragging');
        mainStack.classList.add('bounce-back');
        currentPullY = 0;
        
        updateGlareTarget();
        
        if (!rafId) rafId = requestAnimationFrame(updateUI);
        
        // 🟢 計時器防呆：清除上一次的計時，防止動畫被提前錯殺
        if (bounceTimer) clearTimeout(bounceTimer);
        bounceTimer = setTimeout(() => { mainStack.classList.remove('bounce-back'); }, 500);
    };

    mainStack.addEventListener('touchstart', (e) => {
        startTouchY = e.touches[0].pageY;
        if (bounceTimer) clearTimeout(bounceTimer);
        mainStack.classList.remove('bounce-back');
        mainStack.classList.add('dragging');
    }, { passive: true });

    mainStack.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].pageY;
        
        if (!isDragging) {
            isDragging = true;
            if (bounceTimer) clearTimeout(bounceTimer);
            mainStack.classList.remove('bounce-back');
            mainStack.classList.add('dragging'); 
            startTouchY = touchY; 
        }

        const deltaY = touchY - startTouchY; 
        updateGlareTarget();

        currentPullY = Math.sign(deltaY) * Math.pow(Math.abs(deltaY), config.tension) * config.pullFactor;
        
        if (!rafId) rafId = requestAnimationFrame(updateUI);
        if (e.cancelable) e.preventDefault(); 
    }, { passive: false });

    mainStack.addEventListener('scroll', () => {
        if (!isDragging) updateGlareTarget();
    }, { passive: true });

    mainStack.addEventListener('touchend', resetBounce);
    
    // 🟢 終極防護：攔截 iOS 系統手勢中斷 (例如觸碰到 Home 橫條)
    mainStack.addEventListener('touchcancel', resetBounce);

    mainStack.addEventListener('wheel', (e) => {
        updateGlareTarget();

        if (!isDragging) {
            isDragging = true;
            if (bounceTimer) clearTimeout(bounceTimer);
            mainStack.classList.remove('bounce-back');
            mainStack.classList.add('dragging');
        }
        
        wheelDeltaSum -= e.deltaY;
        currentPullY = Math.sign(wheelDeltaSum) * Math.pow(Math.abs(wheelDeltaSum), mouseSettings.tension) * mouseSettings.pullFactor;
        
        if (!rafId) rafId = requestAnimationFrame(updateUI);
        
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => { wheelDeltaSum = 0; resetBounce(); }, 150);
        if (e.cancelable) e.preventDefault();
    }, { passive: false });

    return { updateGlare };
}
