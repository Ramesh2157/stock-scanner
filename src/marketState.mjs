/**
 * marketState.mjs — NIFTY 50 Intraday Market State
 * --------------------------------------------------
 * Fetches today's intraday candles for NIFTY 50 (^NSEI) and
 * determines the current market direction and volatility.
 *
 * Outputs:
 *   direction  : 'BULLISH' | 'BEARISH' | 'SIDEWAYS'
 *   volatility : 'VOLATILE' | 'NORMAL'
 *   state      : e.g. 'BULLISH_NORMAL'
 *
 * Used as a market-filter gate in the intraday scanner:
 *   BEARISH or VOLATILE → suppress LONG signals
 */

import YahooFinance from 'yahoo-finance2';

// ── Shared YahooFinance instance ────────────────────────────────
const yahooFinance = new YahooFinance();

// ── Config ──────────────────────────────────────────────────────
const NIFTY_SYMBOL           = '^NSEI';
const TIMEFRAME_MINUTES      = 5;
const LOOKBACK_MINUTES       = 75;
const DIRECTION_UP_THRESHOLD = 0.6;
const DIRECTION_DOWN_THRESHOLD = 0.4;
const VOLATILITY_MULTIPLIER  = 1.5;
const IST_OFFSET_MS          = 5.5 * 60 * 60 * 1000;
const MARKET_OPEN_HOUR_UTC   = 3;
const MARKET_OPEN_MIN_UTC    = 45;
const REQUIRED_CANDLES       = Math.ceil(LOOKBACK_MINUTES / TIMEFRAME_MINUTES);

// ── Utilities ────────────────────────────────────────────────────

function safeNum(v) {
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function marketOpenUTC() {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    MARKET_OPEN_HOUR_UTC, MARKET_OPEN_MIN_UTC, 0,
  ));
}

// ── Response normaliser ───────────────────────────────────────────

function normalizeYahooResponse(raw) {
  if (!raw) return null;

  if (Array.isArray(raw.quotes) && raw.quotes.length > 0)
    return buildCandlesFromQuotes(raw.quotes);

  if (Array.isArray(raw.timestamp) && raw.indicators?.quote)
    return buildCandlesFromTimestamps(raw.timestamp, raw.indicators.quote[0]);

  if (raw.chart?.result?.length) {
    const r = raw.chart.result[0];
    if (r?.timestamp && r?.indicators?.quote)
      return buildCandlesFromTimestamps(r.timestamp, r.indicators.quote[0]);
  }
  return null;
}

function buildCandlesFromQuotes(quotes) {
  const candles = [];
  for (const q of quotes) {
    const dateVal = q.date ?? q.timestamp;
    if (!dateVal) continue;
    const time = dateVal instanceof Date
      ? dateVal.getTime() / 1000
      : typeof dateVal === 'number' && dateVal > 1e12
        ? dateVal / 1000
        : typeof dateVal === 'number'
          ? dateVal
          : new Date(dateVal).getTime() / 1000;
    const open  = safeNum(q.open),   high = safeNum(q.high);
    const low   = safeNum(q.low),    close = safeNum(q.close) ?? safeNum(q.adjclose);
    const volume = safeNum(q.volume) ?? 0;
    if (!isFinite(time) || open == null || high == null || low == null || close == null) continue;
    if (open === 0 && high === 0 && low === 0 && close === 0) continue;
    candles.push({ time, open, high, low, close, volume });
  }
  return candles.length > 0 ? candles : null;
}

function buildCandlesFromTimestamps(timestamps, quote) {
  if (!timestamps || !quote) return null;
  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    const time  = timestamps[i];
    const open  = safeNum(quote.open?.[i]),   high = safeNum(quote.high?.[i]);
    const low   = safeNum(quote.low?.[i]),    close = safeNum(quote.close?.[i]);
    const volume = safeNum(quote.volume?.[i]) ?? 0;
    if (time == null || open == null || high == null || low == null || close == null) continue;
    candles.push({ time, open, high, low, close, volume });
  }
  return candles.length > 0 ? candles : null;
}

function filterSessionCandles(candles) {
  const openMs  = marketOpenUTC().getTime();
  const closeMs = Date.now();
  return candles.filter(c => c.time * 1000 >= openMs && c.time * 1000 <= closeMs);
}

// ── Analysis ──────────────────────────────────────────────────────

function analyzeDirection(candles) {
  if (candles.length < 2)
    return { direction: 'SIDEWAYS', upRatio: 0 };
  let upCount = 0;
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) upCount++;
  }
  const upRatio = upCount / (candles.length - 1);
  const direction = upRatio > DIRECTION_UP_THRESHOLD
    ? 'BULLISH'
    : upRatio < DIRECTION_DOWN_THRESHOLD
      ? 'BEARISH'
      : 'SIDEWAYS';
  return { direction, upRatio };
}

function analyzeVolatility(candles) {
  if (candles.length < 2)
    return { volatility: 'NORMAL', ratio: null };
  const ranges     = candles.map(c => c.high - c.low);
  const priorRanges = ranges.slice(0, -1);
  const avgRange   = priorRanges.reduce((a, b) => a + b, 0) / priorRanges.length;
  const lastRange  = ranges[ranges.length - 1];
  const ratio      = avgRange > 0 ? lastRange / avgRange : 1;
  return {
    volatility: ratio > VOLATILITY_MULTIPLIER ? 'VOLATILE' : 'NORMAL',
    ratio,
  };
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Fetch NIFTY 50 intraday data and return current market state.
 *
 * @returns {Promise<{
 *   direction  : string,
 *   volatility : string,
 *   state      : string,
 *   upRatio    : number,
 *   volRatio   : number|null,
 *   candleCount: number,
 *   error      : string|null,
 * }>}
 */
export async function getNiftyState() {
  const interval = `${TIMEFRAME_MINUTES}m`;
  const period1  = marketOpenUTC();
  const period2  = new Date();

  let raw;
  try {
    raw = await yahooFinance.chart(NIFTY_SYMBOL, { period1, period2, interval });
  } catch (err) {
    return {
      direction: 'UNKNOWN', volatility: 'UNKNOWN', state: 'UNKNOWN',
      upRatio: 0, volRatio: null, candleCount: 0,
      error: err.message.slice(0, 80),
    };
  }

  const allCandles = normalizeYahooResponse(raw);
  if (!allCandles) {
    return {
      direction: 'UNKNOWN', volatility: 'UNKNOWN', state: 'UNKNOWN',
      upRatio: 0, volRatio: null, candleCount: 0,
      error: 'Could not parse NIFTY response',
    };
  }

  const intraday = filterSessionCandles(allCandles);
  if (intraday.length < 2) {
    return {
      direction: 'UNKNOWN', volatility: 'UNKNOWN', state: 'UNKNOWN',
      upRatio: 0, volRatio: null, candleCount: intraday.length,
      error: 'Not enough NIFTY intraday candles yet',
    };
  }

  const completed       = intraday.slice(0, -1);
  const liveCandle      = intraday[intraday.length - 1];
  const analysisCandles = completed.slice(-REQUIRED_CANDLES);

  const { direction, upRatio }    = analyzeDirection(analysisCandles);
  const { volatility, ratio }     = analyzeVolatility([...analysisCandles, liveCandle]);

  return {
    direction,
    volatility,
    state      : `${direction}_${volatility}`,
    upRatio,
    volRatio   : ratio,
    candleCount: analysisCandles.length,
    error      : null,
  };
}
