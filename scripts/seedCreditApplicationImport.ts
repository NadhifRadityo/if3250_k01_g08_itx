import fs from "fs/promises";
import path from "path";

import ExcelJS from "@/utils/exceljs";

// Mock credit application data
type MockCreditApplication = {
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
	period: number;
	installment: number;
	downPayment: number;
	plafond: number;
	vendor: string;
	remarks: string;
	otherText1: string;
	otherText2: string;
	otherNumber1: number;
	otherNumber2: number;
	otherDate1: string;
	otherDate2: string;
	others: string;
};

// Template column definitions (must match import.components.tsx)
const TEMPLATE_COLUMNS = [
	{ key: "name", label: "Name", width: 28, required: true, type: "text", example: "Example Applicant", promptTitle: "Name", prompt: "Enter a non-empty applicant name.", error: "Name is required." },
	{ key: "email", label: "Email", width: 30, type: "email", example: "example@applicant.test", promptTitle: "Email", prompt: "Optional. When filled, enter a valid email address.", error: "Enter a valid email address or leave it blank." },
	{ key: "addresses", label: "Addresses", width: 34, required: true, multiline: true, type: "text", example: "Jl. Sudirman No. 1\nJakarta", promptTitle: "Addresses", prompt: "Enter at least one address. Use a new line for each additional address.", error: "Addresses must contain at least one non-empty line." },
	{ key: "phoneNumbers", label: "Phone Numbers", width: 24, required: true, multiline: true, type: "text", example: "081234567890\n0215551234", promptTitle: "Phone Numbers", prompt: "Enter at least one phone number. Use a new line for each additional phone number.", error: "Phone numbers must contain at least one non-empty line." },
	{ key: "whatsappNumber", label: "WhatsApp Number", width: 20, required: true, type: "text", example: "081234567890", promptTitle: "WhatsApp Number", prompt: "Enter the main WhatsApp number.", error: "WhatsApp number is required." },
	{ key: "smsNumber", label: "SMS Number", width: 20, type: "text", example: "081234567890", promptTitle: "SMS Number", prompt: "Optional. Enter the SMS number when available." },
	{ key: "collateralRegistryName", label: "Collateral Registry Name", width: 24, type: "text", example: "BPKB", promptTitle: "Collateral Registry Name", prompt: "Optional. Enter the collateral registry name." },
	{ key: "collateralName", label: "Collateral Name", width: 24, type: "text", example: "Toyota Avanza 2022", promptTitle: "Collateral Name", prompt: "Optional. Enter the collateral name." },
	{ key: "collateralDescription", label: "Collateral Description", width: 30, multiline: true, type: "text", example: "Black car\nPolice number B 1234 CD", promptTitle: "Collateral Description", prompt: "Optional. Use line breaks for multi-line descriptions." },
	{ key: "assetId", label: "Asset ID", width: 20, type: "text", example: "AST-001", promptTitle: "Asset ID", prompt: "Optional. Enter the asset identifier." },
	{ key: "assetName", label: "Asset Name", width: 24, type: "text", example: "Operational Vehicle", promptTitle: "Asset Name", prompt: "Optional. Enter the asset name." },
	{ key: "assetDescription", label: "Asset Description", width: 30, multiline: true, type: "text", example: "Company-owned vehicle\nUsed for field surveys", promptTitle: "Asset Description", prompt: "Optional. Use line breaks for multi-line descriptions." },
	{ key: "period", label: "Period", width: 14, type: "number", example: "24", promptTitle: "Period", prompt: "Optional. Enter a numeric period value.", error: "Period must be numeric or blank." },
	{ key: "installment", label: "Installment", width: 16, type: "number", example: "1500000", promptTitle: "Installment", prompt: "Optional. Enter a numeric installment value.", error: "Installment must be numeric or blank." },
	{ key: "downPayment", label: "Down Payment", width: 18, type: "number", example: "5000000", promptTitle: "Down Payment", prompt: "Optional. Enter a numeric down payment value.", error: "Down payment must be numeric or blank." },
	{ key: "plafond", label: "Plafond", width: 18, type: "number", example: "120000000", promptTitle: "Plafond", prompt: "Optional. Enter a numeric plafond value.", error: "Plafond must be numeric or blank." },
	{ key: "vendor", label: "Vendor", width: 24, type: "text", example: "PT Vendor Nusantara", promptTitle: "Vendor", prompt: "Optional. Enter the vendor name." },
	{ key: "remarks", label: "Remarks", width: 32, multiline: true, type: "text", example: "Priority customer\nRequested fast processing", promptTitle: "Remarks", prompt: "Optional. Use line breaks for multi-line remarks." },
	{ key: "otherText1", label: "Other Text 1", width: 18, type: "text", example: "Referral A", promptTitle: "Other Text 1", prompt: "Optional. Enter an additional text value." },
	{ key: "otherText2", label: "Other Text 2", width: 18, type: "text", example: "Referral B", promptTitle: "Other Text 2", prompt: "Optional. Enter an additional text value." },
	{ key: "otherNumber1", label: "Other Number 1", width: 16, type: "number", example: "12", promptTitle: "Other Number 1", prompt: "Optional. Enter a numeric value.", error: "Other Number 1 must be numeric or blank." },
	{ key: "otherNumber2", label: "Other Number 2", width: 16, type: "number", example: "34", promptTitle: "Other Number 2", prompt: "Optional. Enter a numeric value.", error: "Other Number 2 must be numeric or blank." },
	{ key: "otherDate1", label: "Other Date 1", width: 16, type: "date", example: "2026-04-25", promptTitle: "Other Date 1", prompt: "Optional. Enter a valid date in YYYY-MM-DD format or use Excel's date picker.", error: "Other Date 1 must be a valid date or blank." },
	{ key: "otherDate2", label: "Other Date 2", width: 16, type: "date", example: "2026-05-01", promptTitle: "Other Date 2", prompt: "Optional. Enter a valid date in YYYY-MM-DD format or use Excel's date picker.", error: "Other Date 2 must be a valid date or blank." },
	{ key: "others", label: "Others", width: 32, multiline: true, type: "json", example: "{\"source\":\"expo\",\"priority\":true}", promptTitle: "Others", prompt: "Optional. Enter plain text or valid JSON." }
];

const TEMPLATE_HEADER_ROW = 4;
const TEMPLATE_DATA_START_ROW = 5;
const TEMPLATE_DATA_END_ROW = 256;

const INDONESIAN_FIRST_NAMES = [
	"Budi", "Siti", "Ahmad", "Dewi", "Rudi",
	"Diana", "Eko", "Fina", "Gunawan", "Hana",
	"Indra", "Joko", "Kencana", "Lestari", "Marta",
	"Nurul", "Oki", "Putri", "Qori", "Rani",
	"Sugeng", "Tuti", "Umar", "Vina", "Widi"
];
const INDONESIAN_LAST_NAMES = [
	"Santoso", "Nurhaliza", "Rahman", "Lestari", "Hermawan",
	"Putri", "Suryanto", "Adriana", "Wijaya", "Kartika",
	"Kusuma", "Supriyanto", "Dewi", "Wijaya", "Sari",
	"Azis", "Setia", "Ayu", "Nurfadilah", "Kusuma",
	"Riyanto", "Hermawan", "Faruq", "Kartika", "Santoso"
];

const INDONESIAN_STREETS = [
	"Jl. Sudirman", "Jl. Thamrin", "Jl. Gatot Subroto", "Jl. Kuningan", "Jl. Rasuna Said",
	"Jl. Senayan", "Jl. Boulevard", "Jl. Barat", "Jl. Utara", "Jl. Timur",
	"Jl. Selatan", "Jl. Raya", "Jl. Makmur", "Jl. Merdeka", "Jl. Kemerdekaan"
];

const INDONESIAN_CITIES = [
	"Jakarta", "Bandung", "Surabaya", "Medan", "Semarang",
	"Makassar", "Palembang", "Yogyakarta", "Cirebon", "Bogor",
	"Tangerang", "Bekasi", "Depok", "Pontianak", "Manado"
];

const COLLATERAL_TYPES = [
	"BPKB", "Sertifikat Rumah", "Sertifikat Tanah", "Surat Kendaraan", "SKCK",
	"SHM", "Surat Gadai", "Sertifikat Deposito", "Obligasi", "Reksadana"
];

const COLLATERAL_NAMES = [
	"Toyota Avanza 2022", "Honda CR-V 2021", "Daihatsu Xenia 2020", "Mitsubishi Pajero 2021",
	"Rumah Minimalis 2 Lantai", "Rumah Toko", "Ruko 2 Lantai", "Tanah Kavling",
	"Mobil Operasional", "Kendaraan Roda 4", "Aset Tetap", "Mesin Pabrik"
];

const VENDORS = [
	"PT Vendor Nusantara", "CV Perdagangan Utama", "PT Jaya Makmur", "UD Sukses Bersama",
	"PT Mitra Bisnis", "CV Karya Bersama", "PT Sukses Global", "UD Usaha Mandiri",
	"PT Raih Sejahtera", "CV Momentum Bisnis"
];

const REFERRAL_SOURCES = [
	"Referral A", "Referral B", "Bank Partner", "Direct", "Online"
];

function getRandomItem<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhoneNumber(): string {
	return `08${getRandomInt(100000000, 999999999)}`;
}

function generateEmail(name: string): string {
	const sanitized = name.toLowerCase().replace(/\s+/g, ".");
	return `${sanitized}@applicant.local`;
}

function generateAddresses(): string[] {
	const count = getRandomInt(1, 2);
	const addresses: string[] = [];
	for(let i = 0; i < count; i++) {
		const street = getRandomItem(INDONESIAN_STREETS);
		const number = getRandomInt(1, 999);
		const city = getRandomItem(INDONESIAN_CITIES);
		addresses.push(`${street} No. ${number}\n${city}`);
	}
	return addresses;
}

function generatePhoneNumbers(): string[] {
	const count = getRandomInt(1, 2);
	const phones: string[] = [];
	for(let i = 0; i < count; i++)
		phones.push(generatePhoneNumber());

	return phones;
}

function generateDate(daysFromNow: number): string {
	const date = new Date();
	date.setDate(date.getDate() + daysFromNow);
	return date.toISOString().split("T")[0];
}

function generateMockCreditApplication(index: number): MockCreditApplication {
	const name = getRandomItem(INDONESIAN_FIRST_NAMES) + " " + getRandomItem(INDONESIAN_LAST_NAMES);
	return {
		name,
		email: generateEmail(name),
		addresses: generateAddresses(),
		phoneNumbers: generatePhoneNumbers(),
		whatsappNumber: generatePhoneNumber(),
		smsNumber: getRandomInt(0, 1) == 1 ? generatePhoneNumber() : "",
		collateralRegistryName: getRandomItem(COLLATERAL_TYPES),
		collateralName: getRandomItem(COLLATERAL_NAMES),
		collateralDescription: `${getRandomItem(COLLATERAL_NAMES)}\nKondisi baik`,
		assetId: `AST-${String(index + 1).padStart(4, "0")}`,
		assetName: getRandomItem(COLLATERAL_NAMES),
		assetDescription: "Aset operasional\nTersedia untuk dijaminkan",
		period: getRandomInt(12, 60),
		installment: getRandomInt(500000, 10000000),
		downPayment: getRandomInt(1000000, 50000000),
		plafond: getRandomInt(50000000, 500000000),
		vendor: getRandomItem(VENDORS),
		remarks: "Aplikasi dari customer terpercaya\nStatus: Aktif sejak 2025",
		otherText1: getRandomItem(REFERRAL_SOURCES),
		otherText2: getRandomInt(0, 1) == 1 ? "Priority" : "Regular",
		otherNumber1: getRandomInt(1, 100),
		otherNumber2: getRandomInt(1, 50),
		otherDate1: generateDate(getRandomInt(1, 30)),
		otherDate2: generateDate(getRandomInt(31, 90)),
		others: JSON.stringify({ source: "seed", batchId: Math.floor(index / 10) + 1 })
	};
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

console.log("Generating credit application import template with mock data...");

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet("Credit Applications", {
	pageSetup: {
		fitToWidth: 1,
		fitToHeight: 0,
		orientation: "landscape",
		paperSize: 9,
		margins: {
			top: 0.4,
			right: 0.4,
			bottom: 0.4,
			left: 0.4,
			header: 0.2,
			footer: 0.2
		}
	}
});

// Setup column definitions
worksheet.properties.defaultRowHeight = 22;
worksheet.columns = TEMPLATE_COLUMNS.map(column => ({
	key: column.key,
	width: column.width,
	style: {
		fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } },
		font: { name: "Inter", size: 10, color: { argb: "FF000000" } },
		alignment: {
			vertical: "top",
			wrapText: column.multiline == true
		}
	}
}));

// Setup rows 1-3 (title, instructions, row count)
worksheet.getRow(1).height = 30;
worksheet.getRow(2).height = 44;
worksheet.getRow(3).height = 20;

// Merge cells for title and instructions
const lastColumnLetter = getTemplateColumnLetter(TEMPLATE_COLUMNS.length);
const titleRange = `B1:${lastColumnLetter}1`;
const promptRange = `B2:${lastColumnLetter}2`;

worksheet.mergeCells(titleRange);
worksheet.mergeCells(promptRange);

// Style title and instruction rows
for(let rowNumber = 1; rowNumber <= 2; rowNumber++) {
	for(let columnNumber = 1; columnNumber <= TEMPLATE_COLUMNS.length; columnNumber++) {
		const cell = worksheet.getCell(`${getTemplateColumnLetter(columnNumber)}${rowNumber}`);
		cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
		cell.font = { name: "Inter", size: 10, color: { argb: "FFFFFFFF" } };
	}
}

// Add title
const titleCell = worksheet.getCell("B1");
titleCell.value = "Credit Application Import - Mock Data (100 Applications)";
titleCell.font = { name: "Inter", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
titleCell.alignment = { horizontal: "left", vertical: "middle" };

// Add instructions
const instructionCell = worksheet.getCell("B2");
instructionCell.value = "Mock seed data for testing and development. Contains 100 sample credit applications with realistic data.";
instructionCell.font = { name: "Inter", size: 11, color: { argb: "FFFFFFFF" } };
instructionCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };

// Add row count formula
worksheet.getCell("A3").value = "Total Rows";
worksheet.getCell("B3").value = { formula: `MAX(COUNTA(A${TEMPLATE_DATA_START_ROW}:A${TEMPLATE_DATA_END_ROW}),0)` };
worksheet.getCell("A3").font = { name: "Inter", size: 10, bold: true };
worksheet.getCell("B3").font = { name: "Inter", size: 10, bold: true };

// Setup header row (row 4)
const headerRow = worksheet.getRow(TEMPLATE_HEADER_ROW);
headerRow.height = 24;

for(let index = 0; index < TEMPLATE_COLUMNS.length; index++) {
	const column = TEMPLATE_COLUMNS[index];
	const columnIndex = index + 1;
	const columnLetter = getTemplateColumnLetter(columnIndex);
	const headerCell = worksheet.getCell(`${columnLetter}${TEMPLATE_HEADER_ROW}`);

	headerCell.value = column.label;
	headerCell.font = { name: "Inter", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
	headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
	headerCell.alignment = { vertical: "middle", wrapText: true };

	if(column.type == "date")
		worksheet.getColumn(columnIndex).numFmt = "yyyy-mm-dd";
}

console.log("Generating 100 mock credit applications...");
for(let rowIndex = 0; rowIndex < 100; rowIndex++) {
	const mockData = generateMockCreditApplication(rowIndex);
	const excelRowNumber = TEMPLATE_DATA_START_ROW + rowIndex;
	const excelRow = worksheet.getRow(excelRowNumber);

	for(let columnIndex = 0; columnIndex < TEMPLATE_COLUMNS.length; columnIndex++) {
		const column = TEMPLATE_COLUMNS[columnIndex];
		const columnNumber = columnIndex + 1;
		const columnLetter = getTemplateColumnLetter(columnNumber);
		const cell = excelRow.getCell(columnNumber);

		// Get data for this column
		const dataKey = column.key as keyof MockCreditApplication;
		const value = mockData[dataKey];

		// Handle multiline values
		if(Array.isArray(value))
			cell.value = value.join("\n");
		else if(typeof value == "number")
			cell.value = value;
		else
			cell.value = String(value);

		// Style the cell
		cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } };
		cell.font = { name: "Inter", size: 10, color: { argb: "FF000000" } };
		cell.alignment = {
			vertical: "top",
			wrapText: column.multiline == true
		};
	}

	if((rowIndex + 1) % 10 == 0)
		console.log(`  Generated ${rowIndex + 1}/100 rows`);
}

for(let i = TEMPLATE_COLUMNS.length; i <= 16384; i++)
	worksheet.getColumn(i).hidden = true;

const filePath = path.join(import.meta.dirname, "credit-applications-mock-seed.xlsx");
await fs.writeFile(filePath, Buffer.from(await workbook.xlsx.writeBuffer()));
console.log(`✓ Mock data template saved to: ${filePath}`);
console.log("✓ Total rows: 100 credit applications");
console.log(`✓ File size: ~${Math.round((await fs.stat(filePath)).size / 1024)} KB`);
