import type { NextRequest } from "next/server";
import { obtenerDb } from "@/modelos/db";
import { crearSolicitud, listarSolicitudes } from "@/servicios/solicitudes";
import { leerJson, manejarError, responder } from "../_lib/http";

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const filtros = {
      q: p.get("q") ?? undefined,
      prioridad: p.get("prioridad") ?? undefined,
      estado: p.get("estado") ?? undefined,
    };
    return responder(await listarSolicitudes(obtenerDb(), filtros));
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const solicitud = await crearSolicitud(obtenerDb(), await leerJson(request));
    return responder(solicitud, 201);
  } catch (error) {
    return manejarError(error);
  }
}
