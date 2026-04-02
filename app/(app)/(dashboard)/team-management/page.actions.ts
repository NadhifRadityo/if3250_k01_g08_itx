"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import type { Team } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const sortableFields = new Set<TeamManagementSortField>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"name",
	"supervisorName",
	"supervisorEmail",
	"officerNames",
	"officerEmails",
	"reviewedAt",
	"reviewedByName",
	"reviewApproved",
	"requestType",
	"status",
	"reviewCommentText"
]);
const filterableColumns = new Set<TeamManagementFilterColumn>([
	"name",
	"supervisor.name",
	"supervisor.email",
	"officers.name",
	"officers.email",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt",
	"reviewedBy.name",
	"reviewedBy.email",
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
const dateFilterColumns = new Set<TeamManagementFilterColumn>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt"
]);
const booleanFilterColumns = new Set<TeamManagementFilterColumn>(["reviewApproved"]);

type ReviewCommentValue = NonNullable<Team["reviewComment"]>;
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

export type TeamManagementTabMode = "editor" | "approver";
export type TeamManagementSortField =
	| "createdAt"
	| "updatedAt"
	| "deletedAt"
	| "name"
	| "supervisorName"
	| "supervisorEmail"
	| "officerNames"
	| "officerEmails"
	| "reviewedAt"
	| "reviewedByName"
	| "reviewApproved"
	| "requestType"
	| "status"
	| "reviewCommentText";
export type TeamManagementSortToken = `${"+" | "-"}${TeamManagementSortField}`;
export type TeamManagementFilterColumn =
	| "name"
	| "supervisor.name"
	| "supervisor.email"
	| "officers.name"
	| "officers.email"
	| "createdAt"
	| "updatedAt"
	| "deletedAt"
	| "reviewedAt"
	| "reviewedBy.name"
	| "reviewedBy.email"
	| "reviewApproved";
export type TeamManagementFilterOperator =
	| "equals"
	| "not_equals"
	| "contains"
	| "not_contains"
	| "in"
	| "not_in"
	| "exists"
	| "greater_than"
	| "less_than"
	| "greater_than_equal"
	| "less_than_equal";
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
	supervisorId: string | null;
	supervisorName: string;
	supervisorEmail: string;
	isSoftDeleted: boolean;
	officerIds: string[];
	officerNames: string[];
	officerEmails: string[];
	createdById: string | null;
	createdBy: string;
	updatedById: string | null;
	updatedBy: string;
	deletedById: string | null;
	deletedBy: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	reviewedAt: string | null;
	reviewedById: string | null;
	reviewedByName: string | null;
	reviewApproved: boolean | null;
	reviewCommentText: string;
	requestType: "Create" | "Update" | "Delete";
};

export type TeamRelationColumn =
	| "supervisorName"
	| "supervisorEmail"
	| "officerNames"
	| "officerEmails"
	| "reviewedByName"
	| "createdBy"
	| "updatedBy"
	| "deletedBy";

export type ResolveTeamRelationColumnsInput = {
	rows: Array<Pick<TeamTableRow, "id" | "supervisorId" | "officerIds" | "reviewedById" | "createdById" | "updatedById" | "deletedById">>;
	columns: TeamRelationColumn[];
};

export type ResolveTeamRelationColumnsOutput = Array<{
	id: string;
	values: Partial<Record<TeamRelationColumn, string>>;
}>;

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
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type SearchTeamAssignableUsersOutput = {
	supervisors: Array<{ id: string, name: string, email: string }>;
	officers: Array<{ id: string, name: string, email: string }>;
};

export type UpsertTeamRequestInput = {
	teamId?: string;
	name: string;
	supervisorId: string;
	officerIds: string[];
};

export type ReviewTeamRequestInput = {
	teamId: string;
	decision: "approve" | "reject";
	reason?: string;
};

export type TeamRequestReviewDiffItem = {
	field: "name" | "supervisor" | "officers" | "deletedAt";
	label: string;
	previousValue: string;
	requestedValue: string;
	changed: boolean;
};

export type TeamRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	items: TeamRequestReviewDiffItem[];
	changedCount: number;
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
	if(!deduplicated.some(token => token.slice(1) == "updatedAt"))
		deduplicated.push("-updatedAt");
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

function normalizeScalarFilterValue(column: TeamManagementFilterColumn, rawValue: unknown): string | boolean | null {
	if(rawValue == null)
		return null;

	if(booleanFilterColumns.has(column))
		return parseBooleanValue(rawValue);

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

function getRelationshipName(value: unknown): string | null {
	if(value != null && typeof value == "object" && "name" in value && typeof value.name == "string")
		return value.name;
	return null;
}

function getRelationshipEmail(value: unknown): string | null {
	if(value != null && typeof value == "object" && "email" in value && typeof value.email == "string")
		return value.email;
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

function getRelationshipIds(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];
	return value
		.map(getRelationshipId)
		.filter((id): id is string => id != null);
}

function formatReviewUserList(ids: string[], usersById: Map<string, { name: string, email: string }>): string {
	if(ids.length == 0)
		return "-";
	return ids.map(id => usersById.get(id)?.name ?? "-").join(", ");
}

async function findUsersByIds(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>, ids: string[]): Promise<Map<string, { name: string, email: string }>> {
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
			email: true
		}
	});

	const map = new Map<string, { name: string, email: string }>();
	for(const doc of usersResult.docs)
		map.set(String(doc.id), { name: doc.name, email: doc.email });

	return map;
}

function toPayloadSort(sort: TeamManagementSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		const path = field == "supervisorName" ? "supervisor.name" :
			field == "supervisorEmail" ? "supervisor.email" :
			field == "officerNames" ? "officers.name" :
			field == "officerEmails" ? "officers.email" :
			field == "reviewedByName" ? "reviewedBy.name" :
			field == "requestType" ? "deletedAt" :
			field == "status" || field == "reviewCommentText" ? "reviewedAt" :
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

	const conditions = filters.map(filter => ({
		where: {
			[filter.column]: {
				[operatorMap[filter.operator]]: filter.value
			}
		} as Where,
		joinWithPrevious: filter.joinWithPrevious == "or" ? "or" : "and"
	}));

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

export async function searchTeamAssignableUsersAction(keyword: string): Promise<SearchTeamAssignableUsersOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const normalizedKeyword = keyword.trim();
	const keywordFilters: Where[] = normalizedKeyword.length > 0 ? [
		{ email: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ employeeId: { like: normalizedKeyword } }
	] : [];
	const [supervisorResult, officerResult] = await Promise.all([
		payload.find({
			collection: "users",
			user,
			overrideAccess: false,
			pagination: false,
			limit: 100,
			sort: "name",
			select: { name: true, email: true },
			where: { and: [
				{ role: { equals: "supervisor" } },
				...(keywordFilters.length > 0 ? [{ or: keywordFilters }] : [])
			] }
		}),
		payload.find({
			collection: "users",
			user,
			overrideAccess: false,
			pagination: false,
			limit: 200,
			sort: "name",
			select: { name: true, email: true },
			where: { and: [
				{ role: { equals: "officer" } },
				...(keywordFilters.length > 0 ? [{ or: keywordFilters }] : [])
			] }
		})
	]);
	return {
		supervisors: supervisorResult.docs.map(doc => ({
			id: String(doc.id),
			name: doc.name,
			email: doc.email
		})),
		officers: officerResult.docs.map(doc => ({
			id: String(doc.id),
			name: doc.name,
			email: doc.email
		}))
	};
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
		const supervisorId = getRelationshipId(doc.supervisor);
		const officers = Array.isArray(doc.officers) ? doc.officers : [];
		const officerIds = officers.map(getRelationshipId).filter((id): id is string => id != null);
		const createdById = getRelationshipId(doc.createdBy);
		const updatedById = getRelationshipId(doc.updatedBy);
		const deletedById = getRelationshipId(doc.deletedBy);
		const reviewedById = getRelationshipId(doc.reviewedBy);
		const reviewCommentText = richTextToPlainText(doc.reviewComment);
		const requestType = doc.deletedAt != null ? "Delete" : doc.createdAt == doc.updatedAt ? "Create" : "Update";
		return {
			id: String(doc.id),
			name: doc.name,
			supervisorId,
			supervisorName: "-",
			supervisorEmail: "-",
			isSoftDeleted: doc.deletedAt != null && doc._status == "published",
			officerIds,
			officerNames: [],
			officerEmails: [],
			createdById,
			createdBy: "-",
			updatedById,
			updatedBy: "-",
			deletedById,
			deletedBy: "-",
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			deletedAt: doc.deletedAt ?? null,
			reviewedAt: doc.reviewedAt ?? null,
			reviewedById,
			reviewedByName: null,
			reviewApproved: doc.reviewApproved ?? null,
			reviewCommentText,
			requestType
		};
	});

	return {
		docs: mappedRows,
		totalDocs: teamFindResult.totalDocs,
		page: teamFindResult.page ?? pageNumber,
		hasNextPage: teamFindResult.hasNextPage,
		hasPreviousPage: teamFindResult.hasPrevPage
	};
}

export async function resolveTeamRelationColumnsAction({ rows, columns }: ResolveTeamRelationColumnsInput): Promise<ResolveTeamRelationColumnsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	if(rows.length == 0 || columns.length == 0)
		return [];

	const requestedColumns = [...new Set(columns)];
	const shouldFetchSupervisor = requestedColumns.includes("supervisorName") || requestedColumns.includes("supervisorEmail");
	const shouldFetchOfficer = requestedColumns.includes("officerNames") || requestedColumns.includes("officerEmails");

	const userIds = new Set<string>();
	for(const row of rows) {
		if(shouldFetchSupervisor && row.supervisorId != null)
			userIds.add(row.supervisorId);
		if(shouldFetchOfficer)
			for(const officerId of row.officerIds)
				userIds.add(officerId);
		if(requestedColumns.includes("reviewedByName") && row.reviewedById != null)
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
		const values: Partial<Record<TeamRelationColumn, string>> = {};

		if(requestedColumns.includes("supervisorName"))
			values.supervisorName = row.supervisorId != null ? (usersById.get(row.supervisorId)?.name ?? "-") : "-";
		if(requestedColumns.includes("supervisorEmail"))
			values.supervisorEmail = row.supervisorId != null ? (usersById.get(row.supervisorId)?.email ?? "-") : "-";
		if(requestedColumns.includes("officerNames"))
			values.officerNames = row.officerIds.length > 0 ? row.officerIds.map(officerId => usersById.get(officerId)?.name ?? "-").join(", ") : "-";
		if(requestedColumns.includes("officerEmails"))
			values.officerEmails = row.officerIds.length > 0 ? row.officerIds.map(officerId => usersById.get(officerId)?.email ?? "-").join(", ") : "-";
		if(requestedColumns.includes("reviewedByName"))
			values.reviewedByName = row.reviewedById != null ? (usersById.get(row.reviewedById)?.name ?? "-") : "-";
		if(requestedColumns.includes("createdBy"))
			values.createdBy = row.createdById != null ? (usersById.get(row.createdById)?.name ?? "-") : "-";
		if(requestedColumns.includes("updatedBy"))
			values.updatedBy = row.updatedById != null ? (usersById.get(row.updatedById)?.name ?? "-") : "-";
		if(requestedColumns.includes("deletedBy"))
			values.deletedBy = row.deletedById != null ? (usersById.get(row.deletedById)?.name ?? "-") : "-";

		return {
			id: row.id,
			values
		};
	});
}

export async function upsertTeamRequestAction(input: UpsertTeamRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const name = input.name.trim();
	const supervisorId = input.supervisorId.trim();
	const officerIds = [...new Set(input.officerIds.map(id => id.trim()).filter(id => id.length > 0))];

	if(name.length == 0)
		throw new Error("Team name is required.");
	if(supervisorId.length == 0)
		throw new Error("Supervisor is required.");
	if(officerIds.length == 0)
		throw new Error("At least one officer is required.");

	if(input.teamId == null) {
		const created = await payload.create({
			user,
			collection: "teams",
			overrideAccess: true,
			data: {
				_status: "draft",
				name,
				supervisor: supervisorId,
				officers: officerIds,
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
		trash: true,
		data: {
			_status: "draft",
			name,
			supervisor: supervisorId,
			officers: officerIds,
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

	const approvedSupervisorId = getRelationshipId(approvedVersion.supervisor);
	const approvedOfficers = Array.isArray(approvedVersion.officers) ? approvedVersion.officers : [];
	const approvedOfficerIds = approvedOfficers.map(getRelationshipId).filter((id): id is string => id != null);
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
			supervisor: approvedSupervisorId,
			officers: approvedOfficerIds,
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

export async function reviewTeamRequestAction({ teamId, decision, reason }: ReviewTeamRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const team = await payload.findByID({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(team.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	const reviewComment = plainTextToReviewComment(reason);

	if(decision == "reject") {
		await payload.update({
			user,
			collection: "teams",
			id: teamId,
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
	const approvedSupervisorId = approvedVersion != null ? getRelationshipId(approvedVersion.supervisor) : null;
	const requestedSupervisorId = getRelationshipId(team.supervisor);
	const approvedOfficerIds = approvedVersion != null ? getRelationshipIds(approvedVersion.officers) : [];
	const requestedOfficerIds = getRelationshipIds(team.officers);

	const userIds = [
		approvedSupervisorId,
		requestedSupervisorId,
		...approvedOfficerIds,
		...requestedOfficerIds
	].filter((id): id is string => id != null);
	const usersById = await findUsersByIds(payload, user, [...new Set(userIds)]);

	const requestType: TeamRequestReviewDiffOutput["requestType"] =
		team.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";

	const items: TeamRequestReviewDiffItem[] = [
		{
			field: "name",
			label: "Team Name",
			previousValue: approvedVersion?.name ?? "-",
			requestedValue: team.name
		},
		{
			field: "supervisor",
			label: "Supervisor",
			previousValue: approvedSupervisorId != null ? (usersById.get(approvedSupervisorId)?.name ?? "-") : "-",
			requestedValue: requestedSupervisorId != null ? (usersById.get(requestedSupervisorId)?.name ?? "-") : "-"
		},
		{
			field: "officers",
			label: "Officers",
			previousValue: formatReviewUserList(approvedOfficerIds, usersById),
			requestedValue: formatReviewUserList(requestedOfficerIds, usersById)
		},
		{
			field: "deletedAt",
			label: "Deleted At",
			previousValue: formatReviewDateValue(approvedVersion?.deletedAt ?? null),
			requestedValue: formatReviewDateValue(team.deletedAt)
		}
	].map(item => ({
		...item,
		changed: item.previousValue != item.requestedValue
	}));

	return {
		requestId: teamId,
		requestType,
		items,
		changedCount: items.filter(item => item.changed).length
	};
}
