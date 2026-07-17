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

// 全形英數 → 半形（路線名顯示用；API 查詢不分全半形）
export function toHalfWidth(str) {
    return (str || '').replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
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
// 官方表記常用全形英數（都０１），顯示一律轉半形
function extractRouteName(result, fallback) {
    if (result.patterns && result.patterns.length > 0) {
        const title = toHalfWidth(result.patterns[0].title || '');
        const firstSpace = title.indexOf(' ');
        if (firstSpace > 0) return title.slice(0, firstSpace);
        if (title) return title;
    }
    return toHalfWidth(fallback || '');
}

// 方向標籤：只顯示終點方向，不重複路線名
function directionLabel(pattern, routeName) {
    const title = toHalfWidth(pattern.title || '');
    if (routeName && title.startsWith(routeName)) {
        const rest = title.slice(routeName.length).trim();
        if (rest) return rest;
    }
    const firstSpace = title.indexOf(' ');
    if (firstSpace > 0) return title.slice(firstSpace + 1).trim();
    return '';
}

// 一次算出所有方向的標籤：
// 部分業者（西武・横浜市営）的 title 只有路線名，各方向會長得一樣，
// 這種情況改抓該方向的終點站名自行標示
function directionLabels(patterns, routeName) {
    const raw = patterns.map(p => {
        const l = directionLabel(p, routeName);
        return (l && l !== routeName) ? l : '';
    });

    const counts = {};
    raw.forEach(l => { if (l) counts[l] = (counts[l] || 0) + 1; });

    return raw.map((l, i) => {
        if (!l || counts[l] > 1) {
            const stops = patterns[i].stops || [];
            const last = stops[stops.length - 1];
            if (last && last.name) return `${last.name}行`;
        }
        return l || `方向 ${i + 1}`;
    });
}

// ============================================================================
// 到站時間的即時換算
// 以 ISO 時間戳與當下時刻重新計算，而不是直接顯示後端算好的文字，
// 這樣離線或資料過期時，倒數仍會隨時間自然遞減，不會卡在舊的分鐘數
// ============================================================================
function liveEtaTexts(stop) {
    if (stop.eta) {
        const diffMin = Math.round((new Date(stop.eta).getTime() - Date.now()) / 60000);
        if (diffMin <= 1) return { eta: 'まもなく', next: null };
        if (diffMin <= 20) return { eta: `あと${diffMin}分`, next: null };
        const d = new Date(stop.eta);
        return { eta: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}頃`, next: null };
    }
    if (stop.eta_text) return { eta: stop.eta_text, next: null }; // 後端只給文字時直接沿用
    return { eta: null, next: stop.next_text || null };
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

    // 面板開啟中的公車路線（含預覽卡）也一併更新
    if (window.__busPanelTargetId && isBusTargetId(window.__busPanelTargetId)) {
        savedTargets.add(window.__busPanelTargetId);
    }

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

    const t = liveEtaTexts(stop);
    const eta = t.eta ? t.eta : (t.next ? `次発 ${t.next}` : '');
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
// 顏色分級：進站中（まもなく）→ arriving 橘、5 分內 → soon 黃、
// 倒數中（あと6分〜）→ near 綠、已發車尚遠（HH:MM頃）→ run 藍、
// 未發車（表定次発）→ sched 灰
// ============================================================================
function etaPillClass(etaText) {
    if (etaText.includes('まもなく')) return 'arriving';
    const m = etaText.match(/あと(\d+)分/);
    if (m) return parseInt(m[1], 10) <= 5 ? 'soon' : 'near';
    return 'run'; // HH:MM頃
}

function etaPillHtml(etaText, nextText) {
    if (etaText) {
        return `<span class="bus-eta-pill ${etaPillClass(etaText)}">${etaText}</span>`;
    }
    // 「次xx:xx」讓寬度與其他時間顯示一致
    if (nextText) return `<span class="bus-eta-pill sched">次${nextText}</span>`;
    return `<span class="bus-eta-pill none">--</span>`;
}

// 行駛中巴士標記：車牌＋擁擠度（満員／混雑等以顏色區分）＋表定偏差（±分）
// 偏差以「該站的即時預估 eta」與「表定時刻 next」推算：＋為延誤、－為提早
function busMarkerHtml(bus, stop) {
    let occHtml = '';
    if (bus.occupancy) {
        let occClass = '';
        if (bus.occupancy.includes('満員')) occClass = ' full';
        else if (bus.occupancy.includes('混雑')) occClass = ' crowded';
        else if (bus.occupancy.includes('立席')) occClass = ' standing';
        occHtml = `<span class="bus-occ${occClass}">${bus.occupancy}</span>`;
    }

    let diffHtml = '';
    if (stop && stop.eta && stop.next) {
        const diff = Math.round((new Date(stop.eta).getTime() - new Date(stop.next).getTime()) / 60000);
        // 偏差過大通常代表 next 已指向下一班，不顯示避免誤導
        if (diff !== 0 && Math.abs(diff) <= 30) {
            diffHtml = `<span class="bus-delay ${diff > 0 ? 'late' : 'early'}">${diff > 0 ? '+' : ''}${diff}分</span>`;
        }
    }

    return `<span class="bus-plate">${bus.number || ''}</span>${diffHtml}${occHtml}`;
}
// ============================================================================
// 共用：站名顯示
// 過長時：有括弧 → 括弧部分跑馬燈；無括弧 → 整個站名跑馬燈
// extraClass：接近中的站名上色（下一站橘色、下下站黃色）
// ============================================================================
function stopNameHtml(name, extraClass = '') {
    const m = (name || '').match(/^([^（(]+)([（(].*)$/);
    const main = m ? m[1] : '';
    const scrollPart = m ? m[2] : (name || '');
    return `<span class="bus-stop-name${extraClass ? ' ' + extraClass : ''}">${main ? `<span class="bus-name-main">${main}</span>` : ''}<span class="bus-name-scroll"><span class="bus-name-inner">${scrollPart}</span></span></span>`;
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

// 運行狀態卡的內容：與列車詳細面板的資訊卡（標題＋狀態徽章＋訊息）同構
function busServiceBannerInner(service, busData) {
    const isWaiting = service.state === 'waiting';
    const badgeText = isWaiting ? '車両なし' : '運行終了';
    const message = isWaiting
        ? `現在、運行中の車両はありません。次の発車は ${service.nextText} の予定です。`
        : '本日の運行は終了しました。';

    return `
        <div class="ext-card-header">
            <div class="ext-card-title-group">
                <div class="ext-route-name">運行状況</div>
                <div class="ext-route-company">${busData.label || 'バス'}</div>
            </div>
            <div class="ext-status-badge status-attention">${badgeText}</div>
        </div>
        <div class="ext-card-divider"></div>
        <div class="ext-card-message">${message}</div>
    `;
}

// ============================================================================
// 路線詳細面板：方向切換塊、停留所列表、收折／預覽停留所
// ============================================================================
export function renderBusDetailPanel(data, scrollWrapper, opts = {}) {
    const targetId = (data.targetLineIds && data.targetLineIds[0]) || '';
    const prefs = getBusPrefs(targetId);
    let slideDir = '';        // 方向切換的進場動畫方向（'left' | 'right'）
    let heightAnimFrom = -1;  // 收折／展開的高度過渡起點（-1 表示不做）
    let listShell = null;     // 停留所列表的外殼（高度動畫用）

    const container = document.createElement('div');
    container.className = 'bus-panel-container';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 14px;';
    scrollWrapper.appendChild(container);

    // 標記面板開啟中的路線：背景更新會將它納入抓取對象（含預覽卡）
    window.__busPanelTargetId = targetId;

    // 背景更新後：不整體重繪，改以就地更新讓資料自然過渡
    window.__busPanelRefresh = () => {
        const latest = window.GlobalBusData[targetId];
        if (latest) data.busData = latest;
        updateInPlace();
    };

    // 本地倒數：面板持續開啟時，每 30 秒依 ISO 時間重新換算到站分鐘數
    // （離線或資料過期時倒數仍會遞減，不會卡在舊的「あと5分」）
    if (window.__busPanelTicker) clearInterval(window.__busPanelTicker);
    window.__busPanelTicker = setInterval(() => {
        if (!container.isConnected) {
            clearInterval(window.__busPanelTicker);
            window.__busPanelTicker = null;
            if (window.__busPanelTargetId === targetId) window.__busPanelTargetId = null;
            return;
        }
        updateInPlace();
    }, 30000);

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

    // 收折／展開前記下目前列表高度，供高度過渡動畫使用
    function markHeightAnim() {
        if (listShell) heightAnimFrom = listShell.offsetHeight;
    }

    let lastMarkerSig = '';

    function markerSignature(view) {
        return view.stopsToShow.map(s =>
            (s.buses_approaching || []).map(b => b.number + (b.occupancy || '')).join('|')
        ).join('/');
    }

    // 目前視圖：顯示中的停留所與接近站的上色對應
    // 接近中的站名上色：巴士正接近的站（下一站）橘色、其後一站（下下站）黃色
    function computeView(pattern) {
        const isCollapsedView = prefs.collapsed && prefs.previewStops.length > 0;
        const stopsToShow = isCollapsedView
            ? pattern.stops.filter(s => prefs.previewStops.includes(s.name))
            : pattern.stops;

        const nameClassByName = {};
        pattern.stops.forEach(s => {
            if (s.buses_approaching && s.buses_approaching.length > 0) {
                nameClassByName[s.name] = 'approach-next';
            }
        });
        pattern.stops.forEach((s, i) => {
            if (s.buses_approaching && s.buses_approaching.length > 0) {
                const after = pattern.stops[i + 1];
                if (after && !nameClassByName[after.name]) {
                    nameClassByName[after.name] = 'approach-after';
                }
            }
        });

        return { isCollapsedView, stopsToShow, nameClassByName };
    }

    // ------------------------------------------------------------------
    // 就地更新：背景取得新資料或本地倒數 tick 時呼叫
    // 不重建列表（保留跑馬燈與捲動位置），只替換有變化的時間膠囊
    // （帶脈衝效果）、站名顏色與巴士位置標記
    // ------------------------------------------------------------------
    function updateInPlace() {
        const stopsList = container.querySelector('.bus-stops-list');
        const patterns = getPatterns();
        const pattern = patterns.length > 0 ? patterns[currentDirIndex()] : null;

        // 結構對不上（資料尚未就緒、站點集合改變）→ 退回完整重繪
        if (!stopsList || !pattern) { render(); return; }
        const view = computeView(pattern);
        const rows = [...stopsList.querySelectorAll('.bus-stop-row')];
        if (rows.length !== view.stopsToShow.length) { render(); return; }

        // 0. 運行狀態卡：狀態切換（有車↔無車）時退回完整重繪，僅內容變化就地更新
        const service = patternServiceState(pattern);
        const banner = container.querySelector('.bus-service-banner');
        const wantBanner = service.state === 'waiting' || service.state === 'ended';
        if (wantBanner !== !!banner) { render(); return; }
        if (banner) {
            const bd = data.busData || {};
            banner.innerHTML = busServiceBannerInner(service, bd);
        }

        // 1. 巴士位置標記：只有配置變化時才重建（避免每次 tick 閃爍）
        const markerSig = markerSignature(view);
        if (markerSig !== lastMarkerSig) {
            lastMarkerSig = markerSig;
            stopsList.querySelectorAll('.bus-marker-row').forEach(m => m.remove());
            view.stopsToShow.forEach((stop, idx) => {
                const row = rows[idx];
                (stop.buses_approaching || []).forEach(bus => {
                    const marker = document.createElement('div');
                    marker.className = 'bus-marker-row bus-marker-in';
                    marker.innerHTML = busMarkerHtml(bus, stop);
                    stopsList.insertBefore(marker, row);
                });
            });
        }

        // 2. 時間膠囊與站名顏色
        view.stopsToShow.forEach((stop, idx) => {
            const row = rows[idx];
            const t = liveEtaTexts(stop);

            const oldPill = row.querySelector('.bus-eta-pill');
            const tmp = document.createElement('div');
            tmp.innerHTML = etaPillHtml(t.eta, t.next);
            const newPill = tmp.firstElementChild;

            if (oldPill && newPill && oldPill.outerHTML !== newPill.outerHTML) {
                newPill.classList.add('bus-pill-updated');
                oldPill.replaceWith(newPill);
                setTimeout(() => newPill.classList.remove('bus-pill-updated'), 700);
            }

            const nameEl = row.querySelector('.bus-stop-name');
            if (nameEl) {
                nameEl.classList.toggle('approach-next', view.nameClassByName[stop.name] === 'approach-next');
                nameEl.classList.toggle('approach-after', view.nameClassByName[stop.name] === 'approach-after');
            }
        });
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

        // --- 0. 運行狀態卡：無車或運行終了時，在方向選擇列上方標示 ---
        // 樣式沿用列車詳細面板的資訊卡結構（extension-route-card）
        const service = patternServiceState(pattern);
        if (service.state === 'waiting' || service.state === 'ended') {
            const banner = document.createElement('div');
            banner.className = 'extension-route-card bus-service-banner';
            banner.innerHTML = busServiceBannerInner(service, busData);
            container.appendChild(banner);
        }

        // --- 1. 方向切換塊（只標示終點方向；重複時改抓終點站名） ---
        const slider = document.createElement('div');
        slider.className = 'bus-dir-slider';
        const dirLabels = directionLabels(patterns, busData.routeName);
        let activeBtn = null;
        patterns.forEach((p, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'bus-dir-btn' + (i === dirIndex ? ' active' : '');
            btn.textContent = dirLabels[i];
            btn.onclick = (e) => {
                e.stopPropagation();
                switchDir(i);
            };
            if (i === dirIndex) activeBtn = btn;
            slider.appendChild(btn);
        });
        container.appendChild(slider);

        // 目前方向的按鈕置中；使用者滑動後未點選時，閒置後自動回正
        // 回正動畫使用與全站 bounce-back 相同的曲線（--ios-snap ≒ easeOutExpo）
        const targetScrollLeft = () => {
            const max = slider.scrollWidth - slider.clientWidth;
            const raw = activeBtn.offsetLeft - slider.clientWidth / 2 + activeBtn.clientWidth / 2;
            return Math.max(0, Math.min(raw, max));
        };

        let recenterRaf = null;
        const centerActive = (smooth = true) => {
            if (!activeBtn) return;
            if (recenterRaf) cancelAnimationFrame(recenterRaf);
            const target = targetScrollLeft();
            if (!smooth) { slider.scrollLeft = target; return; }

            const start = slider.scrollLeft;
            const change = target - start;
            if (Math.abs(change) < 2) return;
            const t0 = performance.now();
            const duration = 600;
            const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

            const step = (now) => {
                const p = Math.min(1, (now - t0) / duration);
                slider.scrollLeft = start + change * easeOutExpo(p);
                if (p < 1) recenterRaf = requestAnimationFrame(step);
                else recenterRaf = null;
            };
            recenterRaf = requestAnimationFrame(step);
        };
        requestAnimationFrame(() => centerActive(false));

        // 手指還按著時不回正；放開並閒置 0.6 秒後才啟動
        let sliderIdleTimer = null;
        let sliderTouching = false;
        const armRecenter = () => {
            if (sliderIdleTimer) clearTimeout(sliderIdleTimer);
            sliderIdleTimer = setTimeout(() => {
                if (!sliderTouching) centerActive(true);
            }, 600);
        };
        slider.addEventListener('touchstart', () => {
            sliderTouching = true;
            if (recenterRaf) { cancelAnimationFrame(recenterRaf); recenterRaf = null; }
            if (sliderIdleTimer) clearTimeout(sliderIdleTimer);
        }, { passive: true });
        slider.addEventListener('touchend', () => {
            sliderTouching = false;
            armRecenter();
        }, { passive: true });
        slider.addEventListener('scroll', () => {
            if (recenterRaf) return; // 回正動畫自身觸發的捲動不重置計時
            armRecenter();
        }, { passive: true });

        // --- 2. 停留所列表（外殼負責收折／展開的高度過渡） ---
        listShell = document.createElement('div');
        listShell.className = 'bus-stops-shell';

        const stopsList = document.createElement('div');
        stopsList.className = 'bus-stops-list';

        // 方向切換的進場動畫
        if (slideDir) {
            stopsList.classList.add(slideDir === 'left' ? 'bus-slide-in-left' : 'bus-slide-in-right');
            slideDir = '';
        }

        const view = computeView(pattern);
        const isCollapsedView = view.isCollapsedView;

        if (view.isCollapsedView && view.stopsToShow.length === 0) {
            const none = document.createElement('div');
            none.className = 'bus-select-hint';
            none.textContent = '選択した停留所はこの方向にありません';
            stopsList.appendChild(none);
        }

        view.stopsToShow.forEach((stop, idx) => {
            // 有巴士行駛在前一站與本站之間時，於該站上方標示車牌與擁擠度
            (stop.buses_approaching || []).forEach(bus => {
                const marker = document.createElement('div');
                marker.className = 'bus-marker-row';
                marker.innerHTML = busMarkerHtml(bus, stop);
                stopsList.appendChild(marker);
            });

            const row = document.createElement('div');
            row.className = 'bus-stop-row';
            row.dataset.stopIndex = String(idx);
            const t = liveEtaTexts(stop);
            row.innerHTML = `
                ${stopNameHtml(stop.name, view.nameClassByName[stop.name] || '')}
                ${etaPillHtml(t.eta, t.next)}
            `;
            stopsList.appendChild(row);
        });

        // 記下目前的巴士位置配置，供就地更新比對
        lastMarkerSig = markerSignature(view);

        listShell.appendChild(stopsList);
        container.appendChild(listShell);
        applyMarquees(stopsList);

        // 收折／展開的高度過渡動畫
        if (heightAnimFrom >= 0) {
            const fromH = heightAnimFrom;
            heightAnimFrom = -1;
            const toH = listShell.offsetHeight;
            if (fromH !== toH) {
                listShell.style.height = `${fromH}px`;
                listShell.style.overflow = 'hidden';
                listShell.style.transition = 'height 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
                stopsList.classList.add('bus-fade-in');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        listShell.style.height = `${toH}px`;
                    });
                });
                setTimeout(() => {
                    listShell.style.height = '';
                    listShell.style.overflow = '';
                    listShell.style.transition = '';
                }, 450);
            }
        }

        // --- 3. 收折按鈕 ---
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'flight-action-btn bus-toggle-btn';

        const openPicker = () => {
            openStopPickerDialog(pattern, prefs.previewStops, (picked) => {
                markHeightAnim();
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
                markHeightAnim();
                prefs.collapsed = false;
                saveBusPrefs(targetId, prefs);
                render();
            };
        } else if (prefs.previewStops.length > 0) {
            toggleBtn.innerHTML = `${chevronUp}<span>プレビュー表示に折りたたむ</span>`;
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                markHeightAnim();
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
                pill = `<span class="bus-eta-pill ${etaPillClass(firstBus.eta_text)}">${firstBus.eta_text}</span>`;
            } else if (firstBus && typeof firstBus.stops_away === 'number') {
                pill = firstBus.stops_away === 0
                    ? `<span class="bus-eta-pill arriving">まもなく</span>`
                    : `<span class="bus-eta-pill run">${firstBus.stops_away}停留所前</span>`;
            } else if (firstDep) {
                pill = `<span class="bus-eta-pill sched">次${firstDep}</span>`;
            } else {
                pill = `<span class="bus-eta-pill none">運行終了</span>`;
            }

            const displayName = route.destination
                ? `${toHalfWidth(route.route)}（${route.destination}）`
                : toHalfWidth(route.route);
            row.innerHTML = `
                ${stopNameHtml(displayName)}
                ${pill}
            `;
            list.appendChild(row);
        });

        container.appendChild(list);
        applyMarquees(list);
    });
}
