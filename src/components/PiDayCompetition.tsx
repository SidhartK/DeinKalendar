"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import App from "../App";
import { PlacedPiece } from "../types";
import { getPieceById, getSolverOrientationIndex } from "../utils/pieces";
import "./PiDayCompetition.css";

type CompetitionState = "countdown" | "ready" | "active" | "finished";

const DEFAULT_DURATION_SECONDS = 30 * 60;
const PENALTY_SECONDS = 30;
// March 14, 2026
const PI_DAY_YEAR = 2026;
const PI_DAY_MONTH = 2; // 0-indexed
const PI_DAY_DATE = 14;

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getEffectiveDate(): Date {
  try {
    const cookie = getCookie("pi_debug_date");
    if (cookie) return new Date(cookie);
  } catch {
    // ignore
  }
  return new Date();
}

function getTimerDuration(): number {
  try {
    const cookie = getCookie("pi_debug_timer");
    if (cookie) {
      const val = parseInt(cookie, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    // ignore
  }
  return DEFAULT_DURATION_SECONDS;
}

function isPiDayOrLater(now: Date): boolean {
  const piDayMidnight = new Date(PI_DAY_YEAR, PI_DAY_MONTH, PI_DAY_DATE);
  return now >= piDayMidnight;
}

function getInitialState(): CompetitionState {
  return isPiDayOrLater(getEffectiveDate()) ? "ready" : "countdown";
}

function makeSolutionKey(placedPieces: PlacedPiece[]): string {
  const sorted = [...placedPieces].sort((a, b) => a.pieceId - b.pieceId);
  return sorted
    .map((p) => {
      const piece = getPieceById(p.pieceId)!;
      const solverOI = getSolverOrientationIndex(piece, p.orientationIndex);
      return `${p.pieceId}@${p.row},${p.col}:${solverOI}`;
    })
    .join(";");
}

function makePuzzleKey(placedPieces: PlacedPiece[]): string {
  const sorted = [...placedPieces].sort((a, b) => {
    if (a.pieceId !== b.pieceId) return a.pieceId - b.pieceId;
    if (a.row !== b.row) return a.row - b.row;
    if (a.col !== b.col) return a.col - b.col;
    return a.orientationIndex - b.orientationIndex;
  });
  return sorted
    .map((p) => `${p.pieceId}@${p.row},${p.col}:${p.orientationIndex}`)
    .join(";");
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatCountdown(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function PiDayCompetition() {
  const [competitionState, setCompetitionState] = useState<CompetitionState>(
    getInitialState
  );
  const [countdownMs, setCountdownMs] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_DURATION_SECONDS);
  const [solutionCount, setSolutionCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [totalPenaltySeconds, setTotalPenaltySeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const solutionKeysRef = useRef(new Set<string>());
  const usedPuzzleKeysRef = useRef(new Set<string>());
  const totalDurationRef = useRef(DEFAULT_DURATION_SECONDS);

  // Countdown to Pi Day
  useEffect(() => {
    if (competitionState !== "countdown") return;

    function tick() {
      const now = getEffectiveDate();
      if (isPiDayOrLater(now)) {
        setCompetitionState("ready");
        return;
      }
      const piDayMidnight = new Date(PI_DAY_YEAR, PI_DAY_MONTH, PI_DAY_DATE);
      setCountdownMs(piDayMidnight.getTime() - now.getTime());
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [competitionState]);

  // Active game timer
  useEffect(() => {
    if (competitionState !== "active") return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCompetitionState("finished");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [competitionState]);

  const handleStart = useCallback(() => {
    const duration = getTimerDuration();
    totalDurationRef.current = duration;
    setTimeRemaining(duration);
    setSolutionCount(0);
    setHintsUsed(0);
    setTotalPenaltySeconds(0);
    solutionKeysRef.current = new Set();
    usedPuzzleKeysRef.current = new Set();
    setCompetitionState("active");
  }, []);

  const handleSolutionFound = useCallback((placedPieces: PlacedPiece[]) => {
    const key = makeSolutionKey(placedPieces);
    if (!solutionKeysRef.current.has(key)) {
      solutionKeysRef.current.add(key);
      setSolutionCount(solutionKeysRef.current.size);
    }
  }, []);

  const handleSolveHint = useCallback((placedPieces: PlacedPiece[]) => {
    const puzzleKey = makePuzzleKey(placedPieces);
    if (!usedPuzzleKeysRef.current.has(puzzleKey)) {
      usedPuzzleKeysRef.current.add(puzzleKey);
      setHintsUsed((prev) => prev + 1);
      setTotalPenaltySeconds((prev) => prev + PENALTY_SECONDS);
      setTimeRemaining((prev) => Math.max(0, prev - PENALTY_SECONDS));
    }
  }, []);

  if (competitionState === "countdown") {
    return (
      <div className="pi-competition pi-competition--countdown">
        <div className="pi-full-page-content">
          <div className="pi-symbol" aria-hidden>
            π
          </div>
          <h1 className="pi-page-title">Pi Day Competition</h1>
          <p className="pi-page-subtitle">Coming March 14, 2026</p>
          <div className="pi-countdown-timer" aria-live="polite" aria-label="Time until Pi Day">
            {formatCountdown(countdownMs)}
          </div>
        </div>
      </div>
    );
  }

  if (competitionState === "ready") {
    return (
      <div className="pi-competition pi-competition--ready">
        <div className="pi-full-page-content">
          <div className="pi-symbol" aria-hidden>
            π
          </div>
          <h1 className="pi-page-title">Pi Day Competition</h1>
          <div className="pi-rules">
            <h2 className="pi-rules-title">Rules</h2>
            <ul className="pi-rules-list">
              <li>
                You have <strong>30 minutes</strong> to find as many unique
                solutions as possible for <strong>March 14</strong>.
              </li>
              <li>
                Each time you complete the puzzle, the board clears automatically
                so you can find another solution.
              </li>
              <li>
                Using the solver costs{" "}
                <strong>{PENALTY_SECONDS} seconds</strong> per unique board
                configuration — same config used again? No penalty.
              </li>
              <li>
                There's no pause. Once you start, the clock runs until it hits
                zero.
              </li>
            </ul>
          </div>
          <button className="pi-start-btn" onClick={handleStart}>
            Start Competition
          </button>
        </div>
      </div>
    );
  }

  if (competitionState === "finished") {
    return (
      <div className="pi-competition pi-competition--finished">
        <div className="pi-full-page-content">
          <div className="pi-symbol" aria-hidden>
            π
          </div>
          <h1 className="pi-page-title">Time&rsquo;s Up!</h1>
          <p className="pi-page-subtitle">Here&rsquo;s how you did:</p>
          <div className="pi-results-grid">
            <div className="pi-result-card pi-result-card--highlight">
              <span className="pi-result-value">{solutionCount}</span>
              <span className="pi-result-label">Unique Solutions Found</span>
            </div>
            <div className="pi-result-card">
              <span className="pi-result-value">{hintsUsed}</span>
              <span className="pi-result-label">Solver Hints Used</span>
            </div>
            <div className="pi-result-card">
              <span className="pi-result-value">
                -{formatTime(totalPenaltySeconds)}
              </span>
              <span className="pi-result-label">Total Penalty Time</span>
            </div>
          </div>
          <button
            className="pi-start-btn pi-start-btn--secondary"
            onClick={handleStart}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Active state
  const pct = Math.max(0, (timeRemaining / totalDurationRef.current) * 100);
  const isLow = timeRemaining <= 60;
  const isWarning = timeRemaining <= 300 && timeRemaining > 60;

  return (
    <div className="pi-competition pi-competition--active">
      <div className="pi-active-bar">
        <div className="pi-timer-bar-track" aria-hidden>
          <div
            className={[
              "pi-timer-bar-fill",
              isLow ? "pi-timer-bar-fill--low" : "",
              isWarning ? "pi-timer-bar-fill--warning" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="pi-active-stats">
          <div className="pi-stat">
            <span
              className={[
                "pi-stat-value",
                "pi-stat-value--timer",
                isLow ? "pi-stat-value--low" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-live="polite"
              aria-label={`${formatTime(timeRemaining)} remaining`}
            >
              {formatTime(timeRemaining)}
            </span>
            <span className="pi-stat-label">Remaining</span>
          </div>
          <div className="pi-stat">
            <span className="pi-stat-value">{solutionCount}</span>
            <span className="pi-stat-label">Solutions</span>
          </div>
          <div className="pi-stat">
            <span className="pi-stat-value">{hintsUsed}</span>
            <span className="pi-stat-label">
              Hints (−{PENALTY_SECONDS}s each)
            </span>
          </div>
        </div>
      </div>
      <App
        initialMonth="Mar"
        initialDay={14}
        competitionMode
        onSolutionFound={handleSolutionFound}
        onSolveHint={handleSolveHint}
      />
    </div>
  );
}
