import { Criterion, Alternative, MCDMResult, MCDMOutput, CalculationStep } from '../types/mcdm';

/**
 * Simple Additive Weighting (SAW)
 */
export function calculateSAW(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const normalizedMatrix: Record<string, Record<string, number>> = {};

  // 1. Normalization
  criteria.forEach(c => {
    const values = alternatives.map(a => a.values[c.id]);
    const max = Math.max(...values);
    const min = Math.min(...values);

    alternatives.forEach(a => {
      if (!normalizedMatrix[a.id]) normalizedMatrix[a.id] = {};
      if (c.type === 'benefit') {
        normalizedMatrix[a.id][c.id] = max === 0 ? 0 : a.values[c.id] / max;
      } else {
        normalizedMatrix[a.id][c.id] = a.values[c.id] === 0 ? 1 : min / a.values[c.id];
      }
    });
  });

  steps.push({
    title: 'Normalization Matrix',
    description: 'Values are normalized based on Benefit (x/max) or Cost (min/x) criteria.',
    formula: 'Benefit: r_ij = x_ij / max(x_j) | Cost: r_ij = min(x_j) / x_ij',
    type: 'matrix',
    data: normalizedMatrix
  });

  // 2. Calculate scores
  const results: MCDMResult[] = alternatives.map(a => {
    let score = 0;
    criteria.forEach(c => {
      score += normalizedMatrix[a.id][c.id] * c.weight;
    });
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  steps.push({
    title: 'Final Score Calculation',
    description: 'Calculate the total score for each alternative by summing the weighted normalized values.',
    formula: 'S_i = w_1 * r_i1 + w_2 * r_i2 + ... + w_n * r_in',
    type: 'list',
    data: Object.fromEntries(results.map(r => [r.name, { score: r.score }]))
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * TOPSIS
 */
export function calculateTOPSIS(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  
  // 1. Vector Normalization
  const normMatrix: Record<string, Record<string, number>> = {};
  criteria.forEach(c => {
    const sumSq = Math.sqrt(alternatives.reduce((sum, a) => sum + Math.pow(a.values[c.id], 2), 0));
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      normMatrix[a.id][c.id] = sumSq === 0 ? 0 : (a.values[c.id] / sumSq) * c.weight;
    });
  });

  steps.push({
    title: 'Weighted Normalized Matrix',
    description: 'Vector normalization applied and multiplied by criteria weights.',
    formula: 'v_ij = w_j * (x_ij / √Σx_ij²)',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Ideal and Anti-Ideal
  const ideal: Record<string, number> = {};
  const antiIdeal: Record<string, number> = {};

  criteria.forEach(c => {
    const values = alternatives.map(a => normMatrix[a.id][c.id]);
    if (c.type === 'benefit') {
      ideal[c.id] = Math.max(...values);
      antiIdeal[c.id] = Math.min(...values);
    } else {
      ideal[c.id] = Math.min(...values);
      antiIdeal[c.id] = Math.max(...values);
    }
  });

  steps.push({
    title: 'Ideal & Anti-Ideal Solutions',
    description: 'PIS (Positive Ideal Solution) and NIS (Negative Ideal Solution) identified.',
    formula: 'V+ = {max(v_ij) if benefit, min(v_ij) if cost} | V- = {min(v_ij) if benefit, max(v_ij) if cost}',
    type: 'list',
    data: { ideal, antiIdeal }
  });

  // 3. Distances and Relative Closeness
  const results: MCDMResult[] = alternatives.map(a => {
    let dPlus = 0;
    let dMinus = 0;
    criteria.forEach(c => {
      dPlus += Math.pow(normMatrix[a.id][c.id] - ideal[c.id], 2);
      dMinus += Math.pow(normMatrix[a.id][c.id] - antiIdeal[c.id], 2);
    });
    dPlus = Math.sqrt(dPlus);
    dMinus = Math.sqrt(dMinus);

    const score = (dPlus + dMinus) === 0 ? 0.5 : dMinus / (dPlus + dMinus);
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  steps.push({
    title: 'Final Score Calculation',
    description: 'Calculate the relative closeness of each alternative to the ideal solution.',
    formula: 'C_i = d_i- / (d_i+ + d_i-)',
    type: 'list',
    data: Object.fromEntries(ranked.map(r => [r.name, { score: r.score }]))
  });
  return { results: ranked, steps };
}

/**
 * VIKOR Method
 */
export function calculateVIKOR(criteria: Criterion[], alternatives: Alternative[], v: number = 0.5): MCDMOutput {
  const steps: CalculationStep[] = [];
  const fStar: Record<string, number> = {};
  const fMinus: Record<string, number> = {};

  criteria.forEach(c => {
    const values = alternatives.map(a => a.values[c.id]);
    if (c.type === 'benefit') {
      fStar[c.id] = Math.max(...values);
      fMinus[c.id] = Math.min(...values);
    } else {
      fStar[c.id] = Math.min(...values);
      fMinus[c.id] = Math.max(...values);
    }
  });

  const S: Record<string, number> = {};
  const R: Record<string, number> = {};

  alternatives.forEach(a => {
    let sVal = 0;
    let rVal = 0;
    criteria.forEach(c => {
      const range = fStar[c.id] - fMinus[c.id];
      const val = range === 0 ? 0 : c.weight * (fStar[c.id] - a.values[c.id]) / range;
      sVal += val;
      rVal = Math.max(rVal, val);
    });
    S[a.id] = sVal;
    R[a.id] = rVal;
  });

  steps.push({
    title: 'S and R values',
    description: 'S (Utility measure) and R (Regret measure) calculated for each alternative.',
    formula: 'S_i = Σ w_j * (f*_j - f_ij) / (f*_j - f-_j) | R_i = max [w_j * (f*_j - f_ij) / (f*_j - f-_j)]',
    type: 'list',
    data: { S, R }
  });

  const sStar = Math.min(...Object.values(S));
  const sMinus = Math.max(...Object.values(S));
  const rStar = Math.min(...Object.values(R));
  const rMinus = Math.max(...Object.values(R));

  const results: MCDMResult[] = alternatives.map(a => {
    const sRange = sMinus - sStar;
    const rRange = rMinus - rStar;
    const qVal = v * (sRange === 0 ? 0 : (S[a.id] - sStar) / sRange) + 
                 (1 - v) * (rRange === 0 ? 0 : (R[a.id] - rStar) / rRange);
    return {
      alternativeId: a.id,
      name: a.name,
      score: 1 - qVal, // Inverting for UI consistency (higher is better)
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * MOORA Method
 */
export function calculateMOORA(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const normMatrix: Record<string, Record<string, number>> = {};

  // 1. Normalization
  criteria.forEach(c => {
    const sumSq = Math.sqrt(alternatives.reduce((sum, a) => sum + Math.pow(a.values[c.id], 2), 0));
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      normMatrix[a.id][c.id] = sumSq === 0 ? 0 : a.values[c.id] / sumSq;
    });
  });

  steps.push({
    title: 'Normalized Matrix',
    description: 'Ratio-based normalization applied.',
    formula: 'x*_ij = x_ij / √Σx_ij²',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Assessment
  const results: MCDMResult[] = alternatives.map(a => {
    let score = 0;
    criteria.forEach(c => {
      if (c.type === 'benefit') {
        score += normMatrix[a.id][c.id] * c.weight;
      } else {
        score -= normMatrix[a.id][c.id] * c.weight;
      }
    });
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * COPRAS Method
 */
export function calculateCOPRAS(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const normMatrix: Record<string, Record<string, number>> = {};

  // 1. Normalization
  criteria.forEach(c => {
    const sum = alternatives.reduce((s, a) => s + a.values[c.id], 0);
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      normMatrix[a.id][c.id] = sum === 0 ? (1 / alternatives.length) * c.weight : (a.values[c.id] / sum) * c.weight;
    });
  });

  steps.push({
    title: 'Weighted Normalized Matrix',
    description: 'Linear normalization multiplied by weights.',
    formula: 'x*_ij = w_j * (x_ij / Σx_ij)',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Sums of Benefit and Cost
  const SPlus: Record<string, number> = {};
  const SMinus: Record<string, number> = {};

  alternatives.forEach(a => {
    let sp = 0;
    let sm = 0;
    criteria.forEach(c => {
      if (c.type === 'benefit') sp += normMatrix[a.id][c.id];
      else sm += normMatrix[a.id][c.id];
    });
    SPlus[a.id] = sp;
    SMinus[a.id] = sm;
  });

  const minSMinus = Math.min(...Object.values(SMinus));
  const sumInvSMinus = Object.values(SMinus).reduce((s, val) => s + (minSMinus / val), 0);

  const results: MCDMResult[] = alternatives.map(a => {
    const score = SPlus[a.id] + (minSMinus * Object.values(SMinus).reduce((s, v) => s + v, 0)) / (Math.max(0.0001, SMinus[a.id]) * (sumInvSMinus || 1));
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * WASPAS Method
 */
export function calculateWASPAS(criteria: Criterion[], alternatives: Alternative[], lambda: number = 0.5): MCDMOutput {
  const steps: CalculationStep[] = [];
  const normalizedMatrix: Record<string, Record<string, number>> = {};

  criteria.forEach(c => {
    const values = alternatives.map(a => a.values[c.id]);
    const max = Math.max(...values);
    const min = Math.min(...values);

    alternatives.forEach(a => {
      if (!normalizedMatrix[a.id]) normalizedMatrix[a.id] = {};
      if (c.type === 'benefit') {
        normalizedMatrix[a.id][c.id] = max === 0 ? 0 : a.values[c.id] / max;
      } else {
        normalizedMatrix[a.id][c.id] = a.values[c.id] === 0 ? 1 : min / a.values[c.id];
      }
    });
  });

  const results: MCDMResult[] = alternatives.map(a => {
    let wsm = 0;
    let wpm = 1;
    criteria.forEach(c => {
      const val = normalizedMatrix[a.id][c.id];
      wsm += val * c.weight;
      wpm *= Math.pow(val, c.weight);
    });

    const score = lambda * wsm + (1 - lambda) * wpm;
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * AHP (Analytic Hierarchy Process) - Simplified for Decision Matrix
 */
export function calculateAHP(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const normMatrix: Record<string, Record<string, number>> = {};

  // 1. Normalization (Sum normalization)
  criteria.forEach(c => {
    const sum = alternatives.reduce((s, a) => s + a.values[c.id], 0);
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      normMatrix[a.id][c.id] = sum === 0 ? 1 / alternatives.length : a.values[c.id] / sum;
    });
  });

  steps.push({
    title: 'Normalized Matrix (AHP)',
    description: 'Each value is divided by the sum of its column.',
    formula: 'r_ij = x_ij / Σx_ij',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Priority Vector Calculation
  const results: MCDMResult[] = alternatives.map(a => {
    let score = 0;
    criteria.forEach(c => {
      score += normMatrix[a.id][c.id] * c.weight;
    });
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * ARAS (Additive Ratio Assessment)
 */
export function calculateARAS(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  
  // 1. Define Optimal Alternative (A0)
  const optimal: Record<string, number> = {};
  criteria.forEach(c => {
    const values = alternatives.map(a => a.values[c.id]);
    optimal[c.id] = c.type === 'benefit' ? Math.max(...values) : Math.min(...values);
  });

  // 2. Normalization
  const normMatrix: Record<string, Record<string, number>> = {};
  const normOptimal: Record<string, number> = {};

  criteria.forEach(c => {
    const values = alternatives.map(a => a.values[c.id]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    if (c.type === 'benefit') {
      const sum = alternatives.reduce((s, a) => s + a.values[c.id], 0) + optimal[c.id];
      alternatives.forEach(a => {
        if (!normMatrix[a.id]) normMatrix[a.id] = {};
        normMatrix[a.id][c.id] = sum === 0 ? 0 : a.values[c.id] / sum;
      });
      normOptimal[c.id] = sum === 0 ? 0 : optimal[c.id] / sum;
    } else {
      const sumInv = alternatives.reduce((s, a) => s + (a.values[c.id] === 0 ? 0 : 1 / a.values[c.id]), 0) + (optimal[c.id] === 0 ? 0 : 1 / optimal[c.id]);
      alternatives.forEach(a => {
        if (!normMatrix[a.id]) normMatrix[a.id] = {};
        normMatrix[a.id][c.id] = (a.values[c.id] === 0 ? 0 : 1 / a.values[c.id]) / (sumInv || 1);
      });
      normOptimal[c.id] = (optimal[c.id] === 0 ? 0 : 1 / optimal[c.id]) / (sumInv || 1);
    }
  });

  // 3. Weighted Normalized Matrix
  const weightedMatrix: Record<string, Record<string, number>> = {};
  alternatives.forEach(a => {
    weightedMatrix[a.id] = {};
    criteria.forEach(c => {
      weightedMatrix[a.id][c.id] = normMatrix[a.id][c.id] * c.weight;
    });
  });

  steps.push({
    title: 'Weighted Normalized Matrix (ARAS)',
    description: 'Normalization includes the optimal alternative (A0).',
    formula: 'Benefit: r_ij = x_ij / Σx_ij | Cost: r_ij = (1/x_ij) / Σ(1/x_ij)',
    type: 'matrix',
    data: weightedMatrix
  });

  // 4. Optimality Degree
  const s0 = criteria.reduce((sum, c) => sum + normOptimal[c.id] * c.weight, 0);
  const results: MCDMResult[] = alternatives.map(a => {
    const si = criteria.reduce((sum, c) => sum + weightedMatrix[a.id][c.id], 0);
    return {
      alternativeId: a.id,
      name: a.name,
      score: si / s0,
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * SMART (Simple Multi-Attribute Rating Technique)
 * In its simplest form, it is very similar to SAW but often uses a 0-100 scale.
 */
export function calculateSMART(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const normalizedMatrix: Record<string, Record<string, number>> = {};

  // 1. Normalization (Linear scale 0-1)
  criteria.forEach(c => {
    const values = alternatives.map(a => a.values[c.id]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    alternatives.forEach(a => {
      if (!normalizedMatrix[a.id]) normalizedMatrix[a.id] = {};
      if (c.type === 'benefit') {
        normalizedMatrix[a.id][c.id] = (a.values[c.id] - min) / range;
      } else {
        normalizedMatrix[a.id][c.id] = (max - a.values[c.id]) / range;
      }
    });
  });

  steps.push({
    title: 'SMART Normalization',
    description: 'Linear scaling to 0-1 range.',
    formula: 'Benefit: (x - min) / (max - min) | Cost: (max - x) / (max - min)',
    type: 'matrix',
    data: normalizedMatrix
  });

  const results: MCDMResult[] = alternatives.map(a => {
    let score = 0;
    criteria.forEach(c => {
      score += normalizedMatrix[a.id][c.id] * c.weight;
    });
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * MEW (Multiplicative Exponent Weighting)
 */
export function calculateMEW(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  
  const results: MCDMResult[] = alternatives.map(a => {
    let score = 1;
    criteria.forEach(c => {
      const val = a.values[c.id];
      if (c.type === 'benefit') {
        score *= Math.pow(val || 0.0001, c.weight);
      } else {
        score *= Math.pow(val || 0.0001, -c.weight);
      }
    });
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  steps.push({
    title: 'Multiplicative Aggregation',
    description: 'Alternatives are evaluated by multiplying criteria values raised to the power of their weights.',
    formula: 'V_i = Π (x_ij ^ w_j) for benefit, (x_ij ^ -w_j) for cost',
    type: 'list',
    data: Object.fromEntries(results.map(r => [r.name, { score: r.score }]))
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * ELECTRE I (Simplified)
 * Calculates the Concordance Index as a ranking score.
 */
export function calculateELECTRE(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  
  // 1. Normalization
  const normMatrix: Record<string, Record<string, number>> = {};
  criteria.forEach(c => {
    const sumSq = Math.sqrt(alternatives.reduce((sum, a) => sum + Math.pow(a.values[c.id], 2), 0));
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      normMatrix[a.id][c.id] = sumSq === 0 ? 0 : a.values[c.id] / sumSq;
    });
  });

  // 2. Concordance Matrix
  const concordance: Record<string, Record<string, number>> = {};
  alternatives.forEach(a1 => {
    concordance[a1.id] = {};
    alternatives.forEach(a2 => {
      if (a1.id === a2.id) {
        concordance[a1.id][a2.id] = 0;
        return;
      }
      let cIndex = 0;
      criteria.forEach(c => {
        const v1 = normMatrix[a1.id][c.id];
        const v2 = normMatrix[a2.id][c.id];
        if (c.type === 'benefit' ? v1 >= v2 : v1 <= v2) {
          cIndex += c.weight;
        }
      });
      concordance[a1.id][a2.id] = cIndex;
    });
  });

  steps.push({
    title: 'Concordance Matrix',
    description: 'Measures the degree to which alternative A outranks alternative B.',
    formula: 'C(a,b) = Σ w_j where v_aj >= v_bj',
    type: 'matrix',
    data: concordance
  });

  // 3. Aggregate Concordance Score
  const results: MCDMResult[] = alternatives.map(a => {
    const score = Object.values(concordance[a.id]).reduce((sum, val) => sum + val, 0) / (alternatives.length - 1);
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * EDAS (Evaluation based on Distance from Average Solution)
 */
export function calculateEDAS(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  
  // 1. Average Solution (AV)
  const av: Record<string, number> = {};
  criteria.forEach(c => {
    const values = alternatives.map(a => a.values[c.id]);
    av[c.id] = values.reduce((s, v) => s + v, 0) / alternatives.length;
  });

  // 2. PDA and NDA
  const pda: Record<string, Record<string, number>> = {};
  const nda: Record<string, Record<string, number>> = {};

  alternatives.forEach(a => {
    pda[a.id] = {};
    nda[a.id] = {};
    criteria.forEach(c => {
      const val = a.values[c.id];
      if (c.type === 'benefit') {
        pda[a.id][c.id] = Math.max(0, (val - av[c.id]) / av[c.id]);
        nda[a.id][c.id] = Math.max(0, (av[c.id] - val) / av[c.id]);
      } else {
        pda[a.id][c.id] = Math.max(0, (av[c.id] - val) / av[c.id]);
        nda[a.id][c.id] = Math.max(0, (val - av[c.id]) / av[c.id]);
      }
    });
  });

  steps.push({
    title: 'PDA and NDA Matrices',
    description: 'Positive Distance from Average (PDA) and Negative Distance from Average (NDA).',
    formula: 'Benefit: PDA = max(0, (x-AV)/AV), NDA = max(0, (AV-x)/AV)',
    type: 'matrix',
    data: pda
  });

  // 3. Weighted Sums
  const sp: Record<string, number> = {};
  const sn: Record<string, number> = {};
  alternatives.forEach(a => {
    sp[a.id] = criteria.reduce((sum, c) => sum + pda[a.id][c.id] * c.weight, 0);
    sn[a.id] = criteria.reduce((sum, c) => sum + nda[a.id][c.id] * c.weight, 0);
  });

  // 4. Normalization of SP and SN
  const maxSP = Math.max(...Object.values(sp));
  const maxSN = Math.max(...Object.values(sn));

  const nsp: Record<string, number> = {};
  const nsn: Record<string, number> = {};
  alternatives.forEach(a => {
    nsp[a.id] = sp[a.id] / maxSP;
    nsn[a.id] = 1 - (sn[a.id] / maxSN);
  });

  // 5. Appraisal Score (AS)
  const results: MCDMResult[] = alternatives.map(a => {
    const score = (nsp[a.id] + nsn[a.id]) / 2;
    return {
      alternativeId: a.id,
      name: a.name,
      score: isNaN(score) ? 0 : score,
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * MULTIMOORA (Simplified)
 * Combines Ratio System, Reference Point, and Full Multiplicative Form.
 */
export function calculateMULTIMOORA(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  
  // 1. Ratio System (MOORA)
  const mooraRes = calculateMOORA(criteria, alternatives);
  const ratioScores = Object.fromEntries(mooraRes.results.map(r => [r.alternativeId, r.rank]));

  // 2. Reference Point
  const normMatrix: Record<string, Record<string, number>> = {};
  criteria.forEach(c => {
    const sumSq = Math.sqrt(alternatives.reduce((sum, a) => sum + Math.pow(a.values[c.id], 2), 0));
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      normMatrix[a.id][c.id] = a.values[c.id] / sumSq;
    });
  });

  const referencePoints: Record<string, number> = {};
  criteria.forEach(c => {
    const values = alternatives.map(a => normMatrix[a.id][c.id]);
    referencePoints[c.id] = c.type === 'benefit' ? Math.max(...values) : Math.min(...values);
  });

  const refPointScores = alternatives.map(a => {
    const maxDeviation = Math.max(...criteria.map(c => Math.abs(referencePoints[c.id] - normMatrix[a.id][c.id]) * c.weight));
    return { id: a.id, score: maxDeviation };
  }).sort((a, b) => a.score - b.score);
  
  const refPointRanks = Object.fromEntries(refPointScores.map((s, i) => [s.id, i + 1]));

  // 3. Full Multiplicative Form
  const multiplicativeScores = alternatives.map(a => {
    let score = 1;
    criteria.forEach(c => {
      const val = a.values[c.id];
      if (c.type === 'benefit') score *= Math.pow(val, c.weight);
      else score *= Math.pow(val, -c.weight);
    });
    return { id: a.id, score };
  }).sort((a, b) => b.score - a.score);

  const multiplicativeRanks = Object.fromEntries(multiplicativeScores.map((s, i) => [s.id, i + 1]));

  // 4. Final Dominance Ranking (Simplified)
  const results: MCDMResult[] = alternatives.map(a => {
    // Lower rank sum is better
    const score = (ratioScores[a.id] + refPointRanks[a.id] + multiplicativeRanks[a.id]) / 3;
    return {
      alternativeId: a.id,
      name: a.name,
      score: 1 / score, // Invert so higher is better for UI consistency
      rank: 0
    };
  });

  steps.push({
    title: 'MULTIMOORA Aggregation',
    description: 'Combines Ratio System, Reference Point, and Full Multiplicative Form using Dominance Theory.',
    formula: 'Final Rank = Average(Rank_Ratio, Rank_RefPoint, Rank_Multiplicative)',
    type: 'list',
    data: { 
      'Ratio Ranks': ratioScores, 
      'Ref Point Ranks': refPointRanks, 
      'Multiplicative Ranks': multiplicativeRanks 
    }
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * PROMETHEE II (Preference Ranking Organization Method for Enrichment Evaluation)
 */
export function calculatePROMETHEE(criteria: Criterion[], alternatives: Alternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const n = alternatives.length;
  const m = criteria.length;

  // 1. Pairwise Comparisons and Preference Functions
  // Using Linear Preference Function: P(d) = 0 if d <= 0, d/p if 0 < d < p, 1 if d >= p
  // For simplicity, we'll use a simplified version: P(d) = 1 if d > 0, else 0 (Usual preference)
  const preferenceMatrices: Record<string, number[][]> = {};
  
  criteria.forEach(c => {
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const diff = c.type === 'benefit' 
          ? alternatives[i].values[c.id] - alternatives[j].values[c.id]
          : alternatives[j].values[c.id] - alternatives[i].values[c.id];
        
        matrix[i][j] = diff > 0 ? 1 : 0; // Usual preference
      }
    }
    preferenceMatrices[c.id] = matrix;
  });

  steps.push({
    title: 'Pairwise Preference Matrices',
    description: 'Calculates the preference of one alternative over another for each criterion.',
    formula: 'P_k(a, b) = 1 if f_k(a) > f_k(b), else 0',
    type: 'matrix',
    data: preferenceMatrices
  });

  // 2. Aggregate Preference Index
  const aggregateMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let sum = 0;
      criteria.forEach(c => {
        sum += c.weight * preferenceMatrices[c.id][i][j];
      });
      aggregateMatrix[i][j] = sum;
    }
  }

  steps.push({
    title: 'Aggregate Preference Index',
    description: 'Combines the preferences from all criteria using weights.',
    formula: 'π(a, b) = Σ [w_k * P_k(a, b)]',
    type: 'matrix',
    data: aggregateMatrix
  });

  // 3. Entering and Leaving Flows
  const leavingFlows: Record<string, number> = {};
  const enteringFlows: Record<string, number> = {};
  const netFlows: Record<string, number> = {};

  for (let i = 0; i < n; i++) {
    let leaving = 0;
    let entering = 0;
    for (let j = 0; j < n; j++) {
      leaving += aggregateMatrix[i][j];
      entering += aggregateMatrix[j][i];
    }
    const id = alternatives[i].id;
    leavingFlows[id] = leaving / (n - 1);
    enteringFlows[id] = entering / (n - 1);
    netFlows[id] = leavingFlows[id] - enteringFlows[id];
  }

  steps.push({
    title: 'Leaving and Entering Flows',
    description: 'Calculates how much an alternative dominates others (Leaving) and is dominated by others (Entering).',
    formula: 'Φ+(a) = 1/(n-1) Σ π(a, x), Φ-(a) = 1/(n-1) Σ π(x, a)',
    type: 'list',
    data: { 'Leaving Flows (Φ+)': leavingFlows, 'Entering Flows (Φ-)': enteringFlows }
  });

  // 4. Net Flow and Ranking
  const results: MCDMResult[] = alternatives.map(a => ({
    alternativeId: a.id,
    name: a.name,
    score: netFlows[a.id],
    rank: 0
  }));

  steps.push({
    title: 'Net Outranking Flow',
    description: 'The final score used for ranking in PROMETHEE II.',
    formula: 'Φ(a) = Φ+(a) - Φ-(a)',
    type: 'list',
    data: netFlows
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * Grey Relational Analysis (GRA)
 */
export function calculateGRA(criteria: Criterion[], alternatives: Alternative[], rho: number = 0.5): MCDMOutput {
  const steps: CalculationStep[] = [];
  const n = alternatives.length;
  const m = criteria.length;

  // 1. Normalization (Linear scale 0-1)
  const normMatrix: Record<string, Record<string, number>> = {};
  criteria.forEach(c => {
    const values = alternatives.map(a => a.values[c.id]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      if (c.type === 'benefit') {
        normMatrix[a.id][c.id] = (a.values[c.id] - min) / range;
      } else {
        normMatrix[a.id][c.id] = (max - a.values[c.id]) / range;
      }
    });
  });

  steps.push({
    title: 'GRA Normalization',
    description: 'Normalizes the decision matrix to a 0-1 range.',
    formula: 'Benefit: (x - min) / (max - min) | Cost: (max - x) / (max - min)',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Grey Relational Coefficient (GRC)
  const grcMatrix: Record<string, Record<string, number>> = {};
  const deltaMax = 1; // Since normalized to 0-1
  const deltaMin = 0;

  alternatives.forEach(a => {
    grcMatrix[a.id] = {};
    criteria.forEach(c => {
      const delta = 1 - normMatrix[a.id][c.id]; // Distance from ideal (1)
      grcMatrix[a.id][c.id] = (deltaMin + rho * deltaMax) / (delta + rho * deltaMax);
    });
  });

  steps.push({
    title: 'Grey Relational Coefficient',
    description: 'Calculates the relational coefficient between the ideal sequence and the comparative sequence.',
    formula: 'ξ_ij = (Δmin + ρΔmax) / (Δ_ij + ρΔmax)',
    type: 'matrix',
    data: grcMatrix
  });

  // 3. Grey Relational Grade (GRG)
  const results: MCDMResult[] = alternatives.map(a => {
    let score = 0;
    criteria.forEach(c => {
      score += c.weight * grcMatrix[a.id][c.id];
    });
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  steps.push({
    title: 'Grey Relational Grade',
    description: 'The weighted average of the grey relational coefficients.',
    formula: 'γ_i = Σ w_j * ξ_ij',
    type: 'list',
    data: Object.fromEntries(results.map(r => [r.name, { score: r.score }]))
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

function sortAndRank(results: MCDMResult[]): MCDMResult[] {
  const sorted = [...results].sort((a, b) => b.score - a.score);
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}
