// Ejecuta los casos CP-01 a CP-15 contra el servidor y escribe PRUEBAS.md con el resultado REAL.
// Uso: npm run dev (en otra terminal) y luego `npm run pruebas:cp`. BASE_URL opcional (p. ej. la URL de Vercel).
import { writeFileSync } from "node:fs";
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* la variable puede venir del entorno */
}

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API = `${BASE}/api`;
const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { prepare: false, max: 1, idle_timeout: 5 })
  : null;

const marca = Date.now().toString(36);
const PATRON = /^SOL-\d{8}-\d{3,}$/;

async function http(metodo, ruta, cuerpo) {
  const r = await fetch(ruta.startsWith("http") ? ruta : API + ruta, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    json = null;
  }
  return { status: r.status, json, texto };
}

const totalFilas = async () => (sql ? Number((await sql`select count(*)::int as n from solicitudes`)[0].n) : null);
const resumen = (r) => `${r.status} ${JSON.stringify(r.json ?? r.texto.slice(0, 80)).slice(0, 220)}`;

const resultados = [];
async function caso(id, titulo, esperado, fn) {
  const evidencia = [];
  const verificar = (condicion, descripcion) => {
    evidencia.push(`${condicion ? "✔" : "✘"} ${descripcion}`);
    if (!condicion) throw new Error(`Falló: ${descripcion}`);
  };
  try {
    await fn(verificar, evidencia);
    resultados.push({ id, titulo, esperado, estado: "APROBADO", evidencia });
  } catch (e) {
    evidencia.push(`Error: ${e instanceof Error ? e.message : String(e)}`);
    resultados.push({ id, titulo, esperado, estado: "RECHAZADO", evidencia });
  }
  console.log(`${resultados.at(-1).estado.padEnd(10)} ${id} ${titulo}`);
}

const valida = (extra = {}) => ({
  equipoId: 1,
  solicitante: `Prueba CP ${marca}`,
  descripcion: "El equipo no enciende al presionar el botón de encendido.",
  prioridad: "MEDIA",
  ...extra,
});

const ctx = {};

await caso("CP-01", "Registrar solicitud con datos válidos y equipo existente", "Se crea PENDIENTE, con código único y persistencia.", async (v, ev) => {
  const r = await http("POST", "/solicitudes", valida({ equipoId: 3, solicitante: `María Quispe ${marca}`, prioridad: "ALTA" }));
  ev.push(`POST /api/solicitudes → ${resumen(r)}`);
  v(r.status === 201, "HTTP 201");
  v(r.json.estado === "PENDIENTE", "estado = PENDIENTE");
  v(PATRON.test(r.json.codigoSolicitud), `código ${r.json.codigoSolicitud} con formato SOL-AAAAMMDD-XXX`);
  v(r.json.equipo.codigo === "EQ-003", "equipo EQ-003 asociado");
  ctx.id1 = r.json.id;
  ctx.codigo1 = r.json.codigoSolicitud;
  const otra = await http("POST", "/solicitudes", valida());
  v(otra.status === 201 && otra.json.codigoSolicitud !== ctx.codigo1, `segunda solicitud con código distinto (${otra.json?.codigoSolicitud})`);
  ctx.id2 = otra.json.id;
  const g = await http("GET", `/solicitudes/${ctx.id1}`);
  ev.push(`GET /api/solicitudes/${ctx.id1} → ${g.status}`);
  v(g.status === 200 && g.json.codigoSolicitud === ctx.codigo1, "persistida: GET por id devuelve el mismo código");
  if (sql) {
    const [fila] = await sql`select codigo_solicitud, estado, activo from solicitudes where id = ${ctx.id1}`;
    ev.push(`BD: ${JSON.stringify(fila)}`);
    v(fila?.estado === "PENDIENTE" && fila?.activo === true, "fila en BD con estado PENDIENTE y activo = true");
  }
});

await caso("CP-02", "Solicitante vacío o con menos de 3 caracteres", "El backend rechaza; no se guarda.", async (v, ev) => {
  const antes = await totalFilas();
  for (const solicitante of ["", "   ", "ab"]) {
    const r = await http("POST", "/solicitudes", valida({ solicitante }));
    ev.push(`POST solicitante=${JSON.stringify(solicitante)} → ${resumen(r)}`);
    v(r.status === 400 && r.json?.campos?.solicitante?.length > 0, `400 con mensaje en campo solicitante (${JSON.stringify(solicitante)})`);
  }
  const despues = await totalFilas();
  ev.push(`Filas en BD antes=${antes} después=${despues}`);
  v(antes === despues, "no se guardó ninguna fila");
});

await caso("CP-03", "Descripción vacía o con menos de 10 caracteres", "El backend rechaza; no se guarda.", async (v, ev) => {
  const antes = await totalFilas();
  for (const descripcion of ["", "corta", "  123456789  "]) {
    const r = await http("POST", "/solicitudes", valida({ descripcion }));
    ev.push(`POST descripcion=${JSON.stringify(descripcion)} → ${resumen(r)}`);
    v(r.status === 400 && r.json?.campos?.descripcion?.length > 0, `400 con mensaje en campo descripcion (${JSON.stringify(descripcion)})`);
  }
  const despues = await totalFilas();
  ev.push(`Filas en BD antes=${antes} después=${despues}`);
  v(antes === despues, "no se guardó ninguna fila");
});

await caso("CP-04", "Prioridad distinta de BAJA, MEDIA o ALTA", "El backend rechaza el valor.", async (v, ev) => {
  const antes = await totalFilas();
  for (const prioridad of ["URGENTE", "alta", ""]) {
    const r = await http("POST", "/solicitudes", valida({ prioridad }));
    ev.push(`POST prioridad=${JSON.stringify(prioridad)} → ${resumen(r)}`);
    v(r.status === 400 && r.json?.campos?.prioridad?.length > 0, `400 con mensaje en campo prioridad (${JSON.stringify(prioridad)})`);
  }
  v(antes === (await totalFilas()), "no se guardó ninguna fila");
});

await caso("CP-05", "Seleccionar equipo inexistente", "Rechaza; no crea solicitud huérfana.", async (v, ev) => {
  const antes = await totalFilas();
  const r = await http("POST", "/solicitudes", valida({ equipoId: 999999 }));
  ev.push(`POST equipoId=999999 → ${resumen(r)}`);
  v(r.status === 400 && r.json?.campos?.equipoId?.length > 0, "400 con mensaje en campo equipoId");
  const despues = await totalFilas();
  ev.push(`Filas en BD antes=${antes} después=${despues}`);
  v(antes === despues, "no se creó solicitud huérfana");
});

await caso("CP-06", "Editar una solicitud existente", "Se actualiza únicamente el registro seleccionado.", async (v, ev) => {
  const antes1 = (await http("GET", `/solicitudes/${ctx.id1}`)).json;
  const antes2 = (await http("GET", `/solicitudes/${ctx.id2}`)).json;
  const r = await http("PUT", `/solicitudes/${ctx.id1}`, {
    equipoId: 2,
    solicitante: `María Quispe Editada ${marca}`,
    descripcion: "Descripción corregida: el proyector parpadea y se apaga.",
    prioridad: "BAJA",
    estado: "RESUELTA",
    codigoSolicitud: "HACK-001",
    activo: false,
  });
  ev.push(`PUT /api/solicitudes/${ctx.id1} → ${resumen(r)}`);
  v(r.status === 200, "HTTP 200");
  v(r.json.equipo.codigo === "EQ-002" && r.json.prioridad === "BAJA" && r.json.solicitante.includes("Editada"), "campos editables actualizados");
  v(r.json.codigoSolicitud === antes1.codigoSolicitud, "código sin cambios (se ignoró codigoSolicitud enviado)");
  v(r.json.estado === antes1.estado, "estado sin cambios (se ignoró estado enviado)");
  v(r.json.fechaRegistro === antes1.fechaRegistro, "fecha_registro sin cambios");
  v(r.json.fechaActualizacion !== antes1.fechaActualizacion, "fecha_actualizacion actualizada");
  const despues2 = (await http("GET", `/solicitudes/${ctx.id2}`)).json;
  v(JSON.stringify(despues2) === JSON.stringify(antes2), `la otra solicitud (${antes2.codigoSolicitud}) no cambió`);
  const sigueActiva = await http("GET", `/solicitudes/${ctx.id1}`);
  v(sigueActiva.status === 200, "sigue activa (se ignoró activo=false)");
});

await caso("CP-07", "Cambiar PENDIENTE a EN_PROCESO", "Se acepta.", async (v, ev) => {
  const r = await http("PATCH", `/solicitudes/${ctx.id1}/estado`, { estado: "EN_PROCESO" });
  ev.push(`PATCH estado=EN_PROCESO → ${resumen(r)}`);
  v(r.status === 200 && r.json.estado === "EN_PROCESO", "200 y estado EN_PROCESO");
});

await caso("CP-08", "Cambiar RESUELTA a PENDIENTE", "Se rechaza y el estado no cambia.", async (v, ev) => {
  const a = await http("PATCH", `/solicitudes/${ctx.id1}/estado`, { estado: "RESUELTA" });
  ev.push(`Preparación PATCH estado=RESUELTA → ${a.status}`);
  v(a.status === 200 && a.json.estado === "RESUELTA", "preparación: EN_PROCESO → RESUELTA aceptada");
  const r = await http("PATCH", `/solicitudes/${ctx.id1}/estado`, { estado: "PENDIENTE" });
  ev.push(`PATCH estado=PENDIENTE → ${resumen(r)}`);
  v(r.status === 409, "HTTP 409");
  const g = await http("GET", `/solicitudes/${ctx.id1}`);
  v(g.json.estado === "RESUELTA", "el estado sigue siendo RESUELTA");
  const otra = await http("PATCH", `/solicitudes/${ctx.id2}/estado`, { estado: "RESUELTA" });
  ev.push(`Extra PENDIENTE → RESUELTA (salto) → ${otra.status}`);
  v(otra.status === 409, "saltar PENDIENTE → RESUELTA también da 409");
});

await caso("CP-09", "Eliminar lógicamente", "Desaparece del listado activo, pero permanece en la base.", async (v, ev) => {
  const r = await http("DELETE", `/solicitudes/${ctx.id2}`);
  ev.push(`DELETE /api/solicitudes/${ctx.id2} → ${resumen(r)}`);
  v(r.status === 200, "HTTP 200");
  const lista = await http("GET", `/solicitudes`);
  v(!lista.json.some((s) => s.id === ctx.id2), "no aparece en GET /api/solicitudes");
  const g = await http("GET", `/solicitudes/${ctx.id2}`);
  v(g.status === 404, "GET por id responde 404");
  const d = await http("DELETE", `/solicitudes/${ctx.id2}`);
  v(d.status === 404, "eliminarla otra vez responde 404");
  v(Boolean(sql), "hay conexión a la BD para verificar");
  const filas = await sql`select id, codigo_solicitud, activo from solicitudes where id = ${ctx.id2}`;
  ev.push(`BD: select id, codigo_solicitud, activo from solicitudes where id = ${ctx.id2} → ${JSON.stringify(filas)}`);
  v(filas.length === 1 && filas[0].activo === false, "la fila sigue en la BD con activo = false");
});

await caso("CP-10", "Buscar por solicitante/equipo y filtrar por prioridad/estado", "Solo coincidencias válidas.", async (v, ev) => {
  const token = `Zeta${marca}`;
  const c1 = await http("POST", "/solicitudes", valida({ equipoId: 4, solicitante: `Rocío ${token}`, prioridad: "ALTA" }));
  const c2 = await http("POST", "/solicitudes", valida({ equipoId: 2, solicitante: `Juan ${token}`, prioridad: "BAJA" }));
  const c3 = await http("POST", "/solicitudes", valida({ equipoId: 1, solicitante: `Pedro_100% ${marca}`, prioridad: "MEDIA" }));
  v([c1, c2, c3].every((c) => c.status === 201), "3 solicitudes de prueba creadas");
  await http("PATCH", `/solicitudes/${c2.json.id}/estado`, { estado: "EN_PROCESO" });

  const porSolicitante = await http("GET", `/solicitudes?q=${encodeURIComponent(token.toLowerCase())}`);
  ev.push(`q=${token.toLowerCase()} → ${porSolicitante.status}, ${porSolicitante.json.length} resultado(s)`);
  v(porSolicitante.json.length === 2 && porSolicitante.json.every((s) => s.solicitante.includes(token)), "búsqueda por solicitante sin distinguir mayúsculas: 2 coincidencias exactas");

  const porEquipo = await http("GET", `/solicitudes?q=IMPRESORA`);
  ev.push(`q=IMPRESORA → ${porEquipo.json.length} resultado(s)`);
  v(porEquipo.json.length >= 1 && porEquipo.json.every((s) => /impresora/i.test(`${s.equipo.nombre} ${s.solicitante} ${s.codigoSolicitud}`)), "búsqueda por nombre de equipo: todas contienen 'impresora'");
  v(porEquipo.json.some((s) => s.id === c1.json.id), "incluye la solicitud de la impresora");

  const porCodigo = await http("GET", `/solicitudes?q=${encodeURIComponent(c3.json.codigoSolicitud)}`);
  v(porCodigo.json.length === 1 && porCodigo.json[0].id === c3.json.id, "búsqueda por código exacto devuelve solo esa solicitud");

  const alta = await http("GET", `/solicitudes?prioridad=ALTA&q=${token}`);
  v(alta.json.length === 1 && alta.json[0].prioridad === "ALTA", "filtro prioridad=ALTA + búsqueda: solo la de ALTA");

  const enProceso = await http("GET", `/solicitudes?estado=EN_PROCESO`);
  ev.push(`estado=EN_PROCESO → ${enProceso.json.length} resultado(s)`);
  v(enProceso.json.length >= 1 && enProceso.json.every((s) => s.estado === "EN_PROCESO"), "filtro estado: todas EN_PROCESO");

  const ninguna = await http("GET", `/solicitudes?q=${token}&estado=RESUELTA`);
  v(ninguna.json.length === 0, "combinación sin coincidencias devuelve lista vacía");

  const comodin = await http("GET", `/solicitudes?q=${encodeURIComponent("o_1")}`);
  v(comodin.json.every((s) => `${s.codigoSolicitud} ${s.solicitante} ${s.equipo.nombre}`.toLowerCase().includes("o_1")), "'_' se busca literal (no actúa como comodín)");
  const porcentaje = await http("GET", `/solicitudes?q=${encodeURIComponent("100%")}`);
  v(porcentaje.json.some((s) => s.id === c3.json.id) && porcentaje.json.every((s) => s.solicitante.includes("100%") || s.equipo.nombre.includes("100%")), "'%' se busca literal");

  const orden = await http("GET", `/solicitudes`);
  const fechas = orden.json.map((s) => s.fechaRegistro);
  v(fechas.every((f, i) => i === 0 || fechas[i - 1] >= f), "ordenado por fecha_registro descendente");

  const malFiltro = await http("GET", `/solicitudes?prioridad=URGENTE`);
  v(malFiltro.status === 400, "filtro con valor inválido responde 400");
});

await caso("CP-11", "Consultar o editar un ID inexistente", "Informa que no existe; sin error no controlado.", async (v, ev) => {
  const g = await http("GET", `/solicitudes/999999`);
  ev.push(`GET /api/solicitudes/999999 → ${resumen(g)}`);
  v(g.status === 404 && typeof g.json?.error === "string", "GET → 404 con mensaje JSON");
  const p = await http("PUT", `/solicitudes/999999`, valida());
  ev.push(`PUT /api/solicitudes/999999 → ${resumen(p)}`);
  v(p.status === 404, "PUT → 404");
  const e = await http("PATCH", `/solicitudes/999999/estado`, { estado: "EN_PROCESO" });
  v(e.status === 404, "PATCH estado → 404");
  const d = await http("DELETE", `/solicitudes/999999`);
  v(d.status === 404, "DELETE → 404");
});

await caso("CP-12", "Recargar la aplicación después de registrar", "Los datos siguen disponibles desde la base.", async (v, ev) => {
  const pagina = await http("GET", `${BASE}/`);
  ev.push(`GET / → ${pagina.status}`);
  v(pagina.status === 200 && pagina.texto.includes("LabCare"), "la página principal carga (200)");
  const lista = await http("GET", `/solicitudes`);
  v(lista.json.some((s) => s.codigoSolicitud === ctx.codigo1), `nueva petición al listado contiene ${ctx.codigo1}`);
  if (sql) {
    const [fila] = await sql`select codigo_solicitud, estado from solicitudes where id = ${ctx.id1}`;
    ev.push(`BD (conexión independiente del servidor): ${JSON.stringify(fila)}`);
    v(fila?.codigo_solicitud === ctx.codigo1, "el registro está en PostgreSQL (no en memoria del servidor)");
  }
});

await caso("CP-13", "Estado inicial forzado a PENDIENTE (extra)", "Aunque el cliente envíe otro estado, se crea PENDIENTE.", async (v, ev) => {
  const r = await http("POST", "/solicitudes", valida({ estado: "RESUELTA", activo: false, codigoSolicitud: "SOL-HACK" }));
  ev.push(`POST con estado=RESUELTA → ${resumen(r)}`);
  v(r.status === 201 && r.json.estado === "PENDIENTE", "201 y estado PENDIENTE");
  v(PATRON.test(r.json.codigoSolicitud), "código generado por el servidor");
  ctx.id13 = r.json.id;
});

await caso("CP-14", "ID inválido en la ruta (extra)", "Responde 404 sin error interno.", async (v, ev) => {
  for (const id of ["abc", "0", "-1", "1.5", "99999999999", "1%20OR%201=1"]) {
    const r = await http("GET", `/solicitudes/${id}`);
    ev.push(`GET /api/solicitudes/${id} → ${r.status}`);
    v(r.status === 404, `id "${decodeURIComponent(id)}" → 404`);
  }
  const malJson = await fetch(`${API}/solicitudes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{malo" });
  ev.push(`POST con JSON mal formado → ${malJson.status}`);
  v(malJson.status === 400, "JSON mal formado → 400");
});

await caso("CP-15", "Editar una solicitud en estado final (RESUELTA o CANCELADA)", "Se rechaza con 409 y la solicitud no cambia.", async (v, ev) => {
  const edicion = valida({ equipoId: 4, solicitante: "Intento de edición", prioridad: "ALTA" });

  const antes = (await http("GET", `/solicitudes/${ctx.id1}`)).json;
  v(antes.estado === "RESUELTA", `preparación: ${antes.codigoSolicitud} está RESUELTA (desde CP-08)`);
  const r = await http("PUT", `/solicitudes/${ctx.id1}`, edicion);
  ev.push(`PUT /api/solicitudes/${ctx.id1} (RESUELTA) → ${resumen(r)}`);
  v(r.status === 409, "HTTP 409");
  v(r.json?.error === "No se puede editar una solicitud resuelta o cancelada", "mensaje exacto del servidor");
  const despues = (await http("GET", `/solicitudes/${ctx.id1}`)).json;
  v(JSON.stringify(despues) === JSON.stringify(antes), "la solicitud RESUELTA no cambió");

  const c = await http("POST", "/solicitudes", valida({ solicitante: `Para cancelar ${marca}` }));
  const cancelada = await http("PATCH", `/solicitudes/${c.json.id}/estado`, { estado: "CANCELADA" });
  v(cancelada.status === 200 && cancelada.json.estado === "CANCELADA", "preparación: solicitud nueva pasada a CANCELADA");
  v(cancelada.json.editable === false, "la API la marca editable = false (la interfaz deshabilita Editar)");
  const r2 = await http("PUT", `/solicitudes/${c.json.id}`, edicion);
  ev.push(`PUT /api/solicitudes/${c.json.id} (CANCELADA) → ${resumen(r2)}`);
  v(r2.status === 409 && r2.json?.error === "No se puede editar una solicitud resuelta o cancelada", "CANCELADA también responde 409 con el mismo mensaje");
  const despues2 = (await http("GET", `/solicitudes/${c.json.id}`)).json;
  v(despues2.solicitante === c.json.solicitante && despues2.prioridad === c.json.prioridad, "la solicitud CANCELADA no cambió");
  ctx.id15 = c.json.id;
});

// Limpieza: las solicitudes de prueba quedan eliminadas lógicamente (nunca se borran físicamente).
for (const id of [ctx.id13].filter(Boolean)) await http("DELETE", `/solicitudes/${id}`);
if (sql) await sql.end();

const fecha = new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "short", timeStyle: "medium" }).format(new Date());
const aprobados = resultados.filter((r) => r.estado === "APROBADO").length;
const esc = (t) => String(t).replace(/\|/g, "\\|");

const md = `# PRUEBAS — LabCare

Resultados **reales** generados automáticamente por \`pruebas/ejecutar-cp.mjs\` (no editados a mano).

- Fecha de ejecución: ${fecha} (America/La_Paz)
- Servidor probado: \`${BASE}\`
- Base de datos: PostgreSQL (Supabase)${sql ? "" : " — **sin conexión directa: verificaciones de BD omitidas**"}
- Resultado: **${aprobados} de ${resultados.length} APROBADOS**

Cómo reproducir: \`npm run dev\` en una terminal y \`npm run pruebas:cp\` en otra (o \`BASE_URL=https://... npm run pruebas:cp\`).
La misma matriz está en \`pruebas/LabCare.postman_collection.json\`. Los resultados de esta página provienen del script; la colección de Postman en sí **no fue ejecutada en Postman** por este script (ejecutarla con el Collection Runner, en orden).

Nota CP-12: la "recarga" se verifica con peticiones HTTP nuevas y una consulta directa a PostgreSQL desde una conexión independiente del servidor. La prueba visual (registrar en la interfaz y pulsar F5) es un complemento manual.

## Matriz

| ID | Caso | Resultado esperado | Estado | Respuesta HTTP obtenida |
|---|---|---|---|---|
${resultados
  .map((r) => {
    // Todos los códigos HTTP registrados en la evidencia, en orden y sin repetir.
    const codigos = [...new Set(r.evidencia.flatMap((e) => [...e.matchAll(/→ (\d{3})/g)].map((m) => m[1])))];
    return `| ${r.id} | ${esc(r.titulo)} | ${esc(r.esperado)} | **${r.estado}** | ${codigos.join(" / ") || "—"} |`;
  })
  .join("\n")}

## Evidencia por caso

${resultados
  .map((r) => `### ${r.id} — ${r.titulo}: ${r.estado}\n\n\`\`\`text\n${r.evidencia.join("\n")}\n\`\`\``)
  .join("\n\n")}
`;

writeFileSync("PRUEBAS.md", md);
console.log(`\n${aprobados}/${resultados.length} aprobados. PRUEBAS.md actualizado.`);
process.exit(aprobados === resultados.length ? 0 : 1);
