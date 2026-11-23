import type { EstadoSolicitud } from "@/modelos/catalogos";
import { conflicto } from "./errores";

/** Máquina de estados: RESUELTA y CANCELADA son finales. */
const TRANSICIONES: Record<EstadoSolicitud, readonly EstadoSolicitud[]> = {
  PENDIENTE: ["EN_PROCESO", "CANCELADA"],
  EN_PROCESO: ["RESUELTA", "CANCELADA"],
  RESUELTA: [],
  CANCELADA: [],
};

export function transicionesPermitidas(estado: EstadoSolicitud): EstadoSolicitud[] {
  return [...TRANSICIONES[estado]];
}

export function puedeTransicionar(desde: EstadoSolicitud, hacia: EstadoSolicitud): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function validarTransicion(desde: EstadoSolicitud, hacia: EstadoSolicitud): void {
  if (puedeTransicionar(desde, hacia)) return;
  const permitidas = TRANSICIONES[desde];
  const detalle = permitidas.length
    ? `Desde ${desde} solo se puede pasar a: ${permitidas.join(", ")}.`
    : `${desde} es un estado final.`;
  throw conflicto(`No se puede cambiar de ${desde} a ${hacia}. ${detalle}`);
}
