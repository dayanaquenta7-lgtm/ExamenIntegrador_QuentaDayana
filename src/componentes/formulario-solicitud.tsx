"use client";

import { useState, type FormEvent } from "react";
import { PRIORIDADES } from "@/modelos/catalogos";
import { ETIQUETA_PRIORIDAD, type DatosFormulario, type EquipoDTO, type ErroresCampo, type Resultado } from "./api-cliente";
import { Aviso, claseBoton, claseCampo } from "./ui";

export const FORMULARIO_VACIO: DatosFormulario = { equipoId: "", solicitante: "", descripcion: "", prioridad: "" };

interface Props {
  equipos: EquipoDTO[];
  inicial?: DatosFormulario;
  textoBoton: string;
  /** Llama a la API; el formulario solo se limpia si el servidor responde con éxito. */
  alEnviar: (datos: DatosFormulario) => Promise<Resultado<unknown>>;
  alCancelar?: () => void;
  limpiarAlGuardar?: boolean;
  idPrefijo: string;
}

export function FormularioSolicitud({ equipos, inicial = FORMULARIO_VACIO, textoBoton, alEnviar, alCancelar, limpiarAlGuardar, idPrefijo }: Props) {
  const [datos, setDatos] = useState<DatosFormulario>(inicial);
  const [errores, setErrores] = useState<ErroresCampo>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = <K extends keyof DatosFormulario>(campo: K, valor: DatosFormulario[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: [] }));
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setErrorGeneral(null);
    const r = await alEnviar(datos);
    setEnviando(false);
    if (r.ok) {
      setErrores({});
      if (limpiarAlGuardar) setDatos(FORMULARIO_VACIO);
      return;
    }
    setErrores(r.campos ?? {});
    setErrorGeneral(r.error);
  }

  const id = (campo: string) => `${idPrefijo}-${campo}`;
  const mensaje = (campo: keyof DatosFormulario) =>
    errores[campo]?.length ? (
      <p id={id(`${campo}-error`)} className="mt-1 text-xs text-red-700">
        {errores[campo].join(" ")}
      </p>
    ) : null;
  const invalido = (campo: keyof DatosFormulario) => Boolean(errores[campo]?.length);

  return (
    <form onSubmit={enviar} noValidate className="space-y-3">
      {errorGeneral && <Aviso tipo="error">{errorGeneral}</Aviso>}

      <div>
        <label htmlFor={id("equipo")} className="mb-1 block text-sm font-medium">Equipo *</label>
        <select
          id={id("equipo")}
          className={claseCampo}
          value={datos.equipoId}
          onChange={(e) => cambiar("equipoId", e.target.value)}
          aria-invalid={invalido("equipoId")}
          aria-describedby={id("equipoId-error")}
        >
          <option value="">Seleccione un equipo…</option>
          {equipos.map((eq) => (
            <option key={eq.id} value={String(eq.id)} disabled={eq.estado !== "OPERATIVO"}>
              {eq.codigo} · {eq.nombre} ({eq.ubicacion}){eq.estado !== "OPERATIVO" ? ` — ${eq.estado}` : ""}
            </option>
          ))}
        </select>
        {mensaje("equipoId")}
      </div>

      <div>
        <label htmlFor={id("solicitante")} className="mb-1 block text-sm font-medium">Solicitante *</label>
        <input
          id={id("solicitante")}
          className={claseCampo}
          value={datos.solicitante}
          onChange={(e) => cambiar("solicitante", e.target.value)}
          maxLength={100}
          placeholder="Nombre de quien reporta"
          aria-invalid={invalido("solicitante")}
          aria-describedby={id("solicitante-error")}
        />
        {mensaje("solicitante")}
      </div>

      <div>
        <label htmlFor={id("descripcion")} className="mb-1 block text-sm font-medium">Descripción de la falla *</label>
        <textarea
          id={id("descripcion")}
          className={`${claseCampo} min-h-20`}
          value={datos.descripcion}
          onChange={(e) => cambiar("descripcion", e.target.value)}
          maxLength={2000}
          placeholder="Mínimo 10 caracteres"
          aria-invalid={invalido("descripcion")}
          aria-describedby={id("descripcion-error")}
        />
        {mensaje("descripcion")}
      </div>

      <div>
        <label htmlFor={id("prioridad")} className="mb-1 block text-sm font-medium">Prioridad *</label>
        <select
          id={id("prioridad")}
          className={claseCampo}
          value={datos.prioridad}
          onChange={(e) => cambiar("prioridad", e.target.value as DatosFormulario["prioridad"])}
          aria-invalid={invalido("prioridad")}
          aria-describedby={id("prioridad-error")}
        >
          <option value="">Seleccione…</option>
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>{ETIQUETA_PRIORIDAD[p]}</option>
          ))}
        </select>
        {mensaje("prioridad")}
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className={claseBoton.primario} disabled={enviando}>
          {enviando ? "Guardando…" : textoBoton}
        </button>
        {alCancelar && (
          <button type="button" className={claseBoton.secundario} onClick={alCancelar} disabled={enviando}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
