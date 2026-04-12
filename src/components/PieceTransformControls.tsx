"use client";

import { useCallback, useMemo } from "react";
import { PieceDefinition } from "../types";
import {
  rotateOrientation90CW,
  rotateOrientation90CCW,
  flipOrientationIndex,
  flipOrientationVertically,
} from "../utils/pieces";
import "./PieceTray.css";

export interface PieceTransformControlsProps {
  pieces: PieceDefinition[];
  selectedPieceId: number | null;
  selectedOrientation: number;
  onSetOrientation: (index: number) => void;
  shadowsVisible: boolean;
  /** Extra class on the outer wrapper (e.g. mobile vs desktop strip). */
  className?: string;
}

export default function PieceTransformControls({
  pieces,
  selectedPieceId,
  selectedOrientation,
  onSetOrientation,
  shadowsVisible,
  className = "",
}: PieceTransformControlsProps) {
  const selectedPiece = useMemo(
    () => pieces.find((p) => p.id === selectedPieceId) ?? null,
    [pieces, selectedPieceId]
  );

  const transformsActive = selectedPiece != null && !shadowsVisible;

  const rotateForward = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation(rotateOrientation90CW(selectedOrientation));
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  const rotateCCW = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation(rotateOrientation90CCW(selectedOrientation));
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  const flip = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation(flipOrientationIndex(selectedOrientation));
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  const flipVertical = useCallback(() => {
    if (!selectedPiece) return;
    onSetOrientation(flipOrientationVertically(selectedOrientation));
  }, [selectedPiece, selectedOrientation, onSetOrientation]);

  return (
    <div
      className={`tray-transform-bar piece-transform-controls${className ? ` ${className}` : ""}`}
    >
      <div className="transform-buttons">
        <button
          type="button"
          className="transform-btn"
          onClick={rotateForward}
          disabled={!transformsActive}
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
          disabled={!transformsActive}
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
          disabled={!transformsActive}
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
          disabled={!transformsActive}
          data-tooltip="Flip vertically"
          aria-label="Flip vertically"
        >
          <span className="transform-btn__tooltip-hit" aria-hidden="true" />
          <span className="transform-btn__glyph" aria-hidden="true">
            ↕
          </span>
        </button>
      </div>
    </div>
  );
}
