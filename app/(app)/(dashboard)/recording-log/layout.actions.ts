"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { RecordingLog } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationOfficerTasks } from "../relation-navigation.actions";
import { RelationOfficerTask } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`officer-tasks:${string}`, RelationOfficerTask>>;

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: RecordingLog[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const officerTaskIds = new Set<string>();
	for(const doc of docs) {
		const officerTask = getRelationshipId(doc.officerTask);
		if(officerTask != null)
			officerTaskIds.add(officerTask);
	}
	const relations = {} as RelationValues;
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
		collection: "recording-logs",
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
				{ "officerTask.creditApplicationAssignment.creditApplication.name": { like: keyword } },
				{ "officerTask.creditApplicationAssignment.creditApplication.email": { like: keyword } },
				{ "officerTask.creditApplicationAssignment.officer.name": { like: keyword } },
				{ "officerTask.creditApplicationAssignment.officer.email": { like: keyword } },
				{ phoneNumber: { like: keyword } },
				{ audioUrl: { like: keyword } },
				{ transcriptionUrl: { like: keyword } }
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
		collection: "recording-logs",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			officerTask: true,
			phoneNumber: true,
			audioUrl: true,
			transcriptionUrl: true
		}
	});
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations };
}
