import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";

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

const ALL_HABITS = [...POSITIVE, ...FLAGS];

// --- Handler ---

/**
 * GET /api/habits
 *
 * Fetches the last N days of entries from the Notion habit tracker database
 * and returns a cleaned, flat JSON array ready for the dashboard to consume.
 *
 * @param request - Incoming request; accepts optional `?days=N` query param (default 30, max 90).
 * @returns {{ entries: Array<{ date: string; [habit: string]: string | boolean }> }}
 *   `entries` — one object per Notion page, keyed by date and habit name.
 *   Habits not present in the Notion page default to `false`.
 */
export async function GET(request: Request) {
  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const dbId = process.env.NOTION_DB_ID;

    if (!dbId) {
      return NextResponse.json({ error: "NOTION_DB_ID is not configured" }, { status: 500 });
    }

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

    const entries = res.results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((page: any) => {
        const props = page.properties as Record<string, any>;
        const date: string = props.Date?.date?.start ?? "";
        if (!date) return null;

        const entry: Record<string, string | boolean> = { date };
        for (const habit of ALL_HABITS) {
          entry[habit] = props[habit]?.checkbox ?? false;
        }
        return entry;
      })
      .filter(Boolean);

    return NextResponse.json({ entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
