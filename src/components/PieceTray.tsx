"use client";

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
  onRemoveLastPiece: () => void;
  onRestoreLastRemoved: () => void;
  onSolve: () => void;
}

export default function PieceTray({
  pieces,
  placedPieceIds,
  selectedPieceId,
  selectedOrientation,
  onSelectPiece,
  onSetOrientation,
  onRemoveLastPiece,
  onRestoreLastRemoved,
  onSolve,
}: PieceTrayProps) {
  const selectedPiece = pieces.find((p) => p.id === selectedPieceId) ?? null;
  const orientationCount = selectedPiece?.orientations.length ?? 0;

  const rotateForward = useCallback(() => {
    if (!selectedPiece) return;
    const flipped = selectedOrientation >= 4;
    const next = (selectedOrientation % 4 + (flipped ? -1 : 1)) % 4 + (flipped ? 4 : 0);
    onSetOrientation(next);
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  const flip = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation((selectedOrientation + 4) % 8);
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        rotateForward();
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        flip();
      } else if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        onSelectPiece(null);
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        onRemoveLastPiece();
      } else if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        onRestoreLastRemoved();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onSolve();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rotateForward, flip, onSelectPiece, onRemoveLastPiece, onRestoreLastRemoved, onSolve]);

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
            <button className="control-btn" onClick={flip} title="Flip (E)">
              ↔ Flip
            </button>
          </div>
          <span className="orientation-label">
            {selectedOrientation + 1} / {orientationCount}
          </span>
          <button
            className="control-btn deselect-btn"
            onClick={() => onSelectPiece(null)}
            title="Deselect (Q)"
          >
            Deselect
          </button>
        </div>
      )}

      <div className="piece-grid">
        {pieces.map((piece) => {
          const isPlaced = placedPieceIds.has(piece.id);
          return (
            <div key={piece.id} className="piece-slot">
              <PiecePreview
                pieceId={piece.id}
                orientation={piece.orientations[0]}
                isSelected={piece.id === selectedPieceId}
                isPlaced={isPlaced}
                onClick={
                  isPlaced
                    ? undefined
                    : () =>
                        onSelectPiece(
                          piece.id === selectedPieceId ? null : piece.id
                        )
                }
              />
              <span
                className={`piece-name ${isPlaced ? "placed" : ""}`}
                style={{ color: PIECE_COLORS[piece.id] ?? "#888" }}
              >
                {piece.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
