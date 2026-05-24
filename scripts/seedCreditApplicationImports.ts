import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import ExcelJS from "@/utils/exceljs";
import { lexicalPlainText } from "@/utils/payload";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");
const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const APPROVED_IMPORT_FILENAME = "seed-credit-applications-approved.xlsx";
const PENDING_IMPORT_FILENAME = "seed-credit-applications-pending.xlsx";

type SeedCreditApplication = {
	addresses: string[];
	assetDescription: string;
	assetId: string;
	assetName: string;
	collateralDescription: string;
	collateralName: string;
	collateralRegistryName: string;
	downPayment: number;
	email: string;
	installment: number;
	key: string;
	name: string;
	otherDate1: string;
	otherDate2: string;
	otherNumber1: number;
	otherNumber2: number;
	otherText1: string;
	otherText2: string;
	others: Record<string, unknown>;
	period: number;
	phoneNumbers: string[];
	plafond: number;
	remarks: string;
	smsNumber: string;
	vendor: string;
	whatsappNumber: string;
};

const CREDIT_APPLICATION_SEEDS: SeedCreditApplication[] = [
	{
		key: "CA-SEED-001",
		name: "Sinta Maharani",
		email: "sinta.maharani@seed.local",
		addresses: ["Jl. Setiabudi No. 18\nBandung"],
		phoneNumbers: ["081200000101", "0225500101"],
		whatsappNumber: "081200000101",
		smsNumber: "081200000101",
		collateralRegistryName: "BPKB",
		collateralName: "Toyota Avanza 2022",
		collateralDescription: "Kendaraan keluarga warna hitam.\nNomor polisi D 1234 SI.",
		assetId: "AST-SEED-001",
		assetName: "Operational Vehicle",
		assetDescription: "Aset kendaraan untuk mobilitas harian surveyor.",
		period: 36,
		installment: 3150000,
		downPayment: 18000000,
		plafond: 145000000,
		vendor: "PT Mobilitas Nusantara",
		remarks: "Nasabah existing dengan histori pembayaran baik.",
		otherText1: "seed-batch-a",
		otherText2: "priority",
		otherNumber1: 12,
		otherNumber2: 3,
		otherDate1: "2026-05-18T00:00:00.000Z",
		otherDate2: "2026-06-01T00:00:00.000Z",
		others: { seedKey: "CA-SEED-001", channel: "expo-bandung", priority: true }
	},
	{
		key: "CA-SEED-002",
		name: "Doni Saputra",
		email: "doni.saputra@seed.local",
		addresses: ["Jl. Tebet Barat No. 22\nJakarta Selatan"],
		phoneNumbers: ["081200000102"],
		whatsappNumber: "081200000102",
		smsNumber: "081200000102",
		collateralRegistryName: "SHM",
		collateralName: "Rumah Tinggal Tebet",
		collateralDescription: "Rumah dua lantai dengan sertifikat SHM aktif.",
		assetId: "AST-SEED-002",
		assetName: "Residential Property",
		assetDescription: "Properti residensial untuk agunan kredit multiguna.",
		period: 60,
		installment: 4550000,
		downPayment: 30000000,
		plafond: 220000000,
		vendor: "PT Properti Andalan",
		remarks: "Perlu kunjungan lapangan ulang sebelum final approval.",
		otherText1: "seed-batch-a",
		otherText2: "resurvey",
		otherNumber1: 7,
		otherNumber2: 1,
		otherDate1: "2026-05-19T00:00:00.000Z",
		otherDate2: "2026-06-03T00:00:00.000Z",
		others: { seedKey: "CA-SEED-002", branch: "jakarta", source: "direct" }
	},
	{
		key: "CA-SEED-003",
		name: "Mila Kartika",
		email: "mila.kartika@seed.local",
		addresses: ["Jl. Buah Batu No. 99\nBandung"],
		phoneNumbers: ["081200000103", "081200000203"],
		whatsappNumber: "081200000103",
		smsNumber: "081200000203",
		collateralRegistryName: "Sertifikat Deposito",
		collateralName: "Deposito Berjangka 12 Bulan",
		collateralDescription: "Deposito berjangka aktif atas nama pemohon.",
		assetId: "AST-SEED-003",
		assetName: "Time Deposit",
		assetDescription: "Instrumen deposito untuk penguatan agunan.",
		period: 24,
		installment: 5250000,
		downPayment: 12000000,
		plafond: 98000000,
		vendor: "PT Dana Prima",
		remarks: "Dokumen agunan lengkap dan siap diverifikasi.",
		otherText1: "seed-batch-b",
		otherText2: "fast-track",
		otherNumber1: 21,
		otherNumber2: 5,
		otherDate1: "2026-05-20T00:00:00.000Z",
		otherDate2: "2026-06-10T00:00:00.000Z",
		others: { seedKey: "CA-SEED-003", branch: "bandung", source: "referral" }
	}
];

const IMPORT_TEMPLATE_COLUMNS = [
	{ key: "name", label: "Name", width: 28 },
	{ key: "email", label: "Email", width: 30 },
	{ key: "addresses", label: "Addresses", width: 34, multiline: true },
	{ key: "phoneNumbers", label: "Phone Numbers", width: 24, multiline: true },
	{ key: "whatsappNumber", label: "WhatsApp Number", width: 20 },
	{ key: "smsNumber", label: "SMS Number", width: 20 },
	{ key: "collateralRegistryName", label: "Collateral Registry Name", width: 24 },
	{ key: "collateralName", label: "Collateral Name", width: 24 },
	{ key: "collateralDescription", label: "Collateral Description", width: 30, multiline: true },
	{ key: "assetId", label: "Asset ID", width: 20 },
	{ key: "assetName", label: "Asset Name", width: 24 },
	{ key: "assetDescription", label: "Asset Description", width: 30, multiline: true },
	{ key: "period", label: "Period", width: 14 },
	{ key: "installment", label: "Installment", width: 16 },
	{ key: "downPayment", label: "Down Payment", width: 18 },
	{ key: "plafond", label: "Plafond", width: 18 },
	{ key: "vendor", label: "Vendor", width: 24 },
	{ key: "remarks", label: "Remarks", width: 32, multiline: true },
	{ key: "otherText1", label: "Other Text 1", width: 18 },
	{ key: "otherText2", label: "Other Text 2", width: 18 },
	{ key: "otherNumber1", label: "Other Number 1", width: 16 },
	{ key: "otherNumber2", label: "Other Number 2", width: 16 },
	{ key: "otherDate1", label: "Other Date 1", width: 16 },
	{ key: "otherDate2", label: "Other Date 2", width: 16 },
	{ key: "others", label: "Others", width: 32, multiline: true }
] as const;

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

function getTemplateColumnLetter(columnIndex: number): string {
	let current = columnIndex;
	let output = "";
	while(current > 0) {
		const remainder = (current - 1) % 26;
		output = String.fromCharCode(65 + remainder) + output;
		current = Math.floor((current - 1) / 26);
	}
	return output;
}

async function buildImportWorkbookBuffer(rows: SeedCreditApplication[], title: string, instruction: string): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("Credit Applications", {
		pageSetup: {
			fitToWidth: 1,
			fitToHeight: 0,
			orientation: "landscape",
			paperSize: 9,
			margins: { top: 0.4, right: 0.4, bottom: 0.4, left: 0.4, header: 0.2, footer: 0.2 }
		}
	});

	worksheet.properties.defaultRowHeight = 22;
	worksheet.columns = IMPORT_TEMPLATE_COLUMNS.map(column => ({
		key: column.key,
		width: column.width,
		style: {
			fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } },
			font: { name: "Inter", size: 10, color: { argb: "FF0F172A" } },
			alignment: {
				vertical: "top",
				wrapText: "multiline" in column && column.multiline
			}
		}
	}));

	const lastColumnLetter = getTemplateColumnLetter(IMPORT_TEMPLATE_COLUMNS.length);
	worksheet.mergeCells(`B1:${lastColumnLetter}1`);
	worksheet.mergeCells(`B2:${lastColumnLetter}2`);
	worksheet.getRow(1).height = 36;
	worksheet.getRow(2).height = 42;
	worksheet.getCell("B1").value = title;
	worksheet.getCell("B2").value = instruction;
	worksheet.getCell("B1").font = { name: "Inter", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
	worksheet.getCell("B2").font = { name: "Inter", size: 11, color: { argb: "FFFFFFFF" } };
	worksheet.getCell("B1").alignment = { horizontal: "left", vertical: "middle" };
	worksheet.getCell("B2").alignment = { horizontal: "left", vertical: "middle", wrapText: true };
	for(let rowNumber = 1; rowNumber <= 2; rowNumber++) {
		for(let columnNumber = 1; columnNumber <= IMPORT_TEMPLATE_COLUMNS.length; columnNumber++) {
			const cell = worksheet.getCell(`${getTemplateColumnLetter(columnNumber)}${rowNumber}`);
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
		}
	}

	worksheet.getCell("A3").value = "Total Rows";
	worksheet.getCell("B3").value = rows.length;
	worksheet.getCell("A3").font = { name: "Inter", size: 10, bold: true };
	worksheet.getCell("B3").font = { name: "Inter", size: 10, bold: true };

	const headerRowNumber = 4;
	for(let index = 0; index < IMPORT_TEMPLATE_COLUMNS.length; index++) {
		const column = IMPORT_TEMPLATE_COLUMNS[index];
		const columnLetter = getTemplateColumnLetter(index + 1);
		const cell = worksheet.getCell(`${columnLetter}${headerRowNumber}`);
		cell.value = column.label;
		cell.font = { name: "Inter", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
		cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
		cell.alignment = { vertical: "middle", wrapText: true };
	}

	rows.forEach((row, rowIndex) => {
		const worksheetRow = worksheet.getRow(headerRowNumber + 1 + rowIndex);
		worksheetRow.getCell(1).value = row.name;
		worksheetRow.getCell(2).value = row.email;
		worksheetRow.getCell(3).value = row.addresses.join("\n");
		worksheetRow.getCell(4).value = row.phoneNumbers.join("\n");
		worksheetRow.getCell(5).value = row.whatsappNumber;
		worksheetRow.getCell(6).value = row.smsNumber;
		worksheetRow.getCell(7).value = row.collateralRegistryName;
		worksheetRow.getCell(8).value = row.collateralName;
		worksheetRow.getCell(9).value = row.collateralDescription;
		worksheetRow.getCell(10).value = row.assetId;
		worksheetRow.getCell(11).value = row.assetName;
		worksheetRow.getCell(12).value = row.assetDescription;
		worksheetRow.getCell(13).value = row.period;
		worksheetRow.getCell(14).value = row.installment;
		worksheetRow.getCell(15).value = row.downPayment;
		worksheetRow.getCell(16).value = row.plafond;
		worksheetRow.getCell(17).value = row.vendor;
		worksheetRow.getCell(18).value = row.remarks;
		worksheetRow.getCell(19).value = row.otherText1;
		worksheetRow.getCell(20).value = row.otherText2;
		worksheetRow.getCell(21).value = row.otherNumber1;
		worksheetRow.getCell(22).value = row.otherNumber2;
		worksheetRow.getCell(23).value = row.otherDate1.slice(0, 10);
		worksheetRow.getCell(24).value = row.otherDate2.slice(0, 10);
		worksheetRow.getCell(25).value = JSON.stringify(row.others);
	});

	for(let i = IMPORT_TEMPLATE_COLUMNS.length; i <= 16384; i++)
		worksheet.getColumn(i).hidden = true;

	return Buffer.from(await workbook.xlsx.writeBuffer());
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedCreditApplicationImports] Starting credit application import seeding...");

// Get acting user (admin)
console.log("[seedCreditApplicationImports] Looking up admin user...");
const actingUser = (await payload.find({
	collection: "users",
	overrideAccess: true,
	where: {
		email: { equals: "admin@local.local" }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
})).docs[0];
if(actingUser == null) throw new Error("Seed admin user is missing. Run 'payload run ./scripts/seedUsers.ts' first.");

// Build workbooks
console.log("[seedCreditApplicationImports] Building approved workbook...");
const approvedBuffer = await buildImportWorkbookBuffer(
	CREDIT_APPLICATION_SEEDS,
	"Seed Credit Application Import",
	"Approved import workbook containing the credit application rows used by the seed scripts."
);
console.log("[seedCreditApplicationImports] Building pending workbook...");
const pendingBuffer = await buildImportWorkbookBuffer(
	[CREDIT_APPLICATION_SEEDS[0]],
	"Pending Credit Application Import",
	"Pending import workbook kept unreviewed so the collection always has an approver-facing request."
);

// Upsert approved import
console.log(`[seedCreditApplicationImports] Checking existing approved import '${APPROVED_IMPORT_FILENAME}'...`);
const existingApproved = (await payload.find({
	collection: "credit-application-imports",
	overrideAccess: true,
	where: {
		filename: { equals: APPROVED_IMPORT_FILENAME }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: true,
	trash: true,
	depth: 0
})).docs[0];

if(existingApproved == null) {
	console.log("[seedCreditApplicationImports] Creating approved import...");
	await payload.create({
		collection: "credit-application-imports",
		user: actingUser,
		overrideAccess: true,
		file: {
			name: APPROVED_IMPORT_FILENAME,
			data: approvedBuffer,
			size: approvedBuffer.byteLength,
			mimetype: XLSX_MIME_TYPE
		},
		overwriteExistingFiles: true,
		data: {
			description: lexicalPlainText("Approved seed import containing the canonical credit application rows."),
			deletedAt: null,
			deletedBy: null,
			reviewedAt: isoAt(400),
			reviewedBy: actingUser.id,
			reviewApproved: true,
			reviewComment: lexicalPlainText("Seed approved import for imported credit applications.")
		}
	});
} else
	console.log(`[seedCreditApplicationImports] Approved import already exists (id: ${existingApproved.id}), skipping.`);

// Upsert pending import
console.log(`[seedCreditApplicationImports] Checking existing pending import '${PENDING_IMPORT_FILENAME}'...`);
const existingPending = (await payload.find({
	collection: "credit-application-imports",
	overrideAccess: true,
	where: {
		filename: { equals: PENDING_IMPORT_FILENAME }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: true,
	trash: true,
	depth: 0
})).docs[0];

if(existingPending == null) {
	console.log("[seedCreditApplicationImports] Creating pending import...");
	await payload.create({
		collection: "credit-application-imports",
		user: actingUser,
		overrideAccess: true,
		file: {
			name: PENDING_IMPORT_FILENAME,
			data: pendingBuffer,
			size: pendingBuffer.byteLength,
			mimetype: XLSX_MIME_TYPE
		},
		overwriteExistingFiles: true,
		data: {
			description: lexicalPlainText("Pending seed import kept available for approver review scenarios."),
			deletedAt: null,
			deletedBy: null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
} else {
	console.log(`[seedCreditApplicationImports] Updating existing pending import (id: ${existingPending.id})...`);
	await payload.update({
		collection: "credit-application-imports",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id: existingPending.id,
		data: {
			description: lexicalPlainText("Pending seed import kept available for approver review scenarios."),
			deletedAt: null,
			deletedBy: null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
}

console.log("[seedCreditApplicationImports] Done. Seeded credit application imports with one approved workbook and one pending workbook.");
