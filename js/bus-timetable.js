// bus-timetable.js - 巴士站牌時刻表
// 入口：詳情卡片右上角「官方網站」按鈕的選單中，與官網並列的「◯◯ 時刻表」
// 顯示：沿用主選單的通用頁面模組（openUniversalPage），以表格呈現各路線的全日發車時刻
// 資料：GET /api/bus/timetable/{站牌名}（靜態資料：開啟時抓一次，不輪詢）
import { BUS_API_BASE, toHalfWidth, getBusPrefs, directionLabels } from './buses.js';

const TT_TIMEOUT_MS = 60000;        // 某站牌第一次被查詢時後端要現場下載，至少等 60 秒
const TT_RETRY_MS = 5000;           // 後端初始化中（error 回應）時的自動重試間隔
const TT_CACHE_MS = 30 * 60 * 1000; // 同一站牌 30 分鐘內重開不再抓（today 跨日時也能更新）
const DAY_KEYS = ['weekday', 'saturday', 'holiday'];
const DAY_LABELS = { weekday: '平日', saturday: '土曜', holiday: '休日' };

const ttCache = new Map(); // 站牌名 -> { at, data }

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============================================================================
// 時間（一律以日本時間計算，不使用瀏覽器的本地時區。日本沒有夏令時間）
// ============================================================================

// 現在的日本時間換算成「時刻表的分」（4:00〜27:59 → 240〜1679）
function nowInTimetableMinutes() {
    const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    let h = jst.getUTCHours();
    const m = jst.getUTCMinutes();
    if (h < 4) h += 24; // 00:00〜03:59 是前一天的 24〜27 時
    return h * 60 + m;
}

function fmtDate(s) {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${y}年${Number(m)}月${Number(d)}日`;
}

function formatUpdated(u) {
    if (!u) return '';
    const parts = [];
    if (u.effective_from) parts.push(`${fmtDate(u.effective_from)}改正`);
    else if (u.data_date) parts.push(`データ日付 ${fmtDate(u.data_date)}`);
    if (u.fetched_at) parts.push(`データ取得 ${fmtDate(u.fetched_at)}`);
    return parts.join('／');
}

// ============================================================================
// 資料取得
// ============================================================================
async function fetchTimetable(stop) {
    const hit = ttCache.get(stop);
    if (hit && Date.now() - hit.at < TT_CACHE_MS) return hit.data;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TT_TIMEOUT_MS);
    try {
        const res = await fetch(`${BUS_API_BASE}/timetable/${encodeURIComponent(stop)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // 初始化中等 error 回應不快取
        if (data && !data.error) ttCache.set(stop, { at: Date.now(), data });
        return data;
    } finally {
        clearTimeout(timer);
    }
}

// ============================================================================
// 篩選：路線卡只顯示該路線、業者／站牌名完全一致者優先
// ============================================================================
const norm = s => toHalfWidth(String(s || '')).replace(/\s+/g, '');

function filterResults(data, opts) {
    let results = Array.isArray(data.results) ? data.results : [];
    if (opts.operator) {
        const op = opts.operator.toLowerCase();
        const same = results.filter(r => String(r.operator || '').toLowerCase() === op);
        if (same.length > 0) results = same;
    }
    return results.map(r => {
        const stops = r.stops || [];
        // 部分一致で複数の停留所が返ったときは、名前が完全一致する停留所だけにする
        const exact = stops.filter(s => norm(s.name) === norm(opts.stop));
        const shownStops = (exact.length > 0 ? exact : stops).map(s => {
            const poles = (s.poles || []).map(p => ({
                ...p,
                routes: (p.routes || []).filter(rt => !opts.route || norm(rt.route) === norm(opts.route))
            })).filter(p => !opts.route || p.routes.length > 0);
            // 路線から開いたときは選んだ方向（終点）行きだけにする。
            // 行き先の表記が終点名と合わず一つも残らないときは、方向で絞らず全部見せる
            if (opts.dest) {
                const toDest = poles.map(p => ({ ...p, routes: p.routes.filter(rt => norm(rt.destination).includes(norm(opts.dest))) }))
                    .filter(p => p.routes.length > 0);
                if (toDest.length > 0) return { ...s, poles: toDest };
            }
            return { ...s, poles };
        });
        return { ...r, stops: shownStops, tooMany: (r.matched || 0) > stops.length };
    });
}

function countFor(results, day) {
    let n = 0;
    results.forEach(r => r.stops.forEach(s => s.poles.forEach(p => p.routes.forEach(rt => {
        n += (rt.count && rt.count[day]) || 0;
    }))));
    return n;
}

// ============================================================================
// 描畫
// ============================================================================
const ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';

// 路線ブロックの見出し：路線番号＋「→ 行き先」（どの方向の車か一目で分かるように）＋のりば
function routeHeadHtml(rt, poleNo) {
    return `<div class="tt-route-head">
        <span class="tt-route-no">${esc(toHalfWidth(rt.route || ''))}</span>
        <span class="tt-route-dest">${ARROW_SVG}${esc(rt.destination || '')}</span>
        ${poleNo ? `<span class="tt-route-pole">${esc(poleNo)}番のりば</span>` : ''}
    </div>`;
}

function routeHtml(rt, day, poleNo) {
    const rows = (rt.timetable && rt.timetable[day]) || [];
    const head = routeHeadHtml(rt, poleNo);
    if (rows.length === 0) {
        return `<div class="tt-route">${head}<div class="tt-empty">この日は運行がありません</div></div>`;
    }
    // 伝統的な時刻表：見出し行（時｜日別）と罫線、時の列は色付き、
    // 分は固定幅のマスに並べて行をまたいで縦にそろえる（24 時以降もそのまま表示）
    const body = rows.map(row => {
        const mins = (row.minutes || []).map(mm =>
            `<span class="tt-min" data-t="${row.hour * 60 + Number(mm)}">${esc(mm)}</span>`).join('');
        return `<tr><th scope="row">${row.hour}</th><td><div class="tt-mins">${mins}</div></td></tr>`;
    }).join('');
    return `<div class="tt-route">${head}
        <table class="tt-table">
            <thead><tr><th scope="col">時</th><th scope="col">${DAY_LABELS[day]}<small>（分）</small></th></tr></thead>
            <tbody>${body}</tbody>
        </table>
        <div class="tt-ended" hidden>本日の運行は終了しました</div></div>`;
}

function resultsHtml(results, day, opts) {
    if (results.length === 0) return '<div class="tt-empty tt-empty-page">該当する停留所が見つかりません</div>';

    const sections = results.map(r => {
        const url = /^https?:\/\//.test(r.url || '') ? r.url : '';
        const label = esc(r.label || r.operator || '');
        const opLink = url
            ? `<a class="tt-operator" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
            : `<span class="tt-operator">${label}</span>`;
        const hint = r.tooMany ? '<div class="tt-hint">候補が多すぎます。停留所名をもう少し詳しく入力してください</div>' : '';

        const stops = r.stops.map(s => {
            let inner;
            if ((s.poles || []).length === 0) {
                inner = opts.route
                    ? `<div class="tt-empty">この停留所に${esc(opts.route)}の時刻表はありません</div>`
                    : '<div class="tt-empty">この停留所から乗車できる路線はありません</div>';
            } else {
                inner = s.poles.map(p => p.routes.map(rt => routeHtml(rt, day, p.pole_no)).join('')).join('');
            }
            return `<div class="tt-stop">
                <div class="tt-head"><div class="tt-stop-name">${esc(s.name)}<span>時刻表</span></div>${opLink}</div>
                ${inner}</div>`;
        }).join('');

        const updated = formatUpdated(r.updated);
        return `<section class="tt-section">${hint}${stops}${updated ? `<div class="tt-updated">${esc(updated)}</div>` : ''}</section>`;
    }).join('');

    return `${sections}<p class="tt-credit">公共交通オープンデータセンターのデータを利用しています</p>`;
}

function tabsHtml(results, day) {
    return `<div class="tt-tabs" role="tablist">${DAY_KEYS.map(k => `
        <button type="button" role="tab" class="tt-tab${k === day ? ' active' : ''}" data-day="${k}" aria-selected="${k === day}">
            ${DAY_LABELS[k]}<span class="tt-count">${countFor(results, k)}</span>
        </button>`).join('')}</div>`;
}

// 方向の切り替え（路線から開いたとき）：路線パネルの方向ボタンと同じ表記
function dirTabsHtml(dirs, index) {
    if (dirs.length === 1) {
        return `<div class="tt-dirs single"><span class="tt-dir active">${ARROW_SVG}${esc(dirs[0].label)}</span></div>`;
    }
    return `<div class="tt-dirs" role="tablist" aria-label="方向">${dirs.map((d, i) => `
        <button type="button" role="tab" class="tt-dir${i === index ? ' active' : ''}" data-dir="${i}" aria-selected="${i === index}">
            ${ARROW_SVG}${esc(d.label)}</button>`).join('')}</div>`;
}

// 乗車する停留所の選択：既定の <select> は端末のメニューが出て見た目がそろわないため自作する。
// 膠囊を押すと下に路線図ふうの一覧（縦線で停留所の点をつなぎ、路線の順に並べる）が開く。
// 選択中は青い点＋太字、プレビュー中の停留所には★
const CHEVRON_SVG = '<svg class="tt-stop-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function stopPickerHtml(dir, stopName) {
    const options = dir.stops.map(name => {
        const sel = name === stopName;
        return `<button type="button" role="option" class="tt-stop-opt${sel ? ' selected' : ''}" data-stop="${esc(name)}" aria-selected="${sel}">
            <span class="tt-stop-dot"></span><span class="tt-stop-optname">${esc(name)}</span>
            ${dir.preview.includes(name) ? '<span class="tt-stop-badge">★ プレビュー</span>' : ''}</button>`;
    }).join('');
    return `<div class="tt-stop-pick">
        <button type="button" class="tt-stop-btn" aria-haspopup="listbox" aria-expanded="false">
            <span class="tt-stop-label">乗車停留所</span><span class="tt-stop-current">${esc(stopName)}</span>${CHEVRON_SVG}
        </button>
        <div class="tt-stop-panel"><div class="tt-stop-clip"><div class="tt-stop-card">
            <div class="tt-stop-list" role="listbox" aria-label="乗車停留所">${options}</div>
        </div></div></div>
    </div>`;
}

function setStopPickerOpen(root, open) {
    const pick = root.querySelector('.tt-stop-pick');
    if (!pick || pick.classList.contains('open') === open) return;
    pick.classList.toggle('open', open);
    pick.querySelector('.tt-stop-btn').setAttribute('aria-expanded', String(open));
    if (open) {
        // 選択中の停留所が一覧の中ほどに来るように
        const list = pick.querySelector('.tt-stop-list');
        const sel = list.querySelector('.tt-stop-opt.selected');
        if (sel) list.scrollTop = sel.offsetTop - (list.clientHeight - sel.offsetHeight) / 2;
    }
}

function controlsHtml(state) {
    if (!state.dirs) return '';
    const dir = state.dirs[state.dir];
    return dirTabsHtml(state.dirs, state.dir) + stopPickerHtml(dir, state.stop);
}

// ============================================================================
// 下一班：只在「顯示中的分頁＝今天」時標示，各路線各自計算。每分鐘重算（不重新抓）
// ============================================================================
function updateNext(root, state) {
    const isToday = state.data && state.day === state.data.today;
    const now = nowInTimetableMinutes();
    root.querySelectorAll('.tt-route').forEach(block => {
        const mins = [...block.querySelectorAll('.tt-min')];
        let next = null;
        mins.forEach(el => {
            const t = Number(el.dataset.t);
            const past = isToday && t < now;
            if (isToday && !next && t >= now) next = el;
            el.classList.toggle('tt-past', past);
            el.classList.remove('tt-next');
        });
        if (next) next.classList.add('tt-next');
        const ended = block.querySelector('.tt-ended');
        if (ended) ended.hidden = !(isToday && mins.length > 0 && !next);
    });
}

// 下一班所在的小時捲到畫面上方（標題下保留約兩行）
function scrollToNext(root) {
    const content = document.getElementById('universal-page-content');
    const next = root.querySelector('.tt-next');
    if (!content || !next) return;
    const row = next.closest('tr') || next;
    const delta = row.getBoundingClientRect().top - content.getBoundingClientRect().top - 64;
    content.scrollTop += delta;
}

// ============================================================================
// 主流程
// ============================================================================
function render(root, state) {
    const picker = controlsHtml(state);
    if (state.error) {
        root.innerHTML = `${picker}<div class="tt-status">
            <div>${esc(state.error)}</div>
            ${state.retrying ? '<div class="tt-sub">5秒後にもう一度読み込みます…</div>'
                : '<button type="button" class="tt-retry">再読み込み</button>'}</div>`;
    } else if (!state.data) {
        root.innerHTML = `${picker}<div class="tt-status tt-loading">
            <div>時刻表を読み込んでいます<span class="tt-dots"><i>.</i><i>.</i><i>.</i></span></div>
            <div class="tt-sub">初めて表示する停留所は、1分ほどかかる場合があります</div></div>`;
    } else {
        const dest = state.dirs ? state.dirs[state.dir].dest : '';
        const results = filterResults(state.data, { stop: state.stop, route: state.route, operator: state.operator, dest });
        root.innerHTML = `${picker}${results.length > 0 ? tabsHtml(results, state.day) : ''}
            <div class="tt-body">${resultsHtml(results, state.day, { route: state.route })}</div>`;
        updateNext(root, state);
    }
}

async function load(root, state) {
    const token = ++state.loadToken;
    const stop = state.stop;
    state.data = null;
    state.error = '';
    state.retrying = false;
    render(root, state);
    try {
        const data = await fetchTimetable(stop);
        if (token !== state.loadToken || !root.isConnected) return;
        if (data && data.error) {
            // 伺服器剛啟動（初始化中）：顯示訊息並在 5 秒後自動重試
            state.error = data.error;
            state.retrying = true;
            render(root, state);
            setTimeout(() => { if (token === state.loadToken && root.isConnected) load(root, state); }, TT_RETRY_MS);
            return;
        }
        state.data = data;
        // 分頁預設為今天（API 的 today）。使用者自己切過的話維持
        if (!state.userDay) state.day = DAY_KEYS.includes(data.today) ? data.today : 'weekday';
        render(root, state);
        scrollToNext(root);
    } catch (e) {
        if (token !== state.loadToken || !root.isConnected) return;
        state.error = e && e.name === 'AbortError'
            ? '時刻表の読み込みがタイムアウトしました'
            : '時刻表を読み込めませんでした';
        render(root, state);
    }
}

// 停留所カードから：stop（その停留所の全路線）
// 路線から開いたとき：route（路線名）、dirs（[{ label, dest, stops, preview }]）、dir（方向）、stop（停留所）
// onBack：返回鈕的去處（例：回到「官網／時刻表」選單）。未指定時返回＝關閉
export function openBusTimetable({ title, stop, route = '', operator = '', dirs = null, dir = 0, onBack = null }) {
    if (typeof window.openUniversalPage !== 'function' || !stop) return;
    window.openUniversalPage(title, '<div class="tt-root"></div>', { onBack });
    const root = document.querySelector('#universal-page-content .tt-root');
    if (!root) return;

    const state = { stop, route, operator, dirs, dir: dirs ? Math.min(dir, dirs.length - 1) : 0, day: 'weekday', userDay: false, data: null, error: '', retrying: false, loadToken: 0 };

    root.addEventListener('click', (e) => {
        const tab = e.target.closest('.tt-tab');
        if (tab && tab.dataset.day !== state.day) {
            state.day = tab.dataset.day;
            state.userDay = true;
            if (navigator.vibrate) navigator.vibrate(8);
            render(root, state);
            if (state.data && state.day === state.data.today) scrollToNext(root);
            return;
        }
        // 停留所の一覧：膠囊で開閉、項目で選択、ほかの場所を押したら閉じる
        if (e.target.closest('.tt-stop-btn')) {
            const pick = root.querySelector('.tt-stop-pick');
            setStopPickerOpen(root, !(pick && pick.classList.contains('open')));
            if (navigator.vibrate) navigator.vibrate(8);
            return;
        }
        const opt = e.target.closest('.tt-stop-opt');
        if (opt) {
            setStopPickerOpen(root, false);
            if (opt.dataset.stop !== state.stop) {
                state.stop = opt.dataset.stop;
                if (navigator.vibrate) navigator.vibrate(8);
                setTimeout(() => { if (root.isConnected) load(root, state); }, 220); // 閉じる動きを見せてから
            }
            return;
        }
        if (!e.target.closest('.tt-stop-panel')) setStopPickerOpen(root, false);

        const dirBtn = e.target.closest('.tt-dir[data-dir]');
        if (dirBtn && Number(dirBtn.dataset.dir) !== state.dir) {
            // 方向を変える：同じ停留所がその方向にもあれば維持、なければプレビュー停留所→始発
            state.dir = Number(dirBtn.dataset.dir);
            const d = state.dirs[state.dir];
            if (!d.stops.includes(state.stop)) state.stop = d.preview[0] || d.stops[0];
            if (navigator.vibrate) navigator.vibrate(8);
            load(root, state);
            return;
        }
        if (e.target.closest('.tt-retry')) load(root, state);
    });
    // Esc：一覧が開いていれば一覧だけ閉じる（全体の「Esc で通用頁面を閉じる」には伝えない）
    root.addEventListener('keydown', (e) => {
        const pick = root.querySelector('.tt-stop-pick.open');
        if (e.key === 'Escape' && pick) {
            e.stopPropagation();
            setStopPickerOpen(root, false);
            pick.querySelector('.tt-stop-btn').focus();
        }
    });

    // 開いている間、毎分の境目で下一班を更新（API は再取得しない）。閉じたら止める
    const tick = () => {
        if (!root.isConnected) return;
        updateNext(root, state);
        setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    };
    setTimeout(tick, 60000 - (Date.now() % 60000) + 50);

    load(root, state);
}

// ============================================================================
// 右上の外部サイトボタンに並べる「◯◯ 時刻表」の項目
// ============================================================================

// 路線の方向と停留所：方向は路線パネルと同じ表記・同じ選択中の方向から。
// 停留所はその方向のプレビュー停留所（ユーザーの使う停留所）、なければ始発
function routeDirections(targetId, route) {
    const bd = window.GlobalBusData && window.GlobalBusData[targetId];
    const patterns = (bd && bd.patterns) || [];
    if (patterns.length === 0) return null;
    const prefs = getBusPrefs(targetId);
    const labels = directionLabels(patterns, route);
    const dirs = patterns.map((p, i) => {
        const names = (p.stops || []).map(s => s.name);
        return {
            label: labels[i] || `${names[names.length - 1] || ''}行`,
            dest: names[names.length - 1] || '',
            stops: names,
            preview: prefs.previewStops.filter(n => names.includes(n))
        };
    }).filter(d => d.stops.length > 0);
    if (dirs.length === 0) return null;
    const dir = Math.min(prefs.dir, dirs.length - 1);
    return { dirs, dir, stop: dirs[dir].preview[0] || dirs[dir].stops[0] };
}

window.getBusTimetableEntries = function (card) {
    const entries = [];
    if (!card) return entries;

    // 停留所カード：その停留所の全路線
    if (card.isBusStopCard && card.busStopData && card.busStopData.stopName) {
        const sd = card.busStopData;
        const title = `${sd.stopName} 時刻表`;
        entries.push({ name: title, open: (onBack) => openBusTimetable({ title, stop: sd.stopName, operator: sd.operator || '', onBack }) });
        return entries;
    }

    // 路線カード・混合カード内のバス路線：その路線の時刻表（方向と停留所は選択式）
    (card.targetLineIds || []).forEach(id => {
        if (typeof id !== 'string' || !id.startsWith('bus:')) return;
        const parts = id.split(':');
        const operator = parts[1] || '';
        const route = parts.slice(2).join(':');
        const cand = routeDirections(id, route);
        if (!cand) return; // 路線データ未取得
        const title = `${route} 時刻表`;
        entries.push({ name: title, open: (onBack) => openBusTimetable({ title, stop: cand.stop, route, operator, dirs: cand.dirs, dir: cand.dir, onBack }) });
    });
    return entries;
};

window.openBusTimetable = openBusTimetable;
