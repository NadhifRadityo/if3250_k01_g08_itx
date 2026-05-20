import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");

type SeedTeam = {
	key: string;
	name: string;
	officerKeys: string[];
	supervisorKey: string;
};

const USER_EMAILS: Record<string, string> = {
	"admin": "seed.admin@local.local",
	"manager-bandung": "manager.bandung@local.local",
	"manager-jakarta": "manager.jakarta@local.local",
	"supervisor-bandung": "supervisor.bandung@local.local",
	"supervisor-jakarta": "supervisor.jakarta@local.local",
	"officer-bandung-1": "officer.bandung.01@local.local",
	"officer-bandung-2": "officer.bandung.02@local.local",
	"officer-jakarta-1": "officer.jakarta.01@local.local",
	"officer-jakarta-2": "officer.jakarta.02@local.local"
};

const TEAM_SEEDS: SeedTeam[] = [
	{
		key: "bandung-team",
		name: "Bandung Survey Team",
		supervisorKey: "supervisor-bandung",
		officerKeys: ["officer-bandung-1", "officer-bandung-2"]
	},
	{
		key: "jakarta-team",
		name: "Jakarta Survey Team",
		supervisorKey: "supervisor-jakarta",
		officerKeys: ["officer-jakarta-1", "officer-jakarta-2"]
	}
];

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedTeams] Starting team seeding...");

// Get acting user (admin)
console.log("[seedTeams] Looking up admin user...");
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
console.log("[seedTeams] Building user ID map...");
const userIdMap = new Map<string, string>();
for(const [key, email] of Object.entries(USER_EMAILS)) {
	const user = (await payload.find({
		collection: "users",
		overrideAccess: true,
		where: {
			email: { equals: email }
		},
		limit: 1,
		sort: "-updatedAt",
		draft: false,
		trash: true,
		depth: 0
	})).docs[0];
	if(user == null) throw new Error(`User '${email}' is missing. Run 'payload run ./scripts/seedUsers.ts' first.`);
	userIdMap.set(key, user.id);
}

// Seed teams
for(const [index, teamSeed] of TEAM_SEEDS.entries()) {
	const publishedAt = isoAt(300 + index * 5);
	const pendingAt = isoAt(300 + index * 5 + 2);

	console.log(`[seedTeams] Checking existing team '${teamSeed.name}'...`);
	const existing = (await payload.find({
		collection: "teams",
		overrideAccess: true,
		where: {
			name: { equals: teamSeed.name }
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		depth: 0
	})).docs[0];

	const publishedData = {
		name: teamSeed.name,
		supervisor: userIdMap.get(teamSeed.supervisorKey)!,
		officers: teamSeed.officerKeys.map(key => userIdMap.get(key)).filter(v => v != null),
		createdAt: publishedAt,
		updatedAt: publishedAt,
		deletedAt: null,
		deletedBy: null,
		_status: "published" as const,
		reviewedAt: publishedAt,
		reviewedBy: actingUser.id,
		reviewApproved: true,
		reviewComment: lexicalPlainText(`Seed approved baseline for team '${teamSeed.name}'.`)
	};

	const pendingData = {
		name: teamSeed.name,
		supervisor: userIdMap.get(teamSeed.supervisorKey),
		officers: teamSeed.officerKeys.map(key => userIdMap.get(key)).filter(v => v != null),
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
		console.log(`[seedTeams] Creating team '${teamSeed.name}' as draft...`);
		const created = await payload.create({
			collection: "teams",
			user: actingUser,
			overrideAccess: true,
			data: pendingData,
			draft: true
		});
		id = created.id;
	} else {
		console.log(`[seedTeams] Updating existing team '${teamSeed.name}' (id: ${existing.id})...`);
		id = existing.id;
		await payload.update({
			collection: "teams",
			user: actingUser,
			overrideAccess: true,
			trash: true,
			id,
			data: pendingData,
			draft: true
		});
	}

	console.log(`[seedTeams] Publishing team '${teamSeed.name}'...`);
	await payload.update({
		collection: "teams",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: publishedData,
		draft: false
	});

	console.log(`[seedTeams] Setting team '${teamSeed.name}' back to draft...`);
	await payload.update({
		collection: "teams",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: pendingData,
		draft: true
	});
}

console.log(`[seedTeams] Done. Seeded ${TEAM_SEEDS.length} teams with pending requests.`);
