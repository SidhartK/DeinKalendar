import { Coord, PieceDefinition, Orientation } from "../types";
import pieceData from "../../state_pieces.json";

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

function flipHorizontal(cells: Coord[]): Coord[] {
  return cells.map(([r, c]) => [r, -c]);
}

function coordsKey(cells: Coord[]): string {
  return cells.map(([r, c]) => `${r},${c}`).join("|");
}

function cellsToAscii(cells: Coord[]): string {
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
  const seen = new Set<string>();
  const orientations: Orientation[] = [];

  const variants = [cells, flipHorizontal(cells)];

  for (const base of variants) {
    let current = base;
    for (let rot = 0; rot < 4; rot++) {
      const norm = normalize(current);
      const key = coordsKey(norm);
      if (!seen.has(key)) {
        seen.add(key);
        orientations.push({ cells: norm });
        console.log(`Generated orientation #${orientations.length}:\n${cellsToAscii(norm)}\n`);
      }
      current = rotate90(current);
    }
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

const flipIndexCache = new Map<number, number[]>();

export function getVerticalFlipIndex(
  piece: PieceDefinition,
  index: number
): number {
  let mapping = flipIndexCache.get(piece.id);
  if (!mapping) {
    const keyToIndex = new Map<string, number>();
    piece.orientations.forEach((o, i) => {
      keyToIndex.set(coordsKey(normalize(o.cells)), i);
    });

    mapping = piece.orientations.map((o, i) => {
      const flippedCells = normalize(flipHorizontal(o.cells));
      const key = coordsKey(flippedCells);
      const target = keyToIndex.get(key);
      return target == null ? i : target;
    });

    flipIndexCache.set(piece.id, mapping);
  }

  if (index < 0 || index >= mapping.length) return index;
  return mapping[index];
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
