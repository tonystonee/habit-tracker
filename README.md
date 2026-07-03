# habit-tracker

A personal habit tracking dashboard built with Next.js 15 and Notion. Notion is the source of truth — you log habits there, and this app visualises the data across four views.

## Views

- **Streaks** — current streak and 30-day completion rate per habit, weekly/monthly target count boxes, and an interactive today snapshot you can toggle without leaving the dashboard
- **Grid** — 30-day heatmap of every habit at a glance
- **Flags** — watch list clean-streak tracker showing how many days you've stayed clean on each flag habit
- **Progress** — weekly or monthly completion tables for all habits over the last 8 weeks / 3 months

## Stack

- [Next.js 15](https://nextjs.org) (App Router)
- [shadcn/ui](https://ui.shadcn.com) new-york + Tailwind v4
- [Notion SDK](https://github.com/makenotion/notion-sdk-js) — data layer
- TypeScript strict mode

## Prerequisites

- Node.js 18+
- A [Notion](https://notion.so) account
- A Notion integration token
- A Notion database set up with the schema below

## Notion setup

### 1. Create an integration

Go to [notion.so/my-integrations](https://www.notion.so/my-integrations), create a new integration, and copy the **Internal Integration Token**.

### 2. Create the habits database

Create a Notion database with the following properties:

| Property | Type |
|----------|------|
| `Name` | Title |
| `Date` | Date |
| *(one checkbox per habit)* | Checkbox |

Each page represents one day. The `Date` property is used to match entries to calendar days.

### 3. Share the database with your integration

Open the database in Notion → click **···** → **Connections** → add your integration.

### 4. Copy the database ID

The database ID is the UUID in the database URL:
```
https://www.notion.so/<workspace>/<DATABASE_ID>?v=...
```

## Getting started

```bash
# 1. Clone the repo
git clone https://github.com/tonystonee/habit-tracker.git
cd habit-tracker

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.local.example .env.local
# Fill in your NOTION_API_KEY and NOTION_DB_ID

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|----------|-------------|
| `NOTION_API_KEY` | Notion integration token (`secret_...`) |
| `NOTION_DB_ID` | UUID of your Notion habits database |

See `.env.local.example` for the format.

## Customising habits

Edit [`src/lib/habits.ts`](src/lib/habits.ts) to match your own Notion database columns:

```ts
export const POSITIVE = [
  "Gym",
  "Walking",
  // add your own positive habits here
];

export const FLAGS = [
  "Alcohol",
  // add your own watch-list habits here
];

// Per-week targets for habits that aren't daily (defaults to 7)
export const WEEKLY_TARGETS: Record<string, number> = {
  Gym: 4,
};
```

The habit names must match the Notion checkbox property names exactly.

## Screenshots

*Coming soon*
