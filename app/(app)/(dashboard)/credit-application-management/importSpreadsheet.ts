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

const NAME_KEYS = ["name", "account name", "account_name", "nama", "nama nasabah", "customer name", "accountname"];
const ADDR1_KEYS = ["address 1", "address1", "alamat 1", "alamat1", "address"];
const ADDR2_KEYS = ["address 2", "address2", "alamat 2", "alamat2"];
const EMAIL_KEYS = ["email", "e-mail", "mail"];
const PHONE_KEYS = ["phone", "phone number", "phone_numbers", "tel", "telepon", "hp", "no hp", "nomor hp"];
const WA_KEYS = ["whatsapp", "wa", "whatsapp number", "whats app", "no wa"];
const APPLY_KEYS = ["apply id", "apply_id", "asset id", "asset_id", "id aplikasi", "applyid"];

function columnIndexMap(headers: string[]): Map<string, number> {
	const map = new Map<string, number>();
	headers.forEach((header, index) => {
		map.set(normalizeHeader(header), index);
	});
	return map;
}

function findColumnIndex(map: Map<string, number>, keys: string[]): number | null {
	for(const key of keys) {
		const normalized = normalizeHeader(key);
		if(map.has(normalized))
			return map.get(normalized) ?? null;
	}
	for(const key of keys) {
		const normalized = normalizeHeader(key);
		for(const [header, index] of map) {
			if(header == normalized || header.includes(normalized) || normalized.includes(header))
				return index;
		}
	}
	return null;
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
	const name = cellString(row, findColumnIndex(map, NAME_KEYS));
	if(name.length == 0)
		return { ok: false, error: "Missing account name." };
	const address1 = cellString(row, findColumnIndex(map, ADDR1_KEYS));
	const address2 = cellString(row, findColumnIndex(map, ADDR2_KEYS));
	const addressList = [address1, address2].filter(part => part.length > 0);
	const addresses = addressList.length > 0 ? addressList : ["—"];
	const phoneRaw = cellString(row, findColumnIndex(map, PHONE_KEYS));
	const phoneParts = phoneRaw.length > 0 ?
		phoneRaw.split(/[,;/|]/).map(part => part.trim()).filter(part => part.length > 0) :
		[];
	const whatsappRaw = cellString(row, findColumnIndex(map, WA_KEYS));
	const whatsappNumber = whatsappRaw.length > 0 ?
		whatsappRaw :
		phoneRaw.length > 0 ? phoneRaw : "—";
	const phoneNumbers = phoneParts.length > 0 ?
		phoneParts :
		whatsappNumber != "—" ? [whatsappNumber] : ["—"];
	const emailRaw = cellString(row, findColumnIndex(map, EMAIL_KEYS));
	const assetRaw = cellString(row, findColumnIndex(map, APPLY_KEYS));
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
