
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Mock BSE trade data
const symbols = [
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "WIPRO",
  "TATAMOTORS",
  "SBIN",
  "ITC",
  "BHARTIARTL"
];

const clients = [
  "Client_A",
  "Client_B",
  "Client_C",
  "Client_D",
  "Client_E",
  "Client_F",
  "Client_G"
];

// Generate 3000 seeded trade records
const trades = Array.from({ length: 3000 }, (_, index) => {
  const quantity = 10 + ((index * 17) % 990);
  const price = 100 + ((index * 37) % 4900) / 10;

  return {
    tradeId: `BSE${String(index + 1).padStart(6, "0")}`,
    client: clients[index % clients.length],
    symbol: symbols[index % symbols.length],
    quantity,
    price: Number(price.toFixed(2)),
    timestamp: new Date(
      Date.now() - index * 60000
    ).toISOString()
  };
});

// Small configurable delay for each HTTP request
const DEFAULT_DELAY = Number(
  process.env.MOCK_REQUEST_DELAY_MS || 200
);

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Mock BSE API is running"
  });
});

// GET /getTrades
// Supports pagination to avoid long-running HTTP requests
app.get("/getTrades", async (req, res) => {
  try {
    const offset = Math.max(
      0,
      Number.parseInt(req.query.offset, 10) || 0
    );

    const limit = Math.min(
      500,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 100)
    );

    const requestedDelay = Number.parseInt(
      req.query.delayMs,
      10
    );

    const delayMs = Number.isFinite(requestedDelay)
      ? Math.min(25000, Math.max(0, requestedDelay))
      : Math.min(25000, Math.max(0, DEFAULT_DELAY));

    await wait(delayMs);

    const result = trades.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      message: "Trades fetched successfully",
      total: trades.length,
      offset,
      limit,
      returned: result.length,
      hasMore: offset + result.length < trades.length,
      trades: result
    });

  } catch (error) {
    console.error("Mock API Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch trades"
    });
  }
});

const PORT = process.env.MOCK_BSE_PORT || 4001;

app.listen(PORT, () => {
  console.log("=================================");
  console.log("Mock BSE API Started Successfully");
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Seeded Trades: ${trades.length}`);
  console.log("=================================");
});
