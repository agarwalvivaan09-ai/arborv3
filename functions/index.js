const functions = require("firebase-functions");
const axios = require("axios");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.getStockData = functions.https.onRequest(async (req, res) => {

    const ticker = req.query.ticker;
    const exchange = req.query.exchange;

    if (!ticker || !exchange) {
        res.status(400).send("Ticker and exchange required");
        return;
    }

    try {

        const apiKey = "9ad5cd81b0194a2c8f5f12b919f0d836";

        const symbol = exchange === "US"
            ? ticker
            : `${ticker}.${exchange}`;

        // Fetch historical daily prices (1 year)
        const response = await axios.get(
            "https://api.twelvedata.com/time_series", {
                params: {
                    symbol: symbol,
                    interval: "1day",
                    outputsize: 250,
                    apikey: apiKey
                }
            }
        );

        const data = response.data.values;

        if (!data || data.length < 50) {
            res.status(400).send("Not enough historical data");
            return;
        }

        // Reverse to chronological order
        const prices = data.reverse().map(d => parseFloat(d.close));

        // Calculate log returns
        let returns = [];
        for (let i = 1; i < prices.length; i++) {
            const r = Math.log(prices[i] / prices[i - 1]);
            returns.push(r);
        }

        const mean =
            returns.reduce((a, b) => a + b, 0) / returns.length;

        const variance =
            returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0)
            / returns.length;

        const dailyVol = Math.sqrt(variance);

        const annualReturn = mean * 252;
        const annualVol = dailyVol * Math.sqrt(252);

        const currentPrice = prices[prices.length - 1];

        res.json({
            symbol: symbol,
            currentPrice,
            expectedReturn: annualReturn,
            volatility: annualVol
        });

    } catch (error) {
        res.status(500).send(error.toString());
    }
});