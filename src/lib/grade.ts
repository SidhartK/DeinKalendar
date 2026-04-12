export type LetterGrade =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "D-"
  | "F";

export type GradeInputs = {
  /** Empty-board solutions available for the date. */
  initialSolutions: number;
  /** “Show # of solutions possible” (distinct board positions). */
  hintsUsedCount: number;
  /** “Show # of Coverings per Square” clicks. */
  shadowShowCount: number;
  /** Unique squares revealed via coverings popover. */
  coveringsSquaresViewedCount: number;
  /** Optional: wall time in minutes. Not used by default. */
  timeMinutes?: number;
};

export type GradeConfig = {
  /** Typical okay run score target; aim near B-. */
  BASE: number;
  /** Reference scale for solution-count normalization. */
  S0: number;
  /** Ease-of-day multiplier strength. 0 disables using initialSolutions. */
  kS: number;
  /** Assist weights (ordered: hint < shadow < reveal). */
  wHint: number;
  wShadow: number;
  wReveal: number;
  /**
   * If provided (>0), reveal term uses log1p(reveals / R0) instead of log1p(reveals).
   * Useful if you want “1 reveal” to behave more linearly while still damping.
   */
  revealR0?: number;
  /** Optional time weight; if 0/undefined, time is ignored. */
  wTime?: number;
  /** Clamp bounds. */
  minScore: number;
  maxScore: number;
  empiricalBase: number;
  empiricalScale: number;
  normalizationBase: number;
  normalizationScale: number;
  /** Letter cutoffs in descending score order. */
  cutoffs: { minScore: number; letter: LetterGrade }[];
};

export const DEFAULT_GRADE_CONFIG: GradeConfig = {
  BASE: 82,
  S0: 5000,
  kS: 0.35,

  // From equivalence: 6 hints ≈ 2 shadow toggles ≈ 1 square reveal.
  wReveal: 1.0,
  wShadow: 0.5,
  wHint: 1 / 8,

  // Optional. Leave undefined to ignore time by default.
  wTime: 0,

  minScore: 0,
  maxScore: 100,
  empiricalBase: 79.5,
  empiricalScale: 0.72,
  normalizationBase: 83.5,
  normalizationScale: 4.32,
  // Simple US-style bands. Tune by calibration, not by hidden transforms.
  cutoffs: [
    { minScore: 97, letter: "A+" },
    { minScore: 93, letter: "A" },
    { minScore: 90, letter: "A-" },
    { minScore: 87, letter: "B+" },
    { minScore: 83, letter: "B" },
    { minScore: 80, letter: "B-" },
    { minScore: 77, letter: "C+" },
    { minScore: 73, letter: "C" },
    { minScore: 70, letter: "C-" },
    { minScore: 67, letter: "D+" },
    { minScore: 63, letter: "D" },
    { minScore: 60, letter: "D-" },
    { minScore: 0, letter: "F" },
  ],
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function log1p(n: number): number {
  return Math.log(1 + n);
}

export function easeFactor(
  initialSolutions: number,
  config: Pick<GradeConfig, "S0" | "kS">
): number {
  const S = Math.max(0, initialSolutions);
  const S0 = Math.max(1, config.S0);
  const kS = config.kS;
  if (!Number.isFinite(kS) || kS <= 0) return 1;
  return 1 + kS * log1p(S / S0);
}

export function assistCost(
  inputs: Pick<
    GradeInputs,
    "hintsUsedCount" | "shadowShowCount" | "coveringsSquaresViewedCount"
  >,
  config: Pick<GradeConfig, "wHint" | "wShadow" | "wReveal" | "revealR0">
): number {
  const hints = Math.max(0, inputs.hintsUsedCount);
  const shadow = Math.max(0, inputs.shadowShowCount);
  const reveals = Math.max(0, inputs.coveringsSquaresViewedCount);

  const revealR0 =
    config.revealR0 != null && config.revealR0 > 0 ? config.revealR0 : null;
  const revealTerm = revealR0 ? log1p(reveals / revealR0) : log1p(reveals);

  return (
    config.wHint * hints +
    config.wShadow * shadow +
    config.wReveal * revealTerm
  );
}

export function gradeScore(
  inputs: GradeInputs,
  config: GradeConfig = DEFAULT_GRADE_CONFIG
): number {
  const E = easeFactor(inputs.initialSolutions, config);
  const A = assistCost(inputs, config);
  const t = Math.max(0, inputs.timeMinutes ?? 0);
  const timeTerm = config.wTime && config.wTime > 0 ? config.wTime * log1p(t) : 0;

  const score = config.BASE - E * A - timeTerm;
  const clampedScore = clamp(score, config.minScore, config.maxScore);
  const zScore = (clampedScore - config.empiricalBase) / config.empiricalScale;
  const normalizedScore = config.normalizationBase + zScore * config.normalizationScale;
  return normalizedScore;
}

export function scoreToLetter(
  score: number,
  config: Pick<GradeConfig, "cutoffs">
): LetterGrade {
  const s = Number.isFinite(score) ? score : 0;
  for (const c of config.cutoffs) {
    if (s >= c.minScore) return c.letter;
  }
  return "F";
}

export function gradeResult(
  inputs: GradeInputs,
  config: GradeConfig = DEFAULT_GRADE_CONFIG
): { score: number; letter: LetterGrade } {
  const score = gradeScore(inputs, config);
  return { score, letter: scoreToLetter(score, config) };
}

