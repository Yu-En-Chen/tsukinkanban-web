// card-collapse.js - 開いたカードの「押し上げ」（航班カード以外）
// 下のパネルを捲ると、路線の編集と同じようにカード全体が上へ押し上げられ、
// 上側はカードの元の上端の向こうへ消えていく。下縁だけが残り、
// カード名と燈號は元の位置のまま表示される。空いた分だけパネルが広くなる。
// ・カードの形は変えない（角丸・質感はそのまま、上が境目で消えるだけ）
// ・カード名と燈號（.card-header）はカードの中のまま、上がった分だけ下げて元の位置に留める
//  （写しを作らないので、燈號の更新・色・毛玻璃はふだんと同じ）
// ・捲り下げると押し上がり、上へ戻して先頭に近づくと戻る（先頭では必ず元の位置）
// ・押し上げたカードを押すと戻り、引き下ろすと指に合わせて戻る（script.js の手勢から操作）
// 動きは 2 つに分ける：
// ・パネル（枠・捲る範囲・内容の補正）：捲った位置からそのまま決め、遅れなしで動く
// ・カード本体：指で捲るときはパネルと同じく指に 1:1。マウスの滾輪のときだけ
//   速さの上限つきで追う（1 回で 100px 前後飛ぶので、一瞬で出入りしないように）。
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

    // パネルの内容を、パネルが上がった分だけ下げる（内容は捲動と 1:1）
    // 子ごとに直接 translate を置く（変数で渡すと内容全体の style を毎コマ計算し直すことになる）
    function placeContent() {
        const v = p > 0.5 ? `0 ${p}px` : '';
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
            p = clamp(p);
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

        // パネル（p）：枠を上げた分、捲る範囲の高さを足し、内容を同じだけ下げる
        //（内容は捲動と 1:1、枠も同じ量で動くので枠と内容がずれない）
        if (panelOn || panelWasOn) {
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
        d = p = clamp(v);
        if (now) render(); else schedule();
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
            p = clamp(p0 + (dest - p0) * k);
            render();
            if (k < 1) animRaf = requestAnimationFrame(step);
            else finish();
        };
        animRaf = requestAnimationFrame(step);
    }

    // 捲動（指・滾輪・捲軸、どれもブラウザの捲動のまま）：
    // 下へは捲った分だけパネルを上げ、上へは「上げた量 ≦ 捲った位置」を保つ（先頭に近づくと戻る）
    function onScroll() {
        const s = scrollWrapper.scrollTop;
        const delta = s - lastS;
        lastS = s;
        if (suspended || flipSuspended || dragging || animRaf || !maxNow() || delta === 0) return;
        if (s <= 0) p = 0;
        else if (delta > 0) p = clamp(p + delta);
        else if (p > s) p = s;
        if (byTouch) { stopFollow(); d = p; }
        else follow();
        schedule();
    }

    const markTouch = () => { byTouch = true; };
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
    // パネルの内容が入れ替わったとき、新しい列にも補正を
    const contentObserver = new MutationObserver(() => { if (panelWasOn) placeContent(); });

    const onResize = () => { stopAnim(); setBoth(0, true); requestAnimationFrame(measure); };

    measure();
    scrollWrapper.addEventListener('scroll', onScroll, { passive: true });
    scrollWrapper.addEventListener('touchstart', markTouch, { passive: true });
    scrollWrapper.addEventListener('wheel', markMouse, { passive: true });
    scrollWrapper.addEventListener('pointerdown', markMouse, { passive: true });
    window.addEventListener('keydown', markMouse);
    inner.addEventListener('click', onCardClick);
    flipObserver.observe(inner, { attributes: true, attributeFilter: ['class'] });
    contentObserver.observe(scrollWrapper, { childList: true });
    window.addEventListener('resize', onResize);

    return {
        getD: () => d,
        isActive: () => !suspended && !flipSuspended && maxNow() > 0,
        // 押し上げたカードを指で引くとき：指に合わせて動かす（パネルも同じ割合で一緒に戻る）
        beginDrag() { stopAnim(); dragging = true; dragD0 = d; dragP0 = p; },
        dragTo(v) {
            d = clamp(v);
            p = dragD0 > 0.5 ? clamp(dragP0 * (d / dragD0)) : d;
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
            if (renderRaf) cancelAnimationFrame(renderRaf);
            scrollWrapper.removeEventListener('scroll', onScroll);
            scrollWrapper.removeEventListener('touchstart', markTouch);
            scrollWrapper.removeEventListener('wheel', markMouse);
            scrollWrapper.removeEventListener('pointerdown', markMouse);
            window.removeEventListener('keydown', markMouse);
            inner.removeEventListener('click', onCardClick);
            window.removeEventListener('resize', onResize);
            flipObserver.disconnect();
            contentObserver.disconnect();
            shadow.remove();
            for (const k of INNER_PROPS) inner.style[k] = '';
            for (const k of HEADER_PROPS) header.style[k] = '';
        }
    };
}
