"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { habitLabel } from "@/lib/habits";

// --- Constants ---

const POSITIVE = [
  "Gym",
  "Walking",
  "Meditate",
  "Take Creatine",
  "Take Medication",
];

const FLAGS = [
  "Alcohol",
  "Doomscrolling",
  "Impulse Purchase",
  "Junk Food / Late Night Eating",
];

// --- Types ---

type Habits = Record<string, boolean>;

type ApiResponse = {
  pageId: string | null;
  habits?: Habits;
  error?: string;
};

// --- Helpers ---

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// --- Sub-components ---

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground pb-2 border-b border-border mb-5">
      {children}
    </p>
  );
}

interface ProgressBarProps {
  done: number;
  total: number;
}

function ProgressBar({ done, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : (done / total) * 100;
  const color = pct === 100 ? "#4ade80" : pct >= 50 ? "#facc15" : "#6b7280";

  return (
    <div className="mb-10">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          progress
        </span>
        <span
          className="text-[11px] tabular-nums transition-colors duration-300"
          style={{ color }}
        >
          {done}/{total}
        </span>
      </div>
      <div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width,background-color] duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

interface HabitRowProps {
  habit: string;
  checked: boolean;
  isFlag: boolean;
  disabled: boolean;
  flashing: boolean;
  onToggle: (habit: string, next: boolean) => void;
}

function HabitRow({ habit, checked, isFlag, disabled, flashing, onToggle }: HabitRowProps) {
  const flashBg = flashing
    ? isFlag
      ? "bg-red-500/10"
      : "bg-green-500/10"
    : "bg-transparent";

  return (
    <label
      className={`flex items-center gap-3 cursor-pointer group select-none rounded px-2 py-1 -mx-2 transition-colors duration-300 ${flashBg} ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(val) => onToggle(habit, val === true)}
        disabled={disabled}
        className={
          checked && isFlag
            ? "border-red-500 data-[state=checked]:bg-red-700 data-[state=checked]:border-red-700"
            : ""
        }
      />
      <span
        className={`text-[12px] uppercase tracking-wide transition-all duration-300 ${
          checked
            ? isFlag
              ? "text-red-400"
              : "text-muted-foreground/40 line-through decoration-muted-foreground/30"
            : "text-muted-foreground group-hover:text-foreground"
        }`}
      >
        {habitLabel(habit)}
      </span>
    </label>
  );
}

// --- Page ---

export default function TodayPage() {
  const [habits, setHabits] = useState<Habits>({});
  const [pageId, setPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  // Tracks which rows are mid-flash so we can clear after the animation
  const [flashing, setFlashing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local tz
    fetch(`/api/today?date=${localDate}`)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        if (d.error) throw new Error(d.error);
        setPageId(d.pageId ?? null);
        setHabits(d.habits ?? {});
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const flash = useCallback((habit: string) => {
    setFlashing((prev) => new Set(prev).add(habit));
    setTimeout(() => {
      setFlashing((prev) => {
        const next = new Set(prev);
        next.delete(habit);
        return next;
      });
    }, 600);
  }, []);

  async function toggle(habit: string, next: boolean) {
    setHabits((prev) => ({ ...prev, [habit]: next }));
    setSaving((prev) => new Set(prev).add(habit));
    if (next) flash(habit);

    try {
      const res = await fetch("/api/today", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, habit, checked: next, date: new Date().toLocaleDateString("en-CA") }),
      });

      const data = (await res.json()) as { ok?: boolean; pageId?: string; error?: string };

      if (!res.ok || data.error) throw new Error(data.error ?? "Save failed");

      if (data.pageId && !pageId) setPageId(data.pageId);
    } catch {
      setHabits((prev) => ({ ...prev, [habit]: !next }));
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(habit);
        return next;
      });
    }
  }

  const positiveChecked = POSITIVE.filter((h) => habits[h]).length;
  const flagsChecked = FLAGS.filter((h) => habits[h]).length;

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-baseline justify-between mb-1.5">
            <h1 className="text-sm font-medium tracking-[0.3em] uppercase text-primary">
              today
            </h1>
            <Link
              href="/"
              className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              ← dashboard
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground tracking-wide">
            {formatToday()}
          </p>
        </div>

        {loading && (
          <p className="text-[11px] tracking-[0.2em] text-primary animate-pulse">loading...</p>
        )}

        {err && (
          <div className="text-[12px] text-red-400 p-4 rounded bg-red-400/5 border border-red-400/20 tracking-wide">
            <strong>error:</strong> {err}
          </div>
        )}

        {!loading && !err && (
          <div>
            <ProgressBar done={positiveChecked} total={POSITIVE.length} />

            <div className="space-y-10">

              {/* Positive habits */}
              <section>
                <SectionLabel>
                  positive habits · {positiveChecked}/{POSITIVE.length}
                </SectionLabel>
                <div className="space-y-1">
                  {POSITIVE.map((habit) => (
                    <HabitRow
                      key={habit}
                      habit={habit}
                      checked={habits[habit] ?? false}
                      isFlag={false}
                      disabled={saving.has(habit)}
                      flashing={flashing.has(habit)}
                      onToggle={toggle}
                    />
                  ))}
                </div>
              </section>

              {/* Watch list */}
              <section>
                <SectionLabel>
                  watch list{flagsChecked > 0 ? ` · ${flagsChecked} flagged` : " · clean"}
                </SectionLabel>
                <div className="space-y-1">
                  {FLAGS.map((habit) => (
                    <HabitRow
                      key={habit}
                      habit={habit}
                      checked={habits[habit] ?? false}
                      isFlag={true}
                      disabled={saving.has(habit)}
                      flashing={flashing.has(habit)}
                      onToggle={toggle}
                    />
                  ))}
                </div>
              </section>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
