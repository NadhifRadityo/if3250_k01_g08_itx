"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";

import payloadConfig from "@payload-config";
import type { User, StagedUser } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const sortableFields = new Set<UserManagementSortField>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"name",
	"email",
	"employeeId",
	"role",
	"supervisorName",
	"reviewedAt",
	"reviewedByName",
	"reviewApproved",
	"requestType",
	"status",
	"reviewCommentText"
]);
const filterableColumns = new Set<UserManagementFilterColumn>([
	"name",
	"email",
	"employeeId",
	"role",
	"supervisor.name",
	"supervisor.email",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt",
	"reviewedBy.name",
	"reviewedBy.email",
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
const dateFilterColumns = new Set<UserManagementFilterColumn>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt"
]);
const booleanFilterColumns = new Set<UserManagementFilterColumn>(["reviewApproved"]);

type ReviewCommentValue = NonNullable<StagedUser["reviewComment"]>;
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

export type UserManagementTabMode = "editor" | "approver";
export type UserManagementSortField = "createdAt" |
	"updatedAt" |
	"deletedAt" |
	"name" |
	"email" |
	"employeeId" |
	"role" |
	"supervisorName" |
	"reviewedAt" |
	"reviewedByName" |
	"reviewApproved" |
	"requestType" |
	"status" |
	"reviewCommentText";
export type UserManagementSortToken = `${"+" | "-"}${UserManagementSortField}`;
export type UserManagementFilterColumn = "name" |
	"email" |
	"employeeId" |
	"role" |
	"supervisor.name" |
	"supervisor.email" |
	"createdAt" |
	"updatedAt" |
	"deletedAt" |
	"reviewedAt" |
	"reviewedBy.name" |
	"reviewedBy.email" |
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
	role: StagedUser["role"];
	supervisorId: string | null;
	supervisorName: string;
	isSoftDeleted: boolean;
	initialPassword: string;
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
};

export type UserRelationColumn = "supervisorName" |
	"reviewedByName" |
	"createdBy" |
	"updatedBy" |
	"deletedBy";

export type ResolveStagedUserRelationColumnsInput = {
	rows: Array<Pick<StagedUserTableRow, "id" | "supervisorId" | "reviewedById" | "createdById" | "updatedById" | "deletedById">>;
	columns: UserRelationColumn[];
};

export type ResolveStagedUserRelationColumnsOutput = Array<{
	id: string;
	values: Partial<Record<UserRelationColumn, string>>;
}>;

export type QueryStagedUsersOutput = {
	docs: StagedUserTableRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
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
	role: StagedUser["role"];
	supervisorId?: string | null;
	initialPassword: string;
};

export type ReviewStagedUserRequestInput = {
	stagedUserId: string;
	decision: "approve" | "reject";
	reason?: string;
};

export type UserRequestReviewDiffItem = {
	field: "email" | "name" | "employeeId" | "role" | "supervisor" | "deletedAt" | "initialPassword";
	label: string;
	previousValue: string;
	requestedValue: string;
	changed: boolean;
};

export type UserRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	items: UserRequestReviewDiffItem[];
	changedCount: number;
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

function normalizeScalarFilterValue(column: UserManagementFilterColumn, rawValue: unknown): string | boolean | null {
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

function normalizeFilters(filters: UserManagementFilterInput[] | undefined, fallbackCombinator: UserManagementFilterCombinator): UserManagementFilterInput[] {
	if(filters == null)
		return [];

	const normalized: UserManagementFilterInput[] = [];
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

function normalizeFilterCombinator(filterCombinator: UserManagementFilterCombinator | undefined): UserManagementFilterCombinator {
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

function formatReviewDateValue(value: string | null | undefined): string {
	if(value == null)
		return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function formatReviewRoleValue(value: StagedUser["role"] | null | undefined): string {
	if(value == null)
		return "-";
	return value;
}

function formatReviewPasswordPresence(value: string | null | undefined): string {
	if((value ?? "").trim().length == 0)
		return "-";
	return "Set";
}

async function findUsersByIds(payload: Payload, user: User, ids: string[]): Promise<Map<string, { name: string, email: string }>> {
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

function toPayloadSort(sort: UserManagementSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		switch(field) {
			case "requestType":
				return `${direction}deletedAt`;
			case "status":
				return `${direction}reviewedAt`;
			case "reviewCommentText":
				return `${direction}reviewedAt`;
			case "supervisorName":
				return `${direction}supervisor.name`;
			case "reviewedByName":
				return `${direction}reviewedBy.name`;
			default:
				return `${direction}${field}`;
		}
	}).join(",");
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

export async function searchUserSupervisorsAction(keyword: string): Promise<Array<{ id: string, name: string, email: string }>> {
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

	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: 100,
		sort: "name",
		where: {
			and: [
				{ role: { equals: "supervisor" } },
				...(keywordFilters.length > 0 ? [{ or: keywordFilters }] : [])
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

	const mappedRows: StagedUserTableRow[] = stagedFindResult.docs.map(doc => {
		const supervisorId = getRelationshipId(doc.supervisor);
		const reviewedById = getRelationshipId(doc.reviewedBy);
		const createdById = getRelationshipId(doc.createdBy);
		const updatedById = getRelationshipId(doc.updatedBy);
		const deletedById = getRelationshipId(doc.deletedBy);
		const reviewCommentText = richTextToPlainText(doc.reviewComment);
		return {
			id: String(doc.id),
			linkedUserId: linkedUserIdByStagedId.get(String(doc.id)) ?? null,
			email: doc.email,
			name: doc.name,
			employeeId: doc.employeeId,
			role: doc.role,
			supervisorId,
			supervisorName: "-",
			isSoftDeleted: doc.deletedAt != null && doc._status == "published",
			initialPassword: doc.initialPassword ?? "",
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
			reviewCommentText
		};
	});

	return {
		docs: mappedRows,
		totalDocs: stagedFindResult.totalDocs,
		page: stagedFindResult.page ?? pageNumber,
		hasNextPage: stagedFindResult.hasNextPage,
		hasPreviousPage: stagedFindResult.hasPrevPage
	};
}

export async function resolveStagedUserRelationColumnsAction({ rows, columns }: ResolveStagedUserRelationColumnsInput): Promise<ResolveStagedUserRelationColumnsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	if(rows.length == 0 || columns.length == 0)
		return [];

	const requestedColumns = [...new Set(columns)];
	const userIds = new Set<string>();
	for(const row of rows) {
		if(requestedColumns.includes("supervisorName") && row.supervisorId != null)
			userIds.add(row.supervisorId);
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
		const values: Partial<Record<UserRelationColumn, string>> = {};

		if(requestedColumns.includes("supervisorName"))
			values.supervisorName = row.supervisorId != null ? (usersById.get(row.supervisorId)?.name ?? "-") : "-";
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

export async function upsertStagedUserRequestAction(input: UpsertStagedUserRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const email = input.email.trim();
	const name = input.name.trim();
	const employeeId = input.employeeId.trim();
	const supervisorId = (input.supervisorId ?? "").trim();
	const initialPassword = input.initialPassword.trim();

	if(email.length == 0)
		throw new Error("Email is required.");
	if(name.length == 0)
		throw new Error("Name is required.");
	if(employeeId.length == 0)
		throw new Error("Employee ID is required.");
	if(initialPassword.length > 0 && initialPassword.length < 8)
		throw new Error("Initial password must be at least 8 characters.");

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
				role: input.role,
				supervisor: supervisorId.length > 0 ? supervisorId : null,
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
			role: input.role,
			supervisor: supervisorId.length > 0 ? supervisorId : null,
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

	const approvedSupervisorId = getRelationshipId(approvedVersion.supervisor);
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
			supervisor: approvedSupervisorId,
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

export async function reviewStagedUserRequestAction({ stagedUserId, decision, reason }: ReviewStagedUserRequestInput) {
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
	const reviewComment = plainTextToReviewComment(reason);

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
		const supervisorId = getRelationshipId(stagedUser.supervisor);
		const upsertData = {
			email: stagedUser.email,
			name: stagedUser.name,
			employeeId: stagedUser.employeeId,
			role: stagedUser.role,
			supervisor: supervisorId,
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
	const approvedSupervisorId = approvedVersion != null ? getRelationshipId(approvedVersion.supervisor) : null;
	const requestedSupervisorId = getRelationshipId(stagedUser.supervisor);

	const userIds = [approvedSupervisorId, requestedSupervisorId].filter((value): value is string => value != null);
	const usersById = await findUsersByIds(payload, user, [...new Set(userIds)]);

	const requestType: UserRequestReviewDiffOutput["requestType"] =
		stagedUser.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";

	const baseItems: Array<Omit<UserRequestReviewDiffItem, "changed">> = [
		{
			field: "email",
			label: "Email",
			previousValue: approvedVersion?.email ?? "-",
			requestedValue: stagedUser.email
		},
		{
			field: "name",
			label: "Name",
			previousValue: approvedVersion?.name ?? "-",
			requestedValue: stagedUser.name
		},
		{
			field: "employeeId",
			label: "Employee ID",
			previousValue: approvedVersion?.employeeId ?? "-",
			requestedValue: stagedUser.employeeId
		},
		{
			field: "role",
			label: "Role",
			previousValue: formatReviewRoleValue(approvedVersion?.role ?? null),
			requestedValue: formatReviewRoleValue(stagedUser.role)
		},
		{
			field: "supervisor",
			label: "Supervisor",
			previousValue: approvedSupervisorId != null ? (usersById.get(approvedSupervisorId)?.name ?? "-") : "-",
			requestedValue: requestedSupervisorId != null ? (usersById.get(requestedSupervisorId)?.name ?? "-") : "-"
		},
		{
			field: "deletedAt",
			label: "Deleted At",
			previousValue: formatReviewDateValue(approvedVersion?.deletedAt ?? null),
			requestedValue: formatReviewDateValue(stagedUser.deletedAt)
		},
		{
			field: "initialPassword",
			label: "Initial Password",
			previousValue: formatReviewPasswordPresence(approvedVersion?.initialPassword ?? null),
			requestedValue: formatReviewPasswordPresence(stagedUser.initialPassword)
		}
	];

	const items: UserRequestReviewDiffItem[] = baseItems.map(item => ({
		...item,
		changed: item.previousValue != item.requestedValue
	}));

	return {
		requestId: stagedUserId,
		requestType,
		items,
		changedCount: items.filter(item => item.changed).length
	};
}
