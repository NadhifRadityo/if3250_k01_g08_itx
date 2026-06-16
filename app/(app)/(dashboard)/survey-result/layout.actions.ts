"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { User, SurveyResult } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationSurveys, resolveRelationOfficerTasks } from "../relation-navigation.actions";
import { RelationUser, RelationSurvey, RelationOfficerTask } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;

export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`surveys:${string}`, RelationSurvey>> &
	Partial<Record<`officer-tasks:${string}`, RelationOfficerTask>>;

async function resolveRelations(
	{ payload, user, docs }:
	{ payload?: Payload, user: User, docs: SurveyResult[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const surveyIds = new Set<string>();
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
		const survey = getRelationshipId(doc.survey);
		if(survey != null)
			surveyIds.add(survey);
		const officerTask = getRelationshipId(doc.officerTask);
		if(officerTask != null)
			officerTaskIds.add(officerTask);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, user, ids: [...userIds] }));
	Object.assign(relations, await uwsa(resolveRelationSurveys)({ payload, user, ids: [...surveyIds] }));
	Object.assign(relations, await uwsa(resolveRelationOfficerTasks)({ payload, user, ids: [...officerTaskIds] }));
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
		collection: "survey-results",
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
				{ "survey.title": { like: keyword } },
				{ "creditApplication.name": { like: keyword } },
				{ "creditApplication.email": { like: keyword } },
				{ "officer.name": { like: keyword } },
				{ "officer.email": { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, user, docs: result.docs });
	return { ...result, relations };
}

export const queryReportingAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "reporting" });
});
export const queryMonitoringAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "monitoring" });
});

export const getDetailsAction = wsa(async (id: string) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "survey-results",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			createdBy: true,
			updatedAt: true,
			updatedBy: true,
			deletedAt: true,
			deletedBy: true,
			survey: true,
			surveyVersion: true,
			officerTask: true,
			answers: true
		}
	});
	const relations = await resolveRelations({ payload, user, docs: [result] });
	return { row: result, relations };
});
