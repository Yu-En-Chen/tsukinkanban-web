// 🟢 1. 引入你寫好的資料庫引擎！
import { updateCardRoutes } from '../data/db.js';

// ==========================================
// 獨立系統：路線追加引擎 (Route Appender)
// 完美接合全域 dialog.js (iosConfirm 引擎) 與 IndexedDB
// ==========================================

window.RouteAppender = {

    // 1. 啟動入口
    openPicker: function(newRoute) {
        if (!newRoute || !newRoute.id) {
            console.error("[Route Appender] 缺少有效路線資料");
            return;
        }

        // 精準抓取首頁前五張卡片
        const homeCards = (window.appRailwayData || []).filter(c => 
            !c.isTemporarySearch && 
            c.id !== 'fixed-bottom' &&
            c.id !== 'search-temp'
        ).slice(0, 5);

        if (homeCards.length === 0) {
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

        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const btnBg = isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF';
        const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDarkMode ? '#FFF' : '#000';
        const subTextColor = isDarkMode ? '#8E8E93' : '#8E8E93';
        
        let htmlMessage = `<div style="margin-bottom: 16px; color: ${subTextColor}; font-size: 0.9rem; line-height: 1.4;">「${newRoute.name}」を追加する<br>カードを選択してください</div>`;
        htmlMessage += `<div id="route-appender-list" style="max-height: 40vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; text-align: left;">`;

        homeCards.forEach(card => {
            const targetLines = card.targetLineIds || [];
            const routeCount = targetLines.length;

            // ✨ 核心升級：智慧防呆狀態判斷
            let isDisabled = false;
            let statusText = `${routeCount} 路線`;

            if (card.isFlightCard) {
                isDisabled = true;
                statusText = "航空用"; // 飛機專用卡片
            } else if (targetLines.includes(newRoute.id)) {
                isDisabled = true;
                statusText = "追加済"; // 已經存在該路線
            } else if (routeCount >= 6) {
                isDisabled = true;
                statusText = "上限到達"; // 達到 6 條路線上限
            }

            // 若被禁用，改變透明度且禁止滑鼠事件
            const disabledStyle = isDisabled ? `opacity: 0.4; pointer-events: none;` : `cursor: pointer;`;
            // 若被禁用，右側文字稍微加粗並變換顏色以供識別
            const statusColor = isDisabled ? (isDarkMode ? '#FF453A' : '#D70015') : subTextColor; 
            const statusWeight = isDisabled ? '600' : 'normal';

            htmlMessage += `
                <button class="route-appender-option" data-card-id="${card.id}" ${isDisabled ? 'disabled' : ''} style="
                    width: 100%; padding: 12px 18px; background: ${btnBg}; border: 1px solid ${borderColor};
                    border-radius: 999px; transition: all 0.2s ease; outline: none;
                    display: flex; align-items: center; gap: 12px; box-sizing: border-box;
                    ${disabledStyle}
                ">
                    <div class="radio-circle" style="width: 20px; height: 20px; min-width: 20px; border-radius: 50%; border: 1.5px solid #999; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                        <div class="radio-dot" style="width: 10px; height: 10px; border-radius: 50%; background: transparent; transition: all 0.2s;"></div>
                    </div>
                    <span style="font-weight: 500; font-size: 1rem; color: ${textColor}; flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${card.name}</span>
                    <span style="font-size: 0.8rem; color: ${statusColor}; font-weight: ${statusWeight}; white-space: nowrap; min-width: 50px; text-align: right;">${statusText}</span>
                </button>
            `;
        });
        htmlMessage += `</div>`;

        htmlMessage = htmlMessage.replace(/\n/g, '').replace(/\s{2,}/g, ' ');

        let selectedTargetId = null;
        const confirmPromise = window.iosConfirm('路線を追加', htmlMessage, '確認', 'キャンセル');

        setTimeout(() => {
            const confirmBtn = document.getElementById('ios-btn-confirm');
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.4';
                confirmBtn.style.pointerEvents = 'none';
            }

            // ✨ 神奇選擇器：只幫「沒有被 disabled」的按鈕掛上點擊事件！
            const options = document.querySelectorAll('.route-appender-option:not([disabled])');
            options.forEach(btn => {
                btn.onclick = () => {
                    selectedTargetId = btn.getAttribute('data-card-id');
                    
                    options.forEach(b => {
                        b.style.borderColor = borderColor;
                        b.style.background = btnBg;
                        b.querySelector('.radio-circle').style.borderColor = isDarkMode ? '#666' : '#CCC';
                        b.querySelector('.radio-dot').style.background = 'transparent';
                    });

                    btn.style.borderColor = isDarkMode ? '#FFFFFF' : '#000000';
                    btn.style.background = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)';
                    const activeColor = isDarkMode ? '#FFFFFF' : '#000000';
                    btn.querySelector('.radio-circle').style.borderColor = activeColor;
                    btn.querySelector('.radio-dot').style.background = activeColor;

                    if (confirmBtn) {
                        confirmBtn.disabled = false;
                        confirmBtn.style.opacity = '1';
                        confirmBtn.style.pointerEvents = 'auto';
                    }
                };
            });
        }, 50);

        confirmPromise.then(isConfirmed => {
            if (isConfirmed && selectedTargetId) {
                this.appendRouteToCard(newRoute, selectedTargetId);
            }
        });
    },

    // 3. 核心資料庫寫入與畫面刷新邏輯
    appendRouteToCard: async function(newRoute, targetCardId) {
        const targetCard = window.appRailwayData.find(c => c.id === targetCardId);
        if (!targetCard) return;

        if (!targetCard.targetLineIds) targetCard.targetLineIds = [];
        if (!targetCard.detailedLines) targetCard.detailedLines = [];

        // 雖然介面已經防呆，雙重保險還是留著
        if (targetCard.targetLineIds.includes(newRoute.id)) return;

        // 1. 將路線資料推入記憶體陣列
        targetCard.targetLineIds.push(newRoute.id);
        targetCard.detailedLines.push({
            id: newRoute.id,
            name: newRoute.name,
            company: newRoute.company || "不明"
        });

        // 2. 順便徹底關閉原本畫面上龐大的搜尋列與虛擬鍵盤
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.blur();
        const cancelBtn = document.querySelector('.cancel-circle-btn');
        if (cancelBtn) cancelBtn.click(); 

        try {
            // 3. 寫入 IndexedDB
            await updateCardRoutes(targetCardId, targetCard.targetLineIds);

            // 4. 無縫重繪畫面
            if (window.refreshAppAfterEdit) {
                await window.refreshAppAfterEdit();
            } else if (window.triggerBackgroundUpdate) {
                window.triggerBackgroundUpdate();
            }
            
            if (window.navigator.vibrate) window.navigator.vibrate(20);
            
        } catch (err) {
            console.error("[Route Appender] 儲存失敗", err);
            if (window.iosConfirm) {
                window.iosConfirm('エラー', '保存に失敗しました。', 'OK', null);
            }
        }
    }
};