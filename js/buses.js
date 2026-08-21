// buses.js - 公車資料模組（搜尋、快取、卡面格式與詳細面板）
// 原則：預設不主動請求公車 API，只有「使用者搜尋當下」與「牌組內已有儲存的公車路線」才發送請求。

const BUS_API_BASE = 'https://api.tsukinkanban.com/api/bus';
const BUS_CACHE_KEY = 'Tsukin_Cached_BusData';
const BUS_PREFS_KEY = 'Tsukin_Bus_Prefs';
const BUS_POLL_MS = 55000;        // 有公車卡片（儲存或開啟中）時的輪詢間隔
const BUS_REFRESH_MIN_MS = 50000; // 快取視為新鮮的門檻（略低於輪詢間隔，讓每次輪詢都實際更新）

// 遅延判定のしきい値（分）
// バスは1台の遅れが後続に連鎖しないため、列車のような路線全体の乱れとしてではなく
// 「単独の大きな遅れ」か「路線全体の底上げ（平均）」のどちらかで判定する
const BUS_DELAY_MINOR_MAX = 6;   // 単台がこの分数以上 → 注意（黄）
const BUS_DELAY_MINOR_AVG = 3;   // 平均がこの分数以上 → 注意（黄）
const BUS_DELAY_SEVERE_MAX = 10; // 単台がこの分数以上 → 遅延（赤）
const BUS_DELAY_SEVERE_AVG = 5;  // 平均がこの分数以上 → 遅延（赤）
// 平均は「路線全体の底上げ」を捉えるための指標なので、走行中が1台だけのときは
// max と同値になり単台しきい値を上書きしてしまう。2台以上そろって初めて評価する
const BUS_DELAY_AVG_MIN_COUNT = 2;
// 偏差（eta − next）の妥当範囲。範囲外は「実時刻の車両」と「次便の表定時刻」が
// 組み違った値とみなし、表示にも判定にも使わない。
// 早発側を厳しくするのは、バスは時点停留所での早発が原則ないため、
// 大きなマイナスはまず班次のずれだから（例：−20分は実際には遅延中の車両）
const BUS_DIFF_LATE_LIMIT = 30; // これを超える遅れは組み違いとみなす
const BUS_DIFF_EARLY_LIMIT = 5; // これを超える早発は組み違いとみなす

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
    return (str || '')
        // 全形 ASCII（英數字・記号：！-～ ＝ U+FF01–FF5E，含全形連字號 － 與 ：）→ 半形
        .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
        // 全形空白 → 半形空白
        .replace(/　/g, ' ')
        // 各種破折號・マイナス記号（U+2010〜2015, U+2212）→ 半形連字號
        .replace(/[‐‑‒–—―−]/g, '-');
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

    // 公車輪詢：有儲存的公車卡片或開啟中的公車面板（含站牌）時，
    // 每 55 秒抓一次最新資訊；沒有任何公車對象時不發送請求。
    // 頁面在背景時暫停，回到前景由時鐘的 visibilitychange 更新補上
    if (!window.__busPollTimer) {
        window.__busPollTick = async () => {
            if (document.hidden) return;
            await Promise.all([refreshSavedBusRoutes(), refreshOpenBusStop()]);
        };
        window.__busPollTimer = setInterval(() => window.__busPollTick(), BUS_POLL_MS);
    }
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

// 將一次路線查詢的回應寫入快取
// 同一次查詢可能命中多條路線（例：東42 → 東42-1・東42-2），
// 依 pattern 標題的路線名分組，各自獨立成一筆
function groupAndStoreRouteResults(json) {
    const stored = [];
    if (!json || !Array.isArray(json.results)) return stored;

    json.results.forEach(result => {
        const groups = {};
        (result.patterns || []).forEach(p => {
            // 完全沒有停靠站資料的運行系統（資訊量為零）不列入方向選擇
            if (!p.stops || p.stops.length === 0) return;
            const title = toHalfWidth(p.title || '');
            const firstSpace = title.indexOf(' ');
            const token = (firstSpace > 0 ? title.slice(0, firstSpace) : title) || toHalfWidth(json.query || '');
            if (!groups[token]) groups[token] = [];
            groups[token].push(p);
        });

        Object.keys(groups).forEach(token => {
            const targetId = makeBusTargetId(result.operator, token);
            window.GlobalBusData[targetId] = Object.assign({}, result, {
                patterns: dedupeBusPatterns(groups[token]),
                routeName: token,
                fetchedAt: Date.now()
            });
            stored.push(targetId);
        });
    });

    if (stored.length > 0) persistBusCache();
    return stored;
}

// 站牌查詢結果寫入快取，回傳 stopKey 清單
function storeStopResults(json) {
    const keys = [];
    if (!json || json.error || !Array.isArray(json.results)) return keys;
    json.results.forEach(result => {
        (result.stops || []).forEach(stop => {
            const key = `busstop:${result.operator}:${stop.name}`;
            window.GlobalBusStopData[key] = {
                operator: result.operator,
                label: result.label,
                url: result.url,
                source: result.source,
                stopName: stop.name,
                stop: stop,
                fetchedAt: Date.now()
            };
            keys.push(key);
        });
    });
    return keys;
}

// 確保某條路線的詳細資料存在（不足 60 秒的快取直接沿用）
// 搜尋清單改用輕量的 /routes 端點後，詳細時刻表改在開啟預覽時才抓
const pendingRouteFetches = new Set();

export async function ensureBusRouteData(targetId) {
    const cached = window.GlobalBusData[targetId];
    if (cached && cached.patterns && cached.patterns.length > 0 &&
        cached.fetchedAt && Date.now() - cached.fetchedAt < BUS_REFRESH_MIN_MS) {
        return;
    }
    if (pendingRouteFetches.has(targetId)) return;
    pendingRouteFetches.add(targetId);

    try {
        const { route } = parseBusTargetId(targetId);
        const json = await fetchBusApi(`/route/${encodeURIComponent(route)}`);
        if (json && !json.error) {
            const stored = groupAndStoreRouteResults(json);
            if (stored.length > 0) window.dispatchEvent(new CustomEvent('busDataUpdated'));
        }
    } finally {
        pendingRouteFetches.delete(targetId);
    }
}

// 運行系統的資訊量評分：有車（實際在途）> 有表定次発 > 無資訊
function patternScore(p) {
    if (patternActiveBusCount(p) > 0) return 2;
    if ((p.stops || []).some(s => s.next_text)) return 1;
    return 0;
}

// 站點序列完全相同的運行系統（平日／土休日等時刻表帶違い）は
// 同じ路線の重複表示になるため、資訊のある方だけを残して統合する
function dedupeBusPatterns(patterns) {
    const byRoute = {};
    const order = [];
    patterns.forEach(p => {
        const key = (p.stops || []).map(s => s.name).join('|');
        if (!byRoute[key]) {
            byRoute[key] = p;
            order.push(key);
        } else if (patternScore(p) > patternScore(byRoute[key])) {
            byRoute[key] = p;
        }
    });
    return order.map(k => byRoute[k]);
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

    const labels = raw.map((l, i) => {
        if (!l || counts[l] > 1) {
            const stops = patterns[i].stops || [];
            const last = stops[stops.length - 1];
            if (last && last.name) return `${last.name}行`;
        }
        return l || `方向 ${i + 1}`;
    });

    // 行き先（終點）也相同的複數運行系統 → 依序以起點、経由站區別
    const dupes = {};
    labels.forEach(l => { dupes[l] = (dupes[l] || 0) + 1; });
    return labels.map((l, i) => {
        if (dupes[l] <= 1) return l;

        const stops = patterns[i].stops || [];
        const others = patterns.filter((p, j) => j !== i && labels[j] === l);

        // 起點不同 → 標「◯◯発」
        const first = stops[0];
        const firstUnique = first && first.name &&
            others.every(o => (((o.stops || [])[0]) || {}).name !== first.name);
        if (firstUnique) return `${l}（${first.name}発）`;

        // 起點也相同（経由違い）→ 找出只有本系統停靠的站標「◯◯経由」
        const uniqueStop = stops.find(s =>
            others.every(o => !(o.stops || []).some(os => os.name === s.name)));
        if (uniqueStop) return `${l}（${uniqueStop.name}経由）`;

        // 完全無法區別時以序號標示
        return `${l}（${i + 1}）`;
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

// 實際在途中營運的車輛數
// 後端的 bus_count 可能包含回送・夜間待機・整備中等未營運車輛，
// 必須以「有站點正被接近」或「有即時 ETA」佐證才視為運行中：
// 有車牌的接近車輛以去重後的台數為準，僅有 ETA 時退回 bus_count
function patternActiveBusCount(pattern) {
    const stops = (pattern && pattern.stops) || [];
    const plates = new Set();
    let unnumbered = 0;
    let hasEta = false;
    stops.forEach(s => {
        (s.buses_approaching || []).forEach(b => {
            if (b.number) plates.add(b.number);
            else unnumbered++;
        });
        if (s.eta || s.eta_text) hasEta = true;
    });
    const seen = plates.size + unnumbered;
    if (seen > 0) return seen;
    return hasEta ? Math.max(1, pattern.bus_count || 0) : 0;
}

function patternServiceState(pattern) {
    if (!pattern) return { state: 'unknown', nextText: '' };
    if (patternActiveBusCount(pattern) > 0) return { state: 'running', nextText: '' };

    const stopWithNext = (pattern.stops || []).find(s => s.next_text);
    if (stopWithNext) return { state: 'waiting', nextText: stopWithNext.next_text };
    return { state: 'ended', nextText: '' };
}

// 偏差が実際の遅れ／早発として妥当か（範囲外は班次の組み違い）
function isPlausibleBusDiff(diff) {
    return Number.isFinite(diff) && diff <= BUS_DIFF_LATE_LIMIT && diff >= -BUS_DIFF_EARLY_LIMIT;
}

// その停留所の表定時刻の候補を集める
// next だけだと、遅れている車両に対して既に「次便」の時刻を指していることがあり、
// 偏差が大きなマイナスに化ける。バックエンドが prev（直前の表定時刻）や
// scheduled（時刻の配列）を返す場合はそれも候補に入れて正しい便を選べるようにする。
// どちらも無い旧レスポンスでは従来どおり next だけを使う
function scheduledCandidates(stop) {
    const list = [];
    if (Array.isArray(stop.scheduled)) stop.scheduled.forEach(t => { if (t) list.push(t); });
    if (stop.prev) list.push(stop.prev);
    if (stop.next) list.push(stop.next);
    return list;
}

// eta に対応する表定時刻を選び、偏差（分）を返す。判定できない場合は null
// 候補のうち eta に最も近いものを採用し、絶対値が同じなら遅れ側を優先する
// （バスは早発より遅れが圧倒的に多いため）
function busDiffMinutes(stop) {
    if (!stop || !stop.eta) return null;
    const etaMs = new Date(stop.eta).getTime();
    if (!Number.isFinite(etaMs)) return null;

    let best = null;
    scheduledCandidates(stop).forEach(t => {
        const ms = new Date(t).getTime();
        if (!Number.isFinite(ms)) return;
        const diff = Math.round((etaMs - ms) / 60000);
        if (best === null) { best = diff; return; }
        const da = Math.abs(diff), db = Math.abs(best);
        if (da < db || (da === db && diff > best)) best = diff;
    });
    return best;
}

// 走行中の各車両の遅れ（分）を集める
// 偏差は「その停留所の即時 ETA」と「表定時刻」の差＝接近中の先頭車両の遅れ。
// 同一車両を二重に数えないよう車牌でまとめ、車牌がない場合は停留所を鍵にする
function collectBusDelays(patterns) {
    const seen = new Map();
    (patterns || []).forEach(p => {
        (p.stops || []).forEach(s => {
            const bus = (s.buses_approaching || [])[0];
            if (!bus) return;
            const diff = busDiffMinutes(s);
            // 組み違いの疑いがある値は 0 扱いにもせず標本から除外する
            // （0 として平均に入れると本当の遅れを薄めてしまうため）
            if (diff === null || !isPlausibleBusDiff(diff)) return;
            const key = bus.number || `${p.id || ''}#${s.name}`;
            if (!seen.has(key)) seen.set(key, diff);
        });
    });
    return [...seen.values()];
}

// 遅延レベル：none（平常）／minor（黄）／severe（赤）
// 平均は「各車両の遅れ（早発は0扱い）」の平均。早発が遅れを打ち消さないようにする
function busDelayInfo(patterns) {
    const delays = collectBusDelays(patterns);
    if (delays.length === 0) return { level: 'none', max: 0, avg: 0, count: 0 };

    const lateness = delays.map(d => Math.max(0, d));
    const max = Math.max(...lateness);
    const avg = lateness.reduce((a, b) => a + b, 0) / lateness.length;

    const useAvg = lateness.length >= BUS_DELAY_AVG_MIN_COUNT;
    let level = 'none';
    if (max >= BUS_DELAY_SEVERE_MAX || (useAvg && avg >= BUS_DELAY_SEVERE_AVG)) level = 'severe';
    else if (max >= BUS_DELAY_MINOR_MAX || (useAvg && avg >= BUS_DELAY_MINOR_AVG)) level = 'minor';

    return { level, max, avg: Math.round(avg * 10) / 10, count: lateness.length };
}

// 全方向彙整的運行狀態（收折檢視的資訊卡用）：
// 任一方向有車即為運行中（遅延レベルに応じて徽章と文言を変える）、
// 否則依次発待ち／運行終了顯示
function overallServiceInfo(patterns) {
    const total = (patterns || []).reduce((n, p) => n + patternActiveBusCount(p), 0);
    if (total > 0) {
        const d = busDelayInfo(patterns);
        if (d.level !== 'none') {
            return {
                badge: d.level === 'severe' ? '遅延' : 'やや遅れ',
                cls: d.level === 'severe' ? 'status-delayed' : 'status-delayed-minor',
                message: `現在、${total}台が運行中です。最大${d.max}分・平均${d.avg}分の遅れが発生しています。`
            };
        }
        return { badge: '運行中', cls: 'status-normal', message: `現在、${total}台の車両が運行中です。` };
    }
    const waiting = (patterns || []).map(patternServiceState).find(s => s.state === 'waiting');
    if (waiting) {
        return { badge: '車両なし', cls: 'status-attention', message: `現在、運行中の車両はありません。次の発車は ${toHalfWidth(waiting.nextText).replace('：', ':')} の予定です。` };
    }
    return { badge: '運行終了', cls: 'status-attention', message: '本日の運行は終了しました。' };
}

// 資訊卡的共用組件：標頭（標題＋事業者＋狀態徽章）與更新時刻 footer
// 收折卡、展開卡、站牌卡都沿用列車 extension-route-card 的同一套結構
function busCardHeaderHtml(title, company, info) {
    return `
        <div class="ext-card-header">
            <div class="ext-card-title-group">
                <div class="ext-route-name">${title}</div>
                <div class="ext-route-company">${company}</div>
            </div>
            <div class="ext-status-badge ${info.cls}">${info.badge}</div>
        </div>
        <div class="ext-card-divider"></div>`;
}

function busUpdateTimeInner(fetchedAt) {
    const d = new Date(fetchedAt);
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        更新: ${hm}`;
}

function busCardFooterHtml(fetchedAt) {
    if (!fetchedAt) return '';
    return `
        <div class="ext-card-footer">
            <span class="ext-update-time">${busUpdateTimeInner(fetchedAt)}</span>
        </div>`;
}

// ============================================================================
// 收折資訊卡的組件（路線面板的收折檢視與混合卡片內的公車列共用）
// ============================================================================

// 該站上方要標示的巴士（車牌＋偏差＋擁擠度）
// 展開檢視：只標示正接近本站的巴士
// 收折檢視：往前回溯（至上一個預覽站為止），找出已發車、正朝本站行駛中的最近一班
function collectBusMarkers(pattern, stop, isCollapsedView, previewStops) {
    if (!isCollapsedView) {
        return (stop.buses_approaching || []).map(bus => ({ bus, srcStop: stop }));
    }
    const idx = pattern.stops.indexOf(stop);
    const markers = [];
    for (let j = idx; j >= 0; j--) {
        const s = pattern.stops[j];
        if (j !== idx && previewStops.includes(s.name)) break;
        if (s.buses_approaching && s.buses_approaching.length > 0) {
            s.buses_approaching.forEach(bus => markers.push({ bus, srcStop: s }));
            break;
        }
    }
    return markers;
}

// 收折檢視的顯示項目：各方向 × 預覽停留所（與列車卡片的方向別 capsule 同構）
function busCollapsedEntries(patterns, previewStops) {
    const entries = [];
    patterns.forEach((p, dirIdx) => {
        (p.stops || []).forEach(stop => {
            if (previewStops.includes(stop.name)) entries.push({ pattern: p, dirIdx, stop });
        });
    });
    return entries;
}

// capsule 內容：主列（停留所名＋到站時間）＋副列（行駛中的車牌・偏差）
// 資訊分層以維持可讀性，不把全部塞在同一行
function busCollapsedCapsuleInner(pattern, stop, previewStops) {
    const service = patternServiceState(pattern);
    const t = liveEtaTexts(stop);
    const isTerminal = stop === pattern.stops[pattern.stops.length - 1];
    const noneText = service.state === 'ended' ? '終了' : (isTerminal ? '終点' : '--');
    const markerHtml = collectBusMarkers(pattern, stop, true, previewStops)
        .map(m => busMarkerHtml(m.bus, m.srcStop, true)).join('');
    return `
        <div class="bus-collapsed-main">
            <span class="bus-collapsed-stop">${stop.name}</span>
            ${etaPillHtml(t.eta, t.next, noneText, true)}
        </div>
        ${markerHtml ? `<div class="bus-collapsed-sub">${markerHtml}</div>` : ''}`;
}

// 收折資訊卡的完整內容：標頭＋訊息＋方向別 capsule 群＋更新時刻
function busCollapsedCardInner(busData, prefs) {
    const patterns = busData.patterns || [];
    const info = overallServiceInfo(patterns);
    const dirLabels = directionLabels(patterns, busData.routeName);
    const previewStops = prefs.previewStops || [];
    const entries = busCollapsedEntries(patterns, previewStops);

    // 依方向分組：方向名作為群組小標，其下每個預覽站一列 capsule
    const groups = [];
    entries.forEach(en => {
        const g = groups[groups.length - 1];
        if (g && g.dirIdx === en.dirIdx) g.items.push(en);
        else groups.push({ dirIdx: en.dirIdx, items: [en] });
    });

    const capsHtml = entries.length === 0
        ? `<div class="bus-select-hint">${previewStops.length === 0
            ? 'プレビュー停留所が未設定です。タップして設定できます'
            : '選択した停留所が見つかりません'}</div>`
        : `<div class="adv-details-container">${groups.map(g => `
            <div class="bus-collapsed-group">
                <div class="bus-collapsed-dir">${dirLabels[g.dirIdx]}</div>
                ${g.items.map(en => `<div class="adv-detail-capsule bus-collapsed-capsule">${busCollapsedCapsuleInner(en.pattern, en.stop, previewStops)}</div>`).join('')}
            </div>`).join('')}</div>`;

    return `
        ${busCardHeaderHtml(busData.routeName || '', busData.label || 'バス', info)}
        <div class="ext-card-message">${info.message}</div>
        ${capsHtml}
        ${busCardFooterHtml(busData.fetchedAt)}
    `;
}

// 混合卡片內的公車路線：直接渲染完整的公車詳細面板（無「既存追加／新規作成」按鈕）
// 收折卡點一下即「原地」展開為完整路線（方向切換塊＋全停留所），不跳轉至其他卡片
export function renderBusLineCard(targetId) {
    const wrapper = document.createElement('div');
    const data = { targetLineIds: [targetId], busData: window.GlobalBusData[targetId] || null };
    renderBusDetailPanel(data, wrapper, { isPreview: false });
    // 混合卡片開啟時確保有最新詳細資料（不足時抓取，完成後 busDataUpdated 刷新）
    ensureBusRouteData(targetId);
    return wrapper;
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
        // 路線名清單（輕量、免下載時刻表）與站牌並行查詢
        const [routesJson, stopJson] = await Promise.all([
            fetchBusApi(`/routes?q=${encodeURIComponent(keyword)}`),
            fetchBusApi(`/stop/${encodeURIComponent(keyword)}`)
        ]);

        // 使用者已改變搜尋內容 → 丟棄本次結果
        const input = document.getElementById('search-input');
        if (!input || input.value.trim() !== keyword) return;

        const entry = { ts: Date.now(), routeItems: [], stopKeys: [], error: false };

        if ((routesJson && routesJson.error) || (stopJson && stopJson.error)) {
            entry.error = true;
        }

        // 每條命中的路線各自成一列（東42 → 東42-1・東42-2 都會出現）
        if (routesJson && !routesJson.error && Array.isArray(routesJson.results)) {
            routesJson.results.forEach(result => {
                (result.routes || []).slice(0, 6).forEach(officialName => {
                    const half = toHalfWidth(officialName);
                    entry.routeItems.push({
                        targetId: makeBusTargetId(result.operator, half),
                        name: half,
                        label: result.label
                    });
                });
            });
        }

        entry.stopKeys = storeStopResults(stopJson);

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

    if (entry.error && entry.routeItems.length === 0 && entry.stopKeys.length === 0) {
        const notice = document.createElement('div');
        notice.className = 'search-result-item bus-search-item';
        notice.innerHTML = `<div class="search-result-title" style="opacity: 0.7;">バス情報を初期化中です。しばらくしてから再検索してください。</div>`;
        dropdown.appendChild(notice);
        return;
    }

    if (entry.routeItems.length === 0 && entry.stopKeys.length === 0) return;

    // 有公車結果時，移除「該当する路線が見つかりません」的空狀態
    const empty = dropdown.querySelector('.search-empty-state');
    if (empty) empty.remove();

    // 路線結果
    entry.routeItems.forEach(routeItem => {
        // 已有詳細快取時順帶顯示運行台數
        const cached = window.GlobalBusData[routeItem.targetId];
        const busCount = cached ? (cached.patterns || []).reduce((sum, p) => sum + (p.bus_count || 0), 0) : 0;
        const rightText = busCount > 0 ? `運行中 ${busCount}台` : 'バス路線';

        const item = document.createElement('div');
        item.className = 'search-result-item bus-search-item';
        item.style.cursor = 'pointer';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div class="search-result-title">${routeItem.name}</div>
                    <div class="search-result-subtitle">${routeItem.label}</div>
                </div>
                <div class="bus-search-right">${rightText}</div>
            </div>
        `;
        item.onclick = () => window.previewBusFromSearch(routeItem.targetId);
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

            const { route } = parseBusTargetId(targetId);
            const json = await fetchBusApi(`/route/${encodeURIComponent(route)}`);
            if (!json || json.error || !Array.isArray(json.results)) continue;

            // 依路線分組寫入（一次查詢可能同時更新多條相關路線）
            const stored = groupAndStoreRouteResults(json);
            if (stored.length > 0) changed = true;
        }
    } finally {
        isRefreshingBus = false;
    }

    if (changed) {
        persistBusCache();
        window.dispatchEvent(new CustomEvent('busDataUpdated'));
    }
}

// 站牌面板開啟中：重抓該站牌的最新到站與車輛資訊（輪詢用）
async function refreshOpenBusStop() {
    const key = window.__busStopPanelKey;
    if (!key || typeof window.__busStopPanelRefresh !== 'function') return;

    const stopName = key.split(':').slice(2).join(':');
    const json = await fetchBusApi(`/stop/${encodeURIComponent(stopName)}`);
    if (!json || json.error) return;
    if (storeStopResults(json).length === 0) return;

    const tempCard = (window.appRailwayData || []).find(c => c.id === 'temp-search-busstop');
    if (tempCard && window.GlobalBusStopData[key]) tempCard.busStopData = window.GlobalBusStopData[key];
    if (typeof window.__busStopPanelRefresh === 'function') window.__busStopPanelRefresh();
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
            // 遅延は全方向をまとめて評価（カード面・パネル徽章・混合カードで同じ判定を共有）
            const d = busDelayInfo(cached.patterns);
            const base = getPreviewStopInfo(targetId, cached) || `${cached.label}（${cached.source || 'データなし'}）`;

            if (d.level === 'severe') {
                flags = [false, false, false, true, false, false, false];  // 打叉（大幅な遅れ）
                desc = `最大${d.max}分の遅れ・${base}`;
            } else if (d.level === 'minor') {
                flags = [false, false, false, false, true, false, false];  // 三角形（遅れ小）
                desc = `最大${d.max}分の遅れ・${base}`;
            } else {
                flags = [false, false, false, false, false, isRealtime, !isRealtime];
                desc = base;
            }
        } else if (service.state === 'waiting') {
            // 無車輛（首班未發車或班距空窗）：亮注意燈
            flags = [false, false, false, false, false, false, true];
            const preview = getPreviewStopInfo(targetId, cached);
            desc = preview
                ? `運行中の車両なし・${preview}`
                : `運行中の車両なし・次発 ${toHalfWidth(service.nextText).replace('：', ':')}`;
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
    const eta = t.eta ? toHalfWidth(t.eta) : (t.next ? `次発 ${toHalfWidth(t.next).replace('：', ':')}` : '');
    return eta ? `${stop.name}：${eta}` : '';
}

// 混合卡片（鐵道卡內的公車路線）用：生成一筆 detailedLine 摘要
export function generateBusLineSummary(targetId) {
    const fmt = generateBusDataFormat(targetId);
    const bd = fmt.busData;
    const hasData = bd.patterns && bd.patterns.length > 0;

    let status = '更新中...';
    let serviceState = 'unknown';
    let delayInfo = { level: 'none', max: 0, avg: 0, count: 0 };
    if (hasData) {
        const prefs = getBusPrefs(targetId);
        const pattern = bd.patterns[Math.min(prefs.dir, bd.patterns.length - 1)];
        serviceState = patternServiceState(pattern).state;
        delayInfo = busDelayInfo(bd.patterns);

        if (serviceState === 'running') {
            if (delayInfo.level === 'severe') status = '遅延';
            else if (delayInfo.level === 'minor') status = 'やや遅れ';
            else status = bd.source || 'バス';
        } else if (serviceState === 'waiting') status = '車両なし';
        else status = '運行終了';
    }

    // 運行中→遅延レベルに応じて緑／黄／赤、車両なし／運行終了／資料未就緒→注意燈
    // 卡片燈號需正確繼承公車的實際運行狀態，不能一律當綠燈
    const isRunning = serviceState === 'running';
    const delayLevel = isRunning ? delayInfo.level : 'none';

    return {
        id: targetId,
        name: bd.routeName || targetId,
        company: bd.label || 'バス',
        status: status,
        message: hasData ? fmt.desc : 'バス情報を取得しています...',
        delay: delayLevel === 'none' ? 0 : delayInfo.max,
        updateTime: fmt.updateTime,
        url: bd.url || '',
        isDelayed: delayLevel !== 'none',
        isError: false,
        isAttention: !isRunning,
        advancedDetails: [],
        isBusLine: true,
        hasData: hasData,
        serviceState: serviceState,
        delayLevel: delayLevel,
        delayAvg: delayInfo.avg
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

function etaPillHtml(etaText, nextText, noneText = '--', chip = false) {
    // chip：收折卡的 capsule 內使用，沿用配色分級但去掉膠囊外框
    const base = chip ? 'bus-eta-pill chip' : 'bus-eta-pill';
    // 時刻文字可能含全形數字（１６：５８），統一轉半形以維持大小一致
    if (etaText) {
        const t = toHalfWidth(etaText);
        return `<span class="${base} ${etaPillClass(t)}">${t}</span>`;
    }
    // 「次xx:xx」讓寬度與其他時間顯示一致
    if (nextText) return `<span class="${base} sched">次${toHalfWidth(nextText).replace('：', ':')}</span>`;
    // 無時刻資料：運行終了 →「終了」、終點站（乗車不可）→「終点」
    return `<span class="${base} none">${noneText}</span>`;
}

// 行駛中巴士標記：車牌＋擁擠度（満員／混雑等以顏色區分）＋表定偏差（±分）
// 偏差以「該站的即時預估 eta」與「表定時刻 next」推算：＋為延誤、－為提早
// 擁擠度標示（満員紅／混雑橘／立席黃／空位綠）
function busOccHtml(occupancy) {
    if (!occupancy) return '';
    let occClass = '';
    if (occupancy.includes('満員')) occClass = ' full';
    else if (occupancy.includes('混雑')) occClass = ' crowded';
    else if (occupancy.includes('立席')) occClass = ' standing';
    else if (occupancy.includes('空')) occClass = ' seats'; // 空車・空席多数・空席あり
    return `<span class="bus-occ${occClass}">${occupancy}</span>`;
}

function busMarkerHtml(bus, stop, chip = false) {
    const occHtml = busOccHtml(bus.occupancy);

    let diffHtml = '';
    if (stop) {
        const diff = busDiffMinutes(stop);
        // 妥当範囲外は next が次便を指す組み違いとみなし、表示しない
        // （とくに大きなマイナスは実際には遅延中の車両であることが多く誤解を招く）
        if (diff !== null && diff !== 0 && isPlausibleBusDiff(diff)) {
            diffHtml = `<span class="bus-delay ${diff > 0 ? 'late' : 'early'}">${diff > 0 ? '+' : ''}${diff}分</span>`;
        }
    }

    // 車牌與偏差用膠囊包起來，擁擠度接在膠囊後
    // chip：資訊卡內使用，去掉膠囊外框融入卡片
    const cls = chip ? 'bus-eta-pill bus-plate-pill chip' : 'bus-eta-pill bus-plate-pill';
    return `<span class="${cls}"><span class="bus-plate">${bus.number || ''}</span>${diffHtml}</span>${occHtml}`;
}

// 點擊站名 → 底部選單：Google Maps 導航／該站總覽
function openStopActions(stopName, operator) {
    if (!window.iosActionSheet) return;

    window.iosActionSheet(
        stopName,
        'この停留所の操作を選択してください',
        [
            { text: 'Google マップで開く', value: 'map' },
            { text: 'この停留所の路線総覧を見る', value: 'overview' }
        ]
    ).then((choice) => {
        if (choice === 'map') {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopName + ' バス停')}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        } else if (choice === 'overview') {
            // 立即跳轉至站牌總覽（資料在背景補抓）
            openBusStopOverview(stopName, operator);
        }
    });
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
export function openStopPickerDialog(pattern, currentStops, onDone) {
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

    // 路線面板不需要站牌面板的刷新掛勾
    window.__busStopPanelRefresh = null;
    window.__busStopPanelKey = null;

    // 卡片資料還是空殼時，先從全域快取拉最新（詳細資料可能在面板開啟前就已抓完）
    if ((!data.busData || (data.busData.patterns || []).length === 0) && window.GlobalBusData[targetId]) {
        data.busData = window.GlobalBusData[targetId];
    }
    let slideDir = '';        // 方向切換的進場動畫方向（'left' | 'right'）
    let heightAnimFrom = -1;  // 收折／展開的高度過渡起點（-1 表示不做）
    let listShell = null;     // 停留所列表的外殼（高度動畫用）
    let swipeArea = null;     // 滑動切換的位移範圍（停留所列表）
    let swipeClip = null;     // 位移範圍的裁切層（拖曳時左右邊緣線性淡出）
    let sliderScrollMemo = 0; // 方向選單的捲動位置（跨重繪保留，避免切換時跳回 0）

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

    // 收折／展開的高度過渡動畫（外殼高度過渡＋內容淡入）
    function playHeightAnim(fadeEl) {
        if (heightAnimFrom < 0) return;
        const fromH = heightAnimFrom;
        heightAnimFrom = -1;
        const toH = listShell.offsetHeight;
        if (fromH === toH) return;
        listShell.style.height = `${fromH}px`;
        listShell.style.overflow = 'hidden';
        listShell.style.transition = 'height 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        if (fadeEl) fadeEl.classList.add('bus-fade-in');
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

    let lastMarkerSig = '';

    // 模組層級組件的閉包便捷包裝（自動帶入本面板的偏好設定）
    function collectMarkers(pattern, stop, isCollapsedView) {
        return collectBusMarkers(pattern, stop, isCollapsedView, prefs.previewStops);
    }

    function markerSignature(pattern, view) {
        return view.stopsToShow.map(stop =>
            collectMarkers(pattern, stop, false)
                .map(m => m.srcStop.name + m.bus.number + (m.bus.occupancy || '')).join('|')
        ).join('/');
    }

    function collapsedEntries(patterns) {
        return busCollapsedEntries(patterns, prefs.previewStops);
    }

    function collapsedCapsuleInner(pattern, stop) {
        return busCollapsedCapsuleInner(pattern, stop, prefs.previewStops);
    }

    // 展開視圖：全停留所與接近站的上色對應
    // 接近中的站名上色：巴士正接近的站（下一站）橘色、其後一站（下下站）黃色
    // （收折檢視改由 renderCollapsedCard 以資訊卡呈現，不經過這裡）
    function computeView(pattern) {
        const stopsToShow = pattern.stops;

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

        return { stopsToShow, nameClassByName };
    }

    // 收折檢視：一張 extension-route-card（與列車的路線資訊卡同構），
    // 各方向的預覽停留所以 adv-detail-capsule 逐列顯示
    function renderCollapsedCard(patterns, busData) {
        listShell = document.createElement('div');
        listShell.className = 'bus-stops-shell';

        const card = document.createElement('div');
        card.className = 'extension-route-card bus-collapsed-card';
        card.innerHTML = busCollapsedCardInner(busData, prefs);

        // 點卡片本身也可展開（與收折按鈕同效）
        card.onclick = (e) => {
            e.stopPropagation();
            markHeightAnim();
            prefs.collapsed = false;
            saveBusPrefs(targetId, prefs);
            if (navigator.vibrate) navigator.vibrate(10);
            render();
        };

        listShell.appendChild(card);
        container.appendChild(listShell);
        playHeightAnim(card);
    }

    // ------------------------------------------------------------------
    // 就地更新：背景取得新資料或本地倒數 tick 時呼叫
    // 不重建列表（保留跑馬燈與捲動位置），只替換有變化的時間膠囊
    // （帶脈衝效果）、站名顏色與巴士位置標記
    // ------------------------------------------------------------------
    function updateInPlace() {
        const patterns = getPatterns();
        const pattern = patterns.length > 0 ? patterns[currentDirIndex()] : null;
        if (!pattern) { render(); return; }

        // 收折檢視：就地更新資訊卡的徽章、訊息與各 capsule 的時間
        if (prefs.collapsed && prefs.previewStops.length > 0) {
            updateCollapsedInPlace(patterns);
            return;
        }

        const stopsList = container.querySelector('.bus-stops-list');
        // 結構對不上（資料尚未就緒、站點集合改變）→ 退回完整重繪
        if (!stopsList) { render(); return; }
        const view = computeView(pattern);
        const rows = [...stopsList.querySelectorAll('.bus-stop-row')];
        if (rows.length !== view.stopsToShow.length) { render(); return; }

        // 0. 資訊卡標頭：徽章、訊息與更新時刻就地更新
        const service = patternServiceState(pattern);
        const card = container.querySelector('.bus-expanded-card');
        if (!card) { render(); return; }
        const info = overallServiceInfo(patterns);
        const badge = card.querySelector('.ext-status-badge');
        if (badge && badge.textContent.trim() !== info.badge) {
            badge.className = `ext-status-badge ${info.cls}`;
            badge.textContent = info.badge;
        }
        const msg = card.querySelector('.ext-card-message');
        if (msg && msg.textContent !== info.message) msg.textContent = info.message;
        const upd = card.querySelector('.ext-update-time');
        if (upd && (data.busData || {}).fetchedAt) upd.innerHTML = busUpdateTimeInner(data.busData.fetchedAt);

        // 1. 巴士位置標記：只有配置變化時才重建（避免每次 tick 閃爍）
        const markerSig = markerSignature(pattern, view);
        if (markerSig !== lastMarkerSig) {
            lastMarkerSig = markerSig;
            stopsList.querySelectorAll('.bus-marker-row').forEach(m => m.remove());
            view.stopsToShow.forEach((stop, idx) => {
                const row = rows[idx];
                collectMarkers(pattern, stop, false).forEach(m => {
                    const marker = document.createElement('div');
                    marker.className = 'bus-marker-row bus-marker-in';
                    marker.innerHTML = busMarkerHtml(m.bus, m.srcStop, true);
                    stopsList.insertBefore(marker, row);
                });
            });
        }

        // 2. 時間膠囊與站名顏色
        view.stopsToShow.forEach((stop, idx) => {
            const row = rows[idx];
            const t = liveEtaTexts(stop);
            const isTerminal = stop === pattern.stops[pattern.stops.length - 1];
            const noneText = service.state === 'ended' ? '終了' : (isTerminal ? '終点' : '--');

            const oldPill = row.querySelector('.bus-eta-pill');
            const tmp = document.createElement('div');
            tmp.innerHTML = etaPillHtml(t.eta, t.next, noneText, true);
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

    // 收折檢視的就地更新：徽章／訊息／各 capsule 右側（車牌・偏差・時間）
    // 內容有變化時帶脈衝效果，結構對不上時退回完整重繪
    function updateCollapsedInPlace(patterns) {
        const card = container.querySelector('.bus-collapsed-card');
        if (!card) { render(); return; }
        const entries = collapsedEntries(patterns);
        const caps = [...card.querySelectorAll('.bus-collapsed-capsule')];
        if (caps.length !== entries.length) { render(); return; }

        const info = overallServiceInfo(patterns);
        const badge = card.querySelector('.ext-status-badge');
        if (badge && badge.textContent.trim() !== info.badge) {
            badge.className = `ext-status-badge ${info.cls}`;
            badge.textContent = info.badge;
        }
        const msg = card.querySelector('.ext-card-message');
        if (msg && msg.textContent !== info.message) msg.textContent = info.message;

        entries.forEach((en, i) => {
            const cap = caps[i];
            const html = collapsedCapsuleInner(en.pattern, en.stop);
            if (cap.dataset.html === html) return;
            const isUpdate = cap.dataset.html !== undefined;
            cap.dataset.html = html;
            cap.innerHTML = html;
            if (isUpdate) {
                const pill = cap.querySelector('.bus-eta-pill:not(.bus-plate-pill)');
                if (pill) {
                    pill.classList.add('bus-pill-updated');
                    setTimeout(() => pill.classList.remove('bus-pill-updated'), 700);
                }
            }
        });
    }

    // 在停留所列表上左右滑切換方向：
    // 拖曳時整張卡跟著手指位移（含透明度回饋），放開後依方向滑出→新方向滑入
    // 第一／最後一個方向再往外拖時加重阻尼並回彈（不循環）
    let touchStartX = 0, touchStartY = 0, touchTracking = false;
    let touchHorizontal = null; // null＝方向未定，true＝橫向拖曳中

    function canSwipeDir() {
        return !(prefs.collapsed && prefs.previewStops.length > 0) && getPatterns().length >= 2;
    }

    function resetSwipeDrag(animated = true) {
        if (!swipeArea) return;
        // 放手的瞬間就移除淡出遮罩：回彈中的內容以硬裁切收尾即可，
        // 若等到回彈結束才移除，靜止的膠囊邊緣會出現肉眼可見的瞬間切換
        if (swipeClip) swipeClip.classList.remove('bus-swipe-fade');
        if (animated && swipeArea.style.transform) {
            swipeArea.style.transition = 'transform 0.35s var(--ios-snap, cubic-bezier(0.16, 1, 0.3, 1)), opacity 0.25s ease';
            const el = swipeArea;
            setTimeout(() => { el.style.transition = ''; }, 400);
        } else {
            swipeArea.style.transition = '';
        }
        swipeArea.style.transform = '';
        swipeArea.style.opacity = '';
    }

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) { touchTracking = false; return; }
        // 方向切換塊自身可橫向捲動，從那裡起始的拖曳不做整卡位移
        if (e.target && e.target.closest && e.target.closest('.bus-dir-slider')) {
            touchTracking = false;
            return;
        }
        touchTracking = true;
        touchHorizontal = null;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!touchTracking || !swipeArea || !canSwipeDir()) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        // 一開始的位移決定這次手勢是橫向拖曳還是縱向捲動
        if (touchHorizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
            touchHorizontal = Math.abs(dx) > Math.abs(dy);
        }
        if (!touchHorizontal) return;

        // 橫向拖曳期間鎖定縱向捲動，避免左右＋上下同時動造成混亂
        if (e.cancelable) e.preventDefault();

        if (swipeClip) swipeClip.classList.add('bus-swipe-fade');
        const cur = currentDirIndex();
        const atEdge = (dx > 0 && cur === 0) || (dx < 0 && cur === getPatterns().length - 1);
        const damped = dx * (atEdge ? 0.25 : 0.55);
        swipeArea.style.transition = 'none';
        swipeArea.style.transform = `translateX(${damped}px)`;
        swipeArea.style.opacity = String(1 - Math.min(1, Math.abs(damped) / 160) * 0.35);
    }, { passive: false }); // 需要 preventDefault 鎖定縱向捲動，不能是 passive

    container.addEventListener('touchend', (e) => {
        if (!touchTracking) return;
        touchTracking = false;
        const wasHorizontal = touchHorizontal;
        touchHorizontal = null;
        if (!swipeArea) return;

        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        if (!canSwipeDir() || !wasHorizontal) { resetSwipeDrag(false); return; }

        if (Math.abs(dx) > 60 && Math.abs(dy) < 80) {
            const cur = currentDirIndex();
            const next = cur + (dx < 0 ? 1 : -1);
            if (next < 0 || next >= getPatterns().length) { resetSwipeDrag(); return; }
            animateSwitchTo(next, dx < 0 ? 'left' : 'right');
        } else {
            resetSwipeDrag();
        }
    }, { passive: true });

    // 目前內容先掛上淡出遮罩、朝該方向滑出並淡出，接著渲染新方向（帶滑入動畫）
    // 手指滑動與桌面滾輪切換共用，確保兩者的隱形牆淡化效果一致
    function animateSwitchTo(next, outDir) {
        if (!swipeArea || !swipeClip) { switchDir(next); return; }
        swipeClip.classList.add('bus-swipe-fade');
        swipeArea.style.transition = 'transform 0.18s ease-in, opacity 0.18s ease-in';
        swipeArea.style.transform = `translateX(${outDir === 'left' ? -90 : 90}px)`;
        swipeArea.style.opacity = '0';
        setTimeout(() => switchDir(next), 170);
    }

    // 桌面環境：觸控板雙指左右滑或滑鼠側向滾輪也可切換方向
    // 「一次連續動作＝一次切換」：
    //  - 切換後鎖住，直到橫向滾動停頓（無事件 140ms）才重新武裝
    //  - 慣性尾巴是不間斷的連續事件，期間不會停頓 → 鎖維持 → 不會多切一個
    //  - 一次較長的滑動也是連續事件 → 同樣只切一次
    //  - 兩次獨立手勢之間必有停頓（抬指重新滑）→ 重新武裝 → 各自生效
    let wheelAccum = 0;
    let wheelArmed = true;
    let wheelIdleTimer = null;
    container.addEventListener('wheel', (e) => {
        if (!canSwipeDir()) return;
        // 方向選單自身可橫向捲動，交給瀏覽器原生行為
        if (e.target && e.target.closest && e.target.closest('.bus-dir-slider')) return;
        // 只攔截明顯的橫向捲動，縱向照常
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();

        // 橫向滾動停頓 140ms（含慣性完全衰減）後才重新武裝並清零
        clearTimeout(wheelIdleTimer);
        wheelIdleTimer = setTimeout(() => { wheelArmed = true; wheelAccum = 0; }, 140);

        if (!wheelArmed) return; // 這次連續動作已切換過，等停頓

        wheelAccum += e.deltaX;
        if (Math.abs(wheelAccum) > 60) {
            const dir = wheelAccum > 0 ? 1 : -1;
            wheelAccum = 0;
            const next = currentDirIndex() + dir;
            if (next < 0 || next >= getPatterns().length) return; // 邊界不循環
            wheelArmed = false; // 鎖住，直到滾動停頓由閒置計時重新武裝
            animateSwitchTo(next, dir > 0 ? 'left' : 'right');
        }
    }, { passive: false });

    function render() {
        container.innerHTML = '';
        const busData = data.busData || {};
        const patterns = getPatterns();

        // 由站牌總覽跳轉而來時，依行き先自動切到對應方向
        // （資料尚未載入時保留待決，載入後的 render 再解析）
        const desired = window.__busDesiredDir;
        if (desired && desired.targetId === targetId && patterns.length > 0) {
            window.__busDesiredDir = null;
            const destHalf = toHalfWidth(desired.destination || '');
            if (destHalf) {
                const idx = patterns.findIndex(p => {
                    if (toHalfWidth(p.title || '').includes(destHalf)) return true;
                    const stops = p.stops || [];
                    const last = stops[stops.length - 1];
                    return !!last && (`${last.name}行` === destHalf || destHalf.startsWith(last.name));
                });
                if (idx >= 0) {
                    prefs.dir = idx;
                    saveBusPrefs(targetId, prefs);
                }
            }
        }

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

        // --- 收折檢視：與列車詳細面板（多路線・方向別）同構的資訊卡 ---
        // 運行狀態併入卡片徽章與訊息，方向選擇列不顯示
        // 展開按鈕不另外顯示：直接點資訊卡即展開（renderCollapsedCard 內已綁定）
        if (prefs.collapsed && prefs.previewStops.length > 0) {
            renderCollapsedCard(patterns, busData);
            appendActionButtons();
            return;
        }

        // --- 展開檢視：與收折卡同語言的資訊卡（列車 extension-route-card 同構） ---
        // 標頭徽章＋訊息取代原本獨立的運行狀態橫幅，方向切換塊與停留所列表都收進卡片內
        const service = patternServiceState(pattern);
        const info = overallServiceInfo(patterns);

        listShell = document.createElement('div');
        listShell.className = 'bus-stops-shell';

        const expCard = document.createElement('div');
        expCard.className = 'extension-route-card bus-expanded-card';
        expCard.innerHTML = `
            ${busCardHeaderHtml(busData.routeName || '', busData.label || 'バス', info)}
            <div class="ext-card-message">${info.message}</div>
        `;

        // 這次重繪是否來自方向切換（slideDir 稍後會被 swipeArea 區塊清掉，先擷取）
        const isDirSwitch = !!slideDir;

        // --- 1. 方向切換塊（只標示終點方向；重複時改抓終點站名） ---
        const slider = document.createElement('div');
        slider.className = 'bus-dir-slider';
        const dirLabels = directionLabels(patterns, busData.routeName);
        let activeBtn = null;
        patterns.forEach((p, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            const isActive = i === dirIndex;
            // 切換時：新藥丸先以非 active 狀態出現，下一幀再加 active，
            // 讓深色高亮沿 CSS transition 平滑淡入（而非瞬間跳色）
            btn.className = 'bus-dir-btn' + (isActive && !isDirSwitch ? ' active' : '');
            btn.textContent = dirLabels[i];
            btn.onclick = (e) => {
                e.stopPropagation();
                switchDir(i);
            };
            if (isActive) activeBtn = btn;
            slider.appendChild(btn);
        });

        expCard.appendChild(slider);

        if (isDirSwitch && activeBtn) {
            const btn = activeBtn;
            // 雙 rAF：先讓非 active 狀態實際繪製一幀，下一幀再加 active，
            // 深色高亮才會沿 CSS transition 淡入（單 rAF 會在首繪前就套用，不觸發過渡）
            requestAnimationFrame(() => requestAnimationFrame(() => btn.classList.add('active')));
        }

        // 滑動切換的位移範圍：只有停留所列表跟著手指移動，
        // 方向選單、卡框與標頭保持不動；外層裁切層於拖曳／切換時
        // 在左右邊緣加上線性淡出（隱形牆）
        swipeClip = document.createElement('div');
        swipeClip.className = 'bus-swipe-clip';
        swipeArea = document.createElement('div');
        swipeArea.className = 'bus-swipe-area';
        // 切換動畫（點選或滑動確定）進行中也啟用淡出遮罩：
        // 遮罩寬度以 @property 平滑過渡，展開與收回都不會有瞬間切換感
        if (slideDir) {
            swipeArea.classList.add(slideDir === 'left' ? 'bus-slide-in-left' : 'bus-slide-in-right');
            const clipEl = swipeClip;
            clipEl.classList.add('bus-swipe-fade');
            setTimeout(() => clipEl.classList.remove('bus-swipe-fade'), 380);
            slideDir = '';
        }
        swipeClip.appendChild(swipeArea);
        expCard.appendChild(swipeClip);

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
            if (!smooth) { slider.scrollLeft = target; sliderScrollMemo = target; return; }

            const start = slider.scrollLeft;
            const change = target - start;
            if (Math.abs(change) < 2) return;
            const t0 = performance.now();
            const duration = 600;
            const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

            const step = (now) => {
                const p = Math.min(1, (now - t0) / duration);
                slider.scrollLeft = start + change * easeOutExpo(p);
                sliderScrollMemo = slider.scrollLeft;
                if (p < 1) recenterRaf = requestAnimationFrame(step);
                else recenterRaf = null;
            };
            recenterRaf = requestAnimationFrame(step);
        };
        // 開啟時瞬間置中；方向切換時平滑捲動置中，與下方內容切換的順暢感一致
        // 切換時先還原上一個渲染的捲動位置（新 slider 預設在 0），
        // 否則會先瞬間跳回最左再捲過去，產生「多滑一次」的違和感
        requestAnimationFrame(() => {
            if (isDirSwitch) slider.scrollLeft = sliderScrollMemo;
            centerActive(isDirSwitch);
        });

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
            sliderScrollMemo = slider.scrollLeft; // 記錄目前位置供下次重繪還原
            if (recenterRaf) return; // 回正動畫自身觸發的捲動不重置計時
            armRecenter();
        }, { passive: true });

        // --- 2. 停留所列表 ---
        const stopsList = document.createElement('div');
        stopsList.className = 'bus-stops-list';

        const view = computeView(pattern);

        view.stopsToShow.forEach((stop, idx) => {
            // 有巴士行駛在前一站與本站之間時，於該站上方標示車牌與擁擠度
            collectMarkers(pattern, stop, false).forEach(m => {
                const marker = document.createElement('div');
                marker.className = 'bus-marker-row';
                marker.innerHTML = busMarkerHtml(m.bus, m.srcStop, true);
                stopsList.appendChild(marker);
            });

            const row = document.createElement('div');
            row.className = 'bus-stop-row';
            row.dataset.stopIndex = String(idx);
            const t = liveEtaTexts(stop);
            const isTerminal = stop === pattern.stops[pattern.stops.length - 1];
            const noneText = service.state === 'ended' ? '終了' : (isTerminal ? '終点' : '--');
            row.innerHTML = `
                ${stopNameHtml(stop.name, view.nameClassByName[stop.name] || '')}
                ${etaPillHtml(t.eta, t.next, noneText, true)}
            `;

            // 點擊站名 → 底部選單（Google Maps／站牌總覽）
            const nameEl = row.querySelector('.bus-stop-name');
            if (nameEl) {
                nameEl.classList.add('tappable');
                nameEl.onclick = (e) => {
                    e.stopPropagation();
                    if (navigator.vibrate) navigator.vibrate(10);
                    openStopActions(stop.name, busData.operator);
                };
            }

            stopsList.appendChild(row);
        });

        // 記下目前的巴士位置配置，供就地更新比對
        lastMarkerSig = markerSignature(pattern, view);

        swipeArea.appendChild(stopsList);
        expCard.insertAdjacentHTML('beforeend', busCardFooterHtml(busData.fetchedAt));
        listShell.appendChild(expCard);
        container.appendChild(listShell);
        applyMarquees(stopsList);
        playHeightAnim(expCard);

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

        if (prefs.previewStops.length > 0) {
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
        if (prefs.previewStops.length > 0) {
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
// 站牌詳細面板：列出該站牌每條路線的到站資訊
// 點擊路線列可跳轉至該路線總覽（並自動切換到對應方向）
// ============================================================================
export function renderBusStopPanel(data, scrollWrapper) {
    // 站牌面板不需要路線面板的刷新掛勾與倒數計時器
    window.__busPanelRefresh = null;
    window.__busPanelTargetId = null;
    if (window.__busPanelTicker) {
        clearInterval(window.__busPanelTicker);
        window.__busPanelTicker = null;
    }

    const container = document.createElement('div');
    container.className = 'bus-panel-container';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 14px;';
    scrollWrapper.appendChild(container);

    // 開啟中的站牌 key：輪詢器據此重抓該站牌的最新資訊
    const initialStop = data.busStopData || {};
    window.__busStopPanelKey = initialStop.stopName
        ? `busstop:${initialStop.operator}:${initialStop.stopName}`
        : null;

    // 背景補抓完成後就地刷新
    window.__busStopPanelRefresh = () => {
        if (!container.isConnected) {
            window.__busStopPanelRefresh = null;
            window.__busStopPanelKey = null;
            return;
        }
        render();
    };

    function render() {
        container.innerHTML = '';
        // 輪詢可能已寫入更新的資料 → 以全域快取的最新版為準
        const latest = window.__busStopPanelKey && window.GlobalBusStopData[window.__busStopPanelKey];
        if (latest) data.busStopData = latest;
        const stopData = data.busStopData || {};
        const poles = (stopData.stop && stopData.stop.poles) || [];

        // 載入中／查無資料的狀態卡
        if (poles.length === 0) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'extension-route-card';
            emptyCard.style.cssText = 'padding: 32px 20px; text-align: center;';
            emptyCard.innerHTML = stopData.loading
                ? `<div style="font-weight: 700; opacity: 0.8;">停留所の情報を取得しています...</div>`
                : `<div style="font-weight: 700; opacity: 0.8;">この停留所の情報を取得できません</div>`;
            container.appendChild(emptyCard);
            return;
        }

        // 站牌卡：與路線卡同語言的資訊卡（列車 extension-route-card 同構）
        const card = document.createElement('div');
        card.className = 'extension-route-card bus-stopcard';

        // 狀態徽章：任一路線有車 → 運行中；只剩表定 → 車両なし；皆無 → 運行終了
        let hasBus = false, hasDep = false;
        poles.forEach(pole => (pole.routes || []).forEach(rt => {
            if ((rt.buses || []).length > 0) hasBus = true;
            if ((rt.departures_text || []).length > 0) hasDep = true;
        }));
        const info = hasBus
            ? { badge: '運行中', cls: 'status-normal' }
            : (hasDep ? { badge: '車両なし', cls: 'status-attention' } : { badge: '運行終了', cls: 'status-attention' });
        card.innerHTML = busCardHeaderHtml(stopData.stopName || '', stopData.label || 'バス停', info);

        // 實際搭乘時のりば區分意義不大：不顯示「X番のりば」，
        // 各乘車處的路線合併為一份清單（同路線×行き先去重）
        const list = document.createElement('div');
        list.className = 'bus-stops-list';
        const seen = new Set();

        poles.forEach(pole => {
            (pole.routes || []).forEach(route => {
                const dedupeKey = `${route.route}|${route.destination || ''}`;
                if (seen.has(dedupeKey)) return;
                seen.add(dedupeKey);

                const row = document.createElement('div');
                row.className = 'bus-stop-row bus-route-link';

                // 到站資訊優先序：即時 ETA → 走行中位置 → 表定次発 → 運行終了
                let pill;
                const firstBus = (route.buses || [])[0];
                const firstDep = (route.departures_text || [])[0];
                if (firstBus && firstBus.eta_text) {
                    const t = toHalfWidth(firstBus.eta_text);
                    pill = `<span class="bus-eta-pill chip ${etaPillClass(t)}">${t}</span>`;
                } else if (firstBus && typeof firstBus.stops_away === 'number') {
                    pill = firstBus.stops_away === 0
                        ? `<span class="bus-eta-pill chip arriving">まもなく</span>`
                        : `<span class="bus-eta-pill chip run">${firstBus.stops_away}停留所前</span>`;
                } else if (firstDep) {
                    pill = `<span class="bus-eta-pill chip sched">次${toHalfWidth(firstDep).replace('：', ':')}</span>`;
                } else {
                    pill = `<span class="bus-eta-pill chip none">運行終了</span>`;
                }

                const displayName = route.destination
                    ? `${toHalfWidth(route.route)}（${route.destination}）`
                    : toHalfWidth(route.route);

                // 車輛資訊副列：車牌（藍）＋擁擠度＋走行位置
                // 位置已在主列顯示（◯停留所前）時不重複
                let subHtml = '';
                if (firstBus && (firstBus.number || firstBus.occupancy)) {
                    const plate = firstBus.number
                        ? `<span class="bus-eta-pill bus-plate-pill chip"><span class="bus-plate">${firstBus.number}</span></span>`
                        : '';
                    const away = (firstBus.eta_text && typeof firstBus.stops_away === 'number')
                        ? `<span class="bus-away">${firstBus.stops_away === 0 ? 'まもなく到着' : `${firstBus.stops_away}停留所前`}</span>`
                        : '';
                    subHtml = `<div class="bus-stoprow-sub">${plate}${busOccHtml(firstBus.occupancy)}${away}</div>`;
                }

                row.innerHTML = `
                    <div class="bus-stoprow-main">
                        ${stopNameHtml(displayName)}
                        ${pill}
                    </div>
                    ${subHtml}
                `;

                // 點擊 → 跳轉該路線總覽，並帶上行き先讓方向自動切對
                row.onclick = (e) => {
                    e.stopPropagation();
                    if (navigator.vibrate) navigator.vibrate(10);
                    const targetId = makeBusTargetId(stopData.operator, toHalfWidth(route.route));
                    window.__busDesiredDir = { targetId: targetId, destination: route.destination || '' };
                    if (typeof window.previewBusFromSearch === 'function') {
                        window.previewBusFromSearch(targetId);
                    }
                };

                list.appendChild(row);
            });
        });

        card.appendChild(list);
        card.insertAdjacentHTML('beforeend', busCardFooterHtml(stopData.fetchedAt));
        container.appendChild(card);
        applyMarquees(list);
    }

    render();
}

// ============================================================================
// 站牌總覽的立即跳轉：先開面板（有快取用快取、無快取先顯示載入中），
// 同時在背景抓最新資料，完成後就地刷新
// ============================================================================
export function openBusStopOverview(stopName, operator) {
    const key = `busstop:${operator}:${stopName}`;

    if (!window.GlobalBusStopData[key]) {
        window.GlobalBusStopData[key] = {
            operator: operator,
            label: '',
            url: '',
            source: '',
            stopName: stopName,
            stop: { name: stopName, poles: [] },
            loading: true
        };
    }

    if (typeof window.previewBusStopFromSearch === 'function') {
        window.previewBusStopFromSearch(key);
    }

    // 背景抓取最新資料（即使有快取也更新一次）
    fetchBusApi(`/stop/${encodeURIComponent(stopName)}`).then(json => {
        const keys = storeStopResults(json);
        const freshKey = keys.includes(key) ? key : (keys.find(k => k.endsWith(`:${stopName}`)) || keys[0]);

        if (!freshKey && window.GlobalBusStopData[key]) {
            delete window.GlobalBusStopData[key].loading; // 查無資料 → 顯示「取得できません」
        }

        const tempCard = (window.appRailwayData || []).find(c => c.id === 'temp-search-busstop');
        if (tempCard) {
            tempCard.busStopData = window.GlobalBusStopData[freshKey || key] || tempCard.busStopData;
        }
        if (typeof window.__busStopPanelRefresh === 'function') {
            window.__busStopPanelRefresh();
        }
    });
}
