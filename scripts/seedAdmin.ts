import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import type { Role, StagedUser } from "@/payload-types";

const DEFAULT_ADMIN_ROLE_NAME = "Admin";
const DEFAULT_ADMIN_EMAIL = "admin@local.local";
const DEFAULT_ADMIN_PASSWORD = "admin";
const DEFAULT_ADMIN_NAME = "Admin";
const DEFAULT_ADMIN_EMPLOYEE_ID = "ADMIN-1";
const DEFAULT_REVIEW_COMMENT = "Seeded admin role and admin user for local bootstrap.";
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
	"monitoring-officer-tracking-viewer",
	"monitoring-log-gps-viewer",
	"monitoring-log-recording-viewer",
	"monitoring-log-otp-viewer"
];

type ReviewCommentValue = NonNullable<Role["reviewComment"]>;

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

const normalizeRoleData = (reviewedAt: string) => ({
	name: DEFAULT_ADMIN_ROLE_NAME,
	level: "admin" as const,
	menus: ALL_MENUS,
	reviewedAt,
	reviewApproved: true,
	reviewComment,
	deletedAt: null,
	deletedBy: null,
	_status: "published" as const
});

const normalizeUserData = (adminRoleId: string, stagedUserId: string | null) => ({
	email: DEFAULT_ADMIN_EMAIL,
	password: DEFAULT_ADMIN_PASSWORD,
	name: DEFAULT_ADMIN_NAME,
	employeeId: DEFAULT_ADMIN_EMPLOYEE_ID,
	role: adminRoleId,
	stagedUser: stagedUserId,
	enableAPIKey: false,
	sessions: [],
	loginAttempts: 0,
	lockUntil: null,
	deletedAt: null,
	deletedBy: null
});

const normalizeStagedUserData = (adminRoleId: string, reviewedAt: string, reviewedBy: string) => ({
	_status: "published" as const,
	email: DEFAULT_ADMIN_EMAIL,
	name: DEFAULT_ADMIN_NAME,
	employeeId: DEFAULT_ADMIN_EMPLOYEE_ID,
	role: adminRoleId,
	supervisor: null,
	initialPassword: DEFAULT_ADMIN_PASSWORD,
	reviewedAt,
	reviewedBy,
	reviewApproved: true,
	reviewComment,
	deletedAt: null,
	deletedBy: null
});

const { docs: roleDocs } = await payload.find({
	collection: "roles",
	where: {
		and: [
			{ name: { equals: DEFAULT_ADMIN_ROLE_NAME } },
			{ level: { equals: "admin" } }
		]
	},
	limit: 1,
	sort: "-updatedAt",
	draft: true,
	trash: true,
	overrideAccess: true
});

let adminRoleId: string;
let roleReviewedAt = now;

if(roleDocs.length > 0) {
	const existingRole = roleDocs[0];
	adminRoleId = existingRole.id;
	roleReviewedAt = existingRole.reviewedAt ?? now;

	await payload.update({
		collection: "roles",
		id: existingRole.id,
		overrideAccess: true,
		trash: true,
		data: normalizeRoleData(roleReviewedAt),
		draft: false
	});

	console.log(`Normalized role '${DEFAULT_ADMIN_ROLE_NAME}' to seeded state.`);
} else {
	const createdRole = await payload.create({
		collection: "roles",
		overrideAccess: true,
		data: normalizeRoleData(roleReviewedAt),
		draft: false
	});

	adminRoleId = createdRole.id;

	console.log(`Created role '${DEFAULT_ADMIN_ROLE_NAME}' in seeded state.`);
}

const { docs: userDocs } = await payload.find({
	collection: "users",
	where: {
		email: { equals: DEFAULT_ADMIN_EMAIL }
	},
	limit: 1,
	sort: "-updatedAt",
	trash: true,
	overrideAccess: true
});

let adminUserId: string;
let existingLinkedStagedUserId: string | null = null;

if(userDocs.length > 0) {
	const existingAdminUser = userDocs[0];
	adminUserId = existingAdminUser.id;
	existingLinkedStagedUserId = getRelationshipId(existingAdminUser.stagedUser);

	await payload.update({
		collection: "users",
		id: adminUserId,
		overrideAccess: true,
		trash: true,
		data: normalizeUserData(adminRoleId, existingLinkedStagedUserId)
	});

	console.log(`Normalized admin user '${DEFAULT_ADMIN_EMAIL}' to seeded state.`);
} else {
	const createdAdminUser = await payload.create({
		collection: "users",
		overrideAccess: true,
		data: normalizeUserData(adminRoleId, null)
	});
	adminUserId = createdAdminUser.id;

	console.log(`Created admin user '${DEFAULT_ADMIN_EMAIL}' in seeded state.`);
}

let existingStagedUser: StagedUser | null = null;
if(existingLinkedStagedUserId != null) {
	const stagedByLinkedId = await payload.find({
		collection: "staged-users",
		where: {
			id: { equals: existingLinkedStagedUserId }
		},
		limit: 1,
		draft: true,
		trash: true,
		overrideAccess: true
	});
	existingStagedUser = stagedByLinkedId.docs[0] ?? null;
}

if(existingStagedUser == null) {
	const stagedByIdentity = await payload.find({
		collection: "staged-users",
		where: {
			or: [
				{ email: { equals: DEFAULT_ADMIN_EMAIL } },
				{ employeeId: { equals: DEFAULT_ADMIN_EMPLOYEE_ID } }
			]
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		overrideAccess: true
	});
	existingStagedUser = stagedByIdentity.docs[0] ?? null;
}

let adminStagedUserId: string;
const stagedReviewedAt = existingStagedUser?.reviewedAt ?? now;

if(existingStagedUser != null) {
	adminStagedUserId = existingStagedUser.id;

	await payload.update({
		collection: "staged-users",
		id: adminStagedUserId,
		overrideAccess: true,
		trash: true,
		data: normalizeStagedUserData(adminRoleId, stagedReviewedAt, adminUserId),
		draft: false
	});

	console.log(`Normalized staged user '${DEFAULT_ADMIN_EMAIL}' to seeded state.`);
} else {
	const createdStagedUser = await payload.create({
		collection: "staged-users",
		overrideAccess: true,
		data: normalizeStagedUserData(adminRoleId, stagedReviewedAt, adminUserId),
		draft: false
	});

	adminStagedUserId = createdStagedUser.id;

	console.log(`Created staged user '${DEFAULT_ADMIN_EMAIL}' in seeded state.`);
}

await payload.update({
	collection: "users",
	id: adminUserId,
	overrideAccess: true,
	trash: true,
	data: normalizeUserData(adminRoleId, adminStagedUserId)
});

await payload.update({
	collection: "roles",
	id: adminRoleId,
	overrideAccess: true,
	trash: true,
	data: normalizeRoleData(roleReviewedAt),
	draft: false
});

const dbAdapter = payload.db as typeof payload.db & {
	update?: (args: Parameters<typeof payload.db.updateOne>[0]) => ReturnType<typeof payload.db.updateOne>;
};

if(typeof dbAdapter.update == "function") {
	await dbAdapter.update({
		collection: "roles",
		id: adminRoleId,
		data: {
			reviewedBy: adminUserId
		},
		draft: false
	});
} else {
	await dbAdapter.updateOne({
		collection: "roles",
		id: adminRoleId,
		data: {
			reviewedBy: adminUserId
		},
		draft: false
	});
}

console.log(`Ensured role '${DEFAULT_ADMIN_ROLE_NAME}' is published, reviewed, and linked to reviewer '${DEFAULT_ADMIN_EMAIL}'.`);
