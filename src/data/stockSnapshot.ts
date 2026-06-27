/**
 * stockSnapshot.ts
 *
 * Typed accessor over the committed OHLC snapshot (stock-snapshot.json), which is
 * refreshed by scripts/fetch-stock-snapshot.mjs. The build reads only this file —
 * it never calls the network — so pages are stable and reproducible.
 */
import type { OHLCBar } from '@utils/stockSignals';
import snapshot from './stock-snapshot.json';

export interface SnapshotTicker {
  ticker: string;
  name: string;
  sector: string;
  bars: OHLCBar[];
}

export interface StockSnapshot {
  /** Date of the latest bar in the set (YYYY-MM-DD). */
  asOf: string;
  source: string;
  tickerCount: number;
  tickers: SnapshotTicker[];
}

export const STOCK_SNAPSHOT = snapshot as StockSnapshot;

export const SNAPSHOT_TICKERS: SnapshotTicker[] = STOCK_SNAPSHOT.tickers;

export function getSnapshotTicker(ticker: string): SnapshotTicker | undefined {
  const upper = ticker.toUpperCase();
  return SNAPSHOT_TICKERS.find((t) => t.ticker.toUpperCase() === upper);
}

/** Human-readable "as of" date, e.g. "June 26, 2026". */
export function snapshotAsOfLabel(): string {
  const [y, m, d] = STOCK_SNAPSHOT.asOf.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
