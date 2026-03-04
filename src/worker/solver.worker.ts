export {};

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
    runSolver(msg.targetMonth, msg.targetDay, pieces, initialPlacements);
  }
});

function runSolver(
  targetMonth: string,
  targetDay: number,
  pieces: SolverPiece[],
  initialPlacements: InitialPlacement[]
) {
  const targets = getTargetCells(targetMonth, targetDay);
  const targetSet = new Set(targets.map(([r, c]) => `${r},${c}`));

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
      sendMessage({ type: "done", totalCount: 0 });
      return;
    }
    const solverPiece = pieces[pieceIndex];
    const orientation =
      solverPiece.orientations[placement.orientationIndex];
    if (!orientation) {
      sendMessage({ type: "done", totalCount: 0 });
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
        sendMessage({ type: "done", totalCount: 0 });
        return;
      }
      placedCells.push([r, c]);
    }

    for (const [r, c] of placedCells) {
      board[r][c] = solverPiece.id;
    }
    used[pieceIndex] = true;
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
    sendMessage({ type: "done", totalCount: 0 });
    return;
  }

  function backtrack(): void {
    if (cancelled) return;

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
      solutionCount++;
      const now = performance.now();
      if (now - lastReportTime > 100) {
        sendMessage({ type: "progress", count: solutionCount });
        lastReportTime = now;
      }
      return;
    }

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

        for (const [r, c] of placed) board[r][c] = piece.id;
        used[pi] = true;

        if (!hasIsolatedRegion()) {
          backtrack();
        }

        for (const [r, c] of placed) board[r][c] = 0;
        used[pi] = false;
      }
    }
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

  sendMessage({ type: "done", totalCount: solutionCount });
}
