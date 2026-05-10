"use server";

import { headers as nextHeaders } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { login as payloadLogin } from "@payloadcms/next/auth";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { getClientIpFromHeaders } from "@/utils/clientIp";
import { writeLoginLogEntry } from "@/utils/loginLogWriter";

export async function loginAction(email: string, password: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user: loggedInuser } = await payload.auth({ headers });
	if(loggedInuser != null)
		throw new Error("Already logged in");
	const ip = getClientIpFromHeaders(headers);
	try {
		const { user } = await payloadLogin({
			config: payloadConfig,
			collection: "users",
			email: email,
			password: password
		});
		if(user == null)
			throw new Error("Login failed");
		await writeLoginLogEntry(payload, {
			userId: String(user.id),
			ip,
			event: "login",
			outcome: "success"
		});
		return redirect("/", RedirectType.push);
	}
	catch (error) {
		try {
			const found = await payload.find({
				collection: "users",
				where: { email: { equals: email.trim() } },
				limit: 1,
				depth: 0,
				overrideAccess: true
			});
			const uid = found.docs[0] != null ? String(found.docs[0].id) : null;
			await writeLoginLogEntry(payload, {
				userId: uid,
				ip,
				event: "login",
				outcome: "failure"
			});
		}
		catch {}
		throw error;
	}
}
