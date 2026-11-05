import productsRaw from '../data/products.json';
import cropsRaw from '../data/crops.json';

export type Size = { id: number; label: string; price: number };
export type Product = {
  id: number;
  slug: string;
  name: string;
  baseName: string;
  sku: string;
  tagline: string;
  description: string;
  organic: boolean;
  categories: string[];
  line: 'commercial' | 'market-garden';
  stateOnly: string | null;
  image: string | null;
  priceMin: number;
  priceMax: number;
  sizes: Size[];
  details: { title: string; body: string }[];
};
export type Crop = {
  slug: string;
  name: string;
  subcrops: string[];
  intro: string;
  statement: string;
  body: string[];
  highlight: string;
  faqs: { q: string; a: string }[];
  stories: string[];
};

/** Your details — shown on /pitch and in the disclaimer's takedown contact. Empty = hidden. */
export const AUTHOR = {
  name: 'Federico Schwindt',
  role: 'Web designer & developer',
  email: 'leonel.sch2003@gmail.com',
  website: 'https://federico-schwindt.github.io/portfolio-FEDERICOSCH/',
};

export const products = productsRaw as Product[];
export const crops = cropsRaw as Crop[];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
/** Prefix an internal path with the deploy base (GitHub Pages project path). */
export const url = (p = '/') => {
  if (/^(https?:|mailto:|tel:|#)/.test(p)) return p;
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${BASE}${path}`;
};
export const asset = (p: string) => url(p);

export const money = (cents: number, opts: { compact?: boolean } = {}) => {
  const v = cents / 100;
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts.compact && v >= 1000 ? 0 : 2,
    maximumFractionDigits: opts.compact && v >= 1000 ? 0 : 2,
  });
};

export const productImg = (p: Pick<Product, 'image'>, size: 320 | 640 | 1100 = 640) =>
  p.image ? url(`/img/products/${p.image}-${size}.webp`) : url('/img/aea-logo.webp');

/** Category → soft tint used behind product cutouts. */
export const tints: Record<string, string> = {
  Biological: '#dfe6cf',
  Nutritional: '#f1e2c4',
  Functional: '#dfe3e6',
  'Soil Priming': '#e6dccd',
  'Seed Treatments': '#f3e6b8',
  Essential: '#e9e3d6',
  Foliar: '#d9e8d6',
  Soil: '#e3d6c6',
  'Macro and Micro': '#efe0cf',
};
export const tintFor = (p: Product) => {
  const order = ['Seed Treatments', 'Soil Priming', 'Biological', 'Foliar', 'Soil', 'Nutritional', 'Functional', 'Macro and Micro', 'Essential'];
  const c = order.find((o) => p.categories.includes(o));
  return (c && tints[c]) || '#ebe5d8';
};

export const shopCategories = [
  { key: 'all', label: 'All products' },
  { key: 'Soil Priming', label: 'Soil priming' },
  { key: 'Seed Treatments', label: 'Seed treatments' },
  { key: 'Biological', label: 'Biological' },
  { key: 'Nutritional', label: 'Nutritional' },
  { key: 'Functional', label: 'Functional' },
  { key: 'Foliar', label: 'Foliar' },
];

export const featuredSlugs = ['biocoat-gold', 'spectrum', 'macropak', 'micropak', 'rejuvenate', 'seashield', 'holocal', 'photomag', 'accelerate', 'seedflare', 'calguard', 'mycogenesis'];
export const featured = featuredSlugs.map((s) => products.find((p) => p.slug === s)).filter(Boolean) as Product[];

/** Products visible in the default (no state selected) catalog. */
export const catalog = products.filter((p) => !p.stateOnly);

export const related = (p: Product, n = 4) => {
  const score = (q: Product) => q.categories.filter((c) => p.categories.includes(c)).length;
  return products
    .filter((q) => q.slug !== p.slug && !q.stateOnly && q.line === p.line && q.baseName !== p.baseName)
    .sort((a, b) => score(b) - score(a))
    .slice(0, n);
};

/** Recommended products per crop family (agronomic heuristics based on AEA crop pages). */
export const cropProducts: Record<string, string[]> = {
  fruits: ['holocal', 'calguard', 'photomag', 'accelerate'],
  vegetables: ['macropak', 'micropak', 'seedflare', 'rejuvenate'],
  'grains-and-legumes': ['biocoat-gold', 'seedflare', 'accelerate', 'spectrum'],
  fibers: ['biocoat-gold', 'macropak', 'micropak', 'seashield'],
  berries: ['holocal', 'micropak', 'photomag', 'seastim'],
  nuts: ['holocal', 'rebound-zinc', 'rebound-boron', 'spectrum'],
};

export const testimonials = [
  { name: 'Gurprit Brar', role: 'Blueberry Grower', img: 't-gurprit', quote: 'We started on one block, and then two, and then eventually all of our fields. Once we saw that the AEA products were working, we just started using more and more… and saw less disease and insect pressure.' },
  { name: 'John Bays', role: 'Grain Grower', img: 't-bays', quote: 'Our fields were a nice, uniform green. I would say the big healthy root systems from using BioCoat Gold and the other products really did the trick.' },
  { name: 'Greg Pennyroyal', role: 'Vineyard Manager · Wilson Creek Winery', img: 't-pennyroyal', quote: 'If you are a winemaker that wants to blow the doors off your current quality and do something that’s unique and exciting, there’s room for regenerative agriculture.' },
  { name: 'Mike Omeg', role: 'Cherry Grower', img: 't-omeg', quote: 'What I saw repeatedly — in different situations, different weather, different years, and on different soil — was that the AEA program was having a positive impact on my business.' },
  { name: 'Brad Igl', role: 'Potato Grower', img: 't-igl', quote: 'The soil primer helps to break down residues to get biology in the soil going, so that it’s ready to plant potatoes in the spring.' },
  { name: 'Kyle Rasch', role: 'Apple Grower', img: 't-rasch', quote: 'Our conventional orchard has a lot of woolly apple aphid issues, but we really haven’t had a problem in the areas where we work with AEA.' },
];

export const growerLogos = ['squeeze', 'carzalia', 'harmony-valley-farm', 'wilson-creek', 'highland-harmony-farm', 'grgich-hills-estate', 'burroughs', 'nookachamps-farms', 'clark-land-cattle', 'prairie-hybrid-seeds', 'third-leaf-farm-llc', 'sauk-farm', 'open-hands-farm', 'little-hill', 'orchard-view-cherries', 'alexandre-family-farm'];

export const pyramid = [
  {
    level: 1,
    title: 'Complete Photosynthesis',
    short: 'Photosynthesis',
    process: 'Plants increase the quantity of sugars they produce — by as much as 3–4× — and their quality.',
    resists: 'Soil-borne fungal pathogens',
    pests: ['Verticillium', 'Fusarium', 'Rhizoctonia', 'Pythium', 'Phytophthora'],
    needs: [
      { sym: 'Mg', name: 'Magnesium', n: 12 },
      { sym: 'Fe', name: 'Iron', n: 26 },
      { sym: 'Mn', name: 'Manganese', n: 25 },
      { sym: 'N', name: 'Nitrogen', n: 7 },
      { sym: 'P', name: 'Phosphorus', n: 15 },
    ],
    products: ['macropak', 'micropak'],
  },
  {
    level: 2,
    title: 'Complete Protein Synthesis',
    short: 'Proteins',
    process: 'Every form of nitrogen the plant absorbs is quickly converted into complete proteins — leaving nothing for pests to feed on.',
    resists: 'Larval & sucking insects',
    pests: ['Hornworm', 'Cabbage looper', 'Aphids', 'Whiteflies', 'Thrips'],
    needs: [
      { sym: 'Mg', name: 'Magnesium', n: 12 },
      { sym: 'S', name: 'Sulfur', n: 16 },
      { sym: 'Mo', name: 'Molybdenum', n: 42 },
      { sym: 'B', name: 'Boron', n: 5 },
    ],
    products: ['photomag', 'micropak', 'macropak'],
  },
  {
    level: 3,
    title: 'Lipid Synthesis',
    short: 'Lipids',
    process: 'Plants produce so much energy they store a surplus as lipids — a 2–4× increase that fortifies every cell membrane.',
    resists: 'Airborne pathogens',
    pests: ['Downy mildew', 'Powdery mildew', 'Fire blight', 'Rust'],
    needs: [{ sym: 'μ', name: 'Microbial metabolites', n: 0 }],
    products: ['spectrum', 'rejuvenate', 'mycogenesis'],
  },
  {
    level: 4,
    title: 'Secondary Metabolites',
    short: 'Immunity',
    process: 'Plants create powerful anti-bacterial and anti-fungal compounds, triggered by a diverse, thriving microbiome.',
    resists: 'Beetles & nematodes',
    pests: ['Beetles', 'Stink bugs', 'Nematodes'],
    needs: [{ sym: 'SAR', name: 'Systemic acquired resistance', n: 0 }, { sym: 'ISR', name: 'Induced systemic resistance', n: 0 }],
    products: ['spectrum-myco', 'seashield', 'biocoat-gold'],
  },
];

export const coreConcepts = [
  { t: 'Mineral nutrition supports plant immunity', d: 'Trace minerals are key ingredients in the enzymes plants use to build immune compounds. Without them, enzyme pathways collapse — creating an ideal food source for pests.' },
  { t: 'Healthy plants resist insects and disease', d: 'Like animals and people, plants have immune systems. When nutrition is optimized, crops attain genuine resistance against insects and disease.' },
  { t: 'Microbial metabolites are a more efficient source of nutrition', d: 'The soil microbiome is the plant’s digestive system — releasing minerals in bioavailable forms plants use far more efficiently than simple fertilizer ions.' },
  { t: 'Quality drives yield', d: 'As plant nutrition improves, energy and immunity rise — creating higher yields, longer shelf life, better flavor and less dependence on pesticides.' },
  { t: 'Healthy plants create healthy soil', d: 'Healthy plants send much of their sugar into the soil as root exudates, fueling microbes that build soil organic matter fast.' },
];

export const timeline = [
  ['2004', 'John Kempf begins his journey into plant and soil science'],
  ['2006', 'Advancing Eco Agriculture is founded'],
  ['2009', 'First AEA product bottled'],
  ['2011', 'AEA office opens in Middlefield, OH'],
  ['2012', 'Manufacturing facility opens in Middlefield'],
  ['2014', 'Sap testing introduced'],
  ['2017', 'First major international consulting agreement'],
  ['2018', 'First AEA warehouse opens in Union Gap, WA'],
  ['2019', 'The Regenerative Agriculture Podcast launches'],
  ['2020', 'California & Florida warehouses open'],
  ['2022', 'The AEA laboratory opens'],
  ['2023', 'Second manufacturing facility opens in Aurora, CO'],
];

export const states: [string, string][] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

export const nav = [
  { href: '/shop/', label: 'Shop', n: '01' },
  { href: '/crops/', label: 'Crops', n: '02' },
  { href: '/science/', label: 'Science', n: '03' },
  { href: '/about/', label: 'About', n: '04' },
  { href: '/contact/', label: 'Contact', n: '05' },
];
