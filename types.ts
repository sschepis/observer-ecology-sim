export interface PrimeEmbedding {
  prime: number;
  amplitude: number;
  phase: number;
}

export interface TradingExperience {
  timestamp: number;
  marketState: {
    price: number;
    volatility: number;
    trend: number;
    regime: string;
  };
  action: 'BUY' | 'SELL' | 'HOLD';
  proposedSize: number;
  outcome: number; // P&L from this decision
  wasExecuted: boolean; // Whether this observer's advice was actually used
}

export interface Observer {
  id: number;
  n: number; // Represents the predicted price
  proposedAction: 'BUY' | 'SELL' | 'HOLD'; // RL: Each observer proposes an action
  proposedSize: number; // RL: Proposed position size (0-1 scale)
  reward: number; // Prediction-based reward
  tradingReward: number; // RL: Reward from trading outcomes
  embedding: PrimeEmbedding[];
  error: number; // Prediction error
  contributedToTrade: boolean; // RL: Track if this observer's advice was used
  lifetimeTradingPnL: number; // RL: Cumulative P&L from this observer's advice
  // Evolutionary Strategy with Memory
  experienceBuffer: TradingExperience[]; // Replay buffer of past trading decisions
  strategyGenes: {
    // Learned trading strategy parameters
    riskTolerance: number; // 0-1: How aggressive with position sizing
    trendFollowing: number; // 0-1: Prefer trending vs mean-reversion
    volatilityPreference: number; // 0-1: Prefer high vs low volatility
    holdingBias: number; // -1 to 1: Bias toward buying, selling, or holding
  };
  fitness: number; // Combined fitness score for evolution
}

export interface Guild {
  id: string;
  collectivePhaseVector: { [prime: number]: number };
  observers: Observer[];
  eliteN: number | null;
  eliteReward: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export interface SimulationParams {
  numObservers: number;
  learningRate: number; // α
  mutationRate: number;
  resetToken: number;
  timeframe: Timeframe;
  trainingMode: boolean; // Enable multi-epoch training
  cycleTimeframes: boolean; // Cycle through different timeframes each epoch
  targetEpochs: number; // Number of epochs to train
}

export interface EpochMetrics {
  epoch: number;
  timeframe: Timeframe;
  winRate: number;
  totalPnL: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  avgFitness: number;
  diversityScore: number;
  validationWinRate?: number;
  validationPnL?: number;
}

export interface TrainingState {
  currentEpoch: number;
  totalEpochs: number;
  epochsCompleted: number;
  timeframeIndex: number;
  isTraining: boolean;
  epochMetrics: EpochMetrics[];
  bestValidationEpoch: number;
  epochsWithoutImprovement: number;
  currentLearningRate: number;
}

export interface ModelCheckpoint {
  version: string;
  timestamp: number;
  observers: Observer[];
  trainingMetrics: EpochMetrics[];
  params: SimulationParams;
  totalEpochs: number;
}

export interface PredictionResult {
  predicted: 'UP' | 'DOWN';
  actual: 'UP' | 'DOWN';
  correct: boolean;
  priceChange: number;
}

export interface SimulationStats {
  timeStep: number;
  currentPrice: number;
  bestPrediction: number;
  predictionError: number;
  directionAccuracy: number; // Percentage of correct UP/DOWN predictions
  totalPredictions: number;
  correctPredictions: number;
  lastPrediction?: 'UP' | 'DOWN';
  lastActual?: 'UP' | 'DOWN';
  predictionHistory: PredictionResult[];
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type TradingAction = 'BUY' | 'SELL' | 'HOLD';
export type MarketRegime = 'trending' | 'ranging' | 'volatile';

export interface EcologyFeatures {
  pricePrediction: number;
  direction: 'UP' | 'DOWN';
  confidence: number; // Elite observer reward
  volatilityEstimate: number; // Based on phase vector variance
  trendStrength: number; // Phase alignment metric
  marketRegime: MarketRegime;
  phaseConsensus: number; // How aligned the phase vector is
}

export interface TradingSignal {
  action: TradingAction;
  confidence: number; // 0-1 based on prediction accuracy and consensus
  entryPrice: number;
  predictedDirection: 'UP' | 'DOWN';
  predictedPrice: number;
  timestamp: number;
  ecologyFeatures?: EcologyFeatures;
}

export interface Position {
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  entryTime: number;
  size: number; // Position size (e.g., 0.1 BTC)
  exitPrice?: number;
  exitTime?: number;
  pnl?: number; // Profit/Loss in USD
  pnlPercent?: number; // Profit/Loss in percentage
}

export interface TradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // Percentage
  totalPnL: number; // Total profit/loss
  currentPosition: Position | null;
  positionHistory: Position[];
  sharpeRatio?: number;
  maxDrawdown?: number;
}
