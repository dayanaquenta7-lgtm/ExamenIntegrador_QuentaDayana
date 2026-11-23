# LabCare: módulo de solicitudes de mantenimiento

Aplicación web para registrar y dar seguimiento a las solicitudes de mantenimiento de los equipos de laboratorio (computadoras, proyectores, routers, impresoras).

Examen integrador de Desarrollo de Sistemas II. Autora: Dayana Quenta.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript estricto |
| Estilos | Tailwind CSS 4 |
| Base de datos | PostgreSQL (Supabase) |
| ORM / migraciones | Drizzle ORM + drizzle-kit, driver `postgres` |
| Validación | Zod 4 |
| Pruebas | Vitest (unitarias), script de API (CP-01 a CP-15), colección Postman |
| Despliegue | Vercel |

## Arquitectura (MVC / API)

```
src/
├── modelos/        Modelo: esquema Drizzle (equipos, solicitudes), conexión y semilla
├── servicios/      Lógica de negocio sin Next.js: validaciones Zod, código, transiciones, CRUD
├── app/api/        Controladores: Route Handlers REST
├── app/page.tsx    Vista: pantalla principal
└── componentes/    Vista: formulario, listado, diálogos (consumen la API con fetch)
drizzle/            Migraciones generadas por drizzle-kit
database/script.sql Script SQL equivalente (tablas, restricciones y semilla)
pruebas/            Colección Postman y script de casos CP
```

## Requisitos

- Node.js 20.9 o superior (probado con Node 24) y npm.
- Una base PostgreSQL. Se recomienda un proyecto de [Supabase](https://supabase.com).

## Instalación y ejecución local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar la conexión
cp .env.example .env.local
#    Editar .env.local y poner en DATABASE_URL la cadena de Supabase:
#    Project Settings → Database → Connection string → "Session pooler" (puerto 5432)

# 3. Crear las tablas (aplica drizzle/0000_inicial.sql)
npm run db:migrate

# 4. Cargar los 4 equipos de la semilla (idempotente)
npm run db:seed

# 5. Ejecutar
npm run dev        # http://localhost:3000
```

**Alternativa sin drizzle-kit:** ejecutar `database/script.sql` en el SQL Editor de Supabase. Crea las tablas, las restricciones y la semilla. Usar una sola de las dos opciones: si se ejecuta el script, no correr `db:migrate` sobre la misma base.

### Verificación

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Vitest: validaciones, código y transiciones
npm run build       # build de producción
npm run pruebas:cp  # con el servidor levantado: ejecuta CP-01 a CP-15 y regenera PRUEBAS.md
```

## Despliegue en Vercel

1. Subir el repositorio a GitHub.
2. En Vercel: **Add New → Project → Import** el repositorio. El framework se detecta solo (Next.js); no hace falta cambiar los comandos de build.
3. En **Settings → Environment Variables** agregar `DATABASE_URL` (Production y Preview). Se recomienda el **Transaction pooler** de Supabase (puerto 6543), porque en un entorno serverless cada función abre su propia conexión. El código ya es compatible: usa `prepare: false`.
4. **Deploy**. Las migraciones no se ejecutan en el build: se aplican una vez desde la máquina local (`npm run db:migrate` y `npm run db:seed`) contra la misma base.
5. Probar el despliegue: `BASE_URL=https://<proyecto>.vercel.app npm run pruebas:cp`.

## Funcionalidades

- Registro con equipo (select cargado desde la API), solicitante, descripción y prioridad.
- Código automático `SOL-AAAAMMDD-XXX` (correlativo diario en hora de Bolivia, con reintento si hay colisión).
- Estado inicial siempre `PENDIENTE`.
- Listado con código, equipo, solicitante, prioridad, estado y fecha, ordenado del más reciente al más antiguo.
- Búsqueda sin distinguir mayúsculas por código, solicitante o equipo. Los caracteres `%` y `_` se buscan como texto literal.
- Filtros por prioridad y estado.
- Ver detalle, editar (deshabilitado para solicitudes resueltas o canceladas; el servidor responde 409), cambiar estado (solo ofrece las transiciones permitidas y muestra la advertencia del servidor si la rechaza) y eliminar con confirmación (eliminación lógica).
- Mensajes de éxito solo después de la respuesta del servidor; botones deshabilitados mientras se envía.

## Endpoints

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| GET | `/api/equipos` | Lista de equipos | 200 |
| GET | `/api/solicitudes?q=&prioridad=&estado=` | Listado activo con búsqueda y filtros | 200, 400 |
| POST | `/api/solicitudes` | Registrar solicitud | 201, 400 |
| GET | `/api/solicitudes/{id}` | Detalle | 200, 404 |
| PUT | `/api/solicitudes/{id}` | Editar (equipo, solicitante, descripción, prioridad); 409 si está RESUELTA o CANCELADA | 200, 400, 404, 409 |
| DELETE | `/api/solicitudes/{id}` | Eliminación lógica | 200, 404 |
| PATCH | `/api/solicitudes/{id}/estado` | Cambiar estado `{ "estado": "EN_PROCESO" }` | 200, 400, 404, 409 |

Ejemplo de registro:

```http
POST /api/solicitudes
Content-Type: application/json

{ "equipoId": 1, "solicitante": "Ana Pérez", "descripcion": "El equipo no enciende.", "prioridad": "ALTA" }
```

Ejemplo de error de validación (400):

```json
{ "error": "Los datos enviados no son válidos.", "campos": { "solicitante": ["El solicitante debe tener al menos 3 caracteres."] } }
```

## Documentación

- [ANALISIS.md](ANALISIS.md): actor, problema, alcance, RF, reglas de negocio, casos de uso y diagrama C4.
- [PRUEBAS.md](PRUEBAS.md): resultados reales de CP-01 a CP-15.
- [REGISTRO_IA.md](REGISTRO_IA.md): uso de herramientas de IA.
