// buses.js - 公車資料模組（搜尋、快取、卡面格式與詳細面板）
// 原則：預設不主動請求公車 API，只有「使用者搜尋當下」與「牌組內已有儲存的公車路線」才發送請求。

const BUS_API_BASE = 'https://api.tsukinkanban.com/api/bus';
const BUS_CACHE_KEY = 'Tsukin_Cached_BusData';
const BUS_PREFS_KEY = 'Tsukin_Bus_Prefs';
const BUS_REFRESH_MIN_MS = 60000; // 後端建議輪詢間隔 >= 60 秒

// 業者識別色
const OPERATOR_COLORS = {
    Toei: '#2E7D32',
    YokohamaMunicipal: '#0068B7',
    SeibuBus: '#5CA028'
};

// targetId 格式：bus:{業者ID}:{路線官方表記}
// 含「:」可避開 db.js 的航班名稱校正，也不會被誤判為航班卡片
export function makeBusTargetId(operator, route) {
    return `bus:${operator}:${route}`;
}

export function isBusTargetId(id) {
    return typeof id === 'string' && id.startsWith('bus:');
}

function parseBusTargetId(targetId) {
    const parts = targetId.split(':');
    return { operator: parts[1] || '', route: parts.slice(2).join(':') || '' };
}

// ============================================================================
// 全域快取
// GlobalBusData：targetId -> 業者結果（含 patterns）
// GlobalBusStopData：stopKey -> 站牌查詢結果（不持久化，僅搜尋當下使用）
// ============================================================================
window.GlobalBusData = window.GlobalBusData || {};
window.GlobalBusStopData = window.GlobalBusStopData || {};

export function initBuses() {
    // 只還原本地快取，不發送任何請求
    try {
        const cached = localStorage.getItem(BUS_CACHE_KEY);
        if (cached) window.GlobalBusData = JSON.parse(cached);
    } catch (e) { }
}

function persistBusCache() {
    try {
        localStorage.setItem(BUS_CACHE_KEY, JSON.stringify(window.GlobalBusData));
    } catch (e) { }
}

// ============================================================================
// 每條公車路線的顯示偏好（方向、預覽停留所、收折狀態），以 targetId 為 key
// ============================================================================
export function getBusPrefs(targetId) {
    try {
        const all = JSON.parse(localStorage.getItem(BUS_PREFS_KEY) || '{}');
        return Object.assign({ dir: 0, previewStops: [], collapsed: false }, all[targetId] || {});
    } catch (e) {
        return { dir: 0, previewStops: [], collapsed: false };
    }
}

export function saveBusPrefs(targetId, prefs) {
    try {
        const all = JSON.parse(localStorage.getItem(BUS_PREFS_KEY) || '{}');
        all[targetId] = prefs;
        localStorage.setItem(BUS_PREFS_KEY, JSON.stringify(all));
    } catch (e) { }
}

// ============================================================================
// API 請求
// ============================================================================
async function fetchBusApi(path) {
    try {
        const res = await fetch(`${BUS_API_BASE}${path}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

// 將一次路線查詢的回應寫入快取（每個命中的業者各一筆）
function storeRouteResults(json) {
    const stored = [];
    if (!json || !Array.isArray(json.results)) return stored;
    json.results.forEach(result => {
        const routeName = extractRouteName(result, json.query);
        const targetId = makeBusTargetId(result.operator, routeName);
        window.GlobalBusData[targetId] = Object.assign({}, result, {
            routeName: routeName,
            fetchedAt: Date.now()
        });
        stored.push(targetId);
    });
    if (stored.length > 0) persistBusCache();
    return stored;
}

// 從業者結果推出路線顯示名（pattern 標題格式為「路線名 行き先行」）
function extractRouteName(result, fallback) {
    if (result.patterns && result.patterns.length > 0) {
        const title = result.patterns[0].title || '';
        const firstSpace = title.indexOf(' ');
        if (firstSpace > 0) return title.slice(0, firstSpace);
        if (title) return title;
    }
    return fallback || '';
}

// 方向標籤：只顯示終點方向，不重複路線名
function directionLabel(pattern, routeName) {
    const title = pattern.title || '';
    if (routeName && title.startsWith(routeName)) {
        const rest = title.slice(routeName.length).trim();
        if (rest) return rest;
    }
    const firstSpace = title.indexOf(' ');
    if (firstSpace > 0) return title.slice(firstSpace + 1).trim();
    return title || '方向';
}

// ============================================================================
// 運行狀態判定：running（有車）／waiting（無車、有次発）／ended（本日運行終了）
// ============================================================================
function patternServiceState(pattern) {
    if (!pattern) return { state: 'unknown', nextText: '' };
    if ((pattern.bus_count || 0) > 0) return { state: 'running', nextText: '' };

    const stopWithNext = (pattern.stops || []).find(s => s.next_text);
    if (stopWithNext) return { state: 'waiting', nextText: stopWithNext.next_text };
    return { state: 'ended', nextText: '' };
}

// ============================================================================
// 搜尋整合：由 filterCards 呼叫
// 250ms debounce，路線與站牌並行查詢，查詢期間先顯示載入中的佔位項目
// ============================================================================
let busSearchTimer = null;
const busSearchCache = {}; // keyword -> { ts, routeIds, stopKeys, error }

export function searchBusesDebounced(rawKeyword) {
    if (busSearchTimer) clearTimeout(busSearchTimer);
    const keyword = (rawKeyword || '').trim();
    if (keyword.length < 2) return; // 太短的字串不打 API

    // 60 秒內的快取直接渲染，不再請求
    const cached = busSearchCache[keyword];
    if (cached && Date.now() - cached.ts < 60000) {
        renderBusSearchResults(keyword, cached);
        return;
    }

    // 立即顯示載入中佔位，縮短體感等待
    showBusSearchLoading();

    busSearchTimer = setTimeout(async () => {
        // 路線與站牌並行查詢
        const [routeJson, stopJson] = await Promise.all([
            fetchBusApi(`/route/${encodeURIComponent(keyword)}`),
            fetchBusApi(`/stop/${encodeURIComponent(keyword)}`)
        ]);

        // 使用者已改變搜尋內容 → 丟棄本次結果
        const input = document.getElementById('search-input');
        if (!input || input.value.trim() !== keyword) return;

        const entry = { ts: Date.now(), routeIds: [], stopKeys: [], error: false };

        if ((routeJson && routeJson.error) || (stopJson && stopJson.error)) {
            entry.error = true;
        }
        if (routeJson && !routeJson.error) {
            entry.routeIds = storeRouteResults(routeJson);
        }
        if (stopJson && !stopJson.error && Array.isArray(stopJson.results)) {
            stopJson.results.forEach(result => {
                (result.stops || []).forEach(stop => {
                    const key = `busstop:${result.operator}:${stop.name}`;
                    window.GlobalBusStopData[key] = {
                        operator: result.operator,
                        label: result.label,
                        url: result.url,
                        source: result.source,
                        stopName: stop.name,
                        stop: stop
                    };
                    entry.stopKeys.push(key);
                });
            });
        }

        busSearchCache[keyword] = entry;
        renderBusSearchResults(keyword, entry);
    }, 250);
}

function showBusSearchLoading() {
    const dropdown = document.getElementById('home-search-dropdown');
    if (!dropdown || dropdown.style.display === 'none') return;
    dropdown.querySelectorAll('.bus-search-item').forEach(el => el.remove());

    const loading = document.createElement('div');
    loading.className = 'search-result-item bus-search-item bus-search-loading';
    loading.innerHTML = `<div class="search-result-title" style="opacity: 0.55;">バスを検索中...</div>`;
    dropdown.appendChild(loading);
}

// 將公車結果補進既有的搜尋下拉選單（不動鐵道與航班的結果）
function renderBusSearchResults(keyword, entry) {
    const dropdown = document.getElementById('home-search-dropdown');
    if (!dropdown || dropdown.style.display === 'none') return;

    // 清掉上一輪的公車結果與載入中佔位
    dropdown.querySelectorAll('.bus-search-item').forEach(el => el.remove());

    if (entry.error && entry.routeIds.length === 0 && entry.stopKeys.length === 0) {
        const notice = document.createElement('div');
        notice.className = 'search-result-item bus-search-item';
        notice.innerHTML = `<div class="search-result-title" style="opacity: 0.7;">バス情報を初期化中です。しばらくしてから再検索してください。</div>`;
        dropdown.appendChild(notice);
        return;
    }

    if (entry.routeIds.length === 0 && entry.stopKeys.length === 0) return;

    // 有公車結果時，移除「該当する路線が見つかりません」的空狀態
    const empty = dropdown.querySelector('.search-empty-state');
    if (empty) empty.remove();

    // 路線結果
    entry.routeIds.forEach(targetId => {
        const data = window.GlobalBusData[targetId];
        if (!data) return;

        const patternCount = (data.patterns || []).length;
        const busCount = (data.patterns || []).reduce((sum, p) => sum + (p.bus_count || 0), 0);
        const rightText = busCount > 0 ? `運行中 ${busCount}台` : `${patternCount}方向`;

        const item = document.createElement('div');
        item.className = 'search-result-item bus-search-item';
        item.style.cursor = 'pointer';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div class="search-result-title">${data.routeName}</div>
                    <div class="search-result-subtitle">${data.label}</div>
                </div>
                <div class="bus-search-right">${rightText}</div>
            </div>
        `;
        item.onclick = () => window.previewBusFromSearch(targetId);
        dropdown.appendChild(item);
    });

    // 站牌結果：直接看該站所有停靠路線
    entry.stopKeys.forEach(stopKey => {
        const data = window.GlobalBusStopData[stopKey];
        if (!data) return;

        const routeCount = (data.stop.poles || []).reduce((sum, p) => sum + (p.routes || []).length, 0);

        const item = document.createElement('div');
        item.className = 'search-result-item bus-search-item';
        item.style.cursor = 'pointer';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div class="search-result-title">${data.stopName}</div>
                    <div class="search-result-subtitle">バス停・${data.label}</div>
                </div>
                <div class="bus-search-right">${routeCount}路線</div>
            </div>
        `;
        item.onclick = () => window.previewBusStopFromSearch(stopKey);
        dropdown.appendChild(item);
    });
}

// ============================================================================
// 已儲存公車路線的背景更新
// 掃描所有卡片的 targetLineIds（含混合卡片內的公車路線），無公車路線時不發送請求
// ============================================================================
let isRefreshingBus = false;

export async function refreshSavedBusRoutes() {
    if (isRefreshingBus) return;

    const savedTargets = new Set();
    (window.appRailwayData || []).forEach(card => {
        if (card.id.startsWith('temp-search')) return;
        (card.targetLineIds || []).forEach(id => {
            if (isBusTargetId(id)) savedTargets.add(id);
        });
    });
    if (savedTargets.size === 0) return;

    isRefreshingBus = true;
    let changed = false;

    try {
        for (const targetId of savedTargets) {
            const cached = window.GlobalBusData[targetId];
            if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < BUS_REFRESH_MIN_MS) continue;

            const { operator, route } = parseBusTargetId(targetId);
            const json = await fetchBusApi(`/route/${encodeURIComponent(route)}`);
            if (!json || json.error || !Array.isArray(json.results)) continue;

            const match = json.results.find(r => r.operator === operator);
            if (match) {
                window.GlobalBusData[targetId] = Object.assign({}, match, {
                    routeName: extractRouteName(match, route),
                    fetchedAt: Date.now()
                });
                changed = true;
            }
        }
    } finally {
        isRefreshingBus = false;
    }

    if (changed) {
        persistBusCache();
        window.dispatchEvent(new CustomEvent('busDataUpdated'));
    }
}

// ============================================================================
// 卡面資料格式：給 buildAndRender 使用（對應航班的 generateFlightDataFormat）
// 無車時亮起注意燈並顯示狀態（次発待ち／本日運行終了）
// ============================================================================
export function generateBusDataFormat(targetId) {
    const { operator, route } = parseBusTargetId(targetId);
    const cached = window.GlobalBusData[targetId];

    let flags = [false, false, false, false, false, false, true]; // 預設灰色注意燈
    let desc = 'バス情報を取得しています...';
    let updateTime = '--:--';

    if (cached && cached.patterns && cached.patterns.length > 0) {
        const prefs = getBusPrefs(targetId);
        const pattern = cached.patterns[Math.min(prefs.dir, cached.patterns.length - 1)];
        const service = patternServiceState(pattern);
        const isRealtime = (cached.source || '').includes('リアルタイム');

        if (service.state === 'running') {
            flags = [false, false, false, false, false, isRealtime, !isRealtime];
            desc = getPreviewStopInfo(targetId, cached) || `${cached.label}（${cached.source || 'データなし'}）`;
        } else if (service.state === 'waiting') {
            // 無車輛（首班未發車或班距空窗）：亮注意燈
            flags = [false, false, false, false, false, false, true];
            const preview = getPreviewStopInfo(targetId, cached);
            desc = preview
                ? `運行中の車両なし・${preview}`
                : `運行中の車両なし・次発 ${service.nextText}`;
        } else {
            // 末班已駛離：本日運行終了
            flags = [false, false, false, false, false, false, true];
            desc = '本日の運行は終了しました';
        }

        if (cached.fetchedAt) {
            const d = new Date(cached.fetchedAt);
            updateTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
    }

    return {
        flags: flags,
        desc: desc,
        updateTime: updateTime,
        busData: cached || { operator: operator, routeName: route, label: 'バス', source: '', url: '', patterns: [] },
        hex: OPERATOR_COLORS[operator] || '#2E7D32'
    };
}

// 取得預覽停留所（或起點站）的到站摘要文字
function getPreviewStopInfo(targetId, busData) {
    const prefs = getBusPrefs(targetId);
    const patterns = busData.patterns || [];
    if (patterns.length === 0) return '';
    const pattern = patterns[Math.min(prefs.dir, patterns.length - 1)];
    if (!pattern || !pattern.stops) return '';

    let stop = null;
    if (prefs.previewStops.length > 0) {
        stop = pattern.stops.find(s => prefs.previewStops.includes(s.name));
    }
    if (!stop) stop = pattern.stops[0];
    if (!stop) return '';

    const eta = stop.eta_text ? stop.eta_text : (stop.next_text ? `次発 ${stop.next_text}` : '');
    return eta ? `${stop.name}：${eta}` : '';
}

// 混合卡片（鐵道卡內的公車路線）用：生成一筆 detailedLine 摘要
export function generateBusLineSummary(targetId) {
    const fmt = generateBusDataFormat(targetId);
    const bd = fmt.busData;
    const hasData = bd.patterns && bd.patterns.length > 0;

    let status = '更新中...';
    if (hasData) {
        const prefs = getBusPrefs(targetId);
        const pattern = bd.patterns[Math.min(prefs.dir, bd.patterns.length - 1)];
        const service = patternServiceState(pattern);
        if (service.state === 'running') status = bd.source || 'バス';
        else if (service.state === 'waiting') status = '車両なし';
        else status = '運行終了';
    }

    return {
        id: targetId,
        name: bd.routeName || targetId,
        company: bd.label || 'バス',
        status: status,
        message: hasData ? fmt.desc : 'バス情報を取得しています...',
        delay: 0,
        updateTime: fmt.updateTime,
        url: bd.url || '',
        isDelayed: false,
        isError: false,
        isAttention: !hasData,
        advancedDetails: [],
        isBusLine: true,
        hasData: hasData
    };
}

// 業者識別色（新卡片預設色用）
export function getBusOperatorColor(operator) {
    return OPERATOR_COLORS[operator] || '#2E7D32';
}

// ============================================================================
// 共用：到站時間膠囊（每個停留所的時間獨立包起來）
// 顏色三段：倒數中（あと○分／まもなく）→ soon、已發車尚遠（HH:MM頃）→ run、
// 未發車（表定次発）→ sched（灰色）
// ============================================================================
function etaPillHtml(etaText, nextText) {
    if (etaText) {
        const isCountdown = etaText.includes('あと') || etaText.includes('まもなく');
        return `<span class="bus-eta-pill ${isCountdown ? 'soon' : 'run'}">${etaText}</span>`;
    }
    if (nextText) return `<span class="bus-eta-pill sched">次発 ${nextText}</span>`;
    return `<span class="bus-eta-pill none">--</span>`;
}

// ============================================================================
// 共用：站名顯示
// 過長時：有括弧 → 括弧部分跑馬燈；無括弧 → 整個站名跑馬燈
// ============================================================================
function stopNameHtml(name) {
    const m = (name || '').match(/^([^（(]+)([（(].*)$/);
    const main = m ? m[1] : '';
    const scrollPart = m ? m[2] : (name || '');
    return `<span class="bus-stop-name">${main ? `<span class="bus-name-main">${main}</span>` : ''}<span class="bus-name-scroll"><span class="bus-name-inner">${scrollPart}</span></span></span>`;
}

// 渲染完成後量測：只有實際溢出的部分才啟動跑馬燈
function applyMarquees(root) {
    requestAnimationFrame(() => {
        root.querySelectorAll('.bus-name-scroll').forEach(sc => {
            const inner = sc.querySelector('.bus-name-inner');
            if (!inner) return;
            const overflow = inner.scrollWidth - sc.clientWidth;
            if (overflow > 4) {
                sc.classList.add('marquee');
                inner.style.setProperty('--marquee-shift', `-${overflow}px`);
                inner.style.setProperty('--marquee-dur', `${Math.max(4, Math.round(overflow / 12))}s`);
            }
        });
    });
}

// ============================================================================
// 預覽停留所選擇：與「既存カード追加」相同的 iOS 對話框樣式
// ============================================================================
function openStopPickerDialog(pattern, currentStops, onDone) {
    if (!window.iosConfirm) return;

    const picked = currentStops.slice(0, 2);

    let html = `<div style="margin-bottom: 12px; font-size: 0.85rem; opacity: 0.8;">プレビューに表示する停留所を<br>選択してください（最大2つ）</div>`;
    html += `<div id="bus-stop-picker-list" style="max-height: 40vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; text-align: left;">`;
    (pattern.stops || []).forEach((s, i) => {
        html += `
            <button type="button" class="bus-picker-item" data-stop-index="${i}">
                <span class="bus-picker-name">${s.name}</span>
                <span class="bus-picker-dot"></span>
            </button>
        `;
    });
    html += `</div>`;

    // 對話框渲染後綁定點擊（與 RouteAppender 相同做法）
    setTimeout(() => {
        const list = document.getElementById('bus-stop-picker-list');
        if (!list) return;
        const items = [...list.querySelectorAll('.bus-picker-item')];

        const sync = () => {
            items.forEach(btn => {
                const nm = (pattern.stops[parseInt(btn.dataset.stopIndex, 10)] || {}).name;
                btn.classList.toggle('selected', picked.includes(nm));
            });
        };
        sync();

        items.forEach(btn => {
            btn.onclick = () => {
                const nm = (pattern.stops[parseInt(btn.dataset.stopIndex, 10)] || {}).name;
                if (!nm) return;
                const idx = picked.indexOf(nm);
                if (idx !== -1) {
                    picked.splice(idx, 1);
                } else {
                    if (picked.length >= 2) picked.shift(); // 超過 2 個時淘汰最早選的
                    picked.push(nm);
                }
                if (navigator.vibrate) navigator.vibrate(10);
                sync();
            };
        });
    }, 60);

    window.iosConfirm('プレビュー停留所', html, '決定', 'キャンセル').then(ok => {
        if (ok) onDone(picked.slice(0, 2));
    });
}

// ============================================================================
// 路線詳細面板：方向切換塊、停留所列表、收折／預覽停留所
// ============================================================================
export function renderBusDetailPanel(data, scrollWrapper, opts = {}) {
    const targetId = (data.targetLineIds && data.targetLineIds[0]) || '';
    const prefs = getBusPrefs(targetId);
    let slideDir = ''; // 方向切換的進場動畫方向（'left' | 'right'）

    const container = document.createElement('div');
    container.className = 'bus-panel-container';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 14px;';
    scrollWrapper.appendChild(container);

    // 讓背景更新可以刷新開啟中的面板
    window.__busPanelRefresh = () => {
        const latest = window.GlobalBusData[targetId];
        if (latest) data.busData = latest;
        render();
    };

    const chevronDown = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="m6 9 6 6 6-6"/></svg>`;
    const chevronUp = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="m18 15-6-6-6 6"/></svg>`;

    function getPatterns() {
        return (data.busData && data.busData.patterns) || [];
    }

    function currentDirIndex() {
        const patterns = getPatterns();
        return patterns.length > 0 ? Math.min(prefs.dir, patterns.length - 1) : 0;
    }

    // 方向切換（滑動塊點擊與列表左右滑共用）
    function switchDir(newIndex) {
        const patterns = getPatterns();
        if (patterns.length < 2) return;
        const cur = currentDirIndex();
        const next = (newIndex + patterns.length) % patterns.length;
        if (next === cur) return;

        slideDir = next > cur ? 'left' : 'right';
        prefs.dir = next;
        saveBusPrefs(targetId, prefs);
        if (navigator.vibrate) navigator.vibrate(10);
        render();
    }

    // 在停留所列表上左右滑切換方向
    let touchStartX = 0, touchStartY = 0, touchTracking = false;
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) { touchTracking = false; return; }
        touchTracking = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    container.addEventListener('touchend', (e) => {
        if (!touchTracking) return;
        touchTracking = false;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 60 && Math.abs(dy) < 50) {
            switchDir(currentDirIndex() + (dx < 0 ? 1 : -1));
        }
    }, { passive: true });

    function render() {
        container.innerHTML = '';
        const busData = data.busData || {};
        const patterns = getPatterns();
        const dirIndex = currentDirIndex();
        const pattern = patterns.length > 0 ? patterns[dirIndex] : null;

        // --- 無資料的空狀態 ---
        if (!pattern) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'extension-route-card';
            emptyCard.style.cssText = 'padding: 32px 20px; text-align: center;';
            emptyCard.innerHTML = `
                <div style="font-weight: 700; opacity: 0.8;">バス情報を取得しています...</div>
                <div style="font-size: 0.85em; margin-top: 8px; opacity: 0.6;">初期化中の場合は数秒後に再度お試しください</div>
            `;
            container.appendChild(emptyCard);
            appendActionButtons();
            return;
        }

        // --- 1. 方向切換塊（只標示終點方向） ---
        const slider = document.createElement('div');
        slider.className = 'bus-dir-slider';
        let activeBtn = null;
        patterns.forEach((p, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bus-dir-btn' + (i === dirIndex ? ' active' : '');
            btn.textContent = directionLabel(p, busData.routeName);
            btn.onclick = (e) => {
                e.stopPropagation();
                switchDir(i);
            };
            if (i === dirIndex) activeBtn = btn;
            slider.appendChild(btn);
        });
        container.appendChild(slider);

        // 讓目前方向的按鈕自動捲到可視範圍中央
        if (activeBtn) {
            requestAnimationFrame(() => {
                slider.scrollTo({
                    left: activeBtn.offsetLeft - slider.clientWidth / 2 + activeBtn.clientWidth / 2,
                    behavior: 'smooth'
                });
            });
        }

        // --- 2. 停留所列表（不包外框，時間獨立成膠囊） ---
        const stopsList = document.createElement('div');
        stopsList.className = 'bus-stops-list';

        // 方向切換的進場動畫
        if (slideDir) {
            stopsList.classList.add(slideDir === 'left' ? 'bus-slide-in-left' : 'bus-slide-in-right');
            slideDir = '';
        }

        const isCollapsedView = prefs.collapsed && prefs.previewStops.length > 0;
        const stopsToShow = isCollapsedView
            ? pattern.stops.filter(s => prefs.previewStops.includes(s.name))
            : pattern.stops;

        if (isCollapsedView && stopsToShow.length === 0) {
            const none = document.createElement('div');
            none.className = 'bus-select-hint';
            none.textContent = '選択した停留所はこの方向にありません';
            stopsList.appendChild(none);
        }

        stopsToShow.forEach(stop => {
            // 有巴士行駛在前一站與本站之間時，於該站上方以文字標示
            if (stop.buses_approaching && stop.buses_approaching.length > 0) {
                stop.buses_approaching.forEach(bus => {
                    const marker = document.createElement('div');
                    marker.className = 'bus-marker-row';
                    const occText = bus.occupancy ? `（${bus.occupancy}）` : '';
                    marker.textContent = `走行中 ${bus.number || ''}${occText}`;
                    stopsList.appendChild(marker);
                });
            }

            const row = document.createElement('div');
            row.className = 'bus-stop-row';

            const isPreviewStop = prefs.previewStops.includes(stop.name);
            row.innerHTML = `
                <span class="bus-stop-dot${isPreviewStop ? ' selected' : ''}"></span>
                ${stopNameHtml(stop.name)}
                ${etaPillHtml(stop.eta_text, stop.next_text)}
            `;
            stopsList.appendChild(row);
        });

        container.appendChild(stopsList);
        applyMarquees(stopsList);

        // --- 3. 收折按鈕 ---
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'flight-action-btn bus-toggle-btn';

        const openPicker = () => {
            openStopPickerDialog(pattern, prefs.previewStops, (picked) => {
                prefs.previewStops = picked;
                prefs.collapsed = picked.length > 0;
                saveBusPrefs(targetId, prefs);
                if (navigator.vibrate) navigator.vibrate(20);
                render();
            });
        };

        if (isCollapsedView) {
            toggleBtn.innerHTML = `${chevronDown}<span>すべての停留所を表示</span>`;
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                prefs.collapsed = false;
                saveBusPrefs(targetId, prefs);
                render();
            };
        } else if (prefs.previewStops.length > 0) {
            toggleBtn.innerHTML = `${chevronUp}<span>プレビュー表示に折りたたむ</span>`;
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                prefs.collapsed = true;
                saveBusPrefs(targetId, prefs);
                render();
            };
        } else {
            toggleBtn.innerHTML = `${chevronUp}<span>プレビュー停留所を選ぶ</span>`;
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                openPicker();
            };
        }
        container.appendChild(toggleBtn);

        // 已有預覽站且為展開狀態時，提供重新選擇入口
        if (!isCollapsedView && prefs.previewStops.length > 0) {
            const changeBtn = document.createElement('button');
            changeBtn.type = 'button';
            changeBtn.className = 'bus-change-preview-btn';
            changeBtn.textContent = `プレビュー停留所を変更（現在：${prefs.previewStops.join('、')}）`;
            changeBtn.onclick = (e) => {
                e.stopPropagation();
                openPicker();
            };
            container.appendChild(changeBtn);
        }

        appendActionButtons();
    }

    // 底部動作按鈕：與列車預覽一致（既存カード追加／新規カード作成）
    // 官方網站連結由膠囊按鈕（與列車卡片相同）提供，不在面板內顯示
    function appendActionButtons() {
        if (!opts.isPreview) return;

        const btnContainer = document.createElement('div');
        btnContainer.className = 'flight-action-buttons-container';

        const iconListPlus = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>`;
        const iconSquarePlus = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

        const makeBtn = (iconHtml, text, onClick) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'flight-action-btn';
            btn.innerHTML = `${iconHtml}<span style="font-size: 0.9em; letter-spacing: -0.5px;">${text}</span>`;
            btn.onclick = (e) => {
                e.stopPropagation();
                onClick();
            };
            return btn;
        };

        if (typeof opts.onAddToExisting === 'function') {
            btnContainer.appendChild(makeBtn(iconListPlus, '既存カード追加', opts.onAddToExisting));
        }
        if (typeof opts.onCreateCard === 'function') {
            btnContainer.appendChild(makeBtn(iconSquarePlus, '新規カード作成', opts.onCreateCard));
        }

        if (btnContainer.children.length > 0) container.appendChild(btnContainer);
    }

    render();
}

// ============================================================================
// 站牌詳細面板：列出該站牌每條路線的到站資訊（僅供查看）
// ============================================================================
export function renderBusStopPanel(data, scrollWrapper) {
    const stopData = data.busStopData || {};
    const poles = (stopData.stop && stopData.stop.poles) || [];

    const container = document.createElement('div');
    container.className = 'bus-panel-container';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 14px;';
    scrollWrapper.appendChild(container);

    if (poles.length === 0) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'extension-route-card';
        emptyCard.style.cssText = 'padding: 32px 20px; text-align: center;';
        emptyCard.innerHTML = `<div style="font-weight: 700; opacity: 0.8;">この停留所の情報を取得できません</div>`;
        container.appendChild(emptyCard);
        return;
    }

    poles.forEach(pole => {
        const list = document.createElement('div');
        list.className = 'bus-stops-list';

        // 乘車處編號（有資料時才顯示）
        if (pole.pole_no) {
            const heading = document.createElement('div');
            heading.className = 'bus-pole-heading';
            heading.textContent = `${pole.pole_no}番のりば`;
            list.appendChild(heading);
        }

        (pole.routes || []).forEach(route => {
            const row = document.createElement('div');
            row.className = 'bus-stop-row';

            // 到站資訊優先序：即時 ETA → 走行中位置 → 表定次発 → 運行終了
            let pill;
            const firstBus = (route.buses || [])[0];
            const firstDep = (route.departures_text || [])[0];
            if (firstBus && firstBus.eta_text) {
                const isCountdown = firstBus.eta_text.includes('あと') || firstBus.eta_text.includes('まもなく');
                pill = `<span class="bus-eta-pill ${isCountdown ? 'soon' : 'run'}">${firstBus.eta_text}</span>`;
            } else if (firstBus && typeof firstBus.stops_away === 'number') {
                pill = `<span class="bus-eta-pill run">${firstBus.stops_away === 0 ? 'まもなく' : `${firstBus.stops_away}停留所前`}</span>`;
            } else if (firstDep) {
                pill = `<span class="bus-eta-pill sched">次発 ${firstDep}</span>`;
            } else {
                pill = `<span class="bus-eta-pill none">運行終了</span>`;
            }

            const displayName = route.destination ? `${route.route}（${route.destination}）` : route.route;
            row.innerHTML = `
                <span class="bus-stop-dot"></span>
                ${stopNameHtml(displayName)}
                ${pill}
            `;
            list.appendChild(row);
        });

        container.appendChild(list);
        applyMarquees(list);
    });
}
