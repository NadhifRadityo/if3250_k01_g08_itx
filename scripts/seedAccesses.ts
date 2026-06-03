import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { buildFilterWhere, lexicalPlainText } from "@/utils/payload";
import type { Access } from "@/payload-types";

const TIMESTAMP_BASE = new Date(1778889600000);

type SeedAccess = {
	key: string;
	name: string;
	description: string;
	enabled: boolean;
	priority: number;
	operation: Access["operation"];
	subjectUserFilters: any;
	subjectTeamFilters: any;
	subjectRoleFilters: any;
	collection: Access["collection"];
	filters: any;
	masks: any;
};

const ALL_COLLECTIONS: Access["collection"][] = [
	"staged-users",
	"roles",
	"teams",
	"accesses",
	"credit-applications",
	"credit-application-imports",
	"credit-application-assignments",
	"officer-tasks",
	"surveys",
	"survey-results",
	"satisfaction-surveys",
	"satisfaction-survey-results",
	"login-logs",
	"gps-logs",
	"message-logs",
	"recording-logs"
];

// Filter that matches all records
const MATCH_ALL = [{ columnKey: "id", operator: "exists", combinator: "and" as const, value: true }];

// --- Access Seeds ---
// Priority determines override order (higher = applied later, overrides earlier).
// Operations: union (add records), difference (remove records), intersect (keep only overlap), exclusion (symmetric diff).
const ACCESS_SEEDS: SeedAccess[] = [
	// ===== ADMIN: Full unrestricted access to everything =====
	...ALL_COLLECTIONS.map((collection, index) => ({
		key: `admin-full-${collection}`,
		name: `Admin Full Access – ${collection}`,
		description: `Grants full unrestricted access to all records in ${collection} for admin-level users. No field masks applied.`,
		enabled: true,
		priority: 100 + index,
		operation: "union" as const,
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "admin" }],
		collection: collection,
		filters: MATCH_ALL,
		masks: {}
	})),

	// ===== MANAGER: Broad access to management collections =====
	...(["staged-users", "roles", "teams", "accesses", "credit-applications", "credit-application-imports", "credit-application-assignments", "surveys", "survey-results", "satisfaction-surveys", "satisfaction-survey-results", "officer-tasks"] as Access["collection"][]).map((collection, index) => ({
		key: `manager-broad-${collection}`,
		name: `Manager Broad Access – ${collection}`,
		description: `Grants managers access to all records in ${collection}. Managers can view and manage operational data across their scope.`,
		enabled: true,
		priority: 200 + index,
		operation: "union" as const,
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "manager" }],
		collection: collection,
		filters: MATCH_ALL,
		masks: {}
	})),

	// Manager: access to logs but with sensitive fields masked
	...(["login-logs", "gps-logs", "message-logs", "recording-logs"] as Access["collection"][]).map((collection, index) => ({
		key: `manager-logs-masked-${collection}`,
		name: `Manager Logs Access (Masked) – ${collection}`,
		description: `Grants managers read access to ${collection} but masks personally identifiable fields to protect officer privacy.`,
		enabled: true,
		priority: 210 + index,
		operation: "union" as const,
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "manager" }],
		collection: collection,
		filters: MATCH_ALL,
		masks: collection == "login-logs" ? { ipAddress: "redact" } :
			collection == "recording-logs" ? { phoneNumber: "redact" } :
				collection == "message-logs" ? { email: "redact", whatsappNumber: "redact", smsNumber: "redact" } :
					{}
	})),

	// ===== SUPERVISOR: Access scoped to team-related data =====
	...(["credit-applications", "credit-application-assignments", "officer-tasks", "survey-results", "satisfaction-survey-results"] as Access["collection"][]).map((collection, index) => ({
		key: `supervisor-team-${collection}`,
		name: `Supervisor Team Access – ${collection}`,
		description: `Grants supervisors access to ${collection} records. Supervisors can manage data related to their team members' assignments.`,
		enabled: true,
		priority: 300 + index,
		operation: "union" as const,
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "supervisor" }],
		collection: collection,
		filters: MATCH_ALL,
		masks: {}
	})),

	// Supervisor: can view surveys and satisfaction surveys (read-only, no sensitive fields)
	...(["surveys", "satisfaction-surveys"] as Access["collection"][]).map((collection, index) => ({
		key: `supervisor-readonly-${collection}`,
		name: `Supervisor Read-Only – ${collection}`,
		description: `Grants supervisors read-only access to ${collection}. They can view survey definitions but change request fields are masked.`,
		enabled: true,
		priority: 310 + index,
		operation: "union" as const,
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "supervisor" }],
		collection: collection,
		filters: MATCH_ALL,
		masks: { changeRequestType: "hide", changeRequestComment: "hide", reviewedAt: "hide", reviewedBy: "hide", reviewApproved: "hide", reviewComment: "hide" }
	})),

	// Supervisor: GPS and recording logs for monitoring their officers
	...(["gps-logs", "recording-logs", "message-logs"] as Access["collection"][]).map((collection, index) => ({
		key: `supervisor-monitoring-${collection}`,
		name: `Supervisor Monitoring – ${collection}`,
		description: `Grants supervisors access to ${collection} for monitoring field officer activity within their teams.`,
		enabled: true,
		priority: 320 + index,
		operation: "union" as const,
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "supervisor" }],
		collection: collection,
		filters: MATCH_ALL,
		masks: {}
	})),

	// ===== OFFICER: Limited access to own tasks and results =====
	...(["officer-tasks", "survey-results", "satisfaction-survey-results"] as Access["collection"][]).map((collection, index) => ({
		key: `officer-own-${collection}`,
		name: `Officer Own Data – ${collection}`,
		description: `Grants field officers access to ${collection}. Officers can only interact with records assigned to them through their tasks.`,
		enabled: true,
		priority: 400 + index,
		operation: "union" as const,
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "officer" }],
		collection: collection,
		filters: MATCH_ALL,
		masks: {}
	})),

	// Officer: can view credit applications assigned to them
	{
		key: "officer-assigned-credit-applications",
		name: "Officer Assigned Credit Applications",
		description: "Grants field officers access to credit application records. Officers see applications that have been assigned to them for field work.",
		enabled: true,
		priority: 410,
		operation: "union",
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "officer" }],
		collection: "credit-applications",
		filters: MATCH_ALL,
		masks: { changeRequestType: "hide", changeRequestComment: "hide", reviewedAt: "hide", reviewedBy: "hide", reviewApproved: "hide", reviewComment: "hide" }
	},

	// Officer: GPS and recording logs (own reporting)
	...(["gps-logs", "recording-logs", "message-logs"] as Access["collection"][]).map((collection, index) => ({
		key: `officer-reporting-${collection}`,
		name: `Officer Reporting – ${collection}`,
		description: `Grants field officers access to submit and view their own ${collection} entries for activity reporting.`,
		enabled: true,
		priority: 420 + index,
		operation: "union" as const,
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "officer" }],
		collection: collection,
		filters: MATCH_ALL,
		masks: {}
	})),

	// ===== TEAM-BASED: Bandung team gets access to credit-application-assignments =====
	{
		key: "bandung-team-assignments",
		name: "Bandung Team – Credit Application Assignments",
		description: "Grants the Bandung Survey Team access to credit application assignment records. Scoped by team membership for regional data isolation.",
		enabled: true,
		priority: 500,
		operation: "union",
		subjectUserFilters: null,
		subjectTeamFilters: [{ columnKey: "name", operator: "equals", combinator: "and" as const, value: "Bandung Survey Team" }],
		subjectRoleFilters: null,
		collection: "credit-application-assignments",
		filters: MATCH_ALL,
		masks: {}
	},
	{
		key: "jakarta-team-assignments",
		name: "Jakarta Team – Credit Application Assignments",
		description: "Grants the Jakarta Survey Team access to credit application assignment records. Scoped by team membership for regional data isolation.",
		enabled: true,
		priority: 501,
		operation: "union",
		subjectUserFilters: null,
		subjectTeamFilters: [{ columnKey: "name", operator: "equals", combinator: "and" as const, value: "Jakarta Survey Team" }],
		subjectRoleFilters: null,
		collection: "credit-application-assignments",
		filters: MATCH_ALL,
		masks: {}
	},

	// ===== USER-SPECIFIC: Admin user gets explicit full access to accesses (bootstrap) =====
	{
		key: "admin-user-bootstrap-accesses",
		name: "Admin User Bootstrap – Accesses",
		description: "Explicit user-level access for the admin user to the accesses collection. Ensures the admin can always manage access control rules even if role-based rules are misconfigured.",
		enabled: true,
		priority: 900,
		operation: "union",
		subjectUserFilters: [{ columnKey: "email", operator: "equals", combinator: "and" as const, value: "admin@local.local" }],
		subjectTeamFilters: null,
		subjectRoleFilters: null,
		collection: "accesses",
		filters: MATCH_ALL,
		masks: {}
	},

	// ===== DIFFERENCE: Remove deleted records from officer view =====
	...(["credit-applications"] as Access["collection"][]).map((collection, index) => ({
		key: `officer-exclude-deleted-${collection}`,
		name: `Officer Exclude Deleted – ${collection}`,
		description: `Removes soft-deleted records from the officer's view of ${collection}. Officers should not see records that have been marked for deletion.`,
		enabled: true,
		priority: 600 + index,
		operation: "difference" as const,
		subjectUserFilters: null,
		subjectTeamFilters: null,
		subjectRoleFilters: [{ columnKey: "level", operator: "equals", combinator: "and" as const, value: "officer" }],
		collection: collection,
		filters: [{ columnKey: "deletedAt", operator: "exists", combinator: "and" as const, value: true }],
		masks: {}
	})),

	// ===== INTERSECT: Manager Jakarta only sees Jakarta-region credit applications =====
	{
		key: "manager-jakarta-intersect-credit-apps",
		name: "Manager Jakarta Intersect – Credit Applications",
		description: "Restricts the Jakarta manager to only see credit applications that are not yet deleted. Uses intersect to narrow down the broad manager access to active records only.",
		enabled: true,
		priority: 700,
		operation: "intersect",
		subjectUserFilters: [{ columnKey: "email", operator: "equals", combinator: "and" as const, value: "manager.jakarta@local.local" }],
		subjectTeamFilters: null,
		subjectRoleFilters: null,
		collection: "credit-applications",
		filters: [{ columnKey: "deletedAt", operator: "exists", combinator: "and" as const, value: false }],
		masks: {}
	},

	// ===== EXCLUSION: Supervisor Bandung exclusion on login-logs (sees everything except own logs) =====
	{
		key: "supervisor-bandung-exclusion-login-logs",
		name: "Supervisor Bandung Exclusion – Login Logs",
		description: "Applies symmetric difference for Supervisor Bandung on login logs. This demonstrates the exclusion operation where the supervisor sees logs that don't overlap with their own login events.",
		enabled: true,
		priority: 800,
		operation: "exclusion",
		subjectUserFilters: [{ columnKey: "email", operator: "equals", combinator: "and" as const, value: "supervisor.bandung@local.local" }],
		subjectTeamFilters: null,
		subjectRoleFilters: null,
		collection: "login-logs",
		filters: [{ columnKey: "event", operator: "equals", combinator: "and" as const, value: "login" }],
		masks: {}
	}
];

function isoAt(minutesOffset: number): string {
	const value = new Date(TIMESTAMP_BASE);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedAccesses] Starting access seeding...");

// Get acting user (admin)
console.log("[seedAccesses] Looking up admin user...");
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
})).docs[0];
if(actingUser == null) throw new Error("Seed admin user is missing. Run 'payload run ./scripts/seedUsers.ts' first.");

for(const [index, accessSeed] of ACCESS_SEEDS.entries()) {
	const publishedAt = isoAt(500 + index * 5);
	const pendingAt = isoAt(500 + index * 5 + 2);

	console.log(`[seedAccesses] Checking existing access '${accessSeed.name}'...`);
	const existing = (await payload.find({
		collection: "accesses",
		overrideAccess: true,
		where: {
			and: [
				{ name: { equals: accessSeed.name } },
				{ collection: { equals: accessSeed.collection } }
			]
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		depth: 0
	})).docs[0];

	const publishedData = {
		name: accessSeed.name,
		description: lexicalPlainText(accessSeed.description),
		enabled: accessSeed.enabled,
		priority: accessSeed.priority,
		operation: accessSeed.operation,
		subjectUserFilters: accessSeed.subjectUserFilters,
		subjectTeamFilters: accessSeed.subjectTeamFilters,
		subjectRoleFilters: accessSeed.subjectRoleFilters,
		collection: accessSeed.collection,
		filters: accessSeed.filters,
		masks: accessSeed.masks,
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
		reviewComment: lexicalPlainText(`Seed approved baseline for access '${accessSeed.name}'.`)
	};

	const pendingData = {
		name: accessSeed.name,
		description: lexicalPlainText(accessSeed.description),
		enabled: accessSeed.enabled,
		priority: accessSeed.priority,
		operation: accessSeed.operation,
		subjectUserFilters: accessSeed.subjectUserFilters,
		subjectTeamFilters: accessSeed.subjectTeamFilters,
		subjectRoleFilters: accessSeed.subjectRoleFilters,
		collection: accessSeed.collection,
		filters: accessSeed.filters,
		masks: accessSeed.masks,
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

	let id: string;
	if(existing == null) {
		console.log(`[seedAccesses] Creating access '${accessSeed.name}' as draft...`);
		const created = await payload.create({
			collection: "accesses",
			user: actingUser,
			overrideAccess: true,
			data: pendingData,
			draft: true
		});
		id = created.id;
	} else {
		console.log(`[seedAccesses] Updating existing access '${accessSeed.name}' (id: ${existing.id})...`);
		id = existing.id;
		await payload.update({
			collection: "accesses",
			user: actingUser,
			overrideAccess: true,
			trash: true,
			id,
			data: pendingData,
			draft: true
		});
	}

	console.log(`[seedAccesses] Publishing access '${accessSeed.name}'...`);
	await payload.update({
		collection: "accesses",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: publishedData,
		draft: false
	});
}

// Compile accesses for all collections after seeding
console.log("[seedAccesses] Compiling accesses for all collections...");
for(const collection of ALL_COLLECTIONS) {
	const accesses = await payload.find({
		overrideAccess: true,
		collection: "accesses",
		pagination: false,
		depth: 0,
		where: { and: [
			{ _status: { equals: "published" } },
			{ reviewedAt: { exists: true } },
			{ deletedAt: { exists: false } },
			{ enabled: { equals: true } },
			{ collection: { equals: collection } }
		] },
		select: {
			createdAt: true,
			name: true,
			priority: true,
			operation: true,
			subjectUserFilters: true,
			subjectTeamFilters: true,
			subjectRoleFilters: true,
			collection: true,
			filters: true,
			masks: true
		}
	});

	// Build compiled accesses with resolved subject filters
	type CompiledAccess = {
		id: string;
		createdAt: string;
		name: string;
		priority: number;
		operation: Access["operation"];
		subjectUserFilters: Access["subjectUserFilters"];
		subjectTeamFilters: Access["subjectTeamFilters"];
		subjectRoleFilters: Access["subjectRoleFilters"];
		compiledUsers: string[];
		compiledTeams: string[];
		compiledRoles: string[];
		collection: Access["collection"];
		filters: Access["filters"];
		masks: Access["masks"];
	};
	const compiledAccesses: CompiledAccess[] = [];
	for(const access of accesses.docs) {
		const userFilters = JSON.parse(JSON.stringify(access.subjectUserFilters));
		const teamFilters = JSON.parse(JSON.stringify(access.subjectTeamFilters));
		const roleFilters = JSON.parse(JSON.stringify(access.subjectRoleFilters));

		const compiledUsers = userFilters != null ?
			(await payload.find({
				overrideAccess: true,
				collection: "users",
				pagination: false,
				depth: 0,
				where: { and: [
					{ deletedAt: { exists: false } },
					buildFilterWhere(userFilters)
				] },
				select: {}
			})).docs.map(u => u.id) :
			[];

		const compiledTeams = teamFilters != null ?
			(await payload.find({
				overrideAccess: true,
				collection: "teams",
				pagination: false,
				depth: 0,
				where: { and: [
					{ _status: { equals: "published" } },
					{ reviewedAt: { exists: true } },
					{ deletedAt: { exists: false } },
					buildFilterWhere(teamFilters)
				] },
				select: {}
			})).docs.map(u => u.id) :
			[];

		const compiledRoles = roleFilters != null ?
			(await payload.find({
				overrideAccess: true,
				collection: "roles",
				pagination: false,
				depth: 0,
				where: { and: [
					{ _status: { equals: "published" } },
					{ reviewedAt: { exists: true } },
					{ deletedAt: { exists: false } },
					buildFilterWhere(roleFilters)
				] },
				select: {}
			})).docs.map(u => u.id) :
			[];

		compiledAccesses.push({
			id: access.id,
			createdAt: access.createdAt,
			name: access.name,
			priority: access.priority,
			operation: access.operation,
			subjectUserFilters: access.subjectUserFilters,
			subjectTeamFilters: access.subjectTeamFilters,
			subjectRoleFilters: access.subjectRoleFilters,
			compiledUsers,
			compiledTeams,
			compiledRoles,
			collection: access.collection,
			filters: access.filters,
			masks: access.masks
		});
	}

	await payload.kv.set(`accesses:${collection}`, compiledAccesses);
	console.log(`[seedAccesses] Compiled ${compiledAccesses.length} access(es) for '${collection}'.`);
}

console.log(`[seedAccesses] Done. Seeded ${ACCESS_SEEDS.length} accesses in approved state.`);

export {};
