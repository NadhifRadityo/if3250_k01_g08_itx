"use server";

import { headers as nextHeaders } from "next/headers";
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
	try {
		const { user } = await payloadLogin({
			config: payloadConfig,
			collection: "users",
			email: email,
			password: password
		});
		if(user == null)
			throw new Error("Login failed");
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
	} catch (error) {
		try {
			const found = await payload.find({
				collection: "users",
				where: { email: { equals: email.trim() } },
				limit: 1,
				depth: 0,
				overrideAccess: true
			});
			const userId = found.docs[0] != null ? String(found.docs[0].id) : null;
			await payload.create({
				collection: "login-logs",
				overrideAccess: true,
				depth: 0,
				data: {
					event: "login",
					user: userId,
					ipAddress: ipAddress,
					outcome: "failure"
				}
			});
		} catch(_) {}
		throw error;
	}
}
