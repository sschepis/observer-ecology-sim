export interface PrimeEmbedding {
  prime: number;
  amplitude: number;
  phase: number;
}

export interface Observer {
  id: number;
  n: number; // Represents the predicted price
  reward: number;
  embedding: PrimeEmbedding[];
  error: number; // Prediction error
}

export interface Guild {
  id: string;
  collectivePhaseVector: { [prime: number]: number };
  observers: Observer[];
  eliteN: number | null;
  eliteReward: number;
}

export interface SimulationParams {
  numObservers: number;
  learningRate: number; // α
  mutationRate: number;
  resetToken: number;
}

export interface SimulationStats {
  timeStep: number;
  currentPrice: number;
  bestPrediction: number;
  predictionError: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
