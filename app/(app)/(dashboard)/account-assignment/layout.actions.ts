"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Payload, type Where } from "payload";

import payloadConfig from "@payload-config";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type AssignmentStatus = "pending_approval" | "approved" | "rejected";
export type AccountAssignmentMode = "viewer" | "maker" | "checker";
export type AccountAssignmentRoleMenu = "account-assignment-viewer" | "account-assignment-maker" | "account-assignment-checker";

export type AssignmentContext = {
	payload: Payload;
	user: any;
	roleLevel: string | null;
	roleMenus: AccountAssignmentRoleMenu[];
};

export type AccountAssignmentMakerRow = {
	assignment_id: string | null;
	assignment_status: AssignmentStatus | null;
	apply_id: string;
	account_name: string;
	officer_name: string | null;
	address: string;
	product_code: string;
};

export type AccountAssignmentOfficerOption = {
	id: string;
	name: string;
};

export type AccountAssignmentMakerListOutput = {
	docs: AccountAssignmentMakerRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type AccountAssignmentCheckerGroup = {
	created_by: {
		id: string;
		name: string | null;
	};
	requests: Array<{
		assignment_id: string;
		apply_id: string;
		account_name: string;
		officer_name: string | null;
		address: string;
		product_code: string;
		requested_at: string;
	}>;
};

export type AccountAssignmentCheckerListOutput = {
	docs: AccountAssignmentCheckerGroup[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

const accountAssignmentRoleMenuSet = new Set<AccountAssignmentRoleMenu>([
	"account-assignment-viewer",
	"account-assignment-maker",
	"account-assignment-checker"
]);

function normalizeAccountAssignmentRoleMenus(value: unknown): AccountAssignmentRoleMenu[] {
	if(!Array.isArray(value))
		return [];

	const normalized = value
		.filter((menu): menu is AccountAssignmentRoleMenu => typeof menu == "string" && accountAssignmentRoleMenuSet.has(menu as AccountAssignmentRoleMenu));

	return [...new Set(normalized)];
}

function hasAccountAssignmentModeAccess(roleMenus: AccountAssignmentRoleMenu[], mode: AccountAssignmentMode): boolean {
	const menus = new Set(roleMenus);
	if(mode == "viewer")
		return menus.has("account-assignment-viewer");
	if(mode == "maker")
		return menus.has("account-assignment-maker");

	return menus.has("account-assignment-checker");
}

function resolveAccountAssignmentDefaultHref(roleMenus: AccountAssignmentRoleMenu[]): string {
	const menus = new Set(roleMenus);
	if(menus.has("account-assignment-maker"))
		return "/account-assignment/maker";
	if(menus.has("account-assignment-checker"))
		return "/account-assignment/checker";
	if(menus.has("account-assignment-viewer"))
		return "/account-assignment/viewer";
	return "/";
}

function resolveAccountAssignmentModeRedirectHref(roleMenus: AccountAssignmentRoleMenu[], mode: AccountAssignmentMode): string | null {
	const menus = new Set(roleMenus);
 
	if(mode == "viewer") {
		if(menus.has("account-assignment-maker"))
			return "/account-assignment/maker";
		if(menus.has("account-assignment-viewer"))
			return null;
		return "/";
	}

	if(mode == "maker")
		return menus.has("account-assignment-maker") ? null : "/";

	return menus.has("account-assignment-checker") ? null : "/";
}

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof (value as { id: unknown }).id == "string")
		return (value as { id: string }).id;
	return null;
}

function normalizePage(page: number): number {
	if(!Number.isFinite(page))
		return DEFAULT_PAGE;
	return Math.max(1, Math.floor(page));
}

function normalizeLimit(limit: number): number {
	if(!Number.isFinite(limit))
		return DEFAULT_LIMIT;
	return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

function normalizeSearch(search: string): string {
	return search.trim();
}

function buildAccountSearchWhere(search: string): Where | null {
	if(search.length == 0)
		return null;

	return {
		or: [
			{ id: { like: search } },
			{ name: { like: search } }
		]
	};
}

function buildSupervisorAccountScope(roleLevel: string | null, userId: string): Where | null {
	if(roleLevel != "supervisor")
		return null;

	return {
		or: [
			{ createdBy: { equals: userId } },
			{ "createdBy.supervisor": { equals: userId } }
		]
	};
}

function parseAssignPayload(input: unknown): Array<{ applyId: string; officerId: string }> {
	const raw = input != null && typeof input == "object" ? input as { apply_ids?: unknown[]; officer_ids?: unknown[] } : {};
	const rawApplyIds = Array.isArray(raw.apply_ids) ? raw.apply_ids : [];
	const rawOfficerIds = Array.isArray(raw.officer_ids) ? raw.officer_ids : [];

	const normalizedApplyIds = rawApplyIds
		.map((value: unknown): string => typeof value == "string" ? value.trim() : "")
		.filter((value: string): value is string => value.length > 0);
	const applyIds: string[] = [...new Set<string>(normalizedApplyIds)];
	const officerIds: string[] = rawOfficerIds
		.map((value: unknown) => typeof value == "string" ? value.trim() : "")
		.filter((value: string) => value.length > 0);

	if(applyIds.length == 0)
		throw new Error("apply_ids is required.");
	if(officerIds.length == 0)
		throw new Error("officer_ids is required.");
	if(officerIds.length != 1 && officerIds.length != applyIds.length)
		throw new Error("officer_ids length must be 1 or match apply_ids length.");

	const pairs: Array<{ applyId: string; officerId: string }> = [];
	for(let index = 0; index < applyIds.length; index++) {
		const officerId = officerIds.length == 1 ? officerIds[0] : officerIds[index];
		pairs.push({ applyId: applyIds[index], officerId });
	}
	return pairs;
}

export async function resolveRoleLevel(payload: Payload, user: any): Promise<string | null> {
	const roleValue = user?.role;
	if(roleValue != null && typeof roleValue == "object" && "level" in roleValue && typeof roleValue.level == "string")
		return roleValue.level;

	const roleId = getRelationshipId(roleValue);
	if(roleId == null)
		return null;

	const role = await payload.findByID({
		collection: "roles",
		id: roleId,
		user,
		overrideAccess: false,
		depth: 0,
		select: {
			level: true
		}
	});

	return typeof role.level == "string" ? role.level : null;
}

export async function resolveRoleMenus(payload: Payload, user: any): Promise<AccountAssignmentRoleMenu[]> {
	const roleValue = user?.role;
	if(roleValue != null && typeof roleValue == "object" && "menus" in roleValue)
		return normalizeAccountAssignmentRoleMenus((roleValue as { menus?: unknown }).menus);

	const roleId = getRelationshipId(roleValue);
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

	return normalizeAccountAssignmentRoleMenus(role.menus);
}

async function mapUserNamesById(payload: Payload, user: any, userIds: string[]): Promise<Map<string, string>> {
	const ids = [...new Set(userIds.filter((value): value is string => value != null && value.length > 0))];
	if(ids.length == 0)
		return new Map();

	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		where: {
			id: { in: ids }
		},
		select: {
			id: true,
			name: true
		}
	});

	const map = new Map<string, string>();
	for(const doc of result.docs as any[])
		map.set(String(doc.id), String(doc.name ?? "-"));

	return map;
}

async function assertOfficerUsers(payload: Payload, user: any, officerIds: string[]): Promise<void> {
	const ids = [...new Set(officerIds)];
	const usersResult = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 1,
		where: {
			id: { in: ids }
		},
		select: {
			id: true,
			role: true
		}
	});

	if(usersResult.docs.length != ids.length)
		throw new Error("One or more officer_ids are invalid.");

	for(const officer of usersResult.docs as any[]) {
		const roleLevel = officer?.role != null && typeof officer.role == "object" ? officer.role.level : null;
		if(roleLevel != "officer")
			throw new Error("All assignees must be users with officer role.");
	}
}

async function assertAccountsExist(payload: Payload, user: any, applyIds: string[]): Promise<void> {
	const ids = [...new Set(applyIds)];
	const result = await payload.find({
		collection: "credit-applications",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		where: {
			id: { in: ids }
		}
	});

	if(result.docs.length != ids.length)
		throw new Error("One or more apply_ids are invalid.");
}

async function findPendingAssignmentsByApplyIds(
	payload: Payload,
	user: any,
	applyIds: string[],
	excludeAssignmentId: string | null = null
): Promise<any[]> {
	const whereAnd: Where[] = [
		{ account: { in: applyIds } },
		{ status: { equals: "pending_approval" } }
	];
	if(excludeAssignmentId != null)
		whereAnd.push({ id: { not_equals: excludeAssignmentId } });

	const result = await payload.find({
		collection: "account-assignments" as never,
		user,
		overrideAccess: true,
		pagination: false,
		depth: 0,
		where: { and: whereAnd },
		select: {
			id: true,
			account: true,
			status: true
		} as never
	});

	return result.docs as any[];
}

export async function listAssignmentOfficerOptionsService(context: AssignmentContext): Promise<AccountAssignmentOfficerOption[]> {
	const { payload, user } = context;
	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 1,
		sort: "name",
		where: {
			"role.level": { equals: "officer" }
		},
		select: {
			id: true,
			name: true
		}
	});

	return result.docs.map(doc => ({
		id: String((doc as any).id),
		name: String((doc as any).name ?? (doc as any).id)
	}));
}

export async function queryMakerAssignmentsService(context: AssignmentContext, input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentMakerListOutput> {
	const { payload, user, roleLevel } = context;
	const page = normalizePage(input.page);
	const limit = normalizeLimit(input.limit);
	const search = normalizeSearch(input.search);
	const accountSearchWhere = buildAccountSearchWhere(search);
	const supervisorScope = buildSupervisorAccountScope(roleLevel, String(user.id));

	const accountWhereTerms: Where[] = [
		{
			or: [
				{ deletedAt: { exists: false } },
				{ deletedAt: { equals: null } }
			]
		},
		...(accountSearchWhere != null ? [accountSearchWhere] : []),
		...(supervisorScope != null ? [supervisorScope] : [])
	];

	const accountsResult = await payload.find({
		collection: "credit-applications",
		user,
		overrideAccess: false,
		depth: 0,
		page,
		limit,
		sort: "-updatedAt",
		where: {
			and: accountWhereTerms
		},
		select: {
			id: true,
			name: true,
			addresses: true,
			assetId: true
		}
	});

	const accountIds = accountsResult.docs.map((doc: any) => String(doc.id));
	if(accountIds.length == 0) {
		return {
			docs: [],
			totalDocs: accountsResult.totalDocs,
			page: accountsResult.page ?? page,
			hasNextPage: accountsResult.hasNextPage,
			hasPreviousPage: accountsResult.hasPrevPage
		};
	}

	const assignmentsResult = await payload.find({
		collection: "account-assignments" as never,
		user,
		overrideAccess: true,
		pagination: false,
		depth: 0,
		sort: "-updatedAt",
		where: {
			account: { in: accountIds }
		},
		select: {
			id: true,
			account: true,
			currentUser: true,
			status: true,
			updatedAt: true
		} as never
	});

	const assignmentByAccountId = new Map<string, any>();
	for(const assignment of assignmentsResult.docs as any[]) {
		const accountId = getRelationshipId(assignment.account);
		if(accountId != null && assignmentByAccountId.has(accountId) == false)
			assignmentByAccountId.set(accountId, assignment);
	}

	const officerIds = [...new Set((assignmentsResult.docs as any[])
		.map(doc => getRelationshipId(doc.currentUser))
		.filter((value): value is string => value != null))];
	const officerNameById = await mapUserNamesById(payload, user, officerIds);

	const docs: AccountAssignmentMakerRow[] = (accountsResult.docs as any[]).map(account => {
		const assignment = assignmentByAccountId.get(String(account.id)) ?? null;
		const assignmentId = assignment != null ? String(assignment.id) : null;
		const currentOfficerId = assignment != null ? getRelationshipId(assignment.currentUser) : null;
		const officerName = currentOfficerId != null ? (officerNameById.get(currentOfficerId) ?? null) : null;
		const addresses = Array.isArray(account.addresses) ? account.addresses : [];

		return {
			assignment_id: assignmentId,
			assignment_status: assignment != null ? String(assignment.status) as AssignmentStatus : null,
			apply_id: String(account.id),
			account_name: String(account.name ?? ""),
			officer_name: officerName,
			address: addresses.length > 0 ? String(addresses[0]) : "",
			product_code: String(account.assetId ?? "")
		};
	});

	return {
		docs,
		totalDocs: accountsResult.totalDocs,
		page: accountsResult.page ?? page,
		hasNextPage: accountsResult.hasNextPage,
		hasPreviousPage: accountsResult.hasPrevPage
	};
}

export async function createAssignmentRequestsService(context: AssignmentContext, input: {
	apply_ids: string[];
	officer_ids: string[];
}): Promise<{ message: string; ids: string[] }> {
	const { payload, user } = context;
	const pairs = parseAssignPayload(input);
	const applyIds = pairs.map(pair => pair.applyId);
	const officerIds = pairs.map(pair => pair.officerId);

	await assertAccountsExist(payload, user, applyIds);
	await assertOfficerUsers(payload, user, officerIds);

	const pendingAssignments = await findPendingAssignmentsByApplyIds(payload, user, applyIds);
	if(pendingAssignments.length > 0)
		throw new Error("One or more accounts are currently pending another assignment approval.");

	const existingAssignments = await payload.find({
		collection: "account-assignments" as never,
		user,
		overrideAccess: true,
		pagination: false,
		depth: 0,
		where: {
			account: { in: applyIds }
		},
		select: {
			id: true,
			account: true,
			status: true
		} as never
	});
	if(existingAssignments.docs.length > 0)
		throw new Error("One or more accounts already have assignment history. Use reassign action instead.");

	const createdIds: string[] = [];
	for(const pair of pairs) {
		const created = await payload.create({
			collection: "account-assignments" as never,
			user,
			overrideAccess: true,
			data: {
				account: pair.applyId,
				currentUser: pair.officerId,
				lastUser: null,
				status: "pending_approval" as AssignmentStatus,
				createdBy: user.id,
				approvedBy: null,
				approvedTime: null,
				notificationMessage: null
			} as never
		});
		createdIds.push(String((created as any).id));
	}

	return {
		message: "Assignment requests created.",
		ids: createdIds
	};
}

export async function reassignAssignmentRequestService(context: AssignmentContext, input: {
	assignmentId: string;
	officer_ids: string[];
}): Promise<{ message: string; id: string }> {
	const { payload, user } = context;
	const assignmentId = input.assignmentId.trim();
	if(assignmentId.length == 0)
		throw new Error("Assignment id is required.");

	const rawOfficerIds = Array.isArray(input.officer_ids) ? input.officer_ids : [];
	const officerIds = rawOfficerIds
		.map((value: unknown) => typeof value == "string" ? value.trim() : "")
		.filter((value: string) => value.length > 0);
	if(officerIds.length == 0)
		throw new Error("officer_ids is required.");
	if(officerIds.length > 1)
		throw new Error("Reassign only accepts one officer id.");

	const nextOfficerId = officerIds[0];
	await assertOfficerUsers(payload, user, [nextOfficerId]);

	const assignment = await payload.findByID({
		collection: "account-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		depth: 0,
		select: {
			id: true,
			account: true,
			currentUser: true,
			status: true
		} as never
	}) as any;

	if(assignment.status == "pending_approval")
		throw new Error("This assignment is still pending approval and cannot be reassigned yet.");

	const accountId = getRelationshipId(assignment.account);
	if(accountId == null)
		throw new Error("Assignment account reference is invalid.");

	const pendingForAccount = await findPendingAssignmentsByApplyIds(payload, user, [accountId], assignmentId);
	if(pendingForAccount.length > 0)
		throw new Error("This account is currently pending another assignment approval.");

	const oldOfficerId = getRelationshipId(assignment.currentUser);
	await payload.update({
		collection: "account-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		data: {
			lastUser: oldOfficerId,
			currentUser: nextOfficerId,
			status: "pending_approval",
			createdBy: user.id,
			approvedBy: null,
			approvedTime: null,
			notificationMessage: null
		} as never
	});

	return {
		message: "Assignment has been submitted for reassignment approval.",
		id: assignmentId
	};
}

export async function queryCheckerAssignmentsService(context: AssignmentContext, input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentCheckerListOutput> {
	const { payload, user } = context;
	const search = normalizeSearch(input.search);
	const page = normalizePage(input.page);
	const limit = normalizeLimit(input.limit);

	const whereTerms: Where[] = [
		{ status: { equals: "pending_approval" } }
	];
	if(search.length > 0) {
		whereTerms.push({
			or: [
				{ "account.id": { like: search } },
				{ "account.name": { like: search } }
			]
		});
	}

	const assignmentsResult = await payload.find({
		collection: "account-assignments" as never,
		user,
		overrideAccess: true,
		depth: 1,
		page,
		limit,
		sort: "-updatedAt",
		where: {
			and: whereTerms
		},
		select: {
			id: true,
			account: true,
			createdBy: true,
			currentUser: true,
			status: true,
			createdAt: true
		} as never
	});

	const userIds = [...new Set((assignmentsResult.docs as any[]).flatMap(doc => [
		getRelationshipId(doc.createdBy),
		getRelationshipId(doc.currentUser)
	].filter((value): value is string => value != null)))];
	const userNameById = await mapUserNamesById(payload, user, userIds);

	const grouped = new Map<string, AccountAssignmentCheckerGroup>();

	for(const assignment of assignmentsResult.docs as any[]) {
		const createdById = getRelationshipId(assignment.createdBy) ?? "unknown";
		const currentUserId = getRelationshipId(assignment.currentUser);
		const account = assignment.account != null && typeof assignment.account == "object" ? assignment.account : null;
		if(account == null)
			continue;

		const addresses = Array.isArray(account.addresses) ? account.addresses : [];
		const requestItem = {
			assignment_id: String(assignment.id),
			apply_id: String(account.id),
			account_name: String(account.name ?? ""),
			officer_name: currentUserId != null ? (userNameById.get(currentUserId) ?? null) : null,
			address: addresses.length > 0 ? String(addresses[0]) : "",
			product_code: String(account.assetId ?? ""),
			requested_at: String(assignment.createdAt ?? "")
		};

		if(!grouped.has(createdById)) {
			grouped.set(createdById, {
				created_by: {
					id: createdById,
					name: userNameById.get(createdById) ?? null
				},
				requests: []
			});
		}

		grouped.get(createdById)?.requests.push(requestItem);
	}

	return {
		docs: [...grouped.values()],
		totalDocs: assignmentsResult.totalDocs,
		page: assignmentsResult.page ?? page,
		hasNextPage: assignmentsResult.hasNextPage,
		hasPreviousPage: assignmentsResult.hasPrevPage
	};
}

export async function approveAssignmentService(context: AssignmentContext, input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string; notification: string }> {
	const { payload, user } = context;
	const assignmentId = input.assignmentId.trim();
	if(assignmentId.length == 0)
		throw new Error("Assignment id is required.");

	const assignment = await payload.findByID({
		collection: "account-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		depth: 0,
		select: {
			id: true,
			status: true
		} as never
	}) as any;

	if(assignment.status != "pending_approval")
		throw new Error("Only pending approval assignments can be approved.");

	await payload.update({
		collection: "account-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		data: {
			status: "approved",
			approvedBy: user.id,
			approvedTime: new Date().toISOString(),
			notificationMessage: "Data has changed"
		} as never
	});

	return {
		message: "Assignment approved.",
		id: assignmentId,
		notification: "Data has changed"
	};
}

export async function rejectAssignmentService(context: AssignmentContext, input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string }> {
	const { payload, user } = context;
	const assignmentId = input.assignmentId.trim();
	if(assignmentId.length == 0)
		throw new Error("Assignment id is required.");

	const assignment = await payload.findByID({
		collection: "account-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		depth: 0,
		select: {
			id: true,
			status: true
		} as never
	}) as any;

	if(assignment.status != "pending_approval")
		throw new Error("Only pending approval assignments can be rejected.");

	await payload.update({
		collection: "account-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		data: {
			status: "rejected",
			approvedBy: user.id,
			approvedTime: new Date().toISOString()
		} as never
	});

	return {
		message: "Assignment rejected.",
		id: assignmentId
	};
}

type AuthContext = {
	payload: Payload;
	user: any;
	roleLevel: string | null;
	roleMenus: AccountAssignmentRoleMenu[];
};

async function getAuthContext(): Promise<AuthContext> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const roleLevel = await resolveRoleLevel(payload, user);
	const roleMenus = await resolveRoleMenus(payload, user);
	return { payload, user, roleLevel, roleMenus };
}

async function getModeAuthContext(mode: AccountAssignmentMode): Promise<AuthContext> {
	const context = await getAuthContext();
	if(!hasAccountAssignmentModeAccess(context.roleMenus, mode))
		return unauthorized();

	return context;
}

export async function resolveAccountAssignmentModeRedirectHrefAction(mode: AccountAssignmentMode): Promise<string | null> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return "/login";

	const roleMenus = await resolveRoleMenus(payload, user);
	return resolveAccountAssignmentModeRedirectHref(roleMenus, mode);
}

export async function resolveAccountAssignmentRootHrefAction(): Promise<string> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return "/login";

	const roleMenus = await resolveRoleMenus(payload, user);
	return resolveAccountAssignmentDefaultHref(roleMenus);
}

export async function queryViewerAssignmentsAction(input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentMakerListOutput> {
	const context = await getModeAuthContext("viewer");
	return queryMakerAssignmentsService(context, input);
}

export async function listAssignmentOfficerOptionsAction(): Promise<AccountAssignmentOfficerOption[]> {
	const context = await getModeAuthContext("maker");
	return listAssignmentOfficerOptionsService(context);
}

export async function queryMakerAssignmentsAction(input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentMakerListOutput> {
	const context = await getModeAuthContext("maker");
	return queryMakerAssignmentsService(context, input);
}

export async function createAssignmentRequestsAction(input: {
	apply_ids: string[];
	officer_ids: string[];
}): Promise<{ message: string; ids: string[] }> {
	const context = await getModeAuthContext("maker");
	return createAssignmentRequestsService(context, input);
}

export async function reassignAssignmentRequestAction(input: {
	assignmentId: string;
	officer_ids: string[];
}): Promise<{ message: string; id: string }> {
	const context = await getModeAuthContext("maker");
	return reassignAssignmentRequestService(context, input);
}

export async function queryCheckerAssignmentsAction(input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentCheckerListOutput> {
	const context = await getModeAuthContext("checker");
	return queryCheckerAssignmentsService(context, input);
}

export async function approveAssignmentAction(input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string; notification: string }> {
	const context = await getModeAuthContext("checker");
	return approveAssignmentService(context, input);
}

export async function rejectAssignmentAction(input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string }> {
	const context = await getModeAuthContext("checker");
	return rejectAssignmentService(context, input);
}
