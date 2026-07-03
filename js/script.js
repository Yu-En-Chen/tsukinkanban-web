// script.js - 主 UI 邏輯與狀態控制

// 在 DOM 渲染前同步讀取設定並套用，避免畫面閃爍
try {
    // 1. 系統游標
    if (localStorage.getItem('tsukin_setting_useSystemCursor') === 'true') {
        document.body.classList.add('use-system-cursor');
    }
    // 2. 描畫模式：預設為 'performance'
    const savedRenderMode = localStorage.getItem('tsukin_setting_renderMode') || 'performance';
    document.body.classList.add(`render-mode-${savedRenderMode}`);
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

// 全域變數：整個 App 渲染、搜尋、點擊的唯一資料來源
window.appRailwayData = [];

// 七燈號 SVG 生成（預設全部為 false 暗燈）
window.getStatusIconsHTML = function (activeFlags = [false, false, false, false, false, false, false]) {
    // 索引對應：0:地震, 1:雨風, 2:雪, 3:打叉, 4:三角形, 5:圓形, 6:注意
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

// ==========================================
// 1. 系統環境判定與效能模式 (Lite Mode) 初始化
// ==========================================
const ua = navigator.userAgent;

// 判定蘋果裝置 (Mac, iOS)，涵蓋 iPadOS 桌面模式
const isAppleDevice = /Macintosh|iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// 讀取使用者設定
let savedLiteMode = localStorage.getItem('tsukin_lite_mode');

if (!isAppleDevice) {
    // 非蘋果裝置 (Android, Windows)：強制輕量模式
    localStorage.setItem('tsukin_lite_mode', 'true');
    document.documentElement.classList.add('is-android-fallback');
} else {
    // 蘋果裝置：可自由切換，未設定時預設為品質模式
    if (savedLiteMode === 'true') {
        document.documentElement.classList.add('is-android-fallback');
    } else {
        document.documentElement.classList.remove('is-android-fallback');
    }
}

// Windows 偵測：字體渲染優化與載入 Noto Sans JP
if (/Windows/i.test(ua)) {
    document.documentElement.classList.add('is-windows-rendering');

    // 動態載入 Google Fonts（不影響 iOS/Android）
    // preconnect 加速 DNS 解析
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect'; preconnect1.href = 'https://fonts.googleapis.com';
    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect'; preconnect2.href = 'https://fonts.gstatic.com'; preconnect2.crossOrigin = 'anonymous';

    // 載入 Noto Sans JP (400/500/600/700)
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap';

    document.head.appendChild(preconnect1);
    document.head.appendChild(preconnect2);
    document.head.appendChild(fontLink);
}

// 狀態旗標
let isInitialLoad = true;
let isAnimating = false;
let liftTimer = null;
let activeCardId = null;

// ============================================================================
// 卡片色彩計算 (Adaptive UI)
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
    const isLight = luminance > 0.62;

    // 漸層幅度分配（含極端純黑/純白處理）
    let topShift = 17;
    let bottomShift = 17;
    // 預設全透明，平時不影響卡片
    let fullWrapBorder = 'transparent';

    if (hsl.l > 95) {
        // 1. 極淺色：亮部無法再亮，改加深暗部呈現漸層
        topShift = 0;
        bottomShift = 35;
        // 純白：加上極細灰色邊框，避免融入白底
        fullWrapBorder = 'rgba(0, 0, 0, 0.08)';
    } else if (hsl.l > 60) {
        // 2. 鮮豔亮色：減少亮部加成避免褪色，暗部微加深
        topShift = 4;
        bottomShift = 14;
    } else if (hsl.l < 5) {
        // 3. 極暗色：暗部無法再暗，改提亮亮部呈現反光
        topShift = 26;
        bottomShift = 0;
        // 純黑：加上極細白光邊框，避免融入黑底
        fullWrapBorder = 'rgba(255, 255, 255, 0.12)';
    } else if (hsl.l < 40) {
        // 4. 一般深色：增加亮部呈現光澤，減少暗部避免全黑
        topShift = 14;
        bottomShift = 4;
    }
    // 依卡片亮度 (luminance) 決定高光強度
    let rimGlareAlpha = 0.6;
    if (luminance > 0.6) {
        rimGlareAlpha = 1.0;  // 淺色系：需要全白不透明
    } else if (luminance > 0.3) {
        rimGlareAlpha = 0.85; // 中等亮度
    } else if (luminance > 0.1) {
        rimGlareAlpha = 0.65; // 偏暗色
    } else {
        rimGlareAlpha = 0.45; // 極暗色：收斂白光維持質感
    }
    let rimGlareStart = `rgba(255, 255, 255, ${rimGlareAlpha})`;


    const lTop = Math.min(100, hsl.l + topShift);
    const lBottom = Math.max(0, hsl.l - bottomShift);

    const gradient = opacity < 1
        ? `linear-gradient(135deg, hsla(${hsl.h}, ${hsl.s}%, ${lTop}%, ${opacity}), hsla(${hsl.h}, ${hsl.s}%, ${lBottom}%, ${opacity}))`
        : `linear-gradient(135deg, hsl(${hsl.h}, ${hsl.s}%, ${lTop}%), hsl(${hsl.h}, ${hsl.s}%, ${lBottom}%))`;

    // 光影變數：glareColor (反光色), innerGlow (微光層)
    let textColor, textSecondary, borderColor, tagBg, textShadow;
    let textBgGradientSecondary, textBgGradientTag, textClip, textFill;
    let glareColor, innerGlow;

    if (isLight) {
        // 飽和度降至 25 避免濁色，亮度壓至 25 提高對比
        const textS = hsl.s > 5 ? 25 : 0;
        const textL = 25;

        textColor = `hsl(${hsl.h}, ${textS}%, ${textL}%)`;
        textSecondary = `hsl(${hsl.h}, ${textS}%, ${textL + 25}%)`;
        borderColor = `hsla(${hsl.h}, ${textS}%, ${textL}%, 0.25)`;
        tagBg = `hsla(${hsl.h}, ${textS}%, ${textL}%, 0.10)`;
        textShadow = `0 1px 1px hsla(0, 0%, 100%, 0.3)`; // 白光陰影

        const textLTop = textL;
        const textLBottom = Math.max(0, textL - 10);
        textBgGradientSecondary = `linear-gradient(135deg, hsl(${hsl.h}, ${textS}%, ${textLTop + 15}%), hsl(${hsl.h}, ${textS}%, ${textLBottom + 15}%))`;

        textBgGradientTag = 'none';
        textClip = 'text';
        textFill = 'transparent';

        // 淺色卡的邊緣反光維持白光
        glareColor = `hsla(0, 0%, 100%, 0.45)`;
        innerGlow = `inset 0 1px 1px hsla(0, 0%, 100%, 0.5)`;
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

        // 深色卡片的光影：
        // 1. 反光帶有卡片色相 (Hue) 的高亮度色彩 (L=85%)
        // 2. 上邊緣加一道極細的同色系高光，模擬玻璃厚度
        const glareS = hsl.s < 5 ? 0 : Math.max(30, hsl.s);
        const glowS = hsl.s < 5 ? 0 : Math.max(50, hsl.s);

        glareColor = `hsla(${hsl.h}, ${glareS}%, 85%, 0.35)`;
        innerGlow = `inset 0 1px 1px hsla(${hsl.h}, ${glowS}%, 88%, 0.35)`;
    }

    return {
        gradient, textColor, textSecondary, borderColor, tagBg, textShadow,
        textBgGradientSecondary, textBgGradientTag, textClip, textFill,
        glareColor, innerGlow, fullWrapBorder, rimGlareStart
    };
}

// 主題套用：獨立渲染每張卡片，互不干擾
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

    // 注入詳細文字用的漸層變數
    cardElement.style.setProperty('--text-bg-gradient-secondary', theme.textBgGradientSecondary, 'important');
    cardElement.style.setProperty('--text-clip', theme.textClip, 'important');
    cardElement.style.setProperty('--text-fill', theme.textFill, 'important');
    // 注入光影變數
    cardElement.style.setProperty('--dynamic-glare', theme.glareColor, 'important');
    cardElement.style.setProperty('--dynamic-inner-glow', theme.innerGlow, 'important');

    // 注入全包覆邊框
    cardElement.style.setProperty('--rim-glare-start', theme.rimGlareStart, 'important');
    cardElement.style.setProperty('--full-wrap-border', theme.fullWrapBorder, 'important');
}
// ============================================================================

const mainStack = document.getElementById('main-stack');
const detailOverlay = document.getElementById('detail-overlay');
const detailContainer = document.getElementById('detail-card-container');

// ============================================================================
// 長按進入滑動掃描 (Scrubbing) 模式
// ============================================================================
let scanTimer = null;
let isScrubbingMode = false;
let currentScrubCard = null;
let startTouchY = 0;
// 震動冷卻鎖
let lastVibrateTime = 0;

mainStack.addEventListener('touchstart', (e) => {
    // 1. 拖曳中或回彈動畫未結束時，禁止進入長按掃描
    if (isAnimating ||
        mainStack.classList.contains('dragging') ||
        mainStack.classList.contains('bounce-back') ||
        mainStack.classList.contains('bounce-back-wheel') ||
        activeCardId) {
        return;
    }

    // 點擊目標不是卡片時忽略
    const targetCard = e.target.closest('.card');
    if (!targetCard) return;

    startTouchY = e.touches[0].pageY;
    isScrubbingMode = false;
    currentScrubCard = null;

    // 400ms 長按判定計時器
    scanTimer = setTimeout(() => {
        isScrubbingMode = true;
        // 跨檔案通訊：標記掃描模式，讓 physics.js 暫停
        mainStack.dataset.isScrubbing = 'true';
        currentScrubCard = targetCard;
        currentScrubCard.classList.add('touch-lifted');

        // 暫停 hover，避免 Android 瀏覽器的殘影 hover
        mainStack.classList.remove('allow-hover');

        // 鎖定卡片堆滾動，避免與掃描手勢衝突
        mainStack.style.touchAction = 'none';

        if (window.navigator.vibrate) window.navigator.vibrate(15);
    }, 400);
}, { passive: true });

mainStack.addEventListener('touchmove', (e) => {
    // 1. 尚未進入掃描模式：
    if (!isScrubbingMode) {
        // 滑動超過 10px 視為捲動意圖，取消長按判定
        if (Math.abs(e.touches[0].pageY - startTouchY) > 10) {
            clearTimeout(scanTimer);
            scanTimer = null;
        }
        return;
    }

    // 2. 已進入掃描模式：
    // touchAction='none' 下需阻止預設捲動，改用 elementFromPoint 偵測手指下的元素
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    // elementFromPoint 找出手指座標下的元素
    const elemUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);

    if (elemUnderFinger) {
        const hoveredCard = elemUnderFinger.closest('.card');

        // 手指滑到新卡片時
        if (hoveredCard && hoveredCard !== currentScrubCard) {
            // 放下舊卡片
            if (currentScrubCard) currentScrubCard.classList.remove('touch-lifted');

            // 抬起新卡片
            currentScrubCard = hoveredCard;
            currentScrubCard.classList.add('touch-lifted');

            // 震動需 20ms 以上，Android 硬體才有反應
            if (window.navigator.vibrate) window.navigator.vibrate(20);
        }
        // 手指滑到無卡片的區域時
        else if (!hoveredCard && currentScrubCard) {
            currentScrubCard.classList.remove('touch-lifted');
            currentScrubCard = null;
        }
    }
}, { passive: false }); // 必須為 false 才能以 preventDefault 阻止捲動
mainStack.addEventListener('touchmove', (e) => {
    // 1. 尚未進入掃描模式：
    if (!isScrubbingMode) {
        // 滑動超過 10px 視為捲動意圖，取消長按判定
        if (Math.abs(e.touches[0].pageY - startTouchY) > 10) {
            clearTimeout(scanTimer);
            scanTimer = null;
        }
        return;
    }

    // 2. 已進入掃描模式：
    // touchAction='none' 下需阻止預設捲動，改用 elementFromPoint 偵測手指下的元素
    if (e.cancelable) e.preventDefault();

    const touch = e.touches[0];
    // elementFromPoint 找出手指座標下的元素
    const elemUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);

    if (elemUnderFinger) {
        const hoveredCard = elemUnderFinger.closest('.card');

        // 手指滑到新卡片時
        if (hoveredCard && hoveredCard !== currentScrubCard) {
            // 放下舊卡片
            if (currentScrubCard) currentScrubCard.classList.remove('touch-lifted');

            // 抬起新卡片
            currentScrubCard = hoveredCard;
            currentScrubCard.classList.add('touch-lifted');
            if (window.navigator.vibrate) window.navigator.vibrate(20); // 換卡片時震動提示
            // 震動 20ms 搭配 50ms 冷卻，確保 Android 有回饋
            const now = Date.now();
            if (window.navigator.vibrate && (now - lastVibrateTime > 50)) {
                window.navigator.vibrate(20);
                lastVibrateTime = now;
            }
        }
        // 手指滑到無卡片的區域時
        else if (!hoveredCard && currentScrubCard) {
            currentScrubCard.classList.remove('touch-lifted');
            currentScrubCard = null;
        }
    }
}, { passive: false }); // 必須為 false 才能以 preventDefault 阻止捲動

mainStack.addEventListener('touchend', endScrubbing);
mainStack.addEventListener('touchcancel', endScrubbing);

function endScrubbing() {
    clearTimeout(scanTimer);
    scanTimer = null;

    if (isScrubbingMode) {
        isScrubbingMode = false;

        // 跨檔案通訊：解除標記，恢復 physics.js
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

// 啟動滑動物理效果
const physicsEngine = initPhysics(
    mainStack,
    () => activeCardId,
    () => closeAllCards(false)
);

// 啟動 Header 模組
initHeader(filterCards, () => activeCardId);

// 啟動個人化設定彈窗模組
initPersonalization(applyThemeToCard, () => activeCardId);

// 點擊空白處關閉卡片
mainStack.addEventListener('click', (e) => {
    if (activeCardId && e.target === mainStack) closeAllCards(false);
});

// ============================================================================
// 局部渲染：更新資料時保留 CSS 動畫與 DOM 狀態
// ============================================================================
function renderCards(data) {
    if (data.length === 0) {
        // 加上 empty-state-msg class 以便辨識
        mainStack.innerHTML = '<p class="empty-state-msg" style="text-align:center; padding:40px; color:#666;">該当する駅・路線が見つかりません</p>';
        return;
    }

    // 只移除空狀態訊息，不動畫面上既有的卡片
    const emptyMsg = mainStack.querySelector('.empty-state-msg');
    if (emptyMsg) {
        emptyMsg.remove();
    } else if (mainStack.children.length === 1 && mainStack.firstElementChild.tagName === 'P') {
        // 相容舊版未加 class 的情況
        mainStack.innerHTML = '';
    }

    const template = document.getElementById('railway-card-template');

    // 記錄本次的合法卡片 ID，最後清理已刪除的卡片
    const currentValidIds = data.map(line => `card-${line.id}`);

    data.forEach((line, index) => {
        // 比對卡片 DOM 是否已存在
        let card = document.getElementById(`card-${line.id}`);
        let isNewCard = false;

        if (!card) {
            // A. 不存在（初次載入或新增）時才建立新節點
            isNewCard = true;
            const clone = template.content.cloneNode(true);
            card = clone.querySelector('.card');
            card.id = `card-${line.id}`;

            // 綁定點擊事件
            card.onclick = () => handleCardClick(line.id);

            // 只有新建立的卡片才掛進場動畫
            if (isInitialLoad) {
                card.classList.add('opening-pull');
                card.style.animationDelay = `${(data.length - index) * 0.08}s`;
            }

            // DOM 順序：新卡片插在置底卡片上方
            const fixedCard = document.getElementById('fixed-info-card');
            if (fixedCard) {
                mainStack.insertBefore(clone, fixedCard);
            } else {
                mainStack.appendChild(clone);
            }
        } else {
            // DOM 順序：既有卡片依新陣列順序重排
            const fixedCard = document.getElementById('fixed-info-card');
            if (fixedCard) {
                mainStack.insertBefore(card, fixedCard);
            } else {
                mainStack.appendChild(card);
            }
        }

        // B. 資料更新（新舊卡片皆執行，不打斷 CSS 動畫）

        // 重新套用光影與背景色
        applyThemeToCard(card, line.hex);

        // 展開中的卡片維持隱藏待命狀態
        if (activeCardId === line.id) {
            card.classList.add('hidden-placeholder', 'lifted-state');
            card.style.transform = 'translate3d(0, -100px, 0)';
        }

        // 只替換文字與圖示，不重建外層 .card
        card.querySelector('.line-name').textContent = line.name;
        card.querySelector('.status-tag').innerHTML = window.getStatusIconsHTML(line.statusFlags || []);
        card.querySelector('.description').textContent = line.desc;

        // 加入 || 條件：第二次渲染時 class 可能被覆寫
        const tagsContainer = card.querySelector('.info-tags-container') || card.querySelector('.vertical-info-list');
        if (tagsContainer) {
            // 確保同時帶有兩個 class，下次渲染才找得到
            tagsContainer.className = 'info-tags-container vertical-info-list';
            tagsContainer.innerHTML = ''; // 清空膠囊不影響外層動畫

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

    // 清理：移除不在最新資料中的舊卡片
    Array.from(mainStack.children).forEach(child => {
        if (child.classList.contains('card') && !currentValidIds.includes(child.id)) {
            child.remove();
        }
    });

    // 開場動畫結束後的鎖定
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
// 點擊卡片展開詳細面板
// ============================================================================
function handleCardClick(id) {
    if (isAnimating || mainStack.classList.contains('dragging') || mainStack.classList.contains('bounce-back') || mainStack.classList.contains('bounce-back-wheel')) return;

    const data = window.appRailwayData.find(l => l.id === id);
    if (!data) return;

    // 若已有卡片在展開狀態（例如未關閉就按搜尋），
    // 先將舊卡片瞬間復原到背景，再展開新卡片
    if (activeCardId && activeCardId !== id) {
        const prevCard = activeCardId === 'fixed-bottom' ? document.getElementById('fixed-info-card') : document.getElementById(`card-${activeCardId}`);
        if (prevCard) {
            // 清除隱藏與位移狀態，切換過程不露痕跡
            prevCard.classList.remove('hidden-placeholder', 'lifted-state', 'returning');
            prevCard.style.transform = '';
            prevCard.style.animationDelay = '';
        }
    }

    const originalCard = document.getElementById(`card-${id}`);
    activeCardId = id;
    isAnimating = true;
    history.pushState({ cardActive: true }, '');

    // 展開前清空殘留位移，確保從原點出發
    detailContainer.innerHTML = '';
    detailContainer.style.transition = 'none';
    detailContainer.style.transform = 'none';

    const template = document.getElementById('detail-card-template');
    const clone = template.content.cloneNode(true);
    const inner = clone.querySelector('.detail-card-inner');

    // 直接取用 template 內建的玻璃面板
    const extension = clone.querySelector('.detail-extension-card');

    // 外層玻璃向下延伸，隱藏底部圓角並避免回彈時穿幫
    extension.style.marginTop = '16px';
    extension.style.height = '100vh';
    extension.innerHTML = '';

    // 建立透明的內層滾動容器
    const scrollWrapper = document.createElement('div');
    scrollWrapper.id = 'card-extension-container';

    // 內層捲動高度：100dvh - 160(頂部預留) - 16(卡片間隙) - 主卡片高度
    // 0px 避免桌面版 env() 報錯；min() 限制桌面版數值
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

    // 套用捲動高度，滑到底時貼齊螢幕下緣
    scrollWrapper.style.height = fallbackScrollHeight;
    scrollWrapper.style.height = exactScrollHeight;

    extension.appendChild(scrollWrapper);

    inner.style.background = applyThemeToCard(inner, data.hex);
    clone.querySelector('.line-name').innerHTML = data.name;
    clone.querySelector('.status-tag').innerHTML = window.getStatusIconsHTML(data.statusFlags || []);

    const cardContent = clone.querySelector('.card-content');

    if (data.isFlightCard && data.flightData) {
        // 航班卡片排版
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

        // 內容放入 scrollWrapper
        // 取得航廈與登機口資訊（API 未提供時顯示 '-'）
        const fData = data.flightData;
        const isDep = fData.type === 'Departure';

        // 辨識主要機場名稱（HND/NRT 顯示優化）
        let mainAirport = fData.airport;
        if (mainAirport === 'HND') mainAirport = '羽田(HND)';
        else if (mainAirport === 'NRT') mainAirport = '成田(NRT)';
        else mainAirport = mainAirport || '-';

        const otherAirport = fData.location || '-';

        // 出發與抵達名稱
        const depAirport = isDep ? mainAirport : otherAirport;
        const arrAirport = !isDep ? mainAirport : otherAirport;

        // ODPT 通常只提供東京端（主機場）的航廈與登機口資料
        const depTerminal = isDep ? (fData.terminal || '-') : '-';
        const depGate = isDep ? (fData.gate || '-') : '-';

        const arrTerminal = !isDep ? (fData.terminal || '-') : '-';
        const arrGate = !isDep ? (fData.gate || '-') : '-';

        // 航班備註可能來自搜尋預覽卡片的 message，或已儲存卡片的 flightData.note
        let flightNote = data.message || (fData.note ? fData.note : '');
        if (flightNote && flightNote.startsWith('⚠️ 備考: ')) {
            flightNote = flightNote.replace('⚠️ 備考: ', '');
        }

        let noteHtml = '';
        if (flightNote) {
            // SVG 固定在左側 16px
            const warningSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square-warning-icon lucide-message-square-warning" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); opacity: 0.8;"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 15h.01"/><path d="M12 7v4"/></svg>`;

            // flex-direction: row 避免外部 CSS 干擾
            // 內部 div 設 margin: 0 避免預設留白
            noteHtml = `
            <div class="extension-route-card" style="position: relative; padding: 16px 16px 16px 54px; min-height: 84px; display: flex; flex-direction: row; align-items: center;">
                ${warningSvg}
                <div style="font-weight: 700; font-size: 0.95em; line-height: 1.5; width: 100%; text-align: left; margin: 0;">
                    ${flightNote}
                </div>
            </div>
            `;
        }

        // 雙欄資訊卡片（以 CSS class 支援深淺模式）
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

        // 5. 三個水平排列的玻璃按鈕
        const btnContainer = document.createElement('div');
        btnContainer.className = 'flight-action-buttons-container';
        // 間距交由外層 Flexbox 的 gap: 16px 處理

        // Google Maps 地標圖示 (Lucide Map-Pin)
        const iconMapPin = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 92.3 132.3" style="opacity: 0.95; transform: translateY(-1px);"><path fill="#1a73e8" d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"/><path fill="#ea4335" d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"/><path fill="#4285f4" d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3"/><path fill="#fbbc04" d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3"/><path fill="#34a853" d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63 0-7.7-1.9-14.9-5.2-21.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2"/></svg>`;
        const iconMap = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`;
        const iconShare = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

        // 按鈕工廠函式：第三個參數為 onClickAction
        const createBtn = (iconHtml, text, onClickAction) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'flight-action-btn';
            btn.innerHTML = `${iconHtml}<span>${text}</span>`;

            // 有點擊事件則綁定
            if (onClickAction) {
                btn.onclick = onClickAction;
            }
            return btn;
        };

        // 組合 Google Maps 搜尋關鍵字
        let mapQuery = '';
        if (fData.airport === 'HND') mapQuery = '羽田空港';
        else if (fData.airport === 'NRT') mapQuery = '成田空港';

        // API 有提供航廈時，直接導航到該航廈，
        // Google Maps 會開啟該航廈的室內地圖
        const mainTerminal = isDep ? depTerminal : arrTerminal;

        // 航廈欄位驗證（排除 null、undefined、空白與各種破折號）
        const isValidTerminal = mainTerminal && !/^-+$/.test(mainTerminal.toString().trim());

        if (mapQuery !== '' && isValidTerminal) {
            // 加上「第Xターミナル」讓 Google Maps 定位到棟
            const terminalSuffix = mainTerminal.toString().includes('ターミナル')
                ? mainTerminal
                : `${mainTerminal}ターミナル`;
            mapQuery += ` ${terminalSuffix}`;
        }

        // Google Maps 點擊事件
        const handleGoogleMapClick = () => {
            if (mapQuery) {
                // Google Maps Universal URL：手機上會開啟原生 App
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                alert('空港情報がありません');
            }
        };

        // 航班卡片的資料繼承（含燈號與航班資料）
        const handleCreateNewCardClick = () => {
            if (isAnimating) return;

            // 從暫存卡片取出真實的航班 ID
            let realFlightId = null;
            if (data.flightData && data.flightData.id) {
                realFlightId = data.flightData.id;
            } else if (data.detailedLines && data.detailedLines.length > 0) {
                realFlightId = data.detailedLines[0].id;
            }

            // 從名稱中移除 HTML 標籤圖示，只保留純文字，
            // 避免進入編輯面板時露出 SVG 原始碼
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.name;
            const cleanName = tempDiv.textContent.trim() || data.name;

            const prefillData = {
                name: cleanName, // 使用去除標籤後的名稱
                hex: data.hex,
                desc: data.desc,
                detail: data.detail,
                statusFlags: data.statusFlags || [false, false, false, false, false, false, false],

                // targetLineIds 為空時，補入取得的航班 ID
                targetLineIds: (data.targetLineIds && data.targetLineIds.length > 0)
                    ? data.targetLineIds
                    : (realFlightId ? [realFlightId] : []),

                detailedLines: data.detailedLines || [],
                // 一併帶入航班判斷旗標與資料
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

        // 航班 SVG（stroke-width=2.5 與系統圖示一致）
        const iconPlane = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;

        // 依 ID 判斷是搜尋預覽還是已加入主畫面
        const isPreviewCard = data.id.startsWith('temp-search');

        if (isPreviewCard) {
            // 預覽模式：保留 Google Maps 與新規カード作成
            btnContainer.appendChild(createBtn(iconMapPin, 'Google Maps', handleGoogleMapClick));
            btnContainer.appendChild(createBtn(iconShare, '新規カード作成', handleCreateNewCardClick));
        } else {
            // 主畫面模式：換上航班 SVG，依機場提供官網連結
            const handleOfficialSiteClick = () => {
                if (isAnimating) return;

                let officialUrl = '';
                // 依機場代碼對應官方網站
                if (fData.airport === 'HND') {
                    officialUrl = 'https://tokyo-haneda.com/';
                } else if (fData.airport === 'NRT') {
                    officialUrl = 'https://www.narita-airport.jp/jp/';
                }

                if (officialUrl) {
                    // 另開視窗開啟官網
                    window.open(officialUrl, '_blank', 'noopener,noreferrer');
                } else {
                    // 非羽田/成田的未知機場
                    alert('公式サイトの情報がありません');
                }
            };

            btnContainer.appendChild(createBtn(iconMapPin, 'Google Maps', handleGoogleMapClick));
            btnContainer.appendChild(createBtn(iconPlane, '空港公式サイト', handleOfficialSiteClick));
        }

        scrollWrapper.appendChild(btnContainer);

    } else {
        // 鐵道卡片邏輯
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
                        if (adv.max_delay > 5) {
                            if (adv.max_delay <= 15) dirDelayHtml = `<span class="adv-delay-minor-text">${adv.max_delay}分遅れ</span>`;
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
            // 無路線時的空狀態
            const emptyState = document.createElement('div');
            emptyState.className = 'interactive-btn'; // 沿用 scale: 1.01 微互動
            emptyState.style.cssText = 'cursor: pointer; background: var(--tag-bg); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); border: 1px solid var(--border-color); border-radius: 24px; padding: 40px 20px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.15);';

            emptyState.innerHTML = `
                <div style="opacity: 0.7; margin-bottom: 12px; display: flex; justify-content: center; color: var(--card-text-color);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                <div style="font-size: 1.05em; font-weight: 800; color: var(--card-text-color);">追跡している路線はありません</div>
                <div style="font-size: 0.85em; margin-top: 8px; opacity: 0.8; color: var(--text-secondary);">よく使う路線を追加しましょう</div>
            `;

            // 點擊觸發「新增路線」流程
            emptyState.onclick = (e) => {
                e.stopPropagation();
                if (isAnimating) return;
                if (navigator.vibrate) navigator.vibrate(50);

                window.targetCardIdForAdd = data.id; // 記錄目標卡片
                closeAllCards(false); // 先關閉目前面板

                // 等 500ms 讓 Z-index 退場，再觸發頂部搜尋按鈕
                setTimeout(() => {
                    const searchBtn = document.querySelector('.search-trigger') || document.getElementById('search-trigger');
                    if (searchBtn) {
                        searchBtn.click();
                        // 再等 300ms 搜尋列展開後自動對焦
                        setTimeout(() => {
                            const searchInput = document.getElementById('search-input');
                            if (searchInput) searchInput.focus({ preventScroll: true });
                        }, 300);
                    }
                }, 500);
            };

            scrollWrapper.appendChild(emptyState);
        }

        // =========================================================
        // 底部動作按鈕（阻擋事件冒泡）
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
                        e.stopPropagation(); // 阻止點擊穿透到背景觸發關閉
                        onClickAction(e);
                    };
                }
                return btn;
            };

            // 將目前的路線資料打包傳給 RouteAppender
            const handleAddToExisting = () => {
                if (isAnimating) return;

                // 1. 擷取目前預覽的路線資料
                const routeId = (data.detailedLines && data.detailedLines.length > 0)
                    ? data.detailedLines[0].id
                    : (data.id || data.targetLineIds[0]);

                const routeData = {
                    id: routeId,
                    name: data.name,
                    company: data.company || "不明"
                };

                // 2. 收起預覽卡片與搜尋列
                closeAllCards(false);

                // 3. 等卡片收起動畫後，開啟卡片選擇面板
                setTimeout(() => {
                    if (window.RouteAppender) {
                        window.RouteAppender.openPicker(routeData);
                    } else {
                        console.error("[系統錯誤] 找不到 RouteAppender，請確認 index.html 有無引入");
                        alert("系統模組載入失敗，請重新整理網頁");
                    }
                }, 300);
            };

            // 打包卡片資訊傳給新增流程
            const handleCreateNew = () => {
                if (isAnimating) return;

                // 擷取卡片資料
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
            // 情境 B：首頁常規卡片
            const btnContainer = document.createElement('div');
            btnContainer.className = 'flight-action-buttons-container';

            const iconEdit = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-chevrons-up-down-icon lucide-list-chevrons-up-down"><path d="M3 5h8"/><path d="M3 12h8"/><path d="M3 19h8"/><path d="m15 8 3-3 3 3"/><path d="m15 16 3 3 3-3"/></svg>`;
            const iconAdd = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-plus-icon lucide-list-plus"><path d="M16 5H3"/><path d="M11 12H3"/><path d="M16 19H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>`;

            const createBtn = (iconHtml, text, onClickAction) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'flight-action-btn';
                btn.innerHTML = `${iconHtml}<span style="font-size: 1.1em; letter-spacing: -0.5px;">${text}</span>`;

                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (navigator.vibrate) navigator.vibrate(50);

                    // 捲動偵測
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
                        }, 400); // 等待縮放動畫完成
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

                // 1. 以全域變數記住目標卡片 ID，
                // add-panel.js 之後依此得知路線要加到哪張卡
                window.targetCardIdForAdd = data.id;

                // 2. 先關閉詳情面板，避免 Z-index 穿透
                closeAllCards(false);

                // 3. 等 500ms 讓關閉動畫結束
                setTimeout(() => {
                    // 以程式觸發首頁搜尋按鈕
                    const searchBtn = document.querySelector('.search-trigger') || document.getElementById('search-trigger');

                    if (searchBtn) {
                        searchBtn.click();

                        // 4. 搜尋框展開後自動 focus
                        setTimeout(() => {
                            const searchInput = document.getElementById('search-input');
                            if (searchInput) {
                                searchInput.focus({ preventScroll: true });
                            }
                        }, 300); // 配合搜尋列展開動畫
                    } else {
                        console.warn('[UX Engine] 找不到搜尋按鈕，無法展開搜尋列');
                    }
                }, 500); // 500ms 確保 Z-index 退場，避免動畫衝突
            };

            btnContainer.appendChild(createBtn(iconEdit, '路線を編集', handleEditRoutes));
            btnContainer.appendChild(createBtn(iconAdd, '路線を追加', handleAddRouteClick));

            scrollWrapper.appendChild(btnContainer);
        }

        const scrollSpacer = document.createElement('div');
        scrollSpacer.style.cssText = 'height: env(safe-area-inset-bottom, 0px); flex-shrink: 0; pointer-events: none;';
        scrollWrapper.appendChild(scrollSpacer);
    }

    // 一次掛載整組內容
    detailContainer.appendChild(clone);

    const capsule = document.getElementById('action-capsule');
    if (capsule) capsule.classList.add('detail-active');

    // 清除阻擋背景虛化的殘留樣式
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

        // 2. 動畫結束後再把 overflow-y 設回 auto，恢復捲動
        const sw = document.getElementById('card-extension-container');
        if (sw) sw.style.overflowY = 'auto';

    }, 600);
}

function handleBottomCardClick() {
    if (isAnimating) return;

    // 保護置底卡片展開時的狀態
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

    // 點擊處既非主卡片也非延伸面板時才關閉
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

    // 關閉時暫時解除裁切，維持回彈動畫的完整性
    const sw = document.getElementById('card-extension-container');
    if (sw) sw.style.overflowY = 'visible';

    // 1. 關閉時上鎖，暫停滑動物理
    mainStack.dataset.blockScroll = 'true';
    clearTimeout(window.scrollCooldownTimer);
    window.scrollCooldownTimer = setTimeout(() => {
        mainStack.dataset.blockScroll = 'false';
    }, 650); // 動畫時間結束後解鎖
    // 卡片關閉時同步移除狀態，讓圖示反向退場
    const capsule = document.getElementById('action-capsule');
    if (capsule) {
        capsule.classList.remove('detail-active');
        capsule.classList.remove('trigger-pop'); // 微互動被打斷時不會卡住
    }
    // 清除手勢殘留樣式，交回 CSS 動畫收尾
    const allCapsuleIcons = document.querySelectorAll('#action-capsule .capsule-btn-item svg');
    allCapsuleIcons.forEach(icon => {
        icon.style.transition = 'opacity 0.4s ease, transform 0.55s var(--spring-release)';
        icon.style.removeProperty('transform');
        icon.style.removeProperty('opacity');
    });

    // 關閉時的淡出動畫
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
    // 1. 關閉瞬間暫停 hover，避免滑鼠穿透使下方卡片彈起
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

    // 關閉時外層容器一併歸位
    detailContainer.style.transition = '';
    detailContainer.style.transform = '';

    if (inner) {
        inner.style.transition = '';
        inner.style.transform = '';
    }


    // 清理延伸卡片樣式
    if (extension) {
        extension.style.transition = '';
        extension.style.transform = '';
    }

    setTimeout(() => {
        if (!activeCardId) detailContainer.innerHTML = '';
        isAnimating = false;
        // 重新啟用光影
        mainStack.dataset.freezeGlare = 'false';

        // 2. 動畫結束後的防手震解鎖（須移動超過 5px）
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

// 記錄手指是否按在主卡片上
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
    // 詳情面板下拉手勢（JS 狀態機、多點觸控防護）
    // =====================================================================
    detailOverlay.ontouchstart = e => {
        if (isAnimating || !activeCardId) return;

        // 多點觸控防護 1：起始即兩指時不啟動手勢
        if (e.touches.length > 1) return;

        defaultIcons = document.querySelectorAll('#action-capsule .icon-default, #search-trigger .icon-default');
        hiddenIcons = document.querySelectorAll('#action-capsule .icon-hidden, #search-trigger .icon-hidden');

        overlayStartY = e.touches[0].pageY;

        // 判斷是否點在主卡片上
        const targetElement = e.target;
        const isClickingInnerCard = targetElement.closest('.detail-card-inner');

        if (isClickingInnerCard) {
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
            // 點在下方面板或按鈕上：不允許手勢，交給原生捲動與點擊
            isClosingGestureAllowed = false;
        }
    };

    detailOverlay.ontouchmove = e => {
        if (isAnimating || !activeCardId) return;

        // 多點觸控防護 2：滑動途中出現第二根手指時
        if (e.touches.length > 1) {
            // 滑動中則強制中斷並回彈
            if (isClosingGestureAllowed) {
                isClosingGestureAllowed = false;

                // 回彈至原位
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

        // 手勢已中止時不執行位移
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

            // 下拉超過 200px 即關閉卡片
            if (rawMoveY > 200) {
                isClosingGestureAllowed = false; // 觸發關閉時一併中止手勢
                closeAllCards(false);
            }
        }
    };

    // touchend 與 touchcancel 統一處理
    const handleTouchEnd = e => {
        // 手勢已被中止時不做任何處理
        if (isAnimating || !activeCardId || !isClosingGestureAllowed) return;

        // 手勢結束
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

        // 未達門檻，彈回原位
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

    // 桌面版滾輪邏輯（同樣區分觸發區域）
    let overlayWheelSum = 0;
    let overlayWheelTimer;
    detailOverlay.onwheel = e => {
        if (isAnimating || !activeCardId) return;

        const extension = detailContainer.querySelector('.detail-extension-card');

        // 滑鼠在面板內捲動時直接放行，不觸發關閉
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

    // 卡片已掛動畫時不重複指派，避免打斷 CSS 動畫
    if (isInitialLoad && !card.classList.contains('opening-pull-fixed')) {
        card.classList.add('opening-pull-fixed');
        // 置底卡片最後進場
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
// 首頁搜尋：鐵道與航班混合搜尋（忽略連字號與空白）
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

    // 支援頓號分隔的多重關鍵字，忽略「-」與空白
    const searchKeywords = keyword.split('、')
        .map(k => k.toLowerCase().replace(/[- ]/g, '').trim())
        .filter(k => k.length > 0);

    // 2. 如果清空或取消搜尋框，隱藏選單、恢復主畫面
    if (searchKeywords.length === 0) {
        dropdown.style.display = 'none';
        mainStack.style.transition = 'opacity 0.3s ease, filter 0.3s ease';

        // 移除 JS 行內樣式，交還給 CSS 狀態控制 (如 .has-active)
        mainStack.style.removeProperty('opacity');
        mainStack.style.removeProperty('pointer-events');
        mainStack.style.removeProperty('filter');
        return;
    }

    // 3. 啟動搜尋引擎
    const dict = window.MasterRouteDictionary || {};
    const liveStatus = window.GlobalLiveStatus || {};
    const searchResults = [];
    const seenNames = new Set(); // 防止多重搜尋時跑出重複路線

    // 迴圈啟動：針對每一個被頓號切開的詞獨立搜尋
    searchKeywords.forEach(lowKeyword => {

        // A. 遍歷雲端鐵道字典
        for (const rw_id in dict) {
            const route = dict[rw_id];

            // 目標名稱同樣移除「-」，兩邊格式一致才能比對
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

                // 提取延遲時間、異常文字、與具體備註判定
                const delay = statusInfo.delay_minutes || 0;
                const isTextAbnormal = !isNormalMsg && (statusInfo.status_text.includes("異常") || msg.includes("遅延") || (statusInfo.status_type && statusInfo.status_type.includes("見合わせ")) || (statusInfo.status_type && statusInfo.status_type.includes("運転変更")));
                const hasMessageNote = (!isNormalMsg && msg.trim().length > 0) || (statusInfo.status_type && statusInfo.status_type.includes("お知らせ")) || msg.includes("お知らせ");

                let isDelayed = false, isError = false, isAttention = false, isSevere = false;

                if (statusInfo.status_type === "通信エラー") {
                    isAttention = true; // 「通信エラー」降級為注意狀態
                } else if (statusInfo.status_type && statusInfo.status_type.includes("エラー")) {
                    isError = true;
                } else if (statusInfo.status_type === "非対応" || statusInfo.status_type === "監視中" || statusInfo.status_text === "公式発表なし" || statusInfo.status_text === "情報なし" || statusInfo.status_type === "更新中...") {
                    isAttention = true;
                } else if (delay > 0) {
                    if (delay <= 5) {
                        // 5 分內：容忍範圍，維持綠燈
                    } else if (delay <= 15) {
                        isDelayed = true; // 6~15 分：黃燈
                    } else {
                        isSevere = true;  // 超過 15 分：紅燈
                    }
                } else if (isTextAbnormal) {
                    isDelayed = true;     // 無明確分鐘數的公告一律亮黃燈
                }

                // 燈號指派：支援多重燈號共存（與主畫面一致）
                let flags = [false, false, false, false, false, false, false];
                if (isError || isSevere) flags[3] = true; // 紅燈（嚴重）
                else if (isDelayed) flags[4] = true;      // 黃燈（中度）
                else if (!isAttention) flags[5] = true;   // 綠燈（正常）

                // 有監視狀態或官方發布具體原因時，點亮第七顆燈
                if (isAttention || hasMessageNote) flags[6] = true;
                // 天候與地震的獨立燈號
                if (msg.includes('地震')) { flags[0] = true; flags[6] = true; }
                if (msg.includes('雨') || msg.includes('台風')) { flags[1] = true; flags[6] = true; }
                if (msg.includes('雪')) { flags[2] = true; flags[6] = true; }

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
        // 排除航班卡片 (!c.isFlightCard)，交由航班搜尋 (C) 處理
        const customCards = window.appRailwayData.filter(c => c.isCustom && !c.isFlightCard && c.name.toLowerCase().replace(/[- ]/g, '').includes(lowKeyword));
        customCards.forEach(c => {
            if (!seenNames.has(c.name)) {
                seenNames.add(c.name);
                searchResults.push({
                    id: c.id,
                    name: c.name,
                    company: 'カスタムカード',
                    // 自訂卡片使用真實燈號狀態，不寫死為全暗
                    statusFlags: c.statusFlags || [false, false, false, false, false, false, false],
                    delayMinutes: 0
                });
            }
        });

        // C. 呼叫航班搜尋
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
        // 套用 CSS class，不寫行內樣式
        dropdown.innerHTML = `<div class="search-empty-state">該当する路線が見つかりません</div>`;
    } else {
        dropdown.innerHTML = searchResults.slice(0, 30).map(route => {
            let delayHtml = route.customRightHtml || '';

            if (!route.customRightHtml && route.delayMinutes > 6) {
                if (route.delayMinutes <= 15) {
                    delayHtml = `<div class="search-delay-minor">${route.delayMinutes}分遅れ</div>`;
                } else {
                    delayHtml = `<div class="search-delay-major">${route.delayMinutes}分遅れ</div>`;
                }
            }

            // 航班結果同樣顯示手指游標並綁定點擊事件
            const cursorStyle = 'cursor: pointer;';
            const clickAction = route.isFlight ? `onclick="window.previewFlightFromSearch('${route.id}')"` : `onclick="window.previewRouteFromSearch('${route.id}')"`;

            // 套用 CSS class，結尾的 customBottomHtml 支援底部排版
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

    // 每次輸入時重新取得鍵盤剩餘高度
    const currentVpHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    dropdown.style.maxHeight = `${currentVpHeight - 120}px`;

    // 5. 顯示下拉選單
    dropdown.style.display = 'flex';
    // 不設 body overflow:hidden，交由 header.js 控制
    mainStack.style.transition = 'opacity 0.4s ease, filter 0.4s ease';
    mainStack.style.opacity = '0.15';
    mainStack.style.pointerEvents = 'none';
    mainStack.style.filter = 'blur(8px) grayscale(50%)';
}

// ============================================================================
// 點擊搜尋結果的預覽：以臨時卡片沿用詳情面板
// ============================================================================
window.previewRouteFromSearch = function (routeId) {
    // 1. 先關閉搜尋列與下拉選單
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.blur(); // 收起鍵盤
    }
    filterCards(''); // 清空搜尋並恢復主畫面

    const cancelBtn = document.querySelector('.cancel-circle-btn');
    if (cancelBtn) cancelBtn.click();

    // 2. 若結果本身就是看板上的卡片，直接觸發點擊展開
    const existingCard = window.appRailwayData.find(c => c.id === routeId && !c.isTemporarySearch);
    if (existingCard) {
        const cardEl = document.getElementById(`card-${existingCard.id}`);
        if (cardEl) {
            setTimeout(() => cardEl.click(), 300); // 等主畫面動畫恢復後再點擊
            return;
        }
    }

    // 3. 建立臨時卡片資料，直接交給詳情面板渲染
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

    // 同步套用進階與備註判定
    const delay = statusInfo.delay_minutes || 0;
    const isTextAbnormal = !isNormalMsg && (statusInfo.status_text.includes("異常") || msg.includes("遅延") || (statusInfo.status_type && statusInfo.status_type.includes("見合わせ")) || (statusInfo.status_type && statusInfo.status_type.includes("運転変更")));
    const hasMessageNote = (!isNormalMsg && msg.trim().length > 0) || (statusInfo.status_type && statusInfo.status_type.includes("お知らせ")) || msg.includes("お知らせ");

    let isDelayed = false, isError = false, isAttention = false, isSevere = false;

    if (statusInfo.status_type === "通信エラー") {
        isAttention = true; // 「通信エラー」降級為注意狀態
    } else if (statusInfo.status_type && statusInfo.status_type.includes("エラー")) {
        isError = true;
    } else if (statusInfo.status_type === "非対応" || statusInfo.status_type === "監視中" || statusInfo.status_text === "公式発表なし" || statusInfo.status_text === "情報なし" || statusInfo.status_type === "更新中...") {
        isAttention = true;
    } else if (delay > 0) {
        if (delay <= 5) {
            // 5 分內：容忍範圍
        } else if (delay <= 15) {
            isDelayed = true;
        } else {
            isSevere = true;
        }
    } else if (isTextAbnormal) {
        isDelayed = true; // 無明確分鐘數時降為黃燈
    }

    // 燈號指派：支援多重燈號共存
    let flags = [false, false, false, false, false, false, false];
    if (isError || isSevere) flags[3] = true; // 紅燈
    else if (isDelayed) flags[4] = true;      // 黃燈
    else if (!isAttention) flags[5] = true;   // 綠燈

    // 第七顆燈（備註/注意）
    if (isAttention || hasMessageNote) flags[6] = true;
    // 天候與地震的獨立燈號
    if (msg.includes('地震')) { flags[0] = true; flags[6] = true; }
    if (msg.includes('雨') || msg.includes('台風')) { flags[1] = true; flags[6] = true; }
    if (msg.includes('雪')) { flags[2] = true; flags[6] = true; }

    // 臨時卡片資料
    const tempCard = {
        id: 'temp-search-route',
        name: route.name,
        hex: route.hex || '#2C2C2E',
        desc: statusInfo.message || "現在監視中、または公式情報がありません。",
        statusFlags: flags,
        isTemporarySearch: true, // 臨時搜尋卡片：面板會加上「新增」按鈕
        detail: ['検索結果', '-', '-', '-'], // 佔位資料，用於撐住面板高度
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

    // 寫入記憶體（未呼叫 renderCards()，首頁不會出現這張卡片）
    const tempIndex = window.appRailwayData.findIndex(c => c.id === 'temp-search-route');
    if (tempIndex !== -1) window.appRailwayData[tempIndex] = tempCard;
    else window.appRailwayData.push(tempCard);

    // 4. 等 250ms 讓鍵盤收起、螢幕高度歸位後再彈出卡片
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
    // 讓新圖示套用線條顏色
    iconDiv.style.color = 'rgba(142, 142, 147, 0.8)';

    document.body.appendChild(iconDiv);
}

window.addEventListener('popstate', (e) => {
    if (activeCardId) {
        closeAllCards(true);
    }
});

// ============================================================================
// 個人化復原 (Undo)：還原前後狀態深度比對
// ============================================================================
window.undoCardPreference = async function () {
    if (!activeCardId || activeCardId === 'fixed-bottom') return false;

    try {
        // 1. 取得還原前的當前狀態
        const routeData = window.appRailwayData.find(r => r.id === activeCardId);
        if (!routeData) return false;

        const currentName = routeData.name;
        const currentHex = routeData.hex;

        // 2. 呼叫 db.js 還原（DB 內部會互換目前與上一筆）
        const restoredData = await restorePreviousPreference(activeCardId);

        if (restoredData) {
            // 3. 比對是否真的有變更
            const isNameSame = restoredData.customName === currentName;
            // 色碼統一轉小寫比對，避免大小寫誤判
            const isHexSame = restoredData.customHex.toLowerCase() === currentHex.toLowerCase();

            // 名稱與顏色皆相同時視為無效操作
            if (isNameSame && isHexSame) {
                console.log("[歷史紀錄] 上一筆資料與目前完全相同，忽略渲染並觸發錯誤提示");
                return false; // 觸發失敗（打叉）動畫
            }

            // 4. 有差異，更新全域資料
            routeData.name = restoredData.customName;
            routeData.hex = restoredData.customHex;

            // 強制重繪（不破壞 Flex/Grid 版型）
            const forceRepaint = (el) => {
                if (!el) return;

                // 1. 讀取高度觸發父層 reflow
                void el.offsetHeight;

                // 2. 子按鈕逐一重排
                const tags = el.querySelectorAll('.info-tag-item, .info-capsule, .info-circle, .flight-action-btn');
                tags.forEach(tag => {
                    // 記下元素原本的 inline display
                    const originalDisplay = tag.style.display;

                    tag.style.display = 'none';
                    void tag.offsetHeight;      // 強制放棄快取
                    tag.style.display = originalDisplay; // 還原 display
                });
            };

            // A. 更新個人化面板
            const customizeCard = document.querySelector('#dynamic-blank-overlay .detail-card-inner');
            if (customizeCard) {
                applyThemeToCard(customizeCard, restoredData.customHex);
                forceRepaint(customizeCard);
            }

            // B. 更新詳情卡片
            const detailCard = document.querySelector('#detail-card-container .detail-card-inner');
            if (detailCard) {
                applyThemeToCard(detailCard, restoredData.customHex);
                forceRepaint(detailCard);
                const detailNameNode = detailCard.querySelector('.line-name');
                if (detailNameNode) detailNameNode.textContent = restoredData.customName;
            }

            // C. 更新底層的主列表卡片
            const mainCard = document.getElementById(`card-${activeCardId}`);
            if (mainCard) {
                applyThemeToCard(mainCard, restoredData.customHex);
                forceRepaint(mainCard);
                const mainNameNode = mainCard.querySelector('.line-name');
                if (mainNameNode) mainNameNode.textContent = restoredData.customName;
            }

            // D. 同步更新顯示文字與面板上的自訂按鈕底色
            const pDisplayName = document.getElementById('p-display-name');
            const pDisplayColor = document.getElementById('p-display-color');
            if (pDisplayName) pDisplayName.textContent = restoredData.customName;

            if (pDisplayColor) {
                pDisplayColor.textContent = restoredData.customHex.toUpperCase();
                // 顯示目前顏色的按鈕：文字與背景一併更新
            }

            // 1. 清除畫面上被選取的文字
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            // 2. 讓聚焦中的輸入框或按鈕失焦，消除外框殘影
            if (document.activeElement) {
                document.activeElement.blur();
            }

            return true;
        }
        return false; // 無上一筆紀錄
    } catch (error) {
        console.error("[Undo Engine] 還原失敗:", error);
        return false;
    }
};

// ============================================================================
// 資料建構與渲染（支援斷線覆寫與多重燈號共存）
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

        // 航班旗標與資料容器
        let isFlightCard = false;
        let flightDataPayload = null;

        // 判斷卡片是否為航班
        if (finalTargetIds.length > 0) {
            const testId = finalTargetIds[0];
            // 2. 以 ID 特徵判斷（鐵道 ID 必含 . 或 :，航班沒有）
            const isLikelyFlight = !testId.includes('.') && !testId.includes(':');

            if (isLikelyFlight) {
                isFlightCard = true;
                const flightInfo = window.GlobalFlights ? window.GlobalFlights.find(f => f.fid.includes(testId)) : null;

                if (flightInfo && typeof window.generateFlightDataFormat === 'function') {
                    // 有即時資料，正常處理
                    const formatted = window.generateFlightDataFormat(flightInfo, testId);
                    flightDataPayload = formatted.flightData;
                    groupFlags = formatted.flags;
                    groupDesc = formatted.desc;
                    groupUpdateTime = formatted.flightData.updateTime;
                    // 航班卡片獨立判斷天候與天災燈號
                    // 從備註 (note) 或狀態描述中比對關鍵字
                    const flightMsg = (formatted.flightData.note || groupDesc || "");
                    if (flightMsg.includes('地震')) { groupFlags[0] = true; groupFlags[6] = true; }
                    if (flightMsg.includes('雨') || flightMsg.includes('台風')) { groupFlags[1] = true; groupFlags[6] = true; }
                    if (flightMsg.includes('雪')) { groupFlags[2] = true; groupFlags[6] = true; }
                } else {
                    // 找不到航班（已落地或 API 異常）：維持航班版型不退回鐵道排版
                    groupDesc = "フライト情報が終了したか、取得できません";
                    groupFlags = [false, false, false, false, false, false, true]; // 灰色注意燈
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

        // 分流：航班不走鐵道邏輯
        if (isFlightCard) {
            // 航班資料已在前段處理完畢
        } else if (finalTargetIds.length > 0) {
            // --- 鐵道的迴圈邏輯 ---
            let hasError = false;
            let hasSevere = false;
            let hasDelay = false;
            let hasAttention = false;
            let hasNormal = false;
            let hasMessageNote = false; // 追蹤這組卡片是否有具體事故文字

            // 追蹤這組卡片內的天候與天災狀況
            let hasEarthquake = false;
            let hasRain = false;
            let hasSnow = false;

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

                // 非制式的正常訊息，或官方標示為「お知らせ」時，觸發備註燈號
                if ((!isNormalMsg && msg.trim().length > 0) || (statusInfo.status_type && statusInfo.status_type.includes("お知らせ")) || msg.includes("お知らせ")) {
                    hasMessageNote = true;
                }
                // 新增：檢查該路線訊息是否包含天候或地震字眼
                if (msg.includes('地震')) hasEarthquake = true;
                if (msg.includes('雨') || msg.includes('台風')) hasRain = true;
                if (msg.includes('雪')) hasSnow = true;

                // 狀態變數宣告
                let isDelayedLocal = false;
                let isSevereLocal = false;
                let isErrorLocal = false;
                let isAttentionLocal = false;
                let delay = statusInfo.delay_minutes || 0;

                // 判斷是否為「無回報時間，但文字顯示異常/停駛」
                let isTextAbnormal = !isNormalMsg && (statusInfo.status_text.includes("異常") || msg.includes("遅延") || (statusInfo.status_type && statusInfo.status_type.includes("見合わせ")) || (statusInfo.status_type && statusInfo.status_type.includes("運転変更")));

                // 新版精準燈號判定邏輯
                if (statusInfo.status_type === "通信エラー") {
                    isAttentionLocal = true; hasAttention = true; // 斷線降級為注意狀態，不觸發紅燈
                } else if (statusInfo.status_type && statusInfo.status_type.includes("エラー")) {
                    isErrorLocal = true; hasError = true;
                } else if (statusInfo.status_type === "非対応" || statusInfo.status_text === "公式発表なし" || statusInfo.status_text === "情報なし" || statusInfo.status_type === "更新中...") {
                    isAttentionLocal = true; hasAttention = true;
                } else if (delay > 0) {
                    // 有具體延遲分鐘數時：
                    if (delay <= 5) {
                        isDelayedLocal = false; // 詳細卡片內不顯示輕微延誤字樣
                        hasNormal = true;      // 5 分（含）以內：綠燈（圓形）
                    } else if (delay <= 15) {
                        isDelayedLocal = true;
                        hasDelay = true;       // 6~15 分：黃燈（三角形）
                    } else {
                        isSevereLocal = true;
                        hasSevere = true;      // 超過 15 分：紅燈（打叉）
                    }
                    if (delay > worstDelay) worstDelay = delay;

                } else if (isTextAbnormal) {
                    isDelayedLocal = true; // 子路線記住黃燈狀態
                    hasDelay = true; // 無具體分鐘數的公告一律亮黃燈
                } else {
                    hasNormal = true;
                }

                // 時間萃取
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

                    // Severe 以 Delayed 傳給詳細卡片，使其顯示紅色
                    isDelayed: isDelayedLocal || isSevereLocal,
                    isError: isErrorLocal, isAttention: isAttentionLocal,
                    advancedDetails: statusInfo.advanced_details || []
                });
            });

            // 多重燈號寫入陣列
            if (hasEarthquake) groupFlags[0] = true; // 第1顆：地震
            if (hasRain) groupFlags[1] = true;       // 第2顆：雨天
            if (hasSnow) groupFlags[2] = true;       // 第3顆：雪天
            if (hasError || hasSevere) groupFlags[3] = true; // 第4顆：打叉（系統錯誤或嚴重延誤/停駛）
            if (hasDelay) groupFlags[4] = true; // 第5顆：三角形（6~15 分延誤）
            if (hasNormal) groupFlags[5] = true; // 第6顆：圓形（0~5 分正常）
            if (hasAttention || hasMessageNote || hasEarthquake || hasRain || hasSnow) groupFlags[6] = true; // 第7顆：注意（非対応、官方公告或天候因素）

            // 依嚴重程度生成文字描述
            if (isOffline) {
                groupDesc = "サーバーとの通信に失敗しました。ネットワークを確認してください。";
            } else if (hasError) {
                groupDesc = "一部の路線の情報を取得できません。";
            } else if (hasSevere) {
                groupDesc = "一部の路線で大幅な遅延、または運転見合わせが発生しています。"; // 嚴重延誤說明
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
            // 必須保留這兩行，卡片才能維持航班身分
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
// 系統啟動：快取秒開、背景非同步更新、斷線偵測
// ============================================================================
async function initApp() {
    // 1. 繪圖前先從快取載入航班資料
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

        // 2. 立即渲染（不帶舊狀態，燈號重置為「更新中」）
        buildAndRender(userPrefs, cachedDict, {}, false);

        // 3. 背景抓取最新資料
        console.log("背景正在獲取最新運行狀態...");
        const DICTIONARY_API_URL = 'https://api.tsukinkanban.com/api/dictionary';

        // 同樣加上 cache: no-store
        const timestamp = new Date().getTime();
        const STATUS_API_URL = `https://api.tsukinkanban.com/api/status`;

        const [routeDict, statusRes] = await Promise.all([
            syncAndLoadDictionary(DICTIONARY_API_URL).catch(() => null),
            fetch(STATUS_API_URL, { cache: 'no-store' }).catch(() => null) // 網路全斷時回傳 null
        ]);

        // 4. 判斷 API 是否正常回應
        if (statusRes && statusRes.ok) {
            const liveStatus = await statusRes.json();

            localStorage.setItem('Tsukin_Cached_Dict', JSON.stringify(routeDict || cachedDict));
            localStorage.setItem('Tsukin_Cached_Status', JSON.stringify(liveStatus));

            console.log("最新狀態獲取成功，更新畫面！");

            // 確認 API 確實回傳了路線資料
            const hasValidData = liveStatus && Object.keys(liveStatus).length > 0 && !liveStatus.error;

            if (hasValidData) {
                // 取得伺服器時間
                const serverTimeStr = liveStatus._meta ? liveStatus._meta.server_time : null;
                const syncDate = serverTimeStr ? new Date(serverTimeStr) : new Date();

                // 確實拿到資料才更新左上角的 JST 時間
                if (typeof window.updateSystemSyncTime === 'function') {
                    window.updateSystemSyncTime(syncDate);
                }
            } else {
                console.log("[系統啟動] 偵測到 API 啟動中或無有效資料，維持顯示最後一次成功的快取時間！");
            }

            buildAndRender(userPrefs, routeDict || cachedDict, liveStatus, false);
        } else {
            // API 回傳 500/502 或無回應
            console.warn("狀態 API 伺服器無回應，強制切換至斷線異常狀態");
            // 丟棄舊資料，進入斷線狀態
            buildAndRender(userPrefs, cachedDict, {}, true);
        }

    } catch (error) {
        // 底層錯誤（DNS 失敗、網路斷開等）
        console.error("系統遭遇嚴重連線錯誤:", error);
        // 丟棄舊資料，避免顯示過期的綠燈
        buildAndRender(userPrefs, cachedDict, {}, true);
    }
    initFlights();
}

// script type="module" 延遲執行，可直接呼叫啟動
initApp();

document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

// 將模組內的函數暴露給全域
window.handleBottomCardClick = handleBottomCardClick;
window.handleOverlayClick = handleOverlayClick;
window.renderMainCards = renderCards;
window.handleCardClick = handleCardClick; // 供航班預覽卡片呼叫

// ============================================================================
// 資訊卡片彈窗 (Info Overlay)
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

    // 觸發 Info 模式的膠囊切換
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

    // 恢復原生膠囊
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
// 頂部按鈕微互動（長按 400ms 放大回彈）
// ============================================================================
function initHeaderButtonGestures() {
    // 取得 Header 的互動按鈕
    const headerBtns = document.querySelectorAll('.left-circle-btn, .menu-close-btn, .search-trigger, .action-capsule, .cancel-circle-btn');

    headerBtns.forEach(btn => {
        let pressTimer = null;
        let isLifted = false;
        let startX = 0, startY = 0;

        btn.addEventListener('touchstart', (e) => {
            // 按鈕已展開為卡片時不觸發長按放大
            if (btn.classList.contains('is-expanded') || btn.classList.contains('menu-expanded')) return;

            // 搜尋按鈕且搜尋列已展開時不觸發放大
            if (btn.classList.contains('search-trigger') && document.getElementById('search-container').classList.contains('active')) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isLifted = false;

            // 與牌組相同的 400ms 長按判定
            pressTimer = setTimeout(() => {
                isLifted = true;
                btn.classList.add('touch-lifted-btn');
                // 震動回饋（裝置支援時）
                if (window.navigator.vibrate) window.navigator.vibrate(10);
            }, 400);
        }, { passive: true });

        btn.addEventListener('touchmove', (e) => {
            if (!pressTimer && !isLifted) return;

            const moveX = e.touches[0].clientX;
            const moveY = e.touches[0].clientY;

            // 滑動超過 10px 視為捲動，取消長按判定
            if (Math.abs(moveX - startX) > 10 || Math.abs(moveY - startY) > 10) {
                clearTimeout(pressTimer);
                pressTimer = null;
                if (isLifted) {
                    btn.classList.remove('touch-lifted-btn');
                    isLifted = false;
                }
            }
        }, { passive: true });

        // 放開時收回放大效果並清理計時器
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

    // 不用 render 迴圈，
    // 在滑鼠事件當下直接更新座標，達成 1:1 零延遲
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
// 橫向畫面 (Landscape Prompt) 的操作鎖定
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const landscapePrompt = document.getElementById('landscape-prompt');
    if (landscapePrompt) {
        // 1. 禁止滑動
        landscapePrompt.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        // 2. 禁止多指觸控（防止 Safari 雙指縮放）
        landscapePrompt.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // 3. 禁止雙擊（防止雙擊放大）
        landscapePrompt.addEventListener('dblclick', (e) => {
            e.preventDefault();
        });

        // 4. 禁止長按選單
        landscapePrompt.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
});

// =========================================
// 搜尋框的輸入正規化與自動分段（相容 IME 輸入法）
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    let isComposing = false;

    // 1. 輸入法拼字開始
    searchInput.addEventListener('compositionstart', () => {
        isComposing = true;
    });

    // 2. 輸入法拼字結束（選字完成或按 Enter）
    searchInput.addEventListener('compositionend', function () {
        isComposing = false;
        // 拼字結束後才觸發過濾與格式化
        formatSearchInput.call(this);

        // 觸發搜尋
        this.dispatchEvent(new Event('input'));
    });

    // 3. 攔截 input 事件
    searchInput.addEventListener('input', function (e) {
        // IME 組字期間不改動輸入值
        if (isComposing) return;

        // 非組字狀態才進行過濾
        formatSearchInput.call(this);
    });

    // 過濾邏輯
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

        // 5. 符號整理
        val = val.replace(/--+/g, '、');
        val = val.replace(/-+/g, '-');
        val = val.replace(/、+/g, '、');
        val = val.replace(/-、/g, '、');
        val = val.replace(/、-/g, '、');
        val = val.replace(/^[、-]+/, '');

        // 6. 自動分段
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

        // 7. 值有變更時才替換並校正游標位置
        if (this.value !== val) {
            this.value = val;
            const lengthDiff = val.length - originalLength;
            const newCursorPos = Math.max(0, originalStart + lengthDiff);
            this.setSelectionRange(newCursorPos, newCursorPos);
        }
    }
});

// ============================================================================
// 桌面版快捷鍵：方向鍵關閉詳情卡片（全域監聽）
// ============================================================================
window.addEventListener('keydown', (e) => {
    // 輸入框聚焦時不攔截方向鍵
    const activeElement = document.activeElement;
    const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
    if (isTyping) return;

    // ArrowDown：關閉詳情卡片
    if (e.key === 'ArrowDown') {
        // 個人化卡片或資訊卡片仍開啟時不處理，
        // 依 Z 軸層級一次只關一層
        if (document.getElementById('dynamic-blank-overlay') || document.getElementById('dynamic-info-overlay')) {
            return;
        }

        // 確認詳情卡片展開中 (activeCardId 有值) 且不在動畫過渡期間
        if (activeCardId && !isAnimating) {
            e.preventDefault();  // 防止背景跟著捲動
            closeAllCards(true); // true：以動畫關閉
        }
    }
});

// ============================================================================
// 左側滾動時鐘 (Dynamic Clock)
// ============================================================================
document.addEventListener('DOMContentLoaded', initDynamicClock);

// ============================================================================
// 時鐘膠囊連動：背景靜默更新
// ============================================================================
window.triggerBackgroundUpdate = async function () {
    // 判斷是否停留在首頁且閒置：無展開卡片、未開選單、未開搜尋
    const isIdleOnMainPage = !window.activeCardId &&
        !document.body.classList.contains('menu-open') &&
        !document.body.classList.contains('search-active');

    try {
        console.log("時鐘膠囊收縮：觸發背景 API 靜默更新...");

        const timestamp = new Date().getTime();
        const STATUS_API_URL = `https://api.tsukinkanban.com/api/status`;
        const FLIGHTS_API_URL = `https://api.tsukinkanban.com/api/flights`; // 加入航班 API

        // 同時發送鐵道與航班的請求
        const [statusRes, flightRes] = await Promise.all([
            fetch(STATUS_API_URL, { cache: 'no-store' }).catch(() => null),
            fetch(FLIGHTS_API_URL, { cache: 'no-store' }).catch(() => null)
        ]);

        if (!statusRes || !statusRes.ok) return;

        // 航班更新成功時，更新全域變數與快取
        if (flightRes && flightRes.ok) {
            const flightsData = await flightRes.json();
            if (Array.isArray(flightsData)) {
                window.GlobalFlights = flightsData;
                localStorage.setItem('Tsukin_Cached_Flights', JSON.stringify(flightsData));
            }
        }

        const liveStatus = await statusRes.json();
        if (liveStatus.error) return;

        // 確認 API 確實回傳了路線資料
        // 伺服器剛喚醒時通常回傳空物件 {}
        const hasValidData = liveStatus && Object.keys(liveStatus).length > 0 && !liveStatus.error;

        if (hasValidData) {
            // 優先使用伺服器時間，後端未提供時退回裝置時間
            const serverTimeStr = liveStatus._meta ? liveStatus._meta.server_time : null;
            const syncDate = serverTimeStr ? new Date(serverTimeStr) : new Date();

            // 確實拿到資料才更新左上角的 JST 時間
            if (typeof window.updateSystemSyncTime === 'function') {
                window.updateSystemSyncTime(syncDate);
            }
        } else {
            console.log("[背景同步] 偵測到 API 啟動中或無有效資料，拒絕更新左上角時間！");
        }

        // 取得最新資料，準備重繪
        const cachedDict = JSON.parse(localStorage.getItem('Tsukin_Cached_Dict') || '{}');
        const userPrefs = await getAllUserPreferences();
        localStorage.setItem('Tsukin_Cached_Status', JSON.stringify(liveStatus));

        // 1. 更新底層資料與主畫面卡片（局部更新，不閃爍）
        buildAndRender(userPrefs, cachedDict, liveStatus, false);

        // 2. 使用者操作其他介面時，只在背景替換文字內容
        if (window.activeCardId) {
            // 背景重繪玻璃面板，保留捲動位置
            silentUpdateExtensionPanel(window.activeCardId);
        }

        if (document.body.classList.contains('search-active')) {
            // 重新觸發搜尋，更新下拉選單的延誤分鐘數
            const searchInput = document.getElementById('route-search');
            if (searchInput) searchInput.dispatchEvent(new Event('input'));
        }

        // 3. 僅在首頁閒置時觸發漣漪進場動畫
        if (isIdleOnMainPage) {
            const mainStack = document.getElementById('main-stack');

            // 動畫期間暫停光影計算與 hover，避免互相干擾
            mainStack.classList.add('just-awoke');
            mainStack.dataset.freezeGlare = 'true';
            mainStack.classList.remove('allow-hover');

            const cards = Array.from(document.querySelectorAll('.card'));
            cards.forEach((c, index) => {
                c.classList.remove('opening-pull');
                void c.offsetWidth; // 強制 reflow
                c.style.animationDelay = `${(cards.length - index) * 0.08}s`;
                c.classList.add('opening-pull');
            });

            const fixedCard = document.getElementById('fixed-info-card');
            if (fixedCard) {
                fixedCard.classList.remove('opening-pull-fixed');
                void fixedCard.offsetWidth;
                fixedCard.classList.add('opening-pull-fixed');
            }

            // 1.5 秒動畫結束後移除動畫 class，恢復互動
            setTimeout(() => {
                cards.forEach(c => {
                    c.classList.remove('opening-pull');
                    c.style.animationDelay = '';
                });
                if (fixedCard) {
                    fixedCard.classList.remove('opening-pull-fixed');
                }

                mainStack.dataset.freezeGlare = 'false'; // 恢復光影計算

                // 重新綁定滑鼠移動解鎖 hover（與初次載入相同機制）
                window.addEventListener('mousemove', function unlockHover() {
                    if (!mainStack.classList.contains('allow-hover')) {
                        mainStack.classList.add('allow-hover');
                    }
                    window.removeEventListener('mousemove', unlockHover);
                }, { once: true });

            }, 1500);

            // 移除剛喚醒的狀態標記
            setTimeout(() => {
                mainStack.classList.remove('just-awoke');
            }, 2000);
        }

    } catch (error) {
        console.error("背景更新時發生未預期錯誤:", error);
    }
};

// ============================================================================
// 玻璃面板的無縫內容抽換
// ============================================================================
function silentUpdateExtensionPanel(cardId) {
    const extension = document.getElementById('card-extension-container');
    if (!extension) return;

    const data = window.appRailwayData.find(r => r.id === cardId);
    if (!data) return;

    // 3. 航班卡片不可用鐵道的更新邏輯清空
    if (data.isFlightCard) return;

    const currentScroll = extension.scrollTop;

    // 1. 只移除舊的路線卡片與空狀態，保留操作按鈕
    Array.from(extension.children).forEach(child => {
        if (child.classList.contains('extension-route-card') ||
            (child.style.backdropFilter && child.style.backdropFilter.includes('blur(25px)'))) {
            child.remove();
        }
    });

    // 2. 找到按鈕區塊作為插入定位點
    const actionBtnContainer = Array.from(extension.querySelectorAll('.flight-action-buttons-container')).find(c => !c.innerHTML.includes('保存'));

    const fragment = document.createDocumentFragment();

    // 3. 生成新卡片
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
                    if (adv.max_delay > 5) {
                        if (adv.max_delay <= 15) dirDelayHtml = `<span class="adv-delay-minor-text">${adv.max_delay}分遅れ</span>`;
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
        // 路線刪光時補回空狀態
        const emptyState = document.createElement('div');
        emptyState.className = 'interactive-btn';
        emptyState.style.cssText = 'cursor: pointer; background: var(--tag-bg); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); border: 1px solid var(--border-color); border-radius: 24px; padding: 40px 20px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.15);';

        emptyState.innerHTML = `
            <div style="opacity: 0.7; margin-bottom: 12px; display: flex; justify-content: center; color: var(--card-text-color);">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div style="font-size: 1.05em; font-weight: 800; color: var(--card-text-color);">追跡している路線はありません</div>
            <div style="font-size: 0.85em; margin-top: 8px; opacity: 0.8; color: var(--text-secondary);">よく使う路線を追加しましょう</div>
        `;

        emptyState.onclick = (e) => {
            e.stopPropagation();
            if (isAnimating) return;
            if (navigator.vibrate) navigator.vibrate(50);

            window.targetCardIdForAdd = data.id;
            closeAllCards(false);

            setTimeout(() => {
                const searchBtn = document.querySelector('.search-trigger') || document.getElementById('search-trigger');
                if (searchBtn) {
                    searchBtn.click();
                    setTimeout(() => {
                        const searchInput = document.getElementById('search-input');
                        if (searchInput) searchInput.focus({ preventScroll: true });
                    }, 300);
                }
            }, 500);
        };

        fragment.appendChild(emptyState);
    }

    // 4. 新卡片插入按鈕上方
    if (actionBtnContainer) {
        extension.insertBefore(fragment, actionBtnContainer);
    } else {
        extension.appendChild(fragment);
    }

    extension.scrollTop = currentScroll;
}

// ============================================================================
// 桌面版快捷鍵：方向鍵關卡片與首頁卡片焦點選擇
// ============================================================================
let keyboardFocusIndex = -1;

window.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement;
    const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

    // 直接讀取模組內的 isAnimating（不加 window. 前綴）
    if (isTyping || isAnimating) return;

    // 直接讀取模組內的 activeCardId
    // 已有卡片展開時的狀態處理
    if (activeCardId) {
        if (e.key === 'ArrowDown') {
            // 二級面板（設定、新增）開啟時不觸發關閉
            if (document.getElementById('dynamic-blank-overlay') || document.getElementById('dynamic-info-overlay')) return;
            e.preventDefault();
            closeAllCards(true);
        }
        // 卡片展開期間，Enter 與上下鍵一律在此攔截
        return;
    }

    const cards = Array.from(document.querySelectorAll('#main-stack .card:not(.hidden-placeholder), #fixed-info-card'));
    if (cards.length === 0) return;

    // 鍵盤操作期間暫停滑鼠 hover
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        document.body.classList.add('keyboard-active');
    }

    // 焦點循環
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
        resetFocus(); // ESC 取消鍵盤焦點
    }
});

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
        console.log("路線編輯完成，正在重繪畫面...");
        const userPrefs = await getAllUserPreferences();
        const cachedDict = JSON.parse(localStorage.getItem('Tsukin_Cached_Dict') || '{}');
        const cachedLiveStatus = JSON.parse(localStorage.getItem('Tsukin_Cached_Status') || '{}');

        buildAndRender(userPrefs, cachedDict, cachedLiveStatus, false);

        // 直接讀取模組內變數
        if (activeCardId) {
            silentUpdateExtensionPanel(activeCardId);
        }
    } catch (err) {
        console.error("重繪畫面失敗:", err);
    }
};