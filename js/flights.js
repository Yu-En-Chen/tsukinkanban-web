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

// 🟢 智慧雷達：日本國內線機場代碼
const domesticCodes = ['CTS', 'KIX', 'FUK', 'OKA', 'ITM', 'NGO', 'KOJ', 'MYJ', 'TAK', 'KMJ', 'AKJ', 'ASJ', 'ISG', 'KCZ', 'KMI', 'KTI', 'NGS', 'OIT', 'HIJ', 'AOJ', 'AXT', 'HKD', 'KUH', 'MMB', 'SHB', 'SYO', 'TKS', 'WKJ', 'YGJ', 'MBE', 'UKB', 'NKM', 'SDJ', 'GAJ', 'ONJ', 'FKS', 'NTQ', 'FSZ', 'KIJ', 'TOY', 'OIR', 'UBJ', 'TTJ', 'OKI', 'IWJ', 'IZO', 'TNE', 'KUM', 'RNJ', 'UEO', 'KKX', 'KJP', 'MMJ', 'SHI'];

export function initFlights() {
    try {
        const cachedFlights = localStorage.getItem('Tsukin_Cached_Flights');
        if (cachedFlights) window.GlobalFlights = JSON.parse(cachedFlights);
    } catch (e) { }

    setTimeout(() => {
        console.log("✈️ 背景延遲載入航班資訊中...");
        const timestamp = new Date().getTime();
        const FLIGHTS_API_URL = `https://tsukinkanban-odpt.onrender.com/api/flights?t=${timestamp}`;

        fetch(FLIGHTS_API_URL, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    window.GlobalFlights = data;
                    localStorage.setItem('Tsukin_Cached_Flights', JSON.stringify(data));
                    console.log(`✅ 成功載入 ${data.length} 筆航班資訊！`);
                }
            })
            .catch(e => console.warn("⚠️ 航班資訊獲取失敗"));
    }, 1500);
}

export function searchFlights(lowKeyword) {
    const results = [];
    if (window.GlobalFlights && lowKeyword.length > 0) {
        window.GlobalFlights.forEach(f => {
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
                    'NowBoarding': '搭乗中', 'FinalCall': '最終案内',
                    // ✨ 補上新的 API 狀態
                    'EstimatedDeparture': '出発予定',
                    'EstimatedArrival': '到着予定',
                    'Estimated': '変更予定',
                    'GateClosed': '搭乗終了',
                    'GoToGate': '搭乗口へ',
                    // ✨ 補上這裡
                    'InAir': '飛行中',
                    'LeftGate': '滑行中'
                };
                const statusText = statusMap[f.status] || f.status;

                let statusColor = 'inherit';
                let statusOpacity = '0.6';

                const greenStatuses = ['出発済', '到着済', '着陸済', '搭乗手続中', '飛行中', '滑行中'];
                const redStatuses = ['欠航', '搭乗終了'];
                // ✨ 將新的狀態加入一般狀態陣列中，才不會變成突兀的橘色
                const normalStatuses = ['通常', '新規到着', '出発予定', '到着予定', '変更予定'];

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

                const isCancelled = statusText === '欠航';
                const strikeScheduled = isTimeChanged || isCancelled;

                let flightTimeHtml = '';
                if (strikeScheduled && !isCancelled) {
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

                let companyHtml = '';
                if (f.type === 'Departure') {
                    const arrowRightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -3px; margin-left: 2px;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
                    companyHtml = `${airportBadge} <span style="font-weight: 800; opacity: 0.7; margin: 0 4px;">出発${arrowRightSvg}</span> <span style="font-weight: 800;">${f.location}</span>`;
                } else {
                    const arrowLeftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -3px; margin-right: 2px;"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
                    companyHtml = `${airportBadge} <span style="font-weight: 800; opacity: 0.7; margin: 0 4px;">到着${arrowLeftSvg}</span> <span style="font-weight: 800;">${f.location}</span>`;
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
// 🟢 航班專屬：共用資料格式化引擎 (給搜尋與重繪共同使用)
// ==========================================
window.generateFlightDataFormat = function (flight, fid) {
    const isTimeChanged = flight.scheduled !== flight.latest;
    const statusMap = {
        'Normal': '通常', 'Delayed': '遅延', 'Cancelled': '欠航',
        'Takeoff': '出発済', 'Landed': '着陸済', 'Arrived': '到着済',
        'Departed': '出発済', 'NewArrival': '新規到着', 'CheckIn': '搭乗手続中',
        'NowBoarding': '搭乗中', 'FinalCall': '最終案内',
        // ✨ 補上新的 API 狀態
        'EstimatedDeparture': '出発予定',
        'EstimatedArrival': '到着予定',
        'Estimated': '変更予定',
        'GateClosed': '搭乗終了',
        'GoToGate': '搭乗口へ',
        // ✨ 補上這裡
        'InAir': '飛行中',
        'LeftGate': '滑行中'
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

    const subtleGlow = '0 0 5px rgba(255,255,255,0.4), 0 0 1px rgba(255,255,255,0.6)';
    let statusColor = 'inherit', statusShadow = 'none';
    const greenStatuses = ['出発済', '到着済', '着陸済', '搭乗手続中', '飛行中', '滑行中'];
    const redStatuses = ['欠航'];
    const normalStatuses = ['通常', '新規到着'];

    if (greenStatuses.includes(statusText)) {
        statusColor = '#32d74b'; statusShadow = subtleGlow;
    } else if (redStatuses.includes(statusText)) {
        statusColor = '#ff3b30'; statusShadow = subtleGlow;
    } else if (normalStatuses.includes(statusText)) {
        statusColor = 'inherit'; statusShadow = 'none';
    } else {
        statusColor = '#ffcc00'; statusShadow = subtleGlow;
    }

    let delayColor = 'inherit', delayShadow = 'none', delayText = '';
    if (isTimeChanged) {
        if (delayMins > 30) {
            delayColor = '#ff3b30'; delayShadow = subtleGlow; delayText = `(+${delayMins}分)`;
        } else if (delayMins > 0) {
            delayColor = '#ffcc00'; delayShadow = subtleGlow; delayText = `(+${delayMins}分)`;
        } else if (delayMins < 0) {
            delayColor = '#32d74b'; delayShadow = subtleGlow; delayText = `(${delayMins}分)`;
        } else {
            delayText = `(±0分)`;
        }
    }

    // ✨ 1. 修復地圖與官網連結：提取純 3 碼的 IATA 代號 (例如把"成田（NRT）"還原為"NRT")
    const apMatch = (flight.airport || '').match(/[A-Z]{3}/);
    const rawAirportCode = apMatch ? apMatch[0] : flight.airport;

    const locMatch2 = (flight.location || '').match(/[A-Z]{3}/);
    const rawLocationCode = locMatch2 ? locMatch2[0] : flight.location;
    const isDomestic = rawLocationCode ? domesticCodes.includes(rawLocationCode) : false;

    // ✨ 2. 處理過長的英文備註 (自動翻譯為日文 + 字數裁切)
    let rawNote = (flight.note || '').trim();
    const translationDict = {
        "due to ": "",
        "late arrival of aircraft": "使用機到着遅延",
        "late arrival of the aircraft": "使用機到着遅延",
        "Late arrival": "使用機到着遅延",
        "late arrival": "使用機到着遅延",
        "Equipment change": "機材変更",
        "Weather condition": "天候不良",
        "Bad weather": "悪天候",
        "Maintenance": "機体整備",
        "Air traffic control": "航空管制",
        "Operational reason": "運航上の理由",
        "Typhoon": "台風の影響",
        "Snow": "降雪の影響",
        "Heavy rain": "大雨の影響",
        "Security check": "保安検査場の混雑",
        "Boarding": "搭乗手続きの遅れ",
        "Congestion": "空港混雑"
    };

    let processedNote = rawNote;
    if (processedNote) {
        Object.keys(translationDict).forEach(key => {
            const regex = new RegExp(key, "gi");
            processedNote = processedNote.replace(regex, translationDict[key]);
        });
        // 字首大寫(若還是英文的話)
        processedNote = processedNote.charAt(0).toUpperCase() + processedNote.slice(1);

        // 字數裁切
        if (processedNote.length > 25) {
            processedNote = processedNote.substring(0, 25) + '...';
        }
    }

    // ✨ 3. 組合航廈、登機口與備註，並塞入副標題
    let extraInfo = [];
    if (flight.terminal && flight.terminal !== '---') extraInfo.push(`${flight.terminal}`);
    if (flight.gate && flight.gate !== '---') extraInfo.push(`Gate ${flight.gate}`);

    let tAndG_string = extraInfo.length > 0 ? ` [${extraInfo.join(' / ')}]` : '';
    let noteDesc_string = processedNote ? ` | ${processedNote}` : '';

    const formattedUpdateTime = flight.system_updated ? flight.system_updated.substring(0, 5) : "--:--";

    let airportBadge = airportNamesJa[flight.airport] || flight.airport;
    if (flight.airport === 'NRT' && isDomestic) {
        airportBadge = `<span style="color: #ffcc00;">成田国内線</span>`;
    } else if (flight.airport === 'HND' && !isDomestic) {
        airportBadge = `<span style="color: #ffcc00;">羽田国際線</span>`;
    } else {
        airportBadge = `<span>${airportBadge}</span>`;
    }

    let routeHtml = '';
    if (flight.type === 'Departure') {
        const arrowRightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin: 0 4px;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
        routeHtml = `<span style="font-weight: 800;">${airportBadge}</span> <span style="font-weight: 800; opacity: 0.7;">出発${arrowRightSvg}</span> <span style="font-weight: 800;">${flight.location}</span>`;
    } else {
        const arrowLeftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin: 0 4px;"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
        routeHtml = `<span style="font-weight: 800;">${airportBadge}</span> <span style="font-weight: 800; opacity: 0.7;">到着${arrowLeftSvg}</span> <span style="font-weight: 800;">${flight.location}</span>`;
    }

    return {
        flags: flags,
        desc: `${flight.airline} ${statusText} ${delayText}${tAndG_string}${noteDesc_string}`, // 顯示在主卡片外圍的備註
        detailArray: [
            `場所: ${flight.terminal || '-'} / Gate: ${flight.gate || '-'}`,
            `備考: ${processedNote || 'なし'}`,
            '-',
            '-'
        ], // 讓卡片點開後的詳細視窗也能直接吃到資料
        flightData: {
            id: fid,
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

            // 🚨 救命關鍵：讓 downstream 的 script.js 可以拿到最乾淨的代碼來組裝 Google Maps 網址
            airport: rawAirportCode,    // 例如 "NRT"
            location: rawLocationCode,  // 例如 "TPE"
            airportName: flight.airport, // 保留完整的 "成田（NRT）"
            locationName: flight.location,

            terminal: flight.terminal,
            gate: flight.gate,
            note: processedNote
        }
    };
};

// ==========================================
// 🟢 航班專屬：無縫介接主卡片引擎 (幽靈卡片版)
// ==========================================
window.previewFlightFromSearch = function (routeId) {
    const fid = routeId.replace('flight-', '');
    const flight = window.GlobalFlights.find(f => f.fid.includes(fid));
    if (!flight) return;

    const searchInput = document.getElementById('search-input');
    const dropdown = document.getElementById('home-search-dropdown');
    if (searchInput) { searchInput.value = ''; searchInput.blur(); }
    if (dropdown) dropdown.style.display = 'none';

    const cancelBtn = document.querySelector('.cancel-circle-btn');
    if (cancelBtn) cancelBtn.click();

    if (window.appRailwayData) {
        const existingCard = window.appRailwayData.find(c =>
            !c.isTemporarySearch &&
            c.isFlightCard &&
            ((c.targetLineIds && c.targetLineIds.includes(fid)) ||
                (c.flightData && c.flightData.id === fid) ||
                (c.detailedLines && c.detailedLines.length > 0 && c.detailedLines[0].id === fid))
        );

        if (existingCard) {
            const cardEl = document.getElementById(`card-${existingCard.id}`);
            if (cardEl) {
                setTimeout(() => cardEl.click(), 300);
                return;
            }
        }
    }

    const formatted = window.generateFlightDataFormat(flight, fid);

    const takeoffIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M2 22h20"/><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"/></svg>`;
    const landingIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M2 22h20"/><path d="M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 0 1.09 1.52l4.4 2.2c.42.22.78.55 1.01.96l.6 1.03c.49.88-.06 1.98-1.06 2.1l-1.18.15c-.47.06-.95-.02-1.37-.24L4.29 11.15a2 2 0 0 1-.52-.38Z"/></svg>`;
    const flightTypeIcon = flight.type === 'Departure' ? takeoffIconSvg : landingIconSvg;

    const tempCard = {
        id: 'temp-search-flight',
        name: `${flightTypeIcon}${fid}`,
        hex: '#0a84ff',
        desc: formatted.desc,
        statusFlags: formatted.flags,
        isTemporarySearch: false,
        targetLineIds: [fid],
        detail: formatted.detailArray, // 直接將航廈、登機口、備註匯入詳細對話框面板中！
        detailedLines: [],
        isFlightCard: true,
        flightData: formatted.flightData
    };

    const tempIndex = window.appRailwayData.findIndex(c => c.id === 'temp-search-flight');
    if (tempIndex !== -1) window.appRailwayData[tempIndex] = tempCard;
    else window.appRailwayData.push(tempCard);

    setTimeout(() => {
        if (window.handleCardClick) window.handleCardClick('temp-search-flight');
    }, 250);
};