"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { SurveyResult } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationSurveys, resolveRelationCreditApplications } from "../relation-navigation.actions";
import { RelationUser, RelationSurvey, RelationCreditApplication } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;

export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`credit-applications:${string}`, RelationCreditApplication>> &
	Partial<Record<`surveys:${string}`, RelationSurvey>>;

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: SurveyResult[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const creditApplicationIds = new Set<string>();
	const surveyIds = new Set<string>();
	for(const doc of docs) {
		const officer = getRelationshipId(doc.officer);
		if(officer != null)
			userIds.add(officer);
		const creditApplication = getRelationshipId(doc.creditApplication);
		if(creditApplication != null)
			creditApplicationIds.add(creditApplication);
		const survey = getRelationshipId(doc.survey);
		if(survey != null)
			surveyIds.add(survey);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: [...userIds] }));
	Object.assign(relations, await resolveRelationCreditApplications({ payload, ids: [...creditApplicationIds] }));
	Object.assign(relations, await resolveRelationSurveys({ payload, ids: [...surveyIds] }));
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
		collection: "survey-results",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			survey: true,
			creditApplication: true,
			officer: true,
			answers: true
		}
	});
	const relations = await resolveRelations({ payload, docs: [result as SurveyResult] });
	return { row: result, relations };
}
