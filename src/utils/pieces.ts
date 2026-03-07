import { Coord, PieceDefinition, Orientation } from "../types";
import pieceData from "../data/state_pieces.json";

function parseShape(shape: string[]): Coord[] {
  const cells: Coord[] = [];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === "X") {
        cells.push([r, c]);
      }
    }
  }
  return cells;
}

function normalize(cells: Coord[]): Coord[] {
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  const shifted: Coord[] = cells.map(([r, c]) => [r - minR, c - minC]);
  shifted.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return shifted;
}

function rotate90(cells: Coord[]): Coord[] {
  return cells.map(([r, c]) => [c, -r]);
}

function rotate270(cells: Coord[]): Coord[] {
  return cells.map(([r, c]) => [-c, r]);
}

function flipHorizontal(cells: Coord[]): Coord[] {
  return cells.map(([r, c]) => [r, -c]);
}

function coordsKey(cells: Coord[]): string {
  const norm = normalize(cells);
  return norm.map(([r, c]) => `${r},${c}`).join("|");
}

/** Given orientation index 0–7, return the next index after rotating 90° CW. */
export function rotateOrientation90CW(index: number): number {
  if (index < 4) return (index + 1) % 4;
  return ((index - 1) % 4 + 4) % 8;
}

/** Given orientation index 0–7, return the flipped orientation index. */
export function flipOrientationIndex(index: number): number {
  return (index + 4) % 8;
}

export function getUniqueOrientations(piece: PieceDefinition): Orientation[] {
  const seen = new Set<string>();
  const result: Orientation[] = [];
  for (const o of piece.orientations) {
    const key = coordsKey(o.cells);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(o);
    }
  }
  return result;
}

export function getSolverOrientationIndex(
  piece: PieceDefinition,
  uiOrientationIndex: number
): number {
  const unique = getUniqueOrientations(piece);
  const keyToIndex = new Map<string, number>();
  unique.forEach((o, i) => keyToIndex.set(coordsKey(o.cells), i));
  const target = piece.orientations[uiOrientationIndex];
  if (!target) return 0;
  return keyToIndex.get(coordsKey(target.cells)) ?? 0;
}

export function cellsToAscii(cells: Coord[]): string {
  if (cells.length === 0) return "";

  const norm = normalize(cells);
  const maxR = Math.max(...norm.map(([r]) => r));
  const maxC = Math.max(...norm.map(([, c]) => c));
  const cellSet = new Set(norm.map(([r, c]) => `${r},${c}`));

  const lines: string[] = [];
  for (let r = 0; r <= maxR; r++) {
    let line = "";
    for (let c = 0; c <= maxC; c++) {
      line += cellSet.has(`${r},${c}`) ? "X" : ".";
    }
    lines.push(line);
  }

  return lines.join("\n");
}

function generateOrientations(cells: Coord[]): Orientation[] {
  const orientations: Orientation[] = [];

  let current = cells;
  for (let rot = 0; rot < 4; rot++) {
    orientations.push({ cells: normalize(current) });
    current = rotate90(current);
  }

  current = flipHorizontal(cells);
  for (let rot = 0; rot < 4; rot++) {
    orientations.push({ cells: normalize(current) });
    current = rotate270(current);
  }

  return orientations;
}

export function loadPieces(): PieceDefinition[] {
  return pieceData.pieces.map((p) => {
    const baseCells = parseShape(p.shape);
    return {
      id: p.id,
      name: p.name,
      orientations: generateOrientations(baseCells),
    };
  });
}

let _cached: PieceDefinition[] | null = null;

export function getPieces(): PieceDefinition[] {
  if (!_cached) {
    _cached = loadPieces();
  }
  return _cached;
}

export function getPieceById(id: number): PieceDefinition | undefined {
  return getPieces().find((p) => p.id === id);
}

export function getAbsoluteCells(
  orientation: Orientation,
  anchorRow: number,
  anchorCol: number
): Coord[] {
  return orientation.cells.map(([r, c]) => [r + anchorRow, c + anchorCol]);
}
