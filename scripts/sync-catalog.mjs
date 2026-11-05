#!/usr/bin/env node
/**
 * Pulls the live AEA catalog from the public WooCommerce Store API and writes
 * src/data/products.json + optimized product images into public/img/products.
 *
 *   NODE_USE_ENV_PROXY=1 npm run sync   (proxy env only needed behind a proxy)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const API = 'https://advancingecoag.com/wp-json/wc/store/v1';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_JSON = path.join(ROOT, 'src/data/products.json');
const IMG_DIR = path.join(ROOT, 'public/img/products');
const UA = 'Mozilla/5.0 (compatible; aea-redesign-sync/1.0)';

const get = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

const decode = (s = '') =>
  s
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

const text = (html = '') => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Keep only safe, simple markup for descriptions.
const cleanHtml = (html = '') => {
  let h = decode(html)
    .replace(/<(script|style|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<span[^>]*>|<\/span>/gi, '')
    .replace(/<(\/?)(h[1-6])[^>]*>/gi, '<$1p>')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/<a [^>]*>([\s\S]*?)<\/a>/gi, '$1') // demo: no outbound links in copy
    .replace(/<p>\s*<em>\s*Product availability[\s\S]*?<\/p>/gi, '')
    .replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '')
    .replace(/<(?!\/?(p|strong|em|ul|ol|li|br)\b)[^>]+>/gi, '');
  return h.replace(/\n+/g, '').trim();
};

const slugify = (s) =>
  decode(s)
    .toLowerCase()
    .replace(/[™®]/g, '')
    .replace(/\bonly\b/g, '')
    .replace(/market garden line/g, 'market-garden')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

const STATE_RE = /[–-]\s*(California|Idaho|WA State)(\s+Only)?\s*$/i;

async function main() {
  console.log('Fetching products…');
  const products = await get(`${API}/products?per_page=100`);
  let variations = [];
  for (let page = 1; page < 10; page++) {
    const v = await get(`${API}/products?type=variation&per_page=100&page=${page}`);
    if (!v.length) break;
    variations = variations.concat(v);
  }
  console.log(`${products.length} products, ${variations.length} variations`);

  await fs.mkdir(IMG_DIR, { recursive: true });
  const out = [];
  const seen = new Set();

  for (const p of products) {
    const name = decode(p.name).replace(/\s+/g, ' ').trim();
    let slug = slugify(name);
    while (seen.has(slug)) slug += '-2';
    seen.add(slug);

    const stateMatch = name.match(STATE_RE);
    const stateOnly = stateMatch ? (stateMatch[1].startsWith('WA') ? 'WA' : stateMatch[1] === 'California' ? 'CA' : 'ID') : null;
    const baseName = name.replace(STATE_RE, '').replace(/\s*[–-]\s*Market Garden Line/i, '').trim();
    const cats = p.categories.map((c) => decode(c.name));
    const line = cats.includes('Market Gardener Line') ? 'market-garden' : 'commercial';

    // Accordion attributes → [{title, body}]
    const attr = Object.fromEntries(p.attributes.map((a) => [a.name.toLowerCase(), a.terms?.map((t) => decode(t.name)).join(', ')]));
    const details = [];
    for (let i = 1; i <= 6; i++) {
      const t = attr[`accordion${i}_title`];
      const b = attr[`accordion${i}_description`] ?? attr[`accordion${i}_decription`];
      if (t && b) details.push({ title: t.split(',')[0].trim(), body: cleanHtml(b.includes('<') ? b : `<p>${b}</p>`) });
    }

    const vars = variations
      .filter((v) => v.parent === p.id)
      .map((v) => ({
        id: v.id,
        label: (v.variation || '').replace(/^Size:\s*/i, '').trim() || 'Standard',
        price: +v.prices.price,
      }))
      .sort((a, b) => a.price - b.price);
    const sizes = vars.length ? vars : [{ id: p.id, label: 'Standard', price: +p.prices.price }];

    // Image
    let image = null;
    const src = p.images?.[0]?.src;
    if (src) {
      const file = `${slug}`;
      const target = path.join(IMG_DIR, `${file}-640.webp`);
      try {
        await fs.access(target);
      } catch {
        const buf = Buffer.from(await (await fetch(src, { headers: { 'User-Agent': UA } })).arrayBuffer());
        const base = sharp(buf).trim({ threshold: 1 }).resize(1100, 1100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
        const trimmed = await base.png().toBuffer();
        await sharp(trimmed).resize(640, 640).webp({ quality: 78, alphaQuality: 80, effort: 6 }).toFile(target);
        await sharp(trimmed).resize(1100, 1100).webp({ quality: 78, alphaQuality: 80, effort: 6 }).toFile(path.join(IMG_DIR, `${file}-1100.webp`));
        await sharp(trimmed).resize(320, 320).webp({ quality: 72, alphaQuality: 75, effort: 6 }).toFile(path.join(IMG_DIR, `${file}-320.webp`));
      }
      image = file;
    }

    const desc = cleanHtml(p.description);
    out.push({
      id: p.id,
      slug,
      name,
      baseName,
      sku: p.sku,
      tagline: text(p.short_description),
      description: desc,
      organic: /OMRI|organic/i.test(desc),
      categories: cats.filter((c) => c !== 'Market Gardener Line'),
      line,
      stateOnly,
      image,
      priceMin: Math.min(...sizes.map((s) => s.price)),
      priceMax: Math.max(...sizes.map((s) => s.price)),
      sizes,
      details,
    });
    process.stdout.write('.');
  }
  await fs.writeFile(OUT_JSON, JSON.stringify(out, null, 1));
  console.log(`\nWrote ${out.length} products → ${path.relative(ROOT, OUT_JSON)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
