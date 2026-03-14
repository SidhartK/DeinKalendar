"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import App from "../App";
import { PlacedPiece } from "../types";
import { getPieceById, getSolverOrientationIndex } from "../utils/pieces";
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
  const s = Math.max(0, totalSeconds);
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

  // Refs mirror the stats so async callbacks always read the latest values
  const solutionCountRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const bestSolutionSecondsRef = useRef<number | null>(null);
  const usernameRef = useRef("");

  // Finished screen
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [redirectedToLeaderboard, setRedirectedToLeaderboard] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintPenaltyFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSubmissionRef = useRef(false);
  const solutionKeysRef = useRef(new Set<string>());
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
            }),
          });
        } catch (err) {
          console.error("Failed to submit results:", err);
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
    usedPuzzleKeysRef.current = new Set();
    lastSolutionTimeRef.current = Date.now();
    setLeaderboard([]);
    setLeaderboardLoading(false);
    setCompetitionState("active");
  }, [competitionMode]);

  const handlePlayAgain = useCallback(() => {
    skipSubmissionRef.current = false;
    setRedirectedToLeaderboard(false);
    setCompetitionState("ready");
  }, []);

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

  const handleSolutionFound = useCallback((placedPieces: PlacedPiece[]) => {
    const key = makeSolutionKey(placedPieces);
    if (!solutionKeysRef.current.has(key)) {
      solutionKeysRef.current.add(key);
      const newCount = solutionKeysRef.current.size;
      solutionCountRef.current = newCount;
      setSolutionCount(newCount);

      const now = Date.now();
      const gapSeconds = Math.round((now - (lastSolutionTimeRef.current ?? now)) / 1000);
      lastSolutionTimeRef.current = now;
      const prevBest = bestSolutionSecondsRef.current;
      const newBest = prevBest === null ? gapSeconds : Math.min(prevBest, gapSeconds);
      bestSolutionSecondsRef.current = newBest;
      setBestSolutionSeconds(newBest);
    }
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
              Mini
            </button>
            <button
              className={`pi-mode-btn ${competitionMode === "main" ? "pi-mode-btn--active" : ""}`}
              onClick={() => setCompetitionMode("main")}
              role="radio"
              aria-checked={competitionMode === "main"}
            >
              Main
            </button>
          </div>
          <div className="pi-rules">
            <h2 className="pi-rules-title">
              {competitionMode === "mini" ? "Mini" : "Main"} Rules
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
              Only your <strong>first attempt</strong> (Mini or Main) is eligible
              for its leaderboard. If you play Mini first, your Main score
              won&apos;t appear on the Main leaderboard and vice-versa. You can
              always replay either mode for fun.
            </div>
          </div>
          <button className="pi-start-btn" onClick={handleStart}>
            {competitionMode === "mini"
              ? "Play Mini Competition"
              : "Play Main Competition"}
          </button>
        </div>
      </div>
    );
  }

  if (competitionState === "finished") {
    const currentUsername = usernameRef.current;
    const finishedMode = competitionModeRef.current;
    const modeLabel = finishedMode === "mini" ? "Mini" : "Main";
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

          <div className="pi-leaderboard">
            <div className="pi-leaderboard-title">{modeLabel} Leaderboard</div>
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
              <p className="pi-play-again-note">
                Playing again won&apos;t count toward the leaderboard — your first attempt is already locked in.
              </p>
            </div>
            {isAdmin && (
              <a href="/api/competition/export" className="pi-admin-btn">
                Export CSV
              </a>
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
