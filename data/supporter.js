// data/supporter.js

export const supporterContent = `
    <div style="opacity: 0.85; line-height: 1.7;">
        
        <style>
            .sponsor-nav-btn {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.35);
                color: #ffffff;
                border: none;
                display: none; /* 預設隱藏，靠 media query 喚醒 */
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 10;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                opacity: 0;
                transition: opacity 0.3s ease, background 0.2s ease, transform 0.2s ease;
            }
            .sponsor-nav-btn:hover {
                background: rgba(0, 0, 0, 0.65);
                transform: translateY(-50%) scale(1.05); /* 輕微放大的回饋感 */
            }
            .sponsor-nav-btn:active {
                transform: translateY(-50%) scale(0.95); /* 點擊縮小的實體感 */
            }
            /* 只有在螢幕寬度大於 768px (平板/電腦) 時才啟用按鈕功能 */
            @media (min-width: 768px) {
                .sponsor-nav-btn {
                    display: flex; 
                }
                /* 當滑鼠移入輪播容器時，按鈕浮現 */
                #sponsor-carousel-container:hover .sponsor-nav-btn {
                    opacity: 1; 
                }
            }
        </style>

        <p style="font-size: 0.85em; opacity: 0.9; margin-bottom: 12px;">当サイトの運営・開発を支えてくださる協賛企業・団体様です。</p>

        <div id="sponsor-carousel-container" style="
            position: relative;
            width: 100%;
            aspect-ratio: 1.586 / 1; 
            border-radius: 16px; 
            overflow: hidden;
            margin-bottom: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            touch-action: pan-y;
            background: rgba(120, 120, 128, 0.08);
        ">
            <div id="sponsor-track" style="
                display: flex;
                width: 100%;
                height: 100%;
                transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
            "></div>

            <button id="sponsor-prev-btn" class="sponsor-nav-btn" style="left: 12px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            
            <button id="sponsor-next-btn" class="sponsor-nav-btn" style="right: 12px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>

            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 36px; background: linear-gradient(to top, rgba(0,0,0,0.3), transparent); pointer-events: none;"></div>

            <div id="sponsor-dots" style="
                position: absolute;
                bottom: 10px;
                left: 0;
                right: 0;
                display: flex;
                justify-content: center;
                gap: 8px;
            "></div>
        </div>

        <p style="font-size: 0.95em; margin-bottom: 24px;">当サイトは個人で開発・運営を行っており、サーバー維持費などは皆様からの温かいご支援によって成り立っています。</p>
        <p style="font-size: 0.95em; margin-bottom: 24px;">今後もより便利で快適なサービスを継続して提供するため、感謝のしるしとして『限定デジタル特典パック』をご用意いたしました。ぜひサポートをお願いいたします。</p>
        <br>
        <p style="color: var(--text-main); font-weight: 600; margin-bottom: 8px;">特典パックを購入して開発を応援する</p>
        
        <a href="https://store.tsukinkanban.com" target="_blank" rel="noopener noreferrer" style="display: flex; justify-content: center; align-items: center; gap: 8px; background: var(--text-main); color: var(--bg-color); padding: 14px; border-radius: 12px; font-weight: 600; font-size: 1.05em; text-decoration: none; margin-bottom: 8px; transition: transform 0.2s ease, opacity 0.2s ease; transform: translateZ(0); backface-visibility: hidden;">
            
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; transform: translateZ(0); backface-visibility: hidden; animation: none !important;">
                <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                <line x1="2" x2="22" y1="10" y2="10"></line>
            </svg>
            
            <span style="transform: translateZ(0);">購入ページへ進む</span>
        </a>

        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 24px; color: var(--text-main);">
            
            <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 34" fill="currentColor" style="height: 40px; opacity: 0.5; animation: none !important; transform: none !important;">
                <path d="M17.07,11.24h-4.3V22h1.92V17.84h2.38c2.4,0,3.9-1.16,3.9-3.3S19.47,11.24,17.07,11.24Zm-.1,5H14.69v-3.3H17c1.38,0,2.11.59,2.11,1.65S18.35,16.19,17,16.19Z"/>
                <path d="M25.1,14a3.77,3.77,0,0,0-3.8,4.09,3.81,3.81,0,1,0,7.59,0A3.76,3.76,0,0,0,25.1,14Zm0,6.67c-1.22,0-2-1-2-2.58s.76-2.58,2-2.58,2,1,2,2.58S26.31,20.66,25.1,20.66Z"/>
                <polygon points="36.78 19.35 35.37 14.13 33.89 14.13 32.49 19.35 31.07 14.13 29.22 14.13 31.59 22.01 33.15 22.01 34.59 16.85 36.03 22.01 37.59 22.01 39.96 14.13 38.18 14.13 36.78 19.35"/>
                <path d="M44,14a3.83,3.83,0,0,0-3.75,4.09,3.79,3.79,0,0,0,3.83,4.09A3.47,3.47,0,0,0,47.49,20L46,19.38a1.78,1.78,0,0,1-1.83,1.26A2.12,2.12,0,0,1,42,18.47h5.52v-.6C47.54,15.71,46.32,14,44,14Zm-1.93,3.13A1.92,1.92,0,0,1,44,15.5a1.56,1.56,0,0,1,1.69,1.62Z"/>
                <path d="M50.69,15.3V14.13h-1.8V22h1.8V17.87a1.89,1.89,0,0,1,2-2,4.68,4.68,0,0,1,.66,0v-1.8c-.14,0-.3,0-.51,0A2.29,2.29,0,0,0,50.69,15.3Z"/>
                <path d="M57.48,14a3.83,3.83,0,0,0-3.75,4.09,3.79,3.79,0,0,0,3.83,4.09A3.47,3.47,0,0,0,60.93,20l-1.54-.59a1.78,1.78,0,0,1-1.83,1.26,2.12,2.12,0,0,1-2.1-2.17H61v-.6C61,15.71,59.76,14,57.48,14Zm-1.93,3.13a1.92,1.92,0,0,1,1.92-1.62,1.56,1.56,0,0,1,1.69,1.62Z"/>
                <path d="M67.56,15a2.85,2.85,0,0,0-2.26-1c-2.21,0-3.47,1.85-3.47,4.09s1.26,4.09,3.47,4.09a2.82,2.82,0,0,0,2.26-1V22h1.8V11.24h-1.8Zm0,3.35a2,2,0,0,1-2,2.28c-1.31,0-2-1-2-2.52s.7-2.52,2-2.52c1.11,0,2,.81,2,2.29Z"/>
                <path d="M79.31,14A2.88,2.88,0,0,0,77,15V11.24h-1.8V22H77v-.83a2.86,2.86,0,0,0,2.27,1c2.2,0,3.46-1.86,3.46-4.09S81.51,14,79.31,14ZM79,20.6a2,2,0,0,1-2-2.28v-.47c0-1.48.84-2.29,2-2.29,1.3,0,2,1,2,2.52S80.25,20.6,79,20.6Z"/>
                <path d="M86.93,19.66,85,14.13H83.1L86,21.72l-.3.74a1,1,0,0,1-1.14.79,4.12,4.12,0,0,1-.6,0v1.51a4.62,4.62,0,0,0,.73.05,2.67,2.67,0,0,0,2.78-2l3.24-8.62H88.82Z"/>
                <path d="M125,12.43a3,3,0,0,0-2.13.87l-.14-.69h-2.39V25.53l2.72-.59V21.81a3,3,0,0,0,1.93.7c1.94,0,3.72-1.59,3.72-5.11C128.71,14.18,126.91,12.43,125,12.43Zm-.65,7.63a1.61,1.61,0,0,1-1.28-.52l0-4.11a1.64,1.64,0,0,1,1.3-.55c1,0,1.68,1.13,1.68,2.58S125.36,20.06,124.35,20.06Z"/>
                <path d="M133.73,12.43c-2.62,0-4.21,2.26-4.21,5.11,0,3.37,1.88,5.08,4.56,5.08a6.12,6.12,0,0,0,3-.73V19.64a5.79,5.79,0,0,1-2.7.62c-1.08,0-2-.39-2.14-1.7h5.38c0-.15,0-.74,0-1C137.71,14.69,136.35,12.43,133.73,12.43Zm-1.47,4.07c0-1.26.77-1.79,1.45-1.79s1.4.53,1.4,1.79Z"/>
                <path d="M113,13.36l-.17-.82h-2.32v9.71h2.68V15.67a1.87,1.87,0,0,1,2.05-.58V12.54A1.8,1.8,0,0,0,113,13.36Z"/>
                <path d="M99.46,15.46c0-.44.36-.61.93-.61a5.9,5.9,0,0,1,2.7.72V12.94a7,7,0,0,0-2.7-.51c-2.21,0-3.68,1.18-3.68,3.16,0,3.1,4.14,2.6,4.14,3.93,0,.52-.44.69-1,.69a6.78,6.78,0,0,1-3-.9V22a7.38,7.38,0,0,0,3,.64c2.26,0,3.82-1.15,3.82-3.16C103.62,16.12,99.46,16.72,99.46,15.46Z"/>
                <path d="M107.28,10.24l-2.65.58v8.93a2.77,2.77,0,0,0,2.82,2.87,4.16,4.16,0,0,0,1.91-.37V20c-.35.15-2.06.66-2.06-1V15h2.06V12.66h-2.06Z"/>
                <polygon points="116.25 11.7 118.98 11.13 118.98 8.97 116.25 9.54 116.25 11.7"/>
                <rect x="116.25" y="12.61" width="2.73" height="9.64"/>
            </svg>
        </div>

        <div style="padding: 12px 16px; background: rgba(120, 120, 128, 0.08); border-radius: 12px; margin-bottom: 16px;">
            <p style="font-weight: 600; font-size: 0.9em; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;">
                    <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                ご購入に関する注意事項
            </p>
            <ul style="padding-left: 20px; font-size: 0.85em; opacity: 0.9; margin-bottom: 0;">
                <li style="margin-bottom: 8px;"><strong>本テーマパックのご購入は任意です。</strong>本決済は「デジタル特典パック（PDFノートおよびカスタムカラーコード集）」のご購入となります。決済完了後、ダウンロードリンクが提供されます。物理的な商品（グッズ等）の発送はございません。</li>
                <li style="margin-bottom: 8px;"><strong>購入の有無によって本サービスの機能制限や利用体験に違いが生じることは一切ありません。</strong>すべての機能を無料でご利用いただけます。</li>
                <li style="margin-bottom: 8px;">本商品の売上は、当サイトのサーバー維持費や今後の開発資金として大切に活用させていただきます。皆様の温かい応援が開発の励みになります。</li>
                <li style="margin-bottom: 8px;">ご利用のクレジットカード会社によっては、別途「<strong>海外決済手数料</strong>（為替手数料など）」が発生する場合があります。</li>
                <li style="margin-bottom: 8px;">万が一返金をご希望の場合は、<strong>決済完了後7日以内</strong>にご連絡ください。なお、返金金額からは決済プラットフォームが徴収する<strong>決済手数料（総額の5% ＋ 1決済につき50セント）</strong>が差し引かれますのでご注意ください。実際の返金が口座に反映されるまでの日数は各カード会社等の規定に準じますが、ご連絡をいただき次第、速やかに手続きを行います。</li>
                
                <li>決済完了後、ご入力いただいたメールアドレス宛に決済IDを含む確認メール送信されます。<strong>それ以外に当サイトからメール、SMS、お電話等でご連絡を差し上げることは一切ございません</strong>。当サイトを装った不審な連絡を受け取った場合は、絶対にリンク等を開かず、<strong>警察相談窓口（#9110）</strong>や<strong>消費者ホットライン（188）</strong>へご相談ください。</li>
            </ul>
        </div>

        <div style="padding: 12px 16px; background: rgba(120, 120, 128, 0.08); border-radius: 12px;">
            <p style="font-weight: 600; font-size: 0.9em; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                </svg>
                プライバシーとセキュリティ
            </p>
            <ul style="padding-left: 20px; font-size: 0.85em; opacity: 0.9; margin-bottom: 0;">
                <li style="margin-bottom: 8px;">クレジットカードによるご決済につきましては、
                関連情報はすべて安全な決済代行プラットフォーム（Lemon Squeezy）によって処理されます。当サイトでは最低限の識別情報のみを保持し、カード情報は一切保存しません。</li>
                <li>協賛パートナー枠は画像とリンクのみの構成となっており、サードパーティの広告プラットフォームは使用していません。ただし、リンク先のウェブサイトで閲覧履歴などを追跡する仕組み（トラッキング等）が使用されているかについて、当サイトでは管理・把握しておりません。プライバシーにご不安がある場合は、リンクのクリックをお控えください（クリックしない限り、勝手にデータが送信されることはありません）。</li>
            </ul>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 24px; padding-bottom: 8px;">
            
            <a href="https://example.com/sponsor-test" target="_blank" rel="noopener noreferrer" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(120, 120, 128, 0.08); color: var(--text-main); padding: 14px 8px; border-radius: 12px; text-decoration: none; font-size: 0.85em; font-weight: 600; transition: background 0.2s ease, transform 0.2s ease;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7;">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                協賛のご相談
            </a>

            <a href="https://forms.gle/nKKsQd3yx41VPUAZ9" target="_blank" rel="noopener noreferrer" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(120, 120, 128, 0.08); color: var(--text-main); padding: 14px 8px; border-radius: 12px; text-decoration: none; font-size: 0.85em; font-weight: 600; transition: background 0.2s ease, transform 0.2s ease;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7;">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <polyline points="3 3 3 8 8 8"></polyline>
                </svg>
                返金のお手続き
            </a>

        </div>
        
    </div>
`;