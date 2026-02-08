# Canonical Content Page Design
## vnmarketinsights.com Reference System

---

## 1. PAGE PURPOSE

**Primary Goal:** Enable users to quickly understand, reference, and reuse information about a specific Vietnam market topic.

**Secondary Goal:** Encourage natural exploration of related topics through contextual linking.

**User Mental Model:**
> "I need reliable data about [topic]. I want to scan it, bookmark it, and come back when I need to verify something."

---

## 2. INFORMATION ARCHITECTURE (STRICT ORDER)

### Fixed Section Sequence

```
┌─────────────────────────────────────────────────────────────┐
│  PAGE TITLE (H1)                                            │
│  Vietnam Payments Market                                    │
├─────────────────────────────────────────────────────────────┤
│  SECTION 1: DEFINITION PARAGRAPH                            │
│  [One neutral paragraph defining the scope]                 │
├─────────────────────────────────────────────────────────────┤
│  SECTION 2: KEY FACTS                                       │
│  [Bullet list of essential data points]                     │
├─────────────────────────────────────────────────────────────┤
│  SECTION 3: MARKET STRUCTURE                                │
│  [Component breakdown with relationships]                   │
├─────────────────────────────────────────────────────────────┤
│  SECTION 4: KEY METHODS / CATEGORIES                        │
│  [Data table - analyst style]                               │
├─────────────────────────────────────────────────────────────┤
│  SECTION 5: MAJOR PLAYERS                                   │
│  [Grouped listing, alphabetical, no ranking]                │
├─────────────────────────────────────────────────────────────┤
│  SECTION 6: VIETNAM-SPECIFIC NOTES                          │
│  [Context unique to Vietnam market]                         │
├─────────────────────────────────────────────────────────────┤
│  SECTION 7: WHY THIS MATTERS                                │
│  [Practical implications only]                              │
├─────────────────────────────────────────────────────────────┤
│  SECTION 8: RELATED TOPICS                                  │
│  [Internal links to connected subjects]                     │
├─────────────────────────────────────────────────────────────┤
│  SECTION 9: SOURCES & METHODOLOGY                           │
│  [Attribution + limitations]                                │
├─────────────────────────────────────────────────────────────┤
│  SECTION 10: LAST REVIEWED                                  │
│  [Date + changelog link]                                    │
└─────────────────────────────────────────────────────────────┘
```

### Section Details

#### 1. Page Title (H1)
- Format: "[Topic]: [Descriptor]"
- Example: "Vietnam Payments Market: Methods, Infrastructure, Participants"
- Character limit: 60-70
- Anchor: `#overview`

#### 2. Definition Paragraph
- Length: 80-120 words
- Tone: Neutral, definitional
- Must include: Scope boundary, time reference, primary entities
- Anchor: `#definition`

Example:
```
Vietnam's payments market encompasses all systems and methods for transferring
monetary value between parties within the country's economy. As of 2024, the
market processes approximately $400-450 billion in annual transaction volume
across cash, digital transfers, card payments, and mobile wallet transactions.
The market structure includes traditional banking infrastructure, national
payment switches (NAPAS), e-wallet providers, card networks, and emerging
fintech platforms operating under State Bank of Vietnam regulation.
```

#### 3. Key Facts
- Format: Bullet list, 6-10 items
- Content: Quantified facts, percentages, key dates
- Anchor: `#key-facts`

Example structure:
- Total transaction volume: $X billion (Year)
- Digital payment share: X% of total
- Primary methods: [List]
- Regulatory body: [Entity]
- Infrastructure components: [Count]
- Geographic coverage: [Stat]

#### 4. Market Structure
- Format: H3 subsections OR visual diagram
- Content: Component relationships, flow, hierarchy
- Anchor: `#market-structure`

Subsections example:
- Payment Infrastructure Layer
- Service Provider Layer
- Consumer Interface Layer

#### 5. Key Methods / Categories
- Format: Data table (analyst style)
- Columns: Method | Volume/Share | Key Providers | Use Case
- Sort: Alphabetical by method
- Anchor: `#methods`

Table style:
- Clean borders
- Left-aligned text
- Right-aligned numbers
- Muted header background
- Monospace for figures

#### 6. Major Players
- Format: Grouped by category, alphabetical within groups
- No ranking numbers
- No "top" or "best" language
- Anchor: `#major-players`

Group example:
- **Banks**: [List alphabetically]
- **E-wallets**: [List alphabetically]
- **Infrastructure**: [List alphabetically]
- **Technology Platforms**: [List alphabetically]

#### 7. Vietnam-Specific Notes
- Format: Bullet list or short paragraphs
- Content: Unique characteristics, regulatory quirks, cultural factors
- Anchor: `#vietnam-context`

Example notes:
- VietQR standard (national QR interoperability)
- Cash-to-digital transition speed
- Mobile-first adoption pattern
- Regulatory sandbox limitations

#### 8. Why This Matters
- Format: Bullet list
- Content: Practical implications for businesses, investors, operators
- No: "This is important because..."
- Yes: "Businesses must account for..."
- Anchor: `#implications`

Example:
- Merchants must support 5-7 payment methods minimum
- Foreign fintechs face licensing and partnership requirements
- Real-time settlement creates working capital implications
- Rural market requires agent network integration

#### 9. Related Topics
- Format: 3-5 card-style links OR inline list
- Placement: BEFORE sources
- Anchor: `#related-topics`

Link format:
- Title + one-line description
- Contextual anchor text

Example:
- [Fintech Landscape Vietnam](/fintech-vietnam) — Digital banking, lending, and financial services
- [Vietnam Digital Economy Overview](/vietnam-digital-economy-overview) — Broader market context
- [Vietnam Consumer Internet Behavior](/vietnam-internet-penetration) — User adoption patterns

#### 10. Sources & Methodology
- Format: Collapsible section (details/summary)
- Content:
  - Primary sources list
  - Data collection period
  - Limitations stated explicitly
  - Methodology link
- Anchor: `#sources`

Example:
```
Sources:
- State Bank of Vietnam Annual Report 2024
- NAPAS Transaction Statistics Q3 2024
- Ministry of Industry and Trade E-commerce White Paper
- World Bank Global Payments Report

Methodology: Data compiled from official publications and verified industry reports.
Figures represent latest available data as of publication date. Cross-border
estimates based on disclosed platform volumes and sampling.

Limitations: Private company data may reflect estimated values. Cash transaction
estimates derived from central bank sampling. Regional variations not fully
represented in national aggregates.
```

#### 11. Last Reviewed
- Format: Small text, bottom of page
- Content: Date + link to changelog
- Style: Muted, unobtrusive but visible
- Anchor: `#last-reviewed`

Example:
```
Last reviewed: February 2026. View [update history](/changelog).
```

---

## 3. UX INTERACTIONS

### A. Section Anchors

**Design:**
- Every H2 and H3 has a visible anchor link (¶ icon)
- Icon appears on hover (desktop) or always visible (mobile)
- Click copies URL to clipboard OR scrolls to anchor

**Implementation:**
```html
<h2 id="key-facts">
  Key Facts
  <a href="#key-facts" class="anchor-link" aria-label="Copy link to Key Facts section">
    <svg><!-- paragraph icon --></svg>
  </a>
</h2>
```

**Behavior:**
- Hover: Icon opacity 0 → 1
- Click: URL updates to #anchor, clipboard copy, toast "Link copied"
- Mobile: Icon always visible, smaller size

### B. Utility Actions Bar

**Position:** Fixed top-right on desktop, sticky bottom on mobile
**Design:** Minimal, icon-only with tooltips

**Actions:**
1. **Copy Summary** (clipboard icon)
   - Copies: Title + Definition + Key Facts (Markdown format)
   - Toast: "Summary copied to clipboard"

2. **Copy Section** (section icon)
   - Copies: Current section text (Markdown)
   - Requires: Section detection via scroll position

3. **Download CSV** (download icon)
   - Available: Only on pages with data tables
   - Downloads: All tables as CSV
   - Filename: `vnmarket-[topic]-[date].csv`

4. **Print** (print icon)
   - Opens: Print dialog with optimized stylesheet
   - Hides: Navigation, utility bar, unrelated sections

**Mobile Adaptation:**
- Bar moves to bottom of screen
- Icons larger (44px touch target)
- Swipe-up reveals full label

### C. Reading Orientation (Sticky Index)

**Desktop Design:**
- Left sidebar, sticky position
- Lists all H2 sections
- Highlights current section on scroll
- Click navigates to section

**Implementation:**
```html
<nav class="section-index" aria-label="Page sections">
  <ul>
    <li class="active"><a href="#definition">Definition</a></li>
    <li><a href="#key-facts">Key Facts</a></li>
    <li><a href="#market-structure">Market Structure</a></li>
    <!-- ... -->
  </ul>
</nav>
```

**Behavior:**
- Scroll spy: Updates active class based on scroll position
- Offset: Accounts for sticky header (80px)
- Click: Smooth scroll to section
- No animations: Instant state change

**Mobile Design:**
- Collapses to dropdown (select element)
- Label: "Jump to section"
- Position: Below H1, above content

---

## 4. RETURN HOOK DESIGN

### Stable URL Structure
- Pattern: `vnmarketinsights.com/[topic-slug]`
- No date stamps in URLs
- No version numbers
- Redirects on slug changes

### Consistent Section Order
- ALL pages follow identical section sequence
- Users build mental model: "Key facts is always second"
- Predictable scanning pattern

### Visible Last Reviewed
- Always present, never hidden
- Format: "Last reviewed: [Month Year]"
- Link to changelog for transparency
- Position: Page footer, distinct from sources

### Methodology Accessibility
- Link in Sources section
- Link in footer (site-wide)
- Methodology page: /about

### Bookmarking Value
- Page title includes topic + "reference"
- Stable over time: Won't change with redesigns
- Self-contained: Doesn't require site navigation
- URL anchor support: Deep linking to sections

### Natural Return Triggers
- Related Topics section encourages further reading
- Consistent design reduces re-learning
- Fast load times (static HTML)
- No login barriers

---

## 5. VISUAL STYLE SPECIFICATIONS

### Color Palette

```
Background Primary:    #FAFAFA (off-white)
Background Secondary:  #F5F5F5 (light gray)
Text Primary:          #1A1A1A (near black)
Text Secondary:        #5A5A5A (medium gray)
Text Muted:            #8A8A8A (light gray)
Border:                #E5E5E5 (subtle)
Accent:                #2563EB (muted blue)
Accent Hover:          #1D4ED8 (darker blue)
Table Header:          #F0F0F0
Table Border:          #E0E0E0
```

**Constraints:**
- No gradients
- No shadows (except utility bar: subtle elevation)
- No illustrations or icons except functional

### Typography

```
Font Family:           system-ui, -apple-system, sans-serif
H1:                    2rem (32px), font-weight: 600, letter-spacing: -0.02em
H2:                    1.5rem (24px), font-weight: 600, border-bottom: 1px
H3:                    1.125rem (18px), font-weight: 500, color: secondary
Body:                  1rem (16px), line-height: 1.7
Small/Caption:         0.875rem (14px), color: muted
Monospace (data):      SF Mono, Consolas, monospace
```

**Line Length:**
- Max width: 680px (optimal reading)
- Tables: Can extend to 800px
- Mobile: 100% with padding

### Spacing System

```
Section spacing:       3rem (48px) between major sections
Subsection spacing:    1.5rem (24px)
Paragraph spacing:     1rem (16px)
Table cell padding:    0.75rem 1rem
List item spacing:     0.5rem
```

### Table Design (Analyst Style)

```
Header:
  - Background: #F0F0F0
  - Border-bottom: 2px solid #E0E0E0
  - Font-weight: 600
  - Text: uppercase, 0.75rem, letter-spacing: 0.05em

Rows:
  - Border-bottom: 1px solid #E8E8E8
  - Hover background: #FAFAFA (subtle)

Cells:
  - Text: left-aligned
  - Numbers: right-aligned, monospace
  - Padding: 12px 16px

Responsive:
  - Horizontal scroll on mobile
  - No stacking (preserves comparability)
```

### Component Specifications

#### Anchor Link Icon
```
Icon:                  ¶ (pilcrow)
Size:                  16px
Color:                 muted (default), accent (hover)
Opacity:               0 → 1 on hover
Position:              inline, after heading text
```

#### Utility Bar
```
Position:              fixed, top-right (desktop)
Background:            white
Border:                1px solid border-color
Border-radius:         4px
Padding:               8px
Box-shadow:            0 1px 3px rgba(0,0,0,0.1)

Icons:                 20px
Spacing:               12px between icons
Tooltip:               On hover, below icon
```

#### Section Index (Sidebar)
```
Width:                 200px
Position:              sticky, top: 100px
Font-size:             0.875rem

Active state:
  - Border-left: 2px solid accent
  - Padding-left: 8px
  - Color: accent

Inactive:
  - Border-left: 2px solid transparent
  - Color: secondary
```

---

## 6. TRUST SIGNALS (IMPLICIT)

### Structure-Based Trust
- Consistent section order: Predictable, professional
- Visible sources: Transparency
- Methodology link: Rigorous process
- Limitations stated: Honest about data gaps

### Visual Trust
- Restrained color palette: Serious, not sales-driven
- Typography hierarchy: Clear, organized
- Data tables: Raw numbers, no manipulation
- Muted links: Not pushing navigation

### Content Trust
- No superlatives: "largest," "best," "leading" (unless sourced)
- No predictions: "will grow," "expected to"
- No opinions: "important," "significant" (unless data-backed)
- Attribution: Every claim has source

### Absence of Marketing
- No author bio: Information stands alone
- No social proof: "X people viewed this"
- No CTAs: "Contact us," "Learn more"
- No newsletter signup

---

## 7. RESPONSIVENESS

### Desktop (1024px+)
- Three-column: Sidebar | Content | (empty for balance)
- Sidebar: Section index visible
- Utility bar: Fixed top-right
- Tables: Full width with comfortable padding

### Tablet (768px - 1023px)
- Two-column: Section index | Content
- Section index: Narrower (160px)
- Utility bar: Inline with title OR sticky top
- Tables: Scrollable if needed

### Mobile (< 768px)
- Single column
- Section index: Dropdown below H1
- Utility bar: Sticky bottom
- Tables: Horizontal scroll (preserve structure)
- Anchor links: Always visible (smaller)

### Touch Targets
- Minimum: 44px × 44px
- Utility icons: 48px × 48px
- Links: Adequate spacing (avoid accidental taps)

---

## 8. COMPONENT LIST (Astro/MDX)

### Astro Components Required

```
components/
├── ContentSection.astro      # Wrapper with anchor, spacing
├── DataTable.astro           # Styled table with download
├── KeyFactsList.astro        # Bulleted facts
├── MajorPlayersGroup.astro   # Grouped entity listings
├── RelatedTopics.astro       # Topic cards/links
├── SourcesSection.astro      # Collapsible attribution
├── SectionIndex.astro        # Sticky sidebar nav
├── UtilityBar.astro          # Copy/download actions
└── AnchorLink.astro          # Pilcrow link component
```

### Content Structure (MDX Frontmatter)

```yaml
---
title: "Vietnam Payments Market: Methods, Infrastructure, Participants"
description: "Reference data on Vietnam's payment systems..."
publishedDate: "2026-02-08"
lastUpdated: "2026-02-08"
category: "Payments"
readingTime: 12
hasDataTables: true
entities:
  - MoMo
  - ZaloPay
  - ViettelPay
  - NAPAS
  - State Bank of Vietnam
sources:
  - name: "State Bank of Vietnam Annual Report 2024"
    url: "https://sbv.gov.vn/..."
  - name: "NAPAS Statistics Q3 2024"
    url: "..."
methodology: "/about#methodology"
relatedTopics:
  - slug: "fintech-vietnam"
    title: "Fintech Landscape Vietnam"
    description: "Digital banking, lending, and financial services"
  - slug: "digital-economy-overview"
    title: "Vietnam Digital Economy Overview"
    description: "Broader market context and sector breakdown"
limitations:
  - "Private company data may reflect estimated values"
  - "Cash transaction estimates derived from sampling"
  - "Regional variations not fully represented"
---
```

### Layout Component Structure

```astro
<!-- TopicPage.astro -->
<Layout title={frontmatter.title} description={frontmatter.description}>
  <div class="page-container">
    <aside class="section-index">
      <SectionIndex sections={sections} />
    </aside>

    <main class="content">
      <UtilityBar
        hasTables={frontmatter.hasDataTables}
        summary={generateSummary(frontmatter)}
      />

      <h1>{frontmatter.title}</h1>

      <ContentSection id="definition">
        <p>{frontmatter.definition}</p>
      </ContentSection>

      <ContentSection id="key-facts">
        <h2>Key Facts</h2>
        <KeyFactsList items={frontmatter.keyFacts} />
      </ContentSection>

      <!-- ... additional sections ... -->

      <SourcesSection
        sources={frontmatter.sources}
        limitations={frontmatter.limitations}
        lastUpdated={frontmatter.lastUpdated}
      />
    </main>
  </div>
</Layout>
```

---

## 9. WHAT NOT TO CHANGE (FUTURE-PROOFING)

### Immutable Elements
1. **Section order:** Never reorder the 11 sections
2. **URL structure:** Never add dates or versions to URLs
3. **Anchor naming:** Keep section IDs stable for bookmark compatibility
4. **Data format:** Maintain table structure for CSV export
5. **Tone:** No drift toward marketing or blogging

### Changeable Elements
1. **Visual polish:** Colors, spacing refinements OK
2. **Typography:** Font family can evolve (stay system-fonts)
3. **Utility features:** Add new export formats if needed
4. **Entity lists:** Update as market evolves
5. **Source links:** Update to latest reports

### Version Control Strategy
- Page content: Versioned via git
- Data updates: In changelog
- Design changes: Documented separately
- Breaking changes: Redirects + notifications

---

## 10. SUCCESS METRICS (QUALITATIVE)

### Positive Indicators
- Users bookmark pages (analytics: return visits)
- Sections referenced externally (backlinks to anchors)
- Low bounce rate (content meets intent)
- High time on page (reading, not scanning)
- CSV downloads (data reuse)

### Negative Indicators
- High bounce + short time (title/content mismatch)
- No return visits (not bookmark-worthy)
- Low scroll depth (not readable)
- Search refinements after visit (intent not met)

### User Feedback Channels
- GitHub issues (for corrections)
- Email (for suggestions)
- No ratings/comments on pages (not discussion forum)

---

## SUMMARY CHECKLIST

### Design Principles Applied
- [ ] Information architecture: Fixed 11-section order
- [ ] Visual design: Minimal, typography-driven, neutral colors
- [ ] Interactions: Section anchors, utility bar, sticky index
- [ ] Return hooks: Stable URLs, consistent order, visible dates
- [ ] Trust signals: Sources visible, limitations stated, no marketing
- [ ] Responsiveness: Sidebar → dropdown, tables scrollable
- [ ] Future-proof: Immutable structure, changeable presentation

### Success Criteria Met
- [ ] Calm, trustworthy reference feel
- [ ] Bookmark-worthy utility
- [ ] 5-10 year relevance (no trend-dependent design)
- [ ] Engineer-friendly (structured, predictable)
- [ ] Analyst-appropriate (tables, data, exports)

---

*Design Version: 1.0*
*Date: 2026-02-08*
*Next Review: Major design changes only, not content*
