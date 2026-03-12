CREATE TYPE "public"."employee_user_audit_log_events" AS ENUM('auth:login', 'auth:logout');--> statement-breakpoint
CREATE TYPE "public"."employee_user_roles" AS ENUM('admin', 'manager', 'supervisor', 'officer');--> statement-breakpoint
CREATE TABLE "employee_user_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"event" "employee_user_audit_log_events" NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "employee_user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supervisor_id" uuid,
	"role" "employee_user_roles" NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "employee_user_audit_logs" ADD CONSTRAINT "employee_user_audit_logs_user_id_employee_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employee_users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "employee_user_sessions" ADD CONSTRAINT "employee_user_sessions_user_id_employee_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."employee_users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "employee_users" ADD CONSTRAINT "employee_users_supervisor_id_employee_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employee_users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "employee_users" ADD CONSTRAINT "employee_users_created_by_employee_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."employee_users"("id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "employee_users" ADD CONSTRAINT "employee_users_deleted_by_employee_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."employee_users"("id") ON DELETE restrict ON UPDATE restrict;