
export type CriterionType = 'benefit' | 'cost';

export interface Criterion {
  id: string;
  name: string;
  weight: number;
  type: CriterionType;
  parentId?: string;
  children?: Criterion[];
}

export interface InputAlternative {
  id: string;
  name: string;
  values: Record<string, number | string>; // criterionId -> value
}

export interface Alternative {
  id: string;
  name: string;
  values: Record<string, number>; // criterionId -> value
}

export interface FuzzyNumber {
  l: number;
  m: number;
  u: number;
}

export interface FuzzyAlternative {
  id: string;
  name: string;
  values: Record<string, FuzzyNumber>;
}

export interface CalculationStep {
  title: string;
  description: string;
  formula?: string;
  type: 'matrix' | 'text' | 'list';
  data: any;
}

export interface MCDMResult {
  alternativeId: string;
  name: string;
  score: number;
  rank: number;
}

export interface MCDMOutput {
  results: MCDMResult[];
  steps: CalculationStep[];
}

export type MethodCategory = 'crisp' | 'fuzzy' | 'hybrid';

export interface MethodDefinition {
  id: string;
  name: string;
  category: MethodCategory;
  description: string;
}
