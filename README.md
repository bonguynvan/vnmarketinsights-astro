# Vietnam Market Insights

A neutral, reference-style knowledge base about the Vietnamese market. Built with Astro for static site generation.

## Philosophy

This site is designed to be:
- **Calm**: No visual noise, no distractions
- **Trustworthy**: Factual, neutral, well-sourced
- **Structured**: Consistent organization across all topics
- **Minimal**: Typography-first, content-focused
- **Engineer-minded**: Clear, scannable, reference-oriented

## Project Structure

```
vnmarket-astro/
├── src/
│   ├── layouts/
│   │   ├── BaseLayout.astro      # Global layout with header, footer, nav, GA4
│   │   ├── CanonicalLayout.astro
│   │   └── TopicLayout.astro
│   ├── pages/
│   │   ├── index.astro           # Home: hero, two pillars, trend preview
│   │   ├── topics/index.astro    # Hub: all topics + financial-markets
│   │   ├── tools/index.astro     # Hub: Snapshot, Keyword Miner, Trend Radar
│   │   ├── insights/index.astro  # Articles listing
│   │   ├── insights/[slug].astro # Single article (content/articles)
│   │   ├── financial-markets.astro
│   │   ├── payments.astro … platforms.astro
│   │   ├── snapshot.astro, keywords.astro, trends/, weekly.astro
│   │   ├── about.astro, glossary.astro, changelog.astro, 404.astro
│   │   └── api/
│   ├── content/articles/         # Markdown (content collection)
│   └── styles/ + global.css
├── public/global.css
├── astro.config.mjs
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Navigate to the project directory
cd vnmarket-astro

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server will start at `http://localhost:4321`.

### Google Analytics (GA4)

To track traffic, create a GA4 property at [analytics.google.com](https://analytics.google.com) and set the measurement ID in your environment:

- **Build (e.g. Vercel/Netlify):** Add env var `PUBLIC_GA_MEASUREMENT_ID` (e.g. `G-XXXXXXXXXX`).
- **Local:** Create `.env` with `PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` (optional; leave unset to disable GA).

The layout only injects the gtag script when `PUBLIC_GA_MEASUREMENT_ID` is set.

## Adding a New Topic Page

To add a new topic (e.g., "manufacturing"):

### 1. Create the Page File

Create a new file at `src/pages/manufacturing.astro`:

```astro
---
import TopicLayout from '../layouts/TopicLayout.astro';

const title = "Vietnam Manufacturing";
const lastUpdated = "February 2026";
---

<TopicLayout title={title} lastUpdated={lastUpdated}>
  <section>
    <h2>Overview</h2>
    <p>
      3-4 factual, neutral sentences about the topic.
    </p>
  </section>

  <section>
    <h2>Key Characteristics</h2>
    <ul class="characteristics-list">
      <li>Bullet point facts</li>
      <li>No opinions or predictions</li>
    </ul>
  </section>

  <section>
    <h2>Market Structure or Key Components</h2>
    <!-- Use h3 for subsections, bullet lists for content -->
  </section>

  <section>
    <h2>Major Players</h2>
    <!-- Neutral list, no rankings -->
  </section>

  <section>
    <h2>Why This Matters</h2>
    <ul class="characteristics-list">
      <li>Practical implications</li>
      <li>No opinions or predictions</li>
    </ul>
  </section>

  <section>
    <h2>Sources</h2>
    <ul class="sources-list">
      <li>Public, reputable sources only</li>
    </ul>
  </section>
</TopicLayout>
```

### 2. Add to Navigation

Update `src/layouts/BaseLayout.astro` to include the new topic in the navigation:

```astro
<nav class="site-nav" aria-label="Main navigation">
  <a href="/">Home</a>
  <a href="/payments">Payments</a>
  <a href="/ecommerce">E-commerce</a>
  <a href="/logistics">Logistics</a>
  <a href="/consumers">Consumers</a>
  <a href="/regulations">Regulations</a>
  <a href="/platforms">Platforms</a>
  <a href="/manufacturing">Manufacturing</a>  <!-- Add this -->
</nav>
```

### 3. Add to Home Page

Update `src/pages/index.astro` to include the new topic in the `topics` array:

```astro
const topics = [
  // ... existing topics
  {
    slug: 'manufacturing',
    title: 'Manufacturing',
    description: 'Industrial production, factories, and supply chain operations.'
  }
];
```

## Content Guidelines

### Tone and Style

1. **Neutral language**: No hype, no marketing speak, no opinions
2. **Factual only**: State what is, not what might be
3. **No predictions**: Avoid forecasting future trends
4. **No rankings**: List players neutrally, don't evaluate
5. **Cite sources**: All information from reputable, public sources

### Structure Template

Every topic page follows this exact structure:

1. **Overview** (3-4 sentences)
2. **Key Characteristics** (bullet points, facts only)
3. **Market Structure / Key Components** (subsections with bullets)
4. **Major Players** (neutral list)
5. **Why This Matters** (practical implications)
6. **Sources** (reputable, public sources)

### HTML/CSS Classes

- Use `class="characteristics-list"` for bullet points without markers
- Use `class="sources-list"` for smaller source citations
- Use `<section>` to group related content
- Use `<h2>` for main sections, `<h3>` for subsections

## Design System

### Colors

```css
--color-bg: #fefefe;           /* Off-white background */
--color-text: #1a1a1a;         /* Near-black text */
--color-text-muted: #5a5a5a;   /* Secondary text */
--color-border: #e5e5e5;       /* Subtle borders */
--color-accent: #2563eb;       /* Blue for links */
```

### Typography

- System font stack for maximum compatibility
- Comfortable line height (1.6)
- Clear heading hierarchy
- Page content width: 960px (consistent across all pages)

### Spacing

- Consistent 8px base unit
- Generous whitespace between sections
- Comfortable reading margins

## Deployment

This is a static Astro site. Build output goes to the `dist/` directory.

**Build:**
```bash
npm run build
```
Post-build runs Pagefind (search index) and sitemap generation automatically.

**Deploy** the `dist/` folder to any static host:

- **Vercel:** Connect the repo; build command `npm run build`, output directory `dist`. Add `PUBLIC_GA_MEASUREMENT_ID` in Environment Variables if using GA4.
- **Netlify:** Build command `npm run build`, publish directory `dist`. Same env var for GA4.
- **Cloudflare Pages / GitHub Pages:** Build as above, then upload or push `dist/`.

## License

This is a reference project. Content should be factual and properly attributed.
