import { zValidator } from "@hono/zod-validator";
import { eq, and, isNull, desc } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { HttpBindings } from "@hono/node-server";

import { db } from "../db";
import { employeeUsers, employeeUserSessions, employeeUserAuditLogs } from "../schema";

const route = new Hono<{ Bindings: HttpBindings }>();
const rawLoginMaxAttempts = Number.parseInt(process.env.AUTH_LOGIN_MAX_ATTEMPTS ?? "5", 10);
const loginMaxAttempts = Number.isNaN(rawLoginMaxAttempts) ? 5 : Math.max(1, rawLoginMaxAttempts);

async function getConsecutiveInvalidPasswordAttempts(userId: string) {
	const logs = await db
		.select({ event: employeeUserAuditLogs.event, data: employeeUserAuditLogs.data })
		.from(employeeUserAuditLogs)
		.where(eq(employeeUserAuditLogs.userId, userId))
		.orderBy(desc(employeeUserAuditLogs.createdAt))
		.limit(50);

	let count = 0;
	for(const log of logs) {
		if(log.event === "auth:login")
			break;
		const data = log.data as { reason?: string } | null;
		if(log.event === "auth:login_attempt" && data?.reason === "invalid_password")
			count += 1;
	}

	return count;
}

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

		const failedAttempts = await getConsecutiveInvalidPasswordAttempts(user.id);
		if(failedAttempts >= loginMaxAttempts) {
			await db.insert(employeeUserAuditLogs).values({
				userId: user.id,
				createdAt: new Date(),
				event: "auth:login_attempt",
				data: { ipAddress, userAgent, identity, reason: "max_attempt_reached", attempts: failedAttempts, maxAttempts: loginMaxAttempts }
			});
			return c.json({
				error: "max attempt reached, contact admin",
				attempts: { tried: failedAttempts, max: loginMaxAttempts }
			}, 423);
		}

		if(user.password != password) {
			const nextFailedAttempts = failedAttempts + 1;
			await db.insert(employeeUserAuditLogs).values({
				userId: user.id,
				createdAt: new Date(),
				event: "auth:login_attempt",
				data: { ipAddress, userAgent, identity, reason: "invalid_password", attempts: nextFailedAttempts, maxAttempts: loginMaxAttempts }
			});
			if(nextFailedAttempts >= loginMaxAttempts)
				return c.json({
					error: "max attempt reached, contact admin",
					attempts: { tried: nextFailedAttempts, max: loginMaxAttempts }
				}, 423);
			return c.json({
				error: `login failed, has been trying ${nextFailedAttempts} of ${loginMaxAttempts} attempts`,
				attempts: { tried: nextFailedAttempts, max: loginMaxAttempts }
			}, 401);
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
			return c.json({ error: "already logged in" }, 409);
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
