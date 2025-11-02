import React from 'react';
import type { FC } from 'react';
import type { TradingStats, TradingSignal } from '../types';

interface TradingPanelProps {
  tradingStats: TradingStats;
  currentSignal: TradingSignal | null;
}

const TradingPanel: FC<TradingPanelProps> = ({ tradingStats, currentSignal }) => {
  const winRateColor = tradingStats.winRate >= 60 ? 'text-green-400' : 
                       tradingStats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400';
  
  const pnlColor = tradingStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400';
  
  const signalColor = currentSignal?.action === 'BUY' ? 'text-green-400' :
                      currentSignal?.action === 'SELL' ? 'text-red-400' : 'text-gray-400';
  
  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-6 shadow-2xl backdrop-blur-md border border-gray-700/50">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700/50">
        <h2 className="text-lg font-bold text-white flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
          Trading Performance
        </h2>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
          <span className="text-xs text-cyan-400 font-semibold">LIVE</span>
        </div>
      </div>
      
      {/* Current Signal */}
      <div className="mb-6 p-4 bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-lg border border-gray-700/30 shadow-inner">
        <h3 className="text-sm font-bold text-cyan-300 mb-3 uppercase tracking-wide">Active Signal</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="font-semibold text-gray-400">Action:</div>
          <div className={`font-mono text-right font-bold ${signalColor}`}>
            {currentSignal?.action || 'HOLD'}
            {currentSignal?.action === 'BUY' && ' 🔼'}
            {currentSignal?.action === 'SELL' && ' 🔽'}
          </div>
          
          {currentSignal && (
            <>
              <div className="font-semibold text-gray-400">Confidence:</div>
              <div className="font-mono text-right text-cyan-400">
                {(currentSignal.confidence * 100).toFixed(1)}%
              </div>
              
              <div className="font-semibold text-gray-400">Entry Price:</div>
              <div className="font-mono text-right text-cyan-400">
                ${currentSignal.entryPrice.toFixed(2)}
              </div>
              
              <div className="font-semibold text-gray-400">Predicted:</div>
              <div className="font-mono text-right text-cyan-400">
                ${currentSignal.predictedPrice.toFixed(2)}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Ecology Features */}
      {currentSignal?.ecologyFeatures && (
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-lg border border-gray-700/30 shadow-inner">
          <h3 className="text-sm font-bold text-cyan-300 mb-3 uppercase tracking-wide">Market Intelligence</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-semibold text-gray-400">Market Regime:</div>
            <div className={`font-mono text-right font-bold ${
              currentSignal.ecologyFeatures.marketRegime === 'trending' ? 'text-green-400' :
              currentSignal.ecologyFeatures.marketRegime === 'volatile' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {currentSignal.ecologyFeatures.marketRegime.toUpperCase()}
            </div>
            
            <div className="font-semibold text-gray-400">Volatility:</div>
            <div className="font-mono text-right text-cyan-400">
              {(currentSignal.ecologyFeatures.volatilityEstimate * 100).toFixed(2)}%
            </div>
            
            <div className="font-semibold text-gray-400">Trend Strength:</div>
            <div className="font-mono text-right text-cyan-400">
              {(currentSignal.ecologyFeatures.trendStrength * 100).toFixed(1)}%
            </div>
            
            <div className="font-semibold text-gray-400">Phase Consensus:</div>
            <div className="font-mono text-right text-cyan-400">
              {(currentSignal.ecologyFeatures.phaseConsensus * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}
      
      {/* Current Position */}
      {tradingStats.currentPosition && (
        <div className="mb-6 p-4 bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-lg border border-gray-700/30 shadow-inner">
          <h3 className="text-sm font-bold text-cyan-300 mb-3 uppercase tracking-wide flex items-center">
            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></span>
            Open Position
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-semibold text-gray-400">Type:</div>
            <div className={`font-mono text-right font-bold ${
              tradingStats.currentPosition.type === 'LONG' ? 'text-green-400' : 'text-red-400'
            }`}>
              {tradingStats.currentPosition.type}
            </div>
            
            <div className="font-semibold text-gray-400">Entry Price:</div>
            <div className="font-mono text-right text-cyan-400">
              ${tradingStats.currentPosition.entryPrice.toFixed(2)}
            </div>
            
            <div className="font-semibold text-gray-400">Size:</div>
            <div className="font-mono text-right text-cyan-400">
              {tradingStats.currentPosition.size} BTC
            </div>
          </div>
        </div>
      )}
      
      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="font-semibold text-gray-400">Total Trades:</div>
        <div className="font-mono text-right text-cyan-400">
          {tradingStats.totalTrades}
        </div>
        
        <div className="font-semibold text-gray-400">Win Rate:</div>
        <div className={`font-mono text-right font-bold ${winRateColor}`}>
          {tradingStats.winRate.toFixed(1)}%
        </div>
        
        <div className="font-semibold text-gray-400">Winning / Losing:</div>
        <div className="font-mono text-right text-cyan-400">
          {tradingStats.winningTrades} / {tradingStats.losingTrades}
        </div>
        
        <div className="font-semibold text-gray-400">Total P&L:</div>
        <div className={`font-mono text-right font-bold ${pnlColor}`}>
          ${tradingStats.totalPnL.toFixed(2)}
        </div>
        
        {tradingStats.maxDrawdown !== undefined && (
          <>
            <div className="font-semibold text-gray-400">Max Drawdown:</div>
            <div className="font-mono text-right text-red-400">
              {tradingStats.maxDrawdown.toFixed(1)}%
            </div>
          </>
        )}
        
        {tradingStats.sharpeRatio !== undefined && (
          <>
            <div className="font-semibold text-gray-400">Sharpe Ratio:</div>
            <div className="font-mono text-right text-cyan-400">
              {tradingStats.sharpeRatio.toFixed(2)}
            </div>
          </>
        )}
      </div>
      
      {/* Recent Trades */}
      {tradingStats.positionHistory.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-600">
          <h3 className="text-sm font-bold text-cyan-300 mb-3 uppercase tracking-wide">Trade History</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
            {tradingStats.positionHistory.slice(-5).reverse().map((position, idx) => (
              <div 
                key={idx} 
                className="p-2 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-lg text-xs flex justify-between items-center border border-gray-800/50 hover:border-gray-700/50 transition-colors"
              >
                <span className={`font-bold ${position.type === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                  {position.type}
                </span>
                <span className="text-gray-400">
                  ${position.entryPrice.toFixed(2)} → ${position.exitPrice?.toFixed(2)}
                </span>
                <span className={`font-bold ${(position.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(position.pnl || 0) >= 0 ? '+' : ''}{position.pnl?.toFixed(2)}
                  {' '}({position.pnlPercent?.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingPanel;