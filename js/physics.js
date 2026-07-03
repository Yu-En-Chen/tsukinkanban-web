// physics.js - 卡片堆疊的光影與滑動物理效果

export function initPhysics(mainStack, getActiveCardId, closeAllCards) {
    let startTouchY = 0;
    let currentPullY = 0;
    let isDragging = false;
    let rafId = null;
    let wheelDeltaSum = 0;
    let wheelTimer;
    let bounceTimer = null; // 防止連續滑動時的計時器衝突

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const touchSettings = { pullFactor: 2.2, tension: 0.7, spreadRatio: 0.18 };
    const mouseSettings = { pullFactor: 0.35, tension: 0.65, spreadRatio: 0.15 };
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
        // 光影鎖定期間（開場或關閉動畫中）不做計算
        if (mainStack.dataset.freezeGlare === 'true') {
            isGlareAnimating = false;
            return;
        }
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

        // 判斷手勢方向：大於 0 是往下拉，小於 0 是往上推
        if (currentPullY > 0) {
            
            // 1. 整體下墜位移 (Display Y)
            // 係數 0.05：讓牌組底部保持穩定，偏向「向上展開」的視覺
            displayY = currentPullY * 0.05; 
            
            // 2. 漸進式阻尼公式 (Asymptotic Damping)
            // 公式原理：(拉力 * 極限) / (拉力 + 極限)
            let rawSpread = currentPullY * 0.4; // 靈敏度：數字越大越容易拉開
            let maxLimit = 42; // 卡片間距上限約 42px，避免頂到搜尋列

            // 拉動時平滑散開、越拉越緊，避免間距瞬間跳變
            spreadValue = (rawSpread * maxLimit) / (rawSpread + maxLimit); 
            
        } else if (currentPullY < 0) {
            
            // 上滑時的壓縮行為
            spreadValue = currentPullY * 0.45; 
            const limitY = -(mainStack.offsetTop + 30);
            if (currentPullY < limitY) displayY = limitY;
            else displayY = currentPullY;
        }

        // 將計算結果應用到實際的 DOM 元素上
        mainStack.style.transform = `translate3d(0, ${displayY}px, 0)`;
        mainStack.style.setProperty('--stack-spread', `${spreadValue}px`);
        
        // 釋放鎖，允許下一幀渲染
        rafId = null;
    };

// isWheel 區分滾輪與觸控，預設 false (觸控)
    const resetBounce = (isWheel = false) => {
        if (!isDragging) return;
        const CLOSE_GESTURE_THRESHOLD = 60; 
        const activeId = getActiveCardId();

        if (activeId && currentPullY > CLOSE_GESTURE_THRESHOLD) {
            closeAllCards();
            return;
        }
        isDragging = false;
        
        void mainStack.offsetHeight; 

        mainStack.classList.remove('dragging');
        
        // 依輸入來源套用不同的回彈 CSS class
        const bounceClass = isWheel ? 'bounce-back-wheel' : 'bounce-back';
        mainStack.classList.add(bounceClass);
        
        currentPullY = 0;
        updateGlareTarget();
        
        if (!rafId) rafId = requestAnimationFrame(updateUI);
        
        if (bounceTimer) clearTimeout(bounceTimer);
        
        // 滾輪回彈 850ms，觸控 500ms
        const bounceDuration = isWheel ? 850 : 500; 
        
bounceTimer = setTimeout(() => { 
            mainStack.classList.remove(bounceClass); 
            
            // hover 恢復條件：滑鼠須離開回彈時所在的卡片
            if (window.hoverUnlocker) window.removeEventListener('mousemove', window.hoverUnlocker);
            
            let lockedElement = 'init'; // 初始狀態
            
            window.hoverUnlocker = function(e) {
                // 取得滑鼠目前所在的卡片 (背景為 null)
                const currentElement = e.target.closest('.card'); 
                
                // 記錄回彈結束時滑鼠停留的卡片
                if (lockedElement === 'init') {
                    lockedElement = currentElement;
                    return;
                }

                // 滑鼠離開該卡片才視為新的瀏覽意圖，恢復 hover
                if (currentElement !== lockedElement) {
                    if (!mainStack.classList.contains('allow-hover')) {
                        mainStack.classList.add('allow-hover');
                    }
                    window.removeEventListener('mousemove', window.hoverUnlocker);
                    window.hoverUnlocker = null;
                }
            };
            window.addEventListener('mousemove', window.hoverUnlocker);

        }, bounceDuration);
    };
mainStack.addEventListener('touchmove', (e) => {
        // 長按掃描模式 (isScrubbing) 期間不處理拖曳
        if (mainStack.dataset.isScrubbing === 'true') {
            if (currentPullY !== 0) {
                currentPullY = 0;
                updateGlareTarget();
                if (!rafId) rafId = requestAnimationFrame(updateUI);
            }
            return; 
        }

        const touchY = e.touches[0].pageY;
        
        if (!isDragging) {
            isDragging = true;
            if (bounceTimer) clearTimeout(bounceTimer);
            mainStack.classList.remove('bounce-back');
            mainStack.classList.add('dragging');
            
            // 暫停 hover，避免游標干擾動畫
            mainStack.classList.remove('allow-hover');
            
            if (window.hoverUnlocker) {
                window.removeEventListener('mousemove', window.hoverUnlocker);
                window.hoverUnlocker = null;
            }
            
            // 記錄觸碰起始座標（拖曳計算的基準，不可移除）
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

    mainStack.addEventListener('touchend', () => resetBounce(false));
    
    // 攔截 iOS 系統手勢造成的觸控中斷 (如 Home 橫條)
    mainStack.addEventListener('touchcancel', () => resetBounce(false));

    mainStack.addEventListener('wheel', (e) => {

        // 3. 滾動鎖定期間：持續延長鎖定並直接返回
        if (mainStack.dataset.blockScroll === 'true') {
            if (e.cancelable) e.preventDefault();
            
            // 滾輪持續轉動時，重置 250ms 解鎖計時器
            clearTimeout(window.scrollCooldownTimer);
            window.scrollCooldownTimer = setTimeout(() => {
                mainStack.dataset.blockScroll = 'false'; // 停止滾動 0.25 秒後解鎖
            }, 300);
            
            return; // 鎖定期間不執行下方的縮放動畫
        }
        updateGlareTarget();

        if (!isDragging) {
            isDragging = true;
            if (bounceTimer) clearTimeout(bounceTimer);
            mainStack.classList.remove('bounce-back');
            mainStack.classList.add('dragging');
            
            // 滾輪開始時暫停 hover，收回已抬起的卡片
            mainStack.classList.remove('allow-hover');
            
            // 清除殘留的舊解鎖計時器
            if (window.hoverUnlocker) {
                window.removeEventListener('mousemove', window.hoverUnlocker);
                window.hoverUnlocker = null;
            }
        }
        
        // 單次滾輪增量的上限
        let step = e.deltaY;
        const maxStep = 35; // 建議 30 ~ 40
        
        // 超過上限則截斷
        if (step > maxStep) step = maxStep;
        else if (step < -maxStep) step = -maxStep;

        // 截斷後的增量加入總和
        wheelDeltaSum -= step;
        
        // 增量已被上限保護，可直接線性 1:1 輸出
        currentPullY = wheelDeltaSum;
        
        if (!rafId) rafId = requestAnimationFrame(updateUI);
        
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => { wheelDeltaSum = 0; resetBounce(true); }, 100);
        if (e.cancelable) e.preventDefault();
    }, { passive: false });

    return { updateGlare };
}
