// data-sources.js - 資料來源的狀態（/api/sources）
// 公共交通オープンデータチャレンジの限定資料は 2027-02-28 に提供終了。
// 終了した来源（state: ended）があれば、通知・履歴と該当するカード・航班の面板に案内を出す。
// 頁面載入時に一度だけ取得（失敗しても他の画面には影響しない）
const SOURCES_URL = 'https://api.tsukinkanban.com/api/sources';
const COUNTDOWN_DAYS = 30; // 終了日の 30 日前から通知・履歴に予告を出す

const RAILWAY_ENDED_TEXT = 'JR東日本・東武・西武・京急・京王・東急の運行情報は、公共交通オープンデータチャレンジのデータ提供終了（2027年2月28日）に伴い表示を終了しました。';
const FLIGHT_ENDED_TEXT = '成田・羽田空港の運航情報（JAL・ANA以外）は提供を終了しました。';

window.GlobalSources = window.GlobalSources || null;

export async function loadDataSources() {
    try {
        const res = await fetch(SOURCES_URL);
        if (!res.ok) return null;
        const data = await res.json();
        if (data && Array.isArray(data.sources)) {
            window.GlobalSources = data;
            window.dispatchEvent(new CustomEvent('dataSourcesUpdated'));
        }
        return data;
    } catch (e) {
        return null;
    }
}

function endedSources() {
    const s = window.GlobalSources;
    return ((s && s.sources) || []).filter(x => x.challenge && x.state === 'ended');
}

// 鐵道の来源（航班以外）が終了していれば案内文
export function railwayEndedNotice() {
    return endedSources().some(x => x.id !== 'flights_nrt_hnd') ? RAILWAY_ENDED_TEXT : '';
}

// 成田・羽田の一般航班が終了していれば案内文
export function flightEndedNotice() {
    return endedSources().some(x => x.id === 'flights_nrt_hnd') ? FLIGHT_ENDED_TEXT : '';
}

// 終了日の 30 日前から終了日までの予告（日本時間で数える）
function countdownNotice() {
    const s = window.GlobalSources;
    if (!s || !s.challenge_end || endedSources().length > 0) return '';
    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const days = Math.round((Date.parse(`${s.challenge_end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
    if (days < 0 || days > COUNTDOWN_DAYS) return '';
    const [y, m, d] = s.challenge_end.split('-').map(Number);
    const when = days === 0 ? '本日' : `あと${days}日`;
    return `${s.challenge_name || '公共交通オープンデータチャレンジ'}のデータ提供は${y}年${m}月${d}日で終了します（${when}）。JR東日本・東武・西武・京急・京王・東急の運行情報と、成田・羽田の一般航班の表示が終了します。`;
}

// 通知・履歴の先頭に出す案内（終了済み、または終了前の予告）
export function sourceNotices() {
    return [railwayEndedNotice(), flightEndedNotice(), countdownNotice()].filter(Boolean);
}

// 案内の一枠（灰色・ℹ︎）
export function sourceNoticeHtml(text) {
    return `<div class="source-notice"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>${text}</span></div>`;
}

window.getSourceNoticesHtml = () => sourceNotices().map(sourceNoticeHtml).join('');
