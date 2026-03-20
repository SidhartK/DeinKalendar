"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  CellValue,
  Coord,
  GRID_ROWS,
  GRID_COLS,
  PIECE_COLORS,
  PieceDefinition,
} from "../types";
import { getLabelAt, isBlocked, getTargetCells } from "../utils/board";
import { getAbsoluteCells } from "../utils/pieces";
import { validatePlacement } from "../utils/validation";
import "./Board.css";

interface BoardProps {
  grid: CellValue[][];
  targetMonth: string;
  targetDay: number;
  selectedPiece: PieceDefinition | null;
  selectedOrientation: number;
  selectedAnchorCoord: Coord | null;
  onPlacePiece: (row: number, col: number) => void;
  onPickUpPiece: (pieceId: number, row: number, col: number) => void;
  /** Keys `${row},${col}` for empty cells forced to one (piece, orientation) after a hint. */
  forcedHintCells?: Set<string>;
}

export default function Board({
  grid,
  targetMonth,
  targetDay,
  selectedPiece,
  selectedOrientation,
  selectedAnchorCoord,
  onPlacePiece,
  onPickUpPiece,
  forcedHintCells,
}: BoardProps) {
  const [hoverCell, setHoverCell] = useState<Coord | null>(null);

  const targetSet = useMemo(() => {
    const cells = getTargetCells(targetMonth, targetDay);
    return new Set(cells.map(([r, c]) => `${r},${c}`));
  }, [targetMonth, targetDay]);

  const preview = useMemo(() => {
    if (!selectedPiece || !hoverCell || !selectedAnchorCoord) return null;
    const orientation = selectedPiece.orientations[selectedOrientation];
    if (!orientation) return null;

    const [baseR, baseC] = selectedAnchorCoord;
    const placementRow = hoverCell[0] - baseR;
    const placementCol = hoverCell[1] - baseC;

    const result = validatePlacement(
      grid,
      orientation,
      placementRow,
      placementCol,
      targetMonth,
      targetDay
    );

    const cells = getAbsoluteCells(orientation, placementRow, placementCol);
    return {
      cells,
      valid: result.valid,
      color: PIECE_COLORS[selectedPiece.id] ?? "#888",
      placementRow,
      placementCol,
    };
  }, [
    selectedPiece,
    selectedOrientation,
    selectedAnchorCoord,
    hoverCell,
    grid,
    targetMonth,
    targetDay,
  ]);

  const previewSet = useMemo(() => {
    if (!preview) return new Map<string, { valid: boolean; color: string }>();
    const map = new Map<string, { valid: boolean; color: string }>();
    for (const [r, c] of preview.cells) {
      map.set(`${r},${c}`, { valid: preview.valid, color: preview.color });
    }
    return map;
  }, [preview]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const cellValue = grid[row]?.[col];

      if (typeof cellValue === "number") {
        onPickUpPiece(cellValue, row, col);
        return;
      }

      if (selectedPiece && preview?.valid) {
        onPlacePiece(row, col);
      }
    },
    [grid, selectedPiece, preview, onPlacePiece, onPickUpPiece]
  );

  const handleMouseEnter = useCallback((row: number, col: number) => {
    setHoverCell([row, col]);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === " ") {
        e.preventDefault();
        if (selectedPiece && preview?.valid && hoverCell) {
          onPlacePiece(hoverCell[0], hoverCell[1]);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPiece, preview, hoverCell, onPlacePiece]);

  return (
    <div className="board" onMouseLeave={handleMouseLeave}>
      {Array.from({ length: GRID_ROWS }, (_, row) => (
        <div className="board-row" key={row}>
          {Array.from({ length: GRID_COLS }, (_, col) => {
            const blocked = isBlocked(row, col);
            const cellValue = grid[row][col];
            const label = getLabelAt(row, col);
            const isTarget = targetSet.has(`${row},${col}`);
            const pieceId = typeof cellValue === "number" ? cellValue : null;
            const previewInfo = previewSet.get(`${row},${col}`);
            const forcedHint =
              forcedHintCells?.has(`${row},${col}`) ?? false;

            let className = "board-cell";
            if (blocked) className += " blocked";
            if (isTarget) className += " target";
            if (pieceId !== null) className += " occupied";
            if (forcedHint) className += " forced-hint";
            if (previewInfo) {
              className += previewInfo.valid ? " preview-valid" : " preview-invalid";
            }

            const style: React.CSSProperties = {};
            if (pieceId !== null) {
              style.backgroundColor = PIECE_COLORS[pieceId] ?? "#888";
            }
            if (previewInfo) {
              style.backgroundColor = previewInfo.valid
                ? previewInfo.color + "80"
                : "#ff000040";
            }

            return (
              <div
                key={col}
                className={className}
                style={style}
                onMouseEnter={
                  blocked ? undefined : () => handleMouseEnter(row, col)
                }
                onClick={
                  blocked ? undefined : () => handleCellClick(row, col)
                }
              >
                {!blocked && <span className="cell-label">{label}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
