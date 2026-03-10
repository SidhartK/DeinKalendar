"use client";

import { useReducer, useMemo, useCallback, useRef, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { PlacedPiece, GameAction } from "./types";
import { createEmptyGrid, isBoardComplete } from "./utils/board";
import { getPieces, getPieceById } from "./utils/pieces";
import {
  validatePlacement,
  placePieceOnGrid,
} from "./utils/validation";
import Board from "./components/Board";
import PieceTray from "./components/PieceTray";
import DateSelector from "./components/DateSelector";
import SolverPanel, { type SolverPanelRef } from "./components/SolverPanel";
import "./App.css";

interface ReducerState {
  placedPieces: PlacedPiece[];
  targetMonth: string;
  targetDay: number;
  selectedPieceId: number | null;
  selectedOrientation: number;
  removedByWStack: PlacedPiece[];
}

function getInitialState(initialMonth: string, initialDay: number): ReducerState {
  return {
    placedPieces: [],
    targetMonth: initialMonth,
    targetDay: initialDay,
    selectedPieceId: null,
    selectedOrientation: 0,
    removedByWStack: [],
  };
}

function gameReducer(state: ReducerState, action: GameAction): ReducerState {
  switch (action.type) {
    case "SET_TARGET_MONTH":
      return {
        ...state,
        targetMonth: action.month,
        placedPieces: [],
        selectedPieceId: null,
        selectedOrientation: 0,
        removedByWStack: [],
      };
    case "SET_TARGET_DAY":
      return {
        ...state,
        targetDay: action.day,
        placedPieces: [],
        selectedPieceId: null,
        selectedOrientation: 0,
        removedByWStack: [],
      };
    case "SELECT_PIECE":
      return {
        ...state,
        selectedPieceId: action.pieceId,
        selectedOrientation: 0,
      };
    case "SET_ORIENTATION":
      return {
        ...state,
        selectedOrientation: action.index,
      };
    case "PLACE_PIECE":
      return {
        ...state,
        placedPieces: [...state.placedPieces, action.piece],
        selectedPieceId: null,
        selectedOrientation: 0,
        removedByWStack: [],
      };
    case "REMOVE_PIECE":
      return {
        ...state,
        placedPieces: state.placedPieces.filter(
          (pp) => pp.pieceId !== action.pieceId
        ),
      };
    case "PICK_UP_PIECE": {
      const placed = state.placedPieces.find(
        (pp) => pp.pieceId === action.pieceId
      );
      if (!placed) return state;
      return {
        ...state,
        placedPieces: state.placedPieces.filter(
          (pp) => pp.pieceId !== action.pieceId
        ),
        selectedPieceId: action.pieceId,
        selectedOrientation: placed.orientationIndex,
      };
    }
    case "REMOVE_LAST_PIECE": {
      if (state.placedPieces.length === 0) return state;
      const last = state.placedPieces[state.placedPieces.length - 1];
      return {
        ...state,
        placedPieces: state.placedPieces.slice(0, -1),
        selectedPieceId: null,
        selectedOrientation: 0,
        removedByWStack: [...state.removedByWStack, last],
      };
    }
    case "RESTORE_LAST_REMOVED": {
      if (state.removedByWStack.length === 0) return state;
      const piece = state.removedByWStack[state.removedByWStack.length - 1];
      return {
        ...state,
        placedPieces: [...state.placedPieces, piece],
        removedByWStack: state.removedByWStack.slice(0, -1),
      };
    }
  }
}

interface AppProps {
  initialMonth?: string;
  initialDay?: number;
}

export default function App({ initialMonth = "Jan", initialDay = 1 }: AppProps) {
  const pieces = useMemo(() => getPieces(), []);
  const solverRef = useRef<SolverPanelRef>(null);
  const [state, dispatch] = useReducer(
    gameReducer,
    getInitialState(initialMonth, initialDay)
  );
  const {
    placedPieces,
    targetMonth,
    targetDay,
    selectedPieceId,
    selectedOrientation,
  } = state;

  const grid = useMemo(() => {
    let g = createEmptyGrid();
    for (const pp of placedPieces) {
      const piece = getPieceById(pp.pieceId);
      if (!piece) continue;
      const orientation = piece.orientations[pp.orientationIndex];
      if (!orientation) continue;
      const result = validatePlacement(
        g,
        orientation,
        pp.row,
        pp.col,
        targetMonth,
        targetDay
      );
      if (result.valid && result.cells) {
        g = placePieceOnGrid(g, result.cells, pp.pieceId);
      }
    }
    return g;
  }, [placedPieces, targetMonth, targetDay]);

  const placedPieceIds = useMemo(
    () => new Set(placedPieces.map((pp) => pp.pieceId)),
    [placedPieces]
  );

  const isPuzzleComplete =
    placedPieces.length === pieces.length &&
    isBoardComplete(grid, targetMonth, targetDay);

  const celebratedRef = useRef(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [solverUsed, setSolverUsed] = useState(false);

  useEffect(() => {
    if (!isPuzzleComplete) {
      celebratedRef.current = false;
      return;
    }
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    console.log("Puzzle solved!", { targetMonth, targetDay });
    setShowCelebration(true);

    const duration = 3 * 1000;
    const end = Date.now() + duration;
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#e84393"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    const t1 = setTimeout(() => {
      confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 }, colors });
    }, 200);
    const t2 = setTimeout(() => {
      confetti({ particleCount: 50, angle: 90, spread: 70, origin: { y: 0.8 }, colors });
    }, 600);

    const hide = setTimeout(() => setShowCelebration(false), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(hide);
    };
  }, [isPuzzleComplete]);

  const selectedPiece =
    selectedPieceId != null ? getPieceById(selectedPieceId) ?? null : null;

  const handleSelectPiece = useCallback(
    (id: number | null) => {
      dispatch({ type: "SELECT_PIECE", pieceId: id });
    },
    []
  );

  const handleSetOrientation = useCallback(
    (index: number) => {
      dispatch({ type: "SET_ORIENTATION", index });
    },
    []
  );

  const handlePlacePiece = useCallback(
    (row: number, col: number) => {
      if (!selectedPiece) return;
      const orientation = selectedPiece.orientations[selectedOrientation];
      if (!orientation) return;

      const result = validatePlacement(
        grid,
        orientation,
        row,
        col,
        targetMonth,
        targetDay
      );
      if (!result.valid) return;

      dispatch({
        type: "PLACE_PIECE",
        piece: {
          pieceId: selectedPiece.id,
          row,
          col,
          orientationIndex: selectedOrientation,
        },
      });
    },
    [selectedPiece, selectedOrientation, grid, targetMonth, targetDay]
  );

  const handleRemovePiece = useCallback(
    (pieceId: number) => {
      dispatch({ type: "REMOVE_PIECE", pieceId });
    },
    []
  );

  const handlePickUpPiece = useCallback((pieceId: number) => {
    dispatch({ type: "PICK_UP_PIECE", pieceId });
  }, []);

  const handleRemoveLastPiece = useCallback(() => {
    if (placedPieces.length > 0) {
      dispatch({ type: "REMOVE_LAST_PIECE" });
    }
  }, [placedPieces]);

  const handleRestoreLastRemoved = useCallback(() => {
    if (state.removedByWStack.length > 0) {
      dispatch({ type: "RESTORE_LAST_REMOVED" });
    }
  }, [state.removedByWStack.length]);

  const handleSolve = useCallback(() => {
    solverRef.current?.start();
  }, []);

  const handleMonthChange = useCallback(
    (month: string) => {
      dispatch({ type: "SET_TARGET_MONTH", month });
    },
    []
  );

  const handleDayChange = useCallback(
    (day: number) => {
      dispatch({ type: "SET_TARGET_DAY", day });
    },
    []
  );

  return (
    <div className="app">
      {showCelebration && (
        <div
          className="celebration-overlay"
          role="alert"
          aria-live="polite"
        >
          <div className="celebration-card">
            <span className="celebration-emoji" aria-hidden>🎉</span>
            <h2 className="celebration-title">You did it!</h2>
            <p className="celebration-subtitle">
              All pieces placed for {targetMonth} {targetDay}.
            </p>
            {!solverUsed && (
              <p className="celebration-subtitle">
                You found the solution with no help!
              </p>
            )}
            <button
              type="button"
              className="celebration-dismiss"
              onClick={() => setShowCelebration(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <header className="app-header">
        <h1>Calendar Puzzle</h1>
        <p className="app-instructions">
          Place all of the pieces on the board so that they do not cover the month and day squares (highlighted in yellow).
        </p>
      </header>
      <main className="app-main">
        <div className="app-panel app-panel--solver">
          <SolverPanel
            ref={solverRef}
            targetMonth={targetMonth}
            targetDay={targetDay}
            placedPieces={placedPieces}
            onSolveStart={() => setSolverUsed(true)}
          />
        </div>
        <div className="app-left-column">
          <div className="app-panel app-panel--date">
            <DateSelector
              month={targetMonth}
              day={targetDay}
              onMonthChange={handleMonthChange}
              onDayChange={handleDayChange}
            />
          </div>
          <div className="app-panel app-panel--board">
            <Board
              grid={grid}
              targetMonth={targetMonth}
              targetDay={targetDay}
              selectedPiece={selectedPiece ?? null}
              selectedOrientation={selectedOrientation}
              onPlacePiece={handlePlacePiece}
              onPickUpPiece={handlePickUpPiece}
            />
            <div className="board-actions">
              <button
                type="button"
                className="control-btn remove-last-piece-btn"
                onClick={handleRemoveLastPiece}
                disabled={placedPieces.length === 0}
              >
                Remove the last piece (Q)
              </button>
              <button
                type="button"
                className="control-btn undo-removal-btn"
                onClick={handleRestoreLastRemoved}
                disabled={state.removedByWStack.length === 0}
              >
                Undo last removal (W)
              </button>
            </div>
          </div>
        </div>
        <div className="app-panel app-panel--pieces">
          <PieceTray
            pieces={pieces}
            placedPieceIds={placedPieceIds}
            selectedPieceId={selectedPieceId}
            selectedOrientation={selectedOrientation}
            onSelectPiece={handleSelectPiece}
            onSetOrientation={handleSetOrientation}
            onRemoveLastPiece={handleRemoveLastPiece}
            onRestoreLastRemoved={handleRestoreLastRemoved}
            onSolve={handleSolve}
          />
        </div>
      </main>
    </div>
  );
}
