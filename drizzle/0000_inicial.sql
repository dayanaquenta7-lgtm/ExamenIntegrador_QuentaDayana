CREATE TABLE "equipos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"ubicacion" varchar(100) NOT NULL,
	"estado" varchar(20) DEFAULT 'OPERATIVO' NOT NULL,
	CONSTRAINT "equipos_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "equipos_estado_check" CHECK ("equipos"."estado" IN ('OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO'))
);
--> statement-breakpoint
ALTER TABLE "equipos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "solicitudes" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo_solicitud" varchar(20) NOT NULL,
	"equipo_id" integer NOT NULL,
	"solicitante" varchar(100) NOT NULL,
	"descripcion" text NOT NULL,
	"prioridad" varchar(5) NOT NULL,
	"estado" varchar(12) DEFAULT 'PENDIENTE' NOT NULL,
	"fecha_registro" timestamp with time zone DEFAULT now() NOT NULL,
	"fecha_actualizacion" timestamp with time zone DEFAULT now() NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "solicitudes_codigo_solicitud_unique" UNIQUE("codigo_solicitud"),
	CONSTRAINT "solicitudes_prioridad_check" CHECK ("solicitudes"."prioridad" IN ('BAJA', 'MEDIA', 'ALTA')),
	CONSTRAINT "solicitudes_estado_check" CHECK ("solicitudes"."estado" IN ('PENDIENTE', 'EN_PROCESO', 'RESUELTA', 'CANCELADA')),
	CONSTRAINT "solicitudes_solicitante_check" CHECK (char_length(btrim("solicitudes"."solicitante")) >= 3),
	CONSTRAINT "solicitudes_descripcion_check" CHECK (char_length(btrim("solicitudes"."descripcion")) >= 10)
);
--> statement-breakpoint
ALTER TABLE "solicitudes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "solicitudes_fecha_registro_idx" ON "solicitudes" USING btree ("fecha_registro" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "solicitudes_equipo_id_idx" ON "solicitudes" USING btree ("equipo_id");