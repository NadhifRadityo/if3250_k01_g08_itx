"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { SatisfactionSurveyResult } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationOfficerTasks, resolveRelationSatisfactionSurveys } from "../relation-navigation.actions";
import { RelationUser, RelationOfficerTask, RelationSatisfactionSurvey } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;

export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`satisfaction-surveys:${string}`, RelationSatisfactionSurvey>> &
	Partial<Record<`officer-tasks:${string}`, RelationOfficerTask>>;

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: SatisfactionSurveyResult[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const satisfactionSurveyIds = new Set<string>();
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
		const satisfactionSurvey = getRelationshipId(doc.satisfactionSurvey);
		if(satisfactionSurvey != null)
			satisfactionSurveyIds.add(satisfactionSurvey);
		const officerTask = getRelationshipId(doc.officerTask);
		if(officerTask != null)
			officerTaskIds.add(officerTask);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: [...userIds] }));
	Object.assign(relations, await resolveRelationSatisfactionSurveys({ payload, ids: [...satisfactionSurveyIds] }));
	Object.assign(relations, await resolveRelationOfficerTasks({ payload, ids: [...officerTaskIds] }));
	return relations;
}

async function attachSurveyTemplates(
	{ payload, docs }:
	{ payload?: Payload, docs: SatisfactionSurveyResult[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const versionIds = new Set<string>();
	for(const doc of docs) {
		if(typeof doc.satisfactionSurveyVersion == "string" && doc.satisfactionSurveyVersion.length > 0)
			versionIds.add(doc.satisfactionSurveyVersion);
	}
	if(versionIds.size == 0) return;
	const versionsResult = await payload.findVersions({
		overrideAccess: true,
		collection: "satisfaction-surveys",
		trash: true,
		pagination: false,
		depth: 0,
		where: { id: { in: [...versionIds] } },
		select: { version: { content: true } }
	});
	const templates = Object.fromEntries(versionsResult.docs.map(v => [v.id, { content: v.version?.content ?? null }]));
	for(const doc of docs) {
		if(typeof doc.satisfactionSurveyVersion != "string" || doc.satisfactionSurveyVersion.length == 0) continue;
		const template = templates[doc.satisfactionSurveyVersion];
		if(template == null) continue;
		const answers = doc.answers;
		if(answers == null || typeof answers != "object" || Array.isArray(answers)) {
			doc.answers = { _surveyTemplate: template, values: answers ?? null } as any;
			continue;
		}
		(doc.answers as any)._surveyTemplate = template;
	}
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
		collection: "satisfaction-survey-results",
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
				{ "satisfactionSurvey.title": { like: keyword } },
				{ "creditApplication.name": { like: keyword } },
				{ "creditApplication.email": { like: keyword } },
				{ "officer.name": { like: keyword } },
				{ "officer.email": { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, docs: result.docs });
	await attachSurveyTemplates({ payload, docs: result.docs });
	return { ...result, relations };
}

export async function queryReportingAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "reporting" });
}
export async function queryMonitoringAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "monitoring" });
}

function csvEscape(value: unknown): string {
	if(value == null) return "";
	const str = typeof value == "string" ? value : typeof value == "object" ? JSON.stringify(value) : String(value);
	if(str.includes(",") || str.includes("\"") || str.includes("\n") || str.includes("\r"))
		return `"${str.replace(/"/g, "\"\"")}"`;
	return str;
}
function getAnswerEntries(answers: SatisfactionSurveyResult["answers"]): [string, unknown][] {
	if(answers == null) return [];
	if(typeof answers != "object") return [["_raw", answers]];
	if(Array.isArray(answers)) return answers.map((v, i) => [`[${i}]`, v]);
	const obj = answers as Record<string, unknown>;
	if("values" in obj && obj.values != null && typeof obj.values == "object" && !Array.isArray(obj.values))
		return Object.entries(obj.values as Record<string, unknown>);
	if("data" in obj && obj.data != null && typeof obj.data == "object" && !Array.isArray(obj.data))
		return Object.entries(obj.data as Record<string, unknown>);
	return Object.entries(obj).filter(([k]) => !k.startsWith("_"));
}
function formatRelation(relations: RelationValues, kind: "users" | "satisfaction-surveys" | "officer-tasks", id: string | null): string {
	if(id == null) return "";
	if(kind == "users") {
		const r = relations[`users:${id}`];
		if(r == null) return id;
		return r.email != "" ? `${r.name} <${r.email}>` : r.name;
	}
	if(kind == "satisfaction-surveys") {
		const r = relations[`satisfaction-surveys:${id}`];
		if(r == null) return id;
		return r.title;
	}
	return id;
}

export async function exportCsvAction(
	{ mode, keyword, filters, columnsSort }:
	{ mode: "monitoring" | "reporting", keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][] }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const result = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "satisfaction-survey-results",
		depth: 0,
		pagination: false,
		sort: columnsSort.map(([columnKey, ascending]) => `${!ascending ? "-" : ""}${columnKey}`),
		where: { and: [
			...(mode == "monitoring" ? [
				{ createdAt: { greater_than_equal: new Date(new Date().setHours(0, 0, 0, 0)).toISOString() } },
				{ createdAt: { less_than_equal: new Date(new Date().setHours(23, 59, 59, 999)).toISOString() } }
			] : []),
			...(keyword.length > 0 ? [{ or: [
				{ id: { like: keyword } },
				{ "satisfactionSurvey.title": { like: keyword } },
				{ "creditApplication.name": { like: keyword } },
				{ "creditApplication.email": { like: keyword } },
				{ "officer.name": { like: keyword } },
				{ "officer.email": { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, docs: result.docs });

	const answerKeys: string[] = [];
	const seenKeys = new Set<string>();
	const docAnswerMaps = result.docs.map(doc => {
		const entries = getAnswerEntries(doc.answers);
		const map: Record<string, unknown> = {};
		for(const [k, v] of entries) {
			map[k] = v;
			if(!seenKeys.has(k)) {
				seenKeys.add(k);
				answerKeys.push(k);
			}
		}
		return map;
	});
	answerKeys.sort();

	const baseColumns = [
		"id",
		"createdAt",
		"createdBy",
		"updatedAt",
		"updatedBy",
		"deletedAt",
		"deletedBy",
		"satisfactionSurvey",
		"satisfactionSurveyVersion",
		"officerTask"
	];
	const headerRow = [...baseColumns, ...answerKeys.map(k => `answer:${k}`)];
	const lines: string[] = [];
	lines.push(headerRow.map(csvEscape).join(","));
	for(let i = 0; i < result.docs.length; i++) {
		const doc = result.docs[i];
		const answerMap = docAnswerMaps[i];
		const row = [
			doc.id,
			doc.createdAt ?? "",
			formatRelation(relations, "users", getRelationshipId(doc.createdBy)),
			doc.updatedAt ?? "",
			formatRelation(relations, "users", getRelationshipId(doc.updatedBy)),
			doc.deletedAt ?? "",
			formatRelation(relations, "users", getRelationshipId(doc.deletedBy)),
			formatRelation(relations, "satisfaction-surveys", getRelationshipId(doc.satisfactionSurvey)),
			doc.satisfactionSurveyVersion ?? "",
			formatRelation(relations, "officer-tasks", getRelationshipId(doc.officerTask)),
			...answerKeys.map(k => answerMap[k])
		];
		lines.push(row.map(csvEscape).join(","));
	}
	const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const filename = `satisfaction-survey-results_${mode}_${timestamp}.csv`;
	return { csv, filename, count: result.docs.length };
}

export async function exportReportingCsvAction(p: Omit<Parameters<typeof exportCsvAction>[0], "mode">) {
	return await exportCsvAction({ ...p, mode: "reporting" });
}
export async function exportMonitoringCsvAction(p: Omit<Parameters<typeof exportCsvAction>[0], "mode">) {
	return await exportCsvAction({ ...p, mode: "monitoring" });
}

export async function getDetailsAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "satisfaction-survey-results",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			createdBy: true,
			updatedAt: true,
			updatedBy: true,
			deletedAt: true,
			deletedBy: true,
			satisfactionSurvey: true,
			satisfactionSurveyVersion: true,
			officerTask: true,
			answers: true
		}
	});
	const relations = await resolveRelations({ payload, docs: [result] });
	await attachSurveyTemplates({ payload, docs: [result] });
	return { row: result, relations };
}
