"use server";

import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { login as payloadLogin } from "@payloadcms/next/auth";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { getClientIpFromHeaders } from "@/utils/clientIp";

export async function loginAction(email: string, password: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user: loggedInuser } = await payload.auth({ headers });
	if(loggedInuser != null)
		throw new Error("Already logged in");
	const ipAddress = getClientIpFromHeaders(headers);
	const userSessions = (await payload.find({
		collection: "users",
		overrideAccess: true,
		limit: 1,
		where: { email: { equals: email } }
	})).docs[0]?.sessions;
	try {
		const { user, token } = await payloadLogin({
			config: payloadConfig,
			collection: "users",
			email: email,
			password: password
		});
		if(user == null || token == null)
			throw new Error("Login failed");
		if(userSessions != null && userSessions.length > 0) {
			try {
				await payload.create({
					collection: "login-logs",
					overrideAccess: true,
					depth: 0,
					data: {
						event: "login",
						user: user.id,
						ipAddress: ipAddress,
						outcome: "failure"
					}
				});
			} catch(_) {}
			const generatedSessionId = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf-8")).sid;
			await payload.db.updateOne({
				id: user.id,
				collection: "users",
				data: { ...user, sessions: user.sessions.filter(s => s.id != generatedSessionId) },
				returning: false
			});
			const cookies = await nextCookies();
			const existingCookie = cookies.getAll().find(c => c.name.startsWith(payload.config.cookiePrefix));
			if(existingCookie != null)
				cookies.delete(existingCookie.name);
			throw new Error("Another device has logged in, please contact your administrator.");
		}
		try {
			await payload.create({
				collection: "login-logs",
				overrideAccess: true,
				depth: 0,
				data: {
					event: "login",
					user: user.id,
					ipAddress: ipAddress,
					outcome: "success"
				}
			});
		} catch(_) {}
		return redirect("/", RedirectType.push);
	} catch(error) {
		try {
			const found = await payload.find({
				collection: "users",
				where: { email: { equals: email.trim() } },
				limit: 1,
				depth: 0,
				overrideAccess: true
			});
			await payload.create({
				collection: "login-logs",
				overrideAccess: true,
				depth: 0,
				data: {
					event: "login",
					user: found.docs[0]?.id,
					ipAddress: ipAddress,
					outcome: "failure"
				}
			});
		} catch(_) {}
		throw error;
	}
}
