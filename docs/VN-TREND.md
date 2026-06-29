# VN Trend Microservice — Outline chi tiết

## Tổng quan

Một microservice độc lập chạy trên Coolify, crawl trend từ các nguồn VN, AI summary hàng ngày, expose REST API cho vnmarketinsights consume.

---

## Architecture

```
┌─────────────────────────────────────────┐
│           VN Trend Service              │
│                                         │
│  Scheduler (APScheduler)                │
│       │                                 │
│       ▼                                 │
│  Collectors                             │
│  ├── RSS Collector (feedparser)         │
│  ├── Google Trends (pytrends)           │
│  └── YouTube Trending (YouTube API)     │
│       │                                 │
│       ▼                                 │
│  Processor                              │
│  ├── Dedup + clean                      │
│  ├── Score/rank by frequency            │
│  └── Claude API → AI summary           │
│       │                                 │
│       ▼                                 │
│  Storage (SQLite)                       │
│       │                                 │
│       ▼                                 │
│  FastAPI → REST API                     │
└─────────────────────────────────────────┘
         │
         ▼
  vnmarketinsights
  gọi /api/trends hàng ngày
```

---

## Cấu trúc thư mục

```
vn-trend-service/
├── app/
│   ├── collectors/
│   │   ├── rss.py          # RSS feeds VN
│   │   ├── google_trends.py # pytrends
│   │   └── youtube.py      # YouTube Data API
│   ├── processor.py        # dedup, score, AI summary
│   ├── storage.py          # SQLite CRUD
│   ├── scheduler.py        # APScheduler jobs
│   └── api.py              # FastAPI endpoints
├── config.yaml             # Cấu hình nguồn, schedule
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

---

## Chi tiết từng collector

### 1. RSS Collector

Nguồn cắm vào ngay, không cần thêm code:

```yaml
# config.yaml
rss_feeds:
  # Tin tức tổng hợp
  - name: VnExpress
    url: https://vnexpress.net/rss/tin-moi-nhat.rss
    category: news

  - name: VnExpress Kinh doanh
    url: https://vnexpress.net/rss/kinh-doanh.rss
    category: business

  - name: Cafef
    url: https://cafef.vn/rss/home.rss
    category: finance

  - name: Cafebiz
    url: https://cafebiz.vn/rss/home.rss
    category: business

  - name: Tuoi Tre
    url: https://tuoitre.vn/rss/tin-moi-nhat.rss
    category: news

  - name: Thanh Nien
    url: https://thanhnien.vn/rss/home.rss
    category: news

  - name: Dantri
    url: https://dantri.com.vn/rss/home.rss
    category: news

  - name: VietnamNet
    url: https://vietnamnet.vn/rss/home.rss
    category: news
```

Code collector:

```python
# collectors/rss.py
import feedparser
from datetime import datetime, timezone

def fetch_rss(feed_url: str, limit: int = 30) -> list[dict]:
    feed = feedparser.parse(feed_url)
    items = []
    for entry in feed.entries[:limit]:
        items.append({
            "title": entry.get("title", ""),
            "url": entry.get("link", ""),
            "published": entry.get("published", ""),
            "summary": entry.get("summary", ""),
            "source": feed.feed.get("title", ""),
        })
    return items
```

### 2. Google Trends Collector

```python
# collectors/google_trends.py
from pytrends.request import TrendReq
import pandas as pd

def fetch_trending_searches(geo: str = "VN") -> list[dict]:
    pt = TrendReq(hl="vi-VN", tz=420)  # UTC+7
    trending = pt.trending_searches(pn="vietnam")
    return [{"keyword": kw, "source": "google_trends"} 
            for kw in trending[0].tolist()]

def fetch_interest_over_time(keywords: list[str]) -> dict:
    pt = TrendReq(hl="vi-VN", tz=420)
    pt.build_payload(keywords, geo="VN", timeframe="now 7-d")
    df = pt.interest_over_time()
    return df.to_dict() if not df.empty else {}
```

### 3. YouTube Trending Collector

Dùng YouTube Data API v3 (miễn phí 10,000 units/ngày, đủ dùng):

```python
# collectors/youtube.py
import httpx

def fetch_youtube_trending(api_key: str, region: str = "VN", 
                           max_results: int = 20) -> list[dict]:
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {
        "part": "snippet,statistics",
        "chart": "mostPopular",
        "regionCode": region,
        "maxResults": max_results,
        "key": api_key,
    }
    resp = httpx.get(url, params=params)
    items = []
    for video in resp.json().get("items", []):
        items.append({
            "title": video["snippet"]["title"],
            "channel": video["snippet"]["channelTitle"],
            "views": video["statistics"].get("viewCount", 0),
            "url": f"https://youtube.com/watch?v={video['id']}",
            "source": "youtube_trending",
        })
    return items
```

---

## Processor — Dedup + Score + AI Summary

```python
# processor.py
import anthropic
from collections import Counter

def deduplicate(items: list[dict]) -> list[dict]:
    seen_urls = set()
    unique = []
    for item in items:
        if item["url"] not in seen_urls:
            seen_urls.add(item["url"])
            unique.append(item)
    return unique

def score_trends(rss_items: list, google_trends: list) -> list[dict]:
    """
    Score đơn giản: keyword từ Google Trends xuất hiện
    trong title RSS → tăng score
    """
    trending_keywords = [t["keyword"].lower() for t in google_trends]
    scored = []
    for item in rss_items:
        score = 0
        title_lower = item["title"].lower()
        for kw in trending_keywords:
            if kw in title_lower:
                score += 1
        item["trend_score"] = score
        scored.append(item)
    return sorted(scored, key=lambda x: x["trend_score"], reverse=True)

def ai_summary(top_items: list[dict], date: str) -> str:
    client = anthropic.Anthropic()
    titles = "\n".join([f"- {i['title']} ({i['source']})" 
                        for i in top_items[:20]])
    
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Dưới đây là các tin tức và trending topics tại Việt Nam ngày {date}.
Hãy tóm tắt thành một bản phân tích ngắn gọn (200-300 từ) về:
1. Top 3-5 chủ đề nổi bật nhất
2. Xu hướng nào đáng chú ý cho business/market
3. Sentiment chung (tích cực / tiêu cực / trung lập)

Tin tức:
{titles}

Trả lời bằng tiếng Việt, súc tích, không dài dòng."""
        }]
    )
    return message.content[0].text
```

---

## Storage — SQLite

```python
# storage.py
import sqlite3
from datetime import date
import json

def init_db(db_path: str = "trends.db"):
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS trends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            source TEXT NOT NULL,
            data TEXT NOT NULL,  -- JSON
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT UNIQUE NOT NULL,
            summary TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_trends(date_str: str, source: str, items: list):
    conn = sqlite3.connect("trends.db")
    conn.execute(
        "INSERT INTO trends (date, source, data) VALUES (?, ?, ?)",
        (date_str, source, json.dumps(items, ensure_ascii=False))
    )
    conn.commit()
    conn.close()

def get_trends_by_date(date_str: str) -> dict:
    conn = sqlite3.connect("trends.db")
    rows = conn.execute(
        "SELECT source, data FROM trends WHERE date = ?", (date_str,)
    ).fetchall()
    conn.close()
    return {row[0]: json.loads(row[1]) for row in rows}
```

---

## Scheduler

```python
# scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import date
from collectors.rss import fetch_rss
from collectors.google_trends import fetch_trending_searches
from collectors.youtube import fetch_youtube_trending
from processor import deduplicate, score_trends, ai_summary
from storage import save_trends, save_summary
import yaml

def run_daily_job():
    with open("config.yaml") as f:
        config = yaml.safe_load(f)
    
    today = date.today().isoformat()
    
    # 1. Collect
    rss_items = []
    for feed in config["rss_feeds"]:
        items = fetch_rss(feed["url"])
        rss_items.extend(items)
    
    google_trends = fetch_trending_searches()
    youtube_trending = fetch_youtube_trending(config["youtube_api_key"])
    
    # 2. Process
    rss_items = deduplicate(rss_items)
    scored = score_trends(rss_items, google_trends)
    
    # 3. Save raw data
    save_trends(today, "rss", scored[:50])
    save_trends(today, "google_trends", google_trends)
    save_trends(today, "youtube", youtube_trending)
    
    # 4. AI Summary
    all_items = scored[:15] + youtube_trending[:5]
    summary = ai_summary(all_items, today)
    save_summary(today, summary)
    
    print(f"[{today}] Done. {len(scored)} RSS items, summary generated.")

def start_scheduler():
    scheduler = BackgroundScheduler(timezone="Asia/Ho_Chi_Minh")
    # Chạy 7:00 sáng mỗi ngày
    scheduler.add_job(run_daily_job, "cron", hour=7, minute=0)
    scheduler.start()
    return scheduler
```

---

## API — FastAPI

```python
# api.py
from fastapi import FastAPI, HTTPException
from datetime import date
from storage import get_trends_by_date, get_summary
from scheduler import start_scheduler, run_daily_job

app = FastAPI(title="VN Trend Service")
scheduler = start_scheduler()

@app.get("/api/trends")
def get_trends(date_str: str = None):
    """Lấy trending data theo ngày, mặc định hôm nay"""
    target = date_str or date.today().isoformat()
    data = get_trends_by_date(target)
    if not data:
        raise HTTPException(status_code=404, detail="No data for this date")
    return {"date": target, "data": data}

@app.get("/api/summary")
def get_summary_api(date_str: str = None):
    """Lấy AI summary theo ngày"""
    target = date_str or date.today().isoformat()
    summary = get_summary(target)
    if not summary:
        raise HTTPException(status_code=404, detail="No summary for this date")
    return {"date": target, "summary": summary}

@app.get("/api/trending-keywords")
def get_keywords(date_str: str = None):
    """Chỉ lấy Google Trends keywords"""
    target = date_str or date.today().isoformat()
    data = get_trends_by_date(target)
    return {"date": target, "keywords": data.get("google_trends", [])}

@app.post("/api/run-now")
def trigger_manual():
    """Trigger manual run (dùng để test)"""
    run_daily_job()
    return {"status": "done"}
```

---

## Docker

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  vn-trend-service:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
    volumes:
      - ./data:/app/data  # persist SQLite
    restart: unless-stopped
```

```txt
# requirements.txt
fastapi
uvicorn
feedparser
pytrends
httpx
anthropic
apscheduler
pyyaml
```

---

## Deploy lên Coolify

1. Push repo lên GitHub
2. Coolify → New Resource → Docker Compose
3. Thêm environment variables:
   - `ANTHROPIC_API_KEY`
   - `YOUTUBE_API_KEY`
4. Set domain (vd: `trends-api.vnmarketinsights.com`)
5. Done — service tự chạy 7:00 sáng mỗi ngày

---

## Cách vnmarketinsights consume

```javascript
// Trong Next.js của vnmarketinsights
const res = await fetch("https://trends-api.vnmarketinsights.com/api/summary")
const { summary } = await res.json()

// Hoặc lấy top trending keywords
const kwRes = await fetch("https://trends-api.vnmarketinsights.com/api/trending-keywords")
const { keywords } = await kwRes.json()
```

---

## Estimate effort

| Task | Thời gian |
|------|-----------|
| Setup project + Docker | 2-3 giờ |
| RSS collector + test | 1 giờ |
| Google Trends + YouTube | 2 giờ |
| Processor + AI summary | 2 giờ |
| FastAPI endpoints | 1 giờ |
| Deploy Coolify | 1 giờ |
| **Tổng** | **~1.5 ngày** |

---

## Mở rộng sau này (backlog)

- Thêm Shopee trending categories scraper
- Sentiment analysis theo category (finance, tech, lifestyle)
- Weekly digest email
- So sánh trend tuần này vs tuần trước
- Webhook push thay vì poll