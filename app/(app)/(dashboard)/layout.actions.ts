"use server";

import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import { redirect, RedirectType, unauthorized } from "next/navigation";
import { logout as payloadLogout } from "@payloadcms/next/auth";
import { jwtSign, Payload, extractJWT, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa } from "@/utils/actions";
import { getClientIpFromHeaders } from "@/utils/clientIp";
import { getRelationshipId } from "@/utils/payload";
import { User } from "@/payload-types";

import { dashboardMenuKeys, dashboardRoleHrefs, preferredMenuModes, dashboardMenuLabels, dashboardRoleLabels, dashboardRoleSubLabels } from "./layout.shared";

export type DashboardMenu = ReturnType<typeof getDashboardMenus>[number];

function getDashboardMenus(roles: string[]) {
	return dashboardMenuKeys.map(menuKey => [
		menuKey,
		Object.fromEntries(roles
			.filter(role => role.startsWith(`${menuKey}#`) && dashboardRoleHrefs[role] != null)
			.map(role => [role.slice(`${menuKey}#`.length), { label: dashboardRoleLabels[role] as string, subLabel: dashboardRoleSubLabels[role], href: dashboardRoleHrefs[role] as string }]))
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
		user: user,
		overrideAccess: false,
		collection: "roles",
		id: roleId,
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

export const getDashboardContextAction = wsa(async () => {
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
});

export const refreshSessionAction = wsa(async () => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const jwt = extractJWT({ payload, headers });
	if(jwt == null) return unauthorized();
	const jwtSession = (() => { try { return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf-8")); } catch{ return null; } })();
	const sessionId = (user as any)._sid as string;
	if(jwtSession == null || sessionId != jwtSession.sid) return unauthorized();
	const session = { ...user.sessions.find(s => s.id == sessionId)! };
	session.expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
	await payload.db.updateOne({
		id: user.id,
		collection: "users",
		data: { ...user, sessions: [...user.sessions.filter(s => s.id != sessionId), session] },
		returning: false
	});
	const { token } = await jwtSign({
		fieldsToSign: { ...jwtSession },
		secret: payload.secret,
		tokenExpiration: 20 * 60
	});
	const collectionAuthConfig = payload.collections[jwtSession.collection].config.auth;
	const cookies = await nextCookies();
	cookies.set({
		domain: collectionAuthConfig.cookies.domain,
		secure: collectionAuthConfig.cookies.secure,
		name: `${payload.config.cookiePrefix}-token`,
		value: token,
		expires: new Date(session.expiresAt),
		path: "/",
		httpOnly: true,
		sameSite: "lax"
	});
});

export const logoutAction = wsa(async ({ inactivity = false }: { inactivity?: boolean } = {}) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	await payloadLogout({ config: payloadConfig });
	if(user != null) {
		const ipAddress = getClientIpFromHeaders(headers);
		try {
			await payload.create({
				overrideAccess: true,
				collection: "login-logs",
				depth: 0,
				data: {
					createdAt: new Date().toISOString(),
					ipAddress: ipAddress,
					user: user.id,
					event: "logout",
					outcome: "success",
					sessionId: (user as any)._sid,
					...(inactivity ? { description: "Logged out due to inactivity." } : {})
				}
			});
		} catch(_) {}
	}
	return redirect("/login", RedirectType.push);
});
