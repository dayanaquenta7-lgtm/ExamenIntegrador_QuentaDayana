import { PanelSolicitudes } from "@/componentes/panel-solicitudes";

export default function Inicio() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">LabCare · Solicitudes de mantenimiento</h1>
        <p className="text-sm text-slate-600">Registro y seguimiento de fallas de equipos de laboratorio.</p>
      </header>
      <PanelSolicitudes />
    </main>
  );
}
