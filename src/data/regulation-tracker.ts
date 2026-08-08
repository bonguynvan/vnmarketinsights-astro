// Single source of truth for the Vietnam Regulation Tracker — laws and decrees
// that change the economics or legality of selling into Vietnam as a foreign
// operator. This is a MAINTAINED, first-party reference: every entry is dated,
// carries the official instrument number, and links a primary source plus a
// reputable secondary. When a rule changes, update the entry AND its
// `lastVerified` date so the recency is honest.
//
// Status is evaluated relative to TRACKER_TODAY (kept in sync manually — Astro
// builds are date-pinned, and hard-coding avoids a "changes every rebuild" diff).

export type RegStatus = 'in-effect' | 'upcoming' | 'pending-guidance';

export interface RegulationEntry {
  id: string;
  /** Plain-English title of what the rule does. */
  title: string;
  /** Official instrument number, e.g. "Decree 117/2025/NĐ-CP". */
  instrument: string;
  /** High-level area. */
  category: 'Imports & customs' | 'Tax' | 'E-commerce' | 'Data & privacy';
  status: RegStatus;
  /** ISO date the rule takes / took effect. */
  effectiveDate: string;
  /** Human-readable effective date for display. */
  effectiveDisplay: string;
  /** ISO date the instrument was signed / passed (optional). */
  signedDate?: string;
  /** 1–2 sentences: what actually changed. */
  whatChanged: string;
  /** Who it hits and what a foreign operator should do about it. */
  impact: string;
  /** Primary (official) + reputable secondary sources. */
  sources: { name: string; url: string }[];
  /** ISO date this entry was last checked against sources. */
  lastVerified: string;
}

/** Reference date used to classify status. Keep in sync with TRACKER_UPDATED. */
export const TRACKER_TODAY = '2026-08-02';
/** ISO date the tracker as a whole was last reviewed. */
export const TRACKER_UPDATED = '2026-08-02';

export const REGULATIONS: RegulationEntry[] = [
  {
    id: 'ecommerce-law-2025',
    title: 'New Law on E-Commerce — extraterritorial rules for foreign platforms and sellers',
    instrument: 'Law 122/2025/QH15',
    category: 'E-commerce',
    status: 'in-effect',
    effectiveDate: '2026-07-01',
    effectiveDisplay: '1 July 2026',
    signedDate: '2025-12-10',
    whatChanged:
      "Vietnam's first stand-alone e-commerce law replaces Decree 52/2013. It applies extraterritorially via a 'Vietnam presence test' — using a .vn domain, offering Vietnamese as a display language, or crossing a transaction threshold with Vietnamese buyers triggers compliance for offshore platforms.",
    impact:
      'Foreign platforms and, depending on model, foreign brands running their own ordering site may need to register with authorities and appoint an authorised representative or establish a local legal entity. The transaction threshold and penalties sit in a guiding decree that is still pending — treat exact triggers as not-yet-final.',
    sources: [
      { name: 'National Assembly gazette (congbao.chinhphu.vn)', url: 'https://congbao.chinhphu.vn/van-ban/luat-so-122-2025-qh15-468683/61714.htm' },
      { name: 'Baker McKenzie legal alert', url: 'https://www.bakermckenzie.com/en/insight/publications/2026/02/vietnam-electronic-commerce-law-targeting-cross-border-platforms' },
    ],
    lastVerified: '2026-08-02',
  },
  {
    id: 'pdpl-2026',
    title: 'Personal Data Protection Law — consent, DPO, and cross-border transfer rules',
    instrument: 'Law 91/2025/QH15 + Decree 356/2025/NĐ-CP',
    category: 'Data & privacy',
    status: 'in-effect',
    effectiveDate: '2026-01-01',
    effectiveDisplay: '1 January 2026',
    signedDate: '2025-06-26',
    whatChanged:
      "Vietnam's first comprehensive data-protection statute replaces Decree 13/2023. It codifies strict consent rules, mandates a data-protection officer or department, requires a cross-border transfer impact assessment (TIA), sets a 72-hour breach-notification window, and adds fines up to VND 3 billion or a percentage of revenue.",
    impact:
      'Any foreign operator holding Vietnamese customer data — a DTC site, a CRM, an email list — is in scope. Storing data on overseas cloud counts as a cross-border transfer requiring a TIA filed with the Ministry of Public Security. Build consent capture and a data-handling policy before you collect Vietnamese personal data.',
    sources: [
      { name: 'National Assembly gazette (congbao.chinhphu.vn)', url: 'https://congbao.chinhphu.vn/van-ban/luat-so-91-2025-qh15-45578.htm' },
      { name: 'DLA Piper — Data Protection Laws of the World (Vietnam)', url: 'https://www.dlapiperdataprotection.com/?c=VN&t=law' },
    ],
    lastVerified: '2026-08-02',
  },
  {
    id: 'platform-tax-withholding-2025',
    title: 'E-commerce platforms must withhold VAT and personal income tax per order',
    instrument: 'Decree 117/2025/NĐ-CP',
    category: 'Tax',
    status: 'in-effect',
    effectiveDate: '2025-07-01',
    effectiveDisplay: '1 July 2025',
    signedDate: '2025-06-09',
    whatChanged:
      'Domestic and foreign e-commerce platforms with a payment function must withhold and remit VAT and personal income tax on behalf of household/individual sellers on every transaction. For goods the withholding is VAT 1% plus PIT 0.5% (resident) or 1% (non-resident); services and transport carry higher rates. Platforms declare monthly.',
    impact:
      'Your net payout per order drops by the withheld amount — model it before pricing. Sellers whose tax is withheld by the platform are exempt from separately declaring VAT/PIT on those transactions. This is already baked into our channel-selector tool.',
    sources: [
      { name: 'Ministry of Finance legal database (vbpl.vn)', url: 'https://vbpl.vn/botaichinh/Pages/vbpq-van-ban-goc.aspx?ItemID=178299' },
      { name: 'EY Global Tax Alert', url: 'https://www.ey.com/en_gl/technical/tax-alerts/vietnam-promulgates-decree-on-tax-administration-for-business-activities-on-e-commerce-and-digital-platforms-of-households-and-individuals' },
    ],
    lastVerified: '2026-08-02',
  },
  {
    id: 'de-minimis-removed-2025',
    title: 'Low-value import VAT exemption (de-minimis) removed',
    instrument: 'Decision 01/2025/QĐ-TTg',
    category: 'Imports & customs',
    status: 'in-effect',
    effectiveDate: '2025-02-18',
    effectiveDisplay: '18 February 2025',
    signedDate: '2025-01-03',
    whatChanged:
      'Repeals Decision 78/2010/QĐ-TTg, which had exempted imports worth VND 1,000,000 or less sent by express delivery from import duty and VAT. From 18 February 2025 those low-value parcels are taxed under normal rules — there is no de-minimis threshold.',
    impact:
      'Cross-border parcels now carry import duty (0–30% by HS code) plus 10% VAT, so landed cost runs materially higher than before — often the difference between a viable SKU and a dead one. Re-price every cross-border product; our landed-cost calculator reflects this change.',
    sources: [
      { name: 'LuatVietnam — Decision 01/2025/QĐ-TTg summary', url: 'https://www.luatvietnam.net/en/-vbpl133556.html' },
      { name: 'The Saigon Times (English)', url: 'https://english.thesaigontimes.vn/vat-exemption-ends-for-de-minimis-imports-from-february-18/' },
    ],
    lastVerified: '2026-08-02',
  },
];

/** Category → short accent for the UI legend. */
export const REG_CATEGORIES = ['Imports & customs', 'Tax', 'E-commerce', 'Data & privacy'] as const;

export const STATUS_LABEL: Record<RegStatus, string> = {
  'in-effect': 'In effect',
  'upcoming': 'Upcoming',
  'pending-guidance': 'Guidance pending',
};
