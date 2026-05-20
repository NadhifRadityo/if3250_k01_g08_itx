import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");

type SeedLogIn = {
	createdAt: string;
	email: string;
	event: "login" | "logout";
	ipAddress: string;
	outcome: "failure" | "success";
};

const USER_EMAILS = [
	{ key: "officer-bandung-1", email: "officer.bandung.01@local.local" },
	{ key: "officer-jakarta-1", email: "officer.jakarta.01@local.local" },
	{ key: "manager-jakarta", email: "manager.jakarta@local.local" }
];

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const LOGIN_LOG_SEEDS: SeedLogIn[] = [
	{ createdAt: isoAt(700), email: "officer.bandung.01@local.local", ipAddress: "36.89.22.10", event: "login", outcome: "success" },
	{ createdAt: isoAt(710), email: "officer.bandung.01@local.local", ipAddress: "36.89.22.10", event: "logout", outcome: "success" },
	{ createdAt: isoAt(720), email: "officer.jakarta.01@local.local", ipAddress: "182.253.55.31", event: "login", outcome: "success" },
	{ createdAt: isoAt(725), email: "manager.jakarta@local.local", ipAddress: "114.5.120.4", event: "login", outcome: "failure" }
];

const payload = await getPayload({ config: payloadConfig });

console.log("[seedLoginLogs] Starting login log seeding...");

// Build user ID map (only users referenced in login logs)
console.log("[seedLoginLogs] Building user ID map...");
const userIdMap = new Map<string, string>();
for(const entry of USER_EMAILS) {
	const user = (await payload.find({
		collection: "users",
		overrideAccess: true,
		where: { email: { equals: entry.email } },
		limit: 1,
		sort: "-updatedAt",
		draft: false,
		trash: true,
		depth: 0
	})).docs[0];
	if(user == null) throw new Error(`User '${entry.email}' is missing. Run 'payload run ./scripts/seedUsers.ts' first.`);
	userIdMap.set(entry.email, user.id);
}

// Seed login logs
for(const seed of LOGIN_LOG_SEEDS) {
	console.log(`[seedLoginLogs] Checking existing login log (ip: ${seed.ipAddress}, event: ${seed.event}, time: ${seed.createdAt})...`);
	const existing = (await payload.find({
		collection: "login-logs",
		overrideAccess: true,
		where: {
			and: [
				{ createdAt: { equals: seed.createdAt } },
				{ ipAddress: { equals: seed.ipAddress } },
				{ event: { equals: seed.event } }
			]
		},
		limit: 1,
		sort: "-updatedAt",
		draft: false,
		trash: true,
		depth: 0
	})).docs[0];

	if(existing == null) {
		console.log(`[seedLoginLogs] Creating login log for ${seed.email} (${seed.event})...`);
		await payload.create({
			collection: "login-logs",
			overrideAccess: true,
			data: {
				createdAt: seed.createdAt,
				updatedAt: seed.createdAt,
				ipAddress: seed.ipAddress,
				user: userIdMap.get(seed.email)!,
				event: seed.event,
				outcome: seed.outcome
			}
		});
	} else
		console.log(`[seedLoginLogs] Login log for ${seed.email} (${seed.event}) already exists (id: ${existing.id}), skipping.`);
}

console.log(`[seedLoginLogs] Done. Seeded ${LOGIN_LOG_SEEDS.length} login logs.`);
