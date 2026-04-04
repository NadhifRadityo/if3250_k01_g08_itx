"use server";

import { Buffer } from "node:buffer";
import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import {
	commitTransaction,
	createLocalReq,
	getPayload,
	initTransaction,
	killTransaction,
	type Where
} from "payload";

import payloadConfig from "@payload-config";
import type { User, CreditApplication, CreditApplicationImport } from "@/payload-types";

import { getDashboardShellContext, type DashboardRoleMenu } from "../layout.actions";
import {
	defaultCreditApplicationImportReviewComment,
	formatCreditImportValidationMessagesForUser,
	type CreditApplicationImportReviewComment
} from "./creditApplicationImportUploadPolicy";
import {
	formatRowsForPreview,
	MAX_PREVIEW_DATA_ROWS,
	parseImportSpreadsheetBuffer,
	validateCreditImportParsedSheetForIngest,
	type CreditApplicationIngestCreate
} from "./importSpreadsheet";

const PAGE_SIZE = 20;

const creditImportEditorMenu: DashboardRoleMenu = "credit-application-import-editor";
const creditImportApproverMenu: DashboardRoleMenu = "credit-application-import-approver";

function richTextToPlainText(value: unknown): string {
	if(value == null || typeof value != "object")
		return "";
	const nodes: unknown[] = [];
	const collectNodes = (node: unknown) => {
		if(node == null || typeof node != "object")
			return;
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

function plainTextToReviewComment(value: string | null | undefined): CreditApplicationImportReviewComment {
	const text = (value ?? "").trim();
	if(text.length == 0)
		return defaultCreditApplicationImportReviewComment;
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
	reviewedAt: string | null;
	reviewApproved: boolean | null;
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

export type CreditApplicationReviewedSortField =
	"importFilename" |
	"importUploadedAt" |
	"uploadBy" |
	"assetId" |
	"accountName";

export type CreditApplicationReviewedSortToken = `${"+" | "-"}${CreditApplicationReviewedSortField}`;

const sortableReviewedFields = new Set<CreditApplicationReviewedSortField>([
	"importFilename",
	"importUploadedAt",
	"uploadBy",
	"assetId",
	"accountName"
]);

function normalizeReviewedSortTokens(raw: string[] | undefined): CreditApplicationReviewedSortToken[] {
	if(raw == null || raw.length == 0)
		return ["-importUploadedAt"];
	const prefixed = raw
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter((token): token is CreditApplicationReviewedSortToken =>
			sortableReviewedFields.has(token.slice(1) as CreditApplicationReviewedSortField)
		);
	const deduplicated = prefixed.filter((token, index, source) =>
		index == source.findIndex(candidate => candidate.slice(1) == token.slice(1))
	);
	if(deduplicated.length == 0)
		return ["-importUploadedAt"];
	return deduplicated;
}

function reviewedSortToPayloadSort(tokens: CreditApplicationReviewedSortToken[]): string {
	return tokens.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const key = token.slice(1) as CreditApplicationReviewedSortField;
		const path =
			key == "importFilename" ? "import.filename" :
				key == "importUploadedAt" ? "import.createdAt" :
					key == "uploadBy" ? "import.createdBy.name" :
						key == "accountName" ? "name" :
							key;
		return `${direction}${path}`;
	}).join(",");
}

function assertImportEditorAccess(roleMenus: DashboardRoleMenu[]): boolean {
	return roleMenus.includes(creditImportEditorMenu);
}

function assertImportApproverAccess(roleMenus: DashboardRoleMenu[]): boolean {
	return roleMenus.includes(creditImportApproverMenu);
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
	const reviewedAt = doc.reviewedAt ?? null;
	const reviewApproved = doc.reviewApproved ?? null;
	return {
		id: String(doc.id),
		filename: doc.filename ?? "-",
		url: doc.url ?? null,
		createdAt: doc.createdAt,
		uploadByName: pickUserDisplayName(doc.createdBy),
		approvedByLabel: pickUserApprovedByLabel(doc.reviewedBy),
		approveName: pickUserDisplayName(doc.reviewedBy),
		reviewedAt,
		reviewApproved
	};
}

function buildEditorImportListWhere(keyword: string): Where {
	const nonDeleted: Where = {
		or: [
			{ deletedAt: { exists: false } },
			{ deletedAt: { equals: null } }
		]
	};
	if(keyword.length == 0)
		return nonDeleted;
	return {
		and: [
			nonDeleted,
			{
				filename: {
					contains: keyword
				}
			}
		]
	};
}

function isImportApprovedForEditor(doc: CreditApplicationImport): boolean {
	return doc.reviewedAt != null && doc.reviewApproved == true;
}

function assertImportNotDeleted(doc: CreditApplicationImport): void {
	if(doc.deletedAt != null)
		throw new Error("This upload has been deleted.");
}

export type CreditApplicationImportApproverQueue = "pending" | "reviewed";

export type CreditApplicationImportApproverTableRow = CreditApplicationImportTableRow & {
	reviewCommentText: string;
};

export type CreditApplicationReviewedListingRow = {
	id: string;
	assetId: string;
	importFilename: string;
	importUrl: string | null;
	importUploadedAt: string;
	uploadByName: string;
	accountName: string;
	address1: string;
	address2: string;
};

export type QueryCreditApplicationImportsPendingApproverOutput = {
	docs: CreditApplicationImportApproverTableRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type QueryCreditApplicationImportsPendingApproverInput = {
	page: number;
	keyword: string;
	sort: string[];
};

export type QueryCreditApplicationsReviewedListingOutput = {
	docs: CreditApplicationReviewedListingRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type QueryCreditApplicationsReviewedListingInput = {
	page: number;
	keyword: string;
	sort: string[];
};

function mapImportApproverDoc(doc: CreditApplicationImport): CreditApplicationImportApproverTableRow {
	return {
		...mapImportDoc(doc),
		reviewCommentText: richTextToPlainText(doc.reviewComment)
	};
}

function buildPendingImportApproverWhere(keyword: string): Where {
	const nonDeleted: Where = {
		or: [
			{ deletedAt: { exists: false } },
			{ deletedAt: { equals: null } }
		]
	};
	const clauses: Where[] = [nonDeleted, { reviewedAt: { exists: false } }];
	if(keyword.trim().length > 0) {
		clauses.push({
			filename: {
				contains: keyword.trim()
			}
		});
	}
	return { and: clauses };
}

function isPopulatedCreditApplicationImport(value: string | CreditApplicationImport | null | undefined): value is CreditApplicationImport {
	return value != null && typeof value == "object" && "id" in value;
}

function mapCreditApplicationReviewedListingRow(doc: CreditApplication): CreditApplicationReviewedListingRow {
	const imp = isPopulatedCreditApplicationImport(doc.import) ? doc.import : null;
	const addresses = Array.isArray(doc.addresses) ? doc.addresses : [];
	const storedAssetId = typeof doc.assetId == "string" ? doc.assetId.trim() : "";
	const assetId = storedAssetId.length > 0 ? storedAssetId : String(doc.id);
	return {
		id: String(doc.id),
		assetId,
		importFilename: imp?.filename ?? "-",
		importUrl: imp?.url ?? null,
		importUploadedAt: imp?.createdAt ?? doc.createdAt,
		uploadByName: imp != null ? pickUserDisplayName(imp.createdBy) : "—",
		accountName: doc.name,
		address1: addresses[0] ?? "—",
		address2: addresses[1] ?? "—"
	};
}

function buildReviewedApplicationsWhere(keyword: string): Where {
	const clauses: Where[] = [
		{ "import.reviewApproved": { equals: true } },
		{
			or: [
				{ "import.deletedAt": { exists: false } },
				{ "import.deletedAt": { equals: null } }
			]
		},
		{
			or: [
				{ deletedAt: { exists: false } },
				{ deletedAt: { equals: null } }
			]
		}
	];
	const kw = keyword.trim();
	if(kw.length > 0) {
		clauses.push({
			or: [
				{ name: { contains: kw } },
				{ assetId: { contains: kw } }
			]
		});
	}
	return { and: clauses };
}

export async function queryCreditApplicationImportsPendingApproverAction(
	input: QueryCreditApplicationImportsPendingApproverInput
): Promise<QueryCreditApplicationImportsPendingApproverOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const shell = await getDashboardShellContext();
	if(shell == null)
		return unauthorized();
	if(!assertImportApproverAccess(shell.roleMenus))
		return unauthorized();

	const page = input.page < 1 ? 1 : input.page;
	const sortTokens = normalizeImportSortTokens(input.sort);
	const payloadSort = importSortToPayloadSort(sortTokens);
	const where = buildPendingImportApproverWhere(input.keyword);

	const result = await payload.find({
		collection: "credit-application-imports",
		user,
		overrideAccess: true,
		trash: true,
		where,
		limit: PAGE_SIZE,
		page,
		sort: payloadSort,
		depth: 1
	});

	return {
		docs: result.docs.map(doc => mapImportApproverDoc(doc)),
		totalDocs: result.totalDocs,
		page: result.page ?? page,
		hasNextPage: result.hasNextPage,
		hasPreviousPage: result.hasPrevPage
	};
}

export async function queryCreditApplicationsReviewedListingAction(
	input: QueryCreditApplicationsReviewedListingInput
): Promise<QueryCreditApplicationsReviewedListingOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const shell = await getDashboardShellContext();
	if(shell == null)
		return unauthorized();
	if(!assertImportApproverAccess(shell.roleMenus))
		return unauthorized();

	const page = input.page < 1 ? 1 : input.page;
	const sortTokens = normalizeReviewedSortTokens(input.sort);
	const payloadSort = reviewedSortToPayloadSort(sortTokens);
	const where = buildReviewedApplicationsWhere(input.keyword);

	const result = await payload.find({
		collection: "credit-applications",
		user,
		overrideAccess: true,
		trash: true,
		where,
		limit: PAGE_SIZE,
		page,
		sort: payloadSort,
		depth: 2
	});

	return {
		docs: result.docs.map(doc => mapCreditApplicationReviewedListingRow(doc)),
		totalDocs: result.totalDocs,
		page: result.page ?? page,
		hasNextPage: result.hasNextPage,
		hasPreviousPage: result.hasPrevPage
	};
}

export type ReviewCreditApplicationImportInput = {
	importId: string;
	decision: "approve" | "reject";
	reason?: string | null;
};

function assertSafeUploadFilename(filename: string): void {
	if(filename.length == 0)
		throw new Error("Invalid file name.");
	if(filename.includes("..") || filename.includes("\0"))
		throw new Error("Invalid file name.");
}

function resolveCreditImportFileDownloadUrl(doc: CreditApplicationImport): string {
	const originRaw = process.env.PROJECT_WEB_ORIGIN ?? process.env.NEXT_PUBLIC_PROJECT_WEB_ORIGIN;
	if(originRaw == null || originRaw.trim().length == 0)
		throw new Error("Server origin is not configured (PROJECT_WEB_ORIGIN).");
	const origin = originRaw.replace(/\/$/, "");

	const fromDoc = doc.url?.trim() ?? "";
	if(fromDoc.length > 0) {
		if(fromDoc.startsWith("http://") || fromDoc.startsWith("https://"))
			return fromDoc;
		return `${origin}${fromDoc.startsWith("/") ? fromDoc : `/${fromDoc}`}`;
	}

	const filename = doc.filename ?? "";
	assertSafeUploadFilename(filename);
	return `${origin}/api/credit-application-imports/file/${encodeURIComponent(filename)}`;
}

async function readCreditImportUploadBuffer(doc: CreditApplicationImport): Promise<Buffer> {
	const requestHeaders = await nextHeaders();
	const cookie = requestHeaders.get("cookie");
	const url = resolveCreditImportFileDownloadUrl(doc);
	const response = await fetch(url, {
		...(cookie != null && cookie.length > 0 ? { headers: { cookie } } : {}),
		cache: "no-store"
	});
	if(!response.ok)
		throw new Error("Could not download uploaded file.");
	return Buffer.from(await response.arrayBuffer());
}

export type CreditApplicationImportFilePreviewOutput = {
	headers: string[];
	rows: string[][];
	totalDataRows: number;
	truncated: boolean;
};

export async function getCreditApplicationImportFilePreviewAction(
	importId: string
): Promise<CreditApplicationImportFilePreviewOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const shell = await getDashboardShellContext();
	if(shell == null)
		return unauthorized();
	if(!assertImportApproverAccess(shell.roleMenus))
		return unauthorized();

	const doc = await payload.findByID({
		collection: "credit-application-imports",
		id: importId,
		user,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	if(doc.deletedAt != null)
		throw new Error("This upload has been deleted.");
	if(doc.reviewedAt != null)
		throw new Error("Only pending imports can be previewed.");

	const filename = doc.filename ?? "";
	if(filename.length == 0)
		throw new Error("Import has no file.");

	const buffer = await readCreditImportUploadBuffer(doc);
	const { headers: sheetHeaders, dataRows } = parseImportSpreadsheetBuffer(buffer, filename);
	const rows = formatRowsForPreview(sheetHeaders, dataRows, MAX_PREVIEW_DATA_ROWS);
	return {
		headers: sheetHeaders,
		rows,
		totalDataRows: dataRows.length,
		truncated: dataRows.length > MAX_PREVIEW_DATA_ROWS
	};
}

async function ingestCreditApplicationsForApprovedImport(
	payload: Awaited<ReturnType<typeof getPayload>>,
	user: User,
	importId: string,
	creates: CreditApplicationIngestCreate[],
	reviewComment: CreditApplicationImportReviewComment,
	now: string
): Promise<void> {
	const existingApps = await payload.find({
		collection: "credit-applications",
		user,
		overrideAccess: true,
		trash: true,
		limit: 1,
		where: {
			import: { equals: importId }
		}
	});
	if(existingApps.totalDocs > 0)
		throw new Error("This import already has linked account rows.");

	const req = await createLocalReq({ user }, payload);
	try {
		const shouldCommit = await initTransaction(req);
		for(const row of creates) {
			await payload.create({
				req,
				collection: "credit-applications",
				user,
				overrideAccess: true,
				data: {
					import: row.import,
					name: row.name,
					addresses: row.addresses,
					phoneNumbers: row.phoneNumbers,
					whatsappNumber: row.whatsappNumber,
					...(row.email != null && row.email.length > 0 ? { email: row.email } : {}),
					...(row.assetId != null && row.assetId.length > 0 ? { assetId: row.assetId } : {})
				}
			});
		}

		await payload.update({
			req,
			collection: "credit-application-imports",
			id: importId,
			user,
			overrideAccess: true,
			trash: true,
			data: {
				reviewedAt: now,
				reviewedBy: user.id,
				reviewApproved: true,
				reviewComment
			}
		});

		if(shouldCommit)
			await commitTransaction(req);
	} catch(error) {
		await killTransaction(req);
		if(error instanceof Error)
			throw error;
		throw new Error("Ingest failed.", { cause: error });
	}
}

export async function reviewCreditApplicationImportAction(
	input: ReviewCreditApplicationImportInput
): Promise<{ importId: string, decision: "approve" | "reject" }> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	const shell = await getDashboardShellContext();
	if(shell == null)
		return unauthorized();
	if(!assertImportApproverAccess(shell.roleMenus))
		return unauthorized();

	const doc = await payload.findByID({
		collection: "credit-application-imports",
		id: input.importId,
		user,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	if(doc.deletedAt != null)
		throw new Error("This upload has been deleted.");
	if(doc.reviewedAt != null)
		throw new Error("This import has already been reviewed.");

	const now = new Date().toISOString();
	const reviewComment = plainTextToReviewComment(input.reason);

	if(input.decision == "reject") {
		await payload.update({
			collection: "credit-application-imports",
			id: input.importId,
			user,
			overrideAccess: true,
			trash: true,
			data: {
				reviewedAt: now,
				reviewedBy: user.id,
				reviewApproved: false,
				reviewComment
			}
		});
		return { importId: input.importId, decision: "reject" };
	}

	if(input.decision != "approve")
		throw new Error("Invalid review decision.");

	const filename = doc.filename ?? "";
	if(filename.length == 0)
		throw new Error("Import has no file.");

	const buffer = await readCreditImportUploadBuffer(doc);
	let parsed: ReturnType<typeof parseImportSpreadsheetBuffer>;
	try {
		parsed = parseImportSpreadsheetBuffer(buffer, filename);
	} catch{
		throw new Error("Could not read spreadsheet file.");
	}
	const validated = validateCreditImportParsedSheetForIngest(parsed, input.importId);
	if(!validated.ok)
		throw new Error(formatCreditImportValidationMessagesForUser(validated.errors));

	await ingestCreditApplicationsForApprovedImport(
		payload,
		user,
		input.importId,
		validated.creates,
		reviewComment,
		now
	);

	return { importId: input.importId, decision: "approve" };
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
	const where = buildEditorImportListWhere(keyword);

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

export async function softDeleteCreditApplicationImportAction(importId: string): Promise<void> {
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

	const doc = await payload.findByID({
		collection: "credit-application-imports",
		id: importId,
		user,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	assertImportNotDeleted(doc);
	if(isImportApprovedForEditor(doc))
		throw new Error("Approved imports cannot be deleted.");

	const now = new Date().toISOString();
	await payload.update({
		collection: "credit-application-imports",
		id: importId,
		user,
		overrideAccess: true,
		trash: true,
		data: {
			deletedAt: now,
			deletedBy: user.id
		}
	});
}

export async function reopenCreditApplicationImportReviewAction(importId: string): Promise<void> {
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

	const doc = await payload.findByID({
		collection: "credit-application-imports",
		id: importId,
		user,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	assertImportNotDeleted(doc);
	if(doc.reviewedAt == null || doc.reviewApproved != false)
		throw new Error("Only rejected imports can be sent back for review.");

	await payload.update({
		collection: "credit-application-imports",
		id: importId,
		user,
		overrideAccess: true,
		trash: true,
		data: {
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: defaultCreditApplicationImportReviewComment
		}
	});
}
