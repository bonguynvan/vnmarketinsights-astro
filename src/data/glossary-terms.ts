export interface GlossaryTerm {
  slug: string;
  term: string;
  category: GlossaryCategory;
  definition: string;
  relatedTopics: string[];
}

export type GlossaryCategory =
  | 'Payments'
  | 'E-commerce'
  | 'Logistics'
  | 'Platforms'
  | 'Regulations'
  | 'Infrastructure'
  | 'Consumers';

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  'Payments',
  'E-commerce',
  'Logistics',
  'Platforms',
  'Regulations',
  'Infrastructure',
  'Consumers',
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const RAW_TERMS: Array<Omit<GlossaryTerm, 'slug'>> = [
  {
    term: 'VietQR',
    category: 'Payments',
    definition:
      'A standardized QR code system for payments in Vietnam, enabling interoperability between banks and e-wallets for instant bank transfers.',
    relatedTopics: ['payments'],
  },
  {
    term: 'NAPAS',
    category: 'Infrastructure',
    definition:
      'National Payment Corporation of Vietnam. The national payment switch that handles interbank transfers, QR standardization, and ATM/POS switching.',
    relatedTopics: ['payments', 'regulations'],
  },
  {
    term: 'COD (Cash on Delivery)',
    category: 'E-commerce',
    definition:
      'A payment method where customers pay in cash when receiving their order. Still widely used in Vietnam, especially in rural areas and for first-time online buyers.',
    relatedTopics: ['ecommerce', 'payments'],
  },
  {
    term: 'E-wallet',
    category: 'Payments',
    definition:
      'Digital payment applications that store funds electronically. Major examples in Vietnam include Momo, ZaloPay, ViettelPay, and ShopeePay.',
    relatedTopics: ['payments'],
  },
  {
    term: 'Super-app',
    category: 'Platforms',
    definition:
      'A mobile application that integrates multiple services—messaging, payments, ride-hailing, food delivery, and more. Grab and Zalo are leading examples in Vietnam.',
    relatedTopics: ['platforms', 'payments'],
  },
  {
    term: 'BNPL (Buy Now Pay Later)',
    category: 'Payments',
    definition:
      "A short-term financing option allowing consumers to purchase items and pay in installments, often interest-free. Growing rapidly in Vietnam's e-commerce sector.",
    relatedTopics: ['payments', 'ecommerce', 'consumers'],
  },
  {
    term: 'SBV (State Bank of Vietnam)',
    category: 'Regulations',
    definition:
      'The central bank of Vietnam responsible for monetary policy, banking regulation, and payment system oversight.',
    relatedTopics: ['regulations', 'payments'],
  },
  {
    term: 'CIC (Credit Information Center)',
    category: 'Infrastructure',
    definition:
      "Vietnam's centralized credit bureau that maintains consumer and corporate credit histories, operated under the State Bank of Vietnam.",
    relatedTopics: ['regulations', 'payments'],
  },
  {
    term: 'MoMo',
    category: 'Payments',
    definition:
      "Vietnam's largest e-wallet by user base, with approximately 30 million users. Known for its extensive agent network and rewards ecosystem.",
    relatedTopics: ['payments', 'platforms'],
  },
  {
    term: 'ZaloPay',
    category: 'Payments',
    definition:
      "An e-wallet integrated with Zalo, Vietnam's most popular messaging app, enabling social payments and transfers.",
    relatedTopics: ['payments', 'platforms'],
  },
  {
    term: 'Last-mile Delivery',
    category: 'Logistics',
    definition:
      "The final step of the delivery process where goods reach the end customer. A critical and challenging component of Vietnam's logistics network, especially in rural areas.",
    relatedTopics: ['logistics', 'ecommerce'],
  },
  {
    term: 'Cross-border E-commerce',
    category: 'E-commerce',
    definition:
      'Online shopping that involves purchasing from foreign sellers. Vietnamese consumers actively buy from platforms like Shopee, Lazada, and international sites.',
    relatedTopics: ['ecommerce', 'payments', 'regulations'],
  },
  {
    term: 'Decree 52/2013/ND-CP',
    category: 'Regulations',
    definition:
      'The foundational legal framework governing e-commerce activities in Vietnam, including consumer protection, information disclosure, and payment requirements.',
    relatedTopics: ['regulations', 'ecommerce'],
  },
  {
    term: 'Circular 19/2016/TT-NHNN',
    category: 'Regulations',
    definition:
      'A State Bank of Vietnam circular regulating intermediary payment services, including e-wallets and payment gateways.',
    relatedTopics: ['regulations', 'payments'],
  },
  {
    term: 'Gen Z / Gen Y',
    category: 'Consumers',
    definition:
      "Generational demographics driving Vietnam's digital economy. Gen Z (born 1997-2012) and Gen Y/Millennials (born 1981-1996) comprise the majority of digital-first consumers.",
    relatedTopics: ['consumers', 'ecommerce', 'platforms'],
  },
  {
    term: 'Agent Network',
    category: 'Payments',
    definition:
      'A physical network of small shops and merchants that accept deposits and withdrawals for e-wallet services, crucial for financial inclusion in rural Vietnam.',
    relatedTopics: ['payments'],
  },
  {
    term: 'Neobank',
    category: 'Payments',
    definition:
      'Digital-only banks without physical branches. Examples in Vietnam include Timo, Cake by VPBank, and LiveBank, offering mobile-first banking experiences.',
    relatedTopics: ['payments'],
  },
  {
    term: 'Grab',
    category: 'Platforms',
    definition:
      "Southeast Asia's leading super-app, dominant in Vietnam for ride-hailing, food delivery, and financial services through its Moca wallet integration.",
    relatedTopics: ['platforms', 'payments', 'logistics'],
  },
  {
    term: 'Shopee',
    category: 'E-commerce',
    definition:
      'The leading e-commerce marketplace in Vietnam by traffic and GMV, owned by Sea Group (Singapore). Features integrated payment system ShopeePay.',
    relatedTopics: ['ecommerce', 'payments', 'platforms'],
  },
  {
    term: 'Lazada',
    category: 'E-commerce',
    definition:
      'Major e-commerce platform in Vietnam, owned by Alibaba Group. Known for LazMall (branded goods) and cross-border shopping features.',
    relatedTopics: ['ecommerce', 'payments', 'logistics'],
  },
  {
    term: 'Tiki',
    category: 'E-commerce',
    definition:
      'Vietnam-born e-commerce platform, originally focused on books, now expanded to general merchandise. Known for TikiNow fast delivery service.',
    relatedTopics: ['ecommerce', 'logistics'],
  },
  {
    term: 'VNPay',
    category: 'Payments',
    definition:
      'A major payment service provider in Vietnam offering QR code solutions, payment gateways, and banking app integrations.',
    relatedTopics: ['payments'],
  },
  {
    term: 'ViettelPay',
    category: 'Payments',
    definition:
      "E-wallet backed by state-owned Viettel Group (Vietnam's largest telecom), with strong presence in rural and remote areas leveraging Viettel's network.",
    relatedTopics: ['payments', 'platforms'],
  },
  {
    term: 'Moca',
    category: 'Payments',
    definition:
      "E-wallet integrated with Grab's super-app in Vietnam, focused on transportation, food delivery, and lifestyle payments.",
    relatedTopics: ['payments', 'platforms', 'logistics'],
  },
  {
    term: 'GMV (Gross Merchandise Value)',
    category: 'E-commerce',
    definition:
      'The total value of goods sold through a marketplace or platform over a period, before deducting fees, discounts, or returns. The headline metric used to size Vietnam e-commerce platforms like Shopee, Lazada, and TikTok Shop.',
    relatedTopics: ['ecommerce', 'platforms'],
  },
  {
    term: 'Marketplace',
    category: 'E-commerce',
    definition:
      'An online platform that connects many third-party sellers with buyers, handling discovery, checkout, and often logistics. In Vietnam the major marketplaces are Shopee, Lazada, TikTok Shop, and Tiki.',
    relatedTopics: ['ecommerce', 'platforms'],
  },
  {
    term: 'Live Commerce',
    category: 'E-commerce',
    definition:
      'Selling products through live video streams where hosts demonstrate items and viewers buy in real time. A fast-growing channel in Vietnam, driven by TikTok, Facebook, and platform-native livestreams.',
    relatedTopics: ['ecommerce', 'platforms', 'consumers'],
  },
  {
    term: 'Fintech',
    category: 'Payments',
    definition:
      'Financial technology — companies using software to deliver payments, lending, wealth, and insurance services. In Vietnam, fintech is led by e-wallets and QR payments, expanding into digital lending and BNPL.',
    relatedTopics: ['payments', 'regulations'],
  },
  {
    term: 'FDI (Foreign Direct Investment)',
    category: 'Regulations',
    definition:
      'Investment by a foreign company or individual into business operations in Vietnam — building factories, establishing entities, or taking equity. A major driver of Vietnam\'s manufacturing growth and "China + 1" supply-chain role.',
    relatedTopics: ['regulations', 'financial-markets'],
  },
  {
    term: 'SME (Small and Medium Enterprise)',
    category: 'Regulations',
    definition:
      'Small and medium-sized enterprises — the backbone of Vietnam\'s economy by business count and employment. Many Vietnamese online sellers and merchants are micro-SMEs operating on marketplaces and social platforms.',
    relatedTopics: ['regulations', 'ecommerce'],
  },
  {
    term: 'Foreign Ownership Limit',
    category: 'Regulations',
    definition:
      'The maximum stake a foreign investor may hold in a Vietnamese company in a given sector, set by WTO commitments and trade agreements. Limits vary by industry; some sectors allow 100% foreign ownership while others require a local partner.',
    relatedTopics: ['regulations', 'financial-markets'],
  },
];

export const GLOSSARY_TERMS: GlossaryTerm[] = RAW_TERMS.map((entry) => ({
  ...entry,
  slug: slugify(entry.term),
}));

export function getGlossaryTermBySlug(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((term) => term.slug === slug);
}

export function getRelatedGlossaryTerms(term: GlossaryTerm, limit = 4): GlossaryTerm[] {
  return GLOSSARY_TERMS
    .filter((other) => other.slug !== term.slug && other.category === term.category)
    .slice(0, limit);
}
