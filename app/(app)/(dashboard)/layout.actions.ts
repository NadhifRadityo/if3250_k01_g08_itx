"use server";

import { headers as nextHeaders } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { logout as payloadLogout } from "@payloadcms/next/auth";
import { getPayload, type Payload } from "payload";

import payloadConfig from "@payload-config";
import type { User } from "@/payload-types";

const dashboardManagementKeys = ["user-management", "role-management", "team-management"] as const;

export type DashboardManagementKey = (typeof dashboardManagementKeys)[number];
export type DashboardMode = "viewer" | "editor" | "approver";
export type DashboardRoleMenu = `${DashboardManagementKey}-${DashboardMode}`;

export type DashboardNavLink = {
	label: string;
	mode: DashboardMode;
	href: string;
};

export type DashboardManagementNavigationItem = {
	key: DashboardManagementKey;
	label: string;
	baseHref: string;
	hasSubmenu: boolean;
	links: DashboardNavLink[];
	defaultHref: string;
	defaultMode: DashboardMode;
};

export type DashboardShellContext = {
	user: Pick<User, "id" | "name" | "email">;
	roleMenus: DashboardRoleMenu[];
	managementNavigation: DashboardManagementNavigationItem[];
};

const managementLabelMap: Record<DashboardManagementKey, string> = {
	"user-management": "User Management",
	"role-management": "Role Management",
	"team-management": "Team Management"
};

const modeLabelMap: Record<DashboardMode, string> = {
	viewer: "Viewer",
	editor: "Editor",
	approver: "Approver"
};

const dashboardRoleMenus = [
	"user-management-viewer",
	"user-management-editor",
	"user-management-approver",
	"role-management-viewer",
	"role-management-editor",
	"role-management-approver",
	"team-management-viewer",
	"team-management-editor",
	"team-management-approver"
] as const satisfies DashboardRoleMenu[];

const dashboardRoleMenuSet = new Set<DashboardRoleMenu>(dashboardRoleMenus);

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function normalizeDashboardRoleMenus(value: unknown): DashboardRoleMenu[] {
	if(!Array.isArray(value))
		return [];

	const normalized = value
		.filter((menu): menu is DashboardRoleMenu => typeof menu == "string" && dashboardRoleMenuSet.has(menu as DashboardRoleMenu));

	return [...new Set(normalized)];
}

function getModeFlags(menus: Set<DashboardRoleMenu>, key: DashboardManagementKey): {
	hasViewer: boolean;
	hasEditor: boolean;
	hasApprover: boolean;
	canView: boolean;
} {
	const hasViewer = menus.has(`${key}-viewer` as DashboardRoleMenu);
	const hasEditor = menus.has(`${key}-editor` as DashboardRoleMenu);
	const hasApprover = menus.has(`${key}-approver` as DashboardRoleMenu);

	return {
		hasViewer,
		hasEditor,
		hasApprover,
		canView: hasViewer || hasEditor
	};
}

function buildManagementNavigationItem(menus: Set<DashboardRoleMenu>, key: DashboardManagementKey): DashboardManagementNavigationItem | null {
	const { hasViewer, hasEditor, hasApprover, canView } = getModeFlags(menus, key);
	if(!canView && !hasApprover)
		return null;

	const baseHref = `/${key}`;

	if(hasEditor && hasApprover) {
		const links: DashboardNavLink[] = [
			{ label: modeLabelMap.editor, mode: "editor", href: `${baseHref}/editor` },
			{ label: modeLabelMap.approver, mode: "approver", href: `${baseHref}/approver` }
		];
		return {
			key,
			label: managementLabelMap[key],
			baseHref,
			hasSubmenu: true,
			links,
			defaultHref: links[0].href,
			defaultMode: links[0].mode
		};
	}

	if(!hasEditor && hasViewer && hasApprover) {
		const links: DashboardNavLink[] = [
			{ label: modeLabelMap.viewer, mode: "viewer", href: `${baseHref}/viewer` },
			{ label: modeLabelMap.approver, mode: "approver", href: `${baseHref}/approver` }
		];
		return {
			key,
			label: managementLabelMap[key],
			baseHref,
			hasSubmenu: true,
			links,
			defaultHref: links[0].href,
			defaultMode: links[0].mode
		};
	}

	const defaultMode: DashboardMode = hasEditor ? "editor" : hasViewer ? "viewer" : "approver";
	const defaultHref = `${baseHref}/${defaultMode}`;

	return {
		key,
		label: managementLabelMap[key],
		baseHref,
		hasSubmenu: false,
		links: [{ label: modeLabelMap[defaultMode], mode: defaultMode, href: defaultHref }],
		defaultHref,
		defaultMode
	};
}

function buildManagementNavigation(menus: DashboardRoleMenu[]): DashboardManagementNavigationItem[] {
	const menuSet = new Set(menus);
	return dashboardManagementKeys
		.map(key => buildManagementNavigationItem(menuSet, key))
		.filter((item): item is DashboardManagementNavigationItem => item != null);
}

async function resolveRoleMenus(payload: Payload, user: User): Promise<DashboardRoleMenu[]> {
	const rawRole = user.role;
	if(rawRole != null && typeof rawRole == "object" && "menus" in rawRole)
		return normalizeDashboardRoleMenus(rawRole.menus);

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
			menus: true
		}
	});

	return normalizeDashboardRoleMenus(role.menus);
}

function resolveDefaultManagementHref(menus: DashboardRoleMenu[], key: DashboardManagementKey): string | null {
	const item = buildManagementNavigation(menus).find(candidate => candidate.key == key);
	return item?.defaultHref ?? null;
}

function resolveDashboardHomeHref(navigation: DashboardManagementNavigationItem[]): string {
	return navigation[0]?.defaultHref ?? "/";
}

export async function getDashboardShellContext(): Promise<DashboardShellContext | null> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return null;

	const roleMenus = await resolveRoleMenus(payload, user);
	const managementNavigation = buildManagementNavigation(roleMenus);

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email
		},
		roleMenus,
		managementNavigation
	};
}

export async function resolveManagementRootHref(key: DashboardManagementKey): Promise<string> {
	const context = await getDashboardShellContext();
	if(context == null)
		return "/login";

	return resolveDefaultManagementHref(context.roleMenus, key) ?? resolveDashboardHomeHref(context.managementNavigation);
}

export async function logoutAction() {
	await payloadLogout({ config: payloadConfig });
	return redirect("/login", RedirectType.push);
}
