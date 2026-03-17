 "use client";

import { useEffect, useCallback } from "react";
import { PieceDefinition, PIECE_COLORS } from "../types";
import {
  rotateOrientation90CW,
  rotateOrientation90CCW,
  flipOrientationIndex,
  flipOrientationVertically,
} from "../utils/pieces";
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

  const rotateForward = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation(rotateOrientation90CW(selectedOrientation));
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  const flip = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation(flipOrientationIndex(selectedOrientation));
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  const flipVertical = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation(flipOrientationVertically(selectedOrientation));
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 8) {
        const piece = pieces.find((p) => p.id === num);
        if (piece && !placedPieceIds.has(piece.id)) {
          e.preventDefault();
          onSelectPiece(piece.id === selectedPieceId ? null : piece.id);
        }
      } else if (e.key === "r" || e.key === "R" || e.key === "ArrowRight") {
        e.preventDefault();
        rotateForward();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (!selectedPiece) return;
        onSetOrientation(rotateOrientation90CCW(selectedOrientation));
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        flipVertical();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onSelectPiece(null);
      } else if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        onRemoveLastPiece();
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        onRestoreLastRemoved();
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        onSolve();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pieces, placedPieceIds, selectedPieceId, rotateForward, flip, onSelectPiece, onRemoveLastPiece, onRestoreLastRemoved, onSolve]);

  return (
    <div className="piece-tray">
      <div className="tray-header">
        <h3 className="tray-title">Pieces</h3>
        <button
          type="button"
          className="control-btn deselect-btn"
          onClick={() => onSelectPiece(null)}
          title="Deselect"
          disabled={!selectedPieceId}
        >
          Deselect (Esc)
        </button>
      </div>

      <div className="piece-grid">
        {pieces.map((piece) => {
          const isPlaced = placedPieceIds.has(piece.id);
          return (
            <div key={piece.id} className="piece-slot">
              <PiecePreview
                pieceId={piece.id}
                orientation={
                  piece.id === selectedPieceId
                    ? (piece.orientations[selectedOrientation] ?? piece.orientations[0])
                    : piece.orientations[0]
                }
                isSelected={piece.id === selectedPieceId}
                isPlaced={isPlaced}
                onClick={
                  isPlaced
                    ? undefined
                    : () => {
                        if (piece.id === selectedPieceId) {
                          rotateForward();
                        } else {
                          onSelectPiece(piece.id);
                        }
                      }
                }
              />
              <span
                className={`piece-name ${isPlaced ? "placed" : ""}`}
                style={{ color: PIECE_COLORS[piece.id] ?? "#888" }}
              >
                {piece.name}
              </span>
              {!isPlaced && (
                <button
                  type="button"
                  className="slot-flip-btn"
                  onClick={() => {
                    if (piece.id === selectedPieceId) {
                      flip();
                    } else {
                      onSelectPiece(piece.id);
                      onSetOrientation(flipOrientationIndex(0));
                    }
                  }}
                  title="Flip"
                >
                  ↔ Flip
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
