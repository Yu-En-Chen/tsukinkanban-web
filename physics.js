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

        updateGlareTarget();

        // 判斷手勢方向：大於 0 是往下拉，小於 0 是往上推
        if (currentPullY > 0) {
            
            // 1. 🟢 整體下墜位移 (Display Y)
            // 原本是 0.2 會掉太快。改為 0.05，讓牌組底部像有重量一樣穩住，偏向「向上展開」
            displayY = currentPullY * 0.05; 
            
            // 2. 🟢 核心魔法：漸進式阻尼公式 (Asymptotic Damping)
            // 公式原理：(拉力 * 極限) / (拉力 + 極限)
            let rawSpread = currentPullY * 0.4; // 靈敏度：數字越大越容易拉開 (原本是 0.6)
            let maxLimit = 42; // 極限值：卡片間距最多只能撐開到大約 42px，永遠不會撞到頂部搜尋列

            // 套用公式：這樣一拉就會平滑散開，且越拉越緊，徹底消滅 -25 帶來的瞬間斷層！
            spreadValue = (rawSpread * maxLimit) / (rawSpread + maxLimit); 
            
        } else if (currentPullY < 0) {
            
            // 🔼 上滑時的壓縮行為 (維持原本的設計即可)
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
        // 🟢 縮放動畫徹底結束後：等待滑鼠有「真實移動」才重新允許卡片抬起！
            window.addEventListener('mousemove', function unlockHoverAfterScroll() {
                if (!mainStack.classList.contains('allow-hover')) {
                    mainStack.classList.add('allow-hover');
                }
                window.removeEventListener('mousemove', unlockHoverAfterScroll);
            }, { once: true });

        }, 500); // 500ms 是回彈動畫的時間
    };

mainStack.addEventListener('touchmove', (e) => {
        // 🟢 核心修復：檢查如果現在是長按掃描模式 (isScrubbing === 'true')
        if (mainStack.dataset.isScrubbing === 'true') {
            // 如果原本在長按前有產生微小的拉力，瞬間將拉力歸零，確保牌組「完全平躺」
            if (currentPullY !== 0) {
                currentPullY = 0;
                updateGlareTarget();
                if (!rafId) rafId = requestAnimationFrame(updateUI);
            }
            // 物理引擎直接罷工退出，不處理任何拉動！
            return; 
        }

        const touchY = e.touches[0].pageY;
        
        if (!isDragging) {
            isDragging = true;
            if (bounceTimer) clearTimeout(bounceTimer);
            mainStack.classList.remove('bounce-back');
            mainStack.classList.add('dragging'); 
            // 🟢 滾輪開始滾動時：立刻沒收 Hover 權限，防止滑鼠游標干擾動畫
            mainStack.classList.remove('allow-hover');
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

        // 🟢 3. 滾輪攔截守衛：如果目前被鎖定，就不斷延長鎖定時間，並直接退出！
        if (mainStack.dataset.blockScroll === 'true') {
            if (e.cancelable) e.preventDefault();
            
            // 只要滑鼠還在滾，就持續重置 250ms 的計時器
            clearTimeout(window.scrollCooldownTimer);
            window.scrollCooldownTimer = setTimeout(() => {
                mainStack.dataset.blockScroll = 'false'; // 必須徹底停下手 0.25 秒才會解鎖
            }, 250);
            
            return; // ⛔ 救命關鍵：直接退出！絕對不執行下方的縮放動畫
        }
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
