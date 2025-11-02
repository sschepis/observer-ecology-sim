import type { Observer, EpochMetrics, ModelCheckpoint, SimulationParams, Timeframe } from '../types';
import { calculateFitness } from './evolutionaryLearningService';

/**
 * Professional Training Service
 * Implements:
 * - Model Persistence (save/load)
 * - Train/Validation Split
 * - Epoch Performance Tracking
 * - Early Stopping
 * - Learning Rate Scheduling
 * - Observer Diversity Maintenance
 */

const MODEL_STORAGE_KEY = 'observer_ecology_model_checkpoint';
const METRICS_STORAGE_KEY = 'observer_ecology_training_metrics';

// ========== MODEL PERSISTENCE ==========

/**
 * Save trained model to localStorage
 */
export const saveModel = (
  observers: Observer[],
  metrics: EpochMetrics[],
  params: SimulationParams,
  totalEpochs: number
): void => {
  const checkpoint: ModelCheckpoint = {
    version: '1.0',
    timestamp: Date.now(),
    observers,
    trainingMetrics: metrics,
    params,
    totalEpochs,
  };
  
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(checkpoint));
    console.log(`✅ Model saved: ${observers.length} observers, ${metrics.length} epochs`);
  } catch (error) {
    console.error('❌ Failed to save model:', error);
  }
};

/**
 * Load trained model from localStorage
 */
export const loadModel = (): ModelCheckpoint | null => {
  try {
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    if (!stored) return null;
    
    const checkpoint: ModelCheckpoint = JSON.parse(stored);
    console.log(`✅ Model loaded: ${checkpoint.observers.length} observers, trained for ${checkpoint.totalEpochs} epochs`);
    return checkpoint;
  } catch (error) {
    console.error('❌ Failed to load model:', error);
    return null;
  }
};

/**
 * Export model as downloadable JSON file
 */
export const exportModel = (checkpoint: ModelCheckpoint): void => {
  const blob = new Blob([JSON.stringify(checkpoint, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `observer-model-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Import model from JSON file
 */
export const importModel = (file: File): Promise<ModelCheckpoint> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const checkpoint: ModelCheckpoint = JSON.parse(e.target?.result as string);
        resolve(checkpoint);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// ========== TRAIN/VALIDATION SPLIT ==========

/**
 * Split data indices into training and validation sets
 */
export const createTrainValSplit = (
  dataLength: number,
  valSplitRatio: number = 0.2,
  startIndex: number = 60
): { trainIndices: number[]; valIndices: number[] } => {
  const totalSteps = dataLength - startIndex - 1;
  const valSize = Math.floor(totalSteps * valSplitRatio);
  const trainSize = totalSteps - valSize;
  
  const trainIndices: number[] = [];
  const valIndices: number[] = [];
  
  // Training: first 80% of data
  for (let i = startIndex; i < startIndex + trainSize; i++) {
    trainIndices.push(i);
  }
  
  // Validation: last 20% of data
  for (let i = startIndex + trainSize; i < dataLength - 1; i++) {
    valIndices.push(i);
  }
  
  return { trainIndices, valIndices };
};

// ========== EPOCH PERFORMANCE TRACKING ==========

/**
 * Calculate epoch metrics from trading stats and observers
 */
export const calculateEpochMetrics = (
  epoch: number,
  timeframe: Timeframe,
  observers: Observer[],
  totalTrades: number,
  winningTrades: number,
  losingTrades: number,
  totalPnL: number,
  sharpeRatio: number | undefined,
  maxDrawdown: number
): EpochMetrics => {
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  // Calculate average fitness across all observers
  const avgFitness = observers.reduce((sum, obs) => sum + calculateFitness(obs), 0) / observers.length;
  
  // Calculate diversity score (variance in strategy genes)
  const diversityScore = calculateObserverDiversity(observers);
  
  return {
    epoch,
    timeframe,
    winRate,
    totalPnL,
    sharpeRatio: sharpeRatio || 0,
    maxDrawdown,
    totalTrades,
    avgFitness,
    diversityScore,
  };
};

// ========== EARLY STOPPING ==========

/**
 * Check if training should stop early
 */
export const shouldStopEarly = (
  epochMetrics: EpochMetrics[],
  patience: number = 3,
  minEpochs: number = 3
): boolean => {
  if (epochMetrics.length < minEpochs) return false;
  
  // Get validation metrics
  const validationMetrics = epochMetrics.filter(m => m.validationWinRate !== undefined);
  if (validationMetrics.length < minEpochs) return false;
  
  // Find best validation performance
  const bestValWinRate = Math.max(...validationMetrics.map(m => m.validationWinRate || 0));
  const bestEpochIndex = validationMetrics.findIndex(m => m.validationWinRate === bestValWinRate);
  
  // Check if we haven't improved in 'patience' epochs
  const epochsSinceBest = validationMetrics.length - 1 - bestEpochIndex;
  
  if (epochsSinceBest >= patience) {
    console.log(`🛑 Early stopping triggered: No improvement for ${patience} epochs`);
    return true;
  }
  
  return false;
};

// ========== LEARNING RATE SCHEDULING ==========

/**
 * Calculate learning rate for current epoch using cosine annealing
 */
export const calculateLearningRate = (
  epoch: number,
  totalEpochs: number,
  initialLR: number,
  minLR: number = 0.001
): number => {
  // Cosine annealing: smooth decay from initialLR to minLR
  const cosineDecay = 0.5 * (1 + Math.cos((Math.PI * epoch) / totalEpochs));
  const lr = minLR + (initialLR - minLR) * cosineDecay;
  
  return lr;
};

/**
 * Step-based learning rate decay
 */
export const calculateStepLR = (
  epoch: number,
  initialLR: number,
  decayRate: number = 0.5,
  decayEpochs: number = 5
): number => {
  const decaySteps = Math.floor(epoch / decayEpochs);
  return initialLR * Math.pow(decayRate, decaySteps);
};

// ========== OBSERVER DIVERSITY MAINTENANCE ==========

/**
 * Calculate diversity score based on variance in strategy genes
 */
export const calculateObserverDiversity = (observers: Observer[]): number => {
  if (observers.length === 0) return 0;
  
  // Calculate variance for each strategy gene
  const genes = ['riskTolerance', 'trendFollowing', 'volatilityPreference', 'holdingBias'] as const;
  
  let totalVariance = 0;
  
  for (const gene of genes) {
    const values = observers.map(obs => obs.strategyGenes[gene]);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    totalVariance += variance;
  }
  
  // Normalize to 0-1 range (assuming max variance is 0.25 per gene)
  const diversityScore = Math.min(1, totalVariance / (genes.length * 0.25));
  
  return diversityScore;
};

/**
 * Enforce minimum diversity by perturbing similar observers
 */
export const maintainDiversity = (
  observers: Observer[],
  minDiversity: number = 0.3,
  perturbationStrength: number = 0.2
): Observer[] => {
  const currentDiversity = calculateObserverDiversity(observers);
  
  if (currentDiversity >= minDiversity) {
    return observers; // Diversity is acceptable
  }
  
  console.log(`⚠️ Low diversity (${currentDiversity.toFixed(2)}), adding perturbations`);
  
  // Perturb bottom 30% of observers to increase diversity
  const sortedByFitness = [...observers].sort((a, b) => 
    calculateFitness(b) - calculateFitness(a)
  );
  
  const numToPerturb = Math.floor(observers.length * 0.3);
  const toPerturbIds = new Set(sortedByFitness.slice(-numToPerturb).map(obs => obs.id));
  
  return observers.map(obs => {
    if (!toPerturbIds.has(obs.id)) return obs;
    
    // Randomly perturb strategy genes
    return {
      ...obs,
      strategyGenes: {
        riskTolerance: Math.max(0, Math.min(1,
          obs.strategyGenes.riskTolerance + (Math.random() - 0.5) * perturbationStrength
        )),
        trendFollowing: Math.max(0, Math.min(1,
          obs.strategyGenes.trendFollowing + (Math.random() - 0.5) * perturbationStrength
        )),
        volatilityPreference: Math.max(0, Math.min(1,
          obs.strategyGenes.volatilityPreference + (Math.random() - 0.5) * perturbationStrength
        )),
        holdingBias: Math.max(-1, Math.min(1,
          obs.strategyGenes.holdingBias + (Math.random() - 0.5) * perturbationStrength * 2
        )),
      },
    };
  });
};

// ========== LEARNING CURVES DATA ==========

/**
 * Prepare data for learning curves visualization
 */
export const prepareLearningCurvesData = (
  metrics: EpochMetrics[]
): {
  epochs: number[];
  trainWinRate: number[];
  valWinRate: number[];
  trainPnL: number[];
  valPnL: number[];
  avgFitness: number[];
  diversity: number[];
} => {
  return {
    epochs: metrics.map(m => m.epoch),
    trainWinRate: metrics.map(m => m.winRate),
    valWinRate: metrics.map(m => m.validationWinRate || 0),
    trainPnL: metrics.map(m => m.totalPnL),
    valPnL: metrics.map(m => m.validationPnL || 0),
    avgFitness: metrics.map(m => m.avgFitness),
    diversity: metrics.map(m => m.diversityScore),
  };
};

// ========== HYPERPARAMETER SUGGESTIONS ==========

/**
 * Suggest optimal hyperparameters based on current performance
 */
export const suggestHyperparameters = (
  metrics: EpochMetrics[]
): {
  learningRate?: number;
  mutationRate?: number;
  suggestion: string;
} => {
  if (metrics.length < 3) {
    return { suggestion: 'Need at least 3 epochs to suggest hyperparameters' };
  }
  
  const recentMetrics = metrics.slice(-3);
  const avgWinRate = recentMetrics.reduce((sum, m) => sum + m.winRate, 0) / recentMetrics.length;
  const avgDiversity = recentMetrics.reduce((sum, m) => sum + m.diversityScore, 0) / recentMetrics.length;
  
  let learningRate: number | undefined;
  let mutationRate: number | undefined;
  let suggestion = '';
  
  // Low win rate + low diversity = increase exploration
  if (avgWinRate < 45 && avgDiversity < 0.4) {
    mutationRate = 0.3;
    learningRate = 0.08;
    suggestion = 'Low performance & diversity detected. Increase exploration (higher mutation & learning rate)';
  }
  // High win rate + low diversity = risk of overfitting
  else if (avgWinRate > 60 && avgDiversity < 0.3) {
    mutationRate = 0.25;
    suggestion = 'High performance but low diversity. Increase mutation to prevent overfitting';
  }
  // Low win rate + high diversity = reduce exploration, focus on exploitation
  else if (avgWinRate < 45 && avgDiversity > 0.6) {
    mutationRate = 0.1;
    learningRate = 0.03;
    suggestion = 'Excessive exploration detected. Reduce mutation & learning rate for exploitation';
  }
  // Good balance
  else {
    suggestion = 'Current hyperparameters appear well-balanced';
  }
  
  return { learningRate, mutationRate, suggestion };
};