import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";

const TIMESTAMP_BASE = new Date(1778889600000);

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
	{ key: "admin", name: "Platform Admin", level: "admin" as const },
	{ key: "manager", name: "Regional Manager", level: "manager" as const },
	{ key: "supervisor", name: "Branch Supervisor", level: "supervisor" as const },
	{ key: "officer", name: "Field Officer", level: "officer" as const }
];

const USER_SEEDS: SeedUser[] = [
	{ key: "admin", email: "admin@local.local", name: "Admin", password: "admin", employeeId: "ADM-001", roleKey: "admin", supervisorKey: null },
	{ key: "manager-bandung", email: "manager.bandung@local.local", name: "Raka Wirawan", password: "Manager123!", employeeId: "MGR-001", roleKey: "manager", supervisorKey: "admin" },
	{ key: "manager-jakarta", email: "manager.jakarta@local.local", name: "Maya Pertiwi", password: "Manager123!", employeeId: "MGR-002", roleKey: "manager", supervisorKey: "admin" },
	{ key: "supervisor-bandung", email: "supervisor.bandung@local.local", name: "Bagus Santoso", password: "Supervisor123!", employeeId: "SPV-001", roleKey: "supervisor", supervisorKey: "manager-bandung" },
	{ key: "supervisor-jakarta", email: "supervisor.jakarta@local.local", name: "Dewi Maharani", password: "Supervisor123!", employeeId: "SPV-002", roleKey: "supervisor", supervisorKey: "manager-jakarta" },
	{ key: "officer-bandung-1", email: "officer.bandung.01@local.local", name: "Rizky Aditya", password: "Officer123!", employeeId: "OFF-001", roleKey: "officer", supervisorKey: "supervisor-bandung" },
	{ key: "officer-bandung-2", email: "officer.bandung.02@local.local", name: "Nadia Safitri", password: "Officer123!", employeeId: "OFF-002", roleKey: "officer", supervisorKey: "supervisor-bandung" },
	{ key: "officer-jakarta-1", email: "officer.jakarta.01@local.local", name: "Fahmi Ramadhan", password: "Officer123!", employeeId: "OFF-003", roleKey: "officer", supervisorKey: "supervisor-jakarta" },
	{ key: "officer-jakarta-2", email: "officer.jakarta.02@local.local", name: "Intan Permata", password: "Officer123!", employeeId: "OFF-004", roleKey: "officer", supervisorKey: "supervisor-jakarta" }
];

function isoAt(minutesOffset: number): string {
	const value = new Date(TIMESTAMP_BASE);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedStagedUsers] Starting staged user seeding...");

// Get acting user (admin)
console.log("[seedStagedUsers] Looking up admin user...");
const actingUser = (await payload.find({
	collection: "users",
	overrideAccess: true,
	where: { email: { equals: "admin@local.local" } },
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
})).docs[0];
if(actingUser == null) throw new Error("Seed admin user is missing. Run 'payload run ./scripts/seedUsers.ts' first.");

// Build role ID map
console.log("[seedStagedUsers] Building role ID map...");
const roleIdMap = new Map<string, string>();
for(const roleSeed of ROLE_SEEDS) {
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

// Build user ID map
console.log("[seedStagedUsers] Building user ID map...");
const userIdMap = new Map<string, string>();
for(const userSeed of USER_SEEDS) {
	const user = (await payload.find({
		collection: "users",
		overrideAccess: true,
		where: { email: { equals: userSeed.email } },
		limit: 1,
		sort: "-updatedAt",
		draft: false,
		trash: true,
		depth: 0
	})).docs[0];
	if(user == null) throw new Error(`User '${userSeed.email}' is missing. Run 'payload run ./scripts/seedUsers.ts' first.`);
	userIdMap.set(userSeed.key, user.id);
}

// Seed staged users
for(const [index, userSeed] of USER_SEEDS.entries()) {
	const publishedAt = isoAt(200 + index * 5);
	const pendingAt = isoAt(200 + index * 5 + 2);
	const supervisorId = userSeed.supervisorKey == null ? null : userIdMap.get(userSeed.supervisorKey) ?? null;

	console.log(`[seedStagedUsers] Checking existing staged user '${userSeed.email}'...`);
	const existing = (await payload.find({
		collection: "staged-users",
		overrideAccess: true,
		where: {
			or: [
				{ email: { equals: userSeed.email } },
				{ employeeId: { equals: userSeed.employeeId } }
			]
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		depth: 0
	})).docs[0];

	const publishedData = {
		email: userSeed.email,
		name: userSeed.name,
		employeeId: userSeed.employeeId,
		role: roleIdMap.get(userSeed.roleKey),
		supervisor: supervisorId,
		initialPassword: userSeed.password,
		createdAt: publishedAt,
		createdBy: actingUser.id,
		updatedAt: publishedAt,
		updatedBy: actingUser.id,
		deletedAt: null,
		deletedBy: null,
		_status: "published" as const,
		changeRequestType: "create" as const,
		changeRequestComment: null,
		reviewedAt: publishedAt,
		reviewedBy: actingUser.id,
		reviewApproved: true,
		reviewComment: lexicalPlainText(`Seed approved baseline for staged user '${userSeed.email}'.`)
	};

	const pendingData = {
		email: userSeed.email,
		name: userSeed.name,
		employeeId: userSeed.employeeId,
		role: roleIdMap.get(userSeed.roleKey),
		supervisor: supervisorId,
		initialPassword: userSeed.password,
		createdAt: publishedAt,
		createdBy: actingUser.id,
		updatedAt: pendingAt,
		updatedBy: actingUser.id,
		deletedAt: null,
		deletedBy: null,
		_status: "draft" as const,
		changeRequestType: "update" as const,
		changeRequestComment: null,
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: null
	};

	let stagedUserId: string;
	if(existing == null) {
		console.log(`[seedStagedUsers] Creating staged user '${userSeed.email}' as draft...`);
		const created = await payload.create({
			collection: "staged-users",
			user: actingUser,
			overrideAccess: true,
			data: pendingData,
			draft: true
		});
		stagedUserId = created.id;
	} else {
		console.log(`[seedStagedUsers] Updating existing staged user '${userSeed.email}' (id: ${existing.id})...`);
		stagedUserId = existing.id;
		await payload.update({
			collection: "staged-users",
			user: actingUser,
			overrideAccess: true,
			trash: true,
			id: stagedUserId,
			data: pendingData,
			draft: true
		});
	}

	console.log(`[seedStagedUsers] Publishing staged user '${userSeed.email}'...`);
	await payload.update({
		collection: "staged-users",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		data: publishedData,
		draft: false
	});

	// Link staged user to user record
	console.log(`[seedStagedUsers] Linking staged user to user record '${userSeed.email}'...`);
	const userId = userIdMap.get(userSeed.key)!;
	await payload.update({
		collection: "users",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id: userId,
		data: { stagedUser: stagedUserId }
	});
}

console.log(`[seedStagedUsers] Done. Seeded ${USER_SEEDS.length} staged users in approved state and linked them to their user records.`);
