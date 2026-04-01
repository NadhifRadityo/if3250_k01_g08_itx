"use server";

import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import { SignJWT } from "jose";

const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function login(identity: string, password: string) {
	const headers = await nextHeaders();
	const cookies = await nextCookies();
	const ipAddress = headers.get("X-Real-IP") ?? headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "0.0.0.0";
	const userAgent = headers.get("User-Agent") ?? "";
	const response = await fetch(new URL("/employee-users/login", process.env.BACKEND_API_ORIGIN), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ identity, password, ipAddress, userAgent })
	});
	const data = await response.json();
	if(!response.ok)
		return { success: false as const, status: response.status, error: data.error as string };
	const token = await (new SignJWT({
		sessionId: data.sessionId as string,
		user: data.user as { id: string, role: string, email: string, username: string }
	}))
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.sign(jwtSecret);
	cookies.set("session", token, {
		httpOnly: true,
		sameSite: "lax",
		path: "/"
	});
	return {
		success: true as const,
		sessionId: data.sessionId as string,
		user: data.user as { id: string, role: string, email: string, username: string }
	};
}
