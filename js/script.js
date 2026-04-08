// script.js - 主 UI 邏輯與狀態控制 (動畫與 History API 修正版)

// 🚀 零延遲視覺攔截器：在任何 DOM 渲染前，同步檢查設定狀態並即時套用
try {
    // 1. 系統鼠標
    if (localStorage.getItem('tsukin_setting_useSystemCursor') === 'true') {
        document.body.classList.add('use-system-cursor');
    }
} catch (e) { }

import { bottomCardConfig, railwayData } from '../data/data.js';
import { initPhysics } from './physics.js';
import { initHeader } from './header.js';
import { getAllUserPreferences, restorePreviousPreference } from '../data/db.js';
import { initPersonalization } from './personalization.js';
import { initDynamicClock } from './clock.js';
import { syncAndLoadDictionary } from '../data/dictionary-db.js';
import { initFlights, searchFlights } from './flights.js';
import { startRouteEditMode } from './edit-routes.js';

// 🟢 宣告全域變數，作為整個 App 實際渲染、搜尋、點擊的唯一資料來源
window.appRailwayData = [];

// 🚀 升級版：七燈號 SVG 狀態生成引擎 (預設全部為 false 暗燈)
window.getStatusIconsHTML = function (activeFlags = [false, false, false, false, false, false, false]) {
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

// ============================================================================
// 🟢 智慧型局部渲染引擎 (保留 CSS 動畫與 DOM 狀態版)
// ============================================================================
function renderCards(data) {
    if (data.length === 0) {
        // 🟢 加入專屬的 class "empty-state-msg"，方便未來精準辨識
        mainStack.innerHTML = '<p class="empty-state-msg" style="text-align:center; padding:40px; color:#666;">該当する駅・路線が見つかりません</p>';
        return;
    }

    // 🚨 抓蟲修復：只精準移除空狀態訊息，絕對不碰已經在畫面上飛舞的卡片！
    const emptyMsg = mainStack.querySelector('.empty-state-msg');
    if (emptyMsg) {
        emptyMsg.remove();
    } else if (mainStack.children.length === 1 && mainStack.firstElementChild.tagName === 'P') {
        // 防呆：相容舊版沒加 class 的狀況
        mainStack.innerHTML = '';
    }

    const template = document.getElementById('railway-card-template');

    // 紀錄這次拿到的所有合法卡片 ID，用來最後清理被刪除的卡片
    const currentValidIds = data.map(line => `card-${line.id}`);

    data.forEach((line, index) => {
        // 🟢 智慧比對：這張卡片的 DOM 已經存在畫面上嗎？
        let card = document.getElementById(`card-${line.id}`);
        let isNewCard = false;

        if (!card) {
            // 👉 A. 如果不存在 (初次載入或新增卡片)，我們才「建立」新節點
            isNewCard = true;
            const clone = template.content.cloneNode(true);
            card = clone.querySelector('.card');
            card.id = `card-${line.id}`;

            // 綁定點擊事件
            card.onclick = () => handleCardClick(line.id);

            // ⭐️ 動畫守護者：只有「全新建立」的卡片，才需要掛上波浪進場動畫
            if (isInitialLoad) {
                card.classList.add('opening-pull');
                card.style.animationDelay = `${(data.length - index) * 0.08}s`;
            }

            // ✨ DOM 順序校正：確保新卡片永遠安插在「置底卡片」的上方
            const fixedCard = document.getElementById('fixed-info-card');
            if (fixedCard) {
                mainStack.insertBefore(clone, fixedCard);
            } else {
                mainStack.appendChild(clone);
            }
        } else {
            // ✨ DOM 順序校正：針對已經存在的卡片，強制依照新陣列的順序在畫面中重新排隊！
            const fixedCard = document.getElementById('fixed-info-card');
            if (fixedCard) {
                mainStack.insertBefore(card, fixedCard);
            } else {
                mainStack.appendChild(card);
            }
        }

        // 👉 B. 無縫資料更新 (無論新舊卡片都會執行，且「絕對不會」打斷 CSS 動畫)

        // 重新套用最新光影與背景色
        applyThemeToCard(card, line.hex);

        // 如果這張卡片正是現在展開的那張，維持它的隱形待命狀態
        if (activeCardId === line.id) {
            card.classList.add('hidden-placeholder', 'lifted-state');
            card.style.transform = 'translate3d(0, -100px, 0)';
        }

        // 🟢 核心：精準替換文字與圖示 (完全不摧毀外層的 .card)
        card.querySelector('.line-name').textContent = line.name;
        card.querySelector('.status-tag').innerHTML = window.getStatusIconsHTML(line.statusFlags || []);
        card.querySelector('.description').textContent = line.desc;

        // 🚨 抓蟲修復：加入 || 條件，避免第二次渲染時因為 class 被覆寫而找不到
        const tagsContainer = card.querySelector('.info-tags-container') || card.querySelector('.vertical-info-list');
        if (tagsContainer) {
            // 🟢 確保每次都同時擁有兩個 class，才不會在下一次被漏掉
            tagsContainer.className = 'info-tags-container vertical-info-list';
            tagsContainer.innerHTML = ''; // 這裡清空膠囊是安全的，因為不影響外層動畫

            const dummyTexts = ['運行状況：平常運転', '現在の混雑度：ゆったり', '次の列車：快速', '車両編成：8両編成'];
            const dummyCircles = ['◎', '空', '5分', '8両'];

            for (let i = 0; i < 4; i++) {
                const row = document.createElement('div');
                row.className = 'info-list-row';

                const cap = document.createElement('div');
                cap.className = 'info-capsule';
                cap.textContent = line.detail[i] || dummyTexts[i];

                const cir = document.createElement('div');
                cir.className = 'info-circle';
                cir.textContent = dummyCircles[i];

                row.appendChild(cap);
                row.appendChild(cir);
                tagsContainer.appendChild(row);
            }
        }
    });

    // 🟢 垃圾回收：如果畫面上有舊卡片不在最新 data 裡，把它移除
    Array.from(mainStack.children).forEach(child => {
        if (child.classList.contains('card') && !currentValidIds.includes(child.id)) {
            child.remove();
        }
    });

    // 🟢 開場動畫結束後的鎖定機制 (維持你原本的邏輯)
    if (isInitialLoad) {
        mainStack.classList.add('just-awoke');
        mainStack.dataset.freezeGlare = 'true';

        setTimeout(() => {
            isInitialLoad = false;
            document.querySelectorAll('.card').forEach(c => {
                c.classList.remove('opening-pull');
                c.style.animationDelay = '';
            });

            const fixedCard = document.getElementById('fixed-info-card');
            if (fixedCard) fixedCard.classList.remove('opening-pull-fixed');

            mainStack.dataset.freezeGlare = 'false';

            window.addEventListener('mousemove', function unlockHover() {
                if (!mainStack.classList.contains('allow-hover')) {
                    mainStack.classList.add('allow-hover');
                }
                window.removeEventListener('mousemove', unlockHover);
            }, { once: true });

        }, 1500);

        setTimeout(() => {
            mainStack.classList.remove('just-awoke');
        }, 2000);
    } else {
        if (!mainStack.classList.contains('allow-hover')) {
            mainStack.classList.add('allow-hover');
        }
    }
}
// ============================================================================
// 🟢 點擊卡片彈出實心玻璃面板 (防幽靈位移 + 高度物理支撐版)
// ============================================================================
function handleCardClick(id) {
    if (isAnimating || mainStack.classList.contains('dragging') || mainStack.classList.contains('bounce-back') || mainStack.classList.contains('bounce-back-wheel')) return;

    const data = window.appRailwayData.find(l => l.id === id);
    if (!data) return;

    // ✨ 狀態機防呆修復：如果已經有一張卡片在展開狀態（例如：卡片沒關就去按搜尋），
    // 我們必須先把舊卡片「瞬間復原」到背景，再讓新卡片接管畫面！
    if (activeCardId && activeCardId !== id) {
        const prevCard = activeCardId === 'fixed-bottom' ? document.getElementById('fixed-info-card') : document.getElementById(`card-${activeCardId}`);
        if (prevCard) {
            // 瞬間拔除所有隱形與位移狀態，肉眼看不出切換破綻
            prevCard.classList.remove('hidden-placeholder', 'lifted-state', 'returning');
            prevCard.style.transform = '';
            prevCard.style.animationDelay = '';
        }
    }

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

    // ✨ 核心抓蟲 1：直接抓取 Template 內建的玻璃面板
    const extension = clone.querySelector('.detail-extension-card');

    // 💡 UX 完美解法：外層玻璃「無限向下延伸」，隱藏底部圓角並防止回彈穿幫！
    extension.style.marginTop = '16px';
    extension.style.height = '100vh';
    extension.innerHTML = '';

    // ✨ 建立透明的內層滾動容器
    const scrollWrapper = document.createElement('div');
    scrollWrapper.id = 'card-extension-container';

    // 📐 內層滾動軸的精準高度：100dvh - 160(頂部預留) - 16(卡片間隙) - 主卡片高度
    // 加入 0px 防止電腦版 env() 報錯，並加入 min() 防止電腦版變數暴衝
    const exactScrollHeight = 'calc(100dvh - env(safe-area-inset-top, 0px) - 176px - (min(var(--card-width), 420px) / var(--card-ratio)))';
    const fallbackScrollHeight = 'calc(100vh - env(safe-area-inset-top, 0px) - 176px - (min(var(--card-width), 420px) / var(--card-ratio)))';

    scrollWrapper.style.cssText = `
        width: 100%; 
        overflow-y: visible; 
        overscroll-behavior: contain; 
        -webkit-overflow-scrolling: touch; 
        display: flex; 
        flex-direction: column; 
        gap: 16px; 
        padding: 16px 16px 0px 16px;
    `;

    // 套用精準捲動高度 (保證滑到底部時，捲動軸 100% 貼齊螢幕下緣)
    scrollWrapper.style.height = fallbackScrollHeight;
    scrollWrapper.style.height = exactScrollHeight;

    extension.appendChild(scrollWrapper);

    inner.style.background = applyThemeToCard(inner, data.hex);
    clone.querySelector('.line-name').innerHTML = data.name;
    clone.querySelector('.status-tag').innerHTML = window.getStatusIconsHTML(data.statusFlags || []);

    const cardContent = clone.querySelector('.card-content');

    if (data.isFlightCard && data.flightData) {
        // ✈️ 飛機卡片專屬排版
        const isCancelled = data.flightData.isCancelled;
        const isTimeChangedLocal = data.flightData.scheduled !== data.flightData.latest;
        const strikeScheduled = isTimeChangedLocal || isCancelled;

        cardContent.innerHTML = `
            <div style="display: flex; flex-direction: column; margin-top: 4px;">
                <div>
                    <div style="font-size: 1.15em; font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        ${data.flightData.routeHtml}
                    </div>
                    <div style="font-size: 0.85em; font-weight: 600; opacity: 0.7;">
                        ${data.flightData.airline}
                    </div>
                </div>

                <div style="width: 100%; border-top: 1px dashed rgba(255,255,255,0.25); margin: 20px 0;"></div>

                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; flex-direction: column; justify-content: center; gap: 4px;">
                        <div style="display: flex; align-items: baseline; gap: 8px; opacity: ${strikeScheduled ? '0.5' : '0.9'};">
                            <span style="font-weight: 600; font-size: 1.05em;">定刻</span>
                            <span style="font-family: monospace; font-size: 1.45em; font-weight: 800; line-height: 1; ${strikeScheduled ? 'text-decoration: line-through;' : ''}">${data.flightData.scheduled}</span>
                        </div>
                        ${(!isCancelled && isTimeChangedLocal) ? `
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span style="font-weight: 800; color: inherit; text-shadow: none; font-size: 1.05em;">変更</span>
                            <span style="font-family: monospace; font-size: 1.45em; font-weight: 800; color: inherit; line-height: 1;">${data.flightData.latest}</span>
                            <span style="font-weight: 800; font-size: 0.95em; color: ${data.flightData.delayColor}; text-shadow: ${data.flightData.delayShadow}; margin-left: 2px;">${data.flightData.delayText}</span>
                        </div>` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-end; gap: 6px;">
                        <div style="font-size: 1.35em; font-weight: 800; letter-spacing: 1px; color: ${data.flightData.statusColor}; text-shadow: ${data.flightData.statusShadow};">${data.flightData.statusText}</div>
                        <div style="font-size: 0.7em; font-weight: 600; opacity: 0.5;">更新: ${data.flightData.updateTime}</div>
                    </div>
                </div>
            </div>
        `;

        // ✨ 改變對象：全部改為塞入 scrollWrapper 裡面
        // ✨ 動態抓取航廈與登機口資訊 (如果 API 沒給或為 undefined 就用 '-')
        const fData = data.flightData;
        const isDep = fData.type === 'Departure';

        // 辨識主要機場名稱 (優化 HND/NRT 的顯示)
        let mainAirport = fData.airport;
        if (mainAirport === 'HND') mainAirport = '羽田(HND)';
        else if (mainAirport === 'NRT') mainAirport = '成田(NRT)';
        else mainAirport = mainAirport || '-';

        const otherAirport = fData.location || '-';

        // 判斷出發與抵達的名稱
        const depAirport = isDep ? mainAirport : otherAirport;
        const arrAirport = !isDep ? mainAirport : otherAirport;

        // API (ODPT) 通常只會提供「東京端(主機場)」的航廈與登機口資料
        const depTerminal = isDep ? (fData.terminal || '-') : '-';
        const depGate = isDep ? (fData.gate || '-') : '-';

        const arrTerminal = !isDep ? (fData.terminal || '-') : '-';
        const arrGate = !isDep ? (fData.gate || '-') : '-';

        // 判斷是否有航班備註 (這可能來自 Search 幽靈卡片的 message，或已儲存卡片的 flightData.note)
        let flightNote = data.message || (fData.note ? fData.note : '');
        if (flightNote && flightNote.startsWith('⚠️ 備考: ')) {
            flightNote = flightNote.replace('⚠️ 備考: ', '');
        }

        let noteHtml = '';
        if (flightNote) {
            // SVG 依然完美釘死在左側 16px
            const warningSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-warning-icon lucide-message-square-warning" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); opacity: 0.8;"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 15h.01"/><path d="M12 7v4"/></svg>`;

            // ✨ 加入 flex-direction: row 抵抗外部 CSS 干擾
            // ✨ 內部 div 加入 margin: 0 防止預設段落留白推擠
            noteHtml = `
            <div class="extension-route-card" style="position: relative; padding: 16px 16px 16px 54px; min-height: 84px; display: flex; flex-direction: row; align-items: center;">
                ${warningSvg}
                <div style="font-weight: 700; font-size: 0.95em; line-height: 1.5; width: 100%; text-align: left; margin: 0;">
                    ${flightNote}
                </div>
            </div>
            `;
        }

        // ✨ 改變對象：塞入精緻的 Native 雙欄風格卡片 (引入 CSS Class 支援深淺模式)
        scrollWrapper.innerHTML = `
            <div class="extension-route-card" style="padding: 18px 16px;">
                <div style="font-weight: 800; font-size: 1.05em; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8; transform: translateY(-1.5px);"><path d="M12 13v8"/><path d="M12 3v3"/><path d="M2.354 10.354a1.207 1.207 0 0 1 0-1.708l2.06-2.06A2 2 0 0 1 5.828 6h12.344a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H5.828a2 2 0 0 1-1.414-.586z"/></svg>
                    搭乗口・ターミナル情報（Beta）
                </div>
                <div style="display: flex; gap: 12px;">
                    <div class="flight-terminal-block">
                        <div class="flight-terminal-header">
                            出発 <span style="font-family: monospace; font-size: 1.15em; opacity: 0.9;">${depAirport}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <span style="font-size: 0.85em; font-weight: 600; opacity: 0.8;">ターミナル</span>
                            <span style="font-weight: 800; font-size: 1.2em; font-family: monospace;">${depTerminal}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <span style="font-size: 0.85em; font-weight: 600; opacity: 0.8;">搭乗口</span>
                            <span style="font-weight: 800; font-size: 1.2em; font-family: monospace;" class="${depGate !== '-' ? 'flight-highlight-gate' : ''}">${depGate}</span>
                        </div>
                    </div>
                    
                    <div class="flight-terminal-block">
                        <div class="flight-terminal-header">
                            到着 <span style="font-family: monospace; font-size: 1.15em; opacity: 0.9;">${arrAirport}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <span style="font-size: 0.85em; font-weight: 600; opacity: 0.8;">ターミナル</span>
                            <span style="font-weight: 800; font-size: 1.2em; font-family: monospace;">${arrTerminal}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <span style="font-size: 0.85em; font-weight: 600; opacity: 0.8;">搭乗口</span>
                            <span style="font-weight: 800; font-size: 1.2em; font-family: monospace;" class="${arrGate !== '-' ? 'flight-highlight-gate' : ''}">${arrGate}</span>
                        </div>
                    </div>
                </div>
            </div>
            ${noteHtml}
        `;

        // 5. [終極新增區塊] 增加三個水平排列的玻璃按鈕 (完美對齊版)
        const btnContainer = document.createElement('div');
        btnContainer.className = 'flight-action-buttons-container';
        // 🚨 移除了原本的 marginTop，完全交給外層 Flexbox 的 gap: 16px 處理，達成上下左右完美等距！

        // ✨ 替換為 Google Maps 經典地標 Pin 圖示 (Lucide Map-Pin)
        const iconMapPin = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 92.3 132.3" style="opacity: 0.95; transform: translateY(-1px);"><path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/><path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/><path fill="#4285f4" d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3"/><path fill="#fbbc04" d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3"/><path fill="#34a853" d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63 0-7.7-1.9-14.9-5.2-21.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2"/></svg>`;
        const iconMap = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;
        const iconShare = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

        // ✨ 升級按鈕建立工廠函式：支援第三個參數 onClickAction
        const createBtn = (iconHtml, text, onClickAction) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'flight-action-btn';
            btn.innerHTML = `${iconHtml}<span>${text}</span>`;

            // 如果有傳入點擊事件，就綁定上去
            if (onClickAction) {
                btn.onclick = onClickAction;
            }
            return btn;
        };

        // 🧠 智慧判斷 Google Maps 搜尋關鍵字 (超越單純座標的完美做法)
        let mapQuery = '';
        if (fData.airport === 'HND') mapQuery = '羽田空港';
        else if (fData.airport === 'NRT') mapQuery = '成田空港';

        // 💎 教授級 UX 細節：如果 API 有給航廈，直接幫使用者導航到「專屬航廈」！
        // 這樣 Google Maps 會直接開啟該航廈的「室內地圖」
        const mainTerminal = isDep ? depTerminal : arrTerminal;
        if (mapQuery !== '' && mainTerminal !== '-') {
            // 確保加上 "第Xターミナル" 讓 Google Maps 定位精準到棟
            const terminalSuffix = mainTerminal.toString().includes('ターミナル') ? mainTerminal : `第${mainTerminal}ターミナル`;
            mapQuery += ` ${terminalSuffix}`;
        }

        // 🗺️ 專屬 Google Maps 點擊事件
        const handleGoogleMapClick = () => {
            if (mapQuery) {
                // 使用 Google Maps Universal URL，這在手機上會自動喚醒原生的 Google Maps App！
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                alert('空港情報がありません'); // 防呆機制
            }
        };

        // ✨ 新增：飛機卡片也支援資料繼承 (包含燈號與飛機專屬資料)
        const handleCreateNewCardClick = () => {
            if (isAnimating) return;

            // 🚨 抓蟲修復：從臨時卡片中提煉出真實的飛機航班 ID
            let realFlightId = null;
            if (data.flightData && data.flightData.id) {
                realFlightId = data.flightData.id;
            } else if (data.detailedLines && data.detailedLines.length > 0) {
                realFlightId = data.detailedLines[0].id;
            }

            // 🧹 SVG 隱形掃帚：把帶有 HTML 標籤的圖示從名稱中剝離，只保留純文字
            // 這樣在翻轉進入編輯面板時，就不會瞬間露出 SVG 原始碼！
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.name;
            const cleanName = tempDiv.textContent.trim() || data.name;

            const prefillData = {
                name: cleanName, // ✨ 這裡原本是 data.name，換成乾淨的版本！
                hex: data.hex,
                desc: data.desc,
                detail: data.detail,
                statusFlags: data.statusFlags || [false, false, false, false, false, false, false],

                // ✨ 修正：如果原本的 targetLineIds 是空的，就把抓到的真實航班 ID 塞進去！
                targetLineIds: (data.targetLineIds && data.targetLineIds.length > 0)
                    ? data.targetLineIds
                    : (realFlightId ? [realFlightId] : []),

                detailedLines: data.detailedLines || [],
                // ✈️ 關鍵：把飛機專屬的判斷旗標與資料打包帶走！
                isFlightCard: data.isFlightCard || false,
                flightData: data.flightData || null
            };

            closeAllCards(false);
            setTimeout(() => {
                if (typeof window.createNewCardAndEdit === 'function') {
                    window.createNewCardAndEdit(prefillData);
                }
            }, 450);
        };

        // ✨ 加入你指定的飛機專屬 SVG (微調了粗細 stroke-width="2.5" 確保與系統圖示一致)
        const iconPlane = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;

        // 🟢 智慧分流：利用 ID 判斷目前是「搜尋預覽」還是「已加入主畫面」
        const isPreviewCard = data.id.startsWith('temp-search');

        if (isPreviewCard) {
            // 【預覽模式】尚未加入首頁時：保留 Google Maps 與 新規カード作成
            btnContainer.appendChild(createBtn(iconMapPin, 'Google Maps', handleGoogleMapClick));
            btnContainer.appendChild(createBtn(iconShare, '新規カード作成', handleCreateNewCardClick));
        } else {
            // 【主畫面模式】已經在首頁時：換上飛機 SVG，並自動偵測機場給予官網連結
            const handleOfficialSiteClick = () => {
                if (isAnimating) return;

                let officialUrl = '';
                // ✈️ 智慧判斷：依據機場代碼給予對應的官方網站
                if (fData.airport === 'HND') {
                    officialUrl = 'https://tokyo-haneda.com/';
                } else if (fData.airport === 'NRT') {
                    officialUrl = 'https://www.narita-airport.jp/jp/';
                }

                if (officialUrl) {
                    // 使用另開視窗安全地開啟官網
                    window.open(officialUrl, '_blank', 'noopener,noreferrer');
                } else {
                    // 防呆機制：如果遇到不是羽田或成田的未知機場
                    alert('公式サイトの情報がありません');
                }
            };

            btnContainer.appendChild(createBtn(iconMapPin, 'Google Maps', handleGoogleMapClick));
            btnContainer.appendChild(createBtn(iconPlane, '空港公式サイト', handleOfficialSiteClick));
        }

        scrollWrapper.appendChild(btnContainer);

    } else {
        // 🚄 火車卡片邏輯
        const descEl = clone.querySelector('.description');
        if (descEl) descEl.textContent = data.desc;

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

        if (data.detailedLines && data.detailedLines.length > 0) {
            data.detailedLines.forEach(line => {
                let statusClass = 'status-normal';
                if (line.isError) statusClass = 'status-error';
                else if (line.isAttention) statusClass = 'status-attention';
                else if (line.isDelayed) {
                    if (line.delay > 15) {
                        statusClass = 'status-delayed';
                    } else {
                        statusClass = 'status-delayed-minor';
                    }
                }

                const row = document.createElement('div');
                row.className = 'extension-route-card';

                let advancedHtml = '';
                if (line.advancedDetails && line.advancedDetails.length > 0) {
                    advancedHtml = `
                        <div class="adv-details-container">
                            ${line.advancedDetails.map(adv => {
                        let dirDelayHtml = `<span class="adv-normal-text">平常</span>`;
                        if (adv.max_delay > 0) {
                            if (adv.max_delay <= 5) dirDelayHtml = `<span class="adv-delay-minor-text">${adv.max_delay}分遅れ</span>`;
                            else dirDelayHtml = `<span class="adv-delay-text">${adv.max_delay}分遅れ</span>`;
                        }
                        const trainCountHtml = adv.train_count > 0 ? `<span class="adv-train-count">(${adv.train_count}列車)</span>` : '';
                        return `
                                    <div class="adv-detail-capsule">
                                        <span class="adv-dir-name">${adv.direction_name}</span>
                                        <div class="adv-status-group">${trainCountHtml}${dirDelayHtml}</div>
                                    </div>
                                `;
                    }).join('')}
                        </div>
                    `;
                }

                row.innerHTML = `
                    <div class="ext-card-header">
                        <div class="ext-card-title-group">
                            <div class="ext-route-name">${line.name}</div>
                            <div class="ext-route-company">${line.company}</div>
                        </div>
                        <div class="ext-status-badge ${statusClass}">
                            ${line.status}
                        </div>
                    </div>
                    <div class="ext-card-divider"></div>
                    <div class="ext-card-message">${line.message}</div>
                    ${advancedHtml}
                    <div class="ext-card-footer">
                        <span class="ext-update-time">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            更新: ${line.updateTime}
                        </span>
                    </div>
                `;
                scrollWrapper.appendChild(row);
            });

        } else {
            // 無追蹤路線時的空狀態
            scrollWrapper.innerHTML = `
                <div style="background: rgba(30, 30, 32, 0.65); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px 20px; text-align: center; color: var(--text-secondary); box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
                    <div style="opacity: 0.6; margin-bottom: 12px; display: flex; justify-content: center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                    <div style="font-size: 1.05em; font-weight: 800; color: #fff;">追跡している路線はありません</div>
                    <div style="font-size: 0.85em; margin-top: 8px; opacity: 0.7;">右上の「＋」から路線を追加してください</div>
                </div>
            `;
        }

        // =========================================================
        // ✨ 底部動作按鈕區塊 (搭載 Event Bubbling 阻擋護盾)
        // =========================================================
        if (data.isTemporarySearch) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'flight-action-buttons-container';

            const iconTimer = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;
            const iconListPlus = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>`;
            const iconSquarePlus = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-icon lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

            const createBtn = (iconHtml, text, onClickAction) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'flight-action-btn';
                btn.innerHTML = `${iconHtml}<span style="font-size: 0.9em; letter-spacing: -0.5px;">${text}</span>`;
                if (onClickAction) {
                    btn.onclick = (e) => {
                        e.stopPropagation(); // 🛡️ 神級防護盾：阻止點擊事件穿透到背景引發關閉！
                        onClickAction(e);
                    };
                }
                return btn;
            };

            // 刪除原本沒用的 handleTempAdd
            // 🟢 接通新系統：將目前的路線資料打包並傳給 RouteAppender
            const handleAddToExisting = () => {
                if (isAnimating) return;

                // 1. 📦 精準擷取目前預覽的這條路線資料
                const routeId = (data.detailedLines && data.detailedLines.length > 0)
                    ? data.detailedLines[0].id
                    : (data.id || data.targetLineIds[0]);

                const routeData = {
                    id: routeId,
                    name: data.name,
                    company: data.company || "不明"
                };

                // 2. 收起這張幽靈預覽卡片與搜尋列
                closeAllCards(false);

                // 3. ✨ 稍微等卡片收起的動畫一下下，然後召喚我們的獨立選擇面板！
                setTimeout(() => {
                    if (window.RouteAppender) {
                        window.RouteAppender.openPicker(routeData);
                    } else {
                        console.error("[系統錯誤] 找不到 RouteAppender，請確認 index.html 有無引入");
                        alert("系統模組載入失敗，請重新整理網頁");
                    }
                }, 300);
            };

            // ✨ 替換這裡：打包目前的卡片資訊，傳遞給新增引擎！
            const handleCreateNew = () => {
                if (isAnimating) return;

                // 📦 擷取這張卡片的精華資料
                const prefillData = {
                    name: data.name,
                    hex: data.hex,
                    desc: data.desc,
                    detail: data.detail,
                    statusFlags: data.statusFlags || [false, false, false, false, false, false, false],
                    targetLineIds: data.detailedLines && data.detailedLines[0] ? [data.detailedLines[0].id] : (data.targetLineIds || []),
                    detailedLines: data.detailedLines || []
                };

                closeAllCards(false);
                setTimeout(() => {
                    if (typeof window.createNewCardAndEdit === 'function') {
                        window.createNewCardAndEdit(prefillData);
                    }
                }, 450);
            };

            btnContainer.appendChild(createBtn(iconListPlus, '既存カード追加', handleAddToExisting));
            btnContainer.appendChild(createBtn(iconSquarePlus, '新規カード作成', handleCreateNew));

            scrollWrapper.appendChild(btnContainer);

        } else {
            // 🏠 情境 B：首頁常規卡片
            const btnContainer = document.createElement('div');
            btnContainer.className = 'flight-action-buttons-container';

            const iconEdit = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-chevrons-up-down-icon lucide-list-chevrons-up-down"><path d="M3 5h8"/><path d="M3 12h8"/><path d="M3 19h8"/><path d="m15 8 3-3 3 3"/><path d="m15 16 3 3 3-3"/></svg>`;
            const iconAdd = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-plus-icon lucide-list-plus"><path d="M16 5H3"/><path d="M11 12H3"/><path d="M16 19H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>`;

            const createBtn = (iconHtml, text, onClickAction) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'flight-action-btn';
                // 這裡保留你上一回合設定的 1.1em
                btn.innerHTML = `${iconHtml}<span style="font-size: 1.1em; letter-spacing: -0.5px;">${text}</span>`;

                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (navigator.vibrate) navigator.vibrate(50);

                    // ✨ 核心魔法：智慧捲動偵測
                    const isAtBottom = Math.abs(scrollWrapper.scrollHeight - scrollWrapper.scrollTop - scrollWrapper.clientHeight) <= 5;

                    if (isAtBottom) {
                        onClickAction();
                    } else {
                        scrollWrapper.scrollTo({
                            top: scrollWrapper.scrollHeight,
                            behavior: 'smooth'
                        });

                        setTimeout(() => {
                            onClickAction();
                        }, 400); // 等待鏡頭推進完成
                    }
                };
                return btn;
            };

            const handleEditRoutes = async () => {
                try {
                    const cardId = data.id;
                    const prefs = await getAllUserPreferences();
                    const pref = prefs[cardId];
                    const currentLineIds = pref && pref.targetLineIds ? pref.targetLineIds : (data.targetLineIds || []);
                    startRouteEditMode(cardId, currentLineIds);
                } catch (err) {
                    console.error('啟動編輯模式發生錯誤:', err);
                }
            };

            const handleAddRouteClick = () => {
                if (isAnimating) return;

                // 1. 狀態傳遞：利用全域變數（或 sessionStorage）記住目標卡片的 ID
                // 這樣等一下 add-panel.js 才知道要把選好的路線塞給誰
                window.targetCardIdForAdd = data.id;

                // 2. 視覺轉場：先關閉目前的詳情面板，避免 Z-index 穿透與效能問題
                closeAllCards(false);

                // 3. 轉場排程：等待 500ms 讓下拉關閉動畫跑完並完全落地
                setTimeout(() => {
                    // 尋找首頁頂部的搜尋觸發按鈕並模擬點擊
                    const searchBtn = document.querySelector('.search-trigger') || document.getElementById('search-trigger');

                    if (searchBtn) {
                        searchBtn.click(); // 觸發搜尋列展開

                        // 4. 微互動優化：等待搜尋框展開動畫後，自動 Focus 並喚起手機虛擬鍵盤
                        setTimeout(() => {
                            const searchInput = document.getElementById('search-input');
                            if (searchInput) {
                                searchInput.focus({ preventScroll: true });
                            }
                        }, 300); // 配合 Header 搜尋列展開的動畫時間 (約 300ms)
                    } else {
                        console.warn('[UX Engine] 找不到搜尋按鈕，無法展開搜尋列');
                    }
                }, 500); // 故意拉長到 500ms，確保 Z-index 退場乾淨，避免動畫打架
            };

            btnContainer.appendChild(createBtn(iconEdit, '路線を編集', handleEditRoutes));
            btnContainer.appendChild(createBtn(iconAdd, '路線を追加', handleAddRouteClick));

            scrollWrapper.appendChild(btnContainer);
        }

        const scrollSpacer = document.createElement('div');
        scrollSpacer.style.cssText = 'height: env(safe-area-inset-bottom, 0px); flex-shrink: 0; pointer-events: none;';
        scrollWrapper.appendChild(scrollSpacer);
    }

    // ✨ 最終：一次把整組掛載上去！
    detailContainer.appendChild(clone);

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

        // ✨ 2. 核心修復：動畫完全落地停穩後，再把 overflow-y 鎖回 auto，還原順滑的捲動功能！
        const sw = document.getElementById('card-extension-container');
        if (sw) sw.style.overflowY = 'auto';

    }, 600);
}

function handleBottomCardClick() {
    if (isAnimating) return;

    // ✨ 狀態機防呆修復：保護置底卡片被點開時的舊狀態
    if (activeCardId && activeCardId !== 'fixed-bottom') {
        const prevCard = document.getElementById(`card-${activeCardId}`);
        if (prevCard) {
            prevCard.classList.remove('hidden-placeholder', 'lifted-state', 'returning');
            prevCard.style.transform = '';
            prevCard.style.animationDelay = '';
        }
    }

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

    // ✨ 核心修復：如果點擊的地方不是主卡片，"也不是"玻璃延伸面板，才關閉！
    if (!e.target.closest('.detail-card-inner') && !e.target.closest('.detail-extension-card')) {
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

    // ✨ 關閉時也暫時解除裁切，保護下墜回彈時的視覺完整性
    const sw = document.getElementById('card-extension-container');
    if (sw) sw.style.overflowY = 'visible';

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

    // =====================================================================
    // ✋ 從這裡開始貼上：詳情面板下拉手勢引擎 (純 JS 狀態機多點防護版)
    // =====================================================================
    detailOverlay.ontouchstart = e => {
        if (isAnimating || !activeCardId) return;

        // 🚨 多點觸控防護 1：起手式如果就兩指，直接拒絕啟動手勢
        if (e.touches.length > 1) return;

        defaultIcons = document.querySelectorAll('#action-capsule .icon-default, #search-trigger .icon-default');
        hiddenIcons = document.querySelectorAll('#action-capsule .icon-hidden, #search-trigger .icon-hidden');

        overlayStartY = e.touches[0].pageY;

        // ✨ 終極劃清界線邏輯：判斷是否點在主卡片上
        const targetElement = e.target;
        const isClickingInnerCard = targetElement.closest('.detail-card-inner');

        if (isClickingInnerCard) {
            isClosingGestureAllowed = true; // 發放滑動憑證
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
            // 👉 點在下方玻璃面板或按鈕上：拒絕發放憑證，交給系統原生滾動與點擊
            isClosingGestureAllowed = false;
        }
    };

    detailOverlay.ontouchmove = e => {
        if (isAnimating || !activeCardId) return;

        // 🚨 多點觸控防護 2：滑動途中，偵測到第二根手指亂入 (例如去按下方按鈕)
        if (e.touches.length > 1) {
            // 如果原本正在滑動中，強制中斷並回彈
            if (isClosingGestureAllowed) {
                isClosingGestureAllowed = false; // 🛑 立刻吊銷滑動憑證！

                // 🚀 發射回彈引擎
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
            }
            return;
        }

        // 🛡️ 擋下幽靈接續：如果已經被吊銷憑證，絕對不執行下方位移！
        if (!isClosingGestureAllowed) return;

        const rawMoveY = e.touches[0].pageY - overlayStartY;

        if (rawMoveY > 0) {
            if (rawMoveY > 10 && e.cancelable) e.preventDefault();
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
            if (rawMoveY > 200) {
                isClosingGestureAllowed = false; // 觸發關閉時也強制吊銷
                closeAllCards(false);
            }
        }
    };

    // ✨ 將 touchend 與系統強制中斷 (touchcancel) 統整處理
    const handleTouchEnd = e => {
        // 如果原本就不允許關閉（例如已經被多指中斷），直接無視，不執行任何干擾
        if (isAnimating || !activeCardId || !isClosingGestureAllowed) return;

        // 🛡️ 標記手勢正式結束
        isClosingGestureAllowed = false;

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

    detailOverlay.ontouchend = handleTouchEnd;
    detailOverlay.ontouchcancel = handleTouchEnd;

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

    // 🚨 抓蟲修復：如果卡片已經掛上動畫了，就不要再重複指派，避免打斷 CSS 渲染引擎
    if (isInitialLoad && !card.classList.contains('opening-pull-fixed')) {
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
// 🟢 首頁專屬：全域混合搜尋引擎 (相容原生鍵盤鎖定 + 動態高度版 + 暴力無視減號)
// ============================================================================
function filterCards(keyword) {
    isInitialLoad = false;
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
            overflow-y: auto;
            -webkit-overflow-scrolling: touch; 
            overscroll-behavior: contain;
            z-index: 99999;
            display: none;
            flex-direction: column;
            gap: 16px;
            padding-bottom: 20px;
        `;

        dropdown.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                if (dropdown.style.display === 'flex') {
                    dropdown.style.maxHeight = `${window.visualViewport.height - 120}px`;
                }
            });
        }
        document.body.appendChild(dropdown);
    }

    // ✨ 終極暴力破解：支援頓號多重搜尋，且絕對無視「-」與空白
    const searchKeywords = keyword.split('、')
        .map(k => k.toLowerCase().replace(/[- ]/g, '').trim()) // 暴力把 - 跟空白拔光！
        .filter(k => k.length > 0);

    // 2. 如果清空或取消搜尋框，隱藏選單、恢復主畫面
    if (searchKeywords.length === 0) {
        dropdown.style.display = 'none';
        mainStack.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
        mainStack.style.opacity = '1';
        mainStack.style.pointerEvents = 'auto';
        mainStack.style.filter = 'none';
        return;
    }

    // 3. 啟動搜尋引擎
    const dict = window.MasterRouteDictionary || {};
    const liveStatus = window.GlobalLiveStatus || {};
    const searchResults = [];
    const seenNames = new Set(); // 防止多重搜尋時跑出重複路線

    // ✨ 迴圈啟動：針對每一個被頓號切開的詞獨立搜尋
    searchKeywords.forEach(lowKeyword => {

        // A. 遍歷雲端鐵道字典
        for (const rw_id in dict) {
            const route = dict[rw_id];

            // ✨ 把目標名稱裡的「-」也暴力拔除，兩邊都光溜溜的一定對得上！
            const rName = (route.name || '').toLowerCase().replace(/[- ]/g, '');
            const rComp = (route.company || '').toLowerCase().replace(/[- ]/g, '');
            const rKana = (route.kana || '').toLowerCase().replace(/[- ]/g, '');
            const rEn = (route.en || '').toLowerCase().replace(/[- ]/g, '');

            if (rName.includes(lowKeyword) || rComp.includes(lowKeyword) || rKana.includes(lowKeyword) || rEn.includes(lowKeyword)) {
                if (seenNames.has(route.name)) continue;
                seenNames.add(route.name);

                const statusInfo = liveStatus[rw_id] || { status_type: "監視中", message: "", delay_minutes: 0, status_text: "" };
                const msg = statusInfo.message || "";
                const isNormalMsg = msg.includes("ありません") || msg.includes("平常") || msg.includes("正常");

                // ✨ 提取延遲時間、異常文字、與具體備註判定
                const delay = statusInfo.delay_minutes || 0;
                const isTextAbnormal = !isNormalMsg && (statusInfo.status_text.includes("異常") || msg.includes("遅延") || (statusInfo.status_type && statusInfo.status_type.includes("見合わせ")) || (statusInfo.status_type && statusInfo.status_type.includes("運転変更")));
                const hasMessageNote = !isNormalMsg && msg.trim().length > 0;

                let isDelayed = false, isError = false, isAttention = false, isSevere = false;

                if (statusInfo.status_type && statusInfo.status_type.includes("エラー")) {
                    isError = true;
                } else if (statusInfo.status_type === "監視中" || statusInfo.status_text === "公式発表なし" || statusInfo.status_text === "情報なし") {
                    isAttention = true;
                } else if (delay > 0) {
                    if (delay <= 5) {
                        // 5分內：寬恕機制，維持綠燈
                    } else if (delay <= 15) {
                        isDelayed = true; // 6~15分：黃燈警告
                    } else {
                        isSevere = true;  // 超過15分：紅燈嚴重異常！
                    }
                } else if (isTextAbnormal) {
                    isDelayed = true;     // 🌟 核心降級：無明確分鐘數的公告，一律只亮黃燈警告！
                }

                // ✨ 燈號指派：支援多重燈號共存 (與主畫面完全一致)
                let flags = [false, false, false, false, false, false, false];
                if (isError || isSevere) flags[3] = true; // ❌ 紅燈 (嚴重)
                else if (isDelayed) flags[4] = true;      // ⚠️ 黃燈 (中度)
                else if (!isAttention) flags[5] = true;   // 🟢 綠燈 (正常)

                // ✨ 只要有監視狀態，或是官方發布了具體文字原因，就點亮第七顆燈 (❕)
                if (isAttention || hasMessageNote) flags[6] = true;

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
        // ✨ 修正：排除飛機卡片 (!c.isFlightCard)，讓飛機專屬的搜尋引擎 (C) 來處理，才能保留豐富的 UI！
        const customCards = window.appRailwayData.filter(c => c.isCustom && !c.isFlightCard && c.name.toLowerCase().replace(/[- ]/g, '').includes(lowKeyword));
        customCards.forEach(c => {
            if (!seenNames.has(c.name)) {
                seenNames.add(c.name);
                searchResults.push({
                    id: c.id,
                    name: c.name,
                    company: 'カスタムカード',
                    // ✨ 順便修復：把真實的燈號狀態還給自訂卡片，不要寫死全部 false
                    statusFlags: c.statusFlags || [false, false, false, false, false, false, false],
                    delayMinutes: 0
                });
            }
        });

        // C. ✈️ 呼叫航班搜尋
        if (typeof searchFlights === 'function') {
            const flightResults = searchFlights(lowKeyword);
            flightResults.forEach(f => {
                if (!seenNames.has(f.name)) {
                    seenNames.add(f.name);
                    searchResults.push(f);
                }
            });
        }
    });

    // 4. 渲染獨立玻璃膠囊
    if (searchResults.length === 0) {
        // ✨ 直接套用 CSS class，不再把樣式寫死
        dropdown.innerHTML = `<div class="search-empty-state">該当する路線が見つかりません</div>`;
    } else {
        dropdown.innerHTML = searchResults.slice(0, 30).map(route => {
            let delayHtml = route.customRightHtml || '';

            if (!route.customRightHtml && route.delayMinutes > 0) {
                if (route.delayMinutes <= 5) {
                    delayHtml = `<div class="search-delay-minor">${route.delayMinutes}分遅れ</div>`;
                } else {
                    delayHtml = `<div class="search-delay-major">${route.delayMinutes}分遅れ</div>`;
                }
            }

            // ✨ 解除封印：讓飛機卡片也變成手指游標，並綁定專屬的點擊事件
            const cursorStyle = 'cursor: pointer;';
            const clickAction = route.isFlight ? `onclick="window.previewFlightFromSearch('${route.id}')"` : `onclick="window.previewRouteFromSearch('${route.id}')"`;

            // ✨ 直接套用 CSS class，並在結尾處加入 ${route.customBottomHtml || ''} 支援底部換行排版！
            return `
                <div class="search-result-item" style="${cursorStyle}" ${clickAction}>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div class="search-result-title">${route.name}</div>
                            <div class="search-result-subtitle">${route.company}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end;">
                            <div class="status-tag" style="position: relative; top: 0; right: 0; transform: none; display: flex; align-items: center;">
                                ${window.getStatusIconsHTML(route.statusFlags)}
                            </div>
                            ${delayHtml} 
                        </div>
                    </div>
                    ${route.customBottomHtml || ''} 
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

// ============================================================================
// 🟢 點擊搜尋結果的預覽功能：無縫整合主卡片引擎 (幽靈卡片版)
// ============================================================================
window.previewRouteFromSearch = function (routeId) {
    // 1. 先關閉搜尋列與下拉選單
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.blur(); // 收起手機鍵盤
    }
    filterCards(''); // 清空搜尋結果並恢復主畫面

    const cancelBtn = document.querySelector('.cancel-circle-btn');
    if (cancelBtn) cancelBtn.click();

    // 2. 如果這張卡片剛好是一張「獨立的看板卡片」，直接觸發點擊打開它
    const existingCard = window.appRailwayData.find(c => c.id === routeId && !c.isTemporarySearch);
    if (existingCard) {
        const cardEl = document.getElementById(`card-${existingCard.id}`);
        if (cardEl) {
            setTimeout(() => cardEl.click(), 300); // 等待主畫面動畫恢復後再點擊
            return;
        }
    }

    // 3. 核心魔法：建立一張「隱形的幽靈卡片」，直接餵給詳情面板引擎！
    const dict = window.MasterRouteDictionary || {};
    const liveStatus = window.GlobalLiveStatus || {};
    const route = dict[routeId];
    if (!route) return;

    const statusInfo = liveStatus[routeId] || {
        status_type: "監視中",
        message: "現在情報はありません。",
        delay_minutes: 0,
        status_text: "公式発表なし",
        update_time: "--:--"
    };

    const msg = statusInfo.message || "";
    const isNormalMsg = msg.includes("ありません") || msg.includes("平常") || msg.includes("正常");

    // ✨ 同步套用進階與備註判定
    const delay = statusInfo.delay_minutes || 0;
    const isTextAbnormal = !isNormalMsg && (statusInfo.status_text.includes("異常") || msg.includes("遅延") || (statusInfo.status_type && statusInfo.status_type.includes("見合わせ")) || (statusInfo.status_type && statusInfo.status_type.includes("運転変更")));
    const hasMessageNote = !isNormalMsg && msg.trim().length > 0;

    let isDelayed = false, isError = false, isAttention = false, isSevere = false;

    if (statusInfo.status_type && statusInfo.status_type.includes("エラー")) {
        isError = true;
    } else if (statusInfo.status_type === "監視中" || statusInfo.status_text === "公式発表なし" || statusInfo.status_text === "情報なし") {
        isAttention = true;
    } else if (delay > 0) {
        if (delay <= 5) {
            // 5分內：寬恕機制
        } else if (delay <= 15) {
            isDelayed = true;
        } else {
            isSevere = true;
        }
    } else if (isTextAbnormal) {
        isDelayed = true; // 🌟 核心降級：統一降為黃燈
    }

    // ✨ 燈號指派：支援多重燈號共存
    let flags = [false, false, false, false, false, false, false];
    if (isError || isSevere) flags[3] = true; // ❌
    else if (isDelayed) flags[4] = true;      // ⚠️
    else if (!isAttention) flags[5] = true;   // 🟢

    // ✨ 第七顆燈 (備註/注意)
    if (isAttention || hasMessageNote) flags[6] = true;

    // 打造幽靈卡片資料
    const tempCard = {
        id: 'temp-search-route', // 固定 ID
        name: route.name,
        hex: route.hex || '#2C2C2E',
        desc: statusInfo.message || "現在監視中、または公式情報がありません。",
        statusFlags: flags,
        isTemporarySearch: true, // 🟢 標記為臨時搜尋卡片，讓面板知道要加上「新增按鈕」
        detail: ['検索結果', '-', '-', '-'], // 產生隱形柱子撐住高度用的假資料
        detailedLines: [{
            id: routeId,
            name: route.name,
            company: route.company,
            status: statusInfo.status_type || "情報なし",
            message: msg,
            delay: statusInfo.delay_minutes || 0,
            updateTime: statusInfo.update_time || "--:--",
            isDelayed: isDelayed,
            isError: isError,
            isAttention: isAttention,
            advancedDetails: statusInfo.advanced_details || []
        }]
    };

    // 寫入記憶體 (注意：我們沒有呼叫 renderCards()，所以首頁不會生出這張卡片)
    const tempIndex = window.appRailwayData.findIndex(c => c.id === 'temp-search-route');
    if (tempIndex !== -1) window.appRailwayData[tempIndex] = tempCard;
    else window.appRailwayData.push(tempCard);

    // 4. 等待 250ms，讓手機鍵盤完全縮下去、螢幕高度歸位後，呼叫卡片引擎彈出！
    setTimeout(() => {
        handleCardClick('temp-search-route');
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
window.undoCardPreference = async function () {
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

            // 🟢 [更新] 無損重繪魔法：不會破壞原本的 Flex/Grid 版型
            const forceRepaint = (el) => {
                if (!el) return;

                // 1. 強制讀取高度，觸發父層 Reflow
                void el.offsetHeight;

                // 2. 針對子按鈕進行無損重排
                const tags = el.querySelectorAll('.info-tag-item, .info-capsule, .info-circle, .flight-action-btn');
                tags.forEach(tag => {
                    // 記住該元素當下真正的 inline display 屬性
                    const originalDisplay = tag.style.display;

                    tag.style.display = 'none'; // 瞬間隱藏
                    void tag.offsetHeight;      // 逼迫 GPU 放棄快取
                    tag.style.display = originalDisplay; // 完美還原原本的 display 狀態
                });
            };

            // A. 更新個性化面板
            const customizeCard = document.querySelector('#dynamic-blank-overlay .detail-card-inner');
            if (customizeCard) {
                applyThemeToCard(customizeCard, restoredData.customHex);
                forceRepaint(customizeCard); // 🟢 [呼叫重繪]
            }

            // B. 更新詳情卡片
            const detailCard = document.querySelector('#detail-card-container .detail-card-inner');
            if (detailCard) {
                applyThemeToCard(detailCard, restoredData.customHex);
                forceRepaint(detailCard); // 🟢 [呼叫重繪]
                const detailNameNode = detailCard.querySelector('.line-name');
                if (detailNameNode) detailNameNode.textContent = restoredData.customName;
            }

            // C. 更新底層的主列表卡片
            const mainCard = document.getElementById(`card-${activeCardId}`);
            if (mainCard) {
                applyThemeToCard(mainCard, restoredData.customHex);
                forceRepaint(mainCard); // 🟢 [呼叫重繪]
                const mainNameNode = mainCard.querySelector('.line-name');
                if (mainNameNode) mainNameNode.textContent = restoredData.customName;
            }

            // D. 同步更新顯示的文字與【面板上的自訂按鈕底色】
            const pDisplayName = document.getElementById('p-display-name');
            const pDisplayColor = document.getElementById('p-display-color');
            if (pDisplayName) pDisplayName.textContent = restoredData.customName;

            if (pDisplayColor) {
                pDisplayColor.textContent = restoredData.customHex.toUpperCase();
                // 🟢 [補上遺漏]：如果你面板上有顯示目前顏色的按鈕，除了改文字，背景也要順便改！
            }

            // 🟢 [新增] 1. 強制清除畫面上任何被反白選取的文字
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            // 🟢 [新增] 2. 強制讓目前聚焦的輸入框 (Input) 或按鈕失去焦點，消除外框殘影
            if (document.activeElement) {
                document.activeElement.blur();
            }

            return true;
        }
        return false; // 沒有上一筆紀錄
    } catch (error) {
        console.error("[Undo Engine] 還原失敗:", error);
        return false;
    }
};

// ============================================================================
// 🟢 獨立出資料建構與渲染引擎 (支援斷線強制覆寫 + 多重燈號共存版)
// ============================================================================
function buildAndRender(userPrefs, routeDict, liveStatus, isOffline = false) {
    window.GlobalLiveStatus = liveStatus;
    window.MasterRouteDictionary = routeDict;
    window.appRailwayData = [];

    const baseCards = [...railwayData];

    for (const key in userPrefs) {
        if ((key.startsWith('new-card-') || key.startsWith('custom-')) && !baseCards.find(r => r.id === key)) {
            baseCards.push({
                id: key, name: '新規カード', hex: '#2C2C2E', targetLineIds: [], detail: ['カスタマイズ可能', '-', '-', '-']
            });
        }
    }

    baseCards.forEach(card => {
        const pref = userPrefs[card.id];
        const finalName = pref && pref.customName ? pref.customName : card.name;
        const finalHex = pref && pref.customHex ? pref.customHex : card.hex;
        const finalTargetIds = pref && pref.targetLineIds ? pref.targetLineIds : (card.targetLineIds || []);

        let groupStatusText = "登録路線なし";
        let groupDesc = "路線を追加してください";
        let groupFlags = [false, false, false, false, false, false, false];
        let worstDelay = 0;
        let groupUpdateTime = "";
        const detailedLines = [];

        // ✨ 新增飛機專用旗標與容器
        let isFlightCard = false;
        let flightDataPayload = null;

        // 🟢 攔截器：檢查這張卡片是否為航班
        if (finalTargetIds.length > 0) {
            const testId = finalTargetIds[0];
            // ✨ 2. 【永遠鎖定身分】利用 ID 特徵判斷 (鐵道必有 . 或 :，飛機絕對沒有！)
            const isLikelyFlight = !testId.includes('.') && !testId.includes(':');

            if (isLikelyFlight) {
                isFlightCard = true;
                const flightInfo = window.GlobalFlights ? window.GlobalFlights.find(f => f.fid.includes(testId)) : null;

                if (flightInfo && typeof window.generateFlightDataFormat === 'function') {
                    // 有找到即時資料，正常處理
                    const formatted = window.generateFlightDataFormat(flightInfo, testId);
                    flightDataPayload = formatted.flightData;
                    groupFlags = formatted.flags;
                    groupDesc = formatted.desc;
                    groupUpdateTime = formatted.flightData.updateTime;
                } else {
                    // ⚠️ 找不到航班 (已落地移除或 API 異常)：給予幽靈防護罩，防止跌回火車排版！
                    groupDesc = "フライト情報が終了したか、取得できません";
                    groupFlags = [false, false, false, false, false, false, true]; // 亮灰色注意燈
                    groupUpdateTime = "--:--";
                    flightDataPayload = {
                        id: testId,
                        airline: "航空便",
                        routeHtml: `<span style="font-weight: 800;">${testId}</span>`,
                        scheduled: "--:--",
                        latest: "--:--",
                        updateTime: "--:--",
                        statusText: "情報なし",
                        statusColor: "inherit",
                        statusShadow: "none",
                        delayColor: "inherit",
                        delayShadow: "none",
                        delayText: "",
                        isCancelled: false,
                        type: "Unknown", airport: "-", location: "-", terminal: "-", gate: "-"
                    };
                }
            }
        }

        // 🟢 分流處理：是飛機就不走火車的邏輯
        if (isFlightCard) {
            // 飛機的資料已經在攔截器處理完了，什麼都不用做！
        } else if (finalTargetIds.length > 0) {
            // 🚄 --- 以下是原本火車的迴圈邏輯 (保留不要動) ---
            let hasError = false;
            let hasSevere = false;
            let hasDelay = false;
            let hasAttention = false;
            let hasNormal = false;
            let hasMessageNote = false; // ✨ 新增：追蹤這組卡片是否有具體事故文字

            finalTargetIds.forEach(lineId => {
                const dictInfo = routeDict[lineId] || { name: "未知の路線", company: "不明" };

                let statusInfo = liveStatus[lineId] || {
                    status_type: "更新中...", message: "最新データを取得しています...",
                    delay_minutes: 0, status_text: "データ取得中", update_time: "--:--"
                };

                if (isOffline) {
                    statusInfo = {
                        status_type: "通信エラー",
                        message: "APIサーバーに接続できません。オフライン状態、またはサーバーがメンテナンス中の可能性があります。",
                        delay_minutes: 0,
                        status_text: "接続失敗",
                        update_time: "--:--"
                    };
                }

                const msg = statusInfo.message || "";
                const isNormalMsg = msg.includes("ありません") || msg.includes("平常") || msg.includes("正常") || msg.includes("取得しています");

                // ✨ 只要不是罐頭正常訊息，且有文字內容，就觸發備註燈號！
                if (!isNormalMsg && msg.trim().length > 0) {
                    hasMessageNote = true;
                }

                // 🟢 狀態變數宣告
                let isDelayedLocal = false;
                let isSevereLocal = false;
                let isErrorLocal = false;
                let isAttentionLocal = false;
                let delay = statusInfo.delay_minutes || 0;

                // 判斷是否為「無回報時間，但文字顯示異常/停駛」
                let isTextAbnormal = !isNormalMsg && (statusInfo.status_text.includes("異常") || msg.includes("遅延") || (statusInfo.status_type && statusInfo.status_type.includes("見合わせ")) || (statusInfo.status_type && statusInfo.status_type.includes("運転変更")));

                // 🌟 新版精準燈號判定邏輯
                if (statusInfo.status_type && statusInfo.status_type.includes("エラー")) {
                    isErrorLocal = true; hasError = true;
                } else if (statusInfo.status_type === "監視中" || statusInfo.status_text === "公式発表なし" || statusInfo.status_text === "情報なし" || statusInfo.status_type === "更新中...") {
                    isAttentionLocal = true; hasAttention = true;
                } else if (delay > 0) {
                    // 👉 有具體延遲分鐘數時的判斷：
                    if (delay <= 5) {
                        isDelayedLocal = true; // 讓詳細卡片內保持黃色輕微延誤字眼
                        hasNormal = true;      // ✨ 5分(含)以內：主卡片亮綠燈 (圓形)
                    } else if (delay <= 15) {
                        isDelayedLocal = true;
                        hasDelay = true;       // ✨ 6~15分：主卡片亮紅燈 (三角形)
                    } else {
                        isSevereLocal = true;
                        hasSevere = true;      // ✨ 超過15分：主卡片亮叉叉
                    }
                    if (delay > worstDelay) worstDelay = delay;

                } else if (isTextAbnormal) {
                    isDelayedLocal = true; // ✨ 讓子路線自己也記住處於黃燈警告狀態
                    hasDelay = true; // 🌟 核心降級：沒有具體嚴重分鐘數的公告，一律只亮黃燈
                } else {
                    hasNormal = true;
                }

                // ✨ 時間萃取邏輯
                let timeStr = statusInfo.update_time;
                if (!timeStr || timeStr === "" || timeStr === "--:--") {
                    timeStr = "--:--";
                } else if (timeStr === "----" || timeStr === "本日公式発表なし") {
                    timeStr = "公式発表なし";
                }

                if (groupUpdateTime === "") groupUpdateTime = timeStr;
                if (isDelayedLocal || isSevereLocal || isErrorLocal || isAttentionLocal) groupUpdateTime = timeStr;

                detailedLines.push({
                    id: lineId, name: dictInfo.name, company: dictInfo.company,
                    status: statusInfo.status_type || "情報なし", message: msg,
                    delay: delay, updateTime: timeStr, url: statusInfo.url || dictInfo.url || "",

                    // 將 Severe 狀態視為 Delayed 傳給詳細卡片，確保它顯示醒目的紅色
                    isDelayed: isDelayedLocal || isSevereLocal,
                    isError: isErrorLocal, isAttention: isAttentionLocal,
                    advancedDetails: statusInfo.advanced_details || []
                });
            });

            // 🟢 多重燈號共存寫入陣列
            if (hasError || hasSevere) groupFlags[3] = true; // 第4顆：打叉 ❌ (系統錯誤 或 嚴重延誤停駛)
            if (hasDelay) groupFlags[4] = true; // 第5顆：三角形 ⚠️ (6~15分延誤)
            if (hasNormal) groupFlags[5] = true; // 第6顆：圓形 🟢 (0~5分正常)
            if (hasAttention || hasMessageNote) groupFlags[6] = true; // ✨ ❕ (監視中，或是官方發布了具體的事故/延誤原因！)

            // ✨ 智慧文字描述生成 (依照嚴重程度給予精準說明)
            if (isOffline) {
                groupDesc = "サーバーとの通信に失敗しました。ネットワークを確認してください。";
            } else if (hasError) {
                groupDesc = "一部の路線の情報を取得できません。";
            } else if (hasSevere) {
                groupDesc = "一部の路線で大幅な遅延、または運転見合わせが発生しています。"; // ✨ 新增：嚴重延誤說明
            } else if (hasDelay) {
                groupDesc = "一部の路線で遅延やダイヤ乱れが発生しています。";
            } else if (hasNormal && hasAttention && !hasError && !hasSevere && !hasDelay) {
                groupDesc = "一部の路線は平常運転、その他は情報確認中です。";
            } else if (hasAttention && !hasNormal && !hasError && !hasSevere && !hasDelay) {
                groupDesc = "現在監視中、または公式情報がありません。";
            } else if (hasNormal && !hasError && !hasSevere && !hasDelay && !hasAttention) {
                groupDesc = "すべての路線は平常通り運転しています。";
            }

        } else {
            groupDesc = card.desc || groupDesc;
            groupFlags = card.statusFlags || groupFlags;
        }

        window.appRailwayData.push({
            id: card.id, name: finalName, hex: finalHex, desc: groupDesc,
            statusFlags: groupFlags, targetLineIds: finalTargetIds, detailedLines: detailedLines,
            isCustom: card.id.startsWith('new-card-'), detail: card.detail || ['情報なし', '-', '-', '-'],
            updateTime: groupUpdateTime,
            // ✨ 救命關鍵：把這兩行補上，卡片才不會忘記自己是飛機！
            isFlightCard: isFlightCard,
            flightData: flightDataPayload
        });
    });

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

    let hiddenIds = [];
    try { hiddenIds = JSON.parse(localStorage.getItem('TsukinKanban_HiddenCards') || '[]'); } catch (e) { }
    const visibleData = window.appRailwayData.filter(r => !hiddenIds.includes(r.id));

    renderCards(visibleData);
    initBottomCard();
    initDismissIcon();
}

// ============================================================================
// 🟢 系統啟動引擎 (秒開快取 + 背景非同步更新 API 版 + 斷線捕捉)
// ============================================================================
async function initApp() {
    // ✨ 1. 【啟動優先權】在系統開始繪圖前，先從快取喚醒飛機記憶！
    try {
        const cachedFlights = localStorage.getItem('Tsukin_Cached_Flights');
        if (cachedFlights) window.GlobalFlights = JSON.parse(cachedFlights);
    } catch (e) { }

    let userPrefs = {};
    let cachedDict = {};
    let cachedLiveStatus = {};

    try {
        // 1. 取得使用者設定與快取
        userPrefs = await getAllUserPreferences();
        try {
            cachedDict = JSON.parse(localStorage.getItem('Tsukin_Cached_Dict') || '{}');
            cachedLiveStatus = JSON.parse(localStorage.getItem('Tsukin_Cached_Status') || '{}');
        } catch (e) { }

        // ⚡️ 2. 瞬間渲染！(不傳入舊狀態，強制將所有燈號重置為「更新中...」)
        buildAndRender(userPrefs, cachedDict, {}, false);

        // 3. 背景非同步抓取最新資料
        console.log("📡 背景正在獲取最新運行狀態...");
        const DICTIONARY_API_URL = 'https://tsukinkanban-odpt.onrender.com/api/dictionary';

        // ✨ 這裡也加上相同的快取破壞者！
        const timestamp = new Date().getTime();
        const STATUS_API_URL = `https://tsukinkanban-odpt.onrender.com/api/status?t=${timestamp}`;

        const [routeDict, statusRes] = await Promise.all([
            syncAndLoadDictionary(DICTIONARY_API_URL).catch(() => null),
            fetch(STATUS_API_URL, { cache: 'no-store' }).catch(() => null) // 防止網路全斷時炸毀
        ]);

        // 🚨 4. 判斷 API 是否活著
        if (statusRes && statusRes.ok) {
            const liveStatus = await statusRes.json();

            localStorage.setItem('Tsukin_Cached_Dict', JSON.stringify(routeDict || cachedDict));
            localStorage.setItem('Tsukin_Cached_Status', JSON.stringify(liveStatus));

            console.log("✅ 最新狀態獲取成功，更新畫面！");

            // 🟢 [新增嚴格防護網]：判斷 API 是否真的有吐出路線資料？
            const hasValidData = liveStatus && Object.keys(liveStatus).length > 0 && !liveStatus.error;

            if (hasValidData) {
                // ✨ 擷取伺服器給的絕對時間
                const serverTimeStr = liveStatus._meta ? liveStatus._meta.server_time : null;
                const syncDate = serverTimeStr ? new Date(serverTimeStr) : new Date();

                // 只有確實拿到資料，才准許更新左上角的 JST 時間
                if (typeof window.updateSystemSyncTime === 'function') {
                    window.updateSystemSyncTime(syncDate);
                }
            } else {
                console.log("⚠️ [系統啟動] 偵測到 API 啟動中或無有效資料，維持顯示最後一次成功的快取時間！");
            }

            buildAndRender(userPrefs, routeDict || cachedDict, liveStatus, false);
        } else {
            // 🚨 API 伺服器回傳 500、502，或是休眠叫不醒
            console.warn("⚠️ 狀態 API 伺服器無回應，強制切換至斷線異常狀態");
            // 🛑 丟棄舊資料，強制觸發斷線狀態
            buildAndRender(userPrefs, cachedDict, {}, true);
        }

    } catch (error) {
        // 🚨 發生無法預期的底層錯誤 (如 DNS 解析失敗、網路完全斷開)
        console.error("系統遭遇嚴重連線錯誤:", error);
        // 🛑 丟棄舊資料，不拿過期的綠燈騙使用者
        buildAndRender(userPrefs, cachedDict, {}, true);
    }
    initFlights();
}

// 因為 script type="module" 會延遲執行，這裡可以直接呼叫啟動
initApp();

document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

// 將模組內的函數暴露給全域
window.handleBottomCardClick = handleBottomCardClick;
window.handleOverlayClick = handleOverlayClick;
window.renderMainCards = renderCards;
window.handleCardClick = handleCardClick; // ✨ 開放主引擎給飛機幽靈卡片呼叫

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
// 🟢 搜尋框「智慧寬容輸入與自動分段」引擎 (支援 IME 輸入法防干擾版)
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    let isComposing = false;

    // 🟢 1. 監聽輸入法拼字開始 (例如剛打下第一個羅馬拼音字母)
    searchInput.addEventListener('compositionstart', () => {
        isComposing = true;
    });

    // 🟢 2. 監聽輸入法拼字結束 (使用者選好漢字，或按下 Enter)
    searchInput.addEventListener('compositionend', function () {
        isComposing = false;
        // 拼字結束後，才手動觸發一次我們的過濾與格式化！
        formatSearchInput.call(this);

        // 觸發實際的搜尋連動
        this.dispatchEvent(new Event('input'));
    });

    // 🟢 3. 攔截原生的 input 事件
    searchInput.addEventListener('input', function (e) {
        // ✨ 核心修復：如果正在用羅馬拼音組合日文，這時候絕對不去改它的值，直接放行！
        if (isComposing) return;

        // 如果是正常打英文/數字，或已經拼完字了，才進行過濾
        formatSearchInput.call(this);
    });

    // 將原本的過濾邏輯獨立抽成一個函數
    function formatSearchInput() {
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

        // 5. 符號防呆處理
        val = val.replace(/-+/g, '-');
        val = val.replace(/、+/g, '、');
        val = val.replace(/-、/g, '、');
        val = val.replace(/、-/g, '、');
        val = val.replace(/^[、-]+/, '');

        // 6. 核心智慧分段邏輯
        let finalVal = '';
        let hasDash = false;

        for (let char of val) {
            if (char === '、') {
                hasDash = false;
                finalVal += char;
            } else if (char === '-') {
                if (!hasDash) {
                    hasDash = true;
                    finalVal += char;
                } else {
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
            const lengthDiff = val.length - originalLength;
            const newCursorPos = Math.max(0, originalStart + lengthDiff);
            this.setSelectionRange(newCursorPos, newCursorPos);
        }
    }
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

// ============================================================================
// 🟢 時鐘膠囊連動：背景靜默更新引擎 (無干擾極致版)
// ============================================================================
window.triggerBackgroundUpdate = async function () {
    // 判斷是否「停留在首頁且閒置」：沒有展開卡片、沒打開選單、沒打開搜尋
    const isIdleOnMainPage = !window.activeCardId &&
        !document.body.classList.contains('menu-open') &&
        !document.body.classList.contains('search-active');

    try {
        console.log("⏱️ 時鐘膠囊收縮：觸發背景 API 靜默更新...");

        const timestamp = new Date().getTime();
        const STATUS_API_URL = `https://tsukinkanban-odpt.onrender.com/api/status?t=${timestamp}`;
        const FLIGHTS_API_URL = `https://tsukinkanban-odpt.onrender.com/api/flights?t=${timestamp}`; // ✨ 加入航班 API

        // ✨ 同時發送火車與飛機的請求
        const [statusRes, flightRes] = await Promise.all([
            fetch(STATUS_API_URL, { cache: 'no-store' }).catch(() => null),
            fetch(FLIGHTS_API_URL, { cache: 'no-store' }).catch(() => null)
        ]);

        if (!statusRes || !statusRes.ok) return;

        // ✨ 如果飛機更新成功，更新全域變數與快取
        if (flightRes && flightRes.ok) {
            const flightsData = await flightRes.json();
            if (Array.isArray(flightsData)) {
                window.GlobalFlights = flightsData;
                localStorage.setItem('Tsukin_Cached_Flights', JSON.stringify(flightsData));
            }
        }

        const liveStatus = await statusRes.json();
        if (liveStatus.error) return;

        // 🟢 [新增嚴格防護網]：判斷 API 是否真的有吐出路線資料？
        // 如果是剛甦醒的狀態，它通常會回傳空物件 {}
        const hasValidData = liveStatus && Object.keys(liveStatus).length > 0 && !liveStatus.error;

        if (hasValidData) {
            // ✨ 擷取伺服器給的絕對時間，如果後端沒給，才退回使用手機時間當備案
            const serverTimeStr = liveStatus._meta ? liveStatus._meta.server_time : null;
            const syncDate = serverTimeStr ? new Date(serverTimeStr) : new Date();

            // 只有確實拿到資料，才准許更新左上角的 JST 時間
            if (typeof window.updateSystemSyncTime === 'function') {
                window.updateSystemSyncTime(syncDate);
            }
        } else {
            console.log("⚠️ [背景同步] 偵測到 API 啟動中或無有效資料，拒絕更新左上角時間！");
        }

        // 取得最新資料成功，準備無縫重繪
        const cachedDict = JSON.parse(localStorage.getItem('Tsukin_Cached_Dict') || '{}');
        const userPrefs = await getAllUserPreferences();
        localStorage.setItem('Tsukin_Cached_Status', JSON.stringify(liveStatus));

        // 1. 永遠默默更新底層資料與主畫面卡片 (我們之前寫的局部更新引擎，保證不閃爍)
        buildAndRender(userPrefs, cachedDict, liveStatus, false);

        // 2. ✨ 終極無干擾處理：如果使用者正在操作其他介面，我們只偷偷換掉裡面的字！
        if (window.activeCardId) {
            // 偷偷重繪實心玻璃面板，且記住滾動位置不亂跳
            silentUpdateExtensionPanel(window.activeCardId);
        }

        if (document.body.classList.contains('search-active')) {
            // 偷偷重新觸發搜尋，讓下拉選單的延誤分鐘數瞬間更新
            const searchInput = document.getElementById('route-search');
            if (searchInput) searchInput.dispatchEvent(new Event('input'));
        }

        // 3. ✨ 只有在首頁閒置時，才觸發華麗的漣漪進場動畫
        if (isIdleOnMainPage) {
            const mainStack = document.getElementById('main-stack');

            // 🚨 核心防護 1：動畫期間暫時鎖住 JS 物理光影引擎，並關閉 Hover 避免打架
            mainStack.classList.add('just-awoke');
            mainStack.dataset.freezeGlare = 'true';
            mainStack.classList.remove('allow-hover');

            const cards = Array.from(document.querySelectorAll('.card'));
            cards.forEach((c, index) => {
                c.classList.remove('opening-pull');
                void c.offsetWidth; // 強制重繪
                c.style.animationDelay = `${(cards.length - index) * 0.08}s`;
                c.classList.add('opening-pull');
            });

            const fixedCard = document.getElementById('fixed-info-card');
            if (fixedCard) {
                fixedCard.classList.remove('opening-pull-fixed');
                void fixedCard.offsetWidth;
                fixedCard.classList.add('opening-pull-fixed');
            }

            // 🚨 核心防護 2：1.5 秒動畫結束後，拔除 CSS 動畫標籤，並重新解鎖互動！
            setTimeout(() => {
                cards.forEach(c => {
                    c.classList.remove('opening-pull'); // 拔掉動畫標籤，歸還控制權
                    c.style.animationDelay = '';
                });
                if (fixedCard) {
                    fixedCard.classList.remove('opening-pull-fixed');
                }

                mainStack.dataset.freezeGlare = 'false'; // 解鎖物理光影引擎

                // 重新綁定滑鼠移動解鎖 hover (完美復刻初次載入時的防呆機制)
                window.addEventListener('mousemove', function unlockHover() {
                    if (!mainStack.classList.contains('allow-hover')) {
                        mainStack.classList.add('allow-hover');
                    }
                    window.removeEventListener('mousemove', unlockHover);
                }, { once: true });

            }, 1500);

            // 移除剛甦醒的狀態標籤
            setTimeout(() => {
                mainStack.classList.remove('just-awoke');
            }, 2000);
        }

    } catch (error) {
        console.error("背景更新時發生未預期錯誤:", error);
    }
};

// ============================================================================
// 🟢 專為實心玻璃面板打造的「無縫抽換引擎」
// ============================================================================
function silentUpdateExtensionPanel(cardId) {
    const extension = document.getElementById('card-extension-container');
    if (!extension) return;

    const data = window.appRailwayData.find(r => r.id === cardId);
    if (!data) return;

    // ✨ 3. 【神級防護盾】如果是飛機卡片，嚴禁使用火車的更新邏輯去清空它！
    if (data.isFlightCard) return;

    const currentScroll = extension.scrollTop;

    // 1. ✨ 安全清除：只移除舊的「路線卡片」與「空狀態」，絕對不碰操作按鈕！
    Array.from(extension.children).forEach(child => {
        if (child.classList.contains('extension-route-card') ||
            (child.style.backdropFilter && child.style.backdropFilter.includes('blur(25px)'))) {
            child.remove();
        }
    });

    // 2. 找到原本的按鈕區塊 (作為插入新卡片的定位點)
    const actionBtnContainer = Array.from(extension.querySelectorAll('.flight-action-buttons-container')).find(c => !c.innerHTML.includes('保存'));

    const fragment = document.createDocumentFragment();

    // 3. 生成新卡片 (原本的邏輯)
    if (data.detailedLines && data.detailedLines.length > 0) {
        data.detailedLines.forEach(line => {
            let statusClass = 'status-normal';
            if (line.isError) statusClass = 'status-error';
            else if (line.isAttention) statusClass = 'status-attention';
            else if (line.isDelayed) {
                if (line.delay > 15) {
                    statusClass = 'status-delayed';
                } else {
                    statusClass = 'status-delayed-minor';
                }
            }

            const row = document.createElement('div');
            row.className = 'extension-route-card';

            let advancedHtml = '';
            if (line.advancedDetails && line.advancedDetails.length > 0) {
                advancedHtml = `
                    <div class="adv-details-container">
                        ${line.advancedDetails.map(adv => {
                    let dirDelayHtml = `<span class="adv-normal-text">平常</span>`;
                    if (adv.max_delay > 0) {
                        if (adv.max_delay <= 5) dirDelayHtml = `<span class="adv-delay-minor-text">${adv.max_delay}分遅れ</span>`;
                        else dirDelayHtml = `<span class="adv-delay-text">${adv.max_delay}分遅れ</span>`;
                    }
                    const trainCountHtml = adv.train_count > 0 ? `<span class="adv-train-count">(${adv.train_count}列車)</span>` : '';
                    return `
                                <div class="adv-detail-capsule">
                                    <span class="adv-dir-name">${adv.direction_name}</span>
                                    <div class="adv-status-group">${trainCountHtml}${dirDelayHtml}</div>
                                </div>
                            `;
                }).join('')}
                    </div>
                `;
            }

            row.innerHTML = `
                <div class="ext-card-header">
                    <div class="ext-card-title-group">
                        <div class="ext-route-name">${line.name}</div>
                        <div class="ext-route-company">${line.company}</div>
                    </div>
                    <div class="ext-status-badge ${statusClass}">
                        ${line.status}
                    </div>
                </div>
                <div class="ext-card-divider"></div>
                <div class="ext-card-message">${line.message}</div>
                ${advancedHtml}
                <div class="ext-card-footer">
                    <span class="ext-update-time">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        更新: ${line.updateTime}
                    </span>
                </div>
            `;
            fragment.appendChild(row);
        });
    } else {
        // 如果刪到一條不剩，補回空狀態
        const emptyState = document.createElement('div');
        emptyState.style.cssText = 'background: rgba(30, 30, 32, 0.65); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px 20px; text-align: center; color: var(--text-secondary); box-shadow: 0 8px 24px rgba(0,0,0,0.15);';
        emptyState.innerHTML = `
            <div style="opacity: 0.6; margin-bottom: 12px; display: flex; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div style="font-size: 1.05em; font-weight: 800; color: #fff;">追跡している路線はありません</div>
            <div style="font-size: 0.85em; margin-top: 8px; opacity: 0.7;">右上の「＋」から路線を追加してください</div>
        `;
        fragment.appendChild(emptyState);
    }

    // 4. 精準插入新卡片到按鈕上方
    if (actionBtnContainer) {
        extension.insertBefore(fragment, actionBtnContainer);
    } else {
        extension.appendChild(fragment);
    }

    extension.scrollTop = currentScroll;
}

// ============================================================================
// 🟢 桌面版鍵盤快捷鍵：方向鍵關閉卡片 & 首頁卡片焦點選擇 (狀態機徹底修復版)
// ============================================================================
let keyboardFocusIndex = -1;

window.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement;
    const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

    // ✨ 核心抓蟲 1：移除 window. 前綴，直接讀取 isAnimating
    if (isTyping || isAnimating) return;

    // ✨ 核心抓蟲 2：移除 window. 前綴，直接讀取 activeCardId
    // 👉 防呆機制：已經有卡片打開時的狀態機
    if (activeCardId) {
        if (e.key === 'ArrowDown') {
            // 如果有打開二級面板(如設定、新增)，則不觸發關閉卡片
            if (document.getElementById('dynamic-blank-overlay') || document.getElementById('dynamic-info-overlay')) return;
            e.preventDefault();
            closeAllCards(true);
        }
        // 🛑 超級護城河：只要有卡片打開，不管按 Enter 還是上下鍵，全部在這裡被強制攔截！
        return;
    }

    const cards = Array.from(document.querySelectorAll('#main-stack .card:not(.hidden-placeholder), #fixed-info-card'));
    if (cards.length === 0) return;

    // 鍵盤奪權：啟動滑鼠封印力場
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        document.body.classList.add('keyboard-active');
    }

    // 無限輪迴引擎
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (keyboardFocusIndex === -1) {
            keyboardFocusIndex = 0;
        } else {
            keyboardFocusIndex = (keyboardFocusIndex + 1) % cards.length;
        }
        updateKeyboardFocus(cards);
    }
    else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (keyboardFocusIndex === -1) {
            keyboardFocusIndex = cards.length - 1;
        } else {
            keyboardFocusIndex = (keyboardFocusIndex - 1 + cards.length) % cards.length;
        }
        updateKeyboardFocus(cards);
    }
    else if (e.key === 'Enter') {
        if (keyboardFocusIndex >= 0 && keyboardFocusIndex < cards.length) {
            e.preventDefault();
            cards[keyboardFocusIndex].click();
        }
    }
    else if (e.key === 'Escape') {
        resetFocus(); // 按 ESC 直接放棄控制權
    }
});

// 後面的 updateKeyboardFocus 與 resetFocus 維持不變...
function updateKeyboardFocus(cards) {
    cards.forEach((card, index) => {
        if (index === keyboardFocusIndex) {
            card.classList.add('keyboard-focus');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            card.classList.remove('keyboard-focus');
        }
    });
}

const resetFocus = () => {
    if (keyboardFocusIndex !== -1 || document.body.classList.contains('keyboard-active')) {
        keyboardFocusIndex = -1;
        document.body.classList.remove('keyboard-active');
        document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
    }
};

window.addEventListener('mousedown', resetFocus);
window.addEventListener('touchstart', resetFocus, { passive: true });
window.addEventListener('mousemove', (e) => {
    if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
        resetFocus();
    }
});

window.refreshAppAfterEdit = async function () {
    try {
        console.log("🔄 路線編輯完成，正在重繪畫面...");
        const userPrefs = await getAllUserPreferences();
        const cachedDict = JSON.parse(localStorage.getItem('Tsukin_Cached_Dict') || '{}');
        const cachedLiveStatus = JSON.parse(localStorage.getItem('Tsukin_Cached_Status') || '{}');

        buildAndRender(userPrefs, cachedDict, cachedLiveStatus, false);

        // 🚨 修正：拔除 window. 前綴
        if (activeCardId) {
            silentUpdateExtensionPanel(activeCardId);
        }
    } catch (err) {
        console.error("重繪畫面失敗:", err);
    }
};