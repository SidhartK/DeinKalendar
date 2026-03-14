"use client";

import { useState, useCallback, useEffect } from "react";
import "./HelpHotkeys.css";

const HOTKEYS = [
  { key: "1–8", action: "Select piece" },
  { key: "R", action: "Rotate selected piece" },
  { key: "E", action: "Flip selected piece" },
  { key: "Esc", action: "Deselect" },
  { key: "Space", action: "Place piece (when valid)" },
  { key: "Q", action: "Remove last piece" },
  { key: "W", action: "Undo last removal" },
  { key: "H", action: "Hint" },
];

export default function HelpHotkeys() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        className="help-hotkeys-trigger"
        onClick={() => setOpen((v) => !v)}
        title="Keyboard shortcuts"
        aria-label="Show keyboard shortcuts"
        aria-expanded={open}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
          <line x1="6" y1="8" x2="6.01" y2="8" />
          <line x1="10" y1="8" x2="10.01" y2="8" />
          <line x1="14" y1="8" x2="14.01" y2="8" />
          <line x1="18" y1="8" x2="18.01" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="7" y1="16" x2="13" y2="16" />
          <line x1="15" y1="16" x2="17" y2="16" />
        </svg>
      </button>
      {open && (
        <>
          <div
            className="help-hotkeys-backdrop"
            onClick={close}
            aria-hidden
          />
          <div
            className="help-hotkeys-panel"
            role="dialog"
            aria-label="Keyboard shortcuts"
          >
            <div className="help-hotkeys-header">
              <h3>Shortcuts</h3>
              <button
                type="button"
                className="help-hotkeys-close"
                onClick={close}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <ul className="help-hotkeys-list">
              {HOTKEYS.map(({ key: k, action }) => (
                <li key={k}>
                  <kbd>{k}</kbd>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
