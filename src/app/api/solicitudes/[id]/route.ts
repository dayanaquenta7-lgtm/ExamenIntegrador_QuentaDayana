import type { NextRequest } from "next/server";
import { obtenerDb } from "@/modelos/db";
import { actualizarSolicitud, eliminarSolicitud, obtenerSolicitud } from "@/servicios/solicitudes";
import { exigirId, leerJson, manejarError, responder } from "../../_lib/http";

type Contexto = RouteContext<"/api/solicitudes/[id]">;

export async function GET(_request: NextRequest, ctx: Contexto) {
  try {
    const id = exigirId((await ctx.params).id);
    return responder(await obtenerSolicitud(obtenerDb(), id));
  } catch (error) {
    return manejarError(error);
  }
}

export async function PUT(request: NextRequest, ctx: Contexto) {
  try {
    const id = exigirId((await ctx.params).id);
    return responder(await actualizarSolicitud(obtenerDb(), id, await leerJson(request)));
  } catch (error) {
    return manejarError(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: Contexto) {
  try {
    const id = exigirId((await ctx.params).id);
    const eliminada = await eliminarSolicitud(obtenerDb(), id);
    return responder({ mensaje: `Solicitud ${eliminada.codigoSolicitud} eliminada.`, ...eliminada });
  } catch (error) {
    return manejarError(error);
  }
}
