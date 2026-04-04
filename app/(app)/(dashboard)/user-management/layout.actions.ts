"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";

import payloadConfig from "@payload-config";
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
	"reviewApproved",
	"requestType",
	"status",
	"reviewCommentText"
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
	"reviewApproved" |
	"requestType" |
	"status" |
	"reviewCommentText";
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
	roleId: string | null;
	roleName: string;
	supervisorId: string | null;
	isSoftDeleted: boolean;
	initialPassword: string;
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
};

export type UserRelationColumn = "supervisor" |
	"reviewedBy" |
	"createdBy" |
	"updatedBy" |
	"deletedBy";

export type ResolveStagedUserRelationColumnsInput = {
	rows: Array<Pick<StagedUserTableRow, "id" | "supervisorId" | "reviewedById" | "createdById" | "updatedById" | "deletedById">>;
	columns: UserRelationColumn[];
};

export type StagedUserRelationValues = Partial<Record<UserRelationColumn, string>> & {
	stagedUserIdByUserId?: Record<string, string>;
};

export type ResolveStagedUserRelationColumnsOutput = Array<{
	id: string;
	values: StagedUserRelationValues;
}>;

export type QueryStagedUsersOutput = {
	docs: StagedUserTableRow[];
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
	roleId: string;
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
	previousReferences?: Array<{ type: "user" | "role", id: string, label: string }>;
	requestedReferences?: Array<{ type: "user" | "role", id: string, label: string }>;
};

export type UserRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	items: UserRequestReviewDiffItem[];
	changedCount: number;
};

export type UserRequestDetailsOutput = {
	row: StagedUserTableRow;
	relationValues: StagedUserRelationValues;
	relationReferences: Partial<Record<"role" | UserRelationColumn, Array<{ type: "user" | "role", id: string, label: string }>>>;
};

export type UserRequestHistoryColumn = "id" |
	"name" |
	"email" |
	"employeeId" |
	"role" |
	"supervisor" |
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

export type UserRequestHistoryChangeItem = {
	column: UserRequestHistoryColumn;
	label: string;
	previousValue: string;
	nextValue: string;
	changed: boolean;
};

export type UserRequestHistoryEntry = {
	versionId: string;
	changedAt: string | null;
	changes: UserRequestHistoryChangeItem[];
	changedCount: number;
};

export type UserRequestHistoryOutput = {
	requestId: string;
	entries: UserRequestHistoryEntry[];
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

const userRequestHistoryColumns = [
	"id",
	"name",
	"email",
	"employeeId",
	"role",
	"supervisor",
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
] as const satisfies UserRequestHistoryColumn[];

const userRequestHistoryColumnLabelMap: Record<UserRequestHistoryColumn, string> = {
	id: "ID",
	name: "Name",
	email: "Email",
	employeeId: "Employee ID",
	role: "Role",
	supervisor: "Supervisor",
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

async function findUsersByIds(payload: Payload, user: User, ids: string[]): Promise<Map<string, { name: string, email: string, stagedUserId: string | null }>> {
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

async function findRolesByIds(payload: Payload, user: User, ids: string[]): Promise<Map<string, string>> {
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

	const map = new Map<string, string>();
	for(const doc of rolesResult.docs)
		map.set(String(doc.id), doc.name);

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
			case "requestType":
				return `${direction}deletedAt`;
			case "status":
				return `${direction}reviewedAt`;
			case "reviewCommentText":
				return `${direction}reviewedAt`;
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

	const supervisorRoleIds = await findActiveSupervisorRoleIds(payload, user);
	if(supervisorRoleIds.length == 0)
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
				{ role: { in: supervisorRoleIds } },
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
	const roleNamesById = await findRolesByIds(payload, user, roleIds);

	const mappedRows: StagedUserTableRow[] = stagedFindResult.docs.map(doc => {
		const roleId = getRelationshipId(doc.role);
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
			roleId,
			roleName: roleId != null ? (roleNamesById.get(roleId) ?? roleId) : "-",
			supervisorId,
			isSoftDeleted: doc.deletedAt != null && doc._status == "published",
			initialPassword: doc.initialPassword ?? "",
			createdById,
			updatedById,
			deletedById,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			deletedAt: doc.deletedAt ?? null,
			reviewedAt: doc.reviewedAt ?? null,
			reviewedById,
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
		if(requestedColumns.includes("supervisor") && row.supervisorId != null)
			userIds.add(row.supervisorId);
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
		const values: StagedUserRelationValues = {};

		if(requestedColumns.includes("supervisor"))
			values.supervisor = row.supervisorId != null ? (usersById.get(row.supervisorId)?.name ?? "-") : "-";
		if(requestedColumns.includes("reviewedBy"))
			values.reviewedBy = row.reviewedById != null ? (usersById.get(row.reviewedById)?.name ?? "-") : "-";
		if(requestedColumns.includes("createdBy"))
			values.createdBy = row.createdById != null ? (usersById.get(row.createdById)?.name ?? "-") : "-";
		if(requestedColumns.includes("updatedBy"))
			values.updatedBy = row.updatedById != null ? (usersById.get(row.updatedById)?.name ?? "-") : "-";
		if(requestedColumns.includes("deletedBy"))
			values.deletedBy = row.deletedById != null ? (usersById.get(row.deletedById)?.name ?? "-") : "-";

		const relationUserIds = new Set<string>();
		if(row.supervisorId != null)
			relationUserIds.add(row.supervisorId);
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
	const roleId = getRelationshipId(stagedUser.role);
	const roleNamesById = await findRolesByIds(payload, user, roleId != null ? [roleId] : []);

	const supervisorId = getRelationshipId(stagedUser.supervisor);
	const reviewedById = getRelationshipId(stagedUser.reviewedBy);
	const createdById = getRelationshipId(stagedUser.createdBy);
	const updatedById = getRelationshipId(stagedUser.updatedBy);
	const deletedById = getRelationshipId(stagedUser.deletedBy);
	const reviewCommentText = richTextToPlainText(stagedUser.reviewComment);

	const row: StagedUserTableRow = {
		id: String(stagedUser.id),
		linkedUserId: linkedUserIdByStagedId.get(String(stagedUser.id)) ?? null,
		email: stagedUser.email,
		name: stagedUser.name,
		employeeId: stagedUser.employeeId,
		roleId,
		roleName: roleId != null ? (roleNamesById.get(roleId) ?? roleId) : "-",
		supervisorId,
		isSoftDeleted: stagedUser.deletedAt != null && stagedUser._status == "published",
		initialPassword: stagedUser.initialPassword ?? "",
		createdById,
		updatedById,
		deletedById,
		createdAt: stagedUser.createdAt,
		updatedAt: stagedUser.updatedAt,
		deletedAt: stagedUser.deletedAt ?? null,
		reviewedAt: stagedUser.reviewedAt ?? null,
		reviewedById,
		reviewApproved: stagedUser.reviewApproved ?? null,
		reviewCommentText
	};

	const relationUserIds = new Set<string>();
	if(row.supervisorId != null)
		relationUserIds.add(row.supervisorId);
	if(row.reviewedById != null)
		relationUserIds.add(row.reviewedById);
	if(row.createdById != null)
		relationUserIds.add(row.createdById);
	if(row.updatedById != null)
		relationUserIds.add(row.updatedById);
	if(row.deletedById != null)
		relationUserIds.add(row.deletedById);

	const usersById = await findUsersByIds(payload, user, [...relationUserIds]);

	const relationValues: StagedUserRelationValues = {
		supervisor: row.supervisorId != null ? (usersById.get(row.supervisorId)?.name ?? "-") : "-",
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

	const relationReferences: UserRequestDetailsOutput["relationReferences"] = {
		role: row.roleId != null ? [{ type: "role", id: row.roleId, label: roleNamesById.get(row.roleId) ?? "Role" }] : [],
		supervisor: row.supervisorId != null ? [{ type: "user", id: row.supervisorId, label: usersById.get(row.supervisorId)?.name ?? "User" }] : [],
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
			reviewComment?: unknown;
		};
	};

	const historyDocs = versionsResult.docs as StagedUserVersionSnapshotDoc[];

	const relationUserIds = new Set<string>();
	const roleIds = new Set<string>();
	for(const historyDoc of historyDocs) {
		const version = historyDoc.version;
		if(version == null)
			continue;

		const roleId = getRelationshipId(version.role);
		const supervisorId = getRelationshipId(version.supervisor);
		const createdById = getRelationshipId(version.createdBy);
		const updatedById = getRelationshipId(version.updatedBy);
		const deletedById = getRelationshipId(version.deletedBy);
		const reviewedById = getRelationshipId(version.reviewedBy);

		if(roleId != null)
			roleIds.add(roleId);
		if(supervisorId != null)
			relationUserIds.add(supervisorId);
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
	const roleNamesById = await findRolesByIds(payload, user, [...roleIds]);

	type UserHistorySnapshot = {
		versionId: string;
		changedAt: string | null;
		values: Record<UserRequestHistoryColumn, string>;
	};

	const snapshotsMaybe = historyDocs
		.map<UserHistorySnapshot | null>(historyDoc => {
			const version = historyDoc.version;
			if(version == null)
				return null;

			const roleId = getRelationshipId(version.role);
			const supervisorId = getRelationshipId(version.supervisor);
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
				versionId: String(version.id ?? historyDoc.id ?? stagedUserId),
				changedAt: historyDoc.updatedAt ?? updatedAt,
				values: {
					id: String(version.id ?? stagedUserId),
					name: (version.name ?? "-").trim().length > 0 ? version.name ?? "-" : "-",
					email: (version.email ?? "-").trim().length > 0 ? version.email ?? "-" : "-",
					employeeId: (version.employeeId ?? "-").trim().length > 0 ? version.employeeId ?? "-" : "-",
					role: roleId != null ? (roleNamesById.get(roleId) ?? roleId) : "-",
					supervisor: supervisorId != null ? (usersById.get(supervisorId)?.name ?? "-") : "-",
					createdBy: createdById != null ? (usersById.get(createdById)?.name ?? "-") : "-",
					updatedBy: updatedById != null ? (usersById.get(updatedById)?.name ?? "-") : "-",
					deletedBy: deletedById != null ? (usersById.get(deletedById)?.name ?? "-") : "-",
					createdAt: formatReviewDateValue(createdAt),
					updatedAt: formatReviewDateValue(updatedAt),
					deletedAt: formatReviewDateValue(deletedAt),
					requestType: getUserRequestType(deletedAt, createdAt, updatedAt),
					status: getUserHistoryStatusLabel(reviewedAt, version.reviewApproved ?? null),
					reviewedAt: formatReviewDateValue(reviewedAt),
					reviewedBy: reviewedById != null ? (usersById.get(reviewedById)?.name ?? "-") : "-",
					reviewApproved: version.reviewApproved == null ? "-" : version.reviewApproved ? "True" : "False",
					reviewCommentText: reviewCommentText.length > 0 ? reviewCommentText : "-"
				} as Record<UserRequestHistoryColumn, string>
			};
		});

	const snapshots = snapshotsMaybe.filter(snapshot => snapshot != null) as UserHistorySnapshot[];

	const entries: UserRequestHistoryEntry[] = snapshots.map((snapshot, snapshotIndex) => {
		const previousSnapshot = snapshots[snapshotIndex + 1] ?? null;

		const changes: UserRequestHistoryChangeItem[] = userRequestHistoryColumns.map(column => {
			const previousValue = previousSnapshot?.values[column] ?? "-";
			const nextValue = snapshot.values[column];
			return {
				column,
				label: userRequestHistoryColumnLabelMap[column],
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
		requestId: stagedUserId,
		entries
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
	const roleId = input.roleId.trim();
	const supervisorId = (input.supervisorId ?? "").trim();
	const initialPassword = input.initialPassword.trim();

	if(email.length == 0)
		throw new Error("Email is required.");
	if(name.length == 0)
		throw new Error("Name is required.");
	if(employeeId.length == 0)
		throw new Error("Employee ID is required.");
	if(roleId.length == 0)
		throw new Error("Role is required.");
	if(initialPassword.length > 0 && initialPassword.length < 8)
		throw new Error("Initial password must be at least 8 characters.");

	await payload.findByID({
		collection: "roles",
		user,
		overrideAccess: false,
		id: roleId,
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
				role: roleId,
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
			role: roleId,
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
		const roleId = getRelationshipId(stagedUser.role);
		if(roleId == null)
			throw new Error("Cannot approve request without a valid role.");

		const supervisorId = getRelationshipId(stagedUser.supervisor);
		const upsertData = {
			email: stagedUser.email,
			name: stagedUser.name,
			employeeId: stagedUser.employeeId,
			role: roleId,
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
	const approvedRoleId = approvedVersion != null ? getRelationshipId(approvedVersion.role) : null;
	const requestedRoleId = getRelationshipId(stagedUser.role);

	const userIds = [approvedSupervisorId, requestedSupervisorId].filter((value): value is string => value != null);
	const usersById = await findUsersByIds(payload, user, [...new Set(userIds)]);
	const roleIds = [approvedRoleId, requestedRoleId].filter((value): value is string => value != null);
	const roleNamesById = await findRolesByIds(payload, user, [...new Set(roleIds)]);

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
			previousValue: formatReviewRoleValue(approvedRoleId != null ? (roleNamesById.get(approvedRoleId) ?? approvedRoleId) : null),
			requestedValue: formatReviewRoleValue(requestedRoleId != null ? (roleNamesById.get(requestedRoleId) ?? requestedRoleId) : null),
			previousReferences: approvedRoleId != null ? [{ type: "role", id: approvedRoleId, label: roleNamesById.get(approvedRoleId) ?? "Role" }] : [],
			requestedReferences: requestedRoleId != null ? [{ type: "role", id: requestedRoleId, label: roleNamesById.get(requestedRoleId) ?? "Role" }] : []
		},
		{
			field: "supervisor",
			label: "Supervisor",
			previousValue: approvedSupervisorId != null ? (usersById.get(approvedSupervisorId)?.name ?? "-") : "-",
			requestedValue: requestedSupervisorId != null ? (usersById.get(requestedSupervisorId)?.name ?? "-") : "-",
			previousReferences: approvedSupervisorId != null ? [{ type: "user", id: approvedSupervisorId, label: usersById.get(approvedSupervisorId)?.name ?? "User" }] : [],
			requestedReferences: requestedSupervisorId != null ? [{ type: "user", id: requestedSupervisorId, label: usersById.get(requestedSupervisorId)?.name ?? "User" }] : []
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
