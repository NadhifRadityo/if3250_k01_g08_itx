import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import type { Role, StagedUser } from "@/payload-types";

const DEFAULT_REVIEWER_EMAIL = "admin@local.local";
const DEFAULT_INITIAL_PASSWORD = "password";
const DEFAULT_REVIEW_COMMENT = "Seeded example roles and users for local bootstrap.";

type RoleLevel = Role["level"];
type RoleMenus = Role["menus"];
type ReviewCommentValue = NonNullable<Role["reviewComment"]>;

type SeedRole = {
	name: string;
	level: RoleLevel;
	menus: RoleMenus;
};

type SeedIdentity = {
	email: string;
	name: string;
	employeeId: string;
	level: RoleLevel;
	supervisorEmail: string | null;
};

type SeedTeam = {
	name: string;
	supervisorEmail: string;
	officerEmails: string[];
};

const MANAGER_IDENTITIES: SeedIdentity[] = [
	{
		email: "manager1@local.local",
		name: "Budi Santoso",
		employeeId: "MGR-001",
		level: "manager",
		supervisorEmail: null
	},
	{
		email: "manager2@local.local",
		name: "Siti Nurhaliza",
		employeeId: "MGR-002",
		level: "manager",
		supervisorEmail: null
	}
];

const SUPERVISOR_IDENTITIES: SeedIdentity[] = [
	{
		email: "supervisor1@local.local",
		name: "Andi Pratama",
		employeeId: "SPV-001",
		level: "supervisor",
		supervisorEmail: "manager1@local.local"
	},
	{
		email: "supervisor2@local.local",
		name: "Dewi Lestari",
		employeeId: "SPV-002",
		level: "supervisor",
		supervisorEmail: "manager1@local.local"
	},
	{
		email: "supervisor3@local.local",
		name: "Rizky Saputra",
		employeeId: "SPV-003",
		level: "supervisor",
		supervisorEmail: "manager2@local.local"
	}
];

const OFFICER_NAMES = [
	"Agus Salim",
	"Rina Kartika",
	"Fajar Nugroho",
	"Nadia Putri",
	"Hendra Wijaya",
	"Yuni Astuti",
	"Rafi Maulana",
	"Tika Oktaviani",
	"Galih Prakoso",
	"Wulan Sari",
	"Bagas Pamungkas",
	"Intan Permata",
	"Dimas Kurniawan",
	"Novi Rahma",
	"Yoga Pratama"
] as const;

const OFFICER_IDENTITIES: SeedIdentity[] = OFFICER_NAMES.map((name, index) => {
	const number = index + 1;
	const supervisorIndex = index % SUPERVISOR_IDENTITIES.length;
	const supervisorEmail = SUPERVISOR_IDENTITIES[supervisorIndex].email;
	return {
		email: `officer${String(number).padStart(2, "0")}@local.local`,
		name,
		employeeId: `OFF-${String(number).padStart(3, "0")}`,
		level: "officer",
		supervisorEmail
	};
});

const ROLE_SEEDS: SeedRole[] = [
	{
		name: "Manager",
		level: "manager",
		menus: [
			"user-management-viewer",
			"user-management-editor",
			"user-management-approver",
			"team-management-viewer",
			"team-management-auditor",
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
			"officer-task-reporting-viewer",
			"officer-task-monitoring-viewer"
		]
	},
	{
		name: "Supervisor",
		level: "supervisor",
		menus: [
			"team-management-viewer",
			"team-management-editor",
			"credit-application-assignment-viewer",
			"credit-application-assignment-auditor",
			"credit-application-assignment-editor",
			"officer-task-reporting-viewer",
			"officer-task-monitoring-viewer"
		]
	},
	{
		name: "Officer",
		level: "officer",
		menus: []
	}
];

function plainTextToReviewComment(value: string): ReviewCommentValue {
	const text = value.trim();
	return {
		root: {
			type: "root",
			version: 1,
			format: "",
			indent: 0,
			direction: null,
			children: [
				{
					type: "paragraph",
					version: 1,
					format: "",
					indent: 0,
					direction: null,
					children: text.length == 0 ? [] : [
						{
							type: "text",
							version: 1,
							text,
							format: 0,
							detail: 0,
							mode: "normal",
							style: ""
						}
					]
				}
			]
		}
	};
}

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string") return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

const payload = await getPayload({ config: payloadConfig });
const now = new Date().toISOString();
const reviewComment = plainTextToReviewComment(DEFAULT_REVIEW_COMMENT);

const normalizeRoleData = (seedRole: SeedRole, reviewedAt: string) => ({
	name: seedRole.name,
	level: seedRole.level,
	menus: seedRole.menus,
	reviewedAt,
	reviewApproved: true,
	reviewComment,
	deletedAt: null,
	deletedBy: null,
	_status: "published" as const
});

const normalizeUserData = (
	seedIdentity: SeedIdentity,
	roleId: string,
	supervisorId: string | null,
	stagedUserId: string | null
) => ({
	email: seedIdentity.email,
	password: DEFAULT_INITIAL_PASSWORD,
	name: seedIdentity.name,
	employeeId: seedIdentity.employeeId,
	role: roleId,
	supervisor: supervisorId,
	stagedUser: stagedUserId,
	enableAPIKey: false,
	sessions: [],
	loginAttempts: 0,
	lockUntil: null,
	deletedAt: null,
	deletedBy: null
});

const normalizeStagedUserData = (
	seedIdentity: SeedIdentity,
	roleId: string,
	supervisorId: string | null,
	reviewedAt: string,
	reviewedBy: string
) => ({
	_status: "published" as const,
	email: seedIdentity.email,
	name: seedIdentity.name,
	employeeId: seedIdentity.employeeId,
	role: roleId,
	supervisor: supervisorId,
	initialPassword: DEFAULT_INITIAL_PASSWORD,
	reviewedAt,
	reviewedBy,
	reviewApproved: true,
	reviewComment,
	deletedAt: null,
	deletedBy: null
});

const dbAdapter = payload.db as typeof payload.db & {
	update?: (args: Parameters<typeof payload.db.updateOne>[0]) => ReturnType<typeof payload.db.updateOne>;
};

async function findReviewerId(): Promise<string | null> {
	const { docs } = await payload.find({
		collection: "users",
		where: {
			email: { equals: DEFAULT_REVIEWER_EMAIL }
		},
		limit: 1,
		sort: "-updatedAt",
		trash: true,
		overrideAccess: true
	});
	return docs[0]?.id ?? null;
}

async function ensureRole(seedRole: SeedRole): Promise<{ id: string; reviewedAt: string }> {
	const { docs } = await payload.find({
		collection: "roles",
		where: {
			and: [
				{ name: { equals: seedRole.name } },
				{ level: { equals: seedRole.level } }
			]
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		overrideAccess: true
	});

	let roleId: string;
	let reviewedAt = now;

	if(docs.length > 0) {
		const existingRole = docs[0];
		roleId = existingRole.id;
		reviewedAt = existingRole.reviewedAt ?? now;

		await payload.update({
			collection: "roles",
			id: roleId,
			overrideAccess: true,
			trash: true,
			data: normalizeRoleData(seedRole, reviewedAt),
			draft: false
		});

		console.log(`Normalized role '${seedRole.name}' (${seedRole.level}) to seeded state.`);
	} else {
		const createdRole = await payload.create({
			collection: "roles",
			overrideAccess: true,
			data: normalizeRoleData(seedRole, reviewedAt),
			draft: false
		});

		roleId = createdRole.id;

		console.log(`Created role '${seedRole.name}' (${seedRole.level}) in seeded state.`);
	}

	return {
		id: roleId,
		reviewedAt
	};
}

async function findExistingStagedUser(
	linkedStagedUserId: string | null,
	seedIdentity: SeedIdentity
): Promise<StagedUser | null> {
	if(linkedStagedUserId != null) {
		const stagedByLinkedId = await payload.find({
			collection: "staged-users",
			where: {
				id: { equals: linkedStagedUserId }
			},
			limit: 1,
			draft: true,
			trash: true,
			overrideAccess: true
		});
		if(stagedByLinkedId.docs.length > 0)
			return stagedByLinkedId.docs[0];
	}

	const stagedByIdentity = await payload.find({
		collection: "staged-users",
		where: {
			or: [
				{ email: { equals: seedIdentity.email } },
				{ employeeId: { equals: seedIdentity.employeeId } }
			]
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		overrideAccess: true
	});

	return stagedByIdentity.docs[0] ?? null;
}

async function ensureUserAndStagedUser(
	seedIdentity: SeedIdentity,
	roleId: string,
	supervisorId: string | null,
	reviewerId: string | null
): Promise<{ userId: string; stagedUserId: string }> {
	const { docs: userDocs } = await payload.find({
		collection: "users",
		where: {
			email: { equals: seedIdentity.email }
		},
		limit: 1,
		sort: "-updatedAt",
		trash: true,
		overrideAccess: true
	});

	let userId: string;
	let linkedStagedUserId: string | null = null;

	if(userDocs.length > 0) {
		const existingUser = userDocs[0];
		userId = existingUser.id;
		linkedStagedUserId = getRelationshipId(existingUser.stagedUser);

		await payload.update({
			collection: "users",
			id: userId,
			overrideAccess: true,
			trash: true,
			data: normalizeUserData(seedIdentity, roleId, supervisorId, linkedStagedUserId)
		});

		console.log(`Normalized user '${seedIdentity.email}' to seeded state.`);
	} else {
		const createdUser = await payload.create({
			collection: "users",
			overrideAccess: true,
			data: normalizeUserData(seedIdentity, roleId, supervisorId, null)
		});

		userId = createdUser.id;

		console.log(`Created user '${seedIdentity.email}' in seeded state.`);
	}

	const existingStagedUser = await findExistingStagedUser(linkedStagedUserId, seedIdentity);
	const stagedReviewedAt = existingStagedUser?.reviewedAt ?? now;
	const effectiveReviewerId = reviewerId ?? userId;

	let stagedUserId: string;
	if(existingStagedUser != null) {
		stagedUserId = existingStagedUser.id;

		await payload.update({
			collection: "staged-users",
			id: stagedUserId,
			overrideAccess: true,
			trash: true,
			data: normalizeStagedUserData(seedIdentity, roleId, supervisorId, stagedReviewedAt, effectiveReviewerId),
			draft: false
		});

		console.log(`Normalized staged user '${seedIdentity.email}' to seeded state.`);
	} else {
		const createdStagedUser = await payload.create({
			collection: "staged-users",
			overrideAccess: true,
			data: normalizeStagedUserData(seedIdentity, roleId, supervisorId, stagedReviewedAt, effectiveReviewerId),
			draft: false
		});

		stagedUserId = createdStagedUser.id;

		console.log(`Created staged user '${seedIdentity.email}' in seeded state.`);
	}

	await payload.update({
		collection: "users",
		id: userId,
		overrideAccess: true,
		trash: true,
		data: normalizeUserData(seedIdentity, roleId, supervisorId, stagedUserId)
	});

	return {
		userId,
		stagedUserId
	};
}

async function setRoleReviewer(roleId: string, reviewerId: string) {
	if(typeof dbAdapter.update == "function") {
		await dbAdapter.update({
			collection: "roles",
			id: roleId,
			data: {
				reviewedBy: reviewerId
			},
			draft: false
		});
		return;
	}

	await dbAdapter.updateOne({
		collection: "roles",
		id: roleId,
		data: {
			reviewedBy: reviewerId
		},
		draft: false
	});
}

const normalizeTeamData = (
	seedTeam: SeedTeam,
	supervisorId: string,
	officerIds: string[],
	reviewedAt: string,
	reviewedBy: string | null
) => ({
	name: seedTeam.name,
	supervisor: supervisorId,
	officers: officerIds,
	reviewedAt,
	reviewedBy,
	reviewApproved: true,
	reviewComment,
	deletedAt: null,
	deletedBy: null,
	_status: "published" as const
});

async function ensureTeam(seedTeam: SeedTeam, userIdByEmail: Map<string, string>, reviewerId: string | null) {
	const supervisorId = userIdByEmail.get(seedTeam.supervisorEmail) ?? null;
	if(supervisorId == null)
		throw new Error(`Missing supervisor user id for '${seedTeam.supervisorEmail}'.`);

	const officerIds = seedTeam.officerEmails
		.map(email => userIdByEmail.get(email) ?? null)
		.filter((id): id is string => id != null);

	if(officerIds.length == 0)
		throw new Error(`Cannot create team '${seedTeam.name}' without officers.`);

	const { docs } = await payload.find({
		collection: "teams",
		where: {
			name: { equals: seedTeam.name }
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		overrideAccess: true
	});

	let reviewedAt = now;
	if(docs.length > 0) {
		const existingTeam = docs[0];
		reviewedAt = existingTeam.reviewedAt ?? now;

		await payload.update({
			collection: "teams",
			id: existingTeam.id,
			overrideAccess: true,
			trash: true,
			data: normalizeTeamData(seedTeam, supervisorId, officerIds, reviewedAt, reviewerId),
			draft: false
		});

		console.log(`Normalized team '${seedTeam.name}' to seeded state.`);
		return;
	}

	await payload.create({
		collection: "teams",
		overrideAccess: true,
		data: normalizeTeamData(seedTeam, supervisorId, officerIds, reviewedAt, reviewerId),
		draft: false
	});

	console.log(`Created team '${seedTeam.name}' in seeded state.`);
}

const roleStateByLevel = new Map<RoleLevel, { id: string; reviewedAt: string }>();
for(const seedRole of ROLE_SEEDS) {
	const ensuredRole = await ensureRole(seedRole);
	roleStateByLevel.set(seedRole.level, ensuredRole);
}

let reviewerId = await findReviewerId();

const userIdByEmail = new Map<string, string>();

for(const manager of MANAGER_IDENTITIES) {
	const managerRole = roleStateByLevel.get(manager.level);
	if(managerRole == null)
		throw new Error(`Missing role id for level '${manager.level}'.`);

	const { userId } = await ensureUserAndStagedUser(manager, managerRole.id, null, reviewerId);
	userIdByEmail.set(manager.email, userId);
}

if(reviewerId == null)
	reviewerId = userIdByEmail.get(MANAGER_IDENTITIES[0].email) ?? null;

for(const supervisor of SUPERVISOR_IDENTITIES) {
	const supervisorRole = roleStateByLevel.get(supervisor.level);
	if(supervisorRole == null)
		throw new Error(`Missing role id for level '${supervisor.level}'.`);

	const supervisorId = supervisor.supervisorEmail == null ? null : (userIdByEmail.get(supervisor.supervisorEmail) ?? null);
	const { userId } = await ensureUserAndStagedUser(supervisor, supervisorRole.id, supervisorId, reviewerId);
	userIdByEmail.set(supervisor.email, userId);
}

for(const officer of OFFICER_IDENTITIES) {
	const officerRole = roleStateByLevel.get(officer.level);
	if(officerRole == null)
		throw new Error(`Missing role id for level '${officer.level}'.`);

	const supervisorId = officer.supervisorEmail == null ? null : (userIdByEmail.get(officer.supervisorEmail) ?? null);
	const { userId } = await ensureUserAndStagedUser(officer, officerRole.id, supervisorId, reviewerId);
	userIdByEmail.set(officer.email, userId);
}

const teamSeeds: SeedTeam[] = SUPERVISOR_IDENTITIES.map((supervisor, index) => ({
	name: `Tim Supervisi ${index + 1}`,
	supervisorEmail: supervisor.email,
	officerEmails: OFFICER_IDENTITIES
		.filter(officer => officer.supervisorEmail == supervisor.email)
		.map(officer => officer.email)
}));

for(const teamSeed of teamSeeds)
	await ensureTeam(teamSeed, userIdByEmail, reviewerId);

if(reviewerId != null) {
	for(const [roleLevel, roleState] of roleStateByLevel) {
		await setRoleReviewer(roleState.id, reviewerId);
		console.log(`Ensured role '${roleLevel}' is linked to reviewer '${reviewerId}'.`);
	}
}

console.log("Seeded example data: 3 roles, 2 managers, 3 supervisors, 15 officers, and 3 teams.");
