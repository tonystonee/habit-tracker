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

## Theming / color usage

This app supports light and dark mode via `next-themes` (`ThemeProvider` in `src/components/theme-provider.tsx`), which toggles a `.dark` class on `<html>`. Tailwind v4 + shadcn map `--color-*` tokens (`background`, `foreground`, `muted`, `muted-foreground`, `border`, etc.) to CSS custom properties defined once in `src/app/globals.css` — separately for `:root` (light) and `.dark` (dark).

**Rule: any color that represents a neutral/structural surface — an empty state, an unchecked/off toggle, a border, a disabled or "no data" cell, muted body text — must use a theme token, never a hardcoded hex/rgb value.**

- Prefer Tailwind utility classes tied to the tokens: `bg-muted`, `border-border`, `text-muted-foreground`, `text-foreground`, `bg-background`.
- If the value has to live in an inline `style` (e.g. mixed with a conditional accent color), reference the CSS variable directly: `"hsl(var(--muted-foreground))"`, `"hsl(var(--border))"` — not a literal hex like `#555` or `#1c1c1c`.
- **Exception:** fixed, saturated *semantic status* colors (green for "done"/"good", yellow/amber for "warning", red for "flagged"/"bad") are fine as hardcoded hex, since they're meant to read the same in both themes. Only the neutral/"off" counterpart of a status pairing needs to be a theme token — e.g. `done ? "#4ade80" : "hsl(var(--muted-foreground))"`, not `done ? "#4ade80" : "#555"`.

Before shipping any new UI or color logic, grep for raw hex/rgb literals and check each one against the rule above:
```bash
grep -n '#[0-9a-fA-F]\{3,6\}\|rgb(\|rgba(' src/app/page.tsx src/components/**/*.tsx
```
Then verify both themes visually (toggle the theme button, or automate with Playwright) — don't just eyeball one mode and assume the other matches.

## Git

Never add `Co-Authored-By: Claude` trailers to commit messages.

**Branch naming:** `type/short-description` in kebab-case
- `feat/habit-grid-view`
- `fix/notion-date-parsing`
- `chore/update-env-example`

Types: `feat`, `fix`, `chore`, `refactor`, `docs`

**Commit messages:** Conventional Commits format
- `feat: add streak calculation for flags`
- `fix: handle missing Notion date field`
- `chore: add .env.local.example`
- Always lowercase, no period at end, imperative mood ("add" not "added")

**Rules:**
- One logical change per commit
- Never commit directly to `main`
- Branch off `main`, PR back to `main` when feature is complete

**Workflow — branch, merge, clean up:**
```bash
git checkout -b type/short-description        # branch off main
git add <files>
git commit -m "type: message"                 # conventional commit
git push -u origin type/short-description     # push branch
git checkout master
git merge --no-ff type/short-description -m "merge: type/short-description into master"
git push origin master
git branch -d type/short-description          # delete local
git push origin --delete type/short-description  # delete remote
```

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
