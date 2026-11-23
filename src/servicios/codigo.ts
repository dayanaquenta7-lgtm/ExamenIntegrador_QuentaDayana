export const ZONA_HORARIA = "America/La_Paz";
export const PATRON_CODIGO = /^SOL-\d{8}-\d{3,}$/;

/** AAAAMMDD de la fecha en la zona horaria del laboratorio (no la UTC del servidor). */
export function fechaParaCodigo(fecha: Date, zona = ZONA_HORARIA): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${valor("year")}${valor("month")}${valor("day")}`;
}

export const prefijoDelDia = (aaaammdd: string) => `SOL-${aaaammdd}-`;

export function generarCodigo(aaaammdd: string, correlativo: number): string {
  if (!Number.isInteger(correlativo) || correlativo < 1) {
    throw new RangeError("El correlativo debe ser un entero positivo");
  }
  return `${prefijoDelDia(aaaammdd)}${String(correlativo).padStart(3, "0")}`;
}

/** Repite la operación si falla por colisión (p. ej. dos registros simultáneos con el mismo correlativo). */
export async function conReintento<T>(
  operacion: () => Promise<T>,
  esColision: (error: unknown) => boolean,
  maxIntentos = 5,
): Promise<T> {
  for (let intento = 1; ; intento++) {
    try {
      return await operacion();
    } catch (error) {
      if (!esColision(error) || intento >= maxIntentos) throw error;
    }
  }
}
