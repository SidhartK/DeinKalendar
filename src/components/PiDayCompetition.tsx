"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import App from "../App";
import { PlacedPiece, CellValue, GRID_ROWS, GRID_COLS, PIECE_COLORS } from "../types";
import { createEmptyGrid, isBlocked, getTargetCells, getLabelAt } from "../utils/board";
import { getPieceById, getSolverOrientationIndex } from "../utils/pieces";
import { validatePlacement, placePieceOnGrid } from "../utils/validation";
import SolutionHistory from "./SolutionHistory";
import "./PiDayCompetition.css";

type CompetitionState = "countdown" | "username" | "ready" | "active" | "finished";
type CompetitionMode = "main" | "mini";

interface LeaderboardRow {
  rank: number;
  username: string;
  solutions: number;
  hints_used: number;
  best_solution_seconds: number | null;
  completed_at: string;
}

const MODE_CONFIG = {
  main: { duration: 22 * 60, penalty: 6.28 },
  mini: { duration: (6 * 60 + 28), penalty: 3.14 },
} as const;

const DEFAULT_DURATION_SECONDS = MODE_CONFIG.main.duration;
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

function getTimerDuration(mode: CompetitionMode): number {
  try {
    const cookie = getCookie("pi_debug_timer");
    if (cookie) {
      const val = parseInt(cookie, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    // ignore
  }
  return MODE_CONFIG[mode].duration;
}

function getPenaltySeconds(mode: CompetitionMode): number {
  try {
    const cookie = getCookie("pi_debug_penalty");
    if (cookie) {
      const val = parseInt(cookie, 10);
      if (!isNaN(val) && val >= 0) return val;
    }
  } catch {
    // ignore
  }
  return MODE_CONFIG[mode].penalty;
}

function isPiDayOrLater(now: Date): boolean {
  const piDayMidnight = new Date(PI_DAY_YEAR, PI_DAY_MONTH, PI_DAY_DATE);
  return now >= piDayMidnight;
}

// The challenge is permanently open on and after Pi Day 2026.
// Visiting /pi after March 14 always goes straight to the auth screen.
function getInitialState(): CompetitionState {
  return isPiDayOrLater(getEffectiveDate()) ? "username" : "countdown";
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
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, seconds);
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (sec === 0) {
      return m === 1 ? "1 minute" : `${m} minutes`;
    }
    const minPart = m === 1 ? "1 minute" : `${m} minutes`;
    const secPart = sec === 1 ? "1 second" : `${sec} seconds`;
    return `${minPart}, ${secPart}`;
  }
  return s === 1 ? "1 second" : `${s} seconds`;
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

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function MySolutionsMiniBoard({ placedPieces, index }: { placedPieces: PlacedPiece[]; index: number }) {
  const targetMonth = "Mar";
  const targetDay = 14;

  const grid = useMemo(() => {
    let g = createEmptyGrid();
    for (const pp of placedPieces) {
      const piece = getPieceById(pp.pieceId);
      if (!piece) continue;
      const orientation = piece.orientations[pp.orientationIndex];
      if (!orientation) continue;
      const result = validatePlacement(g, orientation, pp.row, pp.col, targetMonth, targetDay);
      if (result.valid && result.cells) {
        g = placePieceOnGrid(g, result.cells, pp.pieceId);
      }
    }
    return g;
  }, [placedPieces]);

  const targetSet = useMemo(() => {
    const cells = getTargetCells(targetMonth, targetDay);
    return new Set(cells.map(([r, c]) => `${r},${c}`));
  }, []);

  return (
    <div className="pi-my-solution">
      <div className="pi-my-solution-label">#{index + 1}</div>
      <div className="pi-my-solution-board">
        {Array.from({ length: GRID_ROWS }, (_, row) => (
          <div className="pi-my-solution-row" key={row}>
            {Array.from({ length: GRID_COLS }, (_, col) => {
              const blocked = isBlocked(row, col);
              const cellValue: CellValue = grid[row][col];
              const isTarget = targetSet.has(`${row},${col}`);
              const pieceId = typeof cellValue === "number" ? cellValue : null;
              const label = getLabelAt(row, col);

              let className = "pi-my-solution-cell";
              if (blocked) className += " pi-my-solution-cell--blocked";
              if (isTarget) className += " pi-my-solution-cell--target";

              const style: React.CSSProperties = {};
              if (pieceId !== null) {
                style.backgroundColor = PIECE_COLORS[pieceId] ?? "#888";
              }

              return (
                <div key={col} className={className} style={style}>
                  {!blocked && isTarget && (
                    <span className="pi-my-solution-cell-label">{label}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MySolutions({ username, ready }: { username: string; ready: boolean }) {
  const [solutions, setSolutions] = useState<PlacedPiece[][] | null>(null);

  useEffect(() => {
    if (!username || !ready) return;
    let cancelled = false;

    async function fetchSolutions() {
      try {
        const res = await fetch(`/api/competition/solutions?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data.solutions)) {
          setSolutions(data.solutions.map((s: { placed_pieces: PlacedPiece[] }) => s.placed_pieces));
        }
      } catch (err) {
        console.error("Failed to fetch user solutions:", err);
      }
    }

    fetchSolutions();
    return () => { cancelled = true; };
  }, [username, ready]);

  if (!solutions || solutions.length === 0) return null;

  return (
    <div className="pi-my-solutions">
      <div className="pi-my-solutions-title">Your Solutions ({solutions.length})</div>
      <div className="pi-my-solutions-grid">
        {solutions.map((placedPieces, i) => (
          <MySolutionsMiniBoard key={i} placedPieces={placedPieces} index={i} />
        ))}
      </div>
    </div>
  );
}

export default function PiDayCompetition() {
  const [competitionState, setCompetitionState] = useState<CompetitionState>("countdown");
  const [countdownMs, setCountdownMs] = useState(0);

  // Defer initial state to client to avoid SSR/client hydration mismatch
  // (getEffectiveDate reads a browser cookie; server always sees the real date)
  useEffect(() => {
    setCompetitionState(getInitialState());
  }, []);

  // Competition mode
  const [competitionMode, setCompetitionMode] = useState<CompetitionMode>("main");
  const competitionModeRef = useRef<CompetitionMode>("main");

  // Auth
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Game stats (state for rendering)
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_DURATION_SECONDS);
  const [solutionCount, setSolutionCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [bestSolutionSeconds, setBestSolutionSeconds] = useState<number | null>(null);
  const [showHintPenaltyFlash, setShowHintPenaltyFlash] = useState(false);
  const [foundSolutions, setFoundSolutions] = useState<PlacedPiece[][]>([]);

  // Refs mirror the stats so async callbacks always read the latest values
  const solutionCountRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const bestSolutionSecondsRef = useRef<number | null>(null);
  const usernameRef = useRef("");

  // Finished screen
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [redirectedToLeaderboard, setRedirectedToLeaderboard] = useState(false);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  // Feedback
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "submitted" | "error">("idle");

  // When true, we auto-show the tutorial and don't start the timer until the user dismisses it
  const [initialTutorialDismissed, setInitialTutorialDismissed] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintPenaltyFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSubmissionRef = useRef(false);
  const solutionKeysRef = useRef(new Set<string>());
  const foundSolutionsRef = useRef<{ key: string; placedPieces: PlacedPiece[] }[]>([]);
  const usedPuzzleKeysRef = useRef(new Set<string>());
  const totalDurationRef = useRef(DEFAULT_DURATION_SECONDS);
  const lastSolutionTimeRef = useRef<number | null>(null);

  // Countdown to Pi Day
  useEffect(() => {
    if (competitionState !== "countdown") return;

    function tick() {
      const now = getEffectiveDate();
      if (isPiDayOrLater(now)) {
        setCompetitionState("username");
        return;
      }
      const piDayMidnight = new Date(PI_DAY_YEAR, PI_DAY_MONTH, PI_DAY_DATE);
      setCountdownMs(piDayMidnight.getTime() - now.getTime());
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [competitionState]);

  // Submit results + fetch leaderboard whenever the game finishes
  useEffect(() => {
    if (competitionState !== "finished") return;
    setLeaderboardLoading(true);

    const mode = competitionModeRef.current;

    async function submitAndFetch() {
      if (usernameRef.current && !skipSubmissionRef.current) {
        try {
          await fetch("/api/competition/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: usernameRef.current,
              solutions: solutionCountRef.current,
              hints_used: hintsUsedRef.current,
              best_solution_seconds: bestSolutionSecondsRef.current,
              duration_seconds: totalDurationRef.current,
              competition_type: mode,
              solution_states: foundSolutionsRef.current,
            }),
          });
          setShowOnLeaderboard(true);
        } catch (err) {
          console.error("Failed to submit results:", err);
        }
      }

      if (usernameRef.current && skipSubmissionRef.current) {
        try {
          const visRes = await fetch(
            `/api/competition/leaderboard-visibility?username=${encodeURIComponent(usernameRef.current)}`
          );
          const visData = await visRes.json();
          setShowOnLeaderboard(visData.show_on_leaderboard ?? true);
        } catch (err) {
          console.error("Failed to fetch leaderboard visibility:", err);
        }
      }

      try {
        const res = await fetch(`/api/competition/leaderboard?mode=${mode}`);
        const data = await res.json();
        setLeaderboard(data.leaderboard ?? []);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      }

      setLeaderboardLoading(false);
    }

    submitAndFetch();
  }, [competitionState]);

  // Clear hint penalty flash timeout on unmount
  useEffect(() => {
    return () => {
      if (hintPenaltyFlashTimeoutRef.current) {
        clearTimeout(hintPenaltyFlashTimeoutRef.current);
      }
    };
  }, []);

  // Active game timer (starts only after user dismisses the initial How to Play modal, if shown)
  useEffect(() => {
    if (competitionState !== "active" || !initialTutorialDismissed) return;

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
  }, [competitionState, initialTutorialDismissed]);

  const handleAuth = useCallback(async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setAuthError("Please enter a username.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/competition/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, password }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({})) as { has_existing_entry?: boolean };
        usernameRef.current = trimmed;
        if (data.has_existing_entry) {
          skipSubmissionRef.current = true;
          setRedirectedToLeaderboard(true);
          setLeaderboard([]);
          setCompetitionState("finished");
        } else {
          skipSubmissionRef.current = false;
          setRedirectedToLeaderboard(false);
          setCompetitionState("ready");
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setAuthError((data as { error?: string }).error ?? "Authentication failed. Please try again.");
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, [username, password]);

  const handleStart = useCallback(() => {
    competitionModeRef.current = competitionMode;
    const duration = getTimerDuration(competitionMode);
    totalDurationRef.current = duration;
    setTimeRemaining(duration);
    setSolutionCount(0);
    setHintsUsed(0);
    setShowHintPenaltyFlash(false);
    setBestSolutionSeconds(null);
    if (hintPenaltyFlashTimeoutRef.current) {
      clearTimeout(hintPenaltyFlashTimeoutRef.current);
      hintPenaltyFlashTimeoutRef.current = null;
    }
    solutionCountRef.current = 0;
    hintsUsedRef.current = 0;
    bestSolutionSecondsRef.current = null;
    solutionKeysRef.current = new Set();
    foundSolutionsRef.current = [];
    setFoundSolutions([]);
    usedPuzzleKeysRef.current = new Set();
    lastSolutionTimeRef.current = Date.now();
    setLeaderboard([]);
    setLeaderboardLoading(false);
    setInitialTutorialDismissed(false); // Timer will start when user closes the auto-shown How to Play
    setCompetitionState("active");
  }, [competitionMode]);

  const handleInitialTutorialClose = useCallback(() => {
    setInitialTutorialDismissed(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    skipSubmissionRef.current = false;
    setRedirectedToLeaderboard(false);
    setFeedbackText("");
    setFeedbackStatus("idle");
    setCompetitionState("ready");
  }, []);

  const handleFeedbackSubmit = useCallback(async () => {
    const trimmed = feedbackText.trim();
    if (!trimmed) return;
    setFeedbackStatus("submitting");
    try {
      const res = await fetch("/api/competition/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameRef.current || null, feedback: trimmed }),
      });
      if (res.ok) {
        setFeedbackStatus("submitted");
      } else {
        setFeedbackStatus("error");
      }
    } catch {
      setFeedbackStatus("error");
    }
  }, [feedbackText]);

  const handleVisibilityToggle = useCallback(async () => {
    const newValue = !showOnLeaderboard;
    setVisibilityLoading(true);
    try {
      await fetch("/api/competition/leaderboard-visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameRef.current,
          show_on_leaderboard: newValue,
        }),
      });
      setShowOnLeaderboard(newValue);
      // Refresh leaderboard to reflect the change
      const mode = competitionModeRef.current;
      const res = await fetch(`/api/competition/leaderboard?mode=${mode}`);
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
    } catch (err) {
      console.error("Failed to update leaderboard visibility:", err);
    } finally {
      setVisibilityLoading(false);
    }
  }, [showOnLeaderboard]);

  const handleEndEarly = useCallback(() => {
    if (
      window.confirm(
        "End the competition now? Your current score will be submitted and you'll see the leaderboard."
      )
    ) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setCompetitionState("finished");
    }
  }, []);

  const handleSolutionFound = useCallback((placedPieces: PlacedPiece[]): boolean => {
    const key = makeSolutionKey(placedPieces);
    if (solutionKeysRef.current.has(key)) {
      return false;
    }

    solutionKeysRef.current.add(key);
    const newCount = solutionKeysRef.current.size;
    solutionCountRef.current = newCount;
    setSolutionCount(newCount);

    const snapshot = [...placedPieces];
    foundSolutionsRef.current = [...foundSolutionsRef.current, { key, placedPieces: snapshot }];
    setFoundSolutions((prev) => [...prev, snapshot]);

    const now = Date.now();
    const gapSeconds = Math.round((now - (lastSolutionTimeRef.current ?? now)) / 1000);
    lastSolutionTimeRef.current = now;
    const prevBest = bestSolutionSecondsRef.current;
    const newBest = prevBest === null ? gapSeconds : Math.min(prevBest, gapSeconds);
    bestSolutionSecondsRef.current = newBest;
    setBestSolutionSeconds(newBest);

    return true;
  }, []);

  const handleSolveHint = useCallback((placedPieces: PlacedPiece[]) => {
    const puzzleKey = makePuzzleKey(placedPieces);
    if (!usedPuzzleKeysRef.current.has(puzzleKey)) {
      usedPuzzleKeysRef.current.add(puzzleKey);
      const newHints = hintsUsedRef.current + 1;
      hintsUsedRef.current = newHints;
      setHintsUsed(newHints);
      setTimeRemaining((prev) => Math.max(0, prev - getPenaltySeconds(competitionModeRef.current)));
      if (hintPenaltyFlashTimeoutRef.current) clearTimeout(hintPenaltyFlashTimeoutRef.current);
      setShowHintPenaltyFlash(true);
      hintPenaltyFlashTimeoutRef.current = setTimeout(() => {
        hintPenaltyFlashTimeoutRef.current = null;
        setShowHintPenaltyFlash(false);
      }, 500);
    }
  }, []);

  // --- Render ---

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

  if (competitionState === "username") {
    return (
      <div className="pi-competition pi-competition--username">
        <div className="pi-full-page-content">
          <div className="pi-symbol" aria-hidden>
            π
          </div>
          <h1 className="pi-page-title">Pi Day Competition</h1>
          <p className="pi-page-subtitle">Enter your name to join</p>
          <form
            className="pi-auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleAuth();
            }}
          >
            <div className="pi-form-group">
              <label className="pi-form-label" htmlFor="pi-username">
                Username
              </label>
              <input
                id="pi-username"
                className="pi-form-input"
                type="text"
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                disabled={authLoading}
              />
            </div>
            <div className="pi-form-group">
              <label className="pi-form-label" htmlFor="pi-password">
                Password{" "}
                <span className="pi-form-optional">(optional)</span>
              </label>
              <input
                id="pi-password"
                className="pi-form-input"
                type="password"
                placeholder="Leave blank if none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={authLoading}
              />
            </div>
            {authError && (
              <p className="pi-form-error" role="alert">
                {authError}
              </p>
            )}
            <button type="submit" className="pi-start-btn" disabled={authLoading}>
              {authLoading ? "Checking…" : "Continue →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (competitionState === "ready") {
    const modeDuration = getTimerDuration(competitionMode);
    const modePenalty = getPenaltySeconds(competitionMode);

    return (
      <div className="pi-competition pi-competition--ready">
        <div className="pi-full-page-content">
          <div className="pi-symbol" aria-hidden>
            π
          </div>
          <h1 className="pi-page-title">Pi Day Competition</h1>
          {usernameRef.current && (
            <p className="pi-page-subtitle">
              Playing as <strong>{usernameRef.current}</strong>
            </p>
          )}
          <div className="pi-mode-toggle" role="radiogroup" aria-label="Competition mode">
            <button
              className={`pi-mode-btn ${competitionMode === "mini" ? "pi-mode-btn--active" : ""}`}
              onClick={() => setCompetitionMode("mini")}
              role="radio"
              aria-checked={competitionMode === "mini"}
            >
              Quick
            </button>
            <button
              className={`pi-mode-btn ${competitionMode === "main" ? "pi-mode-btn--active" : ""}`}
              onClick={() => setCompetitionMode("main")}
              role="radio"
              aria-checked={competitionMode === "main"}
            >
              Regular
            </button>
          </div>
          <div className="pi-rules">
            <h2 className="pi-rules-title">
              {competitionMode === "mini" ? "Quick" : "Regular"} Rules
            </h2>
            <ul className="pi-rules-list">
              <li>
                You have <strong>{formatDuration(modeDuration)}</strong> to find as many unique
                solutions as possible for <strong>March 14</strong>.
              </li>
              <li>
                Each time you complete the puzzle, the board clears automatically
                so you can find another solution.
              </li>
              <li>
                Using the solver costs{" "}
                <strong>{Number.isInteger(modePenalty) ? modePenalty : modePenalty.toFixed(2)} seconds</strong> per unique board
                configuration — same config used again? No penalty.
              </li>
              <li>
                There&apos;s no pause. Once you start, the clock runs until it hits
                zero.
              </li>
            </ul>
            <div className="pi-rules-note">
              Only your <strong>first attempt</strong> (Quick or Regular) is eligible
              for its leaderboard. If you play Quick first, your Regular score
              won&apos;t appear on the Regular leaderboard and vice-versa. You can
              always replay either mode for fun.
            </div>
          </div>
          <button className="pi-start-btn" onClick={handleStart}>
            {competitionMode === "mini"
              ? "Play Quick Competition"
              : "Play Regular Competition"}
          </button>
        </div>
      </div>
    );
  }

  if (competitionState === "finished") {
    const currentUsername = usernameRef.current;
    const finishedMode = competitionModeRef.current;
    const modeLabel = finishedMode === "mini" ? "Quick" : "Regular";
    const isAdmin = getCookie("pi_admin") === "1";

    return (
      <div className="pi-competition pi-competition--finished">
        <div className="pi-finished-page">
          <div className="pi-symbol" aria-hidden>
            π
          </div>
          {redirectedToLeaderboard ? (
            <>
              <h1 className="pi-page-title">You&rsquo;ve Already Competed!</h1>
              <p className="pi-page-subtitle">
                {currentUsername ? (
                  <>
                    Welcome back, <strong>{currentUsername}</strong>.
                  </>
                ) : (
                  "Welcome back."
                )}{" "}
                Here&rsquo;s the current leaderboard:
              </p>
            </>
          ) : (
            <>
              <h1 className="pi-page-title">Time&rsquo;s Up!</h1>
              <p className="pi-page-subtitle">
                Here&rsquo;s how you did
                {currentUsername ? (
                  <>
                    , <strong>{currentUsername}</strong>
                  </>
                ) : (
                  ""
                )}{" "}
                ({modeLabel}):
              </p>

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
                    {bestSolutionSeconds === null ? "—" : `${bestSolutionSeconds}s`}
                  </span>
                  <span className="pi-result-label">Best Solution Time</span>
                </div>
              </div>
            </>
          )}

          {currentUsername && <MySolutions username={currentUsername} ready={!leaderboardLoading} />}

          <div className="pi-leaderboard">
            <div className="pi-leaderboard-header">
              <div className="pi-leaderboard-title">{modeLabel} Leaderboard</div>
              {currentUsername && (
                <label className="pi-visibility-toggle">
                  <input
                    type="checkbox"
                    className="pi-visibility-toggle-input"
                    checked={showOnLeaderboard}
                    onChange={handleVisibilityToggle}
                    disabled={visibilityLoading}
                  />
                  <span className="pi-visibility-toggle-track" aria-hidden />
                  <span className="pi-visibility-toggle-label">
                    {showOnLeaderboard ? "Shown on leaderboard" : "Hidden from leaderboard"}
                  </span>
                </label>
              )}
            </div>
            {leaderboardLoading ? (
              <p className="pi-leaderboard-empty">Loading…</p>
            ) : leaderboard.length === 0 ? (
              <p className="pi-leaderboard-empty">No entries yet.</p>
            ) : (
              <div className="pi-leaderboard-scroll">
                <table className="pi-leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Solutions</th>
                      <th>Hints</th>
                      <th>Best Time</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row) => (
                      <tr
                        key={row.username}
                        className={row.username === currentUsername ? "pi-lb-me" : ""}
                      >
                        <td>{row.rank}</td>
                        <td>
                          {row.username}
                          {row.username === currentUsername ? " \u2605" : ""}
                        </td>
                        <td>{row.solutions}</td>
                        <td>{row.hints_used}</td>
                        <td>
                          {row.best_solution_seconds === null
                            ? "—"
                            : `${row.best_solution_seconds}s`}
                        </td>
                        <td>{formatDateTime(row.completed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pi-action-row">
            <div className="pi-play-again-wrap">
              <button
                className="pi-start-btn pi-start-btn--secondary"
                onClick={handlePlayAgain}
              >
                Play Again
              </button>
              <a
                href="/pi-day"
                className="pi-start-btn pi-start-btn--secondary"
              >
                Play Again (No Time Limit)
              </a>
            </div>
            {isAdmin && (
              <a href="/api/competition/export" className="pi-admin-btn">
                Export CSV
              </a>
            )}
          </div>

          <div className="pi-feedback">
            <h2 className="pi-feedback-title">Share Your Thoughts</h2>
            <p className="pi-feedback-subtitle">
              Please give me feedback so that I can grow from a pi into a pie. 
            </p>
            {feedbackStatus === "submitted" ? (
              <div className="pi-feedback-submitted">
                <p className="pi-feedback-success">Thanks for the feedback!</p>
                <button
                  className="pi-feedback-more-btn"
                  onClick={() => {
                    setFeedbackText("");
                    setFeedbackStatus("idle");
                  }}
                >
                  Leave more feedback
                </button>
              </div>
            ) : (
              <>
                <textarea
                  className="pi-feedback-textarea"
                  placeholder="Write your feedback here…"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  disabled={feedbackStatus === "submitting"}
                  maxLength={2000}
                  rows={4}
                />
                {feedbackStatus === "error" && (
                  <p className="pi-feedback-error" role="alert">
                    Something went wrong — please try again.
                  </p>
                )}
                <button
                  className="pi-start-btn pi-start-btn--secondary pi-feedback-submit"
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackStatus === "submitting" || !feedbackText.trim()}
                >
                  {feedbackStatus === "submitting" ? "Sending…" : "Send Feedback"}
                </button>
              </>
            )}
          </div>
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
          <div className="pi-active-stats-inner">
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
              <span className="pi-stat-value">
                {hintsUsed}
                {showHintPenaltyFlash && (
                  <span className="pi-stat-hint-penalty pi-stat-hint-penalty--flash">
                    (−{getPenaltySeconds(competitionModeRef.current)}s)
                  </span>
                )}
              </span>
              <span className="pi-stat-label">
                Hints (−{getPenaltySeconds(competitionModeRef.current)}s each)
              </span>
            </div>
          </div>
          <div className="pi-active-end-wrap">
            <button
              type="button"
              className="pi-end-early-btn"
              onClick={handleEndEarly}
              aria-label="End competition early and submit score"
            >
              End early
            </button>
          </div>
        </div>
      </div>
      <div className="pi-active-content">
        <App
          initialMonth="Mar"
          initialDay={14}
          competitionMode
          onSolutionFound={handleSolutionFound}
          onSolveHint={handleSolveHint}
          openTutorialOnMount
          onInitialTutorialClose={handleInitialTutorialClose}
        />
        <SolutionHistory
          solutions={foundSolutions}
          targetMonth="Mar"
          targetDay={14}
        />
      </div>
    </div>
  );
}
