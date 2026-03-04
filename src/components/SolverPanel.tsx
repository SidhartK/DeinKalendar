import { useState, useRef, useCallback, useEffect } from "react";
import { getPieces } from "../utils/pieces";
import "./SolverPanel.css";

interface SolverPanelProps {
  targetMonth: string;
  targetDay: number;
}

type SolverStatus = "idle" | "solving" | "done";

function formatTime(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return `${m}m ${rem}s`;
}

export default function SolverPanel({
  targetMonth,
  targetDay,
}: SolverPanelProps) {
  const [status, setStatus] = useState<SolverStatus>("idle");
  const [solutionCount, setSolutionCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
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
    cleanup();
    setStatus("idle");
    setSolutionCount(0);
    setElapsed(0);
  }, [targetMonth, targetDay, cleanup]);

  const handleStart = useCallback(() => {
    cleanup();
    setStatus("solving");
    setSolutionCount(0);
    setElapsed(0);

    const worker = new Worker(
      new URL("../worker/solver.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;
    startTimeRef.current = performance.now();

    timerRef.current = window.setInterval(() => {
      setElapsed(performance.now() - startTimeRef.current);
    }, 100);

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "progress") {
        setSolutionCount(msg.count);
      } else if (msg.type === "done") {
        setSolutionCount(msg.totalCount);
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

    const pieces = getPieces();
    worker.postMessage({
      type: "start",
      targetMonth,
      targetDay,
      pieces: pieces.map((p) => ({
        id: p.id,
        orientations: p.orientations.map((o) => ({ cells: o.cells })),
      })),
    });
  }, [targetMonth, targetDay, cleanup]);

  const handleStop = useCallback(() => {
    cleanup();
    setStatus("done");
  }, [cleanup]);

  return (
    <div className="solver-panel">
      <h3>Solver</h3>
      <div className="solver-controls">
        {status !== "solving" ? (
          <button className="solver-btn solve-btn" onClick={handleStart}>
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
}
