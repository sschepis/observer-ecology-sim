import type { Candle, Timeframe } from '../types';

/**
 * Fetches real market data from the MEXC exchange API.
 * @param timeframe - The candlestick timeframe (e.g., '1m', '5m', '15m', '30m', '1h', '4h', '1d')
 * @returns A promise that resolves to an array of Candle objects.
 */
export const fetchMarketData = async (timeframe: Timeframe = '4h'): Promise<Candle[]> => {
  const symbol = 'BTCUSDT';
  const limit = 1000; // Max limit
  // Use the Vite proxy to avoid CORS issues
  const url = `/api/mexc/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MEXC API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    // MEXC returns an array of arrays: [open_time, open, high, low, close, ...]
    // We need to map this to our Candle object structure.
    const candles: Candle[] = data.map((d: any[]) => ({
      time: Number(d[0]), // open_time (timestamp)
      open: Number(d[1]),
      high: Number(d[2]),
      low: Number(d[3]),
      close: Number(d[4]),
    }));
    
    return candles;
  } catch (error) {
    console.error("Failed to fetch market data:", error);
    throw error; // Re-throw to be caught by the calling component
  }
};