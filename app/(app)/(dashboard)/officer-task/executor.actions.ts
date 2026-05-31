"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { OfficerTask } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationOfficerTasks, resolveRelationCreditApplicationAssignments } from "../relation-navigation.actions";
import { RelationUser, RelationOfficerTask, RelationCreditApplicationAssignment } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`credit-application-assignments:${string}`, RelationCreditApplicationAssignment>> &
	Partial<Record<`officer-tasks:${string}`, RelationOfficerTask>>;

export type FormState = {
	id?: string;
	creditApplicationAssignment?: string;
	next?: string;
};

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: OfficerTask[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const creditApplicationAssignmentIds = new Set<string>();
	const officerTaskIds = new Set<string>();
	for(const doc of docs) {
		const createdBy = getRelationshipId(doc.createdBy);
		if(createdBy != null)
			userIds.add(createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		if(updatedBy != null)
			userIds.add(updatedBy);
		const creditApplicationAssignment = getRelationshipId(doc.creditApplicationAssignment);
		if(creditApplicationAssignment != null)
			creditApplicationAssignmentIds.add(creditApplicationAssignment);
		const next = getRelationshipId(doc.next);
		if(next != null)
			officerTaskIds.add(next);
		const evaluatedBy = getRelationshipId(doc.evaluatedBy);
		if(evaluatedBy != null)
			userIds.add(evaluatedBy);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: [...userIds] }));
	Object.assign(relations, await resolveRelationCreditApplicationAssignments({ payload, ids: [...creditApplicationAssignmentIds] }));
	Object.assign(relations, await resolveRelationOfficerTasks({ payload, ids: [...officerTaskIds] }));
	return relations;
}

export async function queryExecutorAction(
	{ keyword, filters, columnsSort, includeDeleted, pageIndex }:
	{ keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], includeDeleted: boolean, pageIndex: number }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const result = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		trash: true,
		page: pageIndex,
		limit: PAGE_LIMIT,
		depth: 0,
		sort: columnsSort.map(([columnKey, ascending]) => `${!ascending ? "-" : ""}${columnKey}`),
		where: { and: [
			...(!includeDeleted ? [
				{ deletedAt: { exists: false } }
			] : []),
			...(keyword.length > 0 ? [{ or: [
				{ id: { like: keyword } },
				{ "creditApplicationAssignment.creditApplication.name": { like: keyword } },
				{ "creditApplicationAssignment.creditApplication.email": { like: keyword } },
				{ "creditApplicationAssignment.officer.name": { like: keyword } },
				{ "creditApplicationAssignment.officer.email": { like: keyword } },
				{ "creditApplicationAssignment.survey.title": { like: keyword } },
				{ "creditApplicationAssignment.satisfactionSurvey.title": { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, docs: result.docs });
	return { ...result, relations };
}

export async function upsertAction(formState: FormState) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	if(formState.creditApplicationAssignment == null || formState.creditApplicationAssignment.trim().length == 0)
		throw new Error("Credit application assignment is required.");
	const creditApplicationAssignment = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "credit-application-assignments",
		id: formState.creditApplicationAssignment,
		depth: 0,
		select: {
			_status: true,
			deletedAt: true
		}
	});
	if(creditApplicationAssignment._status != "published" || creditApplicationAssignment.deletedAt != null)
		throw new Error("Selected credit application assignment must be an active published credit application assignment.");
	const creditApplicationAssignmentVersion = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "credit-application-assignments",
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: formState.creditApplicationAssignment } },
			{ "version._status": { equals: "published" } }
		] },
		select: {}
	})).docs[0];
	if(creditApplicationAssignmentVersion == null)
		throw new Error("Selected credit application assignment has no published version.");

	if(formState.id == null) {
		const created = await payload.create({
			user: user,
			collection: "officer-tasks",
			overrideAccess: true,
			data: {
				_status: "published",
				creditApplicationAssignment: formState.creditApplicationAssignment,
				creditApplicationAssignmentVersion: creditApplicationAssignmentVersion.id,
				next: formState.next ?? null,
				settledAt: null,
				settlementStatus: null,
				settlementComment: null,
				evaluatedAt: null,
				evaluatedBy: null,
				evaluationApproved: null,
				evaluationComment: null
			}
		});
		return { id: created.id };
	}
	await payload.update({
		user: user,
		collection: "officer-tasks",
		id: formState.id,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			creditApplicationAssignment: formState.creditApplicationAssignment,
			creditApplicationAssignmentVersion: creditApplicationAssignmentVersion.id,
			next: formState.next ?? null
		}
	});
	return { id: formState.id };
}

export async function cancelAction(
	{ id }:
	{ id: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(officerTask.settledAt != null)
		throw new Error("Officer task is already settled.");
	if(officerTask.evaluatedAt != null)
		throw new Error("Cannot cancel an evaluated officer task.");
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		trash: true,
		data: {
			settledAt: new Date().toISOString(),
			settlementStatus: "cancelled"
		}
	});
	return { id: id };
}

export async function restoreAction(
	{ id }:
	{ id: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(officerTask.settledAt == null || officerTask.settlementStatus != "cancelled")
		throw new Error("Officer task is not cancelled.");
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		trash: true,
		data: {
			settledAt: null,
			settlementStatus: null
		}
	});
	return { id: id };
}
