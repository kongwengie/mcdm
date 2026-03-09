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
    formula: 'p_{ij} = \\frac{x_{ij}}{\\sum_{i=1}^{m} x_{ij}}',
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
    formula: 'E_j = -k \\sum_{i=1}^{m} (p_{ij} \\ln p_{ij}), \\quad \\text{where } k = \\frac{1}{\\ln n}',
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
    formula: 'd_j = 1 - E_j, \\quad w_j = \\frac{d_j}{\\sum d_j}',
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
    formula: 'w_i = \\frac{1}{n} \\sum_{j=1}^{n} \\frac{a_{ij}}{\\sum_{k=1}^{n} a_{kj}}',
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
    formula: 'CI = \\frac{\\lambda_{\\max} - n}{n-1}, \\quad CR = \\frac{CI}{RI}',
    type: 'list',
    data: { 'λmax': lambdaMax, 'CI': ci, 'RI': ri, 'CR': cr, 'Status': cr < 0.1 ? 'Consistent' : 'Inconsistent' }
  });

  return { weights, steps };
}

export function calculateBWMWeights(criteria: Criterion[], bestId: string, worstId: string, bestToOthers: Record<string, number>, othersToWorst: Record<string, number>): { weights: Record<string, number>, steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  const weights: Record<string, number> = {};
  
  // Simplified heuristic for BWM weights
  let sum = 0;
  const tempWeights: Record<string, number> = {};
  
  criteria.forEach(c => {
    if (c.id === bestId) {
      tempWeights[c.id] = 1;
    } else if (c.id === worstId) {
      tempWeights[c.id] = 1 / (bestToOthers[worstId] || 9);
    } else {
      const w1 = 1 / (bestToOthers[c.id] || 1);
      const w2 = (tempWeights[worstId] || 0.1) * (othersToWorst[c.id] || 1);
      tempWeights[c.id] = (w1 + w2) / 2;
    }
    sum += tempWeights[c.id];
  });
  
  criteria.forEach(c => {
    weights[c.id] = tempWeights[c.id] / sum;
  });
  
  steps.push({
    title: 'BWM: Weight Calculation',
    description: 'Calculate weights based on Best-to-Others and Others-to-Worst vectors.',
    type: 'list',
    data: { 'Final Weights': weights }
  });
  
  return { weights, steps };
}

export function calculateStdDevWeights(criteria: Criterion[], alternatives: Alternative[]): { weights: Record<string, number>, steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  const weights: Record<string, number> = {};
  
  let sumStdDev = 0;
  const stdDevs: Record<string, number> = {};
  
  criteria.forEach(c => {
    const vals = alternatives.map(a => a.values[c.id] || 0);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    const stdDev = Math.sqrt(variance);
    stdDevs[c.id] = stdDev;
    sumStdDev += stdDev;
  });
  
  criteria.forEach(c => {
    weights[c.id] = sumStdDev > 0 ? stdDevs[c.id] / sumStdDev : 1 / criteria.length;
  });
  
  steps.push({
    title: 'Standard Deviation Weights',
    description: 'Calculate weights proportional to the standard deviation of each criterion.',
    formula: 'w_j = \\frac{\\sigma_j}{\\sum \\sigma_j}',
    type: 'list',
    data: { 'Standard Deviations': stdDevs, 'Final Weights': weights }
  });
  
  return { weights, steps };
}

export function calculateCRITICWeights(criteria: Criterion[], alternatives: Alternative[]): { weights: Record<string, number>, steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  const weights: Record<string, number> = {};
  
  // 1. Normalize matrix
  const normMatrix: Record<string, Record<string, number>> = {};
  criteria.forEach(c => {
    const vals = alternatives.map(a => a.values[c.id] || 0);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      const val = a.values[c.id] || 0;
      if (max === min) {
        normMatrix[a.id][c.id] = 1;
      } else {
        normMatrix[a.id][c.id] = c.type === 'benefit' ? (val - min) / (max - min) : (max - val) / (max - min);
      }
    });
  });
  
  // 2. Std Dev
  const stdDevs: Record<string, number> = {};
  criteria.forEach(c => {
    const vals = alternatives.map(a => normMatrix[a.id][c.id]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    stdDevs[c.id] = Math.sqrt(variance);
  });
  
  // 3. Correlation matrix
  const C: Record<string, number> = {};
  let sumC = 0;
  
  criteria.forEach((c1, i) => {
    let sum1MinusR = 0;
    criteria.forEach((c2, j) => {
      if (i !== j) {
        const vals1 = alternatives.map(a => normMatrix[a.id][c1.id]);
        const vals2 = alternatives.map(a => normMatrix[a.id][c2.id]);
        const mean1 = vals1.reduce((a, b) => a + b, 0) / vals1.length;
        const mean2 = vals2.reduce((a, b) => a + b, 0) / vals2.length;
        
        let num = 0;
        let den1 = 0;
        let den2 = 0;
        for (let k = 0; k < vals1.length; k++) {
          num += (vals1[k] - mean1) * (vals2[k] - mean2);
          den1 += Math.pow(vals1[k] - mean1, 2);
          den2 += Math.pow(vals2[k] - mean2, 2);
        }
        const r = (den1 === 0 || den2 === 0) ? 0 : num / Math.sqrt(den1 * den2);
        sum1MinusR += (1 - r);
      }
    });
    C[c1.id] = stdDevs[c1.id] * sum1MinusR;
    sumC += C[c1.id];
  });
  
  criteria.forEach(c => {
    weights[c.id] = sumC > 0 ? C[c.id] / sumC : 1 / criteria.length;
  });
  
  steps.push({
    title: 'CRITIC Weights',
    description: 'Calculate weights using standard deviation and correlation between criteria.',
    formula: 'C_j = \\sigma_j \\sum_{k=1}^{n} (1 - r_{jk}), \\quad w_j = \\frac{C_j}{\\sum C_j}',
    type: 'list',
    data: { 'Information Amount (C_j)': C, 'Final Weights': weights }
  });
  
  return { weights, steps };
}

export function calculateAHPEntropyWeights(criteria: Criterion[], alternatives: Alternative[], pairwiseMatrix: number[][]): { weights: Record<string, number>, steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  
  const ahpRes = calculateAHPWeights(criteria, pairwiseMatrix);
  const entropyRes = calculateEntropyWeights(criteria, alternatives);
  
  steps.push(...ahpRes.steps);
  steps.push(...entropyRes.steps);
  
  const weights: Record<string, number> = {};
  let sum = 0;
  
  criteria.forEach(c => {
    weights[c.id] = ahpRes.weights[c.id] * entropyRes.weights[c.id];
    sum += weights[c.id];
  });
  
  criteria.forEach(c => {
    weights[c.id] /= sum;
  });
  
  steps.push({
    title: 'AHP-Entropy Hybrid Weights',
    description: 'Combine AHP (subjective) and Entropy (objective) weights by multiplication and normalization.',
    formula: 'w_j = \\frac{w^{AHP}_j w^{Entropy}_j}{\\sum_{k=1}^{n} w^{AHP}_k w^{Entropy}_k}',
    type: 'list',
    data: { 'Final Weights': weights }
  });
  
  return { weights, steps };
}

export function calculatePlaceholderWeights(criteria: Criterion[], methodName: string): { weights: Record<string, number>, steps: CalculationStep[] } {
  const weights: Record<string, number> = {};
  criteria.forEach(c => {
    weights[c.id] = 1 / criteria.length;
  });
  
  return { 
    weights, 
    steps: [{
      title: `${methodName} Weights`,
      description: `This is a placeholder for ${methodName}. Equal weights are assigned.`,
      type: 'list',
      data: { 'Final Weights': weights }
    }] 
  };
}

