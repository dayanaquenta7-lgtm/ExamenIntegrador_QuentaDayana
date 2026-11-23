import type { EstadoSolicitud, Prioridad } from "@/modelos/catalogos";
import type { SolicitudDTO } from "@/servicios/solicitudes";

export type { SolicitudDTO };
export type ErroresCampo = Record<string, string[]>;

export interface EquipoDTO {
  id: number;
  codigo: string;
  nombre: string;
  ubicacion: string;
  estado: string;
}

export interface DatosFormulario {
  equipoId: string;
  solicitante: string;
  descripcion: string;
  prioridad: Prioridad | "";
}

export type Resultado<T> =
  | { ok: true; status: number; datos: T }
  | { ok: false; status: number; error: string; campos?: ErroresCampo };

/** fetch a la API propia: nunca lanza, siempre devuelve éxito o error con mensaje legible. */
async function llamar<T>(url: string, init?: RequestInit): Promise<Resultado<T>> {
  try {
    const respuesta = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    if (respuesta.ok) return { ok: true, status: respuesta.status, datos: cuerpo as T };
    const err = (cuerpo ?? {}) as { error?: string; campos?: ErroresCampo };
    return {
      ok: false,
      status: respuesta.status,
      error: err.error ?? `Error inesperado (${respuesta.status}).`,
      campos: err.campos,
    };
  } catch {
    return { ok: false, status: 0, error: "No se pudo conectar con el servidor. Revise su conexión." };
  }
}

export const api = {
  equipos: () => llamar<EquipoDTO[]>("/api/equipos"),
  listar: (filtros: { q: string; prioridad: string; estado: string }) => {
    const params = new URLSearchParams();
    if (filtros.q.trim()) params.set("q", filtros.q.trim());
    if (filtros.prioridad) params.set("prioridad", filtros.prioridad);
    if (filtros.estado) params.set("estado", filtros.estado);
    return llamar<SolicitudDTO[]>(`/api/solicitudes?${params}`);
  },
  obtener: (id: number) => llamar<SolicitudDTO>(`/api/solicitudes/${id}`),
  crear: (datos: DatosFormulario) =>
    llamar<SolicitudDTO>("/api/solicitudes", { method: "POST", body: JSON.stringify(datos) }),
  editar: (id: number, datos: DatosFormulario) =>
    llamar<SolicitudDTO>(`/api/solicitudes/${id}`, { method: "PUT", body: JSON.stringify(datos) }),
  cambiarEstado: (id: number, estado: EstadoSolicitud) =>
    llamar<SolicitudDTO>(`/api/solicitudes/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }),
  eliminar: (id: number) => llamar<{ mensaje: string }>(`/api/solicitudes/${id}`, { method: "DELETE" }),
};

export const ETIQUETA_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  RESUELTA: "Resuelta",
  CANCELADA: "Cancelada",
};

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = { BAJA: "Baja", MEDIA: "Media", ALTA: "Alta" };

const formatoFecha = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatearFecha = (iso: string) => formatoFecha.format(new Date(iso));
