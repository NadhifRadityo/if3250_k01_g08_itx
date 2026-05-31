import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";

const TIMESTAMP_BASE = new Date(1778889600000);
const APPROVED_IMPORT_FILENAME = "seed-credit-applications-approved.xlsx";

const USER_EMAILS: Record<string, string> = {
	"admin": "admin@local.local",
	"officer-bandung-1": "officer.bandung.01@local.local",
	"officer-bandung-2": "officer.bandung.02@local.local",
	"officer-jakarta-1": "officer.jakarta.01@local.local",
	"officer-jakarta-2": "officer.jakarta.02@local.local"
};

const CREDIT_APPLICATION_SEEDS = [
	{ key: "CA-SEED-001", name: "Sinta Maharani", email: "sinta.maharani@seed.local" },
	{ key: "CA-SEED-002", name: "Doni Saputra", email: "doni.saputra@seed.local" },
	{ key: "CA-SEED-003", name: "Mila Kartika", email: "mila.kartika@seed.local" }
];

const OFFICER_ROTATION = ["officer-bandung-1", "officer-jakarta-1", "officer-bandung-2"];
const SURVEY_TITLE = "Field Visit Survey";
const SATISFACTION_SURVEY_TITLE = "Post Service Satisfaction Survey";

const GEOFENCE_REGION_SEEDS = [
	[{ id: "seed-region-bandung", operation: "union", type: "circle", latitude: -6.9175, longitude: 107.6191, radius: 1500 }],
	[{ id: "seed-region-jakarta", operation: "union", type: "circle", latitude: -6.2088, longitude: 106.8456, radius: 1500 }],
	[{ id: "seed-region-bandung-alt", operation: "union", type: "circle", latitude: -6.9000, longitude: 107.6500, radius: 1500 }]
];

function isoAt(minutesOffset: number): string {
	const value = new Date(TIMESTAMP_BASE);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedCreditApplicationAssignments] Starting credit application assignment seeding...");

// Get acting user (admin)
console.log("[seedCreditApplicationAssignments] Looking up admin user...");
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

// Build user ID map
console.log("[seedCreditApplicationAssignments] Building user ID map...");
const userIdMap = new Map<string, string>();
for(const [key, email] of Object.entries(USER_EMAILS)) {
	const user = (await payload.find({
		collection: "users",
		overrideAccess: true,
		where: { email: { equals: email } },
		limit: 1,
		sort: "-updatedAt",
		draft: false,
		trash: true,
		depth: 0
	})).docs[0];
	if(user == null) throw new Error(`User '${email}' is missing. Run 'payload run ./scripts/seedUsers.ts' first.`);
	userIdMap.set(key, user.id);
}

// Get approved import
console.log("[seedCreditApplicationAssignments] Looking up approved import...");
const approvedImport = (await payload.find({
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
if(approvedImport == null) throw new Error("Approved import workbook is missing. Run 'payload run ./scripts/seedCreditApplicationImports.ts' first.");

// Build credit application ID map
console.log("[seedCreditApplicationAssignments] Building credit application ID map...");
const creditApplicationIdMap = new Map<string, string>();
for(const seed of CREDIT_APPLICATION_SEEDS) {
	const ca = (await payload.find({
		collection: "credit-applications",
		overrideAccess: true,
		where: {
			and: [
				{ import: { equals: approvedImport.id } },
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
	if(ca == null) throw new Error(`Credit application '${seed.key}' is missing. Run 'payload run ./scripts/seedCreditApplications.ts' first.`);
	creditApplicationIdMap.set(seed.key, ca.id);
}

// Look up survey and satisfaction survey
console.log("[seedCreditApplicationAssignments] Looking up survey and satisfaction survey...");
const survey = (await payload.find({
	collection: "surveys",
	overrideAccess: true,
	where: { title: { equals: SURVEY_TITLE } },
	limit: 1,
	sort: "-updatedAt",
	draft: true,
	trash: true,
	depth: 0
})).docs[0];
if(survey == null) throw new Error(`Survey '${SURVEY_TITLE}' is missing. Run 'payload run ./scripts/seedSurveys.ts' first.`);

const satisfactionSurvey = (await payload.find({
	collection: "satisfaction-surveys",
	overrideAccess: true,
	where: { title: { equals: SATISFACTION_SURVEY_TITLE } },
	limit: 1,
	sort: "-updatedAt",
	draft: true,
	trash: true,
	depth: 0
})).docs[0];
if(satisfactionSurvey == null) throw new Error(`Satisfaction survey '${SATISFACTION_SURVEY_TITLE}' is missing. Run 'payload run ./scripts/seedSatisfactionSurveys.ts' first.`);

// Seed assignments
for(const [index, seed] of CREDIT_APPLICATION_SEEDS.entries()) {
	const publishedAt = isoAt(600 + index * 6);
	const assignedDate = isoAt(600 + index * 6 + 60);
	const dueDate = isoAt(600 + index * 6 + 60 * 24 * 7);

	console.log(`[seedCreditApplicationAssignments] Checking existing assignment for '${seed.key}'...`);
	const existing = (await payload.find({
		collection: "credit-application-assignments",
		overrideAccess: true,
		where: {
			creditApplication: { equals: creditApplicationIdMap.get(seed.key) }
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		depth: 0
	})).docs[0];

	const baseData = {
		creditApplication: creditApplicationIdMap.get(seed.key)!,
		officer: userIdMap.get(OFFICER_ROTATION[index % OFFICER_ROTATION.length])!,
		survey: survey.id,
		satisfactionSurvey: satisfactionSurvey.id,
		assignedDate: assignedDate,
		dueDate: dueDate,
		geofenceRegions: GEOFENCE_REGION_SEEDS[index % GEOFENCE_REGION_SEEDS.length]
	};

	const publishedData = {
		...baseData,
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
		reviewComment: lexicalPlainText(`Seed approved baseline for assignment '${seed.key}'.`)
	};

	const draftData = {
		...baseData,
		createdAt: publishedAt,
		updatedAt: publishedAt,
		deletedAt: null,
		deletedBy: null,
		_status: "draft" as const,
		changeRequestType: "create" as const,
		changeRequestComment: null,
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: null
	};

	let id: string;
	if(existing == null) {
		console.log(`[seedCreditApplicationAssignments] Creating assignment for '${seed.key}' as draft...`);
		const created = await payload.create({
			collection: "credit-application-assignments",
			user: actingUser,
			overrideAccess: true,
			data: draftData,
			draft: true
		});
		id = created.id;
	} else {
		console.log(`[seedCreditApplicationAssignments] Updating existing assignment for '${seed.key}' (id: ${existing.id})...`);
		id = existing.id;
		await payload.update({
			collection: "credit-application-assignments",
			user: actingUser,
			overrideAccess: true,
			trash: true,
			id,
			data: draftData,
			draft: true
		});
	}

	console.log(`[seedCreditApplicationAssignments] Publishing assignment for '${seed.key}'...`);
	await payload.update({
		collection: "credit-application-assignments",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: publishedData,
		draft: false
	});

	// Auto-create chain head officer task (mirrors the approver action in production)
	console.log(`[seedCreditApplicationAssignments] Looking up published version for officer task linkage of '${seed.key}'...`);
	const versionId = (await payload.findVersions({
		collection: "credit-application-assignments",
		overrideAccess: true,
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: id } },
			{ "version._status": { equals: "published" } }
		] },
		select: {}
	})).docs[0]?.id;
	if(versionId == null) throw new Error(`Published version for assignment '${seed.key}' is missing.`);

	const existingChainHead = (await payload.find({
		collection: "officer-tasks",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		depth: 0,
		where: { and: [
			{ creditApplicationAssignment: { equals: id } },
			{ next: { exists: false } }
		] },
		select: {}
	})).docs[0];
	if(existingChainHead == null) {
		console.log(`[seedCreditApplicationAssignments] Creating chain head officer task for '${seed.key}'...`);
		await payload.create({
			collection: "officer-tasks",
			user: actingUser,
			overrideAccess: true,
			data: {
				_status: "published",
				creditApplicationAssignment: id,
				creditApplicationAssignmentVersion: versionId,
				next: null,
				settledAt: null,
				settlementStatus: null,
				settlementComment: null,
				evaluatedAt: null,
				evaluatedBy: null,
				evaluationApproved: null,
				evaluationComment: null
			}
		});
	} else
		console.log(`[seedCreditApplicationAssignments] Chain head officer task for '${seed.key}' already exists (id: ${existingChainHead.id}).`);
}

console.log(`[seedCreditApplicationAssignments] Done. Seeded ${CREDIT_APPLICATION_SEEDS.length} credit application assignments in approved state with chain head officer tasks.`);
