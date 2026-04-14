"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import type { Role } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const RELATION_SEARCH_LIMIT = 20;
const roleLevelValues = ["admin", "manager", "supervisor", "officer"] as const;
const roleMenuValues = [
	"user-management-viewer",
	"user-management-auditor",
	"user-management-editor",
	"user-management-approver",
	"role-management-viewer",
	"role-management-auditor",
	"role-management-editor",
	"role-management-approver",
	"team-management-viewer",
	"team-management-auditor",
	"team-management-editor",
	"team-management-approver",
	"credit-application-management-viewer",
	"credit-application-management-auditor",
	"credit-application-management-editor",
	"credit-application-management-approver",
	"credit-application-assignment-viewer",
	"credit-application-assignment-auditor",
	"credit-application-assignment-editor",
	"credit-application-assignment-approver"
] as const;
const roleStatusValues = ["pending", "approved", "rejected"] as const;
const roleLevelLabelMap: Record<RoleLevel, string> = {
	admin: "Admin",
	manager: "Manager",
	supervisor: "Supervisor",
	officer: "Officer"
};
const roleMenuLabelMap: Record<RoleMenu, string> = {
	"user-management-viewer": "User Management - Viewer",
	"user-management-auditor": "User Management - Auditor",
	"user-management-editor": "User Management - Editor",
	"user-management-approver": "User Management - Approver",
	"role-management-viewer": "Role Management - Viewer",
	"role-management-auditor": "Role Management - Auditor",
	"role-management-editor": "Role Management - Editor",
	"role-management-approver": "Role Management - Approver",
	"team-management-viewer": "Team Management - Viewer",
	"team-management-auditor": "Team Management - Auditor",
	"team-management-editor": "Team Management - Editor",
	"team-management-approver": "Team Management - Approver",
	"credit-application-management-viewer": "Credit Application Management - Viewer",
	"credit-application-management-auditor": "Credit Application Management - Auditor",
	"credit-application-management-editor": "Credit Application Management - Editor",
	"credit-application-management-approver": "Credit Application Management - Approver",
	"credit-application-assignment-viewer": "Credit Application Assignment - Viewer",
	"credit-application-assignment-auditor": "Credit Application Assignment - Auditor",
	"credit-application-assignment-editor": "Credit Application Assignment - Editor",
	"credit-application-assignment-approver": "Credit Application Assignment - Approver"
};
const roleHistoryRequiredMenu: RoleMenu = "role-management-auditor";

export type RoleLevel = Role["level"];
export type RoleMenu = Role["menus"][number];
export type RoleManagementStatus = typeof roleStatusValues[number];

const roleLevelSet = new Set<RoleLevel>(roleLevelValues);
const roleMenuSet = new Set<RoleMenu>(roleMenuValues);
const roleStatusSet = new Set<RoleManagementStatus>(roleStatusValues);

const sortableFields = new Set<RoleManagementSortField>([
	"id",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"name",
	"level",
	"menus",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved",
	"requestType",
	"status",
	"reviewCommentText"
]);
const filterableColumns = new Set<RoleManagementFilterColumn>([
	"id",
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
	"status",
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
const statusFilterOperators = new Set<RoleManagementFilterOperator>([
	"equals",
	"not_equals",
	"in",
	"not_in",
	"exists"
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
	"id" |
	"updatedAt" |
	"deletedAt" |
	"name" |
	"level" |
	"menus" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved" |
	"requestType" |
	"status" |
	"reviewCommentText";
export type RoleManagementSortToken = `${"+" | "-"}${RoleManagementSortField}`;
export type RoleManagementFilterColumn = "name" |
	"id" |
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
	"status" |
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

export type RoleRelationColumn = "reviewedBy" |
	"createdBy" |
	"updatedBy" |
	"deletedBy";

export type ResolveRoleRelationColumnsInput = {
	rows: Array<Pick<RoleTableRow, "id" | "reviewedById" | "createdById" | "updatedById" | "deletedById">>;
	columns: RoleRelationColumn[];
};

export type RoleRelationValues = Partial<Record<RoleRelationColumn, string>> & {
	stagedUserIdByUserId?: Record<string, string>;
};

export type ResolveRoleRelationColumnsOutput = Array<{
	id: string;
	values: RoleRelationValues;
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

export type RoleFilterIdOption = {
	id: string;
	name: string;
	level: RoleLevel;
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

export type RoleRequestDetailsOutput = {
	row: RoleTableRow;
	relationValues: RoleRelationValues;
	relationReferences: Partial<Record<RoleRelationColumn, Array<{ type: "user", id: string, label: string }>>>;
};

export type RoleRequestHistoryColumn = "id" |
	"name" |
	"level" |
	"menus" |
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

export type RoleRequestHistoryChangeItem = {
	column: RoleRequestHistoryColumn;
	label: string;
	previousValue: string;
	nextValue: string;
	changed: boolean;
};

export type RoleRequestHistoryEntry = {
	versionId: string;
	changedAt: string | null;
	changes: RoleRequestHistoryChangeItem[];
	changedCount: number;
};

export type RoleRequestHistoryOutput = {
	requestId: string;
	entries: RoleRequestHistoryEntry[];
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

function normalizeRoleStatusValue(value: unknown): RoleManagementStatus | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase() as RoleManagementStatus;
	return roleStatusSet.has(normalized) ? normalized : null;
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

	if(column == "status")
		return normalizeRoleStatusValue(rawValue);

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

async function resolveUserRoleMenus(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>): Promise<RoleMenu[]> {
	const rawRole = user.role;
	if(rawRole != null && typeof rawRole == "object" && "menus" in rawRole)
		return normalizeRoleMenuValues(rawRole.menus);

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

	return normalizeRoleMenuValues(role.menus);
}

async function hasRoleRequestHistoryAccess(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>): Promise<boolean> {
	const roleMenus = await resolveUserRoleMenus(payload, user);
	return roleMenus.includes(roleHistoryRequiredMenu);
}

const roleRequestHistoryColumns = [
	"id",
	"name",
	"level",
	"menus",
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
] as const satisfies RoleRequestHistoryColumn[];

const roleRequestHistoryColumnLabelMap: Record<RoleRequestHistoryColumn, string> = {
	id: "ID",
	name: "Name",
	level: "Level",
	menus: "Menus",
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

function getRoleRequestType(deletedAt: string | null | undefined, createdAt: string | null | undefined, updatedAt: string | null | undefined): "Create" | "Update" | "Delete" {
	if(deletedAt != null)
		return "Delete";
	if(createdAt == null || updatedAt == null)
		return "Update";
	return createdAt == updatedAt ? "Create" : "Update";
}

function getRoleHistoryStatusLabel(reviewedAt: string | null | undefined, reviewApproved: boolean | null | undefined): string {
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

export async function searchRoleAuditUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<RoleFilterUserOption[]> {
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

export async function searchRoleOptionsAction(keyword: string, selectedIds: string[] = []): Promise<RoleFilterIdOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedKeywordLower = normalizedKeyword.toLowerCase();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ id: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ level: { equals: normalizedKeywordLower } }
	];
	const whereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? null : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await payload.find({
		collection: "roles",
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
			level: true
		},
		...(where != null ? { where } : {})
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: doc.name,
		level: normalizeRoleLevelValue(doc.level) ?? "officer"
	}));
}

function toPayloadSort(sort: RoleManagementSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		let path: string;
		if(field == "reviewedBy")
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
	const impossibleWhere: Where = {
		and: [
			{ reviewedAt: { exists: true } },
			{ reviewedAt: { exists: false } }
		]
	};

	const getStatusWhere = (status: RoleManagementStatus): Where => {
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

	const buildStatusFilterWhere = (filter: RoleManagementFilterInput): Where | null => {
		if(filter.operator == "exists")
			return filter.value == true ? null : impossibleWhere;

		const rawStatuses = Array.isArray(filter.value) ? filter.value : [filter.value];
		const statuses = rawStatuses
			.map(normalizeRoleStatusValue)
			.filter((status): status is RoleManagementStatus => status != null)
			.filter((status, index, source) => source.indexOf(status) == index);
		if(statuses.length == 0)
			return null;

		if(filter.operator == "equals" || filter.operator == "in")
			return statuses.length == 1 ? getStatusWhere(statuses[0]) : { or: statuses.map(getStatusWhere) };

		if(filter.operator == "not_equals" || filter.operator == "not_in") {
			const excluded = new Set(statuses);
			const remaining = roleStatusValues.filter(status => !excluded.has(status));
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
		totalDocs: roleFindResult.totalDocs,
		page: roleFindResult.page ?? pageNumber,
		hasNextPage: roleFindResult.hasNextPage,
		hasPreviousPage: roleFindResult.hasPrevPage
	};
}

type QueryRolesSharedInput = Omit<QueryRolesInput, "mode">;

export async function queryRolesViewerAction(input: QueryRolesSharedInput): Promise<QueryRolesOutput> {
	return queryRolesAction({
		...input,
		mode: "editor",
		includeSoftDeleted: false
	});
}

export async function queryRolesEditorAction(input: QueryRolesSharedInput): Promise<QueryRolesOutput> {
	return queryRolesAction({
		...input,
		mode: "editor"
	});
}

export async function queryRolesApproverAction(input: QueryRolesSharedInput): Promise<QueryRolesOutput> {
	return queryRolesAction({
		...input,
		mode: "approver",
		includeSoftDeleted: false
	});
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
		const values: RoleRelationValues = {};

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

export async function getRoleRequestDetailsAction(roleId: string): Promise<RoleRequestDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const role = await payload.findByID({
		collection: "roles",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		id: roleId,
		depth: 0,
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

	const createdById = getRelationshipId(role.createdBy);
	const updatedById = getRelationshipId(role.updatedBy);
	const deletedById = getRelationshipId(role.deletedBy);
	const reviewedById = getRelationshipId(role.reviewedBy);
	const reviewCommentText = richTextToPlainText(role.reviewComment);
	const requestType = role.deletedAt != null ? "Delete" : role.createdAt == role.updatedAt ? "Create" : "Update";
	const level = normalizeRoleLevelValue(role.level) ?? "officer";
	const menus = normalizeRoleMenuValues(role.menus);

	const row: RoleTableRow = {
		id: String(role.id),
		name: role.name,
		level,
		menus,
		isSoftDeleted: role.deletedAt != null && role._status == "published",
		createdById,
		updatedById,
		deletedById,
		createdAt: role.createdAt,
		updatedAt: role.updatedAt,
		deletedAt: role.deletedAt ?? null,
		reviewedAt: role.reviewedAt ?? null,
		reviewedById,
		reviewApproved: role.reviewApproved ?? null,
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

	const relationValues: RoleRelationValues = {
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

	const relationReferences: RoleRequestDetailsOutput["relationReferences"] = {
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

export async function canAccessRoleRequestHistoryAction(): Promise<boolean> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return false;

	return hasRoleRequestHistoryAccess(payload, user);
}

export async function getRoleRequestHistoryAction(roleId: string): Promise<RoleRequestHistoryOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!await hasRoleRequestHistoryAccess(payload, user)) return unauthorized();

	const versionsResult = await payload.findVersions({
		collection: "roles",
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 100,
		sort: "-updatedAt",
		where: {
			parent: {
				equals: roleId
			}
		},
		select: {
			updatedAt: true,
			version: {
				id: true,
				name: true,
				level: true,
				menus: true,
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

	type RoleVersionSnapshotDoc = {
		id?: string | number;
		updatedAt?: string | null;
		version?: {
			id?: string | number;
			name?: string;
			level?: unknown;
			menus?: unknown;
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

	const historyDocs = versionsResult.docs as RoleVersionSnapshotDoc[];

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

	type RoleHistorySnapshot = {
		versionId: string;
		changedAt: string | null;
		values: Record<RoleRequestHistoryColumn, string>;
	};

	const snapshotsMaybe = historyDocs
		.map<RoleHistorySnapshot | null>(historyDoc => {
			const version = historyDoc.version;
			if(version == null)
				return null;

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
				versionId: String(version.id ?? historyDoc.id ?? roleId),
				changedAt: historyDoc.updatedAt ?? updatedAt,
				values: {
					id: String(version.id ?? roleId),
					name: (version.name ?? "-").trim().length > 0 ? version.name ?? "-" : "-",
					level: formatReviewRoleLevelValue(version.level),
					menus: formatReviewRoleMenusValue(version.menus),
					createdBy: createdById != null ? (usersById.get(createdById)?.name ?? "-") : "-",
					updatedBy: updatedById != null ? (usersById.get(updatedById)?.name ?? "-") : "-",
					deletedBy: deletedById != null ? (usersById.get(deletedById)?.name ?? "-") : "-",
					createdAt: formatReviewDateValue(createdAt),
					updatedAt: formatReviewDateValue(updatedAt),
					deletedAt: formatReviewDateValue(deletedAt),
					requestType: getRoleRequestType(deletedAt, createdAt, updatedAt),
					status: getRoleHistoryStatusLabel(reviewedAt, version.reviewApproved ?? null),
					reviewedAt: formatReviewDateValue(reviewedAt),
					reviewedBy: reviewedById != null ? (usersById.get(reviewedById)?.name ?? "-") : "-",
					reviewApproved: version.reviewApproved == null ? "-" : version.reviewApproved ? "True" : "False",
					reviewCommentText: reviewCommentText.length > 0 ? reviewCommentText : "-"
				}
			};
		});

	const snapshots = snapshotsMaybe.filter((snapshot): snapshot is RoleHistorySnapshot => snapshot != null);

	const entries: RoleRequestHistoryEntry[] = snapshots.map((snapshot, snapshotIndex) => {
		const previousSnapshot = snapshots[snapshotIndex + 1] ?? null;

		const changes: RoleRequestHistoryChangeItem[] = roleRequestHistoryColumns.map(column => {
			const previousValue = previousSnapshot?.values[column] ?? "-";
			const nextValue = snapshot.values[column];
			return {
				column,
				label: roleRequestHistoryColumnLabelMap[column],
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
		requestId: roleId,
		entries
	};
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
