import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { programInclude, programsWhereAccessible } from "@/lib/programs";
import { MemberNavBar } from "@/components/MemberNavBar";
import { MemberDashboardTabs } from "@/components/member/MemberDashboardTabs";

export default async function MemberDashboardPage() {
  const session = await requireMember();

  const client = await prisma.client.findUnique({
    where: { id: session.clientId },
    include: { trainer: { select: { name: true } } },
  });
  if (!client || !client.isActive) notFound();

  const [bodyMetrics, loadEntries, programs, nutritionTarget, nutritionLogs] =
    await Promise.all([
      prisma.bodyMetric.findMany({
        where: { clientId: client.id },
        orderBy: { recordedDate: "asc" },
      }),
      prisma.loadEntry.findMany({
        where: { clientId: client.id },
        orderBy: [{ recordedDate: "asc" }, { setNumber: "asc" }],
      }),
      prisma.program.findMany({
        where: programsWhereAccessible(client.id),
        orderBy: { createdAt: "desc" },
        include: programInclude,
      }),
      prisma.nutritionTarget.findUnique({ where: { clientId: client.id } }),
      prisma.nutritionLog.findMany({
        where: { clientId: client.id },
        orderBy: { recordedDate: "desc" },
      }),
    ]);

  return (
    <div className="flex flex-1 flex-col">
      <MemberNavBar name={client.name} trainerName={client.trainer.name} />
      <main className="max-w-5xl mx-auto w-full p-4 flex flex-col gap-4">
        <MemberDashboardTabs
          client={{
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            trainerName: client.trainer.name,
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
            owner: { id: p.client.id, name: p.client.name },
            participants: p.participants.map((pp) => ({ id: pp.client.id, name: pp.client.name })),
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
