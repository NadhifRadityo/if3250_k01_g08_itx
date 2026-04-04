import {
	parseImportSpreadsheetBuffer,
	CREDIT_IMPORT_VALIDATION_PLACEHOLDER_ID,
	validateCreditImportParsedSheetForIngest,
	type ParsedImportSheet
} from "./importSpreadsheet";

export const MAX_CREDIT_IMPORT_UPLOAD_BYTES = 25 * 1024 * 1024;

const allowedUploadMimeTypes = new Set([
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-excel",
	"text/csv",
	"application/csv",
	"application/vnd.ms-excel.sheet.macroEnabled.12"
]);

export function isAllowedCreditImportUploadMime(mimeType: string, filename: string): boolean {
	if(allowedUploadMimeTypes.has(mimeType))
		return true;
	const lower = filename.toLowerCase();
	if(lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv"))
		return true;
	return false;
}

export type CreditImportSpreadsheetValidationFailureCode = "parse_error" | "validation_failed";

export type CreditImportSpreadsheetBufferValidation =
	| { ok: true } |
	{ ok: false, code: CreditImportSpreadsheetValidationFailureCode, messages: string[] };


export function validateCreditImportSpreadsheetBuffer(
	buffer: Buffer,
	filename: string
): CreditImportSpreadsheetBufferValidation {
	let parsed: ParsedImportSheet;
	try {
		parsed = parseImportSpreadsheetBuffer(buffer, filename);
	} catch{
		return {
			ok: false,
			code: "parse_error",
			messages: [
				"Could not read the spreadsheet. Use a valid Excel (.xlsx, .xls) or CSV file."
			]
		};
	}
	const ingested = validateCreditImportParsedSheetForIngest(parsed, CREDIT_IMPORT_VALIDATION_PLACEHOLDER_ID);
	if(!ingested.ok)
		return { ok: false, code: "validation_failed", messages: ingested.errors };
	return { ok: true };
}

export function formatCreditImportValidationMessagesForUser(messages: string[]): string {
	const sample = messages.slice(0, 8).join(" ");
	const more = messages.length > 8 ? ` (+${messages.length - 8} more)` : "";
	return `Validation failed: ${sample}${more}`;
}
