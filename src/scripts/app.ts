import Lenis from 'lenis';

/* ==========================================================================
   Config
   ========================================================================== */
/**
 * 'demo'        → checkout button opens the on-site demo checkout (no payment).
 * 'woocommerce' → hands the cart to AEA's live WooCommerce checkout using
 *                 Shareable Checkout URLs: /checkout-link/?products=ID:QTY,ID:QTY
 *                 (verified working against advancingecoag.com).
 */
export const CHECKOUT_MODE: 'demo' | 'woocommerce' = 'demo';
const WOO_ORIGIN = 'https://advancingecoag.com';
const FREE_FREIGHT = 50000; // cents

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const store = {
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
  },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

/* ==========================================================================
   Smooth scroll
   ========================================================================== */
let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, smoothWheel: true });
  const raf = (t: number) => { lenis!.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  (window as any).__lenis = lenis;
}
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a || a.getAttribute('href') === '#') return;
  const t = document.querySelector(a.getAttribute('href')!);
  if (!t) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(t as HTMLElement, { offset: -80, duration: 1.4 }) : t.scrollIntoView({ behavior: 'smooth' });
});

/* ==========================================================================
   Nav
   ========================================================================== */
const navEl = $('[data-nav]');
if (navEl) {
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    navEl.classList.toggle('is-scrolled', y > 40);
    const menuOpen = document.documentElement.classList.contains('menu-open');
    if (!menuOpen) navEl.classList.toggle('is-hidden', y > 400 && y > lastY + 2);
    if (y < lastY - 2) navEl.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
const menu = $('[data-menu]');
const setMenu = (open: boolean) => {
  if (!menu) return;
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  menu.inert = !open;
  $('[data-open-menu]')?.setAttribute('aria-expanded', String(open));
  document.documentElement.classList.toggle('menu-open', open);
  open ? lenis?.stop() : lenis?.start();
};
$('[data-open-menu]')?.addEventListener('click', () => setMenu(true));
$('[data-close-menu]')?.addEventListener('click', () => setMenu(false));

/* ==========================================================================
   Reveal + split text
   ========================================================================== */
export function split(el: HTMLElement) {
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = '1';
  let i = 0;
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        (n.textContent || '').split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const inner = document.createElement('span');
          inner.textContent = part;
          inner.style.setProperty('--i', String(i++));
          w.appendChild(inner);
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && (n as Element).tagName !== 'BR') {
        const elx = n as HTMLElement;
        if (elx.classList.contains('w')) return;
        // wrap element (e.g. <em>) as one unit, keep its styling
        const w = document.createElement('span');
        w.className = 'w';
        const inner = document.createElement('span');
        elx.replaceWith(w);
        inner.appendChild(elx);
        inner.style.setProperty('--i', String(i++));
        w.appendChild(inner);
      }
    });
  };
  walk(el);
}
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }),
  { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
);
export function observeReveals(root: ParentNode = document) {
  $$<HTMLElement>('[data-split]', root).forEach((el) => { split(el); if (!el.classList.contains('is-in')) io.observe(el); });
  $$('[data-reveal]', root).forEach((el) => { if (!el.classList.contains('is-in')) io.observe(el); });
}
observeReveals();
(window as any).__appReady = true;

/* ==========================================================================
   Toast
   ========================================================================== */
const toast = $('[data-toast]');
let toastT: number | undefined;
function showToast(text: string, img?: string | null) {
  if (!toast) return;
  ($('[data-toast-text]', toast) as HTMLElement).textContent = text;
  const im = $('[data-toast-img]', toast) as HTMLImageElement;
  if (img) { im.src = `${BASE}/img/products/${img}-320.webp`; im.hidden = false; } else im.hidden = true;
  toast.classList.add('is-on');
  clearTimeout(toastT);
  toastT = window.setTimeout(() => toast.classList.remove('is-on'), 3200);
}

/* ==========================================================================
   Cart
   ========================================================================== */
export type CartItem = { id: number; pid: number; slug: string; name: string; size: string; price: number; img: string | null; qty: number };
let cart: CartItem[] = store.get<CartItem[]>('aea-cart', []);
const drawer = $('[data-drawer]');

export const Cart = {
  items: () => cart,
  count: () => cart.reduce((n, i) => n + i.qty, 0),
  total: () => cart.reduce((n, i) => n + i.qty * i.price, 0),
  add(item: Omit<CartItem, 'qty'> & { qty?: number }) {
    const q = Math.max(1, item.qty || 1);
    const ex = cart.find((i) => i.id === item.id);
    if (ex) ex.qty += q; else cart.push({ ...item, qty: q });
    this.save();
    const badge = $('[data-cart-count]');
    badge?.classList.remove('bump'); void badge?.offsetWidth; badge?.classList.add('bump');
    showToast(`${item.name} · ${item.size} added`, item.img);
  },
  setQty(id: number, qty: number) {
    const it = cart.find((i) => i.id === id);
    if (!it) return;
    it.qty = qty;
    if (it.qty <= 0) cart = cart.filter((i) => i.id !== id);
    this.save();
  },
  clear() { cart = []; this.save(); },
  save() { store.set('aea-cart', cart); render(); document.dispatchEvent(new CustomEvent('cart:change')); },
  wooCheckoutUrl: () => `${WOO_ORIGIN}/checkout-link/?products=${cart.map((i) => `${i.id}:${i.qty}`).join(',')}`,
};
(window as any).__cart = Cart;

function render() {
  const count = Cart.count();
  $$('[data-cart-count]').forEach((el) => (el.textContent = String(count)));
  const ct = $('[data-cart-count-text]');
  if (ct) ct.textContent = count ? `(${count})` : '';
  const list = $('[data-cart-items]');
  const foot = $('[data-cart-foot]');
  if (!list || !foot) return;
  if (!cart.length) {
    list.innerHTML = `<div class="drawer__empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 20v-8"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Z"/><path d="M12 14c0-4 3-6 7-6 0 4-3 6-7 6Z"/></svg><p>Your cart is empty — let’s grow something.</p><a class="btn btn--sm" href="${BASE}/shop/">Browse products</a></div>`;
    foot.hidden = true;
    return;
  }
  list.innerHTML = cart
    .map(
      (i) => `<div class="citem">
      <a class="citem__img" href="${BASE}/shop/${i.slug}/">${i.img ? `<img src="${BASE}/img/products/${i.img}-320.webp" alt="" width="60" height="60" loading="lazy">` : ''}</a>
      <div>
        <a class="citem__name" href="${BASE}/shop/${i.slug}/">${i.name}</a>
        <div class="citem__meta">${i.size}</div>
        <div class="qty" role="group" aria-label="Quantity">
          <button type="button" data-qty="${i.id}" data-delta="-1" aria-label="Decrease">−</button>
          <span>${i.qty}</span>
          <button type="button" data-qty="${i.id}" data-delta="1" aria-label="Increase">+</button>
        </div>
      </div>
      <div>
        <div class="citem__price">${fmt(i.price * i.qty)}</div>
        <button type="button" class="citem__remove" data-remove="${i.id}">Remove</button>
      </div>
    </div>`,
    )
    .join('');
  foot.hidden = false;
  const total = Cart.total();
  ($('[data-cart-total]') as HTMLElement).textContent = fmt(total);
  const pct = Math.min(100, (total / FREE_FREIGHT) * 100);
  ($('[data-ship-meter]') as HTMLElement).style.width = `${pct}%`;
  ($('[data-ship-text]') as HTMLElement).textContent =
    total >= FREE_FREIGHT ? '✓ You’ve unlocked free freight' : `${fmt(FREE_FREIGHT - total)} away from free freight`;
  const co = $<HTMLAnchorElement>('[data-checkout]');
  if (co && CHECKOUT_MODE === 'woocommerce') co.href = Cart.wooCheckoutUrl();
}
render();

const setDrawer = (open: boolean) => {
  if (!drawer) return;
  drawer.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  drawer.inert = !open;
  open ? lenis?.stop() : lenis?.start();
  if (open) setTimeout(() => $<HTMLButtonElement>('[data-close-cart].icon-btn')?.focus(), 50);
};

function flyToCart(from: Element | null) {
  const img = from?.querySelector('img');
  const target = $('[data-open-cart]');
  if (!img || !target || reduced) return;
  const a = img.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!a.width) return;
  const clone = img.cloneNode() as HTMLImageElement;
  clone.removeAttribute('srcset');
  Object.assign(clone.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, zIndex: '95', pointerEvents: 'none', objectFit: 'contain' });
  document.body.appendChild(clone);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  clone
    .animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
        { transform: `translate(${dx * 0.6}px, ${dy - 120}px) scale(.5) rotate(-12deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.08) rotate(-20deg)`, opacity: 0.4 },
      ],
      { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)' },
    )
    .finished.then(() => clone.remove());
}

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const add = t.closest<HTMLElement>('[data-add]');
  if (add) {
    e.preventDefault();
    e.stopPropagation();
    const data = JSON.parse(add.dataset.add!);
    flyToCart(add.closest('[data-product], [data-product-media]') ?? document.querySelector('[data-product-media]'));
    Cart.add(data);
    return;
  }
  if (t.closest('[data-open-cart]')) { e.preventDefault(); toast?.classList.remove('is-on'); setDrawer(true); return; }
  if (t.closest('[data-close-cart]')) { setDrawer(false); return; }
  const q = t.closest<HTMLElement>('[data-qty]');
  if (q) { const id = +q.dataset.qty!; const it = cart.find((i) => i.id === id); if (it) Cart.setQty(id, it.qty + +q.dataset.delta!); return; }
  const r = t.closest<HTMLElement>('[data-remove]');
  if (r) { Cart.setQty(+r.dataset.remove!, 0); return; }
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { setDrawer(false); setMenu(false); setStateModal(false); setNotice(false); }
});
addEventListener('storage', (e) => { if (e.key === 'aea-cart') { cart = store.get('aea-cart', []); render(); } });

/* ==========================================================================
   Shipping state
   ========================================================================== */
const stateModal = $('[data-state-modal]');
export const State = {
  get: () => store.get<string>('aea-state', ''),
  set(code: string) {
    store.set('aea-state', code);
    renderState();
    document.dispatchEvent(new CustomEvent('state:change', { detail: code }));
  },
};
(window as any).__state = State;
function renderState() {
  const s = State.get();
  $$('[data-state-label]').forEach((el) => (el.textContent = s ? `Ship to ${s}` : 'Ship to'));
  $$<HTMLButtonElement>('[data-state-modal] [data-state]').forEach((b) => b.setAttribute('aria-pressed', String(!!s && b.dataset.state === s)));
}
renderState();
function setStateModal(open: boolean) {
  if (!stateModal) return;
  stateModal.classList.toggle('is-open', open);
  stateModal.setAttribute('aria-hidden', String(!open));
  stateModal.inert = !open;
  open ? lenis?.stop() : lenis?.start();
}
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-open-state]')) { setStateModal(true); return; }
  if (t.closest('[data-close-state]')) { setStateModal(false); return; }
  const b = t.closest<HTMLElement>('[data-state-modal] [data-state]');
  if (b) { State.set(b.dataset.state || ''); setTimeout(() => setStateModal(false), 180); }
});

/* ==========================================================================
   Demo forms (no backend on GitHub Pages)
   ========================================================================== */
document.addEventListener('submit', (e) => {
  const f = (e.target as Element).closest<HTMLFormElement>('[data-demo-form]');
  if (!f) return;
  e.preventDefault();
  const msg = f.parentElement?.querySelector('[data-form-msg]') || f.querySelector('[data-form-msg]');
  if (msg) msg.textContent = '✓ Thanks — you’re on the list. (Demo form: nothing was sent.)';
  f.reset();
});

/* ==========================================================================
   Lazy autoplay videos — only load & play when on screen
   ========================================================================== */
const vio = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    const v = e.target as HTMLVideoElement;
    if (e.isIntersecting) {
      if (!v.dataset.loaded) {
        v.querySelectorAll<HTMLSourceElement>('source[data-src]').forEach((s) => { s.src = s.dataset.src!; });
        v.load();
        v.dataset.loaded = '1';
      }
      v.play().catch(() => {});
    } else v.pause();
  });
}, { rootMargin: '200px' });
$$<HTMLVideoElement>('video[data-lazy-video]').forEach((v) => (reduced ? null : vio.observe(v)));

/* ==========================================================================
   Concept disclaimer — first visit + reopen from pill/footer
   ========================================================================== */
const NOTICE_KEY = 'aea-concept-ack-v1';
const noticeEl = $('[data-notice-modal]');
function setNotice(open: boolean) {
  if (!noticeEl) return;
  noticeEl.classList.toggle('is-open', open);
  noticeEl.setAttribute('aria-hidden', String(!open));
  noticeEl.inert = !open;
  open ? lenis?.stop() : lenis?.start();
  if (open) setTimeout(() => { $<HTMLButtonElement>('[data-ack-notice]')?.focus({ preventScroll: true }); $('.notice__card')?.scrollTo({ top: 0 }); }, 60);
}
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-open-notice]')) { e.preventDefault(); setNotice(true); return; }
  if (t.closest('[data-ack-notice]') || t.closest('[data-close-notice]')) { store.set(NOTICE_KEY, Date.now()); setNotice(false); }
});
if (noticeEl && !store.get<number>(NOTICE_KEY, 0)) {
  const show = () => setTimeout(() => setNotice(true), 900);
  document.readyState === 'complete' ? show() : addEventListener('load', show, { once: true });
}
