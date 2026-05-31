import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const TIMESTAMP_BASE = new Date(1778889600000);
const APPROVED_IMPORT_FILENAME = "seed-credit-applications-approved.xlsx";

const AUDIO_URL = "https://example.com/recordings/saphir-whorf-hypothesis.mp3";
const TRANSCRIPTION_URL = "https://example.com/transcriptions/saphir-whorf-hypothesis.txt";

const CREDIT_APPLICATION_SEEDS = [
	{ key: "CA-SEED-001", name: "Sinta Maharani", email: "sinta.maharani@seed.local" },
	{ key: "CA-SEED-002", name: "Doni Saputra", email: "doni.saputra@seed.local" },
	{ key: "CA-SEED-003", name: "Mila Kartika", email: "mila.kartika@seed.local" }
];

type SeedRecording = {
	createdAt: string;
	creditApplicationKey: string;
	phoneNumber: string;
};

function isoAt(minutesOffset: number): string {
	const value = new Date(TIMESTAMP_BASE);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const RECORDING_LOG_SEEDS: SeedRecording[] = [
	{
		createdAt: isoAt(1000),
		creditApplicationKey: "CA-SEED-001",
		phoneNumber: "081200000101"
	},
	{
		createdAt: isoAt(1005),
		creditApplicationKey: "CA-SEED-002",
		phoneNumber: "081200000102"
	},
	{
		createdAt: isoAt(1010),
		creditApplicationKey: "CA-SEED-003",
		phoneNumber: "081200000103"
	}
];

const payload = await getPayload({ config: payloadConfig });

console.log("[seedRecordingLogs] Starting recording log seeding...");

// Get approved import
console.log("[seedRecordingLogs] Looking up approved import...");
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
console.log("[seedRecordingLogs] Building credit application ID map...");
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
console.log("[seedRecordingLogs] Building officer task ID map...");
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

// Seed recording logs
for(const seed of RECORDING_LOG_SEEDS) {
	console.log(`[seedRecordingLogs] Checking existing recording log (phone: ${seed.phoneNumber}, time: ${seed.createdAt})...`);
	const existing = (await payload.find({
		collection: "recording-logs",
		overrideAccess: true,
		where: {
			and: [
				{ createdAt: { equals: seed.createdAt } },
				{ phoneNumber: { equals: seed.phoneNumber } }
			]
		},
		limit: 1,
		depth: 0
	})).docs[0];

	if(existing == null) {
		console.log(`[seedRecordingLogs] Creating recording log for phone ${seed.phoneNumber}...`);
		await payload.create({
			collection: "recording-logs",
			overrideAccess: true,
			data: {
				createdAt: seed.createdAt,
				officerTask: officerTaskIdMap.get(seed.creditApplicationKey)!,
				phoneNumber: seed.phoneNumber,
				recordingUrl: AUDIO_URL,
				transcriptionUrl: TRANSCRIPTION_URL
			}
		});
	} else
		console.log(`[seedRecordingLogs] Recording log for phone ${seed.phoneNumber} already exists (id: ${existing.id}), skipping.`);
}

console.log(`[seedRecordingLogs] Done. Seeded ${RECORDING_LOG_SEEDS.length} recording logs.`);
