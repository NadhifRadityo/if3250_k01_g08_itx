import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";

import { defaultCreditApplicationImportReviewComment } from "@/app/(app)/(dashboard)/credit-application-management/creditApplicationImportDefaultReviewComment";
import {
	MAX_CREDIT_IMPORT_UPLOAD_BYTES,
	isAllowedCreditImportUploadMime,
	validateCreditImportSpreadsheetBuffer,
	formatCreditImportValidationMessagesForUser
} from "@/app/(app)/(dashboard)/credit-application-management/creditApplicationImportUploadPolicy";

const CREDIT_IMPORT_EDITOR_MENU = "credit-application-import-editor";

type ImportDocShape = {
	deletedAt?: string | null;
	reviewedAt?: string | null;
	reviewApproved?: boolean | null;
};

export type CreditApplicationImportFilePutPayload = {
	auth: (input: { headers: Headers }) => Promise<{ user: { id: string } | null }>;
	findByID: (input: Record<string, unknown>) => Promise<ImportDocShape>;
	update: (input: Record<string, unknown>) => Promise<unknown>;
};

export type CreditApplicationImportFilePutDeps = {
	getShell: () => Promise<{ roleMenus: readonly string[] } | null>;
	getPayload: () => Promise<CreditApplicationImportFilePutPayload>;
};

function isImportApprovedForEditor(doc: ImportDocShape): boolean {
	return doc.reviewedAt != null && doc.reviewApproved == true;
}

export async function handleCreditApplicationImportFilePut(
	request: Request,
	importIdRaw: string,
	deps: CreditApplicationImportFilePutDeps
): Promise<NextResponse> {
	const importId = importIdRaw.trim();
	if(importId.length == 0)
		return NextResponse.json({ error: "invalid_id", messages: ["Missing import id."] }, { status: 400 });

	const shell = await deps.getShell();
	if(shell == null)
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	if(!shell.roleMenus.includes(CREDIT_IMPORT_EDITOR_MENU))
		return NextResponse.json({ error: "forbidden" }, { status: 403 });

	const payload = await deps.getPayload();
	const { user } = await payload.auth({ headers: request.headers });
	if(user == null)
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });

	let doc: ImportDocShape;
	try {
		doc = await payload.findByID({
			collection: "credit-application-imports",
			id: importId,
			user,
			overrideAccess: true,
			trash: true,
			depth: 0
		});
	} catch{
		return NextResponse.json({ error: "not_found", messages: ["Import not found."] }, { status: 404 });
	}

	if(doc.deletedAt != null)
		return NextResponse.json({ error: "deleted", messages: ["This upload has been deleted."] }, { status: 400 });
	if(isImportApprovedForEditor(doc))
		return NextResponse.json({ error: "read_only", messages: ["Approved imports are read-only."] }, { status: 400 });

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch{
		return NextResponse.json(
			{ error: "invalid_body", messages: ["Expected multipart form data with a file field."] },
			{ status: 400 }
		);
	}

	const rawFile = formData.get("file");
	if(rawFile == null || typeof rawFile != "object") {
		return NextResponse.json(
			{ error: "no_file", messages: ["No file provided. Use form field name \"file\"."] },
			{ status: 400 }
		);
	}

	if(typeof File == "undefined" || !(rawFile instanceof File)) {
		return NextResponse.json(
			{ error: "invalid_file", messages: ["Invalid file payload."] },
			{ status: 400 }
		);
	}

	const file = rawFile;
	if(file.size == 0)
		return NextResponse.json({ error: "empty_file", messages: ["File is empty."] }, { status: 400 });
	if(file.size > MAX_CREDIT_IMPORT_UPLOAD_BYTES) {
		return NextResponse.json(
			{ error: "file_too_large", messages: ["File exceeds maximum size (25 MB)."] },
			{ status: 400 }
		);
	}

	const mimeType = file.type.length > 0 ? file.type : "application/octet-stream";
	if(!isAllowedCreditImportUploadMime(mimeType, file.name)) {
		return NextResponse.json(
			{
				error: "unsupported_type",
				messages: ["Only Excel (.xlsx, .xls) or CSV files are allowed."]
			},
			{ status: 400 }
		);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const sheetCheck = validateCreditImportSpreadsheetBuffer(buffer, file.name);
	if(!sheetCheck.ok) {
		const body =
			sheetCheck.code == "parse_error" ?
				{
					error: "parse_error" as const,
					messages: sheetCheck.messages
				} :
				{
					error: "validation_failed" as const,
					messages: sheetCheck.messages,
					summary: formatCreditImportValidationMessagesForUser(sheetCheck.messages)
				};
		return NextResponse.json(body, { status: 400 });
	}

	const wasRejected = doc.reviewedAt != null && doc.reviewApproved == false;
	const reviewReset = {
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: defaultCreditApplicationImportReviewComment
	};

	await payload.update({
		collection: "credit-application-imports",
		id: importId,
		user,
		overrideAccess: true,
		trash: true,
		data: wasRejected ? reviewReset : {},
		file: {
			data: buffer,
			mimetype: mimeType,
			name: file.name,
			size: file.size
		}
	});

	return NextResponse.json({ importId }, { status: 200 });
}
