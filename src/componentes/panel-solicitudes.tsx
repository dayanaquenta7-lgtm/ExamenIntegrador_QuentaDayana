"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ESTADOS_SOLICITUD, PRIORIDADES, type EstadoSolicitud } from "@/modelos/catalogos";
import {
  api,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  formatearFecha,
  type EquipoDTO,
  type SolicitudDTO,
} from "./api-cliente";
import { FormularioSolicitud } from "./formulario-solicitud";
import { Aviso, claseBoton, claseCampo, InsigniaEstado, InsigniaPrioridad, Modal } from "./ui";

type Dialogo =
  | { tipo: "detalle"; solicitud: SolicitudDTO }
  | { tipo: "editar"; solicitud: SolicitudDTO }
  | { tipo: "estado"; solicitud: SolicitudDTO }
  | { tipo: "eliminar"; solicitud: SolicitudDTO }
  | null;

type Mensaje = { tipo: "exito" | "error"; texto: string } | null;

export function PanelSolicitudes() {
  const [equipos, setEquipos] = useState<EquipoDTO[]>([]);
  const [errorEquipos, setErrorEquipos] = useState<string | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudDTO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorListado, setErrorListado] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({ q: "", prioridad: "", estado: "" });
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [claveFormulario, setClaveFormulario] = useState(0);
  const ultimaPeticion = useRef(0);

  const recargar = useCallback(async (f = filtros) => {
    // Solo se aplica la respuesta más reciente (evita que una búsqueda lenta pise a una más nueva).
    const numero = ++ultimaPeticion.current;
    setCargando(true);
    const r = await api.listar(f);
    if (numero !== ultimaPeticion.current) return;
    setCargando(false);
    if (r.ok) {
      setSolicitudes(r.datos);
      setErrorListado(null);
    } else {
      setErrorListado(r.error);
    }
  }, [filtros]);

  useEffect(() => {
    api.equipos().then((r) => (r.ok ? setEquipos(r.datos) : setErrorEquipos(r.error)));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void recargar(filtros), 300);
    return () => clearTimeout(t);
  }, [filtros, recargar]);

  const cerrar = useCallback(() => setDialogo(null), []);
  const avisar = (m: Mensaje) => {
    setMensaje(m);
    if (m?.tipo === "exito") setTimeout(() => setMensaje((actual) => (actual === m ? null : actual)), 5000);
  };

  /** Antes de abrir un diálogo se consulta el servidor: si la solicitud ya no existe se informa. */
  async function abrir(tipo: NonNullable<Dialogo>["tipo"], id: number) {
    const r = await api.obtener(id);
    if (!r.ok) {
      avisar({ tipo: "error", texto: r.error });
      void recargar();
      return;
    }
    setDialogo({ tipo, solicitud: r.datos });
  }

  const hayFiltros = Boolean(filtros.q || filtros.prioridad || filtros.estado);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <section aria-labelledby="titulo-registro" className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 id="titulo-registro" className="mb-3 text-lg font-semibold">Registrar solicitud</h2>
        {errorEquipos && <div className="mb-3"><Aviso tipo="error">No se pudieron cargar los equipos: {errorEquipos}</Aviso></div>}
        <FormularioSolicitud
          key={claveFormulario}
          idPrefijo="nuevo"
          equipos={equipos}
          textoBoton="Registrar solicitud"
          limpiarAlGuardar
          alEnviar={async (datos) => {
            const r = await api.crear(datos);
            if (r.ok) {
              avisar({ tipo: "exito", texto: `Solicitud ${r.datos.codigoSolicitud} registrada correctamente.` });
              setClaveFormulario((k) => k + 1);
              void recargar();
            }
            return r;
          }}
        />
      </section>

      <section aria-labelledby="titulo-listado" className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-listado" className="text-lg font-semibold">Solicitudes registradas</h2>
          <span className="text-sm text-slate-600" aria-live="polite">
            {cargando ? "Cargando…" : `${solicitudes.length} resultado(s)`}
          </span>
        </div>

        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_160px_160px_auto]">
          <label className="sr-only" htmlFor="filtro-q">Buscar</label>
          <input
            id="filtro-q"
            type="search"
            className={claseCampo}
            placeholder="Buscar por código, solicitante o equipo"
            value={filtros.q}
            maxLength={100}
            onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))}
          />
          <label className="sr-only" htmlFor="filtro-prioridad">Prioridad</label>
          <select id="filtro-prioridad" className={claseCampo} value={filtros.prioridad} onChange={(e) => setFiltros((f) => ({ ...f, prioridad: e.target.value }))}>
            <option value="">Toda prioridad</option>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{ETIQUETA_PRIORIDAD[p]}</option>)}
          </select>
          <label className="sr-only" htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" className={claseCampo} value={filtros.estado} onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value }))}>
            <option value="">Todo estado</option>
            {ESTADOS_SOLICITUD.map((s) => <option key={s} value={s}>{ETIQUETA_ESTADO[s]}</option>)}
          </select>
          <button type="button" className={claseBoton.secundario} disabled={!hayFiltros} onClick={() => setFiltros({ q: "", prioridad: "", estado: "" })}>
            Limpiar
          </button>
        </div>

        {mensaje && <div className="mb-3"><Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso></div>}
        {errorListado && <div className="mb-3"><Aviso tipo="error">{errorListado}</Aviso></div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th scope="col" className="px-2 py-2">Código</th>
                <th scope="col" className="px-2 py-2">Equipo</th>
                <th scope="col" className="px-2 py-2">Solicitante</th>
                <th scope="col" className="px-2 py-2">Prioridad</th>
                <th scope="col" className="px-2 py-2">Estado</th>
                <th scope="col" className="px-2 py-2">Fecha registro</th>
                <th scope="col" className="px-2 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!cargando && solicitudes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-slate-500">
                    {hayFiltros ? "No hay solicitudes que coincidan con la búsqueda." : "Aún no hay solicitudes registradas."}
                  </td>
                </tr>
              )}
              {solicitudes.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                  <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">{s.codigoSolicitud}</td>
                  <td className="px-2 py-2">
                    <div className="font-medium">{s.equipo.nombre}</div>
                    <div className="text-xs text-slate-500">{s.equipo.codigo} · {s.equipo.ubicacion}</div>
                  </td>
                  <td className="px-2 py-2 break-words">{s.solicitante}</td>
                  <td className="px-2 py-2"><InsigniaPrioridad prioridad={s.prioridad} /></td>
                  <td className="px-2 py-2"><InsigniaEstado estado={s.estado} /></td>
                  <td className="px-2 py-2 whitespace-nowrap">{formatearFecha(s.fechaRegistro)}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button type="button" className={claseBoton.enlace} onClick={() => abrir("detalle", s.id)}>Ver</button>
                      <button
                        type="button"
                        className={claseBoton.enlace}
                        onClick={() => abrir("editar", s.id)}
                        disabled={!s.editable}
                        title={!s.editable ? "Una solicitud resuelta o cancelada no se puede editar" : undefined}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={claseBoton.enlace}
                        onClick={() => abrir("estado", s.id)}
                        disabled={s.transicionesPermitidas.length === 0}
                        title={s.transicionesPermitidas.length === 0 ? "Estado final: no admite cambios" : undefined}
                      >
                        Estado
                      </button>
                      <button type="button" className={`${claseBoton.enlace} text-red-700 hover:bg-red-50`} onClick={() => abrir("eliminar", s.id)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal titulo={dialogo ? `Solicitud ${dialogo.solicitud.codigoSolicitud}` : ""} abierto={dialogo?.tipo === "detalle"} alCerrar={cerrar}>
        {dialogo?.tipo === "detalle" && <Detalle solicitud={dialogo.solicitud} />}
      </Modal>

      <Modal titulo={dialogo ? `Editar ${dialogo.solicitud.codigoSolicitud}` : ""} abierto={dialogo?.tipo === "editar"} alCerrar={cerrar}>
        {dialogo?.tipo === "editar" && (
          <FormularioSolicitud
            idPrefijo="editar"
            equipos={equipos.map((e) =>
              // El equipo actual siempre es seleccionable aunque ya no esté operativo (regla del servicio).
              e.id === dialogo.solicitud.equipo.id ? { ...e, estado: "OPERATIVO" } : e,
            )}
            inicial={{
              equipoId: String(dialogo.solicitud.equipo.id),
              solicitante: dialogo.solicitud.solicitante,
              descripcion: dialogo.solicitud.descripcion,
              prioridad: dialogo.solicitud.prioridad,
            }}
            textoBoton="Guardar cambios"
            alCancelar={cerrar}
            alEnviar={async (datos) => {
              const r = await api.editar(dialogo.solicitud.id, datos);
              if (r.ok) {
                avisar({ tipo: "exito", texto: `Solicitud ${r.datos.codigoSolicitud} actualizada.` });
                cerrar();
                void recargar();
              } else if (r.status === 404 || r.status === 409) {
                avisar({ tipo: "error", texto: r.error });
                cerrar();
                void recargar();
              }
              return r;
            }}
          />
        )}
      </Modal>

      <Modal titulo={dialogo ? `Cambiar estado de ${dialogo.solicitud.codigoSolicitud}` : ""} abierto={dialogo?.tipo === "estado"} alCerrar={cerrar}>
        {dialogo?.tipo === "estado" && (
          <CambioEstado
            solicitud={dialogo.solicitud}
            alCancelar={cerrar}
            alCambiar={(s) => {
              avisar({ tipo: "exito", texto: `Solicitud ${s.codigoSolicitud} ahora está ${ETIQUETA_ESTADO[s.estado]}.` });
              cerrar();
              void recargar();
            }}
            alFallar={() => void recargar()}
          />
        )}
      </Modal>

      <Modal titulo="Confirmar eliminación" abierto={dialogo?.tipo === "eliminar"} alCerrar={cerrar}>
        {dialogo?.tipo === "eliminar" && (
          <ConfirmarEliminar
            solicitud={dialogo.solicitud}
            alCancelar={cerrar}
            alEliminar={(texto) => {
              avisar({ tipo: "exito", texto });
              cerrar();
              void recargar();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function Detalle({ solicitud: s }: { solicitud: SolicitudDTO }) {
  const fila = (etiqueta: string, valor: React.ReactNode) => (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-slate-100 py-2 text-sm">
      <dt className="font-medium text-slate-600">{etiqueta}</dt>
      <dd className="break-words whitespace-pre-wrap">{valor}</dd>
    </div>
  );
  return (
    <dl>
      {fila("Código", <span className="font-mono">{s.codigoSolicitud}</span>)}
      {fila("Equipo", `${s.equipo.codigo} · ${s.equipo.nombre}`)}
      {fila("Ubicación", s.equipo.ubicacion)}
      {fila("Solicitante", s.solicitante)}
      {fila("Descripción", s.descripcion)}
      {fila("Prioridad", <InsigniaPrioridad prioridad={s.prioridad} />)}
      {fila("Estado", <InsigniaEstado estado={s.estado} />)}
      {fila("Registrada", formatearFecha(s.fechaRegistro))}
      {fila("Actualizada", formatearFecha(s.fechaActualizacion))}
    </dl>
  );
}

function CambioEstado({
  solicitud,
  alCancelar,
  alCambiar,
  alFallar,
}: {
  solicitud: SolicitudDTO;
  alCancelar: () => void;
  alCambiar: (s: SolicitudDTO) => void;
  alFallar: () => void;
}) {
  const [nuevo, setNuevo] = useState<EstadoSolicitud | "">(solicitud.transicionesPermitidas[0] ?? "");
  const [enviando, setEnviando] = useState(false);
  const [advertencia, setAdvertencia] = useState<string | null>(null);

  async function confirmar() {
    if (!nuevo || enviando) return;
    setEnviando(true);
    setAdvertencia(null);
    const r = await api.cambiarEstado(solicitud.id, nuevo);
    setEnviando(false);
    if (r.ok) return alCambiar(r.datos);
    setAdvertencia(r.error); // p. ej. 409 si otro usuario ya cambió el estado.
    alFallar();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Estado actual: <InsigniaEstado estado={solicitud.estado} />
      </p>
      {advertencia && <Aviso tipo="advertencia">{advertencia}</Aviso>}
      {solicitud.transicionesPermitidas.length === 0 ? (
        <Aviso tipo="advertencia">Esta solicitud está en un estado final y ya no admite cambios.</Aviso>
      ) : (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Nuevo estado</legend>
          <div className="flex flex-wrap gap-3">
            {solicitud.transicionesPermitidas.map((e) => (
              <label key={e} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
                <input type="radio" name="nuevo-estado" value={e} checked={nuevo === e} onChange={() => setNuevo(e)} />
                {ETIQUETA_ESTADO[e]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex gap-2">
        <button type="button" className={claseBoton.primario} onClick={confirmar} disabled={!nuevo || enviando}>
          {enviando ? "Cambiando…" : "Confirmar cambio"}
        </button>
        <button type="button" className={claseBoton.secundario} onClick={alCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ConfirmarEliminar({
  solicitud,
  alCancelar,
  alEliminar,
}: {
  solicitud: SolicitudDTO;
  alCancelar: () => void;
  alEliminar: (mensaje: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function eliminar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    const r = await api.eliminar(solicitud.id);
    setEnviando(false);
    if (r.ok) alEliminar(r.datos.mensaje);
    else setError(r.error);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        ¿Eliminar la solicitud <strong className="font-mono">{solicitud.codigoSolicitud}</strong> de{" "}
        <strong>{solicitud.solicitante}</strong>? Dejará de mostrarse en el listado.
      </p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div className="flex gap-2">
        <button type="button" className={claseBoton.peligro} onClick={eliminar} disabled={enviando}>
          {enviando ? "Eliminando…" : "Sí, eliminar"}
        </button>
        <button type="button" className={claseBoton.secundario} onClick={alCancelar} disabled={enviando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
