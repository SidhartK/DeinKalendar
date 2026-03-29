"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { PlacedPiece, ShadowAnalysisPayload } from "../types";
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
  /** Full shadow analysis after a successful run (not sent if cancelled). */
  onShadowAnalysis?: (payload: ShadowAnalysisPayload) => void;
}

export interface SolverPanelRef {
  start: () => void;
}

type SolverStatus = "idle" | "solving" | "done";

const SolverPanel = forwardRef<SolverPanelRef, SolverPanelProps>(
  function SolverPanel(
    {
      targetMonth,
      targetDay,
      placedPieces,
      onSolveStart,
      onSolveHint,
      onShadowAnalysis,
    },
    ref
  ) {
    const [status, setStatus] = useState<SolverStatus>("idle");
    const [solutionCount, setSolutionCount] = useState(0);
    const workerRef = useRef<Worker | null>(null);
    const onShadowAnalysisRef = useRef(onShadowAnalysis);
    onShadowAnalysisRef.current = onShadowAnalysis;

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

    const ensureWorker = useCallback(() => {
      let worker = workerRef.current;
      if (!worker) {
        worker = new Worker(
          new URL("../worker/solver.worker.ts", import.meta.url),
          { type: "module" }
        );
        workerRef.current = worker;

        worker.onmessage = (e) => {
          const msg = e.data as {
            type: string;
            count?: number;
            totalCount?: number;
            shadowCatalog?: ShadowAnalysisPayload["shadowCatalog"];
            shadowCells?: ShadowAnalysisPayload["shadowCells"];
            cancelled?: boolean;
          };
          if (msg.type === "progress") {
            setSolutionCount(msg.count ?? 0);
          } else if (msg.type === "done") {
            setSolutionCount(msg.totalCount ?? 0);
            setStatus("done");
            if (
              !msg.cancelled &&
              msg.shadowCatalog &&
              Array.isArray(msg.shadowCells)
            ) {
              onShadowAnalysisRef.current?.({
                shadowCatalog: msg.shadowCatalog,
                shadowCells: msg.shadowCells,
              });
            }
          }
        };

        worker.onerror = () => {
          setStatus("done");
          cleanup();
        };
      }
      return worker;
    }, [cleanup]);

    const handleStart = useCallback(() => {
      setStatus("solving");
      setSolutionCount(0);
      onSolveHint?.(placedPieces);
      onSolveStart?.();

      const worker = ensureWorker();
      worker.postMessage({ type: "stop" });
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
        collectShadowData: true,
      });
    }, [
      targetMonth,
      targetDay,
      placedPieces,
      ensureWorker,
      onSolveStart,
      onSolveHint,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        start: handleStart,
      }),
      [handleStart]
    );

    const handleStop = useCallback(() => {
      workerRef.current?.postMessage({ type: "stop" });
      setStatus("done");
    }, []);

    return (
      <div className="solver-panel">
        <h3>Shadows</h3>
        <p className="solver-description">
          Run the solver to see how many distinct piece placements can cover each
          empty square across all solutions. Hover or tap a cell for placement
          diagrams.
        </p>
        <div className="solver-controls">
          {status !== "solving" ? (
            <button
              className="solver-btn solve-btn"
              onClick={handleStart}
              title="Shadow analysis"
            >
              Shadows (H)
            </button>
          ) : (
            <button
              className="solver-btn stop-btn"
              onClick={handleStop}
              title="Stop the solver"
            >
              Stop
            </button>
          )}
        </div>
        {status !== "idle" && (
          <div className="solver-results">
            <div className="solver-stat">
              <span className="solver-label"># of Solutions</span>
              <span className="solver-value">
                {solutionCount.toLocaleString()}
              </span>
            </div>
            {status === "solving" && (
              <div className="solver-status solving">Solving…</div>
            )}
          </div>
        )}
      </div>
    );
  }
);

export default SolverPanel;
