// line-prefs.js - 各路線自己的顯示設定（公車的方向、預覽停留所、收折狀態等）
// 這些設定不在卡片資料（IndexedDB）裡，而是以路線 ID 為 key 存在 localStorage，
// 所以匯出・匯入設定時要另外帶上。
// 匯出格式：每張卡片多一個 lineSettings：{ 路線 ID: 設定 }。
// 舊版前端匯入時會忽略這個欄位，舊的匯出資料沒有這個欄位也能照常匯入。
// 之後其他種類的路線（例：列車的站牌顯示）也有自己的設定時，在 LINE_PREF_KINDS 加一筆即可。

export const BUS_PREFS_KEY = 'Tsukin_Bus_Prefs';

const MAX_NAME_LENGTH = 80;

const isShortString = v => typeof v === 'string' && v.length > 0 && v.length <= MAX_NAME_LENGTH;

// 公車：{ dir: 方向的序號, previewStops: 預覽停留所名稱（最多 2 個）, collapsed: 卡片上是否收折 }
function sanitizeBusPrefs(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const clean = {};
    if (Number.isInteger(raw.dir) && raw.dir >= 0 && raw.dir < 100) clean.dir = raw.dir;
    if (Array.isArray(raw.previewStops)) {
        clean.previewStops = raw.previewStops.filter(isShortString).filter((n, i, a) => a.indexOf(n) === i).slice(0, 2);
    }
    if (typeof raw.collapsed === 'boolean') clean.collapsed = raw.collapsed;
    return Object.keys(clean).length > 0 ? clean : null;
}

const LINE_PREF_KINDS = [
    { storageKey: BUS_PREFS_KEY, match: id => id.startsWith('bus:'), sanitize: sanitizeBusPrefs },
];

function kindOf(id) {
    return typeof id === 'string' ? LINE_PREF_KINDS.find(k => k.match(id)) : undefined;
}

function readStore(storageKey) {
    try {
        const all = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
    } catch (e) {
        return {};
    }
}

// 匯出：取出這張卡片各路線的設定；沒有任何設定時回傳 null（不輸出欄位）
export function collectLineSettings(routeIds) {
    if (!Array.isArray(routeIds)) return null;
    const out = {};
    routeIds.forEach(id => {
        const kind = kindOf(id);
        if (!kind) return;
        const clean = kind.sanitize(readStore(kind.storageKey)[id]);
        if (clean) out[id] = clean;
    });
    return Object.keys(out).length > 0 ? out : null;
}

// 匯入前的檢查：只留下這張卡片有的路線、格式正確的設定
// idMap：舊路線 ID → 新路線 ID（路線 ID 遷移後，設定也跟著換 key）
export function sanitizeLineSettings(raw, routeIds, idMap = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !Array.isArray(routeIds)) return {};
    const out = {};
    Object.keys(raw).forEach(id => {
        const key = routeIds.includes(id) ? id : idMap[id];
        if (!key || !routeIds.includes(key) || out[key]) return;
        const kind = kindOf(key);
        const clean = kind ? kind.sanitize(raw[id]) : null;
        if (clean) out[key] = clean;
    });
    return out;
}

// 匯入：寫回各自的 localStorage（只覆蓋匯入資料裡有的路線，其他路線的設定不動）
export function applyLineSettings(settings) {
    if (!settings || typeof settings !== 'object') return;
    LINE_PREF_KINDS.forEach(kind => {
        const ids = Object.keys(settings).filter(id => kind.match(id));
        if (ids.length === 0) return;
        const all = readStore(kind.storageKey);
        ids.forEach(id => { all[id] = settings[id]; });
        try { localStorage.setItem(kind.storageKey, JSON.stringify(all)); } catch (e) { }
    });
}
