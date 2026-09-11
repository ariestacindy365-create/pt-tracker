import { z } from "zod";

export const loadEntryInputSchema = z.object({
  exerciseName: z.string().trim().min(1, "Nama gerakan wajib diisi"),
  recordedDate: z.string().min(1, "Tanggal wajib diisi"),
  setNumber: z.coerce.number().int().positive().default(1),
  // 0 is valid — bodyweight/timer gerakan (plank, hang, dll) often have no
  // external load.
  weight: z.coerce.number().nonnegative("Beban tidak boleh minus"),
  reps: z.coerce.number().int().positive("Repetisi/durasi harus lebih dari 0"),
  note: z.string().trim().optional().nullable(),
  programExerciseId: z.string().trim().optional().nullable(),
});

export const bulkLoadEntrySchema = z.object({
  entries: z.array(loadEntryInputSchema).min(1).max(200),
});
