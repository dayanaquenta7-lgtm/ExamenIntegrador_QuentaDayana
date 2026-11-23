import { and, asc, desc, eq, ilike, like, or, sql } from "drizzle-orm";
import type { BaseDatos } from "@/modelos/db";
import { equipos, solicitudes, type EstadoSolicitud, type Prioridad } from "@/modelos/esquema";
import { conReintento, fechaParaCodigo, generarCodigo, prefijoDelDia } from "./codigo";
import { errorValidacion, esViolacionUnica, noEncontrado } from "./errores";
import { esEditable, transicionesPermitidas, validarEditable, validarTransicion } from "./transiciones";
import {
  escaparLike,
  esquemaCambioEstado,
  esquemaFiltros,
  esquemaSolicitud,
  validar,
} from "./validaciones";

type Transaccion = Parameters<Parameters<BaseDatos["transaction"]>[0]>[0];
type Ejecutor = BaseDatos | Transaccion;

export interface SolicitudDTO {
  id: number;
  codigoSolicitud: string;
  solicitante: string;
  descripcion: string;
  prioridad: Prioridad;
  estado: EstadoSolicitud;
  fechaRegistro: string;
  fechaActualizacion: string;
  equipo: { id: number; codigo: string; nombre: string; ubicacion: string };
  transicionesPermitidas: EstadoSolicitud[];
  editable: boolean;
}

const columnasSolicitud = {
  id: solicitudes.id,
  codigoSolicitud: solicitudes.codigoSolicitud,
  solicitante: solicitudes.solicitante,
  descripcion: solicitudes.descripcion,
  prioridad: solicitudes.prioridad,
  estado: solicitudes.estado,
  fechaRegistro: solicitudes.fechaRegistro,
  fechaActualizacion: solicitudes.fechaActualizacion,
  equipo: {
    id: equipos.id,
    codigo: equipos.codigo,
    nombre: equipos.nombre,
    ubicacion: equipos.ubicacion,
  },
};

type FilaSolicitud = {
  [K in keyof typeof columnasSolicitud]: K extends "equipo"
    ? { id: number; codigo: string; nombre: string; ubicacion: string }
    : (typeof solicitudes.$inferSelect)[Exclude<K, "equipo">];
};

function aDTO(fila: FilaSolicitud): SolicitudDTO {
  return {
    ...fila,
    fechaRegistro: fila.fechaRegistro.toISOString(),
    fechaActualizacion: fila.fechaActualizacion.toISOString(),
    transicionesPermitidas: transicionesPermitidas(fila.estado),
    editable: esEditable(fila.estado),
  };
}

async function buscarActiva(db: Ejecutor, id: number): Promise<SolicitudDTO | null> {
  const [fila] = await db
    .select(columnasSolicitud)
    .from(solicitudes)
    .innerJoin(equipos, eq(solicitudes.equipoId, equipos.id))
    .where(and(eq(solicitudes.id, id), eq(solicitudes.activo, true)));
  return fila ? aDTO(fila) : null;
}

/** El equipo debe existir y estar OPERATIVO. Se bloquea la fila (FOR SHARE) para que no cambie hasta el commit. */
async function exigirEquipoOperativo(tx: Transaccion, equipoId: number) {
  const [equipo] = await tx
    .select({ id: equipos.id, estado: equipos.estado })
    .from(equipos)
    .where(eq(equipos.id, equipoId))
    .for("share");
  if (!equipo) throw errorValidacion({ equipoId: ["El equipo seleccionado no existe."] });
  if (equipo.estado !== "OPERATIVO") {
    throw errorValidacion({ equipoId: [`El equipo no está operativo (estado: ${equipo.estado}).`] });
  }
}

export async function listarEquipos(db: BaseDatos) {
  return db
    .select({
      id: equipos.id,
      codigo: equipos.codigo,
      nombre: equipos.nombre,
      ubicacion: equipos.ubicacion,
      estado: equipos.estado,
    })
    .from(equipos)
    .orderBy(asc(equipos.codigo));
}

export async function listarSolicitudes(db: BaseDatos, filtrosCrudos: unknown): Promise<SolicitudDTO[]> {
  const filtros = validar(esquemaFiltros, filtrosCrudos);
  const condiciones = [eq(solicitudes.activo, true)];

  if (filtros.q) {
    // El texto viaja como parámetro (sin concatenar SQL); % y _ se escapan para buscarse literalmente.
    const patron = `%${escaparLike(filtros.q)}%`;
    condiciones.push(
      or(
        ilike(solicitudes.codigoSolicitud, patron),
        ilike(solicitudes.solicitante, patron),
        ilike(equipos.nombre, patron),
      )!,
    );
  }
  if (filtros.prioridad) condiciones.push(eq(solicitudes.prioridad, filtros.prioridad));
  if (filtros.estado) condiciones.push(eq(solicitudes.estado, filtros.estado));

  const filas = await db
    .select(columnasSolicitud)
    .from(solicitudes)
    .innerJoin(equipos, eq(solicitudes.equipoId, equipos.id))
    .where(and(...condiciones))
    .orderBy(desc(solicitudes.fechaRegistro), desc(solicitudes.id));
  return filas.map(aDTO);
}

export async function obtenerSolicitud(db: BaseDatos, id: number): Promise<SolicitudDTO> {
  const solicitud = await buscarActiva(db, id);
  if (!solicitud) throw noEncontrado();
  return solicitud;
}

export async function crearSolicitud(db: BaseDatos, cuerpo: unknown, ahora = new Date()): Promise<SolicitudDTO> {
  const datos = validar(esquemaSolicitud, cuerpo);
  const dia = fechaParaCodigo(ahora);
  const prefijo = prefijoDelDia(dia);

  const id = await conReintento(
    () =>
      db.transaction(async (tx) => {
        await exigirEquipoOperativo(tx, datos.equipoId);

        // Correlativo del día = mayor existente + 1 (incluye inactivas: el código nunca se reutiliza).
        const [{ maximo }] = await tx
          .select({
            maximo: sql<number>`coalesce(max(cast(split_part(${solicitudes.codigoSolicitud}, '-', 3) as integer)), 0)`.mapWith(Number),
          })
          .from(solicitudes)
          .where(like(solicitudes.codigoSolicitud, `${prefijo}%`));

        const [creada] = await tx
          .insert(solicitudes)
          .values({
            ...datos,
            codigoSolicitud: generarCodigo(dia, maximo + 1),
            estado: "PENDIENTE", // Siempre PENDIENTE, ignorando lo que envíe el cliente.
          })
          .returning({ id: solicitudes.id });
        return creada.id;
      }),
    // Si dos registros simultáneos calculan el mismo correlativo, el UNIQUE falla y se reintenta.
    esViolacionUnica,
    5,
  );

  return obtenerSolicitud(db, id);
}

export async function actualizarSolicitud(db: BaseDatos, id: number, cuerpo: unknown): Promise<SolicitudDTO> {
  const datos = validar(esquemaSolicitud, cuerpo);

  await db.transaction(async (tx) => {
    const [actual] = await tx
      .select({ equipoId: solicitudes.equipoId, estado: solicitudes.estado })
      .from(solicitudes)
      .where(and(eq(solicitudes.id, id), eq(solicitudes.activo, true)))
      .for("update");
    if (!actual) throw noEncontrado();

    validarEditable(actual.estado); // RESUELTA y CANCELADA no se editan (409).

    // Solo se exige OPERATIVO si se cambia de equipo: mantener el equipo actual siempre es válido.
    if (actual.equipoId !== datos.equipoId) await exigirEquipoOperativo(tx, datos.equipoId);

    // Lista blanca explícita: id, código, estado, fecha_registro y activo nunca se modifican aquí.
    await tx
      .update(solicitudes)
      .set({
        equipoId: datos.equipoId,
        solicitante: datos.solicitante,
        descripcion: datos.descripcion,
        prioridad: datos.prioridad,
        fechaActualizacion: new Date(),
      })
      .where(eq(solicitudes.id, id));
  });

  return obtenerSolicitud(db, id);
}

export async function cambiarEstado(db: BaseDatos, id: number, cuerpo: unknown): Promise<SolicitudDTO> {
  const { estado: nuevo } = validar(esquemaCambioEstado, cuerpo);

  await db.transaction(async (tx) => {
    // FOR UPDATE: evita que dos cambios simultáneos se salten la máquina de estados.
    const [actual] = await tx
      .select({ estado: solicitudes.estado })
      .from(solicitudes)
      .where(and(eq(solicitudes.id, id), eq(solicitudes.activo, true)))
      .for("update");
    if (!actual) throw noEncontrado();

    validarTransicion(actual.estado, nuevo);

    await tx
      .update(solicitudes)
      .set({ estado: nuevo, fechaActualizacion: new Date() })
      .where(eq(solicitudes.id, id));
  });

  return obtenerSolicitud(db, id);
}

/** Eliminación lógica: nunca se borra la fila, solo se marca activo = false. */
export async function eliminarSolicitud(db: BaseDatos, id: number): Promise<{ id: number; codigoSolicitud: string }> {
  const [eliminada] = await db
    .update(solicitudes)
    .set({ activo: false, fechaActualizacion: new Date() })
    .where(and(eq(solicitudes.id, id), eq(solicitudes.activo, true)))
    .returning({ id: solicitudes.id, codigoSolicitud: solicitudes.codigoSolicitud });
  if (!eliminada) throw noEncontrado();
  return eliminada;
}
