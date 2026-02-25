// physics.js - 獨立的光影與滑動物理引擎模組

export function initPhysics(mainStack, getActiveCardId, closeAllCards) {
    let startTouchY = 0;
    let currentPullY = 0;
    let isDragging = false;
    let rafId = null;
    let wheelDeltaSum = 0;
    let wheelTimer;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const touchSettings = { pullFactor: 2.2, tension: 0.7, spreadRatio: 0.18 };
    const mouseSettings = { pullFactor: 0.3, tension: 0.7, spreadRatio: 0.15 };
    const config = isTouchDevice ? touchSettings : mouseSettings;

    // 光影物理緩衝系統
    let currentGlareAngle = 135; 
    let targetGlareAngle = 135;  
    let isGlareAnimating = false; 

    // 提供給外部呼叫的方法：強制更新光影角度 (例如 Overlay 滑動時)
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

        updateGlareTarget();

        if (currentPullY > 0) {
            // --- 🔽 頂部下拉邏輯 (橡皮筋與展開) ---
            displayY = currentPullY * 0.25; 
            
            // 🟢 修復裁切穿幫：加上 Math.min 限制最大展開值 (最高 30px)
            // 防止拉力過大時，卡片無限制推開飛出螢幕
            spreadValue = Math.min((currentPullY * 0.4) - 15, 30);

        } else if (currentPullY < 0) {
            // --- 🔼 底部上滑邏輯 (置底回彈) ---
            
            // 🟢 修復卡頓掉落：絕對禁止在此時壓縮卡片 (設定負值)
            // 保持 0，讓容器總高度不變，就不會觸發瀏覽器強制鎖定
            spreadValue = 0; 
            
            // 純粹讓整個容器往上平移產生阻尼感
            displayY = currentPullY * 0.4; 
        }

        mainStack.style.transform = `translate3d(0, ${displayY}px, 0)`;
        mainStack.style.setProperty('--stack-spread', `${spreadValue}px`);
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
        mainStack.classList.add('bounce-back');
        currentPullY = 0;
        
        updateGlareTarget();
        
        if (!rafId) rafId = requestAnimationFrame(updateUI);
        setTimeout(() => { mainStack.classList.remove('bounce-back'); }, 500);
    };

    // 綁定手勢與滾動事件
    mainStack.addEventListener('touchstart', (e) => {
        startTouchY = e.touches[0].pageY;
        mainStack.classList.remove('bounce-back');
    }, { passive: true });

    mainStack.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].pageY;
        const deltaY = touchY - startTouchY;
        const isAtTop = mainStack.scrollTop <= 0;
        const isAtBottom = mainStack.scrollTop + mainStack.clientHeight >= mainStack.scrollHeight - 1;
        const isLocked = mainStack.classList.contains('has-active');

        if (!isDragging) updateGlareTarget();

        if (isLocked || (isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
            isDragging = true;
            currentPullY = Math.sign(deltaY) * Math.pow(Math.abs(deltaY), config.tension) * config.pullFactor;
            if (!rafId) rafId = requestAnimationFrame(updateUI);
            if (e.cancelable) e.preventDefault(); 
        }
    }, { passive: false });

    mainStack.addEventListener('scroll', () => {
        if (!isDragging) updateGlareTarget();
    }, { passive: true });

    mainStack.addEventListener('touchend', resetBounce);

    mainStack.addEventListener('wheel', (e) => {
        const isAtTop = mainStack.scrollTop <= 0;
        const isAtBottom = mainStack.scrollTop + mainStack.clientHeight >= mainStack.scrollHeight - 1;
        const isLocked = mainStack.classList.contains('has-active');

        updateGlareTarget();

        if (isLocked || (isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            isDragging = true;
            wheelDeltaSum -= e.deltaY;
            currentPullY = Math.sign(wheelDeltaSum) * Math.pow(Math.abs(wheelDeltaSum), mouseSettings.tension) * mouseSettings.pullFactor;
            if (!rafId) rafId = requestAnimationFrame(updateUI);
            clearTimeout(wheelTimer);
            wheelTimer = setTimeout(() => { wheelDeltaSum = 0; resetBounce(); }, 150);
            if (e.cancelable) e.preventDefault();
        }
    }, { passive: false });

    // 回傳供外部控制的介面
    return {
        updateGlare
    };
}
