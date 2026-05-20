import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";
import type { Role } from "@/payload-types";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");

const ALL_MENUS: Role["menus"] = [
	"user-management-viewer",
	"user-management-auditor",
	"user-management-editor",
	"user-management-approver",
	"role-management-viewer",
	"role-management-auditor",
	"role-management-editor",
	"role-management-approver",
	"team-management-viewer",
	"team-management-auditor",
	"team-management-editor",
	"team-management-approver",
	"credit-application-management-viewer",
	"credit-application-management-auditor",
	"credit-application-management-editor",
	"credit-application-management-approver",
	"credit-application-management-import-viewer",
	"credit-application-management-import-editor",
	"credit-application-management-import-approver",
	"credit-application-assignment-viewer",
	"credit-application-assignment-auditor",
	"credit-application-assignment-editor",
	"credit-application-assignment-approver",
	"survey-management-viewer",
	"survey-management-auditor",
	"survey-management-editor",
	"survey-management-approver",
	"satisfaction-survey-management-viewer",
	"satisfaction-survey-management-auditor",
	"satisfaction-survey-management-editor",
	"satisfaction-survey-management-approver",
	"officer-task-monitoring",
	"officer-task-reporting",
	"officer-tracking-monitoring",
	"officer-tracking-reporting",
	"login-activity-log-monitoring",
	"login-activity-log-reporting",
	"otp-log-monitoring",
	"otp-log-reporting",
	"gps-log-monitoring",
	"gps-log-reporting",
	"recording-log-monitoring",
	"recording-log-reporting"
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
		name: "Seed Platform Admin",
		level: "admin",
		menus: ALL_MENUS
	},
	{
		key: "manager",
		name: "Seed Regional Manager",
		level: "manager",
		menus: [
			"user-management-viewer",
			"user-management-auditor",
			"user-management-editor",
			"user-management-approver",
			"role-management-viewer",
			"role-management-auditor",
			"role-management-editor",
			"role-management-approver",
			"team-management-viewer",
			"team-management-auditor",
			"team-management-editor",
			"team-management-approver",
			"credit-application-management-viewer",
			"credit-application-management-auditor",
			"credit-application-management-editor",
			"credit-application-management-approver",
			"credit-application-management-import-viewer",
			"credit-application-management-import-editor",
			"credit-application-management-import-approver",
			"credit-application-assignment-viewer",
			"credit-application-assignment-auditor",
			"credit-application-assignment-editor",
			"credit-application-assignment-approver",
			"survey-management-viewer",
			"survey-management-auditor",
			"survey-management-editor",
			"survey-management-approver",
			"satisfaction-survey-management-viewer",
			"satisfaction-survey-management-auditor",
			"satisfaction-survey-management-editor",
			"satisfaction-survey-management-approver",
			"officer-task-monitoring",
			"officer-task-reporting"
		]
	},
	{
		key: "supervisor",
		name: "Seed Branch Supervisor",
		level: "supervisor",
		menus: [
			"team-management-viewer",
			"team-management-editor",
			"credit-application-assignment-viewer",
			"credit-application-assignment-editor",
			"credit-application-assignment-approver",
			"officer-task-monitoring",
			"officer-tracking-monitoring",
			"recording-log-monitoring",
			"gps-log-monitoring",
			"otp-log-monitoring"
		]
	},
	{
		key: "officer",
		name: "Seed Field Officer",
		level: "officer",
		menus: [
			"officer-task-reporting",
			"officer-tracking-reporting",
			"recording-log-reporting",
			"gps-log-reporting",
			"otp-log-reporting"
		]
	}
];

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedRoles] Starting role seeding...");

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
		updatedAt: publishedAt,
		deletedAt: null,
		deletedBy: null,
		_status: "published" as const,
		reviewedAt: publishedAt,
		reviewedBy: null,
		reviewApproved: true,
		reviewComment: lexicalPlainText(`Seed approved baseline for role '${roleSeed.name}'.`)
	};

	const pendingData = {
		name: roleSeed.name,
		level: roleSeed.level,
		menus: roleSeed.menus,
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
		console.log(`[seedRoles] Creating role '${roleSeed.name}' as draft...`);
		const created = await payload.create({
			collection: "roles",
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
		overrideAccess: true,
		trash: true,
		id,
		data: publishedData,
		draft: false
	});

	console.log(`[seedRoles] Setting role '${roleSeed.name}' back to draft...`);
	await payload.update({
		collection: "roles",
		overrideAccess: true,
		trash: true,
		id,
		data: pendingData,
		draft: true
	});
}

console.log(`[seedRoles] Done. Seeded ${ROLE_SEEDS.length} roles with approved history and pending draft requests.`);
