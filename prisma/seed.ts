import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo1234!", 10);

  const business = await prisma.business.upsert({
    where: { slug: "barberia-demo" },
    update: {},
    create: {
      slug: "barberia-demo",
      name: "Barbería AgendaYa Demo",
      email: "demo@agendaya.test",
      passwordHash,
      timezone: "America/Lima",
    },
  });

  // Los servicios no tienen una clave natural única, así que se recrean en
  // cada seed en vez de upsert (simple y suficiente para datos de prueba).
  await prisma.service.deleteMany({ where: { businessId: business.id } });
  const [corte] = await Promise.all([
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Corte de cabello",
        durationMinutes: 30,
        price: 25,
      },
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Arreglo de barba",
        durationMinutes: 20,
        price: 15,
      },
    }),
  ]);

  // Disponibilidad: lunes (1) a viernes (5), 9:00-13:00 y 15:00-19:00.
  await prisma.availability.deleteMany({ where: { businessId: business.id } });
  const blocks: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
  for (let day = 1; day <= 5; day++) {
    blocks.push({ dayOfWeek: day, startTime: "09:00", endTime: "13:00" });
    blocks.push({ dayOfWeek: day, startTime: "15:00", endTime: "19:00" });
  }
  await prisma.availability.createMany({
    data: blocks.map((b) => ({ ...b, businessId: business.id })),
  });

  console.log(`Seed listo: negocio "${business.name}" (slug: ${business.slug}), servicio demo "${corte.name}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
