// script.js - 主 UI 邏輯與狀態控制 (動畫與 History API 修正版)

import { bottomCardConfig, railwayData } from './data.js';
import { initPhysics } from './physics.js'; 
import { initHeader } from './header.js'; 

// 狀態旗標
let isInitialLoad = true;
let isAnimating = false;
let liftTimer = null; 
let activeCardId = null; 

// ============================================================================
// 🟢 色彩學與動態適應引擎 (Adaptive UI Engine)
// ============================================================================

function hexToRgb(hex) {
    let c = hex.replace('#', '');
    if(c.length === 3) c = c.split('').map(x => x+x).join('');
    return { r: parseInt(c.substring(0,2), 16), g: parseInt(c.substring(2,4), 16), b: parseInt(c.substring(4,6), 16) };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function getDynamicTheme(hex, opacity = 1) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    const isLight = luminance > 0.55; 

    // 🟢 動態漸層幅度分配 (加入極端純黑/純白處理)
    let topShift = 17;
    let bottomShift = 17;
    // 🟢 新增：預設全透明，平時不干擾卡片
    let fullWrapBorder = 'transparent';

    if (hsl.l > 95) {
        // 1. 極端純白/極淺色：亮部無法再亮，必須大幅加深暗部才能顯現漸層
        topShift = 0;
        bottomShift = 35;
        // ⚪ 極端純白：啟動極細的淡灰色全包覆邊框，防止融入白底
        fullWrapBorder = 'rgba(0, 0, 0, 0.08)';
    } else if (hsl.l > 60) {
        // 2. 鮮豔亮色：減少亮部加成避免褪色，暗部微加深
        topShift = 4;
        bottomShift = 14;
    } else if (hsl.l < 5) {
        // 3. 極端純黑/極暗色：暗部無法再暗，必須大幅提亮亮部才能顯現反光
        topShift = 26;
        bottomShift = 0;
        // ⚫ 極端純黑：啟動極細的微弱白光全包覆邊框，防止融入黑底
        fullWrapBorder = 'rgba(255, 255, 255, 0.12)';
    } else if (hsl.l < 40) {
        // 4. 一般深色：增加亮部逼出光澤，減少暗部避免死黑
        topShift = 14;
        bottomShift = 4;
    }
    // 🟢 智慧高光引擎：根據卡片視覺亮度 (luminance) 動態決定高光的白光強度
    let rimGlareAlpha = 0.6;
    if (luminance > 0.6) {
        rimGlareAlpha = 1.0;  // 淺色/亮色系 (如黃色 #D9B300)：需要全白不透明才壓得過底色
    } else if (luminance > 0.3) {
        rimGlareAlpha = 0.85; // 中等亮度 (如綠色 #009100, 橘紅 #BB3D00)：大幅增強白光
    } else if (luminance > 0.1) {
        rimGlareAlpha = 0.65; // 偏暗色 (如深藍, 深綠 #007979)：適中白光
    } else {
        rimGlareAlpha = 0.45; // 純黑極暗色：對比度極高，稍微收斂維持金屬質感
    }
    let rimGlareStart = `rgba(255, 255, 255, ${rimGlareAlpha})`;

    // ...(前面的 luminance 與 topShift/bottomShift 判斷維持原樣)...

    const lTop = Math.min(100, hsl.l + topShift);
    const lBottom = Math.max(0, hsl.l - bottomShift);

    const gradient = opacity < 1 
        ? `linear-gradient(135deg, hsla(${hsl.h}, ${hsl.s}%, ${lTop}%, ${opacity}), hsla(${hsl.h}, ${hsl.s}%, ${lBottom}%, ${opacity}))`
        : `linear-gradient(135deg, hsl(${hsl.h}, ${hsl.s}%, ${lTop}%), hsl(${hsl.h}, ${hsl.s}%, ${lBottom}%))`;

    // 🟢 1. 宣告新增的光影變數：glareColor (反光色), innerGlow (微光層)
    let textColor, textSecondary, borderColor, tagBg, textShadow;
    let textBgGradientSecondary, textBgGradientTag, textClip, textFill;
    let glareColor, innerGlow; 

    if (isLight) {
        const textS = hsl.s > 5 ? 100 : 0; 
        const textL = 35; 

        textColor = `hsl(${hsl.h}, ${textS}%, ${textL}%)`;
        textSecondary = `hsl(${hsl.h}, ${textS}%, ${textL + 5}%)`; 
        borderColor = `hsla(${hsl.h}, ${textS}%, ${textL}%, 0.35)`;
        tagBg = `hsla(${hsl.h}, ${textS}%, ${textL}%, 0.15)`;
        textShadow = `0 1px 1px hsla(${hsl.h}, ${textS}%, ${textL - 10}%, 0.2)`;

        const textLTop = textL;
        const textLBottom = Math.max(0, textL - 12); 
        textBgGradientSecondary = `linear-gradient(135deg, hsl(${hsl.h}, ${textS}%, ${textLTop + 5}%), hsl(${hsl.h}, ${textS}%, ${textLBottom + 5}%))`;
        
        textBgGradientTag = 'none'; 
        textClip = 'text';
        textFill = 'transparent';

        // 🟢 修正淺色卡片的光影：
        // 不再使用突兀的 0.9 死白！大幅降低透明度，並保留卡片原有的色相與飽和度基因。
        // 反光 (Glare) 變得更輕透，邊緣微光層 (Inner Glow) 變成柔和的「同色系淡白光」。
        glareColor = `hsla(${hsl.h}, ${hsl.s}%, 96%, 0.35)`;
        innerGlow = `inset 0 1px 1px hsla(${hsl.h}, ${Math.max(30, hsl.s)}%, 100%, 0.45)`;
        const glowS = hsl.s < 5 ? 0 : Math.max(30, hsl.s);
        
        glareColor = `hsla(${hsl.h}, ${hsl.s}%, 96%, 0.35)`;
        innerGlow = `inset 0 1px 1px hsla(${hsl.h}, ${glowS}%, 100%, 0.45)`;
    }else {
        textColor = '#ffffff';
        textSecondary = 'rgba(255, 255, 255, 0.8)';
        borderColor = 'rgba(255, 255, 255, 0.12)';
        tagBg = 'rgba(255, 255, 255, 0.15)';
        textShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
        
        textBgGradientSecondary = 'none';
        textBgGradientTag = 'none';
        textClip = 'border-box';
        textFill = 'currentcolor';

        // 🟢 深色卡片的光影魔法：
        // 1. 同色系反光：不再是死白，而是帶有該卡片色相 (Hue) 的高亮度色彩 (L=85%)。
        // 2. 邊緣微光層 (珠光)：在卡片上邊緣打上一道極細的同色系高光，創造頂級玻璃厚度感！
        const glareS = hsl.s < 5 ? 0 : Math.max(30, hsl.s);
        const glowS = hsl.s < 5 ? 0 : Math.max(50, hsl.s);

        glareColor = `hsla(${hsl.h}, ${glareS}%, 85%, 0.35)`;
        innerGlow = `inset 0 1px 1px hsla(${hsl.h}, ${glowS}%, 88%, 0.35)`;
    }

    return {
        gradient, textColor, textSecondary, borderColor, tagBg, textShadow,
        textBgGradientSecondary, textBgGradientTag, textClip, textFill,
        glareColor, innerGlow, fullWrapBorder, rimGlareStart // 🟢 回傳新變數
    };
}

// 🟢 封裝主題套用器：安全且獨立地渲染每一張卡片，絕不互相干擾
function applyThemeToCard(cardElement, hex, opacity = 1) {
    const theme = getDynamicTheme(hex, opacity);
    
    if (opacity < 1) {
        cardElement.style.setProperty('--fixed-bg', theme.gradient);
    } else {
        cardElement.style.background = theme.gradient;
    }

    cardElement.style.setProperty('--card-text-color', theme.textColor, 'important');
    cardElement.style.setProperty('--text-secondary', theme.textSecondary, 'important');
    cardElement.style.setProperty('--border-color', theme.borderColor, 'important');
    cardElement.style.setProperty('--tag-bg', theme.tagBg, 'important');
    cardElement.style.setProperty('--text-shadow-subtle', theme.textShadow, 'important');
    
    // 🟢 注入詳細文字專用的漸層引擎變數
    cardElement.style.setProperty('--text-bg-gradient-secondary', theme.textBgGradientSecondary, 'important');
    cardElement.style.setProperty('--text-clip', theme.textClip, 'important');
    cardElement.style.setProperty('--text-fill', theme.textFill, 'important');
    // 🟢 注入光影與微光層變數
    cardElement.style.setProperty('--dynamic-glare', theme.glareColor, 'important');
    cardElement.style.setProperty('--dynamic-inner-glow', theme.innerGlow, 'important');
    
    // 🟢 注入全包覆防護邊框
    cardElement.style.setProperty('--rim-glare-start', theme.rimGlareStart, 'important');
    cardElement.style.setProperty('--full-wrap-border', theme.fullWrapBorder, 'important');
}
// ============================================================================

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
// 🟢 新增：震動冷卻鎖
let lastVibrateTime = 0;

mainStack.addEventListener('touchstart', (e) => {
    // 🟢 1. 觸控防禦鎖：只要還在拖拉，或是「回彈動畫（含滾輪慢速回彈）」還沒播完，嚴格禁止進入長按掃描！
    if (isAnimating || 
        mainStack.classList.contains('dragging') || 
        mainStack.classList.contains('bounce-back') || 
        mainStack.classList.contains('bounce-back-wheel') || 
        activeCardId) {
        return;
    }
    
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
        
        // 🟢 救命關鍵：立刻沒收 Hover 權限！殺死 Android 瀏覽器的「殘影 Hover」
        mainStack.classList.remove('allow-hover');
        
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
            
            // 🟢 救命關鍵：把震動調高到 15ms，Android 硬體馬達才會有反應！
            if (window.navigator.vibrate) window.navigator.vibrate(15); 
        } 
        // 如果手指滑到了沒有卡片的地方 (例如最頂部或最底層)
        else if (!hoveredCard && currentScrubCard) {
            currentScrubCard.classList.remove('touch-lifted');
            currentScrubCard = null;
        }
    }
}, { passive: false }); // 注意這裡必須是 false，才能使用 preventDefault 鎖死滾動
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
            // 🟢 破解安卓限制：將震動時間提高到 15ms，並加入 50ms 的冷卻時間！
            const now = Date.now();
            if (window.navigator.vibrate && (now - lastVibrateTime > 50)) {
                window.navigator.vibrate(15); 
                lastVibrateTime = now;
            }
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
        card.style.background = applyThemeToCard(card, line.hex);
        
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

        // 👇 加上這一行，凍結開場的光影計算 👇
        mainStack.dataset.freezeGlare = 'true';

        setTimeout(() => { 
            isInitialLoad = false;
            document.querySelectorAll('.card').forEach(c => {
                c.classList.remove('opening-pull');
                c.style.animationDelay = ''; // 🟢 修復 1：開場動畫結束後，徹底清除殘留的延遲時間
            });
            const fixedCard = document.getElementById('fixed-info-card');
            if (fixedCard) fixedCard.classList.remove('opening-pull-fixed');fixedCard.style.animationDelay = '';

            // 👇 加上這一行，解除光影凍結，讓 Hover 可以正常運作 👇
            mainStack.dataset.freezeGlare = 'false';
            
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
// 🟢 2. 點擊防禦鎖：防止在牌組還在「回彈飛行」的半空中時，誤觸打開卡片導致動畫錯亂
    if (isAnimating || 
        mainStack.classList.contains('dragging') || 
        mainStack.classList.contains('bounce-back') || 
        mainStack.classList.contains('bounce-back-wheel')) {
        return; 
    }

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
    
    inner.style.background = applyThemeToCard(inner, data.hex);
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

    // 🟢 1. 關閉瞬間上鎖：告訴物理引擎現在不准動！
    mainStack.dataset.blockScroll = 'true';
    clearTimeout(window.scrollCooldownTimer);
    window.scrollCooldownTimer = setTimeout(() => {
        mainStack.dataset.blockScroll = 'false';
    }, 650); // 基礎動畫時間，時間到自動解鎖
    
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
        originalCard.style.animationDelay = '';
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
         // 👇 加上這一行，重新解鎖光影 👇
        mainStack.dataset.freezeGlare = 'false';
        
        // 🟢 2. 動畫結束後：升級版防手震解鎖機制 (必須移動超過 5px)
        let startX = null, startY = null;
        window.addEventListener('mousemove', function unlockHoverAfterClose(e) {
            if (startX === null) {
                startX = e.clientX;
                startY = e.clientY;
                return;
            }
            if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
                if (!mainStack.classList.contains('allow-hover')) {
                    mainStack.classList.add('allow-hover');
                }
                window.removeEventListener('mousemove', unlockHoverAfterClose);
            }
        });
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
    };
    
    detailOverlay.ontouchmove = e => {
        const rawMoveY = e.touches[0].pageY - overlayStartY;
        if (rawMoveY > 0) { 
            if (rawMoveY > 10 && e.cancelable) e.preventDefault(); 
            const resistedY = rawMoveY * 0.5;
            inner.style.transform = `translate3d(0, ${resistedY}px, 0)`;
            
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
            overlayWheelSum = 0; 
            return;
        }

        clearTimeout(overlayWheelTimer);
        overlayWheelTimer = setTimeout(() => {
            if (activeCardId && overlayWheelSum <= 200) {
                inner.style.transition = 'transform 0.6s var(--active-bounce)';
                inner.style.transform = 'translate3d(0, 0, 0)';
                
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

/* ==========================================================================
   動態游標引擎 (絕對跟手 0 延遲版)
   ========================================================================== */
function initCustomCursor() {
    if (!matchMedia('(pointer: fine)').matches) return;

    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);

    // 🟢 追求極致跟手：廢除原本的 render 迴圈與延遲算法！
    // 直接在滑鼠硬體訊號進來的「瞬間」強制更新座標，達成真正 1:1 的零延遲
    window.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate3d(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%), 0)`;
    });

    window.addEventListener('mousedown', () => cursor.classList.add('clicking'));
    window.addEventListener('mouseup', () => cursor.classList.remove('clicking'));

    document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
    document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
}

document.addEventListener('DOMContentLoaded', initCustomCursor);
