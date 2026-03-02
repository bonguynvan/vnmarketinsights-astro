# Vietnam Market Insights

A neutral, reference-style knowledge base about the Vietnamese market. Built with Astro (hybrid output: prerendered pages + serverless APIs).

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

### Growth Event Tracking

The project now tracks acquisition funnel events beyond base pageviews, including:

- `homepage_cta_click`, `homepage_quickstart_click`
- `topic_card_click`, `tools_hub_click`, `insight_click`
- `tool_form_started`, `tool_submitted`, `tool_success`, `tool_error`
- `first_value_received`, `lead_capture_submit`, `lead_pending_confirmation`, `lead_confirmed`
- `search_open`, `search_query`
- `workspace_goal_added`, `workspace_goal_toggled`, `workspace_goal_removed`
- `workspace_replay_started`, `tool_replay_item_success`, `tool_replay_item_error`, `tool_replay_completed`

These events are emitted through a shared `window.vmiTrack()` helper in `src/layouts/BaseLayout.astro`.

### Lead Capture Backend (Double Opt-In)

Lead capture now uses backend endpoints instead of `mailto:` for better growth operations:

- `POST /api/leads/subscribe` creates or updates a pending subscriber (anti-duplicate by email).
- `GET /api/leads/confirm?token=...` confirms subscription (double opt-in).
- `GET /api/leads/admin` returns lead summary/list (requires admin key).

Optional environment variables:

- `LEAD_WEBHOOK_URL` to forward lead + confirmation payload to your email/CRM automation.
- `ADMIN_LEADS_KEY` required to access `/api/leads/admin` and `/admin/leads`.
- `ALLOW_ADMIN_KEY_QUERY=true` only if you need temporary query-string auth fallback for `/api/leads/admin`.
- `PUBLIC_EXPOSE_CONFIRM_LINK=true` to return confirm link directly in API response (useful for local/manual testing only).

Leads are stored locally at `data/leads.json` in this project.

### Weekly Growth Loop

Use `docs/GROWTH-EXPERIMENTS.md` as the operating playbook for:

- choosing one weekly hypothesis,
- shipping one focused acquisition experiment,
- validating event quality,
- deciding keep/iterate/revert each Friday.

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

This project uses **Astro hybrid output** with **Vercel serverless adapter**:

- Static pages are prerendered for SEO and fast delivery.
- API routes (`/api/analyze`, `/api/keywords`, `/api/leads/*`) run as serverless functions.

**Build command:**
```bash
npm run build
```

Build outputs:

- Vercel deployment bundle: `.vercel/output/`
- Static pages + assets: `.vercel/output/static/`
- Post-build indexing/sitemap currently target `.vercel/output/static/`

### Required environment variables (production)

- `PUBLIC_GA_MEASUREMENT_ID` (optional if GA4 disabled)
- `ADMIN_LEADS_KEY` (required for `/admin/leads` and `/api/leads/admin`)
- `LEAD_WEBHOOK_URL` (recommended for durable lead handling and downstream email/CRM automation)

### Vercel setup

- Framework preset: Astro
- Build command: `npm run build`
- Output directory: leave default for Astro/Vercel integration
- Node runtime: Vercel will run functions on supported Node version automatically

### V2 Smoke Checklist (post-deploy)

Run these checks before announcing v2:

1. `/snapshot` can analyze a public domain and returns non-error result.
2. `/keywords` can run a query and render table rows.
3. Replay from `/workspace` works for both snapshot and keywords.
4. Save-to-goal works from both tools and appears in `/workspace`.
5. Lead submit returns pending confirmation state; confirm link marks lead as confirmed.
6. `/admin/leads` loads with `x-admin-key` header flow.
7. Search modal works in production build (Pagefind assets available).
8. `sitemap.xml` resolves in deployed static output.

## License

This is a reference project. Content should be factual and properly attributed.
