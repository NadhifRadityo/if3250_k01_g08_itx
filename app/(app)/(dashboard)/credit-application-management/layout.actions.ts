"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import { createPlainTextRichText, createEmptyReviewComment } from "@/utils/reviewCommentRichText";
import type { CreditApplication } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const RELATION_SEARCH_LIMIT = 20;
const creditApplicationStatusValues = ["pending", "approved", "rejected"] as const;
const creditApplicationHistoryRequiredMenu = "credit-application-management-auditor";

export type CreditApplicationManagementStatus = typeof creditApplicationStatusValues[number];

const creditApplicationStatusSet = new Set<CreditApplicationManagementStatus>(creditApplicationStatusValues);

const sortableFields = new Set<CreditApplicationManagementSortField>([
	"id",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"name",
	"email",
	"addresses",
	"phoneNumbers",
	"whatsappNumber",
	"smsNumber",
	"collateralRegistryName",
	"collateralName",
	"assetId",
	"assetName",
	"period",
	"installment",
	"downPayment",
	"plafond",
	"vendor",
	"otherText1",
	"otherText2",
	"otherNumber1",
	"otherNumber2",
	"otherDate1",
	"otherDate2",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved",
	"requestType",
	"status",
	"reviewCommentText"
]);
const filterableColumns = new Set<CreditApplicationManagementFilterColumn>([
	"id",
	"name",
	"email",
	"addresses",
	"phoneNumbers",
	"whatsappNumber",
	"smsNumber",
	"collateralRegistryName",
	"collateralName",
	"assetId",
	"assetName",
	"period",
	"installment",
	"downPayment",
	"plafond",
	"vendor",
	"otherText1",
	"otherText2",
	"otherNumber1",
	"otherNumber2",
	"otherDate1",
	"otherDate2",
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
const filterOperators = new Set<CreditApplicationManagementFilterOperator>([
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
const statusFilterOperators = new Set<CreditApplicationManagementFilterOperator>([
	"equals",
	"not_equals",
	"in",
	"not_in",
	"exists"
]);
const dateFilterColumns = new Set<CreditApplicationManagementFilterColumn>([
	"otherDate1",
	"otherDate2",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"reviewedAt"
]);
const numberFilterColumns = new Set<CreditApplicationManagementFilterColumn>([
	"period",
	"installment",
	"downPayment",
	"plafond",
	"otherNumber1",
	"otherNumber2"
]);
const booleanFilterColumns = new Set<CreditApplicationManagementFilterColumn>(["reviewApproved"]);

type ReviewCommentValue = NonNullable<CreditApplication["reviewComment"]>;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const defaultReviewComment: ReviewCommentValue = createEmptyReviewComment();

export type CreditApplicationManagementTabMode = "editor" | "approver";
export type CreditApplicationManagementSortField = "createdAt" |
	"id" |
	"updatedAt" |
	"deletedAt" |
	"name" |
	"email" |
	"addresses" |
	"phoneNumbers" |
	"whatsappNumber" |
	"smsNumber" |
	"collateralRegistryName" |
	"collateralName" |
	"assetId" |
	"assetName" |
	"period" |
	"installment" |
	"downPayment" |
	"plafond" |
	"vendor" |
	"otherText1" |
	"otherText2" |
	"otherNumber1" |
	"otherNumber2" |
	"otherDate1" |
	"otherDate2" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved" |
	"requestType" |
	"status" |
	"reviewCommentText";
export type CreditApplicationManagementSortToken = `${"+" | "-"}${CreditApplicationManagementSortField}`;
export type CreditApplicationManagementFilterColumn = "name" |
	"id" |
	"email" |
	"addresses" |
	"phoneNumbers" |
	"whatsappNumber" |
	"smsNumber" |
	"collateralRegistryName" |
	"collateralName" |
	"assetId" |
	"assetName" |
	"period" |
	"installment" |
	"downPayment" |
	"plafond" |
	"vendor" |
	"otherText1" |
	"otherText2" |
	"otherNumber1" |
	"otherNumber2" |
	"otherDate1" |
	"otherDate2" |
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
export type CreditApplicationManagementFilterOperator = "equals" |
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
export type CreditApplicationManagementFilterCombinator = "and" | "or";
export type CreditApplicationManagementFilterInput = {
	column: CreditApplicationManagementFilterColumn;
	operator: CreditApplicationManagementFilterOperator;
	value?: string | number | Array<string | number | boolean> | boolean | null;
	joinWithPrevious?: CreditApplicationManagementFilterCombinator;
};

export type CreditApplicationTableRow = {
	id: string;
	name: string;
	email: string;
	addresses: string[];
	phoneNumbers: string[];
	whatsappNumber: string;
	smsNumber: string;
	collateralRegistryName: string;
	collateralName: string;
	collateralDescription: string;
	assetId: string;
	assetName: string;
	assetDescription: string;
	period: number | null;
	installment: number | null;
	downPayment: number | null;
	plafond: number | null;
	vendor: string;
	remarks: string;
	otherText1: string;
	otherText2: string;
	otherNumber1: number | null;
	otherNumber2: number | null;
	otherDate1: string | null;
	otherDate2: string | null;
	others: string;
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

export type CreditApplicationRelationColumn = "reviewedBy" |
	"createdBy" |
	"updatedBy" |
	"deletedBy";

export type ResolveCreditApplicationRelationColumnsInput = {
	rows: Array<Pick<CreditApplicationTableRow, "id" | "reviewedById" | "createdById" | "updatedById" | "deletedById">>;
	columns: CreditApplicationRelationColumn[];
};

export type CreditApplicationRelationValues = Partial<Record<CreditApplicationRelationColumn, string>> & {
	stagedUserIdByUserId?: Record<string, string>;
};

export type ResolveCreditApplicationRelationColumnsOutput = Array<{
	id: string;
	values: CreditApplicationRelationValues;
}>;

export type queryCreditApplicationsInput = {
	keyword: string;
	sort: string[];
	filters?: CreditApplicationManagementFilterInput[];
	filterCombinator?: CreditApplicationManagementFilterCombinator;
	page: number;
	limit: number;
	mode: CreditApplicationManagementTabMode;
	includeSoftDeleted?: boolean;
};

export type queryCreditApplicationsOutput = {
	docs: CreditApplicationTableRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type CreditApplicationFilterUserOption = {
	id: string;
	name: string;
	email: string;
};

export type CreditApplicationFilterIdOption = {
	id: string;
	name: string;
	email: string;
};

export type UpsertCreditApplicationRequestInput = {
	creditApplicationId?: string;
	name: string;
	email: string;
	addresses: string[];
	phoneNumbers: string[];
	whatsappNumber: string;
	smsNumber: string;
	collateralRegistryName: string;
	collateralName: string;
	collateralDescription: string;
	assetId: string;
	assetName: string;
	assetDescription: string;
	period: number | null;
	installment: number | null;
	downPayment: number | null;
	plafond: number | null;
	vendor: string;
	remarks: string;
	otherText1: string;
	otherText2: string;
	otherNumber1: number | null;
	otherNumber2: number | null;
	otherDate1: string | null;
	otherDate2: string | null;
	others: string;
};

export type ReviewCreditApplicationRequestInput = {
	creditApplicationId: string;
	decision: "approve" | "reject";
	reviewComment: ReviewCommentValue;
};

export type CreditApplicationRequestReviewDiffItem = {
	field: "name" |
		"email" |
		"addresses" |
		"phoneNumbers" |
		"whatsappNumber" |
		"smsNumber" |
		"collateralRegistryName" |
		"collateralName" |
		"collateralDescription" |
		"assetId" |
		"assetName" |
		"assetDescription" |
		"period" |
		"installment" |
		"downPayment" |
		"plafond" |
		"vendor" |
		"remarks" |
		"otherText1" |
		"otherText2" |
		"otherNumber1" |
		"otherNumber2" |
		"otherDate1" |
		"otherDate2" |
		"others" |
		"deletedAt";
	label: string;
	previousValue: string;
	requestedValue: string;
	changed: boolean;
};

export type CreditApplicationRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	items: CreditApplicationRequestReviewDiffItem[];
	changedCount: number;
};

export type CreditApplicationRequestDetailsOutput = {
	row: CreditApplicationTableRow;
	relationValues: CreditApplicationRelationValues;
	relationReferences: Partial<Record<CreditApplicationRelationColumn, Array<{ type: "user", id: string, label: string }>>>;
};

export type CreditApplicationRequestHistoryColumn = "id" |
	"name" |
	"email" |
	"addresses" |
	"phoneNumbers" |
	"whatsappNumber" |
	"smsNumber" |
	"collateralRegistryName" |
	"collateralName" |
	"collateralDescription" |
	"assetId" |
	"assetName" |
	"assetDescription" |
	"period" |
	"installment" |
	"downPayment" |
	"plafond" |
	"vendor" |
	"remarks" |
	"otherText1" |
	"otherText2" |
	"otherNumber1" |
	"otherNumber2" |
	"otherDate1" |
	"otherDate2" |
	"others" |
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

export type CreditApplicationRequestHistoryChangeItem = {
	column: CreditApplicationRequestHistoryColumn;
	label: string;
	previousValue: string;
	nextValue: string;
	changed: boolean;
};

export type CreditApplicationRequestHistoryEntry = {
	versionId: string;
	changedAt: string | null;
	changes: CreditApplicationRequestHistoryChangeItem[];
	changedCount: number;
};

export type CreditApplicationRequestHistoryOutput = {
	requestId: string;
	entries: CreditApplicationRequestHistoryEntry[];
};

type SortFieldKey = CreditApplicationManagementSortToken extends `${"+" | "-"}${infer T}` ? T : never;

function normalizeSortTokens(sort: string[]): CreditApplicationManagementSortToken[] {
	const prefixed = sort
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1) as CreditApplicationManagementSortField)) as CreditApplicationManagementSortToken[];
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

function normalizeCreditApplicationLevelValue(value: unknown): string | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

function normalizeCreditApplicationMenuValue(value: unknown): string | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

function normalizeCreditApplicationMenuValues(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];
	const normalized = value
		.map(normalizeCreditApplicationMenuValue)
		.filter((menu): menu is string => menu != null);
	return normalized.filter((menu, index) => normalized.indexOf(menu) == index);
}

function normalizeCreditApplicationDateValue(value: unknown): string | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim();
	if(normalized.length == 0)
		return null;
	const date = new Date(normalized);
	if(Number.isNaN(date.getTime()))
		return null;
	return date.toISOString();
}

function normalizeCreditApplicationNumberValue(value: unknown): number | null {
	if(value == null)
		return null;
	if(typeof value == "number")
		return Number.isFinite(value) ? value : null;
	if(typeof value != "string")
		return null;
	const normalized = value.trim();
	if(normalized.length == 0)
		return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCreditApplicationStatusValue(value: unknown): CreditApplicationManagementStatus | null {
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase() as CreditApplicationManagementStatus;
	return creditApplicationStatusSet.has(normalized) ? normalized : null;
}

function normalizeScalarFilterValue(column: CreditApplicationManagementFilterColumn, rawValue: unknown): string | number | boolean | null {
	if(rawValue == null)
		return null;

	if(booleanFilterColumns.has(column))
		return parseBooleanValue(rawValue);

	if(numberFilterColumns.has(column))
		return normalizeCreditApplicationNumberValue(rawValue);

	if(column == "email")
		return normalizeCreditApplicationLevelValue(rawValue);

	if(column == "addresses" || column == "phoneNumbers")
		return normalizeCreditApplicationMenuValue(rawValue);

	if(column == "status")
		return normalizeCreditApplicationStatusValue(rawValue);

	if(dateFilterColumns.has(column))
		return normalizeCreditApplicationDateValue(rawValue);

	if(typeof rawValue != "string")
		return null;
	const trimmed = rawValue.trim();
	if(trimmed.length == 0)
		return null;

	return trimmed;
}

function normalizeFilters(filters: CreditApplicationManagementFilterInput[] | undefined, fallbackCombinator: CreditApplicationManagementFilterCombinator): CreditApplicationManagementFilterInput[] {
	if(filters == null)
		return [];

	const normalized: CreditApplicationManagementFilterInput[] = [];
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
				.filter((value): value is string | number | boolean => value != null);
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

function normalizeFilterCombinator(filterCombinator: CreditApplicationManagementFilterCombinator | undefined): CreditApplicationManagementFilterCombinator {
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

function plainTextToRichText(value: string | null | undefined): ReviewCommentValue {
	return createPlainTextRichText(value);
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

function normalizeOptionalTextValue(value: unknown): string {
	return typeof value == "string" ? value.trim() : "";
}

function normalizeOptionalDateValue(value: unknown): string | null {
	if(typeof value != "string")
		return null;
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const date = new Date(trimmed);
	if(Number.isNaN(date.getTime()))
		return null;
	return date.toISOString();
}

function normalizeOptionalJsonTextValue(value: unknown): string {
	if(value == null)
		return "";
	if(typeof value == "string")
		return value.trim();
	try {
		return JSON.stringify(value);
	} catch{
		return String(value);
	}
}

function parseJsonText(value: string): JsonValue {
	const normalized = value.trim();
	if(normalized.length == 0)
		return null;
	try {
		return JSON.parse(normalized) as JsonValue;
	} catch{
		throw new Error("Others must be valid JSON.");
	}
}

function formatReviewNumberValue(value: unknown): string {
	const normalized = normalizeCreditApplicationNumberValue(value);
	if(normalized == null)
		return "-";
	return String(normalized);
}

function formatReviewCreditApplicationLevelValue(value: unknown): string {
	const email = normalizeCreditApplicationLevelValue(value);
	if(email == null)
		return "-";
	return email;
}

function formatReviewCreditApplicationMenusValue(value: unknown): string {
	const addresses = normalizeCreditApplicationMenuValues(value);
	if(addresses.length == 0)
		return "-";
	return addresses.join(", ");
}

function formatReviewOptionalTextValue(value: unknown): string {
	const normalized = normalizeOptionalTextValue(value);
	return normalized.length > 0 ? normalized : "-";
}

function formatReviewJsonValue(value: unknown): string {
	const normalized = normalizeOptionalJsonTextValue(value);
	return normalized.length > 0 ? normalized : "-";
}

async function resolveUserCreditApplicationMenus(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>): Promise<string[]> {
	const rawRole = user.role;
	if(rawRole != null && typeof rawRole == "object" && "menus" in rawRole)
		return normalizeCreditApplicationMenuValues(rawRole.menus);

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

	return normalizeCreditApplicationMenuValues(role.menus);
}

async function hasCreditApplicationRequestHistoryAccess(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>): Promise<boolean> {
	const creditApplicationMenus = await resolveUserCreditApplicationMenus(payload, user);
	return creditApplicationMenus.includes(creditApplicationHistoryRequiredMenu);
}

const creditApplicationRequestHistoryColumns = [
	"id",
	"name",
	"email",
	"addresses",
	"phoneNumbers",
	"whatsappNumber",
	"smsNumber",
	"collateralRegistryName",
	"collateralName",
	"collateralDescription",
	"assetId",
	"assetName",
	"assetDescription",
	"period",
	"installment",
	"downPayment",
	"plafond",
	"vendor",
	"remarks",
	"otherText1",
	"otherText2",
	"otherNumber1",
	"otherNumber2",
	"otherDate1",
	"otherDate2",
	"others",
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
] as const satisfies CreditApplicationRequestHistoryColumn[];

const creditApplicationRequestHistoryColumnLabelMap: Record<CreditApplicationRequestHistoryColumn, string> = {
	id: "ID",
	name: "Name",
	email: "Email",
	addresses: "Addresses",
	phoneNumbers: "Phone Numbers",
	whatsappNumber: "Whatsapp Number",
	smsNumber: "SMS Number",
	collateralRegistryName: "Collateral Registry Name",
	collateralName: "Collateral Name",
	collateralDescription: "Collateral Description",
	assetId: "Asset ID",
	assetName: "Asset Name",
	assetDescription: "Asset Description",
	period: "Period",
	installment: "Installment",
	downPayment: "Down Payment",
	plafond: "Plafond",
	vendor: "Vendor",
	remarks: "Remarks",
	otherText1: "Other Text 1",
	otherText2: "Other Text 2",
	otherNumber1: "Other Number 1",
	otherNumber2: "Other Number 2",
	otherDate1: "Other Date 1",
	otherDate2: "Other Date 2",
	others: "Others",
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

function getCreditApplicationRequestType(deletedAt: string | null | undefined, createdAt: string | null | undefined, updatedAt: string | null | undefined): "Create" | "Update" | "Delete" {
	if(deletedAt != null)
		return "Delete";
	if(createdAt == null || updatedAt == null)
		return "Update";
	return createdAt == updatedAt ? "Create" : "Update";
}

function getCreditApplicationHistoryStatusLabel(reviewedAt: string | null | undefined, reviewApproved: boolean | null | undefined): string {
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

export async function searchCreditApplicationAuditUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<CreditApplicationFilterUserOption[]> {
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

export async function searchCreditApplicationOptionsAction(keyword: string, selectedIds: string[] = []): Promise<CreditApplicationFilterIdOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
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
		name: doc.name,
		email: normalizeCreditApplicationLevelValue(doc.email) ?? "-"
	}));
}

function toPayloadSort(sort: CreditApplicationManagementSortToken[]): string {
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

function toPayloadFilterWhere(filters: CreditApplicationManagementFilterInput[]): Where | null {
	if(filters.length == 0)
		return null;

	const operatorMap: Record<CreditApplicationManagementFilterOperator, string> = {
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

	const getStatusWhere = (status: CreditApplicationManagementStatus): Where => {
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

	const buildStatusFilterWhere = (filter: CreditApplicationManagementFilterInput): Where | null => {
		if(filter.operator == "exists")
			return filter.value == true ? null : impossibleWhere;

		const rawStatuses = Array.isArray(filter.value) ? filter.value : [filter.value];
		const statuses = rawStatuses
			.map(normalizeCreditApplicationStatusValue)
			.filter((status): status is CreditApplicationManagementStatus => status != null)
			.filter((status, index, source) => source.indexOf(status) == index);
		if(statuses.length == 0)
			return null;

		if(filter.operator == "equals" || filter.operator == "in")
			return statuses.length == 1 ? getStatusWhere(statuses[0]) : { or: statuses.map(getStatusWhere) };

		if(filter.operator == "not_equals" || filter.operator == "not_in") {
			const excluded = new Set(statuses);
			const remaining = creditApplicationStatusValues.filter(status => !excluded.has(status));
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

export async function queryCreditApplicationsAction({ keyword, sort, filters, filterCombinator, page, limit, mode, includeSoftDeleted = false }: queryCreditApplicationsInput): Promise<queryCreditApplicationsOutput> {
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

	const creditApplicationFindResult = await payload.find({
		collection: "credit-applications",
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
				{ email: { like: normalizedKeyword } },
				{ addresses: { like: normalizedKeyword } },
				{ phoneNumbers: { like: normalizedKeyword } },
				{ whatsappNumber: { like: normalizedKeyword } },
				{ smsNumber: { like: normalizedKeyword } },
				{ collateralRegistryName: { like: normalizedKeyword } },
				{ collateralName: { like: normalizedKeyword } },
				{ assetId: { like: normalizedKeyword } },
				{ assetName: { like: normalizedKeyword } },
				{ vendor: { like: normalizedKeyword } },
				{ otherText1: { like: normalizedKeyword } },
				{ otherText2: { like: normalizedKeyword } }
			] }] : []),
			...(payloadFilterWhere != null ? [payloadFilterWhere] : [])
		] },
		select: {
			name: true,
			email: true,
			addresses: true,
			phoneNumbers: true,
			whatsappNumber: true,
			smsNumber: true,
			collateralRegistryName: true,
			collateralName: true,
			collateralDescription: true,
			assetId: true,
			assetName: true,
			assetDescription: true,
			period: true,
			installment: true,
			downPayment: true,
			plafond: true,
			vendor: true,
			remarks: true,
			otherText1: true,
			otherText2: true,
			otherNumber1: true,
			otherNumber2: true,
			otherDate1: true,
			otherDate2: true,
			others: true,
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

	const mappedRows: CreditApplicationTableRow[] = creditApplicationFindResult.docs.map(doc => {
		const createdById = getRelationshipId(doc.createdBy);
		const updatedById = getRelationshipId(doc.updatedBy);
		const deletedById = getRelationshipId(doc.deletedBy);
		const reviewedById = getRelationshipId(doc.reviewedBy);
		const reviewCommentText = richTextToPlainText(doc.reviewComment);
		const requestType = doc.deletedAt != null ? "Delete" : doc.createdAt == doc.updatedAt ? "Create" : "Update";
		const email = normalizeOptionalTextValue(doc.email);
		const addresses = normalizeCreditApplicationMenuValues(doc.addresses);
		const phoneNumbers = normalizeCreditApplicationMenuValues(doc.phoneNumbers);
		const collateralDescription = richTextToPlainText(doc.collateralDescription);
		const assetDescription = richTextToPlainText(doc.assetDescription);
		const remarks = richTextToPlainText(doc.remarks);

		return {
			id: String(doc.id),
			name: normalizeOptionalTextValue(doc.name),
			email,
			addresses,
			phoneNumbers,
			whatsappNumber: normalizeOptionalTextValue(doc.whatsappNumber),
			smsNumber: normalizeOptionalTextValue(doc.smsNumber),
			collateralRegistryName: normalizeOptionalTextValue(doc.collateralRegistryName),
			collateralName: normalizeOptionalTextValue(doc.collateralName),
			collateralDescription,
			assetId: normalizeOptionalTextValue(doc.assetId),
			assetName: normalizeOptionalTextValue(doc.assetName),
			assetDescription,
			period: normalizeCreditApplicationNumberValue(doc.period),
			installment: normalizeCreditApplicationNumberValue(doc.installment),
			downPayment: normalizeCreditApplicationNumberValue(doc.downPayment),
			plafond: normalizeCreditApplicationNumberValue(doc.plafond),
			vendor: normalizeOptionalTextValue(doc.vendor),
			remarks,
			otherText1: normalizeOptionalTextValue(doc.otherText1),
			otherText2: normalizeOptionalTextValue(doc.otherText2),
			otherNumber1: normalizeCreditApplicationNumberValue(doc.otherNumber1),
			otherNumber2: normalizeCreditApplicationNumberValue(doc.otherNumber2),
			otherDate1: normalizeOptionalDateValue(doc.otherDate1),
			otherDate2: normalizeOptionalDateValue(doc.otherDate2),
			others: normalizeOptionalJsonTextValue(doc.others),
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
		totalDocs: creditApplicationFindResult.totalDocs,
		page: creditApplicationFindResult.page ?? pageNumber,
		hasNextPage: creditApplicationFindResult.hasNextPage,
		hasPreviousPage: creditApplicationFindResult.hasPrevPage
	};
}

type queryCreditApplicationsSharedInput = Omit<queryCreditApplicationsInput, "mode">;

export async function queryCreditApplicationsViewerAction(input: queryCreditApplicationsSharedInput): Promise<queryCreditApplicationsOutput> {
	return queryCreditApplicationsAction({
		...input,
		mode: "editor",
		includeSoftDeleted: false
	});
}

export async function queryCreditApplicationsEditorAction(input: queryCreditApplicationsSharedInput): Promise<queryCreditApplicationsOutput> {
	return queryCreditApplicationsAction({
		...input,
		mode: "editor"
	});
}

export async function queryCreditApplicationsApproverAction(input: queryCreditApplicationsSharedInput): Promise<queryCreditApplicationsOutput> {
	return queryCreditApplicationsAction({
		...input,
		mode: "approver",
		includeSoftDeleted: false
	});
}

export async function resolveCreditApplicationRelationColumnsAction({ rows, columns }: ResolveCreditApplicationRelationColumnsInput): Promise<ResolveCreditApplicationRelationColumnsOutput> {
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
		const values: CreditApplicationRelationValues = {};

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

export async function getCreditApplicationRequestDetailsAction(creditApplicationId: string): Promise<CreditApplicationRequestDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplication = await payload.findByID({
		collection: "credit-applications",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		id: creditApplicationId,
		depth: 0,
		select: {
			name: true,
			email: true,
			addresses: true,
			phoneNumbers: true,
			whatsappNumber: true,
			smsNumber: true,
			collateralRegistryName: true,
			collateralName: true,
			collateralDescription: true,
			assetId: true,
			assetName: true,
			assetDescription: true,
			period: true,
			installment: true,
			downPayment: true,
			plafond: true,
			vendor: true,
			remarks: true,
			otherText1: true,
			otherText2: true,
			otherNumber1: true,
			otherNumber2: true,
			otherDate1: true,
			otherDate2: true,
			others: true,
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

	const createdById = getRelationshipId(creditApplication.createdBy);
	const updatedById = getRelationshipId(creditApplication.updatedBy);
	const deletedById = getRelationshipId(creditApplication.deletedBy);
	const reviewedById = getRelationshipId(creditApplication.reviewedBy);
	const reviewCommentText = richTextToPlainText(creditApplication.reviewComment);
	const requestType = creditApplication.deletedAt != null ? "Delete" : creditApplication.createdAt == creditApplication.updatedAt ? "Create" : "Update";
	const email = normalizeOptionalTextValue(creditApplication.email);
	const addresses = normalizeCreditApplicationMenuValues(creditApplication.addresses);
	const phoneNumbers = normalizeCreditApplicationMenuValues(creditApplication.phoneNumbers);
	const collateralDescription = richTextToPlainText(creditApplication.collateralDescription);
	const assetDescription = richTextToPlainText(creditApplication.assetDescription);
	const remarks = richTextToPlainText(creditApplication.remarks);

	const row: CreditApplicationTableRow = {
		id: String(creditApplication.id),
		name: normalizeOptionalTextValue(creditApplication.name),
		email,
		addresses,
		phoneNumbers,
		whatsappNumber: normalizeOptionalTextValue(creditApplication.whatsappNumber),
		smsNumber: normalizeOptionalTextValue(creditApplication.smsNumber),
		collateralRegistryName: normalizeOptionalTextValue(creditApplication.collateralRegistryName),
		collateralName: normalizeOptionalTextValue(creditApplication.collateralName),
		collateralDescription,
		assetId: normalizeOptionalTextValue(creditApplication.assetId),
		assetName: normalizeOptionalTextValue(creditApplication.assetName),
		assetDescription,
		period: normalizeCreditApplicationNumberValue(creditApplication.period),
		installment: normalizeCreditApplicationNumberValue(creditApplication.installment),
		downPayment: normalizeCreditApplicationNumberValue(creditApplication.downPayment),
		plafond: normalizeCreditApplicationNumberValue(creditApplication.plafond),
		vendor: normalizeOptionalTextValue(creditApplication.vendor),
		remarks,
		otherText1: normalizeOptionalTextValue(creditApplication.otherText1),
		otherText2: normalizeOptionalTextValue(creditApplication.otherText2),
		otherNumber1: normalizeCreditApplicationNumberValue(creditApplication.otherNumber1),
		otherNumber2: normalizeCreditApplicationNumberValue(creditApplication.otherNumber2),
		otherDate1: normalizeOptionalDateValue(creditApplication.otherDate1),
		otherDate2: normalizeOptionalDateValue(creditApplication.otherDate2),
		others: normalizeOptionalJsonTextValue(creditApplication.others),
		isSoftDeleted: creditApplication.deletedAt != null && creditApplication._status == "published",
		createdById,
		updatedById,
		deletedById,
		createdAt: creditApplication.createdAt,
		updatedAt: creditApplication.updatedAt,
		deletedAt: creditApplication.deletedAt ?? null,
		reviewedAt: creditApplication.reviewedAt ?? null,
		reviewedById,
		reviewApproved: creditApplication.reviewApproved ?? null,
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

	const relationValues: CreditApplicationRelationValues = {
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

	const relationReferences: CreditApplicationRequestDetailsOutput["relationReferences"] = {
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

export async function canAccessCreditApplicationRequestHistoryAction(): Promise<boolean> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return false;

	return hasCreditApplicationRequestHistoryAccess(payload, user);
}

export async function getCreditApplicationRequestHistoryAction(creditApplicationId: string): Promise<CreditApplicationRequestHistoryOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!await hasCreditApplicationRequestHistoryAccess(payload, user)) return unauthorized();

	const versionsResult = await payload.findVersions({
		collection: "credit-applications",
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 100,
		sort: "-updatedAt",
		where: {
			parent: {
				equals: creditApplicationId
			}
		},
		select: {
			updatedAt: true,
			version: {
				id: true,
				name: true,
				email: true,
				addresses: true,
				phoneNumbers: true,
				whatsappNumber: true,
				smsNumber: true,
				collateralRegistryName: true,
				collateralName: true,
				collateralDescription: true,
				assetId: true,
				assetName: true,
				assetDescription: true,
				period: true,
				installment: true,
				downPayment: true,
				plafond: true,
				vendor: true,
				remarks: true,
				otherText1: true,
				otherText2: true,
				otherNumber1: true,
				otherNumber2: true,
				otherDate1: true,
				otherDate2: true,
				others: true,
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

	type CreditApplicationVersionSnapshotDoc = {
		id?: string | number;
		updatedAt?: string | null;
		version?: {
			id?: string | number;
			name?: string;
			email?: unknown;
			addresses?: unknown;
			phoneNumbers?: unknown;
			whatsappNumber?: unknown;
			smsNumber?: unknown;
			collateralRegistryName?: unknown;
			collateralName?: unknown;
			collateralDescription?: unknown;
			assetId?: unknown;
			assetName?: unknown;
			assetDescription?: unknown;
			period?: unknown;
			installment?: unknown;
			downPayment?: unknown;
			plafond?: unknown;
			vendor?: unknown;
			remarks?: unknown;
			otherText1?: unknown;
			otherText2?: unknown;
			otherNumber1?: unknown;
			otherNumber2?: unknown;
			otherDate1?: unknown;
			otherDate2?: unknown;
			others?: unknown;
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

	const historyDocs = versionsResult.docs as CreditApplicationVersionSnapshotDoc[];

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

	type CreditApplicationHistorySnapshot = {
		versionId: string;
		changedAt: string | null;
		values: Record<CreditApplicationRequestHistoryColumn, string>;
	};

	const snapshotsMaybe = historyDocs
		.map<CreditApplicationHistorySnapshot | null>(historyDoc => {
			const version = historyDoc.version;
			if(version == null)
				return null;

			const createdById = getRelationshipId(version.createdBy);
			const updatedById = getRelationshipId(version.updatedBy);
			const deletedById = getRelationshipId(version.deletedBy);
			const reviewedById = getRelationshipId(version.reviewedBy);
			const reviewCommentText = richTextToPlainText(version.reviewComment);
			const collateralDescriptionText = richTextToPlainText(version.collateralDescription);
			const assetDescriptionText = richTextToPlainText(version.assetDescription);
			const remarksText = richTextToPlainText(version.remarks);

			const createdAt = version.createdAt ?? null;
			const updatedAt = version.updatedAt ?? null;
			const deletedAt = version.deletedAt ?? null;
			const reviewedAt = version.reviewedAt ?? null;

			return {
				versionId: String(version.id ?? historyDoc.id ?? creditApplicationId),
				changedAt: historyDoc.updatedAt ?? updatedAt,
				values: {
					id: String(version.id ?? creditApplicationId),
					name: (version.name ?? "-").trim().length > 0 ? version.name ?? "-" : "-",
					email: formatReviewCreditApplicationLevelValue(version.email),
					addresses: formatReviewCreditApplicationMenusValue(version.addresses),
					phoneNumbers: formatReviewCreditApplicationMenusValue(version.phoneNumbers),
					whatsappNumber: formatReviewOptionalTextValue(version.whatsappNumber),
					smsNumber: formatReviewOptionalTextValue(version.smsNumber),
					collateralRegistryName: formatReviewOptionalTextValue(version.collateralRegistryName),
					collateralName: formatReviewOptionalTextValue(version.collateralName),
					collateralDescription: collateralDescriptionText.length > 0 ? collateralDescriptionText : "-",
					assetId: formatReviewOptionalTextValue(version.assetId),
					assetName: formatReviewOptionalTextValue(version.assetName),
					assetDescription: assetDescriptionText.length > 0 ? assetDescriptionText : "-",
					period: formatReviewNumberValue(version.period),
					installment: formatReviewNumberValue(version.installment),
					downPayment: formatReviewNumberValue(version.downPayment),
					plafond: formatReviewNumberValue(version.plafond),
					vendor: formatReviewOptionalTextValue(version.vendor),
					remarks: remarksText.length > 0 ? remarksText : "-",
					otherText1: formatReviewOptionalTextValue(version.otherText1),
					otherText2: formatReviewOptionalTextValue(version.otherText2),
					otherNumber1: formatReviewNumberValue(version.otherNumber1),
					otherNumber2: formatReviewNumberValue(version.otherNumber2),
					otherDate1: formatReviewDateValue(typeof version.otherDate1 == "string" ? version.otherDate1 : null),
					otherDate2: formatReviewDateValue(typeof version.otherDate2 == "string" ? version.otherDate2 : null),
					others: formatReviewJsonValue(version.others),
					createdBy: createdById != null ? (usersById.get(createdById)?.name ?? "-") : "-",
					updatedBy: updatedById != null ? (usersById.get(updatedById)?.name ?? "-") : "-",
					deletedBy: deletedById != null ? (usersById.get(deletedById)?.name ?? "-") : "-",
					createdAt: formatReviewDateValue(createdAt),
					updatedAt: formatReviewDateValue(updatedAt),
					deletedAt: formatReviewDateValue(deletedAt),
					requestType: getCreditApplicationRequestType(deletedAt, createdAt, updatedAt),
					status: getCreditApplicationHistoryStatusLabel(reviewedAt, version.reviewApproved ?? null),
					reviewedAt: formatReviewDateValue(reviewedAt),
					reviewedBy: reviewedById != null ? (usersById.get(reviewedById)?.name ?? "-") : "-",
					reviewApproved: version.reviewApproved == null ? "-" : version.reviewApproved ? "True" : "False",
					reviewCommentText: reviewCommentText.length > 0 ? reviewCommentText : "-"
				}
			};
		});

	const snapshots = snapshotsMaybe.filter((snapshot): snapshot is CreditApplicationHistorySnapshot => snapshot != null);

	const entries: CreditApplicationRequestHistoryEntry[] = snapshots.map((snapshot, snapshotIndex) => {
		const previousSnapshot = snapshots[snapshotIndex + 1] ?? null;

		const changes: CreditApplicationRequestHistoryChangeItem[] = creditApplicationRequestHistoryColumns.map(column => {
			const previousValue = previousSnapshot?.values[column] ?? "-";
			const nextValue = snapshot.values[column];
			return {
				column,
				label: creditApplicationRequestHistoryColumnLabelMap[column],
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
		requestId: creditApplicationId,
		entries
	};
}

export async function upsertCreditApplicationRequestAction(input: UpsertCreditApplicationRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const name = input.name.trim();
	const email = normalizeOptionalTextValue(input.email);
	const addresses = normalizeCreditApplicationMenuValues(input.addresses);
	const phoneNumbers = normalizeCreditApplicationMenuValues(input.phoneNumbers);
	const whatsappNumber = normalizeOptionalTextValue(input.whatsappNumber);
	const smsNumber = normalizeOptionalTextValue(input.smsNumber);
	const collateralRegistryName = normalizeOptionalTextValue(input.collateralRegistryName);
	const collateralName = normalizeOptionalTextValue(input.collateralName);
	const collateralDescription = normalizeOptionalTextValue(input.collateralDescription);
	const assetId = normalizeOptionalTextValue(input.assetId);
	const assetName = normalizeOptionalTextValue(input.assetName);
	const assetDescription = normalizeOptionalTextValue(input.assetDescription);
	const period = normalizeCreditApplicationNumberValue(input.period);
	const installment = normalizeCreditApplicationNumberValue(input.installment);
	const downPayment = normalizeCreditApplicationNumberValue(input.downPayment);
	const plafond = normalizeCreditApplicationNumberValue(input.plafond);
	const vendor = normalizeOptionalTextValue(input.vendor);
	const remarks = normalizeOptionalTextValue(input.remarks);
	const otherText1 = normalizeOptionalTextValue(input.otherText1);
	const otherText2 = normalizeOptionalTextValue(input.otherText2);
	const otherNumber1 = normalizeCreditApplicationNumberValue(input.otherNumber1);
	const otherNumber2 = normalizeCreditApplicationNumberValue(input.otherNumber2);
	const otherDate1 = normalizeOptionalDateValue(input.otherDate1);
	const otherDate2 = normalizeOptionalDateValue(input.otherDate2);
	const others = parseJsonText(input.others);

	if(name.length == 0)
		throw new Error("Credit application name is required.");
	if(addresses.length == 0)
		throw new Error("At least one address is required.");
	if(phoneNumbers.length == 0)
		throw new Error("At least one phone number is required.");
	if(whatsappNumber.length == 0)
		throw new Error("Whatsapp number is required.");

	const requestData = {
		_status: "draft" as const,
		name,
		email,
		addresses,
		phoneNumbers,
		whatsappNumber,
		smsNumber,
		collateralRegistryName,
		collateralName,
		collateralDescription: plainTextToRichText(collateralDescription) as any,
		assetId,
		assetName,
		assetDescription: plainTextToRichText(assetDescription) as any,
		period,
		installment,
		downPayment,
		plafond,
		vendor,
		remarks: plainTextToRichText(remarks) as any,
		otherText1,
		otherText2,
		otherNumber1,
		otherNumber2,
		otherDate1,
		otherDate2,
		others,
		deletedAt: null,
		deletedBy: null,
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: null
	};

	if(input.creditApplicationId == null) {
		const latestImport = await payload.find({
			user,
			collection: "credit-application-imports",
			overrideAccess: true,
			trash: true,
			draft: true,
			depth: 0,
			limit: 1,
			sort: "-updatedAt"
		});
		const importId = latestImport.docs[0]?.id;
		if(importId == null)
			throw new Error("Cannot create credit application because no credit-application-import exists.");

		const created = await payload.create({
			user,
			collection: "credit-applications",
			overrideAccess: true,
			data: {
				import: importId,
				...requestData
			}
		});
		return { creditApplicationId: created.id };
	}

	await payload.findByID({
		user,
		collection: "credit-applications",
		id: input.creditApplicationId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "credit-applications",
		id: input.creditApplicationId,
		overrideAccess: true,
		trash: true,
		data: requestData
	});

	return { creditApplicationId: input.creditApplicationId };
}

export async function requestDeleteCreditApplicationAction(creditApplicationId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.findByID({
		user,
		collection: "credit-applications",
		id: creditApplicationId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "credit-applications",
		id: creditApplicationId,
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

	return { creditApplicationId };
}

export async function cancelCreditApplicationRequestAction(creditApplicationId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplication = await payload.findByID({
		user,
		collection: "credit-applications",
		id: creditApplicationId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(creditApplication.reviewedAt != null && creditApplication.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");

	const approvedVersions = await payload.findVersions({
		user,
		collection: "credit-applications",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: creditApplicationId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {
			version: {
				name: true,
				email: true,
				addresses: true,
				phoneNumbers: true,
				whatsappNumber: true,
				smsNumber: true,
				collateralRegistryName: true,
				collateralName: true,
				collateralDescription: true,
				assetId: true,
				assetName: true,
				assetDescription: true,
				period: true,
				installment: true,
				downPayment: true,
				plafond: true,
				vendor: true,
				remarks: true,
				otherText1: true,
				otherText2: true,
				otherNumber1: true,
				otherNumber2: true,
				otherDate1: true,
				otherDate2: true,
				others: true,
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
			collection: "credit-applications",
			id: creditApplicationId,
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

		return { creditApplicationId, softDeleted: true };
	}

	const approvedDeletedBy = getRelationshipId(approvedVersion.deletedBy);
	const approvedReviewedBy = getRelationshipId(approvedVersion.reviewedBy);
	const approvedEmail = normalizeOptionalTextValue(approvedVersion.email);
	const approvedAddresses = normalizeCreditApplicationMenuValues(approvedVersion.addresses);
	const approvedPhoneNumbers = normalizeCreditApplicationMenuValues(approvedVersion.phoneNumbers);
	const approvedWhatsappNumber = normalizeOptionalTextValue(approvedVersion.whatsappNumber);
	const approvedCollateralDescription = richTextToPlainText(approvedVersion.collateralDescription);
	const approvedAssetDescription = richTextToPlainText(approvedVersion.assetDescription);
	const approvedRemarks = richTextToPlainText(approvedVersion.remarks);

	await payload.update({
		user,
		collection: "credit-applications",
		id: creditApplicationId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			name: normalizeOptionalTextValue(approvedVersion.name),
			email: approvedEmail,
			addresses: approvedAddresses,
			phoneNumbers: approvedPhoneNumbers,
			whatsappNumber: approvedWhatsappNumber,
			smsNumber: normalizeOptionalTextValue(approvedVersion.smsNumber),
			collateralRegistryName: normalizeOptionalTextValue(approvedVersion.collateralRegistryName),
			collateralName: normalizeOptionalTextValue(approvedVersion.collateralName),
			collateralDescription: plainTextToRichText(approvedCollateralDescription) as any,
			assetId: normalizeOptionalTextValue(approvedVersion.assetId),
			assetName: normalizeOptionalTextValue(approvedVersion.assetName),
			assetDescription: plainTextToRichText(approvedAssetDescription) as any,
			period: normalizeCreditApplicationNumberValue(approvedVersion.period),
			installment: normalizeCreditApplicationNumberValue(approvedVersion.installment),
			downPayment: normalizeCreditApplicationNumberValue(approvedVersion.downPayment),
			plafond: normalizeCreditApplicationNumberValue(approvedVersion.plafond),
			vendor: normalizeOptionalTextValue(approvedVersion.vendor),
			remarks: plainTextToRichText(approvedRemarks) as any,
			otherText1: normalizeOptionalTextValue(approvedVersion.otherText1),
			otherText2: normalizeOptionalTextValue(approvedVersion.otherText2),
			otherNumber1: normalizeCreditApplicationNumberValue(approvedVersion.otherNumber1),
			otherNumber2: normalizeCreditApplicationNumberValue(approvedVersion.otherNumber2),
			otherDate1: normalizeOptionalDateValue(approvedVersion.otherDate1),
			otherDate2: normalizeOptionalDateValue(approvedVersion.otherDate2),
			others: approvedVersion.others ?? null,
			deletedAt: approvedVersion.deletedAt ?? null,
			deletedBy: approvedDeletedBy,
			reviewedAt: approvedVersion.reviewedAt ?? null,
			reviewedBy: approvedReviewedBy,
			reviewApproved: approvedVersion.reviewApproved ?? null,
			reviewComment: (approvedVersion.reviewComment ?? defaultReviewComment) as any
		}
	});

	return { creditApplicationId, softDeleted: false };
}

export async function requestRestoreCreditApplicationAction(creditApplicationId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplication = await payload.findByID({
		user,
		collection: "credit-applications",
		id: creditApplicationId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	if(creditApplication.deletedAt == null)
		throw new Error("Credit application is not deleted.");

	await payload.update({
		user,
		collection: "credit-applications",
		id: creditApplicationId,
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

	return { creditApplicationId };
}

export async function reviewCreditApplicationRequestAction({
	creditApplicationId,
	decision,
	reviewComment
}: ReviewCreditApplicationRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplication = await payload.findByID({
		user,
		collection: "credit-applications",
		id: creditApplicationId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(creditApplication.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	if(decision == "reject") {
		await payload.update({
			user,
			collection: "credit-applications",
			id: creditApplicationId,
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
		return { creditApplicationId, decision };
	}

	await payload.update({
		user,
		collection: "credit-applications",
		id: creditApplicationId,
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

	return { creditApplicationId, decision };
}

export async function getCreditApplicationRequestReviewDiffAction(creditApplicationId: string): Promise<CreditApplicationRequestReviewDiffOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplication = await payload.findByID({
		user,
		collection: "credit-applications",
		id: creditApplicationId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	const approvedVersions = await payload.findVersions({
		user,
		collection: "credit-applications",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: creditApplicationId } },
				{ "version._status": { equals: "published" } }
			]
		},
		select: {
			version: {
				name: true,
				email: true,
				addresses: true,
				phoneNumbers: true,
				whatsappNumber: true,
				smsNumber: true,
				collateralRegistryName: true,
				collateralName: true,
				collateralDescription: true,
				assetId: true,
				assetName: true,
				assetDescription: true,
				period: true,
				installment: true,
				downPayment: true,
				plafond: true,
				vendor: true,
				remarks: true,
				otherText1: true,
				otherText2: true,
				otherNumber1: true,
				otherNumber2: true,
				otherDate1: true,
				otherDate2: true,
				others: true,
				deletedAt: true
			}
		}
	});

	const approvedVersion = approvedVersions.docs[0]?.version;

	const requestType: CreditApplicationRequestReviewDiffOutput["requestType"] =
		creditApplication.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";
	const approvedCollateralDescription = richTextToPlainText(approvedVersion?.collateralDescription);
	const requestedCollateralDescription = richTextToPlainText(creditApplication.collateralDescription);
	const approvedAssetDescription = richTextToPlainText(approvedVersion?.assetDescription);
	const requestedAssetDescription = richTextToPlainText(creditApplication.assetDescription);
	const approvedRemarks = richTextToPlainText(approvedVersion?.remarks);
	const requestedRemarks = richTextToPlainText(creditApplication.remarks);

	const comparisonItems = [
		{
			field: "name",
			label: "Applicant Name",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.name),
			requestedValue: formatReviewOptionalTextValue(creditApplication.name)
		},
		{
			field: "email",
			label: "Email",
			previousValue: formatReviewCreditApplicationLevelValue(approvedVersion?.email),
			requestedValue: formatReviewCreditApplicationLevelValue(creditApplication.email)
		},
		{
			field: "addresses",
			label: "Addresses",
			previousValue: formatReviewCreditApplicationMenusValue(approvedVersion?.addresses),
			requestedValue: formatReviewCreditApplicationMenusValue(creditApplication.addresses)
		},
		{
			field: "phoneNumbers",
			label: "Phone Numbers",
			previousValue: formatReviewCreditApplicationMenusValue(approvedVersion?.phoneNumbers),
			requestedValue: formatReviewCreditApplicationMenusValue(creditApplication.phoneNumbers)
		},
		{
			field: "whatsappNumber",
			label: "Whatsapp Number",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.whatsappNumber),
			requestedValue: formatReviewOptionalTextValue(creditApplication.whatsappNumber)
		},
		{
			field: "smsNumber",
			label: "SMS Number",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.smsNumber),
			requestedValue: formatReviewOptionalTextValue(creditApplication.smsNumber)
		},
		{
			field: "collateralRegistryName",
			label: "Collateral Registry Name",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.collateralRegistryName),
			requestedValue: formatReviewOptionalTextValue(creditApplication.collateralRegistryName)
		},
		{
			field: "collateralName",
			label: "Collateral Name",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.collateralName),
			requestedValue: formatReviewOptionalTextValue(creditApplication.collateralName)
		},
		{
			field: "collateralDescription",
			label: "Collateral Description",
			previousValue: approvedCollateralDescription.length > 0 ? approvedCollateralDescription : "-",
			requestedValue: requestedCollateralDescription.length > 0 ? requestedCollateralDescription : "-"
		},
		{
			field: "assetId",
			label: "Asset ID",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.assetId),
			requestedValue: formatReviewOptionalTextValue(creditApplication.assetId)
		},
		{
			field: "assetName",
			label: "Asset Name",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.assetName),
			requestedValue: formatReviewOptionalTextValue(creditApplication.assetName)
		},
		{
			field: "assetDescription",
			label: "Asset Description",
			previousValue: approvedAssetDescription.length > 0 ? approvedAssetDescription : "-",
			requestedValue: requestedAssetDescription.length > 0 ? requestedAssetDescription : "-"
		},
		{
			field: "period",
			label: "Period",
			previousValue: formatReviewNumberValue(approvedVersion?.period),
			requestedValue: formatReviewNumberValue(creditApplication.period)
		},
		{
			field: "installment",
			label: "Installment",
			previousValue: formatReviewNumberValue(approvedVersion?.installment),
			requestedValue: formatReviewNumberValue(creditApplication.installment)
		},
		{
			field: "downPayment",
			label: "Down Payment",
			previousValue: formatReviewNumberValue(approvedVersion?.downPayment),
			requestedValue: formatReviewNumberValue(creditApplication.downPayment)
		},
		{
			field: "plafond",
			label: "Plafond",
			previousValue: formatReviewNumberValue(approvedVersion?.plafond),
			requestedValue: formatReviewNumberValue(creditApplication.plafond)
		},
		{
			field: "vendor",
			label: "Vendor",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.vendor),
			requestedValue: formatReviewOptionalTextValue(creditApplication.vendor)
		},
		{
			field: "remarks",
			label: "Remarks",
			previousValue: approvedRemarks.length > 0 ? approvedRemarks : "-",
			requestedValue: requestedRemarks.length > 0 ? requestedRemarks : "-"
		},
		{
			field: "otherText1",
			label: "Other Text 1",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.otherText1),
			requestedValue: formatReviewOptionalTextValue(creditApplication.otherText1)
		},
		{
			field: "otherText2",
			label: "Other Text 2",
			previousValue: formatReviewOptionalTextValue(approvedVersion?.otherText2),
			requestedValue: formatReviewOptionalTextValue(creditApplication.otherText2)
		},
		{
			field: "otherNumber1",
			label: "Other Number 1",
			previousValue: formatReviewNumberValue(approvedVersion?.otherNumber1),
			requestedValue: formatReviewNumberValue(creditApplication.otherNumber1)
		},
		{
			field: "otherNumber2",
			label: "Other Number 2",
			previousValue: formatReviewNumberValue(approvedVersion?.otherNumber2),
			requestedValue: formatReviewNumberValue(creditApplication.otherNumber2)
		},
		{
			field: "otherDate1",
			label: "Other Date 1",
			previousValue: formatReviewDateValue(typeof approvedVersion?.otherDate1 == "string" ? approvedVersion.otherDate1 : null),
			requestedValue: formatReviewDateValue(typeof creditApplication.otherDate1 == "string" ? creditApplication.otherDate1 : null)
		},
		{
			field: "otherDate2",
			label: "Other Date 2",
			previousValue: formatReviewDateValue(typeof approvedVersion?.otherDate2 == "string" ? approvedVersion.otherDate2 : null),
			requestedValue: formatReviewDateValue(typeof creditApplication.otherDate2 == "string" ? creditApplication.otherDate2 : null)
		},
		{
			field: "others",
			label: "Others",
			previousValue: formatReviewJsonValue(approvedVersion?.others),
			requestedValue: formatReviewJsonValue(creditApplication.others)
		},
		{
			field: "deletedAt",
			label: "Deleted At",
			previousValue: formatReviewDateValue(approvedVersion?.deletedAt ?? null),
			requestedValue: formatReviewDateValue(creditApplication.deletedAt)
		}
	] satisfies Array<Omit<CreditApplicationRequestReviewDiffItem, "changed">>;

	const items: CreditApplicationRequestReviewDiffItem[] = comparisonItems.map(item => ({
		...item,
		changed: item.previousValue != item.requestedValue
	}));

	return {
		requestId: creditApplicationId,
		requestType,
		items,
		changedCount: items.filter(item => item.changed).length
	};
}
