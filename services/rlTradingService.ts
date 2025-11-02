import type { Observer, Position } from '../types';

/**
 * Reinforcement Learning based trading service
 * Observers learn from trading outcomes, not just prediction accuracy
 */

/**
 * Calculate which observers contributed to a successful/failed trade
 * This implements credit assignment for multi-agent RL
 */
export const assignTradingCredit = (
  observers: Observer[],
  tradedAction: 'BUY' | 'SELL' | 'HOLD',
  tradeResult: Position | null
): Observer[] => {
  if (!tradeResult || tradedAction === 'HOLD') {
    // No trade, no credit
    return observers.map(obs => ({
      ...obs,
      contributedToTrade: false,
      tradingReward: 0,
    }));
  }
  
  const tradePnL = tradeResult.pnl || 0;
  const tradePnLPercent = tradeResult.pnlPercent || 0;
  
  return observers.map(obs => {
    // Check if this observer proposed the action that was taken
    const contributedToTrade = obs.proposedAction === tradedAction;
    
    if (!contributedToTrade) {
      return {
        ...obs,
        contributedToTrade: false,
        tradingReward: 0,
      };
    }
    
    // Calculate trading reward based on:
    // 1. Did they propose the right action? (contributedToTrade)
    // 2. How profitable was it? (tradePnL)
    // 3. How much risk did they suggest? (proposedSize)
    
    // Reward is scaled by proposed size (bigger bets = bigger rewards/penalties)
    const sizeAdjustedPnL = tradePnLPercent * obs.proposedSize;
    
    // Normalize to 0-1 range (sigmoid-like function)
    const tradingReward = 1 / (1 + Math.exp(-sizeAdjustedPnL * 10));
    
    return {
      ...obs,
      contributedToTrade: true,
      tradingReward,
      lifetimeTradingPnL: obs.lifetimeTradingPnL + tradePnL * obs.proposedSize,
    };
  });
};

/**
 * Select elite observer based on trading performance, not just prediction
 * This implements the RL policy: which observer gives best trading advice?
 */
export const selectTradingElite = (observers: Observer[]): Observer => {
  // Weight recent trading performance heavily
  const scoredObservers = observers.map(obs => {
    // Combine prediction accuracy with trading success
    const predictionScore = obs.reward; // 0-1 based on prediction
    const tradingScore = obs.tradingReward; // 0-1 based on trade outcome
    
    // Lifetime P&L provides long-term signal
    const lifetimeScore = Math.max(0, Math.min(1, 
      0.5 + obs.lifetimeTradingPnL / 1000 // Normalize around $1000
    ));
    
    // Combined score: 40% prediction, 40% recent trade, 20% lifetime
    const combinedScore = 
      predictionScore * 0.4 + 
      tradingScore * 0.4 + 
      lifetimeScore * 0.2;
    
    return { ...obs, combinedScore };
  });
  
  // Return observer with highest combined score
  return scoredObservers.reduce((best, current) => 
    (current.combinedScore || 0) > (best.combinedScore || 0) ? current : best
  );
};

/**
 * Determine consensus action from the ecology
 * Uses voting weighted by trading performance
 */
export const getConsensusAction = (
  observers: Observer[]
): { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number } => {
  // Weight each vote by the observer's lifetime trading performance
  const weights = observers.map(obs => {
    const baseWeight = 1.0;
    const tradingBonus = Math.max(0, obs.lifetimeTradingPnL / 100); // +0.01 weight per $100 profit
    return baseWeight + tradingBonus;
  });
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  // Tally weighted votes
  let buyVotes = 0;
  let sellVotes = 0;
  let holdVotes = 0;
  
  observers.forEach((obs, i) => {
    const weight = weights[i] / totalWeight;
    if (obs.proposedAction === 'BUY') buyVotes += weight;
    else if (obs.proposedAction === 'SELL') sellVotes += weight;
    else holdVotes += weight;
  });
  
  // Determine winner
  const maxVotes = Math.max(buyVotes, sellVotes, holdVotes);
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  if (buyVotes === maxVotes) action = 'BUY';
  else if (sellVotes === maxVotes) action = 'SELL';
  
  // Confidence is how unanimous the vote was
  const confidence = maxVotes;
  
  return { action, confidence };
};

/**
 * Calculate optimal position size based on successful observers
 * Kelly Criterion-inspired sizing based on win rate and average win/loss
 */
export const calculateOptimalSize = (
  observers: Observer[],
  baseSize: number
): number => {
  // Filter to observers with positive lifetime P&L
  const profitableObservers = observers.filter(obs => obs.lifetimeTradingPnL > 0);
  
  if (profitableObservers.length === 0) {
    return baseSize * 0.5; // Conservative if no profitable observers
  }
  
  // Average suggested size from profitable observers
  const avgSize = profitableObservers.reduce((sum, obs) => 
    sum + obs.proposedSize, 0
  ) / profitableObservers.length;
  
  // Scale base size by average suggestion
  return baseSize * avgSize;
};