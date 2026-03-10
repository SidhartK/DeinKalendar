"use client";

import { useMemo } from "react";
import App from "@/App";
import { MONTHS } from "@/types";

export default function TodayPage() {
  const { month, day } = useMemo(() => {
    const today = new Date();
    return {
      month: MONTHS[today.getMonth()],
      day: today.getDate(),
    };
  }, []);

  return <App initialMonth={month} initialDay={day} />;
}
