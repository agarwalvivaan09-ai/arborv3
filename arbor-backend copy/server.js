require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/stock", async (req, res) => {
  const { ticker, exchange } = req.query;

  if (!ticker || !exchange) {
    return res.status(400).json({ error: "Missing ticker or exchange" });
  }

  try {
    let price;

    // ===== US STOCKS (TwelveData) =====
    if (exchange === "US") {
      const response = await axios.get("https://api.twelvedata.com/price", {
        params: {
          symbol: ticker,
          apikey: process.env.TWELVE_KEY
        }
      });

      console.log("TWELVE RESPONSE:", response.data);

      if (!response.data.price) {
        return res.status(404).json({ error: "Price not found" });
      }

      price = response.data.price;
    }

    // ===== NSE / BSE (Alpha Vantage GLOBAL_QUOTE) =====
    // ===== NSE (Yahoo Finance via backend) =====
else if (exchange === "NSE") {

  const symbol = `${ticker}.NS`;

  const response = await axios.get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
  );

  console.log("YAHOO NSE RESPONSE:", response.data);

  const result = response.data.chart.result;

  if (!result || !result[0].meta.regularMarketPrice) {
    return res.status(404).json({ error: "Price not found" });
  }

  price = result[0].meta.regularMarketPrice;
}


// ===== BSE (Alpha Vantage GLOBAL_QUOTE) =====
else if (exchange === "BSE") {

  const symbol = `${ticker}.BO`;

  const response = await axios.get(
    "https://www.alphavantage.co/query",
    {
      params: {
        function: "GLOBAL_QUOTE",
        symbol: symbol,
        apikey: process.env.ALPHA_KEY
      }
    }
  );

  console.log("ALPHA BSE RESPONSE:", response.data);

  if (!response.data["Global Quote"] ||
      !response.data["Global Quote"]["05. price"]) {
    return res.status(404).json({ error: "Price not found" });
  }

  price = response.data["Global Quote"]["05. price"];
}

    else {
      return res.status(400).json({ error: "Invalid exchange" });
    }

    res.json({ price });

  } catch (error) {
    console.log("FULL ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: "Server error fetching price" });
  }
});

const server = app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});

server.on("error", (error) => {
  console.error("Backend failed to start:", error.message);
  process.exitCode = 1;
});
