"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { GpsLog } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationOfficerTasks } from "../relation-navigation.actions";
import { RelationUser, RelationOfficerTask } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;
const MAP_USER_LIMIT = 200;
const FETCH_LOG_LIMIT = 5000;

export type OfficerTrackingPoint = {
	id: string;
	time: string;
	latitude: number;
	longitude: number;
	accuracy: number;
	sessionId: string;
	officerTask: string | null;
};
export type OfficerTrackingRow = {
	id: string;
	user: string;
	firstSeen: string;
	lastSeen: string;
	pointCount: number;
	sessionId: string;
	officerTask: string | null;
	latitude: number;
	longitude: number;
	accuracy: number;
};
export type OfficerTrackingMapUser = {
	id: string;
	user: string;
	points: OfficerTrackingPoint[];
};
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`officer-tasks:${string}`, RelationOfficerTask>>;

async function resolveRelations(
	{ payload, userIds, officerTaskIds }:
	{ payload?: Payload, userIds: string[], officerTaskIds: string[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: userIds }));
	Object.assign(relations, await resolveRelationOfficerTasks({ payload, ids: officerTaskIds }));
	return relations;
}

function buildPeriodWhere(periodStart: string, periodEnd: string | null) {
	const conditions: Record<string, any>[] = [
		{ createdAt: { greater_than_equal: periodStart } }
	];
	if(periodEnd != null)
		conditions.push({ createdAt: { less_than_equal: periodEnd } });
	return conditions;
}

function compareSortValues(a: any, b: any, ascending: boolean): number {
	if(a == null && b == null) return 0;
	if(a == null) return ascending ? -1 : 1;
	if(b == null) return ascending ? 1 : -1;
	if(typeof a == "number" && typeof b == "number")
		return ascending ? a - b : b - a;
	const aString = `${a}`;
	const bString = `${b}`;
	if(aString < bString) return ascending ? -1 : 1;
	if(aString > bString) return ascending ? 1 : -1;
	return 0;
}

async function queryAction(
	{ mode, periodStart, periodEnd, keyword, filters, columnsSort, pageIndex }:
	{ mode: "monitoring" | "reporting", periodStart: string, periodEnd: string | null, keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], pageIndex: number }
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
		pagination: false,
		limit: FETCH_LOG_LIMIT,
		sort: "createdAt",
		where: { and: [
			...buildPeriodWhere(periodStart, periodEnd),
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

	const userBuckets = new Map<string, GpsLog[]>();
	for(const doc of result.docs) {
		const userId = getRelationshipId(doc.user);
		if(userId == null) continue;
		let bucket = userBuckets.get(userId);
		if(bucket == null) {
			bucket = [];
			userBuckets.set(userId, bucket);
		}
		bucket.push(doc);
	}

	const allRows: OfficerTrackingRow[] = [];
	for(const [userId, docs] of userBuckets) {
		docs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		const lastDoc = docs[docs.length - 1];
		allRows.push({
			id: userId,
			user: userId,
			firstSeen: docs[0].createdAt,
			lastSeen: lastDoc.createdAt,
			pointCount: docs.length,
			sessionId: lastDoc.sessionId,
			officerTask: getRelationshipId(lastDoc.officerTask),
			latitude: lastDoc.latitude,
			longitude: lastDoc.longitude,
			accuracy: lastDoc.accuracy
		});
	}

	const sortKeys = columnsSort.length > 0 ? columnsSort : [["lastSeen", false] as [string, boolean]];
	allRows.sort((a, b) => {
		for(const [columnKey, ascending] of sortKeys) {
			const aValue = (a as any)[columnKey];
			const bValue = (b as any)[columnKey];
			const comparison = compareSortValues(aValue, bValue, ascending);
			if(comparison != 0) return comparison;
		}
		return 0;
	});

	const totalDocs = allRows.length;
	const totalPages = Math.max(1, Math.ceil(totalDocs / PAGE_LIMIT));
	const page = Math.min(Math.max(1, pageIndex), totalPages);
	const start = (page - 1) * PAGE_LIMIT;
	const docs = allRows.slice(start, start + PAGE_LIMIT);

	const mapRows = allRows.slice(0, MAP_USER_LIMIT);
	const mapUsers: OfficerTrackingMapUser[] = mapRows.map(row => ({
		id: row.user,
		user: row.user,
		points: (userBuckets.get(row.user) ?? []).map(doc => ({
			id: doc.id,
			time: doc.createdAt,
			latitude: doc.latitude,
			longitude: doc.longitude,
			accuracy: doc.accuracy,
			sessionId: doc.sessionId,
			officerTask: getRelationshipId(doc.officerTask)
		}))
	}));

	const userIdSet = new Set<string>();
	const officerTaskIdSet = new Set<string>();
	for(const row of docs) {
		userIdSet.add(row.user);
		if(row.officerTask != null)
			officerTaskIdSet.add(row.officerTask);
	}
	for(const row of mapRows)
		userIdSet.add(row.user);
	const relations = await resolveRelations({ payload, userIds: [...userIdSet], officerTaskIds: [...officerTaskIdSet] });

	return {
		docs: docs,
		totalDocs: totalDocs,
		totalPages: totalPages,
		page: page,
		hasPrevPage: page > 1,
		hasNextPage: page < totalPages,
		relations: relations,
		mapUsers: mapUsers,
		periodStart: periodStart,
		periodEnd: periodEnd,
		mode: mode
	};
}

function getMonitoringPeriod() {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	return {
		periodStart: start.toISOString(),
		periodEnd: null
	};
}

export async function queryMonitoringAction(
	{ keyword, filters, columnsSort, pageIndex }:
	{ keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], pageIndex: number }
) {
	const { periodStart, periodEnd } = getMonitoringPeriod();
	return await queryAction({ mode: "monitoring", periodStart, periodEnd, keyword, filters, columnsSort, pageIndex });
}
export async function queryReportingAction(
	{ periodStart, periodEnd, keyword, filters, columnsSort, pageIndex }:
	{ periodStart: string, periodEnd: string | null, keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], pageIndex: number }
) {
	return await queryAction({ mode: "reporting", periodStart, periodEnd, keyword, filters, columnsSort, pageIndex });
}

export async function getDetailsAction(
	{ userId, periodStart, periodEnd }:
	{ userId: string, periodStart: string, periodEnd: string | null }
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
		pagination: false,
		limit: FETCH_LOG_LIMIT,
		sort: "-createdAt",
		where: { and: [
			...buildPeriodWhere(periodStart, periodEnd),
			{ user: { equals: userId } }
		] }
	});
	const officerTaskIdSet = new Set<string>();
	for(const doc of result.docs) {
		const officerTaskId = getRelationshipId(doc.officerTask);
		if(officerTaskId != null)
			officerTaskIdSet.add(officerTaskId);
	}
	const relations = await resolveRelations({ payload, userIds: [userId], officerTaskIds: [...officerTaskIdSet] });
	return {
		userId: userId,
		periodStart: periodStart,
		periodEnd: periodEnd,
		docs: result.docs,
		relations: relations
	};
}
