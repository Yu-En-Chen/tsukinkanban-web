// script.js - 主 UI 邏輯與狀態控制 (動畫與 History API 修正版)

// 🚀 零延遲視覺攔截器：在任何 DOM 渲染前，同步檢查設定狀態並即時套用
try {
    // 1. 系統鼠標
    if (localStorage.getItem('tsukin_setting_useSystemCursor') === 'true') {
        document.body.classList.add('use-system-cursor');
    }
    // 2. 提高狀態符號對比度
    if (localStorage.getItem('tsukin_setting_highContrastIcons') === 'true') {
        document.body.classList.add('high-contrast-icons');
    }
    // 3. 底部卡片預覽 (預設關閉，如果有開啟才加上 class)
    if (localStorage.getItem('tsukin_setting_bottomCardPreview') === 'true') {
        document.body.classList.add('enable-bottom-preview');
    }
} catch(e) {}

import { bottomCardConfig, railwayData } from '../data/data.js';
import { initPhysics } from './physics.js';
import { initHeader } from './header.js';
import { getAllUserPreferences, restorePreviousPreference } from '../data/db.js';
import { initPersonalization } from './personalization.js';
import { initDynamicClock } from './clock.js';
import { syncAndLoadDictionary } from '../data/dictionary-db.js';

// 🟢 宣告全域變數，作為整個 App 實際渲染、搜尋、點擊的唯一資料來源
window.appRailwayData = [];

// 🚀 升級版：七燈號 SVG 狀態生成引擎 (預設全部為 false 暗燈)
window.getStatusIconsHTML = function(activeFlags = [false, false, false, false, false, false, false]) {
    // 陣列對應順序：0:心跳（地震）, 1:雨風, 2:雪花, 3:打叉, 4:三角形, 5:圓形, 6:注意
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity-icon lucide-activity ${activeFlags[0] ? 'active' : ''}"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud-rain-wind-icon lucide-cloud-rain-wind ${activeFlags[1] ? 'active' : ''}"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m9.2 22 3-7"/><path d="m9 13-3 7"/><path d="m17 13-3 7"/></svg>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake-icon lucide-snowflake ${activeFlags[2] ? 'active' : ''}"><path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/></svg>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x ${activeFlags[3] ? 'active' : ''}"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-icon lucide-triangle ${activeFlags[4] ? 'active' : ''}"><path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-icon lucide-circle ${activeFlags[5] ? 'active' : ''}"><circle cx="12" cy="12" r="10"/></svg>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-warning-icon lucide-message-square-warning ${activeFlags[6] ? 'active' : ''}"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 15h.01"/><path d="M12 7v4"/></svg>
`.trim();
};

//Blink 引擎系統專屬偵測，為 html 標籤打上標記
const ua = navigator.userAgent;
if (/Android/i.test(ua) && /Chrome/i.test(ua)) {
    document.documentElement.classList.add('is-android-blink');
}

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
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    return { r: parseInt(c.substring(0, 2), 16), g: parseInt(c.substring(2, 4), 16), b: parseInt(c.substring(4, 6), 16) };
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
    } else {
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

            // 🟢 救命關鍵：把震動調高到 20ms，Android 硬體馬達才會有反應！
            if (window.navigator.vibrate) window.navigator.vibrate(20);
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
            if (window.navigator.vibrate) window.navigator.vibrate(20); // 換卡片時微震提示
            // 🟢 破解安卓限制：將震動時間提高到 20ms，並加入 50ms 的冷卻時間！
            const now = Date.now();
            if (window.navigator.vibrate && (now - lastVibrateTime > 50)) {
                window.navigator.vibrate(20);
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

// 啟動個性化設定彈窗模組
initPersonalization(applyThemeToCard, () => activeCardId);

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

        // 🟢 核心修復：狀態繼承 (State Restoration)
        // 檢查如果這張卡片正是現在打開的那張，強制讓它在重新渲染後依然保持隱形與升起待命的狀態
        if (activeCardId === line.id) {
            card.classList.add('hidden-placeholder', 'lifted-state');
            card.style.transform = 'translate3d(0, -100px, 0)';
        }

        card.onclick = () => handleCardClick(line.id);

        // --- 🟢 新增：手機/iPad 觸控螢幕的 Haptic Touch 長按浮起邏輯 ---
        let pressTimer = null;
        let startY = 0;
        let isLifted = false;


        // --- 結束新增 ---

        clone.querySelector('.line-name').textContent = line.name;
        clone.querySelector('.status-tag').innerHTML = window.getStatusIconsHTML(line.statusFlags || []);
        clone.querySelector('.description').textContent = line.desc;

        const tagsContainer = clone.querySelector('.info-tags-container');
        if (tagsContainer) {
            tagsContainer.className = 'vertical-info-list';
            tagsContainer.innerHTML = '';
            
            // ✨ 測試用假資料，強制生成 4 個「膠囊 + 圓形」
            const dummyTexts = ['運行状況：平常運転', '現在の混雑度：ゆったり', '次の列車：快速', '車両編成：8両編成'];
            const dummyCircles = ['◎', '空', '5分', '8両'];

            // 👇 這裡的迴圈要改成 i < 4
            for (let i = 0; i < 4; i++) {
                const row = document.createElement('div');
                row.className = 'info-list-row';

                const cap = document.createElement('div');
                cap.className = 'info-capsule';
                // 優先使用原本的 detail，如果沒有就用假資料墊檔
                cap.textContent = line.detail[i] || dummyTexts[i];

                const cir = document.createElement('div');
                cir.className = 'info-circle';
                cir.textContent = dummyCircles[i];

                row.appendChild(cap);
                row.appendChild(cir);
                tagsContainer.appendChild(row);
            }
        }

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
            if (fixedCard) fixedCard.classList.remove('opening-pull-fixed');

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
// ============================================================================
// 🟢 點擊卡片彈出實心玻璃面板 (防幽靈位移 + 高度物理支撐版)
// ============================================================================
function handleCardClick(id) {
    if (isAnimating || mainStack.classList.contains('dragging') || mainStack.classList.contains('bounce-back') || mainStack.classList.contains('bounce-back-wheel')) return;

    const data = window.appRailwayData.find(l => l.id === id);
    if (!data) return;

    const originalCard = document.getElementById(`card-${id}`);
    activeCardId = id;
    isAnimating = true;
    history.pushState({ cardActive: true }, '');

    // ✨ 殺蟲劑：打開卡片前，強制清空所有幽靈位移，保證從原點出發！
    detailContainer.innerHTML = '';
    detailContainer.style.transition = 'none';
    detailContainer.style.transform = 'none';

    const template = document.getElementById('detail-card-template');
    const clone = template.content.cloneNode(true);
    const inner = clone.querySelector('.detail-card-inner');

    inner.style.background = applyThemeToCard(inner, data.hex);
    clone.querySelector('.line-name').textContent = data.name;
    clone.querySelector('.status-tag').innerHTML = window.getStatusIconsHTML(data.statusFlags || []);
    clone.querySelector('.description').textContent = data.desc;

    // ✨ 高度支撐魔法：把膠囊變透明，但繼續把它們留在卡片裡撐住高度，卡片就不會塌陷了！
    const tagsContainer = clone.querySelector('.info-tags-container');
    if (tagsContainer) {
        tagsContainer.className = 'vertical-info-list';
        tagsContainer.innerHTML = '';
        tagsContainer.style.visibility = 'hidden'; 
        tagsContainer.style.opacity = '0';         
        
        for (let i = 0; i < 4; i++) {
            const row = document.createElement('div');
            row.className = 'info-list-row';
            const cap = document.createElement('div');
            cap.className = 'info-capsule';
            cap.textContent = data.detail[i] || '-';
            const cir = document.createElement('div');
            cir.className = 'info-circle';
            cir.textContent = '-';
            row.appendChild(cap);
            row.appendChild(cir);
            tagsContainer.appendChild(row);
        }
    }

    detailContainer.appendChild(clone);

    // ✨ 動態生成底部的詳細資訊玻璃面板 (加入 height: auto 讓它依內容縮放)
    const extension = document.createElement('div');
    extension.className = 'detail-extension-card';
    extension.style.cssText = 'height: auto; margin-top: 16px; display: flex; flex-direction: column; gap: 16px; padding: 20px 16px 40px 16px; max-height: calc(100dvh - 340px); overflow-y: auto; overscroll-behavior: contain;';

    if (data.detailedLines && data.detailedLines.length > 0) {
        data.detailedLines.forEach(line => {
            let statusColor = '#30d158'; 
            let statusBg = 'rgba(48, 209, 88, 0.15)';
            let statusBorder = 'rgba(48, 209, 88, 0.3)';

            if (line.isError) {
                statusColor = '#ff9f0a'; statusBg = 'rgba(255, 159, 10, 0.15)'; statusBorder = 'rgba(255, 159, 10, 0.3)';
            } else if (line.isAttention) {
                statusColor = '#ffffff'; statusBg = 'rgba(255, 255, 255, 0.15)'; statusBorder = 'rgba(255, 255, 255, 0.3)';
            } else if (line.isDelayed) {
                statusColor = '#ff453a'; statusBg = 'rgba(255, 69, 58, 0.15)'; statusBorder = 'rgba(255, 69, 58, 0.3)';
            }

            const delayText = line.delay > 0 ? ` (${line.delay}分)` : '';

            const row = document.createElement('div');
            row.style.cssText = `
                background: rgba(30, 30, 32, 0.65);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px; 
                padding: 18px 24px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                flex-shrink: 0;
            `;

            let advancedHtml = '';
            if (line.advancedDetails && line.advancedDetails.length > 0) {
                advancedHtml = `
                    <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; margin-bottom: 6px;">
                        ${line.advancedDetails.map(adv => {
                            const isDirDelayed = adv.max_delay > 0;
                            const dirDelayText = isDirDelayed ? `<span style="color: #ff453a; font-weight: 800;">${adv.max_delay}分遅れ</span>` : `<span style="color: #30d158; font-weight: 600;">平常</span>`;
                            const trainCountText = adv.train_count > 0 ? `<span style="font-size: 0.85em; opacity: 0.5; margin-right: 8px;">(${adv.train_count}列車)</span>` : '';
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85em; padding: 8px 12px; background: rgba(0, 0, 0, 0.25); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                                    <span style="color: rgba(255, 255, 255, 0.9); font-weight: 600;">${adv.direction_name}</span>
                                    <div style="display: flex; align-items: center;">${trainCountText}${dirDelayText}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }

            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-weight: 800; font-size: 1.15em; color: #fff; letter-spacing: 0.5px;">${line.name}</div>
                        <div style="font-size: 0.75em; color: rgba(255,255,255,0.5); font-weight: 600;">${line.company}</div>
                    </div>
                    <div style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 800; white-space: nowrap;">
                        ${line.status}${delayText}
                    </div>
                </div>
                <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.08);"></div>
                <div style="font-size: 0.9em; color: rgba(255,255,255,0.85); line-height: 1.5; font-weight: 500;">${line.message}</div>
                ${advancedHtml}
                <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: -4px;">
                    <span style="font-size: 0.75em; color: rgba(255,255,255,0.4); font-weight: 600; display: flex; align-items: center; gap: 4px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        更新: ${line.updateTime}
                    </span>
                </div>
            `;
            extension.appendChild(row);
        });
    } else {
        extension.innerHTML = `
            <div style="background: rgba(30, 30, 32, 0.65); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px 20px; text-align: center; color: var(--text-secondary); box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
                <div style="opacity: 0.6; margin-bottom: 12px; display: flex; justify-content: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                <div style="font-size: 1.05em; font-weight: 800; color: #fff;">追跡している路線はありません</div>
                <div style="font-size: 0.85em; margin-top: 8px; opacity: 0.7;">右上の「＋」から路線を追加してください</div>
            </div>
        `;
    }

    if (data.isTemporarySearch) {
        const addBtn = document.createElement('button');
        addBtn.innerHTML = '看板に追加する';
        addBtn.style.cssText = 'margin-top: 8px; width: 100%; padding: 16px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 18px; color: white; font-weight: 800; font-size: 16px; cursor: pointer; backdrop-filter: blur(10px); box-shadow: 0 4px 15px rgba(0,0,0,0.2); flex-shrink: 0; transition: transform 0.2s ease, opacity 0.2s ease;';
        addBtn.onclick = () => {
            closeAllCards(false);
            setTimeout(() => { if(window.openAddPanel) window.openAddPanel(); }, 400);
        };
        extension.appendChild(addBtn);
    }
    
    detailContainer.appendChild(extension);

    const capsule = document.getElementById('action-capsule');
    if (capsule) capsule.classList.add('detail-active');

    // ✨ 暴力清除阻擋背景虛化的殘留樣式
    mainStack.style.removeProperty('filter');
    mainStack.style.removeProperty('opacity');
    mainStack.style.removeProperty('pointer-events');
    mainStack.style.removeProperty('transition');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            detailOverlay.classList.add('active');
            mainStack.classList.add('has-active');

            const dismissIcon = document.getElementById('dismiss-icon');
            if (dismissIcon) {
                dismissIcon.style.visibility = 'visible';
                dismissIcon.style.opacity = '0';
                setTimeout(() => {
                    if (activeCardId && !document.body.classList.contains('searching')) dismissIcon.style.opacity = '1';
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
    clone.querySelector('.status-tag').innerHTML = window.getStatusIconsHTML(bottomCardConfig.statusFlags || []);
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
    // 🟢 同步反向聯動：卡片一關閉，立刻移除狀態，讓圖示完美反向退場
    const capsule = document.getElementById('action-capsule');
    if (capsule) {
        capsule.classList.remove('detail-active');
        capsule.classList.remove('trigger-pop'); // 防呆，確保微互動被打斷時不會卡住
    }
    // 🟢 清除滑動手勢殘留的強制樣式，讓 CSS 動畫接管最終收尾
    const allCapsuleIcons = document.querySelectorAll('#action-capsule .capsule-btn-item svg');
    allCapsuleIcons.forEach(icon => {
        icon.style.transition = 'opacity 0.4s ease, transform 0.55s var(--spring-release)';
        icon.style.removeProperty('transform');
        icon.style.removeProperty('opacity');
    });

    // 🟢 確保關閉時有滑順的淡出動畫
    const dismissIcon = document.getElementById('dismiss-icon');
    if (dismissIcon) {
        dismissIcon.style.transition = 'opacity 0.2s ease';
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
    const extension = detailContainer.querySelector('.detail-extension-card');
    
    // ✨ 確保關閉時，裝著所有東西的大箱子也要歸位！
    detailContainer.style.transition = '';
    detailContainer.style.transform = '';
    
    if (inner) {
        inner.style.transition = '';
        inner.style.transform = '';
    }


    // 👇 加入這段清理延伸卡片樣式
    if (extension) {
        extension.style.transition = '';
        extension.style.transform = '';
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

// ✨ 新增防呆變數：用來記錄手指是不是按在「主卡片」上
let overlayStartY = 0;
let isClosingGestureAllowed = false; 

function initOverlayGestures() {
    const inner = detailContainer.querySelector('.detail-card-inner');
    if (!inner) return;

    const dismissIcon = document.getElementById('dismiss-icon');
    const extraElements = inner.querySelectorAll('.description, .info-tags-container, .status-tag');
    
    let defaultIcons = document.querySelectorAll('#action-capsule .icon-default, #search-trigger .icon-default');
    let hiddenIcons = document.querySelectorAll('#action-capsule .icon-hidden, #search-trigger .icon-hidden');

    detailOverlay.ontouchstart = e => {
        if (isAnimating || !activeCardId) return;

        defaultIcons = document.querySelectorAll('#action-capsule .icon-default, #search-trigger .icon-default');
        hiddenIcons = document.querySelectorAll('#action-capsule .icon-hidden, #search-trigger .icon-hidden');

        overlayStartY = e.touches[0].pageY;
        
        // ✨ 終極劃清界線邏輯：
        // 判斷手指按下去的瞬間，是不是點在「主卡片 (.detail-card-inner)」上？
        const targetElement = e.target;
        const isClickingInnerCard = targetElement.closest('.detail-card-inner');
        
        if (isClickingInnerCard) {
            // 👉 點在主卡片上：允許觸發下拉關閉動畫！
            isClosingGestureAllowed = true;
            detailContainer.style.transition = 'none';

            if (dismissIcon) {
                dismissIcon.style.transition = 'none';
                dismissIcon.style.removeProperty('opacity');
                dismissIcon.style.opacity = '1';
                const dismissSvg = dismissIcon.querySelector('svg');
                if (dismissSvg) {
                    dismissSvg.style.removeProperty('transform');
                    dismissSvg.style.removeProperty('transition');
                }
            }
            extraElements.forEach(el => el.style.transition = 'none');
        } else {
            // 👉 點在實心玻璃面板上：封印關閉動畫，準備讓它自己捲動！
            isClosingGestureAllowed = false; 
        }
    };

    detailOverlay.ontouchmove = e => {
        if (isAnimating || !activeCardId) return;

        // ✨ 核心防護盾：如果手指不是點在主卡片上，我們這裡「什麼都不做」！
        // 直接放行讓 CSS 原生的 overflow-y: auto 去處理內部捲動，極度滑順且零衝突！
        if (!isClosingGestureAllowed) {
            return; 
        }

        const rawMoveY = e.touches[0].pageY - overlayStartY;

        if (rawMoveY > 0) {
            if (rawMoveY > 10 && e.cancelable) e.preventDefault(); // 阻止網頁的橡皮筋回彈
            const resistedY = rawMoveY * 0.5;
            
            detailContainer.style.transform = `translate3d(0, ${resistedY}px, 0)`;

            if (dismissIcon) dismissIcon.style.opacity = Math.max(0, 1 - (rawMoveY / 150));

            const progress = Math.min(rawMoveY / 200, 1);
            defaultIcons.forEach(icon => {
                icon.style.setProperty('transform', `translateY(${-120 + (120 * progress)}%)`, 'important');
                icon.style.setProperty('opacity', `${0.8 * progress}`, 'important');
            });
            hiddenIcons.forEach(icon => {
                icon.style.setProperty('transform', `translateY(${120 * progress}%)`, 'important');
                icon.style.setProperty('opacity', `${0.8 - (0.8 * progress)}`, 'important');
            });

            let textOpacity = 1;
            if (rawMoveY > 100) {
                textOpacity = Math.max(0, 1 - ((rawMoveY - 100) / 100));
            }
            extraElements.forEach(el => el.style.opacity = textOpacity);

            // 拉超過 200px 關閉卡片
            if (rawMoveY > 200) closeAllCards(false);
        }
    };

    detailOverlay.ontouchend = e => {
        // 如果原本就不允許關閉（例如是在玻璃面板滑動），就不用做復原動畫
        if (isAnimating || !activeCardId || !isClosingGestureAllowed) return;

        defaultIcons.forEach(icon => {
            icon.style.transition = 'opacity 0.4s ease, transform 0.55s var(--spring-release)';
            icon.style.removeProperty('transform');
            icon.style.removeProperty('opacity');
        });
        hiddenIcons.forEach(icon => {
            icon.style.transition = 'opacity 0.4s ease, transform 0.55s var(--spring-release)';
            icon.style.removeProperty('transform');
            icon.style.removeProperty('opacity');
        });

        if (!detailOverlay.classList.contains('active')) return;

        // 沒拉到底，彈回原位
        detailContainer.style.transition = 'transform 0.55s var(--spring-release)';
        detailContainer.style.transform = 'translate3d(0, 0, 0)';

        if (dismissIcon) {
            dismissIcon.style.transition = 'opacity 0.3s ease';
            dismissIcon.style.opacity = '1';
        }

        extraElements.forEach(el => {
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '1';
        });
    };

    // 電腦版滑鼠滾輪邏輯（一樣套用劃清界線法）
    let overlayWheelSum = 0;
    let overlayWheelTimer;
    detailOverlay.onwheel = e => {
        if (isAnimating || !activeCardId) return;

        const extension = detailContainer.querySelector('.detail-extension-card');
        
        // ✨ 如果滑鼠是在實心玻璃裡面滾動，直接放行，完全不觸發關閉動畫！
        if (extension && extension.contains(e.target)) {
            return; 
        }

        e.preventDefault();
        overlayWheelSum -= e.deltaY;
        if (overlayWheelSum < 0) overlayWheelSum = 0;
        const resistedY = overlayWheelSum * 0.2;
        
        detailContainer.style.transition = 'none';
        detailContainer.style.transform = `translate3d(0, ${resistedY}px, 0)`;

        extraElements.forEach(el => el.style.transition = 'none');

        if (dismissIcon) {
            dismissIcon.style.transition = 'none';
            dismissIcon.style.removeProperty('opacity');
            const dismissSvg = dismissIcon.querySelector('svg');
            if (dismissSvg) {
                dismissSvg.style.removeProperty('transform');
                dismissSvg.style.removeProperty('transition');
            }
            dismissIcon.style.opacity = Math.max(0, 1 - (overlayWheelSum / 150));
        }

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
                detailContainer.style.transition = 'transform 0.6s var(--active-bounce)';
                detailContainer.style.transform = 'translate3d(0, 0, 0)';

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
    document.getElementById('fixed-status').innerHTML = window.getStatusIconsHTML(bottomCardConfig.statusFlags || []);
    document.getElementById('fixed-desc').textContent = bottomCardConfig.description;

    const tag = card.querySelector('.status-tag');
    if (tag) tag.style.background = `rgba(255, 255, 255, ${bottomCardConfig.tagBgOpacity})`;
}

// ============================================================================
// 🟢 首頁專屬：全域混合搜尋引擎 (相容原生鍵盤鎖定 + 動態高度版)
// ============================================================================
function filterCards(keyword) {
    isInitialLoad = false;
    const lowKeyword = keyword.toLowerCase().trim();
    const mainStack = document.getElementById('main-stack');

    // 1. 確保懸浮下拉選單容器存在
    let dropdown = document.getElementById('home-search-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'home-search-dropdown';
        dropdown.style.cssText = `
            position: fixed;
            top: calc(env(safe-area-inset-top) + 100px);
            left: 50%;
            transform: translateX(-50%);
            width: calc(100% - 32px);
            max-width: 400px;
            /* ✨ 高度不寫死，交給下方的 JS 動態計算鍵盤高度 */
            overflow-y: auto;
            -webkit-overflow-scrolling: touch; /* ✨ 確保 iOS 內部滑動極致順暢 */
            overscroll-behavior: contain;
            z-index: 99999;
            display: none;
            flex-direction: column;
            gap: 16px;
            padding-bottom: 20px;
        `;
        
        // ✨ 防護網 1：阻止滑動事件往外傳遞，絕不干擾 header.js 的鎖定！
        dropdown.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });

        // ✨ 防護網 2：監聽手機鍵盤彈出！動態縮小面板高度，保證絕不超出螢幕
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                if (dropdown.style.display === 'flex') {
                    dropdown.style.maxHeight = `${window.visualViewport.height - 120}px`;
                }
            });
        }

        document.body.appendChild(dropdown);
    }

    // 2. 如果清空或取消搜尋框，隱藏選單、恢復主畫面
    if (!lowKeyword) {
        dropdown.style.display = 'none';
        // ✨ 移除上一版的 document.body... 把鎖定/解鎖的權力完全還給你的 header.js！
        mainStack.style.opacity = '1';
        mainStack.style.pointerEvents = 'auto';
        mainStack.style.filter = 'none';
        mainStack.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
        return;
    }

    // 3. 啟動搜尋引擎
    const dict = window.MasterRouteDictionary || {};
    const liveStatus = window.GlobalLiveStatus || {};
    const searchResults = [];
    const seenNames = new Set();

    // A. 遍歷雲端字典
    for (const rw_id in dict) {
        const route = dict[rw_id];
        if (route.name.toLowerCase().includes(lowKeyword) || route.company.toLowerCase().includes(lowKeyword)) {
            if (seenNames.has(route.name)) continue;
            seenNames.add(route.name);

            const statusInfo = liveStatus[rw_id] || { status_type: "監視中", message: "", delay_minutes: 0, status_text: "" };
            const msg = statusInfo.message || "";
            const isNormalMsg = msg.includes("ありません") || msg.includes("平常") || msg.includes("正常");
            
            let isDelayed = false;
            let isError = false;
            let isAttention = false;

            if (statusInfo.status_type && statusInfo.status_type.includes("エラー")) {
                isError = true;
            } else if (statusInfo.status_type === "監視中" || statusInfo.status_text === "公式発表なし" || statusInfo.status_text === "情報なし") {
                isAttention = true;
            } else if (!isNormalMsg && (statusInfo.delay_minutes > 0 || statusInfo.status_text.includes("異常") || msg.includes("遅延") || (statusInfo.status_type && statusInfo.status_type.includes("見合わせ")) || (statusInfo.status_type && statusInfo.status_type.includes("運転変更")))) {
                isDelayed = true;
            }

            // 完美轉換七燈號
            let flags = [false, false, false, false, false, false, false];
            if (isError) flags[3] = true;
            else if (isAttention) flags[6] = true;
            else if (isDelayed) flags[4] = true;
            else flags[5] = true;

            searchResults.push({
                id: rw_id,
                name: route.name,
                company: route.company,
                statusFlags: flags,
                delayMinutes: statusInfo.delay_minutes || 0
            });
        }
    }

    // B. 遍歷自訂卡片
    const customCards = window.appRailwayData.filter(c => c.isCustom && c.name.toLowerCase().includes(lowKeyword));
    customCards.forEach(c => {
        if (!seenNames.has(c.name)) {
            seenNames.add(c.name);
            searchResults.push({
                id: c.id,
                name: c.name,
                company: 'カスタムカード',
                statusFlags: [false, false, false, false, false, false, false],
                delayMinutes: 0
            });
        }
    });

    // 4. 渲染獨立玻璃膠囊
    if (searchResults.length === 0) {
        dropdown.innerHTML = `
            <div style="background: rgba(30, 30, 32, 0.65); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 30px; text-align: center; color: rgba(255,255,255,0.6); font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
                該当する路線が見つかりません
            </div>`;
    } else {
        dropdown.innerHTML = searchResults.slice(0, 30).map(route => {
            const delayText = route.delayMinutes > 0 ? `<div style="color: #ff453a; font-size: 0.75em; font-weight: 800; margin-top: 6px; text-align: right;">${route.delayMinutes}分遅れ</div>` : '';

            return `
                <div style="
                    background: rgba(30, 30, 32, 0.65);
                    backdrop-filter: blur(25px);
                    -webkit-backdrop-filter: blur(25px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px; 
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    flex-shrink: 0;
                    cursor: pointer;
                " onclick="window.previewRouteFromSearch('${route.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="font-weight: 800; font-size: 1.15em; color: #fff; letter-spacing: 0.5px;">${route.name}</div>
                            <div style="font-size: 0.75em; color: rgba(255,255,255,0.5); font-weight: 600;">${route.company}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end;">
                            <div class="status-tag" style="position: relative; top: 0; right: 0; transform: none; display: flex; align-items: center;">
                                ${window.getStatusIconsHTML(route.statusFlags)}
                            </div>
                            ${delayText}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ✨ 每次打字時，也主動抓取當下正確的鍵盤剩餘高度！
    const currentVpHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    dropdown.style.maxHeight = `${currentVpHeight - 120}px`;

    // 5. 顯示下拉選單
    dropdown.style.display = 'flex';
    // ✨ 移除 document.body.style.overflow = 'hidden'; 完全尊重 header.js
    mainStack.style.transition = 'opacity 0.4s ease, filter 0.4s ease';
    mainStack.style.opacity = '0.15';
    mainStack.style.pointerEvents = 'none';
    mainStack.style.filter = 'blur(8px) grayscale(50%)';
}

// 🟢 點擊搜尋結果的預覽功能：直接彈出該路線的即時狀態卡片！
window.previewRouteFromSearch = function(routeId) {
    // 1. 先關閉搜尋列與下拉選單
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.blur(); // 收起手機鍵盤
    }
    filterCards(''); // 清空搜尋結果並恢復主畫面
    
    const cancelBtn = document.querySelector('.cancel-circle-btn');
    if (cancelBtn) cancelBtn.click();

    // 2. 如果這張卡片已經在首頁看板上了，直接觸發點擊打開它！
    const existingCard = window.appRailwayData.find(c => c.id === routeId);
    if (existingCard) {
        const cardEl = document.getElementById(`card-${routeId}`);
        if (cardEl) {
            setTimeout(() => cardEl.click(), 300); // 等待主畫面動畫恢復後再點擊
            return;
        }
    }

    // 3. 如果是還沒加入看板的路線，我們使用「獨立資訊卡片彈窗引擎 (openInfoOverlay)」來預覽它！
    const dict = window.MasterRouteDictionary || {};
    const liveStatus = window.GlobalLiveStatus || {};
    
    const route = dict[routeId];
    const statusInfo = liveStatus[routeId] || { 
        status_type: "監視中", 
        status_text: "情報なし", 
        message: "現在情報はありません。", 
        update_time: "--:--", 
        delay_minutes: 0 
    };

    if (!route) return;

    // 翻譯燈號
    let flags = [false, false, false, false, false, false, false];
    if (statusInfo.status_text.includes("異常")) flags[6] = true;
    else if (statusInfo.status_type.includes("エラー")) flags[3] = true;
    else flags[5] = true; 

    let delayCapsule = statusInfo.delay_minutes > 0 ? `最大遅延：${statusInfo.delay_minutes}分` : "遅延なし";

    // 組合精美的預覽卡片內容，甚至加上「新增至看板」的快捷鍵！
    const contentHTML = `
        <div class="line-name">${route.name}</div>
        <div class="status-tag">${window.getStatusIconsHTML(flags)}</div>
        <div class="description">${statusInfo.message}</div>
        <div class="vertical-info-list" style="margin-top: 16px;">
            <div class="info-list-row">
                <div class="info-capsule">状況：${statusInfo.status_type}</div>
                <div class="info-circle">◎</div>
            </div>
            <div class="info-list-row">
                <div class="info-capsule">判定：${statusInfo.status_text.split('（')[0]}</div>
                <div class="info-circle">ー</div>
            </div>
            <div class="info-list-row">
                <div class="info-capsule">更新：${statusInfo.update_time}</div>
                <div class="info-circle">ー</div>
            </div>
            <div class="info-list-row">
                <div class="info-capsule">${delayCapsule}</div>
                <div class="info-circle">${statusInfo.delay_minutes > 0 ? statusInfo.delay_minutes+'分' : '0分'}</div>
            </div>
        </div>
        <button onclick="window.closeInfoOverlay(); setTimeout(() => window.openAddPanel(), 400);" 
                style="margin-top: 24px; width: 100%; padding: 16px; background: rgba(255,255,255,0.25); border: 1px solid rgba(255,255,255,0.3); border-radius: 14px; color: white; font-weight: 800; font-size: 16px; cursor: pointer; backdrop-filter: blur(10px); box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
            看板に追加する
        </button>
    `;

    setTimeout(() => {
        window.openInfoOverlay(route.hex || '#2C2C2E', contentHTML);
    }, 250);
};

function initDismissIcon() {
    if (document.getElementById('dismiss-icon')) return;

    const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
            <path d="m6 9 6 6 6-6"/>
        </svg>`;

    const iconDiv = document.createElement('div');
    iconDiv.id = 'dismiss-icon';
    iconDiv.className = 'dismiss-icon';
    iconDiv.innerHTML = svgContent;
    // 確保新圖示吃的到線條顏色
    iconDiv.style.color = 'rgba(142, 142, 147, 0.8)';

    document.body.appendChild(iconDiv);
}

window.addEventListener('popstate', (e) => {
    if (activeCardId) {
        closeAllCards(true);
    }
});

// ============================================================================
// 🟢 全域歷史紀錄還原引擎 (具備前後狀態深度比對防呆)
// ============================================================================
window.undoCardPreference = async function() {
    if (!activeCardId || activeCardId === 'fixed-bottom') return false;

    try {
        // 1. 先抓出「還原前」的當前狀態
        const routeData = window.appRailwayData.find(r => r.id === activeCardId);
        if (!routeData) return false;

        const currentName = routeData.name;
        const currentHex = routeData.hex;

        // 2. 呼叫 db.js 進行還原 (DB 內部會進行上一筆與這一筆的互換)
        const restoredData = await restorePreviousPreference(activeCardId);
        
        if (restoredData) {
            // ✨ 3. 核心防呆比對：檢查是否真的有改變？
            const isNameSame = restoredData.customName === currentName;
            // 色碼比對統一轉小寫，避免 #FFFFFF 與 #ffffff 被誤判為不同
            const isHexSame = restoredData.customHex.toLowerCase() === currentHex.toLowerCase();

            // 如果名字與顏色「完全相同」，視為無效操作
            if (isNameSame && isHexSame) {
                console.log("[歷史紀錄] 上一筆資料與目前完全相同，忽略渲染並觸發錯誤提示");
                return false; // 回傳 false，直接觸發 X 搖頭動畫
            }

            // 4. 確實有差異，更新全域記憶體中的資料
            routeData.name = restoredData.customName;
            routeData.hex = restoredData.customHex;

            // 5. 畫面瞬間重新渲染 (套用全新光影)
            
            // A. 更新個性化面板 (如果目前打開的話)
            const customizeCard = document.querySelector('#dynamic-blank-overlay .detail-card-inner');
            if (customizeCard) applyThemeToCard(customizeCard, restoredData.customHex);

            // B. 更新詳情卡片
            const detailCard = document.querySelector('#detail-card-container .detail-card-inner');
            if (detailCard) {
                applyThemeToCard(detailCard, restoredData.customHex);
                const detailNameNode = detailCard.querySelector('.line-name');
                if (detailNameNode) detailNameNode.textContent = restoredData.customName;
            }

            // C. 更新底層的主列表卡片
            const mainCard = document.getElementById(`card-${activeCardId}`);
            if (mainCard) {
                applyThemeToCard(mainCard, restoredData.customHex);
                const mainNameNode = mainCard.querySelector('.line-name');
                if (mainNameNode) mainNameNode.textContent = restoredData.customName;
            }

            // D. 如果是在個性化模式下觸發，同步更新顯示的文字
            const pDisplayName = document.getElementById('p-display-name');
            const pDisplayColor = document.getElementById('p-display-color');
            if (pDisplayName) pDisplayName.textContent = restoredData.customName;
            if (pDisplayColor) pDisplayColor.textContent = restoredData.customHex.toUpperCase();

            return true; // 成功還原，回傳 true 觸發打勾動畫
        }
        return false; // 沒有上一筆紀錄
    } catch (error) {
        console.error("[Undo Engine] 還原失敗:", error);
        return false;
    }
};

// ============================================================================
// 🟢 系統啟動引擎 (安全保留 ID 之群組化讀取版)
// ============================================================================
async function initApp() {
    try {
        const userPrefs = await getAllUserPreferences();
        const DICTIONARY_API_URL = 'https://tsukinkanban-odpt.onrender.com/api/dictionary';
        const routeDict = await syncAndLoadDictionary(DICTIONARY_API_URL);

        console.log("📡 正在獲取最新運行狀態...");
        const STATUS_API_URL = 'https://tsukinkanban-odpt.onrender.com/api/status';
        const statusRes = await fetch(STATUS_API_URL);
        const liveStatus = await statusRes.json();
        
        window.GlobalLiveStatus = liveStatus; 
        window.appRailwayData = [];

        // 1. 直接拿 data.js 裡面的 5 張卡片當基底 (ID 完全不變！)
        const baseCards = [...railwayData]; 

        // 2. 將使用者的純手工自訂卡片 (new-card-) 也加入基底陣列
        for (const key in userPrefs) {
            if ((key.startsWith('new-card-') || key.startsWith('custom-')) && !baseCards.find(r => r.id === key)) {
                baseCards.push({
                    id: key,
                    name: '新規カード',
                    hex: '#2C2C2E',
                    targetLineIds: [], // 新卡片預設沒有追蹤路線
                    detail: ['カスタマイズ可能', '-', '-', '-'] // ✨ 補上這行防呆！
                });
            }
        }

        // 💡 3. 核心魔法：計算每張群組卡片的「綜合狀態」
        baseCards.forEach(card => {
            const pref = userPrefs[card.id];
            const finalName = pref && pref.customName ? pref.customName : card.name;
            const finalHex = pref && pref.customHex ? pref.customHex : card.hex;
            
            const finalTargetIds = pref && pref.targetLineIds ? pref.targetLineIds : (card.targetLineIds || []);

            let groupStatusText = "登録路線なし";
            let groupDesc = "路線を追加してください";
            let groupFlags = [false, false, false, false, false, false, false];
            let worstDelay = 0;
            let hasError = false;
            let hasDelay = false;
            let hasAttention = false; // ✨ 新增：監視中/無資料的注意狀態

            const detailedLines = [];

            if (finalTargetIds.length > 0) {
                groupStatusText = "平常運転";
                groupDesc = "すべての路線は平常通り運転しています。";
                
                finalTargetIds.forEach(lineId => {
                    const dictInfo = routeDict[lineId] || { name: "未知の路線", company: "不明" };
                    const statusInfo = liveStatus[lineId] || { status_type: "監視中", message: "現在情報はありません。", delay_minutes: 0, status_text: "公式発表なし", update_time: "--:--" };

                    const msg = statusInfo.message || "";
                    // ✨ 修正邏輯：如果文字裡有「ありません(沒有)」，就絕對不是延誤！
                    const isNormalMsg = msg.includes("ありません") || msg.includes("平常") || msg.includes("正常");

                    let isDelayedLocal = false;
                    let isErrorLocal = false;
                    let isAttentionLocal = false;

                    // 判斷該路線的個別狀態
                    if (statusInfo.status_type.includes("エラー")) {
                        isErrorLocal = true;
                        hasError = true;
                    } else if (statusInfo.status_type === "監視中" || statusInfo.status_text === "公式発表なし" || statusInfo.status_text === "情報なし") {
                        isAttentionLocal = true;
                        hasAttention = true;
                    } else if (!isNormalMsg && (statusInfo.status_text.includes("異常") || msg.includes("遅延") || statusInfo.delay_minutes > 0 || statusInfo.status_type.includes("見合わせ") || statusInfo.status_type.includes("運転変更"))) {
                        isDelayedLocal = true;
                        hasDelay = true;
                        if (statusInfo.delay_minutes > worstDelay) worstDelay = statusInfo.delay_minutes;
                    }

                    detailedLines.push({
                        id: lineId,
                        name: dictInfo.name,
                        company: dictInfo.company,
                        status: statusInfo.status_type,
                        message: msg,
                        delay: statusInfo.delay_minutes,
                        updateTime: statusInfo.update_time,
                        url: statusInfo.url || dictInfo.url,
                        isDelayed: isDelayedLocal,
                        isError: isErrorLocal,
                        isAttention: isAttentionLocal,
                        // ✨ 補上這行：把後端傳來的各方向詳細資料接接起來！如果沒有就給空陣列
                        advancedDetails: statusInfo.advanced_details || [] 
                    });
                });

                // ✨ 決定群組主卡片的「外觀燈號與文字」
                if (hasError) {
                    groupDesc = "一部の路線の情報を取得できません。";
                    groupFlags = [false, false, false, true, false, false, false]; // 亮第4顆 (打叉錯誤)
                } else if (hasDelay) {
                    groupDesc = `一部の路線で遅延やダイヤ乱れが発生しています。`;
                    groupFlags = [false, false, false, false, true, false, false]; // 亮第5顆 (三角形延誤)
                } else if (hasAttention) {
                    groupDesc = "現在監視中、または公式情報がありません。";
                    groupFlags = [false, false, false, false, false, false, true]; // ✨ 亮最後一顆 (白色驚嘆號/注意)
                } else {
                    groupFlags[5] = true; // 亮第6顆 (圓形正常)
                }
            } else {
                groupDesc = card.desc || groupDesc;
                groupFlags = card.statusFlags || groupFlags;
            }

            window.appRailwayData.push({
                id: card.id,               
                name: finalName,           
                hex: finalHex,
                desc: groupDesc,           
                statusFlags: groupFlags,   
                targetLineIds: finalTargetIds,
                detailedLines: detailedLines, 
                isCustom: card.id.startsWith('new-card-'),
                detail: card.detail || ['情報なし', '-', '-', '-'] 
            });
        });

        // 4. 執行自訂排序
        const orderData = userPrefs['__DISPLAY_ORDER__'];
        if (orderData && orderData.order) {
            window.appRailwayData.sort((a, b) => {
                let indexA = orderData.order.indexOf(a.id);
                let indexB = orderData.order.indexOf(b.id);
                if (indexA === -1) indexA = 999; 
                if (indexB === -1) indexB = 999;
                return indexA - indexB;
            });
        }

        // 5. 隱藏過濾與渲染
        let hiddenIds = [];
        try { hiddenIds = JSON.parse(localStorage.getItem('TsukinKanban_HiddenCards') || '[]'); } catch (e) {}
        const visibleData = window.appRailwayData.filter(r => !hiddenIds.includes(r.id));
        
        renderCards(visibleData);
        initBottomCard();
        initDismissIcon();

    } catch (error) {
        console.error("系統初始化失敗:", error);
        mainStack.innerHTML = '<p style="text-align:center; padding:40px; color:#666;">資料載入失敗，請檢查網路連線或 API 狀態</p>';
    }
}

// 因為 script type="module" 會延遲執行，這裡可以直接呼叫啟動
initApp();

document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

// 將模組內的函數暴露給全域
window.handleBottomCardClick = handleBottomCardClick;
window.handleOverlayClick = handleOverlayClick;
window.renderMainCards = renderCards;


// ============================================================================
// 🟢 獨立資訊卡片彈窗引擎 (Info Overlay) - 移植自空白卡片並切離干擾
// ============================================================================

window.openInfoOverlay = function (hexColor, contentHTML = '') {
    if (document.getElementById('dynamic-info-overlay') || window.isFlipAnimating) return;
    window.isFlipAnimating = true;

    if (!hexColor) {
        if (activeCardId) {
            const currentData = window.appRailwayData.find(l => l.id === activeCardId);
            if (currentData) hexColor = currentData.hex;
        }
        if (!hexColor) hexColor = '#2C2C2E';
    }

    const originalInner = document.querySelector('#detail-card-container .detail-card-inner');
    const originalContainer = document.getElementById('detail-card-container');
    if (!originalInner || !originalContainer) {
        window.isFlipAnimating = false;
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'dynamic-info-overlay';
    overlay.className = 'detail-overlay active';

    const container = document.createElement('div');
    container.className = 'perspective-container is-flipping';
    container.style.cssText = 'width: 100%; display: flex; justify-content: center; margin-top: calc(env(safe-area-inset-top) + 160px);';

    const card = document.createElement('div');
    card.className = 'detail-card-inner flip-in-start';
    applyThemeToCard(card, hexColor);

    // 注入自訂資訊內容
    if (contentHTML) {
        card.innerHTML = contentHTML;
    }

    container.appendChild(card);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (!e.target.closest('.detail-card-inner')) window.closeInfoOverlay();
    });

    const clearInlineStyles = (el) => {
        if (!el) return;
        el.style.removeProperty('transform');
        el.style.removeProperty('transition');
        el.style.removeProperty('box-shadow');
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform-origin');
    };

    let swipeStartX = 0;
    let swipeStartY = 0;
    let isSwiping = false;
    let swipeLocked = false;
    const swipeTolerance = 0.6;
    const triggerThreshold = window.innerWidth / 3;

    overlay.addEventListener('touchstart', (e) => {
        if (window.isFlipAnimating) return;
        if (e.touches.length > 1 || window.isFlipAnimating) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        isSwiping = false;
        swipeLocked = false;
    }, { passive: true });

    overlay.addEventListener('touchmove', (e) => {
        if (window.isFlipAnimating || swipeStartX === 0) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - swipeStartX;
        const deltaY = currentY - swipeStartY;

        const leftBtn = document.getElementById('capsule-main-btn');
        const rightBtn = document.getElementById('capsule-secondary-btn');
        const dismissIcon = document.getElementById('dismiss-icon');
        const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;

        if (!swipeLocked) {
            if (deltaX < -5) {
                if (Math.abs(deltaY) < Math.abs(deltaX) * swipeTolerance) {
                    isSwiping = true;
                    swipeLocked = true;
                } else {
                    swipeLocked = true;
                }
            } else if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                swipeLocked = true;
            }
        }

        if (isSwiping) {
            e.preventDefault();
            const resistance = 0.5;
            const dragDistance = Math.abs(deltaX) * resistance;
            const maxDist = window.innerWidth * 0.6;
            let progress = Math.max(0, Math.min(dragDistance / maxDist, 1));

            if (Math.abs(deltaX) >= triggerThreshold) {
                isSwiping = false;
                container.classList.remove('is-swiping');
                clearInlineStyles(card);
                clearInlineStyles(leftBtn);
                clearInlineStyles(rightBtn);
                window.closeInfoOverlay(true);
                return;
            }

            card.classList.add('hardware-accelerated');
            container.classList.add('is-flipping');
            container.classList.add('is-swiping');

            card.style.setProperty('transition', 'none', 'important');
            card.style.setProperty('transform', `scale(1) rotateY(${-90 * progress}deg)`, 'important');
            const shadowFadeProgress = Math.min(progress * 2, 1);
            card.style.setProperty('box-shadow', `0 20px 40px rgba(0,0,0,${0.2 * (1 - shadowFadeProgress)})`, 'important');
            container.style.setProperty('--swipe-shadow-opacity', `${shadowFadeProgress}`, 'important');

            if (leftBtn && rightBtn) {
                leftBtn.style.setProperty('transition', 'none', 'important');
                leftBtn.style.setProperty('transform', `translateX(${-30 * progress}px)`, 'important');
                rightBtn.style.setProperty('transition', 'none', 'important');
                rightBtn.style.setProperty('transform', `translateX(${-30 * progress}px)`, 'important');
            }

            if (dismissIcon) {
                dismissIcon.style.removeProperty('opacity');
                dismissIcon.style.opacity = '1';
            }
            if (dismissSvg) {
                dismissSvg.style.setProperty('transform-origin', '50% 50%', 'important');
                dismissSvg.style.setProperty('transition', 'none', 'important');
                const currentAngle = window.DISMISS_ICON_TARGET_ROTATION * (1 - progress);
                dismissSvg.style.setProperty('transform', `rotate(${currentAngle}deg)`, 'important');
            }
        }
    }, { passive: false });

    overlay.addEventListener('touchend', (e) => {
        if (!isSwiping) { swipeStartX = 0; return; }
        isSwiping = false;

        const currentX = e.changedTouches[0].clientX;
        const deltaX = currentX - swipeStartX;
        const resistance = 0.5;
        const dragDistance = Math.abs(deltaX) * resistance;
        const maxDist = window.innerWidth * 0.6;
        let progress = Math.max(0, Math.min(dragDistance / maxDist, 1));
        const flippedDegrees = 90 * progress;

        const leftBtn = document.getElementById('capsule-main-btn');
        const rightBtn = document.getElementById('capsule-secondary-btn');
        const dismissIcon = document.getElementById('dismiss-icon');
        const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;

        if (flippedDegrees > 20 || deltaX < -50) {
            container.classList.remove('is-swiping');
            clearInlineStyles(card);
            clearInlineStyles(leftBtn);
            clearInlineStyles(rightBtn);
            window.closeInfoOverlay(true);
        } else {
            container.classList.remove('is-swiping', 'is-flipping');
            container.style.removeProperty('--swipe-shadow-opacity');

            card.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15), box-shadow 0.3s linear', 'important');
            card.style.setProperty('transform', `scale(1) rotateY(0deg)`, 'important');
            card.style.setProperty('box-shadow', 'var(--ray-shadow-active)', 'important');

            if (leftBtn && rightBtn) {
                leftBtn.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                leftBtn.style.setProperty('transform', `translateX(0px)`, 'important');
                rightBtn.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                rightBtn.style.setProperty('transform', `translateX(0px)`, 'important');
            }

            if (dismissSvg) {
                dismissSvg.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.15)', 'important');
                dismissSvg.style.setProperty('transform', `rotate(${window.DISMISS_ICON_TARGET_ROTATION}deg)`, 'important');
            }

            setTimeout(() => {
                clearInlineStyles(card);
                clearInlineStyles(leftBtn);
                clearInlineStyles(rightBtn);
                container.classList.remove('is-flipping');
                card.classList.remove('hardware-accelerated');
            }, 500);
        }
        swipeStartX = 0;
    });

    originalContainer.classList.add('perspective-container', 'is-flipping');
    originalInner.classList.remove('flip-back-in');
    originalInner.classList.add('flip-out', 'hardware-accelerated');
    card.classList.add('hardware-accelerated');

    // 🟢 觸發專屬的 Info 膠囊連動
    if (window.slideInfoCapsuleMode) window.slideInfoCapsuleMode(true);

    const dismissIcon = document.getElementById('dismiss-icon');
    const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;

    if (dismissIcon) {
        dismissIcon.style.removeProperty('opacity');
        dismissIcon.style.opacity = '1';
    }
    if (dismissSvg) {
        dismissSvg.style.setProperty('transform-origin', '50% 50%', 'important');
        void dismissSvg.offsetWidth;
        dismissSvg.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.0, 0.0, 0.2, 1)', 'important');
        dismissSvg.style.setProperty('transform', `rotate(${window.DISMISS_ICON_TARGET_ROTATION}deg)`, 'important');
    }

    setTimeout(() => {
        card.classList.remove('flip-in-start');
        card.classList.add('flip-in-active');

        setTimeout(() => {
            originalInner.classList.remove('hardware-accelerated');
            card.classList.remove('hardware-accelerated');
            originalContainer.classList.remove('is-flipping');
            container.classList.remove('is-flipping');
            window.isFlipAnimating = false;
        }, 450);

    }, 300);
};

window.closeInfoOverlay = function (isFromGesture = false) {
    if (window.isFlipAnimating) return;
    window.isFlipAnimating = true;

    const overlay = document.getElementById('dynamic-info-overlay');
    const blankCard = overlay ? overlay.querySelector('.detail-card-inner') : null;
    const originalContainer = document.getElementById('detail-card-container');
    const originalInner = originalContainer ? originalContainer.querySelector('.detail-card-inner') : null;
    const blankContainer = overlay ? overlay.querySelector('.perspective-container') : null;

    if (!overlay || !blankCard || !originalInner || !originalContainer) {
        window.isFlipAnimating = false;
        return;
    }

    overlay.style.pointerEvents = 'none';

    blankCard.classList.add('hardware-accelerated');
    originalInner.classList.add('hardware-accelerated');
    originalContainer.classList.add('is-flipping');
    if (blankContainer) blankContainer.classList.add('is-flipping');

    blankCard.classList.remove('flip-in-active');
    blankCard.classList.add('flip-out-reverse');

    // 🟢 恢復原生膠囊
    if (window.slideInfoCapsuleMode) window.slideInfoCapsuleMode(false);

    const dismissIcon = document.getElementById('dismiss-icon');
    const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;

    if (dismissIcon) {
        dismissIcon.style.removeProperty('opacity');
        dismissIcon.style.opacity = '1';
    }

    if (dismissSvg) {
        dismissSvg.style.setProperty('transform-origin', '50% 50%', 'important');
        if (!isFromGesture) {
            dismissSvg.style.setProperty('transition', 'none', 'important');
            dismissSvg.style.setProperty('transform', `rotate(${window.DISMISS_ICON_TARGET_ROTATION}deg)`, 'important');
            void dismissSvg.offsetWidth;
        }
        dismissSvg.style.setProperty('transition', 'transform 0.3s cubic-bezier(0.0, 0.0, 0.2, 1)', 'important');
        dismissSvg.style.setProperty('transform', 'rotate(0deg)', 'important');
    }

    setTimeout(() => {
        originalInner.classList.remove('flip-out');
        originalInner.classList.add('flip-back-start');

        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.1s ease';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                originalInner.classList.remove('flip-back-start');
                originalInner.classList.add('flip-back-active');
            });
        });

        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            originalInner.classList.remove('flip-back-active');
            originalContainer.classList.remove('perspective-container', 'is-flipping');
            originalInner.classList.remove('hardware-accelerated');

            if (dismissIcon) dismissIcon.style.opacity = '1';
            if (dismissSvg) {
                dismissSvg.style.removeProperty('transform');
                dismissSvg.style.removeProperty('transition');
                dismissSvg.style.removeProperty('transform-origin');
            }

            window.isFlipAnimating = false;
        }, 450);

    }, 300);
};

// ============================================================================
// 🟢 頂部按鈕微互動 (Long Press 400ms 放大回彈)
// ============================================================================
function initHeaderButtonGestures() {
    // 抓取所有 Header 的互動按鈕
    const headerBtns = document.querySelectorAll('.left-circle-btn, .menu-close-btn, .search-trigger, .action-capsule, .cancel-circle-btn');

    headerBtns.forEach(btn => {
        let pressTimer = null;
        let isLifted = false;
        let startX = 0, startY = 0;

        btn.addEventListener('touchstart', (e) => {
            // 防呆：如果按鈕已經是展開成大卡片的狀態，則不觸發長按放大
            if (btn.classList.contains('is-expanded') || btn.classList.contains('menu-expanded')) return;

            // 🟢 新增的防呆：如果它是搜尋按鈕，且搜尋列已經處於展開 (active) 狀態，則不觸發放大
            if (btn.classList.contains('search-trigger') && document.getElementById('search-container').classList.contains('active')) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isLifted = false;

            // 完美複製牌組的 400ms 長按判定
            pressTimer = setTimeout(() => {
                isLifted = true;
                btn.classList.add('touch-lifted-btn');
                // 觸發硬體微震動回饋 (如果手機支援)
                if (window.navigator.vibrate) window.navigator.vibrate(10);
            }, 400);
        }, { passive: true });

        btn.addEventListener('touchmove', (e) => {
            if (!pressTimer && !isLifted) return;

            const moveX = e.touches[0].clientX;
            const moveY = e.touches[0].clientY;

            // 如果手指滑動超過 10px，視為誤觸或滾動，立刻取消長按判定
            if (Math.abs(moveX - startX) > 10 || Math.abs(moveY - startY) > 10) {
                clearTimeout(pressTimer);
                pressTimer = null;
                if (isLifted) {
                    btn.classList.remove('touch-lifted-btn');
                    isLifted = false;
                }
            }
        }, { passive: true });

        // 放開手指時，收回放大效果並清理計時器
        const endPress = () => {
            clearTimeout(pressTimer);
            pressTimer = null;
            if (isLifted) {
                btn.classList.remove('touch-lifted-btn');
                isLifted = false;
            }
        };

        btn.addEventListener('touchend', endPress);
        btn.addEventListener('touchcancel', endPress);
    });
}

// 啟動監聽
document.addEventListener('DOMContentLoaded', initHeaderButtonGestures);
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

// ============================================================================
// 🟢 橫向畫面 (Landscape Prompt) 絕對鎖死防護網
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const landscapePrompt = document.getElementById('landscape-prompt');
    if (landscapePrompt) {
        // 1. 禁止任何滑動行為 (徹底防止畫面被拖走)
        landscapePrompt.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        // 2. 禁止多指觸控 (防止 Safari 強制雙指放大縮小)
        landscapePrompt.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // 3. 禁止連點雙擊 (防止雙擊放大畫面)
        landscapePrompt.addEventListener('dblclick', (e) => {
            e.preventDefault();
        });

        // 4. 禁止長按右鍵 (防止跳出系統選單)
        landscapePrompt.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
});

// =========================================
// 🟢 搜尋框「智慧寬容輸入與自動分段」引擎 (Smart Forgiving Input)
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', function (e) {
        // 紀錄目前的游標位置，避免替換字串後游標亂跳
        const originalStart = this.selectionStart;
        const originalLength = this.value.length;

        let val = this.value;

        // 1. 全形轉半形、英文轉大寫
        val = val.replace(/[\uff10-\uff19\uff21-\uff3a\uff41-\uff5a]/g, function (c) {
            return String.fromCharCode(c.charCodeAt(0) - 0xfee0);
        }).toUpperCase();

        // 2. 特殊符號統一轉為 、
        val = val.replace(/[，。\/／,\.]/g, '、');

        // 3. 空白與各種底線、全形連字號轉為 -
        val = val.replace(/[ _＿－　]/g, '-');

        // 4. 剔除非法字元 (僅保留英數、日文、- 與 、)
        val = val.replace(/[^A-Z0-9\u3005\u3040-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uFF65-\uFF9F\-\、]/g, '');

        // 5. 符號防呆處理 (處理連續按空白鍵或打錯的情況)
        val = val.replace(/-+/g, '-');        // 連續的 ---- 縮減成單一個 -
        val = val.replace(/、+/g, '、');        // 連續的 、、、、 縮減成單一個 、
        val = val.replace(/-、/g, '、');        // 如果 - 和 、 撞在一起，保留分段用的 、
        val = val.replace(/、-/g, '、');
        val = val.replace(/^[、-]+/, '');     // 🟢 確保最前面沒有字元時，無法輸入符號/空白

        // 6. 🟢 核心智慧分段邏輯：「兩個 - 之間一定有 、 分開」
        let finalVal = '';
        let hasDash = false; // 用來追蹤目前區段是否已經出現過 -

        for (let char of val) {
            if (char === '、') {
                hasDash = false; // 遇到 、 代表進入新區段，重置記號
                finalVal += char;
            } else if (char === '-') {
                if (!hasDash) {
                    hasDash = true; // 區段內第一次出現 -，放行
                    finalVal += char;
                } else {
                    // 區段內已經有 - 了 (例如出現 xxx-xxx-)
                    // 強制將這個 - 轉換成 、，並重置記號開啟下一個新區段
                    hasDash = false;
                    finalVal += '、';
                }
            } else {
                finalVal += char;
            }
        }
        val = finalVal;

        // 7. 如果數值有變更，才進行替換與游標精準校正
        if (this.value !== val) {
            this.value = val;

            // 計算長度差異，讓游標能準確留在使用者剛剛打字的地方
            const lengthDiff = val.length - originalLength;
            const newCursorPos = Math.max(0, originalStart + lengthDiff);

            this.setSelectionRange(newCursorPos, newCursorPos);
        }
    });
});

// ============================================================================
// 🟢 桌面版鍵盤快捷鍵：方向鍵關閉詳情卡片 (全域監聽)
// ============================================================================
window.addEventListener('keydown', (e) => {
    // 防呆 1：如果使用者正在輸入框裡面打字（例如頂部的搜尋框），不要攔截方向鍵
    const activeElement = document.activeElement;
    const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
    if (isTyping) return;

    // 【下鍵 ArrowDown】 -> 關閉「詳情卡片 (Detail Card)」
    if (e.key === 'ArrowDown') {
        // 防呆 2：如果「個性化設定卡片 (blank-overlay)」或「自訂資訊卡片 (info-overlay)」還開著，先擋住！
        // 必須遵守 Z 軸層級物理法則，不能一次穿透關掉兩層
        if (document.getElementById('dynamic-blank-overlay') || document.getElementById('dynamic-info-overlay')) {
            return;
        }

        // 防呆 3：確認目前真的有詳情卡片展開中 (activeCardId 有值)，且不在動畫過渡期間
        if (activeCardId && !isAnimating) {
            e.preventDefault();  // 攔截預設行為，防止網頁背景跟著往下滾動
            closeAllCards(true); // 呼叫你原本寫好的關閉函數 (傳入 true 觸發流暢動畫)
        }
    }
});

// ============================================================================
// 🟢 左舷母艦：進階機械滾動時鐘引擎 (Dynamic Clock)
// ============================================================================
document.addEventListener('DOMContentLoaded', initDynamicClock);