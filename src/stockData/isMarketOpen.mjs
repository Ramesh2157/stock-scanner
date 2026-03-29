/**
 * isMarketOpen.mjs — NSE Market Open Guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Call checkMarketOpen() before running your 3:40 PM daily job.
 * Returns { open: true/false, reason: string }.
 *
 * Checks (in order):
 *   1. Is today a weekend?          → closed
 *   2. Is today an NSE holiday?     → closed
 *   3. Did NSE actually trade today?→ confirmed via Yahoo Finance NIFTY quote
 *      (catches any unscheduled closures / mismatches)
 *
 * Usage:
 *   import { checkMarketOpen } from './src/isMarketOpen.mjs';
 *
 *   const { open, reason } = await checkMarketOpen();
 *   if (!open) { console.log(`Skipping: ${reason}`); process.exit(0); }
 *   // ... rest of your job
 */


import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

// ─── NSE Holiday Calendar ─────────────────────────────────────────────────────
// Source: NSE India official holiday list
// Update this list each year in January.
// Format: 'YYYY-MM-DD'

const NSE_HOLIDAYS = new Set([
  // 2024
  '2024-01-22', // Ram Mandir Pratishtha (special)
  '2024-01-26', // Republic Day
  '2024-03-08', // Maha Shivaratri
  '2024-03-25', // Holi
  '2024-03-29', // Good Friday
  '2024-04-11', // Id-Ul-Fitr (Ramzan Eid)
  '2024-04-14', // Dr. Ambedkar Jayanti
  '2024-04-17', // Ram Navami
  '2024-04-21', // Mahavir Jayanti
  '2024-05-23', // Buddha Pournima
  '2024-06-17', // Bakri Eid
  '2024-07-17', // Muharram
  '2024-08-15', // Independence Day
  '2024-10-02', // Mahatma Gandhi Jayanti
  '2024-10-14', // Dussehra
  '2024-11-01', // Diwali Laxmi Pujan
  '2024-11-15', // Gurunanak Jayanti
  '2024-12-25', // Christmas

  // 2025
  '2025-02-26', // Maha Shivaratri
  '2025-03-14', // Holi
  '2025-03-31', // Id-Ul-Fitr (Ramzan Eid)
  '2025-04-10', // Shri Ram Navami
  '2025-04-14', // Dr. Ambedkar Jayanti
  '2025-04-18', // Good Friday
  '2025-05-01', // Maharashtra Day
  '2025-05-12', // Buddha Pournima
  '2025-06-07', // Bakri Eid
  '2025-06-27', // Muharram
  '2025-08-15', // Independence Day
  '2025-08-27', // Ganesh Chaturthi
  '2025-10-02', // Mahatma Gandhi Jayanti / Dussehra
  '2025-10-20', // Diwali Laxmi Pujan
  '2025-10-21', // Diwali Balipratipada
  '2025-11-05', // Gurunanak Jayanti
  '2025-12-25', // Christmas

  // 2026
  '2026-01-26', // Republic Day
  '2026-02-16', // Maha Shivaratri (tentative)
  '2026-03-04', // Holi (tentative)
  '2026-03-20', // Id-Ul-Fitr (tentative)
  '2026-03-27', // Good Friday (tentative)
  '2026-04-02', // Ram Navami (tentative)
  '2026-04-14', // Dr. Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-08-15', // Independence Day
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-12-25', // Christmas
  // Add official 2026 dates once NSE publishes them
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get today's date as 'YYYY-MM-DD' in IST (UTC+5:30).
 * The script runs at 3:40 PM IST, so IST date is always correct.
 */
function todayIST() {
  const now    = new Date();
  const istMs  = now.getTime() + (5.5 * 60 * 60 * 1000);
  const istDate = new Date(istMs);
  return istDate.toISOString().slice(0, 10);
}

/**
 * Day of week in IST. Returns 0=Sun … 6=Sat.
 */
function dayOfWeekIST() {
  const now   = new Date();
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  return new Date(istMs).getUTCDay();
}

/**
 * Verify NSE actually traded today by checking NIFTY 50 daily quote.
 * Yahoo Finance returns no data / stale data on holidays.
 *
 * @returns {Promise<{ traded: boolean, close: number|null, reason: string }>}
 */
async function verifyTradedToday() {
  const today = todayIST();

  try {
    // Fetch last 5 days of NIFTY daily data
    const from = new Date();
    from.setDate(from.getDate() - 5);

    const result = await yahooFinance.chart('^NSEI', {
      period1  : from,
      period2  : new Date(),
      interval : '1d',
    });

    const quotes = result?.quotes ?? [];
    if (quotes.length === 0) {
      return { traded: false, close: null, reason: 'No NIFTY data returned by Yahoo Finance' };
    }

    // Check if latest quote date matches today
    const latest     = quotes[quotes.length - 1];
    const latestDate = latest.date instanceof Date
      ? latest.date.toISOString().slice(0, 10)
      : String(latest.date ?? '').slice(0, 10);

    if (latestDate !== today) {
      return {
        traded : false,
        close  : null,
        reason : `NIFTY latest data is from ${latestDate}, not today (${today}) — market likely closed`,
      };
    }

    return {
      traded : true,
      close  : latest.close != null ? parseFloat(Number(latest.close).toFixed(2)) : null,
      reason : `NIFTY traded today (${today}), close: ${latest.close?.toFixed(2) ?? 'N/A'}`,
    };

  } catch (err) {
    // Network error — don't block the job, warn instead
    return {
      traded : null,   // null = unknown (network issue)
      close  : null,
      reason : `Could not verify NIFTY: ${err.message.slice(0, 80)}`,
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main guard function. Call at the start of your daily job.
 *
 * @param {{ verifyWithYahoo?: boolean }} [opts]
 *   verifyWithYahoo — default true. Set false to skip the Yahoo Finance check
 *                     (faster, but won't catch unscheduled closures).
 *
 * @returns {Promise<{
 *   open       : boolean,
 *   reason     : string,
 *   date       : string,
 *   niftyClose : number|null,
 * }>}
 */
export async function checkMarketOpen({ verifyWithYahoo = true } = {}) {
  const today  = todayIST();
  const dow    = dayOfWeekIST();
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow];

  // ── 1. Weekend check ─────────────────────────────────────────
  if (dow === 0 || dow === 6) {
    return {
      open  : false,
      reason: `Weekend (${dayName}) — NSE closed`,
      date  : today,
      niftyClose: null,
    };
  }

  // ── 2. Holiday calendar check ────────────────────────────────
  if (NSE_HOLIDAYS.has(today)) {
    return {
      open  : false,
      reason: `NSE holiday on ${today} — market closed`,
      date  : today,
      niftyClose: null,
    };
  }

  // ── 3. Yahoo Finance live verify ─────────────────────────────
  if (verifyWithYahoo) {
    const { traded, close, reason } = await verifyTradedToday();

    if (traded === false) {
      return {
        open  : false,
        reason,
        date  : today,
        niftyClose: null,
      };
    }

    if (traded === null) {
      // Network issue — can't confirm but calendar says open, proceed with warning
      console.warn(`  ⚠️  isMarketOpen: ${reason} — proceeding based on calendar`);
      return {
        open  : true,
        reason: `Calendar says open (${today}, ${dayName}) — Yahoo verify failed: ${reason}`,
        date  : today,
        niftyClose: null,
      };
    }

    return {
      open  : true,
      reason: `Market open — ${reason}`,
      date  : today,
      niftyClose: close,
    };
  }

  // verifyWithYahoo=false — calendar only
  return {
    open  : true,
    reason: `Calendar says open (${today}, ${dayName})`,
    date  : today,
    niftyClose: null,
  };
}

/**
 * Convenience: exit the process if market is closed.
 * Use at the top of any daily script.
 *
 * @example
 *   import { exitIfMarketClosed } from './src/isMarketOpen.mjs';
 *   await exitIfMarketClosed();   // halts here on weekends/holidays
 *   // ... rest of job runs only on trading days
 */
export async function exitIfMarketClosed() {
  const { open, reason, date, niftyClose } = await checkMarketOpen();

  if (!open) {
    console.log(`\n  🔴 Market closed — skipping job.`);
    console.log(`     Date   : ${date}`);
    console.log(`     Reason : ${reason}\n`);
    process.exit(0);
  }

  console.log(`  🟢 Market open — proceeding.`);
  console.log(`     Date       : ${date}`);
  console.log(`     NIFTY close: ${niftyClose != null ? '₹' + niftyClose : 'N/A'}`);
  console.log(`     Reason     : ${reason}\n`);
}
