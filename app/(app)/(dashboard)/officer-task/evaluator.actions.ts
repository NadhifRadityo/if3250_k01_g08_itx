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
import { ActiveOfficerTaskKvData, chainAndCreateNextOfficerTask } from "./layout.shared";

const PAGE_LIMIT = 20;

export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`credit-application-assignments:${string}`, RelationCreditApplicationAssignment>> &
	Partial<Record<`officer-tasks:${string}`, RelationOfficerTask>>;

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

async function annotateRows(
	{ payload, docs }:
	{ payload: Payload, docs: OfficerTask[] }
) {
	const previousDocs = (await payload.find({
		overrideAccess: true,
		collection: "officer-tasks",
		trash: true,
		pagination: false,
		depth: 0,
		where: { next: { in: docs.map(doc => doc.id) } },
		select: { next: true }
	})).docs.map(d => ({ ...d, next: getRelationshipId(d.next) }));
	const creditApplicationAssignments = (await payload.find({
		overrideAccess: true,
		collection: "credit-application-assignments",
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		where: { id: { in: docs.map(doc => getRelationshipId(doc.creditApplicationAssignment)).filter(id => id != null) } },
		select: { dueDate: true }
	})).docs;
	return docs.map(doc => ({
		...doc,
		previous: previousDocs.find(d => d.next == doc.id)?.id,
		creditApplicationAssignmentDueDate: creditApplicationAssignments.find(c => c.id == getRelationshipId(doc.creditApplicationAssignment))?.dueDate
	}));
}

export async function queryAction(
	{ keyword, filters, columnsSort, pageIndex }:
	{ keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], pageIndex: number }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const result = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		depth: 0,
		page: pageIndex,
		limit: PAGE_LIMIT,
		sort: columnsSort.map(([columnKey, ascending]) => `${!ascending ? "-" : ""}${columnKey}`),
		where: { and: [
			{ next: { exists: false } },
			{ "creditApplicationAssignment.assignedDate": { less_than_equal: new Date().toISOString() } },
			{ "creditApplicationAssignment.deletedAt": { exists: false } },
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
	const annotatedDocs = await annotateRows({ payload, docs: result.docs });
	const relations = await resolveRelations({ payload, docs: result.docs });
	const activeIds = (await payload.find({
		overrideAccess: true,
		collection: "payload-kv",
		pagination: false,
		where: { key: { contains: "officer-task:" } },
		select: { data: true }
	})).docs.map(doc => (doc.data as ActiveOfficerTaskKvData).id);
	return { ...result, docs: annotatedDocs, relations, activeIds };
}

export async function getDetailsAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			createdBy: true,
			updatedAt: true,
			updatedBy: true,
			creditApplicationAssignment: true,
			creditApplicationAssignmentVersion: true,
			next: true,
			settledAt: true,
			settlementStatus: true,
			settlementComment: true,
			evaluatedAt: true,
			evaluatedBy: true,
			evaluationApproved: true,
			evaluationComment: true
		}
	});
	const annotatedDocs = await annotateRows({ payload, docs: [result] });
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: annotatedDocs[0], relations };
}

export async function evaluateAction(
	{ id, decision, evaluationComment }:
	{ id: string, decision: "approve" | "reject", evaluationComment: any }
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
	if(getRelationshipId(officerTask.next) != null)
		throw new Error("Cannot evaluate an officer task that is not the latest in the chain.");
	if(officerTask.evaluationApproved == false)
		throw new Error("Cannot change evaluation decision after it has been rejected.");
	if(decision == "approve" && officerTask.evaluationApproved == true)
		throw new Error("Officer task is already approved.");
	if(officerTask.settlementStatus != "finished")
		throw new Error("Officer task must be in 'finished' settlement status before it can be evaluated.");
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		trash: true,
		data: {
			evaluatedAt: new Date().toISOString(),
			evaluatedBy: user.id,
			evaluationApproved: decision == "approve",
			evaluationComment: evaluationComment
		}
	});
	if(decision == "reject")
		await chainAndCreateNextOfficerTask({ payload, previousOfficerTaskId: id, userId: user.id });
	await payload.delete({
		overrideAccess: true,
		collection: "payload-kv",
		where: { and: [
			{ key: { contains: "officer-task:" } },
			{ "data.id": { equals: id } }
		] }
	});
	return { id: id };
}
