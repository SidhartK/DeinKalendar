"use client";

import { useMemo } from "react";
import { PlacedPiece, CellValue, GRID_ROWS, GRID_COLS, PIECE_COLORS } from "../types";
import { createEmptyGrid, isBlocked, getTargetCells, getLabelAt } from "../utils/board";
import { getPieceById } from "../utils/pieces";
import { validatePlacement, placePieceOnGrid } from "../utils/validation";
import "./SolutionHistory.css";

interface MiniBoardProps {
  placedPieces: PlacedPiece[];
  targetMonth: string;
  targetDay: number;
  index: number;
}

function MiniBoard({ placedPieces, targetMonth, targetDay, index }: MiniBoardProps) {
  const grid = useMemo(() => {
    let g = createEmptyGrid();
    for (const pp of placedPieces) {
      const piece = getPieceById(pp.pieceId);
      if (!piece) continue;
      const orientation = piece.orientations[pp.orientationIndex];
      if (!orientation) continue;
      const result = validatePlacement(g, orientation, pp.row, pp.col, targetMonth, targetDay);
      if (result.valid && result.cells) {
        g = placePieceOnGrid(g, result.cells, pp.pieceId);
      }
    }
    return g;
  }, [placedPieces, targetMonth, targetDay]);

  const targetSet = useMemo(() => {
    const cells = getTargetCells(targetMonth, targetDay);
    return new Set(cells.map(([r, c]) => `${r},${c}`));
  }, [targetMonth, targetDay]);

  return (
    <div className="mini-solution">
      <div className="mini-solution-label">#{index + 1}</div>
      <div className="mini-board">
        {Array.from({ length: GRID_ROWS }, (_, row) => (
          <div className="mini-board-row" key={row}>
            {Array.from({ length: GRID_COLS }, (_, col) => {
              const blocked = isBlocked(row, col);
              const cellValue: CellValue = grid[row][col];
              const isTarget = targetSet.has(`${row},${col}`);
              const pieceId = typeof cellValue === "number" ? cellValue : null;
              const label = getLabelAt(row, col);

              let className = "mini-cell";
              if (blocked) className += " mini-cell--blocked";
              if (isTarget) className += " mini-cell--target";

              const style: React.CSSProperties = {};
              if (pieceId !== null) {
                style.backgroundColor = PIECE_COLORS[pieceId] ?? "#888";
              }

              return (
                <div key={col} className={className} style={style}>
                  {!blocked && isTarget && (
                    <span className="mini-cell-label">{label}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SolutionHistoryProps {
  solutions: PlacedPiece[][];
  targetMonth: string;
  targetDay: number;
}

export default function SolutionHistory({ solutions, targetMonth, targetDay }: SolutionHistoryProps) {
  if (solutions.length === 0) {
    return (
      <div className="solution-history">
        <div className="solution-history-header">Solutions Found</div>
        <div className="solution-history-empty">
          No solutions yet — solve the puzzle to see them here!
        </div>
      </div>
    );
  }

  return (
    <div className="solution-history">
      <div className="solution-history-header">
        Solutions Found ({solutions.length})
      </div>
      <div className="solution-history-scroll">
        {solutions.map((placedPieces, i) => (
          <MiniBoard
            key={i}
            placedPieces={placedPieces}
            targetMonth={targetMonth}
            targetDay={targetDay}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
