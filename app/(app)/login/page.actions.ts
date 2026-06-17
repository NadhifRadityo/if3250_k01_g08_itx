"use server";

import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import { redirect, RedirectType, unstable_rethrow } from "next/navigation";
import { login as payloadLogin } from "@payloadcms/next/auth";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa } from "@/utils/actions";
import { getClientIpFromHeaders } from "@/utils/clientIp";

export const loginAction = wsa(async (email: string, password: string) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user: loggedInuser } = await payload.auth({ headers });
	if(loggedInuser != null)
		throw new Error("Already logged in");
	const ipAddress = getClientIpFromHeaders(headers);
	try {
		const { user, token } = await payloadLogin({
			config: payloadConfig,
			collection: "users",
			email: email,
			password: password
		});
		if(user == null || token == null)
			throw new Error("Login failed");
		const sessionId = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf-8")).sid;
		if(user.sessions.length > 1) {
			try {
				await payload.create({
					overrideAccess: true,
					collection: "login-logs",
					depth: 0,
					data: {
						createdAt: new Date().toISOString(),
						ipAddress: ipAddress,
						user: user.id,
						event: "login",
						outcome: "failure",
						sessionId: sessionId,
						description: "Login rolled back because there is another session active."
					}
				});
			} catch(_) {}
			await payload.db.updateOne({
				id: user.id,
				collection: "users",
				data: { ...user, sessions: user.sessions.filter(s => s.id != sessionId) },
				returning: false
			});
			const cookies = await nextCookies();
			const existingCookie = cookies.getAll().find(c => c.name.startsWith(payload.config.cookiePrefix));
			if(existingCookie != null)
				cookies.delete(existingCookie.name);
			throw Object.assign(new Error("Another device has logged in, please contact your administrator."), { __ignoreLoginError: true });
		}
		try {
			await payload.create({
				overrideAccess: true,
				collection: "login-logs",
				depth: 0,
				data: {
					createdAt: new Date().toISOString(),
					ipAddress: ipAddress,
					user: user.id,
					event: "login",
					outcome: "success",
					sessionId: sessionId
				}
			});
		} catch(_) {}
		return redirect("/", RedirectType.push);
	} catch(error) {
		unstable_rethrow(error);
		if(error?.__ignoreLoginError != true) {
			try {
				const found = await payload.find({
					overrideAccess: true,
					collection: "users",
					where: { email: { equals: email.trim() } },
					limit: 1,
					depth: 0
				});
				await payload.create({
					overrideAccess: true,
					collection: "login-logs",
					depth: 0,
					data: {
						createdAt: new Date().toISOString(),
						ipAddress: ipAddress,
						user: found.docs[0]?.id,
						event: "login",
						outcome: "failure",
						description: `${error.message}`
					}
				});
			} catch(_) {}
		}
		throw error;
	}
});
