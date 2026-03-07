// ══════════════════════════════════════════════════════════════════════════════
// TELEGRAM
// ══════════════════════════════════════════════════════════════════════════════
// const CONFIG = {

import { CONFIG } from "../../config.mjs";
import https from "https";
 
//  TELEGRAM: {
//     TOKEN: "8755781460:AAEhI4v3bFkYZzMBoUxmUNPftU42X_SLJU4",         // ← paste your bot token
//     ETH_TOKEN:"8733022976:AAEcNEpL2npZJaNQmyHo_BaC3QlAYTy8I18",
//     BTC_TOKEN:"8739226478:AAHwxKhT_JPLGR_PZVUQm6UKNsoO8VwM7xU",
//     CHAT_ID: "7934836805",         // ← paste your chat ID / group ID
//     ENABLED: true,
//   },
// };


function sanitize(t) {
  return String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sendTelegram(message) {
  return new Promise((resolve) => {
    if (!CONFIG.TELEGRAM.ENABLED || CONFIG.TELEGRAM.TOKEN === "YOUR_BOT_TOKEN_HERE") {
      console.log("[TG SKIP] Token not set.\n");
      return resolve(false);
    }
    const body = JSON.stringify({
      chat_id: CONFIG.TELEGRAM.CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    let path =`/bot${CONFIG.TELEGRAM.TOKEN}/sendMessage`
    

    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          if (res.statusCode !== 200) console.warn(`[TG WARN] ${res.statusCode}: ${d}`);
          resolve(res.statusCode === 200);
        });
      }
    );
    req.on("error", (e) => { console.warn(`[TG ERR] ${e.message}`); resolve(false); });
    req.write(body);
    req.end();
  });
}

function createTelegramMessage(row) {
  return `
${row.status}

📌 ${row.name} (${row.symbol})

💰 Open: ${row.open ?? '-'}
💰 Close: ${row.close ?? '-'}
📊 SMA44: ${row.sma44 ?? '-'}
📈 Distance from SMA: ${row.dist ?? '-'}

🎯 Entry: ${row.entryAtValue ?? '-'}
🛑 Stop Loss: ${row.stopLossValue ?? '-'}
🏆 Target: ${row.targetValue ?? '-'}
⚖ Risk/Reward: ${row.riskReward ?? '-'}

📅 ${new Date().toLocaleDateString()}
`;
}

export async function sendTelegramMessage(row) {
const message = await createTelegramMessage(row);

const sent = await sendTelegram(message);
console.log(sent ? "  ✅ Telegram sent." : "  ⚠️ Telegram not sent.");
}