"use server";

import { headers as nextHeaders } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { logout as payloadLogout } from "@payloadcms/next/auth";
import { getPayload, type Payload } from "payload";

import payloadConfig from "@payload-config";
import type { Role, User } from "@/payload-types";

const standardDashboardManagementKeys = ["user-management", "role-management", "team-management"] as const;

export type DashboardManagementKey = (typeof standardDashboardManagementKeys)[number] | "credit-application-management";
export type DashboardMode = "viewer" | "editor" | "approver";

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

export type DashboardViewerEditorTarget = {
	key: DashboardManagementKey;
	viewerHref: string | null;
	editorHref: string | null;
	preferredHref: string | null;
};

export type DashboardViewerEditorTargetMap = Record<DashboardManagementKey, DashboardViewerEditorTarget>;

export type DashboardEntrySummaryType = "user" | "role" | "team";

export type DashboardEntrySummary = {
	type: DashboardEntrySummaryType;
	id: string;
	title: string;
	description: string;
	meta: Array<{ label: string, value: string }>;
};

const managementLabelMap: Record<DashboardManagementKey, string> = {
	"user-management": "User Management",
	"role-management": "Role Management",
	"team-management": "Team Management",
	"credit-application-management": "Credit Application Management"
};

const creditApplicationManagementBaseHref = "/credit-application-management";

const modeLabelMap: Record<DashboardMode, string> = {
	viewer: "Viewer",
	editor: "Editor",
	approver: "Approver"
};

const auditorLabel = "Auditor";

const dashboardRoleMenus = [
	"user-management-viewer",
	"user-management-auditor",
	"user-management-editor",
	"user-management-approver",
	"role-management-viewer",
	"role-management-auditor",
	"role-management-editor",
	"role-management-approver",
	"team-management-viewer",
	"team-management-auditor",
	"team-management-editor",
	"team-management-approver",
	"credit-application-import-viewer",
	"credit-application-import-editor",
	"credit-application-import-approver",
	"credit-application-entry-viewer",
	"credit-application-entry-auditor",
	"credit-application-entry-editor",
	"credit-application-entry-approver"
] as const;

export type DashboardRoleMenu = (typeof dashboardRoleMenus)[number];

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
	hasAuditor: boolean;
	hasEditor: boolean;
	hasApprover: boolean;
	canView: boolean;
} {
	const hasViewer = menus.has(`${key}-viewer` as DashboardRoleMenu);
	const hasAuditor = menus.has(`${key}-auditor` as DashboardRoleMenu);
	const hasEditor = menus.has(`${key}-editor` as DashboardRoleMenu);
	const hasApprover = menus.has(`${key}-approver` as DashboardRoleMenu);

	return {
		hasViewer,
		hasAuditor,
		hasEditor,
		hasApprover,
		canView: hasViewer || hasAuditor || hasEditor
	};
}

function buildCreditApplicationManagementNavigationItem(menus: Set<DashboardRoleMenu>): DashboardManagementNavigationItem | null {
	const links: DashboardNavLink[] = [];
	if(menus.has("credit-application-import-viewer") || menus.has("credit-application-import-editor"))
		links.push({ label: "Import", mode: "viewer", href: `${creditApplicationManagementBaseHref}/import` });
	if(menus.has("credit-application-import-approver"))
		links.push({ label: "Import Approver", mode: "approver", href: `${creditApplicationManagementBaseHref}/import-approver` });
	if(
		menus.has("credit-application-entry-viewer") ||
		menus.has("credit-application-entry-auditor") ||
		menus.has("credit-application-entry-editor")
	)
		links.push({ label: "Editor", mode: "editor", href: `${creditApplicationManagementBaseHref}/editor` });
	if(menus.has("credit-application-entry-approver"))
		links.push({ label: "Approver", mode: "approver", href: `${creditApplicationManagementBaseHref}/approver` });
	if(links.length == 0)
		return null;

	return {
		key: "credit-application-management",
		label: managementLabelMap["credit-application-management"],
		baseHref: creditApplicationManagementBaseHref,
		hasSubmenu: links.length > 1,
		links,
		defaultHref: links[0].href,
		defaultMode: links[0].mode
	};
}

function buildManagementNavigationItem(menus: Set<DashboardRoleMenu>, key: DashboardManagementKey): DashboardManagementNavigationItem | null {
	if(key == "credit-application-management")
		return null;

	const { hasViewer, hasAuditor, hasEditor, hasApprover, canView } = getModeFlags(menus, key);
	if(!canView && !hasApprover)
		return null;

	const baseHref = `/${key}`;
	const viewLinkLabel = hasViewer ? modeLabelMap.viewer : auditorLabel;

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

	if(!hasEditor && (hasViewer || hasAuditor) && hasApprover) {
		const links: DashboardNavLink[] = [
			{ label: viewLinkLabel, mode: "viewer", href: `${baseHref}/viewer` },
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

	const defaultMode: DashboardMode = hasEditor ? "editor" : (hasViewer || hasAuditor) ? "viewer" : "approver";
	const defaultHref = `${baseHref}/${defaultMode}`;

	return {
		key,
		label: managementLabelMap[key],
		baseHref,
		hasSubmenu: false,
		links: [{ label: defaultMode == "viewer" ? viewLinkLabel : modeLabelMap[defaultMode], mode: defaultMode, href: defaultHref }],
		defaultHref,
		defaultMode
	};
}

function buildCreditApplicationManagementNavigationFallbackItem(): DashboardManagementNavigationItem {
	return {
		key: "credit-application-management",
		label: managementLabelMap["credit-application-management"],
		baseHref: creditApplicationManagementBaseHref,
		hasSubmenu: false,
		links: [{ label: "Overview", mode: "viewer", href: creditApplicationManagementBaseHref }],
		defaultHref: creditApplicationManagementBaseHref,
		defaultMode: "viewer"
	};
}

function buildManagementNavigation(menus: DashboardRoleMenu[]): DashboardManagementNavigationItem[] {
	const menuSet = new Set(menus);
	const standardItems = standardDashboardManagementKeys
		.map(key => buildManagementNavigationItem(menuSet, key))
		.filter((item): item is DashboardManagementNavigationItem => item != null);
	const creditFromRbac = buildCreditApplicationManagementNavigationItem(menuSet);
	const creditItem = creditFromRbac ?? buildCreditApplicationManagementNavigationFallbackItem();
	return [...standardItems, creditItem];
}

async function resolveRoleMenus(payload: Payload, user: User): Promise<DashboardRoleMenu[]> {
	const roleId = getRelationshipId(user.role);
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
			level: true
		}
	});

	const normalized = normalizeDashboardRoleMenus(role.menus);
	if(role.level != "admin")
		return normalized;

	const adminCreditMenus: DashboardRoleMenu[] = [
		"credit-application-import-viewer",
		"credit-application-import-editor",
		"credit-application-import-approver",
		"credit-application-entry-viewer",
		"credit-application-entry-auditor",
		"credit-application-entry-editor",
		"credit-application-entry-approver"
	];
	return normalizeDashboardRoleMenus([...normalized, ...adminCreditMenus]);
}

function resolveDefaultManagementHref(menus: DashboardRoleMenu[], key: DashboardManagementKey): string | null {
	const item = buildManagementNavigation(menus).find(candidate => candidate.key == key);
	return item?.defaultHref ?? null;
}

function resolveManagementModeRedirectHref(menus: DashboardRoleMenu[], key: DashboardManagementKey, mode: DashboardMode): string | null {
	if(key == "credit-application-management")
		return null;

	const menuSet = new Set(menus);
	const { hasViewer, hasAuditor, hasEditor, hasApprover } = getModeFlags(menuSet, key);

	if(mode == "viewer") {
		if(hasEditor)
			return `/${key}/editor`;
		if(hasViewer || hasAuditor)
			return null;
		return "/";
	}

	if(mode == "editor")
		return hasEditor ? null : "/";

	return hasApprover ? null : "/";
}

function resolveViewerEditorTarget(menus: DashboardRoleMenu[], key: DashboardManagementKey): DashboardViewerEditorTarget {
	const menuSet = new Set(menus);
	const hasViewer = menuSet.has(`${key}-viewer` as DashboardRoleMenu) || menuSet.has(`${key}-auditor` as DashboardRoleMenu);
	const hasEditor = menuSet.has(`${key}-editor` as DashboardRoleMenu);
	const viewerHref = hasViewer ? `/${key}/viewer` : null;
	const editorHref = hasEditor ? `/${key}/editor` : null;

	return {
		key,
		viewerHref,
		editorHref,
		preferredHref: editorHref ?? viewerHref
	};
}

function resolveViewerEditorTargets(menus: DashboardRoleMenu[]): DashboardViewerEditorTargetMap {
	return {
		"user-management": resolveViewerEditorTarget(menus, "user-management"),
		"role-management": resolveViewerEditorTarget(menus, "role-management"),
		"team-management": resolveViewerEditorTarget(menus, "team-management"),
		"credit-application-management": {
			key: "credit-application-management",
			viewerHref: null,
			editorHref: null,
			preferredHref: null
		}
	};
}

function resolveDashboardHomeHref(navigation: DashboardManagementNavigationItem[]): string {
	return navigation[0]?.defaultHref ?? "/";
}

function formatMenuLabel(menu: Role["menus"][number]): string {
	if(menu == "user-management-viewer")
		return "User Management - Viewer";
	if(menu == "user-management-auditor")
		return "User Management - Auditor";
	if(menu == "user-management-editor")
		return "User Management - Editor";
	if(menu == "user-management-approver")
		return "User Management - Approver";
	if(menu == "role-management-viewer")
		return "Role Management - Viewer";
	if(menu == "role-management-auditor")
		return "Role Management - Auditor";
	if(menu == "role-management-editor")
		return "Role Management - Editor";
	if(menu == "role-management-approver")
		return "Role Management - Approver";
	if(menu == "team-management-viewer")
		return "Team Management - Viewer";
	if(menu == "team-management-auditor")
		return "Team Management - Auditor";
	if(menu == "team-management-editor")
		return "Team Management - Editor";
	if(menu == "team-management-approver")
		return "Team Management - Approver";
	if(menu == "credit-application-import-viewer")
		return "Credit Application - Import Viewer";
	if(menu == "credit-application-import-editor")
		return "Credit Application — Import";
	if(menu == "credit-application-import-approver")
		return "Credit Application — Import Approver";
	if(menu == "credit-application-entry-viewer")
		return "Credit Application - Entry Viewer";
	if(menu == "credit-application-entry-auditor")
		return "Credit Application - Entry Auditor";
	if(menu == "credit-application-entry-editor")
		return "Credit Application — Entry Editor";
	if(menu == "credit-application-entry-approver")
		return "Credit Application — Entry Approver";
	return menu;
}

function formatRoleLevelLabel(level: Role["level"]): string {
	if(level == "admin")
		return "Admin";
	if(level == "manager")
		return "Manager";
	if(level == "supervisor")
		return "Supervisor";
	if(level == "officer")
		return "Officer";
	return level;
}

async function findUsersByIds(payload: Payload, user: User, ids: string[]): Promise<Map<string, Pick<User, "name" | "email">>> {
	if(ids.length == 0)
		return new Map();

	const users = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: Math.max(ids.length, 1),
		where: {
			id: {
				in: ids
			}
		},
		select: {
			name: true,
			email: true
		}
	});

	const usersById = new Map<string, Pick<User, "name" | "email">>();
	for(const candidate of users.docs)
		usersById.set(String(candidate.id), { name: candidate.name, email: candidate.email });
	return usersById;
}

function getRelationshipIds(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];
	return value.map(getRelationshipId).filter((id): id is string => id != null);
}

function formatSummaryDateLabel(value: string | null | undefined): string {
	if(value == null)
		return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return value;
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
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

export async function resolveManagementModeRedirectHrefAction(key: DashboardManagementKey, mode: DashboardMode): Promise<string | null> {
	const context = await getDashboardShellContext();
	if(context == null)
		return "/login";

	return resolveManagementModeRedirectHref(context.roleMenus, key, mode);
}

export async function getDashboardViewerEditorTargetsAction(): Promise<DashboardViewerEditorTargetMap> {
	const context = await getDashboardShellContext();
	if(context == null) {
		return {
			"user-management": { key: "user-management", viewerHref: null, editorHref: null, preferredHref: null },
			"role-management": { key: "role-management", viewerHref: null, editorHref: null, preferredHref: null },
			"team-management": { key: "team-management", viewerHref: null, editorHref: null, preferredHref: null },
			"credit-application-management": { key: "credit-application-management", viewerHref: null, editorHref: null, preferredHref: null }
		};
	}

	return resolveViewerEditorTargets(context.roleMenus);
}

export type CreditApplicationSectionSlug = "import" | "import-approver" | "editor" | "approver";

const creditApplicationSectionAllowedMenus: Record<CreditApplicationSectionSlug, readonly DashboardRoleMenu[]> = {
	import: ["credit-application-import-viewer", "credit-application-import-editor"],
	"import-approver": ["credit-application-import-approver"],
	editor: [
		"credit-application-entry-viewer",
		"credit-application-entry-auditor",
		"credit-application-entry-editor"
	],
	approver: ["credit-application-entry-approver"]
};

export async function resolveCreditApplicationSectionRedirectHrefAction(section: CreditApplicationSectionSlug): Promise<string | null> {
	const context = await getDashboardShellContext();
	if(context == null)
		return "/login";

	const menuSet = new Set(context.roleMenus);
	if(creditApplicationSectionAllowedMenus[section].some(menu => menuSet.has(menu)))
		return null;

	const creditNav = buildCreditApplicationManagementNavigationItem(menuSet);
	if(creditNav != null)
		return creditNav.defaultHref;

	return resolveDashboardHomeHref(buildManagementNavigation(context.roleMenus));
}

export async function getDashboardEntrySummaryAction({
	type,
	id
}: {
	type: DashboardEntrySummaryType;
	id: string;
}): Promise<DashboardEntrySummary | null> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return null;

	const normalizedId = id.trim();
	if(normalizedId.length == 0)
		return null;

	if(type == "user") {
		const userDoc = await payload.findByID({
			collection: "users",
			id: normalizedId,
			user,
			overrideAccess: false,
			depth: 0,
			select: {
				name: true,
				email: true,
				employeeId: true,
				role: true,
				supervisor: true,
				deletedAt: true
			}
		});

		const roleId = getRelationshipId(userDoc.role);
		const supervisorId = getRelationshipId(userDoc.supervisor);
		const relatedUsers = await findUsersByIds(payload, user, [supervisorId].filter((value): value is string => value != null));
		const roleName = roleId != null ? (await payload.findByID({
			collection: "roles",
			id: roleId,
			user,
			overrideAccess: true,
			trash: true,
			depth: 0,
			select: { name: true }
		})).name : "-";

		return {
			type,
			id: String(userDoc.id),
			title: userDoc.name,
			description: userDoc.email,
			meta: [
				{ label: "Employee ID", value: userDoc.employeeId },
				{ label: "Role", value: roleName },
				{ label: "Supervisor", value: supervisorId != null ? (relatedUsers.get(supervisorId)?.name ?? "-") : "-" },
				{ label: "Deleted At", value: formatSummaryDateLabel(userDoc.deletedAt) }
			]
		};
	}

	if(type == "role") {
		const roleDoc = await payload.findByID({
			collection: "roles",
			id: normalizedId,
			user,
			overrideAccess: true,
			trash: true,
			depth: 0,
			select: {
				name: true,
				level: true,
				menus: true,
				deletedAt: true
			}
		});

		const menuLabels = roleDoc.menus.map(menu => formatMenuLabel(menu));
		return {
			type,
			id: String(roleDoc.id),
			title: roleDoc.name,
			description: `${formatRoleLevelLabel(roleDoc.level)} role`,
			meta: [
				{ label: "Level", value: formatRoleLevelLabel(roleDoc.level) },
				{ label: "Menus", value: menuLabels.length > 0 ? menuLabels.join(", ") : "-" },
				{ label: "Deleted At", value: formatSummaryDateLabel(roleDoc.deletedAt) }
			]
		};
	}

	const teamDoc = await payload.findByID({
		collection: "teams",
		id: normalizedId,
		user,
		overrideAccess: true,
		trash: true,
		depth: 0,
		select: {
			name: true,
			supervisor: true,
			officers: true,
			deletedAt: true
		}
	});

	const supervisorId = getRelationshipId(teamDoc.supervisor);
	const officerIds = getRelationshipIds(teamDoc.officers);
	const usersById = await findUsersByIds(payload, user, [...new Set([
		...officerIds,
		...([supervisorId].filter((value): value is string => value != null))
	])]);

	const officerNames = officerIds.map(officerId => usersById.get(officerId)?.name ?? "-");

	return {
		type,
		id: String(teamDoc.id),
		title: teamDoc.name,
		description: "Team entry",
		meta: [
			{ label: "Supervisor", value: supervisorId != null ? (usersById.get(supervisorId)?.name ?? "-") : "-" },
			{ label: "Officers", value: officerNames.length > 0 ? officerNames.join(", ") : "-" },
			{ label: "Deleted At", value: formatSummaryDateLabel(teamDoc.deletedAt) }
		]
	};
}

export async function logoutAction() {
	await payloadLogout({ config: payloadConfig });
	return redirect("/login", RedirectType.push);
}
