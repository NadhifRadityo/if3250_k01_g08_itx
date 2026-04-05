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

const assignmentStatusValues = ["pending_approval", "approved", "rejected"] as const;

export type AssignmentStatus = typeof assignmentStatusValues[number];
export type AccountAssignmentMode = "viewer" | "editor" | "approver";

export type AccountAssignmentSortField =
	| "applyId"
	| "accountName"
	| "officerName"
	| "address"
	| "productCode"
	| "assignmentStatus"
	| "createdAt"
	| "updatedAt";

export type AccountAssignmentSortToken = `${"+" | "-"}${AccountAssignmentSortField}`;

export type AccountAssignmentFilterColumn =
	| "applyId"
	| "accountName"
	| "officerName"
	| "address"
	| "productCode"
	| "assignmentStatus";

export type AccountAssignmentFilterOperator = "equals" | "not_equals" | "contains" | "not_contains" | "in" | "not_in" | "exists";
export type AccountAssignmentFilterCombinator = "and" | "or";

export type AccountAssignmentFilterInput = {
	column: AccountAssignmentFilterColumn;
	operator: AccountAssignmentFilterOperator;
	value?: string | Array<string | boolean> | boolean | null;
	joinWithPrevious?: AccountAssignmentFilterCombinator;
};

export type AssignmentContext = {
	payload: Payload;
	user: any;
	roleLevel: string | null;
};

export type AccountAssignmentEditorRow = {
	assignmentId: string | null;
	assignmentStatus: AssignmentStatus;
	applyId: string;
	accountName: string;
	officerName: string | null;
	address: string;
	productCode: string;
	userId: string | null;
	createdById: string | null;
	updatedById: string | null;
	deletedById: string | null;
	reviewedById: string | null;
	requestedAt: string | null;
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

export type AccountAssignmentApproverListOutput = AccountAssignmentEditorListOutput;

export type AccountAssignmentQueryInput = {
	keyword: string;
	sort: string[];
	filters?: AccountAssignmentFilterInput[];
	filterCombinator?: AccountAssignmentFilterCombinator;
	page: number;
	limit: number;
};

export type AccountAssignmentQueryActionInput = {
	keyword?: string;
	search?: string;
	sort?: string[];
	filters?: AccountAssignmentFilterInput[];
	filterCombinator?: AccountAssignmentFilterCombinator;
	page: number;
	limit: number;
};

export type ReviewAssignmentInput = {
	assignmentId: string;
	decision: "approve" | "reject";
	notes?: string;
};

const sortableFields = new Set<AccountAssignmentSortField>([
	"applyId",
	"accountName",
	"officerName",
	"address",
	"productCode",
	"assignmentStatus",
	"createdAt",
	"updatedAt"
]);

const filterableColumns = new Set<AccountAssignmentFilterColumn>([
	"applyId",
	"accountName",
	"officerName",
	"address",
	"productCode",
	"assignmentStatus"
]);

const filterOperators = new Set<AccountAssignmentFilterOperator>([
	"equals",
	"not_equals",
	"contains",
	"not_contains",
	"in",
	"not_in",
	"exists"
]);

const statusFilterOperators = new Set<AccountAssignmentFilterOperator>([
	"equals",
	"not_equals",
	"in",
	"not_in",
	"exists"
]);

export type AccountAssignmentRelationColumn = "createdBy" | "updatedBy" | "deletedBy" | "account" | "user" | "reviewedBy";

export type AccountAssignmentRelationValues = Partial<Record<AccountAssignmentRelationColumn, string>>;

export type ResolveAccountAssignmentRelationColumnsInput = {
	rows: Array<Pick<AccountAssignmentEditorRow, "assignmentId" | "applyId" | "userId" | "createdById" | "updatedById" | "deletedById" | "reviewedById">>;
	columns: AccountAssignmentRelationColumn[];
};

export type ResolveAccountAssignmentRelationColumnsOutput = Array<{
	id: string;
	values: AccountAssignmentRelationValues;
}>;

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

function parseBooleanValue(value: unknown): boolean | null {
	if(typeof value == "boolean")
		return value;
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase();
	if(normalized == "true" || normalized == "1" || normalized == "yes")
		return true;
	if(normalized == "false" || normalized == "0" || normalized == "no")
		return false;
	return null;
}

function normalizeAssignmentStatusValue(value: unknown): AssignmentStatus | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase() as AssignmentStatus;
	return assignmentStatusValues.includes(normalized) ? normalized : null;
}

function normalizeSortTokens(sort: string[]): AccountAssignmentSortToken[] {
	const prefixed = sort
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1) as AccountAssignmentSortField)) as AccountAssignmentSortToken[];
	const deduplicated = prefixed.filter((token, index, source) =>
		index == source.findIndex(candidate => candidate.slice(1) == token.slice(1))
	);
	if(deduplicated.length == 0)
		return ["-updatedAt"];
	return deduplicated;
}

function normalizeFilterCombinator(filterCombinator: AccountAssignmentFilterCombinator | undefined): AccountAssignmentFilterCombinator {
	return filterCombinator == "or" ? "or" : "and";
}

function normalizeScalarFilterValue(column: AccountAssignmentFilterColumn, rawValue: unknown): string | boolean | null {
	if(rawValue == null)
		return null;

	if(column == "assignmentStatus")
		return normalizeAssignmentStatusValue(rawValue);

	if(typeof rawValue != "string")
		return null;
	const trimmed = rawValue.trim();
	if(trimmed.length == 0)
		return null;
	return trimmed;
}

function normalizeFilters(filters: AccountAssignmentFilterInput[] | undefined, fallbackCombinator: AccountAssignmentFilterCombinator): AccountAssignmentFilterInput[] {
	if(filters == null)
		return [];

	const normalized: AccountAssignmentFilterInput[] = [];
	for(const filter of filters) {
		if(filter == null || !filterableColumns.has(filter.column) || !filterOperators.has(filter.operator))
			continue;
		if(filter.column == "assignmentStatus" && !statusFilterOperators.has(filter.operator))
			continue;

		if(filter.operator == "exists") {
			const existsValue = parseBooleanValue(filter.value) ?? true;
			normalized.push({
				column: filter.column,
				operator: filter.operator,
				value: existsValue,
				joinWithPrevious: normalized.length == 0 ? undefined : (filter.joinWithPrevious == "or" ? "or" : fallbackCombinator)
			});
			continue;
		}

		if(filter.operator == "in" || filter.operator == "not_in") {
			const values = (Array.isArray(filter.value) ? filter.value : String(filter.value ?? "").split(","))
				.map(value => normalizeScalarFilterValue(filter.column, value))
				.filter((value): value is string | boolean => value != null);
			if(values.length == 0)
				continue;
			normalized.push({
				column: filter.column,
				operator: filter.operator,
				value: values,
				joinWithPrevious: normalized.length == 0 ? undefined : (filter.joinWithPrevious == "or" ? "or" : fallbackCombinator)
			});
			continue;
		}

		const scalarValue = normalizeScalarFilterValue(filter.column, filter.value);
		if(scalarValue == null)
			continue;

		normalized.push({
			column: filter.column,
			operator: filter.operator,
			value: scalarValue,
			joinWithPrevious: normalized.length == 0 ? undefined : (filter.joinWithPrevious == "or" ? "or" : fallbackCombinator)
		});
	}

	return normalized;
}

function toPayloadFieldPath(field: AccountAssignmentSortField | AccountAssignmentFilterColumn): string {
	if(field == "applyId")
		return "account.id";
	if(field == "accountName")
		return "account.name";
	if(field == "officerName")
		return "user.name";
	if(field == "address")
		return "account.addresses";
	if(field == "productCode")
		return "account.assetId";
	if(field == "assignmentStatus")
		return "reviewedAt";
	if(field == "createdAt")
		return "createdAt";
	return "updatedAt";
}

function toPayloadSort(sortTokens: AccountAssignmentSortToken[]): string {
	return sortTokens.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as AccountAssignmentSortField;
		return `${direction}${toPayloadFieldPath(field)}`;
	}).join(",");
}

function toPayloadFilterWhere(filters: AccountAssignmentFilterInput[]): Where | null {
	if(filters.length == 0)
		return null;

	const operatorMap: Record<AccountAssignmentFilterOperator, string> = {
		equals: "equals",
		not_equals: "not_equals",
		contains: "like",
		not_contains: "not_like",
		in: "in",
		not_in: "not_in",
		exists: "exists"
	};

	const impossibleWhere: Where = {
		and: [
			{ reviewedAt: { exists: true } },
			{ reviewedAt: { exists: false } }
		]
	};

	const getStatusWhere = (status: AssignmentStatus): Where => {
		if(status == "pending_approval")
			return { reviewedAt: { exists: false } };
		if(status == "approved") {
			return {
				and: [
					{ reviewedAt: { exists: true } },
					{ reviewApproved: { equals: true } }
				]
			};
		}
		return {
			and: [
				{ reviewedAt: { exists: true } },
				{ reviewApproved: { equals: false } }
			]
		};
	};

	const buildStatusFilterWhere = (filter: AccountAssignmentFilterInput): Where | null => {
		if(filter.operator == "exists")
			return filter.value == true ? null : impossibleWhere;

		const rawStatuses = Array.isArray(filter.value) ? filter.value : [filter.value];
		const statuses = rawStatuses
			.map(normalizeAssignmentStatusValue)
			.filter((status): status is AssignmentStatus => status != null)
			.filter((status, index, source) => source.indexOf(status) == index);
		if(statuses.length == 0)
			return null;

		if(filter.operator == "equals" || filter.operator == "in")
			return statuses.length == 1 ? getStatusWhere(statuses[0]) : { or: statuses.map(getStatusWhere) };

		if(filter.operator == "not_equals" || filter.operator == "not_in") {
			const excluded = new Set(statuses);
			const remaining = assignmentStatusValues.filter(status => !excluded.has(status));
			if(remaining.length == 0)
				return impossibleWhere;
			return remaining.length == 1 ? getStatusWhere(remaining[0]) : { or: remaining.map(getStatusWhere) };
		}

		return null;
	};

	const conditions = filters
		.map(filter => {
			if(filter.column == "assignmentStatus") {
				const statusWhere = buildStatusFilterWhere(filter);
				if(statusWhere == null)
					return null;
				return {
					where: statusWhere,
					joinWithPrevious: filter.joinWithPrevious == "or" ? "or" : "and"
				};
			}

			const fieldPath = toPayloadFieldPath(filter.column);
			return {
				where: {
					[fieldPath]: {
						[operatorMap[filter.operator]]: filter.value
					}
				} as Where,
				joinWithPrevious: filter.joinWithPrevious == "or" ? "or" : "and"
			};
		})
		.filter((condition): condition is { where: Where, joinWithPrevious: "and" | "or" } => condition != null);

	if(conditions.length == 0)
		return null;

	const andTerms: Where[][] = [];
	let currentAndTerm: Where[] = [conditions[0].where];
	for(let index = 1; index < conditions.length; index++) {
		const condition = conditions[index];
		if(condition.joinWithPrevious == "or") {
			andTerms.push(currentAndTerm);
			currentAndTerm = [condition.where];
			continue;
		}
		currentAndTerm.push(condition.where);
	}
	andTerms.push(currentAndTerm);

	if(andTerms.length == 1)
		return andTerms[0].length == 1 ? andTerms[0][0] : { and: andTerms[0] };

	return {
		or: andTerms.map(andTerm => andTerm.length == 1 ? andTerm[0] : ({ and: andTerm } as Where))
	};
}

function deriveAssignmentStatus(reviewedAt: string | null | undefined, reviewApproved: boolean | null | undefined): AssignmentStatus {
	if(reviewedAt == null)
		return "pending_approval";
	return reviewApproved == true ? "approved" : "rejected";
}

function buildKeywordWhere(keyword: string): Where | null {
	if(keyword.length == 0)
		return null;

	return {
		or: [
			{ "account.id": { like: keyword } },
			{ "account.name": { like: keyword } },
			{ "user.name": { like: keyword } },
			{ "account.assetId": { like: keyword } }
		]
	};
}

function buildSupervisorAssignmentScope(roleLevel: string | null, userId: string): Where | null {
	if(roleLevel != "supervisor")
		return null;

	return {
		or: [
			{ "account.createdBy": { equals: userId } },
			{ "account.createdBy.supervisor": { equals: userId } }
		]
	};
}

function mapAssignmentDocToRow(assignment: any): AccountAssignmentEditorRow {
	const accountId = getRelationshipId(assignment.account);
	const account = assignment.account != null && typeof assignment.account == "object" ? assignment.account : null;
	const assignedUser = assignment.user != null && typeof assignment.user == "object" ? assignment.user : null;
	const addresses = Array.isArray(account?.addresses) ? account.addresses : [];

	return {
		assignmentId: assignment?.id != null ? String(assignment.id) : null,
		assignmentStatus: deriveAssignmentStatus(assignment?.reviewedAt ?? null, assignment?.reviewApproved ?? null),
		applyId: accountId ?? "",
		accountName: typeof account?.name == "string" ? account.name : "",
		officerName: typeof assignedUser?.name == "string" ? assignedUser.name : null,
		address: addresses.length > 0 ? String(addresses[0]) : "",
		productCode: account?.assetId != null ? String(account.assetId) : "",
		userId: getRelationshipId(assignment?.user),
		createdById: getRelationshipId(assignment?.createdBy),
		updatedById: getRelationshipId(assignment?.updatedBy),
		deletedById: getRelationshipId(assignment?.deletedBy),
		reviewedById: getRelationshipId(assignment?.reviewedBy),
		requestedAt: typeof assignment?.createdAt == "string" ? assignment.createdAt : null
	};
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

async function mapAccountNamesById(payload: Payload, user: any, accountIds: string[]): Promise<Map<string, string>> {
	const ids = [...new Set(accountIds.filter((value): value is string => value != null && value.length > 0))];
	if(ids.length == 0)
		return new Map();

	const result = await payload.find({
		collection: "credit-applications",
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
		{ reviewedAt: { exists: false } }
	];
	if(excludeAssignmentId != null)
		whereAnd.push({ id: { not_equals: excludeAssignmentId } });

	const result = await payload.find({
		collection: "credit-application-assignments" as never,
		user,
		overrideAccess: true,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		where: { and: whereAnd },
		select: {
			id: true,
			account: true,
			reviewedAt: true,
			reviewApproved: true
		} as never
	});

	return result.docs as any[];
}

async function queryAssignmentRowsService(
	context: AssignmentContext,
	input: AccountAssignmentQueryInput,
	options: { pendingOnly: boolean }
): Promise<AccountAssignmentEditorListOutput> {
	const { payload, user, roleLevel } = context;
	const page = normalizePage(input.page);
	const limit = normalizeLimit(input.limit);
	const keyword = normalizeSearch(input.keyword);
	const sortTokens = normalizeSortTokens(input.sort);
	const normalizedFilterCombinator = normalizeFilterCombinator(input.filterCombinator);
	const normalizedFilters = normalizeFilters(input.filters, normalizedFilterCombinator);
	const payloadFilterWhere = toPayloadFilterWhere(normalizedFilters);
	const payloadSort = toPayloadSort(sortTokens);

	const whereTerms: Where[] = [
		...(options.pendingOnly ? [{ reviewedAt: { exists: false } }] : []),
		...(keyword.length > 0 ? [buildKeywordWhere(keyword)!] : []),
		...(payloadFilterWhere != null ? [payloadFilterWhere] : []),
		...(buildSupervisorAssignmentScope(roleLevel, String(user.id)) != null ? [buildSupervisorAssignmentScope(roleLevel, String(user.id))!] : [])
	];

	const assignmentsResult = await payload.find({
		collection: "credit-application-assignments" as never,
		user,
		overrideAccess: true,
		draft: true,
		trash: true,
		depth: 1,
		page,
		limit,
		sort: payloadSort,
		where: whereTerms.length == 0 ? undefined : ({ and: whereTerms } as Where),
		select: {
			id: true,
			account: true,
			user: true,
			createdBy: true,
			updatedBy: true,
			deletedBy: true,
			reviewedBy: true,
			createdAt: true,
			updatedAt: true,
			reviewedAt: true,
			reviewApproved: true
		} as never
	});

	return {
		docs: (assignmentsResult.docs as any[]).map(mapAssignmentDocToRow),
		totalDocs: assignmentsResult.totalDocs,
		page: assignmentsResult.page ?? page,
		hasNextPage: assignmentsResult.hasNextPage,
		hasPreviousPage: assignmentsResult.hasPrevPage
	};
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

export async function queryEditorAssignmentsService(context: AssignmentContext, input: AccountAssignmentQueryInput): Promise<AccountAssignmentEditorListOutput> {
	return queryAssignmentRowsService(context, input, { pendingOnly: false });
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
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		where: {
			account: { in: applyIds }
		},
		select: {
			id: true,
			account: true
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
				createdBy: user.id,
				reviewedBy: null,
				reviewedAt: null,
				reviewApproved: null,
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
		draft: true,
		trash: true,
		depth: 0,
		select: {
			id: true,
			account: true,
			reviewedAt: true,
			reviewApproved: true
		} as never
	}) as any;

	if(deriveAssignmentStatus(assignment.reviewedAt ?? null, assignment.reviewApproved ?? null) == "pending_approval")
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
			createdBy: user.id,
			reviewedBy: null,
			reviewedAt: null,
			reviewApproved: null,
			reviewComment: null
		} as never
	});

	return {
		message: "Assignment has been submitted for reassignment approval.",
		id: assignmentId
	};
}

export async function queryApproverAssignmentsService(context: AssignmentContext, input: AccountAssignmentQueryInput): Promise<AccountAssignmentApproverListOutput> {
	return queryAssignmentRowsService(context, input, { pendingOnly: true });
}

export async function reviewAssignmentService(context: AssignmentContext, input: ReviewAssignmentInput): Promise<{ message: string; id: string; notification?: string }> {
	const { payload, user } = context;
	const assignmentId = input.assignmentId.trim();
	if(assignmentId.length == 0)
		throw new Error("Assignment id is required.");

	const assignment = await payload.findByID({
		collection: "credit-application-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		draft: true,
		trash: true,
		depth: 0,
		select: {
			id: true,
			reviewedAt: true,
			reviewApproved: true
		} as never
	}) as any;

	if(deriveAssignmentStatus(assignment.reviewedAt ?? null, assignment.reviewApproved ?? null) != "pending_approval")
		throw new Error("Only pending approval assignments can be reviewed.");

	const approved = input.decision == "approve";

	await payload.update({
		collection: "credit-application-assignments" as never,
		id: assignmentId,
		user,
		overrideAccess: true,
		data: {
			reviewedBy: user.id,
			reviewedAt: new Date().toISOString(),
			reviewApproved: approved,
			reviewComment: null
		} as never
	});

	return {
		message: approved ? "Assignment approved." : "Assignment rejected.",
		id: assignmentId,
		notification: approved ? "Data has changed" : undefined
	};
}

export async function approveAssignmentService(context: AssignmentContext, input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string; notification: string }> {
	const result = await reviewAssignmentService(context, { assignmentId: input.assignmentId, decision: "approve", notes: input.notes });
	return {
		message: result.message,
		id: result.id,
		notification: result.notification ?? "Data has changed"
	};
}

export async function rejectAssignmentService(context: AssignmentContext, input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string }> {
	const result = await reviewAssignmentService(context, { assignmentId: input.assignmentId, decision: "reject", notes: input.notes });
	return {
		message: result.message,
		id: result.id
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

function normalizeQueryActionInput(input: AccountAssignmentQueryActionInput): AccountAssignmentQueryInput {
	return {
		keyword: typeof input.keyword == "string" ? input.keyword : String(input.search ?? ""),
		sort: Array.isArray(input.sort) ? input.sort : [],
		filters: input.filters,
		filterCombinator: input.filterCombinator,
		page: input.page,
		limit: input.limit
	};
}

export async function resolveAccountAssignmentModeRedirectHrefAction(mode: AccountAssignmentMode): Promise<string | null> {
	return resolveDashboardManagementModeRedirectHrefAction("credit-application-assignment", mode);
}

export async function resolveAccountAssignmentRootHrefAction(): Promise<string> {
	return resolveManagementRootHref("credit-application-assignment");
}

export async function queryViewerAssignmentsAction(input: AccountAssignmentQueryActionInput): Promise<AccountAssignmentEditorListOutput> {
	const context = await getModeAuthContext("viewer");
	return queryEditorAssignmentsService(context, normalizeQueryActionInput(input));
}

export async function listAssignmentOfficerOptionsAction(): Promise<AccountAssignmentOfficerOption[]> {
	const context = await getModeAuthContext("editor");
	return listAssignmentOfficerOptionsService(context);
}

export async function queryEditorAssignmentsAction(input: AccountAssignmentQueryActionInput): Promise<AccountAssignmentEditorListOutput> {
	const context = await getModeAuthContext("editor");
	return queryEditorAssignmentsService(context, normalizeQueryActionInput(input));
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

export async function queryApproverAssignmentsAction(input: AccountAssignmentQueryActionInput): Promise<AccountAssignmentApproverListOutput> {
	const context = await getModeAuthContext("approver");
	return queryApproverAssignmentsService(context, normalizeQueryActionInput(input));
}

export async function reviewAssignmentAction(input: ReviewAssignmentInput): Promise<{ message: string; id: string; notification?: string }> {
	const context = await getModeAuthContext("approver");
	return reviewAssignmentService(context, input);
}

export async function approveAssignmentAction(input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string; notification: string }> {
	const result = await reviewAssignmentAction({ assignmentId: input.assignmentId, decision: "approve", notes: input.notes });
	return {
		message: result.message,
		id: result.id,
		notification: result.notification ?? "Data has changed"
	};
}

export async function rejectAssignmentAction(input: { assignmentId: string; notes?: string }): Promise<{ message: string; id: string }> {
	const result = await reviewAssignmentAction({ assignmentId: input.assignmentId, decision: "reject", notes: input.notes });
	return {
		message: result.message,
		id: result.id
	};
}

function getAssignmentRowKey(row: Pick<AccountAssignmentEditorRow, "assignmentId" | "applyId">): string {
	return row.assignmentId ?? row.applyId;
}

export async function resolveAccountAssignmentRelationColumnsAction({ rows, columns }: ResolveAccountAssignmentRelationColumnsInput): Promise<ResolveAccountAssignmentRelationColumnsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	if(rows.length == 0 || columns.length == 0)
		return [];

	const requestedColumns = [...new Set(columns)];

	const userIds = new Set<string>();
	const accountIds = new Set<string>();
	for(const row of rows) {
		if(requestedColumns.includes("user") && row.userId != null)
			userIds.add(row.userId);
		if(requestedColumns.includes("createdBy") && row.createdById != null)
			userIds.add(row.createdById);
		if(requestedColumns.includes("updatedBy") && row.updatedById != null)
			userIds.add(row.updatedById);
		if(requestedColumns.includes("deletedBy") && row.deletedById != null)
			userIds.add(row.deletedById);
		if(requestedColumns.includes("reviewedBy") && row.reviewedById != null)
			userIds.add(row.reviewedById);
		if(requestedColumns.includes("account") && row.applyId.length > 0)
			accountIds.add(row.applyId);
	}

	const userNameById = await mapUserNamesById(payload, user, [...userIds]);
	const accountNameById = await mapAccountNamesById(payload, user, [...accountIds]);

	return rows.map(row => {
		const values: AccountAssignmentRelationValues = {};

		if(requestedColumns.includes("account"))
			values.account = row.applyId.length > 0 ? (accountNameById.get(row.applyId) ?? row.applyId) : "-";
		if(requestedColumns.includes("user"))
			values.user = row.userId != null ? (userNameById.get(row.userId) ?? "-") : "-";
		if(requestedColumns.includes("createdBy"))
			values.createdBy = row.createdById != null ? (userNameById.get(row.createdById) ?? "-") : "-";
		if(requestedColumns.includes("updatedBy"))
			values.updatedBy = row.updatedById != null ? (userNameById.get(row.updatedById) ?? "-") : "-";
		if(requestedColumns.includes("deletedBy"))
			values.deletedBy = row.deletedById != null ? (userNameById.get(row.deletedById) ?? "-") : "-";
		if(requestedColumns.includes("reviewedBy"))
			values.reviewedBy = row.reviewedById != null ? (userNameById.get(row.reviewedById) ?? "-") : "-";

		return {
			id: getAssignmentRowKey(row),
			values
		};
	});
}
