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

        <p style="color: var(--text-main); font-weight: 600; margin-bottom: 4px;">スポンサー</p>
        <p style="font-size: 0.85em; opacity: 0.9; margin-bottom: 12px;">当サイトを支援してくださるパートナー企業・団体様です。</p>

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

        <p style="font-size: 0.95em; margin-bottom: 24px;">当サイトは、皆様からの温かいご支援によって運営・開発が維持されています。より便利で快適なサービスを提供するため、サポートをお願いいたします。</p>

        <p style="color: var(--text-main); font-weight: 600; margin-bottom: 8px;">開発者をサポートする</p>
        <a href="https://buy.stripe.com/test_xxxxxxxx" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background: var(--text-main); color: var(--bg-main); padding: 12px; border-radius: 12px; font-weight: 600; text-decoration: none; margin-bottom: 24px; transition: opacity 0.2s ease;">
            クレジットカードで支援する
        </a>

        <div style="padding: 12px 16px; background: rgba(120, 120, 128, 0.08); border-radius: 12px;">
            <p style="font-weight: 600; font-size: 0.9em; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                </svg>
                プライバシーとセキュリティ
            </p>
            <ul style="padding-left: 20px; font-size: 0.85em; opacity: 0.9; margin-bottom: 0;">
                <li style="margin-bottom: 8px;">クレジットカードによるご支援につきましては、関連情報はすべて安全な決済代行プラットフォームによって処理されます。当サイトでは、返金等の手続きに必要な最低限の識別情報のみを保持し、カード情報は一切保存しません。</li>
                <li>スポンサー枠は画像とリンクのみで構成されており、サードパーティの広告プラットフォームは使用していません。スポンサー先のリンクにトラッキングコードが含まれるかについては関知できないため、懸念がある場合はクリックをお控えください。</li>
            </ul>
        </div>
        
    </div>
`;