import type { SimulationParams } from './types';

// First 30 prime numbers
export const PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41,
  43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113
];

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  numObservers: 50,
  learningRate: 0.05,
  mutationRate: 0.2, // Higher mutation for dynamic environment
  resetToken: 0,
  timeframe: '4h',
  trainingMode: false,
  cycleTimeframes: false,
  targetEpochs: 5,
};

// Timeframes for cycling during training (ordered by increasing time horizon)
export const TRAINING_TIMEFRAMES: Array<'1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d'> = [
  '15m', '1h', '4h', '1d'
];

export const TIMEFRAME_OPTIONS = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: '1 Day' },
] as const;

export const SIMULATION_SPEED_MS = 200; // Slower speed for better visualization of market steps
