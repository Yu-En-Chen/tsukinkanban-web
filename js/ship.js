// ship.js - 東海汽船（伊豆諸島・小笠原航路）運航情報
// 入口：搜尋（東海汽船・船・島名）、島嶼巴士卡片的「本日の着岸港」、時刻表頁面的船班提示框
// 顯示：沿用通用頁面模組（openUniversalPage）：日期切換＋依航路分組的船班清單
// 資料：GET /api/ship/schedule?date=YYYY-MM-DD（今天每 5 分鐘重抓，其他日期只抓一次）
import { openBusTimetable } from './bus-timetable.js';

const SHIP_API_BASE = 'https://api.tsukinkanban.com/api/ship';
const SHIP_TIMEOUT_MS = 30000;
const SHIP_REFRESH_MS = 5 * 60 * 1000;
const SHIP_OFFICIAL_URL = 'https://www.tokaikisen.co.jp/';
const SHIP_STATUS_URL = 'https://www.tokaikisen.co.jp/schedule/';
const SHIP_LEVELS = ['cancelled', 'pending', 'conditional', 'changed', 'undecided', 'normal'];
// 有巴士資料的島（著岸港可直接開該站的巴士時刻表）
const ISLAND_BUS_OPERATORS = { '大島': 'OshimaBus', '三宅島': 'MiyakeVill' };

const shipCache = new Map(); // 日期 -> { at, data }

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
        return data;
    } finally {
        clearTimeout(timer);
    }
}

// ============================================================================
// 描畫
// ============================================================================
const CHEV_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const CHEV_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
const BUS_SVG = '<svg class="sh-bus-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>';

function isTodayView(state) {
    return state.data && typeof state.data.is_today === 'boolean' ? state.data.is_today : state.date === jstToday();
}

// 上方：日付（2026年10月16日（金））＋「‹ 前日｜今日｜翌日 ›」の切り替え
// 手機寬度で日付が折り返さないよう二段に分ける。「今日」は今日を表示中なら選択状態、ほかの日なら今日へ戻るボタン
function dateBarHtml(state) {
    const today = isTodayView(state);
    return `<div class="sh-datehead">
        <div class="sh-date-text">${esc(formatDateJa(state.date))}</div>
        <div class="sh-datebar" role="group" aria-label="日付">
            <button type="button" class="sh-day-btn" data-shift="-1">${CHEV_L}<span>前日</span></button>
            <button type="button" class="sh-today-btn${today ? ' active' : ''}" aria-pressed="${today}">今日</button>
            <button type="button" class="sh-day-btn" data-shift="1"><span>翌日</span>${CHEV_R}</button>
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
        ? `<details class="sh-msg" data-key="${esc(key)}">
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

function scheduleHtml(data) {
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

    const routes = (data.routes || []).filter(r => (r.trips || []).length > 0);
    const list = routes.length === 0
        ? '<div class="tt-status">この日は運航がありません</div>'
        : routes.map((r, ri) => `<section class="sh-route">
            <h3 class="sh-route-name">${esc(r.route || '')}</h3>
            ${r.trips.map((t, ti) => tripHtml(t, `${ri}:${ti}:${t.name || t.ship || ''}`)).join('')}
        </section>`).join('');

    return `${notices.join('')}<div class="sh-list">${list}</div>${footerHtml(data)}`;
}

function render(root, state) {
    // 重繪（5 分ごとの更新など）で開いていた運航情報が閉じないように
    const open = new Set([...root.querySelectorAll('details.sh-msg[open]')].map(d => d.dataset.key));
    let body;
    if (state.error) {
        body = `<div class="tt-status"><div>${esc(state.error)}</div>
            <button type="button" class="tt-retry">再読み込み</button></div>`;
    } else if (!state.data) {
        body = `<div class="tt-status tt-loading">
            <div>運航情報を読み込んでいます<span class="tt-dots"><i>.</i><i>.</i><i>.</i></span></div></div>`;
    } else {
        body = scheduleHtml(state.data);
    }
    root.innerHTML = dateBarHtml(state) + body;
    root.querySelectorAll('details.sh-msg').forEach(d => { if (open.has(d.dataset.key)) d.open = true; });
}

// silent：今天的定時更新。抓取期間保留目前的清單，失敗也不蓋掉
async function load(root, state, silent = false) {
    const token = ++state.loadToken;
    const date = state.date;
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
// onBack：返回鈕的去處（例：回到開啟它的時刻表）。未指定時返回＝關閉
export function openShipSchedule({ date = '', onBack = null } = {}) {
    if (typeof window.openUniversalPage !== 'function') return;
    window.openUniversalPage('東海汽船 運航情報', '<div class="sh-root"></div>', { onBack });
    const root = document.querySelector('#universal-page-content .sh-root');
    if (!root) return;

    const state = {
        date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : jstToday(),
        onBack, data: null, error: '', loadToken: 0, refreshTimer: null
    };

    const goTo = (d) => {
        state.date = d;
        if (navigator.vibrate) navigator.vibrate(8);
        const content = document.getElementById('universal-page-content');
        if (content) content.scrollTop = 0;
        load(root, state);
    };

    root.addEventListener('click', (e) => {
        const shift = e.target.closest('.sh-day-btn');
        if (shift) { goTo(addDays(state.date, Number(shift.dataset.shift))); return; }
        const todayBtn = e.target.closest('.sh-today-btn');
        if (todayBtn) { if (!todayBtn.classList.contains('active')) goTo(jstToday()); return; }
        // 著岸港の 🚌：その港の巴士時刻表。返回で同じ日付の運航情報に戻る
        const bus = e.target.closest('.sh-bus');
        if (bus) {
            if (navigator.vibrate) navigator.vibrate(8);
            const stop = bus.dataset.stop;
            openBusTimetable({
                title: `${stop} 時刻表`, stop, operator: bus.dataset.op,
                onBack: () => openShipSchedule({ date: state.date, onBack: state.onBack })
            });
            return;
        }
        if (e.target.closest('.tt-retry')) load(root, state);
    });

    load(root, state);
}

// ============================================================================
// 搜尋：東海汽船・船・伊豆諸島の島名などで「東海汽船 運航情報」を出す
// ============================================================================
const SHIP_KEYWORDS = ['東海汽船', 'とうかいきせん', 'tokaikisen', '運航情報', '船', 'フェリー', 'ferry', 'ship',
    '伊豆諸島', '小笠原', '大島', '利島', '新島', '式根島', '神津島', '三宅島', '御蔵島', '八丈島', '竹芝'];

// lowKeyword：搜尋框的字（小寫、去掉空白與「-」）。前方一致の途中（「三宅」→ 三宅島）も拾う
// 英字の短い入力（「sh」→ ship）は誤爆するので 4 文字以上から
export function searchShip(lowKeyword) {
    const k = lowKeyword || '';
    const minPartial = /^[\x00-\x7f]+$/.test(k) ? 4 : 2;
    const hit = SHIP_KEYWORDS.some(w => k.includes(w) || (k.length >= minPartial && w.includes(k)));
    if (!hit) return [];
    return [{
        id: 'ship:tokaikisen',
        name: '東海汽船 運航情報',
        company: '伊豆諸島・小笠原航路',
        isShip: true,
        statusFlags: [false, false, false, false, false, false, false],
        delayMinutes: 0,
        customRightHtml: '<div class="bus-search-right">船便</div>'
    }];
}

window.openShipSchedule = openShipSchedule;
