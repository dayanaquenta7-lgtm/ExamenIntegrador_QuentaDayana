export type StatusNegocio = 400 | 404 | 409;
export type ErroresPorCampo = Record<string, string[]>;

/** Error esperado de negocio: el controlador lo traduce a su código HTTP. */
export class ErrorNegocio extends Error {
  constructor(
    public readonly status: StatusNegocio,
    message: string,
    public readonly campos?: ErroresPorCampo,
  ) {
    super(message);
    this.name = "ErrorNegocio";
  }
}

export const errorValidacion = (campos: ErroresPorCampo, mensaje = "Los datos enviados no son válidos.") =>
  new ErrorNegocio(400, mensaje, campos);

export const noEncontrado = (mensaje = "La solicitud no existe.") => new ErrorNegocio(404, mensaje);

export const conflicto = (mensaje: string) => new ErrorNegocio(409, mensaje);

/** Código SQLSTATE de PostgreSQL, aunque Drizzle envuelva el error original en `cause`. */
export function codigoPostgres(error: unknown): string | undefined {
  let actual: unknown = error;
  for (let i = 0; i < 3 && actual && typeof actual === "object"; i++) {
    const codigo = (actual as { code?: unknown }).code;
    if (typeof codigo === "string") return codigo;
    actual = (actual as { cause?: unknown }).cause;
  }
  return undefined;
}

export const esViolacionUnica = (error: unknown) => codigoPostgres(error) === "23505";
