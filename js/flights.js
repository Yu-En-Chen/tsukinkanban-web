// js/flights.js
// ==========================================
// ✈️ 航班專屬資料與搜尋引擎模組
// ==========================================

const airportNamesJa = {
    'NRT': '成田（NRT）',
    'HND': '羽田（HND）'
};

const takeoffIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plane-takeoff-icon lucide-plane-takeoff" style="vertical-align: text-bottom; margin-right: 2px;"><path d="M2 22h20"/><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"/></svg>`;

const landingIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plane-landing-icon lucide-plane-landing" style="vertical-align: text-bottom; margin-right: 2px;"><path d="M2 22h20"/><path d="M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z"/></svg>`;

// 🟢 智慧雷達：日本國內線機場代碼 (盡可能涵蓋 ODPT 常見的日本國內線)
const domesticCodes = ['CTS', 'KIX', 'FUK', 'OKA', 'ITM', 'NGO', 'KOJ', 'MYJ', 'TAK', 'KMJ', 'AKJ', 'ASJ', 'ISG', 'KCZ', 'KMI', 'KTI', 'NGS', 'OIT', 'HIJ', 'AOJ', 'AXT', 'HKD', 'KUH', 'MMB', 'SHB', 'SYO', 'TKS', 'WKJ', 'YGJ', 'MBE', 'UKB', 'NKM', 'SDJ', 'GAJ', 'ONJ', 'FKS', 'NTQ', 'FSZ', 'KIJ', 'TOY', 'OIR', 'UBJ', 'TTJ', 'OKI', 'IWJ', 'IZO', 'TNE', 'KUM', 'RNJ', 'UEO', 'KKX', 'KJP', 'MMJ', 'SHI'];

export function initFlights() {
    setTimeout(() => {
        console.log("✈️ 背景延遲載入航班資訊中...");
        const timestamp = new Date().getTime();
        const FLIGHTS_API_URL = `https://tsukinkanban-odpt.onrender.com/api/flights?t=${timestamp}`;

        fetch(FLIGHTS_API_URL, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    window.GlobalFlights = data;
                    console.log(`✅ 成功載入 ${data.length} 筆航班資訊！`);
                }
            })
            .catch(e => console.warn("⚠️ 航班資訊獲取失敗"));
    }, 3000);
}

export function searchFlights(lowKeyword) {
    const results = [];
    if (window.GlobalFlights && lowKeyword.length > 0) {
        window.GlobalFlights.forEach(f => {
            // 只取航班編號，徹底拔除字串裡的所有「-」與「空白」
            const flightStr = f.fid.join('').toLowerCase().replace(/[\s-]/g, '');
            
            if (flightStr.includes(lowKeyword)) {
                let sClass = 'status-normal';
                
                if (f.status === 'Cancelled' || f.status === '欠航') {
                    sClass = 'status-error';
                } else if (f.status === 'Delayed' || f.status === '遅延') {
                    sClass = 'status-delayed';
                }

                const flightTypeIcon = f.type === 'Departure' ? takeoffIconSvg : landingIconSvg;
                const isTimeChanged = f.scheduled !== f.latest;

                // ✨ 1. 航班淨化：只顯示搜尋命中的那個航班編號，拔除突兀的 "..."
                let matchedFid = f.fid[0]; 
                for (let id of f.fid) {
                    if (id.toLowerCase().replace(/[\s-]/g, '').includes(lowKeyword)) {
                        matchedFid = id;
                        break;
                    }
                }
                const displayFid = matchedFid;

                // ✨ 2. 時間差計算器：算出實際延誤分鐘數 (處理半夜跨日問題)
                let delayMins = 0;
                if (isTimeChanged && f.scheduled !== '--:--' && f.latest !== '--:--') {
                    const [sh, sm] = f.scheduled.split(':').map(Number);
                    const [lh, lm] = f.latest.split(':').map(Number);
                    delayMins = (lh * 60 + lm) - (sh * 60 + sm);
                    if (delayMins < -720) delayMins += 24 * 60; // 跨日防呆 (例如 23:50 改到 00:30)
                }

                // ✨ 3. 智慧燈號：改用三角形 (flags[4]) 取代原本的驚嘆號
                let flags = [false, false, false, false, false, false, false];
                if (sClass === 'status-error') {
                    flags[3] = true; // ❌ 嚴重錯誤 (欠航)
                } else if (sClass === 'status-delayed' || delayMins > 30) {
                    flags[4] = true; // 🔴 嚴重延遲 (三角形)
                } else if (isTimeChanged) {
                    flags[4] = true; // ⚠️ 時間有變更，一樣亮三角形燈
                } else {
                    flags[5] = true; // ✅ 準點正常燈號
                }

                // ✨ 4. 完美換行排版：上下兩行對齊，超過30分用紅色 (search-delay-major)
                let flightTimeHtml = '';
                if (isTimeChanged) {
                    const delayClass = delayMins > 30 ? 'search-delay-major' : 'search-delay-minor';
                    flightTimeHtml = `
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; margin-top: 4px; font-size: 0.85em;">
                            <div style="text-decoration: line-through; opacity: 0.5; font-weight: 600;">定刻 ${f.scheduled}</div>
                            <div class="${delayClass}" style="margin: 0; font-size: inherit; font-weight: 800;">変更 ${f.latest}</div>
                        </div>`;
                } else {
                    flightTimeHtml = `
                        <div style="text-align: right; margin-top: 4px; opacity: 0.6; font-weight: 600; font-size: 0.85em;">
                            定刻 ${f.scheduled}
                        </div>`;
                }

                // 判斷這班飛機的對手機場，是不是在日本國內
                const locMatch = f.location.match(/[A-Z]{3}/);
                const locCode = locMatch ? locMatch[0] : '';
                const isDomestic = locCode ? domesticCodes.includes(locCode) : false;

                let airportBadge = airportNamesJa[f.airport] || f.airport;
                
                // 觸發防呆標籤
                if (f.airport === 'NRT' && isDomestic) {
                    airportBadge = `<span class="flight-alert-badge">成田（NRT）国内線</span>`;
                } else if (f.airport === 'HND' && !isDomestic) {
                    airportBadge = `<span class="flight-alert-badge">羽田（HND）国際線</span>`;
                }

                let companyHtml = '';
                if (f.type === 'Departure') {
                    companyHtml = `${airportBadge} <span style="font-weight: 600; opacity: 0.7; margin: 0 4px;">出発 ➔</span> ${f.location} <span style="opacity: 0.7;">(${f.airline})</span>`;
                } else {
                    companyHtml = `${airportBadge} <span style="font-weight: 600; opacity: 0.7; margin: 0 4px;">← 到着</span> ${f.location} <span style="opacity: 0.7;">(${f.airline})</span>`;
                }

                results.push({
                    id: 'flight-' + f.fid[0],
                    name: `${flightTypeIcon} ${displayFid}`, 
                    company: companyHtml, 
                    statusFlags: flags,
                    customRightHtml: flightTimeHtml, 
                    isFlight: true 
                });
            }
        });
    }
    return results;
}