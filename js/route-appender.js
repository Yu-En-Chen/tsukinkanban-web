// ==========================================
// 獨立系統：路線追加引擎 (Route Appender)
// ==========================================

window.RouteAppender = {
    selectedTargetId: null, // 記錄目前被選中的卡片 ID

    // 1. 啟動入口：傳入要被加入的路線資料
    openPicker: function(newRoute) {
        if (!newRoute || !newRoute.id) {
            console.error("[Route Appender] 缺少有效路線資料");
            return;
        }

        // ✨ 精準抓取：只抓取首頁目前的實體卡片 (排除搜尋暫存卡與底部固定列)，最多 5 張
        const homeCards = (window.appRailwayData || []).filter(c => 
            !c.isTemporarySearch && 
            c.id !== 'fixed-bottom' &&
            c.id !== 'search-temp'
        ).slice(0, 5);

        if (homeCards.length === 0) {
            alert("首頁目前沒有可供加入的卡片！\n請先使用「新規カード作成」建立一張。");
            return;
        }

        this.selectedTargetId = null; // 重置選擇狀態
        this.renderDialog(newRoute, homeCards);
    },

    // 2. 動態渲染通知視窗模組 (Dialog Modal)
    renderDialog: function(newRoute, homeCards) {
        this.closeModal(); // 清除舊的視窗

        // 建立背景遮罩
        const overlay = document.createElement('div');
        overlay.id = 'route-appender-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        // 建立置中對話框本體 (模擬 Native 系統通知視窗)
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            width: 85%; max-width: 340px; background: #1C1C1E; 
            border-radius: 18px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            display: flex; flex-direction: column; overflow: hidden;
            transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        // 標題區
        const header = document.createElement('div');
        header.style.cssText = "padding: 24px 20px 15px 20px; text-align: center;";
        header.innerHTML = `
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600; color: #FFF;">路線を追加</h3>
            <p style="margin: 8px 0 0 0; font-size: 0.85rem; color: #8E8E93; line-height: 1.4;">
                「${newRoute.name}」を追加する<br>カードを選択してください
            </p>
        `;

        // 選項列表區
        const listContainer = document.createElement('div');
        listContainer.style.cssText = "padding: 0 20px 10px 20px; max-height: 40vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;";

        const optionButtons = [];

        // 產生選項按鈕
        homeCards.forEach(card => {
            const btn = document.createElement('button');
            
            // UI 設計：帶有單選圈圈 (Radio Button) 的按鈕，並顯示自定義的 card.name
            btn.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; pointer-events: none;">
                    <div class="radio-circle" style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid #555; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                        <div class="radio-dot" style="width: 10px; height: 10px; border-radius: 50%; background: transparent; transition: all 0.2s;"></div>
                    </div>
                    <span style="font-weight: 500; font-size: 1rem; color: #FFF; text-align: left; flex: 1;">${card.name}</span>
                    <span style="font-size: 0.75rem; color: #888;">${card.targetLineIds ? card.targetLineIds.length : 0} 路線</span>
                </div>
            `;
            btn.style.cssText = `
                width: 100%; padding: 14px 16px; background: #2C2C2E; border: 2px solid transparent;
                border-radius: 12px; cursor: pointer; transition: all 0.2s ease; outline: none;
            `;

            // 點擊選項的邏輯
            btn.onclick = () => {
                this.selectedTargetId = card.id; // 記錄被選中的卡片
                
                // 1. 重置所有按鈕的視覺狀態
                optionButtons.forEach(b => {
                    b.style.borderColor = 'transparent';
                    b.style.background = '#2C2C2E';
                    b.querySelector('.radio-circle').style.borderColor = '#555';
                    b.querySelector('.radio-dot').style.background = 'transparent';
                });
                
                // 2. 點亮目前選中的按鈕
                btn.style.borderColor = '#0A84FF';
                btn.style.background = 'rgba(10, 132, 255, 0.1)';
                btn.querySelector('.radio-circle').style.borderColor = '#0A84FF';
                btn.querySelector('.radio-dot').style.background = '#0A84FF';

                // 3. ✨ 啟用底部的「確認」按鈕
                confirmBtn.style.color = '#0A84FF';
                confirmBtn.style.fontWeight = '600';
                confirmBtn.disabled = false;
            };

            optionButtons.push(btn);
            listContainer.appendChild(btn);
        });

        // 底部按鈕區 (Apple iOS 雙按鈕風格)
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = "display: flex; border-top: 1px solid #38383A; margin-top: 10px;";

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = "キャンセル";
        cancelBtn.style.cssText = `
            flex: 1; padding: 16px; background: transparent; border: none; border-right: 1px solid #38383A;
            color: #0A84FF; font-size: 1.05rem; cursor: pointer;
        `;
        cancelBtn.onclick = () => this.closeModal();

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = "確認";
        confirmBtn.disabled = true; // 預設禁用，必須先點選選項
        confirmBtn.style.cssText = `
            flex: 1; padding: 16px; background: transparent; border: none;
            color: #555; font-size: 1.05rem; cursor: pointer; transition: color 0.2s;
        `;
        confirmBtn.onclick = () => {
            if (this.selectedTargetId) {
                this.appendRouteToCard(newRoute, this.selectedTargetId);
            }
        };

        // 組合 DOM
        btnGroup.appendChild(cancelBtn);
        btnGroup.appendChild(confirmBtn);
        dialog.appendChild(header);
        dialog.appendChild(listContainer);
        dialog.appendChild(btnGroup);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 觸發進場動畫
        void overlay.offsetWidth;
        overlay.style.opacity = '1';
        dialog.style.transform = 'scale(1)';
    },

    // 3. 核心資料合併邏輯
    appendRouteToCard: async function(newRoute, targetCardId) {
        const targetCard = window.appRailwayData.find(c => c.id === targetCardId);
        if (!targetCard) return;

        if (!targetCard.targetLineIds) targetCard.targetLineIds = [];
        if (!targetCard.detailedLines) targetCard.detailedLines = [];

        // 防呆：確認是否已經在裡面了
        if (targetCard.targetLineIds.includes(newRoute.id)) {
            alert("この路線はすでにカードに追加されています！");
            this.closeModal();
            return;
        }

        // 合併資料
        targetCard.targetLineIds.push(newRoute.id);
        targetCard.detailedLines.push({
            id: newRoute.id,
            name: newRoute.name,
            company: newRoute.company || "不明"
        });

        this.closeModal(); // 關閉視窗

        // 隱藏搜尋列
        const searchDropdown = document.getElementById('home-search-dropdown');
        if (searchDropdown) searchDropdown.style.display = 'none';

        try {
            // 儲存至資料庫
            if (window.saveCustomCardData) {
                await window.saveCustomCardData(targetCard); 
            } else if (window.saveRoutePreference) {
                await window.saveRoutePreference(targetCard.id, targetCard.name, targetCard.hex, { customName: targetCard.name });
            }

            // 觸發背景更新與畫面重繪
            if (window.triggerBackgroundUpdate) {
                window.triggerBackgroundUpdate();
            } else if (window.initApp) {
                window.initApp();
            }
        } catch (err) {
            console.error("[Route Appender] 儲存失敗", err);
        }
    },

    // 4. 關閉視窗與動畫清理
    closeModal: function() {
        const overlay = document.getElementById('route-appender-overlay');
        if (overlay) {
            const dialog = overlay.querySelector('div');
            overlay.style.opacity = '0';
            if (dialog) dialog.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
        }
    }
};