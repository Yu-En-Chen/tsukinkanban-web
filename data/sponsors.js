// data/sponsors.js

// 🟢 1. 預設贊助商資料庫 (Fallback)
// 萬一 API 壞掉或無網路時的備用資料，確保畫面不會空白
const fallbackSponsorsData = [
    {
        id: 1,
        image: '',
        link: 'https://forms.cloud.microsoft/r/AG28XAZfWF',
        alt: '支援者 1'
    },
    {
        id: 2,
        image: '',
        link: 'https://forms.cloud.microsoft/r/AG28XAZfWF',
        alt: '支援者 2'
    },
    {
        id: 3,
        image: '',
        link: 'https://forms.cloud.microsoft/r/AG28XAZfWF',
        alt: '支援者 3'
    }
];

// 🟢 API 網址 (Sheety Google Sheets API)
const API_URL = 'https://googleapi.eqq1029.workers.dev';

// 🟢 2. 輪播引擎邏輯 (改為非同步 async 函式)
export async function initSponsorCarousel() {
    const track = document.getElementById('sponsor-track');
    const dotsContainer = document.getElementById('sponsor-dots');
    if (!track || !dotsContainer) return;

    // 清空重置並顯示骨架/讀取中狀態 (避免破圖)
    track.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-main); opacity: 0.5;">
            <span style="font-size: 0.9em;">ロード中...</span>
        </div>`;
    dotsContainer.innerHTML = '';

    let sponsorsData = fallbackSponsorsData;

    // 🟢 3. 讀取 API 資料邏輯
    try {
        // 使用 SessionStorage 建立快取，避免每次打開都浪費 API 額度
        const cachedData = sessionStorage.getItem('sponsorsData');
        const cacheTime = sessionStorage.getItem('sponsorsCacheTime');
        const now = new Date().getTime();

        // 如果有快取，且距離上次抓取不到 1 小時 (3600000毫秒)，就用快取的
        if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 3600000) {
            sponsorsData = JSON.parse(cachedData);
        } else {
            // 沒有快取或已過期，向 API 請求新資料
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('API 請求失敗');
            
            const data = await response.json();
            
            // 解析 JSON，確保裡面有 "通勤看板" 陣列且有資料
            if (data && data["通勤看板"] && data["通勤看板"].length > 0) {
                sponsorsData = data["通勤看板"];
                // 將資料存入快取
                sessionStorage.setItem('sponsorsData', JSON.stringify(sponsorsData));
                sessionStorage.setItem('sponsorsCacheTime', now.toString());
            }
        }
    } catch (error) {
        console.error("輪播圖 API 讀取失敗，使用預設資料:", error);
        // 如果失敗，會繼續往下使用 fallbackSponsorsData
    }

    // 🟢 4. 生成圖片與圓點 (資料抓完後開始渲染)
    track.innerHTML = ''; // 清除 Loading 文字
    sponsorsData.forEach((sponsor, index) => {
        const slide = document.createElement('a');
        slide.href = sponsor.link;
        slide.target = '_blank';
        slide.rel = 'noopener noreferrer';

        // ✨ 點擊時的「防誤觸與跳轉確認」提示 (自訂 iOS 視窗版)
        slide.addEventListener('click', async (e) => {
            e.preventDefault(); 
            
            // 檢查 window.iosConfirm 是否存在 (你的對話框系統)
            if (typeof window.iosConfirm === 'function') {
                const isConfirmed = await window.iosConfirm(
                    "外部サイトへ移動", 
                    "以下のリンクを開きますか？\n\n" + sponsor.link,
                    "開く",      
                    "キャンセル" 
                );
                if (isConfirmed) {
                    window.open(sponsor.link, '_blank', 'noopener,noreferrer');
                }
            } else {
                // 若沒載入對話框組件，直接跳轉
                window.open(sponsor.link, '_blank', 'noopener,noreferrer');
            }
        });
        
        slide.style.cssText = `
            flex: 0 0 100%;
            height: 100%;
            display: block;
            position: relative;
            background: rgba(120, 120, 128, 0.15); 
            -webkit-user-drag: none;
            text-decoration: none;
            overflow: hidden;
        `;

        slide.innerHTML = `
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-main); opacity: 0.4;">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px;">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
                <span style="font-size: 0.9em; font-weight: 600; letter-spacing: 0.5px;">協賛パートナー募集中</span>
            </div>
            
            <img src="${sponsor.image}" 
                 onload="this.previousElementSibling.style.display='none'" 
                 onerror="this.style.opacity='0'; this.previousElementSibling.style.display='flex';" 
                 style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none;" 
                 alt="${sponsor.alt}">
        `;
        track.appendChild(slide);

        // 底部小圓點
        const dot = document.createElement('div');
        dot.style.cssText = `
            width: 6px; height: 6px; border-radius: 50%;
            background: rgba(255, 255, 255, 0.4);
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            transition: background 0.3s ease, transform 0.3s ease;
        `;
        dotsContainer.appendChild(dot);
    });

    // 核心變數
    let currentIndex = 0;
    let autoPlayTimer;
    const totalSlides = sponsorsData.length;

    // 更新畫面函數
    function updateCarousel() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        Array.from(dotsContainer.children).forEach((dot, index) => {
            dot.style.background = index === currentIndex ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.4)';
            dot.style.transform = index === currentIndex ? 'scale(1.3)' : 'scale(1)';
        });
    }

    // 自動播放邏輯
    function nextSlide() {
        if (!document.getElementById('sponsor-track')) {
            stopAutoPlay();
            return;
        }
        currentIndex = (currentIndex + 1) % totalSlides;
        updateCarousel();
    }

    function prevSlide() {
        if (!document.getElementById('sponsor-track')) {
            stopAutoPlay();
            return;
        }
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateCarousel();
    }

    function startAutoPlay() {
        stopAutoPlay();
        autoPlayTimer = setInterval(nextSlide, 2500);
    }
    
    function stopAutoPlay() {
        if (autoPlayTimer) clearInterval(autoPlayTimer);
    }

    updateCarousel();
    startAutoPlay();

    // 電腦版左右按鈕事件
    const prevBtn = document.getElementById('sponsor-prev-btn');
    const nextBtn = document.getElementById('sponsor-next-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 
            prevSlide();
            startAutoPlay(); 
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            nextSlide();
            startAutoPlay(); 
        });
    }

    // 🟢 5. 頂級觸控手勢綁定
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let longPressTimer;
    const container = document.getElementById('sponsor-carousel-container');

    if(container) {
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            currentX = startX;
            isDragging = true;
            stopAutoPlay();

            longPressTimer = setTimeout(() => {
                track.style.transform = `translateX(-${currentIndex * 100}%) scale(0.97)`;
                track.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
            }, 250);
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            const diffX = currentX - startX;

            if (Math.abs(diffX) > 10) {
                clearTimeout(longPressTimer);
                track.style.transition = 'none'; 
                track.style.transform = `translateX(calc(-${currentIndex * 100}% + ${diffX}px))`;
            }
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            clearTimeout(longPressTimer);

            track.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'; 
            const diffX = currentX - startX;
            
            if (Math.abs(diffX) > 40) {
                if (diffX > 0) {
                    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
                } else {
                    currentIndex = (currentIndex + 1) % totalSlides;
                }
            }
            
            updateCarousel();
            startAutoPlay();
        });

        container.addEventListener('mouseenter', stopAutoPlay);
        container.addEventListener('mouseleave', startAutoPlay);
    }
}