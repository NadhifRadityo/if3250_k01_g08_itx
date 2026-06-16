"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { MessageLog } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationOfficerTasks } from "../relation-navigation.actions";
import { RelationOfficerTask } from "../relation-navigation.shared";
import { getCommonLogMonitoringStats, getCommonLogReportingStats } from "../statistics.actions";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`officer-tasks:${string}`, RelationOfficerTask>>;

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: MessageLog[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const officerTaskIds = new Set<string>();
	for(const doc of docs) {
		const officerTask = getRelationshipId(doc.officerTask);
		if(officerTask != null)
			officerTaskIds.add(officerTask);
	}
	const relations = {} as RelationValues;
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
		collection: "message-logs",
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
				{ content: { like: keyword } },
				{ email: { like: keyword } },
				{ whatsappNumber: { like: keyword } },
				{ smsNumber: { like: keyword } },
				{ emailDeliveryStatus: { equals: keyword } },
				{ whatsappDeliveryStatus: { equals: keyword } },
				{ smsDeliveryStatus: { equals: keyword } }
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

export const getMonitoringStatisticsAction = wsa(async (
	{ filters, keys }: { filters: MenuFilterState[], keys: string[] }
) => await uwsa(getCommonLogMonitoringStats)({ collectionSlug: "message-logs", filters, keys }));
export const getReportingStatisticsAction = wsa(async (
	{ filters, keys }: { filters: MenuFilterState[], keys: string[] }
) => await uwsa(getCommonLogReportingStats)({ collectionSlug: "message-logs", filters, keys }));

export const getDetailsAction = wsa(async (id: string) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "message-logs",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			officerTask: true,
			content: true,
			email: true,
			whatsappNumber: true,
			smsNumber: true,
			emailDeliveryStatus: true,
			whatsappDeliveryStatus: true,
			smsDeliveryStatus: true
		}
	});
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations };
});
