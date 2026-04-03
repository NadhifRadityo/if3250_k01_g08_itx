"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import type { Role } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const roleLevelValues = ["admin", "manager", "supervisor", "officer"] as const;
const roleMenuValues = [
	"user-management-editor",
	"user-management-approver",
	"role-management-editor",
	"role-management-approver",
	"team-management-editor",
	"team-management-approver"
] as const;
const roleLevelLabelMap: Record<RoleLevel, string> = {
	admin: "Admin",
	manager: "Manager",
	supervisor: "Supervisor",
	officer: "Officer"
};
const roleMenuLabelMap: Record<RoleMenu, string> = {
	"user-management-editor": "User Management - Editor",
	"user-management-approver": "User Management - Approver",
	"role-management-editor": "Role Management - Editor",
	"role-management-approver": "Role Management - Approver",
	"team-management-editor": "Team Management - Editor",
	"team-management-approver": "Team Management - Approver"
};

export type RoleLevel = Role["level"];
export type RoleMenu = Role["menus"][number];

const roleLevelSet = new Set<RoleLevel>(roleLevelValues);
const roleMenuSet = new Set<RoleMenu>(roleMenuValues);

const sortableFields = new Set<RoleManagementSortField>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"name",
	"level",
	"menus",
	"reviewedAt",
	"reviewedByName",
	"reviewApproved",
	"requestType",
	"status",
	"reviewCommentText"
]);
const filterableColumns = new Set<RoleManagementFilterColumn>([
	"name",
	"level",
	"menus",
	"createdAt",
	"createdBy",
	"updatedAt",
	"updatedBy",
	"deletedAt",
	"deletedBy",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved"
]);
const filterOperators = new Set<RoleManagementFilterOperator>([
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
const dateFilterColumns = new Set<RoleManagementFilterColumn>([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt"
]);
const booleanFilterColumns = new Set<RoleManagementFilterColumn>(["reviewApproved"]);

type ReviewCommentValue = NonNullable<Role["reviewComment"]>;
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

export type RoleManagementTabMode = "editor" | "approver";
export type RoleManagementSortField = "createdAt" |
	"updatedAt" |
	"deletedAt" |
	"name" |
	"level" |
	"menus" |
	"reviewedAt" |
	"reviewedByName" |
	"reviewApproved" |
	"requestType" |
	"status" |
	"reviewCommentText";
export type RoleManagementSortToken = `${"+" | "-"}${RoleManagementSortField}`;
export type RoleManagementFilterColumn = "name" |
	"level" |
	"menus" |
	"createdAt" |
	"createdBy" |
	"updatedAt" |
	"updatedBy" |
	"deletedAt" |
	"deletedBy" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved";
export type RoleManagementFilterOperator = "equals" |
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
export type RoleManagementFilterCombinator = "and" | "or";
export type RoleManagementFilterInput = {
	column: RoleManagementFilterColumn;
	operator: RoleManagementFilterOperator;
	value?: string | Array<string | boolean> | boolean | null;
	joinWithPrevious?: RoleManagementFilterCombinator;
};

export type RoleTableRow = {
	id: string;
	name: string;
	level: RoleLevel;
	menus: RoleMenu[];
	isSoftDeleted: boolean;
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

export type RoleRelationColumn = "reviewedByName" |
	"createdBy" |
	"updatedBy" |
	"deletedBy";

export type ResolveRoleRelationColumnsInput = {
	rows: Array<Pick<RoleTableRow, "id" | "reviewedById" | "createdById" | "updatedById" | "deletedById">>;
	columns: RoleRelationColumn[];
};

export type ResolveRoleRelationColumnsOutput = Array<{
	id: string;
	values: Partial<Record<RoleRelationColumn, string>>;
}>;

export type QueryRolesInput = {
	keyword: string;
	sort: string[];
	filters?: RoleManagementFilterInput[];
	filterCombinator?: RoleManagementFilterCombinator;
	page: number;
	limit: number;
	mode: RoleManagementTabMode;
	includeSoftDeleted?: boolean;
};

export type QueryRolesOutput = {
	docs: RoleTableRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type RoleFilterUserOption = {
	id: string;
	name: string;
	email: string;
};

export type UpsertRoleRequestInput = {
	roleId?: string;
	name: string;
	level: RoleLevel;
	menus: RoleMenu[];
};

export type ReviewRoleRequestInput = {
	roleId: string;
	decision: "approve" | "reject";
	reason?: string;
};

export type RoleRequestReviewDiffItem = {
	field: "name" | "level" | "menus" | "deletedAt";
	label: string;
	previousValue: string;
	requestedValue: string;
	changed: boolean;
};

export type RoleRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	items: RoleRequestReviewDiffItem[];
	changedCount: number;
};

type SortFieldKey = RoleManagementSortToken extends `${"+" | "-"}${infer T}` ? T : never;

function normalizeSortTokens(sort: string[]): RoleManagementSortToken[] {
	const prefixed = sort
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1) as RoleManagementSortField)) as RoleManagementSortToken[];
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

function normalizeRoleLevelValue(value: unknown): RoleLevel | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase() as RoleLevel;
	return roleLevelSet.has(normalized) ? normalized : null;
}

function normalizeRoleMenuValue(value: unknown): RoleMenu | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase() as RoleMenu;
	return roleMenuSet.has(normalized) ? normalized : null;
}

function normalizeRoleMenuValues(value: unknown): RoleMenu[] {
	if(!Array.isArray(value))
		return [];
	const normalized = value
		.map(normalizeRoleMenuValue)
		.filter((menu): menu is RoleMenu => menu != null);
	return normalized.filter((menu, index) => normalized.indexOf(menu) == index);
}

function normalizeScalarFilterValue(column: RoleManagementFilterColumn, rawValue: unknown): string | boolean | null {
	if(rawValue == null)
		return null;

	if(booleanFilterColumns.has(column))
		return parseBooleanValue(rawValue);

	if(column == "level")
		return normalizeRoleLevelValue(rawValue);

	if(column == "menus")
		return normalizeRoleMenuValue(rawValue);

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

function normalizeFilters(filters: RoleManagementFilterInput[] | undefined, fallbackCombinator: RoleManagementFilterCombinator): RoleManagementFilterInput[] {
	if(filters == null)
		return [];

	const normalized: RoleManagementFilterInput[] = [];
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

function normalizeFilterCombinator(filterCombinator: RoleManagementFilterCombinator | undefined): RoleManagementFilterCombinator {
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

function formatReviewRoleLevelValue(value: unknown): string {
	const level = normalizeRoleLevelValue(value);
	if(level == null)
		return "-";
	return roleLevelLabelMap[level];
}

function formatReviewRoleMenusValue(value: unknown): string {
	const menus = normalizeRoleMenuValues(value);
	if(menus.length == 0)
		return "-";
	return menus.map(menu => roleMenuLabelMap[menu]).join(", ");
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

export async function listRoleFilterUsersAction(): Promise<RoleFilterUserOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: 500,
		sort: "name",
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

function toPayloadSort(sort: RoleManagementSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		let path: string;
		if(field == "reviewedByName")
			path = "reviewedBy.name";
		else if(field == "requestType")
			path = "deletedAt";
		else if(field == "status" || field == "reviewCommentText")
			path = "reviewedAt";
		else
			path = field;
		return `${direction}${path}`;
	}).join(",");
}

function toPayloadFilterWhere(filters: RoleManagementFilterInput[]): Where | null {
	if(filters.length == 0)
		return null;

	const operatorMap: Record<RoleManagementFilterOperator, string> = {
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

export async function queryRolesAction({ keyword, sort, filters, filterCombinator, page, limit, mode, includeSoftDeleted = false }: QueryRolesInput): Promise<QueryRolesOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const pageSize = Number.isFinite(limit) ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(limit))) : MAX_PAGE_SIZE;
	const pageNumber = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
	const normalizedKeyword = keyword.trim();
	const normalizedKeywordLower = normalizedKeyword.toLowerCase();
	const sortTokens = normalizeSortTokens(sort);
	const normalizedFilterCombinator = normalizeFilterCombinator(filterCombinator);
	const normalizedFilters = normalizeFilters(filters, normalizedFilterCombinator);
	const payloadFilterWhere = toPayloadFilterWhere(normalizedFilters);
	const payloadSort = toPayloadSort(sortTokens);

	const roleFindResult = await payload.find({
		collection: "roles",
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
				{ level: { equals: normalizedKeywordLower } },
				{ menus: { in: [normalizedKeywordLower] } }
			] }] : []),
			...(payloadFilterWhere != null ? [payloadFilterWhere] : [])
		] },
		select: {
			name: true,
			level: true,
			menus: true,
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

	const mappedRows: RoleTableRow[] = roleFindResult.docs.map(doc => {
		const createdById = getRelationshipId(doc.createdBy);
		const updatedById = getRelationshipId(doc.updatedBy);
		const deletedById = getRelationshipId(doc.deletedBy);
		const reviewedById = getRelationshipId(doc.reviewedBy);
		const reviewCommentText = richTextToPlainText(doc.reviewComment);
		const requestType = doc.deletedAt != null ? "Delete" : doc.createdAt == doc.updatedAt ? "Create" : "Update";
		const level = normalizeRoleLevelValue(doc.level) ?? "officer";
		const menus = normalizeRoleMenuValues(doc.menus);

		return {
			id: String(doc.id),
			name: doc.name,
			level,
			menus,
			isSoftDeleted: doc.deletedAt != null && doc._status == "published",
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
		totalDocs: roleFindResult.totalDocs,
		page: roleFindResult.page ?? pageNumber,
		hasNextPage: roleFindResult.hasNextPage,
		hasPreviousPage: roleFindResult.hasPrevPage
	};
}

export async function resolveRoleRelationColumnsAction({ rows, columns }: ResolveRoleRelationColumnsInput): Promise<ResolveRoleRelationColumnsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	if(rows.length == 0 || columns.length == 0)
		return [];

	const requestedColumns = [...new Set(columns)];

	const userIds = new Set<string>();
	for(const row of rows) {
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
		const values: Partial<Record<RoleRelationColumn, string>> = {};

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

export async function upsertRoleRequestAction(input: UpsertRoleRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const name = input.name.trim();
	const level = normalizeRoleLevelValue(input.level);
	const menus = normalizeRoleMenuValues(input.menus);

	if(name.length == 0)
		throw new Error("Role name is required.");
	if(level == null)
		throw new Error("Role level is invalid.");
	if(menus.length == 0)
		throw new Error("At least one menu is required.");

	if(input.roleId == null) {
		const created = await payload.create({
			user,
			collection: "roles",
			overrideAccess: true,
			data: {
				_status: "draft",
				name,
				level,
				menus,
				deletedAt: null,
				deletedBy: null,
				reviewedAt: null,
				reviewedBy: null,
				reviewApproved: null,
				reviewComment: null
			}
		});
		return { roleId: created.id };
	}

	await payload.findByID({
		user,
		collection: "roles",
		id: input.roleId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "roles",
		id: input.roleId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "draft",
			name,
			level,
			menus,
			deletedAt: null,
			deletedBy: null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});

	return { roleId: input.roleId };
}

export async function requestDeleteRoleAction(roleId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.findByID({
		user,
		collection: "roles",
		id: roleId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "roles",
		id: roleId,
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

	return { roleId };
}

export async function cancelRoleRequestAction(roleId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const role = await payload.findByID({
		user,
		collection: "roles",
		id: roleId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(role.reviewedAt != null && role.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");

	const approvedVersions = await payload.findVersions({
		user,
		collection: "roles",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: roleId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {
			version: {
				name: true,
				level: true,
				menus: true,
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
			collection: "roles",
			id: roleId,
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

		return { roleId, softDeleted: true };
	}

	const approvedDeletedBy = getRelationshipId(approvedVersion.deletedBy);
	const approvedReviewedBy = getRelationshipId(approvedVersion.reviewedBy);
	const approvedLevel = normalizeRoleLevelValue(approvedVersion.level) ?? "officer";
	const approvedMenus = normalizeRoleMenuValues(approvedVersion.menus);

	await payload.update({
		user,
		collection: "roles",
		id: roleId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			name: approvedVersion.name,
			level: approvedLevel,
			menus: approvedMenus,
			deletedAt: approvedVersion.deletedAt ?? null,
			deletedBy: approvedDeletedBy,
			reviewedAt: approvedVersion.reviewedAt ?? null,
			reviewedBy: approvedReviewedBy,
			reviewApproved: approvedVersion.reviewApproved ?? null,
			reviewComment: approvedVersion.reviewComment ?? defaultReviewComment
		}
	});

	return { roleId, softDeleted: false };
}

export async function requestRestoreRoleAction(roleId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const role = await payload.findByID({
		user,
		collection: "roles",
		id: roleId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	if(role.deletedAt == null)
		throw new Error("Role is not deleted.");

	await payload.update({
		user,
		collection: "roles",
		id: roleId,
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

	return { roleId };
}

export async function reviewRoleRequestAction({ roleId, decision, reason }: ReviewRoleRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const role = await payload.findByID({
		user,
		collection: "roles",
		id: roleId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(role.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	const reviewComment = plainTextToReviewComment(reason);

	if(decision == "reject") {
		await payload.update({
			user,
			collection: "roles",
			id: roleId,
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
		return { roleId, decision };
	}

	await payload.update({
		user,
		collection: "roles",
		id: roleId,
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

	return { roleId, decision };
}

export async function getRoleRequestReviewDiffAction(roleId: string): Promise<RoleRequestReviewDiffOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const role = await payload.findByID({
		user,
		collection: "roles",
		id: roleId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	const approvedVersions = await payload.findVersions({
		user,
		collection: "roles",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: roleId } },
				{ "version._status": { equals: "published" } }
			]
		},
		select: {
			version: {
				name: true,
				level: true,
				menus: true,
				deletedAt: true
			}
		}
	});

	const approvedVersion = approvedVersions.docs[0]?.version;

	const requestType: RoleRequestReviewDiffOutput["requestType"] =
		role.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";

	const comparisonItems = [
		{
			field: "name",
			label: "Role Name",
			previousValue: approvedVersion?.name ?? "-",
			requestedValue: role.name
		},
		{
			field: "level",
			label: "Level",
			previousValue: formatReviewRoleLevelValue(approvedVersion?.level),
			requestedValue: formatReviewRoleLevelValue(role.level)
		},
		{
			field: "menus",
			label: "Menus",
			previousValue: formatReviewRoleMenusValue(approvedVersion?.menus),
			requestedValue: formatReviewRoleMenusValue(role.menus)
		},
		{
			field: "deletedAt",
			label: "Deleted At",
			previousValue: formatReviewDateValue(approvedVersion?.deletedAt ?? null),
			requestedValue: formatReviewDateValue(role.deletedAt)
		}
	] satisfies Array<Omit<RoleRequestReviewDiffItem, "changed">>;

	const items: RoleRequestReviewDiffItem[] = comparisonItems.map(item => ({
		...item,
		changed: item.previousValue != item.requestedValue
	}));

	return {
		requestId: roleId,
		requestType,
		items,
		changedCount: items.filter(item => item.changed).length
	};
}
