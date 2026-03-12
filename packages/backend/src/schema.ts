import { index, jsonb, pgEnum, pgTable, primaryKey, text, integer, timestamp, uuid, varchar, boolean, unique } from "drizzle-orm/pg-core";

const referenceNoMutation = { onUpdate: "restrict", onDelete: "restrict" } as const;

export const employeeUserRoles = pgEnum("employee_user_roles", ["admin", "manager", "supervisor", "officer"]);

export const employeeUsers = pgTable("employee_users", {
	id: uuid("id").primaryKey().defaultRandom(),
	supervisorId: uuid("supervisor_id").references(() => employeeUsers.id, referenceNoMutation),
	role: employeeUserRoles("role").notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	username: varchar("username", { length: 255 }).notNull(),
	password: varchar("password", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	createdBy: uuid("created_by").references(() => employeeUsers.id, referenceNoMutation),
	deletedAt: timestamp("deleted_at", { withTimezone: true }), // renamed from is_active
	deletedBy: uuid("deleted_by").references(() => employeeUsers.id, referenceNoMutation)
});

export const employeeUserAuditLogEvents = pgEnum("employee_user_audit_log_events", ["auth:login", "auth:logout"]);

export const employeeUserAuditLogs = pgTable("employee_user_audit_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").notNull().references(() => employeeUsers.id, referenceNoMutation),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	event: employeeUserAuditLogEvents("event").notNull(),
	data: jsonb("data") // Event metadata, such as ip address when logging in
});

export const employeeUserSessions = pgTable("employee_user_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").notNull().references(() => employeeUsers.id, referenceNoMutation),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }) // force logout will deactivate this
});
