import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initialSolutions from "../src/data/initial_solutions_by_date.json";
import {
  DEFAULT_GRADE_CONFIG,
  gradeResult,
  type GradeConfig,
} from "../src/lib/grade";

type InitialSolutionsFile = {
  version: number;
  generatedAtIso: string;
  byDateKey: Record<string, number>;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Simple simulated player model:
 * - Uses more assists when S is smaller (fewer available solutions).
 * - Adds noise so the distribution isn't degenerate.
 */
function simulateRun(
  S: number,
  rnd: () => number
): { hints: number; shadow: number; reveals: number; timeMin: number } {
  const s = Math.max(1, S);
  const difficulty = 1 / Math.log(2 + s); // lower S => higher difficulty

  // Base tendencies (tune by looking at calibration distribution).
  const meanHints = 2.0 + 10 * difficulty;
  const meanShadow = 1.0 + 5 * difficulty;
  const meanReveals = 0.5 + 3 * difficulty;
  const meanTime = 4 + 25 * difficulty;

  // Mild multiplicative noise.
  const noise = () => 0.6 + 0.8 * rnd();

  return {
    hints: clampInt(meanHints * noise(), 0, 30),
    shadow: clampInt(meanShadow * noise(), 0, 20),
    reveals: clampInt(meanReveals * noise(), 0, 25),
    timeMin: clampInt(meanTime * noise(), 0, 120),
  };
}

function csvEscape(s: string): string {
  if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

async function main() {
  const cfg: GradeConfig = DEFAULT_GRADE_CONFIG;
  const data = initialSolutions as unknown as InitialSolutionsFile;

  const seed = 20260314;
  const rnd = mulberry32(seed);

  const rows: string[] = [];
  rows.push(
    [
      "month",
      "day",
      "initial_solutions",
      "sim_hints",
      "sim_shadow_clicks",
      "sim_squares_viewed",
      "sim_time_min",
      "numeric_score",
      "letter_grade",
    ].join(",")
  );

  for (const month of MONTHS) {
    for (let day = 1; day <= 31; day++) {
      const key = `${month}|${day}`;
      const S = data.byDateKey[key] ?? 0;
      const sim = simulateRun(S, rnd);
      const { score, letter } = gradeResult(
        {
          initialSolutions: S,
          hintsUsedCount: sim.hints,
          shadowShowCount: sim.shadow,
          coveringsSquaresViewedCount: sim.reveals,
          timeMinutes: sim.timeMin,
        },
        cfg
      );

      rows.push(
        [
          month,
          String(day),
          String(S),
          String(sim.hints),
          String(sim.shadow),
          String(sim.reveals),
          String(sim.timeMin),
          score.toFixed(2),
          letter,
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  // Add a small sweep to visualize monotonicity.
  const sweepS = [25, 60, 120, 200];
  for (const S of sweepS) {
    for (let h = 0; h <= 12; h++) {
      const { score, letter } = gradeResult(
        {
          initialSolutions: S,
          hintsUsedCount: h,
          shadowShowCount: 0,
          coveringsSquaresViewedCount: 0,
        },
        cfg
      );
      rows.push(
        [
          "SWEEP",
          String(h),
          String(S),
          String(h),
          "0",
          "0",
          "",
          score.toFixed(2),
          letter,
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const dest = path.resolve(here, "./data/calibration.csv");
  await writeFile(dest, rows.join("\n") + "\n", "utf8");
  console.log(`Wrote ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

