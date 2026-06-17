"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import { getClientIpFromHeaders } from "@/utils/clientIp";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { User, LoginLog } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers } from "../relation-navigation.actions";
import { RelationUser } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>>;

async function resolveRelations(
	{ payload, user, docs }:
	{ payload?: Payload, user: User, docs: LoginLog[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	for(const doc of docs) {
		const userId = getRelationshipId(doc.user);
		const forcedLogoutBy = getRelationshipId(doc.forcedLogoutBy);
		if(userId != null)
			userIds.add(userId);
		if(forcedLogoutBy != null)
			userIds.add(forcedLogoutBy);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, user, ids: [...userIds] }));
	return relations;
}

async function annotateRows(
	{ payload, user, docs }:
	{ payload: Payload, user: User, docs: LoginLog[] }
) {
	const users = (await payload.find({
		user: user,
		overrideAccess: false,
		collection: "users",
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		where: { id: { in: [...new Set(docs.map(d => getRelationshipId(d.user)).filter(u => u != null))] } },
		select: { sessions: true }
	})).docs;
	return docs.map(doc => ({
		...doc,
		...(doc.event == "login" && getRelationshipId(doc.user) != null && doc.sessionId != null ?
			{ _sessionActive: users.find(u => u.id == getRelationshipId(doc.user))?.sessions.some(s => s.id == doc.sessionId) ?? false } : {})
	}));
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
		collection: "login-logs",
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
				{ ipAddress: { like: keyword } },
				{ event: { equals: keyword } },
				{ outcome: { equals: keyword } },
				{ sessionId: { equals: keyword } },
				{ "forcedLogoutBy.name": { like: keyword } },
				{ "forcedLogoutBy.email": { like: keyword } },
				{ description: { equals: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const annotatedDocs = await annotateRows({ payload, user, docs: result.docs });
	const relations = await resolveRelations({ payload, user, docs: result.docs });
	return { ...result, docs: annotatedDocs, relations };
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
		collection: "login-logs",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			user: true,
			ipAddress: true,
			event: true,
			outcome: true,
			sessionId: true,
			forcedLogoutBy: true,
			description: true
		}
	});
	const annotatedDocs = await annotateRows({ payload, user, docs: [result] });
	const relations = await resolveRelations({ payload, user, docs: [result] });
	return { row: annotatedDocs[0], relations };
});

export const forceLogoutAction = wsa(async (
	{ userId, sessionId }:
	{ userId: string, sessionId: string }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const userSessions = (await payload.find({
		collection: "users",
		overrideAccess: true,
		limit: 1,
		where: { id: { equals: userId } }
	})).docs[0]?.sessions;
	if(userSessions.every(s => s.id != sessionId))
		return;
	const ipAddress = getClientIpFromHeaders(headers);
	await payload.create({
		overrideAccess: true,
		collection: "login-logs",
		depth: 0,
		data: {
			createdAt: new Date().toISOString(),
			ipAddress: ipAddress,
			user: userId,
			event: "logout",
			outcome: "success",
			sessionId: sessionId,
			forcedLogoutBy: user.id
		}
	});
	await payload.db.updateOne({
		id: userId,
		collection: "users",
		data: { ...user, sessions: userSessions.filter(s => s.id != sessionId) },
		returning: false
	});
});
