/**
 * config.mjs — Central configuration for the quant-screener suite.
 *
 * Three scanners are configured here:
 *   1. SMA-44 Backtest / Live Signal (index.mjs)      → SYMBOLS + CONFIG
 *   2. Intraday 5m Scanner           (intraday.mjs)   → INTRADAY_STOCKS + INTRADAY_CONFIG
 *   3. Delivery Swing Scanner        (delivery.mjs)   → DELIVERY_STOCKS + DELIVERY_CONFIG
 */

// ─────────────────────────────────────────────────────────────────────────────
//  1. SMA-44 SWING BACKTEST + LIVE SIGNAL
//     Usage: node index.mjs
// ─────────────────────────────────────────────────────────────────────────────

export const SYMBOLS ={
  symbolsNS:
 [
  // 'RELIANCE.NS',
  // 'TCS.NS',
  // 'INFY.NS',
  // 'HDFCBANK.NS',
  // 'ICICIBANK.NS',
  'HINDALCO.NS',
  // 'SHRIRAMFIN.NS',
  // 'NAVINFLUOR.NS',
  // 'JSWSTEEL.NS',
  // 'LAURUSLABS.NS',
  // 'INDUSTOWER.NS',
  // 'VOLTAS.NS',
]};

export const CONFIG = {
  // Strategy
  SMA_PERIOD           : 44,
  SMA_TREND_LOOKBACK   : 60,
  MIN_MARKET_CAP_CRORE : 2000,

  // Exit rules
  STOP_LOSS_PCT  : 0.05,
  TARGET_PCT     : 0.10,
  TIME_EXIT_DAYS : 10,

  // Data
  LOOKBACK_DAYS  : 800,

  // Capital
  INITIAL_CAPITAL: 1_000_000,

  // Rate-limit protection
  DELAY_BETWEEN_SYMBOLS_MS: 3000,

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

// ─────────────────────────────────────────────────────────────────────────────
//  2. INTRADAY 5-MINUTE SCANNER
//     Usage: node intraday.mjs
// ─────────────────────────────────────────────────────────────────────────────

export const INTRADAY_STOCKS = [
  'VISHNU.NS',
  'TPLPLASTEH.NS',
  'CYIENTDLM.NS',
  'BHAGERIA.NS',
  'SIS.NS',
  'JSWSTEEL.NS',
  'NITIRAJ.NS',
  'AGARIND.NS',
  'ROTO.NS',
  'DREAMFOLKS.NS',
  'KOTHARIPET.NS',
  'SPAL.NS',
  'INDOCO.NS',
  'HINDUNILVR.NS',
  'VPRPL.NS',
  'EKC.NS',
  'DCXINDIA.NS',
  'DYCL.NS',
  'INTLCONV.NS',
  'CLSEL.NS',
  'JKLAKSHMI.NS',
  'TIMESGTY.NS',
  'SUKHJITS.NS',
  'IRMENERGY.NS',
  'MARINE.NS',
  'COROMANDEL.NS',
  'IMAGICAA.NS',
  'GABRIEL.NS',
  'ADANIPOWER.NS',
  'ZAGGLE.NS',
  'NTPCGREEN.NS',
  'MAMATA.NS',
  'LATENTVIEW.NS',
  'JKTYRE.NS',
  'ALANKIT.NS',
  'THOMASCOOK.NS',
  'SCHAEFFLER.NS',
  'CEATLTD.NS',
  'ZENTEC.NS',
  'CONCORDBIO.NS',
  'MANGCHEFER.NS',
  'GRSE.NS',
  'COCHINSHIP.NS',
  'KRISHANA.NS',
  'RCF.NS',
  'DOLATALGO.NS',
  'NIVABUPA.NS',
  'OBEROIRLTY.NS',
  'CAMPUS.NS',
  'OLECTRA.NS',
  'PENIND.NS',
  'SURYAROSNI.NS',
  'RAILTEL.NS',
  'NETWEB.NS',
  'JINDALSTEL.NS',
];

export const INTRADAY_CONFIG = {
  TIMEFRAME_MINUTES        : 5,
  LOOKBACK_MINUTES         : 75,
  DIRECTION_UP_THRESHOLD   : 0.6,
  DIRECTION_DOWN_THRESHOLD : 0.4,
  VOLATILITY_MULTIPLIER    : 1.5,
  IST_OFFSET_MS            : 5.5 * 60 * 60 * 1000,
  MARKET_OPEN_HOUR_UTC     : 3,
  MARKET_OPEN_MIN_UTC      : 45,

  ENTRY_WINDOW_START_H  : 9,
  ENTRY_WINDOW_START_M  : 30,
  ENTRY_WINDOW_END_H    : 13,
  ENTRY_WINDOW_END_M    : 30,
  HARD_EXIT_H           : 14,
  HARD_EXIT_M           : 30,
  EXPIRY_ENTRY_CUTOFF_H : 11,
  EXPIRY_ENTRY_CUTOFF_M : 0,
  EXPIRY_HARD_EXIT_H    : 13,
  EXPIRY_HARD_EXIT_M    : 0,

  FETCH_DELAY_MS: 300,
};

// ─────────────────────────────────────────────────────────────────────────────
//  3. DELIVERY SWING SCANNER  (15-20 day)
//     Usage: node delivery.mjs
// ─────────────────────────────────────────────────────────────────────────────

export const DELIVERY_STOCKS = [
  'TATASTEEL.NS',
  'RELIANCE.NS',
  'HDFCBANK.NS',
  'INFY.NS',
  'TCS.NS',
  'ICICIBANK.NS',
  'WIPRO.NS',
  'SBIN.NS',
  'AXISBANK.NS',
  'BAJFINANCE.NS',
  // add more symbols here with .NS suffix
];

export const DELIVERY_CONFIG = {
  NIFTY_SYMBOL : '^NSEI',
  LOOKBACK_DAYS: 90,
  TREND_DAYS   : 60,
  EMA_FAST     : 20,
  EMA_SLOW     : 50,
  PULLBACK_BAND: 0.03,
  VOLUME_RATIO_MIN: 1.2,
  R_RATIO      : 2.0,
  STOP_BUFFER  : 0.005,
  SWING_LOW_DAYS: 10,
  FETCH_DELAY_MS: 400,
};
