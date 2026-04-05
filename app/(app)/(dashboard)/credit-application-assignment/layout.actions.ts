"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Payload, type Where } from "payload";

import payloadConfig from "@payload-config";
import {
	resolveManagementModeRedirectHrefAction as resolveDashboardManagementModeRedirectHrefAction,
	resolveManagementRootHref
} from "../layout.actions";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type AssignmentStatus = "pending_approval" | "approved" | "rejected";
export type AccountAssignmentMode = "viewer" | "editor" | "approver";

export type AssignmentContext = {
	payload: Payload;
	user: any;
	roleLevel: string | null;
};

export type AccountAssignmentEditorRow = {
	assignmentId: string | null;
	assignmentStatus: AssignmentStatus | null;
	applyId: string;
	accountName: string;
	officerName: string | null;
	address: string;
	productCode: string;
};

export type AccountAssignmentOfficerOption = {
	id: string;
	name: string;
};

export type AccountAssignmentEditorListOutput = {
	docs: AccountAssignmentEditorRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type AccountAssignmentApproverGroup = {
	createdBy: {
		id: string;
		name: string | null;
	};
	requests: Array<{
		assignmentId: string;
		applyId: string;
		accountName: string;
		officerName: string | null;
		address: string;
		productCode: string;
		requestedAt: string;
	}>;
};

export type AccountAssignmentApproverListOutput = {
	docs: AccountAssignmentApproverGroup[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

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
	const raw = input != null && typeof input == "object" ? input as { applyIds?: unknown[]; officerIds?: unknown[] } : {};
	const rawApplyIds = Array.isArray(raw.applyIds) ? raw.applyIds : [];
	const rawOfficerIds = Array.isArray(raw.officerIds) ? raw.officerIds : [];

	const normalizedApplyIds = rawApplyIds
		.map((value: unknown): string => typeof value == "string" ? value.trim() : "")
		.filter((value: string): value is string => value.length > 0);
	const applyIds: string[] = [...new Set<string>(normalizedApplyIds)];
	const officerIds: string[] = rawOfficerIds
		.map((value: unknown) => typeof value == "string" ? value.trim() : "")
		.filter((value: string) => value.length > 0);

	if(applyIds.length == 0)
		throw new Error("applyIds is required.");
	if(officerIds.length == 0)
		throw new Error("officerIds is required.");
	if(officerIds.length != 1 && officerIds.length != applyIds.length)
		throw new Error("officerIds length must be 1 or match applyIds length.");

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
		throw new Error("One or more officerIds are invalid.");

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
		throw new Error("One or more applyIds are invalid.");
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
		collection: "credit-application-assignments" as never,
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

export async function queryEditorAssignmentsService(context: AssignmentContext, input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentEditorListOutput> {
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
		collection: "credit-application-assignments" as never,
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
			user: true,
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
		.map(doc => getRelationshipId(doc.user))
		.filter((value): value is string => value != null))];
	const officerNameById = await mapUserNamesById(payload, user, officerIds);

	const docs: AccountAssignmentEditorRow[] = (accountsResult.docs as any[]).map(account => {
		const assignment = assignmentByAccountId.get(String(account.id)) ?? null;
		const assignmentId = assignment != null ? String(assignment.id) : null;
		const currentOfficerId = assignment != null ? getRelationshipId(assignment.user) : null;
		const officerName = currentOfficerId != null ? (officerNameById.get(currentOfficerId) ?? null) : null;
		const addresses = Array.isArray(account.addresses) ? account.addresses : [];

		return {
			assignmentId: assignmentId,
			assignmentStatus: assignment != null ? String(assignment.status) as AssignmentStatus : null,
			applyId: String(account.id),
			accountName: String(account.name ?? ""),
			officerName: officerName,
			address: addresses.length > 0 ? String(addresses[0]) : "",
			productCode: String(account.assetId ?? "")
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
	applyIds: string[];
	officerIds: string[];
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
		collection: "credit-application-assignments" as never,
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
			collection: "credit-application-assignments" as never,
			user,
			overrideAccess: true,
			data: {
				account: pair.applyId,
				user: pair.officerId,
				status: "pending_approval" as AssignmentStatus,
				createdBy: user.id,
				reviewedBy: null,
				reviewedAt: null,
				reviewApproved: false,
				reviewComment: null
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
	officerIds: string[];
}): Promise<{ message: string; id: string }> {
	const { payload, user } = context;
	const assignmentId = input.assignmentId.trim();
	if(assignmentId.length == 0)
		throw new Error("Assignment id is required.");

	const rawOfficerIds = Array.isArray(input.officerIds) ? input.officerIds : [];
	const officerIds = rawOfficerIds
		.map((value: unknown) => typeof value == "string" ? value.trim() : "")
		.filter((value: string) => value.length > 0);
	if(officerIds.length == 0)
		throw new Error("officerIds is required.");
	if(officerIds.length > 1)
		throw new Error("Reassign only accepts one officer id.");

	const nextOfficerId = officerIds[0];
	await assertOfficerUsers(payload, user, [nextOfficerId]);

	const assignment = await payload.findByID({
		collection: "credit-application-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		depth: 0,
		select: {
			id: true,
			account: true,
			user: true,
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

	await payload.update({
		collection: "credit-application-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		data: {
			user: nextOfficerId,
			status: "pending_approval",
			createdBy: user.id,
			reviewedBy: null,
			reviewedAt: null,
			reviewApproved: false,
			reviewComment: null
		} as never
	});

	return {
		message: "Assignment has been submitted for reassignment approval.",
		id: assignmentId
	};
}

export async function queryApproverAssignmentsService(context: AssignmentContext, input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentApproverListOutput> {
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
		collection: "credit-application-assignments" as never,
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
			user: true,
			status: true,
			createdAt: true
		} as never
	});

	const userIds = [...new Set((assignmentsResult.docs as any[]).flatMap(doc => [
		getRelationshipId(doc.createdBy),
		getRelationshipId(doc.user)
	].filter((value): value is string => value != null)))];
	const userNameById = await mapUserNamesById(payload, user, userIds);

	const grouped = new Map<string, AccountAssignmentApproverGroup>();

	for(const assignment of assignmentsResult.docs as any[]) {
		const createdById = getRelationshipId(assignment.createdBy) ?? "unknown";
		const currentUserId = getRelationshipId(assignment.user);
		const account = assignment.account != null && typeof assignment.account == "object" ? assignment.account : null;
		if(account == null)
			continue;

		const addresses = Array.isArray(account.addresses) ? account.addresses : [];
		const requestItem = {
			assignmentId: String(assignment.id),
			applyId: String(account.id),
			accountName: String(account.name ?? ""),
			officerName: currentUserId != null ? (userNameById.get(currentUserId) ?? null) : null,
			address: addresses.length > 0 ? String(addresses[0]) : "",
			productCode: String(account.assetId ?? ""),
			requestedAt: String(assignment.createdAt ?? "")
		};

		if(!grouped.has(createdById)) {
			grouped.set(createdById, {
				createdBy: {
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
		collection: "credit-application-assignments" as never,
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
		collection: "credit-application-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		data: {
			status: "approved",
			reviewedBy: user.id,
			reviewedAt: new Date().toISOString(),
			reviewApproved: true,
			reviewComment: null
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
		collection: "credit-application-assignments" as never,
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
		collection: "credit-application-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		data: {
			status: "rejected",
			reviewedBy: user.id,
			reviewedAt: new Date().toISOString(),
			reviewApproved: false,
			reviewComment: null
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
};

async function getAuthContext(): Promise<AuthContext> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const roleLevel = await resolveRoleLevel(payload, user);
	return { payload, user, roleLevel };
}

async function getModeAuthContext(_mode: AccountAssignmentMode): Promise<AuthContext> {
	return getAuthContext();
}

export async function resolveAccountAssignmentModeRedirectHrefAction(mode: AccountAssignmentMode): Promise<string | null> {
	return resolveDashboardManagementModeRedirectHrefAction("credit-application-assignment", mode);
}

export async function resolveAccountAssignmentRootHrefAction(): Promise<string> {
	return resolveManagementRootHref("credit-application-assignment");
}

export async function queryViewerAssignmentsAction(input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentEditorListOutput> {
	const context = await getModeAuthContext("viewer");
	return queryEditorAssignmentsService(context, input);
}

export async function listAssignmentOfficerOptionsAction(): Promise<AccountAssignmentOfficerOption[]> {
	const context = await getModeAuthContext("editor");
	return listAssignmentOfficerOptionsService(context);
}

export async function queryEditorAssignmentsAction(input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentEditorListOutput> {
	const context = await getModeAuthContext("editor");
	return queryEditorAssignmentsService(context, input);
}

export async function createAssignmentRequestsAction(input: {
	applyIds: string[];
	officerIds: string[];
}): Promise<{ message: string; ids: string[] }> {
	const context = await getModeAuthContext("editor");
	return createAssignmentRequestsService(context, input);
}

export async function reassignAssignmentRequestAction(input: {
	assignmentId: string;
	officerIds: string[];
}): Promise<{ message: string; id: string }> {
	const context = await getModeAuthContext("editor");
	return reassignAssignmentRequestService(context, input);
}

export async function queryApproverAssignmentsAction(input: {
	search: string;
	page: number;
	limit: number;
}): Promise<AccountAssignmentApproverListOutput> {
	const { payload, user } = await getModeAuthContext("approver");
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
		collection: "credit-application-assignments" as never,
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
			user: true,
			status: true,
			createdAt: true
		} as never
	});

	const userIds = [...new Set((assignmentsResult.docs as any[]).flatMap(doc => [
		getRelationshipId(doc.createdBy),
		getRelationshipId(doc.user)
	].filter((value): value is string => value != null)))];
	const userNameById = await mapUserNamesById(payload, user, userIds);

	const grouped = new Map<string, AccountAssignmentApproverGroup>();

	for(const assignment of assignmentsResult.docs as any[]) {
		const createdById = getRelationshipId(assignment.createdBy) ?? "unknown";
		const assignedUserId = getRelationshipId(assignment.user);
		const account = assignment.account != null && typeof assignment.account == "object" ? assignment.account : null;
		if(account == null)
			continue;

		const addresses = Array.isArray(account.addresses) ? account.addresses : [];
		const requestItem = {
			assignmentId: String(assignment.id),
			applyId: String(account.id),
			accountName: String(account.name ?? ""),
			officerName: assignedUserId != null ? (userNameById.get(assignedUserId) ?? null) : null,
			address: addresses.length > 0 ? String(addresses[0]) : "",
			productCode: String(account.assetId ?? ""),
			requestedAt: String(assignment.createdAt ?? "")
		};

		if(!grouped.has(createdById)) {
			grouped.set(createdById, {
				createdBy: {
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

export async function approveAssignmentAction(input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string; notification: string }> {
	const { payload, user } = await getModeAuthContext("approver");
	const assignmentId = input.assignmentId.trim();
	if(assignmentId.length == 0)
		throw new Error("Assignment id is required.");

	const assignment = await payload.findByID({
		collection: "credit-application-assignments" as never,
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
		collection: "credit-application-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		data: {
			status: "approved",
			reviewedBy: user.id,
			reviewedAt: new Date().toISOString(),
			reviewApproved: true,
			reviewComment: null
		} as never
	});

	return {
		message: "Assignment approved.",
		id: assignmentId,
		notification: "Data has changed"
	};
}

export async function rejectAssignmentAction(input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string }> {
	const { payload, user } = await getModeAuthContext("approver");
	const assignmentId = input.assignmentId.trim();
	if(assignmentId.length == 0)
		throw new Error("Assignment id is required.");

	const assignment = await payload.findByID({
		collection: "credit-application-assignments" as never,
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
		collection: "credit-application-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		data: {
			status: "rejected",
			reviewedBy: user.id,
			reviewedAt: new Date().toISOString(),
			reviewApproved: false,
			reviewComment: null
		} as never
	});

	return {
		message: "Assignment rejected.",
		id: assignmentId
	};
}
