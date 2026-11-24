// card-collapse.js - 開いたカードの「押し上げ」（航班カード以外）
// 下のパネルを捲ると、路線の編集と同じようにカード全体が上へ押し上げられ、
// 上側はカードの元の上端の向こうへ消えていく。下縁だけが残り、
// カード名と燈號は元の位置のまま表示される。空いた分だけパネルが広くなる。
// ・カードの形は変えない（角丸・質感はそのまま、上が境目で消えるだけ）
// ・カード名と燈號（.card-header）はカードの中のまま、上がった分だけ下げて元の位置に留める
//  （写しを作らないので、燈號の更新・色・毛玻璃はふだんと同じ）
// ・押し上げたカードを押すと戻り、引き下ろすと指に合わせて戻る（script.js の手勢から操作）
// 指（觸控）：
// ・パネルに指を置いて捲る間だけ、カードとパネルは指に 1:1 で付いてくる（自動では動かない）
// ・押し上げきったらそこで固定（その後は内容だけ捲れる。先頭へ戻しても勝手には戻らない）
// ・途中で指を離したら、指の向き（ゆっくりなら近いほう）へ収まって固定。離した後の慣性では動かさない
// ・戻すとき：カードを押す・引き下ろす、または内容の先頭でさらに引き下ろす（指に合わせて戻る）
// マウスの滾輪：
// ・捲り下げると押し上がり、上へ戻して先頭に近づくと戻る（先頭では必ず元の位置）
// ・パネル（枠・捲る範囲・内容の補正）は捲った位置からそのまま決め、遅れなしで動く
// ・カード本体はそれを速さの上限つきで追う（1 回で 100px 前後飛ぶので）。
//   追いつくまでの間、パネルはカードの下にもぐる（カードを上の層にする）
// 描画モード：
// ・品質：境目をぼかし（路線の編集と同じ遮罩）、残った部分の形の影を出す
// ・軽量（非蘋果裝置は常にこちら）：ぼかしと影を省き、元の上端で角丸のまま切る。
//   毎コマ描き直すもの（遮罩・大きな影）をなくし、動かすだけで済むようにする。
//   押し上げきったとき、カード名・燈號の上と下の余白が同じになるところで止める

const FEATHER = 45;      // ぼかしの幅（路線の編集と同じ）
const KEEP = 10;         // 押し上げきったとき、カード名と燈號の下に残す余白（品質）
const MIN_SAVING = 24;   // これより押し上げられないカードでは何もしない
const ANIM_MS = 420;
// 滾輪のときにカードがパネルを追う速さ：最高この速さで、近づくと緩やかに
const FOLLOW_SNAP = 24;        // 差がこれ以下（タッチパッドの細かい捲り）は遅れなしでそのまま
const FOLLOW_MAX_SPEED = 0.45; // px/ms（押し上げきるまで約 0.35 秒）
const FOLLOW_TAU = 70;         // 近づいたときの減速の時定数（ms）
// 指を離したときの収まり先：この速さ（px/ms）より速ければ指の向きへ、遅ければ近いほうへ
const RELEASE_FLICK = 0.2;

// 路線の編集と同じ遮罩（多段の透明度で境目の縞を出さない）
const MASK = `linear-gradient(to bottom,
    transparent 0px,
    transparent 2px,
    rgba(0,0,0,0.02) 6px,
    rgba(0,0,0,0.09) 12px,
    rgba(0,0,0,0.25) 18px,
    rgba(0,0,0,0.50) 24px,
    rgba(0,0,0,0.75) 30px,
    rgba(0,0,0,0.91) 36px,
    rgba(0,0,0,0.98) 40px,
    black ${FEATHER}px,
    black 100%)`;

const INNER_PROPS = ['webkitMaskImage', 'maskImage', 'webkitMaskSize', 'maskSize', 'webkitMaskRepeat', 'maskRepeat',
    'webkitMaskPosition', 'maskPosition', 'webkitClipPath', 'clipPath', 'boxShadow', 'translate', 'zIndex'];
const HEADER_PROPS = ['translate', 'zIndex', 'willChange'];

const isLiteMode = () => document.documentElement.classList.contains('is-android-fallback');

export function attachCardCollapse({ container, inner, extension, scrollWrapper }) {
    if (!container || !inner || !extension || !scrollWrapper) return null;
    const header = inner.querySelector('.card-header');
    if (!header) return null;

    let d = 0;            // カードを押し上げた量（px）
    let p = 0;            // パネルを上げた量（px）。捲動からそのまま決まり、d はこれを追う
    // 内容を下げる量（px、0〜p）。p と同じなら内容は捲動と 1:1（枠だけが動く）、
    // 0 なら内容は枠にくっついて一緒に動く（指で押し上げて固定した後は、捲る位置に移して 0 にする）
    let comp = 0;
    let dMaxQ = 0;        // 押し上げの最大（品質：カード名・燈號の下に KEEP の余白）
    let dMaxL = 0;        // 押し上げの最大（軽量：カード名・燈號の上下の余白を同じに）
    let shownD = 0;       // カードに今かけている押し上げ量（測るときの補正用）
    let H = 0;
    let radius = '32px';
    let lastS = scrollWrapper.scrollTop;
    let suspended = false;
    let flipSuspended = false;
    let dragging = false;
    let dragD0 = 0;
    let dragP0 = 0;
    let animRaf = null;
    let renderRaf = null;
    let followRaf = null;
    let followLast = null;
    let cardWasOn = false;
    let panelWasOn = false;
    let lite = false;
    // 最後の入力が指か（指：カードも 1:1、滾輪・マウス：速さの上限つき）
    let byTouch = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
    const origHeight = scrollWrapper.style.height;

    // 残った部分の形の影（品質のみ。カードの後ろ、透明な箱の外側にだけ影が出る）
    const shadow = document.createElement('div');
    shadow.className = 'card-collapse-shadow';
    shadow.setAttribute('aria-hidden', 'true');
    inner.before(shadow);

    scrollWrapper.style.overflowAnchor = 'none';

    const maxNow = () => (isLiteMode() ? dMaxL : dMaxQ);
    const clamp = v => Math.max(0, Math.min(maxNow(), v));

    function measure() {
        H = inner.offsetHeight;
        // カードの上端からの位置で測る（開く動き・押し上げの移動は差を取って打ち消す）
        const ir = inner.getBoundingClientRect();
        const hr = header.getBoundingClientRect();
        const off = hr.top - ir.top - shownD;
        const headerBottom = off + hr.height;
        // カード名・燈號そのもの（余白を除いた）上端・下端
        let top = Infinity, bottom = -Infinity;
        for (const el of header.children) {
            const r = el.getBoundingClientRect();
            if (r.height <= 0) continue;
            top = Math.min(top, r.top - hr.top);
            bottom = Math.max(bottom, r.bottom - hr.top);
        }
        if (top === Infinity) { top = 0; bottom = hr.height; }
        const contentTop = off + top;
        const contentBottom = off + bottom;
        const fit = v => (v < MIN_SAVING ? 0 : v);
        dMaxQ = fit(Math.max(0, H - (headerBottom + KEEP)));
        // 軽量は元の上端で切るので、残す高さ ＝ 上の余白 ＋ 中身 ＋ 下の余白（上と同じ）
        dMaxL = fit(Math.max(0, H - (contentBottom + contentTop)));
        const cs = getComputedStyle(inner);
        radius = cs.borderTopLeftRadius || '32px';
        Object.assign(shadow.style, {
            top: `${inner.offsetTop}px`,
            height: `${H}px`,
            borderRadius: radius,
            boxShadow: cs.boxShadow
        });
    }

    // パネルの内容を comp だけ下げる
    // 子ごとに直接 translate を置く（変数で渡すと内容全体の style を毎コマ計算し直すことになる）
    function placeContent() {
        const v = comp > 0.5 ? `0 ${comp}px` : '';
        for (const c of scrollWrapper.children) if (c.style.translate !== v) c.style.translate = v;
    }

    function render() {
        if (renderRaf) { cancelAnimationFrame(renderRaf); renderRaf = null; }
        const cardOn = d > 0.5;
        const panelOn = p > 0.5;

        // 押し上げ中に描画モードが切り替わったとき：いったん外してから新しいモードで付け直す
        if (cardOn && cardWasOn && isLiteMode() !== lite) {
            for (const k of INNER_PROPS) inner.style[k] = '';
            shadow.classList.remove('on');
            cardWasOn = false;
            d = clamp(d);   // 最大の量はモードごとに違う
            setP(p, false);
        }

        // カード本体（d）
        if (cardOn && !cardWasOn) {
            lite = isLiteMode();
            if (lite) {
                inner.style.boxShadow = 'none';
            } else {
                inner.style.webkitMaskImage = MASK;
                inner.style.maskImage = MASK;
                inner.style.webkitMaskSize = '100% 3000px';
                inner.style.maskSize = '100% 3000px';
                inner.style.webkitMaskRepeat = 'no-repeat';
                inner.style.maskRepeat = 'no-repeat';
                inner.style.boxShadow = 'none';
                shadow.classList.add('on');
            }
            // カード名・燈號はカードの内容より上の層に（内容はその下を通って消える）
            header.style.zIndex = '3';
            header.style.willChange = 'translate';
        } else if (!cardOn && cardWasOn) {
            for (const k of INNER_PROPS) inner.style[k] = '';
            for (const k of HEADER_PROPS) header.style[k] = '';
            shadow.classList.remove('on');
        }
        cardWasOn = cardOn;
        shownD = cardOn ? d : 0;
        if (cardOn) {
            // カードを上へ、カード名・燈號は同じだけ下げて元の位置に
            inner.style.translate = `0 ${-d}px`;
            header.style.translate = `0 ${d}px`;
            if (lite) {
                // 元の上端で角丸のまま切る
                const clip = `inset(${d}px 0 0 0 round ${radius})`;
                inner.style.webkitClipPath = clip;
                inner.style.clipPath = clip;
            } else {
                // 境目（カードの元の上端）より上はぼかして消す（路線の編集と同じ）
                const maskPos = `0px ${d - FEATHER}px`;
                inner.style.webkitMaskPosition = maskPos;
                inner.style.maskPosition = maskPos;
                shadow.style.height = `${H - d}px`;
            }
        }
        // パネルがカードより先に上がったとき、カードの下にもぐるように（カードと影を上の層に）
        const lift = cardOn || panelOn;
        inner.style.zIndex = lift ? '2' : '';
        shadow.style.zIndex = lift ? '1' : '';

        // パネル（p）：枠を上げた分、捲る範囲の高さを足し、内容を comp だけ下げる
        if (panelOn || panelWasOn || comp > 0.5) {
            extension.style.translate = panelOn ? `0 ${-p}px` : '';
            scrollWrapper.style.height = panelOn && origHeight ? `calc(${origHeight} + ${p}px)` : origHeight;
            placeContent();
        }
        panelWasOn = panelOn;
    }

    function schedule() {
        if (!renderRaf) renderRaf = requestAnimationFrame(() => { renderRaf = null; render(); });
    }

    // カードとパネルを同じ量にそろえる（押したとき・引いたとき・止めるとき）
    function setBoth(v, now = false) {
        d = clamp(v);
        setP(d, false);
        if (now) render(); else schedule();
    }

    // パネルの量を変える。keepContent：内容を画面上で動かさない（捲動と 1:1。下げる量も同じだけ変える）。
    // そうでなければ内容は枠と一緒に動く（下げる量は p を超えない範囲でそのまま）
    function setP(v, keepContent) {
        const np = clamp(v);
        comp = keepContent ? Math.max(0, Math.min(np, comp + (np - p))) : Math.min(comp, np);
        p = np;
    }

    function stopFollow() {
        if (followRaf) cancelAnimationFrame(followRaf);
        followRaf = null;
    }

    function stopAnim() {
        if (animRaf) cancelAnimationFrame(animRaf);
        animRaf = null;
        stopFollow();
    }

    // 滾輪のとき、カードがパネルを追う：小さな差はそのまま、大きな差は速さの上限つきで滑らかに
    function follow() {
        if (followRaf) return;
        if (Math.abs(p - d) <= FOLLOW_SNAP) { d = p; return; }
        followLast = null;
        const step = now => {
            const dt = followLast === null ? 16 : Math.min(64, Math.max(1, now - followLast));
            followLast = now;
            const diff = p - d;
            const dist = Math.abs(diff);
            if (dist < 0.5) { d = p; followRaf = null; render(); return; }
            const ease = dist * (1 - Math.exp(-dt / FOLLOW_TAU));
            const move = Math.min(dist, FOLLOW_MAX_SPEED * dt, Math.max(ease, 0.02 * dt));
            d = clamp(d + Math.sign(diff) * move);
            render();
            followRaf = requestAnimationFrame(step);
        };
        followRaf = requestAnimationFrame(step);
    }

    // カードとパネルをそれぞれ今の位置から to へ（同じ時間で一緒に着く）
    function animateTo(to, done) {
        stopAnim();
        const dest = clamp(to);
        const d0 = d, p0 = p;
        const finish = () => { animRaf = null; lastS = scrollWrapper.scrollTop; if (done) done(); };
        if (Math.abs(d0 - dest) < 0.5 && Math.abs(p0 - dest) < 0.5) { setBoth(dest); finish(); return; }
        const t0 = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3);
        const step = now => {
            const k = ease(Math.min(1, (now - t0) / ANIM_MS));
            d = clamp(d0 + (dest - d0) * k);
            setP(p0 + (dest - p0) * k, false);
            render();
            if (k < 1) animRaf = requestAnimationFrame(step);
            else finish();
        };
        animRaf = requestAnimationFrame(step);
    }

    // 捲動（どれもブラウザの捲動のまま）
    function onScroll() {
        const s = scrollWrapper.scrollTop;
        const delta = s - lastS;
        lastS = s;
        if (suspended || flipSuspended || dragging || animRaf || !maxNow() || delta === 0) return;
        if (byTouch) {
            // 指：指が触れている間だけ、捲った分を 1:1 で（離した後の慣性・自動の捲動では動かさない）。
            // 押し上げきったら固定（その後は内容だけ捲れる）
            if (!touching || pulling || d >= maxNow() - 0.5) { scheduleRebase(); return; }
            setP(s <= 0 ? 0 : p + delta, true);
            stopFollow();
            d = p;
            schedule();
            return;
        }
        // 滾輪：下へは捲った分だけパネルを上げ、上へは「上げた量 ≦ 捲った位置」を保つ（先頭に近づくと戻る）。
        // 既にこれを超えているとき（指から替わった直後など）は、跳ばずに先頭へ向けて比例で減らす
        if (s <= 0) setP(0, true);
        else if (delta > 0) setP(p + delta, true);
        else if (p > s) setP(Math.max(s, p * s / (s - delta)), true);
        follow();
        schedule();
    }

    // 指で押し上げて固定した後、捲動が止まったら：内容を下げている分を捲る位置へ移す（見た目は変わらない）。
    // こうしておくと、内容の先頭へ戻したとき枠の上に空きができず、先頭で引き下ろすと内容も枠と一緒に動く。
    // 先頭まで戻していて移しきれない分は、内容を枠の上端へ寄せる
    let rebaseTimer = null;
    function scheduleRebase() {
        if (rebaseTimer) clearTimeout(rebaseTimer);
        rebaseTimer = setTimeout(rebase, 150);
    }
    function rebase() {
        rebaseTimer = null;
        if (!byTouch || touching || dragging || animRaf || suspended || flipSuspended || comp < 0.5) return;
        if (d < maxNow() - 0.5) return;
        const s = scrollWrapper.scrollTop;
        const k = Math.min(comp, s);
        if (k >= 0.5) {
            comp -= k;
            lastS = s - k;
            scrollWrapper.scrollTop = s - k;
            render();
        }
        if (comp >= 0.5) settleContent();
    }
    function settleContent() {
        const c0 = comp;
        const t0 = performance.now();
        const step = now => {
            if (touching || dragging) { animRaf = null; return; }
            const k = Math.min(1, (now - t0) / 260);
            comp = c0 * (1 - (1 - Math.pow(1 - k, 3)));
            render();
            if (k < 1) animRaf = requestAnimationFrame(step);
            else { animRaf = null; comp = 0; render(); lastS = scrollWrapper.scrollTop; }
        };
        animRaf = requestAnimationFrame(step);
    }

    // ---- 指 ----
    let touching = false;
    let pulling = false;        // 内容の先頭で引き下ろして、押し上げたカードを戻しているところ
    let pullCandidate = false;
    let touchStartY = 0;
    let touchLastY = 0;
    let moves = [];             // 指を離したときの速さを出すための直近の位置

    function fingerVelocity(at) {
        // 直近 100ms の指の速さ（px/ms、下向きが正）。止めてから離したときは 0
        const last = moves[moves.length - 1];
        if (!last || at - last.t > 80) return 0;
        const first = moves.find(m => last.t - m.t <= 100) || last;
        const dt = last.t - first.t;
        return dt > 0 ? (last.y - first.y) / dt : 0;
    }

    function onTouchStart(e) {
        byTouch = true;
        if (e.touches.length > 1) return;
        touching = true;
        pulling = false;
        touchStartY = touchLastY = e.touches[0].clientY;
        moves = [{ t: e.timeStamp, y: touchStartY }];
        // 収まる途中で触れたら、そこで止めて指に任せる
        if (animRaf || followRaf) stopAnim();
        lastS = scrollWrapper.scrollTop;
        pullCandidate = scrollWrapper.scrollTop <= 0 && d > 0.5 && !suspended && !flipSuspended && !dragging;
    }

    function onTouchMove(e) {
        if (!touching) return;
        if (e.touches.length > 1) { touching = false; pulling = false; pullCandidate = false; return; }
        const y = e.touches[0].clientY;
        const dy = y - touchLastY;
        touchLastY = y;
        moves.push({ t: e.timeStamp, y });
        if (moves.length > 12) moves.shift();
        // 内容の先頭で最初に下へ引いたら、カードを戻す手勢（内容は捲らない）
        if (pullCandidate && y !== touchStartY) {
            pullCandidate = false;
            pulling = y > touchStartY && scrollWrapper.scrollTop <= 0 && e.cancelable;
        }
        if (pulling) {
            if (e.cancelable) e.preventDefault();
            setBoth(d - dy);
        }
    }

    // 指を離したとき：途中なら指の向き（ゆっくりなら近いほう）へ収めて固定
    function onTouchEnd(e) {
        if (e.touches && e.touches.length > 0) return;
        if (!touching) return;
        touching = false;
        pulling = false;
        pullCandidate = false;
        if (!byTouch || suspended || flipSuspended || dragging || animRaf) return;
        const max = maxNow();
        if (!(d > 0.5 && d < max - 0.5)) { scheduleRebase(); return; }
        const v = fingerVelocity(e.timeStamp);
        const to = v < -RELEASE_FLICK ? max : v > RELEASE_FLICK ? 0 : (d > max / 2 ? max : 0);
        animateTo(to, scheduleRebase);
    }

    const markMouse = e => { if (e.type !== 'pointerdown' || e.pointerType === 'mouse') byTouch = false; };

    // カードを押したとき（マウス）：押し上げていれば戻す
    function onCardClick(e) {
        if (d > 0.5 && !suspended && !flipSuspended) {
            e.stopPropagation();
            animateTo(0);
        }
    }

    // 個人化（カードの裏返し）中は押し上げを解除して止める
    const flipObserver = new MutationObserver(() => {
        const flipping = /\bflip-/.test(inner.className);
        if (flipping && !flipSuspended) {
            flipSuspended = true;
            stopAnim();
            setBoth(0, true);
        } else if (!flipping && flipSuspended) {
            flipSuspended = false;
            lastS = scrollWrapper.scrollTop;
        }
    });
    // 描画モードが切り替わったら、押し上げ中ならすぐ付け直す
    const modeObserver = new MutationObserver(() => { if (cardWasOn && isLiteMode() !== lite) render(); });
    // パネルの内容が入れ替わったとき、新しい列にも補正を
    const contentObserver = new MutationObserver(() => { if (panelWasOn) placeContent(); });

    const onResize = () => { stopAnim(); setBoth(0, true); requestAnimationFrame(measure); };

    measure();
    scrollWrapper.addEventListener('scroll', onScroll, { passive: true });
    scrollWrapper.addEventListener('touchstart', onTouchStart, { passive: true });
    // 先頭で引き下ろすときだけ捲動を止めるので passive にしない（処理は軽い）
    scrollWrapper.addEventListener('touchmove', onTouchMove, { passive: false });
    scrollWrapper.addEventListener('touchend', onTouchEnd, { passive: true });
    scrollWrapper.addEventListener('touchcancel', onTouchEnd, { passive: true });
    scrollWrapper.addEventListener('wheel', markMouse, { passive: true });
    scrollWrapper.addEventListener('pointerdown', markMouse, { passive: true });
    window.addEventListener('keydown', markMouse);
    inner.addEventListener('click', onCardClick);
    flipObserver.observe(inner, { attributes: true, attributeFilter: ['class'] });
    contentObserver.observe(scrollWrapper, { childList: true });
    modeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', onResize);

    return {
        getD: () => d,
        isActive: () => !suspended && !flipSuspended && maxNow() > 0,
        // 押し上げたカードを指で引くとき：指に合わせて動かす（パネルも同じ割合で一緒に戻る）
        beginDrag() { stopAnim(); dragging = true; dragD0 = d; dragP0 = p; },
        dragTo(v) {
            d = clamp(v);
            setP(dragD0 > 0.5 ? dragP0 * (d / dragD0) : d, false);
            schedule();
        },
        endDrag(to) { dragging = false; animateTo(to); },
        expand() { animateTo(0); },
        // 路線の編集など、カードを別の動きで使う間は止めて元の位置に戻す
        // animated：押し上げていれば滑らかに戻してから resolve（すぐに次の動きへ移らないとき）
        suspend(animated = false) {
            suspended = true;
            if (animated && (d > 0.5 || p > 0.5)) return new Promise(resolve => animateTo(0, resolve));
            stopAnim();
            setBoth(0, true);
            return Promise.resolve();
        },
        resume() {
            suspended = false;
            lastS = scrollWrapper.scrollTop;
            measure();
        },
        destroy() {
            stopAnim();
            if (rebaseTimer) clearTimeout(rebaseTimer);
            if (renderRaf) cancelAnimationFrame(renderRaf);
            scrollWrapper.removeEventListener('scroll', onScroll);
            scrollWrapper.removeEventListener('touchstart', onTouchStart);
            scrollWrapper.removeEventListener('touchmove', onTouchMove);
            scrollWrapper.removeEventListener('touchend', onTouchEnd);
            scrollWrapper.removeEventListener('touchcancel', onTouchEnd);
            scrollWrapper.removeEventListener('wheel', markMouse);
            scrollWrapper.removeEventListener('pointerdown', markMouse);
            window.removeEventListener('keydown', markMouse);
            inner.removeEventListener('click', onCardClick);
            window.removeEventListener('resize', onResize);
            flipObserver.disconnect();
            contentObserver.disconnect();
            modeObserver.disconnect();
            shadow.remove();
            for (const k of INNER_PROPS) inner.style[k] = '';
            for (const k of HEADER_PROPS) header.style[k] = '';
        }
    };
}
