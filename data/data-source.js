export const dataSourceContent = `
    <div style="opacity: 0.85; line-height: 1.7;">
        <p>当サイトの交通データは、公共交通オープンデータ協議会（以下「ODPT」）より提供されています。</p>
        <p><a href="https://www.odpt.org/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 500;">https://www.odpt.org/</a></p>
        <br>
        <p>ODPTデータの配信および処理プロセスの詳細につきましては、以下の公式ページをご参照ください：</p>
        <p><a href="https://www.odpt.org/overview/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 500;">https://www.odpt.org/overview/</a></p>
        <br>
        <style>
            /* 1. 魔法機關：隱藏的 Checkbox */
            #ios-accordion-toggle {
                display: none;
            }

            /* 2. 箭頭動畫：支援開與關的物理曲線 */
            .ios-accordion-icon {
                transition: transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
                opacity: 0.5;
                will-change: transform;
            }
            
            /* 當 Checkbox 被勾選時，箭頭旋轉 */
            #ios-accordion-toggle:checked + .ios-accordion-summary .ios-accordion-icon {
                transform: rotate(180deg);
            }

            /* 3. Grid 高度魔法 (現在收合時也不會被強制中斷了！) */
            .ios-accordion-content-wrapper {
                display: grid;
                grid-template-rows: 0fr;
                transition: grid-template-rows 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            #ios-accordion-toggle:checked ~ .ios-accordion-content-wrapper {
                grid-template-rows: 1fr;
            }

            /* 4. 內部內容的淡入淡出與微位移 */
            .ios-accordion-content-inner {
                overflow: hidden;
                opacity: 0;
                transition: opacity 0.3s ease-out, transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
                transform: translateY(-10px);
            }

            #ios-accordion-toggle:checked ~ .ios-accordion-content-wrapper .ios-accordion-content-inner {
                opacity: 1;
                transform: translateY(0);
            }
        </style>
        
        <div style="margin-bottom: 24px; padding: 14px 16px; background: var(--bg-secondary, rgba(120, 120, 128, 0.08)); border-radius: 12px; border: 1px solid var(--border-color, rgba(120, 120, 128, 0.2));">
            
            <input type="checkbox" id="ios-accordion-toggle">
            
            <label for="ios-accordion-toggle" class="ios-accordion-summary" style="font-weight: 600; color: var(--text-main); cursor: pointer; outline: none; display: flex; justify-content: space-between; align-items: center; margin: 0; -webkit-tap-highlight-color: transparent;">
                対応路線リスト
                <svg class="ios-accordion-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </label>
            
            <div class="ios-accordion-content-wrapper">
                <div class="ios-accordion-content-inner">
                    
                    <div style="margin-top: 14px;">
                        <br>
                        <div style="margin-bottom: 18px;">
                            <p style="color: var(--text-main); font-weight: 600; margin: 0 0 6px 0;">完全対応（遅延分数あり）</p>
                            <ul style="color: var(--text-secondary); margin: 0; padding-left: 20px; line-height: 1.6;">
                                <li>東京都交通局
                                （都営浅草線、都営三田線、都営新宿線、都営大江戸線、都電荒川線）</li>
                                <li>横浜市交通局
                                （横浜ブルーライン、横浜グリーンライン）</li>
                                <li>日本航空</li>
                                <li>全日空</li>
                            </ul>
                        </div>
                        <br>
                        <div style="margin-bottom: 18px;">
                            <p style="color: var(--text-main); font-weight: 600; margin: 0 0 4px 0;">一部対応（公式テキストのみ）</p>
                            <p style="color: var(--text-secondary); margin: 0 0 6px 0; font-size: 0.8em;">遅延分数は取得できず、各社の発表テキストに依存します。</p>
                            <ul style="color: var(--text-secondary); margin: 0; padding-left: 20px; line-height: 1.6;">
                                <li>東京メトロ（半蔵門線、副都心線、南北線、千代田線、東西線、日比谷線、丸ノ内線、銀座線、有楽町線）</li>
                                <li>東京都交通局（日暮里・舎人ライナー）</li>
                                <li>首都圏新都市鉄道（つくばエクスプレス）</li>
                                <li>東京臨海高速鉄道（りんかい線）</li>
                                <li>多摩都市モノレール（多摩モノレール）</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>
        </div>
        <div style="padding: 12px 16px; background: rgba(120, 120, 128, 0.08); border-radius: 12px;">
            <p style="font-weight: 600; font-size: 0.95em; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
            </svg>
            お問い合わせについてのお願い
            </p>
            <p style="font-size: 0.9em; opacity: 0.9;">本サービスは個人が開発・運営する非公式のサードパーティアプリであり、ODPT（公共交通オープンデータ協議会）および各鉄道・交通事業者とは<strong>一切関係がありません</strong>。当サイトの機能や表示、データに関するご質問・ご指摘は、ODPTや各交通事業者ではなく、必ず当サイトの開発者まで直接ご連絡ください。<br><br>
            連絡先：<a href="mailto:testtest@test.com" style="color: inherit; text-decoration: underline; font-weight: 500;">testtest@test.com</a></p>
        </div>
        <br>
        <p style="color: var(--text-main); font-weight: 600; margin-bottom: 4px;">UI アイコン（SVG）</p>
        <p style="font-size: 0.95em; opacity: 0.9;">当サイトのインターフェースには、美しくオープンソースなアイコンライブラリ「Lucide Icons」を使用しています。</p>
        <p><a href="https://lucide.dev/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 500;">https://lucide.dev/</a></p>
        <br>
    </div>
`;