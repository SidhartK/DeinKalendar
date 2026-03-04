import { MONTHS } from "../types";
import "./DateSelector.css";

interface DateSelectorProps {
  month: string;
  day: number;
  onMonthChange: (month: string) => void;
  onDayChange: (day: number) => void;
}

export default function DateSelector({
  month,
  day,
  onMonthChange,
  onDayChange,
}: DateSelectorProps) {
  return (
    <div className="date-selector">
      <h3 className="date-title">Target Date</h3>
      <div className="date-fields">
        <label className="date-label">
          Month
          <select
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="date-select"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="date-label">
          Day
          <select
            value={day}
            onChange={(e) => onDayChange(Number(e.target.value))}
            className="date-select"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
