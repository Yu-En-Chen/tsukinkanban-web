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
        let displayY = currentPullY;
        let spreadValue = 0;

        updateGlareTarget();

        if (currentPullY > 0) {
            displayY = currentPullY * 0.2; 
            spreadValue = (currentPullY * 0.6) - 25;
        } else {
            spreadValue = currentPullY * 0.45; 
            const limitY = -(mainStack.offsetTop + 30);
            if (currentPullY < limitY) displayY = limitY;
            else displayY = currentPullY;
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
mainStack.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].pageY;
        let deltaY = touchY - startTouchY; 

        if (!isDragging) updateGlareTarget();

        // 🟢 核心改變：因為排版已鎖死，任何滑動皆「無條件」觸發物理阻尼
        if (!isDragging) {
            isDragging = true;
            startTouchY = touchY; 
            deltaY = 0;           
        }

        currentPullY = Math.sign(deltaY) * Math.pow(Math.abs(deltaY), config.tension) * config.pullFactor;
        
        if (!rafId) rafId = requestAnimationFrame(updateUI);
        if (e.cancelable) e.preventDefault(); 
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
