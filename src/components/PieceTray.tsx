import { useEffect, useCallback } from "react";
import { PieceDefinition, PIECE_COLORS } from "../types";
import PiecePreview from "./PiecePreview";
import "./PieceTray.css";

interface PieceTrayProps {
  pieces: PieceDefinition[];
  placedPieceIds: Set<number>;
  selectedPieceId: number | null;
  selectedOrientation: number;
  onSelectPiece: (id: number | null) => void;
  onSetOrientation: (index: number) => void;
}

export default function PieceTray({
  pieces,
  placedPieceIds,
  selectedPieceId,
  selectedOrientation,
  onSelectPiece,
  onSetOrientation,
}: PieceTrayProps) {
  const selectedPiece = pieces.find((p) => p.id === selectedPieceId) ?? null;
  const orientationCount = selectedPiece?.orientations.length ?? 0;

  const rotateForward = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation((selectedOrientation + 1) % orientationCount);
  }, [selectedPiece, selectedOrientation, orientationCount, onSetOrientation]);

  const flip = useCallback(() => {
    if (!selectedPiece) return;
    // Jump to the mirror orientation: skip half the orientations
    const half = Math.floor(orientationCount / 2);
    if (half === 0) return;
    const flipped = (selectedOrientation + half) % orientationCount;
    onSetOrientation(flipped);
  }, [selectedPiece, selectedOrientation, orientationCount, onSetOrientation]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        rotateForward();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        flip();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rotateForward, flip]);

  const unplacedPieces = pieces.filter((p) => !placedPieceIds.has(p.id));

  return (
    <div className="piece-tray">
      <h3 className="tray-title">Pieces</h3>

      {selectedPiece && (
        <div className="orientation-controls">
          <div className="selected-piece-preview">
            <PiecePreview
              pieceId={selectedPiece.id}
              orientation={selectedPiece.orientations[selectedOrientation]}
              isSelected
            />
          </div>
          <div className="orientation-buttons">
            <button className="control-btn" onClick={rotateForward} title="Rotate (R)">
              ↻ Rotate
            </button>
            <button className="control-btn" onClick={flip} title="Flip (F)">
              ↔ Flip
            </button>
          </div>
          <span className="orientation-label">
            {selectedOrientation + 1} / {orientationCount}
          </span>
          <button
            className="control-btn deselect-btn"
            onClick={() => onSelectPiece(null)}
          >
            Deselect
          </button>
        </div>
      )}

      <div className="piece-grid">
        {unplacedPieces.map((piece) => (
          <div key={piece.id} className="piece-slot">
            <PiecePreview
              pieceId={piece.id}
              orientation={piece.orientations[0]}
              isSelected={piece.id === selectedPieceId}
              onClick={() =>
                onSelectPiece(piece.id === selectedPieceId ? null : piece.id)
              }
            />
            <span
              className="piece-name"
              style={{ color: PIECE_COLORS[piece.id] ?? "#888" }}
            >
              {piece.name}
            </span>
          </div>
        ))}
        {unplacedPieces.length === 0 && (
          <p className="all-placed">All pieces placed!</p>
        )}
      </div>
    </div>
  );
}
