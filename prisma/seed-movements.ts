// Import kamus gerakan (dibawa dari olympus-gym-tracker) ke tabel Movement.
// Aman dijalankan berulang — upsert by name, tidak menghapus gerakan lain
// yang sudah ditambahkan trainer secara manual.
//
// Jalankan: npx tsx prisma/seed-movements.ts

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import movements from "./movements-seed-data.json";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  for (const m of movements) {
    await prisma.movement.upsert({
      where: { name: m.name },
      create: {
        code: m.code,
        name: m.name,
        primaryMuscle: m.primaryMuscle,
        secondaryMuscle: m.secondaryMuscle,
        category: m.category,
        equipment: m.equipment,
        repRangeHint: m.repRangeHint,
        setRangeHint: m.setRangeHint,
      },
      update: {
        code: m.code,
        primaryMuscle: m.primaryMuscle,
        secondaryMuscle: m.secondaryMuscle,
        category: m.category,
        equipment: m.equipment,
        repRangeHint: m.repRangeHint,
        setRangeHint: m.setRangeHint,
      },
    });
  }

  const total = await prisma.movement.count();
  console.log(`Selesai. ${movements.length} gerakan diproses. Total di database: ${total}.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
