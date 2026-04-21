"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Calendar } from "lucide-react";

/**
 * Schedule builder with presets that all produce a 5-field cron string.
 * Matches the shape of Claude's Add Schedule UI:
 *   Hourly   → `<minute> * * * *`
 *   Daily    → `<minute> <hour> * * *`
 *   Weekdays → `<minute> <hour> * * 1-5`
 *   Weekly   → `<minute> <hour> * * <dow>`
 *   Custom   → user-provided cron string
 */

export type ScheduleMode = "hourly" | "daily" | "weekdays" | "weekly" | "custom";

interface Props {
  value: string | null;
  onChange: (cron: string | null) => void;
}

const MODES: { key: ScheduleMode; label: string; icon: typeof Clock }[] = [
  { key: "hourly", label: "Hourly", icon: Clock },
  { key: "daily", label: "Daily", icon: Calendar },
  { key: "weekdays", label: "Weekdays", icon: Calendar },
  { key: "weekly", label: "Weekly", icon: Calendar },
  { key: "custom", label: "Custom", icon: Clock },
];

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function isValidCron(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => /^[\d*/,\-]+$/.test(p));
}

function parseCron(cron: string | null): {
  mode: ScheduleMode;
  minute: number;
  hour: number;
  weekday: number;
} {
  const fallback = { mode: "daily" as ScheduleMode, minute: 0, hour: 9, weekday: 1 };
  if (!cron) return fallback;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return { ...fallback, mode: "custom" };

  const [m, h, dom, mon, dow] = parts;
  const minute = /^\d+$/.test(m) ? Number(m) : 0;
  const hour = /^\d+$/.test(h) ? Number(h) : 0;

  if (dom === "*" && mon === "*" && dow === "*" && h === "*" && /^\d+$/.test(m)) {
    return { mode: "hourly", minute, hour: 0, weekday: 0 };
  }
  if (dom === "*" && mon === "*" && dow === "*" && /^\d+$/.test(h) && /^\d+$/.test(m)) {
    return { mode: "daily", minute, hour, weekday: 0 };
  }
  if (dom === "*" && mon === "*" && dow === "1-5" && /^\d+$/.test(h) && /^\d+$/.test(m)) {
    return { mode: "weekdays", minute, hour, weekday: 1 };
  }
  if (dom === "*" && mon === "*" && /^\d+$/.test(dow) && /^\d+$/.test(h) && /^\d+$/.test(m)) {
    return { mode: "weekly", minute, hour, weekday: Number(dow) };
  }
  return { ...fallback, mode: "custom" };
}

function buildCron(mode: ScheduleMode, minute: number, hour: number, weekday: number): string {
  switch (mode) {
    case "hourly":
      return `${minute} * * * *`;
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekdays":
      return `${minute} ${hour} * * 1-5`;
    case "weekly":
      return `${minute} ${hour} * * ${weekday}`;
    default:
      return "";
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function humanize(mode: ScheduleMode, minute: number, hour: number, weekday: number, cron: string): string {
  const time = `${pad(hour)}:${pad(minute)}`;
  switch (mode) {
    case "hourly":
      return `Runs every hour at minute ${minute}`;
    case "daily":
      return `Runs daily at ${time}`;
    case "weekdays":
      return `Runs Mon–Fri at ${time}`;
    case "weekly": {
      const day = WEEKDAYS.find((d) => d.value === weekday)?.label ?? "Monday";
      return `Runs every ${day} at ${time}`;
    }
    case "custom":
      return isValidCron(cron) ? `Custom: ${cron}` : "Invalid cron expression";
  }
}

export default function ScheduleBuilder({ value, onChange }: Props) {
  const parsed = useMemo(() => parseCron(value), [value]);
  const [mode, setMode] = useState<ScheduleMode>(parsed.mode);
  const [minute, setMinute] = useState<number>(parsed.minute);
  const [hour, setHour] = useState<number>(parsed.hour);
  const [weekday, setWeekday] = useState<number>(parsed.weekday);
  const [customCron, setCustomCron] = useState<string>(
    parsed.mode === "custom" && value ? value : "0 9 * * *"
  );

  // Re-sync if the parent value changes externally (e.g. opening edit modal).
  useEffect(() => {
    const p = parseCron(value);
    setMode(p.mode);
    setMinute(p.minute);
    setHour(p.hour);
    setWeekday(p.weekday);
    if (p.mode === "custom" && value) setCustomCron(value);
  }, [value]);

  // Push the generated cron string upward whenever inputs change.
  useEffect(() => {
    const next = mode === "custom" ? customCron.trim() : buildCron(mode, minute, hour, weekday);
    onChange(next || null);
  }, [mode, minute, hour, weekday, customCron]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = humanize(
    mode,
    minute,
    hour,
    weekday,
    mode === "custom" ? customCron : buildCron(mode, minute, hour, weekday)
  );

  return (
    <div
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        padding: 14,
        background: "var(--bg-primary)",
      }}
    >
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {MODES.map(({ key, label, icon: Icon }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                border: `1px solid ${active ? "var(--accent)" : "var(--border-color)"}`,
                background: active ? "var(--accent-subtle)" : "var(--bg-card)",
                color: active ? "var(--accent)" : "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Inputs per mode */}
      {mode === "hourly" && (
        <ModeRow label="At minute">
          <NumberInput min={0} max={59} value={minute} onChange={setMinute} width={70} />
        </ModeRow>
      )}

      {(mode === "daily" || mode === "weekdays") && (
        <ModeRow label="Time">
          <TimeInput hour={hour} minute={minute} onHour={setHour} onMinute={setMinute} />
        </ModeRow>
      )}

      {mode === "weekly" && (
        <>
          <ModeRow label="Day">
            <select
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              style={selectStyle}
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </ModeRow>
          <ModeRow label="Time">
            <TimeInput hour={hour} minute={minute} onHour={setHour} onMinute={setMinute} />
          </ModeRow>
        </>
      )}

      {mode === "custom" && (
        <ModeRow label="Cron expression">
          <input
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            placeholder="0 13 * * 1"
            style={{
              ...inputStyle,
              fontFamily: "monospace",
              width: "100%",
            }}
          />
        </ModeRow>
      )}

      <p
        style={{
          fontSize: 12,
          color:
            mode === "custom" && !isValidCron(customCron)
              ? "var(--error)"
              : "var(--text-muted)",
          margin: "10px 0 0",
        }}
      >
        {summary}
      </p>
    </div>
  );
}

function ModeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  min,
  max,
  value,
  onChange,
  width,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  width?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isNaN(n)) return;
        onChange(Math.max(min, Math.min(max, n)));
      }}
      style={{ ...inputStyle, width: width ?? 80 }}
    />
  );
}

function TimeInput({
  hour,
  minute,
  onHour,
  onMinute,
}: {
  hour: number;
  minute: number;
  onHour: (h: number) => void;
  onMinute: (m: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <NumberInput min={0} max={23} value={hour} onChange={onHour} width={70} />
      <span style={{ color: "var(--text-muted)" }}>:</span>
      <NumberInput min={0} max={59} value={minute} onChange={onMinute} width={70} />
      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 6 }}>
        (24h, local time)
      </span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  background: "var(--bg-input)",
  border: "1px solid var(--border-color)",
  borderRadius: 6,
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: 180,
};
