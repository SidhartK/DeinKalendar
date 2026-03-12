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
  { key: "S", action: "Solve" },
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
        ?
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
