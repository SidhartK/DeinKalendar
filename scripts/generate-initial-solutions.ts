import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPieces, getUniqueOrientations } from "../src/utils/pieces";
import type { SolverPiece } from "../src/solver/solverCore";
import { runSolverCore } from "../src/solver/solverCore";

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

function toSolverPieces(): SolverPiece[] {
  const pieces = getPieces();
  return pieces.map((p) => ({
    id: p.id,
    orientations: getUniqueOrientations(p).map((o) => ({ cells: o.cells })),
    size: getUniqueOrientations(p)[0]?.cells.length ?? 0,
  }));
}

type Out = {
  version: 1;
  generatedAtIso: string;
  /** key: `${month}|${day}` */
  byDateKey: Record<string, number>;
};

async function main() {
  const solverPieces = toSolverPieces();
  const byDateKey: Record<string, number> = {};

  for (const month of MONTHS) {
    for (let day = 1; day <= 31; day++) {
      const cache = new Map<string, number>();
      const result = runSolverCore({
        targetMonth: month,
        targetDay: day,
        pieces: solverPieces,
        initialPlacements: [],
        cache,
        cacheStates: 1,
        collectShadowData: false,
        heavyCollection: false,
      });
      byDateKey[`${month}|${day}`] = result.totalCount;
      process.stdout.write(`\r${month} ${day} => ${result.totalCount}            `);
    }
  }
  process.stdout.write("\n");

  const out: Out = {
    version: 1,
    generatedAtIso: new Date().toISOString(),
    byDateKey,
  };

  const here = path.dirname(fileURLToPath(import.meta.url));
  const dest = path.resolve(here, "../src/data/initial_solutions_by_date.json");
  await writeFile(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Wrote ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

