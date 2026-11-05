import { defineConfig } from 'astro/config';

// GitHub Pages project site: https://<user>.github.io/<repo>/
// Override with SITE / BASE env vars (e.g. BASE=/ for a custom domain).
const site = process.env.SITE || 'https://federico-schwindt.github.io';
const base = process.env.BASE ?? '/Advancing-Eco-Agriculture-Website';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  output: 'static',
  build: { inlineStylesheets: 'always', assets: '_assets' },
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
});
