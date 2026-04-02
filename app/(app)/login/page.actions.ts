"use server";

import { headers as nextHeaders } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { login as payloadLogin } from "@payloadcms/next/auth";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";

export async function loginAction(email: string, password: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user: loggedInuser } = await payload.auth({ headers });
	if(loggedInuser != null)
		throw new Error("Already logged in");
	const { user } = await payloadLogin({
		config: payloadConfig,
		collection: "users",
		email: email,
		password: password
	});
	return redirect("/", RedirectType.push);
}
