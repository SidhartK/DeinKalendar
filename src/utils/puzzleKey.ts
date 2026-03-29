import type { PlacedPiece } from "../types";

/** Stable key for the current partial (or complete) placement — used to dedupe hint / shadow stats per board state. */
export function makePuzzleKey(placedPieces: PlacedPiece[]): string {
  const sorted = [...placedPieces].sort((a, b) => {
    if (a.pieceId !== b.pieceId) return a.pieceId - b.pieceId;
    if (a.row !== b.row) return a.row - b.row;
    if (a.col !== b.col) return a.col - b.col;
    return a.orientationIndex - b.orientationIndex;
  });
  return sorted
    .map((p) => `${p.pieceId}@${p.row},${p.col}:${p.orientationIndex}`)
    .join(";");
}
