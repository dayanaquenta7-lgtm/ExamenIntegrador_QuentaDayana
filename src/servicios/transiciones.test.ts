import { describe, expect, it } from "vitest";
import { ESTADOS_SOLICITUD, type EstadoSolicitud } from "@/modelos/catalogos";
import { ErrorNegocio } from "./errores";
import { puedeTransicionar, transicionesPermitidas, validarTransicion } from "./transiciones";

const VALIDAS: [EstadoSolicitud, EstadoSolicitud][] = [
  ["PENDIENTE", "EN_PROCESO"],
  ["PENDIENTE", "CANCELADA"],
  ["EN_PROCESO", "RESUELTA"],
  ["EN_PROCESO", "CANCELADA"],
];

const todasLasCombinaciones = ESTADOS_SOLICITUD.flatMap((desde) =>
  ESTADOS_SOLICITUD.map((hacia) => [desde, hacia] as [EstadoSolicitud, EstadoSolicitud]),
);
const INVALIDAS = todasLasCombinaciones.filter(
  ([d, h]) => !VALIDAS.some(([vd, vh]) => vd === d && vh === h),
);

describe("transiciones de estado", () => {
  it.each(VALIDAS)("permite %s → %s", (desde, hacia) => {
    expect(puedeTransicionar(desde, hacia)).toBe(true);
    expect(() => validarTransicion(desde, hacia)).not.toThrow();
  });

  it("hay exactamente 12 transiciones inválidas (16 combinaciones - 4 válidas)", () => {
    expect(INVALIDAS).toHaveLength(12);
  });

  it.each(INVALIDAS)("rechaza %s → %s con 409", (desde, hacia) => {
    expect(puedeTransicionar(desde, hacia)).toBe(false);
    try {
      validarTransicion(desde, hacia);
      expect.unreachable("debió lanzar");
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorNegocio);
      expect((e as ErrorNegocio).status).toBe(409);
      expect((e as ErrorNegocio).message).toContain(desde);
    }
  });

  it("RESUELTA y CANCELADA son estados finales", () => {
    expect(transicionesPermitidas("RESUELTA")).toEqual([]);
    expect(transicionesPermitidas("CANCELADA")).toEqual([]);
  });

  it("lista las transiciones ofrecidas a la interfaz", () => {
    expect(transicionesPermitidas("PENDIENTE")).toEqual(["EN_PROCESO", "CANCELADA"]);
    expect(transicionesPermitidas("EN_PROCESO")).toEqual(["RESUELTA", "CANCELADA"]);
  });
});
