// card-collapse.js - 開いたカードの「押し上げ」（航班カード以外）
// 下のパネルを捲ると、路線の編集と同じようにカード全体が上へ押し上げられ、
// 上側はぼかしの境目（カードの元の上端）の向こうへ消えていく。下縁だけが残り、
// カード名と燈號はその上に元の位置のまま表示される。空いた分だけパネルが広くなる。
// ・カードの形は変えない（角丸・質感はそのまま、上が境目で消えるだけ）
// ・カード名と燈號は別の層に写して元の位置に置く（本来のものはカードと一緒に上がるので隠す）
// ・カードの影は遮罩で消えるので、押し上げている間は残った部分の形の影の層に任せる
// ・パネルは押し上げた分だけ上がり、内容は指の動きと 1:1 で動く（二重に動かないよう補正する）
// ・捲り下げると押し上がり、上へ戻して先頭に近づくと戻る（先頭では必ず元の位置）
// ・押し上げたカードを押すと戻り、引き下ろすと指に合わせて戻る（script.js の手勢から操作）

const FEATHER = 45;      // ぼかしの幅（路線の編集と同じ）
const KEEP = 10;         // 押し上げきったとき、カード名と燈號の下に残す余白
const MIN_SAVING = 24;   // これより押し上げられないカードでは何もしない
const ANIM_MS = 420;

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

    let d = 0;            // 押し上げた量（px）
    let dMax = 0;
    let H = 0;
    let lastS = scrollWrapper.scrollTop;
    let suspended = false;
    let flipSuspended = false;
    let dragging = false;
    let animRaf = null;
    let applyRaf = null;
    let pendingD = null;
    let wasOn = false;
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
        applyRaf = null;
        if (pendingD === null) return;
        const v = pendingD;
        pendingD = null;
        const on = v > 0.5;

        if (on && !wasOn) {
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
        } else if (!on && wasOn) {
            for (const p of ['webkitMaskImage', 'maskImage', 'webkitMaskSize', 'maskSize', 'webkitMaskRepeat', 'maskRepeat', 'webkitMaskPosition', 'maskPosition', 'boxShadow', 'translate']) inner.style[p] = '';
            header.style.opacity = '';
            pinned.classList.remove('on');
            shadow.classList.remove('on');
        }
        wasOn = on;

        if (on) {
            // カードを上へ。境目（カードの元の上端）より上はぼかして消す（路線の編集と同じ）
            inner.style.translate = `0 ${-v}px`;
            const maskPos = `0px ${v - FEATHER}px`;
            inner.style.webkitMaskPosition = maskPos;
            inner.style.maskPosition = maskPos;
            shadow.style.height = `${H - v}px`;
        }
        extension.style.translate = on ? `0 ${-v}px` : '';
        // パネルが上がった分、捲る範囲の高さを足し、内容を同じだけ下げる
        //（内容は指と 1:1、パネルの上端にくっついて動く）
        scrollWrapper.style.height = on && origHeight ? `calc(${origHeight} + ${v}px)` : origHeight;
        scrollWrapper.style.setProperty('--cc-comp', `${v}px`);
        scrollWrapper.classList.toggle('cc-on', on);
    }

    function apply(v) {
        d = Math.max(0, Math.min(dMax, v));
        pendingD = d;
        if (!applyRaf) applyRaf = requestAnimationFrame(render);
    }

    function applyNow(v) {
        d = Math.max(0, Math.min(dMax, v));
        pendingD = d;
        if (applyRaf) { cancelAnimationFrame(applyRaf); applyRaf = null; }
        render();
    }

    function stopAnim() {
        if (animRaf) cancelAnimationFrame(animRaf);
        animRaf = null;
    }

    function animateTo(target, done) {
        stopAnim();
        const from = d;
        const to = Math.max(0, Math.min(dMax, target));
        if (Math.abs(from - to) < 0.5) { apply(to); lastS = scrollWrapper.scrollTop; if (done) done(); return; }
        const t0 = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3);
        const step = now => {
            const p = Math.min(1, (now - t0) / ANIM_MS);
            apply(from + (to - from) * ease(p));
            if (p < 1) animRaf = requestAnimationFrame(step);
            else { animRaf = null; lastS = scrollWrapper.scrollTop; if (done) done(); }
        };
        animRaf = requestAnimationFrame(step);
    }

    // 捲動：下へは捲った分だけ押し上げ、上へは「押し上げ量 ≦ 捲った位置」を保つ（先頭に近づくと戻る）
    function onScroll() {
        const s = scrollWrapper.scrollTop;
        const delta = s - lastS;
        lastS = s;
        if (suspended || flipSuspended || dragging || animRaf || !dMax) return;
        if (s <= 0) { if (d > 0) apply(0); return; }
        if (delta > 0) apply(Math.min(dMax, d + delta));
        else if (d > s) apply(s);
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
            applyNow(0);
        } else if (!flipping && flipSuspended) {
            flipSuspended = false;
            lastS = scrollWrapper.scrollTop;
        }
    });

    const onResize = () => { stopAnim(); applyNow(0); requestAnimationFrame(measure); };

    measure();
    scrollWrapper.addEventListener('scroll', onScroll, { passive: true });
    inner.addEventListener('click', onCardClick);
    pinned.addEventListener('click', onCardClick);
    flipObserver.observe(inner, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', onResize);

    return {
        getD: () => d,
        isActive: () => !suspended && !flipSuspended && dMax > 0,
        // 押し上げたカードを指で引くとき：指に合わせて動かす
        beginDrag() { stopAnim(); dragging = true; },
        dragTo(v) { apply(v); },
        endDrag(target) { dragging = false; animateTo(target); },
        expand() { animateTo(0); },
        // 路線の編集など、カードを別の動きで使う間は止めて元の位置に戻す
        // animated：押し上げていれば滑らかに戻してから resolve（すぐに次の動きへ移らないとき）
        suspend(animated = false) {
            suspended = true;
            if (animated && d > 0.5) return new Promise(resolve => animateTo(0, resolve));
            stopAnim();
            applyNow(0);
            return Promise.resolve();
        },
        resume() {
            suspended = false;
            lastS = scrollWrapper.scrollTop;
            measure();
        },
        destroy() {
            stopAnim();
            if (applyRaf) cancelAnimationFrame(applyRaf);
            scrollWrapper.removeEventListener('scroll', onScroll);
            inner.removeEventListener('click', onCardClick);
            window.removeEventListener('resize', onResize);
            flipObserver.disconnect();
            headerObserver.disconnect();
            pinned.remove();
            shadow.remove();
        }
    };
}
