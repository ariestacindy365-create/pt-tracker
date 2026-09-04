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

export type RepWeightRow = { reps: number; weight: number; percent: number };

// Same rep targets olympus-gym-tracker's "Estimasi Beban" table uses.
const REP_TARGETS = [1, 3, 5, 8, 10, 12, 15];

export function repWeightTable(oneRM: number): RepWeightRow[] {
  return REP_TARGETS.map((reps) => {
    const weight = weightForReps(oneRM, reps);
    return { reps, weight, percent: oneRM > 0 ? (weight / oneRM) * 100 : 0 };
  });
}
