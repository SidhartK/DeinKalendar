import { Orientation, PIECE_COLORS } from "../types";
import "./PieceTray.css";

interface PiecePreviewProps {
  pieceId: number;
  orientation: Orientation;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function PiecePreview({
  pieceId,
  orientation,
  isSelected,
  onClick,
}: PiecePreviewProps) {
  const cells = orientation.cells;
  const maxR = Math.max(...cells.map(([r]) => r)) + 1;
  const maxC = Math.max(...cells.map(([, c]) => c)) + 1;
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  const color = PIECE_COLORS[pieceId] ?? "#888";

  return (
    <div
      className={`piece-preview ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      style={isSelected ? { borderColor: color } : undefined}
    >
      <div className="piece-mini-grid">
        {Array.from({ length: maxR }, (_, r) => (
          <div className="piece-mini-row" key={r}>
            {Array.from({ length: maxC }, (_, c) => (
              <div
                key={c}
                className={`piece-mini-cell ${cellSet.has(`${r},${c}`) ? "filled" : ""}`}
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
    </div>
  );
}
