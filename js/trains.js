// trains.js - 列車の駅ごとの到着情報（/api/train/station・/api/train/line）
// 鐵道路線卡（buildRailLineRow）的 footer 有「遅れ｜到着」切換：
// ・遅れ：原本的方向別遅れ（/api/status 的 advanced_details），不另外發送請求
// ・到着：使用者選的駅（最多 2 個）接下來的列車＝種別・行き先・到着予測；也可以展開成全駅の一覧（站序＋列車位置）
// 只有 /api/status 該路線帶 train_support 時才出現切換；後端加了業者，切換會自動出現。
// 資料只在卡片開著、而且切到「到着」時才抓，每 60 秒更新一次（後端建議 ≥ 60 秒）。

import { TRAIN_PREFS_KEY } from '../data/line-prefs.js';

export const TRAIN_API_BASE = 'https://api.tsukinkanban.com/api/train';

const TRAIN_FRESH_MS = 60000;  // 這段時間內的資料不重抓（以發出請求的時刻計）＝同一個網址最快 60 秒一次（後端建議 ≥ 60 秒）
const TRAIN_RETRY_MS = 25000;  // 失敗後隔多久再試
const TRAIN_TICK_MS = 15000;   // 巡迴：重算倒數（あと○分）＋超過 60 秒的資料重抓（實際間隔 60〜75 秒）
const TRAIN_STALE_NOTE_MS = 3 * 60000; // 最後一次成功超過這個時間 → 提示資料可能較舊
const TRAINS_PER_DIRECTION = 2;

// 有切換按鈕的支援程度（ended・none 沒有到着資料，不顯示切換）
const BOARD_SUPPORTS = ['realtime', 'timetable', 'positions', 'loading'];
const KNOWN_SUPPORTS = [...BOARD_SUPPORTS, 'none', 'ended'];
// 種別分類（決定顏色）。不認識的值一律當 other
const TYPE_CLASSES = ['limited_express', 'express', 'rapid', 'local', 'other'];

const TRAIN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14"/><path d="M9 14h.01"/><path d="M15 14h.01"/><path d="m8 21 2-4"/><path d="m16 21-2-4"/></svg>';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hhmm = ms => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// ============================================================================
// 支援程度（/api/status 的 train_support）
// ============================================================================
export function trainSupportOf(lineId) {
    const s = (window.GlobalLiveStatus || {})[lineId];
    const v = s && s.train_support;
    if (!v) return null;
    return KNOWN_SUPPORTS.includes(v) ? v : 'none'; // 不認識的值當 none
}

export function isTrainBoardSupport(support) {
    return BOARD_SUPPORTS.includes(support);
}

// ============================================================================
// 每條路線的顯示設定（localStorage，key＝路線 ID）。匯出・匯入由 data/line-prefs.js 處理
// ============================================================================
export function getTrainPrefs(lineId) {
    const base = { mode: 'delay', stations: [], types: [], dir: 0 };
    try {
        const all = JSON.parse(localStorage.getItem(TRAIN_PREFS_KEY) || '{}');
        const p = Object.assign(base, all[lineId] || {});
        if (!Array.isArray(p.stations)) p.stations = [];
        if (!Array.isArray(p.types)) p.types = [];
        return p;
    } catch (e) {
        return base;
    }
}

export function saveTrainPrefs(lineId, prefs) {
    try {
        const all = JSON.parse(localStorage.getItem(TRAIN_PREFS_KEY) || '{}');
        all[lineId] = { mode: prefs.mode, stations: prefs.stations, types: prefs.types, dir: prefs.dir };
        localStorage.setItem(TRAIN_PREFS_KEY, JSON.stringify(all));
    } catch (e) { }
}

// ============================================================================
// API（同一個網址同時只發一個請求；結果暫存在記憶體）
// ============================================================================
const trainCache = new Map();   // path -> { json, at, error, errorAt }
const trainInflight = new Map();

// 路線 ID 的「:」「.」照文件的寫法保留（/api/train/line/odpt.Railway:Toei.Asakusa）
const linePath = id => `/line/${encodeURIComponent(id).replace(/%3A/gi, ':')}`;
const stationPath = (name, limit) => `/station/${encodeURIComponent(name)}?limit=${limit}`;

function fetchTrain(path, maxAge = TRAIN_FRESH_MS) {
    const c = trainCache.get(path);
    const now = Date.now();
    if (c && c.json && !c.error && now - c.at < maxAge) return Promise.resolve(c);
    if (c && c.error && now - c.errorAt < Math.min(maxAge, TRAIN_RETRY_MS)) return Promise.resolve(c);
    if (trainInflight.has(path)) return trainInflight.get(path);

    const startedAt = now;
    const p = (async () => {
        let json = null;
        try {
            const res = await fetch(`${TRAIN_API_BASE}${path}`, { cache: 'no-store' });
            json = await res.json().catch(() => null);
            if (!res.ok && !(json && json.error)) json = null;
        } catch (e) {
            json = null;
        }
        const prev = trainCache.get(path) || {};
        let entry;
        if (json && !json.error) entry = { json, at: startedAt, error: null, errorAt: 0 };
        // 含 error 欄位＝後端剛啟動、時刻表還在下載；連不上＝network。舊資料留著繼續顯示
        else entry = { json: prev.json || null, at: prev.at || 0, error: json && json.error ? 'init' : 'network', errorAt: Date.now() };
        trainCache.set(path, entry);
        trainInflight.delete(path);
        return entry;
    })();
    trainInflight.set(path, p);
    return p;
}

// 從 /api/train/line 的回應找出這條路線
function railwayFromLine(json, lineId) {
    if (!json || !Array.isArray(json.results)) return null;
    for (const result of json.results) {
        const rw = (result.railways || []).find(r => r.id === lineId);
        if (rw) return { railway: rw, live: result.live || null };
    }
    return null;
}

// 從 /api/train/station 的回應找出「這個駅的這條路線」（站名完全一致優先）
function railwayFromStation(json, stationName, lineId) {
    if (!json || !Array.isArray(json.results)) return null;
    let fallback = null;
    for (const result of json.results) {
        for (const st of (result.stations || [])) {
            const rw = (st.railways || []).find(r => r.id === lineId);
            if (!rw) continue;
            const hit = { railway: rw, live: result.live || null, stationName: st.name };
            if (st.name === stationName) return hit;
            if (!fallback) fallback = hit;
        }
    }
    return fallback;
}

// 後端還在下載這條路線所屬業者的時刻表
function isOperatorLoading(json, lineId) {
    if (!json || !Array.isArray(json.loading) || json.loading.length === 0) return false;
    const op = (lineId.split(':')[1] || '').split('.')[0];
    return json.loading.includes(op);
}

// ============================================================================
// 顯示用的組件
// ============================================================================
function typeClassOf(t) {
    return TYPE_CLASSES.includes(t && t.type_class) ? t.type_class : 'other';
}

function typePillHtml(t) {
    if (!t || !t.type) return '';
    return `<span class="train-type tc-${typeClassOf(t)}">${esc(t.type)}</span>`;
}

// 到着予測：照 ISO 時刻與現在重算（離線或兩次更新之間倒數也會自然遞減），規則與後端相同
function liveEtaText(eta, etaText) {
    if (eta) {
        const ms = new Date(eta).getTime();
        if (!Number.isNaN(ms)) {
            const diffMin = Math.round((ms - Date.now()) / 60000);
            if (diffMin <= 1) return 'まもなく';
            if (diffMin <= 20) return `あと${diffMin}分`;
            return `${hhmm(ms)}頃`;
        }
    }
    return etaText || null;
}

function etaPillClass(text) {
    if (text.includes('まもなく')) return 'arriving';
    const m = text.match(/あと(\d+)分/);
    if (m) return parseInt(m[1], 10) <= 5 ? 'soon' : 'near';
    return 'run';
}

function etaPillHtml(text) {
    return text ? `<span class="bus-eta-pill chip ${etaPillClass(text)}">${esc(text)}</span>` : '';
}

function delayHtml(t) {
    const d = t && t.delay_minutes;
    if (typeof d !== 'number' || d <= 0) return '';
    return `<span class="train-delay ${d > 15 ? 'major' : 'minor'}">${d}分遅れ</span>`;
}

function passesTypeFilter(t, types) {
    return types.length === 0 || types.includes(t && t.type);
}

// 這條路線目前看過的種別（篩選鈕用）：資料裡出現過的＋已經選的
function collectTypes(board, trains) {
    trains.forEach(t => {
        if (t && t.type && !board.knownTypes.has(t.type)) board.knownTypes.set(t.type, typeClassOf(t));
    });
}

function sortedTypes(board, prefs) {
    prefs.types.forEach(type => { if (!board.knownTypes.has(type)) board.knownTypes.set(type, 'other'); });
    return [...board.knownTypes.entries()]
        .sort((a, b) => TYPE_CLASSES.indexOf(a[1]) - TYPE_CLASSES.indexOf(b[1]) || a[0].localeCompare(b[0], 'ja'));
}

function typeFilterHtml(board, prefs) {
    const types = sortedTypes(board, prefs);
    if (types.length < 2 && prefs.types.length === 0) return '';
    const all = prefs.types.length === 0;
    return `<div class="train-type-filter" role="group" aria-label="種別で絞り込む">
        <button type="button" class="train-type-chip${all ? ' active' : ''}" data-action="type" data-type="" aria-pressed="${all}">すべて</button>
        ${types.map(([type, cls]) => {
            const on = prefs.types.includes(type);
            return `<button type="button" class="train-type-chip${on ? ' active' : ''}" data-action="type" data-type="${esc(type)}" aria-pressed="${on}"><span class="train-type-dot tc-${cls}"></span>${esc(type)}</button>`;
        }).join('')}
    </div>`;
}

function noteHtml(text) {
    return `<div class="train-board-note">${esc(text)}</div>`;
}

// 駅ごとの一列：［種別］定刻 行き先行 …… 到着予測、下に 停車中・走行位置・遅れ
function trainCapsuleHtml(t) {
    const eta = t.realtime === false ? null : liveEtaText(t.eta, t.eta_text);
    const sub = [];
    if (t.stopped) sub.push('<span class="train-pos">停車中</span>');
    else if (t.position && t.position.text) sub.push(`<span class="train-pos">${esc(t.position.text)}</span>`);
    const d = delayHtml(t);
    if (d) sub.push(d);
    return `<div class="adv-detail-capsule bus-collapsed-capsule train-capsule${t.realtime === false ? ' sched-only' : ''}">
        <div class="bus-collapsed-main">
            <span class="train-main">${typePillHtml(t)}${t.scheduled_text ? `<span class="train-time">${esc(t.scheduled_text)}</span>` : ''}${t.destination ? `<span class="train-dest">${esc(t.destination)}行</span>` : ''}</span>
            ${etaPillHtml(eta)}
        </div>
        ${sub.length ? `<div class="bus-collapsed-sub train-sub">${sub.join('')}</div>` : ''}
    </div>`;
}

// ============================================================================
// 到着ボード（卡片內的一列切到「到着」時，放在 footer 上方）
// ============================================================================
const boards = new Set();
let tickTimer = null;

function startTicker() {
    if (tickTimer) return;
    tickTimer = setInterval(tickBoards, TRAIN_TICK_MS);
}

function tickBoards() {
    boards.forEach(b => { if (!b.el.isConnected) boards.delete(b); });
    if (boards.size === 0) { clearInterval(tickTimer); tickTimer = null; return; }
    if (document.hidden) return;
    boards.forEach(b => b.refresh());
}

document.addEventListener('visibilitychange', () => { if (!document.hidden && boards.size > 0) tickBoards(); });

function createBoard(row, lineId) {
    const el = document.createElement('div');
    el.className = 'train-board';
    // 列車位置のみ（positions）の路線は駅ごとの到着がないので、最初から全駅の一覧を開く
    const board = { el, row, lineId, expanded: trainSupportOf(lineId) === 'positions', knownTypes: new Map(), lastHtml: '' };

    board.render = () => renderBoard(board);
    board.refresh = async (maxAge = TRAIN_FRESH_MS) => {
        const prefs = getTrainPrefs(lineId);
        const support = trainSupportOf(lineId);
        const jobs = [];
        if (support === 'positions' || board.expanded) jobs.push(fetchTrain(linePath(lineId), maxAge));
        if (!board.expanded) {
            const limit = prefs.types.length > 0 ? 10 : 4;
            prefs.stations.forEach(n => jobs.push(fetchTrain(stationPath(n, limit), maxAge)));
        }
        board.render();
        if (jobs.length === 0) return;
        await Promise.all(jobs);
        if (el.isConnected) board.render();
    };

    el.addEventListener('click', e => onBoardClick(board, e));
    return board;
}

function renderBoard(board) {
    const { lineId } = board;
    const prefs = getTrainPrefs(lineId);
    const support = trainSupportOf(lineId);
    const html = board.expanded ? routeViewHtml(board, prefs, support) : stationViewHtml(board, prefs, support);
    if (html === board.lastHtml) return;
    board.lastHtml = html;
    board.el.innerHTML = html;
}

// --- 駅ごとの到着（収折） ---
function stationViewHtml(board, prefs, support) {
    const parts = [];
    let newestAt = 0;
    let anyLiveError = false;
    let anyTimetableOnly = support === 'timetable';
    let groupsHtml = '';

    if (support === 'loading') parts.push(noteHtml('この路線の到着情報を準備中です。しばらくすると表示されます'));

    if (support === 'positions') {
        parts.push(noteHtml('この路線は到着予測がありません。全駅の一覧で列車の位置を確認できます'));
    } else if (prefs.stations.length === 0) {
        parts.push(noteHtml('到着情報を表示する駅を選んでください（最大2駅）'));
    } else {
        const limit = prefs.types.length > 0 ? 10 : 4;
        prefs.stations.forEach(name => {
            const entry = trainCache.get(stationPath(name, limit));
            if (!entry || (!entry.json && !entry.error)) {
                groupsHtml += `<div class="bus-collapsed-group"><div class="bus-collapsed-dir">${esc(name)}</div>${noteHtml('到着情報を取得しています...')}</div>`;
                return;
            }
            if (!entry.json) {
                const msg = entry.error === 'init' ? '到着情報を準備中です。しばらくすると表示されます' : '到着情報を取得できません';
                groupsHtml += `<div class="bus-collapsed-group"><div class="bus-collapsed-dir">${esc(name)}</div>${noteHtml(msg)}</div>`;
                return;
            }
            if (entry.at > newestAt) newestAt = entry.at;
            const hit = railwayFromStation(entry.json, name, board.lineId);
            if (!hit) {
                const msg = isOperatorLoading(entry.json, board.lineId) ? 'この路線の到着情報を準備中です' : `${name}駅の情報が見つかりません`;
                groupsHtml += `<div class="bus-collapsed-group"><div class="bus-collapsed-dir">${esc(name)}</div>${noteHtml(msg)}</div>`;
                return;
            }
            const rw = hit.railway;
            if (hit.live && hit.live.state === 'error') anyLiveError = true;
            if (rw.support === 'timetable') anyTimetableOnly = true;
            if (rw.support === 'none' || rw.support === 'ended' || rw.support === 'loading') {
                const msg = rw.support === 'ended' ? '到着情報の提供は終了しました' : rw.support === 'loading' ? 'この路線の到着情報を準備中です' : 'この路線の到着情報はありません';
                groupsHtml += `<div class="bus-collapsed-group"><div class="bus-collapsed-dir">${esc(name)}</div>${noteHtml(msg)}</div>`;
                return;
            }
            (rw.directions || []).forEach(dir => {
                const all = dir.trains || [];
                collectTypes(board, all);
                const shown = all.filter(t => passesTypeFilter(t, prefs.types)).slice(0, TRAINS_PER_DIRECTION);
                const title = dir.title || dir.name || '';
                const body = shown.length > 0
                    ? shown.map(trainCapsuleHtml).join('')
                    : noteHtml(all.length > 0 ? '選んだ種別の列車はしばらくありません' : 'この先の列車はありません');
                groupsHtml += `<div class="bus-collapsed-group"><div class="bus-collapsed-dir">${esc(hit.stationName || name)}<span class="train-dir-title">${esc(title)}</span></div>${body}</div>`;
            });
        });
    }

    if (anyLiveError) parts.push(noteHtml('リアルタイム情報を取得できません。時刻表の時刻を表示しています'));
    else if (anyTimetableOnly && prefs.stations.length > 0) parts.push(noteHtml('この路線はリアルタイム情報がないため、時刻表の時刻を表示しています'));

    const filter = support === 'positions' ? '' : typeFilterHtml(board, prefs);
    const actions = `<div class="train-board-actions">
        ${support === 'positions' ? '' : `<button type="button" class="train-board-btn" data-action="pick">${prefs.stations.length > 0 ? '駅を変更' : '駅を選ぶ'}</button>`}
        <button type="button" class="train-board-btn" data-action="expand">全駅を表示</button>
    </div>`;

    return `${parts.join('')}${filter}${groupsHtml ? `<div class="adv-details-container train-groups">${groupsHtml}</div>` : ''}${actions}${timeHtml(newestAt)}`;
}

function timeHtml(at) {
    if (!at) return '';
    const old = Date.now() - at > TRAIN_STALE_NOTE_MS;
    return `<div class="train-board-time${old ? ' stale' : ''}">${old ? '⚠ ' : ''}到着情報 ${hhmm(at)} 時点</div>`;
}

// --- 全駅の一覧（展開）：站序＋區間內／停車中的列車＋各駅の到着予測 ---
function routeViewHtml(board, prefs, support) {
    const entry = trainCache.get(linePath(board.lineId));
    const actions = `<div class="train-board-actions">
        <button type="button" class="train-board-btn" data-action="collapse">${support === 'positions' ? '閉じる' : '選んだ駅だけ表示'}</button>
    </div>`;

    if (!entry || (!entry.json && !entry.error)) return noteHtml('駅の一覧を取得しています...') + actions;
    if (!entry.json) return noteHtml(entry.error === 'init' ? '到着情報を準備中です。しばらくすると表示されます' : '駅の一覧を取得できません') + actions;

    const hit = railwayFromLine(entry.json, board.lineId);
    if (!hit) return noteHtml(isOperatorLoading(entry.json, board.lineId) ? 'この路線の到着情報を準備中です' : 'この路線の駅の一覧はありません') + actions;

    const rw = hit.railway;
    const dirs = rw.directions || [];
    if (dirs.length === 0) return noteHtml('この路線の駅の一覧はありません') + actions;
    const dirIndex = Math.min(prefs.dir || 0, dirs.length - 1);
    const dir = dirs[dirIndex];
    const stations = dir.stations || [];
    stations.forEach(s => collectTypes(board, s.trains_approaching || []));

    const notes = [];
    if (hit.live && hit.live.state === 'error') notes.push(noteHtml('リアルタイム情報を取得できません'));
    if (prefs.types.length > 0 && rw.support === 'realtime') notes.push(noteHtml('右側の到着予測は、種別に関係なく最も早い列車です'));

    const slider = dirs.length > 1 ? `<div class="bus-dir-slider train-dir-slider">${dirs.map((d, i) =>
        `<button type="button" class="bus-dir-btn${i === dirIndex ? ' active' : ''}" data-action="dir" data-dir="${i}" aria-pressed="${i === dirIndex}">${esc(d.title || d.name || '')}</button>`).join('')}</div>` : '';

    const rows = stations.map(s => {
        const trains = (s.trains_approaching || []).filter(t => passesTypeFilter(t, prefs.types));
        const moving = trains.filter(t => !t.stopped);
        const stopped = trains.filter(t => t.stopped);
        const markers = moving.map(t => `<div class="bus-marker-row train-marker-row">
            <span class="bus-vehicle-icon" aria-hidden="true">${TRAIN_ICON}</span>
            <span class="bus-vehicle-main train-main">${typePillHtml(t)}${t.destination ? `<span class="train-dest">${esc(t.destination)}行</span>` : ''}</span>
            ${delayHtml(t)}
        </div>`).join('');
        const eta = liveEtaText(s.eta, s.eta_text);
        const right = eta ? etaPillHtml(eta)
            : s.next_text ? `<span class="bus-eta-pill chip sched">次${esc(s.next_text)}</span>`
                : '<span class="bus-eta-pill chip none">--</span>';
        const stoppedHtml = stopped.length > 0 ? `<div class="bus-stoprow-sub train-stopped">${stopped.map(t =>
            `<span class="train-main">${typePillHtml(t)}${t.destination ? `<span class="train-dest">${esc(t.destination)}行</span>` : ''}<span class="train-pos">停車中</span>${delayHtml(t)}</span>`).join('')}</div>` : '';
        return `${markers}<div class="bus-stop-row train-station-row">
            <div class="bus-stoprow-main">
                <button type="button" class="train-station-name${moving.length > 0 ? ' approach-next' : ''}" data-action="station" data-name="${esc(s.name)}">${esc(s.name)}</button>
                ${right}
            </div>
            ${stoppedHtml}
        </div>`;
    }).join('');

    return `${notes.join('')}${typeFilterHtml(board, prefs)}${slider}<div class="bus-stops-list train-route-list">${rows}</div>${actions}${timeHtml(entry.at)}`;
}

// ============================================================================
// 操作
// ============================================================================
function onBoardClick(board, e) {
    const btn = e.target.closest('[data-action]');
    if (!btn || !board.el.contains(btn)) return;
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(10);
    const prefs = getTrainPrefs(board.lineId);
    const action = btn.dataset.action;

    if (action === 'type') {
        const type = btn.dataset.type;
        if (!type) prefs.types = [];
        else if (prefs.types.includes(type)) prefs.types = prefs.types.filter(t => t !== type);
        else prefs.types = [...prefs.types, type];
        saveTrainPrefs(board.lineId, prefs);
        board.refresh(); // 篩選時一次抓多一點班次（limit が変わる）
    } else if (action === 'expand') {
        board.expanded = true;
        board.refresh();
    } else if (action === 'collapse') {
        board.expanded = false;
        if (trainSupportOf(board.lineId) === 'positions') setMode(board.row, board.lineId, 'delay');
        else board.refresh();
    } else if (action === 'dir') {
        prefs.dir = parseInt(btn.dataset.dir, 10) || 0;
        saveTrainPrefs(board.lineId, prefs);
        board.render();
    } else if (action === 'pick') {
        openStationPicker(board);
    } else if (action === 'station') {
        openStationActions(board, btn.dataset.name);
    }
}

async function lineStationNames(lineId) {
    const entry = await fetchTrain(linePath(lineId), 10 * 60000); // 站序很少變，10 分以內的資料就沿用
    const hit = entry && entry.json ? railwayFromLine(entry.json, lineId) : null;
    if (!hit) return null;
    const names = [];
    (hit.railway.directions || []).forEach(d => (d.stations || []).forEach(s => { if (s.name && !names.includes(s.name)) names.push(s.name); }));
    return names;
}

// 到着を表示する駅を選ぶ（巴士的預覽停留所選擇與同一套樣式，最多 2 個）
async function openStationPicker(board) {
    if (!window.iosConfirm) return;
    const names = await lineStationNames(board.lineId);
    if (!names || names.length === 0) {
        window.iosConfirm('駅の一覧を取得できません', 'しばらくしてから再度お試しください。', 'OK', '閉じる');
        return;
    }
    const prefs = getTrainPrefs(board.lineId);
    const picked = prefs.stations.filter(n => names.includes(n)).slice(0, 2);

    let html = `<div style="margin-bottom: 12px; font-size: 0.85rem; opacity: 0.8;">到着情報を表示する駅を<br>選択してください（最大2つ）</div>`;
    html += `<div id="train-station-picker-list" style="max-height: 40vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; text-align: left;">`;
    names.forEach((n, i) => {
        html += `<button type="button" class="bus-picker-item" data-index="${i}"><span class="bus-picker-name">${esc(n)}</span><span class="bus-picker-dot"></span></button>`;
    });
    html += `</div>`;

    setTimeout(() => {
        const list = document.getElementById('train-station-picker-list');
        if (!list) return;
        const items = [...list.querySelectorAll('.bus-picker-item')];
        const sync = () => items.forEach(b => b.classList.toggle('selected', picked.includes(names[parseInt(b.dataset.index, 10)])));
        sync();
        items.forEach(b => {
            b.onclick = () => {
                const n = names[parseInt(b.dataset.index, 10)];
                const idx = picked.indexOf(n);
                if (idx !== -1) picked.splice(idx, 1);
                else { if (picked.length >= 2) picked.shift(); picked.push(n); }
                if (navigator.vibrate) navigator.vibrate(10);
                sync();
            };
        });
    }, 60);

    const ok = await window.iosConfirm('到着表示の駅', html, '決定', 'キャンセル');
    if (!ok) return;
    const latest = getTrainPrefs(board.lineId);
    latest.stations = picked.slice(0, 2);
    saveTrainPrefs(board.lineId, latest);
    board.expanded = false;
    board.refresh();
}

// 全駅の一覧で駅名をタップ：Google マップ（到着表示の駅は「駅を変更」から選ぶ）
// 巴士の停留所と同じく選單を挟み、誤タップでいきなりアプリの外へ出ないようにする
function openStationActions(board, name) {
    if (!window.iosActionSheet || !name) return;
    window.iosActionSheet(name, 'この駅の操作を選択してください', [
        { text: 'Google マップで開く', value: 'map' }
    ]).then(choice => {
        if (choice === 'map') {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + '駅')}`, '_blank', 'noopener,noreferrer');
        }
    });
}

// ============================================================================
// 鐵道路線卡との接続（script.js の buildRailLineRow から呼ばれる）
// ============================================================================

// footer 左側の「遅れ｜到着」切換
export function trainModeSwitchHtml(lineId) {
    const station = getTrainPrefs(lineId).mode === 'station';
    return `<div class="train-mode-switch" role="group" aria-label="表示の切り替え">
        <button type="button" class="train-mode-btn" data-train-mode="delay" aria-pressed="${!station}">遅れ</button>
        <button type="button" class="train-mode-btn" data-train-mode="station" aria-pressed="${station}">到着</button>
    </div>`;
}

function setMode(row, lineId, mode) {
    const prefs = getTrainPrefs(lineId);
    prefs.mode = mode;
    saveTrainPrefs(lineId, prefs);
    applyMode(row, lineId);
    if (mode === 'station' && prefs.stations.length === 0 && trainSupportOf(lineId) !== 'positions') {
        const board = row.__trainBoard;
        if (board) openStationPicker(board);
    }
}

// 切換狀態套到這一列：class（遅れ表示を隠す）・按鈕的 aria-pressed・到着ボードの有無
function applyMode(row, lineId) {
    const support = trainSupportOf(lineId);
    const station = isTrainBoardSupport(support) && getTrainPrefs(lineId).mode === 'station';
    row.classList.toggle('train-mode-station', station);
    row.querySelectorAll('.train-mode-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.trainMode === (station ? 'station' : 'delay'))));

    let board = row.__trainBoard;
    if (!station) {
        if (board) { board.el.remove(); boards.delete(board); row.__trainBoard = null; }
        return;
    }
    if (!board) {
        board = createBoard(row, lineId);
        row.__trainBoard = board;
    }
    if (!board.el.isConnected || board.el.parentNode !== row) {
        const footer = row.querySelector(':scope > .ext-card-footer');
        row.insertBefore(board.el, footer || null);
    }
    boards.add(board);
    startTicker();
    board.refresh();
}

// buildRailLineRow で作った列に接続（切換ボタンの委派監聽と、到着モードならボードの設置）
export function mountTrainBoard(row, lineId) {
    if (!row.__trainBound) {
        row.__trainBound = true;
        row.addEventListener('click', e => {
            const btn = e.target.closest('.train-mode-btn');
            if (!btn || !row.contains(btn)) return;
            e.stopPropagation();
            const mode = btn.dataset.trainMode;
            if (getTrainPrefs(lineId).mode === mode) return;
            if (navigator.vibrate) navigator.vibrate(10);
            setMode(row, lineId, mode);
        });
    }
    applyMode(row, lineId);
}

// 每分鐘更新後（列の中身を差し替えた後）：支援状況が変わったときに合わせる
export function syncTrainBoard(row, lineId) {
    if (isTrainBoardSupport(trainSupportOf(lineId))) mountTrainBoard(row, lineId);
    else if (row.__trainBoard || row.classList.contains('train-mode-station')) applyMode(row, lineId);
}
