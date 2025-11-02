import type { PrimeEmbedding } from '../types';
import { PRIMES } from '../constants';

/**
 * Calculates the Prime-Hilbert embedding for a given integer n.
 * Ψ(n) = {p → (ap(n), φp(n))}p∈P
 * @param n The integer to embed.
 * @param collectivePhase The collective phase for the guild at this prime.
 * @returns An array of embeddings for each prime.
 */
export const calculateEmbedding = (n: number, collectivePhaseVector: { [prime: number]: number }): PrimeEmbedding[] => {
  const intN = Math.round(n);
  return PRIMES.map(p => {
    const n_mod_p = intN % p;

    // ap(n) ∝ 1 - (n mod p / p)  -- Normalized for better visualization
    const amplitude = 1 - (n_mod_p / (p - 1));

    // φp(n) = 2π(n mod p + φp) / p
    const collectivePhase = collectivePhaseVector[p] || 0;
    const phase = (2 * Math.PI * (n_mod_p + collectivePhase)) / p;

    return {
      prime: p,
      amplitude,
      phase,
    };
  });
};

/**
 * Generates a random integer within a given range.
 * @param min The minimum value.
 * @param max The maximum value.
 * @returns A random integer.
 */
export const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};


/**
 * Calculates the reward for a prediction based on its error from the actual value.
 * The reward is higher for smaller errors, modeled by an exponential decay function.
 * @param prediction The observer's predicted price.
 * @param actual The actual price.
 * @returns A reward value between 0 and 1.
 */
export const calculateReward = (prediction: number, actual: number): { reward: number, error: number } => {
    const error = Math.abs(prediction - actual);
    // The scaling factor `k` determines how quickly the reward falls off.
    // A smaller `k` is more forgiving of larger errors.
    // Let's scale it based on the price magnitude.
    const k = 10 / actual; 
    const reward = Math.exp(-k * (error ** 2));
    
    return { reward, error };
};
