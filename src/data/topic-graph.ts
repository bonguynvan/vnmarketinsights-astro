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
    related: ['ecommerce', 'consumers', 'logistics'],
  },
  payments: {
    slug: 'payments',
    title: 'Payments',
    description: 'Payment methods, e-wallets, banking infrastructure, and financial services.',
    related: ['fintech', 'ecommerce', 'platforms', 'financial-markets'],
  },
  fintech: {
    slug: 'fintech',
    title: 'Fintech',
    description: 'Digital payments, lending, neobanks, insurtech, wealthtech, and the fintech ecosystem.',
    related: ['payments', 'financial-markets', 'regulations', 'platforms'],
  },
  logistics: {
    slug: 'logistics',
    title: 'Logistics',
    description: 'Shipping networks, last-mile delivery, and supply chain structures.',
    related: ['ecommerce', 'platforms', 'regulations'],
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
    related: ['ecommerce', 'platforms', 'payments'],
  },
  regulations: {
    slug: 'regulations',
    title: 'Regulations',
    description: 'Legal framework, licensing, data protection, and sector-specific compliance.',
    related: ['fintech', 'payments', 'platforms', 'financial-markets'],
  },
  'financial-markets': {
    slug: 'financial-markets',
    title: 'Financial Markets',
    description: 'Stock market, exchanges, indices, and investment landscape in Vietnam.',
    related: ['fintech', 'payments', 'regulations', 'consumers'],
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
