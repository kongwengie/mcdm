import { Criterion, FuzzyAlternative, MCDMResult, FuzzyNumber, MCDMOutput, CalculationStep } from '../types/mcdm';
import { FuzzyMath } from '../utils/fuzzy-math';

/**
 * Fuzzy TOPSIS
 */
export function calculateFuzzyTOPSIS(criteria: Criterion[], alternatives: FuzzyAlternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const normMatrix: Record<string, Record<string, FuzzyNumber>> = {};
  
  // 1. Normalize
  criteria.forEach(c => {
    const uValues = alternatives.map(a => a.values[c.id].u);
    const lValues = alternatives.map(a => a.values[c.id].l);
    const maxU = Math.max(...uValues);
    const minL = Math.min(...lValues);

    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      const v = a.values[c.id];
      if (c.type === 'benefit') {
        normMatrix[a.id][c.id] = {
          l: maxU === 0 ? 0 : v.l / maxU,
          m: maxU === 0 ? 0 : v.m / maxU,
          u: maxU === 0 ? 0 : v.u / maxU
        };
      } else {
        normMatrix[a.id][c.id] = {
          l: v.u === 0 ? 1 : minL / v.u,
          m: v.m === 0 ? 1 : minL / v.m,
          u: v.l === 0 ? 1 : minL / v.l
        };
      }
      normMatrix[a.id][c.id] = FuzzyMath.multiplyScalar(normMatrix[a.id][c.id], c.weight);
    });
  });

  steps.push({
    title: 'Weighted Normalized Fuzzy Matrix',
    description: 'Fuzzy normalization and criteria weighting applied.',
    formula: '\\text{Benefit: } r_{ij} = (\\frac{l_{ij}}{u^*_j}, \\frac{m_{ij}}{u^*_j}, \\frac{u_{ij}}{u^*_j}) \\quad \\text{Cost: } r_{ij} = (\\frac{l^-_j}{u_{ij}}, \\frac{l^-_j}{m_{ij}}, \\frac{l^-_j}{l_{ij}})',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Fuzzy Ideal and Anti-Ideal
  const FPIS: Record<string, FuzzyNumber> = {};
  const FNIS: Record<string, FuzzyNumber> = {};

  criteria.forEach(c => {
    const uValues = alternatives.map(a => normMatrix[a.id][c.id].u);
    const lValues = alternatives.map(a => normMatrix[a.id][c.id].l);
    FPIS[c.id] = { l: Math.max(...uValues), m: Math.max(...uValues), u: Math.max(...uValues) };
    FNIS[c.id] = { l: Math.min(...lValues), m: Math.min(...lValues), u: Math.min(...lValues) };
  });

  steps.push({
    title: 'Fuzzy PIS and NIS',
    description: 'Fuzzy Positive Ideal Solution and Fuzzy Negative Ideal Solution.',
    formula: 'FPIS = (1,1,1) \\quad FNIS = (0,0,0) \\text{ [Standardized]}',
    type: 'list',
    data: { FPIS, FNIS }
  });

  // 3. Distances
  const results: MCDMResult[] = alternatives.map(a => {
    let dPlus = 0;
    let dMinus = 0;
    criteria.forEach(c => {
      dPlus += FuzzyMath.distance(normMatrix[a.id][c.id], FPIS[c.id]);
      dMinus += FuzzyMath.distance(normMatrix[a.id][c.id], FNIS[c.id]);
    });

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
    description: 'Calculate the relative closeness of each alternative to the fuzzy ideal solution.',
    formula: 'CC_i = \\frac{d_i^-}{d_i^+ + d_i^-}',
    type: 'list',
    data: Object.fromEntries(ranked.map(r => [r.name, { score: r.score }]))
  });

  return { results: ranked, steps };
}

/**
 * Fuzzy SAW
 */
export function calculateFuzzySAW(criteria: Criterion[], alternatives: FuzzyAlternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const normMatrix: Record<string, Record<string, FuzzyNumber>> = {};

  criteria.forEach(c => {
    const uValues = alternatives.map(a => a.values[c.id].u);
    const lValues = alternatives.map(a => a.values[c.id].l);
    const maxU = Math.max(...uValues);
    const minL = Math.min(...lValues);

    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      const v = a.values[c.id];
      if (c.type === 'benefit') {
        normMatrix[a.id][c.id] = { l: maxU === 0 ? 0 : v.l / maxU, m: maxU === 0 ? 0 : v.m / maxU, u: maxU === 0 ? 0 : v.u / maxU };
      } else {
        normMatrix[a.id][c.id] = { l: v.u === 0 ? 1 : minL / v.u, m: v.m === 0 ? 1 : minL / v.m, u: v.l === 0 ? 1 : minL / v.l };
      }
    });
  });

  const results: MCDMResult[] = alternatives.map(a => {
    let fuzzyScore: FuzzyNumber = { l: 0, m: 0, u: 0 };
    criteria.forEach(c => {
      const weighted = FuzzyMath.multiplyScalar(normMatrix[a.id][c.id], c.weight);
      fuzzyScore = FuzzyMath.add(fuzzyScore, weighted);
    });
    return {
      alternativeId: a.id,
      name: a.name,
      score: FuzzyMath.defuzzify(fuzzyScore),
      rank: 0
    };
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * Fuzzy AHP (Simplified)
 */
export function calculateFuzzyAHP(criteria: Criterion[], alternatives: FuzzyAlternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  
  // 1. Fuzzy Normalization
  const normMatrix: Record<string, Record<string, { l: number, m: number, u: number }>> = {};
  criteria.forEach(c => {
    const sumL = alternatives.reduce((s, a) => s + a.values[c.id].l, 0);
    const sumM = alternatives.reduce((s, a) => s + a.values[c.id].m, 0);
    const sumU = alternatives.reduce((s, a) => s + a.values[c.id].u, 0);

    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      normMatrix[a.id][c.id] = {
        l: sumU === 0 ? 1 / alternatives.length : a.values[c.id].l / sumU,
        m: sumM === 0 ? 1 / alternatives.length : a.values[c.id].m / sumM,
        u: sumL === 0 ? 1 / alternatives.length : a.values[c.id].u / sumL
      };
    });
  });

  steps.push({
    title: 'Fuzzy Normalized Matrix (AHP)',
    description: 'Fuzzy values normalized by the sum of their column.',
    formula: 'r_{ij} = (\\frac{l_{ij}}{\\sum u_j}, \\frac{m_{ij}}{\\sum m_j}, \\frac{u_{ij}}{\\sum l_j})',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Fuzzy Weighted Scores
  const fuzzyScores: Record<string, { l: number, m: number, u: number }> = {};
  alternatives.forEach(a => {
    let l = 0, m = 0, u = 0;
    criteria.forEach(c => {
      const val = normMatrix[a.id][c.id];
      l += val.l * c.weight;
      m += val.m * c.weight;
      u += val.u * c.weight;
    });
    fuzzyScores[a.id] = { l, m, u };
  });

  // 3. Defuzzification (Center of Area)
  const results: MCDMResult[] = alternatives.map(a => {
    const f = fuzzyScores[a.id];
    const score = (f.l + f.m + f.u) / 3;
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
 * Fuzzy VIKOR
 */
export function calculateFuzzyVIKOR(criteria: Criterion[], alternatives: FuzzyAlternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  
  // 1. Fuzzy Best and Worst Values
  const fuzzyBest: Record<string, { l: number, m: number, u: number }> = {};
  const fuzzyWorst: Record<string, { l: number, m: number, u: number }> = {};
  
  criteria.forEach(c => {
    const vals = alternatives.map(a => a.values[c.id]);
    if (c.type === 'benefit') {
      fuzzyBest[c.id] = {
        l: Math.max(...vals.map(v => v.l)),
        m: Math.max(...vals.map(v => v.m)),
        u: Math.max(...vals.map(v => v.u))
      };
      fuzzyWorst[c.id] = {
        l: Math.min(...vals.map(v => v.l)),
        m: Math.min(...vals.map(v => v.m)),
        u: Math.min(...vals.map(v => v.u))
      };
    } else {
      fuzzyBest[c.id] = {
        l: Math.min(...vals.map(v => v.l)),
        m: Math.min(...vals.map(v => v.m)),
        u: Math.min(...vals.map(v => v.u))
      };
      fuzzyWorst[c.id] = {
        l: Math.max(...vals.map(v => v.l)),
        m: Math.max(...vals.map(v => v.m)),
        u: Math.max(...vals.map(v => v.u))
      };
    }
  });

  steps.push({
    title: 'Fuzzy Best and Worst Values',
    description: 'Identifies the fuzzy ideal and anti-ideal values for each criterion.',
    formula: 'f^*_j = \\max(f_{ij}) \\text{ for benefit, } \\min(f_{ij}) \\text{ for cost}',
    type: 'list',
    data: { 'Fuzzy Best': fuzzyBest, 'Fuzzy Worst': fuzzyWorst }
  });

  // 2. Fuzzy S and R values
  const fuzzyS: Record<string, { l: number, m: number, u: number }> = {};
  const fuzzyR: Record<string, { l: number, m: number, u: number }> = {};
  
  alternatives.forEach(a => {
    let sL = 0, sM = 0, sU = 0;
    let rL = 0, rM = 0, rU = 0;
    
    criteria.forEach(c => {
      const val = a.values[c.id];
      const best = fuzzyBest[c.id];
      const worst = fuzzyWorst[c.id];
      
      // Fuzzy distance: d = (best - val) / (best - worst)
      const rangeL = best.u - worst.l;
      const rangeM = best.m - worst.m;
      const rangeU = best.l - worst.u;

      const distL = rangeL === 0 ? 0 : (best.l - val.u) / rangeL;
      const distM = rangeM === 0 ? 0 : (best.m - val.m) / rangeM;
      const distU = rangeU === 0 ? 0 : (best.u - val.l) / rangeU;
      
      const weightedL = c.weight * distL;
      const weightedM = c.weight * distM;
      const weightedU = c.weight * distU;
      
      sL += weightedL; sM += weightedM; sU += weightedU;
      rL = Math.max(rL, weightedL); rM = Math.max(rM, weightedM); rU = Math.max(rU, weightedU);
    });
    
    fuzzyS[a.id] = { l: sL, m: sM, u: sU };
    fuzzyR[a.id] = { l: rL, m: rM, u: rU };
  });

  steps.push({
    title: 'Fuzzy S and R Values',
    description: 'S represents the utility measure, R represents the regret measure.',
    formula: 'S_i = \\sum w_j d(f^*_j, f_{ij}), \\quad R_i = \\max [w_j d(f^*_j, f_{ij})]',
    type: 'matrix',
    data: { 'Fuzzy S': fuzzyS, 'Fuzzy R': fuzzyR }
  });

  // 3. Fuzzy Q values (Simplified defuzzification for ranking)
  const sMin = Math.min(...Object.values(fuzzyS).map(v => (v.l + v.m + v.u) / 3));
  const sMax = Math.max(...Object.values(fuzzyS).map(v => (v.l + v.m + v.u) / 3));
  const rMin = Math.min(...Object.values(fuzzyR).map(v => (v.l + v.m + v.u) / 3));
  const rMax = Math.max(...Object.values(fuzzyR).map(v => (v.l + v.m + v.u) / 3));
  
  const v = 0.5; // Weight of strategy (majority of criteria)
  
  const results: MCDMResult[] = alternatives.map(a => {
    const s = (fuzzyS[a.id].l + fuzzyS[a.id].m + fuzzyS[a.id].u) / 3;
    const r = (fuzzyR[a.id].l + fuzzyR[a.id].m + fuzzyR[a.id].u) / 3;
    
    const sRange = sMax - sMin;
    const rRange = rMax - rMin;
    
    const q = v * (sRange === 0 ? 0 : (s - sMin) / sRange) + (1 - v) * (rRange === 0 ? 0 : (r - rMin) / rRange);
    
    return {
      alternativeId: a.id,
      name: a.name,
      score: 1 - q, // Invert so higher is better
      rank: 0
    };
  });

  steps.push({
    title: 'Fuzzy Q Index',
    description: 'The final compromise index used for ranking.',
    formula: 'Q_i = v \\frac{S_i - S^*}{S^- - S^*} + (1-v) \\frac{R_i - R^*}{R^- - R^*}',
    type: 'list',
    data: results.map(r => ({ name: r.name, q: 1 - r.score }))
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * Fuzzy ELECTRE I
 */
export function calculateFuzzyELECTRE(criteria: Criterion[], alternatives: FuzzyAlternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const n = alternatives.length;

  // 1. Fuzzy Normalization
  const normMatrix: Record<string, Record<string, { l: number, m: number, u: number }>> = {};
  criteria.forEach(c => {
    const sumSq = Math.sqrt(alternatives.reduce((sum, a) => sum + Math.pow(a.values[c.id].u, 2), 0));
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      const v = a.values[c.id];
      normMatrix[a.id][c.id] = { 
        l: sumSq === 0 ? 0 : v.l / sumSq, 
        m: sumSq === 0 ? 0 : v.m / sumSq, 
        u: sumSq === 0 ? 0 : v.u / sumSq 
      };
    });
  });

  steps.push({
    title: 'Fuzzy Normalized Matrix',
    description: 'Fuzzy values normalized using vector normalization.',
    formula: 'r_{ij} = (\\frac{l_{ij}}{|u_j|}, \\frac{m_{ij}}{|m_j|}, \\frac{u_{ij}}{|l_j|})',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Fuzzy Concordance Matrix
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
        
        // Simplified fuzzy comparison: use defuzzified values
        const d1 = (v1.l + v1.m + v1.u) / 3;
        const d2 = (v2.l + v2.m + v2.u) / 3;
        
        if (c.type === 'benefit' ? d1 >= d2 : d1 <= d2) {
          cIndex += c.weight;
        }
      });
      concordance[a1.id][a2.id] = cIndex;
    });
  });

  steps.push({
    title: 'Fuzzy Concordance Matrix',
    description: 'Measures the degree to which fuzzy alternative A outranks B.',
    formula: 'C(a,b) = \\sum_{j: \\text{defuzz}(v_{aj}) \\ge \\text{defuzz}(v_{bj})} w_j',
    type: 'matrix',
    data: concordance
  });

  // 3. Ranking based on Net Concordance
  const results: MCDMResult[] = alternatives.map(a => {
    const score = Object.values(concordance[a.id]).reduce((sum, val) => sum + val, 0) / (n - 1);
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
 * Fuzzy COPRAS
 */
export function calculateFuzzyCOPRAS(criteria: Criterion[], alternatives: FuzzyAlternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const n = alternatives.length;

  // 1. Fuzzy Normalization
  const normMatrix: Record<string, Record<string, { l: number, m: number, u: number }>> = {};
  criteria.forEach(c => {
    const sumL = alternatives.reduce((s, a) => s + a.values[c.id].l, 0);
    const sumM = alternatives.reduce((s, a) => s + a.values[c.id].m, 0);
    const sumU = alternatives.reduce((s, a) => s + a.values[c.id].u, 0);
    
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      const v = a.values[c.id];
      normMatrix[a.id][c.id] = { 
        l: sumU === 0 ? (1 / alternatives.length) * c.weight : (v.l / sumU) * c.weight, 
        m: sumM === 0 ? (1 / alternatives.length) * c.weight : (v.m / sumM) * c.weight, 
        u: sumL === 0 ? (1 / alternatives.length) * c.weight : (v.u / sumL) * c.weight 
      };
    });
  });

  steps.push({
    title: 'Fuzzy Weighted Normalized Matrix',
    description: 'Fuzzy values normalized and weighted.',
    formula: 'r_{ij} = w_j \\frac{f_{ij}}{\\sum f_j}',
    type: 'matrix',
    data: normMatrix
  });

  // 2. Sums of Benefit and Cost
  const SPlus: Record<string, number> = {};
  const SMinus: Record<string, number> = {};

  alternatives.forEach(a => {
    let sp = 0, sm = 0;
    criteria.forEach(c => {
      const v = normMatrix[a.id][c.id];
      const defuzz = (v.l + v.m + v.u) / 3;
      if (c.type === 'benefit') sp += defuzz;
      else sm += defuzz;
    });
    SPlus[a.id] = sp;
    SMinus[a.id] = sm;
  });

  // 3. Significance and Utility
  const minSMinus = Math.min(...Object.values(SMinus));
  const sumInvSMinus = Object.values(SMinus).reduce((s, val) => s + (minSMinus / val), 0);
  const sumSMinus = Object.values(SMinus).reduce((s, v) => s + v, 0);

  const results: MCDMResult[] = alternatives.map(a => {
    const score = SPlus[a.id] + (minSMinus * sumSMinus) / (Math.max(0.0001, SMinus[a.id]) * (sumInvSMinus || 1));
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
 * Fuzzy WASPAS
 */
export function calculateFuzzyWASPAS(criteria: Criterion[], alternatives: FuzzyAlternative[], lambda: number = 0.5): MCDMOutput {
  const steps: CalculationStep[] = [];
  const n = alternatives.length;

  // 1. Fuzzy Normalization
  const normMatrix: Record<string, Record<string, { l: number, m: number, u: number }>> = {};
  criteria.forEach(c => {
    const vals = alternatives.map(a => a.values[c.id]);
    const maxU = Math.max(...vals.map(v => v.u));
    const minL = Math.min(...vals.map(v => v.l));
    
    alternatives.forEach(a => {
      if (!normMatrix[a.id]) normMatrix[a.id] = {};
      const v = a.values[c.id];
      if (c.type === 'benefit') {
        normMatrix[a.id][c.id] = { l: maxU === 0 ? 0 : v.l / maxU, m: maxU === 0 ? 0 : v.m / maxU, u: maxU === 0 ? 0 : v.u / maxU };
      } else {
        normMatrix[a.id][c.id] = { l: v.u === 0 ? 1 : minL / v.u, m: v.m === 0 ? 1 : minL / v.m, u: v.l === 0 ? 1 : minL / v.l };
      }
    });
  });

  steps.push({
    title: 'Fuzzy Normalized Matrix',
    description: 'Fuzzy values normalized based on Benefit or Cost.',
    formula: '\\text{Benefit: } r_{ij} = \\frac{f_{ij}}{\\max(u_j)} \\quad \\text{Cost: } r_{ij} = \\frac{\\min(l_j)}{f_{ij}}',
    type: 'matrix',
    data: normMatrix
  });

  // 2. WSM and WPM
  const results: MCDMResult[] = alternatives.map(a => {
    let wsmL = 0, wsmM = 0, wsmU = 0;
    let wpmL = 1, wpmM = 1, wpmU = 1;
    
    criteria.forEach(c => {
      const v = normMatrix[a.id][c.id];
      wsmL += v.l * c.weight; wsmM += v.m * c.weight; wsmU += v.u * c.weight;
      wpmL *= Math.pow(v.l, c.weight); wpmM *= Math.pow(v.m, c.weight); wpmU *= Math.pow(v.u, c.weight);
    });
    
    const scoreWSM = (wsmL + wsmM + wsmU) / 3;
    const scoreWPM = (wpmL + wpmM + wpmU) / 3;
    const score = lambda * scoreWSM + (1 - lambda) * scoreWPM;
    
    return {
      alternativeId: a.id,
      name: a.name,
      score,
      rank: 0
    };
  });

  steps.push({
    title: 'Fuzzy WASPAS Aggregation',
    description: 'Combines Fuzzy WSM and Fuzzy WPM.',
    formula: 'Q_i = \\lambda WSM_i + (1-\\lambda) WPM_i',
    type: 'list',
    data: results.map(r => ({ name: r.name, score: r.score }))
  });

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

/**
 * Fuzzy PROMETHEE II
 */
export function calculateFuzzyPROMETHEE(criteria: Criterion[], alternatives: FuzzyAlternative[]): MCDMOutput {
  const steps: CalculationStep[] = [];
  const n = alternatives.length;

  // 1. Fuzzy Evaluative Differences
  const differences: Record<string, Record<string, Record<string, { l: number, m: number, u: number }>>> = {};
  
  alternatives.forEach(a1 => {
    differences[a1.id] = {};
    alternatives.forEach(a2 => {
      differences[a1.id][a2.id] = {};
      criteria.forEach(c => {
        const v1 = a1.values[c.id];
        const v2 = a2.values[c.id];
        // d = v1 - v2
        let dL = v1.l - v2.u;
        let dM = v1.m - v2.m;
        let dU = v1.u - v2.l;
        if (c.type === 'cost') {
          dL = v2.l - v1.u;
          dM = v2.m - v1.m;
          dU = v2.u - v1.l;
        }
        differences[a1.id][a2.id][c.id] = { l: dL, m: dM, u: dU };
      });
    });
  });

  // 2. Fuzzy Preference Function (Simplified Usual Criterion)
  const preferences: Record<string, Record<string, Record<string, { l: number, m: number, u: number }>>> = {};
  alternatives.forEach(a1 => {
    preferences[a1.id] = {};
    alternatives.forEach(a2 => {
      preferences[a1.id][a2.id] = {};
      criteria.forEach(c => {
        const d = differences[a1.id][a2.id][c.id];
        // Simplified: if d > 0 then 1 else 0, but fuzzy
        const defuzzD = (d.l + d.m + d.u) / 3;
        if (defuzzD > 0) {
          preferences[a1.id][a2.id][c.id] = { l: 1, m: 1, u: 1 };
        } else {
          preferences[a1.id][a2.id][c.id] = { l: 0, m: 0, u: 0 };
        }
      });
    });
  });

  // 3. Fuzzy Aggregated Preference Indices
  const aggregated: Record<string, Record<string, { l: number, m: number, u: number }>> = {};
  alternatives.forEach(a1 => {
    aggregated[a1.id] = {};
    alternatives.forEach(a2 => {
      let l = 0, m = 0, u = 0;
      criteria.forEach(c => {
        const p = preferences[a1.id][a2.id][c.id];
        l += p.l * c.weight;
        m += p.m * c.weight;
        u += p.u * c.weight;
      });
      aggregated[a1.id][a2.id] = { l, m, u };
    });
  });

  steps.push({
    title: 'Fuzzy Aggregated Preference Indices',
    description: 'Weighted sum of fuzzy preferences for each pair.',
    formula: '\\pi(a,b) = \\sum w_j P_j(a,b)',
    type: 'matrix',
    data: Object.fromEntries(Object.entries(aggregated).map(([k1, v1]) => [
      alternatives.find(a => a.id === k1)?.name || k1,
      Object.fromEntries(Object.entries(v1).map(([k2, v2]) => [
        alternatives.find(a => a.id === k2)?.name || k2,
        `(${v2.l.toFixed(2)}, ${v2.m.toFixed(2)}, ${v2.u.toFixed(2)})`
      ]))
    ]))
  });

  // 4. Fuzzy Outranking Flows
  const phiPlus: Record<string, { l: number, m: number, u: number }> = {};
  const phiMinus: Record<string, { l: number, m: number, u: number }> = {};
  const phiNet: Record<string, number> = {};

  alternatives.forEach(a1 => {
    let pL = 0, pM = 0, pU = 0;
    let mL = 0, mM = 0, mU = 0;
    alternatives.forEach(a2 => {
      if (a1.id !== a2.id) {
        pL += aggregated[a1.id][a2.id].l;
        pM += aggregated[a1.id][a2.id].m;
        pU += aggregated[a1.id][a2.id].u;
        
        mL += aggregated[a2.id][a1.id].l;
        mM += aggregated[a2.id][a1.id].m;
        mU += aggregated[a2.id][a1.id].u;
      }
    });
    phiPlus[a1.id] = { l: pL / (n - 1), m: pM / (n - 1), u: pU / (n - 1) };
    phiMinus[a1.id] = { l: mL / (n - 1), m: mM / (n - 1), u: mU / (n - 1) };
    
    // Net Flow = Defuzz(Phi+) - Defuzz(Phi-)
    const defuzzPlus = (phiPlus[a1.id].l + phiPlus[a1.id].m + phiPlus[a1.id].u) / 3;
    const defuzzMinus = (phiMinus[a1.id].l + phiMinus[a1.id].m + phiMinus[a1.id].u) / 3;
    phiNet[a1.id] = defuzzPlus - defuzzMinus;
  });

  steps.push({
    title: 'Fuzzy Outranking Flows',
    description: 'Positive, Negative, and Net Outranking Flows.',
    formula: '\\Phi^+ = \\frac{1}{n-1} \\sum \\pi(a,x), \\quad \\Phi^- = \\frac{1}{n-1} \\sum \\pi(x,a), \\quad \\Phi = \\Phi^+ - \\Phi^-',
    type: 'list',
    data: Object.fromEntries(alternatives.map(a => [
      a.name,
      {
        'Phi+': `(${(phiPlus[a.id].l).toFixed(2)}, ${(phiPlus[a.id].m).toFixed(2)}, ${(phiPlus[a.id].u).toFixed(2)})`,
        'Phi-': `(${(phiMinus[a.id].l).toFixed(2)}, ${(phiMinus[a.id].m).toFixed(2)}, ${(phiMinus[a.id].u).toFixed(2)})`,
        'Net Phi': phiNet[a.id]
      }
    ]))
  });

  const results: MCDMResult[] = alternatives.map(a => ({
    alternativeId: a.id,
    name: a.name,
    score: phiNet[a.id],
    rank: 0
  }));

  const ranked = sortAndRank(results);
  return { results: ranked, steps };
}

function sortAndRank(results: MCDMResult[]): MCDMResult[] {
  const sorted = [...results].sort((a, b) => b.score - a.score);
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}
