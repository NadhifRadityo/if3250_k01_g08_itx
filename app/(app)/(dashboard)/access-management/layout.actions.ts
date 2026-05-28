"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { sql, PostgresAdapter } from "@payloadcms/db-postgres";
import { SQL, inArray } from "@payloadcms/db-postgres/drizzle";
import { buildQuery } from "@payloadcms/drizzle";
import { Payload, getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import { negateWhere, buildFilterWhere, lexicalPlainText, getRelationshipId, leixcalPreprendPlainText } from "@/utils/payload";
import type { User, Access } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers } from "../relation-navigation.actions";
import { RelationUser } from "../relation-navigation.shared";
import { FormState } from "./layout.components";
import { collectionMaskFields } from "./layout.shared";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>>;

type CompiledAccess = {
	id: string;
	createdAt: string;
	name: string;
	priority: number;
	operation: Access["operation"];
	subjectUserFilters?: any;
	subjectTeamFilters?: any;
	subjectRoleFilters?: any;
	compiledUsers: string[];
	compiledTeams: string[];
	compiledRoles: string[];
	collection: Access["collection"];
	filters: any;
	masks: any;
};
export async function compileAccesses(
	{ payload, accessesCollection }:
	{ payload?: Payload, accessesCollection?: keyof (typeof collectionMaskFields) }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const accesses = await payload.find({
		overrideAccess: true,
		collection: "accesses",
		pagination: false,
		depth: 0,
		where: { and: [
			{ _status: { equals: "published" } },
			{ reviewedAt: { exists: true } },
			{ deletedAt: { exists: false } },
			{ enabled: { equals: true } },
			...(accessesCollection != null ? [
				{ collection: { equals: accessesCollection } }
			] : [])
		] },
		select: {
			createdAt: true,
			name: true,
			priority: true,
			operation: true,
			subjectUserFilters: true,
			subjectTeamFilters: true,
			subjectRoleFilters: true,
			collection: true,
			filters: true,
			masks: true
		}
	});
	const allCompiledUsers = new Map<string, string[]>();
	const allCompiledTeams = new Map<string, string[]>();
	const allCompiledRoles = new Map<string, string[]>();
	const getCompiledUsers = async (filtersKey: string) => {
		if(filtersKey == null || filtersKey == "null") return [];
		let result = allCompiledUsers.get(filtersKey);
		if(result != null) return result;
		result = (await payload.find({
			overrideAccess: true,
			collection: "users",
			pagination: false,
			depth: 0,
			where: { and: [
				{ deletedAt: { exists: false } },
				buildFilterWhere(JSON.parse(filtersKey))
			] },
			select: {}
		})).docs.map(u => u.id);
		allCompiledUsers.set(filtersKey, result);
		return result;
	};
	const getCompiledTeams = async (filtersKey: string) => {
		if(filtersKey == null || filtersKey == "null") return [];
		let result = allCompiledTeams.get(filtersKey);
		if(result != null) return result;
		result = (await payload.find({
			overrideAccess: true,
			collection: "teams",
			pagination: false,
			depth: 0,
			where: { and: [
				{ _status: { equals: "published" } },
				{ reviewedAt: { exists: true } },
				{ deletedAt: { exists: false } },
				buildFilterWhere(JSON.parse(filtersKey))
			] },
			select: {}
		})).docs.map(u => u.id);
		allCompiledTeams.set(filtersKey, result);
		return result;
	};
	const getCompiledRoles = async (filtersKey: string) => {
		if(filtersKey == null || filtersKey == "null") return [];
		let result = allCompiledRoles.get(filtersKey);
		if(result != null) return result;
		result = (await payload.find({
			overrideAccess: true,
			collection: "roles",
			pagination: false,
			depth: 0,
			where: { and: [
				{ _status: { equals: "published" } },
				{ reviewedAt: { exists: true } },
				{ deletedAt: { exists: false } },
				buildFilterWhere(JSON.parse(filtersKey))
			] },
			select: {}
		})).docs.map(u => u.id);
		allCompiledRoles.set(filtersKey, result);
		return result;
	};
	const compiledAccesses = [] as CompiledAccess[];
	for(const access of accesses.docs) {
		const compiledUsers = await getCompiledUsers(JSON.stringify(access.subjectUserFilters));
		const compiledTeams = await getCompiledTeams(JSON.stringify(access.subjectTeamFilters));
		const compiledRoles = await getCompiledRoles(JSON.stringify(access.subjectRoleFilters));
		compiledAccesses.push({
			id: access.id,
			createdAt: access.createdAt,
			name: access.name,
			priority: access.priority,
			operation: access.operation,
			subjectUserFilters: access.subjectUserFilters,
			subjectTeamFilters: access.subjectTeamFilters,
			subjectRoleFilters: access.subjectRoleFilters,
			compiledUsers: compiledUsers,
			compiledTeams: compiledTeams,
			compiledRoles: compiledRoles,
			collection: access.collection,
			filters: access.filters,
			masks: access.masks
		});
	}
	const groupedCompiledAccesses = compiledAccesses.reduce((p, c) => ({ ...p, [c.collection]:
		[...(p[c.collection] ?? []), c] }), {} as Record<string, CompiledAccess[]>);
	for(const [collection, compiledAccesses] of Object.entries(groupedCompiledAccesses))
		await payload.kv.set(`accesses:${collection}`, JSON.stringify(compiledAccesses));
}
export async function executeAccesses(
	{ payload, user, accessesCollection }:
	{ payload?: Payload, user: User, accessesCollection: keyof (typeof collectionMaskFields) }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userTeams = (await payload.find({
		overrideAccess: true,
		collection: "teams",
		pagination: false,
		depth: 0,
		where: { and: [
			{ _status: { equals: "published" } },
			{ reviewedAt: { exists: true } },
			{ deletedAt: { exists: false } },
			{ or: [
				{ supervisor: { equals: user.id } },
				{ members: { contains: user.id } }
			] }
		] },
		select: {}
	})).docs.map(u => u.id);
	const compiledAccesses = (await payload.kv.get<CompiledAccess[]>(`accesses:${accessesCollection}`))!;
	// Sorted from least important to the most important. The later values will override the earlier ones.
	const appliedAccesses = compiledAccesses.map(a => a.compiledUsers.includes(user.id) ? [0, a] as const : userTeams.some(t => a.compiledTeams.includes(t)) ? [1, a] as const : a.compiledRoles.includes(getRelationshipId(user.role)!) ? [2, a] as const : [-1, a] as const)
		.filter(([t]) => t != -1).sort(([at, aa], [bt, ba]) => aa.priority != ba.priority ? aa.priority - ba.priority : bt != at ? bt - at : Date.parse(aa.createdAt) - Date.parse(ba.createdAt)).map(([_, a]) => a);
	let currentFilter = null as Where | null;
	for(const appliedAccess of appliedAccesses) {
		if(currentFilter == null) {
			currentFilter = buildFilterWhere(appliedAccess.filters);
			continue;
		}
		if(appliedAccess.operation == "union") {
			currentFilter = { or: [
				currentFilter,
				buildFilterWhere(appliedAccess.filters)
			] };
			continue;
		}
		if(appliedAccess.operation == "difference") {
			currentFilter = { and: [
				currentFilter,
				negateWhere(buildFilterWhere(appliedAccess.filters))
			] };
			continue;
		}
		if(appliedAccess.operation == "intersect") {
			currentFilter = { and: [
				currentFilter,
				buildFilterWhere(appliedAccess.filters)
			] };
			continue;
		}
		if(appliedAccess.operation == "exclusion") {
			currentFilter = { or: [
				{ and: [currentFilter, negateWhere(buildFilterWhere(appliedAccess.filters))] },
				{ and: [negateWhere(currentFilter), buildFilterWhere(appliedAccess.filters)] }
			] };
			continue;
		}
	}
	if(currentFilter == null)
		currentFilter = { id: { exists: false } };
	const defaultMask = Object.fromEntries(Object.keys(collectionMaskFields[accessesCollection]).map(f => [f, "hide"] as [string, string]));
	const getMasksFor = async (ids: string[]) => {
		const adapter = payload.db as PostgresAdapter;
		const collectionConfig = payload.config.collections.find(c => c.slug == accessesCollection)!;
		const toSnakeCase = (string: string) => string.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/[\W_]+/g, " ").trim().toLowerCase().replace(/\s+/g, "_");
		const tableName = adapter.tableNameMap.get(toSnakeCase(collectionConfig.slug))!;
		const table = adapter.tables[tableName];
		// https://github.com/payloadcms/payload/blob/0dfd31ef89f961a7ef2940c5f3f49c0d8538b1d0/packages/drizzle/src/find/findMany.ts
		const queryOptions = buildQuery({ adapter: adapter, fields: collectionConfig.flattenedFields, tableName: tableName, where: { or: appliedAccesses.map(a => buildFilterWhere(a.filters)) } });
		if(queryOptions.where == null) return { ...defaultMask };
		// getTransaction with shouldReadFromPrimary logic
		// https://github.com/payloadcms/payload/blob/0dfd31ef89f961a7ef2940c5f3f49c0d8538b1d0/packages/drizzle/src/utilities/getTransaction.ts, https://github.com/payloadcms/payload/blob/0dfd31ef89f961a7ef2940c5f3f49c0d8538b1d0/packages/drizzle/src/utilities/readAfterWrite.ts
		const db = adapter.primaryDrizzle != null && adapter.lastWriteTimestamp != null && (Date.now() - adapter.lastWriteTimestamp < adapter.readReplicasAfterWriteInterval) ? adapter.primaryDrizzle : adapter.drizzle;
		// queryOptions.where sql is in form of [StringChunk("("), SQL(chunks=[SQLChunk, StringChunk(" or "), SQLChunk, ...]), StringChunk(")")] if there are more than one `OR` conditions.
		const selectFilterMatches = queryOptions.where.queryChunks.length >= 3 ?
			Object.fromEntries((queryOptions.where.queryChunks[1] as SQL).queryChunks.filter((_, i) => i % 2 == 0).map((condition, i) => [`filters_${i}`, sql`CASE WHEN ${condition} THEN 1 ELSE 0 END`])) :
			{ "filters_0": sql`CASE WHEN ${(queryOptions.where.queryChunks[0] as SQL).queryChunks[0]} THEN 1 ELSE 0 END` };
		let query = db.selectDistinct({ id: table.id, ...selectFilterMatches } as ({ id: typeof table.id } & Record<`filters_${number}`, ReturnType<typeof sql<0 | 1>>>)).from(table).where(inArray(table.id, ids)).$dynamic();
		for(const join of queryOptions.joins)
			query = query[join.type ?? "leftJoin"](join.table as any, join.condition) as any;
		const filterMatchesResults = await query;
		return ids.map(id => {
			const filterMatches = filterMatchesResults.find(r => r.id == id) ?? (Object.fromEntries(appliedAccesses.map((_, i) => [`filters_${i}`, 0])) as Record<`filters_${number}`, 0 | 1>);
			let isIncluded = false;
			let currentMask = { ...defaultMask };
			for(let i = 0; i < appliedAccesses.length; i++) {
				const appliedAccess = appliedAccesses[i];
				const filterMatch = filterMatches[`filters_${i}`];
				if(filterMatch != 1) continue;
				if(appliedAccess.operation == "union") {
					isIncluded = true;
					currentMask = { ...currentMask, ...appliedAccess.masks };
					continue;
				}
				if(appliedAccess.operation == "difference") {
					if(!isIncluded) continue;
					isIncluded = false;
					currentMask = { ...defaultMask };
					continue;
				}
				if(appliedAccess.operation == "intersect") {
					if(!isIncluded) continue;
					currentMask = { ...currentMask, ...appliedAccess.masks };
					continue;
				}
				if(appliedAccess.operation == "exclusion") {
					if(isIncluded) {
						isIncluded = false;
						currentMask = { ...defaultMask };
						continue;
					}
					isIncluded = true;
					currentMask = { ...defaultMask, ...appliedAccess.masks };
					continue;
				}
			}
			return currentMask;
		});
	};
	return {
		filter: currentFilter,
		getMasksFor
	};
}

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: Access[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
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
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		if(reviewedBy != null)
			userIds.add(reviewedBy);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: [...userIds] }));
	return relations;
}

async function queryAction(
	{ mode, keyword, filters, columnsSort, includeDeleted, pageIndex }:
	{ mode: "viewer" | "approver" | "editor", keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], includeDeleted: boolean, pageIndex: number }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const result = await payload.find({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		draft: true,
		trash: true,
		page: pageIndex,
		limit: PAGE_LIMIT,
		depth: 0,
		sort: columnsSort.map(([columnKey, ascending]) => `${!ascending ? "-" : ""}${columnKey}`),
		where: { and: [
			...(mode == "approver" ? [
				{ _status: { equals: "draft" } },
				{ reviewedAt: { exists: false } }
			] : []),
			...(!includeDeleted ? [
				{ deletedAt: { exists: false } }
			] : []),
			...(keyword.length > 0 ? [{ or: [
				{ id: { like: keyword } },
				{ name: { like: keyword } },
				{ collection: { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, docs: result.docs });
	return { ...result, relations };
}

export async function queryViewerAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "viewer" });
}
export async function queryEditorAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "editor" });
}
export async function queryApproverAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "approver" });
}

export async function getDetailsAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "accesses",
		draft: true,
		trash: true,
		id: id,
		depth: 0,
		select: {
			_status: true,
			createdAt: true,
			createdBy: true,
			updatedAt: true,
			updatedBy: true,
			deletedAt: true,
			deletedBy: true,
			name: true,
			description: true,
			enabled: true,
			priority: true,
			operation: true,
			subjectUserFilters: true,
			subjectTeamFilters: true,
			subjectRoleFilters: true,
			collection: true,
			filters: true,
			masks: true,
			content: true,
			changeRequestType: true,
			changeRequestComment: true,
			reviewedAt: true,
			reviewedBy: true,
			reviewApproved: true,
			reviewComment: true
		}
	});
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations };
}

export async function getDifferenceAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const requestedDoc = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		trash: true,
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: id } },
				{ "version._status": { equals: "draft" } }
			]
		},
		select: {
			updatedAt: true,
			version: {
				deletedAt: true,
				name: true,
				description: true,
				enabled: true,
				priority: true,
				operation: true,
				subjectUserFilters: true,
				subjectTeamFilters: true,
				subjectRoleFilters: true,
				collection: true,
				filters: true,
				masks: true,
				changeRequestType: true,
				changeRequestComment: true
			}
		}
	})).docs[0];
	const requestedVersion = requestedDoc?.version;
	if(requestedVersion == null)
		throw new Error("Draft access request could not be found.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		trash: true,
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: {
			and: [
				{ parent: { equals: id } },
				{ "version._status": { equals: "published" } },
				{ updatedAt: { less_than: requestedDoc.updatedAt } }
			]
		},
		select: {
			version: {
				deletedAt: true,
				name: true,
				description: true,
				enabled: true,
				priority: true,
				operation: true,
				subjectUserFilters: true,
				subjectTeamFilters: true,
				subjectRoleFilters: true,
				collection: true,
				filters: true,
				masks: true,
				changeRequestType: true,
				changeRequestComment: true
			}
		}
	})).docs[0]?.version;
	const relations = await resolveRelations({ payload, docs: [...(approvedVersion != null ? [approvedVersion] : []), requestedVersion] });
	return {
		approvedVersion: approvedVersion,
		requestedVersion: requestedVersion,
		relations: relations
	};
}

export async function getHistoryAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const versionsResult = await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		trash: true,
		pagination: false,
		depth: 0,
		sort: "-updatedAt",
		where: { parent: { equals: id } },
		select: {
			version: {
				id: true,
				createdAt: true,
				createdBy: true,
				updatedAt: true,
				updatedBy: true,
				deletedAt: true,
				deletedBy: true,
				name: true,
				description: true,
				enabled: true,
				priority: true,
				operation: true,
				subjectUserFilters: true,
				subjectTeamFilters: true,
				subjectRoleFilters: true,
				collection: true,
				filters: true,
				masks: true,
				changeRequestType: true,
				changeRequestComment: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true
			}
		}
	});
	const relations = await resolveRelations({ payload, docs: versionsResult.docs.map(v => v.version) });
	const entries = versionsResult.docs.map(v => ({ ...v.version, versionId: v.id }));
	return { entries, relations };
}

export async function requestUpsertAction(formState: FormState) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	formState.enabled ??= false;
	if(formState.name == null || formState.name.trim().length == 0)
		throw new Error("Name is required.");
	if(formState.priority == null)
		throw new Error("Priority is required.");
	if(formState.operation == null)
		throw new Error("Operation is required.");
	if(formState.subjectUserFilters == null && formState.subjectTeamFilters == null && formState.subjectRoleFilters == null)
		throw new Error("At least one of Subject Filters is required.");
	if(formState.collection == null)
		throw new Error("Collection is required.");
	if(formState.filters == null)
		throw new Error("Filters is required.");
	if(formState.masks == null)
		throw new Error("Masks is required.");
	if(formState.id == null) {
		const created = await payload.create({
			user: user,
			collection: "accesses",
			overrideAccess: true,
			draft: true,
			data: {
				_status: "draft",
				deletedAt: null,
				deletedBy: null,
				name: formState.name,
				description: formState.description as any,
				enabled: formState.enabled,
				priority: formState.priority,
				operation: formState.operation,
				subjectUserFilters: formState.subjectUserFilters,
				subjectTeamFilters: formState.subjectTeamFilters,
				subjectRoleFilters: formState.subjectRoleFilters,
				collection: formState.collection,
				filters: formState.filters,
				masks: formState.masks,
				changeRequestType: "create",
				changeRequestComment: formState.changeRequestComment,
				reviewedAt: null,
				reviewedBy: null,
				reviewApproved: null,
				reviewComment: null
			}
		});
		return { id: created.id };
	}
	await payload.update({
		user: user,
		collection: "accesses",
		id: formState.id,
		overrideAccess: true,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: null,
			deletedBy: null,
			name: formState.name,
			description: formState.description as any,
			enabled: formState.enabled,
			priority: formState.priority,
			operation: formState.operation,
			subjectUserFilters: formState.subjectUserFilters,
			subjectTeamFilters: formState.subjectTeamFilters,
			subjectRoleFilters: formState.subjectRoleFilters,
			collection: formState.collection,
			filters: formState.filters,
			masks: formState.masks,
			changeRequestType: "update",
			changeRequestComment: formState.changeRequestComment,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: formState.id };
}

export async function requestDeleteAction(
	{ id, changeRequestComment }:
	{ id: string, changeRequestComment?: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		id: id,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: new Date().toISOString(),
			deletedBy: user.id,
			changeRequestType: "delete",
			changeRequestComment: changeRequestComment,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: id };
}

export async function cancelRequestAction(
	{ id }:
	{ id: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const access = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(access.reviewedAt != null && access.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		trash: true,
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: id } },
			{ "version._status": { equals: "published" } }
		] },
		select: {
			version: {
				_status: true,
				deletedAt: true,
				deletedBy: true,
				name: true,
				description: true,
				enabled: true,
				priority: true,
				operation: true,
				subjectUserFilters: true,
				subjectTeamFilters: true,
				subjectRoleFilters: true,
				collection: true,
				filters: true,
				masks: true,
				changeRequestType: true,
				changeRequestComment: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true
			}
		}
	})).docs[0]?.version;
	if(approvedVersion == null) {
		await payload.update({
			user: user,
			overrideAccess: true,
			collection: "accesses",
			id: id,
			draft: true,
			trash: true,
			data: {
				_status: "draft",
				deletedAt: new Date().toISOString(),
				deletedBy: user.id,
				reviewedAt: new Date().toISOString(),
				reviewedBy: null,
				reviewApproved: true,
				reviewComment: lexicalPlainText("Auto-reviewed by system because the entry was cancelled before approval.")
			}
		});
		return { id: id };
	}
	await payload.update({
		user: user,
		collection: "accesses",
		id: id,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			deletedAt: approvedVersion.deletedAt,
			deletedBy: approvedVersion.deletedBy,
			name: approvedVersion.name,
			description: approvedVersion.description,
			enabled: approvedVersion.enabled,
			priority: approvedVersion.priority,
			operation: approvedVersion.operation,
			subjectUserFilters: approvedVersion.subjectUserFilters,
			subjectTeamFilters: approvedVersion.subjectTeamFilters,
			subjectRoleFilters: approvedVersion.subjectRoleFilters,
			collection: approvedVersion.collection,
			filters: approvedVersion.filters,
			masks: approvedVersion.masks,
			changeRequestType: approvedVersion.changeRequestType,
			changeRequestComment: approvedVersion.changeRequestComment,
			reviewedAt: approvedVersion.reviewedAt,
			reviewedBy: approvedVersion.reviewedBy,
			reviewApproved: approvedVersion.reviewApproved,
			reviewComment: leixcalPreprendPlainText(approvedVersion.reviewComment, `Auto-reviewed by system on behalf of ${JSON.stringify(approvedVersion.reviewedBy)} because the change request was cancelled before approval.`)
		}
	});
	return { id: id };
}

export async function requestRestoreAction(
	{ id, changeRequestComment }:
	{ id: string, changeRequestComment?: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const access = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(access.deletedAt == null)
		throw new Error("Access is not deleted.");
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		id: id,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: null,
			deletedBy: null,
			changeRequestType: "create",
			changeRequestComment: changeRequestComment,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: id };
}

export async function reviewAction(
	{ id, decision, reviewComment }:
	{ id: string, decision: "approve" | "reject", reviewComment: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const access = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(access.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision == "reject") {
		await payload.update({
			user: user,
			overrideAccess: true,
			collection: "accesses",
			id: id,
			draft: true,
			trash: true,
			data: {
				_status: "draft",
				reviewedAt: new Date().toISOString(),
				reviewedBy: user.id,
				reviewApproved: false,
				reviewComment: reviewComment
			}
		});
		await compileAccesses({ payload, accessesCollection: access.collection });
		return { id: id };
	}
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "accesses",
		id: id,
		trash: true,
		data: {
			_status: "published",
			reviewedAt: new Date().toISOString(),
			reviewedBy: user.id,
			reviewApproved: true,
			reviewComment: reviewComment
		}
	});
	await compileAccesses({ payload, accessesCollection: access.collection });
	return { id: id };
}
