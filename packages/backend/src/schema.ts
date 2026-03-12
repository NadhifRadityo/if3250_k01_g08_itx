import { index, jsonb, pgEnum, pgTable, primaryKey, text, integer, timestamp, uuid, varchar, boolean, unique, foreignKey } from "drizzle-orm/pg-core";

export const employeeUserRoles = pgEnum("employee_user_roles", ["admin", "manager", "supervisor", "officer"]);

export const employeeUsers = pgTable("employee_users", {
	id: uuid("id").primaryKey().defaultRandom(),
	supervisorId: uuid("supervisor_id"),
	role: employeeUserRoles("role").notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	username: varchar("username", { length: 255 }).notNull(),
	password: varchar("password", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	createdBy: uuid("created_by"),
	deletedAt: timestamp("deleted_at", { withTimezone: true }), // renamed from is_active
	deletedBy: uuid("deleted_by")
}, table => [
	foreignKey({ columns: [table.supervisorId], foreignColumns: [table.id] }).onUpdate("restrict").onDelete("restrict"),
	foreignKey({ columns: [table.createdBy], foreignColumns: [table.id] }).onUpdate("restrict").onDelete("restrict"),
	foreignKey({ columns: [table.deletedBy], foreignColumns: [table.id] }).onUpdate("restrict").onDelete("restrict")
]);

export const employeeUserAuditLogEvents = pgEnum("employee_user_audit_log_events", ["auth:login_attempt", "auth:login", "auth:logout"]);

export const employeeUserAuditLogs = pgTable("employee_user_audit_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").notNull().references(() => employeeUsers.id, { onUpdate: "restrict", onDelete: "restrict" }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	event: employeeUserAuditLogEvents("event").notNull(),
	data: jsonb("data") // Event metadata, such as ip address when logging in
});

export const employeeUserSessions = pgTable("employee_user_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id").notNull().references(() => employeeUsers.id, { onUpdate: "restrict", onDelete: "restrict" }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }) // force logout will deactivate this
});
