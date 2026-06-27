# habit-tracker — Claude instructions

## Project overview

Next.js 15 App Router dashboard that reads live data from a Notion habit-tracker database and renders three views (Streaks, Grid, Flags). Built with shadcn/ui (new-york style), Tailwind v4, and JetBrains Mono.

## Code commenting standards

### JSDoc on API handlers and utility functions
All route handlers and helper functions must have a JSDoc block describing what the function does, its params, and its return shape.

```ts
/**
 * GET /api/habits
 *
 * Fetches the last 30 days of entries from Notion.
 *
 * @returns {{ entries: Array<{ date: string; [habit: string]: string | boolean }> }}
 */
export async function GET() { ... }

/**
 * Counts consecutive entries from the end of `data` where `entry[key] === wantTrue`.
 *
 * @param key      - The habit property name to check.
 * @param data     - The ordered 30-day entry array.
 * @param wantTrue - Pass `true` for positive streaks, `false` for clean streaks.
 * @returns Number of consecutive matching days.
 */
function streak(key: string, data: Entry[], wantTrue: boolean): number { ... }
```

### Section dividers in files longer than ~60 lines
Use `// --- Section Name ---` to break up long files into scannable regions.

```ts
// --- Constants ---
// --- Types ---
// --- Helpers ---
// --- Handler ---
```

### Inline comments only for non-obvious logic
Only add `//` comments when the *why* is not obvious from the code itself. Never comment self-explanatory code.

```ts
// ✅ worth a comment — the +T12:00:00 prevents UTC midnight from shifting the date one day back
const d = new Date(e.date + "T12:00:00");

// ❌ never do this
const today = new Date(); // create a date object for today
```

### .env.local.example — one `#` comment per variable
Each env var must have a comment explaining where to obtain its value.

```bash
# Notion integration token — create one at https://www.notion.so/my-integrations
NOTION_API_KEY=secret_xxx
```

### No comments inside JSX unless unavoidable
Prefer clear component and prop names over explanatory comments. If a comment is truly needed, use `{/* */}`.

## Git

Never add `Co-Authored-By: Claude` trailers to commit messages.

## Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui new-york + Tailwind v4
- **Font**: JetBrains Mono via `next/font/google`
- **Data**: Notion SDK (`@notionhq/client`) via `/api/habits` route
- **Types**: TypeScript strict mode

## Env vars required

| Var | Description |
|-----|-------------|
| `NOTION_API_KEY` | Notion integration token |
| `NOTION_DB_ID` | Notion habits database ID |

## Habit schema

**Positive habits** (checkbox): `Gym`, `Walking`, `Meditate`, `Take Creatine`, `Take Medication`, `Weekly Money Review`

**Watch list flags** (checkbox): `Alcohol`, `Doomscrolling`, `Impulse Purchase`, `Junk Food / Late Night Eating`

Each Notion page must also have a `Date` (date-type) property.
