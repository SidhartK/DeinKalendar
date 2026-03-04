import { useState, useMemo, useCallback } from "react";
import { PlacedPiece } from "./types";
import { createEmptyGrid } from "./utils/board";
import { getPieces, getPieceById } from "./utils/pieces";
import {
  validatePlacement,
  placePieceOnGrid,
} from "./utils/validation";
import Board from "./components/Board";
import PieceTray from "./components/PieceTray";
import DateSelector from "./components/DateSelector";
import "./App.css";

export default function App() {
  const pieces = useMemo(() => getPieces(), []);

  const [targetMonth, setTargetMonth] = useState("Jan");
  const [targetDay, setTargetDay] = useState(1);
  const [placedPieces, setPlacedPieces] = useState<PlacedPiece[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [selectedOrientation, setSelectedOrientation] = useState(0);

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

  const selectedPiece = selectedPieceId != null ? getPieceById(selectedPieceId) ?? null : null;

  const handleSelectPiece = useCallback((id: number | null) => {
    setSelectedPieceId(id);
    setSelectedOrientation(0);
  }, []);

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

      setPlacedPieces((prev) => [
        ...prev,
        {
          pieceId: selectedPiece.id,
          row,
          col,
          orientationIndex: selectedOrientation,
        },
      ]);
      setSelectedPieceId(null);
      setSelectedOrientation(0);
    },
    [selectedPiece, selectedOrientation, grid, targetMonth, targetDay]
  );

  const handleRemovePiece = useCallback((pieceId: number) => {
    setPlacedPieces((prev) => prev.filter((pp) => pp.pieceId !== pieceId));
  }, []);

  const handleMonthChange = useCallback((month: string) => {
    setTargetMonth(month);
    setPlacedPieces([]);
  }, []);

  const handleDayChange = useCallback((day: number) => {
    setTargetDay(day);
    setPlacedPieces([]);
  }, []);

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
            onSetOrientation={setSelectedOrientation}
          />
        </aside>
      </main>
    </div>
  );
}
