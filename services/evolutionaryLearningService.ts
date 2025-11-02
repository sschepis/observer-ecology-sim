import type { Observer, TradingExperience } from '../types';

/**
 * Evolutionary Strategy with Memory
 * Observers learn from trading history, not just prediction accuracy
 */

const MAX_EXPERIENCE_BUFFER = 500; // Keep last 500 experiences per observer (increased for better long-term learning)

/**
 * Record a trading experience in the observer's memory
 */
export const recordExperience = (
  observer: Observer,
  experience: TradingExperience
): Observer => {
  const updatedBuffer = [...observer.experienceBuffer, experience].slice(-MAX_EXPERIENCE_BUFFER);
  
  return {
    ...observer,
    experienceBuffer: updatedBuffer,
  };
};

/**
 * Calculate fitness based on trading experience
 * Combines prediction accuracy with trading profitability
 */
export const calculateFitness = (observer: Observer): number => {
  const predictionScore = observer.reward; // 0-1 based on prediction accuracy
  
  // Calculate trading performance from experience buffer
  let tradingScore = 0.5; // Default neutral score
  
  if (observer.experienceBuffer.length > 0) {
    const executedExperiences = observer.experienceBuffer.filter(exp => exp.wasExecuted);
    
    if (executedExperiences.length > 0) {
      // Calculate average outcome from executed trades
      const avgOutcome = executedExperiences.reduce((sum, exp) => sum + exp.outcome, 0) / executedExperiences.length;
      
      // Calculate win rate
      const wins = executedExperiences.filter(exp => exp.outcome > 0).length;
      const winRate = wins / executedExperiences.length;
      
      // Calculate consistency (Sharpe-like metric)
      const outcomes = executedExperiences.map(exp => exp.outcome);
      const stdDev = calculateStdDev(outcomes);
      const consistency = stdDev > 0 ? Math.min(1, avgOutcome / stdDev) : 0;
      
      // Combine metrics: 40% average outcome, 30% win rate, 30% consistency
      tradingScore = Math.max(0, Math.min(1, 
        0.5 + // Center around 0.5
        avgOutcome * 0.004 + // +/- 0.4 based on avg outcome (assuming -100 to +100)
        (winRate - 0.5) * 0.3 + // +/- 0.15 based on win rate
        consistency * 0.15 // +0.15 for consistency
      ));
    }
  }
  
  // Lifetime P&L score (longer term signal)
  const lifetimeScore = Math.max(0, Math.min(1,
    0.5 + observer.lifetimeTradingPnL / 2000 // Normalize around $2000
  ));
  
  // Combined fitness: 30% prediction, 50% recent trading, 20% lifetime
  const fitness = predictionScore * 0.3 + tradingScore * 0.5 + lifetimeScore * 0.2;
  
  return fitness;
};

/**
 * Helper: Calculate standard deviation
 */
const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
};

/**
 * Evolve observer based on elite's successful strategies
 * Observers inherit successful trading patterns, not just predictions
 */
export const evolveObserver = (
  observer: Observer,
  elite: Observer,
  eliteFitness: number,
  learningRate: number
): Observer => {
  const observerFitness = calculateFitness(observer);
  
  // Don't evolve if observer is already better than elite
  if (observerFitness >= eliteFitness) {
    return observer;
  }
  
  // Calculate how much to evolve toward elite based on fitness gap
  const fitnessGap = eliteFitness - observerFitness;
  const evolutionStrength = Math.min(1, fitnessGap * 2) * learningRate;
  
  // Evolve strategy genes toward elite's successful genes
  const evolvedGenes = {
    riskTolerance: observer.strategyGenes.riskTolerance + 
      (elite.strategyGenes.riskTolerance - observer.strategyGenes.riskTolerance) * evolutionStrength,
    
    trendFollowing: observer.strategyGenes.trendFollowing + 
      (elite.strategyGenes.trendFollowing - observer.strategyGenes.trendFollowing) * evolutionStrength,
    
    volatilityPreference: observer.strategyGenes.volatilityPreference + 
      (elite.strategyGenes.volatilityPreference - observer.strategyGenes.volatilityPreference) * evolutionStrength,
    
    holdingBias: observer.strategyGenes.holdingBias + 
      (elite.strategyGenes.holdingBias - observer.strategyGenes.holdingBias) * evolutionStrength,
  };
  
  return {
    ...observer,
    strategyGenes: evolvedGenes,
    fitness: observerFitness,
  };
};

/**
 * Mutate observer's strategy genes for exploration
 * Allows discovery of new successful patterns
 */
export const mutateStrategyGenes = (
  observer: Observer,
  mutationRate: number,
  mutationStrength: number = 0.1
): Observer => {
  if (Math.random() > mutationRate) {
    return observer;
  }
  
  const mutatedGenes = { ...observer.strategyGenes };
  
  // Randomly mutate one or more genes
  if (Math.random() < 0.5) {
    mutatedGenes.riskTolerance = Math.max(0, Math.min(1,
      mutatedGenes.riskTolerance + (Math.random() - 0.5) * mutationStrength
    ));
  }
  
  if (Math.random() < 0.5) {
    mutatedGenes.trendFollowing = Math.max(0, Math.min(1,
      mutatedGenes.trendFollowing + (Math.random() - 0.5) * mutationStrength
    ));
  }
  
  if (Math.random() < 0.5) {
    mutatedGenes.volatilityPreference = Math.max(0, Math.min(1,
      mutatedGenes.volatilityPreference + (Math.random() - 0.5) * mutationStrength
    ));
  }
  
  if (Math.random() < 0.5) {
    mutatedGenes.holdingBias = Math.max(-1, Math.min(1,
      mutatedGenes.holdingBias + (Math.random() - 0.5) * mutationStrength * 2
    ));
  }
  
  return {
    ...observer,
    strategyGenes: mutatedGenes,
  };
};

/**
 * Generate trading action based on learned strategy genes
 * This replaces the hardcoded BUY/SELL/HOLD logic
 */
export const generateLearnedAction = (
  observer: Observer,
  currentPrice: number,
  marketState: {
    volatility: number;
    trend: number;
    regime: string;
  }
): { action: 'BUY' | 'SELL' | 'HOLD'; size: number } => {
  const { strategyGenes, n: predictedPrice } = observer;
  
  // Calculate base signal from prediction
  const priceDiff = (predictedPrice - currentPrice) / currentPrice;
  
  // Adjust signal based on trend following gene
  const trendAdjustment = marketState.trend * strategyGenes.trendFollowing;
  
  // Adjust for holding bias
  const adjustedSignal = priceDiff + trendAdjustment + strategyGenes.holdingBias * 0.01;
  
  // Determine action based on adjusted signal
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  
  // Thresholds based on volatility preference
  const actionThreshold = 0.01 * (1 - strategyGenes.volatilityPreference * 0.5);
  
  if (adjustedSignal > actionThreshold) {
    action = 'BUY';
  } else if (adjustedSignal < -actionThreshold) {
    action = 'SELL';
  }
  
  // Calculate position size based on risk tolerance and market conditions
  let size = strategyGenes.riskTolerance;
  
  // Reduce size in volatile markets if observer doesn't prefer volatility
  if (marketState.regime === 'volatile') {
    size *= (0.5 + strategyGenes.volatilityPreference * 0.5);
  }
  
  // Increase size in trending markets if observer is trend-following
  if (marketState.regime === 'trending') {
    size *= (0.8 + strategyGenes.trendFollowing * 0.4);
  }
  
  // Scale by signal strength
  size *= Math.min(1, Math.abs(adjustedSignal) * 10);
  
  // Ensure size is in valid range
  size = Math.max(0.1, Math.min(1.0, size));
  
  return { action, size };
};

/**
 * Select elite based on fitness (combines prediction + trading performance)
 */
export const selectEliteByFitness = (observers: Observer[]): Observer => {
  // Calculate fitness for all observers
  const observersWithFitness = observers.map(obs => ({
    ...obs,
    fitness: calculateFitness(obs),
  }));
  
  // Return observer with highest fitness
  return observersWithFitness.reduce((best, current) =>
    current.fitness > best.fitness ? current : best
  );
};

/**
 * Select top N elite observers as an ensemble
 * Provides more robust learning by avoiding over-reliance on single observer
 */
export const selectEliteEnsemble = (observers: Observer[], topN: number = 3): Observer[] => {
  // Calculate fitness for all observers
  const observersWithFitness = observers.map(obs => ({
    ...obs,
    fitness: calculateFitness(obs),
  }));
  
  // Sort by fitness descending and take top N
  return observersWithFitness
    .sort((a, b) => b.fitness - a.fitness)
    .slice(0, topN);
};

/**
 * Sample random experiences from buffer for replay learning
 * Prevents recency bias and learns from diverse past situations
 */
export const sampleExperiences = (
  observer: Observer,
  sampleSize: number = 10
): TradingExperience[] => {
  if (observer.experienceBuffer.length === 0) return [];
  
  const actualSampleSize = Math.min(sampleSize, observer.experienceBuffer.length);
  const sampled: TradingExperience[] = [];
  const indices = new Set<number>();
  
  // Random sampling without replacement
  while (indices.size < actualSampleSize) {
    const randomIndex = Math.floor(Math.random() * observer.experienceBuffer.length);
    if (!indices.has(randomIndex)) {
      indices.add(randomIndex);
      sampled.push(observer.experienceBuffer[randomIndex]);
    }
  }
  
  return sampled;
};

/**
 * Calculate fitness from sampled experiences (for replay learning)
 */
export const calculateFitnessFromSamples = (
  samples: TradingExperience[]
): number => {
  if (samples.length === 0) return 0.5;
  
  const executedSamples = samples.filter(exp => exp.wasExecuted);
  if (executedSamples.length === 0) return 0.5;
  
  // Calculate metrics from sampled experiences
  const avgOutcome = executedSamples.reduce((sum, exp) => sum + exp.outcome, 0) / executedSamples.length;
  const wins = executedSamples.filter(exp => exp.outcome > 0).length;
  const winRate = wins / executedSamples.length;
  
  // Normalize to 0-1 range
  const fitnessScore = Math.max(0, Math.min(1,
    0.5 + avgOutcome * 0.002 + (winRate - 0.5) * 0.3
  ));
  
  return fitnessScore;
};

/**
 * Calculate adaptive mutation rate based on recent performance
 * Higher mutation when performing poorly (explore more)
 * Lower mutation when performing well (exploit current strategy)
 */
export const calculateAdaptiveMutationRate = (
  observer: Observer,
  baseMutationRate: number,
  recentSteps: number = 20
): number => {
  if (observer.experienceBuffer.length < 5) {
    return baseMutationRate * 1.5; // High exploration when inexperienced
  }
  
  // Get recent experiences
  const recentExperiences = observer.experienceBuffer.slice(-recentSteps);
  const executedRecent = recentExperiences.filter(exp => exp.wasExecuted);
  
  if (executedRecent.length === 0) {
    return baseMutationRate;
  }
  
  // Calculate recent performance
  const recentAvgOutcome = executedRecent.reduce((sum, exp) => sum + exp.outcome, 0) / executedRecent.length;
  const recentWins = executedRecent.filter(exp => exp.outcome > 0).length;
  const recentWinRate = recentWins / executedRecent.length;
  
  // Adaptive scaling:
  // - Losing: increase mutation up to 3x (explore more)
  // - Winning: decrease mutation to 0.3x (exploit strategy)
  let mutationMultiplier = 1.0;
  
  if (recentWinRate < 0.4) {
    // Performing poorly - explore more
    mutationMultiplier = 1.5 + (0.4 - recentWinRate) * 3; // 1.5x to 3x
  } else if (recentWinRate > 0.6) {
    // Performing well - exploit more, explore less
    mutationMultiplier = 1.0 - (recentWinRate - 0.6) * 1.75; // 1.0x to 0.3x
  }
  
  // Also consider P&L magnitude
  if (recentAvgOutcome < -10) {
    mutationMultiplier *= 1.2; // Boost exploration if losing money
  } else if (recentAvgOutcome > 10) {
    mutationMultiplier *= 0.8; // Reduce exploration if making money
  }
  
  // Clamp to reasonable range
  mutationMultiplier = Math.max(0.3, Math.min(3.0, mutationMultiplier));
  
  return baseMutationRate * mutationMultiplier;
};