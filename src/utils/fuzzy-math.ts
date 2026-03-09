import { FuzzyNumber } from '../types/mcdm';

export const FuzzyMath = {
  add: (a: FuzzyNumber, b: FuzzyNumber): FuzzyNumber => ({
    l: a.l + b.l,
    m: a.m + b.m,
    u: a.u + b.u
  }),
  
  subtract: (a: FuzzyNumber, b: FuzzyNumber): FuzzyNumber => ({
    l: a.l - b.u,
    m: a.m - b.m,
    u: a.u - b.l
  }),

  multiply: (a: FuzzyNumber, b: FuzzyNumber): FuzzyNumber => ({
    l: a.l * b.l,
    m: a.m * b.m,
    u: a.u * b.u
  }),

  multiplyScalar: (a: FuzzyNumber, s: number): FuzzyNumber => ({
    l: a.l * s,
    m: a.m * s,
    u: a.u * s
  }),

  divideScalar: (a: FuzzyNumber, s: number): FuzzyNumber => ({
    l: a.l / s,
    m: a.m / s,
    u: a.u / s
  }),

  defuzzify: (a: FuzzyNumber): number => (a.l + 4 * a.m + a.u) / 6,

  distance: (a: FuzzyNumber, b: FuzzyNumber): number => {
    return Math.sqrt((1/3) * (Math.pow(a.l - b.l, 2) + Math.pow(a.m - b.m, 2) + Math.pow(a.u - b.u, 2)));
  }
};
