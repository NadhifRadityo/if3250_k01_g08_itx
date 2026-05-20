import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");
const APPROVED_IMPORT_FILENAME = "seed-credit-applications-approved.xlsx";

const USER_EMAILS: Record<string, string> = {
	"admin": "seed.admin@local.local",
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

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
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
		email: { equals: "seed.admin@local.local" }
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

// Seed assignments
for(const [index, seed] of CREDIT_APPLICATION_SEEDS.entries()) {
	const publishedAt = isoAt(600 + index * 6);
	const pendingAt = isoAt(600 + index * 6 + 3);

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

	const publishedData = {
		creditApplication: creditApplicationIdMap.get(seed.key)!,
		officer: userIdMap.get(OFFICER_ROTATION[index % OFFICER_ROTATION.length])!,
		createdAt: publishedAt,
		updatedAt: publishedAt,
		deletedAt: null,
		deletedBy: null,
		_status: "published" as const,
		reviewedAt: publishedAt,
		reviewedBy: actingUser.id,
		reviewApproved: true,
		reviewComment: lexicalPlainText(`Seed approved baseline for assignment '${seed.key}'.`)
	};

	const pendingData = {
		creditApplication: creditApplicationIdMap.get(seed.key)!,
		officer: userIdMap.get(OFFICER_ROTATION[index % OFFICER_ROTATION.length])!,
		createdAt: publishedAt,
		updatedAt: pendingAt,
		deletedAt: null,
		deletedBy: null,
		_status: "draft" as const,
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
			data: pendingData,
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
			data: pendingData,
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

	console.log(`[seedCreditApplicationAssignments] Setting assignment for '${seed.key}' back to draft...`);
	await payload.update({
		collection: "credit-application-assignments",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: pendingData,
		draft: true
	});
}

console.log(`[seedCreditApplicationAssignments] Done. Seeded ${CREDIT_APPLICATION_SEEDS.length} credit application assignments with pending drafts.`);
