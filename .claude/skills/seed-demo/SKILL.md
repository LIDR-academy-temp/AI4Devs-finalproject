---
name: seed-demo
description: Deja el entorno local de AgendaYa en un estado limpio con datos de demo. Usar cuando el usuario pida "resetea los datos", "deja todo como el demo", o después de una sesión de pruebas manuales que dejó citas/servicios de prueba sueltos en la base.
---

# Reset del entorno de demo (AgendaYa)

1. `docker-compose up -d` — asegura que Postgres local esté corriendo.
2. `npx prisma migrate dev` — aplica migraciones pendientes. No borra datos ya migrados.
3. `npx prisma db seed` — recrea el negocio demo (`barberia-demo`, email `demo@agendaya.test`, password `Demo1234!`), sus 2 servicios y su disponibilidad semanal. Es idempotente (`upsert` + `deleteMany`+`create`, ver `prisma/seed.ts`) — correrlo varias veces no duplica nada.
4. El seed **no toca `Appointment` a propósito**, para no borrar reservas reales hechas durante pruebas junto con las de prueba. Si quedaron citas de QA manual sueltas, bórralas por nombre de cliente con una consulta Prisma puntual (`prisma.appointment.deleteMany({ where: { clientName: "..." } })`), nunca con un reset completo.

**Nunca uses `prisma migrate reset`** para esto — borra toda la base, no solo los datos del seed. El hook `block-destructive-prisma.sh` ya lo bloquea; si de verdad hace falta un reset completo, pídeselo explícitamente al usuario primero.
