"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import type { RelationUser } from "@/utils/requestRelationValues";
import { createEmptyReviewComment } from "@/utils/reviewCommentRichText";
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
	"reviewedAt",
	"reviewedBy",
	"reviewApproved"
]);
const filterableColumns = new Set<SurveyManagementFilterColumn>([
	"id",
	"title",
	"description",
	"content",
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

type RichTextValue = NonNullable<SatsifactionSurvey["description"]>;
type ReviewCommentValue = NonNullable<SatsifactionSurvey["reviewComment"]>;
const defaultReviewComment: ReviewCommentValue = createEmptyReviewComment();

export type SurveyManagementTabMode = "editor" | "approver";
export type SurveyManagementSortField = "createdAt" |
	"id" |
	"updatedAt" |
	"deletedAt" |
	"title" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved";
export type SurveyManagementSortToken = `${"+" | "-"}${SurveyManagementSortField}`;
export type SurveyManagementFilterColumn = "title" |
	"id" |
	"description" |
	"content" |
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
	description: RichTextValue | null;
	content: any;
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

export type SurveyRelationValues = Partial<Record<`users:${string}`, RelationUser>>;

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
	relations: SurveyRelationValues;
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
	description: RichTextValue;
	content: string;
};

export type ReviewSurveyRequestInput = {
	surveyId: string;
	decision: "approve" | "reject";
	reviewComment: ReviewCommentValue;
};

export type SurveyRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	title: [string, string];
	description: [RichTextValue | null, RichTextValue | null];
	content: [any, any];
	deletedAt: [string | null, string | null];
	relations: SurveyRelationValues;
};

export type SurveyRequestDetailsOutput = {
	row: SurveyTableRow;
	relations: SurveyRelationValues;
};

export type SurveyRequestHistoryEntry = {
	versionId: string;
	id: string;
	title: string | null;
	description: RichTextValue | null;
	content: any;
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

export type SurveyRequestHistoryOutput = {
	requestId: string;
	entries: SurveyRequestHistoryEntry[];
	relations: SurveyRelationValues;
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

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string") return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function parseContentInput(value: string): JsonValue {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		throw new Error("Content JSON is required.");
	try {
		return JSON.parse(trimmed) as JsonValue;
	} catch{
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
		const createdBy = getRelationshipId(doc.createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		const deletedBy = getRelationshipId(doc.deletedBy);
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		const requestType = doc.deletedAt != null ? "Delete" : doc.createdAt == doc.updatedAt ? "Create" : "Update";

		return {
			id: String(doc.id),
			title: doc.title,
			description: doc.description ?? null,
			content: doc.content,
			isSoftDeleted: doc.deletedAt != null && doc._status == "published",
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
	for(const doc of surveyFindResult.docs) {
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		if(reviewedBy != null)
			userIds.add(reviewedBy);
		const createdBy = getRelationshipId(doc.createdBy);
		if(createdBy != null)
			userIds.add(createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		if(updatedBy != null)
			userIds.add(updatedBy);
		const deletedBy = getRelationshipId(doc.deletedBy);
		if(deletedBy != null)
			userIds.add(deletedBy);
	}

	const usersById = await findUsersByIds(payload, user, [...userIds]);
	const relations: SurveyRelationValues = {};
	for(const [id, relationUser] of usersById)
		relations[`users:${id}`] = relationUser;

	return {
		docs: mappedRows,
		relations,
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

	const createdBy = getRelationshipId(survey.createdBy);
	const updatedBy = getRelationshipId(survey.updatedBy);
	const deletedBy = getRelationshipId(survey.deletedBy);
	const reviewedBy = getRelationshipId(survey.reviewedBy);
	const requestType = survey.deletedAt != null ? "Delete" : survey.createdAt == survey.updatedAt ? "Create" : "Update";

	const row: SurveyTableRow = {
		id: String(survey.id),
		title: survey.title,
		description: survey.description ?? null,
		content: survey.content,
		isSoftDeleted: survey.deletedAt != null && survey._status == "published",
		createdBy,
		updatedBy,
		deletedBy,
		createdAt: survey.createdAt,
		updatedAt: survey.updatedAt,
		deletedAt: survey.deletedAt ?? null,
		reviewedAt: survey.reviewedAt ?? null,
		reviewedBy,
		reviewApproved: survey.reviewApproved ?? null,
		reviewComment: survey.reviewComment ?? null,
		requestType
	};

	const relationUserIds = new Set<string>();
	if(row.reviewedBy != null)
		relationUserIds.add(row.reviewedBy);
	if(row.createdBy != null)
		relationUserIds.add(row.createdBy);
	if(row.updatedBy != null)
		relationUserIds.add(row.updatedBy);
	if(row.deletedBy != null)
		relationUserIds.add(row.deletedBy);

	const usersById = await findUsersByIds(payload, user, [...relationUserIds]);
	const relations: SurveyRelationValues = {};
	for(const [id, relationUser] of usersById)
		relations[`users:${id}`] = relationUser;

	return {
		row,
		relations
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
			content?: any;
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

		const createdBy = getRelationshipId(version.createdBy);
		const updatedBy = getRelationshipId(version.updatedBy);
		const deletedBy = getRelationshipId(version.deletedBy);
		const reviewedBy = getRelationshipId(version.reviewedBy);

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
	const relations: SurveyRelationValues = {};
	for(const [id, relationUser] of usersById)
		relations[`users:${id}`] = relationUser;

	const snapshotsMaybe = historyDocs
		.map<SurveyRequestHistoryEntry | null>(historyDoc => {
			const version = historyDoc.version;
			if(version == null)
				return null;

			const createdBy = getRelationshipId(version.createdBy);
			const updatedBy = getRelationshipId(version.updatedBy);
			const deletedBy = getRelationshipId(version.deletedBy);
			const reviewedBy = getRelationshipId(version.reviewedBy);

			const createdAt = version.createdAt ?? null;
			const updatedAt = version.updatedAt ?? null;
			const deletedAt = version.deletedAt ?? null;
			const reviewedAt = version.reviewedAt ?? null;

			return {
				versionId: String(version.id ?? historyDoc.id ?? surveyId),
				id: String(version.id ?? surveyId),
				title: version.title ?? null,
				description: version.description as RichTextValue | null,
				content: version.content,
				createdBy,
				updatedBy,
				deletedBy,
				createdAt,
				updatedAt,
				deletedAt,
				requestType: getSurveyRequestType(deletedAt, createdAt, updatedAt),
				status: getSurveyHistoryStatusLabel(reviewedAt, version.reviewApproved ?? null),
				reviewedAt,
				reviewedBy,
				reviewApproved: version.reviewApproved ?? null,
				reviewComment: version.reviewComment as ReviewCommentValue | null
			};
		});

	const entries = snapshotsMaybe.filter((snapshot): snapshot is SurveyRequestHistoryEntry => snapshot != null);

	return {
		requestId: surveyId,
		entries,
		relations
	};
}

export async function upsertSurveyRequestAction(input: UpsertSurveyRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const title = input.title.trim();
	const description = input.description;
	const content = parseContentInput(input.content);

	if(title.length == 0)
		throw new Error("Satisfaction survey title is required.");

	if(input.surveyId == null) {
		const created = await payload.create({
			user,
			collection: "satsifaction-surveys",
			overrideAccess: true,
			draft: true,
			data: {
				_status: "draft",
				title,
				description: description,
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
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			title,
			description: description,
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
		draft: true,
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
			description: approvedVersion.description ?? null,
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
		draft: true,
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

	return { surveyId };
}

export async function reviewSurveyRequestAction({ surveyId, decision, reviewComment }: ReviewSurveyRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const survey = await payload.findByID({
		user,
		collection: "satsifaction-surveys",
		id: surveyId,
		overrideAccess: true,
		draft: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(survey.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	if(decision == "reject") {
		await payload.update({
			user,
			collection: "satsifaction-surveys",
			id: surveyId,
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
		draft: true,
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

	return {
		requestId: surveyId,
		requestType: survey.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update",
		title: [approvedVersion?.title ?? "", survey.title],
		description: [approvedVersion?.description ?? null, survey.description],
		content: [approvedVersion?.content ?? null, survey.content],
		deletedAt: [approvedVersion?.deletedAt ?? null, survey.deletedAt],
		relations: {}
	} as unknown as SurveyRequestReviewDiffOutput;
}
