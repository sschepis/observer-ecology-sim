import React from 'react';
import type { FC } from 'react';
import type { SimulationStats } from '../types';

interface InfoPanelProps {
  stats: SimulationStats;
}

const InfoPanel: FC<InfoPanelProps> = ({ stats }) => {
  const accuracyColor = stats.directionAccuracy >= 60 ? 'text-green-400' :
                       stats.directionAccuracy >= 50 ? 'text-yellow-400' : 'text-red-400';
  
  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-6 shadow-2xl backdrop-blur-md border border-gray-700/50">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700/50">
        <h2 className="text-lg font-bold text-white flex items-center">
          <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
          Market Overview
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="font-semibold text-gray-400">Time Step:</div>
        <div className="font-mono text-right text-green-400">{stats.timeStep}</div>
        
        <div className="font-semibold text-gray-400">Current Price:</div>
        <div className="font-mono text-right text-green-400">${stats.currentPrice.toFixed(2)}</div>

        <div className="font-semibold text-gray-400">Best Prediction:</div>
        <div className="font-mono text-right text-green-400">${stats.bestPrediction.toFixed(2)}</div>

        <div className="font-semibold text-gray-400">Prediction Error:</div>
        <div className="font-mono text-right text-green-400">${stats.predictionError.toFixed(2)}</div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-700/50">
        <h3 className="text-sm font-bold text-cyan-300 mb-3 uppercase tracking-wide">Direction Accuracy</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="font-semibold text-gray-400">Direction Accuracy:</div>
          <div className={`font-mono text-right font-bold ${accuracyColor}`}>
            {stats.directionAccuracy.toFixed(1)}%
          </div>
          
          <div className="font-semibold text-gray-400">Correct / Total:</div>
          <div className="font-mono text-right text-cyan-400">
            {stats.correctPredictions} / {stats.totalPredictions}
          </div>
          
          {stats.lastPrediction && (
            <>
              <div className="font-semibold text-gray-400">Last Prediction:</div>
              <div className={`font-mono text-right font-bold ${stats.lastPrediction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                {stats.lastPrediction} {stats.lastPrediction === 'UP' ? '↑' : '↓'}
              </div>
              
              <div className="font-semibold text-gray-400">Actual Direction:</div>
              <div className={`font-mono text-right font-bold ${stats.lastActual === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                {stats.lastActual} {stats.lastActual === 'UP' ? '↑' : '↓'}
              </div>
              
              <div className="font-semibold text-gray-400">Result:</div>
              <div className={`font-mono text-right font-bold ${stats.lastPrediction === stats.lastActual ? 'text-green-400' : 'text-red-400'}`}>
                {stats.lastPrediction === stats.lastActual ? '✓ Correct' : '✗ Wrong'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
