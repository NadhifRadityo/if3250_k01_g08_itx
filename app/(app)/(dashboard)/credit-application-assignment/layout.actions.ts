"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { buildFilterWhere, lexicalPlainText, getRelationshipId, leixcalPreprendPlainText } from "@/utils/payload";
import type { CreditApplicationAssignment } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationCreditApplications } from "../relation-navigation.actions";
import { RelationUser, RelationCreditApplication } from "../relation-navigation.shared";
import { FormState } from "./layout.components";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`credit-applications:${string}`, RelationCreditApplication>>;

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: CreditApplicationAssignment[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const creditApplicationIds = new Set<string>();
	for(const doc of docs) {
		const createdBy = getRelationshipId(doc.createdBy);
		if(createdBy != null)
			userIds.add(createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		if(updatedBy != null)
			userIds.add(updatedBy);
		const deletedBy = getRelationshipId(doc.deletedBy);
		if(deletedBy != null)
			userIds.add(deletedBy);
		const creditApplication = getRelationshipId(doc.creditApplication);
		if(creditApplication != null)
			creditApplicationIds.add(creditApplication);
		const officer = getRelationshipId(doc.officer);
		if(officer != null)
			userIds.add(officer);
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		if(reviewedBy != null)
			userIds.add(reviewedBy);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: [...userIds] }));
	Object.assign(relations, await resolveRelationCreditApplications({ payload, ids: [...creditApplicationIds] }));
	return relations;
}

async function queryAction(
	{ mode, keyword, filters, columnsSort, includeDeleted, pageIndex }:
	{ mode: "viewer" | "approver" | "editor", keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], includeDeleted: boolean, pageIndex: number }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const result = await payload.find({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		draft: true,
		trash: true,
		page: pageIndex,
		limit: PAGE_LIMIT,
		depth: 0,
		sort: columnsSort.map(([columnKey, ascending]) => `${!ascending ? "-" : ""}${columnKey}`),
		where: { and: [
			...(mode == "approver" ? [
				{ _status: { equals: "draft" } },
				{ reviewedAt: { exists: false } }
			] : []),
			...(!includeDeleted ? [
				{ deletedAt: { exists: false } }
			] : []),
			...(keyword.length > 0 ? [{ or: [
				{ id: { like: keyword } },
				{ "creditApplication.name": { like: keyword } },
				{ "creditApplication.email": { like: keyword } },
				{ "officer.name": { like: keyword } },
				{ "officer.email": { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, docs: result.docs });
	return { ...result, relations };
}

export async function queryViewerAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "viewer" });
}
export async function queryEditorAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "editor" });
}
export async function queryApproverAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "approver" });
}

export async function getDetailsAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "credit-application-assignments",
		draft: true,
		trash: true,
		id: id,
		depth: 0,
		select: {
			_status: true,
			createdAt: true,
			createdBy: true,
			updatedAt: true,
			updatedBy: true,
			deletedAt: true,
			deletedBy: true,
			creditApplication: true,
			officer: true,
			assignedDate: true,
			surveyDate: true,
			approvalDate: true,
			dueDate: true,
			rescheduleCount: true,
			geofenceRegions: true,
			changeRequestType: true,
			changeRequestComment: true,
			reviewedAt: true,
			reviewedBy: true,
			reviewApproved: true,
			reviewComment: true
		}
	});
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations };
}

export async function getDifferenceAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const requestedDoc = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		trash: true,
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: id } },
				{ "version._status": { equals: "draft" } }
			]
		},
		select: {
			updatedAt: true,
			version: {
				deletedAt: true,
				creditApplication: true,
				officer: true,
				assignedDate: true,
				surveyDate: true,
				approvalDate: true,
				dueDate: true,
				rescheduleCount: true,
				geofenceRegions: true,
				changeRequestType: true,
				changeRequestComment: true
			}
		}
	})).docs[0];
	const requestedVersion = requestedDoc?.version;
	if(requestedVersion == null)
		throw new Error("Draft credit application assignment request could not be found.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		trash: true,
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: id } },
				{ "version._status": { equals: "published" } },
				{ updatedAt: { less_than: requestedDoc.updatedAt } }
			]
		},
		select: {
			version: {
				deletedAt: true,
				creditApplication: true,
				officer: true,
				assignedDate: true,
				surveyDate: true,
				approvalDate: true,
				dueDate: true,
				rescheduleCount: true,
				geofenceRegions: true,
				changeRequestType: true,
				changeRequestComment: true
			}
		}
	})).docs[0]?.version;
	if(approvedVersion != null)
		approvedVersion.id = id;
	requestedVersion.id = id;
	const relations = await resolveRelations({ payload, docs: [...(approvedVersion != null ? [approvedVersion] : []), requestedVersion] });
	return {
		approvedVersion: approvedVersion,
		requestedVersion: requestedVersion,
		relations: relations
	};
}

export async function getHistoryAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const versionsResult = await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		trash: true,
		pagination: false,
		limit: 100,
		depth: 0,
		sort: "-updatedAt",
		where: { parent: { equals: id } },
		select: {
			updatedAt: true,
			version: {
				createdAt: true,
				createdBy: true,
				updatedAt: true,
				updatedBy: true,
				deletedAt: true,
				deletedBy: true,
				creditApplication: true,
				officer: true,
				assignedDate: true,
				surveyDate: true,
				approvalDate: true,
				dueDate: true,
				rescheduleCount: true,
				geofenceRegions: true,
				changeRequestType: true,
				changeRequestComment: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true
			}
		}
	});
	const entries = versionsResult.docs.map(v => ({ ...v.version, id: id, versionId: v.id }));
	const relations = await resolveRelations({ payload, docs: entries });
	return { entries, relations };
}

export async function requestUpsertAction(formState: FormState) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	formState.creditApplications ??= [];
	if(formState.creditApplications.length == 0)
		throw new Error("Credit application is required.");
	if(formState.officer == null || formState.officer.trim().length == 0)
		throw new Error("Officer is required.");
	const officer = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "users",
		id: formState.officer,
		depth: 1,
		select: {
			role: true
		}
	});
	const roleLevel = typeof officer.role == "object" && officer.role != null && "level" in officer.role ? officer.role.level : null;
	if(roleLevel != "officer")
		throw new Error("Selected user must have officer role.");
	const creditApplications = (await payload.find({
		user: user,
		overrideAccess: false,
		collection: "credit-applications",
		pagination: false,
		depth: 0,
		where: { id: { in: formState.creditApplications } },
		select: {
			_status: true,
			deletedAt: true
		}
	})).docs;
	if(formState.creditApplications.map(creditApplicationId => creditApplications.find(creditApplication => creditApplication.id == creditApplicationId))
		.some(creditApplication => creditApplication == null || creditApplication._status != "published" || creditApplication.deletedAt != null))
		throw new Error("Selected credit application must exists and be an active published credit application.");

	if(formState.id == null) {
		const assignmentsByCreditApplication = await (async creditApplicationIds => {
			if(creditApplicationIds.length == 0)
				return new Map<string, { id: string, deletedAt: string | null }>();
			const creditApplicationAssignments = await payload.find({
				user: user,
				overrideAccess: false,
				collection: "credit-application-assignments",
				draft: true,
				trash: true,
				pagination: false,
				depth: 0,
				limit: Math.max(creditApplicationIds.length, 1),
				where: { creditApplication: { in: creditApplicationIds } },
				select: {
					creditApplication: true,
					deletedAt: true
				}
			});
			return new Map(creditApplicationAssignments.docs.flatMap(doc => {
				const creditApplication = getRelationshipId(doc.creditApplication);
				return creditApplication != null ? [[creditApplication, {
					id: doc.id,
					deletedAt: doc.deletedAt
				}] as const] : [];
			}));
		})(formState.creditApplications);
		if(formState.creditApplications.some(creditApplication => assignmentsByCreditApplication.get(creditApplication)?.deletedAt != null))
			throw new Error("One or more selected credit applications already have an assignment.");
		const assignmentIds = [] as string[];
		for(const creditApplication of formState.creditApplications) {
			const existingAssignment = assignmentsByCreditApplication.get(creditApplication);
			if(existingAssignment == null) {
				const created = await payload.create({
					user: user,
					collection: "credit-application-assignments",
					overrideAccess: true,
					draft: true,
					data: {
						_status: "draft",
						deletedAt: null,
						deletedBy: null,
						creditApplication: creditApplication,
						officer: formState.officer,
						assignedDate: formState.assignedDate,
						surveyDate: formState.surveyDate,
						approvalDate: formState.approvalDate,
						dueDate: formState.dueDate,
						rescheduleCount: formState.rescheduleCount,
						geofenceRegions: formState.geofenceRegions,
						changeRequestType: "create",
						changeRequestComment: formState.changeRequestComment,
						reviewedAt: null,
						reviewedBy: null,
						reviewApproved: null,
						reviewComment: null
					}
				});
				assignmentIds.push(created.id);
				continue;
			}
			const restored = await payload.update({
				user: user,
				collection: "credit-application-assignments",
				id: existingAssignment.id,
				overrideAccess: true,
				draft: true,
				trash: true,
				data: {
					_status: "draft",
					deletedAt: null,
					deletedBy: null,
					creditApplication: creditApplication,
					officer: formState.officer,
					assignedDate: formState.assignedDate,
					surveyDate: formState.surveyDate,
					approvalDate: formState.approvalDate,
					dueDate: formState.dueDate,
					rescheduleCount: formState.rescheduleCount,
					geofenceRegions: formState.geofenceRegions,
					changeRequestType: "create",
					changeRequestComment: formState.changeRequestComment,
					reviewedAt: null,
					reviewedBy: null,
					reviewApproved: null,
					reviewComment: null
				}
			});
			assignmentIds.push(restored.id);
		}
		return { ids: assignmentIds };
	}
	await payload.update({
		user: user,
		collection: "credit-application-assignments",
		id: formState.id,
		overrideAccess: true,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: null,
			deletedBy: null,
			creditApplication: formState.creditApplications[0],
			officer: formState.officer,
			assignedDate: formState.assignedDate,
			surveyDate: formState.surveyDate,
			approvalDate: formState.approvalDate,
			dueDate: formState.dueDate,
			rescheduleCount: formState.rescheduleCount,
			geofenceRegions: formState.geofenceRegions,
			changeRequestType: "update",
			changeRequestComment: formState.changeRequestComment,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: formState.id };
}

export async function requestDeleteAction(
	{ id, changeRequestComment }:
	{ id: string, changeRequestComment?: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		id: id,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: new Date().toISOString(),
			deletedBy: user.id,
			changeRequestType: "delete",
			changeRequestComment: changeRequestComment,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: id };
}

export async function cancelRequestAction(
	{ id }:
	{ id: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplicationAssignment = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(creditApplicationAssignment.reviewedAt != null && creditApplicationAssignment.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		trash: true,
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: id } },
			{ "version._status": { equals: "published" } }
		] },
		select: {
			version: {
				_status: true,
				deletedAt: true,
				deletedBy: true,
				creditApplication: true,
				officer: true,
				assignedDate: true,
				surveyDate: true,
				approvalDate: true,
				dueDate: true,
				rescheduleCount: true,
				geofenceRegions: true,
				changeRequestType: true,
				changeRequestComment: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true
			}
		}
	})).docs[0]?.version;
	if(approvedVersion == null) {
		await payload.update({
			user: user,
			overrideAccess: true,
			collection: "credit-application-assignments",
			id: id,
			draft: true,
			trash: true,
			data: {
				_status: "draft",
				deletedAt: new Date().toISOString(),
				deletedBy: user.id,
				reviewedAt: new Date().toISOString(),
				reviewedBy: null,
				reviewApproved: true,
				reviewComment: lexicalPlainText("Auto-reviewed by system because the entry was cancelled before approval.")
			}
		});
		return { id: id };
	}
	await payload.update({
		user: user,
		collection: "credit-application-assignments",
		id: id,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			deletedAt: approvedVersion.deletedAt,
			deletedBy: approvedVersion.deletedBy,
			creditApplication: approvedVersion.creditApplication,
			officer: approvedVersion.officer,
			assignedDate: approvedVersion.assignedDate,
			surveyDate: approvedVersion.surveyDate,
			approvalDate: approvedVersion.approvalDate,
			dueDate: approvedVersion.dueDate,
			rescheduleCount: approvedVersion.rescheduleCount,
			geofenceRegions: approvedVersion.geofenceRegions,
			changeRequestType: approvedVersion.changeRequestType,
			changeRequestComment: approvedVersion.changeRequestComment,
			reviewedAt: approvedVersion.reviewedAt,
			reviewedBy: approvedVersion.reviewedBy,
			reviewApproved: approvedVersion.reviewApproved,
			reviewComment: leixcalPreprendPlainText(approvedVersion.reviewComment, `Auto-reviewed by system on behalf of ${JSON.stringify(approvedVersion.reviewedBy)} because the change request was cancelled before approval.`)
		}
	});
	return { id: id };
}

export async function requestRestoreAction(
	{ id, changeRequestComment }:
	{ id: string, changeRequestComment?: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplicationAssignment = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(creditApplicationAssignment.deletedAt == null)
		throw new Error("Credit application assignment is not deleted.");
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		id: id,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: null,
			deletedBy: null,
			changeRequestType: "create",
			changeRequestComment: changeRequestComment,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { assignmentId: id };
}

export async function reviewAction(
	{ id, decision, reviewComment }:
	{ id: string, decision: "approve" | "reject", reviewComment: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplicationAssignment = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(creditApplicationAssignment.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision == "reject") {
		await payload.update({
			user: user,
			overrideAccess: true,
			collection: "credit-application-assignments",
			id: id,
			draft: true,
			trash: true,
			data: {
				_status: "draft",
				reviewedAt: new Date().toISOString(),
				reviewedBy: user.id,
				reviewApproved: false,
				reviewComment: reviewComment
			}
		});
		return { id: id };
	}
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		id: id,
		trash: true,
		data: {
			_status: "published",
			reviewedAt: new Date().toISOString(),
			reviewedBy: user.id,
			reviewApproved: true,
			reviewComment: reviewComment
		}
	});
	return { id: id };
}
