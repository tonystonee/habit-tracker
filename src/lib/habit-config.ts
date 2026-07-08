import { fetchHabitConfigRows } from "@/lib/notion";
import { POSITIVE, FLAGS, HABIT_EMOJI, WEEKLY_TARGETS } from "@/lib/habits";

// --- Types ---

export type HabitData = {
  positive: string[];
  flags: string[];
  allHabits: string[];
  emoji: Record<string, string>;
  weeklyTargets: Record<string, number>;
};

// --- Helpers ---

function fallback(): HabitData {
  return {
    positive: POSITIVE,
    flags: FLAGS,
    allHabits: [...POSITIVE, ...FLAGS],
    emoji: HABIT_EMOJI,
    weeklyTargets: WEEKLY_TARGETS,
  };
}

/**
 * Builds the habit list (positive/flag categorization, emoji, weekly targets)
 * from the Notion "Habit Config" database, falling back to the hardcoded
 * values in `src/lib/habits.ts` if the config database is unset, empty, or
 * fails to load. Never throws.
 *
 * @returns The merged habit data, from Notion if available, else fallback.
 */
export async function getHabitData(): Promise<HabitData> {
  try {
    const rows = await fetchHabitConfigRows();
    if (rows.length === 0) return fallback();

    const positive: string[] = [];
    const flags: string[] = [];
    const emoji: Record<string, string> = {};
    const weeklyTargets: Record<string, number> = {};

    for (const row of rows) {
      if (!row.category) {
        console.warn(`[habit-config] skipping "${row.name}": missing/invalid Category`);
        continue;
      }
      if (row.category === "Positive") positive.push(row.name);
      else flags.push(row.name);

      if (row.emoji) emoji[row.name] = row.emoji;
      // A null weeklyTarget is intentionally omitted; every read site already
      // falls back to 7 via `WEEKLY_TARGETS[habit] ?? 7`.
      if (row.weeklyTarget !== null) weeklyTargets[row.name] = row.weeklyTarget;
    }

    if (positive.length === 0 && flags.length === 0) return fallback();

    return { positive, flags, allHabits: [...positive, ...flags], emoji, weeklyTargets };
  } catch (err) {
    console.warn("[habit-config] failed to load Notion habit config, using fallback:", err);
    return fallback();
  }
}
