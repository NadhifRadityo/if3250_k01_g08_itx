"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import { getRelationshipId } from "@/utils/payload";
import { OtpLog } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationCreditApplications } from "../relation-navigation.actions";
import { RelationCreditApplication } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`credit-applications:${string}`, RelationCreditApplication>>;

const buildFilterWhere = (filters: MenuFilterState[]) => ({ or:
	filters.map(filter => ([{ [filter.columnKey]: { [filter.operator]: filter.value } }, filter.combinator ?? "and"] as const))
		.reduce((termGroups, [unit, combinator], i) => i == 0 || combinator == "and" ?
			[...termGroups.slice(0, -1), [...termGroups.at(-1)!, unit]] :
			[...termGroups, [unit]], [[]] as Where[][])
		.filter(termGroups => termGroups.length > 0)
		.map(termGroups => ({ and: termGroups }))
});

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: OtpLog[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const creditApplicationIds = new Set<string>();
	for(const doc of docs) {
		const creditApplication = getRelationshipId(doc.creditApplication);
		if(creditApplication != null)
			creditApplicationIds.add(creditApplication);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationCreditApplications({ payload, ids: [...creditApplicationIds] }));
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
		collection: "otp-logs",
		depth: 0,
		page: pageIndex,
		limit: PAGE_LIMIT,
		sort: columnsSort.map(([columnKey, ascending]) => `${!ascending ? "-" : ""}${columnKey}`),
		where: { and: [
			...(mode == "monitoring" || mode == "reporting" ? [] : []),
			...(keyword.length > 0 ? [{ or: [
				{ id: { like: keyword } },
				{ "creditApplication.name": { like: keyword } },
				{ "creditApplication.email": { like: keyword } },
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
		collection: "otp-logs",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			creditApplication: true,
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
}
