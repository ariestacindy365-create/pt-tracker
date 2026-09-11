import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedClient } from "@/lib/clients";
import { NavBar } from "@/components/NavBar";
import { ClientDetailTabs } from "@/components/client-detail/ClientDetailTabs";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await requireTrainer();
  const { clientId } = await params;

  const client = await getOwnedClient(session.trainerId, clientId);
  if (!client) notFound();

  const [bodyMetrics, loadEntries, programs, nutritionTarget, nutritionLogs] =
    await Promise.all([
      prisma.bodyMetric.findMany({
        where: { clientId },
        orderBy: { recordedDate: "asc" },
      }),
      prisma.loadEntry.findMany({
        where: { clientId },
        orderBy: [{ recordedDate: "asc" }, { setNumber: "asc" }],
      }),
      prisma.program.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        include: {
          days: {
            orderBy: { order: "asc" },
            include: { exercises: { orderBy: { order: "asc" } } },
          },
        },
      }),
      prisma.nutritionTarget.findUnique({ where: { clientId } }),
      prisma.nutritionLog.findMany({
        where: { clientId },
        orderBy: { recordedDate: "desc" },
      }),
    ]);

  return (
    <div className="flex flex-1 flex-col">
      <NavBar trainerName={session.name} />
      <main className="max-w-5xl mx-auto w-full p-4 flex flex-col gap-4">
        <ClientDetailTabs
          client={{
            id: client.id,
            name: client.name,
            phone: client.phone,
            notes: client.notes,
            email: client.email,
            hasLoginAccess: Boolean(client.pinHash),
          }}
          bodyMetrics={bodyMetrics.map((m) => ({
            id: m.id,
            recordedDate: m.recordedDate.toISOString(),
            weight: m.weight,
            bodyFatPercent: m.bodyFatPercent,
            skeletalMuscleMass: m.skeletalMuscleMass,
            visceralFat: m.visceralFat,
            note: m.note,
          }))}
          loadEntries={loadEntries.map((l) => ({
            id: l.id,
            exerciseName: l.exerciseName,
            recordedDate: l.recordedDate.toISOString(),
            setNumber: l.setNumber,
            weight: l.weight,
            reps: l.reps,
            estimated1RM: l.estimated1RM,
            note: l.note,
            programExerciseId: l.programExerciseId,
          }))}
          programs={programs.map((p) => ({
            id: p.id,
            name: p.name,
            startDate: p.startDate.toISOString(),
            isActive: p.isActive,
            days: p.days.map((d) => ({
              id: d.id,
              dayLabel: d.dayLabel,
              date: d.date ? d.date.toISOString() : null,
              order: d.order,
              exercises: d.exercises.map((ex) => ({
                id: ex.id,
                exerciseName: ex.exerciseName,
                targetSets: ex.targetSets,
                targetReps: ex.targetReps,
                targetWeight: ex.targetWeight,
                note: ex.note,
                order: ex.order,
              })),
            })),
          }))}
          nutritionTarget={
            nutritionTarget
              ? {
                  calories: nutritionTarget.calories,
                  protein: nutritionTarget.protein,
                  carbs: nutritionTarget.carbs,
                  fat: nutritionTarget.fat,
                }
              : null
          }
          nutritionLogs={nutritionLogs.map((n) => ({
            id: n.id,
            recordedDate: n.recordedDate.toISOString(),
            calories: n.calories,
            protein: n.protein,
            carbs: n.carbs,
            fat: n.fat,
            note: n.note,
          }))}
        />
      </main>
    </div>
  );
}
