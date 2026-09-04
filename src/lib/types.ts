export type ClientDTO = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  email: string | null;
  hasLoginAccess: boolean;
};

export type BodyMetricDTO = {
  id: string;
  recordedDate: string;
  weight: number;
  bodyFatPercent: number | null;
  skeletalMuscleMass: number | null;
  visceralFat: number | null;
  note: string | null;
};

export type LoadEntryDTO = {
  id: string;
  exerciseName: string;
  recordedDate: string;
  setNumber: number;
  weight: number;
  reps: number;
  estimated1RM: number;
  note: string | null;
  programExerciseId: string | null;
};

export type ProgramExerciseDTO = {
  id: string;
  exerciseName: string;
  targetSets: number | null;
  targetReps: string | null;
  targetWeight: number | null;
  note: string | null;
  order: number;
};

export type ProgramDayDTO = {
  id: string;
  dayLabel: string;
  order: number;
  exercises: ProgramExerciseDTO[];
};

export type ProgramDTO = {
  id: string;
  name: string;
  startDate: string;
  isActive: boolean;
  days: ProgramDayDTO[];
};

export type NutritionTargetDTO = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
} | null;

export type MovementDTO = {
  id: string;
  code: string | null;
  name: string;
  primaryMuscle: string | null;
  secondaryMuscle: string | null;
  category: string | null;
  equipment: string | null;
  repRangeHint: string | null;
  setRangeHint: string | null;
};

export type NutritionLogDTO = {
  id: string;
  recordedDate: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  note: string | null;
};
