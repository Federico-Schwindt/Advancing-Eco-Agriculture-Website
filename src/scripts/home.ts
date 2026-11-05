import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => matchMedia('(max-width: 700px)').matches;
const conn = (navigator as any).connection;
const saveData = !!(conn && (conn.saveData || /2g/.test(conn.effectiveType || '')));

// Keep ScrollTrigger in sync with Lenis smooth scrolling
const lenis = (window as any).__lenis;
if (lenis) lenis.on('scroll', ScrollTrigger.update);

/* ---------------------------------------------------------------------------
   HERO — poster paints first (LCP), video streams in after load
--------------------------------------------------------------------------- */
const heroVideo = $<HTMLVideoElement>('[data-hero-video]');
function startHeroVideo() {
  if (!heroVideo || reduced || saveData) return;
  heroVideo.src = narrow() ? heroVideo.dataset.narrow! : heroVideo.dataset.wide!;
  heroVideo.addEventListener('playing', () => heroVideo.classList.add('is-ready'), { once: true });
  heroVideo.play().catch(() => {});
}
if (document.readyState === 'complete') setTimeout(startHeroVideo, 200);
else addEventListener('load', () => setTimeout(startHeroVideo, 200), { once: true });

if (!reduced) {
  gsap.to('[data-hero-media]', {
    yPercent: 18, scale: 1.08, ease: 'none',
    scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('[data-hero-content]', {
    yPercent: -12, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '[data-hero]', start: '30% top', end: 'bottom top', scrub: true },
  });
  // pause the hero video once off-screen
  ScrollTrigger.create({
    trigger: '[data-hero]', start: 'top top', end: 'bottom top',
    onLeave: () => heroVideo?.pause(),
    onEnterBack: () => heroVideo?.src && heroVideo.play().catch(() => {}),
  });
}

/* ---------------------------------------------------------------------------
   Count-up numbers
--------------------------------------------------------------------------- */
$$('[data-count]').forEach((el) => {
  const end = +el.dataset.count!;
  const comma = el.dataset.format === 'comma';
  const render = (v: number) => (el.textContent = comma ? Math.round(v).toLocaleString('en-US') : String(Math.round(v)));
  if (reduced) return render(end);
  const o = { v: 0 };
  render(0);
  ScrollTrigger.create({
    trigger: el, start: 'top bottom', once: true,
    onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'expo.out', onUpdate: () => render(o.v) }),
  });
});

/* ---------------------------------------------------------------------------
   Manifesto — words light up as you read
--------------------------------------------------------------------------- */
const mText = $('[data-scrub-words]');
if (mText) {
  const words: HTMLElement[] = [];
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        (n.textContent || '').split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(part));
          const s = document.createElement('span');
          s.className = 'sw';
          s.textContent = part;
          words.push(s);
          frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        const e = n as HTMLElement;
        if (e.classList.contains('pill-img') || e.tagName === 'EM') { e.classList.add('sw'); words.push(e); }
        else walk(e);
      }
    });
  };
  walk(mText);
  if (reduced) words.forEach((w) => (w.style.opacity = '1'));
  else
    ScrollTrigger.create({
      trigger: mText, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: (st) => {
        const lit = st.progress * words.length * 1.05;
        words.forEach((w, i) => (w.style.opacity = String(Math.min(1, Math.max(0.14, lit - i + 0.14)))));
      },
    });
}

/* ---------------------------------------------------------------------------
   DESCENT — scroll-scrubbed video (fetched as a blob for instant seeking)
--------------------------------------------------------------------------- */
const descent = $('[data-descent]');
const dVideo = $<HTMLVideoElement>('[data-descent-video]');
const chapters = $$('[data-chapter]');
const depthEl = $('[data-depth]');
const depthMarker = $('[data-depth-marker]');
const dProg = $('[data-descent-progress]');
let dTarget = 0, dCurrent = 0, dReady = false, dActive = false;

if (descent && dVideo) {
  const load = () => {
    const src = narrow() ? dVideo.dataset.narrow! : dVideo.dataset.wide!;
    fetch(src)
      .then((r) => r.blob())
      .then((b) => {
        dVideo.src = URL.createObjectURL(b);
        dVideo.addEventListener('loadeddata', () => {
          // iOS needs a play/pause before seeks render frames
          dVideo.play().then(() => dVideo.pause()).catch(() => {}).finally(() => {
            dReady = true;
            dVideo.currentTime = dCurrent * (dVideo.duration || 8);
            dVideo.classList.add('is-ready');
          });
        }, { once: true });
      })
      .catch(() => {});
  };
  if (!reduced && !saveData) {
    const near = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { load(); near.disconnect(); }
    }, { rootMargin: '150% 0px' });
    near.observe(descent);
  }

  const setChapter = (p: number) => {
    const n = chapters.length;
    const idx = Math.min(n - 1, Math.floor(p * n * 0.999));
    chapters.forEach((c, i) => {
      c.classList.toggle('is-active', i === idx);
      c.classList.toggle('is-past', i < idx);
    });
    const depth = Math.round(p * 60);
    if (depthEl) depthEl.textContent = p < 0.12 ? '+00' : `−${String(depth).padStart(2, '0')}`;
    if (depthMarker) depthMarker.style.top = `${p * 100}%`;
    if (dProg) dProg.style.transform = `scaleX(${p})`;
  };
  setChapter(0);

  ScrollTrigger.create({
    trigger: descent, start: 'top top', end: 'bottom bottom',
    onUpdate: (st) => { dTarget = st.progress; setChapter(st.progress); },
    onToggle: (st) => { dActive = st.isActive; if (dActive) tick(); },
  });

  const tick = () => {
    if (!dActive && Math.abs(dTarget - dCurrent) < 0.001) return;
    dCurrent += (dTarget - dCurrent) * 0.14;
    if (dReady && !dVideo.seeking) {
      const t = dCurrent * (dVideo.duration - 0.05);
      if (Math.abs(dVideo.currentTime - t) > 0.03) dVideo.currentTime = t;
    }
    requestAnimationFrame(tick);
  };
}

/* ---------------------------------------------------------------------------
   PLANT HEALTH PYRAMID — levels light up as panels cross the center
--------------------------------------------------------------------------- */
const lvls = $$('[data-php-level]');
const setLevel = (n: number) => {
  $$('[data-php-lv]').forEach((g) => {
    const lv = +g.getAttribute('data-php-lv')!;
    g.classList.toggle('is-active', lv === n);
    g.classList.toggle('is-lit', lv < n);
  });
  $$('[data-php-legend]').forEach((li) => li.classList.toggle('is-active', +li.dataset.phpLegend! === n));
  lvls.forEach((l) => l.classList.toggle('is-active', +l.dataset.phpLevel! === n));
};
lvls.forEach((l) => {
  ScrollTrigger.create({
    trigger: l, start: 'top 55%', end: 'bottom 45%',
    onToggle: (st) => st.isActive && setLevel(+l.dataset.phpLevel!),
  });
});
setLevel(1);

/* ---------------------------------------------------------------------------
   PRODUCTS RAIL — vertical scroll drives a horizontal track (desktop)
--------------------------------------------------------------------------- */
const mm = gsap.matchMedia();
mm.add('(min-width: 961px) and (hover: hover)', () => {
  const pin = $('[data-rail-pin]');
  const track = $('[data-rail-track]');
  const prog = $('[data-rail-progress]');
  if (!pin || !track || reduced) return;
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const tween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: pin, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: (st) => prog && (prog.style.transform = `scaleX(${st.progress})`),
    },
  });
  return () => tween.kill();
});

/* ---------------------------------------------------------------------------
   CROPS — expanding cards
--------------------------------------------------------------------------- */
const acards = $$('[data-acard]');
acards.forEach((c) => {
  const open = () => acards.forEach((x) => x.classList.toggle('is-open', x === c));
  c.addEventListener('mouseenter', open);
  c.addEventListener('focus', open);
});

/* ---------------------------------------------------------------------------
   VOICES — auto-advancing testimonial stage
--------------------------------------------------------------------------- */
const voices = $$('[data-voice]');
const tabs = $$('[data-voice-tab]');
const vIndex = $('[data-voice-index]');
let vi = 0, vTimer: number | undefined, vVisible = false;
const VDUR = 7000;
const showVoice = (i: number) => {
  vi = (i + voices.length) % voices.length;
  voices.forEach((v, k) => v.classList.toggle('is-active', k === vi));
  tabs.forEach((t, k) => {
    t.setAttribute('aria-selected', String(k === vi));
    t.classList.toggle('is-done', k < vi);
    const bar = t.querySelector('i') as HTMLElement | null;
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
  });
  if (vIndex) vIndex.textContent = String(vi + 1).padStart(2, '0');
  clearTimeout(vTimer);
  if (vVisible && !reduced) vTimer = window.setTimeout(() => showVoice(vi + 1), VDUR);
};
tabs.forEach((t) => t.addEventListener('click', () => showVoice(+t.dataset.voiceTab!)));
const vSec = $('[data-voices]');
if (vSec) {
  vSec.style.setProperty('--vdur', `${VDUR}ms`);
  new IntersectionObserver((e) => {
    vVisible = e[0].isIntersecting;
    if (vVisible) showVoice(vi); else clearTimeout(vTimer);
  }, { threshold: 0.3 }).observe(vSec);
}

/* ---------------------------------------------------------------------------
   VISION — slow parallax
--------------------------------------------------------------------------- */
if (!reduced) {
  gsap.fromTo('[data-vision-img]', { yPercent: -8, scale: 1.1 }, {
    yPercent: 8, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '[data-vision]', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

// Fonts/images can shift layout — refresh trigger positions once settled
addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
