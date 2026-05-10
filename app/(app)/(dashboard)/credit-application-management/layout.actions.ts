"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import type { RelationCreditApplicationImport, RelationUser } from "@/utils/requestRelationValues";
import { createEmptyReviewComment } from "@/utils/reviewCommentRichText";
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
	"import",
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
	"reviewApproved"
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
	"import",
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

type RichTextValue = NonNullable<CreditApplication["remarks"]>;
type ReviewCommentValue = NonNullable<CreditApplication["reviewComment"]>;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const defaultReviewComment: ReviewCommentValue = createEmptyReviewComment();

export type CreditApplicationManagementTabMode = "editor" | "approver";
export type CreditApplicationManagementSortField = "createdAt" |
	"id" |
	"updatedAt" |
	"deletedAt" |
	"import" |
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
	"reviewApproved";
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
	"import" |
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
	collateralDescription: RichTextValue | null;
	assetId: string;
	assetName: string;
	assetDescription: RichTextValue | null;
	period: number | null;
	installment: number | null;
	downPayment: number | null;
	plafond: number | null;
	vendor: string;
	remarks: RichTextValue | null;
	otherText1: string;
	otherText2: string;
	otherNumber1: number | null;
	otherNumber2: number | null;
	otherDate1: string | null;
	otherDate2: string | null;
	others: string;
	isSoftDeleted: boolean;
	createdBy: string | null;
	updatedBy: string | null;
	deletedBy: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	import: string | null;
	reviewedAt: string | null;
	reviewedBy: string | null;
	reviewApproved: boolean | null;
	reviewComment: ReviewCommentValue | null;
	requestType: "Create" | "Update" | "Delete";
};

export type CreditApplicationRelationValues =
	Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`imports:${string}`, RelationCreditApplicationImport>>;

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
	relations: CreditApplicationRelationValues;
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

export type CreditApplicationFilterImportOption = {
	id: string;
	filename: string;
	mimeType: string;
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
	collateralDescription: RichTextValue | null;
	assetId: string;
	assetName: string;
	assetDescription: RichTextValue | null;
	period: number | null;
	installment: number | null;
	downPayment: number | null;
	plafond: number | null;
	vendor: string;
	remarks: RichTextValue | null;
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

export type CreditApplicationRequestReviewDiffOutput = {
	requestId: string;
	requestType: "Create" | "Update" | "Delete";
	name: [CreditApplication["name"], CreditApplication["name"]];
	email: [CreditApplication["email"], CreditApplication["email"]];
	addresses: [CreditApplication["addresses"], CreditApplication["addresses"]];
	phoneNumbers: [CreditApplication["phoneNumbers"], CreditApplication["phoneNumbers"]];
	whatsappNumber: [CreditApplication["whatsappNumber"], CreditApplication["whatsappNumber"]];
	smsNumber: [CreditApplication["smsNumber"], CreditApplication["smsNumber"]];
	collateralRegistryName: [CreditApplication["collateralRegistryName"], CreditApplication["collateralRegistryName"]];
	collateralName: [CreditApplication["collateralName"], CreditApplication["collateralName"]];
	collateralDescription: [CreditApplication["collateralDescription"], CreditApplication["collateralDescription"]];
	assetId: [CreditApplication["assetId"], CreditApplication["assetId"]];
	assetName: [CreditApplication["assetName"], CreditApplication["assetName"]];
	assetDescription: [CreditApplication["assetDescription"], CreditApplication["assetDescription"]];
	period: [CreditApplication["period"], CreditApplication["period"]];
	installment: [CreditApplication["installment"], CreditApplication["installment"]];
	downPayment: [CreditApplication["downPayment"], CreditApplication["downPayment"]];
	plafond: [CreditApplication["plafond"], CreditApplication["plafond"]];
	vendor: [CreditApplication["vendor"], CreditApplication["vendor"]];
	remarks: [CreditApplication["remarks"], CreditApplication["remarks"]];
	otherText1: [CreditApplication["otherText1"], CreditApplication["otherText1"]];
	otherText2: [CreditApplication["otherText2"], CreditApplication["otherText2"]];
	otherNumber1: [CreditApplication["otherNumber1"], CreditApplication["otherNumber1"]];
	otherNumber2: [CreditApplication["otherNumber2"], CreditApplication["otherNumber2"]];
	otherDate1: [CreditApplication["otherDate1"], CreditApplication["otherDate1"]];
	otherDate2: [CreditApplication["otherDate2"], CreditApplication["otherDate2"]];
	others: [CreditApplication["others"], CreditApplication["others"]];
	deletedAt: [CreditApplication["deletedAt"], CreditApplication["deletedAt"]];
	import: [string | null, string | null];
	relations: CreditApplicationRelationValues;
};

export type CreditApplicationRequestDetailsOutput = {
	row: CreditApplicationTableRow;
	relations: CreditApplicationRelationValues;
};

export type CreditApplicationRequestHistoryEntry = {
	versionId: string;
	id: string;
	name: string | null;
	email: string | null;
	addresses: string[] | null;
	phoneNumbers: string[] | null;
	whatsappNumber: string | null;
	smsNumber: string | null;
	collateralRegistryName: string | null;
	collateralName: string | null;
	collateralDescription: RichTextValue | null;
	assetId: string | null;
	assetName: string | null;
	assetDescription: RichTextValue | null;
	period: number | null;
	installment: number | null;
	downPayment: number | null;
	plafond: number | null;
	vendor: string | null;
	remarks: RichTextValue | null;
	otherText1: string | null;
	otherText2: string | null;
	otherNumber1: number | null;
	otherNumber2: number | null;
	otherDate1: string | null;
	otherDate2: string | null;
	others: JsonValue | null;
	createdBy: string | null;
	updatedBy: string | null;
	deletedBy: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	import: string | null;
	requestType: "Create" | "Update" | "Delete";
	status: string;
	reviewedAt: string | null;
	reviewedBy: string | null;
	reviewApproved: boolean | null;
	reviewComment: ReviewCommentValue | null;
};

export type CreditApplicationRequestHistoryOutput = {
	requestId: string;
	entries: CreditApplicationRequestHistoryEntry[];
	relations: CreditApplicationRelationValues;
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

async function findImportsByIds(payload: Awaited<ReturnType<typeof getPayload>>, user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>, ids: string[]): Promise<Map<string, RelationCreditApplicationImport>> {
	if(ids.length == 0)
		return new Map();

	const importsResult = await payload.find({
		collection: "credit-application-imports",
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
			filename: true,
			mimeType: true
		}
	});

	const map = new Map<string, RelationCreditApplicationImport>();
	for(const doc of importsResult.docs) {
		map.set(String(doc.id), {
			filename: typeof doc.filename == "string" ? doc.filename : "(unknown)",
			mimeType: typeof doc.mimeType == "string" ? doc.mimeType : "application/octet-stream"
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

export async function searchCreditApplicationImportOptionsAction(keyword: string, selectedIds: string[] = []): Promise<CreditApplicationFilterImportOption[]> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ id: { like: normalizedKeyword } },
		{ filename: { like: normalizedKeyword } },
		{ mimeType: { like: normalizedKeyword } }
	];
	const whereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? null : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await payload.find({
		collection: "credit-application-imports",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "-updatedAt",
		select: {
			filename: true,
			mimeType: true
		},
		...(where != null ? { where } : {})
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		filename: typeof doc.filename == "string" ? doc.filename : "(unknown)",
		mimeType: typeof doc.mimeType == "string" ? doc.mimeType : "application/octet-stream"
	}));
}

function toPayloadSort(sort: CreditApplicationManagementSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		let path: string;
		if(field == "reviewedBy")
			path = "reviewedBy.name";
		else if(field == "import")
			path = "import.filename";
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
			import: true,
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
		const importId = getRelationshipId(doc.import);
		const createdBy = getRelationshipId(doc.createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		const deletedBy = getRelationshipId(doc.deletedBy);
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		const requestType = doc.deletedAt != null ? "Delete" : doc.createdAt == doc.updatedAt ? "Create" : "Update";
		const email = normalizeOptionalTextValue(doc.email);
		const addresses = normalizeCreditApplicationMenuValues(doc.addresses);
		const phoneNumbers = normalizeCreditApplicationMenuValues(doc.phoneNumbers);
		const collateralDescription = doc.collateralDescription ?? null;
		const assetDescription = doc.assetDescription ?? null;
		const remarks = doc.remarks ?? null;

		return {
			id: String(doc.id),
			import: importId,
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
	const importIds = new Set<string>();
	for(const doc of creditApplicationFindResult.docs) {
		const importId = getRelationshipId(doc.import);
		if(importId != null)
			importIds.add(importId);
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
	const importsById = await findImportsByIds(payload, user, [...importIds]);
	const relations: CreditApplicationRelationValues = {};
	for(const [id, relationUser] of usersById)
		relations[`users:${id}`] = relationUser;
	for(const [id, relationImport] of importsById)
		relations[`imports:${id}`] = relationImport;

	return {
		docs: mappedRows,
		relations,
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
			import: true,
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

	const importId = getRelationshipId(creditApplication.import);
	const createdBy = getRelationshipId(creditApplication.createdBy);
	const updatedBy = getRelationshipId(creditApplication.updatedBy);
	const deletedBy = getRelationshipId(creditApplication.deletedBy);
	const reviewedBy = getRelationshipId(creditApplication.reviewedBy);
	const requestType = creditApplication.deletedAt != null ? "Delete" : creditApplication.createdAt == creditApplication.updatedAt ? "Create" : "Update";
	const email = normalizeOptionalTextValue(creditApplication.email);
	const addresses = normalizeCreditApplicationMenuValues(creditApplication.addresses);
	const phoneNumbers = normalizeCreditApplicationMenuValues(creditApplication.phoneNumbers);
	const collateralDescription = creditApplication.collateralDescription ?? null;
	const assetDescription = creditApplication.assetDescription ?? null;
	const remarks = creditApplication.remarks ?? null;

	const row: CreditApplicationTableRow = {
		id: String(creditApplication.id),
		import: importId,
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
		createdBy,
		updatedBy,
		deletedBy,
		createdAt: creditApplication.createdAt,
		updatedAt: creditApplication.updatedAt,
		deletedAt: creditApplication.deletedAt ?? null,
		reviewedAt: creditApplication.reviewedAt ?? null,
		reviewedBy,
		reviewApproved: creditApplication.reviewApproved ?? null,
		reviewComment: creditApplication.reviewComment ?? null,
		requestType
	};

	const relationUserIds = new Set<string>();
	const relationImportIds = new Set<string>();
	if(row.import != null)
		relationImportIds.add(row.import);
	if(row.reviewedBy != null)
		relationUserIds.add(row.reviewedBy);
	if(row.createdBy != null)
		relationUserIds.add(row.createdBy);
	if(row.updatedBy != null)
		relationUserIds.add(row.updatedBy);
	if(row.deletedBy != null)
		relationUserIds.add(row.deletedBy);

	const usersById = await findUsersByIds(payload, user, [...relationUserIds]);
	const importsById = await findImportsByIds(payload, user, [...relationImportIds]);
	const relations: CreditApplicationRelationValues = {};
	for(const [id, relationUser] of usersById)
		relations[`users:${id}`] = relationUser;
	for(const [id, relationImport] of importsById)
		relations[`imports:${id}`] = relationImport;

	return {
		row,
		relations
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
				import: true,
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
			import?: unknown;
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
	const relationImportIds = new Set<string>();
	for(const historyDoc of historyDocs) {
		const version = historyDoc.version;
		if(version == null)
			continue;

		const importId = getRelationshipId(version.import);
		const createdBy = getRelationshipId(version.createdBy);
		const updatedBy = getRelationshipId(version.updatedBy);
		const deletedBy = getRelationshipId(version.deletedBy);
		const reviewedBy = getRelationshipId(version.reviewedBy);

		if(importId != null)
			relationImportIds.add(importId);
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
	const importsById = await findImportsByIds(payload, user, [...relationImportIds]);
	const relations: CreditApplicationRelationValues = {};
	for(const [id, relationUser] of usersById)
		relations[`users:${id}`] = relationUser;
	for(const [id, relationImport] of importsById)
		relations[`imports:${id}`] = relationImport;

	const snapshotsMaybe = historyDocs
		.map<CreditApplicationRequestHistoryEntry | null>(historyDoc => {
			const version = historyDoc.version;
			if(version == null)
				return null;

			const importId = getRelationshipId(version.import);
			const createdBy = getRelationshipId(version.createdBy);
			const updatedBy = getRelationshipId(version.updatedBy);
			const deletedBy = getRelationshipId(version.deletedBy);
			const reviewedBy = getRelationshipId(version.reviewedBy);
			const collateralDescriptionText = version.collateralDescription;
			const assetDescriptionText = version.assetDescription;
			const remarksText = version.remarks;

			const createdAt = version.createdAt ?? null;
			const updatedAt = version.updatedAt ?? null;
			const deletedAt = version.deletedAt ?? null;
			const reviewedAt = version.reviewedAt ?? null;

			return {
				versionId: String(version.id ?? historyDoc.id ?? creditApplicationId),
				id: String(version.id ?? creditApplicationId),
				import: importId,
				name: version.name ?? null,
				email: typeof version.email == "string" ? version.email : null,
				addresses: Array.isArray(version.addresses) ? version.addresses.filter((value): value is string => typeof value == "string") : null,
				phoneNumbers: Array.isArray(version.phoneNumbers) ? version.phoneNumbers.filter((value): value is string => typeof value == "string") : null,
				whatsappNumber: typeof version.whatsappNumber == "string" ? version.whatsappNumber : null,
				smsNumber: typeof version.smsNumber == "string" ? version.smsNumber : null,
				collateralRegistryName: typeof version.collateralRegistryName == "string" ? version.collateralRegistryName : null,
				collateralName: typeof version.collateralName == "string" ? version.collateralName : null,
				collateralDescription: collateralDescriptionText as RichTextValue | null,
				assetId: typeof version.assetId == "string" ? version.assetId : null,
				assetName: typeof version.assetName == "string" ? version.assetName : null,
				assetDescription: assetDescriptionText as RichTextValue | null,
				period: typeof version.period == "number" ? version.period : null,
				installment: typeof version.installment == "number" ? version.installment : null,
				downPayment: typeof version.downPayment == "number" ? version.downPayment : null,
				plafond: typeof version.plafond == "number" ? version.plafond : null,
				vendor: typeof version.vendor == "string" ? version.vendor : null,
				remarks: remarksText as RichTextValue | null,
				otherText1: typeof version.otherText1 == "string" ? version.otherText1 : null,
				otherText2: typeof version.otherText2 == "string" ? version.otherText2 : null,
				otherNumber1: typeof version.otherNumber1 == "number" ? version.otherNumber1 : null,
				otherNumber2: typeof version.otherNumber2 == "number" ? version.otherNumber2 : null,
				otherDate1: typeof version.otherDate1 == "string" ? version.otherDate1 : null,
				otherDate2: typeof version.otherDate2 == "string" ? version.otherDate2 : null,
				others: version.others as JsonValue | null,
				createdBy,
				updatedBy,
				deletedBy,
				createdAt,
				updatedAt,
				deletedAt,
				requestType: getCreditApplicationRequestType(deletedAt, createdAt, updatedAt),
				status: getCreditApplicationHistoryStatusLabel(reviewedAt, version.reviewApproved ?? null),
				reviewedAt,
				reviewedBy,
				reviewApproved: version.reviewApproved ?? null,
				reviewComment: version.reviewComment as ReviewCommentValue | null
			};
		});

	const entries = snapshotsMaybe.filter((snapshot): snapshot is CreditApplicationRequestHistoryEntry => snapshot != null);

	return {
		requestId: creditApplicationId,
		entries,
		relations
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
	const collateralDescription = input.collateralDescription;
	const assetId = normalizeOptionalTextValue(input.assetId);
	const assetName = normalizeOptionalTextValue(input.assetName);
	const assetDescription = input.assetDescription;
	const period = normalizeCreditApplicationNumberValue(input.period);
	const installment = normalizeCreditApplicationNumberValue(input.installment);
	const downPayment = normalizeCreditApplicationNumberValue(input.downPayment);
	const plafond = normalizeCreditApplicationNumberValue(input.plafond);
	const vendor = normalizeOptionalTextValue(input.vendor);
	const remarks = input.remarks;
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
		collateralDescription: collateralDescription,
		assetId,
		assetName,
		assetDescription: assetDescription,
		period,
		installment,
		downPayment,
		plafond,
		vendor,
		remarks: remarks,
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
		const created = await payload.create({
			user,
			collection: "credit-applications",
			overrideAccess: true,
			draft: true,
			data: {
				import: undefined,
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
		draft: true,
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
		draft: true,
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
				import: true,
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

		return { creditApplicationId, softDeleted: true };
	}

	const approvedDeletedBy = getRelationshipId(approvedVersion.deletedBy);
	const approvedReviewedBy = getRelationshipId(approvedVersion.reviewedBy);
	const approvedEmail = normalizeOptionalTextValue(approvedVersion.email);
	const approvedAddresses = normalizeCreditApplicationMenuValues(approvedVersion.addresses);
	const approvedPhoneNumbers = normalizeCreditApplicationMenuValues(approvedVersion.phoneNumbers);
	const approvedWhatsappNumber = normalizeOptionalTextValue(approvedVersion.whatsappNumber);
	const approvedCollateralDescription = approvedVersion.collateralDescription;
	const approvedAssetDescription = approvedVersion.assetDescription;
	const approvedRemarks = approvedVersion.remarks;

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
			collateralDescription: approvedCollateralDescription,
			assetId: normalizeOptionalTextValue(approvedVersion.assetId),
			assetName: normalizeOptionalTextValue(approvedVersion.assetName),
			assetDescription: approvedAssetDescription,
			period: normalizeCreditApplicationNumberValue(approvedVersion.period),
			installment: normalizeCreditApplicationNumberValue(approvedVersion.installment),
			downPayment: normalizeCreditApplicationNumberValue(approvedVersion.downPayment),
			plafond: normalizeCreditApplicationNumberValue(approvedVersion.plafond),
			vendor: normalizeOptionalTextValue(approvedVersion.vendor),
			remarks: approvedRemarks,
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
		draft: true,
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
		draft: true,
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
			draft: true,
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

	const requestedVersions = await payload.findVersions({
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
				{ "version._status": { equals: "draft" } }
			]
		},
		select: {
			version: {
				import: true,
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
				import: true,
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

	const requestedVersion = requestedVersions.docs[0]?.version;
	const approvedVersion = approvedVersions.docs[0]?.version;
	if(requestedVersion == null)
		throw new Error("Draft credit application request could not be found.");

	const requestedImportId = getRelationshipId(requestedVersion.import);
	const approvedImportId = getRelationshipId(approvedVersion?.import);
	const relationImportIds = [approvedImportId, requestedImportId]
		.filter((value): value is string => value != null);
	const importsById = await findImportsByIds(payload, user, relationImportIds);
	const relations: CreditApplicationRelationValues = {};
	for(const [id, relationImport] of importsById)
		relations[`imports:${id}`] = relationImport;

	return {
		requestId: creditApplicationId,
		requestType: requestedVersion.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update",
		import: [approvedImportId ?? requestedImportId, requestedImportId],
		name: [approvedVersion?.name ?? requestedVersion.name, requestedVersion.name],
		email: [approvedVersion?.email ?? requestedVersion.email, requestedVersion.email],
		addresses: [approvedVersion?.addresses ?? requestedVersion.addresses, requestedVersion.addresses],
		phoneNumbers: [approvedVersion?.phoneNumbers ?? requestedVersion.phoneNumbers, requestedVersion.phoneNumbers],
		whatsappNumber: [approvedVersion?.whatsappNumber ?? requestedVersion.whatsappNumber, requestedVersion.whatsappNumber],
		smsNumber: [approvedVersion?.smsNumber ?? requestedVersion.smsNumber, requestedVersion.smsNumber],
		collateralRegistryName: [approvedVersion?.collateralRegistryName ?? requestedVersion.collateralRegistryName, requestedVersion.collateralRegistryName],
		collateralName: [approvedVersion?.collateralName ?? requestedVersion.collateralName, requestedVersion.collateralName],
		collateralDescription: [approvedVersion?.collateralDescription ?? requestedVersion.collateralDescription, requestedVersion.collateralDescription],
		assetId: [approvedVersion?.assetId ?? requestedVersion.assetId, requestedVersion.assetId],
		assetName: [approvedVersion?.assetName ?? requestedVersion.assetName, requestedVersion.assetName],
		assetDescription: [approvedVersion?.assetDescription ?? requestedVersion.assetDescription, requestedVersion.assetDescription],
		period: [approvedVersion?.period ?? requestedVersion.period, requestedVersion.period],
		installment: [approvedVersion?.installment ?? requestedVersion.installment, requestedVersion.installment],
		downPayment: [approvedVersion?.downPayment ?? requestedVersion.downPayment, requestedVersion.downPayment],
		plafond: [approvedVersion?.plafond ?? requestedVersion.plafond, requestedVersion.plafond],
		vendor: [approvedVersion?.vendor ?? requestedVersion.vendor, requestedVersion.vendor],
		remarks: [approvedVersion?.remarks ?? requestedVersion.remarks, requestedVersion.remarks],
		otherText1: [approvedVersion?.otherText1 ?? requestedVersion.otherText1, requestedVersion.otherText1],
		otherText2: [approvedVersion?.otherText2 ?? requestedVersion.otherText2, requestedVersion.otherText2],
		otherNumber1: [approvedVersion?.otherNumber1 ?? requestedVersion.otherNumber1, requestedVersion.otherNumber1],
		otherNumber2: [approvedVersion?.otherNumber2 ?? requestedVersion.otherNumber2, requestedVersion.otherNumber2],
		otherDate1: [approvedVersion?.otherDate1 ?? requestedVersion.otherDate1, requestedVersion.otherDate1],
		otherDate2: [approvedVersion?.otherDate2 ?? requestedVersion.otherDate2, requestedVersion.otherDate2],
		others: [approvedVersion?.others ?? requestedVersion.others, requestedVersion.others],
		deletedAt: [approvedVersion?.deletedAt ?? requestedVersion.deletedAt, requestedVersion.deletedAt],
		relations
	};
}
