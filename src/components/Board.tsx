"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { CSSProperties } from "react";
import {
  CellValue,
  Coord,
  GRID_ROWS,
  GRID_COLS,
  PIECE_COLORS,
  PieceDefinition,
  type ShadowAnalysisPayload,
} from "../types";
import { getLabelAt, isBlocked, getTargetCells } from "../utils/board";
import { getAbsoluteCells } from "../utils/pieces";
import { validatePlacement } from "../utils/validation";
import ShadowCellPopover from "./ShadowCellPopover";
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
  shadowOverlay?: ShadowAnalysisPayload | null;
  /** When true, piece placement and pickup are disabled (shadow viewing mode). */
  shadowsVisible?: boolean;
  onCoveringsViewed?: (row: number, col: number) => void;
  pieceNameById?: Record<number, string>;
}

type ShadowPanelState = { r: number; c: number; rect: DOMRect };

export default function Board({
  grid,
  targetMonth,
  targetDay,
  selectedPiece,
  selectedOrientation,
  selectedAnchorCoord,
  onPlacePiece,
  onPickUpPiece,
  shadowOverlay,
  shadowsVisible = false,
  onCoveringsViewed,
  pieceNameById = {},
}: BoardProps) {
  const [hoverCell, setHoverCell] = useState<Coord | null>(null);
  const [shadowPinned, setShadowPinned] = useState<ShadowPanelState | null>(
    null
  );
  const boardRootRef = useRef<HTMLDivElement>(null);

  const targetSet = useMemo(() => {
    const cells = getTargetCells(targetMonth, targetDay);
    return new Set(cells.map(([r, c]) => `${r},${c}`));
  }, [targetMonth, targetDay]);

  const shadowMap = useMemo(() => {
    const m = new Map<string, { count: number; keys: string[] }>();
    if (!shadowOverlay) return m;
    for (const cell of shadowOverlay.shadowCells) {
      m.set(`${cell.r},${cell.c}`, {
        count: cell.count,
        keys: cell.keys,
      });
    }
    return m;
  }, [shadowOverlay]);

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

  useEffect(() => {
    if (!shadowOverlay) {
      setShadowPinned(null);
    }
  }, [shadowOverlay]);

  useEffect(() => {
    if (!shadowPinned) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".shadow-cell-popover")) return;
      if (boardRootRef.current?.contains(t)) return;
      setShadowPinned(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [shadowPinned]);

  const handleCellClick = useCallback(
    (row: number, col: number, e: React.MouseEvent<HTMLDivElement>) => {
      const cellValue = grid[row]?.[col];

      if (!shadowsVisible && typeof cellValue === "number") {
        setShadowPinned(null);
        onPickUpPiece(cellValue, row, col);
        return;
      }

      if (
        !shadowsVisible &&
        selectedPiece &&
        selectedAnchorCoord
      ) {
        const orientation = selectedPiece.orientations[selectedOrientation];
        if (orientation) {
          const [baseR, baseC] = selectedAnchorCoord;
          const placementRow = row - baseR;
          const placementCol = col - baseC;
          const result = validatePlacement(
            grid,
            orientation,
            placementRow,
            placementCol,
            targetMonth,
            targetDay
          );
          if (result.valid) {
            setShadowPinned(null);
            onPlacePiece(row, col);
            return;
          }
        }
      }

      const key = `${row},${col}`;
      const info = shadowMap.get(key);
      const blocked = isBlocked(row, col);
      const isTarget = targetSet.has(`${row},${col}`);
      const pieceId = typeof cellValue === "number" ? cellValue : null;
      if (
        shadowsVisible &&
        shadowOverlay &&
        info &&
        info.count > 0 &&
        !blocked &&
        !isTarget &&
        pieceId === null
      ) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setShadowPinned((prev) => {
          const isSame = prev && prev.r === row && prev.c === col;
          if (!isSame) onCoveringsViewed?.(row, col);
          return isSame ? null : { r: row, c: col, rect };
        });
      }
    },
    [
      grid,
      selectedPiece,
      selectedOrientation,
      selectedAnchorCoord,
      targetMonth,
      targetDay,
      shadowOverlay,
      shadowMap,
      targetSet,
      onPickUpPiece,
      onPlacePiece,
      shadowsVisible,
      onCoveringsViewed,
    ]
  );

  const handleMouseEnterCell = useCallback(
    (row: number, col: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (shadowsVisible) {
        setHoverCell(null);
      } else {
        setHoverCell([row, col]);
      }
      // Hover-based coverings preview intentionally disabled; click a square to view coverings.
      void e;
      return;
    },
    [
      shadowsVisible,
    ]
  );

  const handleMouseLeaveCell = useCallback(() => {
    // Hover-based coverings preview disabled; nothing to clear.
    return;
  }, []);

  const handleMouseLeaveBoard = useCallback(() => {
    setHoverCell(null);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === " ") {
        e.preventDefault();
        if (
          !shadowsVisible &&
          selectedPiece &&
          preview?.valid &&
          hoverCell
        ) {
          onPlacePiece(hoverCell[0], hoverCell[1]);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPiece, preview, hoverCell, onPlacePiece, shadowsVisible]);

  const activeShadowPanel = shadowPinned;
  const activeShadowKeys =
    activeShadowPanel &&
    shadowMap.get(`${activeShadowPanel.r},${activeShadowPanel.c}`)?.keys;

  return (
    <div className="board-wrap">
      <div
        ref={boardRootRef}
        className={`board${shadowsVisible ? " board--shadows-visible" : ""}`}
        onMouseLeave={handleMouseLeaveBoard}
      >
        {Array.from({ length: GRID_ROWS }, (_, row) => (
          <div className="board-row" key={row}>
            {Array.from({ length: GRID_COLS }, (_, col) => {
              const blocked = isBlocked(row, col);
              const cellValue = grid[row][col];
              const label = getLabelAt(row, col);
              const isTarget = targetSet.has(`${row},${col}`);
              const pieceId = typeof cellValue === "number" ? cellValue : null;
              const previewInfo = previewSet.get(`${row},${col}`);
              const cellKey = `${row},${col}`;
              const shadowInfo = shadowMap.get(cellKey);
              const showShadowBadge =
                shadowOverlay &&
                pieceId === null &&
                !blocked &&
                !isTarget &&
                shadowInfo &&
                shadowInfo.count > 0 &&
                !previewInfo;
              const shadowUnique =
                showShadowBadge && shadowInfo.count === 1;

              let className = "board-cell";
              if (blocked) className += " blocked";
              if (isTarget) className += " target";
              if (pieceId !== null) className += " occupied";
              if (shadowUnique && !previewInfo) {
                className += " solver-highlight-cell";
              }
              if (previewInfo) {
                className += previewInfo.valid
                  ? " preview-valid"
                  : " preview-invalid";
              }

              const style: CSSProperties = {};
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
                    blocked
                      ? undefined
                      : (e) => handleMouseEnterCell(row, col, e)
                  }
                  onMouseLeave={
                    blocked ? undefined : handleMouseLeaveCell
                  }
                  onClick={
                    blocked
                      ? undefined
                      : (e) => handleCellClick(row, col, e)
                  }
                >
                  {!blocked && <span className="cell-label">{label}</span>}
                  {showShadowBadge && (
                    <span className="shadow-count-badge" aria-hidden>
                      {shadowInfo.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {activeShadowPanel &&
        shadowOverlay &&
        activeShadowKeys &&
        activeShadowKeys.length > 0 && (
          <ShadowCellPopover
            anchorRect={activeShadowPanel.rect}
            shadowKeys={activeShadowKeys}
            shadowCatalog={shadowOverlay.shadowCatalog}
            pieceNameById={pieceNameById}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
          />
        )}
    </div>
  );
}
