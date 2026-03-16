// ============================================================================
// js/dialog.js - 全域通用的 iOS 原生風格自訂對話框引擎
// ============================================================================
window.iosConfirm = function(title, message, confirmText = 'OK', cancelText = 'キャンセル', isDestructive = false) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999998;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0, 0, 0, 0.4); opacity: 0;
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