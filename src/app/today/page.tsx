"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

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

interface HabitRowProps {
  habit: string;
  checked: boolean;
  isFlag: boolean;
  disabled: boolean;
  onToggle: (habit: string, next: boolean) => void;
}

function HabitRow({ habit, checked, isFlag, disabled, onToggle }: HabitRowProps) {
  const activeColor = isFlag ? "text-red-400" : "text-green-400";

  return (
    <label
      className={`flex items-center gap-3 cursor-pointer group select-none ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(val) => onToggle(habit, val === true)}
        disabled={disabled}
        className={checked ? (isFlag ? "border-red-500 data-[state=checked]:bg-red-700" : "") : ""}
      />
      <span
        className={`text-[12px] uppercase tracking-wide transition-colors ${
          checked ? activeColor : "text-muted-foreground group-hover:text-foreground"
        }`}
      >
        {habit}
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
  // Track which habits are mid-save to prevent double-clicks
  const [saving, setSaving] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/today")
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        if (d.error) throw new Error(d.error);
        setPageId(d.pageId ?? null);
        setHabits(d.habits ?? {});
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(habit: string, next: boolean) {
    // Optimistic update
    setHabits((prev) => ({ ...prev, [habit]: next }));
    setSaving((prev) => new Set(prev).add(habit));

    try {
      const res = await fetch("/api/today", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, habit, checked: next }),
      });

      const data = (await res.json()) as { ok?: boolean; pageId?: string; error?: string };

      if (!res.ok || data.error) throw new Error(data.error ?? "Save failed");

      // If a new page was created, store its ID so subsequent toggles hit the same page
      if (data.pageId && !pageId) setPageId(data.pageId);
    } catch {
      // Roll back optimistic update on failure
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
          <div className="space-y-10">

            {/* Positive habits */}
            <section>
              <SectionLabel>
                positive habits · {positiveChecked}/{POSITIVE.length}
              </SectionLabel>
              <div className="space-y-4">
                {POSITIVE.map((habit) => (
                  <HabitRow
                    key={habit}
                    habit={habit}
                    checked={habits[habit] ?? false}
                    isFlag={false}
                    disabled={saving.has(habit)}
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
              <div className="space-y-4">
                {FLAGS.map((habit) => (
                  <HabitRow
                    key={habit}
                    habit={habit}
                    checked={habits[habit] ?? false}
                    isFlag={true}
                    disabled={saving.has(habit)}
                    onToggle={toggle}
                  />
                ))}
              </div>
            </section>

          </div>
        )}

      </div>
    </main>
  );
}
