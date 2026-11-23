import { obtenerDb } from "./db";
import { equipos } from "./esquema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // La variable puede venir del entorno.
}

const EQUIPOS_SEMILLA = [
  { codigo: "EQ-001", nombre: "Computadora de escritorio", ubicacion: "Laboratorio 1", estado: "OPERATIVO" },
  { codigo: "EQ-002", nombre: "Proyector multimedia", ubicacion: "Aula 204", estado: "OPERATIVO" },
  { codigo: "EQ-003", nombre: "Router de laboratorio", ubicacion: "Laboratorio de Redes", estado: "OPERATIVO" },
  { codigo: "EQ-004", nombre: "Impresora de oficina", ubicacion: "Secretaría", estado: "OPERATIVO" },
] as const;

async function sembrar() {
  const db = obtenerDb();
  // Idempotente: volver a ejecutar no duplica equipos.
  const insertados = await db
    .insert(equipos)
    .values([...EQUIPOS_SEMILLA])
    .onConflictDoNothing({ target: equipos.codigo })
    .returning({ codigo: equipos.codigo });
  console.log(`Semilla aplicada. Equipos nuevos: ${insertados.length} (${insertados.map((e) => e.codigo).join(", ") || "ninguno"})`);
  process.exit(0);
}

sembrar().catch((error: unknown) => {
  console.error("Error al sembrar:", error instanceof Error ? error.message : "desconocido");
  process.exit(1);
});
