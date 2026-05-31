import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const TIMESTAMP_BASE = new Date(1778889600000);
const APPROVED_IMPORT_FILENAME = "seed-credit-applications-approved.xlsx";

const CREDIT_APPLICATION_SEEDS = [
	{ key: "CA-SEED-001", name: "Sinta Maharani", email: "sinta.maharani@seed.local" },
	{ key: "CA-SEED-002", name: "Doni Saputra", email: "doni.saputra@seed.local" },
	{ key: "CA-SEED-003", name: "Mila Kartika", email: "mila.kartika@seed.local" }
];

type SeedMessage = {
	content: string;
	createdAt: string;
	creditApplicationKey: string;
	email: string;
	emailDeliveryStatus: "failed" | "pending" | "sent";
	smsDeliveryStatus: "failed" | "pending" | "sent";
	smsNumber: string;
	whatsappDeliveryStatus: "failed" | "pending" | "sent";
	whatsappNumber: string;
};

function isoAt(minutesOffset: number): string {
	const value = new Date(TIMESTAMP_BASE);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const MESSAGE_LOG_SEEDS: SeedMessage[] = [
	{
		createdAt: isoAt(900),
		creditApplicationKey: "CA-SEED-001",
		content: "Kode OTP Anda adalah 514223 untuk verifikasi survey.",
		email: "sinta.maharani@seed.local",
		whatsappNumber: "081200000101",
		smsNumber: "081200000101",
		emailDeliveryStatus: "sent",
		whatsappDeliveryStatus: "sent",
		smsDeliveryStatus: "pending"
	},
	{
		createdAt: isoAt(905),
		creditApplicationKey: "CA-SEED-002",
		content: "Kode OTP Anda adalah 884211 untuk verifikasi login.",
		email: "doni.saputra@seed.local",
		whatsappNumber: "081200000102",
		smsNumber: "081200000102",
		emailDeliveryStatus: "sent",
		whatsappDeliveryStatus: "failed",
		smsDeliveryStatus: "sent"
	},
	{
		createdAt: isoAt(910),
		creditApplicationKey: "CA-SEED-003",
		content: "Kode OTP Anda adalah 772640 untuk otorisasi pembaruan data.",
		email: "mila.kartika@seed.local",
		whatsappNumber: "081200000103",
		smsNumber: "081200000203",
		emailDeliveryStatus: "pending",
		whatsappDeliveryStatus: "sent",
		smsDeliveryStatus: "sent"
	}
];

const payload = await getPayload({ config: payloadConfig });

console.log("[seedMessageLogs] Starting message log seeding...");

// Get approved import
console.log("[seedMessageLogs] Looking up approved import...");
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
console.log("[seedMessageLogs] Building credit application ID map...");
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
console.log("[seedMessageLogs] Building officer task ID map...");
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

// Seed message logs
for(const seed of MESSAGE_LOG_SEEDS) {
	console.log(`[seedMessageLogs] Checking existing message log (email: ${seed.email}, time: ${seed.createdAt})...`);
	const existing = (await payload.find({
		collection: "message-logs",
		overrideAccess: true,
		where: {
			and: [
				{ createdAt: { equals: seed.createdAt } },
				{ content: { equals: seed.content } }
			]
		},
		limit: 1,
		depth: 0
	})).docs[0];

	if(existing == null) {
		console.log(`[seedMessageLogs] Creating message log for ${seed.email}...`);
		await payload.create({
			collection: "message-logs",
			overrideAccess: true,
			data: {
				createdAt: seed.createdAt,
				officerTask: officerTaskIdMap.get(seed.creditApplicationKey)!,
				content: seed.content,
				email: seed.email,
				whatsappNumber: seed.whatsappNumber,
				smsNumber: seed.smsNumber,
				emailDeliveryStatus: seed.emailDeliveryStatus,
				whatsappDeliveryStatus: seed.whatsappDeliveryStatus,
				smsDeliveryStatus: seed.smsDeliveryStatus
			}
		});
	} else
		console.log(`[seedMessageLogs] Message log for ${seed.email} already exists (id: ${existing.id}), skipping.`);
}

console.log(`[seedMessageLogs] Done. Seeded ${MESSAGE_LOG_SEEDS.length} message logs.`);
