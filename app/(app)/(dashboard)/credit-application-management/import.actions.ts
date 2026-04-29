"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";

import payloadConfig from "@payload-config";
import ExcelJS from "@/utils/exceljs";
import type { RelationUser } from "@/utils/requestRelationValues";
import { createPlainTextRichText } from "@/utils/reviewCommentRichText";
import type { CreditApplicationImport } from "@/payload-types";

import {
	resolveManagementRootHref,
	resolveManagementModeRedirectHrefAction as resolveDashboardManagementModeRedirectHrefAction
} from "../layout.actions";

const creditApplicationImportTemplateColumns = [
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
	"others"
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const RELATION_SEARCH_LIMIT = 20;

type RichTextValue = NonNullable<CreditApplicationImport["description"]>;
type CreditApplicationImportReviewCommentValue = NonNullable<CreditApplicationImport["reviewComment"]>;
type CreditApplicationImportDescriptionValue = NonNullable<CreditApplicationImport["description"]>;

export type ParsedCreditApplicationImportRow = {
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
	others: { [key: string]: unknown } | unknown[] | string | number | boolean | null;
};

export type CreditApplicationImportStatus = "pending" | "approved" | "rejected";
export type CreditApplicationImportMode = "import-viewer" | "import-editor" | "import-approver";

export type CreditApplicationImportSortField = "id" |
	"filename" |
	"mimeType" |
	"filesize" |
	"createdAt" |
	"updatedAt" |
	"deletedAt" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved";
export type CreditApplicationImportSortToken = `${"+" | "-"}${CreditApplicationImportSortField}`;
export type CreditApplicationImportFilterColumn = "id" |
	"filename" |
	"mimeType" |
	"filesize" |
	"createdBy" |
	"updatedBy" |
	"deletedBy" |
	"createdAt" |
	"updatedAt" |
	"deletedAt" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved" |
	"status";
export type CreditApplicationImportFilterOperator = "equals" |
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
export type CreditApplicationImportFilterCombinator = "and" | "or";
export type CreditApplicationImportFilterInput = {
	column: CreditApplicationImportFilterColumn;
	operator: CreditApplicationImportFilterOperator;
	value?: string | number | Array<string | number | boolean> | boolean | null;
	joinWithPrevious?: CreditApplicationImportFilterCombinator;
};

export type QueryCreditApplicationImportsInput = {
	keyword?: string;
	sort?: string[];
	filters?: CreditApplicationImportFilterInput[];
	filterCombinator?: CreditApplicationImportFilterCombinator;
	page?: number;
	limit?: number;
	includeSoftDeleted?: boolean;
};

export type CreditApplicationImportTableRow = {
	id: string;
	filename: string;
	mimeType: string;
	filesize: number;
	fileUrl: string | null;
	description: RichTextValue | null;
	status: CreditApplicationImportStatus;
	createdBy: string | null;
	updatedBy: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	deletedBy: string | null;
	reviewedAt: string | null;
	reviewedBy: string | null;
	reviewApproved: boolean | null;
	reviewComment: CreditApplicationImportReviewCommentValue | null;
};

export type CreditApplicationImportRelationValues = Partial<Record<`users:${string}`, RelationUser>>;

export type CreditApplicationImportRequestDetailsOutput = {
	row: CreditApplicationImportTableRow;
	relations: CreditApplicationImportRelationValues;
};

export type CreditApplicationImportFilterUserOption = {
	id: string;
	name: string;
	email: string;
};

export type CreditApplicationImportFilterIdOption = {
	id: string;
	filename: string;
	mimeType: string;
};

export type QueryCreditApplicationImportsOutput = {
	docs: CreditApplicationImportTableRow[];
	relations: CreditApplicationImportRelationValues;
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type CreateCreditApplicationImportOutput = {
	importId: string;
	parsedRowCount: number;
};

export type CreditApplicationImportPreviewOutput = {
	rowCount: number;
	rows: ParsedCreditApplicationImportRow[];
};

export type ReviewCreditApplicationImportInput = {
	importId: string;
	decision: "approve" | "reject";
	reviewComment: CreditApplicationImportReviewCommentValue;
};

export type UpdateCreditApplicationImportDescriptionInput = {
	importId: string;
	description?: RichTextValue;
};

type AuthContext = {
	payload: Payload;
	user: any;
	requestHeaders: Awaited<ReturnType<typeof nextHeaders>>;
};

function normalizePage(page: number | undefined): number {
	if(page == null || !Number.isFinite(page))
		return DEFAULT_PAGE;
	return Math.max(1, Math.floor(page));
}

function normalizeLimit(limit: number | undefined): number {
	if(limit == null || !Number.isFinite(limit))
		return DEFAULT_LIMIT;
	return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

function normalizeKeyword(keyword: string | undefined): string {
	return (keyword ?? "").trim();
}

function normalizeDescriptionText(value: string | undefined): string {
	return (value ?? "").trim();
}

function normalizeSortTokens(sortTokens: string[] | undefined): CreditApplicationImportSortToken[] {
	if(!Array.isArray(sortTokens))
		return ["-updatedAt"];

	const sortFields = new Set<CreditApplicationImportSortField>([
		"id",
		"filename",
		"mimeType",
		"filesize",
		"createdAt",
		"updatedAt",
		"deletedAt",
		"reviewedAt",
		"reviewedBy",
		"reviewApproved"
	]);

	const normalized = sortTokens
		.filter((value): value is CreditApplicationImportSortToken => typeof value == "string" && value.length > 1 && (value.startsWith("+") || value.startsWith("-")))
		.filter(value => sortFields.has(value.slice(1) as CreditApplicationImportSortField));

	if(normalized.length == 0)
		return ["-updatedAt"];

	return normalized;
}

function normalizeImportFilterCombinator(value: CreditApplicationImportFilterCombinator | undefined): CreditApplicationImportFilterCombinator {
	return value == "or" ? "or" : "and";
}

function normalizeSelectedIds(selectedIds: string[] = []): string[] {
	return [...new Set(
		selectedIds
			.map(selectedId => selectedId.trim())
			.filter(selectedId => selectedId.length > 0)
	)];
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

function plainTextToRichText(value: string): CreditApplicationImportDescriptionValue {
	return createPlainTextRichText(value);
}

function splitMultivalueText(value: string): string[] {
	return value
		.split(/\r?\n/g)
		.map(item => item.trim())
		.filter(item => item.length > 0);
}

function normalizeOptionalText(value: string): string {
	return value.trim();
}

function normalizeOptionalNumber(value: string, fieldLabel: string, rowNumber: number): number | null {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const parsed = Number(trimmed);
	if(Number.isNaN(parsed))
		throw new Error(`Row ${rowNumber}: '${fieldLabel}' must be a valid number.`);
	return parsed;
}

function excelSerialDateToISOString(serial: number): string | null {
	if(!Number.isFinite(serial))
		return null;
	const unixTimeMilliseconds = Math.round((serial - 25569) * 86400 * 1000);
	const date = new Date(unixTimeMilliseconds);
	if(Number.isNaN(date.getTime()))
		return null;
	return date.toISOString();
}

function normalizeOptionalDate(value: string, fieldLabel: string, rowNumber: number): string | null {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const numeric = Number(trimmed);
	if(!Number.isNaN(numeric))
		return excelSerialDateToISOString(numeric);
	const date = new Date(trimmed);
	if(Number.isNaN(date.getTime()))
		throw new Error(`Row ${rowNumber}: '${fieldLabel}' must be a valid date.`);
	return date.toISOString();
}

function normalizeOthersValue(value: string): ParsedCreditApplicationImportRow["others"] {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;

	try {
		return JSON.parse(trimmed) as ParsedCreditApplicationImportRow["others"];
	} catch{
		return trimmed;
	}
}

function resolveCellText(value: ExcelJS.CellValue): string {
	if(value == null)
		return "";

	if(typeof value == "string")
		return value;
	if(typeof value == "number")
		return String(value);
	if(typeof value == "boolean")
		return value ? "true" : "false";
	if(value instanceof Date)
		return value.toISOString();
	if(Array.isArray(value))
		return value.map(item => resolveCellText(item)).join("");

	if(typeof value == "object") {
		if("text" in value && typeof value.text == "string")
			return value.text;
		if("result" in value && value.result != null)
			return resolveCellText(value.result);
	}

	return "";
}

function mapRowToCreditApplicationImport(rowData: Record<string, string>, rowNumber: number): ParsedCreditApplicationImportRow {
	const name = normalizeOptionalText(rowData.name);
	const addresses = splitMultivalueText(rowData.addresses);
	const phoneNumbers = splitMultivalueText(rowData.phoneNumbers);
	const whatsappNumber = normalizeOptionalText(rowData.whatsappNumber);

	if(name.length == 0)
		throw new Error(`Row ${rowNumber}: 'name' is required.`);
	if(addresses.length == 0)
		throw new Error(`Row ${rowNumber}: 'addresses' must contain at least one value.`);
	if(phoneNumbers.length == 0)
		throw new Error(`Row ${rowNumber}: 'phoneNumbers' must contain at least one value.`);
	if(whatsappNumber.length == 0)
		throw new Error(`Row ${rowNumber}: 'whatsappNumber' is required.`);

	return {
		name,
		email: normalizeOptionalText(rowData.email),
		addresses,
		phoneNumbers,
		whatsappNumber,
		smsNumber: normalizeOptionalText(rowData.smsNumber),
		collateralRegistryName: normalizeOptionalText(rowData.collateralRegistryName),
		collateralName: normalizeOptionalText(rowData.collateralName),
		collateralDescription: normalizeOptionalText(rowData.collateralDescription),
		assetId: normalizeOptionalText(rowData.assetId),
		assetName: normalizeOptionalText(rowData.assetName),
		assetDescription: normalizeOptionalText(rowData.assetDescription),
		period: normalizeOptionalNumber(rowData.period, "period", rowNumber),
		installment: normalizeOptionalNumber(rowData.installment, "installment", rowNumber),
		downPayment: normalizeOptionalNumber(rowData.downPayment, "downPayment", rowNumber),
		plafond: normalizeOptionalNumber(rowData.plafond, "plafond", rowNumber),
		vendor: normalizeOptionalText(rowData.vendor),
		remarks: normalizeOptionalText(rowData.remarks),
		otherText1: normalizeOptionalText(rowData.otherText1),
		otherText2: normalizeOptionalText(rowData.otherText2),
		otherNumber1: normalizeOptionalNumber(rowData.otherNumber1, "otherNumber1", rowNumber),
		otherNumber2: normalizeOptionalNumber(rowData.otherNumber2, "otherNumber2", rowNumber),
		otherDate1: normalizeOptionalDate(rowData.otherDate1, "otherDate1", rowNumber),
		otherDate2: normalizeOptionalDate(rowData.otherDate2, "otherDate2", rowNumber),
		others: normalizeOthersValue(rowData.others)
	};
}

async function parseExcelCreditApplicationImportRows(fileBuffer: ArrayBuffer): Promise<ParsedCreditApplicationImportRow[]> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(fileBuffer);

	const worksheet = workbook.worksheets[0];
	if(worksheet == null)
		throw new Error("The uploaded workbook does not contain any worksheet.");

	const TEMPLATE_DATA_START_ROW = 5;

	const parsedRows: ParsedCreditApplicationImportRow[] = [];

	for(let rowNumber = TEMPLATE_DATA_START_ROW; rowNumber <= worksheet.rowCount; rowNumber++) {
		const worksheetRow = worksheet.getRow(rowNumber);
		if(worksheetRow == null)
			continue;

		const rowData = {} as Record<string, string>;

		for(let columnIndex = 0; columnIndex < creditApplicationImportTemplateColumns.length; columnIndex++) {
			const templateColumn = creditApplicationImportTemplateColumns[columnIndex];
			const columnNumber = columnIndex + 1;
			const rawValue = resolveCellText(worksheetRow.getCell(columnNumber).value).trim();
			rowData[templateColumn] = rawValue;
		}

		parsedRows.push(mapRowToCreditApplicationImport(rowData, rowNumber));
	}

	if(parsedRows.length == 0)
		throw new Error("The uploaded template contains no data rows.");

	return parsedRows;
}

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function resolveImportStatus(reviewedAt: string | null | undefined, reviewApproved: boolean | null | undefined): CreditApplicationImportStatus {
	if(reviewedAt == null)
		return "pending";
	return reviewApproved == true ? "approved" : "rejected";
}

function parseBooleanLike(value: unknown): boolean | null {
	if(typeof value == "boolean")
		return value;
	if(typeof value == "number")
		return value == 1 ? true : value == 0 ? false : null;
	if(typeof value != "string")
		return null;
	const normalized = value.trim().toLowerCase();
	if(["true", "1", "yes", "y"].includes(normalized))
		return true;
	if(["false", "0", "no", "n"].includes(normalized))
		return false;
	return null;
}

function normalizeFilterRawValues(value: CreditApplicationImportFilterInput["value"]): Array<string | number | boolean> {
	if(Array.isArray(value))
		return value.filter((item): item is string | number | boolean => typeof item == "string" || typeof item == "number" || typeof item == "boolean");
	if(value == null)
		return [];
	if(typeof value == "string") {
		const trimmed = value.trim();
		if(trimmed.length == 0)
			return [];
		return [trimmed];
	}
	if(typeof value == "number" || typeof value == "boolean")
		return [value];
	return [];
}

function resolveFilterField(column: CreditApplicationImportFilterColumn): string | null {
	if(column == "status")
		return null;
	if(column == "reviewApproved")
		return "reviewApproved";
	return column;
}

function buildStatusFilterWhere(operator: CreditApplicationImportFilterOperator, rawValues: Array<string | number | boolean>): Where | null {
	const normalizeStatusValue = (value: string | number | boolean): CreditApplicationImportStatus | null => {
		if(typeof value != "string")
			return null;
		const normalized = value.trim().toLowerCase();
		if(normalized == "pending" || normalized == "approved" || normalized == "rejected")
			return normalized;
		return null;
	};

	const toStatusWhere = (status: CreditApplicationImportStatus): Where => {
		if(status == "pending")
			return { reviewedAt: { exists: false } };
		if(status == "approved")
			return { and: [{ reviewedAt: { exists: true } }, { reviewApproved: { equals: true } }] };
		return { and: [{ reviewedAt: { exists: true } }, { reviewApproved: { equals: false } }] };
	};

	if(operator == "exists") {
		const existsValue = parseBooleanLike(rawValues[0]);
		if(existsValue == null)
			return null;
		return existsValue ? { reviewedAt: { exists: true } } : { reviewedAt: { exists: false } };
	}

	const statusValues = rawValues
		.map(normalizeStatusValue)
		.filter((value): value is CreditApplicationImportStatus => value != null);
	if(statusValues.length == 0)
		return null;
	const allStatuses: CreditApplicationImportStatus[] = ["pending", "approved", "rejected"];

	if(operator == "equals")
		return toStatusWhere(statusValues[0]);
	if(operator == "not_equals") {
		const remainingStatuses = allStatuses.filter(status => status != statusValues[0]);
		if(remainingStatuses.length == 1)
			return toStatusWhere(remainingStatuses[0]);
		return { or: remainingStatuses.map(toStatusWhere) };
	}
	if(operator == "in")
		return { or: statusValues.map(toStatusWhere) };
	if(operator == "not_in") {
		const excluded = new Set(statusValues);
		const remainingStatuses = allStatuses.filter(status => !excluded.has(status));
		if(remainingStatuses.length == 0)
			return null;
		if(remainingStatuses.length == 1)
			return toStatusWhere(remainingStatuses[0]);
		return { or: remainingStatuses.map(toStatusWhere) };
	}
	return null;
}

function buildImportFilterWhere(filter: CreditApplicationImportFilterInput): Where | null {
	const rawValues = normalizeFilterRawValues(filter.value);
	if(filter.column == "status")
		return buildStatusFilterWhere(filter.operator, rawValues);

	const field = resolveFilterField(filter.column);
	if(field == null)
		return null;

	if(filter.operator == "exists") {
		const existsValue = parseBooleanLike(rawValues[0]);
		if(existsValue == null)
			return null;
		return { [field]: { exists: existsValue } };
	}

	if(filter.column == "reviewApproved") {
		if(filter.operator == "in" || filter.operator == "not_in") {
			const boolValues = rawValues
				.map(item => parseBooleanLike(item))
				.filter((item): item is boolean => item != null);
			if(boolValues.length == 0)
				return null;
			return { [field]: { [filter.operator]: [...new Set(boolValues)] } };
		}

		const boolValue = parseBooleanLike(rawValues[0]);
		if(boolValue == null)
			return null;
		if(filter.operator == "equals" || filter.operator == "not_equals")
			return { [field]: { [filter.operator]: boolValue } };
		return null;
	}

	if(filter.operator == "in" || filter.operator == "not_in") {
		if(rawValues.length == 0)
			return null;
		return { [field]: { [filter.operator]: rawValues } };
	}

	const firstValue = rawValues[0];
	if(firstValue == null)
		return null;

	if(filter.operator == "contains" || filter.operator == "not_contains") {
		const textValue = String(firstValue).trim();
		if(textValue.length == 0)
			return null;
		return { [field]: { [filter.operator == "contains" ? "like" : "not_like"]: textValue } };
	}

	if(filter.operator == "equals" || filter.operator == "not_equals" || filter.operator == "greater_than" || filter.operator == "less_than" || filter.operator == "greater_than_equal" || filter.operator == "less_than_equal")
		return { [field]: { [filter.operator]: firstValue } };

	return null;
}

function toPayloadImportWhere(
	keyword: string,
	pendingOnly: boolean,
	includeSoftDeleted: boolean,
	filters: CreditApplicationImportFilterInput[] = [],
	filterCombinator: CreditApplicationImportFilterCombinator = "and"
): Where | undefined {
	const whereTerms: Where[] = [];
	if(keyword.length > 0) {
		whereTerms.push({
			or: [
				{ filename: { like: keyword } },
				{ id: { like: keyword } },
				{ mimeType: { like: keyword } }
			]
		});
	}
	if(pendingOnly)
		whereTerms.push({ reviewedAt: { exists: false } });
	if(pendingOnly || !includeSoftDeleted)
		whereTerms.push({ deletedAt: { exists: false } });

	const filterTerms = filters
		.map(buildImportFilterWhere)
		.filter((term): term is Where => term != null);
	if(filterTerms.length > 0)
		whereTerms.push(filterCombinator == "or" ? { or: filterTerms } : { and: filterTerms });

	if(whereTerms.length == 0)
		return undefined;
	if(whereTerms.length == 1)
		return whereTerms[0];
	return { and: whereTerms };
}

function resolveUploadedMimeType(fileName: string, providedType: string): string {
	const normalizedProvidedType = providedType.trim();
	if(normalizedProvidedType.length > 0)
		return normalizedProvidedType;
	if(fileName.toLowerCase().endsWith(".xlsx"))
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
	if(fileName.toLowerCase().endsWith(".xls"))
		return "application/vnd.ms-excel";
	return "application/octet-stream";
}

function resolveImportDownloadHref(filename: string | null | undefined): string | null {
	if(typeof filename != "string")
		return null;
	const trimmed = filename.trim();
	if(trimmed.length == 0)
		return null;
	return `/api/credit-application-imports/file/${encodeURIComponent(trimmed)}`;
}

async function parseExcelRowsFromImportFile(
	fileUrl: string,
	requestHeaders: Awaited<ReturnType<typeof nextHeaders>>
): Promise<ParsedCreditApplicationImportRow[]> {
	let response: Response;
	try {
		response = await fetch(new URL(fileUrl, `http://localhost:${process.env.PORT}`), {
			cache: "no-store",
			headers: requestHeaders.has("cookie") ? { cookie: requestHeaders.get("cookie")! } : undefined
		});
	} catch(error) {
		const errorMessage = error instanceof Error ? error.message : "Network error.";
		throw new Error(`Unable to fetch uploaded import file. ${errorMessage}`, { cause: error });
	}

	if(!response.ok)
		throw new Error(`Unable to fetch uploaded import file. HTTP ${response.status}.`);

	const fileBuffer = await response.arrayBuffer();
	if(fileBuffer.byteLength == 0)
		throw new Error("Unable to fetch uploaded import file. File is empty.");

	return parseExcelCreditApplicationImportRows(fileBuffer);
}

async function getAuthContext(): Promise<AuthContext> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();
	return { payload, user, requestHeaders: headers };
}

async function queryCreditApplicationImportsService(
	context: AuthContext,
	input: QueryCreditApplicationImportsInput,
	options: { pendingOnly: boolean }
): Promise<QueryCreditApplicationImportsOutput> {
	const page = normalizePage(input.page);
	const limit = normalizeLimit(input.limit);
	const keyword = normalizeKeyword(input.keyword);
	const normalizedSort = normalizeSortTokens(input.sort);
	const normalizedFilterCombinator = normalizeImportFilterCombinator(input.filterCombinator);
	const includeSoftDeleted = input.includeSoftDeleted == true;

	const result = await context.payload.find({
		collection: "credit-application-imports",
		user: context.user,
		overrideAccess: true,
		draft: true,
		trash: true,
		depth: 0,
		page,
		limit,
		sort: normalizedSort,
		where: toPayloadImportWhere(keyword, options.pendingOnly, includeSoftDeleted, input.filters, normalizedFilterCombinator),
		select: {
			id: true,
			filename: true,
			mimeType: true,
			filesize: true,
			description: true,
			createdBy: true,
			updatedBy: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
			deletedBy: true,
			reviewedAt: true,
			reviewedBy: true,
			reviewApproved: true,
			reviewComment: true
		}
	});

	const mappedRows = result.docs.map(doc => {
		const description = doc.description ?? null;
		const createdBy = getRelationshipId(doc.createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		const deletedAt = typeof doc.deletedAt == "string" ? doc.deletedAt : null;
		const reviewedAt = typeof doc.reviewedAt == "string" ? doc.reviewedAt : null;
		const reviewApproved = typeof doc.reviewApproved == "boolean" ? doc.reviewApproved : null;
		return {
			id: String(doc.id),
			filename: typeof doc.filename == "string" ? doc.filename : "(unknown)",
			mimeType: typeof doc.mimeType == "string" ? doc.mimeType : "application/octet-stream",
			filesize: typeof doc.filesize == "number" ? doc.filesize : 0,
			fileUrl: resolveImportDownloadHref(typeof doc.filename == "string" ? doc.filename : null),
			description,
			status: resolveImportStatus(reviewedAt, reviewApproved),
			createdBy,
			updatedBy,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			deletedAt,
			deletedBy: getRelationshipId(doc.deletedBy),
			reviewedAt,
			reviewedBy: getRelationshipId(doc.reviewedBy),
			reviewApproved: reviewApproved,
			reviewComment: doc.reviewComment ?? null
		};
	});

	const userIds = new Set<string>();
	for(const doc of result.docs) {
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

	const usersById = await findUsersByIds(context.payload, context.user, [...userIds]);
	const relations: CreditApplicationImportRelationValues = {};
	for(const [id, relationUser] of usersById)
		relations[`users:${id}`] = relationUser;

	return {
		docs: mappedRows,
		relations,
		totalDocs: result.totalDocs,
		page: result.page ?? page,
		hasNextPage: result.hasNextPage,
		hasPreviousPage: result.hasPrevPage
	};
}

export async function resolveCreditApplicationImportModeRedirectHrefAction(mode: CreditApplicationImportMode): Promise<string | null> {
	return resolveDashboardManagementModeRedirectHrefAction("credit-application-management", mode);
}

export async function resolveCreditApplicationImportRootHrefAction(): Promise<string> {
	return resolveManagementRootHref("credit-application-management");
}

export async function queryCreditApplicationImportViewerAction(input: QueryCreditApplicationImportsInput): Promise<QueryCreditApplicationImportsOutput> {
	const context = await getAuthContext();
	return queryCreditApplicationImportsService(context, input, { pendingOnly: false });
}

export async function queryCreditApplicationImportEditorAction(input: QueryCreditApplicationImportsInput): Promise<QueryCreditApplicationImportsOutput> {
	const context = await getAuthContext();
	return queryCreditApplicationImportsService(context, input, { pendingOnly: false });
}

export async function queryCreditApplicationImportApproverAction(input: QueryCreditApplicationImportsInput): Promise<QueryCreditApplicationImportsOutput> {
	const context = await getAuthContext();
	return queryCreditApplicationImportsService(context, input, { pendingOnly: true });
}

export async function getCreditApplicationImportRequestDetailsAction(importIdInput: string): Promise<CreditApplicationImportRequestDetailsOutput> {
	const context = await getAuthContext();
	const importId = importIdInput.trim();
	if(importId.length == 0)
		throw new Error("Import id is required.");

	const doc = await context.payload.findByID({
		collection: "credit-application-imports",
		id: importId,
		user: context.user,
		overrideAccess: true,
		depth: 0,
		draft: true,
		trash: true,
		select: {
			id: true,
			filename: true,
			mimeType: true,
			filesize: true,
			description: true,
			createdBy: true,
			updatedBy: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
			deletedBy: true,
			reviewedAt: true,
			reviewedBy: true,
			reviewApproved: true,
			reviewComment: true
		}
	});

	const createdBy = getRelationshipId(doc.createdBy);
	const updatedBy = getRelationshipId(doc.updatedBy);
	const deletedBy = getRelationshipId(doc.deletedBy);
	const reviewedBy = getRelationshipId(doc.reviewedBy);
	const deletedAt = typeof doc.deletedAt == "string" ? doc.deletedAt : null;
	const reviewedAt = typeof doc.reviewedAt == "string" ? doc.reviewedAt : null;
	const reviewApproved = typeof doc.reviewApproved == "boolean" ? doc.reviewApproved : null;

	const row: CreditApplicationImportTableRow = {
		id: String(doc.id),
		filename: typeof doc.filename == "string" ? doc.filename : "(unknown)",
		mimeType: typeof doc.mimeType == "string" ? doc.mimeType : "application/octet-stream",
		filesize: typeof doc.filesize == "number" ? doc.filesize : 0,
		fileUrl: resolveImportDownloadHref(typeof doc.filename == "string" ? doc.filename : null),
		description: doc.description ?? null,
		status: resolveImportStatus(reviewedAt, reviewApproved),
		createdBy,
		updatedBy,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
		deletedAt,
		deletedBy,
		reviewedAt,
		reviewedBy,
		reviewApproved,
		reviewComment: doc.reviewComment ?? null
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
	const usersById = await findUsersByIds(context.payload, context.user, [...relationUserIds]);

	const relations: CreditApplicationImportRelationValues = {};
	if(row.reviewedBy != null) {
		const relation = usersById.get(row.reviewedBy);
		if(relation != null)
			relations[`users:${row.reviewedBy}`] = relation;
	}
	if(row.createdBy != null) {
		const relation = usersById.get(row.createdBy);
		if(relation != null)
			relations[`users:${row.createdBy}`] = relation;
	}
	if(row.updatedBy != null) {
		const relation = usersById.get(row.updatedBy);
		if(relation != null)
			relations[`users:${row.updatedBy}`] = relation;
	}
	if(row.deletedBy != null) {
		const relation = usersById.get(row.deletedBy);
		if(relation != null)
			relations[`users:${row.deletedBy}`] = relation;
	}
	return {
		row,
		relations
	};
}

export async function searchCreditApplicationImportAuditUserOptionsAction(keyword: string, selectedIds: string[] = []): Promise<CreditApplicationImportFilterUserOption[]> {
	const context = await getAuthContext();
	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ email: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ employeeId: { like: normalizedKeyword } }
	];
	const whereTerms: Where[] = [];
	if(normalizedKeyword.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? undefined : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await context.payload.find({
		collection: "users",
		user: context.user,
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

	const dedupeMap = new Map<string, CreditApplicationImportFilterUserOption>();
	for(const doc of result.docs) {
		dedupeMap.set(String(doc.id), {
			id: String(doc.id),
			name: doc.name,
			email: doc.email
		});
	}

	return [...dedupeMap.values()];
}

export async function searchCreditApplicationImportOptionsAction(keyword: string, selectedIds: string[] = []): Promise<CreditApplicationImportFilterIdOption[]> {
	const context = await getAuthContext();
	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = [
		{ id: { like: normalizedKeyword } },
		{ filename: { like: normalizedKeyword } },
		{ mimeType: { like: normalizedKeyword } }
	];
	const whereTerms: Where[] = [];
	if(normalizedKeyword.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? undefined : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await context.payload.find({
		collection: "credit-application-imports",
		user: context.user,
		overrideAccess: true,
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
		id: doc.id,
		filename: doc.filename!,
		mimeType: doc.mimeType!
	}));
}

export async function createCreditApplicationImportAction(formData: FormData): Promise<CreateCreditApplicationImportOutput> {
	const context = await getAuthContext();

	const fileValue = formData.get("file");
	if(!(fileValue instanceof File))
		throw new Error("Please provide a valid Excel file.");

	const fileName = fileValue.name.trim();
	if(fileName.length == 0)
		throw new Error("Import file name is required.");

	const fileBuffer = await fileValue.arrayBuffer();
	if(fileBuffer.byteLength == 0)
		throw new Error("Import file is empty.");
	const description = JSON.parse(typeof formData.get("description") == "string" ? String(formData.get("description")) : "null");

	const parsedRows = await parseExcelCreditApplicationImportRows(fileBuffer);
	const mimeType = resolveUploadedMimeType(fileName, fileValue.type);

	const createdImport = await context.payload.create({
		collection: "credit-application-imports",
		user: context.user,
		overrideAccess: true,
		file: {
			name: fileName,
			data: Buffer.from(fileBuffer),
			size: fileBuffer.byteLength,
			mimetype: mimeType
		},
		data: {
			description: description,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});

	return {
		importId: String(createdImport.id),
		parsedRowCount: parsedRows.length
	};
}

export async function parseCreditApplicationImportPreviewAction(formData: FormData): Promise<CreditApplicationImportPreviewOutput> {
	const context = await getAuthContext();
	const importIdInput = typeof formData.get("importId") == "string" ? String(formData.get("importId")) : "";
	const importId = importIdInput.trim();
	const fileValue = formData.get("file");

	let parsedRows: ParsedCreditApplicationImportRow[];
	if(fileValue instanceof File) {
		const fileBuffer = await fileValue.arrayBuffer();
		if(fileBuffer.byteLength == 0)
			throw new Error("Import file is empty.");
		parsedRows = await parseExcelCreditApplicationImportRows(fileBuffer);
	} else {
		if(importId.length == 0)
			throw new Error("Import id is required.");

		const importDoc = await context.payload.findByID({
			collection: "credit-application-imports",
			id: importId,
			user: context.user,
			overrideAccess: true,
			depth: 0,
			trash: true,
			showHiddenFields: true,
			select: {
				filename: true
			}
		});
		if(typeof importDoc.filename != "string" || importDoc.filename.trim().length == 0)
			throw new Error("The selected import does not have a valid uploaded file.");

		const importFileUrl = resolveImportDownloadHref(importDoc.filename);
		if(importFileUrl == null)
			throw new Error("The selected import does not expose a valid file URL.");

		parsedRows = await parseExcelRowsFromImportFile(importFileUrl, context.requestHeaders);
	}

	return {
		rowCount: parsedRows.length,
		rows: parsedRows
	};
}

export async function updateCreditApplicationImportDescriptionAction(input: UpdateCreditApplicationImportDescriptionInput): Promise<{
	importId: string;
	description: RichTextValue | undefined;
}> {
	const context = await getAuthContext();
	const importId = input.importId.trim();
	if(importId.length == 0)
		throw new Error("Import id is required.");

	const description = input.description;
	const importDoc = await context.payload.findByID({
		collection: "credit-application-imports",
		id: importId,
		user: context.user,
		overrideAccess: true,
		depth: 0,
		trash: true,
		showHiddenFields: true
	});

	if(importDoc.reviewedAt != null)
		throw new Error("Cannot edit description after this import is reviewed.");

	await context.payload.update({
		collection: "credit-application-imports",
		id: importId,
		user: context.user,
		overrideAccess: true,
		trash: true,
		data: {
			description: description
		}
	});

	return {
		importId,
		description: description
	};
}

export async function deleteCreditApplicationImportAction(importIdInput: string): Promise<{ importId: string }> {
	const context = await getAuthContext();
	const importId = importIdInput.trim();
	if(importId.length == 0)
		throw new Error("Import id is required.");

	const importDoc = await context.payload.findByID({
		collection: "credit-application-imports",
		id: importId,
		user: context.user,
		overrideAccess: true,
		depth: 0,
		trash: true,
		showHiddenFields: true
	});

	if(importDoc.deletedAt != null)
		throw new Error("Import is already cancelled.");
	if(importDoc.reviewedAt != null && importDoc.reviewApproved == true)
		throw new Error("Cannot cancel an approved import.");

	await context.payload.update({
		collection: "credit-application-imports",
		id: importId,
		user: context.user,
		overrideAccess: true,
		trash: true,
		data: {
			deletedAt: new Date().toISOString(),
			deletedBy: context.user.id
		}
	});

	return { importId };
}

export async function restoreCreditApplicationImportAction(importIdInput: string): Promise<{ importId: string }> {
	const context = await getAuthContext();
	const importId = importIdInput.trim();
	if(importId.length == 0)
		throw new Error("Import id is required.");

	const importDoc = await context.payload.findByID({
		collection: "credit-application-imports",
		id: importId,
		user: context.user,
		overrideAccess: true,
		depth: 0,
		trash: true,
		showHiddenFields: true
	});

	if(importDoc.deletedAt == null)
		throw new Error("Import is not cancelled.");
	if(importDoc.reviewedAt != null && importDoc.reviewApproved == true)
		throw new Error("Approved import cannot be restored.");

	await context.payload.update({
		collection: "credit-application-imports",
		id: importId,
		user: context.user,
		overrideAccess: true,
		trash: true,
		data: {
			deletedAt: null,
			deletedBy: null
		}
	});

	return { importId };
}

export async function reviewCreditApplicationImportAction(input: ReviewCreditApplicationImportInput): Promise<{
	importId: string;
	decision: "approve" | "reject";
	createdCreditApplicationCount?: number;
}> {
	const context = await getAuthContext();
	const importId = input.importId.trim();
	if(importId.length == 0)
		throw new Error("Import id is required.");
	if(input.decision != "approve" && input.decision != "reject")
		throw new Error("Invalid review decision.");

	const importDoc = await context.payload.findByID({
		collection: "credit-application-imports",
		id: importId,
		user: context.user,
		overrideAccess: true,
		depth: 0,
		trash: true,
		showHiddenFields: true
	});

	if(importDoc.reviewedAt != null)
		throw new Error("This import has already been reviewed.");
	if(typeof importDoc.filename != "string" || importDoc.filename.trim().length == 0)
		throw new Error("The selected import does not have a valid uploaded file.");
	if(importDoc.deletedAt != null)
		throw new Error("Cannot review a cancelled import. Restore it first.");

	const now = new Date().toISOString();
	const reviewComment = input.reviewComment;

	if(input.decision == "reject") {
		await context.payload.update({
			collection: "credit-application-imports",
			id: importId,
			user: context.user,
			overrideAccess: true,
			trash: true,
			data: {
				reviewedAt: now,
				reviewedBy: context.user.id,
				reviewApproved: false,
				reviewComment: reviewComment
			}
		});

		return {
			importId,
			decision: "reject"
		};
	}

	const importFileUrl = resolveImportDownloadHref(importDoc.filename);
	if(importFileUrl == null)
		throw new Error("The selected import does not expose a valid file URL.");

	const parsedRows = await parseExcelRowsFromImportFile(importFileUrl, context.requestHeaders);
	if(parsedRows.length == 0)
		throw new Error("The selected import has no parsed rows to publish.");

	for(const row of parsedRows) {
		await context.payload.create({
			collection: "credit-applications",
			user: context.user,
			overrideAccess: true,
			data: {
				_status: "published",
				import: importId,
				name: row.name,
				email: row.email,
				addresses: row.addresses,
				phoneNumbers: row.phoneNumbers,
				whatsappNumber: row.whatsappNumber,
				smsNumber: row.smsNumber,
				collateralRegistryName: row.collateralRegistryName,
				collateralName: row.collateralName,
				collateralDescription: plainTextToRichText(row.collateralDescription),
				assetId: row.assetId,
				assetName: row.assetName,
				assetDescription: plainTextToRichText(row.assetDescription),
				period: row.period,
				installment: row.installment,
				downPayment: row.downPayment,
				plafond: row.plafond,
				vendor: row.vendor,
				remarks: plainTextToRichText(row.remarks),
				otherText1: row.otherText1,
				otherText2: row.otherText2,
				otherNumber1: row.otherNumber1,
				otherNumber2: row.otherNumber2,
				otherDate1: row.otherDate1,
				otherDate2: row.otherDate2,
				others: row.others,
				reviewedAt: now,
				reviewedBy: context.user.id,
				reviewApproved: true,
				reviewComment: createPlainTextRichText("Imported from approved Excel document.")
			}
		});
	}

	await context.payload.update({
		collection: "credit-application-imports",
		id: importId,
		user: context.user,
		overrideAccess: true,
		trash: true,
		data: {
			reviewedAt: now,
			reviewedBy: context.user.id,
			reviewApproved: true,
			reviewComment: reviewComment
		}
	});

	return {
		importId,
		decision: "approve",
		createdCreditApplicationCount: parsedRows.length
	};
}
