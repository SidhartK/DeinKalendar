"use client";

import { useEffect, useState } from "react";
import App from "@/App";
import { MONTHS } from "@/types";

export default function TodayPage() {
  const [date, setDate] = useState<{ month: string; day: number } | null>(null);

  useEffect(() => {
    const today = new Date();
    const month = MONTHS[today.getMonth()];
    const day = today.getDate();
    console.log("[/today] local now:", today.toString(), { month, day });
    setDate({ month, day });
  }, []);

  if (!date) {
    return <div style={{ padding: 16 }}>Loading today&apos;s date…</div>;
  }

  return <App initialMonth={date.month} initialDay={date.day} />;
}
