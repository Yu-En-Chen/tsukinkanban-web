export const dataSourceContent = `
    <div style="opacity: 0.85; line-height: 1.7;">
        <p>当サイトの交通データは、公共交通オープンデータ協議会（以下「ODPT」）より提供されています。</p>
        <p><a href="https://www.odpt.org/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 500;">https://www.odpt.org/</a></p>
        <br>
        <p>ODPTデータの配信および処理プロセスの詳細につきましては、以下の公式ページをご参照ください：</p>
        <p><a href="https://www.odpt.org/overview/" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 500;">https://www.odpt.org/overview/</a></p>
        <br>
        <details style="margin-bottom: 24px; padding: 14px 16px; background: var(--bg-secondary, rgba(120, 120, 128, 0.08)); border-radius: 12px; border: 1px solid var(--border-color, rgba(120, 120, 128, 0.2));">
            <summary style="font-weight: 600; color: var(--text-main); cursor: pointer; outline: none;">
                対応路線リストおよびサポート状況
            </summary>
            <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-color, rgba(120, 120, 128, 0.2));">
                
                <div style="margin-bottom: 18px;">
                    <p style="color: var(--text-main); font-weight: 600; margin: 0 0 6px 0;">完全支援（遅延時分のリアルタイム取得対応）</p>
                    <ul style="color: var(--text-secondary); margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>JR東日本（山手線、中央線快速 など）</li>
                        <li>東京メトロ（銀座線、丸ノ内線 など）</li>
                    </ul>
                </div>

                <div style="margin-bottom: 18px;">
                    <p style="color: var(--text-main); font-weight: 600; margin: 0 0 4px 0;">一部支援（公式の異常テキスト公告のみ）</p>
                    <p style="color: var(--text-secondary); margin: 0 0 6px 0; font-size: 0.9em;">※リアルタイムな遅延分数の照会はできず、各社が主動的に発表するテキスト情報に依存します。</p>
                    <ul style="color: var(--text-secondary); margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>西武鉄道（池袋線、新宿線 など）</li>
                        <li>京王電鉄（京王線、井の頭線 など）</li>
                    </ul>
                </div>

                <div style="margin-bottom: 4px;">
                    <p style="color: var(--text-main); font-weight: 600; margin: 0 0 4px 0;">注意事項のある路線</p>
                    <p style="color: var(--text-secondary); margin: 0 0 6px 0; font-size: 0.9em;">※ODPT協議会に参加していますが、実測において重大な運行障害発生時に情報の更新が行われない事例が確認されています。参考程度にご利用ください。</p>
                    <ul style="color: var(--text-secondary); margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>〇〇鉄道（〇〇線）</li>
                        <li>△△鉄道（△△線）</li>
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