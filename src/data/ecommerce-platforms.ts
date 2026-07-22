// Single source of truth for Vietnam e-commerce marketplace share/GMV data.
// Consumed by the /data dataset page and the compare pages so a refresh happens
// in one place. All figures are full-year 2025 unless a field says otherwise.
// Per-figure provenance lives in `source`; keep every number date-stamped.

export interface PlatformRow {
  name: string;
  parent: string;
  gmvShare2025: number; // percent of four-platform marketplace GMV
  gmvShareDisplay: string;
  changeVs2024: string;
  activeSellers: string;
  source: string;
}

/** Human-readable period the dataset covers. */
export const ECOMMERCE_AS_OF = 'Full-year 2025';
/** ISO date this data was last reviewed/updated. */
export const ECOMMERCE_UPDATED = '2026-07-22';
/** Primary source for the headline share/GMV figures. */
export const ECOMMERCE_PRIMARY_SOURCE = 'Metric (metric.vn), full-year 2025 e-commerce report';

/** Whole-market totals across the four tracked marketplaces. */
export const PLATFORM_MARKET = {
  gmvVnd: 'VND 429.7 trillion',
  gmvUsd: '~$16.35 billion',
  gmvGrowth: '+34.75% YoY',
  productsSold: '3.94 billion units',
  totalSellers: '~601,800 active sellers (−7.43% YoY)',
  methodology:
    'Four-platform marketplace GMV (Shopee, TikTok Shop, Lazada, Tiki), Metric. A wider measure from YouNet ECI puts 2025 platform GMV at ~VND 458.16 trillion (+26% YoY); definitions and scope differ across analysts, so cross-check before relying on a single split.',
};

/** Per-platform 2025 shares. gmvShare2025 values sum to ~100. */
export const PLATFORMS: PlatformRow[] = [
  {
    name: 'Shopee',
    parent: 'Sea Group (Singapore)',
    gmvShare2025: 56.04,
    gmvShareDisplay: '56.0%',
    changeVs2024: 'Down from a higher share as TikTok Shop scaled',
    activeSellers: '~210,000 (H1 2025, −32% YoY)',
    source: 'Metric, 2025; sellers via VinVentures / VIR, H1 2025',
  },
  {
    name: 'TikTok Shop',
    parent: 'ByteDance (China)',
    gmvShare2025: 41.31,
    gmvShareDisplay: '41.3%',
    changeVs2024: 'Up from ~29% in 2024; overtook Lazada',
    activeSellers: '~267,000 (H1 2025, +96% YoY)',
    source: 'Metric, 2025; sellers via VinVentures / VIR, H1 2025',
  },
  {
    name: 'Lazada',
    parent: 'Alibaba Group (China)',
    gmvShare2025: 2.0,
    gmvShareDisplay: '~2.0%',
    changeVs2024: 'Sharp decline; now a niche authorized-brand channel',
    activeSellers: 'Smaller, curated, declining',
    source: 'Metric, 2025',
  },
  {
    name: 'Tiki',
    parent: 'Tiki Corporation (Vietnam)',
    gmvShare2025: 0.65,
    gmvShareDisplay: '~0.65%',
    changeVs2024: 'Continued decline; curated/official-store focus',
    activeSellers: 'Small, declining',
    source: 'Metric, 2025',
  },
];
