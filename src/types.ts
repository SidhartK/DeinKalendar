export type CellValue = "blocked" | null | number;

export type Coord = [row: number, col: number];

export interface PieceShape {
  id: number;
  name: string;
  cells: Coord[];
}

export interface Orientation {
  cells: Coord[];
}

export interface PieceDefinition {
  id: number;
  name: string;
  baseCells: Coord[];
  orientations: Orientation[];
}

export interface PlacedPiece {
  pieceId: number;
  row: number;
  col: number;
  orientationIndex: number;
}

export interface GameState {
  grid: CellValue[][];
  placedPieces: PlacedPiece[];
  targetMonth: string;
  targetDay: number;
  selectedPieceId: number | null;
  selectedOrientation: number;
  selectedAnchorCellId: number | null;
}

export interface BoardLabel {
  row: number;
  col: number;
  label: string;
}

export const GRID_ROWS = 7;
export const GRID_COLS = 7;

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export type GameAction =
  | { type: "SET_TARGET_MONTH"; month: string }
  | { type: "SET_TARGET_DAY"; day: number }
  | { type: "SELECT_PIECE"; pieceId: number | null }
  | { type: "SET_ORIENTATION"; index: number }
  | { type: "PLACE_PIECE"; piece: PlacedPiece }
  | { type: "REMOVE_PIECE"; pieceId: number }
  | { type: "PICK_UP_PIECE"; pieceId: number; row: number; col: number }
  | { type: "REMOVE_LAST_PIECE" }
  | { type: "RESTORE_LAST_REMOVED" }
  | { type: "CLEAR_BOARD" };

/** One distinct piece placement (footprint + anchor) from shadow analysis. */
export interface ShadowCatalogEntry {
  pieceId: number;
  cells: [number, number][];
}

export interface ShadowCellInfo {
  r: number;
  c: number;
  count: number;
  keys: string[];
}

export interface ShadowAnalysisPayload {
  shadowCatalog: Record<string, ShadowCatalogEntry>;
  shadowCells: ShadowCellInfo[];
}

export const PIECE_COLORS: Record<number, string> = {
  1: "#e74c3c",
  2: "#3498db",
  3: "#2ecc71",
  4: "#f39c12",
  5: "#9b59b6",
  6: "#1abc9c",
  7: "#e67e22",
  8: "#e84393",
};
