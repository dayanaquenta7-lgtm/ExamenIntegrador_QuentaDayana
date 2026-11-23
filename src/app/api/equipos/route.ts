import { connection } from "next/server";
import { obtenerDb } from "@/modelos/db";
import { listarEquipos } from "@/servicios/solicitudes";
import { manejarError, responder } from "../_lib/http";

export async function GET() {
  // Con cacheComponents, connection() hace que se consulte la BD en cada petición (no en el build).
  // Va fuera del try: durante el prerender Next.js la rechaza a propósito y debe gestionarla él.
  await connection();
  try {
    return responder(await listarEquipos(obtenerDb()));
  } catch (error) {
    return manejarError(error);
  }
}
