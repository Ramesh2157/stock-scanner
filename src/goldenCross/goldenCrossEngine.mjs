/**
 * goldenCrossEngine.mjs — EMA 50/200 Golden Cross Engine + Entry Signal System
 * ──────────────────────────────────────────────────────────────────────────────
 * Pure functions only. No I/O.
 *
 * Entry Trigger System (both run in parallel after every Golden Cross):
 *
 *   TRIGGER A — Aggressive
 *     Fires on the FIRST bar after GC where ANY of these are true:
 *       1. MACD line crosses above signal line  (momentum confirmed)
 *       2. Close > highest high of last N bars  (breakout higher-high)
 *       3. Bullish engulfing or hammer candle   (pattern confirmation)
 *     Falls back to "next open" on GC+1 if none fire within ENTRY_WINDOW_BARS.
 *
 *   TRIGGER B — Conservative (pullback to EMA-50)
 *     Waits for price to dip within PULLBACK_BAND % of EMA-50 after GC,
 *     then requires any ONE of:
 *       1. Bullish engulfing or hammer on the pullback bar
 *       2. MACD histogram turns positive on pullback bar
 *     Entry = next bar open after confirmation.
 *     "NO_PULLBACK_IN_WINDOW" if no pullback within ENTRY_WINDOW_BARS.
 *
 *   WINNER → whichever trigger fires first (lower entryBar index).
 *            Aggressive wins on tie (lower latency).
 */

import { GOLDEN_CONFIG } from '../../goldenCrossConfig.mjs';

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

export function buildMACD(prices, fast = 12, slow = 26, signalPeriod = 9) {
  const n     = prices.length;
  const eFast = buildEMA(prices, fast);
  const eSlow = buildEMA(prices, slow);

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
        if (pm <= ps && m > sigEma)  crossUp[i]   = true;
        if (pm >= ps && m < sigEma)  crossDown[i] = true;
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

// ─── Candle Patterns ─────────────────────────────────────────────────────────

export function detectCandlePattern(ohlcv, i) {
  const none = { isBullishEngulfing: false, isHammer: false, isBullishPattern: false, patternName: null };
  if (i < 1) return none;
  const bar  = ohlcv[i];
  const prev = ohlcv[i - 1];
  const { open, high, low, close } = bar;
  const range = high - low;
  if (range === 0) return none;

  const body        = Math.abs(close - open);
  const upperShadow = high - Math.max(open, close);
  const lowerShadow = Math.min(open, close) - low;

  const isBullishEngulfing =
    close > open &&
    prev.close < prev.open &&
    open  <= prev.close &&
    close >= prev.open;

  const isHammer =
    body > 0 &&
    body <= range * 0.35 &&
    lowerShadow >= body * 2 &&
    upperShadow <= range * 0.1 &&
    Math.min(open, close) >= low + range * 0.55;

  return {
    isBullishEngulfing,
    isHammer,
    isBullishPattern : isBullishEngulfing || isHammer,
    patternName      : isBullishEngulfing ? 'BULLISH_ENGULFING' : isHammer ? 'HAMMER' : null,
  };
}

// ─── Higher High ─────────────────────────────────────────────────────────────

export function isHigherHigh(ohlcv, i, lookback = 10) {
  if (i < lookback) return false;
  const prevHigh = Math.max(...ohlcv.slice(i - lookback, i).map(c => c.high));
  return ohlcv[i].close > prevHigh;
}

// ─── EMA slope ────────────────────────────────────────────────────────────────

function emaSlope(emaArr, idx, lookback) {
  if (idx < lookback) return null;
  const now = emaArr[idx], prev = emaArr[idx - lookback];
  if (now == null || prev == null || prev === 0) return null;
  return (now - prev) / prev;
}

// ─── Format ───────────────────────────────────────────────────────────────────

const f2  = v => v != null ? parseFloat(v.toFixed(2))  : null;
const f1  = v => v != null ? parseFloat(v.toFixed(1))  : null;
const pct = v => v != null ? parseFloat((v * 100).toFixed(3)) : null;

// ─── Stop / Target ────────────────────────────────────────────────────────────

function buildTradeSetup(entryPrice, ema200Val, cfg) {
  if (entryPrice == null) return null;
  const stop   = f2(ema200Val * (1 - cfg.STOP_LOSS_PCT));
  const target = f2(entryPrice * (1 + cfg.TARGET_PCT));
  const trail  = f2(entryPrice * (1 - cfg.TRAILING_STOP_PCT));
  const risk   = f2(entryPrice - stop);
  const rew    = f2(target - entryPrice);
  const rr     = risk > 0 ? (rew / risk).toFixed(2) : 'N/A';
  return {
    entryPrice,
    stopLoss     : stop,
    target,
    trailingStop : trail,
    riskAmt      : risk,
    rewardAmt    : rew,
    riskPct      : f2((entryPrice - stop) / entryPrice * 100) + '%',
    rewardPct    : (cfg.TARGET_PCT * 100).toFixed(0) + '%',
    riskReward   : `1 : ${rr}`,
  };
}

// ─── Dual Entry Trigger ───────────────────────────────────────────────────────

function buildEntryTrigger(ohlcv, gcIndex, ema50, macd, cfg) {
  const limit = Math.min(gcIndex + cfg.ENTRY_WINDOW_BARS, ohlcv.length - 1);

  let triggerA = null;
  let triggerB = null;

  for (let i = gcIndex + 1; i <= limit; i++) {
    const bar  = ohlcv[i];
    const e50  = ema50[i];
    if (e50 == null) continue;

    const macdCrossUp  = macd.crossUp[i];
    const higherHigh   = isHigherHigh(ohlcv, i, cfg.HIGHER_HIGH_LOOKBACK);
    const candle       = detectCandlePattern(ohlcv, i);
    const inPullback   = Math.abs(bar.close - e50) / e50 <= cfg.PULLBACK_BAND && bar.close <= e50 * 1.005;
    const macdHistPos  = macd.hist[i] != null && macd.hist[i] > 0;

    // TRIGGER A
    if (!triggerA) {
      const reasons = [];
      if (macdCrossUp)             reasons.push('MACD_CROSS');
      if (higherHigh)              reasons.push('HIGHER_HIGH');
      if (candle.isBullishPattern) reasons.push(candle.patternName);

      if (reasons.length > 0) {
        const eb = i + 1 < ohlcv.length ? i + 1 : i;
        const ep = i + 1 < ohlcv.length ? (ohlcv[eb].open ?? ohlcv[eb].close) : bar.close;
        triggerA = {
          type        : 'AGGRESSIVE',
          triggerBar  : i,
          triggerDate : bar.date,
          entryBar    : eb,
          entryDate   : ohlcv[eb].date,
          entryPrice  : f2(ep),
          barsAfterGC : i - gcIndex,
          reasons,
          macdLine    : f2(macd.macdLine[i]),
          macdSignal  : f2(macd.signalLine[i]),
          macdHist    : f2(macd.hist[i]),
          candlePattern: candle.patternName,
          higherHigh,
          macdCrossUp,
        };
      }
    }

    // TRIGGER B
    if (!triggerB && inPullback) {
      const pbReasons = [];
      if (candle.isBullishPattern) pbReasons.push(candle.patternName);
      if (macdHistPos)             pbReasons.push('MACD_HIST_POS');

      if (pbReasons.length > 0) {
        const eb = i + 1 < ohlcv.length ? i + 1 : i;
        const ep = i + 1 < ohlcv.length ? (ohlcv[eb].open ?? ohlcv[eb].close) : bar.close;
        triggerB = {
          type         : 'CONSERVATIVE',
          triggerBar   : i,
          triggerDate  : bar.date,
          entryBar     : eb,
          entryDate    : ohlcv[eb].date,
          entryPrice   : f2(ep),
          barsAfterGC  : i - gcIndex,
          reasons      : pbReasons,
          pullbackPct  : f2(((bar.close - e50) / e50) * 100),
          ema50AtEntry : f2(e50),
          candlePattern: candle.patternName,
          macdHist     : f2(macd.hist[i]),
        };
      }
    }

    if (triggerA && triggerB) break;
  }

  // Fallback aggressive — next bar open, no confirmation
  if (!triggerA) {
    const fi = gcIndex + 1 < ohlcv.length ? gcIndex + 1 : gcIndex;
    triggerA = {
      type        : 'AGGRESSIVE',
      triggerBar  : gcIndex,
      triggerDate : ohlcv[gcIndex].date,
      entryBar    : fi,
      entryDate   : ohlcv[fi].date,
      entryPrice  : f2(ohlcv[fi].open ?? ohlcv[fi].close),
      barsAfterGC : 1,
      reasons     : ['NEXT_OPEN_FALLBACK'],
      macdCrossUp : false,
      higherHigh  : false,
      candlePattern: null,
    };
  }

  // No pullback found
  if (!triggerB) {
    triggerB = {
      type        : 'CONSERVATIVE',
      triggerBar  : null, triggerDate: null,
      entryBar    : null, entryDate  : null,
      entryPrice  : null,
      barsAfterGC : null,
      reasons     : ['NO_PULLBACK_IN_WINDOW'],
      pullbackPct : null,
    };
  }

  // Winner — first to fire; aggressive wins on tie
  let winner;
  if (triggerB.entryBar === null) {
    winner = triggerA;
  } else if (triggerA.entryBar <= triggerB.entryBar) {
    winner = triggerA;
  } else {
    winner = triggerB;
  }

  return { triggerA, triggerB, winner };
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export function runGoldenCross(ohlcv, cfg = GOLDEN_CONFIG) {
  const minBars = cfg.EMA_SLOW + 20;
  if (!ohlcv || ohlcv.length < minBars)
    return { error: `Need ≥ ${minBars} daily candles. Got ${ohlcv?.length ?? 0}.` };

  const closes  = ohlcv.map(c => c.close);
  const volumes = ohlcv.map(c => c.volume ?? 0);

  const ema50  = buildEMA(closes, cfg.EMA_FAST);
  const ema200 = buildEMA(closes, cfg.EMA_SLOW);
  const rsi    = buildRSI(closes, cfg.RSI_PERIOD);
  const volMA  = buildVolMA(volumes, cfg.VOLUME_MA_PERIOD);
  const macd   = buildMACD(closes, cfg.MACD_FAST, cfg.MACD_SLOW, cfg.MACD_SIGNAL);

  // ── 1. Crossovers + entry triggers ─────────────────────────────
  const goldenCrosses = [];
  const deathCrosses  = [];

  for (let i = 1; i < ohlcv.length; i++) {
    const e5  = ema50[i],  e5p = ema50[i-1];
    const e2  = ema200[i], e2p = ema200[i-1];
    if (e5==null||e5p==null||e2==null||e2p==null) continue;

    if (e5p <= e2p && e5 > e2) {
      const slope200  = emaSlope(ema200, i, cfg.EMA_SLOPE_LOOKBACK);
      const volRatio  = volMA[i] ? ohlcv[i].volume / volMA[i] : null;
      const rsiVal    = rsi[i];
      const slope200OK = slope200 != null ? slope200 > cfg.EMA200_SLOPE_MIN : true;
      const volOK     = volRatio  != null ? volRatio >= cfg.VOLUME_THRESHOLD  : false;
      const rsiOK     = rsiVal    != null ? (rsiVal >= cfg.RSI_MIN && rsiVal <= cfg.RSI_MAX) : false;
      const priceOK   = ohlcv[i].close > e5;
      const entryTriggers = buildEntryTrigger(ohlcv, i, ema50, macd, cfg);

      goldenCrosses.push({
        type: 'GOLDEN_CROSS', index: i,
        date   : ohlcv[i].date,
        price  : f2(ohlcv[i].close),
        ema50  : f2(e5),
        ema200 : f2(e2),
        rsi    : f1(rsiVal),
        volRatio: volRatio != null ? parseFloat(volRatio.toFixed(2)) : null,
        ema200SlopePct: pct(slope200),
        macdLine  : f2(macd.macdLine[i]),
        macdSignal: f2(macd.signalLine[i]),
        macdHist  : f2(macd.hist[i]),
        priceOK, volOK, rsiOK, slope200OK,
        allFiltersPass: priceOK && volOK && rsiOK && slope200OK,
        entryTriggers,
      });
    }

    if (e5p >= e2p && e5 < e2) {
      deathCrosses.push({
        type: 'DEATH_CROSS', index: i,
        date  : ohlcv[i].date,
        price : f2(ohlcv[i].close),
        ema50 : f2(e5), ema200: f2(e2),
      });
    }
  }

  // ── 2. Backtest using winner entry price ────────────────────────
  const trades = [];

  for (const gc of goldenCrosses) {
    const winner = gc.entryTriggers.winner;
    const ei     = winner.entryBar ?? gc.index + 1;
    const entry  = winner.entryPrice ?? gc.price;
    if (entry == null || ei >= ohlcv.length) continue;

    let high = entry, exitIdx = null, exitPrice = null, exitReason = null;

    for (let i = ei + 1; i < ohlcv.length; i++) {
      const bar = ohlcv[i];
      const e5  = ema50[i], e2 = ema200[i];
      if (e5==null||e2==null) continue;
      if (bar.high > high) high = bar.high;

      if (e5 < e2 && ema50[i-1] >= ema200[i-1]) {
        exitIdx=i; exitPrice=bar.close; exitReason='DEATH_CROSS'; break;
      }
      if (bar.close < e5 * (1 - cfg.STOP_LOSS_PCT)) {
        exitIdx=i; exitPrice=bar.close; exitReason='EMA50_BREAK'; break;
      }
      if (bar.low < high * (1 - cfg.TRAILING_STOP_PCT)) {
        exitIdx=i; exitPrice=f2(high*(1-cfg.TRAILING_STOP_PCT)); exitReason='TRAIL_STOP'; break;
      }
    }

    if (exitIdx === null) {
      exitIdx=ohlcv.length-1; exitPrice=ohlcv[exitIdx].close; exitReason='OPEN';
    }

    const e200AtEntry = ema200[gc.index] ?? gc.ema200;
    const ret = (exitPrice - entry) / entry;

    trades.push({
      gcDate        : gc.date,
      gcPrice       : gc.price,
      entryType     : winner.type,
      entryReasons  : winner.reasons,
      entryDate     : winner.entryDate,
      entryPrice    : f2(entry),
      barsToEntry   : ei - gc.index,
      exitDate      : ohlcv[exitIdx].date,
      exitPrice     : f2(exitPrice),
      exitReason,
      holdDays      : exitIdx - ei,
      returnPct     : f2(ret * 100),
      tradeHigh     : f2(high),
      ema50AtGC     : gc.ema50,
      ema200AtGC    : gc.ema200,
      rsiAtGC       : gc.rsi,
      allFiltersPass: gc.allFiltersPass,
      tradeSetup    : buildTradeSetup(f2(entry), e200AtEntry, cfg),
    });
  }

  // ── 3. Metrics ─────────────────────────────────────────────────
  const metrics         = buildMetrics(trades);
  const filteredMetrics = buildMetrics(trades.filter(t => t.allFiltersPass));

  // ── 4. Live signal ─────────────────────────────────────────────
  const liveSignal = buildLiveSignal(
    ohlcv, ema50, ema200, rsi, volMA, macd,
    goldenCrosses, deathCrosses, cfg
  );

  return { goldenCrosses, deathCrosses, trades, metrics, filteredMetrics, liveSignal };
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function buildMetrics(trades) {
  const closed = trades.filter(t => t.exitReason !== 'OPEN');
  const open   = trades.filter(t => t.exitReason === 'OPEN');
  const wins   = closed.filter(t => t.returnPct > 0);
  const losses = closed.filter(t => t.returnPct <= 0);

  if (!trades.length) return {
    total:0, closed:0, wins:0, losses:0, open:0,
    winRate:'N/A', avgReturn:'N/A', avgWin:'N/A', avgLoss:'N/A',
    avgHoldDays:'N/A', bestTrade:'N/A', worstTrade:'N/A',
    profitFactor:'N/A', compoundReturn:'N/A',
    exitBreakdown:{}, byEntryType:{},
  };

  const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  const avgRet  = avg(closed.map(t=>t.returnPct));
  const avgWin  = avg(wins.map(t=>t.returnPct));
  const avgLoss = avg(losses.map(t=>t.returnPct));
  const avgHold = avg(closed.map(t=>t.holdDays));
  const gWin    = wins.reduce((s,t)=>s+t.returnPct,0);
  const gLoss   = Math.abs(losses.reduce((s,t)=>s+t.returnPct,0));
  const pf      = gLoss===0 ? Infinity : gWin/gLoss;
  const compound = trades.reduce((cap,t)=>cap*(1+t.returnPct/100),1)-1;
  const exitBreakdown = trades.reduce((acc,t)=>{acc[t.exitReason]=(acc[t.exitReason]??0)+1;return acc;},{});

  const byType = type => {
    const sub = closed.filter(t=>t.entryType===type);
    const sw  = sub.filter(t=>t.returnPct>0);
    return sub.length ? {
      count  : sub.length,
      winRate: ((sw.length/sub.length)*100).toFixed(1)+'%',
      avgRet : avg(sub.map(t=>t.returnPct)).toFixed(2)+'%',
    } : null;
  };

  return {
    total:trades.length, closed:closed.length, wins:wins.length,
    losses:losses.length, open:open.length,
    winRate     : closed.length ? ((wins.length/closed.length)*100).toFixed(1)+'%' : 'N/A',
    avgReturn   : avgRet.toFixed(2)+'%',
    avgWin      : avgWin.toFixed(2)+'%',
    avgLoss     : avgLoss.toFixed(2)+'%',
    avgHoldDays : Math.round(avgHold)+' days',
    bestTrade   : closed.length ? Math.max(...closed.map(t=>t.returnPct)).toFixed(2)+'%' : 'N/A',
    worstTrade  : closed.length ? Math.min(...closed.map(t=>t.returnPct)).toFixed(2)+'%' : 'N/A',
    profitFactor    : pf===Infinity ? '∞' : pf.toFixed(2),
    compoundReturn  : (compound*100).toFixed(1)+'%',
    exitBreakdown,
    byEntryType : { AGGRESSIVE: byType('AGGRESSIVE'), CONSERVATIVE: byType('CONSERVATIVE') },
  };
}

// ─── Live Signal ──────────────────────────────────────────────────────────────

function buildLiveSignal(ohlcv, ema50, ema200, rsi, volMA, macd, goldenCrosses, deathCrosses, cfg) {
  const n     = ohlcv.length - 1;
  const price = ohlcv[n].close;
  const e50   = ema50[n], e200 = ema200[n];
  const rsiV  = rsi[n];
  const vol   = ohlcv[n].volume;
  const vAvg  = volMA[n];

  if (e50==null||e200==null) return {
    status:'INSUFFICIENT_DATA', emoji:'⚫',
    message:'Not enough candles for EMA-200.',
    actionable:false, entrySignal:null, tradeSetup:null, indicators:{},
  };

  const gap        = (e50 - e200) / e200;
  const slope200   = emaSlope(ema200, n, cfg.EMA_SLOPE_LOOKBACK);
  const slope50    = emaSlope(ema50, n, 5);
  const volRatio   = vAvg ? vol / vAvg : null;
  const priceVsE50 = (price - e50) / e50;

  const freshGC = goldenCrosses.filter(g => g.index >= n - cfg.RECENT_CROSS_BARS);
  const freshDC = deathCrosses.filter(d => d.index >= n - cfg.RECENT_CROSS_BARS);

  const curMacd   = macd.macdLine[n];
  const curSig    = macd.signalLine[n];
  const curHist   = macd.hist[n];
  const curCross  = macd.crossUp[n];
  const curCandle = detectCandlePattern(ohlcv, n);
  const curHH     = isHigherHigh(ohlcv, n, cfg.HIGHER_HIGH_LOOKBACK);

  let status, emoji, message, actionable = false;

  if (freshDC.length > 0) {
    const dc = freshDC[freshDC.length-1];
    status='DEATH_CROSS'; emoji='🔴';
    message=`Death Cross ${n-dc.index===0?'TODAY':`${n-dc.index} bar(s) ago`}. EMA-50 (${f2(e50)}) crossed BELOW EMA-200 (${f2(e200)}). Exit longs.`;
  } else if (e50 < e200) {
    status='BEARISH'; emoji='⚪';
    message=`Bearish. EMA-50 (${f2(e50)}) < EMA-200 (${f2(e200)}). Gap: ${(gap*100).toFixed(2)}%. No long trades.`;
  } else if (freshGC.length > 0) {
    const gc = freshGC[freshGC.length-1];
    const barsSince = n - gc.index;
    status='GOLDEN_CROSS'; emoji='🟢'; actionable=true;
    message=`GOLDEN CROSS ${barsSince===0?'TODAY!':barsSince+' day(s) ago.'} EMA-50 (${f2(e50)}) crossed ABOVE EMA-200 (${f2(e200)}). ${gc.allFiltersPass?'✅ All filters pass.':'⚠️ Check filters.'}`;
  } else if (gap < cfg.WARNING_GAP_PCT) {
    status='WATCH'; emoji='🟡';
    message=`EMA-50 (${f2(e50)}) > EMA-200 (${f2(e200)}) — gap NARROWING (${(gap*100).toFixed(2)}%). Watch for Death Cross.`;
  } else {
    status='IN_UPTREND'; emoji='🔵'; actionable=true;
    message=`Healthy uptrend. EMA-50 (${f2(e50)}) > EMA-200 (${f2(e200)}). Gap: +${(gap*100).toFixed(2)}%.`;
  }

  // ── Live entry signal ─────────────────────────────────────────
  let entrySignal = null;
  if (actionable && e50 > e200) {
    const pullbackZone = Math.abs(price - e50) / e50 <= cfg.PULLBACK_BAND && price <= e50 * 1.005;
    const aggrReasons  = [];
    const pbReasons    = [];

    if (curCross)                    aggrReasons.push('MACD_CROSS');
    if (curHH)                       aggrReasons.push('HIGHER_HIGH');
    if (curCandle.isBullishPattern)  aggrReasons.push(curCandle.patternName);
    if (pullbackZone && curCandle.isBullishPattern) pbReasons.push(curCandle.patternName);
    if (pullbackZone && curHist != null && curHist > 0) pbReasons.push('MACD_HIST_POS');

    const aggrFiring = aggrReasons.length > 0;
    const pbFiring   = pullbackZone && pbReasons.length > 0;

    entrySignal = aggrFiring || pbFiring
      ? {
          triggered    : true,
          winner       : aggrFiring ? 'AGGRESSIVE' : 'CONSERVATIVE',
          entryAt      : 'TOMORROW_OPEN',
          aggressive   : aggrFiring ? { reasons: aggrReasons } : null,
          conservative : pbFiring   ? { reasons: pbReasons, pullbackPct: f2(priceVsE50*100)+'%' } : null,
        }
      : {
          triggered    : false,
          winner       : null,
          aggressive   : {
            waiting  : true,
            watchFor : ['MACD_CROSS','HIGHER_HIGH','BULLISH_CANDLE'],
            macdStatus: `MACD ${f2(curMacd)} | Signal ${f2(curSig)} | Hist ${f2(curHist)}`,
          },
          conservative : {
            waiting    : true,
            inPullback : pullbackZone,
            watchFor   : ['PULLBACK_TO_EMA50 + BULLISH_CANDLE / MACD_HIST+'],
            distToEMA50: f2(priceVsE50*100)+'% from EMA-50',
          },
        };
  }

  return {
    status, emoji, message, actionable,
    entrySignal,
    tradeSetup : actionable ? buildTradeSetup(f2(price), e200, cfg) : null,
    indicators : {
      price, ema50:f2(e50), ema200:f2(e200),
      gapPct       : parseFloat((gap*100).toFixed(2)),
      rsi          : rsiV != null ? f1(rsiV)  : null,
      volRatio     : volRatio != null ? parseFloat(volRatio.toFixed(2)) : null,
      macdLine     : f2(curMacd),
      macdSignal   : f2(curSig),
      macdHist     : f2(curHist),
      macdCrossUp  : curCross,
      candlePattern: curCandle.patternName,
      higherHigh   : curHH,
      ema50SlopePct : slope50  != null ? pct(slope50)  : null,
      ema200SlopePct: slope200 != null ? pct(slope200) : null,
    },
  };
}
