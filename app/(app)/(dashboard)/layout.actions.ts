"use server";

import { headers as nextHeaders } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { logout as payloadLogout } from "@payloadcms/next/auth";
import { getPayload, type Payload } from "payload";

import payloadConfig from "@payload-config";
import type { Role, User } from "@/payload-types";

const dashboardManagementKeys = ["user-management", "role-management", "team-management", "credit-application-management", "credit-application-assignment", "survey-management", "satisfaction-survey-management"] as const;

export type DashboardManagementKey = (typeof dashboardManagementKeys)[number];
export type DashboardMode = "viewer" | "editor" | "approver" | "import-viewer" | "import-editor" | "import-approver";
type DashboardRoleMenuMode = "viewer" | "editor" | "approver" | "auditor";
type DashboardCreditApplicationImportRoleMenu = `credit-application-management-import-${"viewer" | "editor" | "approver"}`;
export type DashboardRoleMenu = `${DashboardManagementKey}-${DashboardRoleMenuMode}` | DashboardCreditApplicationImportRoleMenu;

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
	importViewerHref: string | null;
	importEditorHref: string | null;
	importPreferredHref: string | null;
};

export type DashboardViewerEditorTargetMap = Record<DashboardManagementKey, DashboardViewerEditorTarget>;

export type DashboardEntrySummaryType = "user" | "role" | "team" | "credit-application" | "credit-application-import";

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
	"credit-application-management": "Credit Application Management",
	"credit-application-assignment": "Credit Application Assignment",
	"survey-management": "Survey Management",
	"satisfaction-survey-management": "Satisfaction Survey Management"
};

const modeLabelMap: Record<DashboardMode, string> = {
	viewer: "Viewer",
	editor: "Editor",
	approver: "Approver",
	"import-viewer": "Import Viewer",
	"import-editor": "Import Editor",
	"import-approver": "Import Approver"
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
	"credit-application-management-viewer",
	"credit-application-management-auditor",
	"credit-application-management-editor",
	"credit-application-management-approver",
	"credit-application-management-import-viewer",
	"credit-application-management-import-editor",
	"credit-application-management-import-approver",
	"credit-application-assignment-viewer",
	"credit-application-assignment-auditor",
	"credit-application-assignment-editor",
	"credit-application-assignment-approver",
	"survey-management-viewer",
	"survey-management-auditor",
	"survey-management-editor",
	"survey-management-approver",
	"satisfaction-survey-management-viewer",
	"satisfaction-survey-management-auditor",
	"satisfaction-survey-management-editor",
	"satisfaction-survey-management-approver"
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
	hasAuditor: boolean;
	hasEditor: boolean;
	hasApprover: boolean;
	hasImportViewer: boolean;
	hasImportEditor: boolean;
	hasImportApprover: boolean;
	canView: boolean;
} {
	const hasViewer = menus.has(`${key}-viewer`);
	const hasAuditor = menus.has(`${key}-auditor`);
	const hasEditor = menus.has(`${key}-editor`);
	const hasApprover = menus.has(`${key}-approver`);
	const hasImportViewer = key == "credit-application-management" && menus.has("credit-application-management-import-viewer");
	const hasImportEditor = key == "credit-application-management" && menus.has("credit-application-management-import-editor");
	const hasImportApprover = key == "credit-application-management" && menus.has("credit-application-management-import-approver");

	return {
		hasViewer,
		hasAuditor,
		hasEditor,
		hasApprover,
		hasImportViewer,
		hasImportEditor,
		hasImportApprover,
		canView: hasViewer || hasAuditor || hasEditor
	};
}

function buildManagementNavigationItem(menus: Set<DashboardRoleMenu>, key: DashboardManagementKey): DashboardManagementNavigationItem | null {
	const {
		hasViewer,
		hasAuditor,
		hasEditor,
		hasApprover,
		hasImportViewer,
		hasImportEditor,
		hasImportApprover,
		canView
	} = getModeFlags(menus, key);

	if(!canView && !hasApprover && !hasImportViewer && !hasImportEditor && !hasImportApprover)
		return null;

	const baseHref = `/${key}`;
	const viewLinkLabel = hasViewer ? modeLabelMap.viewer : auditorLabel;
	const links: DashboardNavLink[] = [];

	if(hasEditor)
		links.push({ label: modeLabelMap.editor, mode: "editor", href: `${baseHref}/editor` });
	else if(hasViewer || hasAuditor)
		links.push({ label: viewLinkLabel, mode: "viewer", href: `${baseHref}/viewer` });

	if(hasApprover)
		links.push({ label: modeLabelMap.approver, mode: "approver", href: `${baseHref}/approver` });

	if(key == "credit-application-management") {
		if(hasImportEditor)
			links.push({ label: modeLabelMap["import-editor"], mode: "import-editor", href: `${baseHref}/import-editor` });
		else if(hasImportViewer)
			links.push({ label: modeLabelMap["import-viewer"], mode: "import-viewer", href: `${baseHref}/import-viewer` });

		if(hasImportApprover)
			links.push({ label: modeLabelMap["import-approver"], mode: "import-approver", href: `${baseHref}/import-approver` });
	}

	if(links.length == 0)
		return null;

	const defaultLink = links[0];

	return {
		key,
		label: managementLabelMap[key],
		baseHref,
		hasSubmenu: links.length > 1,
		links,
		defaultHref: defaultLink.href,
		defaultMode: defaultLink.mode
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
			menus: true,
			_status: true,
			deletedAt: true
		}
	});
	if(role._status != "published" || role.deletedAt != null)
		return [];

	return normalizeDashboardRoleMenus(role.menus);
}

function resolveDefaultManagementHref(menus: DashboardRoleMenu[], key: DashboardManagementKey): string | null {
	const item = buildManagementNavigation(menus).find(candidate => candidate.key == key);
	return item?.defaultHref ?? null;
}

function resolveManagementModeRedirectHref(menus: DashboardRoleMenu[], key: DashboardManagementKey, mode: DashboardMode): string | null {
	const menuSet = new Set(menus);
	const {
		hasViewer,
		hasAuditor,
		hasEditor,
		hasApprover,
		hasImportViewer,
		hasImportEditor,
		hasImportApprover
	} = getModeFlags(menuSet, key);

	if(mode == "viewer") {
		if(hasEditor)
			return `/${key}/editor`;
		if(hasViewer || hasAuditor)
			return null;
		return "/";
	}

	if(mode == "editor")
		return hasEditor ? null : "/";

	if(mode == "import-viewer") {
		if(key != "credit-application-management")
			return "/";
		if(hasImportEditor)
			return `/${key}/import-editor`;
		return hasImportViewer ? null : "/";
	}

	if(mode == "import-editor") {
		if(key != "credit-application-management")
			return "/";
		return hasImportEditor ? null : "/";
	}

	if(mode == "import-approver") {
		if(key != "credit-application-management")
			return "/";
		return hasImportApprover ? null : "/";
	}

	return hasApprover ? null : "/";
}

function resolveViewerEditorTarget(menus: DashboardRoleMenu[], key: DashboardManagementKey): DashboardViewerEditorTarget {
	const menuSet = new Set(menus);
	const {
		hasViewer,
		hasEditor,
		hasImportViewer,
		hasImportEditor
	} = getModeFlags(menuSet, key);
	const viewerHref = hasViewer ? `/${key}/viewer` : null;
	const editorHref = hasEditor ? `/${key}/editor` : null;
	const importViewerHref = key == "credit-application-management" && hasImportViewer ? `/${key}/import-viewer` : null;
	const importEditorHref = key == "credit-application-management" && hasImportEditor ? `/${key}/import-editor` : null;

	return {
		key,
		viewerHref,
		editorHref,
		preferredHref: editorHref ?? viewerHref,
		importViewerHref,
		importEditorHref,
		importPreferredHref: importEditorHref ?? importViewerHref
	};
}

function resolveViewerEditorTargets(menus: DashboardRoleMenu[]): DashboardViewerEditorTargetMap {
	return {
		"user-management": resolveViewerEditorTarget(menus, "user-management"),
		"role-management": resolveViewerEditorTarget(menus, "role-management"),
		"team-management": resolveViewerEditorTarget(menus, "team-management"),
		"credit-application-management": resolveViewerEditorTarget(menus, "credit-application-management"),
		"credit-application-assignment": resolveViewerEditorTarget(menus, "credit-application-assignment"),
		"survey-management": resolveViewerEditorTarget(menus, "survey-management"),
		"satisfaction-survey-management": resolveViewerEditorTarget(menus, "satisfaction-survey-management")
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
	if(menu == "credit-application-management-viewer")
		return "Credit Application Management - Viewer";
	if(menu == "credit-application-management-auditor")
		return "Credit Application Management - Auditor";
	if(menu == "credit-application-management-editor")
		return "Credit Application Management - Editor";
	if(menu == "credit-application-management-approver")
		return "Credit Application Management - Approver";
	if(menu == "credit-application-management-import-viewer")
		return "Credit Application Management - Import Viewer";
	if(menu == "credit-application-management-import-editor")
		return "Credit Application Management - Import Editor";
	if(menu == "credit-application-management-import-approver")
		return "Credit Application Management - Import Approver";
	if(menu == "credit-application-assignment-viewer")
		return "Credit Application Assignment - Viewer";
	if(menu == "credit-application-assignment-auditor")
		return "Credit Application Assignment - Auditor";
	if(menu == "credit-application-assignment-editor")
		return "Credit Application Assignment - Editor";
	if(menu == "credit-application-assignment-approver")
		return "Credit Application Assignment - Approver";
	if(menu == "survey-management-viewer")
		return "Survey Management - Viewer";
	if(menu == "survey-management-auditor")
		return "Survey Management - Auditor";
	if(menu == "survey-management-editor")
		return "Survey Management - Editor";
	if(menu == "survey-management-approver")
		return "Survey Management - Approver";
	if(menu == "satisfaction-survey-management-viewer")
		return "Satisfaction Survey Management - Viewer";
	if(menu == "satisfaction-survey-management-auditor")
		return "Satisfaction Survey Management - Auditor";
	if(menu == "satisfaction-survey-management-editor")
		return "Satisfaction Survey Management - Editor";
	if(menu == "satisfaction-survey-management-approver")
		return "Satisfaction Survey Management - Approver";
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
			"user-management": { key: "user-management", viewerHref: null, editorHref: null, preferredHref: null, importViewerHref: null, importEditorHref: null, importPreferredHref: null },
			"role-management": { key: "role-management", viewerHref: null, editorHref: null, preferredHref: null, importViewerHref: null, importEditorHref: null, importPreferredHref: null },
			"team-management": { key: "team-management", viewerHref: null, editorHref: null, preferredHref: null, importViewerHref: null, importEditorHref: null, importPreferredHref: null },
			"credit-application-management": { key: "credit-application-management", viewerHref: null, editorHref: null, preferredHref: null, importViewerHref: null, importEditorHref: null, importPreferredHref: null },
			"credit-application-assignment": { key: "credit-application-assignment", viewerHref: null, editorHref: null, preferredHref: null, importViewerHref: null, importEditorHref: null, importPreferredHref: null },
			"survey-management": { key: "survey-management", viewerHref: null, editorHref: null, preferredHref: null, importViewerHref: null, importEditorHref: null, importPreferredHref: null },
			"satisfaction-survey-management": { key: "satisfaction-survey-management", viewerHref: null, editorHref: null, preferredHref: null, importViewerHref: null, importEditorHref: null, importPreferredHref: null }
		};
	}

	return resolveViewerEditorTargets(context.roleMenus);
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
		const supervisor = getRelationshipId(userDoc.supervisor);
		const relatedUsers = await findUsersByIds(payload, user, [supervisor].filter((value): value is string => value != null));
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
				{ label: "Supervisor", value: supervisor != null ? (relatedUsers.get(supervisor)?.name ?? "-") : "-" },
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

	if(type == "credit-application") {
		const creditApplicationDoc = await payload.findByID({
			collection: "credit-applications",
			id: normalizedId,
			user,
			overrideAccess: false,
			trash: true,
			depth: 0,
			select: {
				name: true,
				email: true,
				_status: true,
				deletedAt: true
			}
		});

		const creditApplicationName = String(creditApplicationDoc.name ?? "").trim();
		const creditApplicationEmail = String(creditApplicationDoc.email ?? "").trim();
		const creditApplicationStatus = String(creditApplicationDoc._status ?? "").trim();

		return {
			type,
			id: String(creditApplicationDoc.id),
			title: creditApplicationName.length > 0 ? creditApplicationName : (creditApplicationEmail.length > 0 ? creditApplicationEmail : `Credit Application ${creditApplicationDoc.id}`),
			description: creditApplicationEmail.length > 0 ? creditApplicationEmail : "Credit application entry",
			meta: [
				{ label: "Email", value: creditApplicationEmail.length > 0 ? creditApplicationEmail : "-" },
				{ label: "Status", value: creditApplicationStatus.length > 0 ? creditApplicationStatus : "-" },
				{ label: "Deleted At", value: formatSummaryDateLabel(creditApplicationDoc.deletedAt) }
			]
		};
	}

	if(type == "credit-application-import") {
		const importDoc = await payload.findByID({
			collection: "credit-application-imports",
			id: normalizedId,
			user,
			overrideAccess: false,
			trash: true,
			depth: 0,
			select: {
				filename: true,
				mimeType: true,
				filesize: true,
				deletedAt: true
			}
		});

		const filename = String(importDoc.filename ?? "").trim();
		const mimeType = String(importDoc.mimeType ?? "").trim();

		return {
			type,
			id: String(importDoc.id),
			title: filename.length > 0 ? filename : `Credit Application Import ${importDoc.id}`,
			description: mimeType.length > 0 ? mimeType : "Credit application import file",
			meta: [
				{ label: "MIME Type", value: mimeType.length > 0 ? mimeType : "-" },
				{ label: "File Size", value: typeof importDoc.filesize == "number" ? `${importDoc.filesize} B` : "-" },
				{ label: "Deleted At", value: formatSummaryDateLabel(importDoc.deletedAt) }
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

	const supervisor = getRelationshipId(teamDoc.supervisor);
	const officers = getRelationshipIds(teamDoc.officers);
	const usersById = await findUsersByIds(payload, user, [...new Set([
		...officers,
		...([supervisor].filter((value): value is string => value != null))
	])]);

	const officerNames = officers.map(officer => usersById.get(officer)?.name ?? "-");

	return {
		type,
		id: String(teamDoc.id),
		title: teamDoc.name,
		description: "Team entry",
		meta: [
			{ label: "Supervisor", value: supervisor != null ? (usersById.get(supervisor)?.name ?? "-") : "-" },
			{ label: "Officers", value: officerNames.length > 0 ? officerNames.join(", ") : "-" },
			{ label: "Deleted At", value: formatSummaryDateLabel(teamDoc.deletedAt) }
		]
	};
}

export async function logoutAction() {
	await payloadLogout({ config: payloadConfig });
	return redirect("/login", RedirectType.push);
}
