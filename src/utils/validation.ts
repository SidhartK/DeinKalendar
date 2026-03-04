import { CellValue, Coord, Orientation, GRID_ROWS, GRID_COLS } from "../types";
import { isBlocked, getTargetCells } from "./board";
import { getAbsoluteCells } from "./pieces";

export interface PlacementResult {
  valid: boolean;
  reason?: string;
  cells?: Coord[];
}

export function validatePlacement(
  grid: CellValue[][],
  orientation: Orientation,
  anchorRow: number,
  anchorCol: number,
  targetMonth: string,
  targetDay: number
): PlacementResult {
  const cells = getAbsoluteCells(orientation, anchorRow, anchorCol);
  const targets = getTargetCells(targetMonth, targetDay);
  const targetSet = new Set(targets.map(([r, c]) => `${r},${c}`));

  for (const [r, c] of cells) {
    if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) {
      return { valid: false, reason: "Out of bounds" };
    }

    if (isBlocked(r, c)) {
      return { valid: false, reason: "Overlaps a blocked cell" };
    }

    if (targetSet.has(`${r},${c}`)) {
      return { valid: false, reason: "Covers a target date cell" };
    }

    if (grid[r][c] !== null && grid[r][c] !== "blocked") {
      return { valid: false, reason: "Overlaps another piece" };
    }
  }

  return { valid: true, cells };
}

export function placePieceOnGrid(
  grid: CellValue[][],
  cells: Coord[],
  pieceId: number
): CellValue[][] {
  const newGrid = grid.map((row) => [...row]);
  for (const [r, c] of cells) {
    newGrid[r][c] = pieceId;
  }
  return newGrid;
}

export function removePieceFromGrid(
  grid: CellValue[][],
  pieceId: number
): CellValue[][] {
  return grid.map((row) =>
    row.map((cell) => (cell === pieceId ? null : cell))
  );
}

export function isBoardSolved(
  grid: CellValue[][],
  targetMonth: string,
  targetDay: number
): boolean {
  const targets = getTargetCells(targetMonth, targetDay);
  const targetSet = new Set(targets.map(([r, c]) => `${r},${c}`));

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (grid[r][c] === null) {
        if (!targetSet.has(`${r},${c}`)) {
          return false;
        }
      }
    }
  }
  return true;
}
