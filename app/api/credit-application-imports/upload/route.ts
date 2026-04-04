import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { getDashboardShellContext } from "@/app/(app)/(dashboard)/layout.actions";
import {
	MAX_CREDIT_IMPORT_UPLOAD_BYTES,
	isAllowedCreditImportUploadMime,
	validateCreditImportSpreadsheetBuffer,
	formatCreditImportValidationMessagesForUser
} from "@/app/(app)/(dashboard)/credit-application-management/creditApplicationImportUploadPolicy";

const CREDIT_IMPORT_EDITOR_MENU = "credit-application-import-editor";

export type CreditApplicationImportUploadPayload = {
	auth: (input: { headers: Headers }) => Promise<{ user: { id: string } | null }>;
	create: (input: Record<string, unknown>) => Promise<{ id: string | number }>;
};

export type CreditApplicationImportUploadPostDeps = {
	getShell: () => Promise<{ roleMenus: readonly string[] } | null>;
	getPayload: () => Promise<CreditApplicationImportUploadPayload>;
};

export async function handleCreditApplicationImportPost(
	request: Request,
	deps: CreditApplicationImportUploadPostDeps
): Promise<NextResponse> {
	const shell = await deps.getShell();
	if(shell == null)
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	if(!shell.roleMenus.includes(CREDIT_IMPORT_EDITOR_MENU))
		return NextResponse.json({ error: "forbidden" }, { status: 403 });

	const payload = await deps.getPayload();
	const { user } = await payload.auth({ headers: request.headers });
	if(user == null)
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
				messages: ["Only .xlsx files are allowed. Download the template for the required columns."]
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

	return NextResponse.json({ importId: String(created.id) }, { status: 201 });
}

export async function POST(request: Request): Promise<Response> {
	return handleCreditApplicationImportPost(request, {
		getShell: getDashboardShellContext,
		getPayload: () => getPayload({ config: payloadConfig }) as Promise<CreditApplicationImportUploadPayload>
	});
}
