import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");
const APPROVED_IMPORT_FILENAME = "seed-credit-applications-approved.xlsx";

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

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedCreditApplications] Starting credit application seeding...");

// Get acting user (admin)
console.log("[seedCreditApplications] Looking up admin user...");
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

// Get approved import
console.log("[seedCreditApplications] Looking up approved import...");
const importDoc = (await payload.find({
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
if(importDoc == null) throw new Error("Approved import workbook is missing. Run 'payload run ./scripts/seedCreditApplicationImports.ts' first.");

// Seed credit applications
for(const [index, seed] of CREDIT_APPLICATION_SEEDS.entries()) {
	const publishedAt = isoAt(500 + index * 7);
	const pendingAt = isoAt(500 + index * 7 + 3);

	console.log(`[seedCreditApplications] Checking existing credit application '${seed.key}'...`);
	const existing = (await payload.find({
		collection: "credit-applications",
		overrideAccess: true,
		where: {
			and: [
				{ import: { equals: importDoc.id } },
				{ name: { equals: seed.name } },
				{ email: { equals: seed.email } }
			]
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		depth: 0
	})).docs[0];

	const publishedData = {
		import: importDoc.id,
		name: seed.name,
		email: seed.email,
		addresses: seed.addresses,
		phoneNumbers: seed.phoneNumbers,
		whatsappNumber: seed.whatsappNumber,
		smsNumber: seed.smsNumber,
		collateralRegistryName: seed.collateralRegistryName,
		collateralName: seed.collateralName,
		collateralDescription: lexicalPlainText(seed.collateralDescription),
		assetId: seed.assetId,
		assetName: seed.assetName,
		assetDescription: lexicalPlainText(seed.assetDescription),
		period: seed.period,
		installment: seed.installment,
		downPayment: seed.downPayment,
		plafond: seed.plafond,
		vendor: seed.vendor,
		remarks: lexicalPlainText(seed.remarks),
		otherText1: seed.otherText1,
		otherText2: seed.otherText2,
		otherNumber1: seed.otherNumber1,
		otherNumber2: seed.otherNumber2,
		otherDate1: seed.otherDate1,
		otherDate2: seed.otherDate2,
		others: seed.others,
		createdAt: publishedAt,
		updatedAt: publishedAt,
		deletedAt: null,
		deletedBy: null,
		_status: "published" as const,
		changeRequestType: "create" as const,
		changeRequestComment: null,
		reviewedAt: publishedAt,
		reviewedBy: actingUser.id,
		reviewApproved: true,
		reviewComment: lexicalPlainText(`Seed approved baseline for credit application '${seed.key}'.`)
	};

	const pendingData = {
		import: importDoc.id,
		name: seed.name,
		email: seed.email,
		addresses: seed.addresses,
		phoneNumbers: seed.phoneNumbers,
		whatsappNumber: seed.whatsappNumber,
		smsNumber: seed.smsNumber,
		collateralRegistryName: seed.collateralRegistryName,
		collateralName: seed.collateralName,
		collateralDescription: lexicalPlainText(seed.collateralDescription),
		assetId: seed.assetId,
		assetName: seed.assetName,
		assetDescription: lexicalPlainText(seed.assetDescription),
		period: seed.period,
		installment: seed.installment,
		downPayment: seed.downPayment,
		plafond: seed.plafond,
		vendor: seed.vendor,
		remarks: lexicalPlainText(seed.remarks),
		otherText1: seed.otherText1,
		otherText2: seed.otherText2,
		otherNumber1: seed.otherNumber1,
		otherNumber2: seed.otherNumber2,
		otherDate1: seed.otherDate1,
		otherDate2: seed.otherDate2,
		others: seed.others,
		createdAt: publishedAt,
		updatedAt: pendingAt,
		deletedAt: null,
		deletedBy: null,
		_status: "draft" as const,
		changeRequestType: "update" as const,
		changeRequestComment: null,
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: null
	};

	let id: string;
	if(existing == null) {
		console.log(`[seedCreditApplications] Creating credit application '${seed.key}' as draft...`);
		const created = await payload.create({
			collection: "credit-applications",
			user: actingUser,
			overrideAccess: true,
			data: pendingData,
			draft: true
		});
		id = created.id;
	} else {
		console.log(`[seedCreditApplications] Updating existing credit application '${seed.key}' (id: ${existing.id})...`);
		id = existing.id;
		await payload.update({
			collection: "credit-applications",
			user: actingUser,
			overrideAccess: true,
			trash: true,
			id,
			data: pendingData,
			draft: true
		});
	}

	console.log(`[seedCreditApplications] Publishing credit application '${seed.key}'...`);
	await payload.update({
		collection: "credit-applications",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: publishedData,
		draft: false
	});

	console.log(`[seedCreditApplications] Setting credit application '${seed.key}' back to draft...`);
	await payload.update({
		collection: "credit-applications",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: pendingData,
		draft: true
	});
}

console.log(`[seedCreditApplications] Done. Seeded ${CREDIT_APPLICATION_SEEDS.length} credit applications linked to a valid approved import workbook.`);
