import React, { useState, useEffect, useRef } from 'react';
import type { FC, ChangeEvent } from 'react';
import type { SimulationParams, TrainingState } from '../types';
import { DEFAULT_SIMULATION_PARAMS, TIMEFRAME_OPTIONS } from '../constants';

interface ControlPanelProps {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  trainingState?: TrainingState;
  onStartTraining?: () => void;
  onLoadModel?: () => void;
  onSaveModel?: () => void;
  onExportModel?: () => void;
  onImportModel?: (file: File) => void;
}

const ControlPanel: FC<ControlPanelProps> = ({
  params,
  setParams,
  isRunning,
  setIsRunning,
  trainingState,
  onStartTraining,
  onLoadModel,
  onSaveModel,
  onExportModel,
  onImportModel
}) => {
  const [localParams, setLocalParams] = useState(params);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalParams(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleTimeframeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLocalParams(prev => ({ ...prev, timeframe: e.target.value as SimulationParams['timeframe'] }));
  };
  
  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setLocalParams(prev => ({ ...prev, [name]: checked }));
  };

  const handleApplyChanges = () => {
    setParams(prev => ({...localParams, resetToken: prev.resetToken + 1}));
  };

  const handleReset = () => {
    setParams(prev => ({...DEFAULT_SIMULATION_PARAMS, resetToken: prev.resetToken + 1}));
  };
  
  const handleStartTraining = () => {
    handleApplyChanges();
    setTimeout(() => {
      if (onStartTraining) onStartTraining();
    }, 100);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportModel) {
      onImportModel(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-6 shadow-2xl backdrop-blur-md border border-gray-700/50 space-y-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700/50">
        <h2 className="text-lg font-bold text-white flex items-center">
          <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
          System Controls
        </h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="timeframe" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            Timeframe: <span className="font-mono text-cyan-400 font-bold">{TIMEFRAME_OPTIONS.find(opt => opt.value === localParams.timeframe)?.label}</span>
          </label>
          <select
            id="timeframe"
            name="timeframe"
            value={localParams.timeframe}
            onChange={handleTimeframeChange}
            className="w-full bg-gradient-to-r from-gray-700 to-gray-800 text-white border border-gray-600/50 rounded-lg px-3 py-2.5 cursor-pointer hover:border-cyan-500/50 transition-all shadow-inner"
          >
            {TIMEFRAME_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="numObservers" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            Observers: <span className="font-mono text-cyan-400 font-bold">{localParams.numObservers}</span>
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
            className="w-full h-2 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 shadow-inner"
          />
        </div>

        <div>
          <label htmlFor="learningRate" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            Learning Rate (α): <span className="font-mono text-cyan-400 font-bold">{localParams.learningRate.toFixed(3)}</span>
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
            className="w-full h-2 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 shadow-inner"
          />
        </div>

        <div>
          <label htmlFor="mutationRate" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
            Mutation Rate: <span className="font-mono text-cyan-400 font-bold">{localParams.mutationRate.toFixed(3)}</span>
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
            className="w-full h-2 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 shadow-inner"
          />
        </div>
        
        {/* Training Mode Controls */}
        <div className="pt-4 border-t border-gray-700/50 space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="trainingMode" className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Training Mode
            </label>
            <input
              type="checkbox"
              id="trainingMode"
              name="trainingMode"
              checked={localParams.trainingMode}
              onChange={handleCheckboxChange}
              className="w-5 h-5 accent-cyan-500 cursor-pointer"
            />
          </div>
          
          {localParams.trainingMode && (
            <>
              <div>
                <label htmlFor="targetEpochs" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                  Target Epochs: <span className="font-mono text-cyan-400 font-bold">{localParams.targetEpochs}</span>
                </label>
                <input
                  type="range"
                  id="targetEpochs"
                  name="targetEpochs"
                  min="1"
                  max="20"
                  step="1"
                  value={localParams.targetEpochs}
                  onChange={handleSliderChange}
                  className="w-full h-2 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 shadow-inner"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label htmlFor="cycleTimeframes" className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Cycle Timeframes
                </label>
                <input
                  type="checkbox"
                  id="cycleTimeframes"
                  name="cycleTimeframes"
                  checked={localParams.cycleTimeframes}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 accent-cyan-500 cursor-pointer"
                />
              </div>
              
              {trainingState && trainingState.isTraining && (
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-3 rounded-lg border border-purple-500/30">
                  <div className="text-xs font-semibold text-purple-300 mb-1">Training Progress</div>
                  <div className="text-sm text-white font-mono">
                    Epoch {trainingState.currentEpoch + 1} / {trainingState.totalEpochs}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((trainingState.currentEpoch + 1) / trainingState.totalEpochs) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Model Management Buttons */}
      {(onSaveModel || onExportModel || onImportModel) && (
        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-700/50">
          {onSaveModel && (
            <button
              onClick={onSaveModel}
              disabled={isRunning || trainingState?.isTraining}
              className={`font-semibold py-2 px-3 rounded-lg transition-all duration-200 text-sm ${
                isRunning || trainingState?.isTraining
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-lg'
              }`}
            >
              💾 Save
            </button>
          )}
          {onExportModel && (
            <button
              onClick={onExportModel}
              disabled={isRunning || trainingState?.isTraining}
              className={`font-semibold py-2 px-3 rounded-lg transition-all duration-200 text-sm ${
                isRunning || trainingState?.isTraining
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg'
              }`}
            >
              📤 Export
            </button>
          )}
          {onImportModel && (
            <button
              onClick={handleImportClick}
              disabled={isRunning || trainingState?.isTraining}
              className={`font-semibold py-2 px-3 rounded-lg transition-all duration-200 text-sm ${
                isRunning || trainingState?.isTraining
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg'
              }`}
            >
              📁 Import
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700/50">
        {localParams.trainingMode ? (
          <button
            onClick={handleStartTraining}
            disabled={trainingState?.isTraining}
            className={`w-full font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg ${
              trainingState?.isTraining
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-purple-500/50'
            }`}
          >
            {trainingState?.isTraining ? '🔄 Training...' : '🎓 Start Training'}
          </button>
        ) : (
          <button
            onClick={() => setIsRunning(prev => !prev)}
            className={`w-full font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg ${
              isRunning
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-gray-900 shadow-yellow-500/50'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-green-500/50'
            }`}
          >
            {isRunning ? '⏸ Pause' : '▶ Start'}
          </button>
        )}
        {onLoadModel && (
          <button
            onClick={onLoadModel}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-purple-500/50"
          >
            📥 Load Model
          </button>
        )}
        <button
          onClick={handleApplyChanges}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/50"
        >
          🔄 Apply
        </button>
         <button
          onClick={handleReset}
          className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-red-500/50"
        >
          ⚡ Reset
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
