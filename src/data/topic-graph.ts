export interface TopicNode {
  slug: string;
  title: string;
  description: string;
  // Slugs of topics that are strongly related, in priority order.
  // Used to auto-derive the "Related Topics" sidebar so cross-links
  // stay symmetric and a new topic doesn't require touching every page.
  related: string[];
}

export const TOPICS: Record<string, TopicNode> = {
  ecommerce: {
    slug: 'ecommerce',
    title: 'E-commerce',
    description: 'Online marketplaces, retail platforms, and digital commerce patterns.',
    related: ['retail', 'payments', 'logistics', 'platforms'],
  },
  retail: {
    slug: 'retail',
    title: 'Retail',
    description: 'Modern and traditional trade, grocery and convenience chains, and consumer retail.',
    related: ['ecommerce', 'consumers', 'tourism', 'logistics'],
  },
  banking: {
    slug: 'banking',
    title: 'Banking',
    description: 'Banks, credit growth, the State Bank of Vietnam, and the structure of the financial system.',
    related: ['payments', 'fintech', 'financial-markets', 'regulations'],
  },
  payments: {
    slug: 'payments',
    title: 'Payments',
    description: 'Payment methods, e-wallets, banking infrastructure, and financial services.',
    related: ['fintech', 'banking', 'ecommerce', 'platforms', 'financial-markets'],
  },
  fintech: {
    slug: 'fintech',
    title: 'Fintech',
    description: 'Digital payments, lending, neobanks, insurtech, wealthtech, and the fintech ecosystem.',
    related: ['payments', 'banking', 'financial-markets', 'regulations', 'platforms'],
  },
  logistics: {
    slug: 'logistics',
    title: 'Logistics',
    description: 'Shipping networks, last-mile delivery, and supply chain structures.',
    related: ['ecommerce', 'manufacturing', 'platforms', 'regulations'],
  },
  manufacturing: {
    slug: 'manufacturing',
    title: 'Manufacturing',
    description: 'Industrial production, export sectors, FDI, and the "China + 1" shift.',
    related: ['real-estate', 'logistics', 'regulations', 'financial-markets'],
  },
  'real-estate': {
    slug: 'real-estate',
    title: 'Real Estate',
    description: 'Property market, prices, foreign ownership rules, and industrial real estate.',
    related: ['banking', 'financial-markets', 'manufacturing', 'regulations'],
  },
  platforms: {
    slug: 'platforms',
    title: 'Platforms',
    description: 'Super-apps, social platforms, and digital ecosystems.',
    related: ['ecommerce', 'payments', 'consumers', 'regulations'],
  },
  consumers: {
    slug: 'consumers',
    title: 'Consumers',
    description: 'Demographics, behavior, spending patterns, and urbanization in Vietnam.',
    related: ['ecommerce', 'retail', 'tourism', 'platforms', 'payments'],
  },
  tourism: {
    slug: 'tourism',
    title: 'Tourism',
    description: 'International arrivals, source markets, visa policy, and hotel performance.',
    related: ['consumers', 'real-estate', 'regulations', 'retail'],
  },
  regulations: {
    slug: 'regulations',
    title: 'Regulations',
    description: 'Legal framework, licensing, data protection, and sector-specific compliance.',
    related: ['fintech', 'banking', 'payments', 'platforms', 'financial-markets'],
  },
  'financial-markets': {
    slug: 'financial-markets',
    title: 'Financial Markets',
    description: 'Stock market, exchanges, indices, and investment landscape in Vietnam.',
    related: ['banking', 'fintech', 'payments', 'regulations', 'consumers'],
  },
};

export interface RelatedTopic {
  slug: string;
  title: string;
  description: string;
}

export function getRelatedTopics(currentSlug: string, limit = 3): RelatedTopic[] {
  const node = TOPICS[currentSlug];
  if (!node) return [];
  return node.related
    .map((slug) => TOPICS[slug])
    .filter((topic): topic is TopicNode => Boolean(topic))
    .slice(0, limit)
    .map(({ slug, title, description }) => ({ slug, title, description }));
}

export function getAllTopics(): TopicNode[] {
  return Object.values(TOPICS);
}
