import { connection } from "next/server";
import { obtenerDb } from "@/modelos/db";
import { listarEquipos } from "@/servicios/solicitudes";
import { manejarError, responder } from "../_lib/http";

export async function GET() {
  try {
    // Con cacheComponents, connection() fuerza que se consulte la BD en cada petición (no en el build).
    await connection();
    return responder(await listarEquipos(obtenerDb()));
  } catch (error) {
    return manejarError(error);
  }
}
