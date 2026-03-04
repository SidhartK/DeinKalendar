import { useReducer, useMemo, useCallback } from "react";
import { PlacedPiece, GameAction } from "./types";
import { createEmptyGrid } from "./utils/board";
import { getPieces, getPieceById } from "./utils/pieces";
import {
  validatePlacement,
  placePieceOnGrid,
} from "./utils/validation";
import Board from "./components/Board";
import PieceTray from "./components/PieceTray";
import DateSelector from "./components/DateSelector";
import SolverPanel from "./components/SolverPanel";
import "./App.css";

interface ReducerState {
  placedPieces: PlacedPiece[];
  targetMonth: string;
  targetDay: number;
  selectedPieceId: number | null;
  selectedOrientation: number;
}

const initialState: ReducerState = {
  placedPieces: [],
  targetMonth: "Jan",
  targetDay: 1,
  selectedPieceId: null,
  selectedOrientation: 0,
};

function gameReducer(state: ReducerState, action: GameAction): ReducerState {
  switch (action.type) {
    case "SET_TARGET_MONTH":
      return {
        ...state,
        targetMonth: action.month,
        placedPieces: [],
        selectedPieceId: null,
        selectedOrientation: 0,
      };
    case "SET_TARGET_DAY":
      return {
        ...state,
        targetDay: action.day,
        placedPieces: [],
        selectedPieceId: null,
        selectedOrientation: 0,
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
      };
    case "REMOVE_PIECE":
      return {
        ...state,
        placedPieces: state.placedPieces.filter(
          (pp) => pp.pieceId !== action.pieceId
        ),
      };
  }
}

export default function App() {
  const pieces = useMemo(() => getPieces(), []);
  const [state, dispatch] = useReducer(gameReducer, initialState);
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
      <header className="app-header">
        <h1>Calendar Puzzle</h1>
      </header>
      <main className="app-main">
        <Board
          grid={grid}
          targetMonth={targetMonth}
          targetDay={targetDay}
          selectedPiece={selectedPiece ?? null}
          selectedOrientation={selectedOrientation}
          onPlacePiece={handlePlacePiece}
          onRemovePiece={handleRemovePiece}
        />
        <aside className="app-sidebar">
          <DateSelector
            month={targetMonth}
            day={targetDay}
            onMonthChange={handleMonthChange}
            onDayChange={handleDayChange}
          />
          <PieceTray
            pieces={pieces}
            placedPieceIds={placedPieceIds}
            selectedPieceId={selectedPieceId}
            selectedOrientation={selectedOrientation}
            onSelectPiece={handleSelectPiece}
            onSetOrientation={handleSetOrientation}
          />
          <SolverPanel
            targetMonth={targetMonth}
            targetDay={targetDay}
            placedPieces={placedPieces}
          />
        </aside>
      </main>
    </div>
  );
}
