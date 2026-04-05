// ==========================================
// 獨立系統：路線追加引擎 (Route Appender)
// 完美接合全域 dialog.js (iosConfirm 引擎)
// ==========================================

window.RouteAppender = {

    // 1. 啟動入口
    openPicker: function(newRoute) {
        if (!newRoute || !newRoute.id) {
            console.error("[Route Appender] 缺少有效路線資料");
            return;
        }

        // ✨ 精準抓取首頁前五張卡片
        const homeCards = (window.appRailwayData || []).filter(c => 
            !c.isTemporarySearch && 
            c.id !== 'fixed-bottom' &&
            c.id !== 'search-temp'
        ).slice(0, 5);

        if (homeCards.length === 0) {
            // 防呆：如果首頁沒卡片，呼叫 dialog.js 顯示單按鈕錯誤警告
            if (window.iosConfirm) {
                window.iosConfirm('エラー', '首頁目前沒有可供加入的卡片！\n請先使用「新規カード作成」建立一張。', 'OK', null);
            } else {
                alert("首頁目前沒有可供加入的卡片！\n請先使用「新規カード作成」建立一張。");
            }
            return;
        }

        this.showIosDialog(newRoute, homeCards);
    },

    // 2. 利用 dialog.js 的 iosConfirm 來渲染選項
    showIosDialog: function(newRoute, homeCards) {
        if (!window.iosConfirm) {
            console.error("[系統錯誤] 找不到 dialog.js，請確認 index.html 引入順序");
            return;
        }

        // 🎨 自動適配手機的深淺色模式 (讓按鈕跟著 dialog.js 的底色一起變化)
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const btnBg = isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF';
        const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDarkMode ? '#FFF' : '#000';
        const subTextColor = isDarkMode ? '#8E8E93' : '#8E8E93';
        
        // 📦 建立要注射進 message 裡的 HTML 字串
        let htmlMessage = `<div style="margin-bottom: 16px; color: ${subTextColor}; font-size: 0.9rem; line-height: 1.4;">「${newRoute.name}」を追加する<br>カードを選択してください</div>`;
        
        htmlMessage += `<div id="route-appender-list" style="max-height: 40vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; text-align: left;">`;

        // 產生單選選項
        homeCards.forEach(card => {
            const routeCount = card.targetLineIds ? card.targetLineIds.length : 0;
            htmlMessage += `
                <button class="route-appender-option" data-card-id="${card.id}" style="
                    width: 100%; padding: 12px 18px; background: ${btnBg}; border: 1px solid ${borderColor};
                    border-radius: 999px; cursor: pointer; transition: all 0.2s ease; outline: none;
                    display: flex; align-items: center; gap: 12px; box-sizing: border-box;
                ">
                    <div class="radio-circle" style="width: 20px; height: 20px; min-width: 20px; border-radius: 50%; border: 1.5px solid #999; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                        <div class="radio-dot" style="width: 10px; height: 10px; border-radius: 50%; background: transparent; transition: all 0.2s;"></div>
                    </div>
                    
                    <span style="font-weight: 500; font-size: 1rem; color: ${textColor}; flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${card.name}</span>
                    
                    <span style="font-size: 0.8rem; color: ${subTextColor}; white-space: nowrap; min-width: 45px; text-align: right;">${routeCount} 路線</span>
                </button>
            `;
        });
        htmlMessage += `</div>`;

        // ⚠️ 關鍵魔法：移除所有換行符號。因為 dialog.js 有設定 white-space: pre-wrap，這會防止奇怪的空白跑出來
        htmlMessage = htmlMessage.replace(/\n/g, '').replace(/\s{2,}/g, ' ');

        let selectedTargetId = null;

        // 🚀 召喚 dialog.js 引擎 (它會回傳一個 Promise)
        const confirmPromise = window.iosConfirm('路線を追加', htmlMessage, '確認', 'キャンセル');

        // 💡 利用 setTimeout 攔截 DOM：因為 iosConfirm 呼叫後會瞬間畫在畫面上，我們趁機抓取按鈕來掛載事件
        setTimeout(() => {
            const confirmBtn = document.getElementById('ios-btn-confirm');
            
            // 1. 剛開啟時：強制上鎖「確認」按鈕
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.4';
                confirmBtn.style.pointerEvents = 'none'; // 防止點擊
            }

            // 2. 幫我們注射進去的單選按鈕掛上點擊事件
            const options = document.querySelectorAll('.route-appender-option');
            options.forEach(btn => {
                btn.onclick = () => {
                    selectedTargetId = btn.getAttribute('data-card-id');
                    
                    // 重置所有選項的外觀
                    options.forEach(b => {
                        b.style.borderColor = borderColor;
                        b.style.background = btnBg;
                        b.querySelector('.radio-circle').style.borderColor = '#999';
                        b.querySelector('.radio-dot').style.background = 'transparent';
                    });

                    // 點亮被選中的這個選項 (套用 iOS 原生藍色)
                    btn.style.borderColor = '#007AFF';
                    btn.style.background = isDarkMode ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)';
                    btn.querySelector('.radio-circle').style.borderColor = '#007AFF';
                    btn.querySelector('.radio-dot').style.background = '#007AFF';

                    // 🎯 使用者有選擇了！解鎖「確認」按鈕
                    if (confirmBtn) {
                        confirmBtn.disabled = false;
                        confirmBtn.style.opacity = '1';
                        confirmBtn.style.pointerEvents = 'auto';
                    }
                };
            });
        }, 50);

        // 🎯 處理使用者點擊「確認」後的結果 (取消或關閉時，dialog.js 會自己處理掉動畫並回傳 false)
        confirmPromise.then(isConfirmed => {
            if (isConfirmed && selectedTargetId) {
                this.appendRouteToCard(newRoute, selectedTargetId);
            }
        });
    },

    // 3. 核心資料合併邏輯
    appendRouteToCard: async function(newRoute, targetCardId) {
        const targetCard = window.appRailwayData.find(c => c.id === targetCardId);
        if (!targetCard) return;

        if (!targetCard.targetLineIds) targetCard.targetLineIds = [];
        if (!targetCard.detailedLines) targetCard.detailedLines = [];

        // 防呆：確認路線是否已經在卡片裡面了
        if (targetCard.targetLineIds.includes(newRoute.id)) {
            // 利用 dialog.js 彈出錯誤提示，第三個參數設為 null 隱藏取消按鈕
            if (window.iosConfirm) {
                window.iosConfirm('追加失敗', 'この路線はすでにカードに追加されています！', 'OK', null);
            } else {
                alert("この路線はすでにカードに追加されています！");
            }
            return;
        }

        // 將路線資料推入卡片陣列
        targetCard.targetLineIds.push(newRoute.id);
        targetCard.detailedLines.push({
            id: newRoute.id,
            name: newRoute.name,
            company: newRoute.company || "不明"
        });

        // 順便收起原本畫面上龐大的搜尋列
        const searchDropdown = document.getElementById('home-search-dropdown');
        if (searchDropdown) searchDropdown.style.display = 'none';
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        try {
            // 寫入永久資料庫
            if (window.saveCustomCardData) {
                await window.saveCustomCardData(targetCard); 
            } else if (window.saveRoutePreference) {
                await window.saveRoutePreference(targetCard.id, targetCard.name, targetCard.hex, { customName: targetCard.name });
            }

            // 觸發重新讀取並刷新畫面
            if (window.triggerBackgroundUpdate) {
                window.triggerBackgroundUpdate();
            } else if (window.initApp) {
                window.initApp();
            }
        } catch (err) {
            console.error("[Route Appender] 儲存失敗", err);
        }
    }
};