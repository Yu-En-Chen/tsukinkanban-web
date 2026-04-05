// ==========================================
// 獨立系統：路線追加引擎 (Route Appender)
// 負責處理「既存カード追加」的 UI 與資料合併邏輯
// ==========================================

window.RouteAppender = {
    // 1. 啟動入口：傳入要被加入的路線資料
    openPicker: function(newRoute) {
        if (!newRoute || !newRoute.id) {
            console.error("[Route Appender] 缺少有效路線資料");
            return;
        }

        // 尋找目前主畫面上所有的「自訂卡片」或是「可容納多路線的群組卡片」
        // (這裡假設你的客製化卡片有 isCustom 或類似標記，請依據你的真實資料結構微調)
        const availableCards = window.appRailwayData.filter(card => card.isCustom === true);

        if (availableCards.length === 0) {
            alert("目前主畫面上沒有可供加入的群組或自訂卡片！\n請先使用「新規カード作成」建立一張。");
            return;
        }

        this.renderModal(newRoute, availableCards);
    },

    // 2. 動態渲染選擇面板 (Native-like UI)
    renderModal: function(newRoute, availableCards) {
        // 若已有舊面板則先移除
        this.closeModal();

        // 建立背景遮罩
        const overlay = document.createElement('div');
        overlay.id = 'route-appender-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.4); backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            z-index: 9999; display: flex; align-items: flex-end; justify-content: center;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        // 建立底部面板 (Bottom Sheet)
        const panel = document.createElement('div');
        panel.style.cssText = `
            width: 100%; max-width: 500px; background: var(--bg-color, #1C1C1E);
            border-radius: 20px 20px 0 0; padding: 24px; padding-bottom: calc(24px + env(safe-area-inset-bottom));
            transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
            box-shadow: 0 -10px 40px rgba(0,0,0,0.3); color: #FFF;
        `;

        // 標題區
        const header = document.createElement('div');
        header.style.cssText = "margin-bottom: 20px; text-align: center;";
        header.innerHTML = `
            <div style="width: 40px; height: 5px; background: #444; border-radius: 3px; margin: 0 auto 15px auto;"></div>
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600;">「${newRoute.name}」を追加</h3>
            <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #888;">追加先のカードを選択してください</p>
        `;

        // 卡片列表區
        const listContainer = document.createElement('div');
        listContainer.style.cssText = "max-height: 50vh; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;";

        availableCards.forEach(card => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                width: 100%; padding: 16px; background: #2C2C2E; border: 1px solid #3A3A3C;
                border-radius: 12px; color: #FFF; text-align: left; font-size: 1rem;
                display: flex; align-items: center; justify-content: space-between;
                cursor: pointer; transition: background 0.2s ease;
            `;
            btn.innerHTML = `
                <span style="font-weight: 500; pointer-events: none;">${card.name}</span>
                <span style="font-size: 0.8rem; color: #888; background: #1C1C1E; padding: 4px 8px; border-radius: 10px; pointer-events: none;">
                    ${card.targetLineIds ? card.targetLineIds.length : 0} 路線
                </span>
            `;

            // 按下按鈕的觸覺回饋與事件綁定
            btn.addEventListener('touchstart', () => btn.style.background = '#3A3A3C');
            btn.addEventListener('touchend', () => btn.style.background = '#2C2C2E');
            
            btn.addEventListener('click', () => {
                this.appendRouteToCard(newRoute, card.id);
            });

            listContainer.appendChild(btn);
        });

        // 關閉按鈕
        const cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = `
            width: 100%; padding: 16px; margin-top: 20px; background: transparent; 
            border: none; color: #0A84FF; font-size: 1.05rem; font-weight: 600; cursor: pointer;
        `;
        cancelBtn.textContent = "キャンセル";
        cancelBtn.addEventListener('click', () => this.closeModal());

        // 組合 DOM
        panel.appendChild(header);
        panel.appendChild(listContainer);
        panel.appendChild(cancelBtn);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // 觸發進場動畫 (強制 Reflow 後加上 opacity 與 transform)
        void overlay.offsetWidth;
        overlay.style.opacity = '1';
        panel.style.transform = 'translateY(0)';

        // 點擊背景關閉
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeModal();
        });
    },

    // 3. 核心資料合併邏輯
    appendRouteToCard: async function(newRoute, targetCardId) {
        const targetCard = window.appRailwayData.find(c => c.id === targetCardId);
        if (!targetCard) return;

        // 防呆：確認這條線是否已經在卡片裡了？
        // (請依照你實際儲存多路線的欄位名稱修改，這裡以 targetLineIds 與 detailedLines 為例)
        if (!targetCard.targetLineIds) targetCard.targetLineIds = [];
        if (!targetCard.detailedLines) targetCard.detailedLines = [];

        if (targetCard.targetLineIds.includes(newRoute.id)) {
            alert("この路線はすでにカードに追加されています！");
            this.closeModal();
            return;
        }

        // 進行資料合併
        targetCard.targetLineIds.push(newRoute.id);
        targetCard.detailedLines.push({
            id: newRoute.id,
            name: newRoute.name,
            company: newRoute.company || "不明"
        });

        console.log(`[Route Appender] 成功將 ${newRoute.name} 加入至卡片 ${targetCard.name}`);

        // 關閉面板
        this.closeModal();

        // 收起原本的搜尋列 (清空搜尋畫面)
        const searchDropdown = document.getElementById('home-search-dropdown');
        if (searchDropdown) searchDropdown.style.display = 'none';

        // 💡 呼叫你的儲存 API 並刷新畫面
        // 假設你的系統有寫好的儲存與重繪函式：
        try {
            // (請替換成你實際寫入 IndexedDB / localStorage 的儲存指令)
            if (window.saveCustomCardData) {
                await window.saveCustomCardData(targetCard); 
            } else if (window.saveRoutePreference) {
                // 如果你是用舊的單一路線儲存方式
                await window.saveRoutePreference(targetCard.id, targetCard.name, targetCard.hex, { customName: targetCard.name });
            }

            // 強制畫面重新渲染，顯示新路線
            if (window.triggerBackgroundUpdate) {
                window.triggerBackgroundUpdate();
            } else if (window.initApp) {
                window.initApp();
            }

            alert("✅ 追加完了しました！");

        } catch (err) {
            console.error("[Route Appender] 儲存失敗", err);
            alert("儲存失敗，請稍後再試。");
        }
    },

    // 4. 關閉面板並清理 DOM
    closeModal: function() {
        const overlay = document.getElementById('route-appender-overlay');
        if (overlay) {
            const panel = overlay.querySelector('div');
            overlay.style.opacity = '0';
            if (panel) panel.style.transform = 'translateY(100%)';
            
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300); // 等待動畫結束
        }
    }
};