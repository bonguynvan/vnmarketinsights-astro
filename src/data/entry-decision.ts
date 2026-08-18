// Source of truth for the Vietnam Entry Decision Engine.
// Each category folds together our go/no-go verdict, representative import
// duty, top-platform commission, and the compliance path — so one interactive
// tool can turn a foreign operator's inputs into a personalised entry read.
// Numbers are REPRESENTATIVE estimates (duty is really by HS code, commission
// by sub-category); the tool lets the user override them. Keep in sync with the
// cluster pages and the fee/landed-cost guides.

export type Verdict = 'go' | 'go-conditional' | 'caution' | 'neutral';

export interface CategoryEntry {
  key: string;
  label: string;
  verdict: Verdict;
  verdictLabel: string;
  note: string;
  dutyMfn: number;   // representative MFN import duty %
  dutyFta: number;   // representative preferential rate under RCEP/EVFTA/CPTPP with a Certificate of Origin
  commission: number; // representative top-platform commission % (VAT-incl)
  bestChannel: string;
  compliance: string;
  complianceMonths: string;
  complianceLink: string;
  hubLink: string;   // the category go/no-go page
}

// Fixed rates shared across categories (editable in the tool).
export const VAT_PCT = 10;            // import VAT on CIF+duty (8% temp on some goods to 31 Dec 2026)
export const TXN_PCT = 6;             // platform transaction/processing fee
export const WITHHOLDING_PCT = 1.5;   // Decree 117 per-order withholding (goods, resident: 1% VAT + 0.5% PIT)

export const CATEGORIES: CategoryEntry[] = [
  {
    key: 'beauty',
    label: 'Beauty & cosmetics',
    verdict: 'go-conditional',
    verdictLabel: 'GO — with conditions',
    note: 'Huge, import-friendly demand (beauty is ~29% of e-commerce GMV), but the highest platform commission of any category and a mandatory per-SKU DAV registration.',
    dutyMfn: 18, dutyFta: 5,
    commission: 17,
    bestChannel: 'TikTok Shop (discovery) + Shopee Mall',
    compliance: 'DAV cosmetic notification (per SKU)',
    complianceMonths: '~1.5–3 months',
    complianceLink: '/guides/register-cosmetics-vietnam/',
    hubLink: '/sell-into-vietnam/beauty/',
  },
  {
    key: 'supplements',
    label: 'Health supplements',
    verdict: 'go-conditional',
    verdictLabel: 'GO — if compliance-ready',
    note: 'Fastest-growing supplement market in SEA with a strong import trust premium — but registration is a multi-month project and ~82% of sales are offline via pharmacies.',
    dutyMfn: 15, dutyFta: 5,
    commission: 16,
    bestChannel: 'Pharmacy chains + e-commerce',
    compliance: 'VFA product-declaration registration + GMP',
    complianceMonths: '~3–6 months',
    complianceLink: '/guides/register-supplements-vietnam/',
    hubLink: '/sell-into-vietnam/supplements/',
  },
  {
    key: 'food',
    label: 'Food & beverage',
    verdict: 'caution',
    verdictLabel: 'CAUTION — premium/specialty only',
    note: 'Vietnam is a food-production powerhouse, so local products win everyday categories on price. Imports only work premium/specialty/gifting, and Decree 46/2026 tightened imports.',
    dutyMfn: 20, dutyFta: 5,
    commission: 10,
    bestChannel: 'Premium modern trade (AEON) + specialty importers',
    compliance: 'VFA self-declaration / registration (Decree 46/2026)',
    complianceMonths: '~1–8 weeks',
    complianceLink: '/guides/import-food-into-vietnam/',
    hubLink: '/sell-into-vietnam/food-and-beverage/',
  },
  {
    key: 'fashion',
    label: 'Fashion & apparel',
    verdict: 'caution',
    verdictLabel: 'GO — but localize or lose',
    note: 'Biggest e-commerce category, but cross-border imports are collapsing (−23% revenue YoY) and local brands overtook fast fashion. Wins only premium/quality (US$14–60) with local execution.',
    dutyMfn: 16, dutyFta: 3,
    commission: 15,
    bestChannel: 'TikTok Shop creators + Shopee Mall',
    compliance: 'QCVN 01:2017 textile conformity declaration',
    complianceMonths: '~2–4 weeks',
    complianceLink: '/guides/import-apparel-into-vietnam/',
    hubLink: '/sell-into-vietnam/fashion/',
  },
  {
    key: 'other',
    label: 'Other / general goods',
    verdict: 'neutral',
    verdictLabel: 'Depends — model it',
    note: 'No category-specific verdict yet. Model the landed cost and net payout, then check the regulation tracker for your product\'s import and licensing rules.',
    dutyMfn: 15, dutyFta: 5,
    commission: 12,
    bestChannel: 'Shopee + TikTok Shop',
    compliance: 'Depends on product — check the regulation tracker',
    complianceMonths: '—',
    complianceLink: '/data/vietnam-regulation-tracker/',
    hubLink: '/sell-into-vietnam/',
  },
];
