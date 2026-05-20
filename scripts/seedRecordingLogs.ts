import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_SOURCE_PATH = path.join(SCRIPT_DIRECTORY, "Saphir-Whorf Hypothesis.mp3");
const TRANSCRIPT_SOURCE_PATH = path.join(SCRIPT_DIRECTORY, "Saphir-Whorf Hypothesis.txt");
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

type SeedRecording = {
	createdAt: string;
	creditApplicationKey: string;
	officerKey: string;
	phoneNumber: string;
};

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const RECORDING_LOG_SEEDS: SeedRecording[] = [
	{
		createdAt: isoAt(1000),
		creditApplicationKey: "CA-SEED-001",
		officerKey: "officer-bandung-1",
		phoneNumber: "081200000101"
	},
	{
		createdAt: isoAt(1005),
		creditApplicationKey: "CA-SEED-002",
		officerKey: "officer-jakarta-1",
		phoneNumber: "081200000102"
	},
	{
		createdAt: isoAt(1010),
		creditApplicationKey: "CA-SEED-003",
		officerKey: "officer-bandung-2",
		phoneNumber: "081200000103"
	}
];

const payload = await getPayload({ config: payloadConfig });

console.log("[seedRecordingLogs] Starting recording log seeding...");

// Build user ID map
console.log("[seedRecordingLogs] Building user ID map...");
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
console.log("[seedRecordingLogs] Looking up approved import...");
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

// Get audio file and transcription
console.log("[seedRecordingLogs] Looking up audio file...");
const audioFile = (await payload.find({
	collection: "recording-log-audio-files",
	overrideAccess: true,
	where: {
		filename: { equals: path.basename(AUDIO_SOURCE_PATH) }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
})).docs[0];
if(audioFile == null) throw new Error("Recording log audio file is missing. Run 'payload run ./scripts/seedRecordingLogAudioFiles.ts' first.");

console.log("[seedRecordingLogs] Looking up transcription...");
const transcription = (await payload.find({
	collection: "recording-log-transcriptions",
	overrideAccess: true,
	where: {
		filename: { equals: path.basename(TRANSCRIPT_SOURCE_PATH) }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
})).docs[0];
if(transcription == null) throw new Error("Recording log transcription is missing. Run 'payload run ./scripts/seedRecordingLogTranscriptions.ts' first.");

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
		sort: "-updatedAt",
		draft: false,
		trash: true,
		depth: 0
	})).docs[0];

	if(existing == null) {
		console.log(`[seedRecordingLogs] Creating recording log for phone ${seed.phoneNumber}...`);
		await payload.create({
			collection: "recording-logs",
			overrideAccess: true,
			data: {
				createdAt: seed.createdAt,
				updatedAt: seed.createdAt,
				creditApplication: creditApplicationIdMap.get(seed.creditApplicationKey)!,
				officer: userIdMap.get(seed.officerKey)!,
				phoneNumber: seed.phoneNumber,
				audioFile: audioFile.id,
				transcription: transcription.id
			}
		});
	} else
		console.log(`[seedRecordingLogs] Recording log for phone ${seed.phoneNumber} already exists (id: ${existing.id}), skipping.`);
}

console.log(`[seedRecordingLogs] Done. Seeded ${RECORDING_LOG_SEEDS.length} recording logs with valid audio and transcription references.`);
