import { describe, expect, it, vi } from "vitest";
import {
  conReintento,
  fechaParaCodigo,
  generarCodigo,
  PATRON_CODIGO,
  prefijoDelDia,
} from "./codigo";

describe("generación de código de solicitud", () => {
  it("usa el formato SOL-AAAAMMDD-XXX con correlativo de 3 dígitos", () => {
    expect(generarCodigo("20261123", 1)).toBe("SOL-20261123-001");
    expect(generarCodigo("20261123", 42)).toBe("SOL-20261123-042");
    expect(generarCodigo("20261123", 999)).toBe("SOL-20261123-999");
    expect(PATRON_CODIGO.test("SOL-20261123-001")).toBe(true);
  });

  it("no trunca si el día supera 999 solicitudes", () => {
    expect(generarCodigo("20261123", 1000)).toBe("SOL-20261123-1000");
  });

  it("rechaza correlativos no positivos", () => {
    expect(() => generarCodigo("20261123", 0)).toThrow();
    expect(() => generarCodigo("20261123", 1.5)).toThrow();
  });

  it("calcula la fecha en la zona horaria de La Paz, no en UTC", () => {
    // 23/11/2026 02:30 UTC = 22/11/2026 22:30 en La Paz (UTC-4)
    expect(fechaParaCodigo(new Date("2026-11-23T02:30:00Z"))).toBe("20261122");
    expect(fechaParaCodigo(new Date("2026-11-23T04:00:00Z"))).toBe("20261123");
  });

  it("arma el prefijo del día", () => {
    expect(prefijoDelDia("20261123")).toBe("SOL-20261123-");
  });
});

describe("reintento ante colisión", () => {
  const colision = Object.assign(new Error("duplicado"), { code: "23505" });
  const esColision = (e: unknown) => (e as { code?: string }).code === "23505";

  it("reintenta cuando hay colisión y devuelve el resultado", async () => {
    const fn = vi.fn().mockRejectedValueOnce(colision).mockRejectedValueOnce(colision).mockResolvedValue("ok");
    await expect(conReintento(fn, esColision, 5)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("se rinde después del máximo de intentos", async () => {
    const fn = vi.fn().mockRejectedValue(colision);
    await expect(conReintento(fn, esColision, 3)).rejects.toBe(colision);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("no reintenta errores que no son colisión", async () => {
    const otro = new Error("otro");
    const fn = vi.fn().mockRejectedValue(otro);
    await expect(conReintento(fn, esColision, 5)).rejects.toBe(otro);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
