// ============================================================================
// js/dialog.js - 全域通用的 iOS 原生風格自訂對話框引擎
// ============================================================================
window.iosConfirm = function(title, message, confirmText = 'OK', cancelText = 'キャンセル', isDestructive = false) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999998;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0, 0, 0, 0.25); /* 👈 稍微調淡透明度，讓霧化效果更透澈 */
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); /* 👈 核心：加入背景全域霧化 */
            opacity: 0;
            transition: opacity 0.2s ease;
        `;

        const box = document.createElement('div');
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        box.style.cssText = `
            width: 320px; border-radius: 36px; text-align: center;
            background: ${isDarkMode ? 'rgba(35, 35, 35, 0.85)' : 'rgba(240, 240, 240, 0.9)'};
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            transform: scale(1.1); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15);
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            color: ${isDarkMode ? '#fff' : '#000'};
            border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
            display: flex; flex-direction: column;
        `;

        const confirmBg = isDestructive ? '#FF3B30' : '#007AFF';
        const confirmShadow = isDestructive ? 'rgba(255, 59, 48, 0.25)' : 'rgba(0, 122, 255, 0.25)';

        box.innerHTML = `
            <div style="padding: 20px 24px 20px;">
                <div style="font-size: 1.15rem; font-weight: 600; margin-bottom: 6px; letter-spacing: 0.5px;">${title}</div>
                <div style="font-size: 0.9rem; opacity: 0.7; line-height: 1.5; white-space: pre-wrap;">${message}</div>
            </div>
            
            <div style="display: flex; gap: 12px; padding: 0 20px 20px;">
                ${cancelText ? `
                <button id="ios-btn-cancel" style="flex: 1; padding: 12px 0; border-radius: 999px; border: none; background: rgba(120, 120, 128, 0.15); color: inherit; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: transform 0.15s, opacity 0.15s;" 
                    onmousedown="this.style.transform='scale(0.94)'; this.style.opacity='0.8'" 
                    onmouseup="this.style.transform='scale(1)'; this.style.opacity='1'" 
                    onmouseleave="this.style.transform='scale(1)'; this.style.opacity='1'">
                    ${cancelText}
                </button>` : ''}
                
                <button id="ios-btn-confirm" style="flex: 1; padding: 12px 0; border-radius: 999px; border: none; background: ${confirmBg}; color: #FFF; font-size: 0.95rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px ${confirmShadow}; transition: transform 0.15s, opacity 0.15s;" 
                    onmousedown="this.style.transform='scale(0.94)'; this.style.opacity='0.8'" 
                    onmouseup="this.style.transform='scale(1)'; this.style.opacity='1'" 
                    onmouseleave="this.style.transform='scale(1)'; this.style.opacity='1'">
                    ${confirmText}
                </button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'scale(1)';
        });

        const closeDialog = (result) => {
            overlay.style.opacity = '0';
            box.style.transform = 'scale(0.95)';
            setTimeout(() => overlay.remove(), 200);
            resolve(result); 
        };

        const btnConfirm = box.querySelector('#ios-btn-confirm');
        const btnCancel = box.querySelector('#ios-btn-cancel');

        btnConfirm.addEventListener('click', () => closeDialog(true));
        if (btnCancel) btnCancel.addEventListener('click', () => closeDialog(false));
    });
};

// ============================================================================
// 新增：iOS 原生風格 Action Sheet (底部動作選單) - 支援無限數量的垂直按鈕
// ============================================================================
window.iosActionSheet = function(title, message, buttons, cancelText = 'キャンセル') {
    return new Promise((resolve) => {
        // 1. 建立背景遮罩
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999998;
            display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
            background: rgba(0, 0, 0, 0.25); /* 👈 稍微調淡透明度 */
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); /* 👈 核心：加入背景全域霧化 */
            opacity: 0;
            transition: opacity 0.25s ease;
            padding: 10px;
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
        `;

        // 自動適應深色/淺色模式
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const bg = isDarkMode ? 'rgba(35, 35, 35, 0.85)' : 'rgba(240, 240, 240, 0.9)';
        const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDarkMode ? '#fff' : '#000';
        const actionColor = isDarkMode ? '#0A84FF' : '#007AFF'; // iOS 經典藍

        // 2. 建立由下往上彈出的主容器
        const container = document.createElement('div');
        container.style.cssText = `
            width: 100%; max-width: 400px;
            transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15);
            display: flex; flex-direction: column; gap: 8px;
        `;

        // 3. 上半部區塊：包含標題、說明、與所有選項按鈕
        const mainBlock = document.createElement('div');
        mainBlock.style.cssText = `
            border-radius: 32px; background: ${bg};
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            display: flex; flex-direction: column; overflow: hidden;
        `;

        let html = '';
        // 渲染標題區
        if (title || message) {
            html += `
                <div style="padding: 14px 16px; text-align: center; border-bottom: 1px solid ${borderColor};">
                    ${title ? `<div style="font-size: 0.85rem; font-weight: 600; color: rgba(${isDarkMode?'255,255,255':'0,0,0'}, 0.5); margin-bottom: 4px;">${title}</div>` : ''}
                    ${message ? `<div style="font-size: 0.85rem; color: rgba(${isDarkMode?'255,255,255':'0,0,0'}, 0.5);">${message}</div>` : ''}
                </div>
            `;
        }

        // 渲染所有垂直按鈕
        buttons.forEach((btn, index) => {
            html += `
                <button class="ios-action-btn" data-value="${btn.value}" style="
                    width: 100%; padding: 16px; border: none; background: transparent;
                    color: ${actionColor}; font-size: 1.25rem; font-weight: 400;
                    border-bottom: ${index < buttons.length - 1 ? `1px solid ${borderColor}` : 'none'};
                    cursor: pointer; transition: background 0.15s;
                " onmousedown="this.style.backgroundColor='rgba(0,0,0,0.1)'" onmouseup="this.style.backgroundColor='transparent'" onmouseleave="this.style.backgroundColor='transparent'">
                    ${btn.text}
                </button>
            `;
        });
        mainBlock.innerHTML = html;

        // 4. 下半部區塊：獨立的取消按鈕 (字體加粗)
        const cancelBlock = document.createElement('div');
        cancelBlock.style.cssText = `
            border-radius: 999px; background: ${bg};
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        `;
        cancelBlock.innerHTML = `
            <button id="ios-action-cancel" style="
                width: 100%; padding: 16px; border: none; background: transparent;
                color: ${actionColor}; font-size: 1.25rem; font-weight: 600;
                cursor: pointer; border-radius: 999px; transition: background 0.15s;
            " onmousedown="this.style.backgroundColor='rgba(0,0,0,0.1)'" onmouseup="this.style.backgroundColor='transparent'" onmouseleave="this.style.backgroundColor='transparent'">
                ${cancelText}
            </button>
        `;

        // 將區塊組裝進畫面
        container.appendChild(mainBlock);
        container.appendChild(cancelBlock);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // 觸發彈出動畫
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });

        // 關閉邏輯
        const closeDialog = (result) => {
            overlay.style.opacity = '0';
            container.style.transform = 'translateY(100%)';
            setTimeout(() => overlay.remove(), 300);
            resolve(result); // 回傳點擊的值 (如果是取消則回傳 null)
        };

        // 事件綁定：點擊背景遮罩取消
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog(null);
        });

        // 事件綁定：點擊獨立取消按鈕
        cancelBlock.querySelector('#ios-action-cancel').addEventListener('click', () => closeDialog(null));

        // 事件綁定：點擊各別選項
        const actionBtns = mainBlock.querySelectorAll('.ios-action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                closeDialog(e.target.getAttribute('data-value'));
            });
        });
    });
};