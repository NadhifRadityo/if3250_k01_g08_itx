import { zValidator } from "@hono/zod-validator";
import { eq, and, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { HttpBindings } from "@hono/node-server";

import { db } from "../db";
import { employeeUsers, employeeUserSessions, employeeUserAuditLogs } from "../schema";

const route = new Hono<{ Bindings: HttpBindings }>();

route.post(
	"/login",
	zValidator("json", z.object({
		identity: z.string().min(1),
		password: z.string().min(1),
		ipAddress: z.union([z.ipv4(), z.ipv6()]),
		userAgent: z.string()
	})),
	async c => {
		const { identity, password, ipAddress, userAgent } = c.req.valid("json");
		const [user] = identity.includes("@") ?
			await db
				.select()
				.from(employeeUsers)
				.where(and(isNull(employeeUsers.deletedAt), eq(employeeUsers.email, identity)))
				.limit(1) :
			await db
				.select()
				.from(employeeUsers)
				.where(and(isNull(employeeUsers.deletedAt), eq(employeeUsers.username, identity)))
				.limit(1);
		if(user == null)
			return c.json({ error: "Invalid credentials" }, 401);
		if(user.password != password) {
			await db.insert(employeeUserAuditLogs).values({
				userId: user.id,
				createdAt: new Date(),
				event: "auth:login_attempt",
				data: { ipAddress, userAgent, identity, reason: "invalid_password" }
			});
			return c.json({ error: "Invalid credentials" }, 401);
		}
		const [existingSession] = await db
			.select({ id: employeeUserSessions.id })
			.from(employeeUserSessions)
			.where(and(eq(employeeUserSessions.userId, user.id), isNull(employeeUserSessions.deletedAt)))
			.limit(1);
		if(existingSession != null) {
			await db.insert(employeeUserAuditLogs).values({
				userId: user.id,
				createdAt: new Date(),
				event: "auth:login_attempt",
				data: { ipAddress, userAgent, identity, reason: "session_exists", existingSessionId: existingSession.id }
			});
			return c.json({ error: "Another active session already exists. Please logout first." }, 409);
		}
		const now = new Date();
		const [session] = await db
			.insert(employeeUserSessions)
			.values({
				userId: user.id,
				createdAt: now
			})
			.returning({ id: employeeUserSessions.id });
		await db.insert(employeeUserAuditLogs).values({
			userId: user.id,
			createdAt: now,
			event: "auth:login",
			data: { ipAddress, userAgent, sessionId: session.id }
		});
		return c.json({
			sessionId: session.id,
			user: {
				id: user.id,
				role: user.role,
				email: user.email,
				username: user.username
			}
		});
	}
);

route.post(
	"/logout",
	zValidator("json", z.object({
		sessionId: z.uuid(),
		ipAddress: z.union([z.ipv4(), z.ipv6()]),
		userAgent: z.string()
	})),
	async c => {
		const { sessionId, ipAddress, userAgent } = c.req.valid("json");
		const session = await db
			.select()
			.from(employeeUserSessions)
			.where(and(eq(employeeUserSessions.id, sessionId), isNull(employeeUserSessions.deletedAt)))
			.limit(1)
			.then(rows => rows[0]);
		if(session == null)
			return c.json({ error: "Session not found or already expired" }, 404);
		const now = new Date();
		await db
			.update(employeeUserSessions)
			.set({ deletedAt: now })
			.where(eq(employeeUserSessions.id, sessionId));
		await db.insert(employeeUserAuditLogs).values({
			userId: session.userId,
			createdAt: now,
			event: "auth:logout",
			data: { ipAddress, userAgent, sessionId }
		});
		return c.json({ success: true });
	}
);

route.get(
	"/me",
	zValidator(
		"query",
		z.object({
			sessionId: z.uuid()
		})
	),
	async c => {
		const { sessionId } = c.req.valid("query");
		const [session] = await db
			.select()
			.from(employeeUserSessions)
			.where(and(eq(employeeUserSessions.id, sessionId), isNull(employeeUserSessions.deletedAt)))
			.limit(1);
		if(session == null)
			return c.json({ error: "Session not found or expired" }, 401);
		const [user] = await db
			.select({
				id: employeeUsers.id,
				role: employeeUsers.role,
				email: employeeUsers.email,
				username: employeeUsers.username,
				supervisorId: employeeUsers.supervisorId,
				createdAt: employeeUsers.createdAt
			})
			.from(employeeUsers)
			.where(and(eq(employeeUsers.id, session.userId), isNull(employeeUsers.deletedAt)))
			.limit(1);
		if(user == null)
			return c.json({ error: "User not found" }, 404);
		return c.json({ user });
	}
);

export { route };
