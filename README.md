# Advancing Eco Agriculture — concept redesign

A from-scratch redesign of [advancingecoag.com](https://advancingecoag.com/) built as a fast, static site for GitHub Pages — cinematic, scroll-driven storytelling plus a complete shopping experience.

> **Concept / pitch site.** Not the official AEA website or store. Pages ship with `noindex` so the demo never competes with the real site in search.

## What’s inside

| Page | Highlights |
|---|---|
| **Home** | Golden-hour hero film · word-by-word manifesto · **scroll-scrubbed descent** from the crop canopy into the root zone with a live depth gauge · interactive **Plant Health Pyramid** with mineral “periodic table” tiles · pinned horizontal product rail · bento of services (sap-analysis macro film, podcast waveform) · expanding crop cards · auto-advancing grower testimonials + farm logo marquee · “80% by 2040” vision · amber CTA |
| **Shop** | 47 real products & 191 real sizes/prices synced from AEA’s WooCommerce · category / line / search / sort filters with View Transitions · **state-based compliance gating** (e.g. choosing California swaps in *Revenant Charge – California Only*) |
| **Product** | Size picker with live pricing · quantity · fly-to-cart animation · pointer-tilt product stage · Pyramid level link · application rates / ingredients / NOP accordions · related products |
| **Cart & checkout** | Slide-out cart (localStorage) with free-freight meter · polished demo checkout with order confirmation |
| **Crops** | Index + 6 crop programs (FAQs, field stories, recommended products) · Critical Points of Influence timeline |
| **Science** | 5 core concepts · tabbed Pyramid deep-dive · illustrative **sap analysis report** · R&D firsts & data partners |
| **Pitch** (`/pitch/`) | Case study for AEA’s team: before/after slider (desktop, product, mobile), Lighthouse comparison measured against the live site, integration diagram, guided tour, QR code, next steps. Personalize the `DESIGNER` block at the top of `src/pages/pitch.astro`. |
| **About / Contact / 404** | Origin story, draggable timeline, values, John Kempf · lead form · “You’ve dug too deep” 404 |

## Performance

Static HTML, zero render-blocking resources, inlined critical CSS, self-hosted variable fonts, AVIF/WebP imagery, and video that loads only after first paint (or only when you scroll near it). The scroll film is fetched as a blob for instant seeking and is never part of the initial load.

Lighthouse (mobile, simulated slow 4G + 4× CPU): **Performance 94–99 · Accessibility 97–100 · Best Practices 100**. (SEO reads 66 only because of the deliberate `noindex`.)

- Global JS: ~8.5 KB gzipped · Homepage motion (GSAP + ScrollTrigger + Lenis): ~46 KB gzipped
- `prefers-reduced-motion` respected everywhere; Save-Data / 2G skips video

## Checkout: demo today, real tomorrow

`src/scripts/app.ts` → `CHECKOUT_MODE`

- `'demo'` (default) — on-site demo checkout; no payment is taken.
- `'woocommerce'` — hands the cart to AEA’s **existing** WooCommerce checkout via Shareable Checkout URLs (`/checkout-link/?products=VARIATION_ID:QTY,…`). Verified against the live store with multi-product, multi-size carts — orders, taxes, freight and payments stay exactly where they are today. No store migration needed.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321/Advancing-Eco-Agriculture-Website/
npm run build      # static output in dist/
```

Refresh the catalog (products, sizes, prices, images) from the live store:

```bash
NODE_USE_ENV_PROXY=1 npm run sync   # proxy variable only needed behind a proxy
```

## Deploy (GitHub Pages)

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push — `.github/workflows/deploy.yml` builds and publishes. The base path is picked up automatically (project path or custom domain).

## Stack

[Astro](https://astro.build) (static) · vanilla TypeScript · [GSAP](https://gsap.com) ScrollTrigger · [Lenis](https://lenis.darkroom.engineering) · Geist / Geist Mono / Instrument Serif.

## Media credits

Cinematic films and stills (hero field, soil descent, sap droplet, hands, orchard) were generated with Higgsfield (FLUX 3 Video, GPT Image) for this concept. Product photography, crop/story imagery, grower portraits, logos, trademarks and copy belong to Advancing Eco Agriculture and their respective owners; they appear here only to illustrate this unofficial design proposal. Every page shows a disclaimer (first-visit notice, persistent “concept demo” label and footer legal text), and the site is excluded from search engines via `noindex`.
