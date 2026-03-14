// data/sponsors.js

// 🟢 1. 贊助商資料庫 (未來你要換照片或連結，只要改這裡！)
export const sponsorsData = [
    {
        id: 1,
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=600&auto=format&fit=crop', // 第一張圖 (預設為優美的風景或品牌圖)
        link: 'https://example.com/sponsor1',
        alt: '贊助商 1'
    },
    {
        id: 2,
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop', // 第二張圖
        link: 'https://example.com/sponsor2',
        alt: '贊助商 2'
    },
    {
        id: 3,
        image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=600&auto=format&fit=crop', // 第三張圖
        link: 'https://example.com/sponsor3',
        alt: '贊助商 3'
    }
];

// 🟢 2. 輪播引擎邏輯 (導出給主程式呼叫)
export function initSponsorCarousel() {
    const track = document.getElementById('sponsor-track');
    const dotsContainer = document.getElementById('sponsor-dots');
    if (!track || !dotsContainer) return;

    // 清空重置
    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    // 生成圖片與圓點
    sponsorsData.forEach((sponsor, index) => {
        // 幻燈片本身 (可點擊的連結)
        const slide = document.createElement('a');
        slide.href = sponsor.link;
        slide.target = '_blank';
        slide.rel = 'noopener noreferrer';

        // ✨ 新增：點擊時的「防誤觸與跳轉確認」提示
        slide.addEventListener('click', (e) => {
            // 跳出確認視窗
            const isConfirmed = window.confirm('外部サイトへ移動します。よろしいですか？' + sponsor.link);
            
            // 如果使用者點擊「取消」，就攔截預設的跳轉行為
            if (!isConfirmed) {
                e.preventDefault(); 
            }
        });
        
        // 🟢 實心灰色背景
        slide.style.cssText = `
            flex: 0 0 100%;
            height: 100%;
            display: block;
            position: relative;
            background: rgba(120, 120, 128, 0.15); /* 漂亮的實心灰 */
            -webkit-user-drag: none;
            text-decoration: none;
            overflow: hidden;
        `;

        // 🟢 聰明的雙層設計：底層是「歡迎贊助」文字，上層是真實圖片
        slide.innerHTML = `
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-main); opacity: 0.4;">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px;">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
                <span style="font-size: 0.9em; font-weight: 600; letter-spacing: 0.5px;">スポンサー募集中</span>
            </div>
            
            <img src="${sponsor.image}" 
                 onload="this.previousElementSibling.style.display='none'" 
                 onerror="this.style.opacity='0'; this.previousElementSibling.style.display='flex';" 
                 style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none;" 
                 alt="${sponsor.alt}">
        `;
        track.appendChild(slide);

        // 底部小圓點 (維持不變)
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

    // 自動播放邏輯 (每 5 秒)
    function nextSlide() {
        if (!document.getElementById('sponsor-track')) {
            stopAutoPlay();
            return;
        }
        currentIndex = (currentIndex + 1) % totalSlides;
        updateCarousel();
    }

    // 🟢 新增：往前一張邏輯
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
        autoPlayTimer = setInterval(nextSlide, 5000);
    }
    
    function stopAutoPlay() {
        if (autoPlayTimer) clearInterval(autoPlayTimer);
    }

    // 初始化狀態
    updateCarousel();
    startAutoPlay();

    // 🟢 新增：電腦版左右按鈕點擊事件綁定
    const prevBtn = document.getElementById('sponsor-prev-btn');
    const nextBtn = document.getElementById('sponsor-next-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation(); // 阻止點擊事件穿透到後面的圖片連結
            prevSlide();
            startAutoPlay(); // 點擊後重置自動播放的計時器
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            nextSlide();
            startAutoPlay(); // 點擊後重置自動播放的計時器
        });
    }

    // 🟢 3. 頂級觸控手勢綁定 (滑動與長按)
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let longPressTimer;
    const container = document.getElementById('sponsor-carousel-container');

    container.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        currentX = startX;
        isDragging = true;
        stopAutoPlay(); // 碰到就暫停自動播放

        // 偵測長按 (按住 250ms 會有微微縮小的視覺回饋)
        longPressTimer = setTimeout(() => {
            track.style.transform = `translateX(-${currentIndex * 100}%) scale(0.97)`;
            track.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        }, 250);
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;

        // 如果手指有滑動，取消長按判定，讓卡片跟著手指微調
        if (Math.abs(diffX) > 10) {
            clearTimeout(longPressTimer);
            track.style.transition = 'none'; // 移除動畫，跟隨手指
            track.style.transform = `translateX(calc(-${currentIndex * 100}% + ${diffX}px))`;
        }
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        clearTimeout(longPressTimer);

        track.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'; // 恢復滑順彈性動畫
        const diffX = currentX - startX;
        
        // 判斷是否滑動超過 40px，觸發換張 (且支援無限循環)
        if (Math.abs(diffX) > 40) {
            if (diffX > 0) {
                currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; // 往右滑，上一張
            } else {
                currentIndex = (currentIndex + 1) % totalSlides; // 往左滑，下一張
            }
        }
        
        updateCarousel();
        startAutoPlay(); // 放開手後重新開始計時
    });

    // 電腦版滑鼠支援 (Hover 暫停)
    container.addEventListener('mouseenter', stopAutoPlay);
    container.addEventListener('mouseleave', startAutoPlay);
}