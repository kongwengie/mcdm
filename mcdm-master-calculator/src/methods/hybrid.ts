import { Criterion, Alternative, MCDMOutput, FuzzyAlternative } from '../types/mcdm';
import { calculateEntropyWeights, calculateAHPWeights } from './weights';
import { calculateTOPSIS, calculateVIKOR, calculateSAW, calculateELECTRE, calculatePROMETHEE } from './crisp';
import { calculateFuzzyTOPSIS, calculateFuzzyVIKOR, calculateFuzzyPROMETHEE } from './fuzzy';

/**
 * Entropy + TOPSIS
 */
export function calculateEntropyTOPSIS(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  // 1. Calculate Weights using Entropy
  const { weights, steps: weightSteps } = calculateEntropyWeights(criteria, alternatives);
  
  // 2. Apply weights to criteria
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  
  // 3. Run TOPSIS
  const topsisRes = calculateTOPSIS(weightedCriteria, alternatives);
  
  return {
    results: topsisRes.results,
    steps: [...weightSteps, ...topsisRes.steps]
  };
}

/**
 * Entropy + VIKOR
 */
export function calculateEntropyVIKOR(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const { weights, steps: weightSteps } = calculateEntropyWeights(criteria, alternatives);
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  const vikorRes = calculateVIKOR(weightedCriteria, alternatives);
  return {
    results: vikorRes.results,
    steps: [...weightSteps, ...vikorRes.steps]
  };
}

/**
 * AHP + TOPSIS
 */
export function calculateAHPTOPSIS(criteria: Criterion[], alternatives: Alternative[], pairwiseMatrix?: number[][]): MCDMOutput {
  // If no pairwise matrix provided, we use equal weights but show the step (or we could default to something)
  // For now, let's assume we have a way to get the pairwise matrix. 
  // If not provided, we'll generate a consistent one (all 1s) just to show the logic.
  const n = criteria.length;
  const matrix = pairwiseMatrix || Array(n).fill(0).map(() => Array(n).fill(1));
  
  const { weights, steps: weightSteps } = calculateAHPWeights(criteria, matrix);
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  const topsisRes = calculateTOPSIS(weightedCriteria, alternatives);
  
  return {
    results: topsisRes.results,
    steps: [...weightSteps, ...topsisRes.steps]
  };
}

/**
 * AHP + VIKOR
 */
export function calculateAHPVIKOR(criteria: Criterion[], alternatives: Alternative[], pairwiseMatrix?: number[][]): MCDMOutput {
  const n = criteria.length;
  const matrix = pairwiseMatrix || Array(n).fill(0).map(() => Array(n).fill(1));
  const { weights, steps: weightSteps } = calculateAHPWeights(criteria, matrix);
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  const vikorRes = calculateVIKOR(weightedCriteria, alternatives);
  return {
    results: vikorRes.results,
    steps: [...weightSteps, ...vikorRes.steps]
  };
}

/**
 * AHP + SAW
 */
export function calculateAHPSAW(criteria: Criterion[], alternatives: Alternative[], pairwiseMatrix?: number[][]): MCDMOutput {
  const n = criteria.length;
  const matrix = pairwiseMatrix || Array(n).fill(0).map(() => Array(n).fill(1));
  const { weights, steps: weightSteps } = calculateAHPWeights(criteria, matrix);
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  const sawRes = calculateSAW(weightedCriteria, alternatives);
  return {
    results: sawRes.results,
    steps: [...weightSteps, ...sawRes.steps]
  };
}

/**
 * AHP + ELECTRE
 */
export function calculateAHPELECTRE(criteria: Criterion[], alternatives: Alternative[], pairwiseMatrix?: number[][]): MCDMOutput {
  const n = criteria.length;
  const matrix = pairwiseMatrix || Array(n).fill(0).map(() => Array(n).fill(1));
  const { weights, steps: weightSteps } = calculateAHPWeights(criteria, matrix);
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  const electreRes = calculateELECTRE(weightedCriteria, alternatives);
  return {
    results: electreRes.results,
    steps: [...weightSteps, ...electreRes.steps]
  };
}

/**
 * Fuzzy AHP + Fuzzy TOPSIS
 */
export function calculateFuzzyAHPTOPSIS(criteria: Criterion[], alternatives: FuzzyAlternative[], pairwiseMatrix?: number[][]): MCDMOutput {
  const n = criteria.length;
  const matrix = pairwiseMatrix || Array(n).fill(0).map(() => Array(n).fill(1));
  const { weights, steps: weightSteps } = calculateAHPWeights(criteria, matrix);
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  const topsisRes = calculateFuzzyTOPSIS(weightedCriteria, alternatives);
  return {
    results: topsisRes.results,
    steps: [...weightSteps, ...topsisRes.steps]
  };
}

/**
 * Fuzzy AHP + Fuzzy VIKOR
 */
export function calculateFuzzyAHPVIKOR(criteria: Criterion[], alternatives: FuzzyAlternative[], pairwiseMatrix?: number[][]): MCDMOutput {
  const n = criteria.length;
  const matrix = pairwiseMatrix || Array(n).fill(0).map(() => Array(n).fill(1));
  const { weights, steps: weightSteps } = calculateAHPWeights(criteria, matrix);
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  const vikorRes = calculateFuzzyVIKOR(weightedCriteria, alternatives);
  return {
    results: vikorRes.results,
    steps: [...weightSteps, ...vikorRes.steps]
  };
}

/**
 * AHP + PROMETHEE
 */
export function calculateAHPPROMETHEE(criteria: Criterion[], alternatives: Alternative[], pairwiseMatrix?: number[][]): MCDMOutput {
  const n = criteria.length;
  const matrix = pairwiseMatrix || Array(n).fill(0).map(() => Array(n).fill(1));
  const { weights, steps: weightSteps } = calculateAHPWeights(criteria, matrix);
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  const prometheeRes = calculatePROMETHEE(weightedCriteria, alternatives);
  return {
    results: prometheeRes.results,
    steps: [...weightSteps, ...prometheeRes.steps]
  };
}

/**
 * Fuzzy AHP + Fuzzy PROMETHEE
 */
export function calculateFuzzyAHPPROMETHEE(criteria: Criterion[], alternatives: FuzzyAlternative[], pairwiseMatrix?: number[][]): MCDMOutput {
  const n = criteria.length;
  const matrix = pairwiseMatrix || Array(n).fill(0).map(() => Array(n).fill(1));
  const { weights, steps: weightSteps } = calculateAHPWeights(criteria, matrix);
  const weightedCriteria = criteria.map(c => ({ ...c, weight: weights[c.id] }));
  const prometheeRes = calculateFuzzyPROMETHEE(weightedCriteria, alternatives);
  return {
    results: prometheeRes.results,
    steps: [...weightSteps, ...prometheeRes.steps]
  };
}
