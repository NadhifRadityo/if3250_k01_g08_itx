import * as XLSX from "xlsx";

export const MAX_IMPORT_DATA_ROWS = 2000;

export const MAX_PREVIEW_DATA_ROWS = 40;

function isCsvFilename(filename: string): boolean {
	return filename.toLowerCase().endsWith(".csv");
}

function normalizeHeader(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sheetMatrixFromBuffer(buffer: Buffer, filename: string): unknown[][] {
	if(isCsvFilename(filename)) {
		const text = buffer.toString("utf8");
		const workbook = XLSX.read(text, { type: "string", raw: false });
		return matrixFromFirstSheet(workbook);
	}
	const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
	return matrixFromFirstSheet(workbook);
}

function matrixFromFirstSheet(workbook: XLSX.WorkBook): unknown[][] {
	const sheetName = workbook.SheetNames[0];
	if(sheetName == null || sheetName.length == 0)
		return [];
	const sheet = workbook.Sheets[sheetName];
	if(sheet == null)
		return [];
	const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
	return rows;
}

export type ParsedImportSheet = {
	headers: string[];
	dataRows: unknown[][];
};

export function parseImportSpreadsheetBuffer(buffer: Buffer, filename: string): ParsedImportSheet {
	const matrix = sheetMatrixFromBuffer(buffer, filename);
	const nonEmpty = matrix.filter(row =>
		Array.isArray(row) && row.some(cell => String(cell).trim().length > 0)
	);
	if(nonEmpty.length == 0)
		return { headers: [], dataRows: [] };
	const headers = nonEmpty[0].map(cell => String(cell).trim());
	const dataRows = nonEmpty.slice(1);
	return { headers, dataRows };
}

/** Column titles in `public/credit-application-import-template.xlsx` (case-insensitive, extra spaces collapsed). */
export const CREDIT_IMPORT_TEMPLATE_COLUMN_HEADERS = [
	"Account Name",
	"Address 1",
	"Address 2",
	"Phone",
	"WhatsApp",
	"Email",
	"Asset ID"
] as const;

function columnIndexMap(headers: string[]): Map<string, number> {
	const map = new Map<string, number>();
	headers.forEach((header, index) => {
		map.set(normalizeHeader(header), index);
	});
	return map;
}

function missingTemplateColumnLabels(headers: string[]): string[] {
	const map = columnIndexMap(headers);
	const missing: string[] = [];
	for(const label of CREDIT_IMPORT_TEMPLATE_COLUMN_HEADERS) {
		if(!map.has(normalizeHeader(label)))
			missing.push(label);
	}
	return missing;
}

function templateColumnIndex(map: Map<string, number>, label: (typeof CREDIT_IMPORT_TEMPLATE_COLUMN_HEADERS)[number]): number | null {
	const index = map.get(normalizeHeader(label));
	return index == null ? null : index;
}

function cellString(row: unknown[], columnIndex: number | null): string {
	if(columnIndex == null || columnIndex < 0 || columnIndex >= row.length)
		return "";
	const value = row[columnIndex];
	if(value == null)
		return "";
	return String(value).trim();
}

export type CreditApplicationIngestCreate = {
	import: string;
	name: string;
	email: string | null;
	addresses: string[];
	phoneNumbers: string[];
	whatsappNumber: string;
	assetId: string | null;
};

export const CREDIT_IMPORT_VALIDATION_PLACEHOLDER_ID = "00000000-0000-4000-8000-000000000000";

function buildCreditImportCreatesOrErrors(
	dataRows: unknown[][],
	headers: string[],
	importId: string
): { ok: true, creates: CreditApplicationIngestCreate[] } | { ok: false, errors: string[] } {
	if(dataRows.length > MAX_IMPORT_DATA_ROWS)
		return { ok: false, errors: [`Too many data rows (max ${MAX_IMPORT_DATA_ROWS}).`] };
	const creates: CreditApplicationIngestCreate[] = [];
	const rowErrors: string[] = [];
	for(let i = 0; i < dataRows.length; i++) {
		const row = dataRows[i];
		if(!Array.isArray(row)) {
			rowErrors.push(`Row ${i + 2}: Invalid row shape.`);
			continue;
		}
		const mapped = mapRowToIngestCreate(row, headers, importId);
		if(!mapped.ok)
			rowErrors.push(`Row ${i + 2}: ${mapped.error}`);
		else
			creates.push(mapped.data);
	}
	if(rowErrors.length > 0)
		return { ok: false, errors: rowErrors };
	return { ok: true, creates };
}

export function validateCreditImportParsedSheetForIngest(
	parsed: ParsedImportSheet,
	importId: string
): { ok: true, creates: CreditApplicationIngestCreate[] } | { ok: false, errors: string[] } {
	const { headers, dataRows } = parsed;
	if(headers.length == 0 || !headers.some(header => header.trim().length > 0))
		return { ok: false, errors: ["The spreadsheet has no header row."] };
	const missingColumns = missingTemplateColumnLabels(headers);
	if(missingColumns.length > 0) {
		const listed = missingColumns.map(label => `"${label}"`).join(", ");
		return {
			ok: false,
			errors: [
				`Missing required column(s): ${listed}. Download the import template and use its header row.`
			]
		};
	}
	if(dataRows.length == 0)
		return { ok: false, errors: ["No data rows to import."] };
	return buildCreditImportCreatesOrErrors(dataRows, headers, importId);
}

export function mapRowToIngestCreate(
	row: unknown[],
	headers: string[],
	importId: string
): { ok: true, data: CreditApplicationIngestCreate } | { ok: false, error: string } {
	const map = columnIndexMap(headers);
	const missing = missingTemplateColumnLabels(headers);
	if(missing.length > 0) {
		const listed = missing.map(label => `"${label}"`).join(", ");
		return {
			ok: false,
			error: `Missing required column(s): ${listed}. Download the import template and use its header row.`
		};
	}
	const name = cellString(row, templateColumnIndex(map, "Account Name"));
	if(name.length == 0)
		return { ok: false, error: "Missing account name." };
	const address1 = cellString(row, templateColumnIndex(map, "Address 1"));
	const address2 = cellString(row, templateColumnIndex(map, "Address 2"));
	const addressList = [address1, address2].filter(part => part.length > 0);
	const addresses = addressList.length > 0 ? addressList : ["—"];
	const phoneRaw = cellString(row, templateColumnIndex(map, "Phone"));
	const phoneParts = phoneRaw.length > 0 ?
		phoneRaw.split(/[,;/|]/).map(part => part.trim()).filter(part => part.length > 0) :
		[];
	const whatsappRaw = cellString(row, templateColumnIndex(map, "WhatsApp"));
	const whatsappNumber = whatsappRaw.length > 0 ?
		whatsappRaw :
		phoneRaw.length > 0 ? phoneRaw : "—";
	const phoneNumbers = phoneParts.length > 0 ?
		phoneParts :
		whatsappNumber != "—" ? [whatsappNumber] : ["—"];
	const emailRaw = cellString(row, templateColumnIndex(map, "Email"));
	const assetRaw = cellString(row, templateColumnIndex(map, "Asset ID"));
	return {
		ok: true,
		data: {
			import: importId,
			name,
			addresses,
			phoneNumbers,
			whatsappNumber,
			email: emailRaw.length > 0 ? emailRaw : null,
			assetId: assetRaw.length > 0 ? assetRaw : null
		}
	};
}

export function formatRowsForPreview(headers: string[], dataRows: unknown[][], maxRows: number): string[][] {
	const limited = dataRows.slice(0, maxRows);
	return limited.map(row => headers.map((_header, columnIndex) => {
		if(columnIndex >= row.length)
			return "";
		return String(row[columnIndex] ?? "").trim();
	}));
}
