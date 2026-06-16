import { Payload } from "payload";

import { getRelationshipId } from "@/utils/payload";
import { User } from "@/payload-types";

export const settlementStatusSelectOptions = Object.freeze([
	{ value: "finished", label: "Finished" },
	{ value: "cancelled", label: "Cancelled" }
] as const);

export const ACTIVE_OFFICER_TASK_KV_TTL_MS = 12 * 60 * 60 * 1000;
export const OTP_PERIOD_MS = 30 * 60 * 1000;
export const GEOFENCE_VALIDATION_WINDOW_CLIENT_MS = 10 * 60 * 1000;
export const GEOFENCE_VALIDATION_WINDOW_SERVER_MS = 30 * 60 * 1000;
export const GEOFENCE_MAX_ACCURACY_METERS = 200;

export type ActiveOfficerTaskKvData = {
	id: string;
	createdAt: number;
	otpEntered: boolean;
};

export async function getCurrentChainHeadOfficerTaskId(
	{ payload, user, creditApplicationAssignmentId }:
	{ payload: Payload, user: User, creditApplicationAssignmentId: string }
): Promise<string | null> {
	const result = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		trash: true,
		pagination: false,
		limit: 1,
		depth: 0,
		where: { and: [
			{ creditApplicationAssignment: { equals: creditApplicationAssignmentId } },
			{ next: { exists: false } }
		] },
		select: {}
	});
	return result.docs[0]?.id;
}

export async function getLatestPublishedAssignmentVersionId(
	{ payload, user, creditApplicationAssignmentId }:
	{ payload: Payload, user: User, creditApplicationAssignmentId: string }
): Promise<string | null> {
	const versions = await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "credit-application-assignments",
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: creditApplicationAssignmentId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {}
	});
	return versions.docs[0]?.id;
}

export async function chainAndCreateNextOfficerTask(
	{ payload, user, previousOfficerTaskId }:
	{ payload: Payload, user: User, previousOfficerTaskId: string }
): Promise<{ id: string }> {
	const previous = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		id: previousOfficerTaskId,
		draft: true,
		trash: true,
		depth: 0
	});
	const creditApplicationAssignmentId = getRelationshipId(previous.creditApplicationAssignment)!;
	if(previous.settledAt == null)
		throw new Error("Cannot create chained next officer task while previous is still pending.");
	const versionId = await getLatestPublishedAssignmentVersionId({ payload, user, creditApplicationAssignmentId });
	if(versionId == null)
		throw new Error("Credit application assignment has no published version.");
	const created = await payload.create({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		data: {
			_status: "published",
			createdAt: new Date().toISOString(),
			createdBy: user.id,
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			creditApplicationAssignment: creditApplicationAssignmentId,
			creditApplicationAssignmentVersion: versionId,
			next: null,
			settledAt: null,
			settlementStatus: null,
			settlementComment: null,
			evaluatedAt: null,
			evaluatedBy: null,
			evaluationApproved: null,
			evaluationComment: null
		}
	});
	await payload.update({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		id: previousOfficerTaskId,
		trash: true,
		data: {
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			next: created.id
		}
	});
	return { id: created.id };
}

export type OfficerTaskComputedStatus =
	"approved" |
	"rejected" |
	"cancelled" |
	"on-evaluation" |
	"active" |
	"stale" |
	"pending";

export function computeOfficerTaskStatus(
	{ row, isActive, dueDate, now = Date.now() }:
	{
		row: {
			settledAt?: string | null;
			settlementStatus?: string | null;
			evaluatedAt?: string | null;
			evaluationApproved?: boolean | null;
		};
		isActive: boolean;
		dueDate?: string | null;
		now?: number;
	}
): OfficerTaskComputedStatus {
	if(row.evaluationApproved == true)
		return "approved";
	if(row.evaluationApproved == false)
		return "rejected";
	if(row.settlementStatus == "cancelled")
		return "cancelled";
	if(row.settlementStatus == "finished" && row.evaluatedAt == null)
		return "on-evaluation";
	if(isActive)
		return "active";
	if(row.settledAt == null && dueDate != null && now >= Date.parse(dueDate))
		return "stale";
	return "pending";
}

export const officerTaskStatusLabels: Record<OfficerTaskComputedStatus, string> = Object.freeze({
	"approved": "Approved",
	"rejected": "Rejected",
	"cancelled": "Cancelled",
	"on-evaluation": "On Evaluation",
	"active": "Active",
	"stale": "Stale",
	"pending": "Pending"
});
