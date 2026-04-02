"use server";

import { redirect, RedirectType } from "next/navigation";
import { logout as payloadLogout } from "@payloadcms/next/auth";

import payloadConfig from "@payload-config";

export async function logoutAction() {
	await payloadLogout({ config: payloadConfig });
	return redirect("/login", RedirectType.push);
}
