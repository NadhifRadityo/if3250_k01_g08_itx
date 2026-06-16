"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { OfficerTask } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationOfficerTasks, resolveRelationCreditApplicationAssignments } from "../relation-navigation.actions";
import { RelationUser, RelationOfficerTask, RelationCreditApplicationAssignment } from "../relation-navigation.shared";
import {
	computeStatsCountBySql,
	computeStatsBucketsBySql,
	computeStatsBucketsByJoinedColumnSql,
	getCommonLogMonitoringStats,
	getCommonLogReportingStats
} from "../statistics.actions";

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
	Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, ids: [...userIds] }));
	Object.assign(relations, await uwsa(resolveRelationCreditApplicationAssignments)({ payload, ids: [...creditApplicationAssignmentIds] }));
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

export const queryReportingAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "reporting" });
});
export const queryMonitoringAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "monitoring" });
});

export const getMonitoringStatisticsAction = wsa(async (
	{ filters, keys }:
	{ filters: MenuFilterState[], keys: string[] }
) => {
	const [common, extras] = await Promise.all([
		uwsa(getCommonLogMonitoringStats)({ collectionSlug: "officer-tasks", filters, keys }),
		computeStatisticMonitoringExtras({ filters, keys })
	]);
	return { ...common, ...extras };
});
export const getReportingStatisticsAction = wsa(async (
	{ filters, keys }:
	{ filters: MenuFilterState[], keys: string[] }
) => {
	const [common, extras] = await Promise.all([
		uwsa(getCommonLogReportingStats)({ collectionSlug: "officer-tasks", filters, keys }),
		computeStatisticReportingExtras({ filters, keys })
	]);
	return { ...common, ...extras };
});

async function computeStatisticMonitoringExtras(
	{ filters, keys }:
	{ filters: MenuFilterState[], keys: string[] }
) {
	const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
	const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(todayStart.getDate() + 1);
	const settledTodayWhere = { settledAt: { greater_than_equal: todayStart.toISOString(), less_than: tomorrowStart.toISOString() } };
	const evaluatedTodayWhere = { evaluatedAt: { greater_than_equal: todayStart.toISOString(), less_than: tomorrowStart.toISOString() } };
	const [settled, evaluated] = await Promise.all([
		keys.includes("settledToday") ? uwsa(computeStatsCountBySql)({ collectionSlug: "officer-tasks", filters, extraWhere: settledTodayWhere, alwaysExcludeDeleted: false }) : undefined,
		keys.includes("evaluatedToday") ? uwsa(computeStatsCountBySql)({ collectionSlug: "officer-tasks", filters, extraWhere: evaluatedTodayWhere, alwaysExcludeDeleted: false }) : undefined
	]);
	return {
		settledToday: settled == null ? undefined : { value: settled.count },
		evaluatedToday: evaluated == null ? undefined : { value: evaluated.count }
	};
}

// Internal: gathers the officer-task reporting extras (settlement-status / evaluation-status /
// top-officers buckets).
async function computeStatisticReportingExtras(
	{ filters, keys }:
	{ filters: MenuFilterState[], keys: string[] }
) {
	const payload = await getPayload({ config: payloadConfig });
	const [settlementStatus, evaluationStatus, topOfficers] = await Promise.all([
		keys.includes("settlementStatus") ? uwsa(computeStatsBucketsBySql)({
			collectionSlug: "officer-tasks",
			columnExpression: "settlement_status",
			filters: filters,
			alwaysExcludeDeleted: false,
			filterColumnKey: "settlementStatus"
		}) : undefined,
		keys.includes("evaluationStatus") ? uwsa(computeStatsBucketsBySql)({
			collectionSlug: "officer-tasks",
			columnExpression: `CASE
				WHEN evaluation_approved IS TRUE THEN 'Approved'
				WHEN evaluation_approved IS FALSE THEN 'Rejected'
				WHEN evaluated_at IS NULL AND settlement_status = 'finished' THEN 'Pending'
				ELSE 'Other'
			END`,
			filters: filters,
			alwaysExcludeDeleted: false
		}) : undefined,
		keys.includes("topOfficers") ? uwsa(computeStatsBucketsByJoinedColumnSql)({
			collectionSlug: "officer-tasks",
			filters: filters,
			joinedTableName: "credit_application_assignments",
			joinLocalColumn: "credit_application_assignment_id",
			joinForeignColumn: "id",
			columnExpression: "joined.officer_id",
			limit: 10,
			alwaysExcludeDeleted: false,
			filterColumnKey: "creditApplicationAssignment.officer"
		}) : undefined
	]);
	const relations: RelationValues = {};
	if(topOfficers != null)
		Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, ids: topOfficers.items.map(i => i.key) }));
	return {
		settlementStatus: settlementStatus,
		evaluationStatus: evaluationStatus,
		topOfficers: topOfficers,
		relations: relations
	};
}

export const getDetailsAction = wsa(async (id: string) => {
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
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations };
});
