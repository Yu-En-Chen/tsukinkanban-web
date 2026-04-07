export const dataSourceContent = `
    <div style="opacity: 0.85; line-height: 1.7;">
        <p>当サイトの交通データは、公共交通オープンデータ協議会（以下「ODPT」）より提供されています。</p>
        <p><a href="https://www.odpt.org/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 500;">https://www.odpt.org/</a></p>
        <br>
        <p>ODPTデータの配信および処理プロセスの詳細につきましては、以下の公式ページをご参照ください：</p>
        <p><a href="https://www.odpt.org/overview/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 500;">https://www.odpt.org/overview/</a></p>
        <br>
        <style>
            /* 隱藏原生的醜陋三角形 */
            .ios-accordion-summary { list-style: none; }
            .ios-accordion-summary::-webkit-details-marker { display: none; }
            
            /* 箭頭基礎樣式 (半透明) 與轉場動畫設定 */
            .ios-accordion-icon {
                transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
                opacity: 0.5; /* 配合其他副標題的透明度 */
            }
            
            /* 當 details 展開時，自動將裡面的箭頭旋轉 180 度 */
            details[open] .ios-accordion-icon {
                transform: rotate(180deg);
            }
        </style>
        
        <details style="margin-bottom: 24px; padding: 14px 16px; background: var(--bg-secondary, rgba(120, 120, 128, 0.08)); border-radius: 12px; border: 1px solid var(--border-color, rgba(120, 120, 128, 0.2));">
            <summary class="ios-accordion-summary" style="font-weight: 600; color: var(--text-main); cursor: pointer; outline: none; display: flex; justify-content: space-between; align-items: center;">
                対応路線リスト
                <svg class="ios-accordion-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            
            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-color, rgba(120, 120, 128, 0.2));">
                
                <div style="margin-bottom: 18px;">
                    <p style="color: var(--text-main); font-weight: 600; margin: 0 0 6px 0;">完全対応（遅延分数あり）</p>
                    <ul style="color: var(--text-secondary); margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>JR東日本（山手線、中央線 など）</li>
                        <li>東京メトロ（銀座線、丸ノ内線 など）</li>
                    </ul>
                </div>

                <div style="margin-bottom: 18px;">
                    <p style="color: var(--text-main); font-weight: 600; margin: 0 0 4px 0;">一部対応（公式テキストのみ）</p>
                    <p style="color: var(--text-secondary); margin: 0 0 6px 0; font-size: 0.8em;">遅延分数は取得できず、各社の発表テキストに依存します。</p>
                    <ul style="color: var(--text-secondary); margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>西武鉄道（池袋線、新宿線 など）</li>
                        <li>京王電鉄（京王線、井の頭線 など）</li>
                    </ul>
                </div>

                <div style="margin-bottom: 4px;">
                    <p style="color: var(--text-main); font-weight: 600; margin: 0 0 4px 0;">要注意路線</p>
                    <p style="color: var(--text-secondary); margin: 0 0 6px 0; font-size: 0.8em;">重大な障害時に情報が更新されない事例が確認されています。参考程度に。</p>
                    <ul style="color: var(--text-secondary); margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>〇〇鉄道（〇〇線）</li>
                    </ul>
                </div>

            </div>
        </details>
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