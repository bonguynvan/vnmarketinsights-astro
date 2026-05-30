export interface PrimarySource {
  name: string;
  shortName?: string;
  category: SourceCategory;
  url: string;
  description: string;
  // Which topic pages on this site cite this source.
  usedIn: string[];
  // True for official/primary sources (government, central bank, exchange);
  // false for secondary aggregators or industry research.
  primary: boolean;
}

export type SourceCategory =
  | 'Government & Regulator'
  | 'Banking & Payments'
  | 'Stock Market'
  | 'Industry Association'
  | 'International'
  | 'Research & Media';

export const PRIMARY_SOURCES: PrimarySource[] = [
  // Government & Regulator
  {
    name: 'Ministry of Industry and Trade',
    shortName: 'MOIT',
    category: 'Government & Regulator',
    url: 'https://moit.gov.vn',
    description: 'E-commerce policy, trade statistics, retail sector data, and digital business regulations.',
    usedIn: ['ecommerce', 'regulations', 'consumers'],
    primary: true,
  },
  {
    name: 'Ministry of Information and Communications',
    shortName: 'MIC',
    category: 'Government & Regulator',
    url: 'https://mic.gov.vn',
    description: 'Telecom, internet, and digital platform regulations; cybersecurity policy.',
    usedIn: ['platforms', 'regulations'],
    primary: true,
  },
  {
    name: 'General Statistics Office of Vietnam',
    shortName: 'GSO',
    category: 'Government & Regulator',
    url: 'https://www.gso.gov.vn',
    description: 'National statistics on demographics, GDP, household income, retail sales, and trade.',
    usedIn: ['consumers', 'ecommerce'],
    primary: true,
  },

  // Banking & Payments
  {
    name: 'State Bank of Vietnam',
    shortName: 'SBV',
    category: 'Banking & Payments',
    url: 'https://www.sbv.gov.vn',
    description: 'Central bank — monetary policy, payment system supervision, intermediary payment service licensing.',
    usedIn: ['payments', 'regulations', 'financial-markets'],
    primary: true,
  },
  {
    name: 'National Payment Corporation of Vietnam',
    shortName: 'NAPAS',
    category: 'Banking & Payments',
    url: 'https://napas.com.vn',
    description: 'National payment switch — interbank transfers, VietQR standard, domestic card scheme.',
    usedIn: ['payments'],
    primary: true,
  },

  // Stock Market
  {
    name: 'State Securities Commission of Vietnam',
    shortName: 'SSC',
    category: 'Stock Market',
    url: 'https://www.ssc.gov.vn',
    description: 'Securities regulator — listing rules, disclosure requirements, market surveillance.',
    usedIn: ['financial-markets', 'regulations'],
    primary: true,
  },
  {
    name: 'Ho Chi Minh City Stock Exchange',
    shortName: 'HOSE',
    category: 'Stock Market',
    url: 'https://www.hsx.vn',
    description: 'Primary equity exchange — VN-Index, VN30, large-cap listings.',
    usedIn: ['financial-markets'],
    primary: true,
  },
  {
    name: 'Hanoi Stock Exchange',
    shortName: 'HNX',
    category: 'Stock Market',
    url: 'https://www.hnx.vn',
    description: 'Secondary equity exchange and government bond market.',
    usedIn: ['financial-markets'],
    primary: true,
  },
  {
    name: 'Vietnam Securities Depository',
    shortName: 'VSD',
    category: 'Stock Market',
    url: 'https://www.vsd.vn',
    description: 'Clearing, settlement, and securities registration for HOSE, HNX, and UPCoM.',
    usedIn: ['financial-markets'],
    primary: true,
  },

  // Industry Association
  {
    name: 'Vietnam E-commerce Association',
    shortName: 'VECOM',
    category: 'Industry Association',
    url: 'https://vecom.vn',
    description: 'E-commerce industry index, annual market reports, member data.',
    usedIn: ['ecommerce', 'payments'],
    primary: false,
  },
  {
    name: 'Vietnam Banks Association',
    shortName: 'VNBA',
    category: 'Industry Association',
    url: 'https://www.vnba.org.vn',
    description: 'Banking industry coordination and policy advocacy.',
    usedIn: ['payments', 'regulations'],
    primary: false,
  },

  // International
  {
    name: 'World Bank',
    category: 'International',
    url: 'https://data.worldbank.org/country/vietnam',
    description: 'Macro indicators, financial inclusion (Global Findex), business environment scores.',
    usedIn: ['consumers', 'payments', 'ecommerce'],
    primary: false,
  },
  {
    name: 'International Monetary Fund',
    shortName: 'IMF',
    category: 'International',
    url: 'https://www.imf.org/en/Countries/VNM',
    description: 'Country reports, GDP and external balance projections.',
    usedIn: ['financial-markets', 'consumers'],
    primary: false,
  },
  {
    name: 'Asian Development Bank',
    shortName: 'ADB',
    category: 'International',
    url: 'https://www.adb.org/countries/viet-nam/main',
    description: 'Infrastructure financing reports, sectoral assessments.',
    usedIn: ['logistics', 'consumers'],
    primary: false,
  },

  // Research & Media
  {
    name: 'NielsenIQ Vietnam',
    category: 'Research & Media',
    url: 'https://nielseniq.com/global/en/locations/vietnam',
    description: 'Retail measurement, consumer panel data, FMCG share.',
    usedIn: ['consumers', 'ecommerce'],
    primary: false,
  },
  {
    name: 'Kantar Worldpanel Vietnam',
    category: 'Research & Media',
    url: 'https://www.kantarworldpanel.com/global',
    description: 'Household consumption panels for FMCG categories.',
    usedIn: ['consumers'],
    primary: false,
  },
  {
    name: 'Statista (Vietnam digital)',
    category: 'Research & Media',
    url: 'https://www.statista.com/markets/418/topic/484/internet/',
    description: 'Aggregated market-sizing figures (treated as triangulation, not primary).',
    usedIn: ['ecommerce', 'platforms'],
    primary: false,
  },
  {
    name: 'Google–Temasek–Bain e-Conomy SEA report',
    category: 'Research & Media',
    url: 'https://economysea.withgoogle.com',
    description: 'Annual Southeast Asia digital economy report including Vietnam estimates.',
    usedIn: ['ecommerce', 'financial-markets'],
    primary: false,
  },
];

export const SOURCE_CATEGORIES: SourceCategory[] = [
  'Government & Regulator',
  'Banking & Payments',
  'Stock Market',
  'Industry Association',
  'International',
  'Research & Media',
];

export function groupSourcesByCategory(): Record<SourceCategory, PrimarySource[]> {
  const grouped: Partial<Record<SourceCategory, PrimarySource[]>> = {};
  for (const cat of SOURCE_CATEGORIES) grouped[cat] = [];
  for (const source of PRIMARY_SOURCES) {
    (grouped[source.category] as PrimarySource[]).push(source);
  }
  return grouped as Record<SourceCategory, PrimarySource[]>;
}
