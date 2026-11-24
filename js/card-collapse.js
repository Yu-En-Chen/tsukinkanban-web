// card-collapse.js - 開いたカードの「押し上げ」（航班カード以外）
// 下のパネルを捲ると、路線の編集と同じようにカード全体が上へ押し上げられ、
// 上側はぼかしの境目（カードの元の上端）の向こうへ消えていく。下縁だけが残り、
// カード名と燈號はその上に元の位置のまま表示される。空いた分だけパネルが広くなる。
// ・カードの形は変えない（角丸・質感はそのまま、上が境目で消えるだけ）
// ・カード名と燈號は別の層に写して元の位置に置く（本来のものはカードと一緒に上がるので隠す）
// ・カードの影は遮罩で消えるので、押し上げている間は残った部分の形の影の層に任せる
// ・捲り下げると押し上がり、上へ戻して先頭に近づくと戻る（先頭では必ず元の位置）
// ・押し上げたカードを押すと戻り、引き下ろすと指に合わせて戻る（script.js の手勢から操作）
// 動きは 2 つに分ける：
// ・パネル（枠・捲る範囲・内容の補正）：捲った位置からそのまま決め、遅れなしで動く。
//   内容は捲動と 1:1 なので、枠も同じだけ動けば枠と内容がずれない（揺れない）
// ・カード本体：パネルの量を速さの上限つきで追う（マウスの滾輪で一瞬で出入りしないように）。
//   追いつくまでの間、パネルはカードの下にもぐる（カードを上の層にする）

const FEATHER = 45;      // ぼかしの幅（路線の編集と同じ）
const KEEP = 10;         // 押し上げきったとき、カード名と燈號の下に残す余白
const MIN_SAVING = 24;   // これより押し上げられないカードでは何もしない
const ANIM_MS = 420;
// カードがパネルを追う速さ：滾輪は 1 回で 100px 前後飛ぶので、最高この速さで、近づくと緩やかに
const FOLLOW_SNAP = 24;        // 差がこれ以下（指でゆっくり捲るとき）は遅れなしでそのまま
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

export function attachCardCollapse({ container, inner, extension, scrollWrapper }) {
    if (!container || !inner || !extension || !scrollWrapper) return null;
    const header = inner.querySelector('.card-header');
    if (!header) return null;

    let d = 0;            // カードを押し上げた量（px）
    let p = 0;            // パネルを上げた量（px）。捲動からそのまま決まり、d はこれを追う
    let dMax = 0;
    let H = 0;
    let lastS = scrollWrapper.scrollTop;
    let suspended = false;
    let flipSuspended = false;
    let dragging = false;
    let dragD0 = 0;
    let dragP0 = 0;
    let animRaf = null;
    let renderRaf = null;
    let followRaf = null;
    let followLast = 0;
    let cardWasOn = false;
    const origHeight = scrollWrapper.style.height;

    // 元の位置に残すカード名と燈號（本来のものの写し）
    const pinned = document.createElement('div');
    pinned.className = 'card-collapse-header';
    pinned.innerHTML = header.outerHTML;
    inner.after(pinned);
    const syncHeader = () => { pinned.innerHTML = header.outerHTML; };
    const headerObserver = new MutationObserver(syncHeader);
    headerObserver.observe(header, { subtree: true, childList: true, characterData: true });

    // 残った部分の形の影（カードの後ろ。透明な箱の外側にだけ影が出る）
    const shadow = document.createElement('div');
    shadow.className = 'card-collapse-shadow';
    shadow.setAttribute('aria-hidden', 'true');
    inner.before(shadow);

    scrollWrapper.style.overflowAnchor = 'none';

    const clamp = v => Math.max(0, Math.min(dMax, v));

    function measure() {
        H = inner.offsetHeight;
        dMax = Math.max(0, H - (header.offsetHeight + KEEP));
        if (dMax < MIN_SAVING) dMax = 0;
        const cs = getComputedStyle(inner);
        Object.assign(shadow.style, {
            top: `${inner.offsetTop}px`,
            height: `${H}px`,
            borderRadius: cs.borderTopLeftRadius || '32px',
            boxShadow: cs.boxShadow
        });
        pinned.style.top = `${inner.offsetTop}px`;
    }

    // カードの色（文字色などの変数）と暗色時の filter を写しに合わせる
    function matchTheme() {
        for (let i = 0; i < inner.style.length; i++) {
            const prop = inner.style[i];
            if (prop.startsWith('--')) pinned.style.setProperty(prop, inner.style.getPropertyValue(prop), inner.style.getPropertyPriority(prop));
        }
        pinned.style.filter = getComputedStyle(inner).filter;
    }

    function render() {
        if (renderRaf) { cancelAnimationFrame(renderRaf); renderRaf = null; }
        const cardOn = d > 0.5;
        const panelOn = p > 0.5;

        // カード本体（d）
        if (cardOn && !cardWasOn) {
            matchTheme();
            syncHeader();
            inner.style.webkitMaskImage = MASK;
            inner.style.maskImage = MASK;
            inner.style.webkitMaskSize = '100% 3000px';
            inner.style.maskSize = '100% 3000px';
            inner.style.webkitMaskRepeat = 'no-repeat';
            inner.style.maskRepeat = 'no-repeat';
            inner.style.boxShadow = 'none';
            header.style.opacity = '0';
            pinned.classList.add('on');
            shadow.classList.add('on');
        } else if (!cardOn && cardWasOn) {
            for (const k of ['webkitMaskImage', 'maskImage', 'webkitMaskSize', 'maskSize', 'webkitMaskRepeat', 'maskRepeat', 'webkitMaskPosition', 'maskPosition', 'boxShadow', 'translate']) inner.style[k] = '';
            header.style.opacity = '';
            pinned.classList.remove('on');
            shadow.classList.remove('on');
        }
        cardWasOn = cardOn;
        if (cardOn) {
            // カードを上へ。境目（カードの元の上端）より上はぼかして消す（路線の編集と同じ）
            inner.style.translate = `0 ${-d}px`;
            const maskPos = `0px ${d - FEATHER}px`;
            inner.style.webkitMaskPosition = maskPos;
            inner.style.maskPosition = maskPos;
            shadow.style.height = `${H - d}px`;
        }
        // パネルがカードより先に上がったとき、カードの下にもぐるように（カードと影を上の層に）
        const lift = cardOn || panelOn;
        inner.style.zIndex = lift ? '2' : '';
        shadow.style.zIndex = lift ? '1' : '';

        // パネル（p）：枠を上げた分、捲る範囲の高さを足し、内容を同じだけ下げる
        //（内容は捲動と 1:1、枠も同じ量で動くので枠と内容がずれない）
        extension.style.translate = panelOn ? `0 ${-p}px` : '';
        scrollWrapper.style.height = panelOn && origHeight ? `calc(${origHeight} + ${p}px)` : origHeight;
        scrollWrapper.style.setProperty('--cc-comp', `${panelOn ? p : 0}px`);
        scrollWrapper.classList.toggle('cc-on', panelOn);
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

    // カードがパネルを追う：小さな差はそのまま、大きな差は速さの上限つきで滑らかに
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
        if (suspended || flipSuspended || dragging || animRaf || !dMax || delta === 0) return;
        if (s <= 0) p = 0;
        else if (delta > 0) p = clamp(p + delta);
        else if (p > s) p = s;
        follow();
        schedule();
    }

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

    const onResize = () => { stopAnim(); setBoth(0, true); requestAnimationFrame(measure); };

    measure();
    scrollWrapper.addEventListener('scroll', onScroll, { passive: true });
    inner.addEventListener('click', onCardClick);
    pinned.addEventListener('click', onCardClick);
    flipObserver.observe(inner, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', onResize);

    return {
        getD: () => d,
        isActive: () => !suspended && !flipSuspended && dMax > 0,
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
            inner.removeEventListener('click', onCardClick);
            window.removeEventListener('resize', onResize);
            flipObserver.disconnect();
            headerObserver.disconnect();
            pinned.remove();
            shadow.remove();
            inner.style.zIndex = '';
        }
    };
}
