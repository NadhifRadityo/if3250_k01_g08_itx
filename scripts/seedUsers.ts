import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");

type SeedUser = {
	email: string;
	employeeId: string;
	key: string;
	name: string;
	password: string;
	roleKey: string;
	supervisorKey: null | string;
};

const ROLE_SEEDS = [
	{ key: "admin", name: "Seed Platform Admin", level: "admin" as const },
	{ key: "manager", name: "Seed Regional Manager", level: "manager" as const },
	{ key: "supervisor", name: "Seed Branch Supervisor", level: "supervisor" as const },
	{ key: "officer", name: "Seed Field Officer", level: "officer" as const }
];

const USER_SEEDS: SeedUser[] = [
	{
		key: "admin",
		email: "seed.admin@local.local",
		name: "Seed Admin",
		password: "SeedAdmin123!",
		employeeId: "ADM-SEED-001",
		roleKey: "admin",
		supervisorKey: null
	},
	{
		key: "manager-bandung",
		email: "manager.bandung@local.local",
		name: "Raka Wirawan",
		password: "SeedManager123!",
		employeeId: "MGR-SEED-001",
		roleKey: "manager",
		supervisorKey: "admin"
	},
	{
		key: "manager-jakarta",
		email: "manager.jakarta@local.local",
		name: "Maya Pertiwi",
		password: "SeedManager123!",
		employeeId: "MGR-SEED-002",
		roleKey: "manager",
		supervisorKey: "admin"
	},
	{
		key: "supervisor-bandung",
		email: "supervisor.bandung@local.local",
		name: "Bagus Santoso",
		password: "SeedSupervisor123!",
		employeeId: "SPV-SEED-001",
		roleKey: "supervisor",
		supervisorKey: "manager-bandung"
	},
	{
		key: "supervisor-jakarta",
		email: "supervisor.jakarta@local.local",
		name: "Dewi Maharani",
		password: "SeedSupervisor123!",
		employeeId: "SPV-SEED-002",
		roleKey: "supervisor",
		supervisorKey: "manager-jakarta"
	},
	{
		key: "officer-bandung-1",
		email: "officer.bandung.01@local.local",
		name: "Rizky Aditya",
		password: "SeedOfficer123!",
		employeeId: "OFF-SEED-001",
		roleKey: "officer",
		supervisorKey: "supervisor-bandung"
	},
	{
		key: "officer-bandung-2",
		email: "officer.bandung.02@local.local",
		name: "Nadia Safitri",
		password: "SeedOfficer123!",
		employeeId: "OFF-SEED-002",
		roleKey: "officer",
		supervisorKey: "supervisor-bandung"
	},
	{
		key: "officer-jakarta-1",
		email: "officer.jakarta.01@local.local",
		name: "Fahmi Ramadhan",
		password: "SeedOfficer123!",
		employeeId: "OFF-SEED-003",
		roleKey: "officer",
		supervisorKey: "supervisor-jakarta"
	},
	{
		key: "officer-jakarta-2",
		email: "officer.jakarta.02@local.local",
		name: "Intan Permata",
		password: "SeedOfficer123!",
		employeeId: "OFF-SEED-004",
		roleKey: "officer",
		supervisorKey: "supervisor-jakarta"
	}
];

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedUsers] Starting user seeding...");

// Build role ID map
console.log("[seedUsers] Building role ID map...");
const roleIdMap = new Map<string, string>();
for(const roleSeed of ROLE_SEEDS) {
	console.log(`[seedUsers] Looking up role '${roleSeed.name}'...`);
	const role = (await payload.find({
		collection: "roles",
		overrideAccess: true,
		where: {
			and: [
				{ name: { equals: roleSeed.name } },
				{ level: { equals: roleSeed.level } }
			]
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		depth: 0
	})).docs[0];
	if(role == null) throw new Error(`Role '${roleSeed.name}' is missing. Run 'payload run ./scripts/seedRoles.ts' first.`);
	roleIdMap.set(roleSeed.key, role.id);
}

// Seed users in order (supervisors before their reports)
const ensuredUserIds = new Map<string, string>();

for(const [index, userSeed] of USER_SEEDS.entries()) {
	console.log(`[seedUsers] Checking existing user '${userSeed.email}'...`);
	const existing = (await payload.find({
		collection: "users",
		overrideAccess: true,
		where: { email: { equals: userSeed.email } },
		limit: 1,
		sort: "-updatedAt",
		draft: false,
		trash: true,
		depth: 0
	})).docs[0];
	const supervisorId = userSeed.supervisorKey == null ? null : ensuredUserIds.get(userSeed.supervisorKey) ?? null;
	if(userSeed.supervisorKey != null && supervisorId == null)
		throw new Error(`Supervisor '${userSeed.supervisorKey}' must be seeded before '${userSeed.key}'.`);

	const data = {
		createdAt: isoAt(100 + index * 5),
		updatedAt: isoAt(100 + index * 5),
		deletedAt: null,
		deletedBy: null,
		email: userSeed.email,
		password: userSeed.password,
		name: userSeed.name,
		employeeId: userSeed.employeeId,
		role: roleIdMap.get(userSeed.roleKey)!,
		supervisor: supervisorId,
		stagedUser: null,
		enableAPIKey: false,
		sessions: [],
		loginAttempts: 0,
		lockUntil: null
	};

	if(existing == null) {
		console.log(`[seedUsers] Creating user '${userSeed.email}'...`);
		const created = await payload.create({
			collection: "users",
			overrideAccess: true,
			data
		});
		ensuredUserIds.set(userSeed.key, created.id);
	} else {
		console.log(`[seedUsers] Updating existing user '${userSeed.email}' (id: ${existing.id})...`);
		await payload.update({
			collection: "users",
			overrideAccess: true,
			trash: true,
			id: existing.id,
			data
		});
		ensuredUserIds.set(userSeed.key, existing.id);
	}
}

console.log(`[seedUsers] Done. Seeded ${USER_SEEDS.length} users.`);
