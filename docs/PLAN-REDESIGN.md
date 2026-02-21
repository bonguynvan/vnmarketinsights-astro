# Kế hoạch làm lại toàn bộ — vnmarketinsights.com

**Mục tiêu:** Xây nền tảng lâu dài để (1) có traffic tự nhiên qua SEO + content + tools, (2) sau này mở rộng sang chứng khoán / market tools dưới cùng brand.

**Domain:** vnmarketinsights.com — Vietnam Market Insights (market = ecommerce + financial/stock sau này).

---

## 1. Tầm nhìn & nguyên tắc

- **Hai trụ cột:** (A) **Reference** — hiểu thị trường VN (topics, articles, glossary); (B) **Tools** — phân tích & theo dõi (Snapshot, Keyword Miner, Trend Radar; sau này thêm stock/market tools).
- **Traffic:** Ưu tiên content có cấu trúc + 1–2 tool rõ giá trị (Snapshot, Keyword); Trend Radar giữ dạng demo/overview với disclaimer.
- **Chuẩn bị chứng khoán:** Thêm hub Financial/Stock (trang tổng quan + 1–2 bài), không cần data real-time ngay; About nói rõ hướng mở rộng.

---

## 2. Kiến trúc thông tin (IA) mới

### 2.1 Navigation (header)

**Đề xuất cấu trúc:**

| Nhóm | Mục | Ghi chú |
|------|-----|--------|
| **Reference** | Home | Trang chủ |
| | [Dropdown hoặc link] **Topics** → Payments, E-commerce, Logistics, Consumers, Regulations, Platforms, **Financial markets** (mới) | Có thể gộp "Topics" thành 1 item với dropdown hoặc trang /topics |
| | **Articles** | Trang listing bài trong `content/articles` (có thể `/insights` hoặc `/articles`) |
| | **Glossary** | Giữ |
| **Tools** | **Tools** (dropdown hoặc trang /tools) | Snapshot, Keyword Miner, Trend Radar; Weekly ẩn hoặc "Sample" |
| **Meta** | About, Changelog | Giữ; Search (⌘K) giữ |

**Lựa chọn triển khai nav:**

- **Option A:** Nav phẳng: Home | Topics (link tới /topics) | Articles | Glossary | Tools (link tới /tools) | About | Changelog | [Search].
- **Option B:** Dropdown "Topics" và "Tools" để giảm số item trên nav.

### 2.2 Trang mới cần có

| Trang | Route | Mô tả |
|-------|--------|--------|
| Topics hub | `/topics` | Liệt kê 6 topic hiện tại + Financial markets, dùng lại topic-grid style. |
| Articles/Insights listing | `/insights` hoặc `/articles` | List bài từ `src/content/articles` (có thể dùng Content Collections). |
| Tools hub | `/tools` | Grid 3 tool: Snapshot, Keyword Miner, Trend Radar (+ Weekly nếu giữ dạng "Sample"). |
| Financial markets (topic) | `/financial-markets` hoặc `/stock-market` | Trang tổng quan 1 topic; nội dung tham khảo, có nguồn. |

### 2.3 Route không đổi (chỉ nội dung/style)

- `/`, `/payments`, `/ecommerce`, `/logistics`, `/consumers`, `/regulations`, `/platforms`
- `/snapshot`, `/keywords`, `/trends`
- `/about`, `/glossary`, `/changelog`, `/404`

### 2.4 Route thay đổi / ẩn

- `/weekly` — ẩn khỏi nav và homepage; giữ route để sau bật lại hoặc redirect tới `/tools` với note "Sample report".

---

## 3. Homepage mới — cấu trúc từng block

Thứ tự đề xuất:

1. **Hero**  
   - Title: Vietnam Market Insights  
   - Subtitle: Một câu nêu rõ hai trụ (reference + tools), ví dụ: "Reference & tools for Vietnam market — from ecommerce to financial markets."  
   - CTA: 2 nút chính — "Explore topics" (→ /topics), "Try tools" (→ /tools). Có thể thêm 1 CTA phụ "Trend Radar" (→ /trends).

2. **Hai pillars (2 cột hoặc 2 section)**  
   - **Understand the market:** Đoạn ngắn + link Topics, Articles, Glossary.  
   - **Analyze & track:** Đoạn ngắn + link 3 tools (Snapshot, Keyword Miner, Trend Radar).

3. **Trend Radar preview (giữ nhưng rút gọn)**  
   - Block "Trending products" với summary + bảng top 5 + "View full dashboard" → /trends.  
   - **Bắt buộc:** Thêm disclaimer nhỏ dưới block: "Data from sample and aggregated sources; for illustration. Real-time data coming soon."

4. **Methodology (ngắn)**  
   - 1 đoạn + link "Read full methodology" → /about.

5. **Mission quote**  
   - Giữ block quote (reference-based, no affiliate, no predictions).

**Bỏ / đơn giản hóa trên homepage:**

- Bỏ **Stats highlights** (6 Core Topics, 50+ Key Terms, 100% Open Source) — hoặc thay bằng 1 dòng "Open reference. No paywall." nếu muốn.
- Bỏ **Available Topics** grid — chuyển hết sang trang /topics.
- Bỏ **What's New** — hoặc chỉ hiện khi có ≥1 update thật (lấy từ changelog).
- Bỏ **How to Use** (4 ô) — nội dung quan trọng chuyển vào About hoặc /tools; Cmd+K có thể nhắc trong footer.

---

## 4. Các trang & component cần chỉnh

### 4.1 Tạo mới

| File | Nội dung |
|------|----------|
| `src/pages/topics/index.astro` | Trang hub Topics: list 6 topic + Financial markets, dùng style topic-card. |
| `src/pages/tools/index.astro` | Trang hub Tools: grid Snapshot, Keyword Miner, Trend Radar; mô tả ngắn + CTA. |
| `src/pages/insights/index.astro` | Listing articles từ content collection (cần config Content Collections nếu chưa có). |
| `src/pages/financial-markets.astro` | Trang topic Financial markets (structure giống payments.astro): overview, key stats, major players, sources. |
| `src/content/articles/` | Thêm 1–2 bài: ví dụ `13-vietnam-stock-market-overview.md`, `14-vn30-index-intro.md` (tùy chọn Phase 2). |

### 4.2 Sửa nội dung / cấu trúc

| File | Thay đổi |
|------|----------|
| `src/pages/index.astro` | Làm lại theo section 3: hero mới, 2 pillars, trend preview + disclaimer, methodology ngắn, mission; bỏ stats, topic grid, What's New, How to Use. |
| `src/layouts/BaseLayout.astro` | Cập nhật nav: thêm Topics, Articles (hoặc Insights), Tools; thêm Financial markets vào Topics; ẩn Weekly. |
| `src/pages/weekly.astro` | Thêm banner hoặc note ở đầu: "Sample report — based on illustrative data. Real weekly reports coming when data pipeline is ready." Hoặc ẩn hẳn (noindex + redirect từ /tools). |
| `src/pages/trends/index.astro` | Footer hoặc đầu trang: disclaimer "Data from sample and aggregated sources; for illustration." |
| `src/pages/snapshot.astro` | Không bắt buộc Phase 1; Phase 2 có thể thêm "Export report" / "Share link". |
| `src/pages/keywords.astro` | Footer: disclaimer ngắn "Suggestions and metrics are illustrative; use for ideation." (nếu vẫn dùng mock). |

### 4.3 Không đổi logic, chỉ kiểm tra

- `src/pages/about.astro` — Thêm 1 câu: "We currently focus on ecommerce and digital economy; we plan to expand into financial market data and tools."
- `src/pages/glossary.astro`, `src/pages/changelog.astro` — Giữ; đảm bảo link từ nav đúng.
- Các topic pages (payments, ecommerce, …) — Giữ nguyên; thêm internal link tới /financial-markets và /tools nếu có chỗ tự nhiên.

### 4.4 Content Collections (Astro)

- Nếu chưa có: tạo `src/content/config.ts` và collection `articles` (hoặc `insights`) cho `src/content/articles/*.md`.
- Trang `/insights` (hoặc `/articles`) dùng `getCollection('articles')` để list + link tới từng bài (có thể dùng dynamic route `src/pages/insights/[...slug].astro` hoặc tương đương).

---

## 5. Phase thực hiện

### Phase 1 — Nền tảng & dọn homepage (ưu tiên cao)

- [x] **1.1** Tạo `/topics`: `src/pages/topics/index.astro`, list 6 topic + Financial markets (link tới trang financial-markets).
- [ ] **1.2** Tạo `/tools`: `src/pages/tools/index.astro`, grid 3 tool (Snapshot, Keywords, Trend Radar); không link Weekly trên nav/tools hoặc link kèm label "Sample".
- [ ] **1.3** Cập nhật **BaseLayout** nav: Home | Topics | Glossary | Tools | About | Changelog (+ Search). Bỏ link trực tiếp Payments…Platforms khỏi nav chính (chỉ trong /topics). Thêm Financial markets vào /topics.
- [ ] **1.4** Làm lại **index.astro**: Hero (2 CTA: Topics, Tools); 2 pillars; Trend Radar preview + disclaimer; Methodology ngắn; Mission. Bỏ: stats, topic grid, What's New, How to Use.
- [ ] **1.5** Thêm **disclaimer** trên `/trends`: "Data from sample and aggregated sources; for illustration."
- [ ] **1.6** **Weekly:** Hoặc ẩn khỏi nav và /tools, hoặc giữ route + thêm banner "Sample report" + noindex nếu muốn.
- [ ] **1.7** Cập nhật **about.astro**: Thêm câu mở rộng sang financial market/tools.

**Kết quả Phase 1:** Homepage gọn, rõ hai trụ; nav chuẩn; có /topics và /tools; Trend Radar minh bạch là demo/sample.

---

### Phase 2 — Content & Financial hub

- [ ] **2.1** Cấu hình **Content Collections** cho `src/content/articles` (config + type).
- [ ] **2.2** Tạo trang **/insights** (hoặc /articles): list bài, sort theo date; link tới từng bài (có thể dynamic route cho từng article).
- [ ] **2.3** Tạo trang **financial-markets.astro**: structure giống topic (Overview, Key characteristics, Major players, Sources); nội dung tổng quan thị trường chứng khoán VN, VN30, HOSE, HNX, nguồn SSI, VSD, etc.
- [x] **2.4** Thêm 1–2 bài trong `content/articles` về stock market (ví dụ overview, VN30); link từ financial-markets và từ /insights.
- [ ] **2.5** Thêm **Financial markets** vào array topics trong `src/pages/topics/index.astro` (đã có link ở 1.1, chỉ cần đảm bảo slug đúng).
- [ ] **2.6** Internal linking: từ homepage pillars → /topics, /tools; từ topic pages → /insights, /tools (1–2 chỗ tự nhiên).

**Kết quả Phase 2:** Có hub Financial/Stock; có listing articles; content sẵn sàng cho SEO và mở rộng sau.

---

### Phase 3 — Polish & SEO

- [x] **3.1** Sitemap: đảm bảo /topics, /tools, /insights, /financial-markets được include (kiểm tra `astro.config.mjs` sitemap).
- [x] **3.2** Meta & JSON-LD: title/description cho từng trang mới; SearchAction trên homepage nếu vẫn dùng search.
- [x] **3.3** 404: link về / và /tools thay vì chỉ home.
- [x] **3.4** README: cập nhật project structure (thêm topics, tools, insights, financial-markets).

**Kết quả Phase 3:** SEO và trải nghiệm hoàn chỉnh cho bộ trang mới.

---

### Phase 4 (tùy chọn — sau)

- [ ] Snapshot: thêm Export PDF hoặc share link.
- [ ] Keyword Miner: kết nối API thật hoặc ghi rõ "for ideation".
- [ ] Trend Radar: kết nối data thật ổn định hoặc giữ demo + CTA "Get notified when real-time data is available".
- [ ] Newsletter / notify form khi có weekly report thật.

---

## 6. Checklist kỹ thuật

- [ ] Astro 4 + Tailwind: không đổi stack.
- [ ] Pagefind search: vẫn chạy sau build; thêm trang mới vào index (thường tự động).
- [ ] Sitemap script: kiểm tra include đủ route mới.
- [ ] Prerender: trends (và API) đã `prerender: false`; các trang tĩnh mới (topics, tools, insights, financial-markets) để prerender.
- [ ] Mobile: nav gọn (Topics, Tools) tránh tràn; topic grid trên /topics responsive.

---

## 7. Tóm tắt file thay đổi

| Hành động | File / thư mục |
|-----------|-----------------|
| Tạo mới | `src/pages/topics/index.astro`, `src/pages/tools/index.astro`, `src/pages/insights/index.astro` (+ dynamic nếu cần), `src/pages/financial-markets.astro` |
| Tạo mới (content) | `src/content/config.ts` (nếu chưa có), `src/content/articles/13-*.md` (Phase 2) |
| Sửa lớn | `src/pages/index.astro`, `src/layouts/BaseLayout.astro` |
| Sửa nhỏ | `src/pages/weekly.astro`, `src/pages/trends/index.astro`, `src/pages/keywords.astro`, `src/pages/about.astro` |
| Kiểm tra | `astro.config.mjs`, sitemap, README |

---

Khi hoàn thành từng phase, đánh dấu checkbox trong file này và commit theo phase để dễ review và rollback nếu cần.
