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
}

export interface SolverPanelRef {
  start: () => void;
}

type SolverStatus = "idle" | "solving" | "done";

function formatTime(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return `${m}m ${rem}s`;
}

const SolverPanel = forwardRef<SolverPanelRef, SolverPanelProps>(function SolverPanel(
  { targetMonth, targetDay, placedPieces, onSolveStart },
  ref
) {
  const [status, setStatus] = useState<SolverStatus>("idle");
  const [solutionCount, setSolutionCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lastCacheStates, setLastCacheStates] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "stop" });
    }
    setStatus("idle");
    setSolutionCount(0);
    setElapsed(0);
  }, [targetMonth, targetDay, placedPieces]);

  const handleStart = useCallback(() => {
    setStatus("solving");
    setSolutionCount(0);
    setElapsed(0);
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
          if (typeof msg.cacheStates === "number") {
            setLastCacheStates(msg.cacheStates);
          } else {
            setLastCacheStates(null);
          }
          setStatus("done");
          setElapsed(performance.now() - startTimeRef.current);
          if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      };

      worker.onerror = () => {
        setStatus("done");
        cleanup();
      };
    }

    startTimeRef.current = performance.now();

    timerRef.current = window.setInterval(() => {
      setElapsed(performance.now() - startTimeRef.current);
    }, 100);

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
  }, [targetMonth, targetDay, placedPieces, cleanup]);

  useImperativeHandle(ref, () => ({
    start: handleStart,
  }), [handleStart]);

  const handleStop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "stop" });
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStatus("done");
  }, []);

  return (
    <div className="solver-panel">
      <h3>Solver</h3>
      <p className="solver-description">
        When you click &quot;Solve&quot;, you get the number of solutions available given the pieces you have on the board.
      </p>
      <div className="solver-controls">
        {status !== "solving" ? (
          <button className="solver-btn solve-btn" onClick={handleStart} title="Solve (F)">
            Solve
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
            <span className="solver-label">Solutions</span>
            <span className="solver-value">{solutionCount.toLocaleString()}</span>
          </div>
          <div className="solver-stat">
            <span className="solver-label">Time</span>
            <span className="solver-value">{formatTime(elapsed)}</span>
          </div>
          {lastCacheStates !== null && (
            <div className="solver-stat">
              <span className="solver-label">Solve states seen</span>
              <span className="solver-value">
                {lastCacheStates.toLocaleString()}
              </span>
            </div>
          )}
          {status === "solving" && (
            <div className="solver-status solving">Solving…</div>
          )}
          {status === "done" && (
            <div className="solver-status done">Complete</div>
          )}
        </div>
      )}
    </div>
  );
});

export default SolverPanel;
