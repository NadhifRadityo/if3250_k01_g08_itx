"use server";

import { cookies as nextCookies, headers as nextHeaders } from "next/headers";

export async function logout() {
	const headers = await nextHeaders();
	const cookies = await nextCookies();
	const sessionId = cookies.get("session");
	const ipAddress = headers.get("X-Real-IP") ?? headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "0.0.0.0";
	const userAgent = headers.get("User-Agent") ?? "";
	const response = await fetch(new URL("/employee-users/logout", process.env.BACKEND_API_ORIGIN), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ sessionId, ipAddress, userAgent })
	});
	const data = await response.json();
	if(!response.ok)
		return { success: false as const, status: response.status, error: data.error as string };
	cookies.delete("session");
	return { success: true as const };
}
