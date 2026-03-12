// ─────────────────────────────────────────────────────────────────────────────
//  4. GOLDEN CROSS SCANNER  (EMA-50 × EMA-200)
//     Usage: node goldenCross.mjs
//
//  Strategy:
//    ENTRY  → EMA-50 crosses ABOVE EMA-200  (Golden Cross)
//             + EMA-200 slope is rising      (true uptrend, not just recovering)
//             + Price is ABOVE EMA-50        (price confirms breakout)
//             + Volume ≥ 1.2× 20-day avg    (institutional participation)
//             + RSI-14 between 40–70         (momentum present, not overbought)
//
//    HOLD   → EMA-50 stays above EMA-200
//
//    EXIT   → Death Cross  : EMA-50 crosses BACK below EMA-200
//             EMA-50 Break : price closes > 3% below EMA-50
//             Trail Stop   : price drops 8% from trade high
//
//  LIVE SIGNALS:
//    🟢 GOLDEN CROSS  — Fresh cross ≤5 bars ago. All filters pass. Enter now.
//    🔵 IN UPTREND    — EMA50 > EMA200 healthy gap. Trend intact. Hold / add on dip.
//    🟡 WATCH         — EMA50 still > EMA200 but gap narrowing. Possible Death Cross soon.
//    🔴 DEATH CROSS   — EMA50 crossed below EMA200. Exit signal.
//    ⚪ BEARISH       — EMA50 < EMA200. No trade zone.
// ─────────────────────────────────────────────────────────────────────────────

export const GOLDEN_SYMBOLS = {
  symbolsNS: [
    'RELIANCE.NS',
    'TCS.NS',
    'INFY.NS',
    'HDFCBANK.NS',
    'ICICIBANK.NS',
    'HINDALCO.NS',
    'SHRIRAMFIN.NS',
    'NAVINFLUOR.NS',
    'JSWSTEEL.NS',
    'LAURUSLABS.NS',
    'INDUSTOWER.NS',
    'VOLTAS.NS',
    // ✏️  Add / remove symbols freely — keep .NS suffix
  ],
};

export const GOLDEN_CONFIG = {
  // ── EMA periods ──────────────────────────────────────────────
  EMA_FAST   : 50,
  EMA_SLOW   : 200,

  // ── Confirmation filters ─────────────────────────────────────
  RSI_PERIOD        : 14,
  RSI_MIN           : 40,    // avoid weak/recovering momentum
  RSI_MAX           : 70,    // avoid overbought entries
  VOLUME_MA_PERIOD  : 20,
  VOLUME_THRESHOLD  : 1.2,   // volume must be ≥ 1.2× 20-day avg on crossover bar
  EMA200_SLOPE_MIN  : 0.0,   // EMA-200 must be rising (slope > 0 over 10 bars)
  EMA_SLOPE_LOOKBACK: 10,    // bars used to measure EMA-200 slope

  // ── Warning zone ─────────────────────────────────────────────
  WARNING_GAP_PCT   : 0.005, // if EMA50-EMA200 gap < 0.5%, flag as WATCH

  // ── Exit rules ───────────────────────────────────────────────
  STOP_LOSS_PCT    : 0.03,   // exit if price closes >3% below EMA-50
  TRAILING_STOP_PCT: 0.08,   // trail: exit if price drops 8% from trade high
  TARGET_PCT       : 0.15,   // first target: +15% from entry (for setup display)

  // ── MACD ─────────────────────────────────────────────────────
  MACD_FAST    : 12,
  MACD_SLOW    : 26,
  MACD_SIGNAL  : 9,

  // ── Entry triggers ───────────────────────────────────────────
  //   Both triggers run in parallel after a Golden Cross.
  //   Whichever fires first becomes the entry.
  //
  //   TRIGGER A — Aggressive (next-day open after GC or MACD cross)
  //     • EMA-50 × EMA-200 Golden Cross fires → enter next bar open
  //     • OR MACD line crosses above signal line after GC
  //     • OR higher-high breakout bar (close > highest high of prev N bars)
  //     • OR bullish candle pattern (engulfing / hammer) on/after GC bar
  //
  //   TRIGGER B — Conservative (pullback to EMA-50 after GC)
  //     • Wait for price to pull back to within PULLBACK_BAND of EMA-50
  //     • Then require one of: bullish engulfing, hammer, or MACD hist > 0
  //     • Enter on next bar open after pullback confirmation
  //
  PULLBACK_BAND        : 0.015,  // price within 1.5% of EMA-50 = pullback zone
  HIGHER_HIGH_LOOKBACK : 10,     // bars to look back for higher-high detection
  ENTRY_WINDOW_BARS    : 20,     // max bars after GC to still look for entry

  // ── Misc ─────────────────────────────────────────────────────
  LOOKBACK_DAYS       : 1500, // ~6 years of daily data for good backtest coverage
  RECENT_CROSS_BARS   : 5,    // Golden/Death cross within 5 bars = "fresh"
  DELAY_BETWEEN_MS    : 3500, // rate-limit pause between symbols

  // ── Output ───────────────────────────────────────────────────
  SIGNALS_FILE : 'gc_signals.json',
};

// ─── Entry Point Config (appended) ───────────────────────────────────────────
// These extend GOLDEN_CONFIG at runtime — merged in goldenCross.mjs
export const ENTRY_CONFIG = {
  MODE_A_ENABLED    : true,   // aggressive: enter next open after GC
  MODE_B_ENABLED    : true,   // conservative: wait for pullback to EMA-50

  PULLBACK_BAND     : 0.015,  // price within 1.5% of EMA-50 = "at support"
  PULLBACK_MAX_BARS : 30,     // scan up to 30 bars post-GC for pullback

  MACD_FAST         : 12,
  MACD_SLOW         : 26,
  MACD_SIGNAL       : 9,
  MACD_CROSS_LOOKBACK: 5,     // MACD bullish cross within 5 bars of GC bar

  HAMMER_SHADOW_RATIO : 2.0,  // lower shadow ≥ 2× real body = hammer
  HAMMER_BODY_PCT     : 0.35, // real body ≤ 35% of total range
  ENGULF_MIN_RATIO    : 1.1,  // bull body ≥ 110% of prior bear body
};
