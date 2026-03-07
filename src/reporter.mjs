/**
 * reporter.mjs — Console performance reporting.
 *
 * Formats and prints the full backtest report to stdout.
 * Also prints a mini ASCII equity curve and trade log.
 */

import { calcMetrics } from './calculations/metrics.mjs';

const SEP  = '─'.repeat(60);
const SEP2 = '═'.repeat(60);

/**
 * Print the full performance report for one symbol.
 *
 * @param {string} symbol
 * @param {import('./calculations/backtester.mjs').BacktestResult} result
 */
export function printReport(symbol, result) {
  const { trades, equityCurve, initialCapital } = result;
  const m = calcMetrics(trades, equityCurve, initialCapital);

  console.log('\n' + SEP2);
  console.log(`  PERFORMANCE REPORT — ${symbol}`);
  console.log(SEP2);

  // ── Summary stats ──────────────────────────────────────
  console.log('\n  📊 SUMMARY');
  console.log(SEP);
  printRow('Total Trades',    m.totalTrades);
  printRow('Wins',            `${m.wins} (${pct(m.winRate)})`);
  printRow('Losses',          m.losses);
  printRow('Win Rate',        pct(m.winRate));
  console.log(SEP);
  printRow('Avg Return/Trade',pct(m.avgReturn));
  printRow('Avg Win',         pct(m.avgWin));
  printRow('Avg Loss',        pct(m.avgLoss));
  printRow('Profit Factor',   m.profitFactor === Infinity
                                ? '∞ (no losing trades)'
                                : m.profitFactor.toFixed(2));
  console.log(SEP);
  printRow('Max Drawdown',    pct(m.maxDrawdown));
  printRow('Sharpe (approx)', m.sharpeApprox.toFixed(2));
  console.log(SEP);
  printRow('Initial Capital', inr(initialCapital));
  printRow('Final Capital',   inr(m.finalCapital));
  printRow('Total Return',    pct(m.totalReturn));
  console.log(SEP);

  // ── Exit breakdown ──────────────────────────────────────
  console.log('\n  🚪 EXIT BREAKDOWN');
  console.log(SEP);
  for (const [reason, count] of Object.entries(m.exitBreakdown)) {
    printRow(reason, `${count} trades (${pct(count / m.totalTrades)})`);
  }
  console.log(SEP);

  // ── Equity curve mini-chart ─────────────────────────────
  if (equityCurve.length > 1) {
    console.log('\n  📈 EQUITY CURVE (normalised)');
    console.log(SEP);
    console.log('  ' + sparkline(equityCurve));
    console.log(SEP);
  }

  // ── Trade log (last 15 trades) ──────────────────────────
  if (trades.length > 0) {
    console.log('\n  📋 TRADE LOG (most recent 15)');
    console.log(SEP);
    console.log(
      '  ' +
      ['Entry Date', 'Exit Date', 'Entry ₹', 'Exit ₹', 'Return', 'Exit']
        .map(h => h.padEnd(13)).join('')
    );
    console.log('  ' + '─'.repeat(78));

    const recent = trades.slice(-15);
    for (const t of recent) {
      const row = [
        fmtDate(t.entryDate).padEnd(13),
        fmtDate(t.exitDate).padEnd(13),
        t.entryPrice.toFixed(2).padEnd(13),
        t.exitPrice.toFixed(2).padEnd(13),
        pct(t.returnPct).padEnd(10),
        t.exitReason,
      ].join('');
      console.log('  ' + row);
    }
    console.log(SEP);
  }

  console.log('');
}

// ── Formatting helpers ────────────────────────────────────────

function printRow(label, value) {
  console.log(`  ${label.padEnd(22)}: ${value}`);
}

function pct(v) {
  return (v * 100).toFixed(2) + '%';
}

function inr(v) {
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return 'N/A';
  return d.toISOString().slice(0, 10);
}

/**
 * Generate a Unicode sparkline from a numeric array.
 * Maps values to ▁▂▃▄▅▆▇█
 */
function sparkline(data) {
  const ticks  = ['▁','▂','▃','▄','▅','▆','▇','█'];
  const min    = Math.min(...data);
  const max    = Math.max(...data);
  const range  = max - min || 1;

  return data
    .map(v => ticks[Math.min(7, Math.floor(((v - min) / range) * 8))])
    .join('');
}

/**
 * Print the live next-entry signal for a symbol.
 *
 * @param {string} symbol
 * @param {Object} signal - Output of getLiveSignal()
 */
export function printLiveSignal(symbol, signal) {
  const { status, message, actionable, latest, trade } = signal;

  const badge = {
    ENTRY_NOW         : '🟢 ENTRY NOW',
    NEAR_SUPPORT      : '🟡 NEAR SUPPORT',
    WAIT              : '⚪ WAIT',
    BELOW_SMA         : '🔴 BELOW SMA',
    INSUFFICIENT_DATA : '⚠️  NO DATA',
  }[status] ?? status;
if(badge !=='🟢 ENTRY NOW'){
  return
}
  const SEP  = '─'.repeat(60);
  const SEP2 = '═'.repeat(60);

  console.log('\n' + SEP2);
  console.log(`  📡 NEXT ENTRY SIGNAL — ${symbol}`);
  console.log(SEP2);
  console.log(`  Status  : ${badge}`);
  console.log(`  Signal  : ${message}`);
  console.log(SEP);

  if (latest) {
    console.log(`  Date    : ${fmtDate(latest.date)}`);
    console.log(`  O/H/L/C : ${latest.open} / ${latest.high} / ${latest.low} / ${latest.close}`);
    console.log(`  SMA-44  : ${latest.sma44}   (slope ${latest.smaSlope})`);
    console.log(`  Dist    : ${latest.distFromSMA} above SMA`);
    console.log(`  Candle  : ${latest.isBullish ? '🟢 Bullish (close > open)' : '🔴 Bearish (close < open)'}`);
    console.log(`  Uptrend : ${latest.inUptrend ? '✅ Yes (SMA rising)' : '❌ No  (SMA flat/falling)'}`);
  }

  if (actionable && trade) {
    console.log(SEP);
    console.log('  📌 TRADE SETUP (Enter tomorrow at open)');
    console.log(SEP);
    console.log(`  Entry   : ${trade.entryAt}`);
    console.log(`  Stop    : ${trade.stopLoss}`);
    console.log(`  Target  : ${trade.target}`);
    console.log(`  R : R   : ${trade.riskReward}`);
  }

  console.log(SEP2 + '\n');
}
