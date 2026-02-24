/**
 * 🏆 獨立卡片配置區 (支援雙模式)
 */
const bottomCardConfig = {
    hex: '#D3D3D3',       
    hue: 50,             
    title: '運行情報',     
    status: 'Info',       
    description: '運行状況に関する詳細な情報は、各カードをタップして確認してください。', 
    borderColorOpacity: 0.15, 
    tagBgOpacity: 0.25        
};

// 狀態旗標
let isInitialLoad = true;
let isAnimating = false;
let liftTimer = null; 

// 1. 地區資料庫
const railwayData = [
    { id: 'tokyo', name: '東京都', kana: 'toukyouto toukyouto', status: '正常運転', hue: 140, desc: '現在、全線で概ね正常通り運行しています。', detail: ['標誌: 銀杏綠', '主要站: 東京、新宿'] },
    { id: 'kanagawa', name: '神奈川県', kana: 'kanagawa kanagawa', status: '正常運転', hue: 200, desc: '港灣部を含め、順調に運行されています。', detail: ['標誌: 海洋藍', '主要站: 橫濱、川崎'] },
    { id: 'saitama', name: '埼玉県', kana: 'saitama saitama', status: '正常運転', hue: 15, desc: '內陸各線、大きな混雜は見られません。', detail: ['標誌: 勾玉紅', '主要站: 大宮、浦和'] },
    { id: 'chiba', name: '千葉県', kana: 'chiba chiba', status: '一部遅延', hue: 50, desc: '強風の影響により、一部路線で速度を落として運轉しています。', detail: ['代表色: 菜花黃', '主要站: 千葉、柏'] },
    { id: 'toei-oedo', name: '都營 大江戸線', kana: 'おおえどせん oedo', status: '正常運転', hue: 325, desc: '大江戸線は全線で正常通り運轉しています。', detail: ['次發: 2分', '代表色: 洋紅'] }
];

function getPremiumGradient(hue) {
    const colorTop = `hsl(${hue}, 65%, 40%)`;    
    const colorBottom = `hsl(${hue}, 45%, 25%)`; 
    return `linear-gradient(135deg, ${colorTop}, ${colorBottom})`;
}

const mainStack = document.getElementById('main-stack');
const detailOverlay = document.getElementById('detail-overlay');
const detailContainer = document.getElementById('detail-card-container');
const searchInput = document.getElementById('search-input');
const searchContainer = document.getElementById('search-container');
let activeCardId = null; 
let isComposing = false; 

// --- 【 核心：物理與聯動系統 】 ---
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

// 🏆 光影物理緩衝系統 (Physics Buffer System) - 效能優化版
let currentGlareAngle = 135; // 當前顯示值
let targetGlareAngle = 135;  // 目標值 (手指決定)
let isGlareAnimating = false; // 🟢 新增：渲染迴圈狀態旗標

// 計算目標角度 (只負責計算，不直接寫入 DOM)
const updateGlareTarget = () => {
    const baseAngle = 135;
    
    // 靈敏度設定
    const pullSensitivity = 0.7;   
    const scrollSensitivity = 0.7; 

    const pullOffset = currentPullY * pullSensitivity; 
    const scrollOffset = mainStack.scrollTop * scrollSensitivity; 
    
    let calculated = baseAngle + pullOffset - scrollOffset;

    // 角度夾具
    const minAngle = 95; 
    const maxAngle = 175; 

    targetGlareAngle = Math.max(minAngle, Math.min(maxAngle, calculated));

    // 🟢 喚醒機制：只要目標值改變，就嘗試啟動渲染迴圈
    startGlareLoop();
};

// 🟢 新增：啟動渲染迴圈 (如果尚未啟動)
const startGlareLoop = () => {
    if (!isGlareAnimating) {
        isGlareAnimating = true;
        animateGlareLoop();
    }
};

// 🏆 獨立渲染循環 (Smooth Loop) - 🟢 已加入自動休眠
const animateGlareLoop = () => {
    // 緩衝係數 (0.1 = 非常滑順重手感, 0.2 = 跟手)
    const smoothing = 0.08;

    const diff = targetGlareAngle - currentGlareAngle;
    
    // 🟢 判斷是否繼續渲染：
    // 1. 差異大於 0.01 (肉眼可見的變化)
    // 2. 或者使用者正在拖曳中 (確保互動時絕對流暢)
    if (Math.abs(diff) > 0.01 || isDragging) {
        currentGlareAngle += diff * smoothing;
        document.documentElement.style.setProperty('--glare-angle', `${currentGlareAngle}deg`);
        requestAnimationFrame(animateGlareLoop);
    } else {
        // 🟢 進入休眠模式：停止迴圈，節省效能
        isGlareAnimating = false;
        // 可選：強制對齊一次以消除微小誤差
        if (Math.abs(diff) > 0) {
             currentGlareAngle = targetGlareAngle;
             document.documentElement.style.setProperty('--glare-angle', `${currentGlareAngle}deg`);
        }
    }
};

// 初始啟動一次 (確保畫面載入時正確)
startGlareLoop();

const updateUI = () => {
    let displayY = currentPullY;
    let spreadValue = 0;

    // 更新光影目標值 (這會自動喚醒 Glare Loop)
    updateGlareTarget();

    // 🏆 物理核心：雙向動態
    if (currentPullY > 0) {
        // --- 🔽 下拉邏輯 (先收納，後推開) ---
        
        // 容器位移：調低係數讓整體沈重感增加
        displayY = currentPullY * 0.2; 

        // 展開邏輯：線性方程式 y = 0.6x - 25
        // 剛開始拉會是負值 (收納)，拉多了變成正值 (推開)
        spreadValue = (currentPullY * 0.6) - 25;

    } else {
        // --- 🔼 上滑邏輯 ---
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
    if (activeCardId && currentPullY > CLOSE_GESTURE_THRESHOLD) {
        closeAllCards();
        return;
    }
    isDragging = false;
    mainStack.classList.add('bounce-back');
    currentPullY = 0;
    
    // 讓光影目標歸位 (Loop 會自動處理緩衝)
    updateGlareTarget();
    
    if (!rafId) rafId = requestAnimationFrame(updateUI);
    setTimeout(() => { mainStack.classList.remove('bounce-back'); }, 500);
};

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

    // 拖曳時持續更新目標，這會保持 Loop 喚醒
    if (!isDragging) updateGlareTarget();

    if (isLocked || (isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
        isDragging = true;
        currentPullY = Math.sign(deltaY) * Math.pow(Math.abs(deltaY), config.tension) * config.pullFactor;
        if (!rafId) rafId = requestAnimationFrame(updateUI);
        if (e.cancelable) e.preventDefault(); 
    }
}, { passive: false });

mainStack.addEventListener('scroll', () => {
    // 滾動時持續更新目標，這會保持 Loop 喚醒
    if (!isDragging) updateGlareTarget();
}, { passive: true });

mainStack.addEventListener('touchend', resetBounce);
mainStack.addEventListener('click', (e) => { if (activeCardId && e.target === mainStack) closeAllCards(); });

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

function toggleSearch(show) {
    const dismissIcon = document.getElementById('dismiss-icon');
    
    if (show) {
        const capsule = document.getElementById('action-capsule');
        const container = document.getElementById('search-container');
        if (capsule && capsule.classList.contains('menu-expanded')) {
            capsule.classList.remove('menu-expanded');
            container.classList.remove('menu-open'); 
            document.body.classList.remove('menu-active');
        }
    }

    if (show) {
        searchContainer.classList.add('active');
        document.body.classList.add('searching'); 
        
        if (dismissIcon) dismissIcon.style.opacity = '0';
        setTimeout(() => { searchInput.focus(); }, 300);
    } else {
        searchContainer.classList.remove('active');
        document.body.classList.remove('searching'); 
        searchInput.value = '';
        searchInput.blur();
        filterCards(''); 
        
        if (dismissIcon && activeCardId) {
            dismissIcon.style.opacity = '1';
        }
    }
}

function handleCapsuleMainClick() {
    const capsule = document.getElementById('action-capsule');
    if (capsule.classList.contains('menu-expanded')) {
        toggleCapsuleMenu();
    } else {
        console.log('Plus Action Triggered');
    }
}

function toggleCapsuleMenu() {
    const capsule = document.getElementById('action-capsule');
    const container = document.getElementById('search-container');
    
    if (capsule.classList.contains('menu-expanded')) {
        capsule.classList.remove('menu-expanded');
        container.classList.remove('menu-open'); 
        document.body.classList.remove('menu-active');
    } else {
        capsule.classList.add('animating-shrink');
        setTimeout(() => {
            capsule.classList.remove('animating-shrink');
            capsule.classList.add('menu-expanded');
            container.classList.add('menu-open'); 
            document.body.classList.add('menu-active');
        }, 150);
    }
}

document.addEventListener('click', (e) => {
    const capsule = document.getElementById('action-capsule');
    const container = document.getElementById('search-container');
    
    if (capsule && capsule.classList.contains('menu-expanded') && !capsule.contains(e.target)) {
        capsule.classList.remove('menu-expanded');
        container.classList.remove('menu-open');
        document.body.classList.remove('menu-active');
    }
});

function renderCards(data) {
    if (data.length === 0) {
        mainStack.innerHTML = '<p style="text-align:center; padding:40px; color:#666;">該当する駅・路線が見つかりません</p>';
        return;
    }
    
    mainStack.innerHTML = data.map((line, index) => {
        const gradient = getPremiumGradient(line.hue); 
        const delay = isInitialLoad ? (data.length - index) * 0.08 : 0;
        const animationClass = isInitialLoad ? 'opening-pull' : '';
        const delayStyle = isInitialLoad ? `animation-delay: ${delay}s;` : '';

        return `
            <div class="card ${animationClass}" id="card-${line.id}" 
                 style="background: ${gradient}; ${delayStyle}" 
                 onclick="handleCardClick('${line.id}')">
                <div class="card-header">
                    <span class="line-name">${line.name}</span>
                    <span class="status-tag">${line.status}</span>
                </div>
                <div class="card-content">
                    <div class="info-tags-container">
                        ${line.detail.map(info => `<div class="info-tag-item">${info}</div>`).join('')}
                    </div>
                    <p class="description">${line.desc}</p>
                </div>
            </div>
        `;
    }).join('');

    if (isInitialLoad) {
        setTimeout(() => { 
            isInitialLoad = false;
            document.querySelectorAll('.card').forEach(c => c.classList.remove('opening-pull'));
        }, 1000);
    }
}

function handleCardClick(id) {
    if (isAnimating) return; 

    const data = railwayData.find(l => l.id === id);
    if (!data) return;
    
    const originalCard = document.getElementById(`card-${id}`);
    
    activeCardId = id;
    isAnimating = true; 

    detailContainer.innerHTML = `
        <div class="detail-card-inner" style="background: ${getPremiumGradient(data.hue)};">
            <div class="card-header">
                <span class="line-name">${data.name}</span>
                <span class="status-tag">${data.status}</span>
            </div>
            <div class="card-content">
                <div class="info-tags-container">
                    ${data.detail.map(info => `<div class="info-tag-item">${info}</div>`).join('')}
                </div>
                <p class="description">${data.desc}</p>
            </div>
        </div>`;
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            detailOverlay.classList.add('active');
            mainStack.classList.add('has-active'); 
            
            const dismissIcon = document.getElementById('dismiss-icon');
            if (dismissIcon) {
                dismissIcon.style.visibility = 'visible';
                dismissIcon.style.opacity = '0'; 
                setTimeout(() => {
                    if (activeCardId && !document.body.classList.contains('searching')) {
                        dismissIcon.style.opacity = '1';
                    }
                }, 200);
            }
            
            if (originalCard) originalCard.classList.add('hidden-placeholder');
        });
    });
    
    if (window.navigator.vibrate) window.navigator.vibrate(10);
    initOverlayGestures();

    if (liftTimer) clearTimeout(liftTimer);
    liftTimer = setTimeout(() => { 
        isAnimating = false;
        if (originalCard && activeCardId === id) { 
            originalCard.style.transform = 'translate3d(0, -100px, 0)'; 
            originalCard.classList.add('lifted-state'); 
        }
    }, 600);
}

function handleBottomCardClick() {
    if (isAnimating) return;

    const id = 'fixed-bottom';
    const originalCard = document.getElementById('fixed-info-card');

    activeCardId = id;
    isAnimating = true;

    let bgStyle = '';
    if (bottomCardConfig.hex) {
        bgStyle = bottomCardConfig.hex;
    } else {
        const h = bottomCardConfig.hue;
        const colorTop = `hsl(${h}, 65%, 40%)`;
        const colorBottom = `hsl(${h}, 45%, 25%)`;
        bgStyle = `linear-gradient(135deg, ${colorTop}, ${colorBottom})`;
    }

    detailContainer.innerHTML = `
        <div class="detail-card-inner" style="background: ${bgStyle}; color: var(--card-text-color) !important;">
            <div class="card-header">
                <span class="line-name">${bottomCardConfig.title}</span>
                <span class="status-tag">${bottomCardConfig.status}</span>
            </div>
            <div class="card-content">
                <div class="info-tags-container">
                    <div class="info-tag-item">最終更新</div>
                </div>
                <p class="description">${bottomCardConfig.description}</p>
            </div>
        </div>`;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            detailOverlay.classList.add('active');
            mainStack.classList.add('has-active');
            
            const dismissIcon = document.getElementById('dismiss-icon');
            if (dismissIcon) {
                dismissIcon.style.visibility = 'visible';
                dismissIcon.style.opacity = '0'; 
                setTimeout(() => {
                    if (activeCardId && !document.body.classList.contains('searching')) {
                        dismissIcon.style.opacity = '1';
                    }
                }, 200);
            }
            
            if (originalCard) originalCard.classList.add('hidden-placeholder');
        });
    });

    if (window.navigator.vibrate) window.navigator.vibrate(10);
    initOverlayGestures();

    if (liftTimer) clearTimeout(liftTimer);
    liftTimer = setTimeout(() => { 
        isAnimating = false;
        if (originalCard && activeCardId === id) {
            originalCard.classList.add('lifted-state');
        }
    }, 600);
}

function handleOverlayClick(e) {
    if (isAnimating) return; 
    if (e.target === detailOverlay) closeAllCards();
}

function closeAllCards() {
    if (isAnimating) return;
    isAnimating = true; 

    const dismissIcon = document.getElementById('dismiss-icon');
    if (dismissIcon) {
        dismissIcon.style.opacity = '0';
        setTimeout(() => { dismissIcon.style.visibility = 'hidden'; }, 300);
    }

    if (liftTimer) {
        clearTimeout(liftTimer);
        liftTimer = null;
    }

    detailOverlay.classList.remove('active');
    mainStack.classList.remove('has-active'); 
    
    if (activeCardId) {
        let originalCard;
        if (activeCardId === 'fixed-bottom') {
            originalCard = document.getElementById('fixed-info-card');
        } else {
            originalCard = document.getElementById(`card-${activeCardId}`);
        }

        if (originalCard) {
            originalCard.classList.remove('hidden-placeholder');
            originalCard.classList.remove('lifted-state');
            originalCard.style.transform = ''; 
            originalCard.classList.add('returning');
            
            if (activeCardId !== 'fixed-bottom') {
                let nextCard = originalCard.nextElementSibling;
                let delay = 0;
                while (nextCard) {
                    if (nextCard.classList.contains('card')) {
                        nextCard.style.animationDelay = `${delay}s`;
                        nextCard.classList.add('piano-ripple');
                        delay += 0.05; 
                    }
                    nextCard = nextCard.nextElementSibling;
                }
            }

            setTimeout(() => {
                originalCard.classList.remove('returning');
                
                const allCards = document.querySelectorAll('.card');
                allCards.forEach(c => {
                    c.classList.remove('piano-ripple');
                    c.style.animationDelay = '';
                });

                if (window.navigator.vibrate) window.navigator.vibrate(5);
            }, 550); 
        }
    }

    activeCardId = null;
    
    const inner = detailContainer.querySelector('.detail-card-inner');
    if (inner) inner.style.transform = ''; 
    
    setTimeout(() => {
        if (!activeCardId) detailContainer.innerHTML = '';
        isAnimating = false; 
    }, 600);
}

let overlayStartY = 0;

function initOverlayGestures() {
    const inner = detailContainer.querySelector('.detail-card-inner');
    if (!inner) return;

    const dismissIcon = document.getElementById('dismiss-icon');

    detailOverlay.ontouchstart = e => { 
        overlayStartY = e.touches[0].pageY; 
        inner.style.transition = 'none'; 
        if (dismissIcon) dismissIcon.style.transition = 'none';
        
        // 🟢 喚醒光影引擎
        startGlareLoop();
    };
    
    detailOverlay.ontouchmove = e => {
        const rawMoveY = e.touches[0].pageY - overlayStartY;
        
        if (rawMoveY > 0) { 
            if (rawMoveY > 10 && e.cancelable) {
                e.preventDefault(); 
            }
            
            const resistance = 0.5; 
            const resistedY = rawMoveY * resistance;

            inner.style.transform = `translate3d(0, ${resistedY}px, 0)`;
            
            // 🟢 動態光影計算：隨拖曳距離偏轉角度
            targetGlareAngle = 135 + (resistedY * 0.15);
            startGlareLoop(); // 保持運算

            if (dismissIcon) {
                const newOpacity = Math.max(0, 1 - (rawMoveY / 150));
                dismissIcon.style.opacity = newOpacity;
            }

            if (rawMoveY > 200) closeAllCards();
        }
    };
    
    detailOverlay.ontouchend = e => {
        inner.style.transition = 'transform 0.6s var(--active-bounce)';
        if (dismissIcon) dismissIcon.style.transition = 'opacity 0.3s ease';

        // 🟢 手指放開，光影彈回原位
        targetGlareAngle = 135;
        startGlareLoop();

        if (activeCardId) {
            inner.style.transform = 'translate3d(0, 0, 0)';
            if (dismissIcon) dismissIcon.style.opacity = '1';
        }
    };

    let overlayWheelSum = 0;
    let overlayWheelTimer;

    detailOverlay.onwheel = e => {
        e.preventDefault();
        overlayWheelSum -= e.deltaY;
        if (overlayWheelSum < 0) overlayWheelSum = 0;

        const resistance = 0.2;
        const resistedY = overlayWheelSum * resistance;

        inner.style.transition = 'none';
        inner.style.transform = `translate3d(0, ${resistedY}px, 0)`;

        // 🟢 滑鼠滾輪也要同步光影
        targetGlareAngle = 135 + (resistedY * 0.15);
        startGlareLoop();

        if (dismissIcon) {
            dismissIcon.style.transition = 'none';
            const newOpacity = Math.max(0, 1 - (overlayWheelSum / 150));
            dismissIcon.style.opacity = newOpacity;
        }

        if (overlayWheelSum > 200) {
            closeAllCards();
            targetGlareAngle = 135;
            overlayWheelSum = 0; 
            return;
        }

        clearTimeout(overlayWheelTimer);
        overlayWheelTimer = setTimeout(() => {
            if (activeCardId && overlayWheelSum <= 200) {
                inner.style.transition = 'transform 0.6s var(--active-bounce)';
                inner.style.transform = 'translate3d(0, 0, 0)';
                
                // 滾輪停止，光影歸位
                targetGlareAngle = 135;
                startGlareLoop();
                
                if (dismissIcon) {
                    dismissIcon.style.transition = 'opacity 0.3s ease';
                    dismissIcon.style.opacity = '1';
                }
            }
            overlayWheelSum = 0;
        }, 150); 
    };
}

function initBottomCard() {
    const card = document.getElementById('fixed-info-card');
    if (!card) return;
    
    if (isInitialLoad) {
        card.classList.add('opening-pull-fixed');
        card.style.animationDelay = '0s';
    }

    let finalBg;
    const bgOpacity = 0.65; 

    if (bottomCardConfig.hex) {
        finalBg = bottomCardConfig.hex; 
    } else {
        const h = bottomCardConfig.hue;
        const colorTop = `hsla(${h}, 65%, 40%, ${bgOpacity})`;    
        const colorBottom = `hsla(${h}, 45%, 25%, ${bgOpacity})`; 
        finalBg = `linear-gradient(135deg, ${colorTop}, ${colorBottom})`;
    }
    
    card.style.setProperty('--fixed-bg', finalBg);
    card.style.setProperty('--fixed-border', `rgba(255, 255, 255, ${bottomCardConfig.borderColorOpacity})`);
    
    document.getElementById('fixed-title').textContent = bottomCardConfig.title;
    document.getElementById('fixed-status').textContent = bottomCardConfig.status;
    document.getElementById('fixed-desc').textContent = bottomCardConfig.description;
    
    const tag = card.querySelector('.status-tag');
    if (tag) tag.style.background = `rgba(255, 255, 255, ${bottomCardConfig.tagBgOpacity})`;
}

function filterCards(keyword) {
    isInitialLoad = false;
    const lowKeyword = keyword.toLowerCase().trim();
    const filtered = railwayData.filter(line => 
        line.name.toLowerCase().includes(lowKeyword) || 
        line.kana.toLowerCase().includes(lowKeyword)
    );
    renderCards(filtered);
}

function initDismissIcon() {
    if (document.getElementById('dismiss-icon')) return;

    const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" id=\"Outline\" viewBox=\"0 0 24 24\" width=\"100%\" height=\"100%\">
            <path d=\"M18.71,8.21a1,1,0,0,0-1.42,0l-4.58,4.58a1,1,0,0,1-1.42,0L6.71,8.21a1,1,0,0,0-1.42,0,1,1,0,0,0,0,1.41l4.59,4.59a3,3,0,0,0,4.24,0l4.59-4.59A1,1,0,0,0,18.71,8.21Z\"/>
        </svg>`;

    const iconDiv = document.createElement('div');
    iconDiv.id = 'dismiss-icon';
    iconDiv.className = 'dismiss-icon';
    iconDiv.innerHTML = svgContent;
    
    document.body.appendChild(iconDiv);
}

searchInput.addEventListener('compositionstart', () => { isComposing = true; });
searchInput.addEventListener('compositionend', (e) => { isComposing = false; filterCards(e.target.value); });
searchInput.addEventListener('input', (e) => { if (!isComposing) filterCards(e.target.value); });
window.onpopstate = () => closeAllCards();

renderCards(railwayData);
initBottomCard();
initDismissIcon(); 

document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});