// Generates a real 1200x630 PNG OG image from an inline SVG using sharp
// (bundled with Astro 4's image service — no browser required).
//
// SVG doesn't render on Facebook/LinkedIn/Twitter cards, so social previews
// need a rasterized PNG. Run: node scripts/make-og-image.mjs
//
// Output: public/og-image.png

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../public/og-image.png');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="55%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#111c33"/>
    </linearGradient>
    <radialGradient id="glow" cx="88%" cy="-5%" r="70%">
      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#2563eb" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="14" height="630" fill="#2563eb"/>

  <!-- star motif -->
  <g transform="translate(1016 96)" fill="#2563eb" opacity="0.85">
    <path d="M84 0 L104.3 43.8 L154 47.7 L116 81.8 L127.3 130.5 L84 105 L40.7 130.5 L52 81.8 L14 47.7 L63.7 43.8 Z"/>
  </g>

  <!-- eyebrow -->
  <circle cx="104" cy="150" r="7" fill="#2563eb"/>
  <text x="124" y="158" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="24" font-weight="600" letter-spacing="3" fill="#9db8f0">VIETNAM MARKET INSIGHTS</text>

  <!-- headline -->
  <text x="92" y="296" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="86" font-weight="800" fill="#ffffff">Vietnam&#8217;s digital</text>
  <text x="92" y="392" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="86" font-weight="800" fill="#ffffff">economy, <tspan fill="#5b8bf5">made legible.</tspan></text>

  <!-- tagline -->
  <text x="92" y="456" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="30" font-weight="400" fill="#b6c2d4">Structured references on e-commerce, payments,</text>
  <text x="92" y="498" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="30" font-weight="400" fill="#b6c2d4">logistics, and financial markets.</text>

  <!-- footer -->
  <line x1="92" y1="556" x2="1108" y2="556" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
  <text x="92" y="596" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="29" font-weight="700" fill="#ffffff">vnmarketinsights.com</text>
  <text x="1108" y="596" text-anchor="end" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="23" font-weight="500" fill="#93a4bd">E-commerce &#183; Payments &#183; Logistics &#183; Markets</text>
</svg>`;

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('[og] sharp not available. Install it or generate the PNG another way.');
    process.exit(1);
  }
  await sharp(Buffer.from(svg)).png().toFile(OUT);
  const bytes = fs.statSync(OUT).size;
  console.log(`[og] wrote ${OUT} (${bytes} bytes, 1200x630)`);
}

main().catch((err) => {
  console.error('[og] failed:', err.message);
  process.exit(1);
});
