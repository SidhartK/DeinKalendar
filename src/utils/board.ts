import { CellValue, BoardLabel, GRID_ROWS, GRID_COLS } from "../types";

const BOARD_LABELS: string[][] = [
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ["1", "2", "3", "4", "5", "6", "7"],
  ["8", "9", "10", "11", "12", "13", "14"],
  ["15", "16", "17", "18", "19", "20", "21"],
  ["22", "23", "24", "25", "26", "27", "28"],
  ["29", "30", "31"],
];

export function isBlocked(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return true;
  const labelRow = BOARD_LABELS[row];
  if (!labelRow) return true;
  return col >= labelRow.length;
}

export function createEmptyGrid(): CellValue[][] {
  const grid: CellValue[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: CellValue[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push(isBlocked(r, c) ? "blocked" : null);
    }
    grid.push(row);
  }
  return grid;
}

export function getLabelAt(row: number, col: number): string | null {
  if (isBlocked(row, col)) return null;
  return BOARD_LABELS[row][col];
}

export function getAllLabels(): BoardLabel[] {
  const labels: BoardLabel[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const label = getLabelAt(r, c);
      if (label !== null) {
        labels.push({ row: r, col: c, label });
      }
    }
  }
  return labels;
}

export function getTargetCells(
  month: string,
  day: number
): [row: number, col: number][] {
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
