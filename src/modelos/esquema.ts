import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const ESTADOS_EQUIPO = ["OPERATIVO", "EN_MANTENIMIENTO", "FUERA_DE_SERVICIO"] as const;
export const PRIORIDADES = ["BAJA", "MEDIA", "ALTA"] as const;
export const ESTADOS_SOLICITUD = ["PENDIENTE", "EN_PROCESO", "RESUELTA", "CANCELADA"] as const;

export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];
export type Prioridad = (typeof PRIORIDADES)[number];
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export const equipos = pgTable(
  "equipos",
  {
    id: serial("id").primaryKey(),
    codigo: varchar("codigo", { length: 20 }).notNull().unique("equipos_codigo_unique"),
    nombre: varchar("nombre", { length: 100 }).notNull(),
    ubicacion: varchar("ubicacion", { length: 100 }).notNull(),
    estado: varchar("estado", { length: 20 }).$type<EstadoEquipo>().notNull().default("OPERATIVO"),
  },
  (t) => [
    check("equipos_estado_check", sql`${t.estado} IN ('OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO')`),
  ],
).enableRLS();

export const solicitudes = pgTable(
  "solicitudes",
  {
    id: serial("id").primaryKey(),
    codigoSolicitud: varchar("codigo_solicitud", { length: 20 })
      .notNull()
      .unique("solicitudes_codigo_solicitud_unique"),
    equipoId: integer("equipo_id")
      .notNull()
      .references(() => equipos.id, { onDelete: "restrict", onUpdate: "cascade" }),
    solicitante: varchar("solicitante", { length: 100 }).notNull(),
    descripcion: text("descripcion").notNull(),
    prioridad: varchar("prioridad", { length: 5 }).$type<Prioridad>().notNull(),
    estado: varchar("estado", { length: 12 }).$type<EstadoSolicitud>().notNull().default("PENDIENTE"),
    fechaRegistro: timestamp("fecha_registro", { withTimezone: true }).notNull().defaultNow(),
    fechaActualizacion: timestamp("fecha_actualizacion", { withTimezone: true }).notNull().defaultNow(),
    activo: boolean("activo").notNull().default(true),
  },
  (t) => [
    check("solicitudes_prioridad_check", sql`${t.prioridad} IN ('BAJA', 'MEDIA', 'ALTA')`),
    check(
      "solicitudes_estado_check",
      sql`${t.estado} IN ('PENDIENTE', 'EN_PROCESO', 'RESUELTA', 'CANCELADA')`,
    ),
    // Segunda capa: la regla principal se valida en src/servicios con Zod.
    check("solicitudes_solicitante_check", sql`char_length(btrim(${t.solicitante})) >= 3`),
    check("solicitudes_descripcion_check", sql`char_length(btrim(${t.descripcion})) >= 10`),
    index("solicitudes_fecha_registro_idx").on(t.fechaRegistro.desc()),
    index("solicitudes_equipo_id_idx").on(t.equipoId),
  ],
).enableRLS();

export type Equipo = typeof equipos.$inferSelect;
export type Solicitud = typeof solicitudes.$inferSelect;
