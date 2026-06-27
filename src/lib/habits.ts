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
];

export const ALL_HABITS = [...POSITIVE, ...FLAGS];

// How many times per week each positive habit should be done.
// Defaults to 7 (daily) for any habit not listed here.
export const WEEKLY_TARGETS: Record<string, number> = {
  Gym: 4,
  "Weekly Money Review": 1,
};
