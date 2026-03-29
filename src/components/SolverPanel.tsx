"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import type {
  PlacedPiece,
  ShadowAnalysisPayload,
  ForcedHintCell,
} from "../types";
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
  /** Clears hint highlights; marks solver used (e.g. celebration). */
  onHintRunStart?: () => void;
  /** Clears shadow overlay while a new shadow run is in flight. */
  onShadowRunStart?: () => void;
  onSolveHint?: (placedPieces: PlacedPiece[]) => void;
  onShadowAnalysis?: (payload: ShadowAnalysisPayload) => void;
  onForcedHintCells?: (cells: ForcedHintCell[]) => void;
  /** Whether shadow counts are currently shown on the board. */
  shadowsVisible: boolean;
  /** True if the last shadow run produced data for the current board. */
  shadowHasData: boolean;
  /** Show / hide shadows, or start a shadow run when there is no data yet. */
  onShadowToggle: () => void;
}

export interface SolverPanelRef {
  startHint: () => void;
  startShadowAnalysis: () => void;
}

type SolverStatus = "idle" | "solving" | "done";

type RunMode = "hint" | "shadow";

const SolverPanel = forwardRef<SolverPanelRef, SolverPanelProps>(
  function SolverPanel(
    {
      targetMonth,
      targetDay,
      placedPieces,
      onHintRunStart,
      onShadowRunStart,
      onSolveHint,
      onShadowAnalysis,
      onForcedHintCells,
      shadowsVisible,
      shadowHasData,
      onShadowToggle,
    },
    ref
  ) {
    const [status, setStatus] = useState<SolverStatus>("idle");
    const [solutionCount, setSolutionCount] = useState(0);
    const workerRef = useRef<Worker | null>(null);
    const runModeRef = useRef<RunMode>("hint");
    const onShadowAnalysisRef = useRef(onShadowAnalysis);
    onShadowAnalysisRef.current = onShadowAnalysis;
    const onForcedHintCellsRef = useRef(onForcedHintCells);
    onForcedHintCellsRef.current = onForcedHintCells;

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
            singletonCells?: ForcedHintCell[];
            cancelled?: boolean;
          };
          if (msg.type === "progress") {
            setSolutionCount(msg.count ?? 0);
          } else if (msg.type === "done") {
            setSolutionCount(msg.totalCount ?? 0);
            setStatus("done");
            if (msg.cancelled) return;
            if (
              msg.shadowCatalog &&
              Array.isArray(msg.shadowCells) &&
              runModeRef.current === "shadow"
            ) {
              onShadowAnalysisRef.current?.({
                shadowCatalog: msg.shadowCatalog,
                shadowCells: msg.shadowCells,
              });
            }
            if (
              Array.isArray(msg.singletonCells) &&
              runModeRef.current === "hint"
            ) {
              onForcedHintCellsRef.current?.(msg.singletonCells);
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

    const postSolverJob = useCallback(
      (mode: RunMode) => {
        setStatus("solving");
        setSolutionCount(0);
        runModeRef.current = mode;

        if (mode === "hint") {
          onSolveHint?.(placedPieces);
          onHintRunStart?.();
        } else {
          onShadowRunStart?.();
        }

        const worker = ensureWorker();
        worker.postMessage({ type: "stop" });
        const pieces = getPieces();
        const initialPlacements = placedPieces.map((pp) => {
          const piece = pieces.find((p) => p.id === pp.pieceId)!;
          return {
            pieceId: pp.pieceId,
            row: pp.row,
            col: pp.col,
            orientationIndex: getSolverOrientationIndex(
              piece,
              pp.orientationIndex
            ),
          };
        });
        worker.postMessage({
          type: "start",
          targetMonth,
          targetDay,
          pieces: pieces.map((p) => ({
            id: p.id,
            orientations: getUniqueOrientations(p).map((o) => ({
              cells: o.cells,
            })),
          })),
          initialPlacements,
          collectShadowData: mode === "shadow",
          collectSingletonHints: mode === "hint",
        });
      },
      [
        targetMonth,
        targetDay,
        placedPieces,
        ensureWorker,
        onHintRunStart,
        onShadowRunStart,
        onSolveHint,
      ]
    );

    const startHint = useCallback(() => {
      postSolverJob("hint");
    }, [postSolverJob]);

    const startShadowAnalysis = useCallback(() => {
      postSolverJob("shadow");
    }, [postSolverJob]);

    useImperativeHandle(
      ref,
      () => ({
        startHint,
        startShadowAnalysis,
      }),
      [startHint, startShadowAnalysis]
    );

    const handleStop = useCallback(() => {
      workerRef.current?.postMessage({ type: "stop" });
      setStatus("done");
    }, []);

    const shadowToggleLabel = shadowsVisible
      ? "Hide Shadows"
      : "Show Shadows";

    return (
      <div className="solver-panel">
        <h3>Solver</h3>

        <p className="solver-description">
          <strong>Hint</strong> counts solutions and highlights empty cells that
          are forced to a single piece orientation across all completions.
        </p>
        <div className="solver-controls">
          {status !== "solving" ? (
            <button
              type="button"
              className="solver-btn solve-btn solver-btn--hint"
              onClick={startHint}
              title="Hint"
            >
              Hint (H)
            </button>
          ) : (
            <button
              type="button"
              className="solver-btn stop-btn"
              onClick={handleStop}
              title="Stop the solver"
            >
              Stop
            </button>
          )}
        </div>

        <p className="solver-description solver-description--shadow">
          <strong>Shadows</strong> show how many distinct piece placements can
          cover each square; hover or tap a cell for diagrams.
        </p>
        <div className="solver-controls solver-controls--secondary">
          {status !== "solving" ? (
            <button
              type="button"
              className="solver-btn solve-btn solver-btn--shadows"
              onClick={onShadowToggle}
              title={
                shadowsVisible
                  ? "Hide shadow counts on the board"
                  : shadowHasData
                    ? "Show shadow counts (already computed)"
                    : "Compute shadow counts and show them"
              }
            >
              {shadowToggleLabel} (S)
            </button>
          ) : null}
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
