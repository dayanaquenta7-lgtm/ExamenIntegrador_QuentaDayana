import { defineConfig } from "drizzle-kit";

// drizzle-kit no carga .env.local como Next.js; se carga con la API nativa de Node.
try {
  process.loadEnvFile(".env.local");
} catch {
  // En CI/Vercel la variable ya viene del entorno.
}

export default defineConfig({
  schema: "./src/modelos/esquema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
