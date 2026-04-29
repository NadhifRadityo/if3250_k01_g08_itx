"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";

import payloadConfig from "@payload-config";
import { createEmptyReviewComment } from "@/utils/reviewCommentRichText";
import type { RelationRole, RelationUser, RequestDiffPair } from "@/utils/requestRelationValues";
import type { Role, User, StagedUser } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const RELATION_SEARCH_LIMIT = 20;
const ROLE_LOOKUP_LIMIT = 20;
const userStatusValues = ["pending", "approved", "rejected"] as const;
const sortableFields = new Set<UserManagementSortField>([
	"id",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"name",
	"email",
	"employeeId",
	"role",
	"supervisor",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved"
]);
const filterableColumns = new Set<UserManagementFilterColumn>([
	"id",
	"name",
	"email",
	"employeeId",
	"role",
	"supervisor",
	"createdAt",
	"createdBy",
	"updatedAt",
	"updatedBy",
	"deletedAt",
	"deletedBy",
	"reviewedAt",
	"reviewedBy",
	"status",
	"reviewApproved"
]);
const filterOperators = new Set<UserManagementFilterOperator>([
	"equals",
	"not_equals",
	"contains",
	"not_contains",
	"in",
	"not_in",
	"exists",
	"greater_than",
	"less_than",
	"greater_than_equal",
	"less_than_equal"
]);
const statusFilterOperators = new Set<UserManagementFilterOperator>([
	"equals",
	"not_equals",
	"in",
	"not_in",
	"exists"
]);
const dateFilterColumns = new Set<UserManagementFilterColumn>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt"
]);
const booleanFilterColumns = new Set<UserManagementFilterColumn>(["reviewApproved"]);
export type UserManagementStatus = typeof userStatusValues[number];
const userStatusSet = new Set<UserManagementStatus>(userStatusValues);
const userHistoryRequiredMenu = "user-management-auditor";

type ReviewCommentValue = NonNullable<StagedUser["reviewComment"]>;
const defaultReviewComment: ReviewCommentValue = createEmptyReviewComment();

export type UserManagementTabMode = "editor" | "approver";
export type UserManagementSortField = "createdAt" |
	"id" |
	"updatedAt" |
	"deletedAt" |
	"name" |
	"email" |
	"employeeId" |
	"role" |
	"supervisor" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved";
export type UserManagementSortToken = `${"+" | "-"}${UserManagementSortField}`;
export type UserManagementFilterColumn = "name" |
	"id" |
	"email" |
	"employeeId" |
	"role" |
	"supervisor" |
	"createdAt" |
	"createdBy" |
	"updatedAt" |
	"updatedBy" |
	"deletedAt" |
	"deletedBy" |
	"reviewedAt" |
	"reviewedBy" |
	"status" |
	"reviewApproved";
export type UserManagementFilterOperator = "equals" |
	"not_equals" |
	"contains" |
	"not_contains" |
	"in" |
	"not_in" |
	"exists" |
	"greater_than" |
	"less_than" |
	"greater_than_equal" |
	"less_than_equal";
export type UserManagementFilterCombinator = "and" | "or";
export type UserManagementFilterInput = {
	column: UserManagementFilterColumn;
	operator: UserManagementFilterOperator;
	value?: string | Array<string | boolean> | boolean | null;
	joinWithPrevious?: UserManagementFilterCombinator;
};

export type StagedUserTableRow = {
	id: string;
	linkedUserId: string | null;
	email: string;
	name: string;
	employeeId: string;
	role: string | null;
	supervisor: string | null;
	isSoftDeleted: boolean;
	initialPassword: string;
	createdBy: string | null;
	updatedBy: string | null;
	deletedBy: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	reviewedAt: string | null;
	reviewedBy: string | null;
	reviewApproved: boolean | null;
	reviewComment: ReviewCommentValue | null;
	requestType: "Create" | "Update" | "Delete";
};

export type StagedUserRelationValues = Partial<Record<`users:${string}`, RelationUser>> & Partial<Record<`roles:${string}`, RelationRole>>;

export type QueryStagedUsersOutput = {
	docs: StagedUserTableRow[];
	relations: StagedUserRelationValues;
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type UserRoleOption = {
	id: string;
	name: string;
	level: Role["level"];
};

export type UserReviewerOption = {
	id: string;
	name: string;
	email: string;
};

export type UserFilterIdOption = {
	id: string;
	name: string;
	email: string;
	employeeId: string;
};

export type QueryStagedUsersInput = {
	keyword: string;
	sort: string[];
	filters?: UserManagementFilterInput[];
	filterCombinator?: UserManagementFilterCombinator;
	page: number;
	limit: number;
	mode: UserManagementTabMode;
	includeSoftDeleted?: boolean;
};

export type UpsertStagedUserRequestInput = {
	stagedUserId?: string;
	email: string;
	name: string;
	employeeId: string;
	role: string;
	supervisor?: string | null;
	initialPassword: string;
};

export type ReviewStagedUserRequestInput = {
	stagedUserId: string;
	decision: "approve" | "reject";
	reviewComment: ReviewCommentValue;
};

export type UserRequestReviewDiffItem = {
	field: "email" | "name" | "employeeId" | "role" | "supervisor" | "deletedAt" | "initialPassword";
	previousValue: string | null | boolean;
	requestedValue: string | null | boolean;
};

export type UserRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	email: RequestDiffPair<string | null>;
	name: RequestDiffPair<string | null>;
	employeeId: RequestDiffPair<string | null>;
	role: RequestDiffPair<string | null>;
	supervisor: RequestDiffPair<string | null>;
	deletedAt: RequestDiffPair<string | null>;
	initialPassword: RequestDiffPair<string | null>;
	relations: StagedUserRelationValues;
};

export type UserRequestDetailsOutput = {
	row: StagedUserTableRow;
	relations: StagedUserRelationValues;
};

export type UserRequestHistoryEntry = {
	versionId: string;
	id: string;
	name: string | null;
	email: string | null;
	employeeId: string | null;
	role: string | null;
	supervisor: string | null;
	createdBy: string | null;
	updatedBy: string | null;
	deletedBy: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	requestType: "Create" | "Update" | "Delete";
	status: string;
	reviewedAt: string | null;
	reviewedBy: string | null;
	reviewApproved: boolean | null;
	reviewComment: ReviewCommentValue | null;
};

export type UserRequestHistoryOutput = {
	requestId: string;
	entries: UserRequestHistoryEntry[];
	relations: StagedUserRelationValues;
};

type SortFieldKey = UserManagementSortToken extends `${"+" | "-"}${infer T}` ? T : never;

function clampPageSize(limit: number): number {
	if(Number.isFinite(limit))
		return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(limit)));
	return MAX_PAGE_SIZE;
}

function normalizeSortTokens(sort: string[]): UserManagementSortToken[] {
	const prefixed = sort
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1) as UserManagementSortField)) as UserManagementSortToken[];
	const deduplicated = prefixed.filter((token, index, source) =>
		index == source.findIndex(candidate => candidate.slice(1) == token.slice(1))
	);
	if(deduplicated.length == 0)
		return ["-updatedAt"];
	return deduplicated;
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

function normalizeUserStatusValue(value: unknown): UserManagementStatus | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase() as UserManagementStatus;
	return userStatusSet.has(normalized) ? normalized : null;
}

function normalizeScalarFilterValue(column: UserManagementFilterColumn, rawValue: unknown): string | boolean | null {
	if(rawValue == null)
		return null;

	if(booleanFilterColumns.has(column))
		return parseBooleanValue(rawValue);

	if(column == "status")
		return normalizeUserStatusValue(rawValue);

	if(typeof rawValue != "string")
		return null;
	const trimmed = rawValue.trim();
	if(trimmed.length == 0)
		return null;

	if(dateFilterColumns.has(column)) {
		const date = new Date(trimmed);
		if(!Number.isNaN(date.getTime()))
			return date.toISOString();
	}

	return trimmed;
}

function normalizeFilters(filters: UserManagementFilterInput[] | undefined, fallbackCombinator: UserManagementFilterCombinator): UserManagementFilterInput[] {
	if(filters == null)
		return [];

	const normalized: UserManagementFilterInput[] = [];
	for(const filter of filters) {
		if(filter == null || !filterableColumns.has(filter.column) || !filterOperators.has(filter.operator))
			continue;
		if(filter.column == "status" && !statusFilterOperators.has(filter.operator))
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

function normalizeFilterCombinator(filterCombinator: UserManagementFilterCombinator | undefined): UserManagementFilterCombinator {
	return filterCombinator == "or" ? "or" : "and";
}

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string") return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function normalizeRoleMenus(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];

	const normalized = value
		.filter((menu): menu is string => typeof menu == "string")
		.map(menu => menu.trim().toLowerCase())
		.filter(menu => menu.length > 0);

	return [...new Set(normalized)];
}

async function resolveUserRoleMenus(payload: Payload, user: User): Promise<string[]> {
	const rawRole = user.role;
	if(rawRole != null && typeof rawRole == "object" && "menus" in rawRole)
		return normalizeRoleMenus(rawRole.menus);

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

	return normalizeRoleMenus(role.menus);
}

async function hasStagedUserRequestHistoryAccess(payload: Payload, user: User): Promise<boolean> {
	const roleMenus = await resolveUserRoleMenus(payload, user);
	return roleMenus.includes(userHistoryRequiredMenu);
}

function formatReviewDateValue(value: string | null | undefined): string {
	if(value == null)
		return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function formatReviewRoleValue(value: string | null | undefined): string {
	if(value == null)
		return "-";
	return value;
}

function formatReviewPasswordPresence(value: string | null | undefined): string {
	if((value ?? "").trim().length == 0)
		return "-";
	return "Set";
}

function getUserRequestType(deletedAt: string | null | undefined, createdAt: string | null | undefined, updatedAt: string | null | undefined): "Create" | "Update" | "Delete" {
	if(deletedAt != null)
		return "Delete";
	if(createdAt == null || updatedAt == null)
		return "Update";
	return createdAt == updatedAt ? "Create" : "Update";
}

function getUserHistoryStatusLabel(reviewedAt: string | null | undefined, reviewApproved: boolean | null | undefined): string {
	if(reviewedAt == null)
		return "Pending";
	if(reviewApproved == true)
		return "Approved";
	return "Rejected";
}

async function findUsersByIds(payload: Payload, user: User, ids: string[]): Promise<Map<string, RelationUser>> {
	if(ids.length == 0)
		return new Map();

	const usersResult = await payload.find({
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
			email: true,
			stagedUser: true
		}
	});

	const map = new Map<string, RelationUser>();
	for(const doc of usersResult.docs) {
		map.set(String(doc.id), {
			name: doc.name,
			email: doc.email,
			stagedUserId: getRelationshipId(doc.stagedUser)
		});
	}

	return map;
}

async function findRolesByIds(payload: Payload, user: User, ids: string[]): Promise<Map<string, RelationRole>> {
	if(ids.length == 0)
		return new Map();

	const rolesResult = await payload.find({
		collection: "roles",
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: Math.max(ids.length, 1),
		where: {
			id: {
				in: ids
			}
		},
		select: {
			name: true
		}
	});

	const map = new Map<string, RelationRole>();
	for(const doc of rolesResult.docs)
		map.set(String(doc.id), { name: doc.name });

	return map;
}

async function searchActiveRoleOptions(
	payload: Payload,
	user: User,
	keyword: string,
	selectedIds: string[] = [],
	limit: number = RELATION_SEARCH_LIMIT
): Promise<UserRoleOption[]> {
	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ name: { like: normalizedKeyword } }
	];
	const searchWhereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		searchWhereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		searchWhereTerms.push({ id: { in: normalizedSelectedIds } });
	const searchWhere = searchWhereTerms.length == 0 ? null :
		searchWhereTerms.length == 1 ? searchWhereTerms[0] : { or: searchWhereTerms };

	const result = await payload.find({
		collection: "roles",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: limit + normalizedSelectedIds.length,
		sort: "name",
		where: {
			and: [
				{ _status: { equals: "published" } },
				{ deletedAt: { exists: false } },
				...(searchWhere != null ? [searchWhere] : [])
			]
		},
		select: {
			name: true,
			level: true
		}
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: doc.name,
		level: doc.level
	}));
}

async function findActiveSupervisorRoleIds(payload: Payload, user: User): Promise<string[]> {
	const result = await payload.find({
		collection: "roles",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: ROLE_LOOKUP_LIMIT,
		sort: "name",
		where: {
			and: [
				{ _status: { equals: "published" } },
				{ deletedAt: { exists: false } },
				{ level: { equals: "supervisor" } }
			]
		},
		select: {
			name: true,
			level: true
		}
	});

	return result.docs.map(doc => String(doc.id));
}

function buildUserKeywordFilters(keyword: string): Where[] {
	const normalizedKeyword = keyword.trim();
	return [
		{ email: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ employeeId: { like: normalizedKeyword } }
	];
}

function normalizeSelectedIds(selectedIds: string[] = []): string[] {
	return [...new Set(
		selectedIds
			.map(selectedId => selectedId.trim())
			.filter(selectedId => selectedId.length > 0)
	)];
}

function toPayloadSort(sort: UserManagementSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		switch(field) {
			case "role":
				return `${direction}role.name`;
			case "supervisor":
				return `${direction}supervisor.name`;
			case "reviewedBy":
				return `${direction}reviewedBy.name`;
			default:
				return `${direction}${field}`;
		}
	}).join(",");
}

export async function searchUserRoleOptionsAction(keyword: string, selectedIds: string[] = []): Promise<UserRoleOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	return searchActiveRoleOptions(payload, user, keyword, selectedIds);
}

export async function searchUserAuditUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<UserReviewerOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const keywordFilters = buildUserKeywordFilters(keyword);
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const whereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? null : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "name",
		select: {
			name: true,
			email: true
		},
		...(where != null ? { where } : {})
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: doc.name,
		email: doc.email
	}));
}

export async function searchUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<UserFilterIdOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ id: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ email: { like: normalizedKeyword } },
		{ employeeId: { like: normalizedKeyword } }
	];
	const whereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? null : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await payload.find({
		collection: "staged-users",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "-updatedAt",
		select: {
			name: true,
			email: true,
			employeeId: true
		},
		...(where != null ? { where } : {})
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: doc.name,
		email: doc.email,
		employeeId: doc.employeeId
	}));
}

function toPayloadFilterWhere(filters: UserManagementFilterInput[]): Where | null {
	if(filters.length == 0)
		return null;

	const operatorMap: Record<UserManagementFilterOperator, string> = {
		equals: "equals",
		not_equals: "not_equals",
		contains: "like",
		not_contains: "not_like",
		in: "in",
		not_in: "not_in",
		exists: "exists",
		greater_than: "greater_than",
		less_than: "less_than",
		greater_than_equal: "greater_than_equal",
		less_than_equal: "less_than_equal"
	};
	const impossibleWhere: Where = {
		and: [
			{ reviewedAt: { exists: true } },
			{ reviewedAt: { exists: false } }
		]
	};

	const getStatusWhere = (status: UserManagementStatus): Where => {
		if(status == "pending")
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

	const buildStatusFilterWhere = (filter: UserManagementFilterInput): Where | null => {
		if(filter.operator == "exists")
			return filter.value == true ? null : impossibleWhere;

		const rawStatuses = Array.isArray(filter.value) ? filter.value : [filter.value];
		const statuses = rawStatuses
			.map(normalizeUserStatusValue)
			.filter((status): status is UserManagementStatus => status != null)
			.filter((status, index, source) => source.indexOf(status) == index);
		if(statuses.length == 0)
			return null;

		if(filter.operator == "equals" || filter.operator == "in")
			return statuses.length == 1 ? getStatusWhere(statuses[0]) : { or: statuses.map(getStatusWhere) };

		if(filter.operator == "not_equals" || filter.operator == "not_in") {
			const excluded = new Set(statuses);
			const remaining = userStatusValues.filter(status => !excluded.has(status));
			if(remaining.length == 0)
				return impossibleWhere;
			return remaining.length == 1 ? getStatusWhere(remaining[0]) : { or: remaining.map(getStatusWhere) };
		}

		return null;
	};

	const conditions = filters
		.map(filter => {
			if(filter.column == "status") {
				const statusWhere = buildStatusFilterWhere(filter);
				if(statusWhere == null)
					return null;
				return {
					where: statusWhere,
					joinWithPrevious: filter.joinWithPrevious == "or" ? "or" : "and"
				};
			}

			return {
				where: {
					[filter.column]: {
						[operatorMap[filter.operator]]: filter.value
					}
				},
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
		or: andTerms.map(andTerm => andTerm.length == 1 ? andTerm[0] : ({ and: andTerm }))
	};
}

async function queryLinkedUsersByStagedIds(payload: Payload, user: User, stagedIds: string[]): Promise<Map<string, string>> {
	if(stagedIds.length == 0)
		return new Map();

	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: Math.max(stagedIds.length, 1),
		where: {
			stagedUser: { in: stagedIds }
		},
		select: {
			stagedUser: true
		}
	});

	const map = new Map<string, string>();
	for(const linkedUser of result.docs) {
		const stagedId = getRelationshipId(linkedUser.stagedUser);
		if(stagedId != null)
			map.set(stagedId, String(linkedUser.id));
	}

	return map;
}

async function findLinkedUserByStagedId(payload: Payload, user: User, stagedUserId: string): Promise<User | null> {
	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: 1,
		where: {
			stagedUser: { equals: stagedUserId }
		}
	});

	if(result.docs.length == 0)
		return null;
	return result.docs[0];
}

export async function searchUserSupervisorUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<Array<{ id: string, name: string, email: string }>> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const supervisorRoles = await findActiveSupervisorRoleIds(payload, user);
	if(supervisorRoles.length == 0)
		return [];

	const keywordFilters = buildUserKeywordFilters(keyword);
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const searchWhereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		searchWhereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		searchWhereTerms.push({ id: { in: normalizedSelectedIds } });
	const searchWhere = searchWhereTerms.length == 0 ? null :
		searchWhereTerms.length == 1 ? searchWhereTerms[0] : { or: searchWhereTerms };

	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "name",
		where: {
			and: [
				{ role: { in: supervisorRoles } },
				...(searchWhere != null ? [searchWhere] : [])
			]
		},
		select: { name: true, email: true }
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: doc.name,
		email: doc.email
	}));
}

export async function queryStagedUsersAction({ keyword, sort, filters, filterCombinator, page, limit, mode, includeSoftDeleted = false }: QueryStagedUsersInput): Promise<QueryStagedUsersOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const pageSize = clampPageSize(limit);
	const pageNumber = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
	const normalizedKeyword = keyword.trim();
	const sortTokens = normalizeSortTokens(sort);
	const normalizedFilterCombinator = normalizeFilterCombinator(filterCombinator);
	const normalizedFilters = normalizeFilters(filters, normalizedFilterCombinator);
	const payloadFilterWhere = toPayloadFilterWhere(normalizedFilters);
	const payloadSort = toPayloadSort(sortTokens);

	const stagedFindResult = await payload.find({
		collection: "staged-users",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		page: pageNumber,
		limit: pageSize,
		sort: payloadSort,
		depth: 0,
		where: {
			and: [
				...(mode == "approver" ? [{ reviewedAt: { exists: false } }, { _status: { equals: "draft" } }] : []),
				...(includeSoftDeleted ? [] : [{ or: [
					{ deletedAt: { exists: false } },
					{ _status: { equals: "draft" } }
				] }]),
				...(normalizedKeyword.length > 0 ? [{ or: [
					{ name: { like: normalizedKeyword } },
					{ email: { like: normalizedKeyword } },
					{ employeeId: { like: normalizedKeyword } }
				] }] : []),
				...(payloadFilterWhere != null ? [payloadFilterWhere] : [])
			]
		},
		select: {
			email: true,
			name: true,
			employeeId: true,
			role: true,
			supervisor: true,
			createdBy: true,
			updatedBy: true,
			deletedBy: true,
			initialPassword: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
			_status: true,
			reviewedAt: true,
			reviewedBy: true,
			reviewApproved: true,
			reviewComment: true
		}
	});

	const stagedIds = stagedFindResult.docs.map(doc => String(doc.id));
	const linkedUserIdByStagedId = await queryLinkedUsersByStagedIds(payload, user, stagedIds);
	const roleIds = [...new Set(stagedFindResult.docs
		.map(doc => getRelationshipId(doc.role))
		.filter((value): value is string => value != null))];
	const userIds = [...new Set(stagedFindResult.docs.flatMap(doc => [
		getRelationshipId(doc.supervisor),
		getRelationshipId(doc.reviewedBy),
		getRelationshipId(doc.createdBy),
		getRelationshipId(doc.updatedBy),
		getRelationshipId(doc.deletedBy)
	].filter((value): value is string => value != null)))];
	const [rolesById, usersById] = await Promise.all([
		findRolesByIds(payload, user, roleIds),
		findUsersByIds(payload, user, userIds)
	]);

	const mappedRows: StagedUserTableRow[] = stagedFindResult.docs.map(doc => {
		const role = getRelationshipId(doc.role);
		const supervisor = getRelationshipId(doc.supervisor);
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		const createdBy = getRelationshipId(doc.createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		const deletedBy = getRelationshipId(doc.deletedBy);
		const requestType = getUserRequestType(doc.deletedAt ?? null, doc.createdAt, doc.updatedAt);
		return {
			id: String(doc.id),
			linkedUserId: linkedUserIdByStagedId.get(String(doc.id)) ?? null,
			email: doc.email,
			name: doc.name,
			employeeId: doc.employeeId,
			role,
			supervisor,
			isSoftDeleted: doc.deletedAt != null && doc._status == "published",
			initialPassword: doc.initialPassword ?? "",
			createdBy,
			updatedBy,
			deletedBy,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			deletedAt: doc.deletedAt ?? null,
			reviewedAt: doc.reviewedAt ?? null,
			reviewedBy,
			reviewApproved: doc.reviewApproved ?? null,
			reviewComment: doc.reviewComment ?? null,
			requestType
		};
	});

	return {
		docs: mappedRows,
		relations: (() => {
			const relations: StagedUserRelationValues = {};
			for(const [roleId, role] of rolesById)
				relations[`roles:${roleId}`] = role;
			for(const [userId, relationUser] of usersById)
				relations[`users:${userId}`] = relationUser;
			return relations;
		})(),
		totalDocs: stagedFindResult.totalDocs,
		page: stagedFindResult.page ?? pageNumber,
		hasNextPage: stagedFindResult.hasNextPage,
		hasPreviousPage: stagedFindResult.hasPrevPage
	};
}

type QueryStagedUsersSharedInput = Omit<QueryStagedUsersInput, "mode">;

export async function queryStagedUsersViewerAction(input: QueryStagedUsersSharedInput): Promise<QueryStagedUsersOutput> {
	return queryStagedUsersAction({
		...input,
		mode: "editor",
		includeSoftDeleted: false
	});
}

export async function queryStagedUsersEditorAction(input: QueryStagedUsersSharedInput): Promise<QueryStagedUsersOutput> {
	return queryStagedUsersAction({
		...input,
		mode: "editor"
	});
}

export async function queryStagedUsersApproverAction(input: QueryStagedUsersSharedInput): Promise<QueryStagedUsersOutput> {
	return queryStagedUsersAction({
		...input,
		mode: "approver",
		includeSoftDeleted: false
	});
}

export async function getStagedUserRequestDetailsAction(stagedUserId: string): Promise<UserRequestDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const stagedUser = await payload.findByID({
		collection: "staged-users",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		id: stagedUserId,
		depth: 0,
		select: {
			email: true,
			name: true,
			employeeId: true,
			role: true,
			supervisor: true,
			createdBy: true,
			updatedBy: true,
			deletedBy: true,
			initialPassword: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
			_status: true,
			reviewedAt: true,
			reviewedBy: true,
			reviewApproved: true,
			reviewComment: true
		}
	});

	const linkedUserIdByStagedId = await queryLinkedUsersByStagedIds(payload, user, [String(stagedUser.id)]);
	const role = getRelationshipId(stagedUser.role);

	const supervisor = getRelationshipId(stagedUser.supervisor);
	const reviewedBy = getRelationshipId(stagedUser.reviewedBy);
	const createdBy = getRelationshipId(stagedUser.createdBy);
	const updatedBy = getRelationshipId(stagedUser.updatedBy);
	const deletedBy = getRelationshipId(stagedUser.deletedBy);
	const requestType = getUserRequestType(stagedUser.deletedAt ?? null, stagedUser.createdAt, stagedUser.updatedAt);

	const row: StagedUserTableRow = {
		id: String(stagedUser.id),
		linkedUserId: linkedUserIdByStagedId.get(String(stagedUser.id)) ?? null,
		email: stagedUser.email,
		name: stagedUser.name,
		employeeId: stagedUser.employeeId,
		role: role,
		supervisor: supervisor,
		isSoftDeleted: stagedUser.deletedAt != null && stagedUser._status == "published",
		initialPassword: stagedUser.initialPassword ?? "",
		createdBy,
		updatedBy,
		deletedBy,
		createdAt: stagedUser.createdAt,
		updatedAt: stagedUser.updatedAt,
		deletedAt: stagedUser.deletedAt ?? null,
		reviewedAt: stagedUser.reviewedAt ?? null,
		reviewedBy,
		reviewApproved: stagedUser.reviewApproved ?? null,
		reviewComment: stagedUser.reviewComment ?? null,
		requestType
	};

	const relationUserIds = new Set<string>();
	if(row.supervisor != null)
		relationUserIds.add(row.supervisor);
	if(row.reviewedBy != null)
		relationUserIds.add(row.reviewedBy);
	if(row.createdBy != null)
		relationUserIds.add(row.createdBy);
	if(row.updatedBy != null)
		relationUserIds.add(row.updatedBy);
	if(row.deletedBy != null)
		relationUserIds.add(row.deletedBy);

	const usersById = await findUsersByIds(payload, user, [...relationUserIds]);
	const rolesById = await findRolesByIds(payload, user, row.role != null ? [row.role] : []);

	const relations: StagedUserRelationValues = {};
	if(row.role != null) {
		const role = rolesById.get(row.role);
		if(role != null)
			relations[`roles:${row.role}`] = role;
	}
	for(const relationUserId of relationUserIds) {
		const relation = usersById.get(relationUserId);
		if(relation != null)
			relations[`users:${relationUserId}`] = relation;
	}

	return {
		row,
		relations
	};
}

export async function canAccessStagedUserRequestHistoryAction(): Promise<boolean> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return false;

	return hasStagedUserRequestHistoryAccess(payload, user);
}

export async function getStagedUserRequestHistoryAction(stagedUserId: string): Promise<UserRequestHistoryOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!await hasStagedUserRequestHistoryAccess(payload, user)) return unauthorized();

	const versionsResult = await payload.findVersions({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 100,
		sort: "-updatedAt",
		where: {
			parent: {
				equals: stagedUserId
			}
		},
		select: {
			updatedAt: true,
			version: {
				id: true,
				email: true,
				name: true,
				employeeId: true,
				role: true,
				supervisor: true,
				createdBy: true,
				updatedBy: true,
				deletedBy: true,
				createdAt: true,
				updatedAt: true,
				deletedAt: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true
			}
		}
	});

	type StagedUserVersionSnapshotDoc = {
		id?: string | number;
		updatedAt?: string | null;
		version?: {
			id?: string | number;
			email?: string;
			name?: string;
			employeeId?: string;
			role?: unknown;
			supervisor?: unknown;
			createdBy?: unknown;
			updatedBy?: unknown;
			deletedBy?: unknown;
			createdAt?: string | null;
			updatedAt?: string | null;
			deletedAt?: string | null;
			reviewedAt?: string | null;
			reviewedBy?: unknown;
			reviewApproved?: boolean | null;
			reviewComment?: ReviewCommentValue | null;
		};
	};

	const historyDocs = versionsResult.docs as StagedUserVersionSnapshotDoc[];

	const relationUserIds = new Set<string>();
	const roleIds = new Set<string>();
	for(const historyDoc of historyDocs) {
		const version = historyDoc.version;
		if(version == null)
			continue;

		const role = getRelationshipId(version.role);
		const supervisor = getRelationshipId(version.supervisor);
		const createdBy = getRelationshipId(version.createdBy);
		const updatedBy = getRelationshipId(version.updatedBy);
		const deletedBy = getRelationshipId(version.deletedBy);
		const reviewedBy = getRelationshipId(version.reviewedBy);

		if(role != null)
			roleIds.add(role);
		if(supervisor != null)
			relationUserIds.add(supervisor);
		if(createdBy != null)
			relationUserIds.add(createdBy);
		if(updatedBy != null)
			relationUserIds.add(updatedBy);
		if(deletedBy != null)
			relationUserIds.add(deletedBy);
		if(reviewedBy != null)
			relationUserIds.add(reviewedBy);
	}

	const usersById = await findUsersByIds(payload, user, [...relationUserIds]);
	const roleNamesById = await findRolesByIds(payload, user, [...roleIds]);

	const relations: StagedUserRelationValues = {};
	for(const [userId, relationUser] of usersById)
		relations[`users:${userId}`] = relationUser;
	for(const [roleId, role] of roleNamesById)
		relations[`roles:${roleId}`] = role;

	return {
		requestId: stagedUserId,
		entries: historyDocs.flatMap(historyDoc => {
			const version = historyDoc.version;
			if(version == null)
				return [];

			const role = getRelationshipId(version.role);
			const supervisor = getRelationshipId(version.supervisor);
			const createdBy = getRelationshipId(version.createdBy);
			const updatedBy = getRelationshipId(version.updatedBy);
			const deletedBy = getRelationshipId(version.deletedBy);
			const reviewedBy = getRelationshipId(version.reviewedBy);

			return [{
				versionId: String(version.id ?? historyDoc.id ?? stagedUserId),
				id: String(version.id ?? stagedUserId),
				name: version.name ?? null,
				email: version.email ?? null,
				employeeId: version.employeeId ?? null,
				role,
				supervisor,
				createdBy,
				updatedBy,
				deletedBy,
				createdAt: version.createdAt ?? null,
				updatedAt: version.updatedAt ?? null,
				deletedAt: version.deletedAt ?? null,
				requestType: getUserRequestType(version.deletedAt ?? null, version.createdAt ?? null, version.updatedAt ?? null),
				status: getUserHistoryStatusLabel(version.reviewedAt ?? null, version.reviewApproved ?? null),
				reviewedAt: version.reviewedAt ?? null,
				reviewedBy,
				reviewApproved: version.reviewApproved ?? null,
				reviewComment: version.reviewComment as ReviewCommentValue | null
			}];
		}),
		relations
	};
}

export async function upsertStagedUserRequestAction(input: UpsertStagedUserRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const email = input.email.trim();
	const name = input.name.trim();
	const employeeId = input.employeeId.trim();
	const role = input.role.trim();
	const supervisor = (input.supervisor ?? "").trim();
	const initialPassword = input.initialPassword.trim();

	if(email.length == 0)
		throw new Error("Email is required.");
	if(name.length == 0)
		throw new Error("Name is required.");
	if(employeeId.length == 0)
		throw new Error("Employee ID is required.");
	if(role.length == 0)
		throw new Error("Role is required.");
	if(initialPassword.length > 0 && initialPassword.length < 8)
		throw new Error("Initial password must be at least 8 characters.");

	await payload.findByID({
		collection: "roles",
		user,
		overrideAccess: false,
		id: role,
		depth: 0
	});

	if(input.stagedUserId == null) {
		if(initialPassword.length < 8)
			throw new Error("Initial password is required for new user requests and must be at least 8 characters.");

		const created = await payload.create({
			collection: "staged-users",
			user,
			overrideAccess: true,
			data: {
				_status: "draft",
				email,
				name,
				employeeId,
				role: role,
				supervisor: supervisor.length > 0 ? supervisor : null,
				initialPassword,
				deletedAt: null,
				deletedBy: null,
				reviewedAt: null,
				reviewedBy: null,
				reviewApproved: null,
				reviewComment: null
			}
		});

		return { stagedUserId: created.id };
	}

	const existingStagedUser = await payload.findByID({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: input.stagedUserId,
		depth: 0,
		showHiddenFields: true
	});

	const linkedUser = await findLinkedUserByStagedId(payload, user, input.stagedUserId);
	let nextInitialPassword = initialPassword;
	if(nextInitialPassword.length == 0 && linkedUser == null)
		nextInitialPassword = (existingStagedUser.initialPassword ?? "").trim();
	if(linkedUser == null && nextInitialPassword.length < 8)
		throw new Error("Initial password is required for create requests and must be at least 8 characters.");

	await payload.update({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: input.stagedUserId,
		data: {
			_status: "draft",
			email,
			name,
			employeeId,
			role: role,
			supervisor: supervisor.length > 0 ? supervisor : null,
			initialPassword: nextInitialPassword.length > 0 ? nextInitialPassword : null,
			deletedAt: null,
			deletedBy: null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});

	return { stagedUserId: input.stagedUserId };
}

export async function requestDeleteStagedUserAction(stagedUserId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.findByID({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		depth: 0
	});

	await payload.update({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		data: {
			_status: "draft",
			deletedAt: new Date().toISOString(),
			deletedBy: user.id,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});

	return { stagedUserId };
}

export async function cancelStagedUserRequestAction(stagedUserId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const stagedUser = await payload.findByID({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		depth: 0,
		showHiddenFields: true
	});

	if(stagedUser.reviewedAt != null && stagedUser.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");

	const approvedVersions = await payload.findVersions({
		user,
		collection: "staged-users",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: stagedUserId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {
			version: {
				email: true,
				name: true,
				employeeId: true,
				role: true,
				supervisor: true,
				initialPassword: true,
				deletedAt: true,
				deletedBy: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true,
				_status: true
			}
		}
	});

	const approvedVersion = approvedVersions.docs[0]?.version;
	if(approvedVersion == null) {
		await payload.update({
			collection: "staged-users",
			user,
			overrideAccess: true,
			trash: true,
			id: stagedUserId,
			data: {
				_status: "draft",
				deletedAt: new Date().toISOString(),
				deletedBy: user.id,
				reviewedAt: null,
				reviewedBy: null,
				reviewApproved: null,
				reviewComment: null
			}
		});

		return { stagedUserId, softDeleted: true };
	}

	const approvedSupervisor = getRelationshipId(approvedVersion.supervisor);
	const approvedDeletedBy = getRelationshipId(approvedVersion.deletedBy);
	const approvedReviewedBy = getRelationshipId(approvedVersion.reviewedBy);

	await payload.update({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		data: {
			_status: "published",
			email: approvedVersion.email,
			name: approvedVersion.name,
			employeeId: approvedVersion.employeeId,
			role: approvedVersion.role,
			supervisor: approvedSupervisor,
			initialPassword: approvedVersion.initialPassword ?? null,
			deletedAt: approvedVersion.deletedAt ?? null,
			deletedBy: approvedDeletedBy,
			reviewedAt: approvedVersion.reviewedAt ?? null,
			reviewedBy: approvedReviewedBy,
			reviewApproved: approvedVersion.reviewApproved ?? null,
			reviewComment: approvedVersion.reviewComment ?? defaultReviewComment
		}
	});

	return { stagedUserId, softDeleted: false };
}

export async function requestRestoreStagedUserAction(stagedUserId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const stagedUser = await payload.findByID({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		depth: 0,
		showHiddenFields: true
	});

	if(stagedUser.deletedAt == null)
		throw new Error("Staged user is not deleted.");

	await payload.update({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		data: {
			_status: "draft",
			deletedAt: null,
			deletedBy: null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});

	return { stagedUserId };
}

export async function reviewStagedUserRequestAction({ stagedUserId, decision, reviewComment }: ReviewStagedUserRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const stagedUser = await payload.findByID({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		depth: 1,
		showHiddenFields: true
	});

	if(stagedUser.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	if(decision == "reject") {
		await payload.update({
			collection: "staged-users",
			user,
			overrideAccess: true,
			trash: true,
			id: stagedUserId,
			data: {
				_status: "draft",
				deletedAt: null,
				deletedBy: null,
				reviewedAt: now,
				reviewedBy: user.id,
				reviewApproved: false,
				reviewComment
			}
		});
		return { stagedUserId, decision };
	}

	const linkedUser = await findLinkedUserByStagedId(payload, user, stagedUserId);

	if(stagedUser.deletedAt != null) {
		if(linkedUser != null) {
			await payload.update({
				collection: "users",
				user,
				overrideAccess: true,
				trash: true,
				id: linkedUser.id,
				data: {
					deletedAt: stagedUser.deletedAt,
					deletedBy: user.id,
					stagedUser: stagedUser.id
				}
			});
		}
	} else {
		const role = getRelationshipId(stagedUser.role);
		if(role == null)
			throw new Error("Cannot approve request without a valid role.");

		const supervisor = getRelationshipId(stagedUser.supervisor);
		const upsertData = {
			email: stagedUser.email,
			name: stagedUser.name,
			employeeId: stagedUser.employeeId,
			role: role,
			supervisor: supervisor,
			deletedAt: null,
			deletedBy: null,
			stagedUser: stagedUser.id
		};
		const initialPassword = (stagedUser.initialPassword ?? "").trim();

		if(linkedUser == null) {
			if(initialPassword.length < 8)
				throw new Error("Cannot approve create request without an initial password of at least 8 characters.");

			await payload.create({
				collection: "users",
				user,
				overrideAccess: true,
				draft: false,
				data: {
					...upsertData,
					enableAPIKey: false,
					sessions: [],
					password: initialPassword
				}
			});
		} else {
			await payload.update({
				collection: "users",
				user,
				overrideAccess: true,
				trash: true,
				id: linkedUser.id,
				data: {
					...upsertData,
					...(initialPassword.length > 0 ? { password: initialPassword } : {})
				}
			});
		}
	}

	await payload.update({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		data: {
			_status: "published",
			reviewedAt: now,
			reviewedBy: user.id,
			reviewApproved: true,
			reviewComment
		}
	});

	return { stagedUserId, decision };
}

export async function getStagedUserRequestReviewDiffAction(stagedUserId: string): Promise<UserRequestReviewDiffOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const stagedUser = await payload.findByID({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		depth: 0,
		showHiddenFields: true
	});

	const approvedVersions = await payload.findVersions({
		collection: "staged-users",
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: stagedUserId } },
				{ "version._status": { equals: "published" } }
			]
		},
		select: {
			version: {
				email: true,
				name: true,
				employeeId: true,
				role: true,
				supervisor: true,
				deletedAt: true,
				initialPassword: true
			}
		}
	});

	const approvedVersion = approvedVersions.docs[0]?.version;
	const approvedSupervisor = approvedVersion != null ? getRelationshipId(approvedVersion.supervisor) : null;
	const requestedSupervisor = getRelationshipId(stagedUser.supervisor);
	const approvedRole = approvedVersion != null ? getRelationshipId(approvedVersion.role) : null;
	const requestedRole = getRelationshipId(stagedUser.role);

	const userIds = [approvedSupervisor, requestedSupervisor].filter((value): value is string => value != null);
	const usersById = await findUsersByIds(payload, user, [...new Set(userIds)]);
	const roleIds = [approvedRole, requestedRole].filter((value): value is string => value != null);
	const roleNamesById = await findRolesByIds(payload, user, [...new Set(roleIds)]);

	const relations: StagedUserRelationValues = {};
	for(const [roleId, role] of roleNamesById)
		relations[`roles:${roleId}`] = role;
	for(const [userId, relationUser] of usersById)
		relations[`users:${userId}`] = relationUser;

	const requestType: UserRequestReviewDiffOutput["requestType"] =
		stagedUser.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";

	return {
		requestId: stagedUserId,
		requestType,
		email: [approvedVersion?.email ?? null, stagedUser.email ?? null],
		name: [approvedVersion?.name ?? null, stagedUser.name ?? null],
		employeeId: [approvedVersion?.employeeId ?? null, stagedUser.employeeId ?? null],
		role: [approvedRole, requestedRole],
		supervisor: [approvedSupervisor, requestedSupervisor],
		deletedAt: [approvedVersion?.deletedAt ?? null, stagedUser.deletedAt ?? null],
		initialPassword: [approvedVersion?.initialPassword ?? null, stagedUser.initialPassword ?? null],
		relations
	};
}
