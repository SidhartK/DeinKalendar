"use client";

import { useReducer, useMemo, useCallback, useRef, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  Coord,
  PlacedPiece,
  GameAction,
  GRID_ROWS,
  GRID_COLS,
  type ShadowAnalysisPayload,
} from "./types";
import {
  createEmptyGrid,
  isBoardComplete,
} from "./utils/board";
import {
  getPieces,
  getPieceById,
  getAnchorCoord,
  getNormalizedTransformedCellsWithIds,
  getAbsoluteCells,
} from "./utils/pieces";
import {
  validatePlacement,
  placePieceOnGrid,
} from "./utils/validation";
import { makePuzzleKey } from "./utils/puzzleKey";
import { eventTargetIsTypingField } from "./utils/keyboard";
import Board from "./components/Board";
import PieceTray from "./components/PieceTray";
import DateSelector from "./components/DateSelector";
import SolverPanel, { type SolverPanelRef } from "./components/SolverPanel";
import HelpHotkeys from "./components/HelpHotkeys";
import TutorialModal from "./components/TutorialModal";
import StatsPanel from "./components/StatsPanel";
import FeedbackSection from "./components/FeedbackSection";
import { hasSeenHowToPlay, markHowToPlaySeen } from "./lib/howToPlayStorage";
import initialSolutionsByDate from "./data/initial_solutions_by_date.json";
import "./App.css";

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

type PuzzleTiming = {
  firstSeenAt: number;
  solvedAt: number | null;
};

interface ReducerState {
  placedPieces: PlacedPiece[];
  targetMonth: string;
  targetDay: number;
  selectedPieceId: number | null;
  selectedOrientation: number;
  selectedAnchorCellId: number | null;
  removedByWStack: PlacedPiece[];
}

function getInitialState(initialMonth: string, initialDay: number): ReducerState {
  return {
    placedPieces: [],
    targetMonth: initialMonth,
    targetDay: initialDay,
    selectedPieceId: null,
    selectedOrientation: 0,
    selectedAnchorCellId: null,
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
        selectedAnchorCellId: null,
        removedByWStack: [],
      };
    case "SET_TARGET_DAY":
      return {
        ...state,
        targetDay: action.day,
        placedPieces: [],
        selectedPieceId: null,
        selectedOrientation: 0,
        selectedAnchorCellId: null,
        removedByWStack: [],
      };
    case "SELECT_PIECE":
      if (action.pieceId == null) {
        return {
          ...state,
          selectedPieceId: null,
          selectedOrientation: 0,
          selectedAnchorCellId: null,
        };
      }
      {
        const piece = getPieceById(action.pieceId);
        const defaultAnchorCellId =
          piece != null
            ? getNormalizedTransformedCellsWithIds(piece, 0)[0]?.id ?? null
            : null;
        return {
          ...state,
          selectedPieceId: action.pieceId,
          selectedOrientation: 0,
          selectedAnchorCellId: defaultAnchorCellId,
        };
      }
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
        selectedAnchorCellId: null,
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
      const piece = getPieceById(action.pieceId);
      const orientation = piece?.orientations[placed.orientationIndex];
      if (!piece || !orientation) return state;

      const clickedCellBelongsToPiece = orientation.cells.some(
        ([r, c]) => placed.row + r === action.row && placed.col + c === action.col
      );
      if (!clickedCellBelongsToPiece) return state;

      const localRow = action.row - placed.row;
      const localCol = action.col - placed.col;
      const transformedCells = getNormalizedTransformedCellsWithIds(
        piece,
        placed.orientationIndex
      );
      const selectedAnchorCellId =
        transformedCells.find(
          ({ r, c }) => r === localRow && c === localCol
        )?.id ?? transformedCells[0]?.id ?? null;

      return {
        ...state,
        placedPieces: state.placedPieces.filter(
          (pp) => pp.pieceId !== action.pieceId
        ),
        selectedPieceId: action.pieceId,
        selectedOrientation: placed.orientationIndex,
        selectedAnchorCellId,
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
        selectedAnchorCellId: null,
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
    case "CLEAR_BOARD":
      return {
        ...state,
        placedPieces: [],
        selectedPieceId: null,
        selectedOrientation: 0,
        selectedAnchorCellId: null,
        removedByWStack: [],
      };
  }
}

interface AppProps {
  initialMonth?: string;
  initialDay?: number;
  competitionMode?: boolean;
  onSolutionFound?: (placedPieces: PlacedPiece[]) => boolean;
  onSolveHint?: (placedPieces: PlacedPiece[]) => void;
  /** When true, open the How to Play modal on mount (e.g. Pi competition start); ignores first-visit storage. */
  openTutorialOnMount?: boolean;
  /** Called when the user closes the tutorial if it was auto-opened via openTutorialOnMount (e.g. to start the competition timer). */
  onInitialTutorialClose?: () => void;
  /** When false, hides the bottom feedback form (e.g. /pi-day). Default true for / and /today. */
  showSiteFeedback?: boolean;
}

export default function App({
  initialMonth = "Jan",
  initialDay = 1,
  competitionMode = false,
  onSolutionFound,
  onSolveHint,
  openTutorialOnMount = false,
  onInitialTutorialClose,
  showSiteFeedback = true,
}: AppProps) {
  const pieces = useMemo(() => getPieces(), []);
  const solverRef = useRef<SolverPanelRef>(null);
  const celebrationDismissBtnRef = useRef<HTMLButtonElement | null>(null);
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
    selectedAnchorCellId,
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
  const [showSolutionToast, setShowSolutionToast] = useState(false);
  const [showDuplicateToast, setShowDuplicateToast] = useState(false);
  const [solverUsedByDate, setSolverUsedByDate] = useState<Record<string, boolean>>({});
  /** Distinct board states on which a hint was requested (same dedupe as /pi). */
  const [hintsUsedCount, setHintsUsedCount] = useState(0);
  const hintsUsedCountRef = useRef(0);
  const hintPuzzleKeysRef = useRef<Set<string>>(new Set());
  /** Each time the user chooses Show # of Coverings per Square (new run or revealing existing overlay). */
  const [shadowShowCount, setShadowShowCount] = useState(0);
  const shadowShowCountRef = useRef(0);
  /** Unique board squares for which the user opened the coverings popover. */
  const [coveringsSquaresViewedCount, setCoveringsSquaresViewedCount] =
    useState(0);
  const coveringsSquaresViewedRef = useRef<Set<string>>(new Set());
  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialWasAutoOpenedRef = useRef(false);
  const [shadowOverlay, setShadowOverlay] = useState<ShadowAnalysisPayload | null>(
    null
  );
  const [shadowsVisible, setShadowsVisible] = useState(false);
  const puzzleTimingByDateRef = useRef<Map<string, PuzzleTiming>>(new Map());
  const [currentElapsedMs, setCurrentElapsedMs] = useState<number | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [initialSolutionsForDate, setInitialSolutionsForDate] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<Coord | null>(null);

  useEffect(() => {
    setShadowOverlay(null);
    setShadowsVisible(false);
  }, [placedPieces, targetMonth, targetDay]);

  useEffect(() => {
    hintPuzzleKeysRef.current = new Set();
    hintsUsedCountRef.current = 0;
    shadowShowCountRef.current = 0;
    coveringsSquaresViewedRef.current = new Set();
    setHintsUsedCount(0);
    setShadowShowCount(0);
    setCoveringsSquaresViewedCount(0);
  }, [targetMonth, targetDay]);

  const handleShadowAnalysis = useCallback((payload: ShadowAnalysisPayload) => {
    setShadowOverlay(payload);
    setShadowsVisible(true);
  }, []);

  const handleHintRunStart = useCallback(() => {
    const key = `${targetMonth}|${targetDay}`;
    setSolverUsedByDate((prev) => ({
      ...prev,
      [key]: true,
    }));
  }, [targetMonth, targetDay]);

  const handleShadowRunStart = useCallback(() => {
    setShadowOverlay(null);
    setShadowsVisible(false);
    const key = `${targetMonth}|${targetDay}`;
    setSolverUsedByDate((prev) => ({
      ...prev,
      [key]: true,
    }));
  }, [targetMonth, targetDay]);

  const handleShadowToggle = useCallback(() => {
    if (shadowsVisible) {
      setShadowsVisible(false);
      return;
    }
    if (shadowOverlay) {
      setShadowsVisible(true);
      const next = shadowShowCountRef.current + 1;
      shadowShowCountRef.current = next;
      setShadowShowCount(next);
    } else {
      const next = shadowShowCountRef.current + 1;
      shadowShowCountRef.current = next;
      setShadowShowCount(next);
      solverRef.current?.startShadowAnalysis();
    }
  }, [shadowsVisible, shadowOverlay]);

  const handleCoveringsViewed = useCallback((row: number, col: number) => {
    const key = `${targetMonth}|${targetDay}|${row},${col}`;
    if (coveringsSquaresViewedRef.current.has(key)) return;
    coveringsSquaresViewedRef.current.add(key);
    setCoveringsSquaresViewedCount(coveringsSquaresViewedRef.current.size);
  }, [targetMonth, targetDay]);

  const handleSolveHintTracked = useCallback(
    (pieces: PlacedPiece[]) => {
      if (competitionMode) {
        onSolveHint?.(pieces);
        return;
      }
      const puzzleKey = makePuzzleKey(pieces);
      if (hintPuzzleKeysRef.current.has(puzzleKey)) return;
      hintPuzzleKeysRef.current.add(puzzleKey);
      const next = hintsUsedCountRef.current + 1;
      hintsUsedCountRef.current = next;
      setHintsUsedCount(next);
    },
    [competitionMode, onSolveHint]
  );

  const pieceNameById = useMemo(() => {
    const m: Record<number, string> = {};
    for (const p of pieces) {
      m[p.id] = p.name;
    }
    return m;
  }, [pieces]);

  useEffect(() => {
    if (openTutorialOnMount) {
      tutorialWasAutoOpenedRef.current = true;
      setShowTutorial(true);
      return;
    }
    if (competitionMode) return;
    if (!hasSeenHowToPlay()) {
      setShowTutorial(true);
    }
  }, [openTutorialOnMount, competitionMode]);

  const handleTutorialClose = useCallback(() => {
    if (tutorialWasAutoOpenedRef.current) {
      tutorialWasAutoOpenedRef.current = false;
      onInitialTutorialClose?.();
    }
    markHowToPlaySeen();
    setShowTutorial(false);
  }, [onInitialTutorialClose]);

  const currentDateKey = `${targetMonth}|${targetDay}`;
  const solverUsedForCurrentDate = !!solverUsedByDate[currentDateKey];

  useEffect(() => {
    const now = Date.now();
    const existing = puzzleTimingByDateRef.current.get(currentDateKey);
    if (!existing) {
      puzzleTimingByDateRef.current.set(currentDateKey, {
        firstSeenAt: now,
        solvedAt: null,
      });
    }
    setCurrentElapsedMs(0);
    setShareStatus("idle");
  }, [currentDateKey]);

  useEffect(() => {
    const key = `${targetMonth}|${targetDay}`;
    const S =
      (initialSolutionsByDate as unknown as { byDateKey?: Record<string, number> })
        .byDateKey?.[key] ?? null;
    setInitialSolutionsForDate(typeof S === "number" ? S : null);
  }, [targetMonth, targetDay]);

  useEffect(() => {
    const timing = puzzleTimingByDateRef.current.get(currentDateKey);
    if (!timing) return;

    const update = () => {
      const end = timing.solvedAt ?? Date.now();
      setCurrentElapsedMs(end - timing.firstSeenAt);
    };

    update();
    if (timing.solvedAt != null) return;
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [currentDateKey, isPuzzleComplete]);

  const handleShareResults = useCallback(async () => {
    const timing = puzzleTimingByDateRef.current.get(currentDateKey);
    const elapsed =
      timing?.firstSeenAt != null
        ? (timing.solvedAt ?? Date.now()) - timing.firstSeenAt
        : null;

    const lines = [
      `Calendar Puzzle — ${targetMonth} ${targetDay}`,
      elapsed != null ? `Time: ${formatDurationMs(elapsed)}` : "Time: —",
      `Initial solutions: ${initialSolutionsForDate == null ? "—" : initialSolutionsForDate.toLocaleString()}`,
      `Hints (distinct board positions): ${hintsUsedCount}`,
      `Show # of Coverings per Square clicks: ${shadowShowCount}`,
      `Squares viewed (coverings): ${coveringsSquaresViewedCount}`,
      solverUsedForCurrentDate ? "Solver used: Yes" : "Solver used: No",
    ];

    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 1500);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setShareStatus("copied");
        window.setTimeout(() => setShareStatus("idle"), 1500);
      } catch {
        setShareStatus("error");
        window.setTimeout(() => setShareStatus("idle"), 2000);
      }
    }
  }, [
    currentDateKey,
    targetMonth,
    targetDay,
    initialSolutionsForDate,
    hintsUsedCount,
    shadowShowCount,
    coveringsSquaresViewedCount,
    solverUsedForCurrentDate,
  ]);

  useEffect(() => {
    if (!isPuzzleComplete) {
      celebratedRef.current = false;
      return;
    }
    if (celebratedRef.current) return;
    celebratedRef.current = true;
    console.log("Puzzle solved!", { targetMonth, targetDay });

    const timing = puzzleTimingByDateRef.current.get(currentDateKey);
    if (timing && timing.solvedAt == null) {
      timing.solvedAt = Date.now();
      puzzleTimingByDateRef.current.set(currentDateKey, timing);
    }

    if (competitionMode) {
      const isNew = onSolutionFound?.(placedPieces) ?? true;
      if (isNew) {
        setShowSolutionToast(true);
      } else {
        setShowDuplicateToast(true);
      }
      const hideToast = setTimeout(() => {
        setShowSolutionToast(false);
        setShowDuplicateToast(false);
      }, 2000);
      const clearBoard = setTimeout(() => {
        dispatch({ type: "CLEAR_BOARD" });
        celebratedRef.current = false;
      }, 2000);
      return () => {
        clearTimeout(hideToast);
        clearTimeout(clearBoard);
      };
    }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPuzzleComplete]);

  useEffect(() => {
    if (!showCelebration) return;

    celebrationDismissBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (eventTargetIsTypingField(e.target)) return;
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      setShowCelebration(false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [showCelebration]);

  const selectedPiece =
    selectedPieceId != null ? getPieceById(selectedPieceId) ?? null : null;

  const selectedAnchorCoord = useMemo<Coord | null>(() => {
    if (!selectedPiece) return null;
    if (selectedAnchorCellId == null) {
      const orientation = selectedPiece.orientations[selectedOrientation];
      return orientation?.cells[0] ?? [0, 0];
    }
    return getAnchorCoord(selectedPiece, selectedOrientation, selectedAnchorCellId);
  }, [selectedPiece, selectedOrientation, selectedAnchorCellId]);

  // Clear hoverCell whenever the selected piece changes (placed, deselected, picked up).
  useEffect(() => {
    if (selectedPieceId == null) setHoverCell(null);
  }, [selectedPieceId]);

  // Whether all cells of the selected piece are completely off the board at the current hoverCell.
  const isPieceOffBoard = useMemo(() => {
    if (!selectedPiece || !hoverCell || !selectedAnchorCoord) return false;
    const orientation = selectedPiece.orientations[selectedOrientation];
    if (!orientation) return false;
    const [anchorR, anchorC] = selectedAnchorCoord;
    const placementRow = hoverCell[0] - anchorR;
    const placementCol = hoverCell[1] - anchorC;
    const cells = getAbsoluteCells(orientation, placementRow, placementCol);
    return cells.every(
      ([r, c]) => r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS
    );
  }, [selectedPiece, selectedOrientation, selectedAnchorCoord, hoverCell]);

  // Capture-phase arrow key handler: when a piece is held over the board, arrow keys
  // move the piece instead of rotating/flipping it (which is handled by PieceTray's
  // bubble-phase listener). stopImmediatePropagation prevents PieceTray from seeing
  // the event when in move mode.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (eventTargetIsTypingField(e.target)) return;
      if (selectedPieceId == null || hoverCell == null) return;

      let dr = 0, dc = 0;
      if (e.key === "ArrowUp") dr = -1;
      else if (e.key === "ArrowDown") dr = 1;
      else if (e.key === "ArrowLeft") dc = -1;
      else if (e.key === "ArrowRight") dc = 1;
      else return;

      e.preventDefault();
      e.stopImmediatePropagation();
      setHoverCell((prev) => {
        if (prev == null) return null;
        const [r, c] = prev;
        return [r + dr, c + dc] as Coord;
      });
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [selectedPieceId, hoverCell]);

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
      if (!selectedPiece || !selectedAnchorCoord) return;
      const orientation = selectedPiece.orientations[selectedOrientation];
      if (!orientation) return;
      const [anchorR, anchorC] = selectedAnchorCoord;
      const placementRow = row - anchorR;
      const placementCol = col - anchorC;

      const result = validatePlacement(
        grid,
        orientation,
        placementRow,
        placementCol,
        targetMonth,
        targetDay
      );
      if (!result.valid) return;

      dispatch({
        type: "PLACE_PIECE",
        piece: {
          pieceId: selectedPiece.id,
          row: placementRow,
          col: placementCol,
          orientationIndex: selectedOrientation,
        },
      });
    },
    [
      selectedPiece,
      selectedOrientation,
      selectedAnchorCoord,
      grid,
      targetMonth,
      targetDay,
    ]
  );

  const handleRemovePiece = useCallback(
    (pieceId: number) => {
      dispatch({ type: "REMOVE_PIECE", pieceId });
    },
    []
  );

  const handlePickUpPiece = useCallback((pieceId: number, row: number, col: number) => {
    dispatch({ type: "PICK_UP_PIECE", pieceId, row, col });
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
    solverRef.current?.startHint();
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
      <TutorialModal open={showTutorial} onClose={handleTutorialClose} />
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
            <p className="celebration-subtitle">
              Time:{" "}
              {currentElapsedMs != null ? formatDurationMs(currentElapsedMs) : "—"}
            </p>
            <p className="celebration-subtitle">
              Initial solutions:{" "}
              {initialSolutionsForDate == null
                ? "—"
                : initialSolutionsForDate.toLocaleString()}
            </p>
            {!solverUsedForCurrentDate && (
              <p className="celebration-subtitle">
                You found the solution with no help!
              </p>
            )}
            <p className="celebration-subtitle">
              Hints (distinct board positions): {hintsUsedCount}
            </p>
            <p className="celebration-subtitle">
              Show # of Coverings per Square clicks: {shadowShowCount}
            </p>
            <p className="celebration-subtitle">
              Squares viewed (coverings): {coveringsSquaresViewedCount}
            </p>
            <button
              type="button"
              className="celebration-dismiss"
              onClick={handleShareResults}
            >
              {shareStatus === "copied"
                ? "Copied!"
                : shareStatus === "error"
                  ? "Copy failed"
                  : "Copy results"}
            </button>
            <button
              type="button"
              className="celebration-dismiss"
              ref={celebrationDismissBtnRef}
              onClick={() => setShowCelebration(false)}
            >
              Dismiss (&#x21A9;)
            </button>
          </div>
        </div>
      )}
      {showSolutionToast && (
        <div className="solution-toast" role="status" aria-live="polite">
          Solution recorded!
        </div>
      )}
      {showDuplicateToast && (
        <div className="solution-toast solution-toast--duplicate" role="status" aria-live="polite">
          Already found this solution!
        </div>
      )}
      <header className="app-header">
        <h1>{competitionMode ? "Pi Day Competition" : "Calendar Puzzle"}</h1>
        <p className="app-instructions">
          Place all of the pieces on the board so that they do not cover the month and day squares (highlighted in yellow).
        </p>
      </header>
      <main className="app-main">
        <div className="app-panel app-panel--solver">
          <button
            type="button"
            className="help-tutorial-trigger"
            onClick={() => setShowTutorial(true)}
            title="How to play"
            aria-label="How to play"
          >
            ?
          </button>
          <HelpHotkeys />
          {isPuzzleComplete ? (
            <StatsPanel
              timeTakenMs={currentElapsedMs}
              hintsUsedCount={hintsUsedCount}
              coveringsButtonClickCount={shadowShowCount}
              coveringsSquaresViewedCount={coveringsSquaresViewedCount}
              initialSolutions={initialSolutionsForDate}
              onShare={handleShareResults}
              shareStatus={shareStatus}
            />
          ) : (
            <SolverPanel
              ref={solverRef}
              targetMonth={targetMonth}
              targetDay={targetDay}
              placedPieces={placedPieces}
              onHintRunStart={handleHintRunStart}
              onShadowRunStart={handleShadowRunStart}
              onSolveHint={handleSolveHintTracked}
              onShadowAnalysis={handleShadowAnalysis}
              shadowsVisible={shadowsVisible}
              shadowHasData={shadowOverlay != null}
              onShadowToggle={handleShadowToggle}
            />
          )}
        </div>
        <div className="app-left-column">
          {!competitionMode && (
          <div className="app-panel app-panel--date">
            <DateSelector
              month={targetMonth}
              day={targetDay}
              onMonthChange={handleMonthChange}
              onDayChange={handleDayChange}
            />
          </div>
          )}
          <div className="help-tutorial-mobile">
            <button
              type="button"
              className="help-tutorial-trigger"
              onClick={() => setShowTutorial(true)}
              title="How to play"
              aria-label="How to play"
            >
              ?
            </button>
          </div>
          <div className="app-panel app-panel--board">
            <Board
              grid={grid}
              targetMonth={targetMonth}
              targetDay={targetDay}
              selectedPiece={selectedPiece ?? null}
              selectedOrientation={selectedOrientation}
              selectedAnchorCoord={selectedAnchorCoord}
              hoverCell={hoverCell}
              onHoverCellChange={setHoverCell}
              onPlacePiece={handlePlacePiece}
              onPickUpPiece={handlePickUpPiece}
              shadowOverlay={shadowsVisible ? shadowOverlay : null}
              shadowsVisible={shadowsVisible}
              onCoveringsViewed={handleCoveringsViewed}
              pieceNameById={pieceNameById}
            />
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
            onShadowToggle={handleShadowToggle}
            shadowsVisible={shadowsVisible}
            isPieceOffBoard={isPieceOffBoard}
          />
        </div>
      </main>
      {!competitionMode && showSiteFeedback ? (
        <FeedbackSection theme="light" />
      ) : null}
    </div>
  );
}
