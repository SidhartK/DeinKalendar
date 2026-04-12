export {};

import type {
  GoalCache,
  PieceOrientation,
  SolverPiece,
  InitialPlacement,
  StateCache,
} from "../solver/solverCore";
import { runSolverCore } from "../solver/solverCore";

const globalCache = new Map<string, GoalCache>();

function sendMessage(msg: unknown): void {
  (self as unknown as { postMessage(m: unknown): void }).postMessage(msg);
}

let cancelled = false;

self.addEventListener("message", (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === "stop") {
    cancelled = true;
    return;
  }
  if (msg.type === "start") {
    cancelled = false;
    const pieces: SolverPiece[] = msg.pieces.map(
      (p: { id: number; orientations: PieceOrientation[] }) => ({
        id: p.id,
        orientations: p.orientations,
        size: p.orientations[0].cells.length,
      })
    );
    const initialPlacements: InitialPlacement[] = Array.isArray(
      msg.initialPlacements
    )
      ? msg.initialPlacements
      : [];

    const dateKey = `${msg.targetMonth}|${msg.targetDay}`;
    let goalCache = globalCache.get(dateKey);
    if (!goalCache) {
      goalCache = new Map<string, StateCache>();
      globalCache.set(dateKey, goalCache);
    }

    const puzzleKeyParts: string[] = [];
    const sortedPlacements = [...initialPlacements].sort((a, b) => {
      if (a.pieceId !== b.pieceId) return a.pieceId - b.pieceId;
      if (a.row !== b.row) return a.row - b.row;
      if (a.col !== b.col) return a.col - b.col;
      return a.orientationIndex - b.orientationIndex;
    });
    const placementKey = sortedPlacements
      .map(
        (p) => `${p.pieceId}@${p.row},${p.col}:${p.orientationIndex}`
      )
      .join(";");
    puzzleKeyParts.push(placementKey);
    const puzzleKey = puzzleKeyParts.join("|");

    let cache = goalCache.get(puzzleKey);
    if (!cache) {
      cache = new Map<string, number>();
      goalCache.set(puzzleKey, cache);
    }
    const statesForDate = goalCache.size;

    const collectShadowData = Boolean(msg.collectShadowData);
    const result = runSolverCore({
      targetMonth: msg.targetMonth,
      targetDay: msg.targetDay,
      pieces,
      initialPlacements,
      cache,
      cacheStates: statesForDate,
      collectShadowData,
      heavyCollection: collectShadowData,
      isCancelled: () => cancelled,
      onProgress: collectShadowData
        ? undefined
        : (count) => sendMessage({ type: "progress", count }),
    });

    sendMessage({
      type: "done",
      totalCount: result.totalCount,
      cacheStates: result.cacheStates,
      cancelled,
      ...(collectShadowData
        ? { shadowCatalog: result.shadowCatalog ?? {}, shadowCells: result.shadowCells ?? [] }
        : {}),
    });
  }
});
