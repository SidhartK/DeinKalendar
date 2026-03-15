"use client";

import App from "@/App";

/** Pi Day puzzle page: same as /today but fixed to March 14th (no time limit, no competition). */
export default function PiDayPage() {
  return <App initialMonth="Mar" initialDay={14} />;
}
