// Catálogos sin dependencias: los usan el esquema, los servicios y la vista (navegador).
export const ESTADOS_EQUIPO = ["OPERATIVO", "EN_MANTENIMIENTO", "FUERA_DE_SERVICIO"] as const;
export const PRIORIDADES = ["BAJA", "MEDIA", "ALTA"] as const;
export const ESTADOS_SOLICITUD = ["PENDIENTE", "EN_PROCESO", "RESUELTA", "CANCELADA"] as const;

export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];
export type Prioridad = (typeof PRIORIDADES)[number];
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];
