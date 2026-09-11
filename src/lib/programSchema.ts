import { z } from "zod";

export const programExerciseSchema = z.object({
  exerciseName: z.string().trim().min(1, "Nama gerakan wajib diisi"),
  targetSets: z.coerce.number().int().positive().optional().nullable(),
  targetReps: z.string().trim().optional().nullable(),
  targetWeight: z.coerce.number().positive().optional().nullable(),
  note: z.string().trim().optional().nullable(),
});

export const programDaySchema = z.object({
  dayLabel: z.string().trim().min(1, "Label hari wajib diisi"),
  date: z.string().trim().optional().nullable(),
  exercises: z.array(programExerciseSchema).min(1, "Minimal 1 gerakan per hari"),
});

export const programInputSchema = z.object({
  name: z.string().trim().min(1, "Nama program wajib diisi"),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  days: z.array(programDaySchema).min(1, "Minimal 1 hari"),
});
