import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as esquema from "./esquema";

export type BaseDatos = PostgresJsDatabase<typeof esquema>;

// Una sola conexión por proceso (evita agotar el pooler con la recarga en caliente de next dev).
const globalParaDb = globalThis as unknown as { labcareDb?: BaseDatos };

export function obtenerDb(): BaseDatos {
  if (globalParaDb.labcareDb) return globalParaDb.labcareDb;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");

  // prepare: false porque el pooler de Supabase no soporta sentencias preparadas.
  const cliente = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
  globalParaDb.labcareDb = drizzle(cliente, { schema: esquema });
  return globalParaDb.labcareDb;
}
