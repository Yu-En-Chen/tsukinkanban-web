// ship.js - 東海汽船（伊豆諸島・小笠原航路）運航情報
// 入口：搜尋（東海汽船・船・島名・各航路）、島嶼巴士卡片的「本日の着岸港」、時刻表頁面的船班提示框
// 顯示：
//   1. 航路卡片（targetId：ship:航路名）：與公車路線相同，搜尋預覽卡可加入既有卡片／新規卡片，
//      燈號依今天各便的運航狀況；混合卡片內以資訊卡呈現
//   2. 運航情報頁面（通用頁面）：日期切換＋依航路分組的船班清單（可只看一條航路）
// 資料：GET /api/ship/schedule?date=YYYY-MM-DD（今天每 5 分鐘重抓，其他日期只抓一次）
import { openBusTimetable } from './bus-timetable.js';

const SHIP_API_BASE = 'https://api.tsukinkanban.com/api/ship';
const SHIP_TIMEOUT_MS = 30000;
const SHIP_REFRESH_MS = 5 * 60 * 1000;
const SHIP_OFFICIAL_URL = 'https://www.tokaikisen.co.jp/';
const SHIP_STATUS_URL = 'https://www.tokaikisen.co.jp/schedule/';
const SHIP_LEVELS = ['cancelled', 'pending', 'conditional', 'changed', 'undecided', 'normal'];
const SHIP_CACHE_KEY = 'Tsukin_Cached_ShipData';
const SHIP_COMPANY = '東海汽船';
const SHIP_COLOR = '#1D5FA8'; // 航路卡片的預設色
// 運航歷史：與鐵道・航班共用 /api/history/all（Cloudflare 1 分鐘快取），ship 區塊以各便的 history_key 為 key
const HISTORY_ALL_URL = 'https://api.tsukinkanban.com/api/history/all';
const HISTORY_FRESH_MS = 60000;
// 有巴士資料的島（著岸港可直接開該站的巴士時刻表）
const ISLAND_BUS_OPERATORS = { '大島': 'OshimaBus', '三宅島': 'MiyakeVill' };

const shipCache = new Map(); // 日期 -> { at, data }

// 今天的運航情報（卡片用，存進 localStorage 讓下次開啟時先有東西可顯示）
// { date, fetchedAt, data }。牌組の最初の描畫より前に戻しておく（模組載入時）
window.GlobalShipData = window.GlobalShipData || null;
try {
    const cached = localStorage.getItem(SHIP_CACHE_KEY);
    if (cached && !window.GlobalShipData) window.GlobalShipData = JSON.parse(cached);
} catch (e) { }

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============================================================================
// 日期（一律以日本時間計算，不使用瀏覽器的本地時區）
// ============================================================================
function jstToday() {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(ymd, n) {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function formatDateJa(ymd) {
    const d = new Date(`${ymd}T00:00:00Z`);
    return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${'日月火水木金土'[d.getUTCDay()]}）`;
}

// 日付切り替えの各マス用：10/17(土)（手機寬度で三マス並べるため半角かっこで詰める）
function shortDateJa(ymd) {
    const d = new Date(`${ymd}T00:00:00Z`);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${'日月火水木金土'[d.getUTCDay()]})`;
}

// 今日から何日目か（日本時間の今日＝0）
function dayOffset(ymd) {
    return Math.round((Date.parse(`${ymd}T00:00:00Z`) - Date.parse(`${jstToday()}T00:00:00Z`)) / 86400000);
}

// 今日を基準にした呼び方：一昨日・昨日・今日・明日・明後日、それより先は「3日後」「3日前」
function relativeDayLabel(offset) {
    const named = { '-2': '一昨日', '-1': '昨日', 0: '今日', 1: '明日', 2: '明後日' };
    if (named[offset] !== undefined) return named[offset];
    return offset > 0 ? `${offset}日後` : `${-offset}日前`;
}

// 日本時間の現在時刻 HH:MM
function jstNowHm() {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

function fmtDate(s) {
    const [y, m, d] = String(s).slice(0, 10).split('-');
    return `${y}年${Number(m)}月${Number(d)}日`;
}

// ISO 時刻 → 日本時間の HH:MM
function jstHm(iso) {
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) return '';
    return new Date(ms + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

// 著岸港 → 巴士站名：只有大島、三宅島有巴士資料；「錆ヶ浜（阿古）港」→「錆ヶ浜港」
function busStopFor(island, port) {
    if (!ISLAND_BUS_OPERATORS[island] || !port || port === '未定') return null;
    return port.replace(/（[^）]*）|\([^)]*\)/g, '').trim() || null;
}

// ============================================================================
// 資料取得：今天 5 分鐘內、其他日期在這次開啟期間都沿用快取（錯誤回應不快取）
// ============================================================================
async function fetchSchedule(date, force = false) {
    const hit = shipCache.get(date);
    const maxAge = date === jstToday() ? SHIP_REFRESH_MS : Infinity;
    if (!force && hit && Date.now() - hit.at < maxAge) return hit.data;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SHIP_TIMEOUT_MS);
    try {
        const res = await fetch(`${SHIP_API_BASE}/schedule?date=${encodeURIComponent(date)}`, { signal: ctrl.signal });
        if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && !data.error) shipCache.set(date, { at: Date.now(), data });
        if (data && date === jstToday()) storeToday(date, data);
        return data;
    } finally {
        clearTimeout(timer);
    }
}

// ============================================================================
// 今天的運航情報（航路卡片用）：抓到後通知卡片更新（shipDataUpdated）
// ============================================================================
function storeToday(date, data) {
    window.GlobalShipData = { date, fetchedAt: Date.now(), data };
    try { localStorage.setItem(SHIP_CACHE_KEY, JSON.stringify(window.GlobalShipData)); } catch (e) { }
    window.dispatchEvent(new CustomEvent('shipDataUpdated'));
}

// 今天的資料（日期不同＝昨天以前的快取，不能拿來判斷燈號）
function todayStore() {
    const s = window.GlobalShipData;
    return s && s.date === jstToday() && s.data ? s : null;
}

let pendingToday = null;
let lastFailAt = 0;

// 今天的資料不足 5 分鐘就沿用，否則重抓（同時只抓一次，失敗後 30 秒內不再試）
export function ensureShipToday() {
    const s = todayStore();
    if (s && Date.now() - s.fetchedAt < SHIP_REFRESH_MS) return Promise.resolve(s);
    if (pendingToday) return pendingToday;
    if (Date.now() - lastFailAt < 30000) return Promise.resolve(null);
    pendingToday = fetchSchedule(jstToday(), true)
        .then(() => todayStore())
        .catch(() => { lastFailAt = Date.now(); return null; })
        .finally(() => { pendingToday = null; });
    return pendingToday;
}

export function isShipTargetId(id) {
    return typeof id === 'string' && id.startsWith('ship:');
}

export function makeShipTargetId(route) {
    return `ship:${route}`;
}

export function shipRouteName(targetId) {
    return String(targetId || '').slice(5);
}

export function getShipColor() {
    return SHIP_COLOR;
}

// 牌組（已儲存的卡片）裡的航路
function savedShipIds() {
    const ids = new Set();
    (window.appRailwayData || []).forEach(card => {
        if (String(card.id).startsWith('temp-search')) return;
        (card.targetLineIds || []).forEach(id => { if (isShipTargetId(id)) ids.add(id); });
    });
    return ids;
}

// 牌組に航路がある、または航路の資訊卡が表示中のときだけ更新（どちらも無ければ通信しない）
export function refreshSavedShips() {
    if (savedShipIds().size === 0 && !document.querySelector('.ship-route-card')) return;
    ensureShipToday();
}

export function initShips() {
    // 快取は模組載入時に還原済み。ここでは輪詢だけ（請求は牌組に航路があるときだけ）
    // 每分鐘：表示中の資訊卡の「次の出航」を進め、5 分以上たっていれば再取得
    if (!window.__shipPollTimer) {
        window.__shipPollTimer = setInterval(() => {
            if (document.hidden) return;
            document.querySelectorAll('.ship-route-card').forEach(fillShipCard);
            refreshSavedShips();
        }, 60000);
    }
}

// ============================================================================
// 航路の燈號：今天各便の運航状況から
//   全便欠航・一部欠航 → 打叉／条件付き運航・出帆港変更 → 三角／
//   就航判断待ち・出帆港未定・運航情報なし → 注意／すべて運航予定 → 綠燈／
//   今天この航路の便がない → 打叉（島嶼巴士と同じ扱い）
// 欠航・条件付き・出帆港変更は東海汽船の運航情報（公式の告知）によるものなので、
// 鐵道の「公式発表あり」と同じく注意燈も一緒に点ける（今日便なしは告知ではないので打叉だけ）
// ============================================================================
const LAMP_FLAGS = {
    severe: [false, false, false, true, false, false, true],
    none: [false, false, false, true, false, false, false],
    minor: [false, false, false, false, true, false, true],
    attention: [false, false, false, false, false, false, true],
    normal: [false, false, false, false, false, true, false]
};

// 今日これからの出航（欠航は除く）
function nextTrip(trips) {
    const now = jstNowHm();
    return trips.find(t => {
        const dep = (t.departure && t.departure.text) || '';
        if (!/^\d{1,2}:\d{2}$/.test(dep)) return false;
        if (t.status && t.status.level === 'cancelled') return false;
        return dep.padStart(5, '0') >= now;
    }) || null;
}

export function shipRouteInfo(targetId) {
    const route = shipRouteName(targetId);
    const s = todayStore();
    const base = { route, trips: [], data: s ? s.data : null, fetchedAt: s ? s.fetchedAt : 0 };
    if (!s) {
        return { ...base, lamp: 'attention', badge: '取得中', cls: 'status-attention', desc: '運航情報を取得しています...', message: '運航情報を取得しています...' };
    }
    if (s.data.error) {
        return { ...base, lamp: 'attention', badge: '情報なし', cls: 'status-attention', desc: '運航情報を取得できません', message: s.data.error };
    }
    const r = (s.data.routes || []).find(x => x.route === route);
    const trips = (r && r.trips) || [];
    if (trips.length === 0) {
        return { ...base, lamp: 'none', badge: '運航なし', cls: 'status-delayed', desc: '本日の運航はありません', message: '本日、この航路の運航はありません。' };
    }

    // status が null の便（運航情報なし）は判定から外す。全便 null なら「運航情報なし」
    const levels = trips.map(t => (t.status ? t.status.level : null)).filter(Boolean);
    const count = l => levels.filter(x => x === l).length;
    const cancelled = count('cancelled');
    const next = nextTrip(trips);
    const nextText = next ? `次の出航 ${next.departure.text} ${next.departure.port || ''}発` : '本日の出航は終了しました';

    let lamp, badge, cls, summary;
    if (levels.length === 0) {
        lamp = 'attention'; badge = '情報なし'; cls = 'status-attention';
        summary = s.data.alerts_error ? '運航状況を取得できません' : '運航情報なし';
    } else if (cancelled === trips.length) {
        return { ...base, trips, lamp: 'severe', badge: '全便欠航', cls: 'status-delayed', desc: '本日は全便欠航です', message: `本日の${trips.length}便はすべて欠航です。` };
    } else if (cancelled > 0) {
        lamp = 'severe'; badge = '一部欠航'; cls = 'status-delayed'; summary = `${cancelled}便欠航`;
    } else if (count('conditional') > 0) {
        lamp = 'minor'; badge = '条件付き'; cls = 'status-delayed-minor'; summary = '条件付き運航';
    } else if (count('changed') > 0) {
        lamp = 'minor'; badge = '出帆港変更'; cls = 'status-delayed-minor'; summary = '出帆港変更あり';
    } else if (count('pending') > 0) {
        lamp = 'attention'; badge = '判断待ち'; cls = 'status-attention'; summary = '就航判断待ち';
    } else if (count('undecided') > 0) {
        lamp = 'attention'; badge = '出帆港未定'; cls = 'status-attention'; summary = '出帆港未定';
    } else {
        lamp = 'normal'; badge = '運航予定'; cls = 'status-normal'; summary = '全便運航予定';
    }
    return { ...base, trips, lamp, badge, cls, desc: `${summary}・${nextText}`, message: `本日${trips.length}便（${summary}）。${nextText}。` };
}

function updateTimeText(info) {
    const at = info.data && info.data.alerts_updated_at ? jstHm(info.data.alerts_updated_at) : '';
    if (at) return `運航情報 ${at} 更新`;
    return info.fetchedAt ? `更新: ${jstHm(new Date(info.fetchedAt).toISOString())}` : '';
}

// 搜尋預覽卡（航路だけのカード）の卡面
export function generateShipDataFormat(targetId) {
    const info = shipRouteInfo(targetId);
    return {
        flags: LAMP_FLAGS[info.lamp].slice(),
        desc: info.desc,
        updateTime: info.fetchedAt ? jstHm(new Date(info.fetchedAt).toISOString()) : '',
        hex: SHIP_COLOR
    };
}

// 混合卡片用：一筆 detailedLine 摘要（lamp で牌組の燈號を集計）
export function generateShipLineSummary(targetId) {
    const info = shipRouteInfo(targetId);
    return {
        id: targetId,
        name: info.route,
        company: SHIP_COMPANY,
        status: info.badge,
        message: info.desc,
        delay: 0,
        updateTime: info.fetchedAt ? jstHm(new Date(info.fetchedAt).toISOString()) : '',
        url: SHIP_STATUS_URL,
        isDelayed: info.lamp === 'minor',
        isError: false,
        isAttention: info.lamp === 'attention',
        advancedDetails: [],
        isShipLine: true,
        lamp: info.lamp,
        hasNotice: info.lamp === 'severe' || info.lamp === 'minor' // 公式の運航情報あり → 注意燈も
    };
}

// ============================================================================
// 運航歷史（各便の運航情報の移り変わり）
// history-daemon.js が毎分 /api/history/all を取得して window.appHistoryAll に置く。
// 起動直後などまだ無いときだけ、ここで同じ URL を取得する（今日・昨日の便を表示するときだけ）
// 表示するかどうかは「その便の history_key に記録があるか」だけで決める
// （船が出たあと公式の告知が下ろされて status が null になっても、記録は残っている）
// ============================================================================
let historyPending = null;

export function shipHistoryFor(key) {
    const all = window.appHistoryAll;
    const records = key && all && all.ship ? all.ship[key] : null;
    return Array.isArray(records) ? records : [];
}

function ensureShipHistory() {
    if (window.appHistoryAllAt && Date.now() - window.appHistoryAllAt < HISTORY_FRESH_MS) return;
    if (historyPending) return;
    historyPending = fetch(HISTORY_ALL_URL)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
            if (!data) return;
            window.appHistoryAll = data;
            window.appHistoryAllAt = Date.now();
            window.dispatchEvent(new CustomEvent('shipHistoryUpdated'));
        })
        .catch(() => { })
        .finally(() => { historyPending = null; });
}

// 歷史の 1 件＝航班の履歴と同じく「時刻＋状況」の一行だけ。
// 二行目は港が決まった・変わったときだけ短く（三宅島：錆ヶ浜（阿古）港に決定／三宅島：三池港 → 錆ヶ浜（阿古）港）。
// 告知の原文や着岸港の一覧は船頁面の本体にあるので、歷史には出さない
function historyNote(r, prev) {
    const tags = r.tags || [];
    if ((r.changes || []).length > 0) {
        return r.changes.map(c => `${c.island}：${c.from || '—'} → ${c.to || '未定'}`).join('、');
    }
    if (tags.includes('出帆港決定')) {
        const before = (prev && prev.ports) || {};
        const decided = Object.entries(r.ports || {})
            .filter(([island, port]) => port && port !== '未定' && (!before[island] || before[island] === '未定'))
            .map(([island, port]) => `${island}：${port}に決定`);
        return decided.join('、') || '出帆港決定';
    }
    if (tags.includes('案内変更') && !tags.includes('状況変更')) return '案内の更新';
    return '';
}

// 歷史の時系列：新しい順、左に縦線、古いものは薄く、間に点線（通知・履歴の航班と同じ見せ方）
// 状況の文字色は運航状況の徽章と同じ（欠航＝赤・条件付き＝黄…）
export function shipHistoryHtml(records) {
    const list = records || [];
    const items = list.map((r, i) => {
        const level = SHIP_LEVELS.includes(r.level) ? r.level : 'undecided';
        const hm = Number.isFinite(r.timestamp) ? jstHm(new Date(r.timestamp).toISOString()) : '';
        const note = historyNote(r, list[i - 1]);
        return `<div class="sh-hist-item">
            <div class="sh-hist-head">
                <span class="sh-hist-text sh-lv-${level}">${esc(r.label || '運航情報')}</span>
                ${hm ? `<span class="sh-hist-time">${hm}</span>` : ''}
            </div>
            ${note ? `<div class="sh-hist-note">${esc(note)}</div>` : ''}
        </div>`;
    }).reverse();
    if (items.length > 0) items[0] = items[0].replace('class="sh-hist-item"', 'class="sh-hist-item latest"');
    return `<div class="sh-hist-list">${items.join('')}</div>`;
}

// 便の「運航履歴」：記録があるときだけ（無ければ何も出さない）
function tripHistoryHtml(trip) {
    const records = shipHistoryFor(trip.history_key);
    if (records.length === 0) return '';
    return `<details class="sh-hist" data-key="${esc(trip.history_key)}">
        <summary>運航履歴<span class="sh-hist-count">${records.length}件</span></summary>
        ${shipHistoryHtml(records)}
    </details>`;
}

// 再描畫しても開いていた運航情報・運航履歴は開いたまま
function openDetailKeys(root) {
    return new Set([...root.querySelectorAll('details[data-key][open]')].map(d => d.dataset.key));
}

function restoreDetailKeys(root, open) {
    root.querySelectorAll('details[data-key]').forEach(d => { if (open.has(d.dataset.key)) d.open = true; });
}

// ============================================================================
// 描畫
// ============================================================================
const CHEV_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const CHEV_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
const BUS_SVG = '<svg class="sh-bus-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>';

// 上方：年月（離今天兩天以上時右側「今日に戻る」）＋三マスの日付切り替え
// 真ん中が表示中の日付、左右が前日・翌日。各マスに「昨日／今日／明日／3日後」を添えて、
// 何回押しても今どの日を見ているか分かるように
function dateBarHtml(state) {
    const off = dayOffset(state.date);
    const d = new Date(`${state.date}T00:00:00Z`);
    const cell = (ymd, n) => `<span class="sh-day-in"><span class="sh-day-date">${esc(shortDateJa(ymd))}</span> <span class="sh-day-rel">${esc(relativeDayLabel(n))}</span></span>`;
    const prev = addDays(state.date, -1);
    const next = addDays(state.date, 1);
    return `<div class="sh-datehead">
        <div class="sh-month-row">
            <span class="sh-month">${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月</span>
            ${Math.abs(off) >= 2 ? '<button type="button" class="sh-back-today">今日に戻る</button>' : ''}
        </div>
        <div class="sh-datebar" role="group" aria-label="日付">
            <button type="button" class="sh-day" data-shift="-1" aria-label="${esc(formatDateJa(prev))}">${CHEV_L}${cell(prev, off - 1)}</button>
            <div class="sh-day active${off === 0 ? ' is-today' : ''}" aria-current="date" aria-label="${esc(formatDateJa(state.date))}">${cell(state.date, off)}</div>
            <button type="button" class="sh-day" data-shift="1" aria-label="${esc(formatDateJa(next))}">${cell(next, off + 1)}${CHEV_R}</button>
        </div>
    </div>`;
}

// 跨日の到着は「翌 15:40」：「翌」を小さく
function timeHtml(text) {
    const t = String(text || '');
    const m = t.match(/^翌\s*(.*)$/);
    return m ? `<small class="sh-nextday">翌</small> ${esc(m[1])}` : esc(t);
}

function tripHtml(trip, key) {
    const st = trip.status;
    const dep = trip.departure || {};
    const arr = trip.arrival || {};
    // status が null＝運航情報なし（未来の日付など）。停航ではないので徽章を出さない
    const level = st && SHIP_LEVELS.includes(st.level) ? st.level : 'undecided';
    const badge = st && st.label ? `<span class="sh-badge sh-${level}">${esc(st.label)}</span>` : '';
    // 便名と船名はそれぞれ一まとまり（折り返すなら「103便」と「セブンアイランド結」の間で）
    const ship = [trip.name, trip.ship].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join(' ');

    const changes = ((st && st.changes) || []).map(c =>
        `<div class="sh-change">⚠ ${esc(c.island)}：${esc(c.from || '—')} → ${esc(c.to || '未定')}</div>`).join('');

    const ports = Object.entries((st && st.ports) || {}).map(([island, port]) => {
        const stop = busStopFor(island, port);
        const inner = `<span class="sh-island">${esc(island)}</span>${esc(port || '未定')}`;
        return stop
            ? `<button type="button" class="sh-port sh-bus" data-stop="${esc(stop)}" data-op="${ISLAND_BUS_OPERATORS[island]}" aria-label="${esc(stop)}のバス時刻表">${inner}${BUS_SVG}</button>`
            : `<span class="sh-port">${inner}</span>`;
    }).join('');

    const messages = (st && st.messages) || [];
    const url = st && /^https?:\/\//.test(st.url || '') ? st.url : '';
    const details = messages.length > 0 || url
        ? `<details class="sh-msg" data-key="${esc(`${trip.history_key || key}:msg`)}">
            <summary>運航情報</summary>
            ${messages.map(m => `<p>${esc(m)}</p>`).join('')}
            ${url ? `<a class="sh-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">東海汽船の運航情報（公式）</a>` : ''}
        </details>`
        : '';

    // 出発・到着は路線図ふうに二段（点と線でつなぎ、時刻の桁をそろえる）。その下に便名・船名と状況の徽章
    return `<div class="sh-trip${level === 'cancelled' && st ? ' is-cancelled' : ''}">
        <div class="sh-times">
            <span class="sh-stop dep"><span class="sh-time">${timeHtml(dep.text)}</span> <span class="sh-pname">${esc(dep.port || '')}</span></span>
            <span class="sh-stop arr"><span class="sh-time">${timeHtml(arr.text)}</span> <span class="sh-pname">${esc(arr.port || '')}</span></span>
        </div>
        ${ship || badge ? `<div class="sh-row"><span class="sh-ship">${ship}</span>${badge}</div>` : ''}
        ${changes}
        ${ports ? `<div class="sh-ports"><span class="sh-ports-label">着岸港</span>${ports}</div>` : ''}
        ${details}
        ${tripHistoryHtml(trip)}
    </div>`;
}

function footerHtml(data) {
    const lines = [];
    const u = data.updated;
    if (u && u.effective_from) {
        lines.push(`時刻表：${fmtDate(u.effective_from)}改正${u.valid_to ? `（${fmtDate(u.valid_to)}まで）` : ''}`);
    }
    if (data.is_today && data.alerts_updated_at) {
        const hm = jstHm(data.alerts_updated_at);
        if (hm) lines.push(`運航情報 ${hm} 更新`);
    }
    return `<div class="sh-foot">
        ${lines.map(l => `<div>${esc(l)}</div>`).join('')}
        <a class="sh-link" href="${SHIP_STATUS_URL}" target="_blank" rel="noopener noreferrer">東海汽船の運航状況（公式）</a>
        <p class="tt-credit">公共交通オープンデータセンターのデータを利用しています</p>
    </div>`;
}

function scheduleHtml(data, route = '') {
    // 時刻表が見つからない日：原文＋公式サイト
    if (data.error) {
        return `<div class="tt-status">
            <div>${esc(data.error)}</div>
            <a class="sh-link" href="${SHIP_OFFICIAL_URL}" target="_blank" rel="noopener noreferrer">東海汽船 公式サイト</a>
        </div>`;
    }
    const notices = [];
    if (data.alerts_error) {
        notices.push(`<div class="sh-notice">運航状況を取得できませんでした。<a href="${SHIP_STATUS_URL}" target="_blank" rel="noopener noreferrer">公式の運航状況を見る</a></div>`);
    }
    if (data.updated && data.updated.expired) {
        notices.push(`<div class="tt-expired">時刻表の有効期限が切れています。新しい時刻表の公開を待っています。</div>`);
    }

    // route：航路卡片から開いたときはその航路だけ（「すべての航路」で解除）
    const routes = (data.routes || []).filter(r => (r.trips || []).length > 0 && (!route || r.route === route));
    const list = routes.length === 0
        ? `<div class="tt-status">${route ? 'この日はこの航路の運航がありません' : 'この日は運航がありません'}</div>`
        : routes.map((r, ri) => `<section class="sh-route">
            <h3 class="sh-route-name">${esc(r.route || '')}</h3>
            ${r.trips.map((t, ti) => tripHtml(t, `${ri}:${ti}:${t.name || t.ship || ''}`)).join('')}
        </section>`).join('');

    return `${notices.join('')}<div class="sh-list">${list}</div>${footerHtml(data)}`;
}

function render(root, state) {
    // 重繪（5 分ごとの更新・歷史の更新など）で開いていた運航情報・運航履歴が閉じないように
    const open = openDetailKeys(root);
    let body;
    if (state.error) {
        body = `<div class="tt-status"><div>${esc(state.error)}</div>
            <button type="button" class="tt-retry">再読み込み</button></div>`;
    } else if (!state.data) {
        body = `<div class="tt-status tt-loading">
            <div>運航情報を読み込んでいます<span class="tt-dots"><i>.</i><i>.</i><i>.</i></span></div></div>`;
    } else {
        body = scheduleHtml(state.data, state.route);
    }
    const filter = state.route
        ? `<div class="sh-filter"><span class="sh-filter-name">${esc(state.route)}</span><button type="button" class="sh-filter-clear">すべての航路</button></div>`
        : '';
    root.innerHTML = dateBarHtml(state) + filter + body;
    restoreDetailKeys(root, open);
}

// silent：今天的定時更新。抓取期間保留目前的清單，失敗也不蓋掉
async function load(root, state, silent = false) {
    const token = ++state.loadToken;
    const date = state.date;
    // 歷史があり得るのは今日の便と、昨日出てまだ航行中の夜行船だけ
    const off = dayOffset(date);
    if (off === 0 || off === -1) ensureShipHistory();
    clearTimeout(state.refreshTimer);
    if (!silent) {
        state.data = null;
        state.error = '';
        render(root, state);
    }
    try {
        const data = await fetchSchedule(date, silent);
        if (token !== state.loadToken || !root.isConnected) return;
        state.data = data;
        state.error = '';
        render(root, state);
    } catch (e) {
        if (token !== state.loadToken || !root.isConnected) return;
        if (!silent) {
            state.error = e && e.name === 'AbortError'
                ? '運航情報の読み込みがタイムアウトしました'
                : '運航情報を読み込めませんでした';
            render(root, state);
        }
    }
    // 今天的頁面每 5 分鐘重抓（其他日期不定時更新）
    if (state.data && state.data.is_today) {
        state.refreshTimer = setTimeout(() => {
            if (root.isConnected && token === state.loadToken) load(root, state, true);
        }, SHIP_REFRESH_MS);
    }
}

// date：YYYY-MM-DD（省略時為日本時間的今天）
// route：只顯示這條航路（航路卡片的「ほかの日の運航」）
// onBack：返回鈕的去處（例：回到開啟它的時刻表）。未指定時返回＝關閉
export function openShipSchedule({ date = '', route = '', onBack = null } = {}) {
    if (typeof window.openUniversalPage !== 'function') return;
    window.openUniversalPage('東海汽船 運航情報', '<div class="sh-root"></div>', { onBack });
    const root = document.querySelector('#universal-page-content .sh-root');
    if (!root) return;

    const state = {
        date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : jstToday(),
        route, onBack, data: null, error: '', loadToken: 0, refreshTimer: null
    };

    const goTo = (d) => {
        state.date = d;
        if (navigator.vibrate) navigator.vibrate(8);
        const content = document.getElementById('universal-page-content');
        if (content) content.scrollTop = 0;
        load(root, state);
    };

    // 歷史が更新されたら（毎分）表示中のページにも反映。ページを閉じたら外す
    const onHistory = () => {
        if (!root.isConnected) {
            window.removeEventListener('historyDataUpdated', onHistory);
            window.removeEventListener('shipHistoryUpdated', onHistory);
            return;
        }
        if (state.data) render(root, state);
    };
    window.addEventListener('historyDataUpdated', onHistory);
    window.addEventListener('shipHistoryUpdated', onHistory);

    root.addEventListener('click', (e) => {
        const shift = e.target.closest('.sh-day[data-shift]');
        if (shift) { goTo(addDays(state.date, Number(shift.dataset.shift))); return; }
        if (e.target.closest('.sh-back-today')) { goTo(jstToday()); return; }
        if (e.target.closest('.sh-filter-clear')) {
            state.route = '';
            if (navigator.vibrate) navigator.vibrate(8);
            render(root, state);
            return;
        }
        // 著岸港の 🚌：その港の巴士時刻表。返回で同じ日付の運航情報に戻る
        const bus = e.target.closest('.sh-bus');
        if (bus) {
            if (navigator.vibrate) navigator.vibrate(8);
            const stop = bus.dataset.stop;
            openBusTimetable({
                title: `${stop} 時刻表`, stop, operator: bus.dataset.op,
                onBack: () => openShipSchedule({ date: state.date, route: state.route, onBack: state.onBack })
            });
            return;
        }
        if (e.target.closest('.tt-retry')) load(root, state);
    });

    load(root, state);
}

// ============================================================================
// 航路の資訊卡：搜尋預覽卡の面板と混合卡片の中で共通
// 標頭（航路名・東海汽船・状況の徽章）＋訊息＋今天の各便＋「ほかの日の運航」と更新時刻
// ============================================================================
function shipCardHtml(targetId) {
    const info = shipRouteInfo(targetId);
    const notice = info.data && info.data.alerts_error
        ? `<div class="sh-notice">運航状況を取得できませんでした。<a href="${SHIP_STATUS_URL}" target="_blank" rel="noopener noreferrer">公式の運航状況を見る</a></div>`
        : '';
    const trips = info.trips.length > 0
        ? `<div class="sh-card-trips">${info.trips.map((t, i) => tripHtml(t, `${i}:${t.name || t.ship || ''}`)).join('')}</div>`
        : '';
    const upd = updateTimeText(info);
    return `
        <div class="ext-card-header">
            <div class="ext-card-title-group">
                <div class="ext-route-name">${esc(info.route)}</div>
                <div class="ext-route-company">${SHIP_COMPANY}</div>
            </div>
            <div class="ext-status-badge ${info.cls}">${esc(info.badge)}</div>
        </div>
        <div class="ext-card-divider"></div>
        <div class="ext-card-message">${esc(info.message)}</div>
        ${notice}
        ${trips}
        <div class="ext-card-footer ship-card-footer">
            <button type="button" class="ship-days-btn">ほかの日の運航${CHEV_R}</button>
            ${upd ? `<span class="ext-update-time">${esc(upd)}</span>` : ''}
        </div>`;
}

// 資料更新・毎分の時刻経過で中身を差し替え（変化がなければ触らない。開いた運航情報は開いたまま）
function fillShipCard(card) {
    const html = shipCardHtml(card.dataset.shipTarget);
    if (card._shipHtml === html) return;
    const open = openDetailKeys(card);
    card._shipHtml = html;
    card.innerHTML = html;
    restoreDetailKeys(card, open);
}

export function renderShipLineCard(targetId) {
    const card = document.createElement('div');
    card.className = 'extension-route-card ship-route-card';
    card.dataset.shipTarget = targetId;
    fillShipCard(card);
    card.addEventListener('click', (e) => {
        // 著岸港の 🚌：その港の巴士時刻表（返回でこのカードに戻る）
        const bus = e.target.closest('.sh-bus');
        if (bus) {
            e.stopPropagation();
            if (navigator.vibrate) navigator.vibrate(8);
            openBusTimetable({ title: `${bus.dataset.stop} 時刻表`, stop: bus.dataset.stop, operator: bus.dataset.op });
            return;
        }
        // ほかの日：運航情報ページをこの航路だけで
        if (e.target.closest('.ship-days-btn')) {
            e.stopPropagation();
            if (navigator.vibrate) navigator.vibrate(10);
            openShipSchedule({ route: shipRouteName(targetId) });
        }
    });
    ensureShipToday(); // 不足 5 分鐘的資料直接沿用
    ensureShipHistory(); // 今日の各便の運航履歴（毎分の history-daemon と共用）
    return card;
}

// 搜尋預覽卡の面板：資訊卡＋（預覽時）既存カード追加・新規カード作成
export function renderShipRoutePanel(data, scrollWrapper, opts = {}) {
    const targetId = (data.targetLineIds && data.targetLineIds[0]) || '';
    const container = document.createElement('div');
    container.className = 'ship-panel-container';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 14px;';
    container.appendChild(renderShipLineCard(targetId));

    if (opts.isPreview) {
        const btnContainer = document.createElement('div');
        btnContainer.className = 'flight-action-buttons-container';
        const iconListPlus = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>`;
        const iconSquarePlus = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;
        const makeBtn = (iconHtml, text, onClick) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'flight-action-btn';
            btn.innerHTML = `${iconHtml}<span style="font-size: 0.9em; letter-spacing: -0.5px;">${text}</span>`;
            btn.onclick = (e) => { e.stopPropagation(); onClick(); };
            return btn;
        };
        if (typeof opts.onAddToExisting === 'function') btnContainer.appendChild(makeBtn(iconListPlus, '既存カード追加', opts.onAddToExisting));
        if (typeof opts.onCreateCard === 'function') btnContainer.appendChild(makeBtn(iconSquarePlus, '新規カード作成', opts.onCreateCard));
        if (btnContainer.children.length > 0) container.appendChild(btnContainer);
    }
    scrollWrapper.appendChild(container);
}

// 表示中の資訊卡は資料・歷史が届いたら差し替え
['shipDataUpdated', 'historyDataUpdated', 'shipHistoryUpdated'].forEach(ev => window.addEventListener(ev, () => {
    document.querySelectorAll('.ship-route-card').forEach(fillShipCard);
}));

// 右上の外部サイトボタンに並べる「◯◯航路 運航情報」（ほかの日付・この航路だけ）
window.getShipEntries = function (card) {
    return ((card && card.targetLineIds) || []).filter(isShipTargetId).map(id => {
        const route = shipRouteName(id);
        return { name: `${route} 運航情報`, open: (onBack) => openShipSchedule({ route, onBack }) };
    });
};

// ============================================================================
// 搜尋：
//   ・東海汽船・船・フェリーなど会社全体の語 → 「東海汽船 運航情報」＋今日の全航路
//   ・島名・港名・航路名の一部（三宅・熱海…）→ 該当する航路＋「東海汽船 運航情報」
// 航路一覧は今日の運航情報から作る。まだ無ければ取得し、届いたら検索をやり直す（shipSearchReady）
// ============================================================================
const SHIP_COMPANY_WORDS = ['東海汽船', 'とうかいきせん', 'tokaikisen', '運航情報', '船', 'フェリー', 'ferry', 'ship', '伊豆諸島', '小笠原', '竹芝'];
const SHIP_PLACE_WORDS = ['大島', '利島', '新島', '式根島', '神津島', '三宅島', '御蔵島', '八丈島', '熱海', '館山', '久里浜', '下田', '稲取'];

const shipNorm = x => String(x || '').toLowerCase().replace(/[- ]/g, '');

// 前方一致の途中（「三宅」→ 三宅島）も拾う。英字の短い入力（「sh」→ ship）は誤爆するので 4 文字以上から
function minPartialLen(k) {
    return /^[\x00-\x7f]+$/.test(k) ? 4 : 2;
}

function wordHit(k, words) {
    return words.some(w => k.includes(w) || (k.length >= minPartialLen(k) && w.includes(k)));
}

let searchFetchRequested = false;

export function searchShip(lowKeyword) {
    const k = lowKeyword || '';
    if (!k) return [];
    const company = wordHit(k, SHIP_COMPANY_WORDS);
    const s = todayStore();
    const routes = s && !s.data.error ? (s.data.routes || []).filter(r => (r.trips || []).length > 0) : [];
    const matched = company ? routes : routes.filter(r => k.length >= minPartialLen(k) && (
        shipNorm(r.route).includes(k) ||
        r.trips.some(t => shipNorm(t.departure && t.departure.port).includes(k) || shipNorm(t.arrival && t.arrival.port).includes(k))));
    if (!company && matched.length === 0 && !wordHit(k, SHIP_PLACE_WORDS)) return [];

    // 今日の航路一覧がまだ無い（または古い）：取得して、届いたら検索をやり直す
    if (!s || Date.now() - s.fetchedAt >= SHIP_REFRESH_MS) {
        if (!searchFetchRequested) {
            searchFetchRequested = true;
            ensureShipToday().then(fresh => {
                searchFetchRequested = false;
                if (fresh) window.dispatchEvent(new CustomEvent('shipSearchReady'));
            });
        }
    }

    const items = matched.map(r => {
        const id = makeShipTargetId(r.route);
        return {
            id,
            name: r.route,
            company: SHIP_COMPANY,
            isShipRoute: true,
            statusFlags: LAMP_FLAGS[shipRouteInfo(id).lamp].slice(),
            delayMinutes: 0
        };
    });
    items.push({
        id: 'ship:*',
        name: '東海汽船 運航情報',
        company: '伊豆諸島・小笠原航路（日付別・全航路）',
        isShip: true,
        statusFlags: [false, false, false, false, false, false, false],
        delayMinutes: 0,
        customRightHtml: '<div class="bus-search-right">船便</div>'
    });
    return items;
}

window.openShipSchedule = openShipSchedule;
window.shipHistoryHtml = shipHistoryHtml; // 通知・履歴（menu.js）からも同じ見せ方で
