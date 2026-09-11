// Epley formula: 1RM = weight x (1 + reps/30)
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
}

// Reverse Epley: given a known/estimated 1RM, what weight gets roughly
// `reps` repetitions? weight = 1RM / (1 + reps/30)
export function weightForReps(oneRM: number, reps: number): number {
  return Math.round((oneRM / (1 + reps / 30)) * 100) / 100;
}

// Matches target-reps text that's actually a duration, e.g. `20s`, `20"`,
// `30 detik`, `1 menit` — plank/hang/hold-style gerakan where the trainer
// logs seconds held instead of a rep count.
const TIMER_PATTERN = /^\s*\d+(\.\d+)?\s*("|s\b|sec|detik|menit|min\b)/i;

export function isTimerBased(targetReps: string | null | undefined): boolean {
  return !!targetReps && TIMER_PATTERN.test(targetReps.trim());
}

export type RepWeightRow = { reps: number; weight: number; percent: number };

// Same rep targets olympus-gym-tracker's "Estimasi Beban" table uses.
const REP_TARGETS = [1, 3, 5, 8, 10, 12, 15];

export function repWeightTable(oneRM: number): RepWeightRow[] {
  return REP_TARGETS.map((reps) => {
    const weight = weightForReps(oneRM, reps);
    return { reps, weight, percent: oneRM > 0 ? (weight / oneRM) * 100 : 0 };
  });
}
