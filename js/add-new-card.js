// ============================================================================
// js/add-new-card.js - 「新增卡片」專屬 UI 與邏輯控制器
// ============================================================================

// 🟢 1. 輸出表單的 HTML 模板
window.getAddNewCardHTML = function() {
    return `
        <div class="add-menu-inner" style="padding-top: 15px;">
            
            <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 20px;">
                <label style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; padding-left: 4px; opacity: 0.8; letter-spacing: 0.5px;">表示名</label>
                
                <div style="--btn-height: 48px; display: flex; gap: 10px; width: 100%; align-items: center;">
                    <div style="height: var(--btn-height); border-radius: 12px; display: flex; align-items: center; background: rgba(120, 120, 128, 0.11); flex-grow: 1; padding: 0 16px;">
                        <input id="add-new-name" type="text" placeholder="例: 通勤用" maxlength="10" autocomplete="off"
                            oninput="this.value = this.value.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)); document.getElementById('add-new-name-count').textContent = this.value.length + '/10';"
                            style="width: 100%; background: transparent; border: none; outline: none; color: inherit; font-size: 1.05rem; text-align: left;">
                    </div>
                    <button id="add-new-name-paste" onclick="window.handleAddNewPaste('name')" 
                        style="position: relative; overflow: hidden; height: var(--btn-height); width: var(--btn-height); border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(120, 120, 128, 0.11); border: none; color: inherit; cursor: pointer; flex-shrink: 0; transition: transform 0.2s, opacity 0.2s;"
                        onmousedown="this.style.transform='scale(0.9)'; this.style.opacity='0.8';" onmouseup="this.style.transform='scale(1)'; this.style.opacity='1';" onmouseleave="this.style.transform='scale(1)'; this.style.opacity='1';">
                        <div class="paste-default" style="position: absolute; transition: transform 0.4s cubic-bezier(0.34, 1.6, 0.64, 1), opacity 0.3s; display: flex;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                        </div>
                        <div class="paste-check" style="position: absolute; transform: translateY(30px); opacity: 0; transition: transform 0.4s cubic-bezier(0.34, 1.6, 0.64, 1), opacity 0.3s; display: flex;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9;"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                    </button>
                </div>
                <p style="font-size: 0.75rem; display: flex; justify-content: space-between; padding: 0 4px; margin-top: 8px; opacity: 0.5;">
                    <span>- 十文字以內 -</span>
                    <span id="add-new-name-count" style="font-family: monospace;">0/10</span>
                </p>
            </div>

            <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 24px;">
                <label style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; padding-left: 4px; opacity: 0.8; letter-spacing: 0.5px;">カラー</label>
                
                <div style="--btn-height: 48px; display: flex; gap: 10px; width: 100%; align-items: center;">
                    <div style="height: var(--btn-height); border-radius: 12px; display: flex; align-items: center; background: rgba(120, 120, 128, 0.11); flex-grow: 1; padding: 0 16px;">
                        <input id="add-new-color" type="text" placeholder="#2C2C2E" maxlength="7" autocomplete="off"
                            oninput="let v = this.value.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/＃/g, '#').toUpperCase().replace(/[^A-F0-9#]/g, ''); if(v && !v.startsWith('#')) v = '#' + v; this.value = v;"
                            style="width: 100%; background: transparent; border: none; outline: none; color: inherit; font-size: 1.05rem; font-family: monospace; text-align: left;">
                    </div>
                    <button id="add-new-color-paste" onclick="window.handleAddNewPaste('color')" 
                        style="position: relative; overflow: hidden; height: var(--btn-height); width: var(--btn-height); border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(120, 120, 128, 0.11); border: none; color: inherit; cursor: pointer; flex-shrink: 0; transition: transform 0.2s, opacity 0.2s;"
                        onmousedown="this.style.transform='scale(0.9)'; this.style.opacity='0.8';" onmouseup="this.style.transform='scale(1)'; this.style.opacity='1';" onmouseleave="this.style.transform='scale(1)'; this.style.opacity='1';">
                        <div class="paste-default" style="position: absolute; transition: transform 0.4s cubic-bezier(0.34, 1.6, 0.64, 1), opacity 0.3s; display: flex;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M11 14h10"/><path d="M16 4h2a2 2 0 0 1 2 2v1.344"/><path d="m17 18 4-4-4-4"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 1.793-1.113"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
                        </div>
                        <div class="paste-check" style="position: absolute; transform: translateY(30px); opacity: 0; transition: transform 0.4s cubic-bezier(0.34, 1.6, 0.64, 1), opacity 0.3s; display: flex;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9;"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                    </button>
                </div>
                <p style="font-size: 0.75rem; padding: 0 4px; margin-top: 8px; opacity: 0.5;">
                    - HEX形式で入力してください -
                </p>
            </div>
            
        </div>
        `;
};

// 🟢 2. 處理防呆與完美貼上動畫的引擎
window.handleAddNewPaste = function(type) {
    navigator.clipboard.readText().then(text => {
        const input = document.getElementById(`add-new-${type}`);
        const btn = document.getElementById(`add-new-${type}-paste`);
        if (!input || !btn) return;

        let val = text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
        
        if (type === 'color') {
            val = val.replace(/＃/g, '#').trim().toUpperCase().replace(/[^A-F0-9#]/g, '');
            if (val && !val.startsWith('#')) val = '#' + val;
            val = val.slice(0, 7);
        } else {
            val = val.slice(0, 10);
        }
        
        input.value = val;
        if (type === 'name') {
            const countEl = document.getElementById('add-new-name-count');
            if (countEl) countEl.textContent = val.length + '/10';
        }

        const defaultIcon = btn.querySelector('.paste-default');
        const checkIcon = btn.querySelector('.paste-check');
        
        if (defaultIcon && checkIcon) {
            defaultIcon.style.transform = 'translateY(-30px)';
            defaultIcon.style.opacity = '0';
            
            checkIcon.style.transform = 'translateY(0)';
            checkIcon.style.opacity = '1';
            
            setTimeout(() => {
                defaultIcon.style.transform = 'translateY(0)';
                defaultIcon.style.opacity = '1';
                
                checkIcon.style.transform = 'translateY(30px)';
                checkIcon.style.opacity = '0';
            }, 1500);
        }
    }).catch(err => {
        console.error('[Paste Error] 無法讀取剪貼簿:', err);
    });
};