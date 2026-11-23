import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabCare — Solicitudes de mantenimiento",
  description: "Registro y seguimiento de solicitudes de mantenimiento de equipos de laboratorio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
