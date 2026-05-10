"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import { createEmptyReviewComment } from "@/utils/reviewCommentRichText";
import type { RelationUser } from "@/utils/requestRelationValues";
import type { Team } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const RELATION_SEARCH_LIMIT = 20;
const teamStatusValues = ["pending", "approved", "rejected"] as const;
const sortableFields = new Set<TeamManagementSortField>([
	"id",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"name",
	"supervisor",
	"officers",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved"
]);
const filterableColumns = new Set<TeamManagementFilterColumn>([
	"id",
	"name",
	"supervisor",
	"officers",
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
const filterOperators = new Set<TeamManagementFilterOperator>([
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
const statusFilterOperators = new Set<TeamManagementFilterOperator>([
	"equals",
	"not_equals",
	"in",
	"not_in",
	"exists"
]);
const dateFilterColumns = new Set<TeamManagementFilterColumn>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt"
]);
const booleanFilterColumns = new Set<TeamManagementFilterColumn>(["reviewApproved"]);
export type TeamManagementStatus = typeof teamStatusValues[number];
const teamStatusSet = new Set<TeamManagementStatus>(teamStatusValues);
const teamHistoryRequiredMenu = "team-management-auditor";

type ReviewCommentValue = NonNullable<Team["reviewComment"]>;
const defaultReviewComment: ReviewCommentValue = createEmptyReviewComment();

export type TeamManagementTabMode = "editor" | "approver";
export type TeamManagementSortField =
	"id" |
	"createdAt" |
	"updatedAt" |
	"deletedAt" |
	"name" |
	"supervisor" |
	"officers" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved";
export type TeamManagementSortToken = `${"+" | "-"}${TeamManagementSortField}`;
export type TeamManagementFilterColumn =
	"id" |
	"name" |
	"supervisor" |
	"officers" |
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
export type TeamManagementFilterOperator =
	"equals" |
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
export type TeamManagementFilterCombinator = "and" | "or";
export type TeamManagementFilterInput = {
	column: TeamManagementFilterColumn;
	operator: TeamManagementFilterOperator;
	value?: string | Array<string | boolean> | boolean | null;
	joinWithPrevious?: TeamManagementFilterCombinator;
};

export type TeamTableRow = {
	id: string;
	name: string;
	supervisor: string | null;
	isSoftDeleted: boolean;
	officers: string[];
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

export type TeamRelationValues = Partial<Record<`users:${string}`, RelationUser>>;

export type QueryTeamsInput = {
	keyword: string;
	sort: string[];
	filters?: TeamManagementFilterInput[];
	filterCombinator?: TeamManagementFilterCombinator;
	page: number;
	limit: number;
	mode: TeamManagementTabMode;
	includeSoftDeleted?: boolean;
};

export type QueryTeamsOutput = {
	docs: TeamTableRow[];
	relations: TeamRelationValues;
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type SearchTeamAssignableUsersOutput = {
	supervisors: Array<{ id: string, name: string, email: string }>;
	officers: Array<{ id: string, name: string, email: string }>;
};

export type TeamReviewerOption = {
	id: string;
	name: string;
	email: string;
};

export type TeamFilterIdOption = {
	id: string;
	name: string;
};

type TeamUserOption = {
	id: string;
	name: string;
	email: string;
};

export type UpsertTeamRequestInput = {
	teamId?: string;
	name: string;
	supervisor: string;
	officers: string[];
};

export type ReviewTeamRequestInput = {
	teamId: string;
	decision: "approve" | "reject";
	reviewComment: ReviewCommentValue;
};

export type TeamRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	name: [string, string];
	supervisor: [string | null, string | null];
	officers: [string[], string[]];
	deletedAt: [string | null, string | null];
	relations: TeamRelationValues;
};

export type TeamRequestDetailsOutput = {
	row: TeamTableRow;
	relations: TeamRelationValues;
};

export type TeamRequestHistoryEntry = {
	versionId: string;
	id: string;
	name: string | null;
	supervisor: string | null;
	officers: string[] | null;
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

export type TeamRequestHistoryOutput = {
	requestId: string;
	entries: TeamRequestHistoryEntry[];
	relations: TeamRelationValues;
};

type SortFieldKey = TeamManagementSortToken extends `${"+" | "-"}${infer T}` ? T : never;

function normalizeSortTokens(sort: string[]): TeamManagementSortToken[] {
	const prefixed = sort
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1) as TeamManagementSortField)) as TeamManagementSortToken[];
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

function normalizeTeamStatusValue(value: unknown): TeamManagementStatus | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase() as TeamManagementStatus;
	return teamStatusSet.has(normalized) ? normalized : null;
}

function normalizeScalarFilterValue(column: TeamManagementFilterColumn, rawValue: unknown): string | boolean | null {
	if(rawValue == null)
		return null;

	if(booleanFilterColumns.has(column))
		return parseBooleanValue(rawValue);

	if(column == "status")
		return normalizeTeamStatusValue(rawValue);

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

function normalizeFilters(filters: TeamManagementFilterInput[] | undefined, fallbackCombinator: TeamManagementFilterCombinator): TeamManagementFilterInput[] {
	if(filters == null)
		return [];

	const normalized: TeamManagementFilterInput[] = [];
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

function normalizeFilterCombinator(filterCombinator: TeamManagementFilterCombinator | undefined): TeamManagementFilterCombinator {
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

async function resolveUserRoleMenus(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>): Promise<string[]> {
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

async function hasTeamRequestHistoryAccess(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>): Promise<boolean> {
	const roleMenus = await resolveUserRoleMenus(payload, user);
	return roleMenus.includes(teamHistoryRequiredMenu);
}

function getRelationshipIds(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];
	return value
		.map(getRelationshipId)
		.filter((id): id is string => id != null);
}

function getTeamRequestType(deletedAt: string | null | undefined, createdAt: string | null | undefined, updatedAt: string | null | undefined): "Create" | "Update" | "Delete" {
	if(deletedAt != null)
		return "Delete";
	if(createdAt == null || updatedAt == null)
		return "Update";
	return createdAt == updatedAt ? "Create" : "Update";
}

function getTeamHistoryStatusLabel(reviewedAt: string | null | undefined, reviewApproved: boolean | null | undefined): string {
	if(reviewedAt == null)
		return "Pending";
	if(reviewApproved == true)
		return "Approved";
	return "Rejected";
}

async function findUsersByIds(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>, ids: string[]): Promise<Map<string, { name: string, email: string, stagedUserId: string | null }>> {
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

	const map = new Map<string, { name: string, email: string, stagedUserId: string | null }>();
	for(const doc of usersResult.docs) {
		map.set(String(doc.id), {
			name: doc.name,
			email: doc.email,
			stagedUserId: getRelationshipId(doc.stagedUser)
		});
	}

	return map;
}

function toPayloadSort(sort: TeamManagementSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		const path = field == "supervisor" ? "supervisor.name" :
			field == "officers" ? "officers.name" :
				field == "reviewedBy" ? "reviewedBy.name" :
					field;
		return `${direction}${path}`;
	}).join(",");
}

function toPayloadFilterWhere(filters: TeamManagementFilterInput[]): Where | null {
	if(filters.length == 0)
		return null;

	const operatorMap: Record<TeamManagementFilterOperator, string> = {
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

	const getStatusWhere = (status: TeamManagementStatus): Where => {
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

	const buildStatusFilterWhere = (filter: TeamManagementFilterInput): Where | null => {
		if(filter.operator == "exists")
			return filter.value == true ? null : impossibleWhere;

		const rawStatuses = Array.isArray(filter.value) ? filter.value : [filter.value];
		const statuses = rawStatuses
			.map(normalizeTeamStatusValue)
			.filter((status): status is TeamManagementStatus => status != null)
			.filter((status, index, source) => source.indexOf(status) == index);
		if(statuses.length == 0)
			return null;

		if(filter.operator == "equals" || filter.operator == "in")
			return statuses.length == 1 ? getStatusWhere(statuses[0]) : { or: statuses.map(getStatusWhere) };

		if(filter.operator == "not_equals" || filter.operator == "not_in") {
			const excluded = new Set(statuses);
			const remaining = teamStatusValues.filter(status => !excluded.has(status));
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

export async function searchTeamAssignableUsersAction(keyword: string): Promise<SearchTeamAssignableUsersOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const [supervisors, officers] = await Promise.all([
		searchUsersByRoleLevel(payload, user, "supervisor", keyword),
		searchUsersByRoleLevel(payload, user, "officer", keyword)
	]);
	return {
		supervisors,
		officers
	};
}

async function searchUsersByRoleLevel(
	payload: Awaited<ReturnType<typeof getPayload>>,
	user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>,
	roleLevel: "supervisor" | "officer",
	keyword: string,
	selectedIds: string[] = []
): Promise<TeamUserOption[]> {
	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ email: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ employeeId: { like: normalizedKeyword } }
	];
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
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "name",
		select: { name: true, email: true },
		where: {
			and: [
				{ "role.level": { equals: roleLevel } },
				...(searchWhere != null ? [searchWhere] : [])
			]
		}
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: doc.name,
		email: doc.email
	}));
}

async function searchUsersByKeyword(
	payload: Awaited<ReturnType<typeof getPayload>>,
	user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>,
	keyword: string,
	selectedIds: string[] = []
): Promise<TeamReviewerOption[]> {
	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ email: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ employeeId: { like: normalizedKeyword } }
	];
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

function normalizeSelectedIds(selectedIds: string[] = []): string[] {
	return [...new Set(
		selectedIds
			.map(selectedId => selectedId.trim())
			.filter(selectedId => selectedId.length > 0)
	)];
}

export async function searchTeamSupervisorUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<TeamUserOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	return searchUsersByRoleLevel(payload, user, "supervisor", keyword, selectedIds);
}

export async function searchTeamOfficerUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<TeamUserOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	return searchUsersByRoleLevel(payload, user, "officer", keyword, selectedIds);
}

export async function searchTeamAuditUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<TeamReviewerOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	return searchUsersByKeyword(payload, user, keyword, selectedIds);
}

export async function searchTeamOptionsAction(keyword: string, selectedIds: string[] = []): Promise<TeamFilterIdOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ id: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } }
	];
	const whereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? null : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await payload.find({
		collection: "teams",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "-updatedAt",
		select: {
			name: true
		},
		...(where != null ? { where } : {})
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: doc.name
	}));
}

export async function queryTeamsAction({ keyword, sort, filters, filterCombinator, page, limit, mode, includeSoftDeleted = false }: QueryTeamsInput): Promise<QueryTeamsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const pageSize = Number.isFinite(limit) ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(limit))) : MAX_PAGE_SIZE;
	const pageNumber = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
	const normalizedKeyword = keyword.trim();
	const sortTokens = normalizeSortTokens(sort);
	const normalizedFilterCombinator = normalizeFilterCombinator(filterCombinator);
	const normalizedFilters = normalizeFilters(filters, normalizedFilterCombinator);
	const payloadFilterWhere = toPayloadFilterWhere(normalizedFilters);
	const payloadSort = toPayloadSort(sortTokens);

	const teamFindResult = await payload.find({
		collection: "teams",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		page: pageNumber,
		limit: pageSize,
		sort: payloadSort,
		depth: 0,
		where: { and: [
			...(mode == "approver" ? [{ reviewedAt: { exists: false } }, { _status: { equals: "draft" } }] : []),
			...(includeSoftDeleted ? [] : [{ or: [
				{ deletedAt: { exists: false } },
				{ _status: { equals: "draft" } }
			] }]),
			...(normalizedKeyword.length > 0 ? [{ or: [
				{ name: { like: normalizedKeyword } },
				{ "supervisor.name": { like: normalizedKeyword } },
				{ "supervisor.email": { like: normalizedKeyword } },
				{ "officers.name": { like: normalizedKeyword } },
				{ "officers.email": { like: normalizedKeyword } }
			] }] : []),
			...(payloadFilterWhere != null ? [payloadFilterWhere] : [])
		] },
		select: {
			name: true,
			supervisor: true,
			officers: true,
			createdBy: true,
			updatedBy: true,
			deletedBy: true,
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

	const mappedRows: TeamTableRow[] = teamFindResult.docs.map(doc => {
		const supervisor = getRelationshipId(doc.supervisor);
		const officers = doc.officers.map(getRelationshipId).filter((id): id is string => id != null);
		const createdBy = getRelationshipId(doc.createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		const deletedBy = getRelationshipId(doc.deletedBy);
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		const requestType = doc.deletedAt != null ? "Delete" : doc.createdAt == doc.updatedAt ? "Create" : "Update";
		return {
			id: String(doc.id),
			name: doc.name,
			supervisor,
			isSoftDeleted: doc.deletedAt != null && doc._status == "published",
			officers,
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

	const userIds = new Set<string>();
	for(const doc of teamFindResult.docs) {
		const supervisor = getRelationshipId(doc.supervisor);
		if(supervisor != null)
			userIds.add(supervisor);
		for(const officer of doc.officers.map(getRelationshipId)) {
			if(officer != null)
				userIds.add(officer);
		}
		const createdBy = getRelationshipId(doc.createdBy);
		if(createdBy != null)
			userIds.add(createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		if(updatedBy != null)
			userIds.add(updatedBy);
		const deletedBy = getRelationshipId(doc.deletedBy);
		if(deletedBy != null)
			userIds.add(deletedBy);
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		if(reviewedBy != null)
			userIds.add(reviewedBy);
	}

	const usersById = await findUsersByIds(payload, user, [...userIds]);
	const relations: TeamRelationValues = {};
	for(const [id, relationUser] of usersById)
		relations[`users:${id}`] = relationUser;

	return {
		docs: mappedRows,
		relations,
		totalDocs: teamFindResult.totalDocs,
		page: teamFindResult.page ?? pageNumber,
		hasNextPage: teamFindResult.hasNextPage,
		hasPreviousPage: teamFindResult.hasPrevPage
	};
}

type QueryTeamsSharedInput = Omit<QueryTeamsInput, "mode">;

export async function queryTeamsViewerAction(input: QueryTeamsSharedInput): Promise<QueryTeamsOutput> {
	return queryTeamsAction({
		...input,
		mode: "editor",
		includeSoftDeleted: false
	});
}

export async function queryTeamsEditorAction(input: QueryTeamsSharedInput): Promise<QueryTeamsOutput> {
	return queryTeamsAction({
		...input,
		mode: "editor"
	});
}

export async function queryTeamsApproverAction(input: QueryTeamsSharedInput): Promise<QueryTeamsOutput> {
	return queryTeamsAction({
		...input,
		mode: "approver",
		includeSoftDeleted: false
	});
}

export async function getTeamRequestDetailsAction(teamId: string): Promise<TeamRequestDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const team = await payload.findByID({
		collection: "teams",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		id: teamId,
		depth: 0,
		select: {
			name: true,
			supervisor: true,
			officers: true,
			createdBy: true,
			updatedBy: true,
			deletedBy: true,
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

	const supervisor = getRelationshipId(team.supervisor);
	const officers = getRelationshipIds(team.officers);
	const createdBy = getRelationshipId(team.createdBy);
	const updatedBy = getRelationshipId(team.updatedBy);
	const deletedBy = getRelationshipId(team.deletedBy);
	const reviewedBy = getRelationshipId(team.reviewedBy);
	const requestType = team.deletedAt != null ? "Delete" : team.createdAt == team.updatedAt ? "Create" : "Update";

	const row: TeamTableRow = {
		id: String(team.id),
		name: team.name,
		supervisor: supervisor,
		isSoftDeleted: team.deletedAt != null && team._status == "published",
		officers: officers,
		createdBy,
		updatedBy,
		deletedBy,
		createdAt: team.createdAt,
		updatedAt: team.updatedAt,
		deletedAt: team.deletedAt ?? null,
		reviewedAt: team.reviewedAt ?? null,
		reviewedBy,
		reviewApproved: team.reviewApproved ?? null,
		reviewComment: team.reviewComment ?? null,
		requestType
	};

	const relationUserIds = new Set<string>();
	if(row.supervisor != null)
		relationUserIds.add(row.supervisor);
	for(const officer of row.officers)
		relationUserIds.add(officer);
	if(row.reviewedBy != null)
		relationUserIds.add(row.reviewedBy);
	if(row.createdBy != null)
		relationUserIds.add(row.createdBy);
	if(row.updatedBy != null)
		relationUserIds.add(row.updatedBy);
	if(row.deletedBy != null)
		relationUserIds.add(row.deletedBy);

	const usersById = await findUsersByIds(payload, user, [...relationUserIds]);

	const relations: TeamRelationValues = {};
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

export async function canAccessTeamRequestHistoryAction(): Promise<boolean> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return false;

	return hasTeamRequestHistoryAccess(payload, user);
}

export async function getTeamRequestHistoryAction(teamId: string): Promise<TeamRequestHistoryOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!await hasTeamRequestHistoryAccess(payload, user)) return unauthorized();

	const versionsResult = await payload.findVersions({
		collection: "teams",
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 100,
		sort: "-updatedAt",
		where: {
			parent: {
				equals: teamId
			}
		},
		select: {
			updatedAt: true,
			version: {
				id: true,
				name: true,
				supervisor: true,
				officers: true,
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

	type TeamVersionSnapshotDoc = {
		id?: string | number;
		updatedAt?: string | null;
		version?: {
			id?: string | number;
			name?: string;
			supervisor?: unknown;
			officers?: unknown;
			createdBy?: unknown;
			updatedBy?: unknown;
			deletedBy?: unknown;
			createdAt?: string | null;
			updatedAt?: string | null;
			deletedAt?: string | null;
			reviewedAt?: string | null;
			reviewedBy?: unknown;
			reviewApproved?: boolean | null;
			reviewComment?: unknown;
		};
	};

	const historyDocs = versionsResult.docs as TeamVersionSnapshotDoc[];

	const relationUserIds = new Set<string>();
	for(const historyDoc of historyDocs) {
		const version = historyDoc.version;
		if(version == null)
			continue;

		const supervisor = getRelationshipId(version.supervisor);
		const officers = getRelationshipIds(version.officers);
		const createdBy = getRelationshipId(version.createdBy);
		const updatedBy = getRelationshipId(version.updatedBy);
		const deletedBy = getRelationshipId(version.deletedBy);
		const reviewedBy = getRelationshipId(version.reviewedBy);

		if(supervisor != null)
			relationUserIds.add(supervisor);
		for(const officer of officers)
			relationUserIds.add(officer);
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
	const relations: TeamRelationValues = {};
	for(const [id, relationUser] of usersById)
		relations[`users:${id}`] = relationUser;

	const entries: TeamRequestHistoryEntry[] = historyDocs.flatMap(historyDoc => {
		const version = historyDoc.version;
		if(version == null)
			return [];

		const supervisor = getRelationshipId(version.supervisor);
		const officers = getRelationshipIds(version.officers);
		const createdBy = getRelationshipId(version.createdBy);
		const updatedBy = getRelationshipId(version.updatedBy);
		const deletedBy = getRelationshipId(version.deletedBy);
		const reviewedBy = getRelationshipId(version.reviewedBy);
		const createdAt = version.createdAt ?? null;
		const updatedAt = version.updatedAt ?? null;
		const deletedAt = version.deletedAt ?? null;
		const reviewedAt = version.reviewedAt ?? null;

		return [{
			versionId: String(version.id ?? historyDoc.id ?? teamId),
			id: String(version.id ?? teamId),
			name: version.name ?? null,
			supervisor,
			officers: officers.length > 0 ? officers : null,
			createdBy,
			updatedBy,
			deletedBy,
			createdAt,
			updatedAt,
			deletedAt,
			requestType: getTeamRequestType(deletedAt, createdAt, updatedAt),
			status: getTeamHistoryStatusLabel(reviewedAt, version.reviewApproved ?? null),
			reviewedAt,
			reviewedBy,
			reviewApproved: version.reviewApproved ?? null,
			reviewComment: version.reviewComment as ReviewCommentValue | null
		}];
	});

	return {
		requestId: teamId,
		entries,
		relations
	};
}

export async function upsertTeamRequestAction(input: UpsertTeamRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const name = input.name.trim();
	const supervisor = input.supervisor.trim();
	const officers = [...new Set(input.officers.map(id => id.trim()).filter(id => id.length > 0))];

	if(name.length == 0)
		throw new Error("Team name is required.");
	if(supervisor.length == 0)
		throw new Error("Supervisor is required.");
	if(officers.length == 0)
		throw new Error("At least one officer is required.");

	if(input.teamId == null) {
		const created = await payload.create({
			user,
			collection: "teams",
			overrideAccess: true,
			draft: true,
			data: {
				_status: "draft",
				name,
				supervisor: supervisor,
				officers: officers,
				deletedAt: null,
				deletedBy: null,
				reviewedAt: null,
				reviewedBy: null,
				reviewApproved: null,
				reviewComment: null
			}
		});
		return { teamId: created.id };
	}

	await payload.findByID({
		user,
		collection: "teams",
		id: input.teamId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "teams",
		id: input.teamId,
		overrideAccess: true,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			name,
			supervisor: supervisor,
			officers: officers,
			deletedAt: null,
			deletedBy: null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});

	return { teamId: input.teamId };
}

export async function requestDeleteTeamAction(teamId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.findByID({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		draft: true,
		trash: true,
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

	return { teamId };
}

export async function cancelTeamRequestAction(teamId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const team = await payload.findByID({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		draft: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(team.reviewedAt != null && team.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");

	const approvedVersions = await payload.findVersions({
		user,
		collection: "teams",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: teamId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {
			version: {
				name: true,
				supervisor: true,
				officers: true,
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
			user,
			collection: "teams",
			id: teamId,
			overrideAccess: true,
			draft: true,
			trash: true,
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

		return { teamId, softDeleted: true };
	}

	const approvedSupervisor = getRelationshipId(approvedVersion.supervisor);
	const approvedOfficers = approvedVersion.officers.map(getRelationshipId).filter((id): id is string => id != null);
	const approvedDeletedBy = getRelationshipId(approvedVersion.deletedBy);
	const approvedReviewedBy = getRelationshipId(approvedVersion.reviewedBy);

	await payload.update({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			name: approvedVersion.name,
			supervisor: approvedSupervisor ?? undefined,
			officers: approvedOfficers,
			deletedAt: approvedVersion.deletedAt ?? null,
			deletedBy: approvedDeletedBy,
			reviewedAt: approvedVersion.reviewedAt ?? null,
			reviewedBy: approvedReviewedBy,
			reviewApproved: approvedVersion.reviewApproved ?? null,
			reviewComment: approvedVersion.reviewComment ?? defaultReviewComment
		}
	});

	return { teamId, softDeleted: false };
}

export async function requestRestoreTeamAction(teamId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const team = await payload.findByID({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		draft: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	if(team.deletedAt == null)
		throw new Error("Team is not deleted.");

	await payload.update({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		draft: true,
		trash: true,
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

	return { teamId };
}

export async function reviewTeamRequestAction({ teamId, decision, reviewComment }: ReviewTeamRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const team = await payload.findByID({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		draft: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(team.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	if(decision == "reject") {
		await payload.update({
			user,
			collection: "teams",
			id: teamId,
			overrideAccess: true,
			draft: true,
			trash: true,
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
		return { teamId, decision };
	}

	await payload.update({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			reviewedAt: now,
			reviewedBy: user.id,
			reviewApproved: true,
			reviewComment
		}
	});

	return { teamId, decision };
}

export async function getTeamRequestReviewDiffAction(teamId: string): Promise<TeamRequestReviewDiffOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const team = await payload.findByID({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		draft: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	const approvedVersions = await payload.findVersions({
		user,
		collection: "teams",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: teamId } },
				{ "version._status": { equals: "published" } }
			]
		},
		select: {
			version: {
				name: true,
				supervisor: true,
				officers: true,
				deletedAt: true
			}
		}
	});

	const approvedVersion = approvedVersions.docs[0]?.version;
	const approvedSupervisor = approvedVersion != null ? getRelationshipId(approvedVersion.supervisor) : null;
	const requestedSupervisor = getRelationshipId(team.supervisor);
	const approvedOfficers = approvedVersion != null ? getRelationshipIds(approvedVersion.officers) : [];
	const requestedOfficers = getRelationshipIds(team.officers);

	const userIds = [
		approvedSupervisor,
		requestedSupervisor,
		...approvedOfficers,
		...requestedOfficers
	].filter((id): id is string => id != null);
	const usersById = await findUsersByIds(payload, user, [...new Set(userIds)]);
	const relations: TeamRelationValues = {};
	for(const [userId, relationUser] of usersById)
		relations[`users:${userId}`] = relationUser;

	return {
		requestId: teamId,
		requestType: team.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update",
		name: [approvedVersion?.name ?? "", team.name],
		supervisor: [approvedSupervisor, requestedSupervisor],
		officers: [approvedOfficers, requestedOfficers],
		deletedAt: [approvedVersion?.deletedAt ?? null, team.deletedAt ?? null],
		relations
	};
}
