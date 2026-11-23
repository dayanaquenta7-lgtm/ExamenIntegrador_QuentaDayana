import type { NextRequest } from "next/server";
import { obtenerDb } from "@/modelos/db";
import { cambiarEstado } from "@/servicios/solicitudes";
import { exigirId, leerJson, manejarError, responder } from "../../../_lib/http";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/solicitudes/[id]/estado">) {
  try {
    const id = exigirId((await ctx.params).id);
    return responder(await cambiarEstado(obtenerDb(), id, await leerJson(request)));
  } catch (error) {
    return manejarError(error);
  }
}
