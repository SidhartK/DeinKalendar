"use client";

import "./StatsPanel.css";

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function StatsPanel({
  timeTakenMs,
  hintsUsedCount,
  coveringsButtonClickCount,
  coveringsSquaresViewedCount,
  initialSolutions,
  onShare,
  shareStatus,
}: {
  timeTakenMs: number | null;
  hintsUsedCount: number;
  coveringsButtonClickCount: number;
  coveringsSquaresViewedCount: number;
  initialSolutions: number | null;
  onShare: () => void;
  shareStatus: "idle" | "copied" | "error";
}) {
  return (
    <div className="solver-panel stats-panel">
      <h3>Stats</h3>
      <div className="stats-panel-grid" role="list">
        <div className="stats-panel-item" role="listitem">
          <span className="stats-panel-label">Time</span>
          <span className="stats-panel-value">
            {timeTakenMs == null ? "—" : formatDurationMs(timeTakenMs)}
          </span>
        </div>
        <div className="stats-panel-item" role="listitem">
          <span className="stats-panel-label">Initial solutions</span>
          <span className="stats-panel-value">
            {initialSolutions == null ? "—" : initialSolutions.toLocaleString()}
          </span>
        </div>
        <div className="stats-panel-item" role="listitem">
          <span className="stats-panel-label">
            Hints (distinct board positions)
          </span>
          <span className="stats-panel-value">
            {hintsUsedCount.toLocaleString()}
          </span>
        </div>
        <div className="stats-panel-item" role="listitem">
          <span className="stats-panel-label">
            Show # of Coverings per Square clicks
          </span>
          <span className="stats-panel-value">
            {coveringsButtonClickCount.toLocaleString()}
          </span>
        </div>
        <div className="stats-panel-item" role="listitem">
          <span className="stats-panel-label">Number of squares revealed</span>
          <span className="stats-panel-value">
            {coveringsSquaresViewedCount.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="solver-controls solver-controls--secondary">
        <button type="button" className="solver-btn solve-btn" onClick={onShare}>
          {shareStatus === "copied"
            ? "Copied!"
            : shareStatus === "error"
              ? "Copy failed"
              : "Copy results"}
        </button>
      </div>
    </div>
  );
}

