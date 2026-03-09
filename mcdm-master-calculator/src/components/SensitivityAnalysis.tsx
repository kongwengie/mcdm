import React, { useState, useMemo } from 'react';
import { Criterion, Alternative, InputAlternative, MCDMOutput, MCDMResult } from '../types/mcdm';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface SensitivityAnalysisProps {
  criteria: Criterion[];
  alternatives: InputAlternative[];
  selectedMethodId: string;
  runMethod: (methodId: string, criteriaToUse?: Criterion[], altsToUse?: InputAlternative[], lambda?: number) => MCDMOutput;
  originalOutput: MCDMOutput | null;
}

// Spearman's rank correlation coefficient
function calculateSpearman(rank1: number[], rank2: number[]): number {
  const n = rank1.length;
  if (n === 0) return 0;
  let dSqSum = 0;
  for (let i = 0; i < n; i++) {
    dSqSum += Math.pow(rank1[i] - rank2[i], 2);
  }
  return 1 - (6 * dSqSum) / (n * (Math.pow(n, 2) - 1));
}

export const SensitivityAnalysis: React.FC<SensitivityAnalysisProps> = ({ criteria, alternatives, selectedMethodId, runMethod, originalOutput }) => {
  const [selectedCriterionId, setSelectedCriterionId] = useState<string>(criteria[0]?.id || '');
  const [analysisType, setAnalysisType] = useState<'weight-change' | 'eighty-twenty' | 'lambda-variation'>('weight-change');

  const isWaspas = selectedMethodId === 'waspas' || selectedMethodId === 'fuzzy-waspas';

  const originalRanks = useMemo(() => {
    if (!originalOutput) return [];
    // Sort by original alternative order to keep consistent mapping
    return alternatives.map(a => originalOutput.results.find(r => r.alternativeId === a.id)?.rank || 0);
  }, [originalOutput, alternatives]);

  const weightChangeResults = useMemo(() => {
    if (!originalOutput || !selectedCriterionId || analysisType !== 'weight-change') return null;
    
    // Changes: -90%, -60%, -30%, -10%, +10%, +25%, +30%, +60%, +90%
    const changes = [-0.9, -0.6, -0.3, -0.1, 0.1, 0.25, 0.3, 0.6, 0.9];
    const results: any[] = [];
    const targetCriterion = criteria.find(c => c.id === selectedCriterionId);
    if (!targetCriterion) return null;

    const originalWeight = targetCriterion.weight;

    changes.forEach(change => {
      let newWeight = originalWeight * (1 + change);
      if (newWeight < 0) newWeight = 0.0001; // Avoid negative or zero weights
      if (newWeight > 1) newWeight = 0.9999;

      const diff = newWeight - originalWeight;
      const otherCriteria = criteria.filter(c => c.id !== selectedCriterionId);
      const sumOthers = otherCriteria.reduce((sum, c) => sum + c.weight, 0);

      const modifiedCriteria = criteria.map(c => {
        if (c.id === selectedCriterionId) return { ...c, weight: newWeight };
        // Adjust others proportionally to keep sum = 1
        const newOtherWeight = sumOthers === 0 ? (1 - newWeight) / otherCriteria.length : c.weight - (c.weight / sumOthers) * diff;
        return { ...c, weight: Math.max(0.0001, newOtherWeight) };
      });

      try {
        const out = runMethod(selectedMethodId, modifiedCriteria, alternatives);
        const ranks = alternatives.map(a => out.results.find(r => r.alternativeId === a.id)?.rank || 0);
        const spearman = calculateSpearman(originalRanks, ranks);
        
        const dataPoint: any = { change: `${change > 0 ? '+' : ''}${change * 100}%`, spearman };
        out.results.forEach(r => {
          dataPoint[r.name] = r.score;
        });
        results.push(dataPoint);
      } catch (e) {
        console.error("Sensitivity calculation failed for change", change, e);
      }
    });

    return results;
  }, [criteria, alternatives, selectedMethodId, runMethod, originalOutput, selectedCriterionId, analysisType, originalRanks]);

  const eightyTwentyResults = useMemo(() => {
    if (!originalOutput || analysisType !== 'eighty-twenty') return null;
    
    const results: any[] = [];
    
    criteria.forEach(targetCriterion => {
      const modifiedCriteria = criteria.map(c => {
        if (c.id === targetCriterion.id) return { ...c, weight: 0.8 };
        return { ...c, weight: 0.2 / (criteria.length - 1) };
      });

      try {
        const out = runMethod(selectedMethodId, modifiedCriteria, alternatives);
        const ranks = alternatives.map(a => out.results.find(r => r.alternativeId === a.id)?.rank || 0);
        const spearman = calculateSpearman(originalRanks, ranks);
        
        const dataPoint: any = { criterion: targetCriterion.name, spearman };
        out.results.forEach(r => {
          dataPoint[r.name] = r.score;
        });
        results.push(dataPoint);
      } catch (e) {
        console.error("Sensitivity calculation failed for 80/20", e);
      }
    });

    return results;
  }, [criteria, alternatives, selectedMethodId, runMethod, originalOutput, analysisType, originalRanks]);

  const lambdaResults = useMemo(() => {
    if (!originalOutput || analysisType !== 'lambda-variation' || !isWaspas) return null;
    
    const lambdas = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const results: any[] = [];

    lambdas.forEach(lambda => {
      try {
        const out = runMethod(selectedMethodId, criteria, alternatives, lambda);
        const ranks = alternatives.map(a => out.results.find(r => r.alternativeId === a.id)?.rank || 0);
        const spearman = calculateSpearman(originalRanks, ranks);
        
        const dataPoint: any = { lambda: lambda.toFixed(1), spearman };
        out.results.forEach(r => {
          dataPoint[r.name] = r.score;
        });
        results.push(dataPoint);
      } catch (e) {
        console.error("Sensitivity calculation failed for lambda", lambda, e);
      }
    });

    return results;
  }, [criteria, alternatives, selectedMethodId, runMethod, originalOutput, analysisType, originalRanks, isWaspas]);

  if (!originalOutput) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 opacity-40">
        <p className="text-slate-600 font-medium tracking-tight text-xs">Please calculate ranking first to view sensitivity analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tighter font-sans">Sensitivity Analysis</h2>
          <p className="text-sm opacity-60 text-slate-600">Analyze how changes in criteria weights affect the final ranking</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex gap-4 border-b border-slate-200 pb-4">
          <button 
            onClick={() => setAnalysisType('weight-change')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${analysisType === 'weight-change' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Weight Variation (±10% to ±90%)
          </button>
          <button 
            onClick={() => setAnalysisType('eighty-twenty')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${analysisType === 'eighty-twenty' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            80/20 Weight Distribution
          </button>
          {isWaspas && (
            <button 
              onClick={() => setAnalysisType('lambda-variation')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${analysisType === 'lambda-variation' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Lambda Variation (WASPAS)
            </button>
          )}
        </div>

        {analysisType === 'weight-change' && (
          <div className="space-y-6">
            <div>
              <label className="text-xs uppercase text-slate-600 block mb-2 font-bold">Select Criterion to Vary</label>
              <select 
                value={selectedCriterionId}
                onChange={e => setSelectedCriterionId(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {criteria.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {weightChangeResults && weightChangeResults.length > 0 && (
              <div className="space-y-8">
                <div className="h-[400px] w-full">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 text-center">Alternative Scores vs Weight Change</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChangeResults}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="change" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Legend />
                      {alternatives.map((a, i) => (
                        <Line key={a.id} type="monotone" dataKey={a.name} stroke={`hsl(${i * 137.5 % 360}, 70%, 50%)`} strokeWidth={2} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[300px] w-full">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 text-center">Spearman's Rank Correlation Coefficient</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChangeResults}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="change" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="spearman" stroke="#4f46e5" strokeWidth={3} name="Spearman Correlation" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {analysisType === 'eighty-twenty' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              This analysis assigns 80% of the total weight to one criterion and distributes the remaining 20% equally among the rest. This is done for each criterion to see how extreme weight changes affect the ranking.
            </p>

            {eightyTwentyResults && eightyTwentyResults.length > 0 && (
              <div className="space-y-8">
                <div className="h-[400px] w-full">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 text-center">Alternative Scores (80% weight to X-axis criterion)</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={eightyTwentyResults}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="criterion" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Legend />
                      {alternatives.map((a, i) => (
                        <Line key={a.id} type="monotone" dataKey={a.name} stroke={`hsl(${i * 137.5 % 360}, 70%, 50%)`} strokeWidth={2} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[300px] w-full">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 text-center">Spearman's Rank Correlation Coefficient</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={eightyTwentyResults}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="criterion" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="spearman" stroke="#4f46e5" strokeWidth={3} name="Spearman Correlation" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {analysisType === 'lambda-variation' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              This analysis varies the λ (lambda) parameter for WASPAS from 0 to 1 to observe its effect on the final ranking. λ = 0 corresponds to WPM, while λ = 1 corresponds to WSM.
            </p>

            {lambdaResults && lambdaResults.length > 0 && (
              <div className="space-y-8">
                <div className="h-[400px] w-full">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 text-center">Alternative Scores vs Lambda (λ)</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lambdaResults}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="lambda" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Legend />
                      {alternatives.map((a, i) => (
                        <Line key={a.id} type="monotone" dataKey={a.name} stroke={`hsl(${i * 137.5 % 360}, 70%, 50%)`} strokeWidth={2} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[300px] w-full">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 text-center">Spearman's Rank Correlation Coefficient</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lambdaResults}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="lambda" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="spearman" stroke="#4f46e5" strokeWidth={3} name="Spearman Correlation" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
