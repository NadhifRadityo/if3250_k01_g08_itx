import { eq, and, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import type { HttpBindings } from "@hono/node-server";

import { db } from "../db";
import { employeeUsers, employeeUserSessions } from "../schema";

export type AuthVariables = {
	session: {
		id: string;
		userId: string;
	};
	user: {
		id: string;
		username: string;
		email: string;
		role: "admin" | "manager" | "supervisor" | "officer";
	};
};

export const authMiddleware = createMiddleware<{ Bindings: HttpBindings; Variables: AuthVariables }>(async(c, next) => {
	const sessionId = c.req.header("Authorization") || c.req.query("sessionId");

	if(sessionId == null) {
		return c.json({ error: "Unauthorized: No session ID provided" }, 401);
	}

	const [session] = await db
		.select()
		.from(employeeUserSessions)
		.where(and(eq(employeeUserSessions.id, sessionId), isNull(employeeUserSessions.deletedAt)))
		.limit(1);

	if(session == null) {
		return c.json({ error: "Unauthorized: Invalid or expired session" }, 401);
	}

	const [user] = await db
		.select({
			id: employeeUsers.id,
			username: employeeUsers.username,
			email: employeeUsers.email,
			role: employeeUsers.role,
		})
		.from(employeeUsers)
		.where(and(eq(employeeUsers.id, session.userId), isNull(employeeUsers.deletedAt)))
		.limit(1);

	if(user == null) {
		return c.json({ error: "Unauthorized: User account no longer active" }, 401);
	}

	c.set("session", { id: session.id, userId: session.userId });
	c.set("user", user);

	await next();
});

export const requireRole = (roles: ("admin" | "manager" | "supervisor" | "officer")[]) => {
	return createMiddleware<{ Bindings: HttpBindings; Variables: AuthVariables }>(async(c, next) => {
		const user = c.get("user");

		if(roles.includes(user.role) == false) {
			return c.json({ error: "Forbidden: You do not have permission to access this resource" }, 403);
		}

		await next();
	});
};
