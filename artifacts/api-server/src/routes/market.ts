import { Router } from "express";
import { GetMarketPricesResponse } from "@workspace/api-zod";

const router = Router();

// Static market data — in production, fetch from CoinGecko/Binance API
const CRYPTO_DATA = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 67432.18,
    change24h: 1243.50,
    changePercent24h: 1.88,
    marketCap: 1327000000000,
    volume24h: 28400000000,
    iconUrl: null,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3512.44,
    change24h: -45.20,
    changePercent24h: -1.27,
    marketCap: 421000000000,
    volume24h: 14200000000,
    iconUrl: null,
  },
  {
    symbol: "USDT",
    name: "Tether",
    price: 1.00,
    change24h: 0.0001,
    changePercent24h: 0.01,
    marketCap: 118000000000,
    volume24h: 48000000000,
    iconUrl: null,
  },
  {
    symbol: "BNB",
    name: "BNB",
    price: 598.23,
    change24h: 12.45,
    changePercent24h: 2.12,
    marketCap: 86700000000,
    volume24h: 1900000000,
    iconUrl: null,
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 183.76,
    change24h: 8.34,
    changePercent24h: 4.75,
    marketCap: 84100000000,
    volume24h: 5600000000,
    iconUrl: null,
  },
  {
    symbol: "XRP",
    name: "XRP",
    price: 0.6124,
    change24h: -0.0082,
    changePercent24h: -1.32,
    marketCap: 33400000000,
    volume24h: 1700000000,
    iconUrl: null,
  },
  {
    symbol: "ADA",
    name: "Cardano",
    price: 0.4521,
    change24h: 0.0123,
    changePercent24h: 2.80,
    marketCap: 15900000000,
    volume24h: 380000000,
    iconUrl: null,
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    price: 0.1634,
    change24h: 0.0074,
    changePercent24h: 4.74,
    marketCap: 23700000000,
    volume24h: 1200000000,
    iconUrl: null,
  },
];

router.get("/market/prices", async (_req, res): Promise<void> => {
  // Add small random fluctuation to simulate live data
  const prices = CRYPTO_DATA.map(coin => ({
    ...coin,
    price: Math.round(coin.price * (1 + (Math.random() - 0.5) * 0.002) * 100) / 100,
  }));
  res.json(GetMarketPricesResponse.parse(prices));
});

export default router;
