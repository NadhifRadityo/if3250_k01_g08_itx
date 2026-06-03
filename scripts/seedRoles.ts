import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";
import type { Role } from "@/payload-types";

const TIMESTAMP_BASE = new Date(1778889600000);

const ALL_MENUS: Role["menus"] = [
	"user-management#viewer",
	"user-management#auditor",
	"user-management#editor",
	"user-management#approver",
	"role-management#viewer",
	"role-management#auditor",
	"role-management#editor",
	"role-management#approver",
	"team-management#viewer",
	"team-management#auditor",
	"team-management#editor",
	"team-management#approver",
	"access-management#viewer",
	"access-management#auditor",
	"access-management#editor",
	"access-management#approver",
	"credit-application-management#viewer",
	"credit-application-management#auditor",
	"credit-application-management#editor",
	"credit-application-management#approver",
	"credit-application-management#import-viewer",
	"credit-application-management#import-editor",
	"credit-application-management#import-approver",
	"credit-application-assignment#viewer",
	"credit-application-assignment#auditor",
	"credit-application-assignment#editor",
	"credit-application-assignment#approver",
	"survey-management#viewer",
	"survey-management#auditor",
	"survey-management#editor",
	"survey-management#approver",
	"survey-result#monitoring",
	"survey-result#reporting",
	"satisfaction-survey-management#viewer",
	"satisfaction-survey-management#auditor",
	"satisfaction-survey-management#editor",
	"satisfaction-survey-management#approver",
	"satisfaction-survey-result#monitoring",
	"satisfaction-survey-result#reporting",
	"officer-task#monitoring",
	"officer-task#reporting",
	"officer-task#executor",
	"officer-task#evaluator",
	"officer-tracking#monitoring",
	"officer-tracking#reporting",
	"login-log#monitoring",
	"login-log#reporting",
	"message-log#monitoring",
	"message-log#reporting",
	"gps-log#monitoring",
	"gps-log#reporting",
	"recording-log#monitoring",
	"recording-log#reporting"
];

type SeedRole = {
	key: string;
	level: Role["level"];
	menus: Role["menus"];
	name: string;
};

const ROLE_SEEDS: SeedRole[] = [
	{
		key: "admin",
		name: "Platform Admin",
		level: "admin",
		menus: ALL_MENUS
	},
	{
		key: "manager",
		name: "Regional Manager",
		level: "manager",
		menus: [
			"user-management#viewer",
			"user-management#auditor",
			"user-management#editor",
			"user-management#approver",
			"role-management#viewer",
			"role-management#auditor",
			"role-management#editor",
			"role-management#approver",
			"team-management#viewer",
			"team-management#auditor",
			"team-management#editor",
			"team-management#approver",
			"credit-application-management#viewer",
			"credit-application-management#auditor",
			"credit-application-management#editor",
			"credit-application-management#approver",
			"credit-application-management#import-viewer",
			"credit-application-management#import-editor",
			"credit-application-management#import-approver",
			"credit-application-assignment#viewer",
			"credit-application-assignment#auditor",
			"credit-application-assignment#editor",
			"credit-application-assignment#approver",
			"survey-management#viewer",
			"survey-management#auditor",
			"survey-management#editor",
			"survey-management#approver",
			"satisfaction-survey-management#viewer",
			"satisfaction-survey-management#auditor",
			"satisfaction-survey-management#editor",
			"satisfaction-survey-management#approver",
			"officer-task#monitoring",
			"officer-task#reporting"
		]
	},
	{
		key: "supervisor",
		name: "Branch Supervisor",
		level: "supervisor",
		menus: [
			"team-management#viewer",
			"team-management#editor",
			"credit-application-assignment#viewer",
			"credit-application-assignment#editor",
			"credit-application-assignment#approver",
			"officer-task#monitoring",
			"officer-task#evaluator",
			"officer-tracking#monitoring",
			"recording-log#monitoring",
			"gps-log#monitoring",
			"message-log#monitoring"
		]
	},
	{
		key: "officer",
		name: "Field Officer",
		level: "officer",
		menus: [
			"officer-task#reporting",
			"officer-task#executor",
			"officer-tracking#reporting",
			"recording-log#reporting",
			"gps-log#reporting",
			"message-log#reporting"
		]
	}
];

function isoAt(minutesOffset: number): string {
	const value = new Date(TIMESTAMP_BASE);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedRoles] Starting role seeding...");

// Get acting user (admin) if available
console.log("[seedRoles] Looking up admin user...");
const actingUser = (await payload.find({
	collection: "users",
	overrideAccess: true,
	where: {
		email: { equals: "admin@local.local" }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
})).docs[0] ?? null;
if(actingUser == null) {
	console.log("[seedRoles] Admin user not found. Roles will be created with null user references (will be backfilled by seedUsers).");
}

for(const [index, roleSeed] of ROLE_SEEDS.entries()) {
	const publishedAt = isoAt(index * 10);
	const pendingAt = isoAt(index * 10 + 5);

	console.log(`[seedRoles] Checking existing role '${roleSeed.name}'...`);
	const existing = (await payload.find({
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

	const publishedData = {
		name: roleSeed.name,
		level: roleSeed.level,
		menus: roleSeed.menus,
		createdAt: publishedAt,
		createdBy: actingUser?.id ?? null,
		updatedAt: publishedAt,
		updatedBy: actingUser?.id ?? null,
		deletedAt: null,
		deletedBy: null,
		_status: "published" as const,
		changeRequestType: "create" as const,
		changeRequestComment: null,
		reviewedAt: publishedAt,
		reviewedBy: actingUser?.id ?? null,
		reviewApproved: true,
		reviewComment: lexicalPlainText(`Seed approved baseline for role '${roleSeed.name}'.`)
	};

	const pendingData = {
		name: roleSeed.name,
		level: roleSeed.level,
		menus: roleSeed.menus,
		createdAt: publishedAt,
		createdBy: actingUser?.id ?? null,
		updatedAt: pendingAt,
		updatedBy: actingUser?.id ?? null,
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

	let id: string;
	if(existing == null) {
		console.log(`[seedRoles] Creating role '${roleSeed.name}' as draft...`);
		const created = await payload.create({
			collection: "roles",
			...(actingUser != null ? { user: actingUser } : {}),
			overrideAccess: true,
			data: pendingData,
			draft: true
		});
		id = created.id;
	} else {
		console.log(`[seedRoles] Updating existing role '${roleSeed.name}' (id: ${existing.id})...`);
		id = existing.id;
		await payload.update({
			collection: "roles",
			...(actingUser != null ? { user: actingUser } : {}),
			overrideAccess: true,
			trash: true,
			id,
			data: pendingData,
			draft: true
		});
	}

	console.log(`[seedRoles] Publishing role '${roleSeed.name}'...`);
	await payload.update({
		collection: "roles",
		...(actingUser != null ? { user: actingUser } : {}),
		overrideAccess: true,
		trash: true,
		id,
		data: publishedData,
		draft: false
	});
}

console.log(`[seedRoles] Done. Seeded ${ROLE_SEEDS.length} roles in approved state.`);
