// js/flights.js
// ==========================================
// ✈️ 航班專屬資料與搜尋引擎模組
// ==========================================

export function initFlights() {
    // 延遲 3 秒載入，不卡主畫面的火車渲染
    setTimeout(() => {
        console.log("✈️ 背景延遲載入航班資訊中...");
        fetch('https://tsukinkanban-odpt.onrender.com/api/flights')
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
            // 把航班編號、機場、目的地、航空公司全部串起來轉小寫當作比對池
            const flightStr = (f.fid.join(' ') + ' ' + f.airport + ' ' + f.location + ' ' + f.airline).toLowerCase();
            
            if (flightStr.includes(lowKeyword)) {
                let sClass = 'status-normal';
                let sText = f.status;
                
                if (f.status === 'Cancelled' || f.status === '欠航') {
                    sClass = 'status-error';
                    sText = '欠航';
                } else if (f.status === 'Delayed' || f.status === '遅延') {
                    sClass = 'status-delayed';
                    sText = '遅延';
                }

                const typeText = f.type === 'Departure' ? '出発' : '到着';
                const timeText = f.scheduled !== f.latest ? `変更 ${f.latest}` : `定刻 ${f.scheduled}`;

                // 轉換成跟火車相容的七燈號陣列
                let flags = [false, false, false, false, false, false, false];
                if (sClass === 'status-error') flags[3] = true;
                else if (sClass === 'status-delayed') flags[4] = true;
                else flags[5] = true;

                // ✨ 飛機專屬的右側時間文字排版
                const flightTimeHtml = `<div class="${sClass === 'status-normal' ? 'search-delay-minor' : 'search-delay-major'}" style="color: ${sClass === 'status-normal' ? 'inherit' : ''}; opacity: ${sClass === 'status-normal' ? '0.7' : '1'};">${timeText}</div>`;

                results.push({
                    id: 'flight-' + f.fid[0],
                    name: `✈️ ${f.fid.join('/')}`,
                    company: `${f.airport} ${typeText} ➔ ${f.location} (${f.airline})`,
                    statusFlags: flags,
                    customRightHtml: flightTimeHtml, // 將飛機專屬文字傳給主渲染器
                    isFlight: true // 標記為飛機，防止被點擊加入卡片
                });
            }
        });
    }
    return results;
}