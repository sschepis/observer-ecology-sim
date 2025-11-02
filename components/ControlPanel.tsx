import React, { useState, useEffect } from 'react';
import type { FC, ChangeEvent } from 'react';
import type { SimulationParams } from '../types';
import { DEFAULT_SIMULATION_PARAMS } from '../constants';

interface ControlPanelProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
}

const ControlPanel: FC<ControlPanelProps> = ({ params, setParams, isRunning, setIsRunning }) => {
  const [localParams, setLocalParams] = useState(params);

  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalParams(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleApplyChanges = () => {
    setParams(prev => ({...localParams, resetToken: prev.resetToken + 1}));
  };

  const handleReset = () => {
    setParams(prev => ({...DEFAULT_SIMULATION_PARAMS, resetToken: prev.resetToken + 1}));
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 shadow-lg backdrop-blur-sm border border-gray-700 space-y-6">
      <h2 className="text-xl font-bold text-cyan-300 border-b border-gray-600 pb-2">Simulation Controls</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="numObservers" className="block text-sm font-medium text-gray-300">
            Number of Observers: <span className="font-mono text-cyan-400">{localParams.numObservers}</span>
          </label>
          <input
            type="range"
            id="numObservers"
            name="numObservers"
            min="10"
            max="200"
            step="10"
            value={localParams.numObservers}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <label htmlFor="learningRate" className="block text-sm font-medium text-gray-300">
            Learning Rate (α): <span className="font-mono text-cyan-400">{localParams.learningRate.toFixed(3)}</span>
          </label>
          <input
            type="range"
            id="learningRate"
            name="learningRate"
            min="0.001"
            max="0.2"
            step="0.001"
            value={localParams.learningRate}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div>
          <label htmlFor="mutationRate" className="block text-sm font-medium text-gray-300">
            Mutation Rate: <span className="font-mono text-cyan-400">{localParams.mutationRate.toFixed(3)}</span>
          </label>
          <input
            type="range"
            id="mutationRate"
            name="mutationRate"
            min="0"
            max="0.5"
            step="0.001"
            value={localParams.mutationRate}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-600">
        <button
          onClick={() => setIsRunning(prev => !prev)}
          className={`w-full font-bold py-2 px-4 rounded transition-all duration-200 ${
            isRunning 
            ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900' 
            : 'bg-green-500 hover:bg-green-600 text-gray-900'
          }`}
        >
          {isRunning ? 'Pause' : 'Run'}
        </button>
        <button
          onClick={handleApplyChanges}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-all duration-200"
        >
          Apply & Reset
        </button>
         <button
          onClick={handleReset}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-all duration-200"
        >
          Defaults
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
