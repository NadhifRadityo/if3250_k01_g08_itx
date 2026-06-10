"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { GpsLog } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationOfficerTasks } from "../relation-navigation.actions";
import { RelationUser, RelationOfficerTask } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`officer-tasks:${string}`, RelationOfficerTask>>;

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: GpsLog[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const officerTaskIds = new Set<string>();
	for(const doc of docs) {
		const user = getRelationshipId(doc.user);
		if(user != null)
			userIds.add(user);
		const officerTask = getRelationshipId(doc.officerTask);
		if(officerTask != null)
			officerTaskIds.add(officerTask);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, ids: [...userIds] }));
	Object.assign(relations, await uwsa(resolveRelationOfficerTasks)({ payload, ids: [...officerTaskIds] }));
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
		collection: "gps-logs",
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
				{ "user.name": { like: keyword } },
				{ "user.email": { like: keyword } },
				{ sessionId: { like: keyword } },
				{ "officerTask.creditApplicationAssignment.creditApplication.name": { like: keyword } },
				{ "officerTask.creditApplicationAssignment.creditApplication.email": { like: keyword } },
				{ "officerTask.creditApplicationAssignment.officer.name": { like: keyword } },
				{ "officerTask.creditApplicationAssignment.officer.email": { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, docs: result.docs });
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
		collection: "gps-logs",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			user: true,
			sessionId: true,
			officerTask: true,
			latitude: true,
			longitude: true,
			accuracy: true
		}
	});
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations };
});
