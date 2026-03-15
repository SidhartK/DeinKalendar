import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM = Deno.env.get("TWILIO_FROM")!;
const TWILIO_TO = Deno.env.get("TWILIO_TO")!;

serve(async (req) => {
  try {
    const payload = await req.json();
    const entry = payload.record as {
      username: string;
      solutions: number;
      hints_used: number;
      best_solution_seconds: number | null;
      duration_seconds: number;
      completed_at: string;
      is_first_attempt: boolean;
    };

    const mins = Math.floor(entry.duration_seconds / 60);
    const secs = entry.duration_seconds % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const bestStr = entry.best_solution_seconds != null
      ? ` (best: ${entry.best_solution_seconds}s)`
      : "";
    const firstStr = entry.is_first_attempt ? " [first attempt]" : " [repeat]";

    const body =
      `🗓️ Pi Day entry!\n` +
      `User: ${entry.username}${firstStr}\n` +
      `Solutions: ${entry.solutions}, Hints: ${entry.hints_used}\n` +
      `Time: ${timeStr}${bestStr}`;

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: TWILIO_TO,
          From: TWILIO_FROM,
          Body: body,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Twilio error:", err);
      return new Response(err, { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("notify-entry error:", e);
    return new Response(String(e), { status: 500 });
  }
});
