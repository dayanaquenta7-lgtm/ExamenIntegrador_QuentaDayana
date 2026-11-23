import { z } from "zod";
import { ESTADOS_SOLICITUD, PRIORIDADES } from "@/modelos/esquema";
import { errorValidacion } from "./errores";

const textoObligatorio = (campo: string, minimo: number, maximo: number) =>
  z
    .string({ error: `${campo} es obligatorio.` })
    .trim()
    .min(minimo, { error: `${campo} debe tener al menos ${minimo} caracteres.` })
    .max(maximo, { error: `${campo} no puede superar ${maximo} caracteres.` });

/** Campos editables de una solicitud. Las claves desconocidas (estado, código, activo...) se descartan. */
export const esquemaSolicitud = z.object({
  equipoId: z.coerce
    .number({ error: "Seleccione un equipo." })
    .int({ error: "Seleccione un equipo válido." })
    .positive({ error: "Seleccione un equipo." }),
  solicitante: textoObligatorio("El solicitante", 3, 100),
  descripcion: textoObligatorio("La descripción", 10, 2000),
  prioridad: z.enum(PRIORIDADES, { error: "La prioridad debe ser BAJA, MEDIA o ALTA." }),
});
export type DatosSolicitud = z.infer<typeof esquemaSolicitud>;

export const esquemaCambioEstado = z.object({
  estado: z.enum(ESTADOS_SOLICITUD, {
    error: "El estado debe ser PENDIENTE, EN_PROCESO, RESUELTA o CANCELADA.",
  }),
});

const vacioAIndefinido = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const esquemaFiltros = z.object({
  q: z.preprocess(vacioAIndefinido, z.string().trim().max(100).optional()),
  prioridad: z.preprocess(vacioAIndefinido, z.enum(PRIORIDADES, { error: "Prioridad de filtro inválida." }).optional()),
  estado: z.preprocess(vacioAIndefinido, z.enum(ESTADOS_SOLICITUD, { error: "Estado de filtro inválido." }).optional()),
});
export type FiltrosSolicitud = z.infer<typeof esquemaFiltros>;

/** Valida con Zod; si falla lanza ErrorNegocio 400 con mensajes por campo. */
export function validar<T extends z.ZodType>(esquema: T, datos: unknown): z.infer<T> {
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    throw errorValidacion({ _: ["El cuerpo de la petición debe ser un objeto JSON."] });
  }
  const resultado = esquema.safeParse(datos);
  if (resultado.success) return resultado.data;

  const campos: Record<string, string[]> = {};
  for (const issue of resultado.error.issues) {
    const clave = issue.path.length ? String(issue.path[0]) : "_";
    (campos[clave] ??= []).push(issue.message);
  }
  throw errorValidacion(campos);
}

const MAX_INT4 = 2_147_483_647;

/** Id de ruta: solo enteros positivos que caben en INTEGER. Cualquier otro valor se trata como inexistente. */
export function parsearId(texto: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(texto)) return null;
  const id = Number(texto);
  return id <= MAX_INT4 ? id : null;
}

/** Escapa \, % y _ para que ILIKE los trate como texto literal (escape por defecto: \). */
export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, "\\$&");
