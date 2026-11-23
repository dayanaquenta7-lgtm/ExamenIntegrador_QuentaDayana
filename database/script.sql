-- LabCare: módulo de solicitudes de mantenimiento
-- Script equivalente a la migración drizzle/0000_inicial.sql + semilla.
-- PostgreSQL 15+. No contiene credenciales.

BEGIN;

CREATE TABLE IF NOT EXISTS equipos (
  id         SERIAL       PRIMARY KEY,
  codigo     VARCHAR(20)  NOT NULL,
  nombre     VARCHAR(100) NOT NULL,
  ubicacion  VARCHAR(100) NOT NULL,
  estado     VARCHAR(20)  NOT NULL DEFAULT 'OPERATIVO',
  CONSTRAINT equipos_codigo_unique UNIQUE (codigo),
  CONSTRAINT equipos_estado_check CHECK (estado IN ('OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'))
);

CREATE TABLE IF NOT EXISTS solicitudes (
  id                  SERIAL       PRIMARY KEY,
  codigo_solicitud    VARCHAR(20)  NOT NULL,
  equipo_id           INTEGER      NOT NULL,
  solicitante         VARCHAR(100) NOT NULL,
  descripcion         TEXT         NOT NULL,
  prioridad           VARCHAR(5)   NOT NULL,
  estado              VARCHAR(12)  NOT NULL DEFAULT 'PENDIENTE',
  fecha_registro      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ  NOT NULL DEFAULT now(),
  activo              BOOLEAN      NOT NULL DEFAULT true,
  CONSTRAINT solicitudes_codigo_solicitud_unique UNIQUE (codigo_solicitud),
  CONSTRAINT solicitudes_equipo_id_equipos_id_fk FOREIGN KEY (equipo_id)
    REFERENCES equipos (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT solicitudes_prioridad_check CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA')),
  CONSTRAINT solicitudes_estado_check CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'RESUELTA', 'CANCELADA')),
  CONSTRAINT solicitudes_solicitante_check CHECK (char_length(btrim(solicitante)) >= 3),
  CONSTRAINT solicitudes_descripcion_check CHECK (char_length(btrim(descripcion)) >= 10)
);

CREATE INDEX IF NOT EXISTS solicitudes_fecha_registro_idx ON solicitudes (fecha_registro DESC);
CREATE INDEX IF NOT EXISTS solicitudes_equipo_id_idx ON solicitudes (equipo_id);

-- RLS activado sin políticas: la API pública de Supabase (anon) no puede leer ni escribir;
-- la aplicación se conecta con el rol dueño de las tablas.
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;

-- Semilla
INSERT INTO equipos (codigo, nombre, ubicacion, estado) VALUES
  ('EQ-001', 'Computadora de escritorio', 'Laboratorio 1', 'OPERATIVO'),
  ('EQ-002', 'Proyector multimedia', 'Aula 204', 'OPERATIVO'),
  ('EQ-003', 'Router de laboratorio', 'Laboratorio de Redes', 'OPERATIVO'),
  ('EQ-004', 'Impresora de oficina', 'Secretaría', 'OPERATIVO')
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
