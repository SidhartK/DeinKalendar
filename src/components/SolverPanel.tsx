"use client";

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import type { PlacedPiece } from "../types";
import {
  getPieces,
  getUniqueOrientations,
  getSolverOrientationIndex,
} from "../utils/pieces";
import "./SolverPanel.css";

interface SolverPanelProps {
  targetMonth: string;
  targetDay: number;
  placedPieces: PlacedPiece[];
  onSolveStart?: () => void;
  onSolveHint?: (placedPieces: PlacedPiece[]) => void;
}

export interface SolverPanelRef {
  start: () => void;
}

type SolverStatus = "idle" | "solving" | "done";

const SolverPanel = forwardRef<SolverPanelRef, SolverPanelProps>(function SolverPanel(
  { targetMonth, targetDay, placedPieces, onSolveStart, onSolveHint },
  ref
) {
  const [status, setStatus] = useState<SolverStatus>("idle");
  const [solutionCount, setSolutionCount] = useState(0);
  const workerRef = useRef<Worker | null>(null);

  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "stop" });
    }
    setStatus("idle");
    setSolutionCount(0);
  }, [targetMonth, targetDay, placedPieces]);

  const handleStart = useCallback(() => {
    setStatus("solving");
    setSolutionCount(0);
    if (onSolveHint) onSolveHint(placedPieces);
    if (onSolveStart) onSolveStart();

    let worker = workerRef.current;
    if (!worker) {
      worker = new Worker(
        new URL("../worker/solver.worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "progress") {
          setSolutionCount(msg.count);
        } else if (msg.type === "done") {
          setSolutionCount(msg.totalCount);
          setStatus("done");
        }
      };

      worker.onerror = () => {
        setStatus("done");
        cleanup();
      };
    }

    const pieces = getPieces();
    const initialPlacements = placedPieces.map((pp) => {
      const piece = pieces.find((p) => p.id === pp.pieceId)!;
      return {
        pieceId: pp.pieceId,
        row: pp.row,
        col: pp.col,
        orientationIndex: getSolverOrientationIndex(piece, pp.orientationIndex),
      };
    });
    worker.postMessage({
      type: "start",
      targetMonth,
      targetDay,
      pieces: pieces.map((p) => ({
        id: p.id,
        orientations: getUniqueOrientations(p).map((o) => ({ cells: o.cells })),
      })),
      initialPlacements,
    });
  }, [targetMonth, targetDay, placedPieces, cleanup, onSolveStart, onSolveHint]);

  useImperativeHandle(ref, () => ({
    start: handleStart,
  }), [handleStart]);

  const handleStop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "stop" });
    }
    setStatus("done");
  }, []);

  return (
    <div className="solver-panel">
      <h3>Hint</h3>
      <p className="solver-description">
        When you click &quot;Hint&quot;, you get the number of solutions available given the pieces you have on the board.
      </p>
      <div className="solver-controls">
        {status !== "solving" ? (
          <button className="solver-btn solve-btn" onClick={handleStart} title="Solve">
            Hint (H)
          </button>
        ) : (
          <button className="solver-btn stop-btn" onClick={handleStop}>
            Stop
          </button>
        )}
      </div>
      {status !== "idle" && (
        <div className="solver-results">
          <div className="solver-stat">
            <span className="solver-label"># of Solutions</span>
            <span className="solver-value">{solutionCount.toLocaleString()}</span>
          </div>
          {status === "solving" && (
            <div className="solver-status solving">Solving…</div>
          )}
        </div>
      )}
    </div>
  );
});

export default SolverPanel;
