import { Client } from "@notionhq/client";
import { NextRequest, NextResponse } from "next/server";

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

// --- Helpers ---

function getNotion() {
  return new Client({ auth: process.env.NOTION_API_KEY });
}

/**
 * Returns today's date in YYYY-MM-DD, preferring the `date` query param sent
 * by the client (local calendar date) so server UTC never drifts from the
 * user's actual day.
 */
function todayISO(searchParams?: URLSearchParams): string {
  const clientDate = searchParams?.get("date");
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) return clientDate;
  // Fallback: derive local date from offset header if available
  const offset = searchParams?.get("offset");
  if (offset !== null && offset !== undefined) {
    const ms = new Date().getTime() - Number(offset) * 60000;
    return new Date(ms).toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

// --- GET ---

/**
 * GET /api/today
 *
 * Fetches today's Notion page and returns its checkbox state for all habits.
 * If no page exists for today, `pageId` is null and all habits default to false.
 *
 * @returns {{ pageId: string | null; habits: Record<string, boolean> }}
 */
export async function GET(request: NextRequest) {
  try {
    const notion = getNotion();
    const dbId = process.env.NOTION_DB_ID;

    if (!dbId) {
      return NextResponse.json({ error: "NOTION_DB_ID is not configured" }, { status: 500 });
    }

    const today = todayISO(request.nextUrl.searchParams);

    const res = await notion.databases.query({
      database_id: dbId,
      filter: {
        property: "Date",
        date: { equals: today },
      },
    });

    const defaults = Object.fromEntries(ALL_HABITS.map((h) => [h, false]));

    if (res.results.length === 0) {
      return NextResponse.json({ pageId: null, habits: defaults });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = res.results[0] as any;
    const props = page.properties as Record<string, any>;

    const habits = Object.fromEntries(
      ALL_HABITS.map((h) => [h, props[h]?.checkbox ?? false])
    );

    return NextResponse.json({ pageId: page.id as string, habits });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- PATCH ---

/**
 * PATCH /api/today
 *
 * Toggles a single habit checkbox on today's Notion page.
 * If no page exists yet for today, one is created first.
 *
 * @param request - JSON body: `{ pageId: string | null; habit: string; checked: boolean; date?: string }`
 * @returns {{ ok: true; pageId: string }} on success
 */
export async function PATCH(request: NextRequest) {
  try {
    const notion = getNotion();
    const dbId = process.env.NOTION_DB_ID;

    if (!dbId) {
      return NextResponse.json({ error: "NOTION_DB_ID is not configured" }, { status: 500 });
    }

    const body = (await request.json()) as {
      pageId: string | null;
      habit: string;
      checked: boolean;
      date?: string;
    };

    const { habit, checked } = body;
    let { pageId } = body;
    const clientDate = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;

    if (!ALL_HABITS.includes(habit)) {
      return NextResponse.json({ error: `Unknown habit: ${habit}` }, { status: 400 });
    }

    // Create today's page if it doesn't exist yet
    if (!pageId) {
      const today = clientDate ?? todayISO();
      const created = await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          Date: { date: { start: today } },
        },
      });
      pageId = created.id;
    }

    await notion.pages.update({
      page_id: pageId,
      properties: {
        [habit]: { checkbox: checked },
      },
    });

    return NextResponse.json({ ok: true, pageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
