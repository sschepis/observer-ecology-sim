import type { EcologyFeatures, MarketRegime } from '../types';
import { PRIMES } from '../constants';

/**
 * Extract trading features from the observer ecology's collective phase vector
 */

/**
 * Calculate volatility estimate from phase vector variance
 */
export const calculateVolatility = (
  phaseVector: { [prime: number]: number },
  recentPrices: number[]
): number => {
  // Calculate actual price volatility
  if (recentPrices.length < 2) return 0.02; // Default 2%
  
  const returns = [];
  for (let i = 1; i < recentPrices.length; i++) {
    returns.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
  }
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  return Math.max(0.01, Math.min(0.10, volatility)); // Clamp between 1% and 10%
};

/**
 * Calculate trend strength from phase alignment
 * High alignment = strong trend, low alignment = ranging
 */
export const calculateTrendStrength = (
  phaseVector: { [prime: number]: number }
): number => {
  // Calculate how aligned the phases are
  const phases = PRIMES.map(p => phaseVector[p] || 0);
  const mean = phases.reduce((sum, p) => sum + p, 0) / phases.length;
  
  // Calculate standard deviation - low std = aligned = strong trend
  const variance = phases.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / phases.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalize to 0-1, where 1 = strong trend (low variance)
  const maxStdDev = Math.sqrt(PRIMES.reduce((sum, p) => sum + p * p, 0) / PRIMES.length);
  const alignment = 1 - (stdDev / maxStdDev);
  
  return Math.max(0, Math.min(1, alignment));
};

/**
 * Calculate phase consensus - how much the observers agree
 */
export const calculatePhaseConsensus = (
  phaseVector: { [prime: number]: number }
): number => {
  // Calculate entropy of phase distribution
  const phases = PRIMES.map(p => phaseVector[p] || 0);
  const total = phases.reduce((sum, p) => sum + Math.abs(p), 0);
  
  if (total === 0) return 0;
  
  // Normalized phases
  const normalized = phases.map(p => Math.abs(p) / total);
  
  // Calculate entropy
  const entropy = -normalized.reduce((sum, p) => {
    if (p === 0) return sum;
    return sum + p * Math.log2(p);
  }, 0);
  
  // Normalize entropy to 0-1 (max entropy is log2(num_primes))
  const maxEntropy = Math.log2(PRIMES.length);
  const consensus = 1 - (entropy / maxEntropy);
  
  return Math.max(0, Math.min(1, consensus));
};

/**
 * Detect market regime based on trend strength and volatility
 */
export const detectMarketRegime = (
  trendStrength: number,
  volatility: number
): MarketRegime => {
  // High volatility = volatile market
  if (volatility > 0.05) {
    return 'volatile';
  }
  
  // Strong trend = trending market
  if (trendStrength > 0.6) {
    return 'trending';
  }
  
  // Otherwise ranging
  return 'ranging';
};

/**
 * Extract all ecology features from the current state
 */
export const extractEcologyFeatures = (
  predictedPrice: number,
  currentPrice: number,
  eliteReward: number,
  phaseVector: { [prime: number]: number },
  recentPrices: number[]
): EcologyFeatures => {
  const direction: 'UP' | 'DOWN' = predictedPrice > currentPrice ? 'UP' : 'DOWN';
  const confidence = eliteReward; // Elite observer's reward is confidence
  
  const volatilityEstimate = calculateVolatility(phaseVector, recentPrices);
  const trendStrength = calculateTrendStrength(phaseVector);
  const phaseConsensus = calculatePhaseConsensus(phaseVector);
  const marketRegime = detectMarketRegime(trendStrength, volatilityEstimate);
  
  return {
    pricePrediction: predictedPrice,
    direction,
    confidence,
    volatilityEstimate,
    trendStrength,
    marketRegime,
    phaseConsensus,
  };
};