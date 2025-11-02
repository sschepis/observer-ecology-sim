import React from 'react';
import type { FC } from 'react';
import type { SimulationStats } from '../types';

interface InfoPanelProps {
  stats: SimulationStats;
}

const InfoPanel: FC<InfoPanelProps> = ({ stats }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-6 shadow-lg backdrop-blur-sm border border-gray-700">
      <h2 className="text-xl font-bold text-cyan-300 border-b border-gray-600 pb-2 mb-4">Market Stats</h2>
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
    </div>
  );
};

export default InfoPanel;
