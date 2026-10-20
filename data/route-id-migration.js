// route-id-migration.js - 後端更換路線 ID 時，轉換使用者已儲存的舊 ID
// 前端與後端不會同時上線，所以只在「新 ID 已出現在字典或運行狀態」時才轉換；
// 新 ID 還不存在時保留舊 ID，維持現在的顯示

export const ROUTE_ID_MIGRATION = {
    'internal.Railway:JR-East.Itsukaichi': 'odpt.Railway:JR-East.Itsukaichi', // 五日市線
    'internal.Railway:Tobu.Kameido': 'odpt.Railway:Tobu.Kameido',             // 東武亀戸線
    'internal.Railway:Tobu.Daishi': 'odpt.Railway:Tobu.Daishi',               // 東武大師線
    'internal.Railway:Tobu.Ogose': 'odpt.Railway:Tobu.Ogose',                 // 東武越生線
};

// 後端目前認得的路線 ID：/api/dictionary 的 routes 與 /api/status 的 key
export function knownRouteIdSet(routeDict, liveStatus) {
    const known = new Set();
    [routeDict, liveStatus].forEach(src => {
        if (!src || typeof src !== 'object') return;
        Object.keys(src).forEach(key => { if (key !== '_meta') known.add(key); });
    });
    return known;
}

// 轉換一張卡片的路線列表（維持順序、去除重複）；沒有任何轉換時回傳 null
export function migrateRouteIds(ids, known) {
    if (!Array.isArray(ids)) return null;

    const mapped = ids.map(id => {
        const next = ROUTE_ID_MIGRATION[id];
        return next && known.has(next) ? next : id;
    });
    if (mapped.every((id, i) => id === ids[i])) return null;

    return mapped.filter((id, i) => mapped.indexOf(id) === i);
}
