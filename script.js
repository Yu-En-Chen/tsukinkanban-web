// script.js - 主 UI 邏輯與狀態控制 (動畫與 History API 修正版)

import { bottomCardConfig, railwayData } from './data.js';
import { initPhysics } from './physics.js';
import { initHeader } from './header.js';
import { getAllUserPreferences } from './db.js'; // 🟢 引入 IndexedDB 引擎

// 🟢 宣告全域變數，作為整個 App 實際渲染、搜尋、點擊的唯一資料來源
window.appRailwayData = [];

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
function handleCardClick(id) {
    // 🟢 2. 點擊防禦鎖：防止在牌組還在「回彈飛行」的半空中時，誤觸打開卡片導致動畫錯亂
    if (isAnimating ||
        mainStack.classList.contains('dragging') ||
        mainStack.classList.contains('bounce-back') ||
        mainStack.classList.contains('bounce-back-wheel')) {
        return;
    }

    // 🟢 改用 window.appRailwayData
    const data = window.appRailwayData.find(l => l.id === id);
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

    // 🟢 同步聯動：一展開卡片，膠囊的圖示就跟著上滑切換
    const capsule = document.getElementById('action-capsule');
    if (capsule) capsule.classList.add('detail-active');

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
    // 🟢 抓取膠囊內的兩種 SVG
    const defaultIcons = document.querySelectorAll('#action-capsule .icon-default');
    const hiddenIcons = document.querySelectorAll('#action-capsule .icon-hidden');

    detailOverlay.ontouchstart = e => {
        overlayStartY = e.touches[0].pageY;
        inner.style.transition = 'none';
        
        if (dismissIcon) {
            dismissIcon.style.transition = 'none';
            
            // 🟢 1. 拔除 wrapper 可能殘留的強制不透明 (!important)
            dismissIcon.style.removeProperty('opacity');
            
            // 🟢 2. 拔除內部 SVG 可能殘留的強制旋轉 (!important) 與過渡
            const dismissSvg = dismissIcon.querySelector('svg');
            if (dismissSvg) {
                dismissSvg.style.removeProperty('transform');
                dismissSvg.style.removeProperty('transition');
            }
        }
    
        extraElements.forEach(el => el.style.transition = 'none');
    };

    detailOverlay.ontouchmove = e => {
        const rawMoveY = e.touches[0].pageY - overlayStartY;
        if (rawMoveY > 0) {
            if (rawMoveY > 10 && e.cancelable) e.preventDefault();
            const resistedY = rawMoveY * 0.5;
            inner.style.transform = `translate3d(0, ${resistedY}px, 0)`;

            if (dismissIcon) dismissIcon.style.opacity = Math.max(0, 1 - (rawMoveY / 150));

            const progress = Math.min(rawMoveY / 200, 1);

            // 預設圖示 (加號/點點)：從頂部 (-120%) 降回中央 (0%)，透明度從 0 變 0.8
            defaultIcons.forEach(icon => {
                icon.style.setProperty('transform', `translateY(${-120 + (120 * progress)}%)`, 'important');
                icon.style.setProperty('opacity', `${0.8 * progress}`, 'important');
            });
            // 新圖示 (調色盤/連結)：從中央 (0%) 沉回底部 (120%)，透明度從 0.8 變 0
            hiddenIcons.forEach(icon => {
                icon.style.setProperty('transform', `translateY(${120 * progress}%)`, 'important');
                icon.style.setProperty('opacity', `${0.8 - (0.8 * progress)}`, 'important');
            });

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
        // 1. 恢復卡片本體的彈簧動畫，並設定目的地為 0 (原點)
        inner.style.transition = 'transform 0.55s var(--spring-release)';
        inner.style.transform = 'translate3d(0, 0, 0)';

        // 2. 恢復打叉圖示的淡入動畫與不透明度
        if (dismissIcon) {
            dismissIcon.style.transition = 'opacity 0.3s ease';
            dismissIcon.style.opacity = '1';
        }

        // 3. 恢復內部文字的淡入動畫與不透明度
        extraElements.forEach(el => {
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '1';
        });

        // 🟢 圖示回彈
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
            
            // 🟢 滾輪觸發的瞬間，一樣先淨空殘留的霸王條款
            dismissIcon.style.removeProperty('opacity');
            const dismissSvg = dismissIcon.querySelector('svg');
            if (dismissSvg) {
                dismissSvg.style.removeProperty('transform');
                dismissSvg.style.removeProperty('transition');
            }
            
            // 淨空後，再由手勢數學接管透明度
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
    // 🟢 改用 window.appRailwayData
    const filtered = window.appRailwayData.filter(line =>
        line.name.toLowerCase().includes(lowKeyword) ||
        (line.kana && line.kana.toLowerCase().includes(lowKeyword)) // 加了容錯避免 kana 沒填
    );
    renderCards(filtered);
}

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

// 🟢 系統啟動引擎 (非同步合併資料)
async function initApp() {
    // 1. 背景默默抓取使用者的自訂補丁
    const userPrefs = await getAllUserPreferences();

    // 2. Base + Patch 疊加合併
    window.appRailwayData = railwayData.map(route => {
        const pref = userPrefs[route.id];
        if (pref) {
            return {
                ...route,
                name: pref.customName || route.name,
                hex: pref.customHex || route.hex
            };
        }
        return route;
    });

    // 3. 用「合併後的資料」來生成畫面
    renderCards(window.appRailwayData);
    initBottomCard();
    initDismissIcon();
}

// 因為 script type="module" 會延遲執行，這裡可以直接呼叫啟動
initApp();

document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

// 將模組內的函數暴露給全域
window.handleBottomCardClick = handleBottomCardClick;
window.handleOverlayClick = handleOverlayClick;

// ============================================================================
// 🟢 3D 翻轉萬用空白彈窗引擎 (原生膠囊模組接管 + 零衝突版)
// ============================================================================

// 🔧 【箭頭 SVG 旋轉角度設定】
window.DISMISS_ICON_TARGET_ROTATION = 90;

window.openBlankOverlay = function (hexColor) {
    if (document.getElementById('dynamic-blank-overlay') || window.isFlipAnimating) return;
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
    overlay.id = 'dynamic-blank-overlay';
    overlay.className = 'detail-overlay active';

    const container = document.createElement('div');
    container.className = 'perspective-container is-flipping';
    container.style.cssText = 'width: 100%; display: flex; justify-content: center; margin-top: calc(env(safe-area-inset-top) + 160px);';

    const card = document.createElement('div');
    card.className = 'detail-card-inner flip-in-start';
    applyThemeToCard(card, hexColor);

    container.appendChild(card);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (!e.target.closest('.detail-card-inner')) window.closeBlankOverlay();
    });

    const clearInlineStyles = (el) => {
        if (!el) return;
        el.style.removeProperty('transform');
        el.style.removeProperty('transition');
        el.style.removeProperty('box-shadow');
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform-origin');
    };

    // =========================================================
    // 🟢 邊緣手勢引擎 (右 ➔ 左)
    // =========================================================
    let swipeStartX = 0;
    let swipeStartY = 0;
    let isSwiping = false;
    let swipeLocked = false;

    const swipeTolerance = 0.6;
    const triggerThreshold = window.innerWidth / 3;

    overlay.addEventListener('touchstart', (e) => {
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

            // 🟢 1/3 螢幕強制接管：成功關閉
            if (Math.abs(deltaX) >= triggerThreshold) {
                isSwiping = false;
                container.classList.remove('is-swiping');

                // 放手瞬間：立刻把手動寫入的膠囊偏移清空，還給系統乾淨的狀態！
                clearInlineStyles(card);
                clearInlineStyles(leftBtn);
                clearInlineStyles(rightBtn);

                // 呼叫樞紐並告知 isFromGesture = true
                window.closeBlankOverlay(true);
                return;
            }

            // 🟢 尚未超過 1/3 時的跟手連動邏輯
            card.classList.add('hardware-accelerated');
            container.classList.add('is-flipping');
            container.classList.add('is-swiping');

            card.style.setProperty('transition', 'none', 'important');
            card.style.setProperty('transform', `scale(1) rotateY(${-90 * progress}deg)`, 'important');
            const shadowFadeProgress = Math.min(progress * 2, 1);
            card.style.setProperty('box-shadow', `0 20px 40px rgba(0,0,0,${0.2 * (1 - shadowFadeProgress)})`, 'important');
            container.style.setProperty('--swipe-shadow-opacity', `${shadowFadeProgress}`, 'important');

            // 手勢拉動時：膠囊按鈕跟隨位移
            if (leftBtn && rightBtn) {
                leftBtn.style.setProperty('transition', 'none', 'important');
                leftBtn.style.setProperty('transform', `translateX(${-30 * progress}px)`, 'important');
                rightBtn.style.setProperty('transition', 'none', 'important');
                rightBtn.style.setProperty('transform', `translateX(${-30 * progress}px)`, 'important');
            }

            // 箭頭 SVG 旋轉聯動
            if (dismissIcon) {
                // 解除 !important 鎖定，讓後續的下拉手勢能夠再次接管 opacity
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
        if (!isSwiping) {
            swipeStartX = 0;
            return;
        }
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

        // 🟢 未達 1/3 但鬆手判定成功
        if (flippedDegrees > 20 || deltaX < -50) {
            container.classList.remove('is-swiping');

            // 放手瞬間：把手動寫入的膠囊偏移清空
            clearInlineStyles(card);
            clearInlineStyles(leftBtn);
            clearInlineStyles(rightBtn);

            // 呼叫樞紐並告知 isFromGesture = true
            window.closeBlankOverlay(true);
        } else {
            // 🟢 取消關閉：Q彈回歸完全打開的狀態
            container.classList.remove('is-swiping');
            container.classList.remove('is-flipping');
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
    // =========================================================

    originalContainer.classList.add('perspective-container', 'is-flipping');
    originalInner.classList.remove('flip-back-in');
    originalInner.classList.add('flip-out');
    originalInner.classList.add('hardware-accelerated');
    card.classList.add('hardware-accelerated');

    if (window.slideCapsuleMode) window.slideCapsuleMode(true);

    const dismissIcon = document.getElementById('dismiss-icon');
    const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;

    if (dismissIcon) {
        // 解除 !important 鎖定，讓後續的下拉手勢能夠再次接管 opacity
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

// ============================================================================
// 🟢 空白彈窗關閉樞紐 (將動畫權限 100% 歸還原生模組)
// ============================================================================

window.closeBlankOverlay = function (isFromGesture = false) {
    if (window.isFlipAnimating) return;
    window.isFlipAnimating = true;

    const overlay = document.getElementById('dynamic-blank-overlay');
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

    // 🟢 解法核心：無論是手勢還是點擊，通通觸發原生的膠囊切換！絕不自己動手改 SVG！
    if (window.slideCapsuleMode) {
        window.slideCapsuleMode(false);
    }

    const dismissIcon = document.getElementById('dismiss-icon');
    const dismissSvg = dismissIcon ? dismissIcon.querySelector('svg') : null;

    // 箭頭 SVG 旋轉聯動
    if (dismissIcon) {
        // 先移除可能殘留的 !important，再乾淨地賦予 1
        dismissIcon.style.removeProperty('opacity');
        dismissIcon.style.opacity = '1';
    }

    if (dismissSvg) {
        dismissSvg.style.setProperty('transform-origin', '50% 50%', 'important');
        // 如果是點擊進來的，因為它沒有被手勢帶著轉，所以我們要在這裡強制給它 90 度的起跑點
        if (!isFromGesture) {
            dismissSvg.style.setProperty('transition', 'none', 'important');
            dismissSvg.style.setProperty('transform', `rotate(${window.DISMISS_ICON_TARGET_ROTATION}deg)`, 'important');
            void dismissSvg.offsetWidth; // 強制重繪
        }

        // 開始平滑轉正
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

            // 🟢 徹底清理我們的盾牌，把原生權限還給 physics.js 和 header.js
            if (dismissIcon) {
                // 不使用 removeProperty，直接給 1 讓 physics.js 接手不消失
                dismissIcon.style.opacity = '1';
            }
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