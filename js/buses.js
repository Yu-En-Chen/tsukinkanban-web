// buses.js - 公車資料模組（搜尋、快取、卡面格式與詳細面板）
// 原則：預設不主動請求公車 API，只有「使用者搜尋當下」與「牌組內已有儲存的公車卡片」才發送請求。

const BUS_API_BASE = 'https://api.tsukinkanban.com/api/bus';
const BUS_CACHE_KEY = 'Tsukin_Cached_BusData';
const BUS_PREFS_KEY = 'Tsukin_Bus_Prefs';
const BUS_REFRESH_MIN_MS = 60000; // 後端建議輪詢間隔 >= 60 秒

// 業者識別色
const OPERATOR_COLORS = {
    Toei: '#2E7D32',
    YokohamaMunicipal: '#0068B7',
    SeibuBus: '#5CA028'
};

// targetId 格式：bus:{業者ID}:{路線官方表記}
// 含「:」可避開 db.js 的航班名稱校正，也不會被誤判為航班卡片
export function makeBusTargetId(operator, route) {
    return `bus:${operator}:${route}`;
}

export function isBusTargetId(id) {
    return typeof id === 'string' && id.startsWith('bus:');
}

function parseBusTargetId(targetId) {
    const parts = targetId.split(':');
    return { operator: parts[1] || '', route: parts.slice(2).join(':') || '' };
}

// ============================================================================
// 全域快取：targetId -> 業者結果物件（含 patterns），另存 fetchedAt 時間戳
// ============================================================================
window.GlobalBusData = window.GlobalBusData || {};

export function initBuses() {
    // 只還原本地快取，不發送任何請求
    try {
        const cached = localStorage.getItem(BUS_CACHE_KEY);
        if (cached) window.GlobalBusData = JSON.parse(cached);
    } catch (e) { }
}

function persistBusCache() {
    try {
        localStorage.setItem(BUS_CACHE_KEY, JSON.stringify(window.GlobalBusData));
    } catch (e) { }
}

// ============================================================================
// 每張公車卡的顯示偏好（方向、預覽停留所、收折狀態），以 targetId 為 key
// 存在 localStorage，預覽卡與正式卡共用同一份設定
// ============================================================================
export function getBusPrefs(targetId) {
    try {
        const all = JSON.parse(localStorage.getItem(BUS_PREFS_KEY) || '{}');
        return Object.assign({ dir: 0, previewStops: [], collapsed: false }, all[targetId] || {});
    } catch (e) {
        return { dir: 0, previewStops: [], collapsed: false };
    }
}

export function saveBusPrefs(targetId, prefs) {
    try {
        const all = JSON.parse(localStorage.getItem(BUS_PREFS_KEY) || '{}');
        all[targetId] = prefs;
        localStorage.setItem(BUS_PREFS_KEY, JSON.stringify(all));
    } catch (e) { }
}

// ============================================================================
// API 請求
// ============================================================================
async function fetchBusRoute(routeName) {
    try {
        const res = await fetch(`${BUS_API_BASE}/route/${encodeURIComponent(routeName)}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const json = await res.json();
        return json;
    } catch (e) {
        return null;
    }
}

// 將一次路線查詢的回應寫入快取（每個命中的業者各一筆）
function storeRouteResults(json) {
    const stored = [];
    if (!json || !Array.isArray(json.results)) return stored;
    json.results.forEach(result => {
        // 以第一個 pattern 的標題推回路線名；查詢字串可能是別名，官方表記以 routes 資料為準
        const routeName = extractRouteName(result, json.query);
        const targetId = makeBusTargetId(result.operator, routeName);
        window.GlobalBusData[targetId] = Object.assign({}, result, {
            routeName: routeName,
            fetchedAt: Date.now()
        });
        stored.push(targetId);
    });
    if (stored.length > 0) persistBusCache();
    return stored;
}

// 從業者結果推出路線顯示名（pattern 標題格式為「路線名 行き先行」）
function extractRouteName(result, fallback) {
    if (result.patterns && result.patterns.length > 0) {
        const title = result.patterns[0].title || '';
        const firstSpace = title.indexOf(' ');
        if (firstSpace > 0) return title.slice(0, firstSpace);
        if (title) return title;
    }
    return fallback || '';
}

// ============================================================================
// 搜尋整合：由 filterCards 呼叫，600ms debounce，結果非同步補進下拉選單
// ============================================================================
let busSearchTimer = null;
const busSearchCache = {}; // keyword -> { ts, targetIds, error }

export function searchBusesDebounced(rawKeyword) {
    if (busSearchTimer) clearTimeout(busSearchTimer);
    const keyword = (rawKeyword || '').trim();
    if (keyword.length < 2) return; // 太短的字串不打 API

    // 已有 60 秒內的快取 → 直接渲染，不再請求
    const cached = busSearchCache[keyword];
    if (cached && Date.now() - cached.ts < 60000) {
        appendBusResultsToDropdown(keyword, cached.targetIds, cached.error);
        return;
    }

    busSearchTimer = setTimeout(async () => {
        const json = await fetchBusRoute(keyword);

        // 使用者已經改變搜尋內容 → 丟棄本次結果
        const input = document.getElementById('search-input');
        if (!input || input.value.trim() !== keyword) return;

        if (!json) return;
        if (json.error) {
            busSearchCache[keyword] = { ts: Date.now(), targetIds: [], error: true };
            appendBusResultsToDropdown(keyword, [], true);
            return;
        }

        const targetIds = storeRouteResults(json);
        busSearchCache[keyword] = { ts: Date.now(), targetIds: targetIds, error: false };
        appendBusResultsToDropdown(keyword, targetIds, false);
    }, 600);
}

const busIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.5.2-1.2s-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`;

// 將公車結果補進既有的搜尋下拉選單（不動鐵道與航班的結果）
function appendBusResultsToDropdown(keyword, targetIds, isError) {
    const dropdown = document.getElementById('home-search-dropdown');
    if (!dropdown || dropdown.style.display === 'none') return;

    // 清掉上一輪的公車結果
    dropdown.querySelectorAll('.bus-search-item').forEach(el => el.remove());

    if (isError) {
        const notice = document.createElement('div');
        notice.className = 'search-result-item bus-search-item';
        notice.innerHTML = `<div class="search-result-title" style="opacity: 0.7;">バス情報を初期化中です。しばらくしてから再検索してください。</div>`;
        dropdown.appendChild(notice);
        return;
    }

    if (targetIds.length === 0) return;

    // 有公車結果時，移除「該当する路線が見つかりません」的空狀態
    const empty = dropdown.querySelector('.search-empty-state');
    if (empty) empty.remove();

    targetIds.forEach(targetId => {
        const data = window.GlobalBusData[targetId];
        if (!data) return;

        const patternCount = (data.patterns || []).length;
        const busCount = (data.patterns || []).reduce((sum, p) => sum + (p.bus_count || 0), 0);
        const rightText = busCount > 0 ? `運行中 ${busCount}台` : `${patternCount}方向`;

        const item = document.createElement('div');
        item.className = 'search-result-item bus-search-item';
        item.style.cursor = 'pointer';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div class="search-result-title" style="display: flex; align-items: center; gap: 6px;">${busIconSvg}${data.routeName}</div>
                    <div class="search-result-subtitle">${data.label}</div>
                </div>
                <div class="bus-search-right">${rightText}</div>
            </div>
        `;
        item.onclick = () => window.previewBusFromSearch(targetId);
        dropdown.appendChild(item);
    });
}

// ============================================================================
// 已儲存公車卡的背景更新（只在牌組內有公車卡時才發送請求）
// ============================================================================
let isRefreshingBus = false;

export async function refreshSavedBusRoutes() {
    if (isRefreshingBus) return;

    const savedTargets = new Set();
    (window.appRailwayData || []).forEach(card => {
        if (card.id.startsWith('temp-search')) return;
        (card.targetLineIds || []).forEach(id => {
            if (isBusTargetId(id)) savedTargets.add(id);
        });
    });
    if (savedTargets.size === 0) return; // 沒有已儲存的公車卡 → 完全不請求

    isRefreshingBus = true;
    let changed = false;

    try {
        for (const targetId of savedTargets) {
            const cached = window.GlobalBusData[targetId];
            if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < BUS_REFRESH_MIN_MS) continue;

            const { operator, route } = parseBusTargetId(targetId);
            const json = await fetchBusRoute(route);
            if (!json || json.error || !Array.isArray(json.results)) continue;

            const match = json.results.find(r => r.operator === operator);
            if (match) {
                window.GlobalBusData[targetId] = Object.assign({}, match, {
                    routeName: extractRouteName(match, route),
                    fetchedAt: Date.now()
                });
                changed = true;
            }
        }
    } finally {
        isRefreshingBus = false;
    }

    if (changed) {
        persistBusCache();
        window.dispatchEvent(new CustomEvent('busDataUpdated'));
    }
}

// ============================================================================
// 卡面資料格式：給 buildAndRender 使用（對應航班的 generateFlightDataFormat）
// ============================================================================
export function generateBusDataFormat(targetId) {
    const { operator, route } = parseBusTargetId(targetId);
    const cached = window.GlobalBusData[targetId];
    const hex = OPERATOR_COLORS[operator] || '#2E7D32';

    let flags = [false, false, false, false, false, false, true]; // 預設灰色注意燈
    let desc = 'バス情報を取得しています...';
    let updateTime = '--:--';

    if (cached && cached.patterns && cached.patterns.length > 0) {
        const isRealtime = (cached.source || '').includes('リアルタイム');
        flags = [false, false, false, false, false, isRealtime, !isRealtime];

        // 預覽停留所已設定時，卡面描述直接顯示該站的到站資訊
        const prefs = getBusPrefs(targetId);
        const pattern = cached.patterns[Math.min(prefs.dir, cached.patterns.length - 1)];
        let previewLine = '';
        if (prefs.previewStops.length > 0 && pattern) {
            const stop = pattern.stops.find(s => prefs.previewStops.includes(s.name));
            if (stop) {
                const eta = stop.eta_text ? stop.eta_text : (stop.next_text ? `次発 ${stop.next_text}` : '');
                if (eta) previewLine = `${stop.name}：${eta}`;
            }
        }
        desc = previewLine || `${cached.label}（${cached.source || 'データなし'}）`;

        if (cached.fetchedAt) {
            const d = new Date(cached.fetchedAt);
            updateTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
    }

    return {
        flags: flags,
        desc: desc,
        updateTime: updateTime,
        busData: cached || { operator: operator, routeName: route, label: 'バス', source: '', url: '', patterns: [] },
        hex: hex
    };
}

// 業者識別色（新卡片預設色用）
export function getBusOperatorColor(operator) {
    return OPERATOR_COLORS[operator] || '#2E7D32';
}

// ============================================================================
// 詳細面板渲染：方向切換塊、停留所列表、收折／預覽停留所
// 由 script.js 的 handleCardClick 呼叫；re-render 都在此閉包內完成
// ============================================================================
export function renderBusDetailPanel(data, scrollWrapper, opts = {}) {
    const targetId = (data.targetLineIds && data.targetLineIds[0]) || '';
    const busData = data.busData || {};
    const patterns = busData.patterns || [];
    const prefs = getBusPrefs(targetId);
    let selectionMode = false;
    let pendingStops = [];

    // 面板容器（re-render 時整包替換）
    const container = document.createElement('div');
    container.className = 'bus-panel-container';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
    scrollWrapper.appendChild(container);

    // 讓背景更新可以刷新開啟中的面板
    window.__busPanelRefresh = () => {
        const latest = window.GlobalBusData[targetId];
        if (latest) {
            data.busData = latest;
        }
        render();
    };

    const chevronDown = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="m6 9 6 6 6-6"/></svg>`;
    const chevronUp = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="m18 15-6-6-6 6"/></svg>`;
    const iconShare = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

    function currentPattern() {
        if (patterns.length === 0) return null;
        return patterns[Math.min(prefs.dir, patterns.length - 1)];
    }

    function render() {
        container.innerHTML = '';
        const freshPatterns = (data.busData && data.busData.patterns) || [];
        const pattern = freshPatterns.length > 0
            ? freshPatterns[Math.min(prefs.dir, freshPatterns.length - 1)]
            : null;

        // --- 無資料的空狀態 ---
        if (!pattern) {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'extension-route-card';
            emptyCard.style.cssText = 'padding: 32px 20px; text-align: center;';
            emptyCard.innerHTML = `
                <div style="font-weight: 700; opacity: 0.8;">バス情報を取得しています...</div>
                <div style="font-size: 0.85em; margin-top: 8px; opacity: 0.6;">初期化中の場合は数秒後に再度お試しください</div>
            `;
            container.appendChild(emptyCard);
            appendActionButtons();
            return;
        }

        // --- 1. 方向切換塊（滑動選擇不同班次方向） ---
        if (freshPatterns.length > 0) {
            const slider = document.createElement('div');
            slider.className = 'bus-dir-slider';
            freshPatterns.forEach((p, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'bus-dir-btn' + (i === Math.min(prefs.dir, freshPatterns.length - 1) ? ' active' : '');
                btn.textContent = p.title || `方向 ${i + 1}`;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (navigator.vibrate) navigator.vibrate(10);
                    prefs.dir = i;
                    saveBusPrefs(targetId, prefs);
                    selectionMode = false;
                    render();
                };
                slider.appendChild(btn);
            });
            container.appendChild(slider);
        }

        // --- 2. 停留所列表 ---
        const stopsCard = document.createElement('div');
        stopsCard.className = 'extension-route-card bus-stops-card';

        // 標頭：業者、資料來源與運行台數
        const header = document.createElement('div');
        header.className = 'bus-stops-header';
        const busCount = pattern.bus_count || 0;
        header.innerHTML = `
            <span class="bus-stops-operator">${busData.label || 'バス'}</span>
            <span class="bus-stops-source">${busData.source || ''}${busCount > 0 ? `・運行中 ${busCount}台` : ''}</span>
        `;
        stopsCard.appendChild(header);

        // 選擇模式的提示
        if (selectionMode) {
            const hint = document.createElement('div');
            hint.className = 'bus-select-hint';
            hint.textContent = 'プレビューに表示する停留所を選択（最大2つ）';
            stopsCard.appendChild(hint);
        }

        // 收折狀態：只顯示被選為預覽的停留所
        const isCollapsedView = prefs.collapsed && prefs.previewStops.length > 0 && !selectionMode;
        const stopsToShow = isCollapsedView
            ? pattern.stops.filter(s => prefs.previewStops.includes(s.name))
            : pattern.stops;

        if (isCollapsedView && stopsToShow.length === 0) {
            const none = document.createElement('div');
            none.className = 'bus-select-hint';
            none.textContent = '選択した停留所はこの方向にありません';
            stopsCard.appendChild(none);
        }

        stopsToShow.forEach(stop => {
            // 有巴士接近本站時，在該站上方標出行駛中的車輛（位於前一站與本站之間）
            if (stop.buses_approaching && stop.buses_approaching.length > 0) {
                stop.buses_approaching.forEach(bus => {
                    const marker = document.createElement('div');
                    marker.className = 'bus-marker-row';
                    const occText = bus.occupancy ? `・${bus.occupancy}` : '';
                    marker.innerHTML = `${busIconSvg}<span>${bus.number || ''}${occText}</span>`;
                    stopsCard.appendChild(marker);
                });
            }

            const row = document.createElement('div');
            row.className = 'bus-stop-row';

            // 原本列車顯示「平常／延誤分鐘」的位置 → 顯示到站預測或表定時刻
            let etaHtml;
            if (stop.eta_text) {
                etaHtml = `<span class="bus-eta-live">${stop.eta_text}</span>`;
            } else if (stop.next_text) {
                etaHtml = `<span class="bus-eta-sched">次発 ${stop.next_text}</span>`;
            } else {
                etaHtml = `<span class="bus-eta-none">--</span>`;
            }

            const isSelected = selectionMode
                ? pendingStops.includes(stop.name)
                : prefs.previewStops.includes(stop.name);

            row.innerHTML = `
                <span class="bus-stop-dot${isSelected ? ' selected' : ''}"></span>
                <span class="bus-stop-name">${stop.name}</span>
                ${etaHtml}
            `;

            if (selectionMode) {
                row.classList.add('selectable');
                row.onclick = (e) => {
                    e.stopPropagation();
                    const idx = pendingStops.indexOf(stop.name);
                    if (idx !== -1) {
                        pendingStops.splice(idx, 1);
                    } else {
                        if (pendingStops.length >= 2) pendingStops.shift(); // 超過 2 個時淘汰最早選的
                        pendingStops.push(stop.name);
                    }
                    if (navigator.vibrate) navigator.vibrate(10);
                    render();
                };
            }

            stopsCard.appendChild(row);
        });

        container.appendChild(stopsCard);

        // --- 3. 收折按鈕 ---
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'flight-action-btn bus-toggle-btn';

        if (selectionMode) {
            toggleBtn.innerHTML = `<span>決定（${pendingStops.length}/2）</span>`;
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                if (pendingStops.length === 0) {
                    // 未選擇任何站 → 視為取消
                    selectionMode = false;
                    render();
                    return;
                }
                prefs.previewStops = pendingStops.slice(0, 2);
                prefs.collapsed = true;
                saveBusPrefs(targetId, prefs);
                selectionMode = false;
                if (navigator.vibrate) navigator.vibrate(20);
                render();
            };
        } else if (isCollapsedView) {
            toggleBtn.innerHTML = `${chevronDown}<span>すべての停留所を表示</span>`;
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                prefs.collapsed = false;
                saveBusPrefs(targetId, prefs);
                render();
            };
        } else if (prefs.previewStops.length > 0) {
            toggleBtn.innerHTML = `${chevronUp}<span>プレビュー表示に折りたたむ</span>`;
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                prefs.collapsed = true;
                saveBusPrefs(targetId, prefs);
                render();
            };
        } else {
            toggleBtn.innerHTML = `${chevronUp}<span>プレビュー停留所を選ぶ</span>`;
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                selectionMode = true;
                pendingStops = prefs.previewStops.slice();
                render();
            };
        }
        container.appendChild(toggleBtn);

        // 已有預覽站且為展開狀態時，額外提供「重新選擇」入口
        if (!selectionMode && !isCollapsedView && prefs.previewStops.length > 0) {
            const changeBtn = document.createElement('button');
            changeBtn.type = 'button';
            changeBtn.className = 'bus-change-preview-btn';
            changeBtn.textContent = `プレビュー停留所を変更（現在：${prefs.previewStops.join('、')}）`;
            changeBtn.onclick = (e) => {
                e.stopPropagation();
                selectionMode = true;
                pendingStops = prefs.previewStops.slice();
                render();
            };
            container.appendChild(changeBtn);
        }

        appendActionButtons();
    }

    // 底部動作按鈕（官網／新規カード作成）
    function appendActionButtons() {
        const btnContainer = document.createElement('div');
        btnContainer.className = 'flight-action-buttons-container';

        if (busData.url) {
            const siteBtn = document.createElement('button');
            siteBtn.type = 'button';
            siteBtn.className = 'flight-action-btn';
            siteBtn.innerHTML = `${busIconSvg}<span>公式サイト</span>`;
            siteBtn.onclick = (e) => {
                e.stopPropagation();
                window.open(busData.url, '_blank', 'noopener,noreferrer');
            };
            btnContainer.appendChild(siteBtn);
        }

        if (opts.isPreview && typeof opts.onCreateCard === 'function') {
            const createBtn = document.createElement('button');
            createBtn.type = 'button';
            createBtn.className = 'flight-action-btn';
            createBtn.innerHTML = `${iconShare}<span>新規カード作成</span>`;
            createBtn.onclick = (e) => {
                e.stopPropagation();
                opts.onCreateCard();
            };
            btnContainer.appendChild(createBtn);
        }

        if (btnContainer.children.length > 0) container.appendChild(btnContainer);
    }

    render();
}
