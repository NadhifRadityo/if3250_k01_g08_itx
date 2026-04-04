"use server";

import { Buffer } from "node:buffer";
import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import type { User, CreditApplicationImport } from "@/payload-types";

import { getDashboardShellContext, type DashboardRoleMenu } from "../layout.actions";

const PAGE_SIZE = 20;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const allowedUploadMimeTypes = new Set([
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-excel",
	"text/csv",
	"application/csv",
	"application/vnd.ms-excel.sheet.macroEnabled.12"
]);

const creditImportEditorMenu: DashboardRoleMenu = "credit-application-import-editor";

export type CreditApplicationImportSortField = "filename" | "createdAt" | "uploadBy" | "approveName";

export type CreditApplicationImportSortToken = `${"+" | "-"}${CreditApplicationImportSortField}`;

const sortableImportFields = new Set<CreditApplicationImportSortField>(["filename", "createdAt", "uploadBy", "approveName"]);

export type CreditApplicationImportTableRow = {
	id: string;
	filename: string;
	url: string | null;
	createdAt: string;
	uploadByName: string;
	approvedByLabel: string;
	approveName: string;
};

export type QueryCreditApplicationImportsOutput = {
	docs: CreditApplicationImportTableRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type QueryCreditApplicationImportsInput = {
	page: number;
	keyword: string;
	sort: string[];
};

function normalizeImportSortTokens(raw: string[] | undefined): CreditApplicationImportSortToken[] {
	if(raw == null || raw.length == 0)
		return ["-createdAt"];
	const prefixed = raw
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter((token): token is CreditApplicationImportSortToken =>
			sortableImportFields.has(token.slice(1) as CreditApplicationImportSortField)
		);
	const deduplicated = prefixed.filter((token, index, source) =>
		index == source.findIndex(candidate => candidate.slice(1) == token.slice(1))
	);
	if(deduplicated.length == 0)
		return ["-createdAt"];
	return deduplicated;
}

function importSortToPayloadSort(tokens: CreditApplicationImportSortToken[]): string {
	return tokens.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const key = token.slice(1) as CreditApplicationImportSortField;
		const path = key == "uploadBy" ? "createdBy.name" :
			key == "approveName" ? "reviewedBy.name" :
				key;
		return `${direction}${path}`;
	}).join(",");
}

function assertImportEditorAccess(roleMenus: DashboardRoleMenu[]): boolean {
	return roleMenus.includes(creditImportEditorMenu);
}

function pickUserDisplayName(value: string | User | null | undefined): string {
	if(value == null)
		return "—";
	if(typeof value == "string")
		return "—";
	if(typeof value == "object" && typeof value.name == "string" && value.name.trim().length > 0)
		return value.name;
	return "—";
}

function pickUserApprovedByLabel(value: string | User | null | undefined): string {
	if(value == null)
		return "—";
	if(typeof value == "string")
		return "—";
	if(typeof value == "object") {
		if(typeof value.employeeId == "string" && value.employeeId.trim().length > 0)
			return value.employeeId;
		if(typeof value.email == "string" && value.email.trim().length > 0)
			return value.email;
	}
	return "—";
}

function mapImportDoc(doc: CreditApplicationImport): CreditApplicationImportTableRow {
	return {
		id: String(doc.id),
		filename: doc.filename ?? "-",
		url: doc.url ?? null,
		createdAt: doc.createdAt,
		uploadByName: pickUserDisplayName(doc.createdBy),
		approvedByLabel: pickUserApprovedByLabel(doc.reviewedBy),
		approveName: pickUserDisplayName(doc.reviewedBy)
	};
}

export async function queryCreditApplicationImportsEditorAction(
	input: QueryCreditApplicationImportsInput
): Promise<QueryCreditApplicationImportsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const shell = await getDashboardShellContext();
	if(shell == null)
		return unauthorized();
	if(!assertImportEditorAccess(shell.roleMenus))
		return unauthorized();

	const page = input.page < 1 ? 1 : input.page;
	const keyword = input.keyword.trim();
	const where: Where = keyword.length == 0 ? {} : {
		filename: {
			contains: keyword
		}
	};

	const sortTokens = normalizeImportSortTokens(input.sort);
	const sort = importSortToPayloadSort(sortTokens);

	const result = await payload.find({
		collection: "credit-application-imports",
		user,
		overrideAccess: true,
		trash: true,
		where,
		limit: PAGE_SIZE,
		page,
		sort,
		depth: 1
	});

	return {
		docs: result.docs.map(doc => mapImportDoc(doc)),
		totalDocs: result.totalDocs,
		page: result.page ?? page,
		hasNextPage: result.hasNextPage,
		hasPreviousPage: result.hasPrevPage
	};
}

function isAllowedUploadMime(mimeType: string, filename: string): boolean {
	if(allowedUploadMimeTypes.has(mimeType))
		return true;
	const lower = filename.toLowerCase();
	if(lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv"))
		return true;
	return false;
}

export async function uploadCreditApplicationImportAction(formData: FormData): Promise<{ importId: string }> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const shell = await getDashboardShellContext();
	if(shell == null)
		return unauthorized();
	if(!assertImportEditorAccess(shell.roleMenus))
		return unauthorized();

	const rawFile = formData.get("file");
	if(rawFile == null || typeof rawFile != "object")
		throw new Error("No file provided.");

	if(typeof File == "undefined" || !(rawFile instanceof File))
		throw new Error("Invalid file payload.");

	const file = rawFile;
	if(file.size == 0)
		throw new Error("File is empty.");
	if(file.size > MAX_UPLOAD_BYTES)
		throw new Error("File exceeds maximum size (25 MB).");

	const mimeType = file.type.length > 0 ? file.type : "application/octet-stream";
	if(!isAllowedUploadMime(mimeType, file.name))
		throw new Error("Only Excel (.xlsx, .xls) or CSV files are allowed.");

	const buffer = Buffer.from(await file.arrayBuffer());

	const created = await payload.create({
		collection: "credit-application-imports",
		user,
		overrideAccess: true,
		data: {},
		file: {
			data: buffer,
			mimetype: mimeType,
			name: file.name,
			size: file.size
		}
	});

	return { importId: String(created.id) };
}
