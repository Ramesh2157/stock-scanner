/**
 * macdScannerEngine.mjs — MACD + RSI + Bollinger Band Calculation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure functions only. No I/O, no network.
 *
 * Exports:
 *   buildEMA(prices, period)
 *   buildMACD(prices, fast, slow, signal)
 *   buildRSI(prices, period)
 *   buildVolMA(volumes, period)
 *   buildBB(prices, period, stdDev)
 *   runMACDScan(ohlcv, cfg)
 */

import { MACD_CONFIG } from './macdScannerConfig.mjs';

// ─── EMA ─────────────────────────────────────────────────────────────────────

export function buildEMA(prices, period) {
  const out = new Array(prices.length).fill(null);
  if (prices.length < period) return out;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = ema;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

// ─── MACD ─────────────────────────────────────────────────────────────────────
// Returns: { macdLine, signalLine, hist, crossUp, crossDown }
// crossUp[i] = true  → MACD line crossed ABOVE signal line on bar i (buy signal)
// crossDown[i] = true → MACD line crossed BELOW signal line on bar i (sell signal)

export function buildMACD(prices, fast = 12, slow = 26, signalPeriod = 9) {
  const n      = prices.length;
  const eFast  = buildEMA(prices, fast);
  const eSlow  = buildEMA(prices, slow);

  const macdLine   = prices.map((_, i) =>
    eFast[i] != null && eSlow[i] != null ? eFast[i] - eSlow[i] : null
  );
  const signalLine = new Array(n).fill(null);
  const hist       = new Array(n).fill(null);
  const crossUp    = new Array(n).fill(false);
  const crossDown  = new Array(n).fill(false);

  const firstMacd = macdLine.findIndex(v => v !== null);
  if (firstMacd < 0) return { macdLine, signalLine, hist, crossUp, crossDown };

  const k = 2 / (signalPeriod + 1);
  let sigEma = null, sigCount = 0, sigSum = 0;

  for (let i = firstMacd; i < n; i++) {
    const m = macdLine[i];
    if (m === null) continue;
    if (sigCount < signalPeriod) {
      sigSum += m; sigCount++;
      if (sigCount === signalPeriod) {
        sigEma = sigSum / signalPeriod;
        signalLine[i] = sigEma;
        hist[i] = m - sigEma;
      }
    } else {
      sigEma = m * k + sigEma * (1 - k);
      signalLine[i] = sigEma;
      hist[i] = m - sigEma;
      const pm = macdLine[i - 1], ps = signalLine[i - 1];
      if (pm != null && ps != null) {
        if (pm <= ps && m > sigEma) crossUp[i]   = true;
        if (pm >= ps && m < sigEma) crossDown[i] = true;
      }
    }
  }
  return { macdLine, signalLine, hist, crossUp, crossDown };
}

// ─── RSI ─────────────────────────────────────────────────────────────────────

export function buildRSI(prices, period = 14) {
  const out = new Array(prices.length).fill(null);
  if (prices.length < period + 1) return out;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  out[period] = 100 - 100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss));
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    out[i] = 100 - 100 / (1 + (avgLoss === 0 ? Infinity : avgGain / avgLoss));
  }
  return out;
}

// ─── Volume MA ────────────────────────────────────────────────────────────────

export function buildVolMA(volumes, period = 20) {
  const out = new Array(volumes.length).fill(null);
  if (volumes.length < period) return out;
  let sum = volumes.slice(0, period).reduce((a, b) => a + b, 0);
  out[period - 1] = sum / period;
  for (let i = period; i < volumes.length; i++) {
    sum += volumes[i] - volumes[i - period];
    out[i] = sum / period;
  }
  return out;
}

// ─── Bollinger Bands ──────────────────────────────────────────────────────────
// Returns aligned arrays: { upper, middle, lower, bandwidth, pctB }
//   upper     = middle + stdDev × σ
//   lower     = middle − stdDev × σ
//   bandwidth = (upper − lower) / middle   (normalised — for squeeze detection)
//   pctB      = (close − lower) / (upper − lower)   (0=at lower, 1=at upper)

export function buildBB(prices, period = 20, stdDev = 2) {
  const n      = prices.length;
  const upper  = new Array(n).fill(null);
  const middle = new Array(n).fill(null);
  const lower  = new Array(n).fill(null);
  const bw     = new Array(n).fill(null);   // bandwidth
  const pctB   = new Array(n).fill(null);

  if (n < period) return { upper, middle, lower, bandwidth: bw, pctB };

  for (let i = period - 1; i < n; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean  = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const sigma = Math.sqrt(variance);

    middle[i] = mean;
    upper[i]  = mean + stdDev * sigma;
    lower[i]  = mean - stdDev * sigma;
    bw[i]     = mean !== 0 ? (upper[i] - lower[i]) / mean : null;

    const range = upper[i] - lower[i];
    pctB[i] = range > 0 ? (prices[i] - lower[i]) / range : null;
  }
  return { upper, middle, lower, bandwidth: bw, pctB };
}

// ─── BB Score (0–4) ───────────────────────────────────────────────────────────
//
// Each of the 4 Bollinger Band conditions scores 1 point.
// Returns { score, conditions, details }

function scoreBB(ohlcv, i, bb, squeezeLookback) {
  if (i < 1) return { score: 0, conditions: [], details: {} };

  const close     = ohlcv[i].close;
  const prevClose = ohlcv[i - 1].close;
  const mid       = bb.middle[i];
  const upBand    = bb.upper[i];
  const loBand    = bb.lower[i];
  const bw        = bb.bandwidth[i];
  const pctb      = bb.pctB[i];

  if (mid == null || upBand == null || loBand == null) {
    return { score: 0, conditions: [], details: {} };
  }

  // ── Condition 1: above middle band ────────────────────────────
  const aboveMiddle = close > mid;

  // ── Condition 2: bounce off middle band ───────────────────────
  // Previous close was at or below middle, current close crossed above
  const prevMid = bb.middle[i - 1];
  const middleBounce = prevMid != null && prevClose <= prevMid && close > mid;

  // ── Condition 3: squeeze firing ───────────────────────────────
  // Current bandwidth < average bandwidth over last squeezeLookback bars
  let squeezing = false;
  if (bw != null) {
    const lookStart = Math.max(0, i - squeezeLookback);
    const bwSlice   = [];
    for (let j = lookStart; j < i; j++) {
      if (bb.bandwidth[j] != null) bwSlice.push(bb.bandwidth[j]);
    }
    if (bwSlice.length >= 3) {
      const avgBW = bwSlice.reduce((a, b) => a + b, 0) / bwSlice.length;
      squeezing = bw < avgBW;
    }
  }

  // ── Condition 4: close above upper band (breakout) ────────────
  const upperBreakout = close > upBand;

  const score = [aboveMiddle, middleBounce, squeezing, upperBreakout].filter(Boolean).length;
  const conditions = [];
  if (aboveMiddle)    conditions.push('ABOVE_MID');
  if (middleBounce)   conditions.push('MID_BOUNCE');
  if (squeezing)      conditions.push('SQUEEZE');
  if (upperBreakout)  conditions.push('UPPER_BREAKOUT');

  return {
    score,
    conditions,
    details: {
      aboveMiddle,
      middleBounce,
      squeezing,
      upperBreakout,
      pctB    : pctb  != null ? parseFloat((pctb  * 100).toFixed(1)) : null,
      bandwidth: bw   != null ? parseFloat((bw     * 100).toFixed(3)) : null,
      upper   : parseFloat(upBand.toFixed(2)),
      middle  : parseFloat(mid.toFixed(2)),
      lower   : parseFloat(loBand.toFixed(2)),
    },
  };
}

// ─── Grade label ──────────────────────────────────────────────────────────────

function bbGrade(score) {
  return [
    { label: 'NO BB CONFIRM', emoji: '—'  },
    { label: 'WEAK',          emoji: '⚠️' },
    { label: 'MODERATE',      emoji: '⚡' },
    { label: 'GOOD',          emoji: '✅' },
    { label: 'STRONG',        emoji: '🔥' },
  ][score] ?? { label: 'UNKNOWN', emoji: '?' };
}

// ─── Main Scanner ─────────────────────────────────────────────────────────────

/**
 * Run the MACD + RSI + BB scan on weekly OHLCV data.
 *
 * @param {Array}  ohlcv  — sorted oldest→newest, each: { date, open, high, low, close, volume }
 * @param {Object} [cfg]  — optional config overrides
 * @returns {Object}      — { signal, indicators, history }
 */
export function runMACDScan(ohlcv, cfg = MACD_CONFIG) {
  const minBars = cfg.MACD_SLOW + cfg.MACD_SIGNAL + cfg.BB_PERIOD + cfg.BB_SQUEEZE_LOOKBACK + 5;
  if (!ohlcv || ohlcv.length < minBars) {
    return { error: `Need ≥ ${minBars} weekly bars. Got ${ohlcv?.length ?? 0}.` };
  }

  const closes  = ohlcv.map(c => c.close);
  const volumes = ohlcv.map(c => c.volume ?? 0);

  const macd   = buildMACD(closes, cfg.MACD_FAST, cfg.MACD_SLOW, cfg.MACD_SIGNAL);
  const rsi    = buildRSI(closes, cfg.RSI_PERIOD);
  const volMA  = buildVolMA(volumes, cfg.VOL_MA_PERIOD);
  const bb     = buildBB(closes, cfg.BB_PERIOD, cfg.BB_STD);

  const n = ohlcv.length - 1;  // latest bar index

  // ── Core conditions on latest bar ────────────────────────────
  const macdCrossUp  = macd.crossUp[n];
  const macdLine     = macd.macdLine[n];
  const macdSignal   = macd.signalLine[n];
  const macdHist     = macd.hist[n];
  const rsiVal       = rsi[n];
  const vol          = ohlcv[n].volume;
  const vAvg         = volMA[n];
  const volRatio     = vAvg != null && vAvg > 0 ? vol / vAvg : null;

  const coreMACD  = macdCrossUp;
  const coreRSI   = rsiVal != null && rsiVal >= cfg.RSI_MIN;
  const coreVol   = volRatio != null && volRatio >= cfg.VOL_THRESHOLD;
  const corePass  = coreMACD && coreRSI && coreVol;

  // ── BB scoring ────────────────────────────────────────────────
  const { score: bbScore, conditions: bbConditions, details: bbDetails } =
    scoreBB(ohlcv, n, bb, cfg.BB_SQUEEZE_LOOKBACK);

  const grade = bbGrade(bbScore);

  // ── Build signal ──────────────────────────────────────────────
  const signalFired = corePass;   // BB score shown but not required for signal

  // ── Scan history for recent signals (last 5 bars) ─────────────
  const history = [];
  for (let i = Math.max(1, n - 4); i <= n; i++) {
    const hMacdCross = macd.crossUp[i];
    const hRsi       = rsi[i];
    const hVol       = ohlcv[i].volume;
    const hVAvg      = volMA[i];
    const hVolRatio  = hVAvg > 0 ? hVol / hVAvg : null;
    const hBB        = scoreBB(ohlcv, i, bb, cfg.BB_SQUEEZE_LOOKBACK);

    if (hMacdCross && hRsi != null && hRsi >= cfg.RSI_MIN &&
        hVolRatio != null && hVolRatio >= cfg.VOL_THRESHOLD) {
      history.push({
        barIndex  : i,
        date      : ohlcv[i].date,
        close     : parseFloat(ohlcv[i].close.toFixed(2)),
        rsi       : parseFloat(hRsi.toFixed(1)),
        volRatio  : parseFloat(hVolRatio.toFixed(2)),
        bbScore   : hBB.score,
        bbGrade   : bbGrade(hBB.score).label,
        bbConditions: hBB.conditions,
      });
    }
  }

  return {
    signalFired,
    coreConditions: { macdCrossUp: coreMACD, rsiPass: coreRSI, volPass: coreVol },
    bbScore,
    bbGrade        : grade,
    bbConditions,
    bbDetails,
    indicators: {
      // Latest bar
      close         : parseFloat(closes[n].toFixed(2)),
      date          : ohlcv[n].date,

      // MACD
      macdLine      : macdLine  != null ? parseFloat(macdLine.toFixed(4))   : null,
      macdSignal    : macdSignal != null ? parseFloat(macdSignal.toFixed(4)) : null,
      macdHist      : macdHist  != null ? parseFloat(macdHist.toFixed(4))   : null,
      macdCrossUp,

      // RSI
      rsi           : rsiVal != null ? parseFloat(rsiVal.toFixed(1)) : null,
      rsiPass       : coreRSI,

      // Volume
      volume        : vol,
      volAvg        : vAvg != null ? parseFloat(vAvg.toFixed(0)) : null,
      volRatio      : volRatio != null ? parseFloat(volRatio.toFixed(2)) : null,
      volPass       : coreVol,

      // BB latest values
      bbUpper       : bbDetails.upper  ?? null,
      bbMiddle      : bbDetails.middle ?? null,
      bbLower       : bbDetails.lower  ?? null,
      bbBandwidth   : bbDetails.bandwidth ?? null,
      bbPctB        : bbDetails.pctB   ?? null,
    },
    recentSignals: history,
  };
}
