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

                let matchedFid = f.fid[0]; 
                for (let id of f.fid) {
                    if (id.toLowerCase().replace(/[\s-]/g, '').includes(lowKeyword)) {
                        matchedFid = id;
                        break;
                    }
                }
                const displayFid = matchedFid;

                let delayMins = 0;
                if (isTimeChanged && f.scheduled !== '--:--' && f.latest !== '--:--') {
                    const [sh, sm] = f.scheduled.split(':').map(Number);
                    const [lh, lm] = f.latest.split(':').map(Number);
                    delayMins = (lh * 60 + lm) - (sh * 60 + sm);
                    if (delayMins < -720) delayMins += 24 * 60; 
                }

                let flags = [false, false, false, false, false, false, false];
                if (sClass === 'status-error') {
                    flags[3] = true; 
                } else if (sClass === 'status-delayed' || delayMins > 30) {
                    flags[4] = true; 
                } else if (isTimeChanged) {
                    flags[4] = true; 
                } else {
                    flags[5] = true; 
                }

                // ✨ 1. 狀態翻譯蒟蒻
                const statusMap = {
                    'Normal': '通常', 'Delayed': '遅延', 'Cancelled': '欠航',
                    'Takeoff': '出発済', 'Landed': '着陸済', 'Arrived': '到着済',
                    'Departed': '出発済', 'NewArrival': '新規到着', 'CheckIn': '搭乗手続中',
                    'NowBoarding': '搭乗中', 'FinalCall': '最終案内'
                };
                const statusText = statusMap[f.status] || f.status;

                // ✨ 2. 純文字分色系統 (更新：欠航紅、關櫃黃、報到/完成綠)
                let statusColor = 'inherit';
                let statusOpacity = '0.6';

                const greenStatuses = ['出発済', '到着済', '着陸済', '搭乗手続中'];
                const redStatuses = ['欠航'];
                const normalStatuses = ['通常', '新規到着'];

                if (greenStatuses.includes(statusText)) {
                    statusColor = '#32d74b'; // 🟢 綠色：已起飛/降落、報到手續中
                    statusOpacity = '1';
                } else if (redStatuses.includes(statusText)) {
                    statusColor = '#ff3b30'; // 🔴 紅色：欠航
                    statusOpacity = '1';
                } else if (normalStatuses.includes(statusText)) {
                    statusColor = 'inherit'; // ⚪ 普通色：還沒開放 checkin
                    statusOpacity = '0.5';
                } else {
                    statusColor = '#ff9500'; // 🟡 黃橘色：搭乘中、最終案內、延遲等已關櫃狀態
                    statusOpacity = '1';
                }

                // 產出無外框的純文字狀態標籤
                const statusHtml = `<div style="color: ${statusColor}; opacity: ${statusOpacity}; font-weight: 800; font-size: 1.15em; letter-spacing: 1px;">${statusText}</div>`;

                // ✨ 3. 底部排版組合
                let flightTimeHtml = '';
                if (isTimeChanged) {
                    const delayClass = delayMins > 30 ? 'search-delay-major' : 'search-delay-minor';
                    flightTimeHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 12px; border-top: 1px dashed rgba(128,128,128,0.25);">
                            <div style="display: flex; align-items: center; gap: 16px; font-size: 0.95em;">
                                <div style="display: flex; align-items: center; gap: 6px; opacity: 0.5;">
                                    <span style="font-weight: 600;">定刻</span>
                                    <span style="text-decoration: line-through; font-family: monospace; font-size: 1.1em;">${f.scheduled}</span>
                                </div>
                                <div class="${delayClass}" style="display: flex; align-items: center; gap: 6px; font-size: 1em; margin: 0;">
                                    <span style="font-weight: 800;">変更</span>
                                    <span style="font-weight: 800; font-family: monospace; font-size: 1.25em;">${f.latest}</span>
                                </div>
                            </div>
                            ${statusHtml}
                        </div>`;
                } else {
                    flightTimeHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 12px; border-top: 1px dashed rgba(128,128,128,0.25);">
                            <div style="display: flex; align-items: center; gap: 6px; font-size: 0.95em; opacity: 0.65;">
                                <span style="font-weight: 600;">定刻</span>
                                <span style="font-family: monospace; font-size: 1.1em; font-weight: 600;">${f.scheduled}</span>
                            </div>
                            ${statusHtml}
                        </div>`;
                }

                const locMatch = f.location.match(/[A-Z]{3}/);
                const locCode = locMatch ? locMatch[0] : '';
                const isDomestic = locCode ? domesticCodes.includes(locCode) : false;

                let airportBadge = airportNamesJa[f.airport] || f.airport;
                
                if (f.airport === 'NRT' && isDomestic) {
                    airportBadge = `<span class="flight-alert-badge">成田（NRT）国内線</span>`;
                } else if (f.airport === 'HND' && !isDomestic) {
                    airportBadge = `<span class="flight-alert-badge">羽田（HND）国際線</span>`;
                }

                let companyHtml = '';
                if (f.type === 'Departure') {
                    const arrowRightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -3px; margin-left: 2px;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
                    companyHtml = `${airportBadge} <span style="font-weight: 800; opacity: 0.7; margin: 0 4px;">出発${arrowRightSvg}</span> ${f.location} <span style="opacity: 0.7;">(${f.airline})</span>`;
                } else {
                    const arrowLeftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -3px; margin-right: 2px;"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
                    companyHtml = `${airportBadge} <span style="font-weight: 800; opacity: 0.7; margin: 0 4px;">${arrowLeftSvg}到着</span> ${f.location} <span style="opacity: 0.7;">(${f.airline})</span>`;
                }

                results.push({
                    id: 'flight-' + f.fid[0],
                    name: `${flightTypeIcon} ${displayFid}`, 
                    company: companyHtml, 
                    statusFlags: flags,
                    customBottomHtml: flightTimeHtml, 
                    isFlight: true 
                });
            }
        });
    }
    return results;
}
// ==========================================
// 🟢 航班專屬：無縫介接主卡片引擎 (幽靈卡片版)
// ==========================================
window.previewFlightFromSearch = function(routeId) {
    // 1. 抓出飛機資料
    const fid = routeId.replace('flight-', '');
    const flight = window.GlobalFlights.find(f => f.fid.includes(fid));
    if (!flight) return;

    // 2. 收起搜尋介面與鍵盤
    const searchInput = document.getElementById('search-input');
    const dropdown = document.getElementById('home-search-dropdown');
    if (searchInput) { searchInput.value = ''; searchInput.blur(); }
    if (dropdown) dropdown.style.display = 'none';

    // 如果有原生的返回鍵，模擬點擊它來徹底清空搜尋狀態
    const cancelBtn = document.querySelector('.cancel-circle-btn');
    if (cancelBtn) cancelBtn.click();

    // 3. 狀態判定
    const isTimeChanged = flight.scheduled !== flight.latest;
    const statusMap = {
        'Normal': '通常', 'Delayed': '遅延', 'Cancelled': '欠航',
        'Takeoff': '出発済', 'Landed': '着陸済', 'Arrived': '到着済',
        'Departed': '出発済', 'NewArrival': '新規到着', 'CheckIn': '搭乗手続中',
        'NowBoarding': '搭乗中', 'FinalCall': '最終案内'
    };
    const statusText = statusMap[flight.status] || flight.status;

    let isDelayed = false, isError = false, isAttention = false;
    let flags = [false, false, false, false, false, false, false];

    if (['欠航'].includes(statusText)) {
        isError = true; flags[3] = true;
    } else if (['搭乗中', '最終案内', '通常', '新規到着'].includes(statusText) || statusText === '情報なし') {
        isAttention = true; flags[6] = true;
    } else if (isTimeChanged || ['遅延'].includes(statusText)) {
        isDelayed = true; flags[4] = true;
    } else {
        flags[5] = true;
    }

    // 4. ✨ 打造幽靈卡片：偽裝成火車卡片，硬塞給主程式！
    const tempCard = {
        id: 'temp-search-flight', 
        name: `✈️ ${fid}`,
        hex: '#0a84ff', // 航空藍色，會自動產生漂亮的光影漸層！
        desc: `${flight.airline} / ${flight.location} 行き`,
        statusFlags: flags,
        isTemporarySearch: false, // 隱藏「加入看板」按鈕
        detail: ['フライト', '-', '-', '-'], 
        detailedLines: [{
            id: routeId,
            name: `${flight.airport} ➔ ${flight.location}`,
            company: flight.airline,
            status: statusText,
            message: `定刻: ${flight.scheduled} / 変更: ${flight.latest}`, // 把時間藏在這裡傳給 script.js
            delay: 0,
            updateTime: flight.system_updated || "--:--",
            isDelayed: isDelayed,
            isError: isError,
            isAttention: isAttention,
            advancedDetails: [] 
        }],
        isFlightCard: true // 🟢 關鍵：讓 script.js 知道這是一架飛機！
    };

    // 5. 寫入全域記憶體
    const tempIndex = window.appRailwayData.findIndex(c => c.id === 'temp-search-flight');
    if (tempIndex !== -1) window.appRailwayData[tempIndex] = tempCard;
    else window.appRailwayData.push(tempCard);

    // 6. 等待 250ms 手機鍵盤縮回後，呼叫主引擎打開它！
    setTimeout(() => {
        if (window.handleCardClick) window.handleCardClick('temp-search-flight');
    }, 250);
};