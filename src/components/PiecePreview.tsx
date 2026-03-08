"use client";

import { Orientation, PIECE_COLORS } from "../types";
import "./PieceTray.css";

const PREVIEW_GRID_SIZE = 4;

interface PiecePreviewProps {
  pieceId: number;
  orientation: Orientation;
  isSelected?: boolean;
  isPlaced?: boolean;
  onClick?: () => void;
}

export default function PiecePreview({
  pieceId,
  orientation,
  isSelected,
  isPlaced,
  onClick,
}: PiecePreviewProps) {
  const cells = orientation.cells;
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  const maxR = Math.max(...cells.map(([r]) => r));
  const maxC = Math.max(...cells.map(([, c]) => c));
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const startRow = Math.floor((PREVIEW_GRID_SIZE - rows) / 2);
  const startCol = Math.floor((PREVIEW_GRID_SIZE - cols) / 2);
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  const color = PIECE_COLORS[pieceId] ?? "#888";

  return (
    <div
      className={`piece-preview ${isSelected ? "selected" : ""} ${isPlaced ? "placed" : ""}`}
      onClick={isPlaced ? undefined : onClick}
      style={isSelected ? { borderColor: color } : undefined}
    >
      <div className="piece-mini-grid piece-mini-grid-fixed">
        {Array.from({ length: PREVIEW_GRID_SIZE }, (_, i) => (
          <div className="piece-mini-row" key={i}>
            {Array.from({ length: PREVIEW_GRID_SIZE }, (_, j) => {
              const r = i + minR - startRow;
              const c = j + minC - startCol;
              const filled = cellSet.has(`${r},${c}`);
              return (
                <div
                  key={j}
                  className={`piece-mini-cell ${filled ? "filled" : ""}`}
                  style={filled ? { backgroundColor: color } : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
