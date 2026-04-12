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
import { eventTargetIsTypingField } from "../utils/keyboard";
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
  onShadowToggle: () => void;
  /** When true, piece selection and orientation controls are disabled. */
  shadowsVisible: boolean;
  /** When true, the selected piece has been moved completely off the board via arrow keys. */
  isPieceOffBoard?: boolean;
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
  onShadowToggle,
  shadowsVisible,
  isPieceOffBoard = false,
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

  const rotateCCW = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation(rotateOrientation90CCW(selectedOrientation));
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  const flipVertical = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation(flipOrientationVertically(selectedOrientation));
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (eventTargetIsTypingField(e.target)) return;
      if (shadowsVisible) {
        if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          onSolve();
        } else if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          onShadowToggle();
        }
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 8) {
        const piece = pieces.find((p) => p.id === num);
        if (piece && !placedPieceIds.has(piece.id)) {
          e.preventDefault();
          onSelectPiece(piece.id === selectedPieceId ? null : piece.id);
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        rotateForward();
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        flip();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onSelectPiece(null);
      } else if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        onRemoveLastPiece();
      } else if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        onRestoreLastRemoved();
      } else if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        onSolve();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        onShadowToggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    pieces,
    placedPieceIds,
    selectedPieceId,
    rotateForward,
    flip,
    onSelectPiece,
    onRemoveLastPiece,
    onRestoreLastRemoved,
    onSolve,
    onShadowToggle,
    shadowsVisible,
  ]);

  return (
    <div className={`piece-tray${shadowsVisible ? " piece-tray--shadows-visible" : ""}`}>
      <div className="tray-header">
        <h3 className="tray-title">Pieces</h3>
        <button
          type="button"
          className="control-btn deselect-btn"
          onClick={() => onSelectPiece(null)}
          title="Deselect (Esc)"
          disabled={!selectedPieceId || shadowsVisible}
        >
          Deselect (Esc)
        </button>
      </div>

      <div className="tray-transform-bar">
        {selectedPieceId != null && !shadowsVisible ? (
          <div className="transform-buttons">
            <button
              type="button"
              className="transform-btn"
              onClick={rotateForward}
              data-tooltip="Rotate 90° clockwise"
              aria-label="Rotate 90 degrees clockwise"
            >
              <span className="transform-btn__tooltip-hit" aria-hidden="true" />
              <span className="transform-btn__kbd-hint" aria-hidden="true">
                R
              </span>
              <span className="transform-btn__glyph" aria-hidden="true">
                ↻
              </span>
            </button>
            <button
              type="button"
              className="transform-btn"
              onClick={rotateCCW}
              data-tooltip="Rotate 90° counter-clockwise"
              aria-label="Rotate 90 degrees counter-clockwise"
            >
              <span className="transform-btn__tooltip-hit" aria-hidden="true" />
              <span className="transform-btn__glyph" aria-hidden="true">
                ↺
              </span>
            </button>
            <button
              type="button"
              className="transform-btn"
              onClick={flip}
              data-tooltip="Flip horizontally"
              aria-label="Flip horizontally"
            >
              <span className="transform-btn__tooltip-hit" aria-hidden="true" />
              <span className="transform-btn__kbd-hint" aria-hidden="true">
                E
              </span>
              <span className="transform-btn__glyph" aria-hidden="true">
                ↔
              </span>
            </button>
            <button
              type="button"
              className="transform-btn"
              onClick={flipVertical}
              data-tooltip="Flip vertically"
              aria-label="Flip vertically"
            >
              <span className="transform-btn__tooltip-hit" aria-hidden="true" />
              <span className="transform-btn__glyph" aria-hidden="true">
                ↕
              </span>
            </button>
          </div>
        ) : (
          <div className="transform-placeholder" />
        )}
      </div>

      <div
        className="piece-grid"
        aria-disabled={shadowsVisible}
        aria-label={shadowsVisible ? "Piece controls disabled while shadows are shown" : undefined}
      >
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
                isOffBoard={piece.id === selectedPieceId && isPieceOffBoard}
                onClick={
                  isPlaced || shadowsVisible
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
