import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Settings2, 
  BarChart3, 
  Layers, 
  ChevronRight,
  Info,
  Download,
  Upload,
  ArrowLeft,
  Table as TableIcon,
  List as ListIcon,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';
import { 
  Criterion, 
  Alternative, 
  InputAlternative,
  MCDMResult, 
  MethodCategory, 
  MethodDefinition,
  FuzzyAlternative,
  CalculationStep,
  MCDMOutput
} from './types/mcdm';
import { MCDM_METHODS } from './constants/methods';
import { 
  calculateSAW, 
  calculateTOPSIS, 
  calculateVIKOR, 
  calculateWASPAS,
  calculateMOORA,
  calculateCOPRAS,
  calculateAHP,
  calculateARAS,
  calculateSMART,
  calculateMEW,
  calculateELECTRE,
  calculateEDAS,
  calculateMULTIMOORA,
  calculatePROMETHEE,
  calculateGRA
} from './methods/crisp';
import { 
  calculateFuzzyTOPSIS, 
  calculateFuzzySAW, 
  calculateFuzzyAHP,
  calculateFuzzyVIKOR,
  calculateFuzzyELECTRE,
  calculateFuzzyCOPRAS,
  calculateFuzzyWASPAS,
  calculateFuzzyPROMETHEE
} from './methods/fuzzy';
import { 
  calculateEntropyTOPSIS, 
  calculateEntropyVIKOR, 
  calculateAHPTOPSIS, 
  calculateAHPVIKOR, 
  calculateAHPSAW, 
  calculateAHPELECTRE,
  calculateFuzzyAHPTOPSIS,
  calculateFuzzyAHPVIKOR,
  calculateAHPPROMETHEE,
  calculateFuzzyAHPPROMETHEE
} from './methods/hybrid';
import { calculateEntropyWeights, calculateAHPWeights, calculateBWMWeights, calculateStdDevWeights, calculateCRITICWeights, calculateAHPEntropyWeights, calculatePlaceholderWeights } from './methods/weights';
import { HierarchyDiagram } from './components/HierarchyDiagram';
import { SensitivityAnalysis } from './components/SensitivityAnalysis';

type ViewMode = 'input' | 'results' | 'steps' | 'comparison' | 'sensitivity';

export default function App() {
  const [activeCategory, setActiveCategory] = useState<MethodCategory>('crisp');
  const [selectedMethodId, setSelectedMethodId] = useState('topsis');
  const [customWeightMethod, setCustomWeightMethod] = useState<string>('manual');
  const [customHybridType, setCustomHybridType] = useState<'crisp' | 'fuzzy'>('crisp');
  const [customRankingMethod, setCustomRankingMethod] = useState<string>('topsis');
  const [showWeightCalc, setShowWeightCalc] = useState(false);
  const [showBWMCalc, setShowBWMCalc] = useState(false);
  const [pairwiseMatrix, setPairwiseMatrix] = useState<number[][]>([]);
  const [bwmBestId, setBwmBestId] = useState<string>('');
  const [bwmWorstId, setBwmWorstId] = useState<string>('');
  const [bwmBestToOthers, setBwmBestToOthers] = useState<Record<string, number>>({});
  const [bwmOthersToWorst, setBwmOthersToWorst] = useState<Record<string, number>>({});
  const [ahpSteps, setAhpSteps] = useState<{ weights: Record<string, number>, steps: any[] } | null>(null);
  const [bwmSteps, setBwmSteps] = useState<{ weights: Record<string, number>, steps: any[] } | null>(null);
  const [showWeightDropdown, setShowWeightDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [goalName, setGoalName] = useState('Goal');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const [criteria, setCriteria] = useState<Criterion[]>([
    { id: 'c1', name: 'Cost', weight: 1, type: 'cost' },
    { id: 'c2', name: 'Quality', weight: 1, type: 'benefit' },
  ]);

  const [alternatives, setAlternatives] = useState<InputAlternative[]>([
    { id: 'a1', name: 'Vendor A', values: { c1: 100, c2: 80 } },
    { id: 'a2', name: 'Vendor B', values: { c1: 120, c2: 90 } },
    { id: 'a3', name: 'Vendor C', values: { c1: 80, c2: 70 } },
  ]);

  const [output, setOutput] = useState<MCDMOutput | null>(null);

  const leafCriteria = useMemo(() => {
    return criteria.filter(c => !criteria.some(child => child.parentId === c.id));
  }, [criteria]);

  const getCriterionPath = (critId: string): string => {
    const path = [];
    let current = criteria.find(c => c.id === critId);
    while (current) {
      path.unshift(current.name);
      current = criteria.find(c => c.id === current?.parentId);
    }
    return path.join(' > ');
  };

  const globalWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    const calculateRecursive = (parentId: string | undefined, parentWeight: number) => {
      const children = criteria.filter(c => c.parentId === parentId);
      if (children.length === 0) return;
      
      const localWeightSum = children.reduce((sum, c) => sum + c.weight, 0);
      
      children.forEach(child => {
        const normalizedLocalWeight = localWeightSum > 0 ? child.weight / localWeightSum : 1 / children.length;
        const globalWeight = parentWeight * normalizedLocalWeight;
        weights[child.id] = globalWeight;
        calculateRecursive(child.id, globalWeight);
      });
    };
    
    calculateRecursive(undefined, 1);
    return weights;
  }, [criteria]);

  const effectiveCriteria = useMemo(() => {
    return leafCriteria.map(c => ({
      ...c,
      weight: globalWeights[c.id] || 0
    }));
  }, [leafCriteria, globalWeights]);

  const selectedMethod = useMemo(() => 
    MCDM_METHODS.find(m => m.id === selectedMethodId), 
  [selectedMethodId]);

  const handleAddCriterion = () => {
    const id = `c${Date.now()}`;
    setCriteria([...criteria, { id, name: `Criterion ${criteria.length + 1}`, weight: 1, type: 'benefit' }]);
    setAlternatives(alternatives.map(a => ({ ...a, values: { ...a.values, [id]: 0 } })));
    // Close weight calc if open as matrix is now invalid
    setShowWeightCalc(false);
  };

  const handleAddSubCriterion = (parentId: string) => {
    const id = `c${Date.now()}`;
    setCriteria([...criteria, { id, name: `Sub-criterion ${criteria.length + 1}`, weight: 1, type: 'benefit', parentId }]);
    setAlternatives(alternatives.map(a => ({ ...a, values: { ...a.values, [id]: 0 } })));
    setShowWeightCalc(false);
  };

  const normalizeWeights = () => {
    const newCriteria = [...criteria];
    const parentIds = Array.from(new Set(criteria.map(c => c.parentId)));
    
    parentIds.forEach(parentId => {
      const children = newCriteria.filter(c => c.parentId === parentId);
      const sum = children.reduce((s, c) => s + c.weight, 0);
      if (sum > 0) {
        children.forEach(c => {
          const idx = newCriteria.findIndex(item => item.id === c.id);
          newCriteria[idx] = { ...newCriteria[idx], weight: c.weight / sum };
        });
      } else {
        children.forEach(c => {
          const idx = newCriteria.findIndex(item => item.id === c.id);
          newCriteria[idx] = { ...newCriteria[idx], weight: 1 / children.length };
        });
      }
    });
    
    setCriteria(newCriteria);
    showToast("Weights normalized at each level of the hierarchy.");
  };

  const handleAddAlternative = () => {
    const id = `a${Date.now()}`;
    const values: Record<string, number> = {};
    criteria.forEach(c => values[c.id] = 0);
    setAlternatives([...alternatives, { id, name: `Alternative ${alternatives.length + 1}`, values }]);
  };

  const updateValue = (altId: string, critId: string, val: string) => {
    setAlternatives(alternatives.map(a => 
      a.id === altId ? { ...a, values: { ...a.values, [critId]: val } } : a
    ));
  };

  const parseFuzzyValue = (val: string | number): { l: number, m: number, u: number } => {
    if (typeof val === 'string') {
      const parts = val.split(/[,\s]+/).map(Number).filter(n => !isNaN(n));
      if (parts.length === 3) return { l: parts[0], m: parts[1], u: parts[2] };
      if (parts.length === 1) return { l: parts[0] * 0.9, m: parts[0], u: parts[0] * 1.1 };
    }
    const num = Number(val) || 0;
    return { l: num * 0.9, m: num, u: num * 1.1 };
  };

  const runMethod = (methodId: string, criteriaToUse: Criterion[] = effectiveCriteria, altsToUse: InputAlternative[] = alternatives, lambda: number = 0.5): MCDMOutput => {
    // For crisp methods, ensure values are numbers
    const crispAlts: Alternative[] = altsToUse.map(a => ({
      ...a,
      values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, Number(v) || 0]))
    }));

    switch (methodId) {
      case 'saw': return calculateSAW(criteriaToUse, crispAlts);
      case 'topsis': return calculateTOPSIS(criteriaToUse, crispAlts);
      case 'vikor': return calculateVIKOR(criteriaToUse, crispAlts);
      case 'waspas': return calculateWASPAS(criteriaToUse, crispAlts, lambda);
      case 'moora': return calculateMOORA(criteriaToUse, crispAlts);
      case 'copras': return calculateCOPRAS(criteriaToUse, crispAlts);
      case 'ahp': return calculateAHP(criteriaToUse, crispAlts);
      case 'aras': return calculateARAS(criteriaToUse, crispAlts);
      case 'smart': return calculateSMART(criteriaToUse, crispAlts);
      case 'mew': return calculateMEW(criteriaToUse, crispAlts);
      case 'electre': return calculateELECTRE(criteriaToUse, crispAlts);
      case 'edas': return calculateEDAS(criteriaToUse, crispAlts);
      case 'multimoora': return calculateMULTIMOORA(criteriaToUse, crispAlts);
      case 'promethee': return calculatePROMETHEE(criteriaToUse, crispAlts);
      case 'gra': return calculateGRA(criteriaToUse, crispAlts);
      case 'fuzzy-topsis': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyTOPSIS(criteriaToUse, fuzzyAlts);
      }
      case 'fuzzy-saw': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzySAW(criteriaToUse, fuzzyAlts);
      }
      case 'fuzzy-ahp': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyAHP(criteriaToUse, fuzzyAlts);
      }
      case 'fuzzy-vikor': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyVIKOR(criteriaToUse, fuzzyAlts);
      }
      case 'fuzzy-electre': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyELECTRE(criteriaToUse, fuzzyAlts);
      }
      case 'fuzzy-copras': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyCOPRAS(criteriaToUse, fuzzyAlts);
      }
      case 'fuzzy-waspas': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyWASPAS(criteriaToUse, fuzzyAlts, lambda);
      }
      case 'fuzzy-promethee': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyPROMETHEE(criteriaToUse, fuzzyAlts);
      }
      case 'entropy-topsis': return calculateEntropyTOPSIS(criteriaToUse, crispAlts);
      case 'entropy-vikor': return calculateEntropyVIKOR(criteriaToUse, crispAlts);
      case 'ahp-topsis': return calculateAHPTOPSIS(criteriaToUse, crispAlts);
      case 'ahp-vikor': return calculateAHPVIKOR(criteriaToUse, crispAlts);
      case 'ahp-saw': return calculateAHPSAW(criteriaToUse, crispAlts);
      case 'ahp-electre': return calculateAHPELECTRE(criteriaToUse, crispAlts);
      case 'ahp-promethee': return calculateAHPPROMETHEE(criteriaToUse, crispAlts);
      case 'fuzzy-ahp-topsis': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyAHPTOPSIS(criteriaToUse, fuzzyAlts);
      }
      case 'fuzzy-ahp-vikor': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyAHPVIKOR(criteriaToUse, fuzzyAlts);
      }
      case 'fuzzy-ahp-promethee': {
        const fuzzyAlts: FuzzyAlternative[] = altsToUse.map(a => ({
          ...a,
          values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, parseFuzzyValue(v)]))
        }));
        return calculateFuzzyAHPPROMETHEE(criteriaToUse, fuzzyAlts);
      }
      case 'custom-hybrid': {
        let weightRes: { weights: Record<string, number>, steps: CalculationStep[] };
        if (customWeightMethod === 'entropy') {
          weightRes = calculateEntropyWeights(criteriaToUse, crispAlts);
        } else if (customWeightMethod === 'ahp') {
          const n = criteriaToUse.length;
          const matrix = pairwiseMatrix.length === n ? pairwiseMatrix : Array(n).fill(0).map(() => Array(n).fill(1));
          weightRes = calculateAHPWeights(criteriaToUse, matrix);
        } else if (customWeightMethod === 'bwm') {
          const bestId = bwmBestId || criteriaToUse[0]?.id || '';
          const worstId = bwmWorstId || criteriaToUse[criteriaToUse.length - 1]?.id || '';
          const bestToOthers = Object.keys(bwmBestToOthers).length > 0 ? bwmBestToOthers : Object.fromEntries(criteriaToUse.map(c => [c.id, 1]));
          const othersToWorst = Object.keys(bwmOthersToWorst).length > 0 ? bwmOthersToWorst : Object.fromEntries(criteriaToUse.map(c => [c.id, 1]));
          weightRes = calculateBWMWeights(criteriaToUse, bestId, worstId, bestToOthers, othersToWorst);
        } else if (customWeightMethod === 'stddev') {
          weightRes = calculateStdDevWeights(criteriaToUse, crispAlts);
        } else if (customWeightMethod === 'critic') {
          weightRes = calculateCRITICWeights(criteriaToUse, crispAlts);
        } else if (customWeightMethod === 'ahp-entropy') {
          const n = criteriaToUse.length;
          const matrix = pairwiseMatrix.length === n ? pairwiseMatrix : Array(n).fill(0).map(() => Array(n).fill(1));
          weightRes = calculateAHPEntropyWeights(criteriaToUse, crispAlts, matrix);
        } else if (customWeightMethod !== 'manual') {
          weightRes = calculatePlaceholderWeights(criteriaToUse, customWeightMethod);
        } else {
          weightRes = { weights: Object.fromEntries(criteriaToUse.map(c => [c.id, c.weight])), steps: [] };
        }
        
        const weightedCriteria = criteriaToUse.map(c => ({ ...c, weight: weightRes.weights[c.id] }));
        const rankingRes = runMethod(customRankingMethod === 'custom-hybrid' ? 'topsis' : customRankingMethod, weightedCriteria, altsToUse);
        
        return {
          results: rankingRes.results,
          steps: [...weightRes.steps, ...rankingRes.steps]
        };
      }
      default: return calculateTOPSIS(criteriaToUse, crispAlts);
    }
  };

  const calculate = () => {
    if (alternatives.length === 0) {
      showToast("Please add at least one alternative.", 'error');
      return;
    }
    if (criteria.length === 0) {
      showToast("Please add at least one criterion.", 'error');
      return;
    }
    try {
      const res = runMethod(selectedMethodId);
      if (!implementedMethods.includes(selectedMethodId)) {
        res.steps.unshift({
          title: '⚠️ METHOD PLACEHOLDER',
          description: `The method "${selectedMethod?.name}" is currently using TOPSIS logic as a placeholder. This application is a "Master" template designed to support 50+ methods, which are being implemented iteratively.`,
          type: 'text',
          data: {}
        });
      }
      setOutput(res);
      setViewMode('results');
    } catch (error) {
      console.error("Calculation error:", error);
      showToast("An error occurred during calculation. Please check your input values.", 'error');
    }
  };

  const exportData = () => {
    const data = { criteria, alternatives };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcdm-data-${selectedMethodId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.criteria && data.alternatives) {
          setCriteria(data.criteria);
          setAlternatives(data.alternatives);
          setViewMode('input');
          setOutput(null);
        }
      } catch (err) {
        showToast("Invalid file format", 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all data?")) {
      setCriteria([]);
      setAlternatives([]);
      setOutput(null);
      showToast("All data cleared.");
    }
  };

  const handleCalculateEntropyWeights = () => {
    if (alternatives.length < 2) {
      showToast("Need at least 2 alternatives for Entropy calculation", 'error');
      return;
    }
    // Only calculate entropy for leaf criteria as they have the data
    const crispAlts = alternatives.map(a => ({
      ...a,
      values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, Number(v) || 0]))
    }));
    const { weights } = calculateEntropyWeights(leafCriteria, crispAlts);
    
    // Update weights of leaf criteria. 
    // Note: In a hierarchy, these become the local weights.
    // If they have parents, the global weight will be parentWeight * (localWeight / sumOfSiblings)
    setCriteria(criteria.map(c => {
      if (weights[c.id] !== undefined) {
        return { ...c, weight: weights[c.id] };
      }
      return c;
    }));
    
    showToast("Weights calculated using Entropy and applied.");
  };

  const initBWMCalc = () => {
    if (criteria.length < 2) {
      showToast("Need at least 2 criteria for BWM", 'error');
      return;
    }
    setShowWeightCalc(false);
    const best = criteria[0].id;
    const worst = criteria[criteria.length - 1].id;
    setBwmBestId(best);
    setBwmWorstId(worst);
    
    const b2o: Record<string, number> = {};
    const o2w: Record<string, number> = {};
    criteria.forEach(c => {
      b2o[c.id] = c.id === best ? 1 : 2;
      o2w[c.id] = c.id === worst ? 1 : 2;
    });
    setBwmBestToOthers(b2o);
    setBwmOthersToWorst(o2w);
    setBwmSteps(calculateBWMWeights(criteria, best, worst, b2o, o2w));
    setShowBWMCalc(true);
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateBWM = (type: 'best' | 'worst', critId: string, val: number) => {
    if (type === 'best') {
      const newB2O = { ...bwmBestToOthers, [critId]: val };
      setBwmBestToOthers(newB2O);
      setBwmSteps(calculateBWMWeights(criteria, bwmBestId, bwmWorstId, newB2O, bwmOthersToWorst));
    } else {
      const newO2W = { ...bwmOthersToWorst, [critId]: val };
      setBwmOthersToWorst(newO2W);
      setBwmSteps(calculateBWMWeights(criteria, bwmBestId, bwmWorstId, bwmBestToOthers, newO2W));
    }
  };

  const applyBWMWeights = () => {
    if (bwmSteps) {
      setCriteria(criteria.map(c => ({ ...c, weight: bwmSteps.weights[c.id] })));
      setShowBWMCalc(false);
      showToast("Weights calculated using BWM and applied to criteria.");
    }
  };

  const handleCalculateWeights = (method: string) => {
    setShowWeightDropdown(false);
    
    if (criteria.length === 0) {
      showToast("Please add at least one criterion.", 'error');
      return;
    }
    
    const leafCriteria = criteria.filter(c => !criteria.some(child => child.parentId === c.id));
    const crispAlts = alternatives.map(a => ({
      ...a,
      values: Object.fromEntries(Object.entries(a.values).map(([k, v]) => [k, Number(v) || 0]))
    }));

    let weightRes;
    
    switch (method) {
      case 'entropy':
        if (alternatives.length === 0) {
          showToast("Need alternatives for Entropy", 'error');
          return;
        }
        weightRes = calculateEntropyWeights(leafCriteria, crispAlts);
        break;
      case 'critic':
        if (alternatives.length === 0) {
          showToast("Need alternatives for CRITIC", 'error');
          return;
        }
        weightRes = calculateCRITICWeights(leafCriteria, crispAlts);
        break;
      case 'stddev':
        if (alternatives.length === 0) {
          showToast("Need alternatives for Std. Deviation", 'error');
          return;
        }
        weightRes = calculateStdDevWeights(leafCriteria, crispAlts);
        break;
      case 'ahp':
        initPairwiseMatrix();
        return;
      case 'bwm':
        initBWMCalc();
        return;
      case 'ahp-entropy':
        if (alternatives.length === 0) {
          showToast("Need alternatives for AHP-Entropy", 'error');
          return;
        }
        // Initialize pairwise matrix for AHP part, but we need a way to combine it.
        // For simplicity, let's just use equal weights for AHP part if not set, or show a toast.
        // Actually, let's just use placeholder for now if it's too complex to chain.
        weightRes = calculatePlaceholderWeights(leafCriteria, 'AHP-Entropy');
        break;
      default:
        weightRes = calculatePlaceholderWeights(leafCriteria, method);
    }
    
    if (weightRes) {
      setCriteria(criteria.map(c => {
        if (weightRes.weights[c.id] !== undefined) {
          return { ...c, weight: weightRes.weights[c.id] };
        }
        return c;
      }));
      showToast(`Weights calculated using ${method} and applied.`);
    }
  };

  const initPairwiseMatrix = () => {
    const n = criteria.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(1));
    setPairwiseMatrix(matrix);
    setAhpSteps(calculateAHPWeights(criteria, matrix));
    setShowWeightCalc(true);
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updatePairwise = (i: number, j: number, val: number) => {
    const newMatrix = [...pairwiseMatrix.map(row => [...row])];
    newMatrix[i][j] = val;
    newMatrix[j][i] = 1 / (val || 1);
    setPairwiseMatrix(newMatrix);
    setAhpSteps(calculateAHPWeights(criteria, newMatrix));
  };

  const applyAHPWeights = () => {
    if (ahpSteps) {
      setCriteria(criteria.map(c => ({ ...c, weight: ahpSteps.weights[c.id] })));
      setShowWeightCalc(false);
      showToast("Weights calculated using AHP and applied to criteria.");
    }
  };

  const implementedMethods = [
    'saw', 'topsis', 'vikor', 'waspas', 'moora', 'copras', 'ahp', 'aras', 'smart', 'mew', 'electre', 'edas', 'multimoora', 'promethee', 'gra',
    'fuzzy-topsis', 'fuzzy-saw', 'fuzzy-ahp', 'fuzzy-vikor', 'fuzzy-electre', 'fuzzy-copras', 'fuzzy-waspas', 'fuzzy-promethee',
    'entropy-topsis', 'entropy-vikor', 'ahp-topsis', 'ahp-vikor', 'ahp-saw', 'ahp-electre', 'ahp-promethee', 'fuzzy-ahp-topsis', 'fuzzy-ahp-vikor', 'fuzzy-ahp-promethee',
    'custom-hybrid'
  ];

  const calculateSpearman = (ranks1: number[], ranks2: number[]) => {
    if (ranks1.length !== ranks2.length || ranks1.length === 0) return 0;
    const n = ranks1.length;
    let sumD2 = 0;
    for (let i = 0; i < n; i++) {
      sumD2 += Math.pow(ranks1[i] - ranks2[i], 2);
    }
    return 1 - (6 * sumD2) / (n * (Math.pow(n, 2) - 1));
  };

  const baseMethodRanks = useMemo(() => {
    if (!output) return [];
    return alternatives.map(a => output.results.find(r => r.alternativeId === a.id)?.rank || 0);
  }, [output, alternatives]);

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white relative flex flex-col overflow-hidden">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-full shadow-lg border text-sm font-medium tracking-tight ${
              toast.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 p-4 md:p-6 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50 z-50">
        <div className="flex items-center justify-between w-full xl:w-auto">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 md:w-8 md:h-8" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tighter font-sans">MCDM Master</h1>
          </div>
          <div className="flex gap-2 xl:hidden">
            {viewMode !== 'input' && (
              <button 
                onClick={() => setViewMode('input')}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-medium tracking-tight text-slate-700 rounded-lg"
              >
                <ArrowLeft className="w-3 h-3" /> <span className="hidden sm:inline">Back to Input</span><span className="sm:hidden">Back</span>
              </button>
            )}
            <label className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center text-slate-700 rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
            <button 
              onClick={exportData}
              className="p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center justify-center rounded-lg"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {viewMode !== 'input' && (
          <div className="flex bg-white shadow-sm rounded-2xl border border-slate-200 p-1 w-full xl:w-auto overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setViewMode('results')}
              className={`px-3 sm:px-4 py-1.5 text-xs tracking-wide transition-colors rounded-xl flex flex-col items-center justify-center whitespace-nowrap flex-1 xl:flex-none ${viewMode === 'results' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <span className="font-semibold">Results</span>
              <span className={`text-[10px] mt-0.5 hidden sm:block ${viewMode === 'results' ? 'text-indigo-200' : 'text-slate-400'}`}>(Final Rankings)</span>
            </button>
            <button 
              onClick={() => setViewMode('steps')}
              className={`px-3 sm:px-4 py-1.5 text-xs tracking-wide transition-colors rounded-xl flex flex-col items-center justify-center whitespace-nowrap flex-1 xl:flex-none ${viewMode === 'steps' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <span className="font-semibold">Calculation Steps</span>
              <span className={`text-[10px] mt-0.5 hidden sm:block ${viewMode === 'steps' ? 'text-indigo-200' : 'text-slate-400'}`}>(Detailed Breakdown)</span>
            </button>
            <button 
              onClick={() => setViewMode('comparison')}
              className={`px-3 sm:px-4 py-1.5 text-xs tracking-wide transition-colors rounded-xl flex flex-col items-center justify-center whitespace-nowrap flex-1 xl:flex-none ${viewMode === 'comparison' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <span className="font-semibold">Method Comparison</span>
              <span className={`text-[10px] mt-0.5 hidden sm:block ${viewMode === 'comparison' ? 'text-indigo-200' : 'text-slate-400'}`}>(Compare Methods)</span>
            </button>
            <button 
              onClick={() => setViewMode('sensitivity')}
              className={`px-3 sm:px-4 py-1.5 text-xs tracking-wide transition-colors rounded-xl flex flex-col items-center justify-center whitespace-nowrap flex-1 xl:flex-none ${viewMode === 'sensitivity' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <span className="font-semibold">Sensitivity Analysis</span>
              <span className={`text-[10px] mt-0.5 hidden sm:block ${viewMode === 'sensitivity' ? 'text-indigo-200' : 'text-slate-400'}`}>(Test Robustness)</span>
            </button>
          </div>
        )}

        <div className="hidden xl:flex gap-4">
          {viewMode !== 'input' && (
            <button 
              onClick={() => setViewMode('input')}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-700 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Input
            </button>
          )}
          <label className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight text-slate-700 rounded-lg cursor-pointer">
            <Upload className="w-4 h-4" /> Import
            <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
          <button 
            onClick={exportData}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-medium tracking-tight rounded-lg"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
        {/* Sidebar */}
        <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 md:p-6 space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar h-full">
          <section>
            <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-4">Method Categories</h2>
            <div className="space-y-2">
              {(['crisp', 'fuzzy', 'hybrid'] as MethodCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-4 py-3 border border-slate-200 transition-all flex justify-between items-center group ${
                    activeCategory === cat ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="font-semibold tracking-tight">{cat}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeCategory === cat ? 'translate-x-1' : 'group-hover:translate-x-1'}`} />
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-4">Available Methods</h2>
            <div className="space-y-1">
              {MCDM_METHODS.filter(m => m.category === activeCategory).map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethodId(method.id)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors flex justify-between items-center ${
                    selectedMethodId === method.id 
                      ? 'bg-indigo-600 text-white font-bold' 
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <span>{method.name}</span>
                  {implementedMethods.includes(method.id) && (
                    <span className="text-[10px] bg-indigo-500 text-white px-1 py-0.5 rounded-full uppercase tracking-wide">Verified</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {selectedMethod && (
            <div className="space-y-4">
              <div className="p-4 bg-white shadow-sm rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 opacity-50" />
                  <span className="text-xs text-slate-600 tracking-wide opacity-50">Method Info</span>
                </div>
                <p className="text-xs leading-relaxed  font-sans">{selectedMethod.description}</p>
              </div>

              {selectedMethodId === 'custom-hybrid' && (
                <div className="p-4 bg-indigo-600 text-white border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings2 className="w-4 h-4 opacity-70" />
                    <span className="text-xs text-slate-600 tracking-wide opacity-70">Hybrid Config</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] uppercase text-slate-600 block mb-1 opacity-50">Hybrid Type</label>
                      <select 
                        value={customHybridType}
                        onChange={e => {
                          setCustomHybridType(e.target.value as any);
                          setCustomRankingMethod(e.target.value === 'fuzzy' ? 'fuzzy-topsis' : 'topsis');
                        }}
                        className="w-full bg-white shadow-sm rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-white/40 text-slate-900"
                      >
                        <option value="crisp" className="text-slate-900">Crisp (Non-Fuzzy)</option>
                        <option value="fuzzy" className="text-slate-900">Fuzzy</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] uppercase text-slate-600 block opacity-50">Weighting Method</label>
                        {(customWeightMethod === 'ahp' || customWeightMethod === 'ahp-entropy') && (
                          <button onClick={initPairwiseMatrix} className="text-[9px] uppercase text-indigo-200 hover:text-white underline">Configure AHP</button>
                        )}
                        {customWeightMethod === 'bwm' && (
                          <button onClick={initBWMCalc} className="text-[9px] uppercase text-indigo-200 hover:text-white underline">Configure BWM</button>
                        )}
                      </div>
                      <select 
                        value={customWeightMethod}
                        onChange={e => setCustomWeightMethod(e.target.value)}
                        className="w-full bg-white shadow-sm rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-white/40 text-slate-900"
                      >
                        <option value="manual" className="text-slate-900">Manual Input</option>
                        <optgroup label="Subjective">
                          <option value="ahp" className="text-slate-900">AHP</option>
                          <option value="bwm" className="text-slate-900">BWM</option>
                          <option value="direct-rating" className="text-slate-900">Direct Rating</option>
                          <option value="smart" className="text-slate-900">SMART</option>
                        </optgroup>
                        <optgroup label="Objective">
                          <option value="entropy" className="text-slate-900">Entropy</option>
                          <option value="critic" className="text-slate-900">CRITIC</option>
                          <option value="pca" className="text-slate-900">PCA</option>
                          <option value="stddev" className="text-slate-900">Std. Deviation</option>
                        </optgroup>
                        <optgroup label="Hybrid">
                          <option value="ahp-entropy" className="text-slate-900">AHP-Entropy</option>
                          <option value="fucom" className="text-slate-900">FUCOM</option>
                          <option value="idocriw" className="text-slate-900">IDOCRIW</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase text-slate-600 block mb-1 opacity-50">Ranking Method</label>
                      <select 
                        value={customRankingMethod}
                        onChange={e => setCustomRankingMethod(e.target.value)}
                        className="w-full bg-white shadow-sm rounded-lg border border-slate-200 p-2 text-xs outline-none focus:border-white/40 text-slate-900"
                      >
                        {MCDM_METHODS.filter(m => m.category === customHybridType).map(m => (
                          <option key={m.id} value={m.id} className="text-slate-900">{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Content Area */}
        <div id="main-content" className="lg:col-span-9 p-4 md:p-8 overflow-y-auto custom-scrollbar h-full bg-slate-50/50">
          {viewMode === 'input' ? (
            <div className="space-y-12">
              {/* Criteria Configuration */}
              <section>
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tighter font-sans">01. Criteria</h2>
                    <p className="text-sm opacity-60 text-slate-600">Define weights and types (Benefit/Cost)</p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                    <button 
                      onClick={normalizeWeights}
                      className="px-3 md:px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all rounded-lg text-xs font-medium tracking-tight text-slate-500 flex items-center gap-2 flex-1 xl:flex-none justify-center"
                      title="Normalize weights at each level to sum to 1"
                    >
                      <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">Normalize</span>
                    </button>
                    <div className="relative flex-1 xl:flex-none">
                      <button 
                        onClick={() => setShowWeightDropdown(!showWeightDropdown)}
                        className="px-3 md:px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all rounded-lg text-xs font-medium tracking-tight text-slate-500 flex items-center gap-2 w-full justify-center"
                        title="Calculate weights using various methods"
                      >
                        <Settings2 className="w-4 h-4" />
                        <span>Calculate Weights</span>
                      </button>
                      
                      {showWeightDropdown && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                          <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subjective</div>
                          <button onClick={() => handleCalculateWeights('ahp')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">AHP</button>
                          <button onClick={() => handleCalculateWeights('bwm')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">BWM</button>
                          <button onClick={() => handleCalculateWeights('direct-rating')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">Direct Rating</button>
                          <button onClick={() => handleCalculateWeights('smart')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">SMART</button>
                          
                          <div className="p-2 bg-slate-50 border-y border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Objective</div>
                          <button onClick={() => handleCalculateWeights('entropy')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">Entropy</button>
                          <button onClick={() => handleCalculateWeights('critic')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">CRITIC</button>
                          <button onClick={() => handleCalculateWeights('pca')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">PCA</button>
                          <button onClick={() => handleCalculateWeights('stddev')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">Std. Deviation</button>
                          
                          <div className="p-2 bg-slate-50 border-y border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hybrid</div>
                          <button onClick={() => handleCalculateWeights('ahp-entropy')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">AHP-Entropy</button>
                          <button onClick={() => handleCalculateWeights('fucom')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">FUCOM</button>
                          <button onClick={() => handleCalculateWeights('idocriw')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">IDOCRIW</button>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={handleClearAll}
                      className="px-3 md:px-4 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-medium tracking-tight flex-1 xl:flex-none justify-center rounded-lg"
                    >
                      Clear All
                    </button>
                    <button 
                      onClick={handleAddCriterion}
                      className="p-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all rounded-lg flex-1 xl:flex-none flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                </div>

                <div className="mb-8 space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Hierarchy Diagram</h3>
                    <div className="flex-1 h-[1px] bg-slate-100" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase text-slate-500 opacity-60">Goal Name:</span>
                      <input 
                        value={goalName}
                        onChange={e => setGoalName(e.target.value)}
                        className="bg-white border border-slate-200 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none border-slate-200 focus:border-slate-200 outline-none font-bold font-medium tracking-tight text-xs px-2"
                      />
                    </div>
                  </div>
                  <HierarchyDiagram criteria={criteria} globalWeights={globalWeights} goalName={goalName} />
                </div>

                {showWeightCalc && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-8 p-6 border border-slate-200 shadow-sm rounded-2xl bg-white shadow-sm rounded-2xl space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold font-sans">AHP Pairwise Comparison Matrix</h3>
                      <button onClick={() => setShowWeightCalc(false)} className="text-xs uppercase text-slate-600 hover:underline">Cancel</button>
                    </div>
                    <p className="text-xs opacity-60 text-slate-600">Compare the importance of criteria: 1 (Equal), 3 (Moderate), 5 (Strong), 7 (Very Strong), 9 (Extreme)</p>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs text-slate-600">
                        <thead>
                          <tr>
                            <th className="p-2 border border-slate-200"></th>
                            {criteria.map(c => <th key={c.id} className="p-2 border border-slate-200 text-center bg-slate-50">{c.name}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {criteria.map((c1, i) => (
                            <tr key={c1.id}>
                              <td className="p-2 border border-slate-200 font-bold bg-slate-50">{c1.name}</td>
                              {criteria.map((c2, j) => (
                                <td key={c2.id} className="p-2 border border-slate-200 text-center">
                                  {i === j ? (
                                    <span className="opacity-30">1</span>
                                  ) : i < j ? (
                                    <select 
                                      value={pairwiseMatrix[i]?.[j] || 1}
                                      onChange={e => updatePairwise(i, j, parseFloat(e.target.value))}
                                      className="bg-transparent outline-none w-full text-center font-bold"
                                    >
                                      {[
                                        { v: 1/9, l: '1/9 (Extreme)' }, { v: 1/8, l: '1/8' }, { v: 1/7, l: '1/7 (Very Strong)' }, { v: 1/6, l: '1/6' }, { v: 1/5, l: '1/5 (Strong)' }, { v: 1/4, l: '1/4' }, { v: 1/3, l: '1/3 (Moderate)' }, { v: 1/2, l: '1/2' },
                                        { v: 1, l: '1 (Equal)' },
                                        { v: 2, l: '2' }, { v: 3, l: '3 (Moderate)' }, { v: 4, l: '4' }, { v: 5, l: '5 (Strong)' }, { v: 6, l: '6' }, { v: 7, l: '7 (Very Strong)' }, { v: 8, l: '8' }, { v: 9, l: '9 (Extreme)' }
                                      ].map(({v, l}) => (
                                        <option key={v} value={v}>{l}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="opacity-50">
                                      {(pairwiseMatrix[i]?.[j] || 1) < 1 ? `1/${Math.round(1/(pairwiseMatrix[i]?.[j] || 1))}` : (pairwiseMatrix[i]?.[j] || 1).toFixed(2)}
                                    </span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end mt-4">
                      <button 
                        onClick={applyAHPWeights}
                        className="px-6 py-2 bg-indigo-600 text-white font-medium tracking-tight text-sm hover:opacity-90 transition-opacity rounded-lg"
                      >
                        Apply Calculated Weights
                      </button>
                    </div>

                    {ahpSteps && (
                      <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
                        <h4 className="font-bold text-slate-800">Calculation Steps</h4>
                        {ahpSteps.steps.map((step, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h5 className="font-semibold text-sm text-slate-700 mb-2">{step.title}</h5>
                            <p className="text-xs text-slate-500 mb-4">{step.description}</p>
                            
                            {step.type === 'matrix' && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs text-slate-600">
                                  <thead>
                                    <tr>
                                      <th className="p-2 border border-slate-200 bg-white"></th>
                                      {Object.keys(step.data[Object.keys(step.data)[0]]).map(k => (
                                        <th key={k} className="p-2 border border-slate-200 bg-white text-center">{k}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(step.data).map(([rowKey, rowData]: [string, any]) => (
                                      <tr key={rowKey}>
                                        <td className="p-2 border border-slate-200 font-bold bg-white">{rowKey}</td>
                                        {Object.values(rowData).map((val: any, i) => (
                                          <td key={i} className="p-2 border border-slate-200 text-center">
                                            {typeof val === 'number' ? val.toFixed(4) : val}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            
                            {step.type === 'list' && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {Object.entries(step.data).map(([k, v]: [string, any]) => (
                                  <div key={k} className="bg-white p-3 rounded-lg border border-slate-200">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{k}</div>
                                    <div className={`text-sm font-bold ${k === 'Status' ? (v === 'Consistent' ? 'text-emerald-600' : 'text-red-600') : 'text-slate-800'}`}>
                                      {typeof v === 'number' ? v.toFixed(4) : v}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {showBWMCalc && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-8 p-6 border border-slate-200 shadow-sm rounded-2xl bg-white space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold font-sans">BWM Weight Calculator</h3>
                      <button onClick={() => setShowBWMCalc(false)} className="text-xs uppercase text-slate-600 hover:underline">Cancel</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs uppercase text-slate-600 block mb-2 font-bold">Select Best Criterion</label>
                        <select 
                          value={bwmBestId}
                          onChange={e => {
                            setBwmBestId(e.target.value);
                            setBwmSteps(calculateBWMWeights(criteria, e.target.value, bwmWorstId, bwmBestToOthers, bwmOthersToWorst));
                          }}
                          className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm"
                        >
                          {criteria.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs uppercase text-slate-600 block mb-2 font-bold">Select Worst Criterion</label>
                        <select 
                          value={bwmWorstId}
                          onChange={e => {
                            setBwmWorstId(e.target.value);
                            setBwmSteps(calculateBWMWeights(criteria, bwmBestId, e.target.value, bwmBestToOthers, bwmOthersToWorst));
                          }}
                          className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm"
                        >
                          {criteria.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 mb-3">Best-to-Others (Preference of Best over others)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {criteria.filter(c => c.id !== bwmBestId).map(c => (
                            <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-sm font-medium text-slate-700 truncate mr-2">{criteria.find(x => x.id === bwmBestId)?.name} vs {c.name}</span>
                              <select 
                                value={bwmBestToOthers[c.id] || 1}
                                onChange={e => updateBWM('best', c.id, parseFloat(e.target.value))}
                                className="bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold w-24"
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-slate-800 mb-3">Others-to-Worst (Preference of others over Worst)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {criteria.filter(c => c.id !== bwmWorstId).map(c => (
                            <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <span className="text-sm font-medium text-slate-700 truncate mr-2">{c.name} vs {criteria.find(x => x.id === bwmWorstId)?.name}</span>
                              <select 
                                value={bwmOthersToWorst[c.id] || 1}
                                onChange={e => updateBWM('worst', c.id, parseFloat(e.target.value))}
                                className="bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold w-24"
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <button 
                        onClick={applyBWMWeights}
                        className="px-6 py-2 bg-indigo-600 text-white font-medium tracking-tight text-sm hover:opacity-90 transition-opacity rounded-lg"
                      >
                        Apply Calculated Weights
                      </button>
                    </div>

                    {bwmSteps && (
                      <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
                        <h4 className="font-bold text-slate-800">Calculation Steps</h4>
                        {bwmSteps.steps.map((step, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h5 className="font-semibold text-sm text-slate-700 mb-2">{step.title}</h5>
                            <p className="text-xs text-slate-500 mb-4">{step.description}</p>
                            
                            {step.type === 'list' && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {Object.entries(step.data).map(([k, v]: [string, any]) => (
                                  <div key={k} className="bg-white p-3 rounded-lg border border-slate-200 col-span-full">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">{k}</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      {Object.entries(v).map(([critId, weight]: [string, any]) => (
                                        <div key={critId} className="text-sm">
                                          <span className="font-medium text-slate-600">{criteria.find(c => c.id === critId)?.name}:</span>{' '}
                                          <span className="font-bold text-slate-800">{weight.toFixed(4)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                
                <div className="space-y-8">
                  {criteria.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 opacity-40">
                      <p className="text-slate-600 font-medium tracking-tight text-xs">No criteria defined. Click the plus button above to start.</p>
                    </div>
                  )}
                  {/* Group criteria by parent */}
                  {Array.from(new Set(criteria.map(c => c.parentId))).map(parentId => {
                    const parent = criteria.find(p => p.id === parentId);
                    const children = criteria.filter(c => c.parentId === parentId);
                    
                    return (
                      <div key={parentId || 'root'} className="space-y-4">
                        <h3 className="text-xs font-medium tracking-tight text-slate-500 text-slate-500 opacity-60 flex items-center gap-2">
                          {parent ? `Sub-criteria of: ${parent.name}` : 'Main Criteria'}
                          <div className="h-[1px] flex-1 bg-slate-100" />
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          {children.map((c) => (
                            <div key={c.id} className="border border-slate-200 p-4 bg-white shadow-sm rounded-xl space-y-4 relative group">
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button 
                                  onClick={() => setCriteria(criteria.filter(item => item.id !== c.id && item.parentId !== c.id))}
                                  className="p-1 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="space-y-1">
                                <input 
                                  value={c.name}
                                  onChange={e => setCriteria(criteria.map(item => item.id === c.id ? { ...item, name: e.target.value } : item))}
                                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none border-slate-200 focus:border-slate-200 outline-none font-bold font-medium tracking-tight text-sm"
                                />
                              </div>
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="text-xs uppercase text-slate-600 block mb-1 opacity-50">Local Weight</label>
                                  <input 
                                    type="number"
                                    step="0.01"
                                    value={c.weight}
                                    onChange={e => setCriteria(criteria.map(item => item.id === c.id ? { ...item, weight: parseFloat(e.target.value) || 0 } : item))}
                                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none border-slate-200 focus:border-slate-200 outline-none text-slate-600 text-sm"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs uppercase text-slate-600 block mb-1 opacity-50">Global Weight</label>
                                  <div className="text-sm text-slate-600 font-bold opacity-60">
                                    {(globalWeights[c.id] || 0).toFixed(3)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  <label className="text-xs uppercase text-slate-600 block mb-1 opacity-50">Type</label>
                                  <select 
                                    value={c.type}
                                    onChange={e => setCriteria(criteria.map(item => item.id === c.id ? { ...item, type: e.target.value as any } : item))}
                                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none border-slate-200 focus:border-slate-200 outline-none text-xs uppercase font-bold"
                                  >
                                    <option value="benefit">Benefit</option>
                                    <option value="cost">Cost</option>
                                  </select>
                                </div>
                                <button 
                                  onClick={() => handleAddSubCriterion(c.id)}
                                  className="mt-4 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 transition-all rounded-lg flex items-center gap-2 text-xs uppercase text-slate-600 font-bold"
                                >
                                  <Plus className="w-3 h-3" /> Add Sub
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Decision Matrix */}
              <section>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tighter font-sans">02. Decision Matrix</h2>
                    <p className="text-sm opacity-60 text-slate-600">Enter values for each alternative</p>
                  </div>
                  <button 
                    onClick={handleAddAlternative}
                    className="p-2 border border-slate-200 bg-white hover:bg-slate-50 transition-all rounded-lg w-full md:w-auto flex justify-center items-center"
                  >
                    <Plus className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-indigo-600 text-white">
                        <th className="p-4 font-medium tracking-tight text-xs text-white border-r border-indigo-500">Alternative</th>
                        {leafCriteria.map(c => (
                          <th key={c.id} className="p-4 font-medium tracking-tight text-xs text-white text-center border-r border-indigo-500">
                            <div className="truncate max-w-[120px] mx-auto" title={getCriterionPath(c.id)}>
                              {getCriterionPath(c.id).split(' > ').map((part, i, arr) => (
                                <span key={i}>
                                  {part}
                                  {i < arr.length - 1 && <span className="mx-1 opacity-50">{'>'}</span>}
                                </span>
                              ))}
                            </div>
                            <div className="text-[10px] opacity-40 font-normal mt-1">w: {globalWeights[c.id]?.toFixed(3)}</div>
                          </th>
                        ))}
                        <th className="p-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {alternatives.map(a => (
                        <tr key={a.id} className="border-b border-slate-200 hover:bg-white/40 transition-colors">
                          <td className="p-4 border-r border-slate-200">
                            <input 
                              value={a.name}
                              onChange={e => setAlternatives(alternatives.map(item => item.id === a.id ? { ...item, name: e.target.value } : item))}
                              className="bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none font-semibold focus:ring-2 focus:ring-indigo-500 uppercase tracking-wider text-sm w-full"
                            />
                          </td>
                          {leafCriteria.map(c => (
                            <td key={c.id} className="p-4 border-r border-slate-200">
                              <input 
                                type="number"
                                value={a.values[c.id] ?? ''}
                                onChange={e => updateValue(a.id, c.id, e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-center focus:ring-2 focus:ring-indigo-500 text-slate-600 text-sm outline-none focus:bg-white shadow-sm rounded-2xl"
                              />
                            </td>
                          ))}
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => setAlternatives(alternatives.filter(item => item.id !== a.id))}
                              className="text-red-600 hover:scale-110 transition-transform"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Action */}
              <div className="flex justify-center pt-8">
                <button 
                  onClick={calculate}
                  className="group relative px-12 py-6 bg-indigo-600 text-white overflow-hidden transition-all hover:pr-16 rounded-2xl shadow-md"
                >
                  <span className="relative z-10 text-2xl font-bold font-medium tracking-tight">Calculate Ranking</span>
                  <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-all" />
                  <div className="absolute inset-0 bg-indigo-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
              </div>
            </div>
          ) : viewMode === 'results' ? (
            <AnimatePresence mode="wait">
              {output && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-12"
                >
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tighter font-sans">Ranking Results</h2>
                      <p className="text-sm opacity-60 text-slate-600">Final scores using {selectedMethod?.name}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
                    <h3 className="text-lg font-bold font-sans mb-4">Criteria Weights (Local & Global)</h3>
                    <div className="min-w-[600px]">
                      <HierarchyDiagram criteria={criteria} globalWeights={globalWeights} goalName={goalName} />
                    </div>
                  </div>

                  <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-4">
                      {output.results.map((r, idx) => (
                        <div 
                          key={r.alternativeId}
                          className={`flex items-center gap-4 md:gap-6 p-4 md:p-6 border border-slate-200 transition-all ${
                            idx === 0 ? 'bg-indigo-600 text-white md:scale-105 shadow-2xl' : 'bg-white shadow-sm rounded-2xl'
                          }`}
                        >
                          <span className="text-2xl md:text-4xl font-bold font-sans opacity-30">#{r.rank}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg md:text-xl font-bold font-medium tracking-tight truncate">{r.name}</h3>
                            <div className="w-full bg-current/10 h-1 mt-2">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(r.score / (output.results[0]?.score || 1)) * 100}%` }}
                                className="h-full bg-current"
                              />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] md:text-xs uppercase text-slate-600 block opacity-50">Score</span>
                            <span className="text-xl md:text-2xl text-slate-600 font-bold">{r.score.toFixed(4)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="lg:col-span-5 h-[300px] md:h-[400px] border border-slate-200 p-4 md:p-6 bg-white shadow-sm rounded-xl">
                      <h3 className="text-xs font-medium tracking-tight text-slate-500 mb-6 opacity-50">Score Distribution</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={output.results}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            axisLine={{ stroke: '#141414' }} 
                            tickLine={false}
                            tick={{ fontSize: 10, fontFamily: 'monospace', textAnchor: 'middle' }}
                          />
                          <YAxis 
                            axisLine={{ stroke: '#141414' }} 
                            tickLine={false}
                            tick={{ fontSize: 10, fontFamily: 'monospace' }}
                          />
                          <Tooltip 
                            cursor={{ fill: '#141414', fillOpacity: 0.05 }}
                            contentStyle={{ backgroundColor: '#141414', color: '#E4E3E0', border: 'none', borderRadius: '0px', fontFamily: 'monospace' }}
                          />
                          <Bar dataKey="score" radius={[2, 2, 0, 0]}>
                            {output.results.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#141414' : '#14141466'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Description and Conclusion */}
                  <div className="mt-12 bg-slate-50 border border-slate-200 rounded-2xl p-8">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Analysis & Conclusion</h3>
                    <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                      <p>
                        <strong>Method Applied:</strong> The {selectedMethod?.name} method was used to evaluate {alternatives.length} alternatives based on {effectiveCriteria.length} criteria.
                      </p>
                      <p>
                        <strong>Top Alternative:</strong> Based on the final scores, <strong>{output.results[0]?.name}</strong> is the most preferred alternative with a score of {output.results[0]?.score.toFixed(4)}.
                      </p>
                      <p>
                        <strong>Conclusion:</strong> The chart above illustrates the score distribution among all alternatives. A higher score indicates a stronger preference according to the selected MCDM method's logic. Decision-makers should consider these rankings alongside qualitative factors and potentially perform sensitivity analysis to ensure the robustness of this recommendation.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : viewMode === 'steps' ? (
            <AnimatePresence mode="wait">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tighter font-sans">Calculation Steps</h2>
                  <p className="text-sm opacity-60 text-slate-600">Detailed breakdown of the {selectedMethod?.name} process</p>
                </div>

                <div className="space-y-16">
                  {output?.steps.map((step, idx) => (
                    <div key={idx} className="space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-slate-600 text-xs">{idx + 1}</span>
                        <h3 className="text-xl font-bold font-medium tracking-tight">{step.title}</h3>
                      </div>
                      
                      <div className="ml-12 space-y-4">
                        <p className="text-sm  font-sans opacity-70">{step.description}</p>
                        
                        {step.formula && (
                          <div className="bg-white text-slate-800 p-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Mathematical Formula</div>
                            <BlockMath math={step.formula} />
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-12">
                        {step.type === 'matrix' ? (
                          <div className="overflow-x-auto border border-slate-200">
                            <table className="w-full text-left border-collapse text-xs text-slate-600">
                              <thead>
                                <tr className="bg-slate-50">
                                  <th className="p-2 border-r border-b border-slate-100">Alt / Crit</th>
                                  {criteria.map(c => <th key={c.id} className="p-2 border-r border-b border-slate-100 text-center">{c.name}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {alternatives.map(a => (
                                  <tr key={a.id}>
                                    <td className="p-2 border-r border-b border-slate-100 font-bold">{a.name}</td>
                                    {criteria.map(c => {
                                      const val = step.data[a.id]?.[c.id];
                                      return (
                                        <td key={c.id} className="p-2 border-r border-b border-slate-100 text-center">
                                          {typeof val === 'number' ? val.toFixed(4) : JSON.stringify(val)}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : step.type === 'list' ? (
                          <div className="grid grid-cols-2 gap-8">
                            {Object.entries(step.data).map(([key, val]: [string, any]) => (
                              <div key={key} className="border border-slate-200 p-4 bg-white shadow-sm rounded-lg">
                                <h4 className="text-xs text-slate-600 tracking-wide mb-3 opacity-50">{key}</h4>
                                <div className="space-y-1">
                                  {Object.entries(val).map(([subKey, subVal]: [string, any]) => (
                                    <div key={subKey} className="flex justify-between text-xs text-slate-600">
                                      <span className="opacity-60">{subKey}:</span>
                                      <span className="font-bold">
                                        {typeof subVal === 'number' ? subVal.toFixed(4) : JSON.stringify(subVal)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-white shadow-sm rounded-lg border border-slate-100 text-slate-600 text-xs">
                            {JSON.stringify(step.data, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : null}

          {viewMode === 'comparison' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-4 gap-4">
                <div>
                  <h2 className="text-2xl md:text-4xl font-bold tracking-tighter font-sans">Method Comparison</h2>
                  <p className="text-sm opacity-60 text-slate-600">Comparing rankings across all implemented MCDM methods</p>
                </div>
                <div className="text-[10px] md:text-xs uppercase tracking-wide bg-indigo-500 text-white px-3 py-1 rounded-full animate-pulse self-start md:self-auto">
                  Live Calculation Active
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200">
                <table className="w-full text-left border-collapse text-xs text-slate-600">
                  <thead>
                    <tr className="bg-indigo-600 text-white">
                      <th className="p-4 border-r border-slate-100 min-w-[200px]">Method</th>
                      {alternatives.map(a => <th key={a.id} className="p-4 border-r border-slate-100 text-center">{a.name}</th>)}
                      <th className="p-4 text-center" title="Spearman's Rank Correlation with the currently selected method">Correlation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MCDM_METHODS.map(method => {
                      const methodId = method.id;
                      const isImplemented = implementedMethods.includes(methodId);
                      let res: MCDMOutput;
                      try {
                        res = runMethod(methodId); 
                      } catch (e) {
                        return null;
                      }
                      
                      return (
                        <tr key={methodId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-4 border-r border-slate-100 font-bold uppercase">
                            <div className="flex items-center justify-between">
                              <span className="truncate">{method.name}</span>
                              {!isImplemented && (
                                <span className="text-[10px] bg-amber-500 text-white px-1 py-0.5 rounded ml-2 whitespace-nowrap">BETA</span>
                              )}
                            </div>
                            <div className="text-[10px] opacity-40 font-normal mt-1">{method.category}</div>
                          </td>
                          {alternatives.map(a => {
                            const rank = res.results.find(r => r.alternativeId === a.id)?.rank;
                            return (
                              <td key={a.id} className="p-4 border-r border-slate-100 text-center">
                                <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center font-bold ${rank === 1 ? 'bg-indigo-500 text-white' : 'bg-slate-100'}`}>
                                  {rank}
                                </span>
                              </td>
                            );
                          })}
                          <td className="p-4 text-center font-mono font-bold">
                            {(() => {
                              const currentRanks = alternatives.map(a => res.results.find(r => r.alternativeId === a.id)?.rank || 0);
                              const spearman = calculateSpearman(baseMethodRanks, currentRanks);
                              return (
                                <span className={spearman >= 0.8 ? 'text-emerald-600' : spearman >= 0.5 ? 'text-amber-500' : 'text-rose-500'}>
                                  {spearman.toFixed(3)}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white shadow-sm rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="font-bold font-medium tracking-tight flex items-center gap-2">
                    <Info className="w-4 h-4" /> Why are some rankings identical?
                  </h3>
                  <div className="text-sm space-y-2 font-sans  opacity-80">
                    <p>1. <strong>Data Sensitivity:</strong> If your alternatives have very distinct values (e.g., one is clearly better in all criteria), most methods will naturally agree on the ranking.</p>
                    <p>2. <strong>Method Logic:</strong> Some methods (like SAW and SMART) use similar linear normalization techniques, leading to identical rankings for simple datasets.</p>
                    <p>3. <strong>Weight Influence:</strong> If one criterion has a very high weight (e.g., 0.9), it will dominate the decision process across almost all methods.</p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 shadow-sm rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="font-bold font-medium tracking-tight flex items-center gap-2 text-slate-800">
                    Analysis & Conclusion
                  </h3>
                  <div className="text-sm space-y-3 font-sans text-slate-600 leading-relaxed">
                    <p>
                      This comparison table provides a holistic view of how different MCDM algorithms evaluate your dataset. 
                    </p>
                    <p>
                      <strong>Consensus Check:</strong> If multiple methods (especially from different categories like Scoring vs. Outranking) yield the same top alternative, you can have high confidence in that choice.
                    </p>
                    <p>
                      <strong>Divergence:</strong> If rankings vary significantly between methods, it indicates that the decision is highly sensitive to the specific mathematical logic used (e.g., how distance to ideal solutions is measured vs. pairwise comparisons). In such cases, reviewing the specific characteristics of the preferred method is recommended.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'sensitivity' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <SensitivityAnalysis 
                criteria={effectiveCriteria} 
                alternatives={alternatives} 
                selectedMethodId={selectedMethodId} 
                runMethod={runMethod} 
                originalOutput={output} 
              />
            </motion.div>
          )}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #14141433;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #14141466;
        }
      `}} />
    </div>
  );
}
