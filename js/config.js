// 💡 客製化訊息規則字典 (觸發代號 -> 綁定的路線 ID 陣列)
const CUSTOM_MESSAGE_RULES = {
    "MSG_GROUP_01": ["JR.Yamanote", "JR.ChuoRapid"], // 群組1：綁定山手線、中央線
    "MSG_GROUP_02": ["TokyoMetro.Ginza", "TokyoMetro.Marunouchi"], // 群組2：綁定地下鐵
    // ... 中間省略，依此類推到第 14 組 ...
    "MSG_GROUP_14": ["Keio.Keio"], 
    "MSG_GLOBAL":   ["ALL"] // 🌟 群組15：終極大絕招，"ALL" 代表全體放送！
};

// 儲存目前生效中的客製化訊息
let activeCustomMessages = [];

// 1. 去 Google 表單/GAS API 抓取動態指令
async function fetchAndFilterCustomMessages() {
    try {
        // 假設你的 API 會回傳如下格式的 JSON 陣列：
        // [{ "triggerCode": "MSG_GROUP_01", "startTime": "2026-04-18T10:00:00", "endTime": "2026-04-18T18:00:00", "message": "這是測試訊息" }]
        const response = await fetch('YOUR_GOOGLE_API_ENDPOINT');
        const data = await response.json();

        const now = new Date();

        // 🌟 核心：過濾出「目前時間正好落在 startTime 與 endTime 之間」的有效訊息
        activeCustomMessages = data.filter(item => {
            const start = new Date(item.startTime);
            const end = new Date(item.endTime);
            return now >= start && now <= end;
        });

    } catch (error) {
        console.error("客製化訊息 API 讀取失敗:", error);
    }
}

// 2. 二次加工引擎：將訊息注入到路線狀態中
function applyCustomMessagesToStatus(liveStatus) {
    if (activeCustomMessages.length === 0) return liveStatus; // 如果沒有生效的訊息，直接原物奉還

    // 遍歷所有從原始 API 抓回來的路線狀態
    for (const routeId in liveStatus) {
        
        // 針對每一條路線，檢查有沒有命中生效中的規則
        activeCustomMessages.forEach(rule => {
            const targetRoutes = CUSTOM_MESSAGE_RULES[rule.triggerCode] || [];
            
            // 🌟 聰明的判斷法：如果目標包含 "ALL" (全域)，或者這條路線的 ID 剛好在名單內
            if (targetRoutes.includes("ALL") || targetRoutes.includes(routeId)) {
                
                if (liveStatus[routeId]) {
                    // 將客製化訊息「換行」並附加在原本的 message 後面
                    // 你也可以加上 Emoji 讓它在畫面上更醒目
                    const customText = `\n\n📢 【特別公告】${rule.message}`;
                    liveStatus[routeId].message += customText;
                    
                    // (進階操作：如果你希望加上公告時，主畫面強制亮黃燈/紅燈，可以在這裡偷改狀態)
                    // liveStatus[routeId].status_type = "お知らせ"; 
                }
            }
        });
    }

    return liveStatus; // 回傳加工後的毒蘋果 (X) 強化版資料 (O)
}