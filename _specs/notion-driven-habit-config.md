# Notion-Driven Habit Config

## Summary
Move the habit list — which habits exist, their category (positive vs. flag), emoji, and weekly target — out of hardcoded source (`src/lib/habits.ts`) and into a new Notion database, so adding, editing, or retiring a habit is a Notion-only action that shows up in the UI without a code change or redeploy.

## Problem / Motivation
Today, tracking a new habit or flag requires editing `POSITIVE`, `FLAGS`, `HABIT_EMOJI`, and `WEEKLY_TARGETS` in `src/lib/habits.ts` and shipping a code change, even though the user already lives in Notion day-to-day to check habits off. That friction discourages experimenting with new habits or retiring old ones. The daily tracking database itself (per-day checkbox entries) is not the problem — it's the static, code-only definition of *what a habit is and how it should be treated* that needs to move to where the user already manages their habits.

## Goals
- Adding a new checkbox habit in Notion (tracking DB) plus a matching config row (name, category, emoji, weekly target) makes it appear correctly categorized in the UI on next load, with no code change or deploy.
- Editing a habit's category, emoji, or weekly target in Notion updates the UI accordingly.
- The app continues to work exactly as it does today if the new config source is unset, empty, or unreachable — no broken or blank UI.
- No changes, writes, or risk to the existing daily tracking database or its historical entries at any point.
- The existing hardcoded list in `src/lib/habits.ts` remains in place and usable as a fallback until the new Notion-driven path has been verified to reproduce today's UI exactly with the current habit set.

## Non-Goals
- Supporting arbitrary/generic Notion property types or a fully schema-driven renderer — only the known shapes (checkbox habits, category, emoji, weekly target) are in scope.
- Any write/update path back to Notion (this is read-only against Notion in both the existing and new databases).
- Migrating or altering historical entries in the existing tracking database.
- Removing `src/lib/habits.ts` as part of this work — removal is a explicit follow-up once the new path is trusted.
- Multi-user or per-user habit configuration — this remains a single-user, single-workspace tool.

## User Stories
- As the app's owner, I want to add a new habit entirely inside Notion, so that I don't have to touch code or redeploy just to start tracking something new.
- As the app's owner, I want to retire or recategorize a habit (e.g. move it from "positive" to "flag") by editing Notion, so that the UI reflects my current habit set without a code change.
- As the app's owner, I want the app to keep working normally even if I haven't set up the new config source yet, or if Notion is temporarily unreachable, so that a config problem never breaks my daily habit view.

## Behavior / Requirements
- A new, separate Notion database ("Habit Config") holds one row per habit, with fields for: habit name (must match the corresponding checkbox property name in the tracking database), category (positive or flag), emoji, and weekly target.
- The app reads this config database to build the same information `src/lib/habits.ts` currently hardcodes: which habits are positive, which are flags, the emoji per habit, and the weekly target per habit (defaulting as today when a target isn't specified).
- If the new config database is not configured (no ID set), returns zero rows, or fails to load for any reason, the app falls back to the exact current hardcoded values from `src/lib/habits.ts` — the UI must not appear broken, empty, or different in this case.
- The habit name in the config database is the join key against the checkbox property names in the existing tracking database. Mismatches (a config row with no matching checkbox column, or a checkbox column with no config row) never crash the app or affect other habits — the orphaned entry is silently skipped in the UI, and a warning is logged server-side (console) for debugging.
- The config database's contents are cached for 5 minutes to avoid a Notion round-trip on every request. A request within the 5-minute window reuses the cached result; a request after it expires triggers a fresh fetch and resets the window. There is no background polling — fetches only happen in response to an actual incoming request.
- Weekly target: an empty/unset value in the config database falls back to the current default behavior (7×/week for any habit not otherwise specified). An explicit numeric value (including `0`) is used as-is.
- Category is a two-option field in the config database with the exact values `Positive` and `Flag`, matching the naming already used in code (`POSITIVE`/`FLAGS`) — no relabeling or remapping layer.
- No part of this feature writes to Notion — all Notion interaction remains read-only, for both the existing tracking database and the new config database.
- Before the new path is considered done, it must be verified side-by-side against the current hardcoded output using the existing, real habit set (i.e., populate the config database with today's exact habits and confirm the UI is pixel-for-pixel/behaviorally identical) before any new habit is added through Notion as a real test of the feature.
- Removing `src/lib/habits.ts` is explicitly out of scope for this feature's implementation. It stays in place as the fallback; deleting it is a deliberate, separate follow-up task after a trial period of using the Notion-driven path for real.

## Affected Areas
- Habit definition/config source (conceptually replaces the hardcoded lists in `src/lib/habits.ts`, though that file remains as fallback for now).
- The API layer that currently serves habit data to the UI, which will need to merge/derive from the new config source with fallback logic.
- All three views (Streaks, Grid, Flags), since each depends on knowing which habits exist, their category, emoji, and weekly targets.
- Environment configuration (a new variable identifying the config database, distinct from the existing tracking database variable).
- Notion workspace itself (a new database to be created there, additive only — no changes to the existing tracking database's schema or data).

## Open Questions
None outstanding — all resolved during spec review:
- Orphan/mismatched habit names: ignore silently in the UI, log a warning server-side. (Resolved)
- Caching: 5-minute TTL on the config database fetch, demand-driven (no background polling). (Resolved)
- Weekly target empty vs. `0`: empty falls back to default (7×/week), explicit value (including `0`) used as-is. (Resolved)
- Category labels: exactly `Positive` and `Flag`. (Resolved)
- Removal of `src/lib/habits.ts`: explicit separate follow-up after a trial period, not part of this feature. (Resolved)
