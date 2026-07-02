"use client";

import { Fragment, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { POSITIVE, FLAGS, WEEKLY_TARGETS } from "@/lib/habits";

// --- Types ---

type Entry = { date: string; [k: string]: string | boolean };

type ApiResponse = { entries?: Entry[]; error?: string };

// --- Helpers ---

/** Formats a Date as YYYY-MM-DD using the browser's local calendar, not UTC. */
function localDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Fills in a continuous 30-day window ending today, backfilling missing dates
 * with all-false entries so streaks and grids always span a full month.
 */
function buildRange(raw: Entry[]): Entry[] {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const date = localDateStr(d);
    const found = raw.find((e) => e.date === date);
    if (found) return found;
    const blank: Entry = { date };
    [...POSITIVE, ...FLAGS].forEach((h) => (blank[h] = false));
    return blank;
  });
}

/**
 * Counts consecutive entries from the end of `data` where `entry[key] === wantTrue`.
 * Used for both positive streaks (wantTrue=true) and clean streaks (wantTrue=false).
 */
function streak(key: string, data: Entry[], wantTrue: boolean): number {
  let n = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if ((data[i][key] === true) === wantTrue) n++;
    else break;
  }
  return n;
}

/** Returns the fraction of days in `data` where `key` was true. */
function completionRate(key: string, data: Entry[]): number {
  return data.length ? data.filter((e) => e[key] === true).length / data.length : 0;
}

// --- Progress helpers ---

type Period = { label: string; key: string; data: Entry[] };

/** Returns a blank entry with all habits set to false. */
function blankEntry(date: string): Entry {
  const e: Entry = { date };
  [...POSITIVE, ...FLAGS].forEach((h) => (e[h] = false));
  return e;
}

/**
 * Merges duplicate Notion entries for the same date by OR-ing checkbox values,
 * then returns a date-sorted, deduplicated array.
 */
function dedupeEntries(entries: Entry[]): Entry[] {
  const byDate = new Map<string, Entry>();
  for (const e of entries) {
    if (!byDate.has(e.date)) {
      byDate.set(e.date, { ...e });
    } else {
      const merged = byDate.get(e.date)!;
      for (const key of Object.keys(e)) {
        if (key !== "date" && e[key] === true) merged[key] = true;
      }
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Groups entries into Monday-anchored ISO weeks, filling every day Mon–Sun
 * (capped at today) so the denominator always reflects the full week.
 * Returns periods sorted oldest → newest.
 */
function groupByWeek(entries: Entry[]): Period[] {
  const deduped = dedupeEntries(entries);
  const byDate = new Map(deduped.map((e) => [e.date, e]));
  const todayStr = localDateStr(new Date());

  const weekKeys = new Set<string>();
  for (const e of deduped) {
    const d = new Date(e.date + "T12:00:00");
    const mon = new Date(d);
    // +6 % 7 maps Sun=0…Sat=6 → Mon=0…Sun=6, stepping back to Monday
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    weekKeys.add(localDateStr(mon));
  }

  return Array.from(weekKeys)
    .sort()
    .map((key) => {
      const data: Entry[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(key + "T12:00:00");
        d.setDate(d.getDate() + i);
        const dateStr = localDateStr(d);
        if (dateStr > todayStr) break;
        data.push(byDate.get(dateStr) ?? blankEntry(dateStr));
      }
      const label = new Date(key + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { label, key, data };
    });
}

/**
 * Groups entries into calendar months, filling every day of the month
 * (capped at today) so the denominator always reflects the full month.
 * Returns periods sorted oldest → newest.
 */
function groupByMonth(entries: Entry[]): Period[] {
  const deduped = dedupeEntries(entries);
  const byDate = new Map(deduped.map((e) => [e.date, e]));
  const todayStr = localDateStr(new Date());

  const monthKeys = new Set<string>();
  for (const e of deduped) monthKeys.add(e.date.slice(0, 7));

  return Array.from(monthKeys)
    .sort()
    .map((key) => {
      const [y, m] = key.split("-").map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const data: Entry[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${key}-${String(day).padStart(2, "0")}`;
        if (dateStr > todayStr) break;
        data.push(byDate.get(dateStr) ?? blankEntry(dateStr));
      }
      const label = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      return { label, key, data };
    });
}

/** Maps a 0–1 completion rate to a green / yellow / red hex color. */
function rateColor(r: number): string {
  if (r >= 0.7) return "#4ade80";
  if (r >= 0.4) return "#facc15";
  return "#f87171";
}

/** Maps a completion rate to the matching Badge variant. */
function rateBadgeVariant(r: number): "success" | "warning" | "danger" {
  if (r >= 0.7) return "success";
  if (r >= 0.4) return "warning";
  return "danger";
}

/**
 * Returns { count, target } for a habit within the current week (Mon–today)
 * or current month (1st–today), derived from the 30-day entry array.
 *
 * @param habit   - Habit name to count.
 * @param data    - Full 30-day entry array (already gap-filled).
 * @param view    - "weekly" counts Mon–today; "monthly" counts 1st–today.
 */
function periodCount(
  habit: string,
  data: Entry[],
  view: "weekly" | "monthly",
): { count: number; target: number } {
  const today = new Date();
  const todayStr = localDateStr(today);

  let fromStr: string;
  let target: number;
  const weeklyTarget = WEEKLY_TARGETS[habit] ?? 7;

  if (view === "weekly") {
    const mon = new Date(today);
    mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    fromStr = localDateStr(mon);
    target = weeklyTarget;
  } else {
    fromStr = todayStr.slice(0, 7) + "-01";
    const daysElapsed = today.getDate();
    target = Math.round(weeklyTarget * (daysElapsed / 7));
  }

  const slice = data.filter((e) => e.date >= fromStr && e.date <= todayStr);
  const count = slice.filter((e) => e[habit] === true).length;
  return { count, target };
}

// --- Section label shared component ---

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground pb-2 border-b border-border mb-5">
      {children}
    </p>
  );
}

// --- Streaks tab ---

/**
 * Interactive snapshot of today's habit completion shown under the target boxes.
 * Fetches its own state from /api/today so it stays in sync with the today page,
 * and allows toggling individual habits via PATCH without leaving the dashboard.
 */
function TodaySnapshot() {
  const [habits, setHabits] = useState<Record<string, boolean>>({});
  const [pageId, setPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const date = new Date().toLocaleDateString("en-CA");
    fetch(`/api/today?date=${date}`)
      .then((r) => r.json())
      .then((d: { pageId?: string | null; habits?: Record<string, boolean> }) => {
        setPageId(d.pageId ?? null);
        setHabits(d.habits ?? {});
        setLoaded(true);
      });
  }, []);

  async function toggle(habit: string) {
    const next = !habits[habit];
    setHabits((prev) => ({ ...prev, [habit]: next }));
    setSaving((prev) => new Set(prev).add(habit));
    try {
      const res = await fetch("/api/today", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, habit, checked: next, date: new Date().toLocaleDateString("en-CA") }),
      });
      const data = (await res.json()) as { ok?: boolean; pageId?: string };
      if (data.pageId && !pageId) setPageId(data.pageId);
    } catch {
      setHabits((prev) => ({ ...prev, [habit]: !next }));
    } finally {
      setSaving((prev) => { const s = new Set(prev); s.delete(habit); return s; });
    }
  }

  if (!loaded) return (
    <div className="mb-8 rounded border border-border p-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground animate-pulse">today</p>
    </div>
  );

  const donePct = POSITIVE.length
    ? Math.round((POSITIVE.filter((h) => habits[h]).length / POSITIVE.length) * 100)
    : 0;
  const flaggedCount = FLAGS.filter((h) => habits[h]).length;

  return (
    <div className="mb-8 rounded border border-border p-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">today</p>
        <span
          className="text-[11px] tabular-nums"
          style={{ color: donePct === 100 ? "#4ade80" : donePct >= 50 ? "#facc15" : "#6b7280" }}
        >
          {donePct}%
        </span>
      </div>

      {/* Positive habits */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {POSITIVE.map((habit) => {
          const done = habits[habit] === true;
          const busy = saving.has(habit);
          return (
            <button
              key={habit}
              onClick={() => toggle(habit)}
              disabled={busy}
              className="text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 rounded border transition-all duration-200 cursor-pointer"
              style={{
                color: done ? "#4ade80" : "#555",
                borderColor: done ? "#166534" : "#2a2a2a",
                background: done ? "rgba(74,222,128,0.06)" : "transparent",
                opacity: busy ? 0.5 : 1,
              }}
            >
              {habit}
            </button>
          );
        })}
      </div>

      {/* Watch list */}
      <div className="flex flex-wrap gap-1.5">
        {FLAGS.map((habit) => {
          const flagged = habits[habit] === true;
          const busy = saving.has(habit);
          return (
            <button
              key={habit}
              onClick={() => toggle(habit)}
              disabled={busy}
              className="text-[9px] uppercase tracking-[0.12em] px-2 py-0.5 rounded border transition-all duration-200 cursor-pointer"
              style={{
                color: flagged ? "#f87171" : "#555",
                borderColor: flagged ? "#991b1b" : "#2a2a2a",
                background: flagged ? "rgba(248,113,113,0.06)" : "transparent",
                opacity: busy ? 0.5 : 1,
              }}
            >
              {habit}
            </button>
          );
        })}
      </div>
      {flaggedCount === 0 && (
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/40 mt-2">watch list · clean</p>
      )}
    </div>
  );
}

function StreaksView({ data }: { data: Entry[] }) {
  const [countView, setCountView] = useState<"weekly" | "monthly">("weekly");

  // Only habits with non-daily targets get count boxes
  const trackedHabits = Object.keys(WEEKLY_TARGETS);

  return (
    <div>
      {/* Count boxes for non-daily target habits */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>targets</SectionLabel>
          <div className="flex gap-1 mb-5">
            {(["weekly", "monthly"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setCountView(v)}
                className={`text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 rounded border transition-colors ${
                  countView === v
                    ? "border-border text-foreground bg-muted"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          {trackedHabits.map((habit) => {
            const { count, target } = periodCount(habit, data, countView);
            const rate = target > 0 ? Math.min(1, count / target) : 0;
            const color = rateColor(rate);
            const hit = count >= target;
            return (
              <div
                key={habit}
                className="flex-1 rounded border border-border p-3 flex flex-col gap-1"
                style={{ background: hit ? "rgba(74,222,128,0.04)" : "transparent" }}
              >
                <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground truncate">
                  {habit}
                </span>
                <span className="tabular-nums font-medium" style={{ fontSize: 22, color }}>
                  {count}
                  <span className="text-muted-foreground" style={{ fontSize: 13, fontWeight: 400 }}>
                    /{target}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's snapshot */}
      <TodaySnapshot />

      <SectionLabel>positive habits</SectionLabel>
      <div className="space-y-3">
        {POSITIVE.map((habit) => {
          const s = streak(habit, data, true);
          const r = completionRate(habit, data);
          const color = rateColor(r);
          return (
            <div key={habit} className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground w-44 shrink-0 truncate">
                {habit}
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${r * 100}%`, background: color }}
                />
              </div>

              <span
                className="text-[11px] w-10 text-right shrink-0 tabular-nums"
                style={{ color: s > 0 ? "#4ade80" : "#444" }}
              >
                {s > 0 ? `${s}d` : "—"}
              </span>

              <Badge variant={rateBadgeVariant(r)} className="w-10 justify-center shrink-0">
                {Math.round(r * 100)}%
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Grid tab ---

function GridView({ data }: { data: Entry[] }) {
  const all = [...POSITIVE, ...FLAGS];

  return (
    <div className="overflow-x-auto">
      <table style={{ borderSpacing: 3, borderCollapse: "separate" }}>
        <thead>
          <tr>
            {/* habit name column */}
            <th style={{ minWidth: 170 }} />
            {data.map((e) => {
              const d = new Date(e.date + "T12:00:00");
              // Highlight the 1st of a month so month boundaries are visible
              const isMonthStart = d.getDate() === 1;
              return (
                <th
                  key={e.date}
                  title={e.date}
                  className={isMonthStart ? "text-foreground font-semibold" : "text-muted-foreground font-normal"}
                  style={{ fontSize: 9, textAlign: "center", paddingBottom: 6, width: 22, minWidth: 22 }}
                >
                  {d.getDate()}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {all.map((habit, i) => {
            const isFlag = FLAGS.includes(habit);
            return (
              <Fragment key={habit}>
                {/* Divider row between positive habits and watch list */}
                {i === POSITIVE.length && (
                  <tr>
                    <td
                      colSpan={31}
                      className="text-muted-foreground/30 uppercase tracking-[0.15em]"
                      style={{ fontSize: 9, padding: "14px 0 4px" }}
                    >
                      — watch list
                    </td>
                  </tr>
                )}
                <tr>
                  <td
                    className="text-muted-foreground"
                    style={{ fontSize: 10, textAlign: "right", paddingRight: 10, whiteSpace: "nowrap", verticalAlign: "middle" }}
                  >
                    {habit}
                  </td>
                  {data.map((e) => {
                    const on = e[habit] === true;
                    return (
                      <td key={e.date} title={`${habit} · ${e.date}`}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 3,
                            // green for done positive, red for flagged watch-list, dark for empty
                            background: on
                              ? isFlag ? "#6b1f1f" : "#14532d"
                              : "#1c1c1c",
                            border: `1px solid ${
                              on
                                ? isFlag ? "#991b1b" : "#166534"
                                : "#262626"
                            }`,
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex gap-5 mt-5 text-[10px] text-muted-foreground">
        {[
          { bg: "#14532d", border: "#166534", label: "done" },
          { bg: "#6b1f1f", border: "#991b1b", label: "flagged" },
          { bg: "#1c1c1c", border: "#262626", label: "missed / clean" },
        ].map(({ bg, border, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: bg, border: `1px solid ${border}` }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Flags tab ---

function FlagsView({ data }: { data: Entry[] }) {
  return (
    <div>
      <SectionLabel>watch list — last 30 days</SectionLabel>
      <div className="space-y-2">
        {FLAGS.map((flag) => {
          const clean = streak(flag, data, false);
          const flaggedCount = data.filter((e) => e[flag] === true).length;
          const isClean = clean > 0;

          return (
            <Card key={flag}>
              <CardContent className="flex items-center gap-4 p-4">
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: isClean ? "#4ade80" : "#f87171" }}
                />

                <span className="text-[11px] uppercase tracking-wide text-muted-foreground flex-1 truncate">
                  {flag}
                </span>

                <Badge variant={isClean ? "success" : "danger"}>
                  {isClean ? `${clean}d clean` : "flagged"}
                </Badge>

                <span
                  className="text-[11px] min-w-[70px] text-right tabular-nums"
                  style={{ color: flaggedCount > 0 ? "#f87171" : "#444" }}
                >
                  {flaggedCount}× / 30d
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// --- Progress tab ---

/**
 * Renders a table of habits × time-periods for either weekly or monthly groupings.
 *
 * @param habits   - Ordered list of habit names to display.
 * @param periods  - Pre-grouped time buckets with their entry arrays.
 * @param isFlag   - When true, uses inverse color scale (lower occurrences = green).
 */
function ProgressTable({ habits, periods, isFlag }: { habits: string[]; periods: Period[]; isFlag: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderSpacing: "0 2px", borderCollapse: "separate" }}>
        <thead>
          <tr>
            <th style={{ minWidth: 170 }} />
            {periods.map((p) => (
              <th
                key={p.key}
                className="text-muted-foreground font-normal text-center pb-3"
                style={{ fontSize: 9, minWidth: 64 }}
              >
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {habits.map((habit) => (
            <tr key={habit}>
              <td
                className="text-muted-foreground text-right pr-4 whitespace-nowrap"
                style={{ fontSize: 10, paddingTop: 3, paddingBottom: 3 }}
              >
                {habit}
              </td>
              {periods.map((p) => {
                if (isFlag) {
                  const count = p.data.filter((e) => e[habit] === true).length;
                  const color = count === 0 ? "#4ade80" : count <= 2 ? "#facc15" : "#f87171";
                  return (
                    <td key={p.key} className="text-center" style={{ paddingTop: 3, paddingBottom: 3 }}>
                      <span className="tabular-nums" style={{ fontSize: 11, color }}>
                        {count === 0 ? "—" : `${count}×`}
                      </span>
                    </td>
                  );
                }
                const count = p.data.filter((e) => e[habit] === true).length;
                // Scale the weekly target to the actual number of days in this period
                const weeklyTarget = WEEKLY_TARGETS[habit] ?? 7;
                const periodTarget = weeklyTarget * (p.data.length / 7);
                const rate = p.data.length ? Math.min(1, count / periodTarget) : 0;
                const label = p.data.length
                  ? `${count}/${Math.round(periodTarget)}`
                  : "—";
                return (
                  <td key={p.key} className="text-center" style={{ paddingTop: 3, paddingBottom: 3 }}>
                    <span className="tabular-nums" style={{ fontSize: 11, color: rateColor(rate) }}>
                      {label}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Progress tab — fetches 90 days of data and renders weekly or monthly habit
 * completion rates for positive habits and raw occurrence counts for flags.
 */
function ProgressView() {
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/habits?days=90")
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        if (d.error) throw new Error(d.error);
        setAllEntries(d.entries ?? []);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const periods = useMemo(() => {
    const grouped = view === "weekly" ? groupByWeek(allEntries) : groupByMonth(allEntries);
    // Last 8 weeks or last 3 months
    return view === "weekly" ? grouped.slice(-8) : grouped.slice(-3);
  }, [view, allEntries]);

  if (loading) return <p className="text-[11px] tracking-[0.2em] text-primary animate-pulse">loading...</p>;
  if (err) return (
    <div className="text-[12px] text-red-400 p-4 rounded bg-red-400/5 border border-red-400/20 tracking-wide">
      <strong>error:</strong> {err}
    </div>
  );

  return (
    <div>
      {/* Weekly / Monthly toggle */}
      <div className="flex gap-1 mb-7">
        {(["weekly", "monthly"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`text-[10px] uppercase tracking-[0.15em] px-3 py-1 rounded border transition-colors ${
              view === v
                ? "border-border text-foreground bg-muted"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <SectionLabel>positive habits</SectionLabel>
      <ProgressTable habits={POSITIVE} periods={periods} isFlag={false} />

      <div className="mt-8">
        <SectionLabel>watch list</SectionLabel>
        <ProgressTable habits={FLAGS} periods={periods} isFlag={true} />
      </div>
    </div>
  );
}

// --- Dashboard ---

export default function Dashboard() {
  const [raw, setRaw] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/habits")
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        if (d.error) throw new Error(d.error);
        setRaw(d.entries ?? []);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const data = useMemo(() => buildRange(raw), [raw]);

  // Compute human-readable date range label
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  const rangeLabel = `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-sm font-medium tracking-[0.3em] uppercase text-primary mb-1.5">
            habit tracker
          </h1>
          <p className="text-[11px] text-muted-foreground tracking-wide">
            {rangeLabel} · {raw.length} entries
          </p>
        </div>

        {/* Today CTA */}
        <Link
          href="/today"
          className="flex items-center justify-between w-full mb-8 px-4 py-3 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/70 transition-colors group"
        >
          <span className="text-sm font-semibold tracking-[0.15em] uppercase text-primary">
            log today's habits
          </span>
          <span className="text-primary text-lg group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>

        {/* Loading / error states */}
        {loading && (
          <p className="text-[11px] tracking-[0.2em] text-primary animate-pulse">loading...</p>
        )}
        {err && (
          <div className="text-[12px] text-red-400 p-4 rounded bg-red-400/5 border border-red-400/20 tracking-wide">
            <strong>error:</strong> {err}
          </div>
        )}

        {/* Tabs */}
        {!loading && !err && (
          <Tabs defaultValue="streaks">
            <TabsList>
              <TabsTrigger value="streaks">Streaks</TabsTrigger>
              <TabsTrigger value="grid">Grid</TabsTrigger>
              <TabsTrigger value="flags">Flags</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
            </TabsList>

            <TabsContent value="streaks">
              <StreaksView data={data} />
            </TabsContent>

            <TabsContent value="grid">
              <GridView data={data} />
            </TabsContent>

            <TabsContent value="flags">
              <FlagsView data={data} />
            </TabsContent>

            <TabsContent value="progress">
              <ProgressView />
            </TabsContent>
          </Tabs>
        )}

      </div>
    </main>
  );
}
