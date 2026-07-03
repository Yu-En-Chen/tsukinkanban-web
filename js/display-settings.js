// ============================================================================
// js/display-settings.js - 「表示設定」面板 UI 與互動控制器
// ============================================================================

// 1. 負責生成設定面板的 HTML 結構
window.getDisplaySettingsHTML = function () {
    const isDesktop = window.matchMedia('(pointer: fine)').matches;

    const ua = navigator.userAgent;
    const platform = navigator.platform || '';

    // 瀏覽器與平台偵測
    // 1. 判斷是否為 Apple 裝置 (iOS 或 Mac)
    const isApple = /(Mac|iPhone|iPod|iPad)/i.test(platform) || /(Mac|iPhone|iPod|iPad)/i.test(ua);

    // 2. 判斷是否為 Safari 本體
    // Safari 的 UA 須包含 Safari 且不含 Chrome, CriOS, Edg 等字樣
    const isSafari = isApple && /Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR|FxiOS|Firefox|Line|FBAV|FBAN|Instagram|MicroMessenger|WeChat|Threads|Twitter/i.test(ua);

    // 3. 判斷是否為 Blink 核心 (Chrome, Edge, Opera)
    const isBlink = /Chrome|CriOS|Edg|OPR/i.test(ua);

    // 4. 判斷是否為 Firefox
    const isFirefox = /Firefox|FxiOS/i.test(ua);

    // 5. 判斷環境類型
    const isWindowsOrAndroid = /(Windows|Android)/i.test(ua);

    let browserRecommendationHTML = '';

    // 依偵測結果分流
    // A. Apple 裝置卻不是用 Safari (包含 Mac Chrome, iPhone Chrome 等)
    if (isApple && !isSafari) {
        browserRecommendationHTML = `
            <div class="settings-browser-recommendation">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                <div class="recommendation-text">
                    最高のパフォーマンスと視覚効果を得るため、<br><strong>Safari</strong> ブラウザのご利用を推奨します。
                </div>
            </div>
        `;
    }
    // B. Windows/Android
    else if (isWindowsOrAndroid) {
        // UserAgentをチェックして、AndroidかWindowsかを動的に判定する
        const isAndroidDevice = /Android/i.test(navigator.userAgent);
        const deviceName = isAndroidDevice ? 'Android' : 'Windows';

        browserRecommendationHTML = `
        <div class="settings-browser-recommendation">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <div class="recommendation-text">
                最高の視覚効果と物理アニメーションは、<strong>iOS の Safari</strong> に最適化されています。
                <br>
                ${deviceName} 端末では、一部の視覚効果が制限されます。
            </div>
        </div>
    `;
    }

    // 讀取目前的效能模式狀態
    const isLiteMode = localStorage.getItem('tsukin_lite_mode') === 'true';

    // 判斷是否需要強制鎖定 (非蘋果設備)
    const isLocked = !isApple;

    return `
    <div class="settings-container">
        <p class="settings-description">アプリの動作や視覚効果をカスタマイズできます。</p>
        
        ${browserRecommendationHTML}

        <div class="settings-group">
            <div class="settings-row" style="height: 60px; padding-top: 0; padding-bottom: 0;">
                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <span class="settings-label">描画モード</span>
                </div>
                
                <div class="segmented-control" id="render-mode-control" style="${isLocked ? 'opacity: 0.6; pointer-events: none;' : ''}">
                    <div class="seg-bg" style="transform: translateX(${isLiteMode ? '100%' : '0'});"></div>
                    <button class="seg-btn ${!isLiteMode ? 'active' : ''}" data-val="performance">品質</button>
                    <button class="seg-btn ${isLiteMode ? 'active' : ''}" data-val="quality">軽量</button>
                </div>
            </div>
        </div>

        ${isDesktop ? `
        <div class="settings-group">
            <div class="settings-row" style="height: 60px; padding-top: 0; padding-bottom: 0;">
                <span class="settings-label">システムカーソルを使用</span>
                <label class="ios-switch">
                    <input type="checkbox" id="setting-default-cursor">
                    <span class="slider"></span>
                </label>
            </div>
        </div>
        ` : ''}

        <div style="height: 40px; flex-shrink: 0; width: 100%; pointer-events: none;"></div>

        <div class="settings-group">
            <div class="settings-row clickable-row" id="row-export-all">
                <span class="settings-label">設定をエクスポート</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
            </div>
            
            <div class="settings-row clickable-row" id="row-import-all">
                <span class="settings-label">設定をインポート</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
            </div>
        </div>

    </div>
    `;
};

// 2. 負責綁定面板內的微互動、拖曳與點擊事件
window.initDisplaySettingsEvents = function () {
    const segControl = document.getElementById('render-mode-control');
    const segBtns = document.querySelectorAll('#render-mode-control .seg-btn');
    const segBg = document.querySelector('#render-mode-control .seg-bg');

    // ==========================================
    // 初始化：
    // 綁定事件前先讀取儲存值，讓內部 index 與畫面一致
    // ==========================================
    const isAppleDevice = /Macintosh|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // localStorage 為 true (輕量模式) 時 activeIndex 設為 1，否則為 0
    let activeIndex = localStorage.getItem('tsukin_lite_mode') === 'true' ? 1 : 0;

    let startX = 0;
    let currentTranslate = 0;
    let bgWidth = 0;
    let hasMoved = false;

    // ==========================================
    // 模式切換（寫入儲存並更新畫面）
    // ==========================================
    function setSegment(index) {
        // 第二層防護：
        // HTML 已將非蘋果裝置的品質按鈕淡化，
        // 這裡再擋一次：非蘋果裝置禁止切換到品質模式 (index 0)
        if (!isAppleDevice && index === 0) return;

        // 1. 更新按鈕文字顏色
        activeIndex = index;
        segBtns.forEach(b => b.classList.remove('active'));
        segBtns[index].classList.add('active');

        // 滑塊動畫
        segBg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15)';

        // 寫入儲存並套用畫面效果
        if (index === 0) {
            // 選擇「品質」模式
            segBg.style.transform = 'translateX(0)';
            localStorage.setItem('tsukin_lite_mode', 'false');

            // 移除降級 class，恢復毛玻璃特效
            document.documentElement.classList.remove('is-android-fallback');
            console.log('描画モード：品質 (高階視覺開啟)');

        } else {
            // 選擇「軽量」模式
            segBg.style.transform = 'translateX(100%)';
            localStorage.setItem('tsukin_lite_mode', 'true');

            // 加上降級 class，改用實心背景以提升效能
            document.documentElement.classList.add('is-android-fallback');
            console.log('描画モード：軽量 (效能模式開啟)');
        }

        // 震動回饋
        if (window.navigator.vibrate) window.navigator.vibrate(10);
    }

    // A. 點擊事件（拖曳時不觸發）
    segBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            if (hasMoved) return; // 只有在確認是拖曳時才擋下點擊
            setSegment(index);
        });
    });

    // B. 拖曳 (Swipe) 切換
    if (segControl && segBg) {
        segControl.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            bgWidth = segBg.offsetWidth;
            currentTranslate = activeIndex === 0 ? 0 : bgWidth;
            hasMoved = false; // 每次觸碰時重置

            // 拖曳期間移除過渡動畫，讓滑塊跟隨手指
            segBg.style.transition = 'none';
        }, { passive: true });

        segControl.addEventListener('touchmove', (e) => {
            const deltaX = e.touches[0].clientX - startX;

            // 移動超過 3px 才視為拖曳，過濾點擊時的手震
            if (Math.abs(deltaX) > 3) {
                hasMoved = true;
            }

            // 未超過 3px 時不移動滑塊
            if (!hasMoved) return;

            let newTranslate = currentTranslate + deltaX;
            if (newTranslate < 0) newTranslate = 0;
            if (newTranslate > bgWidth) newTranslate = bgWidth;

            segBg.style.transform = `translateX(${newTranslate}px)`;
        }, { passive: true });

        segControl.addEventListener('touchend', () => {
            if (!hasMoved) {
                // 判定為點擊：恢復動畫，切換交給 click 事件
                segBg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
                return;
            }

            // 拖曳放開：吸附到最近的選項
            const match = segBg.style.transform.match(/translateX\(([-\d.]+)px\)/);
            if (match) {
                const finalTranslate = parseFloat(match[1]);
                if (finalTranslate > bgWidth / 2) setSegment(1);
                else setSegment(0);
            } else {
                setSegment(activeIndex);
            }

            // 延遲 50ms 解除狀態，避免緊接的 click 事件誤觸發
            setTimeout(() => { hasMoved = false; }, 50);
        });
        // ==========================================
        // 資料備份（匯出／匯入）按鈕
        // ==========================================
        const rowExport = document.getElementById('row-export-all');
        const rowImport = document.getElementById('row-import-all');

        if (rowExport) {
            rowExport.addEventListener('click', async () => {
                if (window.navigator.vibrate) window.navigator.vibrate(10);

                try {
                    // 1. 開啟 Action Sheet 前先準備好要複製的字串
                    const db = await import('../data/db.js');
                    const allDataStr = await db.getExportDataString();
                    const colorsStr = await db.getExportColorsString();

                    // 2. 同步執行的複製 callback
                    const copyToClipboardSync = (text) => {
                        if (navigator.clipboard) {
                            // 在點擊事件內同步執行，Safari 才允許寫入剪貼簿
                            navigator.clipboard.writeText(text).catch(err => console.error("Clipboard Error:", err));
                        }
                    };

                    // 3. 開啟底部選單
                    const exportChoice = await window.iosActionSheet(
                        'エクスポート',
                        'どのデータをエクスポートしますか？',
                        [
                            {
                                text: 'すべての設定をエクスポート',
                                value: 'all',
                                action: () => copyToClipboardSync(allDataStr)
                            },
                            {
                                text: 'カラーテーマのみエクスポート',
                                value: 'colors',
                                action: () => copyToClipboardSync(colorsStr)
                            }
                        ],
                        'キャンセル'
                    );

                    if (!exportChoice) return;

                    // 4. 顯示成功對話框
                    if (exportChoice === 'all') {
                        await window.iosConfirm('エクスポート完了', 'すべての設定をクリップボードにコピーしました！', 'OK', null);
                    } else if (exportChoice === 'colors') {
                        await window.iosConfirm('エクスポート完了', 'カラーテーマをクリップボードにコピーしました！\n友達にシェアしてみましょう。', 'OK', null);
                    }

                } catch (err) {
                    console.error('[Export Error]', err);
                    await window.iosConfirm('エラー', err.message || 'エクスポートに失敗しました。', 'OK', null);
                }
            });
        }

        if (rowImport) {
            rowImport.addEventListener('click', async () => {
                // 1. 震動回饋
                if (window.navigator.vibrate) window.navigator.vibrate(10);

                try {
                    // 2. 取得剪貼簿內容
                    const jsonString = await navigator.clipboard.readText();

                    if (!jsonString || jsonString.trim() === '') {
                        throw new Error("クリップボードにデータが見つかりません。");
                    }

                    // 3. 資料格式預檢
                    let parsedData;
                    try {
                        parsedData = JSON.parse(jsonString);
                    } catch (e) {
                        throw new Error("フォーマットエラー：有効なデータではありません。");
                    }

                    if (!Array.isArray(parsedData) || parsedData.length === 0) {
                        throw new Error("フォーマットエラー：有効な配列データではありません。");
                    }

                    // 判斷資料類型：純色票 (字串陣列) 或完整設定 (物件陣列)
                    const isColorOnly = typeof parsedData[0] === 'string';
                    const isFullData = typeof parsedData[0] === 'object' && parsedData[0] !== null;

                    if (!isColorOnly && !isFullData) {
                        throw new Error("サポートされていないデータ形式です。");
                    }

                    // 4. 動態載入資料庫模組
                    const db = await import('../data/db.js');
                    let importMode = null;

                    // ==========================================
                    // 流程 A：純色票
                    // ==========================================
                    if (isColorOnly) {
                        const confirmApply = await window.iosConfirm(
                            'カラーテーマの適用',
                            'クリップボードからカラーテーマを検知しました。\n現在のカードに適用しますか？',
                            '適用する',
                            'キャンセル',
                            false // 一般操作
                        );
                        if (!confirmApply) return;
                        importMode = 'colors_only_data';
                    }
                    // ==========================================
                    // 流程 B：完整設定
                    // ==========================================
                    else if (isFullData) {
                        const importChoice = await window.iosActionSheet(
                            'バックアップデータの検出',
                            'クリップボードから完全な設定データを検知しました。\nどのように適用しますか？',
                            [
                                { text: 'すべての設定を上書き復元', value: 'all' },
                                { text: 'カラーテーマのみ抽出して適用', value: 'extract_colors' }
                            ],
                            'キャンセル'
                        );

                        if (!importChoice) return;

                        // 完全覆寫屬破壞性操作，需二次確認
                        if (importChoice === 'all') {
                            const isConfirmed = await window.iosConfirm(
                                '最終確認',
                                'この操作は現在の設定を完全に上書きします。元の状態に戻すことはできません。\n\n本当に続行しますか？',
                                '実行する',
                                'キャンセル',
                                true // 破壞性操作：紅色按鈕
                            );
                            if (!isConfirmed) return;
                            importMode = 'full_overwrite';
                        } else {
                            importMode = 'extract_colors';
                        }
                    }

                    // 5. 執行對應的匯入邏輯
                    if (importMode === 'colors_only_data') {
                        // 傳入字串陣列
                        await db.importColorsOnly(jsonString);
                    }
                    else if (importMode === 'full_overwrite') {
                        // 傳入物件陣列，整組覆寫重建
                        await db.importDataAndOverwrite(jsonString);
                    }
                    else if (importMode === 'extract_colors') {
                        // 從完整資料中抽出色碼，組成純色票陣列後交給 importColorsOnly
                        const extractedColors = parsedData.map(item => item.hex || '');
                        const colorJsonString = JSON.stringify(extractedColors);
                        await db.importColorsOnly(colorJsonString);
                    }

                    // 6. 成功提示與頁面重載
                    await window.iosConfirm(
                        'インポート成功',
                        'データが正常に反映されました。設定を有効にするため、アプリを再起動します。',
                        'OK',
                        null
                    );

                    window.location.reload();

                } catch (err) {
                    console.error('[Import Error]', err);
                    await window.iosConfirm(
                        'エラー',
                        err.message || '予期せぬエラーが発生しました。',
                        'OK',
                        null
                    );
                }
            });
        }

        // 注入按鈕樣式（與切換器一致）
        if (!document.getElementById('clickable-row-style')) {
            const style = document.createElement('style');
            style.id = 'clickable-row-style';
            style.innerHTML = `
                .clickable-row {
                    cursor: pointer;
                    transition: background-color 0.2s ease, transform 0.1s ease;
                    -webkit-tap-highlight-color: transparent;
                    user-select: none;
                }
                /* 滑鼠懸停效果 */
                .clickable-row:hover {
                    background-color: rgba(255, 255, 255, 0.05);
                }
                /* 按下時的物理縮放與變色 */
                .clickable-row:active {
                    background-color: rgba(255, 255, 255, 0.12);
                    transform: scale(0.98);
                }
                /* Icon 顏色與標籤一致 */
                .settings-icon {
                    color: rgba(255, 255, 255, 0.6);
                    transition: color 0.2s ease;
                }
                .clickable-row:active .settings-icon {
                    color: white;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // C. 設定開關（連接資料庫）
    import('../data/db-settings.js').then(dbSettings => {

        // 1. 系統游標設定（預設 false：使用自訂游標）
        const cursorSwitch = document.getElementById('setting-default-cursor');
        if (cursorSwitch && dbSettings.getDisplaySetting) {

            // 初始化：從資料庫讀取並設定開關狀態
            dbSettings.getDisplaySetting('useSystemCursor', false).then(useSystem => {
                cursorSwitch.checked = useSystem;
            });

            // 變更時寫入資料庫並即時切換游標
            cursorSwitch.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                dbSettings.saveDisplaySetting('useSystemCursor', isChecked);

                // 立即套用視覺效果
                if (isChecked) {
                    document.body.classList.add('use-system-cursor');
                } else {
                    document.body.classList.remove('use-system-cursor');
                }

                console.log(`設定 [系統鼠標] 切換為：`, isChecked ? '開啟 (隱藏自訂)' : '關閉 (顯示自訂)');
                if (window.navigator.vibrate) window.navigator.vibrate(5);
            });
        }

        // 2. 提高狀態符號對比度
        const highContrastSwitch = document.getElementById('setting-high-contrast-icons');
        if (highContrastSwitch && dbSettings.getDisplaySetting) {
            dbSettings.getDisplaySetting('highContrastIcons', false).then(isHighContrast => {
                highContrastSwitch.checked = isHighContrast;
                if (isHighContrast) document.body.classList.add('high-contrast-icons');
            });

            highContrastSwitch.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                dbSettings.saveDisplaySetting('highContrastIcons', isChecked);

                // 立即套用 class
                document.body.classList.toggle('high-contrast-icons', isChecked);

                console.log(`設定 [提高狀態符號對比度] 切換為：`, isChecked);
                if (window.navigator.vibrate) window.navigator.vibrate(5);
            });
        }

        // 3. 其他開關（預留擴充）
        const otherSwitches = ['reduce-motion', 'reduce-blur', 'disable-gradient'];
        otherSwitches.forEach(id => {
            const el = document.getElementById(`setting-${id}`);
            if (el) {
                el.addEventListener('change', (e) => {
                    console.log(`設定 [${id}] 狀態改變：`, e.target.checked);
                    if (window.navigator.vibrate) window.navigator.vibrate(5);
                });
            }
        });
    });
};