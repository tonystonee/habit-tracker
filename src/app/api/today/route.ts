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

function todayISO() {
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
export async function GET() {
  try {
    const notion = getNotion();
    const dbId = process.env.NOTION_DB_ID;

    if (!dbId) {
      return NextResponse.json({ error: "NOTION_DB_ID is not configured" }, { status: 500 });
    }

    const today = todayISO();

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
 * @param request - JSON body: `{ pageId: string | null; habit: string; checked: boolean }`
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
    };

    const { habit, checked } = body;
    let { pageId } = body;

    if (!ALL_HABITS.includes(habit)) {
      return NextResponse.json({ error: `Unknown habit: ${habit}` }, { status: 400 });
    }

    // Create today's page if it doesn't exist yet
    if (!pageId) {
      const today = todayISO();
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
