"use server";

import { headers as nextHeaders } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { logout as payloadLogout } from "@payloadcms/next/auth";
import { getPayload, type Payload } from "payload";

import payloadConfig from "@payload-config";
import { getClientIpFromHeaders } from "@/utils/clientIp";
import { getRelationshipId } from "@/utils/payload";
import type { User } from "@/payload-types";

import { dashboardMenuKeys, dashboardRoleHrefs, preferredMenuModes, dashboardMenuLabels, dashboardRoleLabels, dashboardRoleSubLabels } from "./layout.shared";

export type DashboardMenu = ReturnType<typeof getDashboardMenus>[number];

function getDashboardMenus(roles: string[]) {
	return dashboardMenuKeys.map(menuKey => [
		menuKey,
		Object.fromEntries(roles
			.filter(role => role.startsWith(`${menuKey}#`) && dashboardRoleHrefs[role] != null)
			.map(role => [role.slice(`${menuKey}#`.length), { label: dashboardRoleLabels[role] as string, shortLabel: dashboardRoleSubLabels[role], href: dashboardRoleHrefs[role] as string }]))
	] as const)
		.filter(([_, modes]) => Object.keys(modes).length > 0)
		.map(([menuKey, modes]) => ({
			key: menuKey,
			label: dashboardMenuLabels[menuKey],
			modes: modes,
			defaultMode: Object.keys(modes).sort((a, b) => preferredMenuModes.indexOf(a) - preferredMenuModes.indexOf(b))[0]
		}));
}

async function resolveRoleMenus(payload: Payload, user: User) {
	const rawRole = user.role;
	if(rawRole != null && typeof rawRole == "object" && "menus" in rawRole)
		return rawRole.menus;
	const roleId = getRelationshipId(rawRole);
	if(roleId == null)
		return [];
	const role = await payload.findByID({
		collection: "roles",
		id: roleId,
		user,
		overrideAccess: true,
		trash: true,
		depth: 0,
		select: {
			menus: true,
			_status: true,
			deletedAt: true
		}
	});
	if(role._status != "published" || role.deletedAt != null)
		return [];
	return role.menus;
}

export async function getDashboardContextAction() {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return null;
	const roleMenus = await resolveRoleMenus(payload, user);
	const menus = getDashboardMenus(roleMenus);
	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			roleMenus: roleMenus
		},
		menus: menus
	};
}

export async function logoutAction() {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	await payloadLogout({ config: payloadConfig });
	if(user != null) {
		const ipAddress = getClientIpFromHeaders(headers);
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
	}
	return redirect("/login", RedirectType.push);
}
