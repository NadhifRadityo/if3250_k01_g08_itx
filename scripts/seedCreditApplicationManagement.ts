import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import type {
	CreditApplicationImport,
	CreditApplicationAssignment
} from "@/payload-types";

const PLACEHOLDER_IMPORT_RELATIVE_PATH = "uploads/credit-application-imports/placeholder-credit-application-import.xlsx";
const SEEDED_IMPORT_FILENAME = "placeholder-credit-application-import.xlsx";
const DEFAULT_REVIEWER_EMAIL = "admin@local.local";
const IMPORT_DESCRIPTION_TEXT = "Seed placeholder file for credit-application-management import records.";
const IMPORT_REVIEW_COMMENT_TEXT = "Seed import placeholder refreshed by seedCreditApplicationManagement script.";
const APPLICATION_REVIEW_COMMENT_TEXT = "Seeded credit application record for dashboard data.";
const ASSIGNMENT_APPROVAL_COMMENT_TEXT = "Seeded assignment approved for initial workflow.";
const ASSIGNMENT_REJECTION_COMMENT_TEXT = "Seeded assignment rejected for initial workflow.";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, "..");
const PLACEHOLDER_IMPORT_ABSOLUTE_PATH = path.resolve(WORKSPACE_DIRECTORY, PLACEHOLDER_IMPORT_RELATIVE_PATH);

type RichTextValue = NonNullable<CreditApplicationImport["reviewComment"]>;
type AssignmentStatus = "pending" | "approved" | "rejected";
type SeedImportResult = {
	id: string;
	created: boolean;
};
type SeededApplicationReference = {
	seedKey: string;
	id: string;
	assignmentStatus: AssignmentStatus;
};
type LocationPointSeed = {
	latitude: number;
	longitude: number;
	label: string;
	recordedAt: string;
};

type CreditApplicationSeed = {
	seedKey: string;
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
	assignmentStatus: AssignmentStatus;
};

const CREDIT_APPLICATION_SEEDS: CreditApplicationSeed[] = [
	{
		seedKey: "CA-SEED-001",
		name: "Sinta Maharani",
		email: "sinta.maharani@seed.local",
		addresses: ["Jl. Merdeka No. 10, Bandung"],
		phoneNumbers: ["081200000001"],
		whatsappNumber: "081200000001",
		smsNumber: "081200000001",
		collateralRegistryName: "Bandung Registry Office",
		collateralName: "House Certificate",
		collateralDescription: "Residential property certificate.",
		assetId: "ASSET-001",
		assetName: "Toyota Avanza",
		assetDescription: "Vehicle used for family transport.",
		period: 48,
		installment: 3250000,
		downPayment: 15000000,
		plafond: 140000000,
		vendor: "Mandiri Motor",
		remarks: "Seed data row 1.",
		assignmentStatus: "approved"
	},
	{
		seedKey: "CA-SEED-002",
		name: "Rizal Pratama",
		email: "rizal.pratama@seed.local",
		addresses: ["Jl. Cendana No. 22, Jakarta"],
		phoneNumbers: ["081200000002"],
		whatsappNumber: "081200000002",
		smsNumber: "081200000002",
		collateralRegistryName: "Jakarta Registry Office",
		collateralName: "Shop House Title",
		collateralDescription: "Commercial property collateral.",
		assetId: "ASSET-002",
		assetName: "Mitsubishi Xpander",
		assetDescription: "Passenger vehicle for rental operations.",
		period: 60,
		installment: 4100000,
		downPayment: 22000000,
		plafond: 185000000,
		vendor: "Cahaya Mobilindo",
		remarks: "Seed data row 2.",
		assignmentStatus: "pending"
	},
	{
		seedKey: "CA-SEED-003",
		name: "Maya Lestari",
		email: "maya.lestari@seed.local",
		addresses: ["Jl. Anggrek No. 18, Surabaya"],
		phoneNumbers: ["081200000003"],
		whatsappNumber: "081200000003",
		smsNumber: "081200000003",
		collateralRegistryName: "Surabaya Registry Office",
		collateralName: "Warehouse Certificate",
		collateralDescription: "Warehouse for distribution business.",
		assetId: "ASSET-003",
		assetName: "Suzuki Ertiga",
		assetDescription: "Company operational car.",
		period: 36,
		installment: 3700000,
		downPayment: 18000000,
		plafond: 125000000,
		vendor: "Surya Auto",
		remarks: "Seed data row 3.",
		assignmentStatus: "rejected"
	},
	{
		seedKey: "CA-SEED-004",
		name: "Doni Saputra",
		email: "doni.saputra@seed.local",
		addresses: ["Jl. Pahlawan No. 7, Yogyakarta"],
		phoneNumbers: ["081200000004"],
		whatsappNumber: "081200000004",
		smsNumber: "081200000004",
		collateralRegistryName: "Yogyakarta Registry Office",
		collateralName: "Land Certificate",
		collateralDescription: "Land collateral near city center.",
		assetId: "ASSET-004",
		assetName: "Honda BR-V",
		assetDescription: "Vehicle for personal and business use.",
		period: 24,
		installment: 5200000,
		downPayment: 30000000,
		plafond: 98000000,
		vendor: "Nusantara Auto",
		remarks: "Seed data row 4.",
		assignmentStatus: "approved"
	},
	{
		seedKey: "CA-SEED-005",
		name: "Nadia Puspita",
		email: "nadia.puspita@seed.local",
		addresses: ["Jl. Kenanga No. 44, Semarang"],
		phoneNumbers: ["081200000005"],
		whatsappNumber: "081200000005",
		smsNumber: "081200000005",
		collateralRegistryName: "Semarang Registry Office",
		collateralName: "Apartment Ownership",
		collateralDescription: "Apartment collateral document.",
		assetId: "ASSET-005",
		assetName: "Daihatsu Terios",
		assetDescription: "Passenger car for daily operations.",
		period: 72,
		installment: 2950000,
		downPayment: 25000000,
		plafond: 165000000,
		vendor: "Mega Motor",
		remarks: "Seed data row 5.",
		assignmentStatus: "pending"
	}
];

function plainTextToRichText(value: string): RichTextValue {
	const text = value.trim();
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
					children: text.length == 0 ? [] : [
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

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function addMinutes(value: string, minutes: number): string {
	const date = new Date(value);
	date.setMinutes(date.getMinutes() + minutes);
	return date.toISOString();
}

function createSeedLocation(index: number, offset = 0): LocationPointSeed {
	const baseLatitude = -6.914744;
	const baseLongitude = 107.60981;
	return {
		latitude: Number((baseLatitude + (index * 0.012) + (offset * 0.002)).toFixed(6)),
		longitude: Number((baseLongitude + (index * 0.009) + (offset * 0.0025)).toFixed(6)),
		label: `Seed point ${index + 1}.${offset + 1}`,
		recordedAt: new Date().toISOString()
	};
}

function createTrackingLocations(index: number, now: string): LocationPointSeed[] {
	return [0, 1, 2].map(offset => ({
		...createSeedLocation(index, offset),
		label: `Tracking ${offset + 1}`,
		recordedAt: addMinutes(now, index + offset)
	}));
}

async function resolveReviewerUserId(payload: Awaited<ReturnType<typeof getPayload>>): Promise<string | null> {
	const reviewerResult = await payload.find({
		collection: "users",
		where: {
			email: { equals: DEFAULT_REVIEWER_EMAIL }
		},
		limit: 1,
		sort: "-updatedAt",
		trash: true,
		overrideAccess: true
	});

	return reviewerResult.docs[0]?.id ?? null;
}

async function ensureSeedImportDocument(payload: Awaited<ReturnType<typeof getPayload>>): Promise<SeedImportResult> {
	let placeholderData: Buffer;
	try {
		placeholderData = await readFile(PLACEHOLDER_IMPORT_ABSOLUTE_PATH);
	} catch(error) {
		if(error != null && typeof error == "object" && "code" in error && error.code == "ENOENT")
			placeholderData = Buffer.from("Seed placeholder file for credit application import.\n", "utf8");
		else
			throw error;
	}
	if(placeholderData.byteLength == 0)
		throw new Error(`Placeholder import file is empty: ${PLACEHOLDER_IMPORT_RELATIVE_PATH}`);

	const existingResult = await payload.find({
		collection: "credit-application-imports",
		where: {
			filename: { equals: SEEDED_IMPORT_FILENAME }
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		overrideAccess: true
	});

	const normalizedImportData: Partial<CreditApplicationImport> = {
		description: plainTextToRichText(IMPORT_DESCRIPTION_TEXT),
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: plainTextToRichText(IMPORT_REVIEW_COMMENT_TEXT),
		deletedAt: null,
		deletedBy: null
	};

	if(existingResult.docs.length > 0) {
		const existingDoc = existingResult.docs[0];
		await payload.update({
			collection: "credit-application-imports",
			id: existingDoc.id,
			overrideAccess: true,
			trash: true,
			data: normalizedImportData
		});
		return { id: existingDoc.id, created: false };
	}

	const createdDoc = await payload.create({
		collection: "credit-application-imports",
		overrideAccess: true,
		file: {
			name: SEEDED_IMPORT_FILENAME,
			data: placeholderData,
			size: placeholderData.byteLength,
			mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		},
		data: normalizedImportData
	});

	return { id: createdDoc.id, created: true };
}

function resolveCreditApplicationSeedData(
	importId: string,
	seed: CreditApplicationSeed,
	reviewerId: string | null,
	index: number,
	now: string
) {
	return {
		_status: "published" as const,
		import: importId,
		name: seed.name,
		email: seed.email,
		addresses: seed.addresses,
		phoneNumbers: seed.phoneNumbers,
		whatsappNumber: seed.whatsappNumber,
		smsNumber: seed.smsNumber,
		collateralRegistryName: seed.collateralRegistryName,
		collateralName: seed.collateralName,
		collateralDescription: plainTextToRichText(seed.collateralDescription),
		assetId: seed.assetId,
		assetName: seed.assetName,
		assetDescription: plainTextToRichText(seed.assetDescription),
		period: seed.period,
		installment: seed.installment,
		downPayment: seed.downPayment,
		plafond: seed.plafond,
		vendor: seed.vendor,
		remarks: plainTextToRichText(seed.remarks),
		otherText1: seed.seedKey,
		otherText2: "credit-application-management-seed",
		otherNumber1: index + 1,
		otherNumber2: null,
		otherDate1: now,
		otherDate2: null,
		others: {
			seededBy: "seedCreditApplicationManagement",
			seedKey: seed.seedKey,
			assignmentStatus: seed.assignmentStatus,
			surveyDate: addMinutes(now, index + 35),
			surveyResult: seed.assignmentStatus == "approved" ? "Finished" : seed.assignmentStatus == "rejected" ? "Rejected" : "Draft",
			rescheduleDate: seed.assignmentStatus == "pending" ? addMinutes(now, 1440 + index) : null,
			rescheduleTime: seed.assignmentStatus == "pending" ? "10:30" : null,
			tracking: createTrackingLocations(index, now),
			trackingLocations: createTrackingLocations(index, now),
			firstLoginLocation: {
				...createSeedLocation(index, 0),
				label: "First Login",
				recordedAt: addMinutes(now, index)
			},
			lastLogoutLocation: {
				...createSeedLocation(index, 3),
				label: "Last Logout",
				recordedAt: addMinutes(now, index + 180)
			},
			picture1: `https://example.com/seed/${seed.seedKey.toLowerCase()}-picture-1.jpg`,
			picture1Location: {
				...createSeedLocation(index, 1),
				label: "Picture 1",
				recordedAt: addMinutes(now, index + 45)
			},
			picture12: `https://example.com/seed/${seed.seedKey.toLowerCase()}-picture-12.jpg`,
			picture12Location: {
				...createSeedLocation(index, 2),
				label: "Picture 12",
				recordedAt: addMinutes(now, index + 90)
			}
		},
		reviewedAt: now,
		reviewedBy: reviewerId,
		reviewApproved: true,
		reviewComment: plainTextToRichText(APPLICATION_REVIEW_COMMENT_TEXT),
		deletedAt: null,
		deletedBy: null
	};
}

async function ensureSeedCreditApplications(
	payload: Awaited<ReturnType<typeof getPayload>>,
	importId: string,
	reviewerId: string | null,
	now: string
): Promise<SeededApplicationReference[]> {
	const ensuredRows: SeededApplicationReference[] = [];

	for(const [index, seed] of CREDIT_APPLICATION_SEEDS.entries()) {
		const existingResult = await payload.find({
			collection: "credit-applications",
			where: {
				and: [
					{ import: { equals: importId } },
					{ otherText1: { equals: seed.seedKey } }
				]
			},
			limit: 1,
			sort: "-updatedAt",
			draft: true,
			trash: true,
			overrideAccess: true
		});

		const normalizedData = resolveCreditApplicationSeedData(importId, seed, reviewerId, index, now);

		if(existingResult.docs.length > 0) {
			const existingDoc = existingResult.docs[0];
			const updatedDoc = await payload.update({
				collection: "credit-applications",
				id: existingDoc.id,
				overrideAccess: true,
				trash: true,
				data: normalizedData,
				draft: false
			});
			ensuredRows.push({
				seedKey: seed.seedKey,
				id: String(updatedDoc.id),
				assignmentStatus: seed.assignmentStatus
			});
			continue;
		}

		const createdDoc = await payload.create({
			collection: "credit-applications",
			overrideAccess: true,
			data: normalizedData,
			draft: false
		});

		ensuredRows.push({
			seedKey: seed.seedKey,
			id: String(createdDoc.id),
			assignmentStatus: seed.assignmentStatus
		});
	}

	return ensuredRows;
}

async function resolveOfficerUserIds(payload: Awaited<ReturnType<typeof getPayload>>): Promise<string[]> {
	const officersResult = await payload.find({
		collection: "users",
		where: {
			"role.level": { equals: "officer" }
		},
		limit: 200,
		sort: "name",
		depth: 0,
		trash: true,
		overrideAccess: true
	});

	return officersResult.docs
		.map(doc => String(doc.id))
		.filter(id => id.trim().length > 0);
}

function resolveAssignmentReviewData(
	status: AssignmentStatus,
	now: string,
	reviewerId: string | null
): Pick<CreditApplicationAssignment, "reviewedAt" | "reviewedBy" | "reviewApproved" | "reviewComment"> {
	if(status == "pending") {
		return {
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		};
	}

	if(status == "approved") {
		return {
			reviewedAt: now,
			reviewedBy: reviewerId,
			reviewApproved: true,
			reviewComment: plainTextToRichText(ASSIGNMENT_APPROVAL_COMMENT_TEXT)
		};
	}

	return {
		reviewedAt: now,
		reviewedBy: reviewerId,
		reviewApproved: false,
		reviewComment: plainTextToRichText(ASSIGNMENT_REJECTION_COMMENT_TEXT)
	};
}

async function ensureSeedAssignments(
	payload: Awaited<ReturnType<typeof getPayload>>,
	seededApplications: SeededApplicationReference[],
	reviewerId: string | null,
	now: string
): Promise<void> {
	const officerUserIds = await resolveOfficerUserIds(payload);
	if(officerUserIds.length == 0)
		throw new Error("No officer users found. Run seed:example before running this script.");

	for(const [index, seededApplication] of seededApplications.entries()) {
		const existingResult = await payload.find({
			collection: "credit-application-assignments",
			where: {
				creditApplication: { equals: seededApplication.id }
			},
			limit: 1,
			sort: "-updatedAt",
			draft: true,
			trash: true,
			overrideAccess: true
		});

		const assignedOfficerId = officerUserIds[index % officerUserIds.length];
		const reviewData = resolveAssignmentReviewData(seededApplication.assignmentStatus, now, reviewerId);
		const createdAt = addMinutes(now, index);
		const updatedAt = addMinutes(now, index + 180);
		const normalizedData = {
			_status: "published" as const,
			createdAt,
			updatedAt,
			creditApplication: seededApplication.id,
			officer: assignedOfficerId,
			reviewedAt: reviewData.reviewedAt,
			reviewedBy: getRelationshipId(reviewData.reviewedBy),
			reviewApproved: reviewData.reviewApproved,
			reviewComment: reviewData.reviewComment,
			deletedAt: null,
			deletedBy: null
		};

		if(existingResult.docs.length > 0) {
			await payload.update({
				collection: "credit-application-assignments",
				id: existingResult.docs[0].id,
				overrideAccess: true,
				trash: true,
				data: normalizedData,
				draft: false
			});
			continue;
		}

		await payload.create({
			collection: "credit-application-assignments",
			overrideAccess: true,
			data: normalizedData,
			draft: false
		});
	}
}

const payload = await getPayload({ config: payloadConfig });
const now = new Date().toISOString();

const reviewerId = await resolveReviewerUserId(payload);
if(reviewerId == null)
	console.warn("Reviewer user not found. Reviewer relationship fields will be set to null.");

const importResult = await ensureSeedImportDocument(payload);
if(importResult.created)
	console.log(`Created credit application import '${SEEDED_IMPORT_FILENAME}'.`);
else
	console.log(`Normalized credit application import '${SEEDED_IMPORT_FILENAME}'.`);

const seededApplications = await ensureSeedCreditApplications(payload, importResult.id, reviewerId, now);
await ensureSeedAssignments(payload, seededApplications, reviewerId, now);

console.log(`Seeded credit-application-management and credit-application-assignment data (${seededApplications.length} applications).`);
