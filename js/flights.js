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

                const statusMap = {
                    'Normal': '通常', 'Delayed': '遅延', 'Cancelled': '欠航',
                    'Takeoff': '出発済', 'Landed': '着陸済', 'Arrived': '到着済',
                    'Departed': '出発済', 'NewArrival': '新規到着', 'CheckIn': '搭乗手続中',
                    'NowBoarding': '搭乗中', 'FinalCall': '最終案内'
                };
                const statusText = statusMap[f.status] || f.status;

                let statusColor = 'inherit';
                let statusOpacity = '0.6';

                const greenStatuses = ['出発済', '到着済', '着陸済', '搭乗手続中'];
                const redStatuses = ['欠航'];
                const normalStatuses = ['通常', '新規到着'];

                if (greenStatuses.includes(statusText)) {
                    statusColor = '#32d74b'; 
                    statusOpacity = '1';
                } else if (redStatuses.includes(statusText)) {
                    statusColor = '#ff3b30'; 
                    statusOpacity = '1';
                } else if (normalStatuses.includes(statusText)) {
                    statusColor = 'inherit'; 
                    statusOpacity = '0.5';
                } else {
                    statusColor = '#ff9500'; 
                    statusOpacity = '1';
                }

                const statusHtml = `<div style="color: ${statusColor}; opacity: ${statusOpacity}; font-weight: 800; font-size: 1.15em; letter-spacing: 1px;">${statusText}</div>`;

                // ✨ 加入與主卡片相同的欠航與劃線判斷
                const isCancelled = statusText === '欠航';
                const strikeScheduled = isTimeChanged || isCancelled;

                let flightTimeHtml = '';
                if (strikeScheduled && !isCancelled) {
                    // ✨ 拔除舊的 class 樣式，統一強制指定為亮橘色或紅色！
                    const delayColor = delayMins > 30 ? '#ff3b30' : '#ff9500';
                    flightTimeHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 12px; border-top: 1px dashed rgba(128,128,128,0.25);">
                            <div style="display: flex; align-items: center; gap: 16px; font-size: 0.95em;">
                                <div style="display: flex; align-items: baseline; gap: 6px; opacity: 0.5;">
                                    <span style="font-weight: 600;">定刻</span>
                                    <span style="text-decoration: line-through; font-family: monospace; font-size: 1.15em; line-height: 1;">${f.scheduled}</span>
                                </div>
                                <div style="display: flex; align-items: baseline; gap: 6px; font-size: 1em; margin: 0;">
                                    <span style="font-weight: 800; color: ${delayColor};">変更</span>
                                    <span style="font-weight: 800; font-family: monospace; font-size: 1.25em; line-height: 1; color: ${delayColor};">${f.latest}</span>
                                </div>
                            </div>
                            ${statusHtml}
                        </div>`;
                } else {
                    flightTimeHtml = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 12px; border-top: 1px dashed rgba(128,128,128,0.25);">
                            <div style="display: flex; align-items: baseline; gap: 6px; font-size: 0.95em; opacity: ${strikeScheduled ? '0.5' : '0.65'};">
                                <span style="font-weight: 600;">定刻</span>
                                <span style="font-family: monospace; font-size: 1.15em; line-height: 1; font-weight: 600; ${strikeScheduled ? 'text-decoration: line-through;' : ''}">${f.scheduled}</span>
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

                // ✨ 徹底拔除航空公司文字，並把地點換成與前方相同的 800 粗體
                let companyHtml = '';
                if (f.type === 'Departure') {
                    const arrowRightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -3px; margin-left: 2px;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
                    companyHtml = `${airportBadge} <span style="font-weight: 800; opacity: 0.7; margin: 0 4px;">出発${arrowRightSvg}</span> <span style="font-weight: 800;">${f.location}</span>`;
                } else {
                    const arrowLeftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -3px; margin-right: 2px;"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
                    companyHtml = `${airportBadge} <span style="font-weight: 800; opacity: 0.7; margin: 0 4px;">${arrowLeftSvg}到着</span> <span style="font-weight: 800;">${f.location}</span>`;
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
    const fid = routeId.replace('flight-', '');
    const flight = window.GlobalFlights.find(f => f.fid.includes(fid));
    if (!flight) return;

    const searchInput = document.getElementById('search-input');
    const dropdown = document.getElementById('home-search-dropdown');
    if (searchInput) { searchInput.value = ''; searchInput.blur(); }
    if (dropdown) dropdown.style.display = 'none';

    const cancelBtn = document.querySelector('.cancel-circle-btn');
    if (cancelBtn) cancelBtn.click();

    const isTimeChanged = flight.scheduled !== flight.latest;
    const statusMap = {
        'Normal': '通常', 'Delayed': '遅延', 'Cancelled': '欠航',
        'Takeoff': '出発済', 'Landed': '着陸済', 'Arrived': '到着済',
        'Departed': '出発済', 'NewArrival': '新規到着', 'CheckIn': '搭乗手続中',
        'NowBoarding': '搭乗中', 'FinalCall': '最終案内'
    };
    const statusText = statusMap[flight.status] || flight.status;

    let delayMins = 0;
    if (isTimeChanged && flight.scheduled !== '--:--' && flight.latest !== '--:--') {
        const [sh, sm] = flight.scheduled.split(':').map(Number);
        const [lh, lm] = flight.latest.split(':').map(Number);
        delayMins = (lh * 60 + lm) - (sh * 60 + sm);
        if (delayMins < -720) delayMins += 24 * 60; 
    }

    let flags = [false, false, false, false, false, false, false];
    if (['欠航'].includes(statusText)) {
        flags[3] = true;
    } else if (['搭乗中', '最終案内', '通常', '新規到着'].includes(statusText) || statusText === '情報なし') {
        flags[6] = true;
    } else if (isTimeChanged || ['遅延'].includes(statusText)) {
        flags[4] = true;
    } else {
        flags[5] = true;
    }

    // ✨ 收斂白光陰影：因為字體設定為 800 極粗體，我們把陰影擴散範圍縮小，讓光暈變得低調細緻
    const subtleGlow = '0 0 5px rgba(255,255,255,0.4), 0 0 1px rgba(255,255,255,0.6)';

    let statusColor = 'inherit';
    let statusShadow = 'none';
    const greenStatuses = ['出発済', '到着済', '着陸済', '搭乗手続中'];
    const redStatuses = ['欠航'];
    const normalStatuses = ['通常', '新規到着'];

    if (greenStatuses.includes(statusText)) {
        statusColor = '#32d74b'; 
        statusShadow = subtleGlow;
    } else if (redStatuses.includes(statusText)) {
        statusColor = '#ff3b30';
        statusShadow = subtleGlow;
    } else if (normalStatuses.includes(statusText)) {
        statusColor = 'inherit';
        statusShadow = 'none';
    } else {
        statusColor = '#ffcc00'; 
        statusShadow = subtleGlow;
    }

    let delayColor = 'inherit';
    let delayShadow = 'none';
    let delayText = '';

    if (isTimeChanged) {
        if (delayMins > 30) {
            delayColor = '#ff3b30';
            delayShadow = subtleGlow;
            delayText = `(+${delayMins}分)`;
        } else if (delayMins > 0) {
            delayColor = '#ffcc00';
            delayShadow = subtleGlow;
            delayText = `(+${delayMins}分)`;
        } else if (delayMins < 0) {
            delayColor = '#32d74b';
            delayShadow = subtleGlow;
            delayText = `(${delayMins}分)`;
        } else {
            delayText = `(±0分)`;
        }
    }

    const formattedUpdateTime = flight.system_updated ? flight.system_updated.substring(0, 5) : "--:--";

    const takeoffIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M2 22h20"/><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"/></svg>`;
    const landingIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M2 22h20"/><path d="M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z"/></svg>`;
    const flightTypeIcon = flight.type === 'Departure' ? takeoffIconSvg : landingIconSvg;

    const locMatch = flight.location.match(/[A-Z]{3}/);
    const locCode = locMatch ? locMatch[0] : '';
    const isDomestic = locCode ? domesticCodes.includes(locCode) : false;

    // ✨ 拔除機場警告外框：保留警示黃色，確保它跟後面的航線文字使用一樣的字體粗細
    let airportBadge = airportNamesJa[flight.airport] || flight.airport;
    if (flight.airport === 'NRT' && isDomestic) {
        airportBadge = `<span style="color: #ffcc00;">成田国内線</span>`;
    } else if (flight.airport === 'HND' && !isDomestic) {
        airportBadge = `<span style="color: #ffcc00;">羽田国際線</span>`;
    } else {
        airportBadge = `<span>${airportBadge}</span>`;
    }

    // ✨ 統一全體粗細：將出發地、目的地全部加上 font-weight: 800
    let routeHtml = '';
    if (flight.type === 'Departure') {
        const arrowRightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin: 0 4px;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
        routeHtml = `<span style="font-weight: 800;">${airportBadge}</span> <span style="font-weight: 800; opacity: 0.7;">出発${arrowRightSvg}</span> <span style="font-weight: 800;">${flight.location}</span>`;
    } else {
        const arrowLeftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin: 0 4px;"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
        routeHtml = `<span style="font-weight: 800;">${airportBadge}</span> <span style="font-weight: 800; opacity: 0.7;">${arrowLeftSvg}到着</span> <span style="font-weight: 800;">${flight.location}</span>`;
    }

    const tempCard = {
        id: 'temp-search-flight', 
        name: `${flightTypeIcon}${fid}`, 
        hex: '#0a84ff', 
        desc: '', 
        statusFlags: flags,
        isTemporarySearch: false, 
        detail: ['フライト', '-', '-', '-'], 
        detailedLines: [], 
        isFlightCard: true, 
        flightData: {
            airline: flight.airline,
            routeHtml: routeHtml,
            scheduled: flight.scheduled,
            latest: flight.latest,
            updateTime: formattedUpdateTime, 
            statusText: statusText,
            statusColor: statusColor,       
            statusShadow: statusShadow,     
            delayColor: delayColor,         
            delayShadow: delayShadow,
            delayText: delayText,
            isCancelled: statusText === '欠航',
            type: flight.type,
            airport: flight.airport,
            location: flight.location,
            terminal: flight.terminal,
            gate: flight.gate
        }
    };

    const tempIndex = window.appRailwayData.findIndex(c => c.id === 'temp-search-flight');
    if (tempIndex !== -1) window.appRailwayData[tempIndex] = tempCard;
    else window.appRailwayData.push(tempCard);

    setTimeout(() => {
        if (window.handleCardClick) window.handleCardClick('temp-search-flight');
    }, 250);
};