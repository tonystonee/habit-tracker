import { Client } from "@notionhq/client";

// --- Client ---

/**
 * Creates a new Notion SDK client authenticated with `NOTION_API_KEY`.
 *
 * @returns A Notion `Client` instance.
 */
export function getNotionClient(): Client {
  return new Client({ auth: process.env.NOTION_API_KEY });
}

// --- Types ---

export type RawHabitConfigRow = {
  name: string;
  category: "Positive" | "Flag" | null;
  emoji: string;
  weeklyTarget: number | null;
};

// --- Cache ---

let cache: { data: RawHabitConfigRow[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetches raw rows from the Notion "Habit Config" database, cached in memory
 * for 5 minutes. Returns an empty array if `NOTION_HABIT_CONFIG_DB_ID` is
 * unset (caller treats this as "no config, use fallback"). Notion API errors
 * are not caught here — the fallback policy lives in `src/lib/habit-config.ts`.
 *
 * @returns The cached or freshly-fetched raw config rows.
 */
export async function fetchHabitConfigRows(): Promise<RawHabitConfigRow[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const dbId = process.env.NOTION_HABIT_CONFIG_DB_ID;
  if (!dbId) return [];

  const notion = getNotionClient();
  const res = await notion.databases.query({ database_id: dbId });

  const rows: RawHabitConfigRow[] = res.results
    .map((page) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = (page as any).properties as Record<string, any>;
      const name: string = props.Name?.title?.[0]?.plain_text?.trim() ?? "";
      const categorySelect: string | null = props.Category?.select?.name ?? null;
      const category: "Positive" | "Flag" | null =
        categorySelect === "Positive" || categorySelect === "Flag" ? categorySelect : null;
      const emoji: string = props.Emoji?.rich_text?.[0]?.plain_text?.trim() ?? "";
      const weeklyTarget: number | null =
        typeof props["Weekly Target"]?.number === "number" ? props["Weekly Target"].number : null;
      return { name, category, emoji, weeklyTarget };
    })
    .filter((row) => row.name);

  cache = { data: rows, fetchedAt: Date.now() };
  return rows;
}
