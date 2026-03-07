import fetch from "node-fetch";

const WEBHOOK_URL = "https://script.google.com/macros/library/d/1SNaAO2X386QK-DxpQSxOvKdy6dXK6WcZQfDFomOBQQkK8mpaPi6JjbZm/5";
// Deployment ID="AKfycbxvH7O3d3QAuL6mAo0-iY5aJDalNG_qjMigli2Ww5CjTAy1kdqTjrniDbB7Rlbv-Cu-"

// const screenerResults = [
//   {
//     name: "Hindalco Industries Limited",
//     symbol: "HINDALCO.NS",
//     status: "ENTRY NOW",
//     close: 976.09,
//     sma44: 938.82,
//     dist: "3.97%"
//   },
//   {
//     name: "JSW Steel Limited",
//     symbol: "JSWSTEEL.NS",
//     status: "ENTRY NOW",
//     close: 1242,
//     sma44: 1215.75,
//     dist: "2.16%"
//   }
// ];

// await fetch(WEBHOOK_URL, {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json"
//   },
//   body: JSON.stringify(screenerResults)
// });

// console.log("✅ Data pushed successfully");

export  async function pushStockDetails(screenerResults) {
  try {
    // const screenerResults = [
    //     {
    //         name: "Hindalco Industries Limited",
    //         symbol: "HINDALCO.NS",
    //         status: "ENTRY NOW",
    //         close: 976.09,
    //         sma44: 938.82,
    //         dist: "3.97%"
    //     }
    //     ];

        await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(screenerResults)
        });

        console.log("✅ Data pushed successfully");

  } catch (error) {
    console.error("Error pushing stock:", error.message);
  }
}