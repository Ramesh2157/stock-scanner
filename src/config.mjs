/**
 * config.mjs — Central configuration for the backtesting engine.
 * All strategy parameters live here for easy tuning.
 */

// ── Symbols to screen & backtest ─────────────────────────────

export const SYMBOLS = {symbolsNS:[
  // 'RELIANCE.NS',
  // 'TCS.NS',
  // 'INFY.NS',
  // 'HDFCBANK.NS',
  // 'ICICIBANK.NS',
  "HINDALCO.NS",
  // "SHRIRAMFIN.NS",
  // "FORCEMOT.NS",
  // "NAVINFLUOR.NS",
  // "JSWSTEEL.NS",
  // "LAURUSLABS.NS",
  // "BLUESTARCO.NS",
  // "INDUSTOWER.NS",
  // "VOLTAS.NS"     
]};

// ── Strategy & engine parameters ─────────────────────────────
export const CONFIG = {
  // SMA period (days)
  SMA_PERIOD: 44,

  // Uptrend filter: SMA today must be higher than N days ago
  SMA_TREND_LOOKBACK: 60,

  // Minimum market cap in crore INR (2000 Cr = ₹20 billion)
  // Note: Yahoo Finance returns marketCap in absolute INR.
  // 1 crore = 10,000,000. So 2000 crore = 20,000,000,000.
  MIN_MARKET_CAP_CRORE: 2000,

  // Exit rules
  STOP_LOSS_PCT  : 0.05,   // 5% below entry
  TARGET_PCT     : 0.10,   // 10% above entry
  TIME_EXIT_DAYS : 10,     // max holding period in trading days

  // How many calendar days of history to request from Yahoo
  // Need SMA_PERIOD + SMA_TREND_LOOKBACK + trade buffer
  LOOKBACK_DAYS: 800,

  // Initial capital for equity curve simulation (INR)
  INITIAL_CAPITAL: 1_000_000,

  // Verbose error logging
  DEBUG: false,
  TELEGRAM: {
    TOKEN: "8755781460:AAEhI4v3bFkYZzMBoUxmUNPftU42X_SLJU4",         // ← paste your bot token
    ETH_TOKEN:"8733022976:AAEcNEpL2npZJaNQmyHo_BaC3QlAYTy8I18",
    BTC_TOKEN:"8739226478:AAHwxKhT_JPLGR_PZVUQm6UKNsoO8VwM7xU",
    // CHAT_ID: "7934836805",         // ← paste your chat ID
    CHAT_ID: "-5041964469",         // ← paste your group ID
    ENABLED: true,
  },
};
