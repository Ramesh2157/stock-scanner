/**
 * deliveryScanner.mjs — NSE Delivery Trade Scanner (15-20 Day Swing)
 * -------------------------------------------------------------------
 * Uses daily candles to find the best entry, stop loss, and target
 * for short-term delivery (swing) trades.
 *
 * Logic:
 *   Trend    — EMA20 vs EMA50 on 60 daily candles
 *   Entry    — price pulled back to EMA20 (not chasing highs)
 *   Volume   — up-day volume must dominate (institutions buying)
 *   Market   — NIFTY must not be in downtrend
 *   Output   — BUY / WAIT / AVOID + entry zone, stop, target
 *
 * Usage:
 *   node delivery.mjs
 */

import YahooFinance from 'yahoo-finance2';
import { DELIVERY_STOCKS, DELIVERY_CONFIG } from './config.mjs';

// ── Shared YahooFinance instance ─────────────────────────────────
const yahooFinance = new YahooFinance();

const C = DELIVERY_CONFIG;

// ── Utilities ─────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function safeNum(v) {
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function pct(a, b) { return ((a - b) / b) * 100; }
function fmt(n, d = 2) { return n != null ? Number(n).toFixed(d) : '—'; }
function formatDate(epochSeconds) {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

// ── EMA calculations ──────────────────────────────────────────────

function calcEMA(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcEMAFull(closes, period) {
  const result = new Array(closes.length).fill(null);
  if (closes.length < period) return result;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = ema;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
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
    const open  = safeNum(q.open),  high = safeNum(q.high);
    const low   = safeNum(q.low),   close = safeNum(q.close) ?? safeNum(q.adjclose);
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
    const open  = safeNum(quote.open?.[i]),  high = safeNum(quote.high?.[i]);
    const low   = safeNum(quote.low?.[i]),   close = safeNum(quote.close?.[i]);
    const volume = safeNum(quote.volume?.[i]) ?? 0;
    if (time == null || open == null || high == null || low == null || close == null) continue;
    candles.push({ time, open, high, low, close, volume });
  }
  return candles.length > 0 ? candles : null;
}

// ── Core analysis ─────────────────────────────────────────────────

function analyzeStock(candles) {
  const c = candles.slice(-C.TREND_DAYS);
  if (c.length < C.EMA_SLOW + 5)
    return { error: `Need ${C.EMA_SLOW + 5} candles, got ${c.length}` };

  const closes  = c.map(x => x.close);
  const highs   = c.map(x => x.high);
  const lows    = c.map(x => x.low);

  const currentPrice = closes[closes.length - 1];
  const currentDate  = formatDate(c[c.length - 1].time);

  const ema20      = calcEMA(closes, C.EMA_FAST);
  const ema50      = calcEMA(closes, C.EMA_SLOW);
  const ema20Full  = calcEMAFull(closes, C.EMA_FAST);
  const ema50Full  = calcEMAFull(closes, C.EMA_SLOW);

  const trend = ema20 > ema50 ? 'UPTREND' : ema20 < ema50 ? 'DOWNTREND' : 'FLAT';

  const ema20_5daysAgo = ema20Full[ema20Full.length - 6];
  const ema20Slope     = ema20_5daysAgo != null ? pct(ema20, ema20_5daysAgo) : 0;

  // Recent crossover: EMA20 crossed above EMA50 in last 15 bars?
  let recentCrossover = false;
  for (let i = c.length - 15; i < c.length; i++) {
    if (
      ema20Full[i] != null && ema50Full[i] != null &&
      ema20Full[i - 1] != null && ema50Full[i - 1] != null
    ) {
      if (ema20Full[i - 1] <= ema50Full[i - 1] && ema20Full[i] > ema50Full[i]) {
        recentCrossover = true;
        break;
      }
    }
  }

  const distFromEMA20 = (currentPrice - ema20) / ema20;
  const nearSupport   = Math.abs(distFromEMA20) <= C.PULLBACK_BAND;
  const extendedAbove = distFromEMA20 > C.PULLBACK_BAND * 2;
  const belowEMA20    = distFromEMA20 < -C.PULLBACK_BAND;

  // Volume: compare avg up-day vs avg down-day volume
  const upDayVols   = [];
  const downDayVols = [];
  for (let i = 1; i < c.length; i++) {
    if (c[i].close > c[i - 1].close)      upDayVols.push(c[i].volume);
    else if (c[i].close < c[i - 1].close) downDayVols.push(c[i].volume);
  }
  const avgUpVol   = upDayVols.length   ? upDayVols.reduce((a, b) => a + b, 0) / upDayVols.length   : 0;
  const avgDownVol = downDayVols.length ? downDayVols.reduce((a, b) => a + b, 0) / downDayVols.length : 1;
  const volumeRatio = avgUpVol / avgDownVol;
  const volumeOK   = volumeRatio >= C.VOLUME_RATIO_MIN;

  // Stop loss: below recent swing low
  const recentLows = lows.slice(-C.SWING_LOW_DAYS);
  const swingLow   = Math.min(...recentLows);
  const stopLoss   = swingLow * (1 - C.STOP_BUFFER);
  const riskPct    = pct(currentPrice, stopLoss);
  const riskAbs    = currentPrice - stopLoss;

  // Target: R:R based, capped at recent swing high
  const recentHighs = highs.slice(-C.SWING_LOW_DAYS * 2);
  const swingHigh   = Math.max(...recentHighs);
  const rTarget     = currentPrice + riskAbs * C.R_RATIO;
  const natTarget   = swingHigh;
  const target      = Math.min(rTarget, natTarget) > currentPrice
    ? Math.min(rTarget, natTarget)
    : rTarget;
  const targetPct   = pct(target, currentPrice);

  // Entry zone
  const entryIdeal = Math.min(currentPrice, ema20 * 1.005);
  const entryMax   = ema20 * (1 + C.PULLBACK_BAND);

  // ── Decision ──────────────────────────────────────────────────
  let signal;
  const reasons  = [];
  const warnings = [];

  if (trend === 'DOWNTREND') {
    signal = 'AVOID';
    reasons.push('EMA20 is below EMA50 — stock is in a downtrend. Don\'t fight it.');
  } else if (trend === 'FLAT') {
    signal = 'AVOID';
    reasons.push('EMA20 and EMA50 are flat — no clear trend. Better opportunities elsewhere.');
  } else if (belowEMA20 && !recentCrossover) {
    signal = 'AVOID';
    reasons.push('Price has broken below EMA20 support — trend may be weakening.');
  } else if (extendedAbove) {
    signal = 'WAIT';
    reasons.push(`Price is ${fmt(distFromEMA20 * 100, 1)}% above EMA20 — extended, chasing risk is high.`);
    reasons.push('Wait for a pullback toward EMA20 before entering.');
  } else if (!volumeOK) {
    signal = 'WAIT';
    reasons.push(`Volume on up-days (${fmt(volumeRatio, 2)}×) is not convincingly above down-days.`);
    reasons.push('Weak volume = weak conviction. Wait for volume to confirm the move.');
  } else if (trend === 'UPTREND' && nearSupport && volumeOK) {
    signal = 'BUY';
    reasons.push('EMA20 is above EMA50 — uptrend confirmed.');
    reasons.push(`Price has pulled back to EMA20 support zone (${fmt(distFromEMA20 * 100, 1)}% from EMA20).`);
    reasons.push(`Volume on up-days is ${fmt(volumeRatio, 2)}× higher than down-days — institutional buying present.`);
    if (recentCrossover)
      reasons.push('EMA20 recently crossed above EMA50 — fresh trend, good timing.');
  } else {
    signal = 'WAIT';
    reasons.push('Uptrend present but conditions not fully aligned yet.');
    reasons.push('Wait for price to pull back closer to EMA20.');
  }

  if (riskPct > 7)
    warnings.push(`⚠️  Stop is ${fmt(riskPct, 1)}% away — risk is wide. Size down.`);
  if (targetPct < 5)
    warnings.push(`⚠️  Target is only ${fmt(targetPct, 1)}% away — slim reward. Reconsider.`);
  if (ema20Slope < 0.1 && trend === 'UPTREND')
    warnings.push('⚠️  EMA20 slope is flattening — momentum slowing.');

  return {
    currentPrice, currentDate,
    ema20: fmt(ema20), ema50: fmt(ema50),
    ema20Slope: fmt(ema20Slope, 2),
    trend, distFromEMA20: fmt(distFromEMA20 * 100, 1),
    volumeRatio: fmt(volumeRatio, 2),
    swingLow: fmt(swingLow), stopLoss: fmt(stopLoss),
    riskPct: fmt(riskPct, 1),
    entryIdeal: fmt(entryIdeal), entryMax: fmt(entryMax),
    target: fmt(target), targetPct: fmt(targetPct, 1),
    recentCrossover, signal, reasons, warnings,
  };
}

// ── Fetch one symbol ──────────────────────────────────────────────

async function fetchAndAnalyze(symbol) {
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - C.LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  let raw;
  try {
    raw = await yahooFinance.chart(symbol, { period1, period2, interval: '1d' });
  } catch (err) {
    return { symbol, error: err.message.slice(0, 60) };
  }

  const candles = normalizeYahooResponse(raw);
  if (!candles) return { symbol, error: 'Could not parse response' };
  if (candles.length < C.EMA_SLOW + 5)
    return { symbol, error: `Only ${candles.length} daily candles — need ${C.EMA_SLOW + 5}` };

  const result    = analyzeStock(candles);
  result.symbol   = symbol;
  return result;
}

// ── Public: run the delivery scan ────────────────────────────────

/**
 * Run the delivery scanner over DELIVERY_STOCKS.
 * Prints a detailed report with entry/stop/target levels and returns results.
 *
 * @returns {Promise<Array>}
 */
export async function runDeliveryScan() {
  const hdr  = '═'.repeat(68);
  const div  = '─'.repeat(68);
  const thin = '·'.repeat(68);

  console.log(hdr);
  console.log('  NSE Delivery Scanner  |  15-20 Day Swing  |  Daily Candles');
  console.log(hdr);
  console.log(`  Stocks    : ${DELIVERY_STOCKS.length}`);
  console.log(`  Trend EMAs: EMA${C.EMA_FAST} vs EMA${C.EMA_SLOW}`);
  console.log(`  R:R Target: 1 : ${C.R_RATIO}`);
  console.log(`  Run date  : ${new Date().toISOString().slice(0, 10)}`);
  console.log(div);

  // ── Fetch NIFTY for market filter ──────────────────────────────
  process.stdout.write('  Fetching NIFTY (market filter) ... ');
  const niftyResult = await fetchAndAnalyze(C.NIFTY_SYMBOL);
  const niftyTrend  = niftyResult.error ? 'UNKNOWN' : niftyResult.trend;
  console.log(`${niftyTrend} (EMA20 slope: ${niftyResult.ema20Slope ?? '—'}%)`);

  if (niftyTrend === 'DOWNTREND') {
    console.log();
    console.log('  ⚠️  NIFTY is in a DOWNTREND.');
    console.log('  Buying individual stocks into a falling market is high risk.');
    console.log('  Consider waiting for NIFTY to stabilise before taking delivery.');
    console.log(div);
  }

  console.log();

  // ── Fetch and analyse all stocks ──────────────────────────────
  const results = [];
  for (const symbol of DELIVERY_STOCKS) {
    process.stdout.write(`  Fetching ${symbol.padEnd(18)} ... `);
    await sleep(C.FETCH_DELAY_MS);
    const r = await fetchAndAnalyze(symbol);
    if (r.error) {
      console.log(`❌  ${r.error}`);
    } else {
      const icon = r.signal === 'BUY' ? '🟢' : r.signal === 'WAIT' ? '🟡' : '🔴';
      console.log(`${icon} ${r.signal}`);
    }
    results.push(r);
  }

  // ── Sort: BUY first, then WAIT, then AVOID, errors last ──
  const ORDER = { BUY: 0, WAIT: 1, AVOID: 2 };
  results.sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return (ORDER[a.signal] ?? 3) - (ORDER[b.signal] ?? 3);
  });

  // ── Detailed output for each stock ─────────────────────────────
  console.log();
  console.log(hdr);
  console.log('  DETAILED RESULTS');
  console.log(hdr);

  for (const r of results) {
    const name = r.symbol.replace('.NS', '');

    if (r.error) {
      console.log(`  ❌  ${name.padEnd(14)} ERROR: ${r.error}`);
      console.log(thin);
      continue;
    }

    const icon = r.signal === 'BUY' ? '🟢' : r.signal === 'WAIT' ? '🟡' : '🔴';

    console.log();
    console.log(`  ${icon} ${name}  (${r.currentDate})  —  ₹${r.currentPrice.toFixed(2)}`);
    console.log(thin);
    console.log(`  Trend      : ${r.trend}  |  EMA20: ₹${r.ema20}  |  EMA50: ₹${r.ema50}  |  EMA20 slope: ${r.ema20Slope}%`);
    console.log(`  Distance   : ${r.distFromEMA20}% from EMA20  |  Volume ratio (up/down): ${r.volumeRatio}×`);
    if (r.recentCrossover)
      console.log('  ✦ EMA20 recently crossed above EMA50 — fresh uptrend signal');
    console.log();

    r.reasons.forEach(reason => console.log(`  ✦ ${reason}`));
    if (r.warnings?.length) {
      console.log();
      r.warnings.forEach(w => console.log(`  ${w}`));
    }

    if (r.signal === 'BUY' || r.signal === 'WAIT') {
      console.log();
      console.log('  ── Levels ──────────────────────────────────────────────');
      console.log(`  Entry zone : ₹${r.entryIdeal}  →  ₹${r.entryMax}  (near EMA20 support)`);
      console.log(`  Stop loss  : ₹${r.stopLoss}  (below ${C.SWING_LOW_DAYS}-day swing low ₹${r.swingLow})`);
      console.log(`  Risk       : ${r.riskPct}% from entry`);
      console.log(`  Target     : ₹${r.target}  (+${r.targetPct}% from entry)`);
      console.log('  Hold max   : 20 days — exit regardless if target not hit');

      if (niftyTrend === 'DOWNTREND' && r.signal === 'BUY') {
        console.log();
        console.log('  ⚠️  NIFTY is in downtrend — even BUY signals carry extra risk.');
        console.log('  If buying, use 50% of normal position size.');
      }
    }
    console.log(thin);
  }

  // ── Summary table ──────────────────────────────────────────────
  console.log();
  console.log(hdr);
  console.log('  SUMMARY');
  console.log(hdr);
  console.log(
    '  ' +
    'STOCK'.padEnd(14) + 'SIGNAL'.padEnd(8) + 'PRICE'.padEnd(10) +
    'ENTRY'.padEnd(10) + 'STOP'.padEnd(10) + 'TARGET'.padEnd(10) +
    'RISK%'.padEnd(8) + 'UPSIDE%',
  );
  console.log(div);

  for (const r of results) {
    if (r.error) continue;
    const name   = r.symbol.replace('.NS', '').padEnd(14);
    const signal = r.signal.padEnd(8);
    const price  = `₹${r.currentPrice.toFixed(0)}`.padEnd(10);
    const entry  = r.signal === 'AVOID' ? '—'.padEnd(10) : `₹${r.entryIdeal}`.padEnd(10);
    const stop   = r.signal === 'AVOID' ? '—'.padEnd(10) : `₹${r.stopLoss}`.padEnd(10);
    const tgt    = r.signal === 'AVOID' ? '—'.padEnd(10) : `₹${r.target}`.padEnd(10);
    const risk   = r.signal === 'AVOID' ? '—'.padEnd(8)  : `${r.riskPct}%`.padEnd(8);
    const upside = r.signal === 'AVOID' ? '—' : `${r.targetPct}%`;
    console.log(`  ${name}${signal}${price}${entry}${stop}${tgt}${risk}${upside}`);
  }

  console.log(div);

  const buys  = results.filter(r => r.signal === 'BUY');
  const waits = results.filter(r => r.signal === 'WAIT');

  console.log();
  if (buys.length)  console.log(`  🟢 BUY  : ${buys.map(r => r.symbol.replace('.NS', '')).join('  |  ')}`);
  if (waits.length) console.log(`  🟡 WAIT : ${waits.map(r => r.symbol.replace('.NS', '')).join('  |  ')}`);
  if (!buys.length && !waits.length)
    console.log('  No actionable signals today. Check again tomorrow.');

  console.log();
  console.log('  ── Rules to follow ─────────────────────────────────────────');
  console.log('  1. Only enter in the ENTRY ZONE — not above entryMax');
  console.log('  2. Set your stop loss on Day 1, non-negotiable');
  console.log('  3. Book 50% at target, trail the rest');
  console.log('  4. Exit everything at 20 days even if target not hit');
  console.log('  5. If NIFTY breaks down after entry — exit without waiting');
  console.log(hdr);

  return results;
}
