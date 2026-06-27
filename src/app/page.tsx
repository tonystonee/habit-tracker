"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- Constants ---

const POSITIVE = [
  "Gym",
  "Walking",
  "Meditate",
  "Take Creatine",
  "Take Medication",
  "Weekly Money Review",
];

const FLAGS = [
  "Alcohol",
  "Doomscrolling",
  "Impulse Purchase",
  "Junk Food / Late Night Eating",
];

// --- Types ---

type Entry = { date: string; [k: string]: string | boolean };

type ApiResponse = { entries?: Entry[]; error?: string };

// --- Helpers ---

/**
 * Fills in a continuous 30-day window ending today, backfilling missing dates
 * with all-false entries so streaks and grids always span a full month.
 */
function buildRange(raw: Entry[]): Entry[] {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const date = d.toISOString().split("T")[0];
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

// --- Section label shared component ---

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground pb-2 border-b border-border mb-5">
      {children}
    </p>
  );
}

// --- Streaks tab ---

function StreaksView({ data }: { data: Entry[] }) {
  return (
    <div>
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
        <div className="mb-10">
          <h1 className="text-sm font-medium tracking-[0.3em] uppercase text-primary mb-1.5">
            habit tracker
          </h1>
          <p className="text-[11px] text-muted-foreground tracking-wide">
            {rangeLabel} · {raw.length} entries
          </p>
        </div>

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
          </Tabs>
        )}

      </div>
    </main>
  );
}
