export const POSITIVE = [
  "Gym",
  "Walking",
  "Meditate",
  "Take Creatine",
  "Take Medication",
  "Weekly Money Review",
];

export const FLAGS = [
  "Alcohol",
  "Doomscrolling",
  "Impulse Purchase",
  "Junk Food / Late Night Eating",
  "🍆",
  "🌽",
];

export const ALL_HABITS = [...POSITIVE, ...FLAGS];

// Emoji shown alongside each habit's label in the UI. Falls back to no icon
// for any habit not listed here (e.g. the stray non-schema FLAGS entries).
export const HABIT_EMOJI: Record<string, string> = {
  Gym: "🏋️",
  Walking: "🚶",
  Meditate: "🧘",
  "Take Creatine": "💪",
  "Take Medication": "💊",
  "Weekly Money Review": "💰",
  Alcohol: "🍺",
  Doomscrolling: "📱",
  "Impulse Purchase": "🛍️",
  "Junk Food / Late Night Eating": "🍔",
};

/**
 * Returns "<emoji> <habit>" for habits with a mapped emoji, or the bare
 * habit name otherwise.
 *
 * @param habit - The habit property name.
 * @returns The display label for the habit.
 */
export function habitLabel(habit: string): string {
  const emoji = HABIT_EMOJI[habit];
  return emoji ? `${emoji} ${habit}` : habit;
}

// How many times per week each positive habit should be done.
// Defaults to 7 (daily) for any habit not listed here.
export const WEEKLY_TARGETS: Record<string, number> = {
  Gym: 4,
  "Weekly Money Review": 1,
};
