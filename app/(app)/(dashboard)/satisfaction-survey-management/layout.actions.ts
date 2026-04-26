"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import type { SatsifactionSurvey } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const RELATION_SEARCH_LIMIT = 20;
const surveyStatusValues = ["pending", "approved", "rejected"] as const;
const surveyHistoryRequiredMenu = "satisfaction-survey-management-auditor";
export type SurveyManagementStatus = typeof surveyStatusValues[number];

const surveyStatusSet = new Set<SurveyManagementStatus>(surveyStatusValues);

const sortableFields = new Set<SurveyManagementSortField>([
	"id",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"title",
	"descriptionText",
	"contentText",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved",
	"requestType",
	"status",
	"reviewCommentText"
]);
const filterableColumns = new Set<SurveyManagementFilterColumn>([
	"id",
	"title",
	"descriptionText",
	"contentText",
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
const filterOperators = new Set<SurveyManagementFilterOperator>([
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
const statusFilterOperators = new Set<SurveyManagementFilterOperator>([
	"equals",
	"not_equals",
	"in",
	"not_in",
	"exists"
]);
const dateFilterColumns = new Set<SurveyManagementFilterColumn>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt"
]);
const booleanFilterColumns = new Set<SurveyManagementFilterColumn>(["reviewApproved"]);

type ReviewCommentValue = NonNullable<SatsifactionSurvey["reviewComment"]>;
const defaultReviewComment: ReviewCommentValue = {
	root: {
		type: "root",
		version: 1,
		format: "",
		indent: 0,
		direction: null,
		children: [
			{
				type: "paragraph",
				version: 1,
				format: "",
				indent: 0,
				direction: null,
				children: []
			}
		]
	}
};

export type SurveyManagementTabMode = "editor" | "approver";
export type SurveyManagementSortField = "createdAt" |
	"id" |
	"updatedAt" |
	"deletedAt" |
	"title" |
	"descriptionText" |
	"contentText" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved" |
	"requestType" |
	"status" |
	"reviewCommentText";
export type SurveyManagementSortToken = `${"+" | "-"}${SurveyManagementSortField}`;
export type SurveyManagementFilterColumn = "title" |
	"id" |
	"descriptionText" |
	"contentText" |
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
export type SurveyManagementFilterOperator = "equals" |
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
export type SurveyManagementFilterCombinator = "and" | "or";
export type SurveyManagementFilterInput = {
	column: SurveyManagementFilterColumn;
	operator: SurveyManagementFilterOperator;
	value?: string | Array<string | boolean> | boolean | null;
	joinWithPrevious?: SurveyManagementFilterCombinator;
};

export type SurveyTableRow = {
	id: string;
	title: string;
	descriptionText: string;
	contentText: string;
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

export type SurveyRelationColumn = "reviewedBy" |
	"createdBy" |
	"updatedBy" |
	"deletedBy";

export type ResolveSurveyRelationColumnsInput = {
	rows: Array<Pick<SurveyTableRow, "id" | "reviewedById" | "createdById" | "updatedById" | "deletedById">>;
	columns: SurveyRelationColumn[];
};

export type SurveyRelationValues = Partial<Record<SurveyRelationColumn, string>> & {
	stagedUserIdByUserId?: Record<string, string>;
};

export type ResolveSurveyRelationColumnsOutput = Array<{
	id: string;
	values: SurveyRelationValues;
}>;

export type QuerySurveysInput = {
	keyword: string;
	sort: string[];
	filters?: SurveyManagementFilterInput[];
	filterCombinator?: SurveyManagementFilterCombinator;
	page: number;
	limit: number;
	mode: SurveyManagementTabMode;
	includeSoftDeleted?: boolean;
};

export type QuerySurveysOutput = {
	docs: SurveyTableRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type SurveyFilterUserOption = {
	id: string;
	name: string;
	email: string;
};

export type SurveyFilterIdOption = {
	id: string;
	title: string;
};

export type UpsertSurveyRequestInput = {
	surveyId?: string;
	title: string;
	description: string;
	content: string;
};

export type ReviewSurveyRequestInput = {
	surveyId: string;
	decision: "approve" | "reject";
	reason?: string;
};

export type SurveyRequestReviewDiffItem = {
	field: "title" | "descriptionText" | "contentText" | "deletedAt";
	label: string;
	previousValue: string;
	requestedValue: string;
	changed: boolean;
};

export type SurveyRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	items: SurveyRequestReviewDiffItem[];
	changedCount: number;
};

export type SurveyRequestDetailsOutput = {
	row: SurveyTableRow;
	relationValues: SurveyRelationValues;
	relationReferences: Partial<Record<SurveyRelationColumn, Array<{ type: "user", id: string, label: string }>>>;
};

export type SurveyRequestHistoryColumn = "id" |
	"title" |
	"descriptionText" |
	"contentText" |
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

export type SurveyRequestHistoryChangeItem = {
	column: SurveyRequestHistoryColumn;
	label: string;
	previousValue: string;
	nextValue: string;
	changed: boolean;
};

export type SurveyRequestHistoryEntry = {
	versionId: string;
	changedAt: string | null;
	changes: SurveyRequestHistoryChangeItem[];
	changedCount: number;
};

export type SurveyRequestHistoryOutput = {
	requestId: string;
	entries: SurveyRequestHistoryEntry[];
};

type SortFieldKey = SurveyManagementSortToken extends `${"+" | "-"}${infer T}` ? T : never;
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function normalizeSortTokens(sort: string[]): SurveyManagementSortToken[] {
	const prefixed = sort
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1) as SurveyManagementSortField)) as SurveyManagementSortToken[];
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

function normalizeSurveyStatusValue(value: unknown): SurveyManagementStatus | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase() as SurveyManagementStatus;
	return surveyStatusSet.has(normalized) ? normalized : null;
}

function normalizeScalarFilterValue(column: SurveyManagementFilterColumn, rawValue: unknown): string | boolean | null {
	if(rawValue == null)
		return null;

	if(booleanFilterColumns.has(column))
		return parseBooleanValue(rawValue);

	if(column == "status")
		return normalizeSurveyStatusValue(rawValue);

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

function normalizeFilters(filters: SurveyManagementFilterInput[] | undefined, fallbackCombinator: SurveyManagementFilterCombinator): SurveyManagementFilterInput[] {
	if(filters == null)
		return [];

	const normalized: SurveyManagementFilterInput[] = [];
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

function normalizeFilterCombinator(filterCombinator: SurveyManagementFilterCombinator | undefined): SurveyManagementFilterCombinator {
	return filterCombinator == "or" ? "or" : "and";
}

function richTextToPlainText(value: unknown): string {
	if(value == null || typeof value != "object") return "";
	const nodes: unknown[] = [];
	const collectNodes = (node: unknown) => {
		if(node == null || typeof node != "object") return;
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

function plainTextToRichText(value: string | null | undefined): NonNullable<SatsifactionSurvey["description"]> {
	const text = (value ?? "").trim();
	if(text.length == 0)
		return {
			root: {
				type: "root",
				version: 1,
				format: "",
				indent: 0,
				direction: null,
				children: [
					{
						type: "paragraph",
						version: 1,
						format: "",
						indent: 0,
						direction: null,
						children: []
					}
				]
			}
		};
	return {
		root: {
			type: "root",
			version: 1,
			format: "",
			indent: 0,
			direction: null,
			children: [
				{
					type: "paragraph",
					version: 1,
					format: "",
					indent: 0,
					direction: null,
					children: [
						{
							type: "text",
							version: 1,
							text,
							format: 0,
							detail: 0,
							mode: "normal",
							style: ""
						}
					]
				}
			]
		}
	};
}

function plainTextToReviewComment(value: string | null | undefined): ReviewCommentValue {
	const text = (value ?? "").trim();
	if(text.length == 0)
		return defaultReviewComment;
	return {
		root: {
			type: "root",
			version: 1,
			format: "",
			indent: 0,
			direction: null,
			children: [
				{
					type: "paragraph",
					version: 1,
					format: "",
					indent: 0,
					direction: null,
					children: [
						{
							type: "text",
							version: 1,
							text,
							format: 0,
							detail: 0,
							mode: "normal",
							style: ""
						}
					]
				}
			]
		}
	};
}

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string") return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function formatReviewDateValue(value: string | null | undefined): string {
	if(value == null)
		return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function contentToText(value: unknown): string {
	if(value == null)
		return "";
	if(typeof value == "string")
		return value.trim();
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function parseContentInput(value: string): JsonValue {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		throw new Error("Content JSON is required.");
	try {
		return JSON.parse(trimmed) as JsonValue;
	} catch {
		throw new Error("Content must be valid JSON.");
	}
}

async function resolveUserMenus(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>): Promise<string[]> {
	const rawRole = user.role;
	if(rawRole != null && typeof rawRole == "object" && "menus" in rawRole && Array.isArray(rawRole.menus))
		return rawRole.menus.filter(menu => typeof menu == "string").map(menu => String(menu));

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

	return Array.isArray(role.menus) ? role.menus.filter(menu => typeof menu == "string").map(menu => String(menu)) : [];
}

async function hasSurveyRequestHistoryAccess(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>): Promise<boolean> {
	const surveyMenus = await resolveUserMenus(payload, user);
	return surveyMenus.includes(surveyHistoryRequiredMenu);
}

const surveyRequestHistoryColumns = [
	"id",
	"title",
	"descriptionText",
	"contentText",
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
] as const satisfies SurveyRequestHistoryColumn[];

const surveyRequestHistoryColumnLabelMap: Record<SurveyRequestHistoryColumn, string> = {
	id: "ID",
	title: "Title",
	descriptionText: "Description",
	contentText: "Content",
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

function getSurveyRequestType(deletedAt: string | null | undefined, createdAt: string | null | undefined, updatedAt: string | null | undefined): "Create" | "Update" | "Delete" {
	if(deletedAt != null)
		return "Delete";
	if(createdAt == null || updatedAt == null)
		return "Update";
	return createdAt == updatedAt ? "Create" : "Update";
}

function getSurveyHistoryStatusLabel(reviewedAt: string | null | undefined, reviewApproved: boolean | null | undefined): string {
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

function normalizeSelectedIds(selectedIds: string[] = []): string[] {
	return [...new Set(
		selectedIds
			.map(selectedId => selectedId.trim())
			.filter(selectedId => selectedId.length > 0)
	)];
}

export async function searchSurveyAuditUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<SurveyFilterUserOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
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

export async function searchSurveyOptionsAction(keyword: string, selectedIds: string[] = []): Promise<SurveyFilterIdOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ id: { like: normalizedKeyword } },
		{ title: { like: normalizedKeyword } }
	];
	const whereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? null : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await payload.find({
		collection: "satsifaction-surveys",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "-updatedAt",
		select: {
			title: true
		},
		...(where != null ? { where } : {})
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		title: doc.title
	}));
}

function toPayloadSort(sort: SurveyManagementSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		let path: string;
		if(field == "reviewedBy")
			path = "reviewedBy.name";
		else if(field == "requestType")
			path = "deletedAt";
		else if(field == "status" || field == "reviewCommentText" || field == "descriptionText" || field == "contentText")
			path = "reviewedAt";
		else
			path = field == "title" ? "title" : field;
		return `${direction}${path}`;
	}).join(",");
}

function toPayloadFilterWhere(filters: SurveyManagementFilterInput[]): Where | null {
	if(filters.length == 0)
		return null;

	const operatorMap: Record<SurveyManagementFilterOperator, string> = {
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

	const getStatusWhere = (status: SurveyManagementStatus): Where => {
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

	const buildStatusFilterWhere = (filter: SurveyManagementFilterInput): Where | null => {
		if(filter.operator == "exists")
			return filter.value == true ? null : impossibleWhere;

		const rawStatuses = Array.isArray(filter.value) ? filter.value : [filter.value];
		const statuses = rawStatuses
			.map(normalizeSurveyStatusValue)
			.filter((status): status is SurveyManagementStatus => status != null)
			.filter((status, index, source) => source.indexOf(status) == index);
		if(statuses.length == 0)
			return null;

		if(filter.operator == "equals" || filter.operator == "in")
			return statuses.length == 1 ? getStatusWhere(statuses[0]) : { or: statuses.map(getStatusWhere) };

		if(filter.operator == "not_equals" || filter.operator == "not_in") {
			const excluded = new Set(statuses);
			const remaining = surveyStatusValues.filter(status => !excluded.has(status));
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
					[(filter.column == "descriptionText" ? "description" : filter.column == "contentText" ? "content" : filter.column)]: {
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

export async function querySurveysAction({ keyword, sort, filters, filterCombinator, page, limit, mode, includeSoftDeleted = false }: QuerySurveysInput): Promise<QuerySurveysOutput> {
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

	const surveyFindResult = await payload.find({
		collection: "satsifaction-surveys",
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
			...(normalizedKeyword.length > 0 ? [{ title: { like: normalizedKeyword } }] : []),
			...(payloadFilterWhere != null ? [payloadFilterWhere] : [])
		] },
		select: {
			title: true,
			description: true,
			content: true,
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

	const mappedRows: SurveyTableRow[] = surveyFindResult.docs.map(doc => {
		const createdById = getRelationshipId(doc.createdBy);
		const updatedById = getRelationshipId(doc.updatedBy);
		const deletedById = getRelationshipId(doc.deletedBy);
		const reviewedById = getRelationshipId(doc.reviewedBy);
		const descriptionText = richTextToPlainText(doc.description);
		const contentText = contentToText(doc.content);
		const reviewCommentText = richTextToPlainText(doc.reviewComment);
		const requestType = doc.deletedAt != null ? "Delete" : doc.createdAt == doc.updatedAt ? "Create" : "Update";

		return {
			id: String(doc.id),
			title: doc.title,
			descriptionText,
			contentText,
			isSoftDeleted: doc.deletedAt != null && doc._status == "published",
			createdById,
			updatedById,
			deletedById,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			deletedAt: doc.deletedAt ?? null,
			reviewedAt: doc.reviewedAt ?? null,
			reviewedById,
			reviewApproved: doc.reviewApproved ?? null,
			reviewCommentText,
			requestType
		};
	});

	return {
		docs: mappedRows,
		totalDocs: surveyFindResult.totalDocs,
		page: surveyFindResult.page ?? pageNumber,
		hasNextPage: surveyFindResult.hasNextPage,
		hasPreviousPage: surveyFindResult.hasPrevPage
	};
}

type QuerySurveysSharedInput = Omit<QuerySurveysInput, "mode">;

export async function querySurveysViewerAction(input: QuerySurveysSharedInput): Promise<QuerySurveysOutput> {
	return querySurveysAction({
		...input,
		mode: "editor",
		includeSoftDeleted: false
	});
}

export async function querySurveysEditorAction(input: QuerySurveysSharedInput): Promise<QuerySurveysOutput> {
	return querySurveysAction({
		...input,
		mode: "editor"
	});
}

export async function querySurveysApproverAction(input: QuerySurveysSharedInput): Promise<QuerySurveysOutput> {
	return querySurveysAction({
		...input,
		mode: "approver",
		includeSoftDeleted: false
	});
}

export async function resolveSurveyRelationColumnsAction({ rows, columns }: ResolveSurveyRelationColumnsInput): Promise<ResolveSurveyRelationColumnsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	if(rows.length == 0 || columns.length == 0)
		return [];

	const requestedColumns = [...new Set(columns)];

	const userIds = new Set<string>();
	for(const row of rows) {
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

	return rows.map(row => {
		const values: SurveyRelationValues = {};

		if(requestedColumns.includes("reviewedBy"))
			values.reviewedBy = row.reviewedById != null ? (usersById.get(row.reviewedById)?.name ?? "-") : "-";
		if(requestedColumns.includes("createdBy"))
			values.createdBy = row.createdById != null ? (usersById.get(row.createdById)?.name ?? "-") : "-";
		if(requestedColumns.includes("updatedBy"))
			values.updatedBy = row.updatedById != null ? (usersById.get(row.updatedById)?.name ?? "-") : "-";
		if(requestedColumns.includes("deletedBy"))
			values.deletedBy = row.deletedById != null ? (usersById.get(row.deletedById)?.name ?? "-") : "-";

		const relationUserIds = new Set<string>();
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

export async function getSurveyRequestDetailsAction(surveyId: string): Promise<SurveyRequestDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const survey = await payload.findByID({
		collection: "satsifaction-surveys",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		id: surveyId,
		depth: 0,
		select: {
			title: true,
			description: true,
			content: true,
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

	const createdById = getRelationshipId(survey.createdBy);
	const updatedById = getRelationshipId(survey.updatedBy);
	const deletedById = getRelationshipId(survey.deletedBy);
	const reviewedById = getRelationshipId(survey.reviewedBy);
	const descriptionText = richTextToPlainText(survey.description);
	const contentText = contentToText(survey.content);
	const reviewCommentText = richTextToPlainText(survey.reviewComment);
	const requestType = survey.deletedAt != null ? "Delete" : survey.createdAt == survey.updatedAt ? "Create" : "Update";

	const row: SurveyTableRow = {
		id: String(survey.id),
		title: survey.title,
		descriptionText,
		contentText,
		isSoftDeleted: survey.deletedAt != null && survey._status == "published",
		createdById,
		updatedById,
		deletedById,
		createdAt: survey.createdAt,
		updatedAt: survey.updatedAt,
		deletedAt: survey.deletedAt ?? null,
		reviewedAt: survey.reviewedAt ?? null,
		reviewedById,
		reviewApproved: survey.reviewApproved ?? null,
		reviewCommentText,
		requestType
	};

	const relationUserIds = new Set<string>();
	if(row.reviewedById != null)
		relationUserIds.add(row.reviewedById);
	if(row.createdById != null)
		relationUserIds.add(row.createdById);
	if(row.updatedById != null)
		relationUserIds.add(row.updatedById);
	if(row.deletedById != null)
		relationUserIds.add(row.deletedById);

	const usersById = await findUsersByIds(payload, user, [...relationUserIds]);

	const relationValues: SurveyRelationValues = {
		reviewedBy: row.reviewedById != null ? (usersById.get(row.reviewedById)?.name ?? "-") : "-",
		createdBy: row.createdById != null ? (usersById.get(row.createdById)?.name ?? "-") : "-",
		updatedBy: row.updatedById != null ? (usersById.get(row.updatedById)?.name ?? "-") : "-",
		deletedBy: row.deletedById != null ? (usersById.get(row.deletedById)?.name ?? "-") : "-"
	};

	const stagedUserIdByUserId = Object.fromEntries(
		[...relationUserIds]
			.map(relationUserId => [relationUserId, usersById.get(relationUserId)?.stagedUserId] as const)
			.filter((entry): entry is [string, string] => typeof entry[1] == "string" && entry[1].trim().length > 0)
	);
	if(Object.keys(stagedUserIdByUserId).length > 0)
		relationValues.stagedUserIdByUserId = stagedUserIdByUserId;

	const relationReferences: SurveyRequestDetailsOutput["relationReferences"] = {
		reviewedBy: row.reviewedById != null ? [{ type: "user", id: row.reviewedById, label: usersById.get(row.reviewedById)?.name ?? "User" }] : [],
		createdBy: row.createdById != null ? [{ type: "user", id: row.createdById, label: usersById.get(row.createdById)?.name ?? "User" }] : [],
		updatedBy: row.updatedById != null ? [{ type: "user", id: row.updatedById, label: usersById.get(row.updatedById)?.name ?? "User" }] : [],
		deletedBy: row.deletedById != null ? [{ type: "user", id: row.deletedById, label: usersById.get(row.deletedById)?.name ?? "User" }] : []
	};

	return {
		row,
		relationValues,
		relationReferences
	};
}

export async function canAccessSurveyRequestHistoryAction(): Promise<boolean> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return false;

	return hasSurveyRequestHistoryAccess(payload, user);
}

export async function getSurveyRequestHistoryAction(surveyId: string): Promise<SurveyRequestHistoryOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!await hasSurveyRequestHistoryAccess(payload, user)) return unauthorized();

	const versionsResult = await payload.findVersions({
		collection: "satsifaction-surveys",
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 100,
		sort: "-updatedAt",
		where: {
			parent: {
				equals: surveyId
			}
		},
		select: {
			updatedAt: true,
			version: {
				id: true,
				title: true,
				description: true,
				content: true,
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

	type SurveyVersionSnapshotDoc = {
		id?: string | number;
		updatedAt?: string | null;
		version?: {
			id?: string | number;
			title?: string;
			description?: unknown;
			content?: unknown;
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

	const historyDocs = versionsResult.docs as SurveyVersionSnapshotDoc[];

	const relationUserIds = new Set<string>();
	for(const historyDoc of historyDocs) {
		const version = historyDoc.version;
		if(version == null)
			continue;

		const createdById = getRelationshipId(version.createdBy);
		const updatedById = getRelationshipId(version.updatedBy);
		const deletedById = getRelationshipId(version.deletedBy);
		const reviewedById = getRelationshipId(version.reviewedBy);

		if(createdById != null)
			relationUserIds.add(createdById);
		if(updatedById != null)
			relationUserIds.add(updatedById);
		if(deletedById != null)
			relationUserIds.add(deletedById);
		if(reviewedById != null)
			relationUserIds.add(reviewedById);
	}

	const usersById = await findUsersByIds(payload, user, [...relationUserIds]);

	type SurveyHistorySnapshot = {
		versionId: string;
		changedAt: string | null;
		values: Record<SurveyRequestHistoryColumn, string>;
	};

	const snapshotsMaybe = historyDocs
		.map<SurveyHistorySnapshot | null>(historyDoc => {
			const version = historyDoc.version;
			if(version == null)
				return null;

			const createdById = getRelationshipId(version.createdBy);
			const updatedById = getRelationshipId(version.updatedBy);
			const deletedById = getRelationshipId(version.deletedBy);
			const reviewedById = getRelationshipId(version.reviewedBy);
			const descriptionText = richTextToPlainText(version.description);
			const contentText = contentToText(version.content);
			const reviewCommentText = richTextToPlainText(version.reviewComment);

			const createdAt = version.createdAt ?? null;
			const updatedAt = version.updatedAt ?? null;
			const deletedAt = version.deletedAt ?? null;
			const reviewedAt = version.reviewedAt ?? null;

			return {
				versionId: String(version.id ?? historyDoc.id ?? surveyId),
				changedAt: historyDoc.updatedAt ?? updatedAt,
				values: {
					id: String(version.id ?? surveyId),
					title: (version.title ?? "-").trim().length > 0 ? version.title ?? "-" : "-",
					descriptionText: descriptionText.length > 0 ? descriptionText : "-",
					contentText: contentText.length > 0 ? contentText : "-",
					createdBy: createdById != null ? (usersById.get(createdById)?.name ?? "-") : "-",
					updatedBy: updatedById != null ? (usersById.get(updatedById)?.name ?? "-") : "-",
					deletedBy: deletedById != null ? (usersById.get(deletedById)?.name ?? "-") : "-",
					createdAt: formatReviewDateValue(createdAt),
					updatedAt: formatReviewDateValue(updatedAt),
					deletedAt: formatReviewDateValue(deletedAt),
					requestType: getSurveyRequestType(deletedAt, createdAt, updatedAt),
					status: getSurveyHistoryStatusLabel(reviewedAt, version.reviewApproved ?? null),
					reviewedAt: formatReviewDateValue(reviewedAt),
					reviewedBy: reviewedById != null ? (usersById.get(reviewedById)?.name ?? "-") : "-",
					reviewApproved: version.reviewApproved == null ? "-" : version.reviewApproved ? "True" : "False",
					reviewCommentText: reviewCommentText.length > 0 ? reviewCommentText : "-"
				}
			};
		});

	const snapshots = snapshotsMaybe.filter((snapshot): snapshot is SurveyHistorySnapshot => snapshot != null);

	const entries: SurveyRequestHistoryEntry[] = snapshots.map((snapshot, snapshotIndex) => {
		const previousSnapshot = snapshots[snapshotIndex + 1] ?? null;

		const changes: SurveyRequestHistoryChangeItem[] = surveyRequestHistoryColumns.map(column => {
			const previousValue = previousSnapshot?.values[column] ?? "-";
			const nextValue = snapshot.values[column];
			return {
				column,
				label: surveyRequestHistoryColumnLabelMap[column],
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
		requestId: surveyId,
		entries
	};
}

export async function upsertSurveyRequestAction(input: UpsertSurveyRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const title = input.title.trim();
	const description = input.description.trim();
	const content = parseContentInput(input.content);

	if(title.length == 0)
		throw new Error("Satisfaction survey title is required.");

	if(input.surveyId == null) {
		const created = await payload.create({
			user,
			collection: "satsifaction-surveys",
			overrideAccess: true,
			data: {
				_status: "draft",
				title,
				description: plainTextToRichText(description) as any,
				content,
				deletedAt: null,
				deletedBy: null,
				reviewedAt: null,
				reviewedBy: null,
				reviewApproved: null,
				reviewComment: null
			}
		});
		return { surveyId: created.id };
	}

	await payload.findByID({
		user,
		collection: "satsifaction-surveys",
		id: input.surveyId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "satsifaction-surveys",
		id: input.surveyId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "draft",
			title,
			description: plainTextToRichText(description) as any,
			content,
			deletedAt: null,
			deletedBy: null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});

	return { surveyId: input.surveyId };
}

export async function requestDeleteSurveyAction(surveyId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.findByID({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
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

	return { surveyId };
}

export async function cancelSurveyRequestAction(surveyId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const survey = await payload.findByID({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(survey.reviewedAt != null && survey.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");

	const approvedVersions = await payload.findVersions({
		user,
		collection: "satsifaction-surveys",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: surveyId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {
			version: {
				title: true,
				description: true,
				content: true,
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
			collection: "satsifaction-surveys",
			id: surveyId,
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

		return { surveyId, softDeleted: true };
	}

	const approvedDeletedBy = getRelationshipId(approvedVersion.deletedBy);
	const approvedReviewedBy = getRelationshipId(approvedVersion.reviewedBy);

	await payload.update({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			title: approvedVersion.title,
			description: (approvedVersion.description ?? plainTextToRichText("")) as any,
			content: approvedVersion.content ?? { slides: [] },
			deletedAt: approvedVersion.deletedAt ?? null,
			deletedBy: approvedDeletedBy,
			reviewedAt: approvedVersion.reviewedAt ?? null,
			reviewedBy: approvedReviewedBy,
			reviewApproved: approvedVersion.reviewApproved ?? null,
			reviewComment: approvedVersion.reviewComment ?? defaultReviewComment
		}
	});

	return { surveyId, softDeleted: false };
}

export async function requestRestoreSurveyAction(surveyId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const survey = await payload.findByID({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	if(survey.deletedAt == null)
		throw new Error("Satisfaction survey is not deleted.");

	await payload.update({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
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

	return { surveyId };
}

export async function reviewSurveyRequestAction({ surveyId, decision, reason }: ReviewSurveyRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const survey = await payload.findByID({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(survey.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	const reviewComment = plainTextToReviewComment(reason);

	if(decision == "reject") {
		await payload.update({
			user,
			collection: "satsifaction-surveys",
			id: surveyId,
			overrideAccess: true,
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
		return { surveyId, decision };
	}

	await payload.update({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
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

	return { surveyId, decision };
}

export async function getSurveyRequestReviewDiffAction(surveyId: string): Promise<SurveyRequestReviewDiffOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const survey = await payload.findByID({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	const approvedVersions = await payload.findVersions({
		user,
		collection: "satsifaction-surveys",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: surveyId } },
				{ "version._status": { equals: "published" } }
			]
		},
		select: {
			version: {
				title: true,
				description: true,
				content: true,
				deletedAt: true
			}
		}
	});

	const approvedVersion = approvedVersions.docs[0]?.version;

	const requestType: SurveyRequestReviewDiffOutput["requestType"] =
		survey.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";

	const comparisonItems = [
		{
			field: "title",
			label: "Title",
			previousValue: approvedVersion?.title ?? "-",
			requestedValue: survey.title
		},
		{
			field: "descriptionText",
			label: "Description",
			previousValue: richTextToPlainText(approvedVersion?.description),
			requestedValue: richTextToPlainText(survey.description)
		},
		{
			field: "contentText",
			label: "Content",
			previousValue: contentToText(approvedVersion?.content),
			requestedValue: contentToText(survey.content)
		},
		{
			field: "deletedAt",
			label: "Deleted At",
			previousValue: formatReviewDateValue(approvedVersion?.deletedAt ?? null),
			requestedValue: formatReviewDateValue(survey.deletedAt)
		}
	] satisfies Array<Omit<SurveyRequestReviewDiffItem, "changed">>;

	const items: SurveyRequestReviewDiffItem[] = comparisonItems.map(item => ({
		...item,
		changed: item.previousValue != item.requestedValue
	}));

	return {
		requestId: surveyId,
		requestType,
		items,
		changedCount: items.filter(item => item.changed).length
	};
}
