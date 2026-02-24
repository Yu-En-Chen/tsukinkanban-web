// script.js - 主 UI 邏輯與狀態控制

import { bottomCardConfig, railwayData } from './data.js';
import { initPhysics } from './physics.js'; // 導入物理引擎

// 狀態旗標
let isInitialLoad = true;
let isAnimating = false;
let liftTimer = null; 
let activeCardId = null; 
let isComposing = false; 

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

// 啟動物理引擎，並建立通訊橋樑
const physicsEngine = initPhysics(
    mainStack, 
    () => activeCardId, // 讓物理引擎能隨時取得當前開啟的卡片 ID
    closeAllCards       // 讓物理引擎在下拉超過臨界點時能觸發關閉
);

// 點擊空白處關閉卡片
mainStack.addEventListener('click', (e) => { 
    if (activeCardId && e.target === mainStack) closeAllCards(); 
});

function toggleSearch(show) {
    const dismissIcon = document.getElementById('dismiss-icon');
    
    if (show) {
        const capsule = document.getElementById('action-capsule');
        if (capsule && capsule.classList.contains('menu-expanded')) {
            capsule.classList.remove('menu-expanded');
            searchContainer.classList.remove('menu-open'); 
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
        if (dismissIcon && activeCardId) dismissIcon.style.opacity = '1';
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
    if (capsule.classList.contains('menu-expanded')) {
        capsule.classList.remove('menu-expanded');
        searchContainer.classList.remove('menu-open'); 
        document.body.classList.remove('menu-active');
    } else {
        capsule.classList.add('animating-shrink');
        setTimeout(() => {
            capsule.classList.remove('animating-shrink');
            capsule.classList.add('menu-expanded');
            searchContainer.classList.add('menu-open'); 
            document.body.classList.add('menu-active');
        }, 150);
    }
}

document.addEventListener('click', (e) => {
    const capsule = document.getElementById('action-capsule');
    if (capsule && capsule.classList.contains('menu-expanded') && !capsule.contains(e.target)) {
        capsule.classList.remove('menu-expanded');
        searchContainer.classList.remove('menu-open');
        document.body.classList.remove('menu-active');
    }
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
            //鋼琴
            card.style.animationDelay = `${(data.length - index) * 0.05}s`;
        }
        
        card.onclick = () => handleCardClick(line.id);
        
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
        physicsEngine.updateGlare(135); // 🟢 呼叫物理引擎
    };
    
    detailOverlay.ontouchmove = e => {
        const rawMoveY = e.touches[0].pageY - overlayStartY;
        if (rawMoveY > 0) { 
            if (rawMoveY > 10 && e.cancelable) e.preventDefault(); 
            const resistedY = rawMoveY * 0.5;
            inner.style.transform = `translate3d(0, ${resistedY}px, 0)`;
            physicsEngine.updateGlare(135 + (resistedY * 0.15)); // 🟢 同步光影
            if (dismissIcon) dismissIcon.style.opacity = Math.max(0, 1 - (rawMoveY / 150));
            if (rawMoveY > 200) closeAllCards();
        }
    };
    
    detailOverlay.ontouchend = e => {
        inner.style.transition = 'transform 0.6s var(--active-bounce)';
        if (dismissIcon) dismissIcon.style.transition = 'opacity 0.3s ease';
        physicsEngine.updateGlare(135);
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
        const resistedY = overlayWheelSum * 0.2;
        inner.style.transition = 'none';
        inner.style.transform = `translate3d(0, ${resistedY}px, 0)`;
        physicsEngine.updateGlare(135 + (resistedY * 0.15));
        
        if (dismissIcon) {
            dismissIcon.style.transition = 'none';
            dismissIcon.style.opacity = Math.max(0, 1 - (overlayWheelSum / 150));
        }

        if (overlayWheelSum > 200) {
            closeAllCards();
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

document.addEventListener('gesturestart', function(e) { e.preventDefault(); });

window.toggleSearch = toggleSearch;
window.handleCapsuleMainClick = handleCapsuleMainClick;
window.toggleCapsuleMenu = toggleCapsuleMenu;
window.handleBottomCardClick = handleBottomCardClick;
window.handleOverlayClick = handleOverlayClick;
