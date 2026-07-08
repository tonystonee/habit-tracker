import { NextResponse } from "next/server";
import { getNotionClient } from "@/lib/notion";
import { getHabitData } from "@/lib/habit-config";

// --- Handler ---

/**
 * GET /api/habits
 *
 * Fetches the last N days of entries from the Notion habit tracker database
 * and returns a cleaned, flat JSON array ready for the dashboard to consume.
 *
 * @param request - Incoming request; accepts optional `?days=N` query param (default 30, max 90).
 * @returns {{ entries: Array<{ date: string; [habit: string]: string | boolean }>, habitConfig: { positive: string[]; flags: string[]; emoji: Record<string, string>; weeklyTargets: Record<string, number> } }}
 *   `entries` — one object per Notion page, keyed by date and habit name.
 *   Habits not present in the Notion page default to `false`.
 *   `habitConfig` — the current habit list/categorization, from Notion's Habit
 *   Config database if available, else the hardcoded fallback.
 */
export async function GET(request: Request) {
  try {
    const notion = getNotionClient();
    const dbId = process.env.NOTION_DB_ID;

    if (!dbId) {
      return NextResponse.json({ error: "NOTION_DB_ID is not configured" }, { status: 500 });
    }

    const habitData = await getHabitData();

    // --- Date range ---

    const { searchParams } = new URL(request.url);
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "30", 10) || 30));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const fromDate = cutoff.toISOString().split("T")[0];

    // --- Notion query ---

    const res = await notion.databases.query({
      database_id: dbId,
      filter: {
        property: "Date",
        date: { on_or_after: fromDate },
      },
      sorts: [{ property: "Date", direction: "ascending" }],
    });

    // --- Transform pages into flat entries ---

    const missingHabits = new Set<string>();

    const entries = res.results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((page: any) => {
        const props = page.properties as Record<string, any>;
        const date: string = props.Date?.date?.start ?? "";
        if (!date) return null;

        const entry: Record<string, string | boolean> = { date };
        for (const habit of habitData.allHabits) {
          if (!(habit in props)) {
            missingHabits.add(habit);
            continue;
          }
          entry[habit] = props[habit]?.checkbox ?? false;
        }
        return entry;
      })
      .filter(Boolean);

    if (missingHabits.size > 0) {
      console.warn(
        `[api/habits] habit(s) in config have no matching checkbox property in the tracking database: ${[...missingHabits].join(", ")}`
      );
    }

    return NextResponse.json({
      entries,
      habitConfig: {
        positive: habitData.positive,
        flags: habitData.flags,
        emoji: habitData.emoji,
        weeklyTargets: habitData.weeklyTargets,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
