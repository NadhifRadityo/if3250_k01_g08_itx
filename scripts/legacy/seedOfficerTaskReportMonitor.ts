import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import type { CreditApplication, CreditApplicationAssignment } from "@/payload-types";

const DEFAULT_REVIEWER_EMAIL = "admin@local.local";
const ASSIGNMENT_APPROVAL_COMMENT_TEXT = "Seeded assignment approved for officer task reporting and monitoring.";
const ASSIGNMENT_REJECTION_COMMENT_TEXT = "Seeded assignment rejected for officer task reporting and monitoring.";

type AssignmentStatus = "pending" | "approved" | "rejected";
type RichTextValue = NonNullable<CreditApplicationAssignment["reviewComment"]>;
type LocationPointSeed = {
	latitude: number;
	longitude: number;
	label: string;
	recordedAt: string;
};
type OfficerTaskSeed = {
	seedKey: string;
	assignmentStatus: AssignmentStatus;
};
type SeededApplication = {
	id: string;
	seedKey: string;
	assignmentStatus: AssignmentStatus;
};

const OFFICER_TASK_SEEDS: OfficerTaskSeed[] = [
	{ seedKey: "CA-SEED-001", assignmentStatus: "approved" },
	{ seedKey: "CA-SEED-002", assignmentStatus: "pending" },
	{ seedKey: "CA-SEED-003", assignmentStatus: "rejected" },
	{ seedKey: "CA-SEED-004", assignmentStatus: "approved" },
	{ seedKey: "CA-SEED-005", assignmentStatus: "pending" }
];

function plainTextToRichText(value: string): RichTextValue {
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
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function addMinutes(value: string, minutes: number): string {
	const date = new Date(value);
	date.setMinutes(date.getMinutes() + minutes);
	return date.toISOString();
}

function createSeedLocation(index: number, offset = 0): LocationPointSeed {
	const baseLatitude = -6.914744;
	const baseLongitude = 107.60981;
	return {
		latitude: Number((baseLatitude + (index * 0.012) + (offset * 0.002)).toFixed(6)),
		longitude: Number((baseLongitude + (index * 0.009) + (offset * 0.0025)).toFixed(6)),
		label: `Seed point ${index + 1}.${offset + 1}`,
		recordedAt: new Date().toISOString()
	};
}

function createTrackingLocations(index: number, now: string): LocationPointSeed[] {
	return [0, 1, 2, 3].map(offset => ({
		...createSeedLocation(index, offset),
		label: `Tracking ${offset + 1}`,
		recordedAt: addMinutes(now, index + offset)
	}));
}

function resolveAssignmentReviewData(
	status: AssignmentStatus,
	now: string,
	reviewerId: string | null
): Pick<CreditApplicationAssignment, "reviewedAt" | "reviewedBy" | "reviewApproved" | "reviewComment"> {
	if(status == "pending") {
		return {
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		};
	}

	if(status == "approved") {
		return {
			reviewedAt: now,
			reviewedBy: reviewerId,
			reviewApproved: true,
			reviewComment: plainTextToRichText(ASSIGNMENT_APPROVAL_COMMENT_TEXT)
		};
	}

	return {
		reviewedAt: now,
		reviewedBy: reviewerId,
		reviewApproved: false,
		reviewComment: plainTextToRichText(ASSIGNMENT_REJECTION_COMMENT_TEXT)
	};
}

function normalizeObject(value: unknown): Record<string, unknown> {
	if(value != null && typeof value == "object" && !Array.isArray(value))
		return value as Record<string, unknown>;
	return {};
}

function resolveOfficerTaskOthers(
	application: Pick<CreditApplication, "others">,
	seed: OfficerTaskSeed,
	index: number,
	now: string
): Record<string, unknown> {
	return {
		...normalizeObject(application.others),
		seededBy: "seedOfficerTaskReportMonitor",
		seedKey: seed.seedKey,
		assignmentStatus: seed.assignmentStatus,
		surveyDate: addMinutes(now, index + 35),
		surveyResult: seed.assignmentStatus == "approved" ? "Finished" : seed.assignmentStatus == "rejected" ? "Rejected" : "Draft",
		rescheduleDate: seed.assignmentStatus == "pending" ? addMinutes(now, 1440 + index) : null,
		rescheduleTime: seed.assignmentStatus == "pending" ? "10:30" : null,
		tracking: createTrackingLocations(index, now),
		trackingLocations: createTrackingLocations(index, now),
		firstLoginLocation: {
			...createSeedLocation(index, 0),
			label: "First Login",
			recordedAt: addMinutes(now, index)
		},
		lastLogoutLocation: {
			...createSeedLocation(index, 3),
			label: "Last Logout",
			recordedAt: addMinutes(now, index + 180)
		},
		picture1: `https://example.com/seed/${seed.seedKey.toLowerCase()}-picture-1.jpg`,
		picture1Location: {
			...createSeedLocation(index, 1),
			label: "Picture 1",
			recordedAt: addMinutes(now, index + 45)
		},
		picture12: `https://example.com/seed/${seed.seedKey.toLowerCase()}-picture-12.jpg`,
		picture12Location: {
			...createSeedLocation(index, 2),
			label: "Picture 12",
			recordedAt: addMinutes(now, index + 90)
		}
	};
}

async function resolveReviewerUserId(payload: Awaited<ReturnType<typeof getPayload>>): Promise<string | null> {
	const reviewerResult = await payload.find({
		collection: "users",
		where: {
			email: { equals: DEFAULT_REVIEWER_EMAIL }
		},
		limit: 1,
		sort: "-updatedAt",
		trash: true,
		overrideAccess: true
	});

	return reviewerResult.docs[0]?.id ?? null;
}

async function resolveOfficerUserIds(payload: Awaited<ReturnType<typeof getPayload>>): Promise<string[]> {
	const officersResult = await payload.find({
		collection: "users",
		where: {
			"role.level": { equals: "officer" }
		},
		limit: 200,
		sort: "name",
		depth: 0,
		trash: true,
		overrideAccess: true
	});

	return officersResult.docs
		.map(doc => String(doc.id))
		.filter(id => id.trim().length > 0);
}

async function ensureSeedApplications(
	payload: Awaited<ReturnType<typeof getPayload>>,
	now: string
): Promise<SeededApplication[]> {
	const seedKeys = OFFICER_TASK_SEEDS.map(seed => seed.seedKey);
	const result = await payload.find({
		collection: "credit-applications",
		where: {
			otherText1: {
				in: seedKeys
			}
		},
		limit: OFFICER_TASK_SEEDS.length,
		sort: "otherText1",
		draft: true,
		trash: true,
		overrideAccess: true,
		select: {
			otherText1: true,
			others: true
		}
	});

	if(result.docs.length == 0)
		throw new Error("No CA-SEED-* credit applications found. Run seed:credit-application-management first.");

	const applicationBySeedKey = new Map(result.docs.map(doc => [doc.otherText1, doc]));
	const seededApplications: SeededApplication[] = [];
	for(const [index, seed] of OFFICER_TASK_SEEDS.entries()) {
		const application = applicationBySeedKey.get(seed.seedKey);
		if(application == null) {
			console.warn(`Skipping '${seed.seedKey}' because the base credit application seed does not exist.`);
			continue;
		}

		const updatedApplication = await payload.update({
			collection: "credit-applications",
			id: application.id,
			overrideAccess: true,
			trash: true,
			data: {
				others: resolveOfficerTaskOthers(application, seed, index, now)
			},
			draft: false
		});

		seededApplications.push({
			id: String(updatedApplication.id),
			seedKey: seed.seedKey,
			assignmentStatus: seed.assignmentStatus
		});
	}

	return seededApplications;
}

async function ensureSeedAssignments(
	payload: Awaited<ReturnType<typeof getPayload>>,
	seededApplications: SeededApplication[],
	reviewerId: string | null,
	now: string
): Promise<void> {
	const officerUserIds = await resolveOfficerUserIds(payload);
	if(officerUserIds.length == 0)
		throw new Error("No officer users found. Run seed:user-role-team first.");

	for(const [index, seededApplication] of seededApplications.entries()) {
		const existingResult = await payload.find({
			collection: "credit-application-assignments",
			where: {
				creditApplication: { equals: seededApplication.id }
			},
			limit: 1,
			sort: "-updatedAt",
			draft: true,
			trash: true,
			overrideAccess: true
		});

		const reviewData = resolveAssignmentReviewData(seededApplication.assignmentStatus, now, reviewerId);
		const normalizedData = {
			_status: "published" as const,
			createdAt: addMinutes(now, index),
			updatedAt: addMinutes(now, index + 180),
			creditApplication: seededApplication.id,
			officer: officerUserIds[index % officerUserIds.length],
			reviewedAt: reviewData.reviewedAt,
			reviewedBy: getRelationshipId(reviewData.reviewedBy),
			reviewApproved: reviewData.reviewApproved,
			reviewComment: reviewData.reviewComment,
			deletedAt: null,
			deletedBy: null
		};

		if(existingResult.docs.length > 0) {
			await payload.update({
				collection: "credit-application-assignments",
				id: existingResult.docs[0].id,
				overrideAccess: true,
				trash: true,
				data: normalizedData,
				draft: false
			});
			continue;
		}

		await payload.create({
			collection: "credit-application-assignments",
			overrideAccess: true,
			data: normalizedData,
			draft: false
		});
	}
}

const payload = await getPayload({ config: payloadConfig });
const now = new Date().toISOString();
const reviewerId = await resolveReviewerUserId(payload);
if(reviewerId == null)
	console.warn("Reviewer user not found. Reviewer relationship fields will be set to null.");

const seededApplications = await ensureSeedApplications(payload, now);
await ensureSeedAssignments(payload, seededApplications, reviewerId, now);

console.log(`Seeded officer-task reporting and monitoring data (${seededApplications.length} applications).`);
