/**
 * stockSignals.ts
 *
 * Pure technical-indicator math and an investment-signal scoring engine for
 * Vietnamese equities. Ported faithfully (English output) from the production Go
 * service used by the live VN Market stock tool, so the methodology documented on
 * the site matches a real implementation rather than a hand-wave.
 *
 * Everything here is pure: it takes price/volume arrays (or OHLC bars) and returns
 * numbers — no I/O, no network, no DB. That makes it safe to run at build time to
 * generate static, worked-example pages.
 *
 * NOT investment advice. The scores are a transparent, rules-based summary of
 * common indicators, not a recommendation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One candlestick (daily bar). Times are unix seconds; ascending by time. */
export interface OHLCBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface FundamentalInput {
  /** Price-to-Earnings. */
  pe: number;
  /** Return on Equity, as a percent (e.g. 18.5). */
  roe: number;
  /** Debt / Equity ratio. */
  debtToEquity: number;
  /** YoY EPS or net-profit growth, as a percent. */
  epsGrowth: number;
  /** Dividend yield, as a percent. */
  divYield: number;
}

export type VerdictColor = 'green' | 'yellow' | 'orange' | 'red';

export interface InvestmentSignal {
  ticker: string;
  /** 0–100 composite. */
  score: number;
  verdict: string;
  verdictColor: VerdictColor;
  /** 0–50. */
  fundamentalScore: number;
  /** 0–50. */
  technicalScore: number;
  reasons: string[];
}

export type SignalDirection = 'bullish' | 'bearish';

export interface ShortTermSignal {
  type: 'macd_cross' | 'rsi_divergence' | 'ema_cross' | 'bollinger_squeeze' | 'volume_spike';
  direction: SignalDirection;
  /** 1 (weak) – 3 (strong). */
  strength: number;
  label: string;
  detail: string;
  value: number;
  timeframe: string;
}

export type Bias = 'bullish' | 'bearish' | 'neutral';

export interface ShortTermAnalysis {
  ticker: string;
  signals: ShortTermSignal[];
  bullCount: number;
  bearCount: number;
  bias: Bias;
  biasColor: 'green' | 'red' | 'gray';
}

// ---------------------------------------------------------------------------
// Indicator math (mirrors internal/indicator/calculator.go)
// ---------------------------------------------------------------------------

/** Simple Moving Average. Result aligned to input; warm-up values are 0. */
export function calculateMA(prices: number[], period: number): number[] {
  const result = new Array<number>(prices.length).fill(0);
  if (period <= 0 || prices.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  result[period - 1] = sum / period;
  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    result[i] = sum / period;
  }
  return result;
}

/** Exponential Moving Average, seeded with the SMA of the first `period` values. */
export function calculateEMA(prices: number[], period: number): number[] {
  const result = new Array<number>(prices.length).fill(0);
  if (period <= 0 || prices.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  result[period - 1] = sum / period;

  const k = 2 / (period + 1);
  for (let i = period; i < prices.length; i++) {
    result[i] = prices[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/** Wilder RSI. Result aligned to input; warm-up values are 0. */
export function calculateRSI(prices: number[], period: number): number[] {
  const result = new Array<number>(prices.length).fill(0);
  if (period <= 0 || prices.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  const rsi = (ag: number, al: number): number => (al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  result[period] = rsi(avgGain, avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = rsi(avgGain, avgLoss);
  }
  return result;
}

/** MACD line (EMA12 − EMA26) and signal line (EMA9 of MACD). */
export function calculateMACD(prices: number[]): { macd: number[]; signal: number[] } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = prices.map((_, i) => ema12[i] - ema26[i]);
  const signal = calculateEMA(macd, 9);
  return { macd, signal };
}

/** Bollinger Bands: `period`-SMA middle ± `mult`× standard deviation. */
export function bollingerBands(
  prices: number[],
  period: number,
  mult: number,
): { upper: number[]; middle: number[]; lower: number[] } {
  const n = prices.length;
  const upper = new Array<number>(n).fill(0);
  const middle = new Array<number>(n).fill(0);
  const lower = new Array<number>(n).fill(0);
  if (period <= 0 || n < period) return { upper, middle, lower };

  for (let i = period - 1; i < n; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += prices[j];
    const mean = sum / period;

    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = prices[j] - mean;
      variance += d * d;
    }
    const sd = Math.sqrt(variance / period);
    middle[i] = mean;
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
  }
  return { upper, middle, lower };
}

/** Bollinger band width (upper−lower)/middle as a percent. Used to detect squeezes. */
export function bandWidth(upper: number[], middle: number[], lower: number[]): number[] {
  return upper.map((u, i) => (middle[i] > 0 ? ((u - lower[i]) / middle[i]) * 100 : 0));
}

/** 52-week (≈250 trading day) high and low from bars. */
export function week52Range(bars: OHLCBar[]): { high: number; low: number } {
  if (bars.length === 0) return { high: 0, low: 0 };
  const start = Math.max(0, bars.length - 250);
  let high = -Infinity;
  let low = Infinity;
  for (let i = start; i < bars.length; i++) {
    if (bars[i].h > high) high = bars[i].h;
    if (bars[i].l < low) low = bars[i].l;
  }
  return { high, low };
}

export const closePrices = (bars: OHLCBar[]): number[] => bars.map((b) => b.c);
export const volumes = (bars: OHLCBar[]): number[] => bars.map((b) => b.v);

// ---------------------------------------------------------------------------
// Long-term scoring (mirrors internal/signal/engine.go)
// ---------------------------------------------------------------------------

const f1 = (n: number): string => n.toFixed(1);
const f2 = (n: number): string => n.toFixed(2);
const f0 = (n: number): string => Math.round(n).toString();

function scoreFundamentals(fi: FundamentalInput, reasons: string[]): number {
  let score = 0;

  // P/E
  if (fi.pe <= 0) {
    reasons.push('Negative or missing P/E (company is unprofitable)');
  } else if (fi.pe < 15) {
    score += 10;
    reasons.push(`✅ Low P/E (${f1(fi.pe)}×) — attractive valuation for long-term investors`);
  } else if (fi.pe < 25) {
    score += 5;
    reasons.push(`🟡 Fair P/E (${f1(fi.pe)}×) — neither expensive nor cheap`);
  } else {
    reasons.push(`⚠️ High P/E (${f1(fi.pe)}×) — needs strong growth to justify valuation`);
  }

  // ROE
  if (fi.roe >= 20) {
    score += 10;
    reasons.push(`✅ Excellent ROE (${f1(fi.roe)}%) — management uses capital very efficiently`);
  } else if (fi.roe >= 15) {
    score += 7;
    reasons.push(`🟡 Good ROE (${f1(fi.roe)}%) — solid return on equity`);
  } else if (fi.roe >= 10) {
    score += 3;
    reasons.push(`🟠 Average ROE (${f1(fi.roe)}%) — capital efficiency needs improvement`);
  } else {
    reasons.push(`❌ Low ROE (${f1(fi.roe)}%) — weak return on equity`);
  }

  // Debt / Equity
  if (fi.debtToEquity < 0.5) {
    score += 10;
    reasons.push(`✅ Low leverage (D/E: ${f2(fi.debtToEquity)}×) — healthy balance sheet`);
  } else if (fi.debtToEquity < 1.0) {
    score += 7;
    reasons.push(`🟡 Moderate leverage (D/E: ${f2(fi.debtToEquity)}×) — financial risk under control`);
  } else if (fi.debtToEquity < 1.5) {
    score += 3;
    reasons.push(`🟠 Fairly high leverage (D/E: ${f2(fi.debtToEquity)}×) — monitor debt repayment capacity`);
  } else {
    reasons.push(`❌ Very high leverage (D/E: ${f2(fi.debtToEquity)}×) — significant financial risk`);
  }

  // EPS / profit growth
  if (fi.epsGrowth >= 20) {
    score += 10;
    reasons.push(`✅ Strong profit growth (${f1(fi.epsGrowth)}% YoY) — clear upside catalyst`);
  } else if (fi.epsGrowth >= 10) {
    score += 7;
    reasons.push(`🟡 Good profit growth (${f1(fi.epsGrowth)}% YoY)`);
  } else if (fi.epsGrowth >= 0) {
    score += 3;
    reasons.push(`🟠 Slow profit growth (${f1(fi.epsGrowth)}% YoY)`);
  } else {
    reasons.push(`❌ Declining profit (${f1(fi.epsGrowth)}% YoY) — root cause analysis needed`);
  }

  // Dividend yield
  if (fi.divYield >= 5) {
    score += 10;
    reasons.push(`✅ Attractive dividend (${f1(fi.divYield)}%) — good passive income`);
  } else if (fi.divYield >= 2) {
    score += 5;
    reasons.push(`🟡 Modest dividend (${f1(fi.divYield)}%)`);
  } else if (fi.divYield > 0) {
    score += 2;
    reasons.push(`🟠 Has dividend (${f1(fi.divYield)}%) but low yield`);
  } else {
    reasons.push('ℹ️ No dividend — company reinvests all profits');
  }

  return score;
}

function scoreTechnical(bars: OHLCBar[], reasons: string[]): number {
  if (bars.length < 20) {
    reasons.push('ℹ️ Insufficient price history for technical scoring (need ≥20 bars)');
    return 0;
  }
  let score = 0;
  const prices = closePrices(bars);
  const lastPrice = prices[prices.length - 1];
  const lastIdx = prices.length - 1;

  const ma20 = calculateMA(prices, 20);
  const ma50 = calculateMA(prices, 50);
  const ma200 = calculateMA(prices, 200);
  const rsi = calculateRSI(prices, 14);

  const lastMA50 = ma50[lastIdx];
  const lastMA200 = ma200[lastIdx];
  const lastRSI = rsi[lastIdx];
  const lastMA20 = ma20[lastIdx];

  // Price vs MA200 (15 pts)
  if (lastMA200 > 0) {
    if (lastPrice > lastMA200) {
      score += 15;
      const pct = ((lastPrice - lastMA200) / lastMA200) * 100;
      reasons.push(`✅ Price above MA200 (+${f1(pct)}%) — long-term uptrend`);
    } else {
      const pct = ((lastMA200 - lastPrice) / lastMA200) * 100;
      reasons.push(`❌ Price below MA200 (-${f1(pct)}%) — weak long-term trend`);
    }
  }

  // Golden / Death Cross (15 pts)
  if (lastMA50 > 0 && lastMA200 > 0) {
    if (lastMA50 > lastMA200) {
      score += 15;
      reasons.push('✅ Golden Cross: MA50 > MA200 — positive long-term technical structure');
    } else {
      reasons.push('❌ Death Cross: MA50 < MA200 — long-term selling pressure persists');
    }
  }

  // RSI zone (10 pts)
  if (lastRSI > 0) {
    if (lastRSI >= 40 && lastRSI <= 65) {
      score += 10;
      reasons.push(`✅ RSI(14) in ideal zone (${f0(lastRSI)}) — not overbought, not oversold`);
    } else if (lastRSI < 30) {
      score += 7;
      reasons.push(`🟡 RSI(14) oversold (${f0(lastRSI)}) — potential accumulation opportunity`);
    } else if (lastRSI > 75) {
      score += 3;
      reasons.push(`⚠️ RSI(14) overbought (${f0(lastRSI)}) — short-term correction risk`);
    } else {
      score += 5;
      reasons.push(`🟠 RSI(14) neutral (${f0(lastRSI)})`);
    }
  }

  // 52-week position (10 pts)
  const { high: high52, low: low52 } = week52Range(bars);
  if (high52 > low52) {
    const positionPct = ((lastPrice - low52) / (high52 - low52)) * 100;
    if (positionPct >= 70) {
      score += 10;
      reasons.push(`✅ Price near 52-week high (${f0(positionPct)}% range) — strong upward momentum`);
    } else if (positionPct >= 40) {
      score += 6;
      reasons.push(`🟡 Price in mid 52-week range (${f0(positionPct)}% range)`);
    } else {
      score += 2;
      reasons.push(`🟠 Price near 52-week low (${f0(positionPct)}% range) — consider the reasons`);
    }
  }

  void lastMA20; // short-term momentum already implied by MA50/MA200 structure
  return score;
}

function toVerdict(score: number): { verdict: string; color: VerdictColor } {
  if (score >= 75) return { verdict: 'Strong Buy', color: 'green' };
  if (score >= 55) return { verdict: 'Accumulate', color: 'yellow' };
  if (score >= 35) return { verdict: 'Watch', color: 'orange' };
  return { verdict: 'Avoid', color: 'red' };
}

/**
 * Score a stock into a 0–100 composite (fundamental 0–50 + technical 0–50).
 * `bars` must be sorted ascending by time; ≥200 bars recommended for full marks.
 */
export function calculateSignal(
  ticker: string,
  fi: FundamentalInput,
  bars: OHLCBar[],
): InvestmentSignal {
  const reasons: string[] = [];
  const fundamentalScore = scoreFundamentals(fi, reasons);
  const technicalScore = scoreTechnical(bars, reasons);
  const score = fundamentalScore + technicalScore;
  const { verdict, color } = toVerdict(score);
  return {
    ticker,
    score,
    verdict,
    verdictColor: color,
    fundamentalScore,
    technicalScore,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Short-term signals (mirrors internal/signal/short_term.go)
// ---------------------------------------------------------------------------

const TF_1_3 = '1–3 days';
const TF_1_5 = '1–5 days';
const TF_3_5 = '3–5 days';
const TF_3_10 = '3–10 days';

function detectMACDCross(prices: number[]): ShortTermSignal | null {
  const { macd, signal } = calculateMACD(prices);
  const n = prices.length;
  if (n < 30) return null;

  for (let i = n - 1; i >= n - 3 && i >= 1; i--) {
    const prevHist = macd[i - 1] - signal[i - 1];
    const currHist = macd[i] - signal[i];
    if (prevHist <= 0 && currHist > 0) {
      return {
        type: 'macd_cross',
        direction: 'bullish',
        strength: currHist > 0.5 ? 3 : 2,
        label: 'MACD Bullish Cross',
        detail: `MACD line crossed above Signal — short-term buy signal. Histogram: +${f2(currHist)}`,
        value: currHist,
        timeframe: TF_3_5,
      };
    }
    if (prevHist >= 0 && currHist < 0) {
      return {
        type: 'macd_cross',
        direction: 'bearish',
        strength: currHist < -0.5 ? 3 : 2,
        label: 'MACD Bearish Cross',
        detail: `MACD line crossed below Signal — short-term sell signal. Histogram: ${f2(currHist)}`,
        value: currHist,
        timeframe: TF_3_5,
      };
    }
  }
  return null;
}

function detectRSISignal(prices: number[]): ShortTermSignal | null {
  const rsi = calculateRSI(prices, 14);
  const n = rsi.length;
  if (n < 20) return null;

  const lastRSI = rsi[n - 1];
  const prevRSI = rsi[n - 2];

  if (lastRSI < 35 && lastRSI > prevRSI && prevRSI < 30) {
    return {
      type: 'rsi_divergence',
      direction: 'bullish',
      strength: 3,
      label: 'RSI Oversold + Recovery',
      detail: `RSI(14) = ${f0(lastRSI)}, just exited oversold zone (<30) — stock may recover short-term`,
      value: lastRSI,
      timeframe: TF_1_3,
    };
  }
  if (lastRSI > 65 && lastRSI < prevRSI && prevRSI > 70) {
    return {
      type: 'rsi_divergence',
      direction: 'bearish',
      strength: 3,
      label: 'RSI Overbought + Weakening',
      detail: `RSI(14) = ${f0(lastRSI)}, just left overbought zone (>70) — short-term correction risk`,
      value: lastRSI,
      timeframe: TF_1_3,
    };
  }
  if (lastRSI > 70) {
    return {
      type: 'rsi_divergence',
      direction: 'bearish',
      strength: 1,
      label: 'RSI Overbought',
      detail: `RSI(14) = ${f0(lastRSI)} — overbought zone, profit-taking may occur`,
      value: lastRSI,
      timeframe: TF_1_5,
    };
  }
  if (lastRSI < 30) {
    return {
      type: 'rsi_divergence',
      direction: 'bullish',
      strength: 1,
      label: 'RSI Oversold',
      detail: `RSI(14) = ${f0(lastRSI)} — oversold zone, potential short-term buying opportunity`,
      value: lastRSI,
      timeframe: TF_1_5,
    };
  }
  return null;
}

function detectEMACross(prices: number[]): ShortTermSignal | null {
  const ema9 = calculateEMA(prices, 9);
  const ema21 = calculateEMA(prices, 21);
  const n = prices.length;
  if (n < 25) return null;

  for (let i = n - 1; i >= n - 3 && i >= 1; i--) {
    const prevDiff = ema9[i - 1] - ema21[i - 1];
    const currDiff = ema9[i] - ema21[i];
    if (prevDiff <= 0 && currDiff > 0) {
      return {
        type: 'ema_cross',
        direction: 'bullish',
        strength: 2,
        label: 'EMA9 Crossed Above EMA21',
        detail: 'Short-term EMA (9) crossed above mid-term EMA (21) — momentum turning positive',
        value: currDiff,
        timeframe: TF_3_10,
      };
    }
    if (prevDiff >= 0 && currDiff < 0) {
      return {
        type: 'ema_cross',
        direction: 'bearish',
        strength: 2,
        label: 'EMA9 Crossed Below EMA21',
        detail: 'Short-term EMA (9) crossed below mid-term EMA (21) — momentum turning negative',
        value: currDiff,
        timeframe: TF_3_10,
      };
    }
  }
  return null;
}

function detectBollingerSignal(prices: number[]): ShortTermSignal | null {
  const { upper, middle, lower } = bollingerBands(prices, 20, 2.0);
  const bw = bandWidth(upper, middle, lower);
  const n = prices.length;
  if (n < 25) return null;

  const lastBW = bw[n - 1];
  const lastPrice = prices[n - 1];

  let avgBW = 0;
  let count = 0;
  const start = Math.max(20, n - 60);
  for (let i = start; i < n - 1; i++) {
    if (bw[i] > 0) {
      avgBW += bw[i];
      count++;
    }
  }
  if (count > 0) avgBW /= count;

  if (avgBW > 0 && lastBW < avgBW * 0.6 && lastBW > 0) {
    const isBull = lastPrice >= middle[n - 1];
    return {
      type: 'bollinger_squeeze',
      direction: isBull ? 'bullish' : 'bearish',
      strength: 2,
      label: isBull
        ? 'Bollinger Squeeze — Bullish Breakout Imminent'
        : 'Bollinger Squeeze — Bearish Breakout Imminent',
      detail: `Bandwidth narrowing (${f1(lastBW)}% vs avg ${f1(avgBW)}%) — volatility expansion imminent. Price ${
        isBull ? 'above' : 'below'
      } MA20.`,
      value: lastBW,
      timeframe: TF_1_5,
    };
  }

  if (lastPrice > upper[n - 1] && upper[n - 1] > 0) {
    return {
      type: 'bollinger_squeeze',
      direction: 'bullish',
      strength: 2,
      label: 'Upper Bollinger Breakout',
      detail: `Price broke above upper Bollinger Band (${f0(lastPrice)} > ${f0(upper[n - 1])}) — strong upward momentum`,
      value: lastPrice - upper[n - 1],
      timeframe: TF_1_3,
    };
  }

  if (lastPrice < lower[n - 1] && lower[n - 1] > 0) {
    return {
      type: 'bollinger_squeeze',
      direction: 'bearish',
      strength: 2,
      label: 'Lower Bollinger Breakdown',
      detail: `Price broke below lower Bollinger Band (${f0(lastPrice)} < ${f0(lower[n - 1])}) — strong selling pressure`,
      value: lower[n - 1] - lastPrice,
      timeframe: TF_1_3,
    };
  }
  return null;
}

function detectVolumeSpike(prices: number[], vol: number[]): ShortTermSignal | null {
  const n = vol.length;
  if (n < 25) return null;

  const volMA = calculateMA(vol, 20);
  const lastVol = vol[n - 1];
  const lastVolMA = volMA[n - 1];
  if (lastVolMA <= 0) return null;

  const ratio = lastVol / lastVolMA;
  if (ratio < 2.0) return null;

  const isBull = prices[n - 1] >= prices[n - 2];
  return {
    type: 'volume_spike',
    direction: isBull ? 'bullish' : 'bearish',
    strength: ratio >= 3.0 ? 3 : 2,
    label: isBull ? 'Volume Spike + Price Increase' : 'Volume Spike + Price Decline',
    detail: isBull
      ? `Trading volume ${f1(ratio)}× the 20-session average with price increase — strong demand`
      : `Trading volume ${f1(ratio)}× the 20-session average with price decline — distribution/selling`,
    value: ratio,
    timeframe: TF_1_3,
  };
}

/**
 * Generate short-term trading signals from OHLC bars.
 * Needs ≥30 bars (≈6 weeks daily) for meaningful output.
 */
export function calculateShortTerm(ticker: string, bars: OHLCBar[]): ShortTermAnalysis {
  const base: ShortTermAnalysis = {
    ticker,
    signals: [],
    bullCount: 0,
    bearCount: 0,
    bias: 'neutral',
    biasColor: 'gray',
  };
  if (bars.length < 30) return base;

  const prices = closePrices(bars);
  const vol = volumes(bars);

  const detectors = [
    detectMACDCross(prices),
    detectRSISignal(prices),
    detectEMACross(prices),
    detectBollingerSignal(prices),
    detectVolumeSpike(prices, vol),
  ];
  const signals = detectors.filter((s): s is ShortTermSignal => s !== null);

  let bullCount = 0;
  let bearCount = 0;
  for (const s of signals) {
    if (s.direction === 'bullish') bullCount += s.strength;
    else bearCount += s.strength;
  }

  let bias: Bias = 'neutral';
  let biasColor: ShortTermAnalysis['biasColor'] = 'gray';
  if (bullCount > bearCount + 1) {
    bias = 'bullish';
    biasColor = 'green';
  } else if (bearCount > bullCount + 1) {
    bias = 'bearish';
    biasColor = 'red';
  }

  return { ticker, signals, bullCount, bearCount, bias, biasColor };
}
