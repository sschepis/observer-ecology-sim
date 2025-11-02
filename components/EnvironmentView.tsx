import React from 'react';
import type { FC } from 'react';
import type { Observer, Candle } from '../types';

interface MarketViewProps {
  observers: Observer[];
  marketData: Candle[];
  currentTimeStep: number;
  eliteN: number | null;
}

const CANDLES_TO_SHOW = 60;

const MarketView: FC<MarketViewProps> = ({ observers, marketData, currentTimeStep, eliteN }) => {
  const visibleCandles = marketData.slice(Math.max(0, currentTimeStep - CANDLES_TO_SHOW), currentTimeStep);

  if (visibleCandles.length === 0) {
    return <div className="text-center p-8">Waiting for market data...</div>;
  }

  const prices = visibleCandles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  const lastCandle = visibleCandles[visibleCandles.length - 1];

  const getPriceY = (price: number) => {
    if (priceRange === 0) return 50;
    return 100 - ((price - minPrice) / priceRange) * 100;
  };

  const candleWidth = 100 / CANDLES_TO_SHOW;

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col h-full shadow-lg backdrop-blur-sm border border-gray-700">
      <h2 className="text-lg font-bold mb-2 text-cyan-300">Market Prediction</h2>
      <p className="text-sm text-gray-400 mb-4">
        Observers predicting the next BTC candle's closing price. Last close: 
        <span className="font-mono text-yellow-300"> ${lastCandle?.close.toFixed(2)}</span>
      </p>
      
      <div className="relative w-full flex-grow bg-gray-900/50 rounded-lg overflow-hidden">
        <svg width="100%" height="100%" className="absolute top-0 left-0" preserveAspectRatio="none">
          {/* Price Grid Lines */}
          {[...Array(5)].map((_, i) => {
            const price = minPrice + (priceRange / 4) * i;
            return (
              <g key={i}>
                <line
                  x1="0" x2="100%"
                  y1={`${getPriceY(price)}%`} y2={`${getPriceY(price)}%`}
                  stroke="#4A5568" strokeWidth="0.5" strokeDasharray="2 2"
                />
                <text x="99%" y={`${getPriceY(price)}%`} dy="-2" textAnchor="end" fill="#A0AEC0" fontSize="10">
                  ${price.toFixed(0)}
                </text>
              </g>
            );
          })}
          
          {/* Candlesticks */}
          {visibleCandles.map((candle, index) => {
            const x = index * candleWidth;
            const openY = getPriceY(candle.open);
            const closeY = getPriceY(candle.close);
            const isBullish = candle.close >= candle.open;

            return (
              <g key={candle.time}>
                {/* Wick */}
                <line
                  x1={`${x + candleWidth / 2}%`} y1={`${getPriceY(candle.high)}%`}
                  x2={`${x + candleWidth / 2}%`} y2={`${getPriceY(candle.low)}%`}
                  stroke={isBullish ? '#2ECC71' : '#E74C3C'}
                  strokeWidth="1"
                />
                {/* Body */}
                <rect
                  x={`${x + candleWidth * 0.1}%`}
                  y={`${Math.min(openY, closeY)}%`}
                  width={`${candleWidth * 0.8}%`}
                  height={`${Math.abs(openY - closeY)}%`}
                  fill={isBullish ? '#2ECC71' : '#E74C3C'}
                />
              </g>
            );
          })}
          
          {/* Observer Predictions */}
          {observers.map(observer => {
            const isElite = observer.n === eliteN;
            return (
                <circle
                    key={observer.id}
                    cx={`${(visibleCandles.length + 2) * candleWidth}%`}
                    cy={`${getPriceY(observer.n)}%`}
                    r={isElite ? "4" : "2"}
                    fill={isElite ? '#00FFFF' : '#FF00FF'}
                    opacity={isElite ? "1" : "0.5"}
                />
            );
          })}
          
          {/* Prediction Line */}
          {eliteN !== null && lastCandle && (
             <line
                x1={`${(visibleCandles.length - 1 + candleWidth / 2)}%`}
                y1={`${getPriceY(lastCandle.close)}%`}
                x2={`${(visibleCandles.length + 2) * candleWidth}%`}
                y2={`${getPriceY(eliteN)}%`}
                stroke="#00FFFF" strokeWidth="1" strokeDasharray="3 3"
             />
          )}

           {/* Actual Price Line (after prediction) */}
           {marketData[currentTimeStep] && (
               <line
                  x1={`${(visibleCandles.length - 1 + candleWidth / 2)}%`}
                  y1={`${getPriceY(lastCandle.close)}%`}
                  x2={`${(visibleCandles.length) * candleWidth}%`}
                  y2={`${getPriceY(marketData[currentTimeStep].close)}%`}
                  stroke="#FFFF00" strokeWidth="2"
               />
           )}
        </svg>
      </div>
    </div>
  );
};

export default MarketView;
