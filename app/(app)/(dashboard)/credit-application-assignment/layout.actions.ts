"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";

import payloadConfig from "@payload-config";
import { createEmptyReviewComment } from "@/utils/reviewCommentRichText";
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
	"reviewApproved",
	"requestType",
	"status",
	"reviewCommentText"
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
	"reviewApproved" |
	"requestType" |
	"status" |
	"reviewCommentText";
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
	creditApplicationId: string | null;
	officerId: string | null;
	isSoftDeleted: boolean;
	createdById: string | null;
	updatedById: string | null;
	deletedById: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	reviewedAt: string | null;
	reviewedById: string | null;
	reviewApproved: boolean | null;
	reviewCommentText: string;
	requestType: "Create" | "Update" | "Delete";
};

export type CreditApplicationAssignmentRelationColumn = "creditApplication" |
	"officer" |
	"reviewedBy" |
	"createdBy" |
	"updatedBy" |
	"deletedBy";

export type ResolveCreditApplicationAssignmentRelationColumnsInput = {
	rows: Array<Pick<CreditApplicationAssignmentTableRow, "id" | "creditApplicationId" | "officerId" | "reviewedById" | "createdById" | "updatedById" | "deletedById">>;
	columns: CreditApplicationAssignmentRelationColumn[];
};

export type CreditApplicationAssignmentRelationValues = Partial<Record<CreditApplicationAssignmentRelationColumn, string>> & {
	stagedUserIdByUserId?: Record<string, string>;
};

export type ResolveCreditApplicationAssignmentRelationColumnsOutput = Array<{
	id: string;
	values: CreditApplicationAssignmentRelationValues;
}>;

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
	creditApplicationId: string;
	officerId: string;
};

export type ReviewCreditApplicationAssignmentRequestInput = {
	assignmentId: string;
	decision: "approve" | "reject";
	reviewComment: ReviewCommentValue;
};

export type CreditApplicationAssignmentRequestReviewDiffItem = {
	field: "creditApplication" | "officer" | "deletedAt";
	label: string;
	previousValue: string;
	requestedValue: string;
	changed: boolean;
};

export type CreditApplicationAssignmentRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	items: CreditApplicationAssignmentRequestReviewDiffItem[];
	changedCount: number;
};

export type CreditApplicationAssignmentRequestDetailsOutput = {
	row: CreditApplicationAssignmentTableRow;
	relationValues: CreditApplicationAssignmentRelationValues;
};

export type CreditApplicationAssignmentRequestHistoryColumn = "id" |
	"creditApplication" |
	"officer" |
	"createdBy" |
	"updatedBy" |
	"deletedBy" |
	"createdAt" |
	"updatedAt" |
	"deletedAt" |
	"requestType" |
	"status" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved" |
	"reviewCommentText";

export type CreditApplicationAssignmentRequestHistoryChangeItem = {
	column: CreditApplicationAssignmentRequestHistoryColumn;
	label: string;
	previousValue: string;
	nextValue: string;
	changed: boolean;
};

export type CreditApplicationAssignmentRequestHistoryEntry = {
	versionId: string;
	changedAt: string | null;
	changes: CreditApplicationAssignmentRequestHistoryChangeItem[];
	changedCount: number;
};

export type CreditApplicationAssignmentRequestHistoryOutput = {
	requestId: string;
	entries: CreditApplicationAssignmentRequestHistoryEntry[];
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

function richTextToPlainText(value: unknown): string {
	if(value == null || typeof value != "object")
		return "";
	const nodes: unknown[] = [];
	const collectNodes = (node: unknown) => {
		if(node == null || typeof node != "object")
			return;
		nodes.push(node);
		if("children" in node && Array.isArray(node.children))
			node.children.forEach(collectNodes);
	};
	collectNodes((value as { root?: unknown }).root);
	return nodes
		.filter((node): node is { text: string } => node != null && typeof node == "object" && "text" in node && typeof node.text == "string")
		.map(node => node.text)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
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

function formatReviewDateValue(value: string | null | undefined): string {
	if(value == null)
		return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
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

function formatCreditApplicationLabel(value: { name: string, email: string } | null | undefined, fallbackId?: string | null): string {
	if(value == null) {
		const normalizedFallback = normalizeOptionalTextValue(fallbackId);
		return normalizedFallback.length > 0 ? normalizedFallback : "-";
	}
	if(value.name.length > 0)
		return value.name;
	if(value.email.length > 0)
		return value.email;
	const normalizedFallback = normalizeOptionalTextValue(fallbackId);
	return normalizedFallback.length > 0 ? normalizedFallback : "-";
}

function formatUserLabel(value: { name: string, email: string } | null | undefined, fallbackId?: string | null): string {
	if(value == null) {
		const normalizedFallback = normalizeOptionalTextValue(fallbackId);
		return normalizedFallback.length > 0 ? normalizedFallback : "-";
	}
	if(value.name.length > 0)
		return value.name;
	if(value.email.length > 0)
		return value.email;
	const normalizedFallback = normalizeOptionalTextValue(fallbackId);
	return normalizedFallback.length > 0 ? normalizedFallback : "-";
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
		else if(field == "requestType")
			path = "deletedAt";
		else if(field == "status" || field == "reviewCommentText")
			path = "reviewedAt";
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
		creditApplicationId: getRelationshipId(doc.creditApplication),
		officerId: getRelationshipId(doc.officer),
		isSoftDeleted: doc.deletedAt != null && doc._status == "published",
		createdById: getRelationshipId(doc.createdBy),
		updatedById: getRelationshipId(doc.updatedBy),
		deletedById: getRelationshipId(doc.deletedBy),
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
		deletedAt: doc.deletedAt ?? null,
		reviewedAt: doc.reviewedAt ?? null,
		reviewedById: getRelationshipId(doc.reviewedBy),
		reviewApproved: doc.reviewApproved ?? null,
		reviewCommentText: richTextToPlainText(doc.reviewComment),
		requestType: getCreditApplicationAssignmentRequestType(doc.deletedAt ?? null, doc.createdAt, doc.updatedAt)
	}));

	return {
		docs: mappedRows,
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

export async function resolveCreditApplicationAssignmentRelationColumnsAction({
	rows,
	columns
}: ResolveCreditApplicationAssignmentRelationColumnsInput): Promise<ResolveCreditApplicationAssignmentRelationColumnsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	if(rows.length == 0 || columns.length == 0)
		return [];

	const requestedColumns = [...new Set(columns)];

	const userIds = new Set<string>();
	const creditApplicationIds = new Set<string>();
	for(const row of rows) {
		if(requestedColumns.includes("creditApplication") && row.creditApplicationId != null)
			creditApplicationIds.add(row.creditApplicationId);
		if(requestedColumns.includes("officer") && row.officerId != null)
			userIds.add(row.officerId);
		if(requestedColumns.includes("reviewedBy") && row.reviewedById != null)
			userIds.add(row.reviewedById);
		if(requestedColumns.includes("createdBy") && row.createdById != null)
			userIds.add(row.createdById);
		if(requestedColumns.includes("updatedBy") && row.updatedById != null)
			userIds.add(row.updatedById);
		if(requestedColumns.includes("deletedBy") && row.deletedById != null)
			userIds.add(row.deletedById);
	}

	const usersById = await findUsersByIds(payload, user, [...userIds]);
	const creditApplicationsById = await findCreditApplicationsByIds(payload, user, [...creditApplicationIds]);

	return rows.map(row => {
		const values: CreditApplicationAssignmentRelationValues = {};

		if(requestedColumns.includes("creditApplication"))
			values.creditApplication = row.creditApplicationId != null ? formatCreditApplicationLabel(creditApplicationsById.get(row.creditApplicationId), row.creditApplicationId) : "-";
		if(requestedColumns.includes("officer"))
			values.officer = row.officerId != null ? formatUserLabel(usersById.get(row.officerId), row.officerId) : "-";
		if(requestedColumns.includes("reviewedBy"))
			values.reviewedBy = row.reviewedById != null ? formatUserLabel(usersById.get(row.reviewedById), row.reviewedById) : "-";
		if(requestedColumns.includes("createdBy"))
			values.createdBy = row.createdById != null ? formatUserLabel(usersById.get(row.createdById), row.createdById) : "-";
		if(requestedColumns.includes("updatedBy"))
			values.updatedBy = row.updatedById != null ? formatUserLabel(usersById.get(row.updatedById), row.updatedById) : "-";
		if(requestedColumns.includes("deletedBy"))
			values.deletedBy = row.deletedById != null ? formatUserLabel(usersById.get(row.deletedById), row.deletedById) : "-";

		const relationUserIds = new Set<string>();
		if(row.officerId != null)
			relationUserIds.add(row.officerId);
		if(row.reviewedById != null)
			relationUserIds.add(row.reviewedById);
		if(row.createdById != null)
			relationUserIds.add(row.createdById);
		if(row.updatedById != null)
			relationUserIds.add(row.updatedById);
		if(row.deletedById != null)
			relationUserIds.add(row.deletedById);

		const stagedUserIdByUserId = Object.fromEntries(
			[...relationUserIds]
				.map(relationUserId => [relationUserId, usersById.get(relationUserId)?.stagedUserId] as const)
				.filter((entry): entry is [string, string] => typeof entry[1] == "string" && entry[1].trim().length > 0)
		);
		if(Object.keys(stagedUserIdByUserId).length > 0)
			values.stagedUserIdByUserId = stagedUserIdByUserId;

		return {
			id: row.id,
			values
		};
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
		creditApplicationId: getRelationshipId(assignment.creditApplication),
		officerId: getRelationshipId(assignment.officer),
		isSoftDeleted: assignment.deletedAt != null && assignment._status == "published",
		createdById: getRelationshipId(assignment.createdBy),
		updatedById: getRelationshipId(assignment.updatedBy),
		deletedById: getRelationshipId(assignment.deletedBy),
		createdAt: assignment.createdAt,
		updatedAt: assignment.updatedAt,
		deletedAt: assignment.deletedAt ?? null,
		reviewedAt: assignment.reviewedAt ?? null,
		reviewedById: getRelationshipId(assignment.reviewedBy),
		reviewApproved: assignment.reviewApproved ?? null,
		reviewCommentText: richTextToPlainText(assignment.reviewComment),
		requestType: getCreditApplicationAssignmentRequestType(assignment.deletedAt ?? null, assignment.createdAt, assignment.updatedAt)
	};

	const relationValues = (await resolveCreditApplicationAssignmentRelationColumnsAction({
		rows: [row],
		columns: ["creditApplication", "officer", "createdBy", "updatedBy", "deletedBy", "reviewedBy"]
	}))[0]?.values ?? {};

	return {
		row,
		relationValues
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

const creditApplicationAssignmentRequestHistoryColumns = [
	"id",
	"creditApplication",
	"officer",
	"createdBy",
	"updatedBy",
	"deletedBy",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"requestType",
	"status",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved",
	"reviewCommentText"
] as const satisfies CreditApplicationAssignmentRequestHistoryColumn[];

const creditApplicationAssignmentRequestHistoryColumnLabelMap: Record<CreditApplicationAssignmentRequestHistoryColumn, string> = {
	id: "ID",
	creditApplication: "Credit Application",
	officer: "Officer",
	createdBy: "Created By",
	updatedBy: "Updated By",
	deletedBy: "Deleted By",
	createdAt: "Created At",
	updatedAt: "Updated At",
	deletedAt: "Deleted At",
	requestType: "Request",
	status: "Status",
	reviewedAt: "Reviewed At",
	reviewedBy: "Reviewed By",
	reviewApproved: "Review Approved",
	reviewCommentText: "Review Comment"
};

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

		const creditApplicationId = getRelationshipId(version.creditApplication);
		const officerId = getRelationshipId(version.officer);
		const createdById = getRelationshipId(version.createdBy);
		const updatedById = getRelationshipId(version.updatedBy);
		const deletedById = getRelationshipId(version.deletedBy);
		const reviewedById = getRelationshipId(version.reviewedBy);

		if(creditApplicationId != null)
			creditApplicationIds.add(creditApplicationId);
		if(officerId != null)
			userIds.add(officerId);
		if(createdById != null)
			userIds.add(createdById);
		if(updatedById != null)
			userIds.add(updatedById);
		if(deletedById != null)
			userIds.add(deletedById);
		if(reviewedById != null)
			userIds.add(reviewedById);
	}

	const usersById = await findUsersByIds(payload, user, [...userIds]);
	const creditApplicationsById = await findCreditApplicationsByIds(payload, user, [...creditApplicationIds]);

	type CreditApplicationAssignmentHistorySnapshot = {
		versionId: string;
		changedAt: string | null;
		values: Record<CreditApplicationAssignmentRequestHistoryColumn, string>;
	};

	const snapshotsMaybe = historyDocs.map<CreditApplicationAssignmentHistorySnapshot | null>(historyDoc => {
		const version = historyDoc.version;
		if(version == null)
			return null;

		const creditApplicationId = getRelationshipId(version.creditApplication);
		const officerId = getRelationshipId(version.officer);
		const createdById = getRelationshipId(version.createdBy);
		const updatedById = getRelationshipId(version.updatedBy);
		const deletedById = getRelationshipId(version.deletedBy);
		const reviewedById = getRelationshipId(version.reviewedBy);
		const reviewCommentText = richTextToPlainText(version.reviewComment);
		const createdAt = version.createdAt ?? null;
		const updatedAt = version.updatedAt ?? null;
		const deletedAt = version.deletedAt ?? null;
		const reviewedAt = version.reviewedAt ?? null;

		return {
			versionId: String(version.id ?? historyDoc.id ?? assignmentId),
			changedAt: historyDoc.updatedAt ?? updatedAt,
			values: {
				id: String(version.id ?? assignmentId),
				creditApplication: creditApplicationId != null ? formatCreditApplicationLabel(creditApplicationsById.get(creditApplicationId), creditApplicationId) : "-",
				officer: officerId != null ? formatUserLabel(usersById.get(officerId), officerId) : "-",
				createdBy: createdById != null ? formatUserLabel(usersById.get(createdById), createdById) : "-",
				updatedBy: updatedById != null ? formatUserLabel(usersById.get(updatedById), updatedById) : "-",
				deletedBy: deletedById != null ? formatUserLabel(usersById.get(deletedById), deletedById) : "-",
				createdAt: formatReviewDateValue(createdAt),
				updatedAt: formatReviewDateValue(updatedAt),
				deletedAt: formatReviewDateValue(deletedAt),
				requestType: getCreditApplicationAssignmentRequestType(deletedAt, createdAt, updatedAt),
				status: getCreditApplicationAssignmentHistoryStatusLabel(reviewedAt, version.reviewApproved ?? null),
				reviewedAt: formatReviewDateValue(reviewedAt),
				reviewedBy: reviewedById != null ? formatUserLabel(usersById.get(reviewedById), reviewedById) : "-",
				reviewApproved: version.reviewApproved == null ? "-" : version.reviewApproved ? "True" : "False",
				reviewCommentText: reviewCommentText.length > 0 ? reviewCommentText : "-"
			}
		};
	});

	const snapshots = snapshotsMaybe.filter((snapshot): snapshot is CreditApplicationAssignmentHistorySnapshot => snapshot != null);

	const entries: CreditApplicationAssignmentRequestHistoryEntry[] = snapshots.map((snapshot, snapshotIndex) => {
		const previousSnapshot = snapshots[snapshotIndex + 1] ?? null;

		const changes: CreditApplicationAssignmentRequestHistoryChangeItem[] = creditApplicationAssignmentRequestHistoryColumns.map(column => {
			const previousValue = previousSnapshot?.values[column] ?? "-";
			const nextValue = snapshot.values[column];
			return {
				column,
				label: creditApplicationAssignmentRequestHistoryColumnLabelMap[column],
				previousValue,
				nextValue,
				changed: previousValue != nextValue
			};
		});

		return {
			versionId: snapshot.versionId,
			changedAt: snapshot.changedAt,
			changes,
			changedCount: changes.filter(change => change.changed).length
		};
	});

	return {
		requestId: assignmentId,
		entries
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

	const creditApplicationId = input.creditApplicationId.trim();
	const officerId = input.officerId.trim();

	if(creditApplicationId.length == 0)
		throw new Error("Credit application is required.");
	if(officerId.length == 0)
		throw new Error("Officer is required.");

	await ensureCreditApplicationExists(payload, user, creditApplicationId);
	await ensureOfficerUser(payload, user, officerId);

	const requestData = {
		_status: "draft" as const,
		creditApplication: creditApplicationId,
		officer: officerId,
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

	const approvedCreditApplicationId = getRelationshipId(approvedVersion.creditApplication);
	const approvedOfficerId = getRelationshipId(approvedVersion.officer);
	if(approvedCreditApplicationId == null)
		throw new Error("Cannot restore approved assignment without a credit application.");
	if(approvedOfficerId == null)
		throw new Error("Cannot restore approved assignment without an officer.");

	await payload.update({
		user,
		collection: "credit-application-assignments",
		id: assignmentId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			creditApplication: approvedCreditApplicationId,
			officer: approvedOfficerId,
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
	const approvedCreditApplicationId = getRelationshipId(approvedVersion?.creditApplication);
	const requestedCreditApplicationId = getRelationshipId(assignment.creditApplication);
	const approvedOfficerId = getRelationshipId(approvedVersion?.officer);
	const requestedOfficerId = getRelationshipId(assignment.officer);

	const usersById = await findUsersByIds(payload, user, [
		...new Set([approvedOfficerId, requestedOfficerId].filter((value): value is string => value != null))
	]);
	const creditApplicationsById = await findCreditApplicationsByIds(payload, user, [
		...new Set([approvedCreditApplicationId, requestedCreditApplicationId].filter((value): value is string => value != null))
	]);

	const requestType: CreditApplicationAssignmentRequestReviewDiffOutput["requestType"] =
		assignment.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";

	const comparisonItems: Array<Omit<CreditApplicationAssignmentRequestReviewDiffItem, "changed">> = [
		{
			field: "creditApplication",
			label: "Credit Application",
			previousValue: approvedCreditApplicationId != null ? formatCreditApplicationLabel(creditApplicationsById.get(approvedCreditApplicationId), approvedCreditApplicationId) : "-",
			requestedValue: requestedCreditApplicationId != null ? formatCreditApplicationLabel(creditApplicationsById.get(requestedCreditApplicationId), requestedCreditApplicationId) : "-"
		},
		{
			field: "officer",
			label: "Officer",
			previousValue: approvedOfficerId != null ? formatUserLabel(usersById.get(approvedOfficerId), approvedOfficerId) : "-",
			requestedValue: requestedOfficerId != null ? formatUserLabel(usersById.get(requestedOfficerId), requestedOfficerId) : "-"
		},
		{
			field: "deletedAt",
			label: "Deleted At",
			previousValue: formatReviewDateValue(approvedVersion?.deletedAt ?? null),
			requestedValue: formatReviewDateValue(assignment.deletedAt ?? null)
		}
	];

	const items: CreditApplicationAssignmentRequestReviewDiffItem[] = comparisonItems.map(item => ({
		...item,
		changed: item.previousValue != item.requestedValue
	}));

	return {
		requestId: assignmentId,
		requestType,
		items,
		changedCount: items.filter(item => item.changed).length
	};
}
