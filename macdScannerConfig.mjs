/**
 * macdScannerConfig.mjs — MACD + RSI + Bollinger Band Scanner Config
 * ─────────────────────────────────────────────────────────────────────────────
 * Strategy (weekly candles):
 *   CORE  — all three required:
 *     1. MACD cross up  : blue line (MACD) crosses above red (signal) from below
 *     2. Volume confirm : this week's volume ≥ VOLUME_THRESHOLD × 20-week avg
 *     3. RSI ≥ 60       : momentum present
 *
 *   BB SCORE (0–4)  — each condition met adds 1 point:
 *     • Above middle    : close > BB mid (20-week SMA)  → uptrend confirmed
 *     • Middle bounce   : prev close ≤ mid, now close > mid → bounced off support
 *     • Squeeze firing  : bandwidth contracting vs avg of last N bars → coiling
 *     • Upper breakout  : close > upper band (strong breakout)
 *
 *   GRADE:
 *     4 → STRONG   🔥
 *     3 → GOOD     ✅
 *     2 → MODERATE ⚡
 *     1 → WEAK     ⚠️
 *     0 → No BB confirmation (still shown if core conditions met)
 */

export const MACD_SYMBOLS = {
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
    // ✏️  Add your symbols here
  ],
};

export const MACD_CONFIG = {
  // ── Timeframe ────────────────────────────────────────────────
  INTERVAL          : '1d',           // daily candles
  LOOKBACK_DAYS     : 365,            // ~1 year of daily bars

  // ── MACD ─────────────────────────────────────────────────────
  MACD_FAST         : 12,
  MACD_SLOW         : 26,
  MACD_SIGNAL       : 9,

  // ── RSI ──────────────────────────────────────────────────────
  RSI_PERIOD        : 14,
  RSI_MIN           : 60,             // must be ≥ 60 to confirm momentum

  // ── Volume ───────────────────────────────────────────────────
  VOL_MA_PERIOD     : 20,             // 20-week volume average
  VOL_THRESHOLD     : 1.5,            // volume must be ≥ 1.5× avg (buying pressure)

  // ── Bollinger Bands ───────────────────────────────────────────
  BB_PERIOD         : 20,             // 20-week SMA midline
  BB_STD            : 2,              // ±2 standard deviations
  BB_SQUEEZE_LOOKBACK: 10,            // compare bandwidth vs last 10 bars

  // ── Rate limiting ─────────────────────────────────────────────
  DELAY_BETWEEN_MS  : 3500,
};
