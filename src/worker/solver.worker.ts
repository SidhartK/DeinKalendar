export {};

import { footprintKeyFromRelativeCells } from "../utils/placementFootprint";

const GRID_ROWS = 7;
const GRID_COLS = 7;

const BOARD_LABELS: string[][] = [
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ["1", "2", "3", "4", "5", "6", "7"],
  ["8", "9", "10", "11", "12", "13", "14"],
  ["15", "16", "17", "18", "19", "20", "21"],
  ["22", "23", "24", "25", "26", "27", "28"],
  ["29", "30", "31"],
];

function isBlocked(r: number, c: number): boolean {
  if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return true;
  return !BOARD_LABELS[r] || c >= BOARD_LABELS[r].length;
}

function getLabelAt(r: number, c: number): string | null {
  if (isBlocked(r, c)) return null;
  return BOARD_LABELS[r][c];
}

function getTargetCells(month: string, day: number): [number, number][] {
  const targets: [number, number][] = [];
  const dayStr = String(day);
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const label = getLabelAt(r, c);
      if (label === month || label === dayStr) {
        targets.push([r, c]);
      }
    }
  }
  return targets;
}

interface PieceOrientation {
  cells: [number, number][];
}

interface SolverPiece {
  id: number;
  orientations: PieceOrientation[];
  size: number;
}

interface InitialPlacement {
  pieceId: number;
  row: number;
  col: number;
  orientationIndex: number;
}

interface StackPlacement {
  pi: number;
  oi: number;
  anchorR: number;
  anchorC: number;
}

type StateCache = Map<string, number>;
type GoalCache = Map<string, StateCache>;
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

    runSolver(
      msg.targetMonth,
      msg.targetDay,
      pieces,
      initialPlacements,
      cache,
      statesForDate,
      Boolean(msg.collectShadowData)
    );
  }
});

function runSolver(
  targetMonth: string,
  targetDay: number,
  pieces: SolverPiece[],
  initialPlacements: InitialPlacement[],
  cache: StateCache,
  statesForDate: number,
  collectShadowData: boolean
) {
  const targets = getTargetCells(targetMonth, targetDay);
  const targetSet = new Set(targets.map(([r, c]) => `${r},${c}`));

  const heavyCollection = collectShadowData;

  const shadowCellSets: Set<string>[][] | null = collectShadowData
    ? Array.from({ length: GRID_ROWS }, () =>
        Array.from({ length: GRID_COLS }, () => new Set<string>())
      )
    : null;

  const shadowCatalog = collectShadowData
    ? new Map<
        string,
        { pieceId: number; cells: [number, number][] }
      >()
    : null;

  const placementStack: StackPlacement[] = [];

  function sendDone(totalCount: number): void {
    const shadowCatalogOut: Record<
      string,
      { pieceId: number; cells: [number, number][] }
    > = {};
    if (!cancelled && collectShadowData && shadowCatalog) {
      for (const [k, v] of shadowCatalog) {
        shadowCatalogOut[k] = {
          pieceId: v.pieceId,
          cells: v.cells.map(([r, c]) => [r, c] as [number, number]),
        };
      }
    }
    const shadowCells: {
      r: number;
      c: number;
      count: number;
      keys: string[];
    }[] = [];
    if (!cancelled && collectShadowData && shadowCellSets) {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (isBlocked(r, c) || targetSet.has(`${r},${c}`)) continue;
          const set = shadowCellSets[r][c];
          if (set.size > 0) {
            shadowCells.push({
              r,
              c,
              count: set.size,
              keys: [...set],
            });
          }
        }
      }
    }

    sendMessage({
      type: "done",
      totalCount,
      cacheStates: statesForDate,
      cancelled,
      ...(collectShadowData
        ? { shadowCatalog: shadowCatalogOut, shadowCells }
        : {}),
    });
  }

  function recordLeafShadows(): void {
    if (!collectShadowData || !shadowCellSets || !shadowCatalog) return;
    for (const pl of placementStack) {
      const piece = pieces[pl.pi];
      const orient = piece.orientations[pl.oi];
      if (!orient) continue;
      const footprintKey = footprintKeyFromRelativeCells(orient.cells);
      const shadowKey = `${piece.id}|${footprintKey}|${pl.anchorR}|${pl.anchorC}`;
      const absCells: [number, number][] = orient.cells.map(
        ([dr, dc]) =>
          [pl.anchorR + dr, pl.anchorC + dc] as [number, number]
      );
      if (!shadowCatalog.has(shadowKey)) {
        shadowCatalog.set(shadowKey, {
          pieceId: piece.id,
          cells: absCells.map(([r, c]) => [r, c]),
        });
      }
      for (const [r, c] of absCells) {
        if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
          shadowCellSets[r][c].add(shadowKey);
        }
      }
    }
  }

  // 0 = empty, -1 = blocked, -2 = target (must stay uncovered), >0 = piece id
  const board: number[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      if (isBlocked(r, c)) {
        board[r][c] = -1;
      } else if (targetSet.has(`${r},${c}`)) {
        board[r][c] = -2;
      } else {
        board[r][c] = 0;
      }
    }
  }

  const used: boolean[] = new Array(pieces.length).fill(false);
  const visited: boolean[][] = Array.from({ length: GRID_ROWS }, () =>
    new Array(GRID_COLS).fill(false)
  );
  const fillStack: [number, number][] = [];

  let solutionCount = 0;
  let lastReportTime = 0;

  const idToIndex = new Map<number, number>();
  for (let i = 0; i < pieces.length; i++) {
    idToIndex.set(pieces[i].id, i);
  }

  // Seed board with any pre-placed pieces. If invalid, no completions exist.
  for (const placement of initialPlacements) {
    const pieceIndex = idToIndex.get(placement.pieceId);
    if (pieceIndex == null) {
      sendDone(0);
      return;
    }
    const solverPiece = pieces[pieceIndex];
    const orientation =
      solverPiece.orientations[placement.orientationIndex];
    if (!orientation) {
      sendDone(0);
      return;
    }

    const placedCells: [number, number][] = [];
    for (const [or, oc] of orientation.cells) {
      const r = placement.row + or;
      const c = placement.col + oc;
      if (
        r < 0 ||
        r >= GRID_ROWS ||
        c < 0 ||
        c >= GRID_COLS ||
        board[r][c] !== 0
      ) {
        sendDone(0);
        return;
      }
      placedCells.push([r, c]);
    }

    for (const [r, c] of placedCells) {
      board[r][c] = solverPiece.id;
    }
    used[pieceIndex] = true;
    placementStack.push({
      pi: pieceIndex,
      oi: placement.orientationIndex,
      anchorR: placement.row,
      anchorC: placement.col,
    });
  }

  function floodFillSize(startR: number, startC: number): number {
    fillStack.length = 0;
    fillStack.push([startR, startC]);
    visited[startR][startC] = true;
    let size = 0;
    while (fillStack.length > 0) {
      const [r, c] = fillStack.pop()!;
      size++;
      if (r > 0 && !visited[r - 1][c] && board[r - 1][c] === 0) {
        visited[r - 1][c] = true;
        fillStack.push([r - 1, c]);
      }
      if (r < GRID_ROWS - 1 && !visited[r + 1][c] && board[r + 1][c] === 0) {
        visited[r + 1][c] = true;
        fillStack.push([r + 1, c]);
      }
      if (c > 0 && !visited[r][c - 1] && board[r][c - 1] === 0) {
        visited[r][c - 1] = true;
        fillStack.push([r, c - 1]);
      }
      if (c < GRID_COLS - 1 && !visited[r][c + 1] && board[r][c + 1] === 0) {
        visited[r][c + 1] = true;
        fillStack.push([r, c + 1]);
      }
    }
    return size;
  }

  function hasIsolatedRegion(): boolean {
    let minSize = Infinity;
    for (let i = 0; i < pieces.length; i++) {
      if (!used[i] && pieces[i].size < minSize) {
        minSize = pieces[i].size;
      }
    }
    if (minSize === Infinity) return false;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        visited[r][c] = false;
      }
    }

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (board[r][c] === 0 && !visited[r][c]) {
          if (floodFillSize(r, c) < minSize) return true;
        }
      }
    }
    return false;
  }

  // Early prune in case the fixed layout already creates impossible regions.
  if (hasIsolatedRegion()) {
    sendDone(0);
    return;
  }

  function makeStateKey(): string {
    const openCells: number[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (board[r][c] === 0) {
          openCells.push(r * GRID_COLS + c);
        }
      }
    }

    const remainingPieces: number[] = [];
    for (let i = 0; i < pieces.length; i++) {
      if (!used[i]) {
        remainingPieces.push(i);
      }
    }

    return `${openCells.join(",")}|${remainingPieces.join(",")}`;
  }

  const initialKey = makeStateKey();
  if (cache.has(initialKey)) {
    console.log("Solver initial state cache hit", initialKey);
  } else {
    console.log("Solver initial state cache miss", initialKey);
    console.log("Keys in global cache:", Array.from(globalCache.keys()));
  }

  function backtrack(): number {
    if (cancelled) return 0;

    const key = makeStateKey();
    const cached = heavyCollection ? undefined : cache.get(key);
    if (cached !== undefined) {
      solutionCount += cached;
      const now = performance.now();
      if (now - lastReportTime > 100) {
        sendMessage({ type: "progress", count: solutionCount });
        lastReportTime = now;
      }
      return cached;
    }

    let tr = -1;
    let tc = -1;
    for (let r = 0; r < GRID_ROWS && tr === -1; r++) {
      for (let c = 0; c < GRID_COLS && tr === -1; c++) {
        if (board[r][c] === 0) {
          tr = r;
          tc = c;
        }
      }
    }

    if (tr === -1) {
      const localCount = 1;
      solutionCount += localCount;
      recordLeafShadows();
      const now = performance.now();
      if (now - lastReportTime > 100) {
        sendMessage({ type: "progress", count: solutionCount });
        lastReportTime = now;
      }
      cache.set(key, localCount);
      return localCount;
    }

    let localCount = 0;

    for (let pi = 0; pi < pieces.length; pi++) {
      if (used[pi] || cancelled) continue;

      const piece = pieces[pi];
      for (let oi = 0; oi < piece.orientations.length; oi++) {
        const cells = piece.orientations[oi].cells;

        // Anchor so cells[0] (topmost-leftmost after normalization) covers (tr, tc)
        const anchorR = tr - cells[0][0];
        const anchorC = tc - cells[0][1];

        let valid = true;
        const placed: [number, number][] = [];
        for (let ci = 0; ci < cells.length; ci++) {
          const r = anchorR + cells[ci][0];
          const c = anchorC + cells[ci][1];
          if (
            r < 0 ||
            r >= GRID_ROWS ||
            c < 0 ||
            c >= GRID_COLS ||
            board[r][c] !== 0
          ) {
            valid = false;
            break;
          }
          placed.push([r, c]);
        }
        if (!valid) continue;

        placementStack.push({ pi, oi, anchorR, anchorC });
        for (const [r, c] of placed) board[r][c] = piece.id;
        used[pi] = true;

        if (!hasIsolatedRegion()) {
          localCount += backtrack();
        }

        for (const [r, c] of placed) board[r][c] = 0;
        used[pi] = false;
        placementStack.pop();
      }
    }

    cache.set(key, localCount);
    return localCount;
  }

  try {
    backtrack();
  } catch (err) {
    sendMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  sendDone(solutionCount);
}
