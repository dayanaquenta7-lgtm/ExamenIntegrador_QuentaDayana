import { ErrorNegocio, codigoPostgres, noEncontrado } from "@/servicios/errores";
import { parsearId } from "@/servicios/validaciones";

export const responder = (datos: unknown, status = 200) => Response.json(datos, { status });

/** Traduce errores a HTTP. Lo inesperado se registra en el servidor y se responde 500 sin detalles. */
export function manejarError(error: unknown): Response {
  if (error instanceof ErrorNegocio) {
    return responder({ error: error.message, ...(error.campos ? { campos: error.campos } : {}) }, error.status);
  }
  // Restricciones de la BD como segunda capa (por si una regla no se validó antes).
  switch (codigoPostgres(error)) {
    case "23505":
      return responder({ error: "Ya existe un registro con ese valor único." }, 409);
    case "23503":
      return responder({ error: "El equipo indicado no existe.", campos: { equipoId: ["El equipo seleccionado no existe."] } }, 400);
    case "23514":
      return responder({ error: "Los datos no cumplen las reglas de la base de datos." }, 400);
  }
  console.error("[LabCare API] Error no controlado:", error);
  return responder({ error: "Ocurrió un error interno. Intente nuevamente." }, 500);
}

export async function leerJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErrorNegocio(400, "El cuerpo de la petición no es un JSON válido.", {
      _: ["El cuerpo de la petición no es un JSON válido."],
    });
  }
}

/** Un id mal formado se trata igual que uno inexistente (404), sin revelar más. */
export function exigirId(texto: string): number {
  const id = parsearId(texto);
  if (id === null) throw noEncontrado();
  return id;
}
