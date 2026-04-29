"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";

import payloadConfig from "@payload-config";
import { createEmptyReviewComment } from "@/utils/reviewCommentRichText";
import type { RelationCreditApplication, RelationUser, RequestDiffPair } from "@/utils/requestRelationValues";
import type { User, CreditApplicationAssignment } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const RELATION_SEARCH_LIMIT = 20;
const creditApplicationAssignmentStatusValues = ["pending", "approved", "rejected"] as const;
const creditApplicationAssignmentHistoryRequiredMenu = "credit-application-assignment-auditor";

export type CreditApplicationAssignmentStatus = typeof creditApplicationAssignmentStatusValues[number];

const creditApplicationAssignmentStatusSet = new Set<CreditApplicationAssignmentStatus>(creditApplicationAssignmentStatusValues);

const sortableFields = new Set<CreditApplicationAssignmentSortField>([
	"id",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"creditApplication",
	"officer",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved"
]);
const filterableColumns = new Set<CreditApplicationAssignmentFilterColumn>([
	"id",
	"creditApplication",
	"officer",
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
const filterOperators = new Set<CreditApplicationAssignmentFilterOperator>([
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
const statusFilterOperators = new Set<CreditApplicationAssignmentFilterOperator>([
	"equals",
	"not_equals",
	"in",
	"not_in",
	"exists"
]);
const dateFilterColumns = new Set<CreditApplicationAssignmentFilterColumn>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt"
]);
const booleanFilterColumns = new Set<CreditApplicationAssignmentFilterColumn>(["reviewApproved"]);

type ReviewCommentValue = NonNullable<CreditApplicationAssignment["reviewComment"]>;
type SortFieldKey = CreditApplicationAssignmentSortToken extends `${"+" | "-"}${infer T}` ? T : never;

const defaultReviewComment: ReviewCommentValue = createEmptyReviewComment();

export type CreditApplicationAssignmentTabMode = "editor" | "approver";
export type CreditApplicationAssignmentSortField = "createdAt" |
	"id" |
	"updatedAt" |
	"deletedAt" |
	"creditApplication" |
	"officer" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved";
export type CreditApplicationAssignmentSortToken = `${"+" | "-"}${CreditApplicationAssignmentSortField}`;
export type CreditApplicationAssignmentFilterColumn = "id" |
	"creditApplication" |
	"officer" |
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
export type CreditApplicationAssignmentFilterOperator = "equals" |
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
export type CreditApplicationAssignmentFilterCombinator = "and" | "or";
export type CreditApplicationAssignmentFilterInput = {
	column: CreditApplicationAssignmentFilterColumn;
	operator: CreditApplicationAssignmentFilterOperator;
	value?: string | Array<string | boolean> | boolean | null;
	joinWithPrevious?: CreditApplicationAssignmentFilterCombinator;
};

export type CreditApplicationAssignmentTableRow = {
	id: string;
	creditApplication: string | null;
	officer: string | null;
	isSoftDeleted: boolean;
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

export type CreditApplicationAssignmentRelationValues =
	Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`credit-applications:${string}`, RelationCreditApplication>>;

export type QueryCreditApplicationAssignmentsInput = {
	keyword: string;
	sort: string[];
	filters?: CreditApplicationAssignmentFilterInput[];
	filterCombinator?: CreditApplicationAssignmentFilterCombinator;
	page: number;
	limit: number;
	mode: CreditApplicationAssignmentTabMode;
	includeSoftDeleted?: boolean;
};

export type QueryCreditApplicationAssignmentsOutput = {
	docs: CreditApplicationAssignmentTableRow[];
	relations: CreditApplicationAssignmentRelationValues;
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type CreditApplicationAssignmentCreditApplicationOption = {
	id: string;
	name: string;
	email: string;
};

export type CreditApplicationAssignmentOfficerOption = {
	id: string;
	name: string;
	email: string;
};

export type CreditApplicationAssignmentAuditUserOption = {
	id: string;
	name: string;
	email: string;
};

export type CreditApplicationAssignmentFilterIdOption = {
	id: string;
};

export type UpsertCreditApplicationAssignmentRequestInput = {
	assignmentId?: string;
	creditApplication: string;
	officer: string;
};

export type ReviewCreditApplicationAssignmentRequestInput = {
	assignmentId: string;
	decision: "approve" | "reject";
	reviewComment: ReviewCommentValue;
};

export type CreditApplicationAssignmentRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	creditApplication: RequestDiffPair<string | null>;
	officer: RequestDiffPair<string | null>;
	deletedAt: RequestDiffPair<string | null>;
	relations: CreditApplicationAssignmentRelationValues;
};

export type CreditApplicationAssignmentRequestDetailsOutput = {
	row: CreditApplicationAssignmentTableRow;
	relations: CreditApplicationAssignmentRelationValues;
};

export type CreditApplicationAssignmentRequestHistoryEntry = {
	versionId: string;
	id: string;
	creditApplication: string | null;
	officer: string | null;
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

export type CreditApplicationAssignmentRequestHistoryOutput = {
	requestId: string;
	entries: CreditApplicationAssignmentRequestHistoryEntry[];
	relations: CreditApplicationAssignmentRelationValues;
};

function clampPageSize(limit: number): number {
	if(Number.isFinite(limit))
		return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(limit)));
	return MAX_PAGE_SIZE;
}

function normalizeSortTokens(sort: string[]): CreditApplicationAssignmentSortToken[] {
	const prefixed = sort
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1) as CreditApplicationAssignmentSortField)) as CreditApplicationAssignmentSortToken[];
	const deduplicated = prefixed.filter((token, index, source) =>
		index == source.findIndex(candidate => candidate.slice(1) == token.slice(1))
	);
	if(deduplicated.length == 0)
		return ["-updatedAt"];
	return deduplicated;
}

function normalizeOptionalTextValue(value: unknown): string {
	return typeof value == "string" ? value.trim() : "";
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

function normalizeCreditApplicationAssignmentStatusValue(value: unknown): CreditApplicationAssignmentStatus | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase() as CreditApplicationAssignmentStatus;
	return creditApplicationAssignmentStatusSet.has(normalized) ? normalized : null;
}

function normalizeScalarFilterValue(column: CreditApplicationAssignmentFilterColumn, rawValue: unknown): string | boolean | null {
	if(rawValue == null)
		return null;

	if(booleanFilterColumns.has(column))
		return parseBooleanValue(rawValue);

	if(column == "status")
		return normalizeCreditApplicationAssignmentStatusValue(rawValue);

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

function normalizeFilters(
	filters: CreditApplicationAssignmentFilterInput[] | undefined,
	fallbackCombinator: CreditApplicationAssignmentFilterCombinator
): CreditApplicationAssignmentFilterInput[] {
	if(filters == null)
		return [];

	const normalized: CreditApplicationAssignmentFilterInput[] = [];
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

function normalizeFilterCombinator(
	filterCombinator: CreditApplicationAssignmentFilterCombinator | undefined
): CreditApplicationAssignmentFilterCombinator {
	return filterCombinator == "or" ? "or" : "and";
}

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
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

async function hasCreditApplicationAssignmentRequestHistoryAccess(payload: Payload, user: User): Promise<boolean> {
	const roleMenus = await resolveUserRoleMenus(payload, user);
	return roleMenus.includes(creditApplicationAssignmentHistoryRequiredMenu);
}

function getCreditApplicationAssignmentRequestType(
	deletedAt: string | null | undefined,
	createdAt: string | null | undefined,
	updatedAt: string | null | undefined
): "Create" | "Update" | "Delete" {
	if(deletedAt != null)
		return "Delete";
	if(createdAt == null || updatedAt == null)
		return "Update";
	return createdAt == updatedAt ? "Create" : "Update";
}

function getCreditApplicationAssignmentHistoryStatusLabel(
	reviewedAt: string | null | undefined,
	reviewApproved: boolean | null | undefined
): string {
	if(reviewedAt == null)
		return "Pending";
	if(reviewApproved == true)
		return "Approved";
	return "Rejected";
}

function normalizeSelectedIds(selectedIds: string[] = []): string[] {
	return [...new Set(
		selectedIds
			.map(selectedId => selectedId.trim())
			.filter(selectedId => selectedId.length > 0)
	)];
}

async function findUsersByIds(
	payload: Payload,
	user: User,
	ids: string[]
): Promise<Map<string, { name: string, email: string, stagedUserId: string | null }>> {
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

async function findCreditApplicationsByIds(
	payload: Payload,
	user: User,
	ids: string[]
): Promise<Map<string, { name: string, email: string }>> {
	if(ids.length == 0)
		return new Map();

	const applicationsResult = await payload.find({
		collection: "credit-applications",
		user,
		overrideAccess: false,
		draft: true,
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
			name: true,
			email: true
		}
	});

	const map = new Map<string, { name: string, email: string }>();
	for(const doc of applicationsResult.docs) {
		map.set(String(doc.id), {
			name: normalizeOptionalTextValue(doc.name),
			email: normalizeOptionalTextValue(doc.email)
		});
	}

	return map;
}

async function ensureOfficerUser(payload: Payload, user: User, officerId: string): Promise<void> {
	const officer = await payload.findByID({
		collection: "users",
		id: officerId,
		user,
		overrideAccess: false,
		depth: 1,
		select: {
			role: true
		}
	});

	const roleLevel = typeof officer.role == "object" && officer.role != null && "level" in officer.role ? officer.role.level : null;
	if(roleLevel != "officer")
		throw new Error("Selected user must have officer role.");
}

async function ensureCreditApplicationExists(payload: Payload, user: User, creditApplicationId: string): Promise<void> {
	await payload.findByID({
		collection: "credit-applications",
		id: creditApplicationId,
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		depth: 0
	});
}

export async function searchCreditApplicationOptionsAction(
	keyword: string,
	selectedIds: string[] = []
): Promise<CreditApplicationAssignmentCreditApplicationOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = normalizedKeyword.length == 0 ? [] : [
		{ id: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ email: { like: normalizedKeyword } }
	];
	const whereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? null : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await payload.find({
		collection: "credit-applications",
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
			email: true
		},
		...(where != null ? { where } : {})
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: normalizeOptionalTextValue(doc.name),
		email: normalizeOptionalTextValue(doc.email)
	}));
}

export async function searchCreditApplicationAssignmentOptionsAction(
	keyword: string,
	selectedIds: string[] = []
): Promise<CreditApplicationAssignmentFilterIdOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const whereTerms: Where[] = [];
	if(normalizedKeyword.length > 0)
		whereTerms.push({ id: { like: normalizedKeyword } });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? null : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await payload.find({
		collection: "credit-application-assignments",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "-updatedAt",
		select: {},
		...(where != null ? { where } : {})
	});

	return result.docs.map(doc => ({
		id: String(doc.id)
	}));
}

export async function searchCreditApplicationAssignmentOfficerOptionsAction(
	keyword: string,
	selectedIds: string[] = []
): Promise<CreditApplicationAssignmentOfficerOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = normalizedKeyword.length == 0 ? [] : [
		{ email: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ employeeId: { like: normalizedKeyword } }
	];
	const officerSearchTerms: Where[] = [{ "role.level": { equals: "officer" } }];
	if(keywordFilters.length > 0)
		officerSearchTerms.push({ or: keywordFilters });

	const where: Where = {
		and: [
			{ deletedAt: { exists: false } },
			{
				or: [
					officerSearchTerms.length == 1 ? officerSearchTerms[0] : { and: officerSearchTerms },
					...(normalizedSelectedIds.length > 0 ? [{ id: { in: normalizedSelectedIds } }] : [])
				]
			}
		]
	};

	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "name",
		where,
		select: {
			name: true,
			email: true
		}
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: doc.name,
		email: doc.email
	}));
}

export async function searchCreditApplicationAssignmentAuditUserOptionsAction(
	keyword: string,
	selectedIds: string[] = []
): Promise<CreditApplicationAssignmentAuditUserOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = normalizedKeyword.length == 0 ? [] : [
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

function toPayloadSort(sort: CreditApplicationAssignmentSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		let path: string;
		if(field == "creditApplication")
			path = "creditApplication.name";
		else if(field == "officer" || field == "reviewedBy")
			path = `${field}.name`;
		else
			path = field;
		return `${direction}${path}`;
	}).join(",");
}

function toPayloadFilterWhere(filters: CreditApplicationAssignmentFilterInput[]): Where | null {
	if(filters.length == 0)
		return null;

	const operatorMap: Record<CreditApplicationAssignmentFilterOperator, string> = {
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

	const getStatusWhere = (status: CreditApplicationAssignmentStatus): Where => {
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

	const buildStatusFilterWhere = (filter: CreditApplicationAssignmentFilterInput): Where | null => {
		if(filter.operator == "exists")
			return filter.value == true ? null : impossibleWhere;

		const rawStatuses = Array.isArray(filter.value) ? filter.value : [filter.value];
		const statuses = rawStatuses
			.map(normalizeCreditApplicationAssignmentStatusValue)
			.filter((status): status is CreditApplicationAssignmentStatus => status != null)
			.filter((status, index, source) => source.indexOf(status) == index);
		if(statuses.length == 0)
			return null;

		if(filter.operator == "equals" || filter.operator == "in")
			return statuses.length == 1 ? getStatusWhere(statuses[0]) : { or: statuses.map(getStatusWhere) };

		if(filter.operator == "not_equals" || filter.operator == "not_in") {
			const excluded = new Set(statuses);
			const remaining = creditApplicationAssignmentStatusValues.filter(status => !excluded.has(status));
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

export async function queryCreditApplicationAssignmentsAction({
	keyword,
	sort,
	filters,
	filterCombinator,
	page,
	limit,
	mode,
	includeSoftDeleted = false
}: QueryCreditApplicationAssignmentsInput): Promise<QueryCreditApplicationAssignmentsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const pageSize = clampPageSize(limit);
	const pageNumber = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
	const normalizedKeyword = keyword.trim();
	const sortTokens = normalizeSortTokens(sort);
	const normalizedFilterCombinator = normalizeFilterCombinator(filterCombinator);
	const normalizedFilters = normalizeFilters(filters, normalizedFilterCombinator);
	const payloadFilterWhere = toPayloadFilterWhere(normalizedFilters);
	const payloadSort = toPayloadSort(sortTokens);

	const assignmentsResult = await payload.find({
		collection: "credit-application-assignments",
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
				...(includeSoftDeleted ? [] : [{
					or: [
						{ deletedAt: { exists: false } },
						{ _status: { equals: "draft" } }
					]
				}]),
				...(normalizedKeyword.length > 0 ? [{
					or: [
						{ id: { like: normalizedKeyword } },
						{ "creditApplication.name": { like: normalizedKeyword } },
						{ "creditApplication.email": { like: normalizedKeyword } },
						{ "officer.name": { like: normalizedKeyword } },
						{ "officer.email": { like: normalizedKeyword } }
					]
				}] : []),
				...(payloadFilterWhere != null ? [payloadFilterWhere] : [])
			]
		},
		select: {
			creditApplication: true,
			officer: true,
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

	const mappedRows: CreditApplicationAssignmentTableRow[] = assignmentsResult.docs.map(doc => ({
		id: String(doc.id),
		creditApplication: getRelationshipId(doc.creditApplication),
		officer: getRelationshipId(doc.officer),
		isSoftDeleted: doc.deletedAt != null && doc._status == "published",
		createdBy: getRelationshipId(doc.createdBy),
		updatedBy: getRelationshipId(doc.updatedBy),
		deletedBy: getRelationshipId(doc.deletedBy),
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
		deletedAt: doc.deletedAt ?? null,
		reviewedAt: doc.reviewedAt ?? null,
		reviewedBy: getRelationshipId(doc.reviewedBy),
		reviewApproved: doc.reviewApproved ?? null,
		reviewComment: doc.reviewComment ?? null,
		requestType: getCreditApplicationAssignmentRequestType(doc.deletedAt ?? null, doc.createdAt, doc.updatedAt)
	}));

	const userIds = [...new Set(assignmentsResult.docs.flatMap(doc => [
		getRelationshipId(doc.officer),
		getRelationshipId(doc.reviewedBy),
		getRelationshipId(doc.createdBy),
		getRelationshipId(doc.updatedBy),
		getRelationshipId(doc.deletedBy)
	].filter((value): value is string => value != null)))];
	const creditApplicationIds = [...new Set(assignmentsResult.docs
		.map(doc => getRelationshipId(doc.creditApplication))
		.filter((value): value is string => value != null))];
	const [usersById, creditApplicationsById] = await Promise.all([
		findUsersByIds(payload, user, userIds),
		findCreditApplicationsByIds(payload, user, creditApplicationIds)
	]);

	const relations: CreditApplicationAssignmentRelationValues = {};
	for(const [userId, relationUser] of usersById)
		relations[`users:${userId}`] = relationUser;
	for(const [creditApplicationId, relation] of creditApplicationsById)
		relations[`credit-applications:${creditApplicationId}`] = relation;

	return {
		docs: mappedRows,
		relations,
		totalDocs: assignmentsResult.totalDocs,
		page: assignmentsResult.page ?? pageNumber,
		hasNextPage: assignmentsResult.hasNextPage,
		hasPreviousPage: assignmentsResult.hasPrevPage
	};
}

type QueryCreditApplicationAssignmentsSharedInput = Omit<QueryCreditApplicationAssignmentsInput, "mode">;

export async function queryCreditApplicationAssignmentsViewerAction(
	input: QueryCreditApplicationAssignmentsSharedInput
): Promise<QueryCreditApplicationAssignmentsOutput> {
	return queryCreditApplicationAssignmentsAction({
		...input,
		mode: "editor",
		includeSoftDeleted: false
	});
}

export async function queryCreditApplicationAssignmentsEditorAction(
	input: QueryCreditApplicationAssignmentsSharedInput
): Promise<QueryCreditApplicationAssignmentsOutput> {
	return queryCreditApplicationAssignmentsAction({
		...input,
		mode: "editor"
	});
}

export async function queryCreditApplicationAssignmentsApproverAction(
	input: QueryCreditApplicationAssignmentsSharedInput
): Promise<QueryCreditApplicationAssignmentsOutput> {
	return queryCreditApplicationAssignmentsAction({
		...input,
		mode: "approver",
		includeSoftDeleted: false
	});
}

export async function getCreditApplicationAssignmentRequestDetailsAction(
	assignmentId: string
): Promise<CreditApplicationAssignmentRequestDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const assignment = await payload.findByID({
		collection: "credit-application-assignments",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		id: assignmentId,
		depth: 0,
		select: {
			creditApplication: true,
			officer: true,
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

	const row: CreditApplicationAssignmentTableRow = {
		id: String(assignment.id),
		creditApplication: getRelationshipId(assignment.creditApplication),
		officer: getRelationshipId(assignment.officer),
		isSoftDeleted: assignment.deletedAt != null && assignment._status == "published",
		createdBy: getRelationshipId(assignment.createdBy),
		updatedBy: getRelationshipId(assignment.updatedBy),
		deletedBy: getRelationshipId(assignment.deletedBy),
		createdAt: assignment.createdAt,
		updatedAt: assignment.updatedAt,
		deletedAt: assignment.deletedAt ?? null,
		reviewedAt: assignment.reviewedAt ?? null,
		reviewedBy: getRelationshipId(assignment.reviewedBy),
		reviewApproved: assignment.reviewApproved ?? null,
		reviewComment: assignment.reviewComment ?? null,
		requestType: getCreditApplicationAssignmentRequestType(assignment.deletedAt ?? null, assignment.createdAt, assignment.updatedAt)
	};

	const relationUserIds = new Set<string>();
	const creditApplicationIds = new Set<string>();
	if(row.creditApplication != null)
		creditApplicationIds.add(row.creditApplication);
	if(row.officer != null)
		relationUserIds.add(row.officer);
	if(row.createdBy != null)
		relationUserIds.add(row.createdBy);
	if(row.updatedBy != null)
		relationUserIds.add(row.updatedBy);
	if(row.deletedBy != null)
		relationUserIds.add(row.deletedBy);
	if(row.reviewedBy != null)
		relationUserIds.add(row.reviewedBy);

	const usersById = await findUsersByIds(payload, user, [...relationUserIds]);
	const creditApplicationsById = await findCreditApplicationsByIds(payload, user, [...creditApplicationIds]);
	const relations: CreditApplicationAssignmentRelationValues = {};
	if(row.creditApplication != null) {
		const relation = creditApplicationsById.get(row.creditApplication);
		if(relation != null)
			relations[`credit-applications:${row.creditApplication}`] = relation;
	}
	if(row.officer != null) {
		const relation = usersById.get(row.officer);
		if(relation != null)
			relations[`users:${row.officer}`] = relation;
	}
	if(row.createdBy != null) {
		const relation = usersById.get(row.createdBy);
		if(relation != null)
			relations[`users:${row.createdBy}`] = relation;
	}
	if(row.updatedBy != null) {
		const relation = usersById.get(row.updatedBy);
		if(relation != null)
			relations[`users:${row.updatedBy}`] = relation;
	}
	if(row.deletedBy != null) {
		const relation = usersById.get(row.deletedBy);
		if(relation != null)
			relations[`users:${row.deletedBy}`] = relation;
	}
	if(row.reviewedBy != null) {
		const relation = usersById.get(row.reviewedBy);
		if(relation != null)
			relations[`users:${row.reviewedBy}`] = relation;
	}

	return {
		row,
		relations
	};
}

export async function canAccessCreditApplicationAssignmentRequestHistoryAction(): Promise<boolean> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	return hasCreditApplicationAssignmentRequestHistoryAccess(payload, user);
}

export async function getCreditApplicationAssignmentRequestHistoryAction(
	assignmentId: string
): Promise<CreditApplicationAssignmentRequestHistoryOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	if(!(await hasCreditApplicationAssignmentRequestHistoryAccess(payload, user)))
		throw new Error("You do not have access to assignment request history.");

	const versionsResult = await payload.findVersions({
		user,
		collection: "credit-application-assignments",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 100,
		sort: "-updatedAt",
		where: {
			parent: {
				equals: assignmentId
			}
		},
		select: {
			version: {
				creditApplication: true,
				officer: true,
				createdBy: true,
				updatedBy: true,
				deletedBy: true,
				createdAt: true,
				updatedAt: true,
				deletedAt: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true,
				_status: true
			}
		}
	});

	type AssignmentVersionSnapshotDoc = {
		id: string;
		updatedAt?: string | null;
		version?: {
			id?: string | null;
			creditApplication?: unknown;
			officer?: unknown;
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

	const historyDocs = versionsResult.docs as AssignmentVersionSnapshotDoc[];

	const userIds = new Set<string>();
	const creditApplicationIds = new Set<string>();
	for(const historyDoc of historyDocs) {
		const version = historyDoc.version;
		if(version == null)
			continue;

		const creditApplication = getRelationshipId(version.creditApplication);
		const officer = getRelationshipId(version.officer);
		const createdBy = getRelationshipId(version.createdBy);
		const updatedBy = getRelationshipId(version.updatedBy);
		const deletedBy = getRelationshipId(version.deletedBy);
		const reviewedBy = getRelationshipId(version.reviewedBy);

		if(creditApplication != null)
			creditApplicationIds.add(creditApplication);
		if(officer != null)
			userIds.add(officer);
		if(createdBy != null)
			userIds.add(createdBy);
		if(updatedBy != null)
			userIds.add(updatedBy);
		if(deletedBy != null)
			userIds.add(deletedBy);
		if(reviewedBy != null)
			userIds.add(reviewedBy);
	}

	const usersById = await findUsersByIds(payload, user, [...userIds]);
	const creditApplicationsById = await findCreditApplicationsByIds(payload, user, [...creditApplicationIds]);

	const snapshotsMaybe = historyDocs.map<CreditApplicationAssignmentRequestHistoryEntry | null>(historyDoc => {
		const version = historyDoc.version;
		if(version == null)
			return null;

		const createdAt = version.createdAt ?? null;
		const updatedAt = version.updatedAt ?? null;
		const deletedAt = version.deletedAt ?? null;
		const reviewedAt = version.reviewedAt ?? null;

		return {
			versionId: String(version.id ?? historyDoc.id ?? assignmentId),
			id: String(version.id ?? assignmentId),
			creditApplication: getRelationshipId(version.creditApplication),
			officer: getRelationshipId(version.officer),
			createdBy: getRelationshipId(version.createdBy),
			updatedBy: getRelationshipId(version.updatedBy),
			deletedBy: getRelationshipId(version.deletedBy),
			createdAt,
			updatedAt,
			deletedAt,
			requestType: getCreditApplicationAssignmentRequestType(deletedAt, createdAt, updatedAt),
			status: getCreditApplicationAssignmentHistoryStatusLabel(reviewedAt, version.reviewApproved ?? null),
			reviewedAt,
			reviewedBy: getRelationshipId(version.reviewedBy),
			reviewApproved: version.reviewApproved ?? null,
			reviewComment: version.reviewComment as ReviewCommentValue | null
		};
	});

	const entries = snapshotsMaybe.filter((snapshot): snapshot is CreditApplicationAssignmentRequestHistoryEntry => snapshot != null);
	const relations: CreditApplicationAssignmentRelationValues = {};
	for(const [creditApplicationId, relation] of creditApplicationsById)
		relations[`credit-applications:${creditApplicationId}`] = relation;
	for(const [userId, relation] of usersById)
		relations[`users:${userId}`] = relation;

	return {
		requestId: assignmentId,
		entries,
		relations
	};
}

export async function upsertCreditApplicationAssignmentRequestAction(
	input: UpsertCreditApplicationAssignmentRequestInput
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const creditApplicationId = input.creditApplication.trim();
	const officer = input.officer.trim();

	if(creditApplicationId.length == 0)
		throw new Error("Credit application is required.");
	if(officer.length == 0)
		throw new Error("Officer is required.");

	await ensureCreditApplicationExists(payload, user, creditApplicationId);
	await ensureOfficerUser(payload, user, officer);

	const requestData = {
		_status: "draft" as const,
		creditApplication: creditApplicationId,
		officer: officer,
		deletedAt: null,
		deletedBy: null,
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: null
	};

	if(input.assignmentId == null) {
		const created = await payload.create({
			user,
			collection: "credit-application-assignments",
			overrideAccess: true,
			data: requestData
		});
		return { assignmentId: created.id };
	}

	await payload.findByID({
		user,
		collection: "credit-application-assignments",
		id: input.assignmentId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "credit-application-assignments",
		id: input.assignmentId,
		overrideAccess: true,
		trash: true,
		data: requestData
	});

	return { assignmentId: input.assignmentId };
}

export async function requestDeleteCreditApplicationAssignmentAction(assignmentId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	await payload.findByID({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
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

	return { assignmentId };
}

export async function cancelCreditApplicationAssignmentRequestAction(assignmentId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const assignment = await payload.findByID({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	if(assignment.reviewedAt != null && assignment.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");

	const approvedVersions = await payload.findVersions({
		user,
		collection: "credit-application-assignments",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: assignmentId } },
				{ "version._status": { equals: "published" } }
			]
		},
		select: {
			version: {
				creditApplication: true,
				officer: true,
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
			collection: "credit-application-assignments",
			id: assignmentId,
			overrideAccess: true,
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

		return { assignmentId, softDeleted: true };
	}

	const approvedCreditApplication = getRelationshipId(approvedVersion.creditApplication);
	const approvedOfficer = getRelationshipId(approvedVersion.officer);
	if(approvedCreditApplication == null)
		throw new Error("Cannot restore approved assignment without a credit application.");
	if(approvedOfficer == null)
		throw new Error("Cannot restore approved assignment without an officer.");

	await payload.update({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			creditApplication: approvedCreditApplication,
			officer: approvedOfficer,
			deletedAt: approvedVersion.deletedAt ?? null,
			deletedBy: getRelationshipId(approvedVersion.deletedBy),
			reviewedAt: approvedVersion.reviewedAt ?? null,
			reviewedBy: getRelationshipId(approvedVersion.reviewedBy),
			reviewApproved: approvedVersion.reviewApproved ?? null,
			reviewComment: (approvedVersion.reviewComment ?? defaultReviewComment) as any
		}
	});

	return { assignmentId, softDeleted: false };
}

export async function requestRestoreCreditApplicationAssignmentAction(assignmentId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const assignment = await payload.findByID({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	if(assignment.deletedAt == null)
		throw new Error("Credit application assignment is not deleted.");

	await payload.update({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
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

	return { assignmentId };
}

export async function reviewCreditApplicationAssignmentRequestAction({
	assignmentId,
	decision,
	reviewComment
}: ReviewCreditApplicationAssignmentRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const assignment = await payload.findByID({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	if(assignment.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	if(decision == "reject") {
		await payload.update({
			user,
			collection: "credit-application-assignments",
			id: assignmentId,
			overrideAccess: true,
			trash: true,
			data: {
				_status: "draft",
				deletedAt: null,
				deletedBy: null,
				reviewedAt: now,
				reviewedBy: user.id,
				reviewApproved: false,
				reviewComment: reviewComment as any
			}
		});
		return { assignmentId, decision };
	}

	await payload.update({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			reviewedAt: now,
			reviewedBy: user.id,
			reviewApproved: true,
			reviewComment: reviewComment as any
		}
	});

	return { assignmentId, decision };
}

export async function getCreditApplicationAssignmentRequestReviewDiffAction(
	assignmentId: string
): Promise<CreditApplicationAssignmentRequestReviewDiffOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const assignment = await payload.findByID({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	const approvedVersions = await payload.findVersions({
		user,
		collection: "credit-application-assignments",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: assignmentId } },
				{ "version._status": { equals: "published" } }
			]
		},
		select: {
			version: {
				creditApplication: true,
				officer: true,
				deletedAt: true
			}
		}
	});

	const approvedVersion = approvedVersions.docs[0]?.version;
	const approvedCreditApplication = getRelationshipId(approvedVersion?.creditApplication);
	const requestedCreditApplication = getRelationshipId(assignment.creditApplication);
	const approvedOfficer = getRelationshipId(approvedVersion?.officer);
	const requestedOfficer = getRelationshipId(assignment.officer);

	const usersById = await findUsersByIds(payload, user, [
		...new Set([approvedOfficer, requestedOfficer].filter((value): value is string => value != null))
	]);
	const creditApplicationsById = await findCreditApplicationsByIds(payload, user, [
		...new Set([approvedCreditApplication, requestedCreditApplication].filter((value): value is string => value != null))
	]);

	const requestType: CreditApplicationAssignmentRequestReviewDiffOutput["requestType"] =
		assignment.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";

	return {
		requestId: assignmentId,
		requestType,
		creditApplication: [approvedCreditApplication, requestedCreditApplication],
		officer: [approvedOfficer, requestedOfficer],
		deletedAt: [approvedVersion?.deletedAt ?? null, assignment.deletedAt ?? null],
		relations: (() => {
			const relations: CreditApplicationAssignmentRelationValues = {};
			if(approvedCreditApplication != null) {
				const relation = creditApplicationsById.get(approvedCreditApplication);
				if(relation != null)
					relations[`credit-applications:${approvedCreditApplication}`] = relation;
			}
			if(requestedCreditApplication != null) {
				const relation = creditApplicationsById.get(requestedCreditApplication);
				if(relation != null)
					relations[`credit-applications:${requestedCreditApplication}`] = relation;
			}
			if(approvedOfficer != null) {
				const relation = usersById.get(approvedOfficer);
				if(relation != null)
					relations[`users:${approvedOfficer}`] = relation;
			}
			if(requestedOfficer != null) {
				const relation = usersById.get(requestedOfficer);
				if(relation != null)
					relations[`users:${requestedOfficer}`] = relation;
			}
			return relations;
		})()
	};
}
