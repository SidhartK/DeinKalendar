"use client";

import { useLayoutEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  GRID_ROWS,
  GRID_COLS,
  PIECE_COLORS,
  type ShadowCatalogEntry,
} from "../types";
import { getLabelAt, isBlocked } from "../utils/board";
import "./ShadowCellPopover.css";

function MiniPlacementGrid({
  cells,
  pieceId,
}: {
  cells: [number, number][];
  pieceId: number;
}) {
  const occupied = new Set(cells.map(([r, c]) => `${r},${c}`));
  const color = PIECE_COLORS[pieceId] ?? "#888";

  return (
    <div className="shadow-mini-grid" aria-hidden>
      {Array.from({ length: GRID_ROWS }, (_, row) => (
        <div className="shadow-mini-row" key={row}>
          {Array.from({ length: GRID_COLS }, (_, col) => {
            const blocked = isBlocked(row, col);
            const label = getLabelAt(row, col);
            const on = occupied.has(`${row},${col}`);
            let cls = "shadow-mini-cell";
            if (blocked) cls += " shadow-mini-cell--blocked";
            if (on) cls += " shadow-mini-cell--piece";
            return (
              <div
                key={col}
                className={cls}
                style={on ? { backgroundColor: color } : undefined}
                title={label ?? undefined}
              >
                {!blocked && label != null && (
                  <span className="shadow-mini-label">{label}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface ShadowCellPopoverProps {
  anchorRect: DOMRect;
  shadowKeys: string[];
  shadowCatalog: Record<string, ShadowCatalogEntry>;
  pieceNameById: Record<number, string>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function ShadowCellPopover({
  anchorRect,
  shadowKeys,
  shadowCatalog,
  pieceNameById,
  onMouseEnter,
  onMouseLeave,
}: ShadowCellPopoverProps) {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    const margin = 8;
    const width = 280;
    let left = anchorRect.left;
    let top = anchorRect.bottom + margin;
    if (typeof window !== "undefined") {
      const maxLeft = window.innerWidth - width - margin;
      left = Math.max(margin, Math.min(left, maxLeft));
      const estHeight = 400;
      if (top + estHeight > window.innerHeight - margin) {
        top = Math.max(margin, anchorRect.top - estHeight - margin);
      }
    }
    setStyle({
      position: "fixed",
      left,
      top,
      zIndex: 10050,
      maxWidth: width,
    });
  }, [anchorRect]);

  const validKeys = shadowKeys.filter((k) => shadowCatalog[k] != null);
  if (validKeys.length === 0) return null;

  return createPortal(
    <div
      className="shadow-cell-popover"
      style={style}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="shadow-cell-popover-title">Placements covering this cell</div>
      <ul className="shadow-cell-popover-list">
        {validKeys.map((k) => {
            const entry = shadowCatalog[k]!;
            const name =
              pieceNameById[entry.pieceId] ?? `Piece ${entry.pieceId}`;
            return (
              <li key={k} className="shadow-cell-popover-item">
                <span className="shadow-cell-popover-piece-name">{name}</span>
                <MiniPlacementGrid cells={entry.cells} pieceId={entry.pieceId} />
              </li>
            );
          })}
      </ul>
    </div>,
    document.body
  );
}
