"use client";

import "./StatsPanel.css";

export default function StatsPanel({
  hintsUsedCount,
  coveringsButtonClickCount,
  coveringsSquaresViewedCount,
}: {
  hintsUsedCount: number;
  coveringsButtonClickCount: number;
  coveringsSquaresViewedCount: number;
}) {
  return (
    <div className="solver-panel stats-panel">
      <h3>Stats</h3>
      <div className="stats-panel-grid" role="list">
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
    </div>
  );
}

