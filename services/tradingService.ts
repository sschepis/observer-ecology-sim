import type { TradingSignal, TradingAction, Position, TradingStats, EcologyFeatures } from '../types';

/**
 * Enhanced trading bot with adaptive risk management using ecology features
 */

interface TradingConfig {
  minConfidence: number; // Minimum prediction accuracy to trade
  basePositionSize: number; // Base size of each position in BTC
  minStopLoss: number; // Minimum stop loss percentage
  maxStopLoss: number; // Maximum stop loss percentage
  rewardRiskRatio: number; // Take profit / stop loss ratio
  useAdaptiveRisk: boolean; // Enable adaptive risk management
}

const DEFAULT_CONFIG: TradingConfig = {
  minConfidence: 0.60, // Only trade when 60%+ accurate
  basePositionSize: 0.01, // 0.01 BTC base position
  minStopLoss: 1.0, // 1% minimum stop loss
  maxStopLoss: 5.0, // 5% maximum stop loss
  rewardRiskRatio: 2.5, // 2.5:1 reward/risk ratio
  useAdaptiveRisk: true, // Use adaptive risk management
};

/**
 * Calculate adaptive stop loss based on volatility and market regime
 */
const calculateAdaptiveStopLoss = (
  volatility: number,
  marketRegime: string,
  config: TradingConfig
): number => {
  // Base stop loss on volatility (1.5x to 3x volatility)
  let stopLoss = volatility * 200; // Convert to percentage and scale
  
  // Adjust based on market regime
  if (marketRegime === 'volatile') {
    stopLoss *= 1.5; // Wider stops in volatile markets
  } else if (marketRegime === 'ranging') {
    stopLoss *= 0.8; // Tighter stops in ranging markets
  }
  
  // Clamp between min and max
  return Math.max(config.minStopLoss, Math.min(config.maxStopLoss, stopLoss));
};

/**
 * Calculate position size based on confidence, trend strength, and consensus
 */
const calculateAdaptivePositionSize = (
  ecologyFeatures: EcologyFeatures,
  config: TradingConfig
): number => {
  const { confidence, trendStrength, phaseConsensus, marketRegime } = ecologyFeatures;
  
  // Base size from config
  let size = config.basePositionSize;
  
  // Scale by confidence (0.5x to 1.5x)
  const confidenceMultiplier = 0.5 + confidence;
  size *= confidenceMultiplier;
  
  // Scale by trend strength in trending markets
  if (marketRegime === 'trending') {
    size *= (0.8 + trendStrength * 0.4); // 0.8x to 1.2x
  }
  
  // Scale by phase consensus (higher consensus = higher size)
  size *= (0.7 + phaseConsensus * 0.6); // 0.7x to 1.3x
  
  // Reduce size in volatile markets
  if (marketRegime === 'volatile') {
    size *= 0.6;
  }
  
  return size;
};

/**
 * Generate an enhanced trading signal using ecology features
 */
export const generateTradingSignal = (
  predictedPrice: number,
  currentPrice: number,
  directionAccuracy: number,
  lastPrediction: 'UP' | 'DOWN',
  timestamp: number,
  ecologyFeatures?: EcologyFeatures,
  config: TradingConfig = DEFAULT_CONFIG
): TradingSignal => {
  const confidence = directionAccuracy / 100; // Convert percentage to 0-1
  
  // Determine action based on confidence and direction
  let action: TradingAction = 'HOLD';
  
  // Enhanced decision making with ecology features
  if (ecologyFeatures) {
    const { marketRegime, phaseConsensus, trendStrength } = ecologyFeatures;
    
    // Higher confidence threshold for volatile markets
    let effectiveMinConfidence = config.minConfidence;
    if (marketRegime === 'volatile') {
      effectiveMinConfidence += 0.1; // Require 70%+ in volatile markets
    }
    
    // Require stronger phase consensus in ranging markets
    const requiresConsensus = marketRegime === 'ranging' && phaseConsensus < 0.5;
    
    if (confidence >= effectiveMinConfidence && !requiresConsensus) {
      if (lastPrediction === 'UP') {
        action = 'BUY';
      } else if (lastPrediction === 'DOWN') {
        action = 'SELL';
      }
    }
  } else {
    // Fallback to simple confidence-based decision
    if (confidence >= config.minConfidence) {
      if (lastPrediction === 'UP') {
        action = 'BUY';
      } else if (lastPrediction === 'DOWN') {
        action = 'SELL';
      }
    }
  }
  
  return {
    action,
    confidence,
    entryPrice: currentPrice,
    predictedDirection: lastPrediction,
    predictedPrice,
    timestamp,
    ecologyFeatures,
  };
};

/**
 * Execute a trading signal and manage positions
 */
export const executeTradingSignal = (
  signal: TradingSignal,
  currentPosition: Position | null,
  currentPrice: number,
  timestamp: number,
  config: TradingConfig = DEFAULT_CONFIG
): { newPosition: Position | null; closedPosition: Position | null } => {
  let newPosition: Position | null = currentPosition;
  let closedPosition: Position | null = null;
  
  // Calculate adaptive stops if ecology features are available
  const stopLossPercent = signal.ecologyFeatures && config.useAdaptiveRisk
    ? calculateAdaptiveStopLoss(
        signal.ecologyFeatures.volatilityEstimate,
        signal.ecologyFeatures.marketRegime,
        config
      )
    : config.minStopLoss;
  
  const takeProfitPercent = stopLossPercent * config.rewardRiskRatio;
  
  // If we have a position, check if we should close it
  if (currentPosition && !currentPosition.exitPrice) {
    const pnlPercent = currentPosition.type === 'LONG'
      ? ((currentPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100
      : ((currentPosition.entryPrice - currentPrice) / currentPosition.entryPrice) * 100;
    
    const shouldClose =
      pnlPercent <= -stopLossPercent || // Hit stop loss
      pnlPercent >= takeProfitPercent || // Hit take profit
      (signal.action === 'BUY' && currentPosition.type === 'SHORT') || // Reverse signal
      (signal.action === 'SELL' && currentPosition.type === 'LONG'); // Reverse signal
    
    if (shouldClose) {
      const pnl = currentPosition.type === 'LONG'
        ? (currentPrice - currentPosition.entryPrice) * currentPosition.size
        : (currentPosition.entryPrice - currentPrice) * currentPosition.size;
      
      closedPosition = {
        ...currentPosition,
        exitPrice: currentPrice,
        exitTime: timestamp,
        pnl,
        pnlPercent,
      };
      newPosition = null;
    }
  }
  
  // Open new position if signal is strong and we don't have one
  if (!newPosition && signal.action !== 'HOLD' && signal.confidence >= config.minConfidence) {
    // Calculate adaptive position size
    const positionSize = signal.ecologyFeatures && config.useAdaptiveRisk
      ? calculateAdaptivePositionSize(signal.ecologyFeatures, config)
      : config.basePositionSize;
    
    newPosition = {
      type: signal.action === 'BUY' ? 'LONG' : 'SHORT',
      entryPrice: currentPrice,
      entryTime: timestamp,
      size: positionSize,
    };
  }
  
  return { newPosition, closedPosition };
};

/**
 * Calculate trading statistics
 */
export const calculateTradingStats = (
  currentPosition: Position | null,
  positionHistory: Position[]
): TradingStats => {
  const closedPositions = positionHistory.filter(p => p.pnl !== undefined);
  const totalTrades = closedPositions.length;
  const winningTrades = closedPositions.filter(p => p.pnl! > 0).length;
  const losingTrades = closedPositions.filter(p => p.pnl! <= 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalPnL = closedPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  
  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let runningPnL = 0;
  
  for (const position of closedPositions) {
    runningPnL += position.pnl || 0;
    if (runningPnL > peak) {
      peak = runningPnL;
    }
    const drawdown = ((peak - runningPnL) / Math.max(peak, 1)) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // Calculate Sharpe Ratio (simplified - assuming risk-free rate of 0)
  let sharpeRatio: number | undefined;
  if (closedPositions.length > 1) {
    const returns = closedPositions.map(p => (p.pnl || 0) / p.entryPrice);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0;
  }
  
  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    totalPnL,
    currentPosition,
    positionHistory,
    sharpeRatio,
    maxDrawdown,
  };
};