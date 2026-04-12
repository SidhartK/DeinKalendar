"use client";

import { useCallback, useState } from "react";
import "./FeedbackSection.css";

const MAX_FEEDBACK_LENGTH = 2000;

export type FeedbackSectionTheme = "dark" | "light";

export interface FeedbackSectionProps {
  /** Stored with feedback when set (e.g. Pi competition username). */
  username?: string | null;
  /** Pi finished screen uses dark styling; main calendar pages use light. */
  theme?: FeedbackSectionTheme;
}

export default function FeedbackSection({
  username = null,
  theme = "dark",
}: FeedbackSectionProps) {
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<
    "idle" | "submitting" | "submitted" | "error"
  >("idle");

  const handleFeedbackSubmit = useCallback(async () => {
    const trimmed = feedbackText.trim();
    if (!trimmed) return;
    setFeedbackStatus("submitting");
    try {
      const res = await fetch("/api/competition/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: typeof username === "string" && username.trim() ? username.trim() : null,
          feedback: trimmed,
        }),
      });
      if (res.ok) {
        setFeedbackStatus("submitted");
      } else {
        setFeedbackStatus("error");
      }
    } catch {
      setFeedbackStatus("error");
    }
  }, [feedbackText, username]);

  const rootClass =
    theme === "light" ? "pi-feedback pi-feedback--light" : "pi-feedback";

  return (
    <div className={rootClass}>
      <h2 className="pi-feedback-title">Share Your Thoughts</h2>
      <p className="pi-feedback-subtitle">
        Please give me feedback so that I can grow from a pi into a pie.
      </p>
      {feedbackStatus === "submitted" ? (
        <div className="pi-feedback-submitted">
          <p className="pi-feedback-success">Thanks for the feedback!</p>
          <button
            type="button"
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
            maxLength={MAX_FEEDBACK_LENGTH}
            rows={4}
          />
          {feedbackStatus === "error" && (
            <p className="pi-feedback-error" role="alert">
              Something went wrong — please try again.
            </p>
          )}
          <button
            type="button"
            className="pi-feedback-send"
            onClick={handleFeedbackSubmit}
            disabled={feedbackStatus === "submitting" || !feedbackText.trim()}
          >
            {feedbackStatus === "submitting" ? "Sending…" : "Send Feedback"}
          </button>
        </>
      )}
    </div>
  );
}
