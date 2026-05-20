import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";
import type { Role, User } from "@/payload-types";

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
	{ key: "admin", email: "seed.admin@local.local", name: "Seed Admin", password: "SeedAdmin123!", employeeId: "ADM-SEED-001", roleKey: "admin", supervisorKey: null },
	{ key: "manager-bandung", email: "manager.bandung@local.local", name: "Raka Wirawan", password: "SeedManager123!", employeeId: "MGR-SEED-001", roleKey: "manager", supervisorKey: "admin" },
	{ key: "manager-jakarta", email: "manager.jakarta@local.local", name: "Maya Pertiwi", password: "SeedManager123!", employeeId: "MGR-SEED-002", roleKey: "manager", supervisorKey: "admin" },
	{ key: "supervisor-bandung", email: "supervisor.bandung@local.local", name: "Bagus Santoso", password: "SeedSupervisor123!", employeeId: "SPV-SEED-001", roleKey: "supervisor", supervisorKey: "manager-bandung" },
	{ key: "supervisor-jakarta", email: "supervisor.jakarta@local.local", name: "Dewi Maharani", password: "SeedSupervisor123!", employeeId: "SPV-SEED-002", roleKey: "supervisor", supervisorKey: "manager-jakarta" },
	{ key: "officer-bandung-1", email: "officer.bandung.01@local.local", name: "Rizky Aditya", password: "SeedOfficer123!", employeeId: "OFF-SEED-001", roleKey: "officer", supervisorKey: "supervisor-bandung" },
	{ key: "officer-bandung-2", email: "officer.bandung.02@local.local", name: "Nadia Safitri", password: "SeedOfficer123!", employeeId: "OFF-SEED-002", roleKey: "officer", supervisorKey: "supervisor-bandung" },
	{ key: "officer-jakarta-1", email: "officer.jakarta.01@local.local", name: "Fahmi Ramadhan", password: "SeedOfficer123!", employeeId: "OFF-SEED-003", roleKey: "officer", supervisorKey: "supervisor-jakarta" },
	{ key: "officer-jakarta-2", email: "officer.jakarta.02@local.local", name: "Intan Permata", password: "SeedOfficer123!", employeeId: "OFF-SEED-004", roleKey: "officer", supervisorKey: "supervisor-jakarta" }
];

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

// Get acting user (admin)
const actingUserResult = await payload.find({
	collection: "users" as any,
	overrideAccess: true,
	where: { email: { equals: "seed.admin@local.local" } },
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
});
const actingUser = (actingUserResult.docs[0] as User | undefined) ?? null;
if(actingUser == null) throw new Error("Seed admin user is missing. Run 'payload run ./scripts/seedUsers.ts' first.");

// Build role ID map
const roleIdMap = new Map<string, string>();
for(const roleSeed of ROLE_SEEDS) {
	const roleResult = await payload.find({
		collection: "roles" as any,
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
	});
	const role = (roleResult.docs[0] as Role | undefined) ?? null;
	if(role == null) throw new Error(`Role '${roleSeed.name}' is missing. Run 'payload run ./scripts/seedRoles.ts' first.`);
	roleIdMap.set(roleSeed.key, role.id);
}

// Build user ID map
const userIdMap = new Map<string, string>();
for(const userSeed of USER_SEEDS) {
	const userResult = await payload.find({
		collection: "users" as any,
		overrideAccess: true,
		where: { email: { equals: userSeed.email } },
		limit: 1,
		sort: "-updatedAt",
		draft: false,
		trash: true,
		depth: 0
	});
	const user = (userResult.docs[0] as User | undefined) ?? null;
	if(user == null) throw new Error(`User '${userSeed.email}' is missing. Run 'payload run ./scripts/seedUsers.ts' first.`);
	userIdMap.set(userSeed.key, user.id);
}

// Seed staged users
for(const [index, userSeed] of USER_SEEDS.entries()) {
	const publishedAt = isoAt(200 + index * 5);
	const pendingAt = isoAt(200 + index * 5 + 2);
	const supervisorId = userSeed.supervisorKey == null ? null : userIdMap.get(userSeed.supervisorKey) ?? null;

	const existingResult = await payload.find({
		collection: "staged-users" as any,
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
	});
	const existing = (existingResult.docs[0] as { id: string } | undefined) ?? null;

	const publishedData = {
		email: userSeed.email,
		name: userSeed.name,
		employeeId: userSeed.employeeId,
		role: roleIdMap.get(userSeed.roleKey),
		supervisor: supervisorId,
		initialPassword: userSeed.password,
		createdAt: publishedAt,
		updatedAt: publishedAt,
		deletedAt: null,
		deletedBy: null,
		_status: "published" as const,
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
		updatedAt: pendingAt,
		deletedAt: null,
		deletedBy: null,
		_status: "draft" as const,
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: null
	};

	let stagedUserId: string;
	if(existing == null) {
		const created = await payload.create({
			collection: "staged-users",
			user: actingUser,
			overrideAccess: true,
			data: pendingData,
			draft: true
		});
		stagedUserId = created.id;
	} else {
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

	await payload.update({
		collection: "staged-users",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		data: publishedData,
		draft: false
	});

	await payload.update({
		collection: "staged-users",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id: stagedUserId,
		data: pendingData,
		draft: true
	});

	// Link staged user to user record
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

console.log(`Seeded ${USER_SEEDS.length} staged users and linked them to their user records.`);
