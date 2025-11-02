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
};

export const SIMULATION_SPEED_MS = 200; // Slower speed for better visualization of market steps
