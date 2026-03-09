import { Criterion, Alternative, CalculationStep } from '../types/mcdm';

/**
 * Entropy Weighting Method (Objective)
 */
export function calculateEntropyWeights(criteria: Criterion[], alternatives: Alternative[]): { weights: Record<string, number>, steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  const n = alternatives.length;
  const m = criteria.length;
  const k = 1 / Math.log(n);

  // 1. Normalization
  const normMatrix: Record<string, Record<string, number>> = {};
  criteria.forEach(c => {
    const sum = alternatives.reduce((s, a) => s + a.values[c.id], 0);
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      normMatrix[a.id][c.id] = a.values[c.id] / (sum || 1);
    });
  });

  steps.push({
    title: 'Entropy: Normalization',
    description: 'Normalize the decision matrix to calculate probabilities.',
    formula: 'p_ij = x_ij / Σx_ij',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Entropy Calculation
  const entropies: Record<string, number> = {};
  criteria.forEach(c => {
    let e = 0;
    alternatives.forEach(a => {
      const p = normMatrix[a.id][c.id];
      if (p > 0) {
        e += p * Math.log(p);
      }
    });
    entropies[c.id] = -k * e;
  });

  steps.push({
    title: 'Entropy: Entropy Values (E_j)',
    description: 'Calculate entropy for each criterion.',
    formula: 'E_j = -k * Σ(p_ij * ln(p_ij)), where k = 1/ln(n)',
    type: 'list',
    data: { 'Entropy Values': entropies }
  });

  // 3. Diversification and Weights
  const d: Record<string, number> = {};
  let dSum = 0;
  criteria.forEach(c => {
    d[c.id] = 1 - entropies[c.id];
    dSum += d[c.id];
  });

  const weights: Record<string, number> = {};
  criteria.forEach(c => {
    weights[c.id] = d[c.id] / (dSum || 1);
  });

  steps.push({
    title: 'Entropy: Final Weights',
    description: 'Calculate degree of diversification and final weights.',
    formula: 'd_j = 1 - E_j, w_j = d_j / Σd_j',
    type: 'list',
    data: { 'Diversification (d_j)': d, 'Final Weights (w_j)': weights }
  });

  return { weights, steps };
}

/**
 * AHP Weighting (Simplified Pairwise Comparison)
 * For now, we'll implement a simple version where we can generate a consistent matrix or use user input.
 * Since we don't have a UI for pairwise yet, I'll provide a placeholder or a simple equal-weighting with steps.
 * Actually, let's implement the logic for a given pairwise matrix.
 */
export function calculateAHPWeights(criteria: Criterion[], pairwiseMatrix: number[][]): { weights: Record<string, number>, steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  const n = criteria.length;

  // 1. Column Sums
  const colSums = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += pairwiseMatrix[i][j];
    }
  }

  // 2. Normalization
  const normMatrix = pairwiseMatrix.map((row, i) => row.map((val, j) => val / colSums[j]));

  // 3. Row Averages (Weights)
  const weightsArr = normMatrix.map(row => row.reduce((a, b) => a + b, 0) / n);
  const weights: Record<string, number> = {};
  criteria.forEach((c, i) => {
    weights[c.id] = weightsArr[i];
  });

  steps.push({
    title: 'AHP: Normalized Pairwise Matrix',
    description: 'Normalize the pairwise comparison matrix by column sums.',
    formula: 'w_i = (1/n) * Σ(a_ij / Σa_kj)',
    type: 'matrix',
    data: Object.fromEntries(criteria.map((c, i) => [c.name, Object.fromEntries(criteria.map((c2, j) => [c2.name, normMatrix[i][j]]))]))
  });

  // 4. Consistency Check (Simplified)
  const lambdaMax = colSums.reduce((sum, colSum, j) => sum + colSum * weightsArr[j], 0);
  const ci = (lambdaMax - n) / (n - 1 || 1);
  const ri = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49][n] || 1.49;
  const cr = ci / ri;

  steps.push({
    title: 'AHP: Consistency Check',
    description: 'Check if the pairwise comparisons are consistent.',
    formula: 'CI = (λmax - n)/(n-1), CR = CI/RI',
    type: 'list',
    data: { 'λmax': lambdaMax, 'CI': ci, 'RI': ri, 'CR': cr, 'Status': cr < 0.1 ? 'Consistent' : 'Inconsistent' }
  });

  return { weights, steps };
}

/**
 * Best-Worst Method (BWM) Weighting (Simplified Heuristic)
 * Uses Best-to-Others and Others-to-Worst vectors.
 */
export function calculateBWMWeights(
  criteria: Criterion[], 
  bestId: string, 
  worstId: string, 
  bestToOthers: Record<string, number>, 
  othersToWorst: Record<string, number>
): { weights: Record<string, number>, steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  
  const w1: Record<string, number> = {};
  const w2: Record<string, number> = {};
  let sum1 = 0;
  let sum2 = 0;
  
  criteria.forEach(c => {
    const a_Bj = bestToOthers[c.id] || 1;
    const a_jW = othersToWorst[c.id] || 1;
    
    w1[c.id] = 1 / a_Bj;
    sum1 += w1[c.id];
    
    w2[c.id] = a_jW;
    sum2 += w2[c.id];
  });
  
  const weights: Record<string, number> = {};
  criteria.forEach(c => {
    w1[c.id] /= sum1;
    w2[c.id] /= sum2;
    weights[c.id] = (w1[c.id] + w2[c.id]) / 2;
  });
  
  steps.push({
    title: 'BWM: Weight Approximation',
    description: 'Calculate weights using heuristic approximation from Best and Worst vectors.',
    formula: 'w_j = ( (1/a_Bj)/Σ(1/a_Bk) + a_jW/Σ(a_kW) ) / 2',
    type: 'list',
    data: { 'Final Weights': weights }
  });
  
  return { weights, steps };
}
