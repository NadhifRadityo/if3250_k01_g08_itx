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
		const deletedBy = getRelationshipId(doc.deletedBy);
		if(deletedBy != null)
			userIds.add(deletedBy);
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

async function queryAction(
	{ mode, keyword, filters, columnsSort, pageIndex }:
	{ mode: "monitoring" | "reporting", keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], pageIndex: number }
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
			...(mode == "monitoring" ? [
				{ createdAt: { greater_than_equal: new Date(new Date().setHours(0, 0, 0, 0)).toISOString() } },
				{ createdAt: { less_than_equal: new Date(new Date().setHours(23, 59, 59, 999)).toISOString() } }
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

export async function queryReportingAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "reporting" });
}
export async function queryMonitoringAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "monitoring" });
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
			deletedAt: true,
			deletedBy: true,
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
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations };
}
