"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PlacedPiece, PIECE_COLORS, GRID_ROWS, GRID_COLS } from "../types";
import { getLabelAt, isBlocked, getTargetCells } from "../utils/board";
import { getPieceById, getAbsoluteCells } from "../utils/pieces";
import "./TutorialModal.css";

const JAN1_SOLUTION: PlacedPiece[] = [
  { pieceId: 1, row: 0, col: 1, orientationIndex: 1 },
  { pieceId: 5, row: 0, col: 4, orientationIndex: 0 },
  { pieceId: 3, row: 1, col: 0, orientationIndex: 0 },
  { pieceId: 7, row: 1, col: 2, orientationIndex: 0 },
  { pieceId: 8, row: 1, col: 3, orientationIndex: 2 },
  { pieceId: 2, row: 3, col: 5, orientationIndex: 0 },
  { pieceId: 4, row: 4, col: 0, orientationIndex: 3 },
  { pieceId: 6, row: 5, col: 1, orientationIndex: 0 },
];

const DEMO_PIECE = JAN1_SOLUTION[0];
const FAST_FORWARD_PIECES = JAN1_SOLUTION.slice(1);

const CAPTIONS = [
  "Goal: leave Jan and 1 uncovered",
  "Select a piece from the tray…",
  "…then click the board to place it",
  "Fill in the rest of the pieces",
  "",
  "",
  "",
  "",
  "",
  "",
  "Puzzle complete!",
];

// step 0: empty board
// step 1: piece 1 "selected" (shown in tray with cursor)
// step 2: piece 1 placed on board
// step 3–9: remaining 7 pieces placed one by one
// step 10: complete / pause before loop
const STEP_DELAYS = [
  1800, // 0→1
  1400, // 1→2
  1200, // 2→3
  350,  // 3→4
  350,  // 4→5
  350,  // 5→6
  350,  // 6→7
  350,  // 7→8
  350,  // 8→9
  350,  // 9→10
];

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TutorialModal({ open, onClose }: TutorialModalProps) {
  const [step, setStep] = useState(0);

  const targetSet = useMemo(() => {
    const cells = getTargetCells("Jan", 1);
    return new Set(cells.map(([r, c]) => `${r},${c}`));
  }, []);

  const visiblePieceIds = useMemo(() => {
    if (step < 2) return new Set<number>();
    const ids = new Set([DEMO_PIECE.pieceId]);
    const ffCount = Math.min(step - 2, FAST_FORWARD_PIECES.length);
    for (let i = 0; i < ffCount; i++) {
      ids.add(FAST_FORWARD_PIECES[i].pieceId);
    }
    return ids;
  }, [step]);

  const lastPlacedId = useMemo(() => {
    if (step === 2) return DEMO_PIECE.pieceId;
    if (step >= 3 && step <= 9) return FAST_FORWARD_PIECES[step - 3]?.pieceId ?? null;
    return null;
  }, [step]);

  const cellColors = useMemo(() => {
    const map = new Map<string, { pieceId: number; isNew: boolean }>();
    for (const pp of JAN1_SOLUTION) {
      if (!visiblePieceIds.has(pp.pieceId)) continue;
      const piece = getPieceById(pp.pieceId);
      if (!piece) continue;
      const orientation = piece.orientations[pp.orientationIndex];
      if (!orientation) continue;
      const absCells = getAbsoluteCells(orientation, pp.row, pp.col);
      for (const [r, c] of absCells) {
        map.set(`${r},${c}`, {
          pieceId: pp.pieceId,
          isNew: pp.pieceId === lastPlacedId,
        });
      }
    }
    return map;
  }, [visiblePieceIds, lastPlacedId]);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }

    if (step >= STEP_DELAYS.length) {
      const t = setTimeout(() => setStep(0), 2500);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setStep((s) => s + 1), STEP_DELAYS[step]);
    return () => clearTimeout(t);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  const isSelecting = step === 1;
  const isComplete = step >= 10;
  const caption = CAPTIONS[Math.min(step, CAPTIONS.length - 1)];

  return (
    <div className="tutorial-backdrop" onClick={handleBackdropClick}>
      <div className="tutorial-modal" role="dialog" aria-label="How to play">
        <div className="tutorial-header">
          <h3>How to Play</h3>
          <button
            type="button"
            className="tutorial-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="tutorial-body">
          {isSelecting && (
            <div className="tutorial-select-demo">
              <MiniPiecePreview
                pieceId={DEMO_PIECE.pieceId}
                orientationIndex={DEMO_PIECE.orientationIndex}
              />
              <span className="tutorial-cursor-icon">
                <CursorSvg />
              </span>
            </div>
          )}

          <div className={`tutorial-board ${isComplete ? "complete" : ""}`}>
            {Array.from({ length: GRID_ROWS }, (_, row) => (
              <div className="tutorial-row" key={row}>
                {Array.from({ length: GRID_COLS }, (_, col) => {
                  const blocked = isBlocked(row, col);
                  const label = getLabelAt(row, col);
                  const isTarget = targetSet.has(`${row},${col}`);
                  const info = cellColors.get(`${row},${col}`);

                  let cls = "tutorial-cell";
                  if (blocked) cls += " blocked";
                  if (isTarget) cls += " target";
                  if (info) cls += " occupied";
                  if (info?.isNew) cls += " pop-in";

                  const style: React.CSSProperties = {};
                  if (info) {
                    style.backgroundColor = PIECE_COLORS[info.pieceId] ?? "#888";
                  }

                  return (
                    <div key={col} className={cls} style={style}>
                      {!blocked && (
                        <span className="tutorial-cell-label">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="tutorial-caption-bar">
            {isComplete && (
              <svg
                className="tutorial-check"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2ecc71"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            <span key={step} className="tutorial-caption">
              {caption}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPiecePreview({
  pieceId,
  orientationIndex,
}: {
  pieceId: number;
  orientationIndex: number;
}) {
  const piece = getPieceById(pieceId);
  if (!piece) return null;
  const orientation = piece.orientations[orientationIndex];
  if (!orientation) return null;

  const cells = orientation.cells;
  const maxR = Math.max(...cells.map(([r]) => r));
  const maxC = Math.max(...cells.map(([, c]) => c));
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  const color = PIECE_COLORS[pieceId] ?? "#888";

  return (
    <div className="tutorial-mini-piece">
      {Array.from({ length: maxR + 1 }, (_, r) => (
        <div className="tutorial-mini-piece-row" key={r}>
          {Array.from({ length: maxC + 1 }, (_, c) => (
            <div
              key={c}
              className={`tutorial-mini-piece-cell ${cellSet.has(`${r},${c}`) ? "filled" : ""}`}
              style={
                cellSet.has(`${r},${c}`)
                  ? { backgroundColor: color }
                  : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CursorSvg() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="#222"
      stroke="#fff"
      strokeWidth="1"
    >
      <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z" />
    </svg>
  );
}
