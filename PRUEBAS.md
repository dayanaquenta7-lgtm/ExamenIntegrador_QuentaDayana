# PRUEBAS — LabCare

Resultados **reales** generados automáticamente por `pruebas/ejecutar-cp.mjs` (no editados a mano).

- Fecha de ejecución: 23/11/26, 11:41:13 a. m. (America/La_Paz)
- Servidor probado: `http://localhost:3000`
- Base de datos: PostgreSQL (Supabase)
- Resultado: **15 de 15 APROBADOS**

Cómo reproducir: `npm run dev` en una terminal y `npm run pruebas:cp` en otra (o `BASE_URL=https://... npm run pruebas:cp`).
La misma matriz está en `pruebas/LabCare.postman_collection.json`. Los resultados de esta página provienen del script; la colección de Postman en sí **no fue ejecutada en Postman** por este script (ejecutarla con el Collection Runner, en orden).

Nota CP-12: la "recarga" se verifica con peticiones HTTP nuevas y una consulta directa a PostgreSQL desde una conexión independiente del servidor. La prueba visual (registrar en la interfaz y pulsar F5) es un complemento manual.

## Matriz

| ID | Caso | Resultado esperado | Estado | Respuesta HTTP obtenida |
|---|---|---|---|---|
| CP-01 | Registrar solicitud con datos válidos y equipo existente | Se crea PENDIENTE, con código único y persistencia. | **APROBADO** | 201 / 200 |
| CP-02 | Solicitante vacío o con menos de 3 caracteres | El backend rechaza; no se guarda. | **APROBADO** | 400 |
| CP-03 | Descripción vacía o con menos de 10 caracteres | El backend rechaza; no se guarda. | **APROBADO** | 400 |
| CP-04 | Prioridad distinta de BAJA, MEDIA o ALTA | El backend rechaza el valor. | **APROBADO** | 400 |
| CP-05 | Seleccionar equipo inexistente | Rechaza; no crea solicitud huérfana. | **APROBADO** | 400 |
| CP-06 | Editar una solicitud existente | Se actualiza únicamente el registro seleccionado. | **APROBADO** | 200 |
| CP-07 | Cambiar PENDIENTE a EN_PROCESO | Se acepta. | **APROBADO** | 200 |
| CP-08 | Cambiar RESUELTA a PENDIENTE | Se rechaza y el estado no cambia. | **APROBADO** | 200 / 409 |
| CP-09 | Eliminar lógicamente | Desaparece del listado activo, pero permanece en la base. | **APROBADO** | 200 |
| CP-10 | Buscar por solicitante/equipo y filtrar por prioridad/estado | Solo coincidencias válidas. | **APROBADO** | 200 |
| CP-11 | Consultar o editar un ID inexistente | Informa que no existe; sin error no controlado. | **APROBADO** | 404 |
| CP-12 | Recargar la aplicación después de registrar | Los datos siguen disponibles desde la base. | **APROBADO** | 200 |
| CP-13 | Estado inicial forzado a PENDIENTE (extra) | Aunque el cliente envíe otro estado, se crea PENDIENTE. | **APROBADO** | 201 |
| CP-14 | ID inválido en la ruta (extra) | Responde 404 sin error interno. | **APROBADO** | 404 / 400 |
| CP-15 | Editar una solicitud en estado final (RESUELTA o CANCELADA) | Se rechaza con 409 y la solicitud no cambia. | **APROBADO** | 409 |

## Evidencia por caso

### CP-01 — Registrar solicitud con datos válidos y equipo existente: APROBADO

```text
POST /api/solicitudes → 201 {"id":27,"codigoSolicitud":"SOL-20261123-027","solicitante":"María Quispe mwtfn13r","descripcion":"El equipo no enciende al presionar el botón de encendido.","prioridad":"ALTA","estado":"PENDIENTE","fechaRegistro":"2026-
✔ HTTP 201
✔ estado = PENDIENTE
✔ código SOL-20261123-027 con formato SOL-AAAAMMDD-XXX
✔ equipo EQ-003 asociado
✔ segunda solicitud con código distinto (SOL-20261123-028)
GET /api/solicitudes/27 → 200
✔ persistida: GET por id devuelve el mismo código
BD: {"codigo_solicitud":"SOL-20261123-027","estado":"PENDIENTE","activo":true}
✔ fila en BD con estado PENDIENTE y activo = true
```

### CP-02 — Solicitante vacío o con menos de 3 caracteres: APROBADO

```text
POST solicitante="" → 400 {"error":"Los datos enviados no son válidos.","campos":{"solicitante":["El solicitante debe tener al menos 3 caracteres."]}}
✔ 400 con mensaje en campo solicitante ("")
POST solicitante="   " → 400 {"error":"Los datos enviados no son válidos.","campos":{"solicitante":["El solicitante debe tener al menos 3 caracteres."]}}
✔ 400 con mensaje en campo solicitante ("   ")
POST solicitante="ab" → 400 {"error":"Los datos enviados no son válidos.","campos":{"solicitante":["El solicitante debe tener al menos 3 caracteres."]}}
✔ 400 con mensaje en campo solicitante ("ab")
Filas en BD antes=28 después=28
✔ no se guardó ninguna fila
```

### CP-03 — Descripción vacía o con menos de 10 caracteres: APROBADO

```text
POST descripcion="" → 400 {"error":"Los datos enviados no son válidos.","campos":{"descripcion":["La descripción debe tener al menos 10 caracteres."]}}
✔ 400 con mensaje en campo descripcion ("")
POST descripcion="corta" → 400 {"error":"Los datos enviados no son válidos.","campos":{"descripcion":["La descripción debe tener al menos 10 caracteres."]}}
✔ 400 con mensaje en campo descripcion ("corta")
POST descripcion="  123456789  " → 400 {"error":"Los datos enviados no son válidos.","campos":{"descripcion":["La descripción debe tener al menos 10 caracteres."]}}
✔ 400 con mensaje en campo descripcion ("  123456789  ")
Filas en BD antes=28 después=28
✔ no se guardó ninguna fila
```

### CP-04 — Prioridad distinta de BAJA, MEDIA o ALTA: APROBADO

```text
POST prioridad="URGENTE" → 400 {"error":"Los datos enviados no son válidos.","campos":{"prioridad":["La prioridad debe ser BAJA, MEDIA o ALTA."]}}
✔ 400 con mensaje en campo prioridad ("URGENTE")
POST prioridad="alta" → 400 {"error":"Los datos enviados no son válidos.","campos":{"prioridad":["La prioridad debe ser BAJA, MEDIA o ALTA."]}}
✔ 400 con mensaje en campo prioridad ("alta")
POST prioridad="" → 400 {"error":"Los datos enviados no son válidos.","campos":{"prioridad":["La prioridad debe ser BAJA, MEDIA o ALTA."]}}
✔ 400 con mensaje en campo prioridad ("")
✔ no se guardó ninguna fila
```

### CP-05 — Seleccionar equipo inexistente: APROBADO

```text
POST equipoId=999999 → 400 {"error":"Los datos enviados no son válidos.","campos":{"equipoId":["El equipo seleccionado no existe."]}}
✔ 400 con mensaje en campo equipoId
Filas en BD antes=28 después=28
✔ no se creó solicitud huérfana
```

### CP-06 — Editar una solicitud existente: APROBADO

```text
PUT /api/solicitudes/27 → 200 {"id":27,"codigoSolicitud":"SOL-20261123-027","solicitante":"María Quispe Editada mwtfn13r","descripcion":"Descripción corregida: el proyector parpadea y se apaga.","prioridad":"BAJA","estado":"PENDIENTE","fechaRegistro"
✔ HTTP 200
✔ campos editables actualizados
✔ código sin cambios (se ignoró codigoSolicitud enviado)
✔ estado sin cambios (se ignoró estado enviado)
✔ fecha_registro sin cambios
✔ fecha_actualizacion actualizada
✔ la otra solicitud (SOL-20261123-028) no cambió
✔ sigue activa (se ignoró activo=false)
```

### CP-07 — Cambiar PENDIENTE a EN_PROCESO: APROBADO

```text
PATCH estado=EN_PROCESO → 200 {"id":27,"codigoSolicitud":"SOL-20261123-027","solicitante":"María Quispe Editada mwtfn13r","descripcion":"Descripción corregida: el proyector parpadea y se apaga.","prioridad":"BAJA","estado":"EN_PROCESO","fechaRegistro
✔ 200 y estado EN_PROCESO
```

### CP-08 — Cambiar RESUELTA a PENDIENTE: APROBADO

```text
Preparación PATCH estado=RESUELTA → 200
✔ preparación: EN_PROCESO → RESUELTA aceptada
PATCH estado=PENDIENTE → 409 {"error":"No se puede cambiar de RESUELTA a PENDIENTE. RESUELTA es un estado final."}
✔ HTTP 409
✔ el estado sigue siendo RESUELTA
Extra PENDIENTE → RESUELTA (salto) → 409
✔ saltar PENDIENTE → RESUELTA también da 409
```

### CP-09 — Eliminar lógicamente: APROBADO

```text
DELETE /api/solicitudes/28 → 200 {"mensaje":"Solicitud SOL-20261123-028 eliminada.","id":28,"codigoSolicitud":"SOL-20261123-028"}
✔ HTTP 200
✔ no aparece en GET /api/solicitudes
✔ GET por id responde 404
✔ eliminarla otra vez responde 404
✔ hay conexión a la BD para verificar
BD: select id, codigo_solicitud, activo from solicitudes where id = 28 → [{"id":28,"codigo_solicitud":"SOL-20261123-028","activo":false}]
✔ la fila sigue en la BD con activo = false
```

### CP-10 — Buscar por solicitante/equipo y filtrar por prioridad/estado: APROBADO

```text
✔ 3 solicitudes de prueba creadas
q=zetamwtfn13r → 200, 2 resultado(s)
✔ búsqueda por solicitante sin distinguir mayúsculas: 2 coincidencias exactas
q=IMPRESORA → 5 resultado(s)
✔ búsqueda por nombre de equipo: todas contienen 'impresora'
✔ incluye la solicitud de la impresora
✔ búsqueda por código exacto devuelve solo esa solicitud
✔ filtro prioridad=ALTA + búsqueda: solo la de ALTA
estado=EN_PROCESO → 5 resultado(s)
✔ filtro estado: todas EN_PROCESO
✔ combinación sin coincidencias devuelve lista vacía
✔ '_' se busca literal (no actúa como comodín)
✔ '%' se busca literal
✔ ordenado por fecha_registro descendente
✔ filtro con valor inválido responde 400
```

### CP-11 — Consultar o editar un ID inexistente: APROBADO

```text
GET /api/solicitudes/999999 → 404 {"error":"La solicitud no existe."}
✔ GET → 404 con mensaje JSON
PUT /api/solicitudes/999999 → 404 {"error":"La solicitud no existe."}
✔ PUT → 404
✔ PATCH estado → 404
✔ DELETE → 404
```

### CP-12 — Recargar la aplicación después de registrar: APROBADO

```text
GET / → 200
✔ la página principal carga (200)
✔ nueva petición al listado contiene SOL-20261123-027
BD (conexión independiente del servidor): {"codigo_solicitud":"SOL-20261123-027","estado":"RESUELTA"}
✔ el registro está en PostgreSQL (no en memoria del servidor)
```

### CP-13 — Estado inicial forzado a PENDIENTE (extra): APROBADO

```text
POST con estado=RESUELTA → 201 {"id":32,"codigoSolicitud":"SOL-20261123-032","solicitante":"Prueba CP mwtfn13r","descripcion":"El equipo no enciende al presionar el botón de encendido.","prioridad":"MEDIA","estado":"PENDIENTE","fechaRegistro":"2026-11
✔ 201 y estado PENDIENTE
✔ código generado por el servidor
```

### CP-14 — ID inválido en la ruta (extra): APROBADO

```text
GET /api/solicitudes/abc → 404
✔ id "abc" → 404
GET /api/solicitudes/0 → 404
✔ id "0" → 404
GET /api/solicitudes/-1 → 404
✔ id "-1" → 404
GET /api/solicitudes/1.5 → 404
✔ id "1.5" → 404
GET /api/solicitudes/99999999999 → 404
✔ id "99999999999" → 404
GET /api/solicitudes/1%20OR%201=1 → 404
✔ id "1 OR 1=1" → 404
POST con JSON mal formado → 400
✔ JSON mal formado → 400
```

### CP-15 — Editar una solicitud en estado final (RESUELTA o CANCELADA): APROBADO

```text
✔ preparación: SOL-20261123-027 está RESUELTA (desde CP-08)
PUT /api/solicitudes/27 (RESUELTA) → 409 {"error":"No se puede editar una solicitud resuelta o cancelada"}
✔ HTTP 409
✔ mensaje exacto del servidor
✔ la solicitud RESUELTA no cambió
✔ preparación: solicitud nueva pasada a CANCELADA
✔ la API la marca editable = false (la interfaz deshabilita Editar)
PUT /api/solicitudes/33 (CANCELADA) → 409 {"error":"No se puede editar una solicitud resuelta o cancelada"}
✔ CANCELADA también responde 409 con el mismo mensaje
✔ la solicitud CANCELADA no cambió
```
