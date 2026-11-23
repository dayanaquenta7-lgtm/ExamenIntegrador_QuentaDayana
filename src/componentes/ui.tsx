"use client";

import { useEffect, type ReactNode } from "react";
import type { EstadoSolicitud, Prioridad } from "@/modelos/catalogos";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD } from "./api-cliente";

const COLOR_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE: "bg-amber-100 text-amber-900 ring-amber-300",
  EN_PROCESO: "bg-blue-100 text-blue-900 ring-blue-300",
  RESUELTA: "bg-green-100 text-green-900 ring-green-300",
  CANCELADA: "bg-slate-200 text-slate-700 ring-slate-300",
};

const COLOR_PRIORIDAD: Record<Prioridad, string> = {
  BAJA: "bg-slate-100 text-slate-800 ring-slate-300",
  MEDIA: "bg-orange-100 text-orange-900 ring-orange-300",
  ALTA: "bg-red-100 text-red-900 ring-red-300",
};

const insignia = "inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap";

export const InsigniaEstado = ({ estado }: { estado: EstadoSolicitud }) => (
  <span className={`${insignia} ${COLOR_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
);

export const InsigniaPrioridad = ({ prioridad }: { prioridad: Prioridad }) => (
  <span className={`${insignia} ${COLOR_PRIORIDAD[prioridad]}`}>{ETIQUETA_PRIORIDAD[prioridad]}</span>
);

export const claseBoton = {
  primario:
    "rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50",
  secundario:
    "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50",
  peligro:
    "rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50",
  enlace:
    "rounded px-2 py-1 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50",
};

export const claseCampo =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30 aria-[invalid=true]:border-red-500";

export function Modal({
  titulo,
  abierto,
  alCerrar,
  children,
}: {
  titulo: string;
  abierto: boolean;
  alCerrar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!abierto) return;
    const conEscape = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", conEscape);
    return () => window.removeEventListener("keydown", conEscape);
  }, [abierto, alCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" onClick={alCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="titulo-modal" className="text-lg font-semibold">
            {titulo}
          </h2>
          <button type="button" onClick={alCerrar} className={claseBoton.enlace} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "exito" | "error" | "advertencia"; children: ReactNode }) {
  const estilos = {
    exito: "border-green-300 bg-green-50 text-green-900",
    error: "border-red-300 bg-red-50 text-red-900",
    advertencia: "border-amber-300 bg-amber-50 text-amber-900",
  }[tipo];
  return (
    <div role={tipo === "exito" ? "status" : "alert"} className={`rounded-md border px-3 py-2 text-sm ${estilos}`}>
      {children}
    </div>
  );
}
