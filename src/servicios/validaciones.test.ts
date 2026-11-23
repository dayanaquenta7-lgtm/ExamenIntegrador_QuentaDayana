import { describe, expect, it } from "vitest";
import { ErrorNegocio } from "./errores";
import {
  escaparLike,
  esquemaCambioEstado,
  esquemaFiltros,
  esquemaSolicitud,
  parsearId,
  validar,
} from "./validaciones";

const valida = {
  equipoId: 1,
  solicitante: "Ana Pérez",
  descripcion: "El equipo no enciende al presionar el botón.",
  prioridad: "MEDIA",
};

function erroresDe(datos: unknown) {
  try {
    validar(esquemaSolicitud, datos);
  } catch (e) {
    expect(e).toBeInstanceOf(ErrorNegocio);
    expect((e as ErrorNegocio).status).toBe(400);
    return (e as ErrorNegocio).campos ?? {};
  }
  throw new Error("se esperaba error de validación");
}

describe("esquemaSolicitud", () => {
  it("acepta datos válidos y aplica trim", () => {
    const r = validar(esquemaSolicitud, { ...valida, solicitante: "  Ana Pérez  " });
    expect(r.solicitante).toBe("Ana Pérez");
  });

  it("acepta equipoId enviado como texto numérico (select del formulario)", () => {
    expect(validar(esquemaSolicitud, { ...valida, equipoId: "3" }).equipoId).toBe(3);
  });

  it("descarta estado, código, activo y fechas enviados por el cliente", () => {
    const r = validar(esquemaSolicitud, {
      ...valida,
      estado: "RESUELTA",
      codigoSolicitud: "X",
      activo: false,
      fechaRegistro: "2020-01-01",
    });
    expect(r).toEqual(valida);
  });

  it.each([undefined, "", "   ", "ab", "  ab  "])("rechaza solicitante %j", (solicitante) => {
    expect(erroresDe({ ...valida, solicitante }).solicitante).toBeDefined();
  });

  it("acepta solicitante de exactamente 3 caracteres", () => {
    expect(validar(esquemaSolicitud, { ...valida, solicitante: "Ana" }).solicitante).toBe("Ana");
  });

  it.each([undefined, "", "corta", "  123456789  "])("rechaza descripción %j", (descripcion) => {
    expect(erroresDe({ ...valida, descripcion }).descripcion).toBeDefined();
  });

  it("acepta descripción de exactamente 10 caracteres tras trim", () => {
    expect(validar(esquemaSolicitud, { ...valida, descripcion: " 1234567890 " }).descripcion).toBe("1234567890");
  });

  it.each(["URGENTE", "baja", "", undefined, 1])("rechaza prioridad %j", (prioridad) => {
    expect(erroresDe({ ...valida, prioridad }).prioridad).toBeDefined();
  });

  it.each([undefined, "", "abc", 0, -1, 1.5])("rechaza equipoId %j", (equipoId) => {
    expect(erroresDe({ ...valida, equipoId }).equipoId).toBeDefined();
  });

  it("devuelve mensajes por cada campo inválido a la vez", () => {
    const campos = erroresDe({});
    expect(Object.keys(campos).sort()).toEqual(["descripcion", "equipoId", "prioridad", "solicitante"]);
  });

  it("rechaza un cuerpo que no es objeto", () => {
    expect(() => validar(esquemaSolicitud, null)).toThrow(ErrorNegocio);
    expect(() => validar(esquemaSolicitud, "texto")).toThrow(ErrorNegocio);
  });
});

describe("esquemaCambioEstado", () => {
  it("acepta un estado conocido", () => {
    expect(validar(esquemaCambioEstado, { estado: "EN_PROCESO" }).estado).toBe("EN_PROCESO");
  });
  it("rechaza un estado desconocido con 400", () => {
    expect(() => validar(esquemaCambioEstado, { estado: "CERRADA" })).toThrow(ErrorNegocio);
  });
});

describe("esquemaFiltros", () => {
  it("convierte vacíos en undefined", () => {
    expect(validar(esquemaFiltros, { q: "  ", prioridad: "", estado: "" })).toEqual({});
  });
  it("rechaza filtros con valores fuera de catálogo", () => {
    expect(() => validar(esquemaFiltros, { prioridad: "X" })).toThrow(ErrorNegocio);
  });
});

describe("parsearId", () => {
  it.each([["1", 1], ["42", 42]])("acepta %s", (texto, esperado) => {
    expect(parsearId(texto)).toBe(esperado);
  });
  it.each(["0", "-1", "abc", "1.5", "1e3", "", " 1", "99999999999"])("rechaza %j", (texto) => {
    expect(parsearId(texto)).toBeNull();
  });
});

describe("escaparLike", () => {
  it("escapa comodines de LIKE para que se busquen literalmente", () => {
    expect(escaparLike("50%")).toBe("50\\%");
    expect(escaparLike("a_b")).toBe("a\\_b");
    expect(escaparLike("c:\\x")).toBe("c:\\\\x");
    expect(escaparLike("normal")).toBe("normal");
  });
});
