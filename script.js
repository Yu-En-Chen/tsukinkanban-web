// script.js - 主 UI 邏輯與狀態控制 (動畫與 History API 修正版)

import { bottomCardConfig, railwayData } from './data.js';
import { initPhysics } from './physics.js'; 
import { initHeader } from './header.js'; 

// 狀態旗標
let isInitialLoad = true;
let isAnimating = false;
let liftTimer = null; 
let activeCardId = null; 

function getPremiumGradient(hue) {
    const colorTop = `hsl(${hue}, 65%, 40%)`;    
    const colorBottom = `hsl(${hue}, 45%, 25%)`; 
    return `linear-gradient(135deg, ${colorTop}, ${colorBottom})`;
}

const mainStack = document.getElementById('main-stack');
const detailOverlay = document.getElementById('detail-overlay');
const detailContainer = document.getElementById('detail-card-container');

// ============================================================================
// 🟢 頂級 Native 體驗：長按進入「滑動掃描 (Scrubbing)」模式
// ============================================================================
let scanTimer = null;
let isScrubbingMode = false;
let currentScrubCard = null;
let startTouchY = 0;

mainStack.addEventListener('touchstart', (e) => {
    if (isAnimating || mainStack.classList.contains('dragging') || activeCardId) return;
    
    // 如果點擊的不是卡片，就不理它
    const targetCard = e.target.closest('.card');
    if (!targetCard) return;

    startTouchY = e.touches[0].pageY;
    isScrubbingMode = false;
    currentScrubCard = null;

    // 啟動 400ms 判定計時器
    scanTimer = setTimeout(() => {
        isScrubbingMode = true; // 正式進入掃描模式！
        // 🟢 跨檔案通訊：掛上牌子，告訴 physics.js 現在是掃描模式，請罷工！
        mainStack.dataset.isScrubbing = 'true';
        currentScrubCard = targetCard;
        currentScrubCard.classList.add('touch-lifted');
        
        // 鎖死卡片堆的物理引擎，避免滾動打架
        mainStack.style.touchAction = 'none'; 
        
        if (window.navigator.vibrate) window.navigator.vibrate(15);
    }, 400);
}, { passive: true });

mainStack.addEventListener('touchmove', (e) => {
    // 1. 如果還沒進入掃描模式：
    if (!isScrubbingMode) {
        // 只要手指滑動超過 10px，就判定使用者只是想「滾動網頁」，立刻取消長按判定
        if (Math.abs(e.touches[0].pageY - startTouchY) > 10) {
            clearTimeout(scanTimer);
            scanTimer = null;
        }
        return;
    }
    // 🟢 全新觸控意圖：立刻解除滾動封鎖
        mainStack.dataset.blockScroll = 'false';
        if (window.scrollCooldownTimer) clearTimeout(window.scrollCooldownTimer);

        startTouchY = e.touches[0].pageY;
        if (bounceTimer) clearTimeout(bounceTimer);
        mainStack.classList.remove('bounce-back');
        mainStack.classList.add('dragging');
    }, { passive: true });

    // 2. 如果已經進入掃描模式：
    // 🟢 核心魔法：因為已經 touchAction='none'，我們必須阻止預設滾動，並用雷射槍掃描手指下的元素
    if (e.cancelable) e.preventDefault(); 

    const touch = e.touches[0];
    // 使用雷射槍 (elementFromPoint) 找出手指目前座標底下的元素
    const elemUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elemUnderFinger) {
        const hoveredCard = elemUnderFinger.closest('.card');
        
        // 如果手指滑到了新的卡片上
        if (hoveredCard && hoveredCard !== currentScrubCard) {
            // 把舊的放下
            if (currentScrubCard) currentScrubCard.classList.remove('touch-lifted');
            
            // 把新的抬起
            currentScrubCard = hoveredCard;
            currentScrubCard.classList.add('touch-lifted');
            if (window.navigator.vibrate) window.navigator.vibrate(5); // 換卡片時微震提示
        } 
        // 如果手指滑到了沒有卡片的地方 (例如最頂部或最底層)
        else if (!hoveredCard && currentScrubCard) {
            currentScrubCard.classList.remove('touch-lifted');
            currentScrubCard = null;
        }
    }
}, { passive: false }); // 注意這裡必須是 false，才能使用 preventDefault 鎖死滾動

mainStack.addEventListener('touchend', endScrubbing);
mainStack.addEventListener('touchcancel', endScrubbing);

function endScrubbing() {
    clearTimeout(scanTimer);
    scanTimer = null;
    
    if (isScrubbingMode) {
        isScrubbingMode = false;
        
        // 🟢 跨檔案通訊：拔除牌子，允許 physics.js 恢復運作
        mainStack.dataset.isScrubbing = 'false'; 

        mainStack.style.touchAction = ''; 
        if (currentScrubCard) {
            const cardToDrop = currentScrubCard;
            setTimeout(() => {
                cardToDrop.classList.remove('touch-lifted');
            }, 50);
            currentScrubCard = null;
        }
    }
}
// ============================================================================

// 啟運動理引擎
const physicsEngine = initPhysics(
    mainStack, 
    () => activeCardId, 
    () => closeAllCards(false)
);

// 啟動 Header 模組
initHeader(filterCards, () => activeCardId);

// 點擊空白處關閉卡片
mainStack.addEventListener('click', (e) => { 
    if (activeCardId && e.target === mainStack) closeAllCards(false); 
});

function renderCards(data) {
    if (data.length === 0) {
        mainStack.innerHTML = '<p style="text-align:center; padding:40px; color:#666;">該当する駅・路線が見つかりません</p>';
        return;
    }
    
    mainStack.innerHTML = '';
    const template = document.getElementById('railway-card-template');

    data.forEach((line, index) => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.card');
        
        card.id = `card-${line.id}`;
        card.style.background = getPremiumGradient(line.hue);
        
        if (isInitialLoad) {
            card.classList.add('opening-pull');
            card.style.animationDelay = `${(data.length - index) * 0.08}s`;
        }
        
        card.onclick = () => handleCardClick(line.id);
        
        // --- 🟢 新增：手機/iPad 觸控螢幕的 Haptic Touch 長按浮起邏輯 ---
        let pressTimer = null;
        let startY = 0;
        let isLifted = false;

        
        // --- 結束新增 ---
        
        clone.querySelector('.line-name').textContent = line.name;
        clone.querySelector('.status-tag').textContent = line.status;
        clone.querySelector('.description').textContent = line.desc;
        
        const tagsContainer = clone.querySelector('.info-tags-container');
        line.detail.forEach(info => {
            const tagDiv = document.createElement('div');
            tagDiv.className = 'info-tag-item';
            tagDiv.textContent = info;
            tagsContainer.appendChild(tagDiv);
        });

        mainStack.appendChild(clone);
    });

    if (isInitialLoad) {
        mainStack.classList.add('just-awoke');

        setTimeout(() => { 
            isInitialLoad = false;
            document.querySelectorAll('.card').forEach(c => c.classList.remove('opening-pull'));
            const fixedCard = document.getElementById('fixed-info-card');
            if (fixedCard) fixedCard.classList.remove('opening-pull-fixed');
            
            // 等 1.5 秒鋼琴動畫「徹底播完」後，才開始監聽滑鼠移動！
            // 這樣在動畫期間不管滑鼠怎麼動，allow-hover 都絕對處於「上鎖」狀態。
            window.addEventListener('mousemove', function unlockHover() {
                if (!mainStack.classList.contains('allow-hover')) {
                    mainStack.classList.add('allow-hover');
                }
                window.removeEventListener('mousemove', unlockHover);
            }, { once: true });

        }, 1500); 

        // 依然保留 2 秒的甦醒護身符，確保解鎖後的第一次升起是柔和的
        setTimeout(() => {
            mainStack.classList.remove('just-awoke');
        }, 2000); 
    } else {
        mainStack.classList.add('allow-hover');
    }
}
function handleCardClick(id) {
    if (isAnimating) return; 

    const data = railwayData.find(l => l.id === id);
    if (!data) return;
    
    const originalCard = document.getElementById(`card-${id}`);
    activeCardId = id;
    isAnimating = true; 

    history.pushState({ cardActive: true }, '');

    detailContainer.innerHTML = '';
    const template = document.getElementById('detail-card-template');
    const clone = template.content.cloneNode(true);
    const inner = clone.querySelector('.detail-card-inner');
    
    inner.style.background = getPremiumGradient(data.hue);
    clone.querySelector('.line-name').textContent = data.name;
    clone.querySelector('.status-tag').textContent = data.status;
    clone.querySelector('.description').textContent = data.desc;
    
    const tagsContainer = clone.querySelector('.info-tags-container');
    data.detail.forEach(info => {
        const tagDiv = document.createElement('div');
        tagDiv.className = 'info-tag-item';
        tagDiv.textContent = info;
        tagsContainer.appendChild(tagDiv);
    });

    detailContainer.appendChild(clone);
    
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

    history.pushState({ cardActive: true }, '');

    let bgStyle = '';
    if (bottomCardConfig.hex) {
        bgStyle = bottomCardConfig.hex;
    } else {
        const h = bottomCardConfig.hue;
        const colorTop = `hsl(${h}, 65%, 40%)`;
        const colorBottom = `hsl(${h}, 45%, 25%)`;
        bgStyle = `linear-gradient(135deg, ${colorTop}, ${colorBottom})`;
    }

    detailContainer.innerHTML = '';
    const template = document.getElementById('detail-card-template');
    const clone = template.content.cloneNode(true);
    const inner = clone.querySelector('.detail-card-inner');

    inner.style.background = bgStyle;
    inner.style.setProperty('color', 'var(--card-text-color)', 'important');
    clone.querySelector('.line-name').textContent = bottomCardConfig.title;
    clone.querySelector('.status-tag').textContent = bottomCardConfig.status;
    clone.querySelector('.description').textContent = bottomCardConfig.description;

    const tagsContainer = clone.querySelector('.info-tags-container');
    const tagDiv = document.createElement('div');
    tagDiv.className = 'info-tag-item';
    tagDiv.textContent = '最終更新';
    tagsContainer.appendChild(tagDiv);

    detailContainer.appendChild(clone);

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
    
    // 🟢 核心修復：使用 closest() 往上找父元素
    // 意思是：「只要你點擊的地方，不包含實體卡片 (.detail-card-inner)，就一律關閉！」
    if (!e.target.closest('.detail-card-inner')) {
        closeAllCards(false);
    }
}

function closeAllCards(isPopState = false) {
    if (!activeCardId || isAnimating) return;
    
    if (!isPopState && history.state && history.state.cardActive) {
        history.back();
        return; 
    }

    isAnimating = true; 

    // 🟢 阻斷連續滾動機制：關閉卡片的瞬間，立刻對物理引擎下達「封鎖滾動」的指令
    mainStack.dataset.blockScroll = 'true';
    clearTimeout(window.scrollCooldownTimer);
    window.scrollCooldownTimer = setTimeout(() => {
        mainStack.dataset.blockScroll = 'false';
    }, 600); // 配合動畫時間 600ms，結束後若無滾動干擾則自動解鎖

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
    // 🟢 1. 關閉的瞬間：沒收卡片堆的 Hover 權限，避免滑鼠穿透導致下方卡片誤彈起
    mainStack.classList.remove('allow-hover');
    
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
                if (nextCard && nextCard.classList && nextCard.classList.contains('card')) {
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

    activeCardId = null;
    const inner = detailContainer.querySelector('.detail-card-inner');
    if (inner) {
        // 🟢 救命關鍵：把滑動時鎖住的 transition 拔掉，恢復原本 CSS 寫好的彈簧動畫！
        // 這樣卡片就不會瞬間瞬移，而是從你放手的地方滑順飛走
        inner.style.transition = ''; 
        
        inner.style.transform = ''; 
    }
    
    setTimeout(() => {
        if (!activeCardId) detailContainer.innerHTML = '';
        isAnimating = false; 
        // 🟢 2. 動畫結束後：等待使用者的滑鼠產生「真實的新位移」，才把權限還給他們！
        window.addEventListener('mousemove', function unlockHoverAfterClose() {
            if (!mainStack.classList.contains('allow-hover')) {
                mainStack.classList.add('allow-hover');
            }
            window.removeEventListener('mousemove', unlockHoverAfterClose);
        }, { once: true });
    }, 600);
}

let overlayStartY = 0;

function initOverlayGestures() {
    const inner = detailContainer.querySelector('.detail-card-inner');
    if (!inner) return;

    const dismissIcon = document.getElementById('dismiss-icon');
    const extraElements = inner.querySelectorAll('.description, .info-tags-container, .status-tag');

    detailOverlay.ontouchstart = e => { 
        overlayStartY = e.touches[0].pageY; 
        inner.style.transition = 'none'; 
        if (dismissIcon) dismissIcon.style.transition = 'none';
        
        extraElements.forEach(el => el.style.transition = 'none');
        physicsEngine.updateGlare(135); 
    };
    
    detailOverlay.ontouchmove = e => {
        const rawMoveY = e.touches[0].pageY - overlayStartY;
        if (rawMoveY > 0) { 
            if (rawMoveY > 10 && e.cancelable) e.preventDefault(); 
            const resistedY = rawMoveY * 0.5;
            inner.style.transform = `translate3d(0, ${resistedY}px, 0)`;
            physicsEngine.updateGlare(135 + (resistedY * 0.15)); 
            
            if (dismissIcon) dismissIcon.style.opacity = Math.max(0, 1 - (rawMoveY / 150));
            
            // 🟢 100px~200px 線性淡化邏輯
            let textOpacity = 1;
            if (rawMoveY > 100) {
                textOpacity = Math.max(0, 1 - ((rawMoveY - 100) / 100));
            }
            extraElements.forEach(el => el.style.opacity = textOpacity);

            if (rawMoveY > 200) closeAllCards(false); 
        }
    };
    
    detailOverlay.ontouchend = e => {
        inner.style.transition = 'transform 0.6s var(--active-bounce)';
        if (dismissIcon) dismissIcon.style.transition = 'opacity 0.3s ease';
        
        extraElements.forEach(el => el.style.transition = 'opacity 0.3s ease');
        
        physicsEngine.updateGlare(135);
        if (activeCardId) {
            inner.style.transform = 'translate3d(0, 0, 0)';
            if (dismissIcon) dismissIcon.style.opacity = '1';
            
            extraElements.forEach(el => el.style.opacity = '1');
        }
    };

    let overlayWheelSum = 0;
    let overlayWheelTimer;
    detailOverlay.onwheel = e => {
        e.preventDefault();
        overlayWheelSum -= e.deltaY;
        if (overlayWheelSum < 0) overlayWheelSum = 0;
        const resistedY = overlayWheelSum * 0.2;
        inner.style.transition = 'none';
        inner.style.transform = `translate3d(0, ${resistedY}px, 0)`;
        physicsEngine.updateGlare(135 + (resistedY * 0.15));
        
        extraElements.forEach(el => el.style.transition = 'none');
        
        if (dismissIcon) {
            dismissIcon.style.transition = 'none';
            dismissIcon.style.opacity = Math.max(0, 1 - (overlayWheelSum / 150));
        }

        // 🟢 滾輪：100px~200px 線性淡化邏輯
        let textOpacity = 1;
        if (overlayWheelSum > 100) {
            textOpacity = Math.max(0, 1 - ((overlayWheelSum - 100) / 100));
        }
        extraElements.forEach(el => el.style.opacity = textOpacity);

        if (overlayWheelSum > 200) {
            closeAllCards(false); 
            physicsEngine.updateGlare(135);
            overlayWheelSum = 0; 
            return;
        }

        clearTimeout(overlayWheelTimer);
        overlayWheelTimer = setTimeout(() => {
            if (activeCardId && overlayWheelSum <= 200) {
                inner.style.transition = 'transform 0.6s var(--active-bounce)';
                inner.style.transform = 'translate3d(0, 0, 0)';
                physicsEngine.updateGlare(135);
                
                extraElements.forEach(el => {
                    el.style.transition = 'opacity 0.3s ease';
                    el.style.opacity = '1';
                });

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
        // 置底卡片最後彈出
        card.style.animationDelay = `${(railwayData.length + 1) * 0.08}s`;
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
        <svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" width="100%" height="100%">
            <path d="M18.71,8.21a1,1,0,0,0-1.42,0l-4.58,4.58a1,1,0,0,1-1.42,0L6.71,8.21a1,1,0,0,0-1.42,0,1,1,0,0,0,0,1.41l4.59,4.59a3,3,0,0,0,4.24,0l4.59-4.59A1,1,0,0,0,18.71,8.21Z"/>
        </svg>`;

    const iconDiv = document.createElement('div');
    iconDiv.id = 'dismiss-icon';
    iconDiv.className = 'dismiss-icon';
    iconDiv.innerHTML = svgContent;
    
    document.body.appendChild(iconDiv);
}

window.addEventListener('popstate', (e) => {
    if (activeCardId) {
        closeAllCards(true); 
    }
});

renderCards(railwayData);
initBottomCard();
initDismissIcon(); 

document.addEventListener('gesturestart', function(e) { e.preventDefault(); });

// 將模組內的函數暴露給全域
window.handleBottomCardClick = handleBottomCardClick;
window.handleOverlayClick = handleOverlayClick;
