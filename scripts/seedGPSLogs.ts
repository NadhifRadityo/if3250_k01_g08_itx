import { randomUUID } from "crypto";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const TIMESTAMP_BASE = new Date(1778889600000);
const APPROVED_IMPORT_FILENAME = "seed-credit-applications-approved.xlsx";

const USER_EMAILS: Record<string, string> = {
	"officer-bandung-1": "officer.bandung.01@local.local",
	"officer-bandung-2": "officer.bandung.02@local.local",
	"officer-jakarta-1": "officer.jakarta.01@local.local"
};

const CREDIT_APPLICATION_SEEDS = [
	{ key: "CA-SEED-001", name: "Sinta Maharani", email: "sinta.maharani@seed.local" },
	{ key: "CA-SEED-002", name: "Doni Saputra", email: "doni.saputra@seed.local" },
	{ key: "CA-SEED-003", name: "Mila Kartika", email: "mila.kartika@seed.local" }
];

// Officer rotation matches seedCreditApplicationAssignments.ts
type SeedGps = {
	createdAt: string;
	latitude: number;
	longitude: number;
	accuracy: number;
	officerKey: string;
	sessionId: string;
	creditApplicationKey: string;
};

function isoAt(minutesOffset: number): string {
	const value = new Date(TIMESTAMP_BASE);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

// Simulate JWT sid values (one per officer session)
const SESSION_IDS: Record<string, string> = {
	"GPS-SESSION-001": randomUUID(),
	"GPS-SESSION-002": randomUUID(),
	"GPS-SESSION-003": randomUUID()
};

const GPS_LOG_SEEDS: SeedGps[] = [
	{
		createdAt: isoAt(800),
		officerKey: "officer-bandung-1",
		sessionId: "GPS-SESSION-001",
		creditApplicationKey: "CA-SEED-001",
		latitude: -6.914744,
		longitude: 107.60981,
		accuracy: 8.5
	},
	{
		createdAt: isoAt(805),
		officerKey: "officer-bandung-1",
		sessionId: "GPS-SESSION-001",
		creditApplicationKey: "CA-SEED-001",
		latitude: -6.915201,
		longitude: 107.61112,
		accuracy: 12.3
	},
	{
		createdAt: isoAt(810),
		officerKey: "officer-bandung-2",
		sessionId: "GPS-SESSION-002",
		creditApplicationKey: "CA-SEED-003",
		latitude: -6.92712,
		longitude: 107.62783,
		accuracy: 6.2
	},
	{
		createdAt: isoAt(815),
		officerKey: "officer-jakarta-1",
		sessionId: "GPS-SESSION-003",
		creditApplicationKey: "CA-SEED-002",
		latitude: -6.21462,
		longitude: 106.84513,
		accuracy: 15.0
	}
];

const payload = await getPayload({ config: payloadConfig });

console.log("[seedGPSLogs] Starting GPS log seeding...");

// Build user ID map
console.log("[seedGPSLogs] Building user ID map...");
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
console.log("[seedGPSLogs] Looking up approved import...");
const approvedImport = (await payload.find({
	collection: "credit-application-imports",
	overrideAccess: true,
	where: { filename: { equals: APPROVED_IMPORT_FILENAME } },
	limit: 1,
	sort: "-updatedAt",
	draft: true,
	trash: true,
	depth: 0
})).docs[0];
if(approvedImport == null) throw new Error("Approved import workbook is missing. Run 'payload run ./scripts/seedCreditApplicationImports.ts' first.");

// Build credit application ID map
console.log("[seedGPSLogs] Building credit application ID map...");
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

// Build officer task ID map (chain head for each assignment)
console.log("[seedGPSLogs] Building officer task ID map...");
const officerTaskIdMap = new Map<string, string>();
for(const seed of CREDIT_APPLICATION_SEEDS) {
	const assignment = (await payload.find({
		collection: "credit-application-assignments",
		overrideAccess: true,
		where: { creditApplication: { equals: creditApplicationIdMap.get(seed.key) } },
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		depth: 0
	})).docs[0];
	if(assignment == null) throw new Error(`Assignment for '${seed.key}' is missing. Run 'payload run ./scripts/seedCreditApplicationAssignments.ts' first.`);
	const officerTask = (await payload.find({
		collection: "officer-tasks",
		overrideAccess: true,
		where: {
			and: [
				{ creditApplicationAssignment: { equals: assignment.id } },
				{ next: { exists: false } }
			]
		},
		limit: 1,
		depth: 0
	})).docs[0];
	if(officerTask == null) throw new Error(`Officer task for '${seed.key}' is missing. Run 'payload run ./scripts/seedCreditApplicationAssignments.ts' first.`);
	officerTaskIdMap.set(seed.key, officerTask.id);
}

// Seed GPS logs
for(const seed of GPS_LOG_SEEDS) {
	console.log(`[seedGPSLogs] Checking existing GPS log (session: ${seed.sessionId}, lat: ${seed.latitude}, lng: ${seed.longitude})...`);
	const existing = (await payload.find({
		collection: "gps-logs",
		overrideAccess: true,
		where: {
			and: [
				{ createdAt: { equals: seed.createdAt } },
				{ sessionId: { equals: SESSION_IDS[seed.sessionId] } },
				{ latitude: { equals: seed.latitude } },
				{ longitude: { equals: seed.longitude } }
			]
		},
		limit: 1,
		depth: 0
	})).docs[0];

	if(existing == null) {
		console.log(`[seedGPSLogs] Creating GPS log for session ${seed.sessionId}...`);
		await payload.create({
			collection: "gps-logs",
			overrideAccess: true,
			data: {
				createdAt: seed.createdAt,
				user: userIdMap.get(seed.officerKey)!,
				sessionId: SESSION_IDS[seed.sessionId],
				officerTask: officerTaskIdMap.get(seed.creditApplicationKey)!,
				latitude: seed.latitude,
				longitude: seed.longitude,
				accuracy: seed.accuracy
			}
		});
	} else
		console.log(`[seedGPSLogs] GPS log for session ${seed.sessionId} already exists (id: ${existing.id}), skipping.`);
}

console.log(`[seedGPSLogs] Done. Seeded ${GPS_LOG_SEEDS.length} GPS logs.`);
