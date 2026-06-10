"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import ExcelJS from "@/utils/exceljs";
import { buildFilterWhere, lexicalPlainText, getRelationshipId } from "@/utils/payload";
import type { CreditApplicationImport } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers } from "../relation-navigation.actions";
import { RelationUser } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;
const templateColumns = [
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

export type RelationValues = Partial<Record<`users:${string}`, RelationUser>>;

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: CreditApplicationImport[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	for(const doc of docs) {
		const createdBy = getRelationshipId(doc.createdBy);
		if(createdBy != null)
			userIds.add(createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		if(updatedBy != null)
			userIds.add(updatedBy);
		const deletedBy = getRelationshipId(doc.deletedBy);
		if(deletedBy != null)
			userIds.add(deletedBy);
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		if(reviewedBy != null)
			userIds.add(reviewedBy);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, ids: [...userIds] }));
	return relations;
}

function mapRowToCreditApplicationImport(rowData: Record<string, string>, rowNumber: number) {
	const splitMultivalueText = (value: string) => value.split(/\r?\n/g).map(item => item.trim()).filter(item => item.length > 0);
	const normalizeOptionalText = (value: string) => value.trim();
	const normalizeOptionalNumber = (value: string, fieldLabel: string, rowNumber: number) => {
		const trimmed = value.trim();
		if(trimmed.length == 0)
			return null;
		const parsed = Number(trimmed);
		if(Number.isNaN(parsed))
			throw new Error(`Row ${rowNumber}: '${fieldLabel}' must be a valid number.`);
		return parsed;
	};
	const excelSerialDateToISOString = (serial: number) => {
		if(!Number.isFinite(serial))
			return null;
		const unixTimeMilliseconds = Math.round((serial - 25569) * 86400 * 1000);
		const date = new Date(unixTimeMilliseconds);
		if(Number.isNaN(date.getTime()))
			return null;
		return date.toISOString();
	};
	const normalizeOptionalDate = (value: string, fieldLabel: string, rowNumber: number) => {
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
	};
	const normalizeOthersValue = (value: string) => {
		const trimmed = value.trim();
		if(trimmed.length == 0)
			return null;
		try {
			return JSON.parse(trimmed);
		} catch{
			return trimmed;
		}
	};
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
async function parseExcelCreditApplicationImportRows(fileBuffer: ArrayBuffer) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(fileBuffer);
	const worksheet = workbook.worksheets[0];
	if(worksheet == null)
		throw new Error("The uploaded workbook does not contain any worksheet.");
	const resolveCellText = (value: ExcelJS.CellValue) => {
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
	};
	const TEMPLATE_DATA_START_ROW = 5;
	const parsedRows = [] as (ReturnType<typeof mapRowToCreditApplicationImport>)[];
	for(let rowNumber = TEMPLATE_DATA_START_ROW; rowNumber <= worksheet.rowCount; rowNumber++) {
		const worksheetRow = worksheet.getRow(rowNumber);
		if(worksheetRow == null) continue;
		const rowData = {} as Record<string, string>;
		for(let columnIndex = 0; columnIndex < templateColumns.length; columnIndex++) {
			const templateColumn = templateColumns[columnIndex];
			const columnNumber = columnIndex + 1;
			const rawValue = resolveCellText(worksheetRow.getCell(columnNumber).value).trim();
			rowData[templateColumn] = rawValue;
		}
		parsedRows.push(mapRowToCreditApplicationImport(rowData, rowNumber));
	}
	return parsedRows;
}

async function parseExcelRowsFromImportFile(filename: string, headers: Headers) {
	let response: Response;
	try {
		response = await fetch(new URL(`http://localhost:${process.env.PORT}/api/credit-application-imports/file/${encodeURIComponent(filename)}`), {
			cache: "no-store",
			headers: {
				...(headers.has("cookie") ? { cookie: headers.get("cookie")! } : {})
			}
		});
	} catch(error) {
		const errorMessage = error instanceof Error ? error.message : "Network error.";
		throw new Error(`Unable to fetch uploaded import file. ${errorMessage}`, { cause: error });
	}
	if(!response.ok)
		throw new Error(`Unable to fetch uploaded import file. HTTP ${response.status}.`);
	return parseExcelCreditApplicationImportRows(await response.arrayBuffer());
}

async function queryAction(
	{ mode, keyword, filters, columnsSort, includeDeleted, pageIndex }:
	{ mode: "viewer" | "approver" | "editor", keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], includeDeleted: boolean, pageIndex: number }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const result = await payload.find({
		user: user,
		overrideAccess: true,
		collection: "credit-application-imports",
		draft: true,
		trash: true,
		depth: 0,
		page: pageIndex,
		limit: PAGE_LIMIT,
		sort: columnsSort.map(([columnKey, ascending]) => `${!ascending ? "-" : ""}${columnKey}`),
		where: { and: [
			...(mode == "approver" ? [
				{ reviewedAt: { exists: false } }
			] : []),
			...(!includeDeleted ? [
				{ deletedAt: { exists: false } }
			] : []),
			...(keyword.length > 0 ? [{ or: [
				{ id: { like: keyword } },
				{ filename: { like: keyword } },
				{ mimeType: { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] },
		select: {
			filename: true,
			filesize: true,
			mimeType: true,
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
	const relations = await resolveRelations({ payload, docs: result.docs });
	return { ...result, relations };
}

export const queryViewerAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "viewer" });
});
export const queryEditorAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "editor" });
});
export const queryApproverAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "approver" });
});

export const getDetailsAction = wsa(async (id: string) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-application-imports",
		draft: true,
		trash: true,
		id: id,
		depth: 0,
		select: {
			filename: true,
			filesize: true,
			mimeType: true,
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
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations: relations };
});

export const requestCreateAction = wsa(async (formData: FormData) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const fileValue = formData.get("file");
	if(!(fileValue instanceof File))
		throw new Error("Please provide a valid Excel file.");
	const fileName = fileValue.name.trim();
	if(fileName.length == 0)
		throw new Error("Import file name is required.");
	const fileBuffer = await fileValue.arrayBuffer();
	if(fileBuffer.byteLength == 0)
		throw new Error("Import file is empty.");
	const descriptionString = formData.get("description");
	if(typeof descriptionString != "string")
		throw new Error("Description is not valid.");
	const description = JSON.parse(descriptionString);
	if(typeof description != "object")
		throw new Error("Description is not valid.");
	const parsedRows = await parseExcelCreditApplicationImportRows(fileBuffer);

	const result = await payload.create({
		user: user,
		overrideAccess: true,
		collection: "credit-application-imports",
		file: {
			name: fileName,
			data: Buffer.from(fileBuffer),
			size: fileBuffer.byteLength,
			mimetype: fileValue.type
		},
		data: {
			description: description,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: result.id, rows: parsedRows };
});

export const parsePreviewAction = wsa(async (formData: FormData) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const fileValue = formData.get("file");

	let parsedRows: ReturnType<typeof mapRowToCreditApplicationImport>[];
	if(fileValue instanceof File) {
		const fileBuffer = await fileValue.arrayBuffer();
		if(fileBuffer.byteLength == 0)
			throw new Error("Import file is empty.");
		parsedRows = await parseExcelCreditApplicationImportRows(fileBuffer);
	} else {
		const importId = formData.get("importId");
		if(typeof importId != "string" || importId.length == 0)
			throw new Error("Import id is required and must be a string.");
		const importDoc = await payload.findByID({
			user: user,
			overrideAccess: true,
			collection: "credit-application-imports",
			id: importId,
			depth: 0,
			trash: true,
			select: {
				filename: true
			}
		});
		if(importDoc.filename == null || importDoc.filename.trim().length == 0)
			throw new Error("The selected import does not have a valid uploaded file.");
		parsedRows = await parseExcelRowsFromImportFile(importDoc.filename, headers);
	}
	return { rows: parsedRows };
});

export const requestUpdateDescriptionAction = wsa(async (
	{ id, description }:
	{ id: string, description: any }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const importDoc = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-application-imports",
		id: id,
		depth: 0,
		trash: true,
		showHiddenFields: true
	});
	if(importDoc.reviewedAt != null)
		throw new Error("Cannot edit description after this import is reviewed.");
	await payload.update({
		user: user,
		collection: "credit-application-imports",
		id: id,
		overrideAccess: true,
		trash: true,
		data: {
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			description: description
		}
	});
	return { id: id };
});

export const requestDeleteAction = wsa(async (id: string) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const importDoc = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-application-imports",
		id: id,
		depth: 0,
		trash: true,
		showHiddenFields: true
	});
	if(importDoc.deletedAt != null)
		throw new Error("Import is already cancelled.");
	if(importDoc.reviewedAt != null && importDoc.reviewApproved == true)
		throw new Error("Cannot cancel an approved import.");
	await payload.update({
		user: user,
		collection: "credit-application-imports",
		id: id,
		overrideAccess: true,
		trash: true,
		data: {
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			deletedAt: new Date().toISOString(),
			deletedBy: user.id
		}
	});
	return { id: id };
});

export const requestRestoreAction = wsa(async (id: string) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const importDoc = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-application-imports",
		id: id,
		depth: 0,
		trash: true,
		showHiddenFields: true
	});
	if(importDoc.deletedAt == null)
		throw new Error("Import is not cancelled.");
	if(importDoc.reviewedAt != null && importDoc.reviewApproved == true)
		throw new Error("Approved import cannot be restored.");
	await payload.update({
		user: user,
		collection: "credit-application-imports",
		id: id,
		overrideAccess: true,
		trash: true,
		data: {
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			deletedAt: null,
			deletedBy: null
		}
	});
	return { id: id };
});

export const reviewAction = wsa(async (
	{ id, decision, reviewComment }:
	{ id: string, decision: "approve" | "reject", reviewComment: any }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const importDoc = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-application-imports",
		id: id,
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
	if(decision == "reject") {
		await payload.update({
			user: user,
			collection: "credit-application-imports",
			id: id,
			overrideAccess: true,
			trash: true,
			data: {
				updatedAt: new Date().toISOString(),
				updatedBy: user.id,
				reviewedAt: new Date().toISOString(),
				reviewedBy: user.id,
				reviewApproved: false,
				reviewComment: reviewComment
			}
		});
		return { id: id };
	}
	const parsedRows = await parseExcelRowsFromImportFile(importDoc.filename, headers);
	if(parsedRows.length == 0)
		throw new Error("The selected import has no parsed rows to publish.");
	for(const row of parsedRows) {
		await payload.create({
			user: user,
			collection: "credit-applications",
			overrideAccess: true,
			data: {
				_status: "published",
				createdAt: new Date().toISOString(),
				createdBy: user.id,
				updatedAt: new Date().toISOString(),
				updatedBy: user.id,
				import: id,
				name: row.name,
				email: row.email,
				addresses: row.addresses,
				phoneNumbers: row.phoneNumbers,
				whatsappNumber: row.whatsappNumber,
				smsNumber: row.smsNumber,
				collateralRegistryName: row.collateralRegistryName,
				collateralName: row.collateralName,
				collateralDescription: lexicalPlainText(row.collateralDescription),
				assetId: row.assetId,
				assetName: row.assetName,
				assetDescription: lexicalPlainText(row.assetDescription),
				period: row.period,
				installment: row.installment,
				downPayment: row.downPayment,
				plafond: row.plafond,
				vendor: row.vendor,
				remarks: lexicalPlainText(row.remarks),
				otherText1: row.otherText1,
				otherText2: row.otherText2,
				otherNumber1: row.otherNumber1,
				otherNumber2: row.otherNumber2,
				otherDate1: row.otherDate1,
				otherDate2: row.otherDate2,
				others: row.others,
				changeRequestType: "create",
				changeRequestComment: null,
				reviewedAt: new Date().toISOString(),
				reviewedBy: user.id,
				reviewApproved: true,
				reviewComment: lexicalPlainText("Imported from approved Excel document.")
			}
		});
	}
	await payload.update({
		user: user,
		collection: "credit-application-imports",
		id: id,
		overrideAccess: true,
		trash: true,
		data: {
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			reviewedAt: new Date().toISOString(),
			reviewedBy: user.id,
			reviewApproved: true,
			reviewComment: reviewComment
		}
	});
	return { id: id };
});
