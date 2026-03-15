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

// Orientation chain: 7 → rotate → 6 → rotate → 5 → flip → 1 (solution)
const ORIENT_SELECT = 7;
const ORIENT_AFTER_ROT1 = 6;
const ORIENT_AFTER_ROT2 = 5;
const ORIENT_AFTER_FLIP = 1;

// step 0:  empty board
// step 1:  piece selected at orientation 7, cursor pulsing
// step 2:  cursor clicks piece → rotates to 6
// step 3:  cursor clicks piece again → rotates to 5
// step 4:  cursor slides down, clicks Flip button → flips to 1
// step 5:  piece placed on board
// step 6–12: remaining 7 pieces fast-forward
// step 13: complete / pause before loop

const CAPTIONS = [
  "Goal: leave Jan and 1 uncovered",
  "Select a piece from the tray\u2026",
  "Click to rotate",
  "Click again to keep rotating",
  "Use Flip to mirror the piece",
  "Click the board to place it",
  "Fill in the rest of the pieces",
  "", "", "", "", "", "",
  "Puzzle complete!",
];

const STEP_DELAYS = [
  1800, // 0→1
  1400, // 1→2
  1000, // 2→3
  1200, // 3→4
  1400, // 4→5
  1200, // 5→6
  350,  // 6→7
  350,  // 7→8
  350,  // 8→9
  350,  // 9→10
  350,  // 10→11
  350,  // 11→12
  350,  // 12→13
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
    if (step < 5) return new Set<number>();
    const ids = new Set([DEMO_PIECE.pieceId]);
    const ffCount = Math.min(step - 5, FAST_FORWARD_PIECES.length);
    for (let i = 0; i < ffCount; i++) {
      ids.add(FAST_FORWARD_PIECES[i].pieceId);
    }
    return ids;
  }, [step]);

  const lastPlacedId = useMemo(() => {
    if (step === 5) return DEMO_PIECE.pieceId;
    if (step >= 6 && step <= 12) return FAST_FORWARD_PIECES[step - 6]?.pieceId ?? null;
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

  const showPieceDemo = step >= 1 && step <= 4;
  const isComplete = step >= 13;
  const caption = CAPTIONS[Math.min(step, CAPTIONS.length - 1)];

  const demoOrientIndex =
    step <= 1 ? ORIENT_SELECT :
    step === 2 ? ORIENT_AFTER_ROT1 :
    step === 3 ? ORIENT_AFTER_ROT2 :
    ORIENT_AFTER_FLIP;

  const isRotating1 = step === 2;
  const isRotating2 = step === 3;
  const isFlipping = step === 4;
  const cursorAtPiece = step >= 1 && step <= 3;

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
          {showPieceDemo && (
            <div className="tutorial-piece-demo">
              <div
                className={`tutorial-piece-wrapper ${isRotating1 || isRotating2 ? "rotate-click" : ""}`}
                key={isRotating1 ? "r1" : isRotating2 ? "r2" : "idle"}
              >
                <MiniPiecePreview
                  key={demoOrientIndex}
                  pieceId={DEMO_PIECE.pieceId}
                  orientationIndex={demoOrientIndex}
                />
                {cursorAtPiece && (
                  <span
                    className={`tutorial-cursor-icon ${isRotating1 || isRotating2 ? "clicking" : ""}`}
                    key={isRotating1 ? "c1" : isRotating2 ? "c2" : "c0"}
                  >
                    <CursorSvg />
                  </span>
                )}
              </div>
              <div className="tutorial-flip-row">
                <button
                  type="button"
                  className={`tutorial-flip-btn ${isFlipping ? "pressed" : ""}`}
                  tabIndex={-1}
                >
                  ↔ Flip
                </button>
                {isFlipping && (
                  <span className="tutorial-cursor-icon slide-to-flip">
                    <CursorSvg />
                  </span>
                )}
              </div>
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
