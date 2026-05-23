"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText, getRelationshipId, leixcalPreprendPlainText } from "@/utils/payload";
import type { CreditApplicationsAccessMask } from "@/payload-types";

import { MenuFilterState } from "../../layout.components";
import { resolveRelationUsers } from "../../relation-navigation.actions";
import { RelationUser } from "../../relation-navigation.shared";
import { tabMenuKeys, menuMaskFields, slugAccessMaskCollectionMap } from "../layout.shared";
import { MaskFormState } from "./mask.components";

const PAGE_LIMIT = 20;
export type MaskRelationValues = Partial<Record<`users:${string}`, RelationUser>>;

const buildFilterWhere = (filters: MenuFilterState[]) => ({ or:
	filters.map(filter => ([{ [filter.columnKey]: { [filter.operator]: filter.value } }, filter.combinator ?? "and"] as const))
		.reduce((termGroups, [unit, combinator], i) => i == 0 || combinator == "and" ?
			[...termGroups.slice(0, -1), [...termGroups.at(-1)!, unit]] :
			[...termGroups, [unit]], [[]] as Where[][])
		.filter(termGroups => termGroups.length > 0)
		.map(termGroups => ({ and: termGroups }))
});

function resolveCollection(slug: string) {
	const collection = slugAccessMaskCollectionMap[slug as typeof tabMenuKeys[number]];
	if(collection == null)
		throw new Error("Invalid slug.");
	return collection as any;
}

function resolveMaskFields(slug: string) {
	const fields = menuMaskFields[slug as typeof tabMenuKeys[number]];
	if(fields == null)
		throw new Error("Invalid slug.");
	return fields;
}

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: CreditApplicationsAccessMask[] }
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
	const relations = {} as MaskRelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: [...userIds] }));
	return relations;
}

async function queryMaskAction(
	{ slug, mode, keyword, filters, columnsSort, includeDeleted, pageIndex }:
	{ slug: string, mode: "viewer" | "approver" | "editor", keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], includeDeleted: boolean, pageIndex: number }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);
	const result = await payload.find({
		user: user,
		overrideAccess: true,
		collection: collection,
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
				{ name: { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, docs: result.docs });
	return { ...result, relations };
}

export async function queryMaskViewerAction(p: Omit<Parameters<typeof queryMaskAction>[0], "mode">) {
	return await queryMaskAction({ ...p, mode: "viewer" });
}
export async function queryMaskEditorAction(p: Omit<Parameters<typeof queryMaskAction>[0], "mode">) {
	return await queryMaskAction({ ...p, mode: "editor" });
}
export async function queryMaskApproverAction(p: Omit<Parameters<typeof queryMaskAction>[0], "mode">) {
	return await queryMaskAction({ ...p, mode: "approver" });
}

export async function getMaskDetailsAction(slug: string, id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);
	const maskFields = resolveMaskFields(slug);

	const selectFields: Record<string, boolean> = {
		_status: true,
		createdAt: true,
		createdBy: true,
		updatedAt: true,
		updatedBy: true,
		deletedAt: true,
		deletedBy: true,
		name: true,
		description: true,
		defaultShowAll: true,
		reviewedAt: true,
		reviewedBy: true,
		reviewApproved: true,
		reviewComment: true
	};
	for(const [fieldKey] of maskFields)
		selectFields[fieldKey] = true;

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: collection,
		draft: true,
		trash: true,
		id: id,
		depth: 0,
		select: selectFields
	});
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations };
}

export async function getMaskDifferenceAction(slug: string, id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);
	const maskFields = resolveMaskFields(slug);

	const versionSelectFields: Record<string, boolean> = {
		deletedAt: true,
		name: true,
		description: true,
		defaultShowAll: true
	};
	for(const [fieldKey] of maskFields)
		versionSelectFields[fieldKey] = true;

	const requestedDoc = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: collection,
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
			version: versionSelectFields
		} as any
	})).docs[0];
	const requestedVersion = requestedDoc?.version;
	if(requestedVersion == null)
		throw new Error("Draft mask request could not be found.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: collection,
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
			version: versionSelectFields
		} as any
	})).docs[0]?.version;
	const relations = await resolveRelations({ payload, docs: [...(approvedVersion != null ? [approvedVersion] : []), requestedVersion] as CreditApplicationsAccessMask[] });
	return {
		requestType: requestedVersion.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update",
		approvedVersion: approvedVersion,
		requestedVersion: requestedVersion,
		relations: relations
	};
}

export async function getMaskHistoryAction(slug: string, id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);
	const maskFields = resolveMaskFields(slug);

	const versionSelectFields: Record<string, boolean> = {
		id: true,
		_status: true,
		createdAt: true,
		createdBy: true,
		updatedAt: true,
		updatedBy: true,
		deletedAt: true,
		deletedBy: true,
		name: true,
		description: true,
		defaultShowAll: true,
		reviewedAt: true,
		reviewedBy: true,
		reviewApproved: true,
		reviewComment: true
	};
	for(const [fieldKey] of maskFields)
		versionSelectFields[fieldKey] = true;

	const versionsResult = await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: collection,
		trash: true,
		pagination: false,
		limit: 100,
		depth: 0,
		sort: "-updatedAt",
		where: { parent: { equals: id } },
		select: {
			updatedAt: true,
			version: versionSelectFields
		} as any
	});
	const relations = await resolveRelations({ payload, docs: versionsResult.docs.map(v => v.version) });
	const entries = versionsResult.docs.map(v => ({ ...v.version, versionId: v.id }));
	return { entries, relations };
}

export async function requestMaskUpsertAction(slug: string, formState: MaskFormState) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);
	const maskFields = resolveMaskFields(slug);

	if(formState.name == null || formState.name.trim().length == 0)
		throw new Error("Mask name is required.");

	const data: Record<string, any> = {
		_status: "draft",
		deletedAt: null,
		deletedBy: null,
		name: formState.name,
		description: formState.description ?? null,
		defaultShowAll: formState.defaultShowAll ?? false,
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: null
	};
	for(const [fieldKey] of maskFields)
		data[fieldKey] = formState[fieldKey] ?? "hide";

	if(formState.id == null) {
		const created = await payload.create({
			user: user,
			collection: collection,
			overrideAccess: true,
			draft: true,
			data: data as any
		});
		return { id: created.id };
	}
	await payload.update({
		user: user,
		collection: collection,
		id: formState.id,
		overrideAccess: true,
		draft: true,
		trash: true,
		data: data as any
	});
	return { id: formState.id };
}

export async function requestMaskDeleteAction(slug: string, id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);

	await payload.update({
		user: user,
		overrideAccess: true,
		collection: collection,
		id: id,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: new Date().toISOString(),
			deletedBy: user.id,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: id };
}

export async function cancelMaskRequestAction(slug: string, id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);

	const doc = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: collection,
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(doc.reviewedAt != null && doc.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: collection,
		trash: true,
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: id } },
			{ "version._status": { equals: "published" } }
		] }
	})).docs[0]?.version;
	if(approvedVersion == null) {
		await payload.update({
			user: user,
			overrideAccess: true,
			collection: collection,
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
		collection: collection,
		id: id,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			...approvedVersion,
			reviewComment: leixcalPreprendPlainText(approvedVersion.reviewComment, `Auto-reviewed by system on behalf of ${JSON.stringify(approvedVersion.reviewedBy)} because the change request was cancelled before approval.`)
		}
	});
	return { id: id };
}

export async function requestMaskRestoreAction(slug: string, id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);

	const doc = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: collection,
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(doc.deletedAt == null)
		throw new Error("Entry is not deleted.");
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: collection,
		id: id,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: null,
			deletedBy: null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: id };
}

export async function reviewMaskAction(
	{ slug, id, decision, reviewComment }:
	{ slug: string, id: string, decision: "approve" | "reject", reviewComment: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);

	const doc = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: collection,
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(doc.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision == "reject") {
		await payload.update({
			user: user,
			overrideAccess: true,
			collection: collection,
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
		return { id: id };
	}
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: collection,
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
	return { id: id };
}

export async function searchRelationAccessMasksAction(slug: string, keyword: string, selectedIds: string[] = []) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const collection = resolveCollection(slug);

	const result = await payload.find({
		user: user,
		overrideAccess: true,
		collection: collection,
		draft: true,
		trash: true,
		pagination: false,
		limit: 20,
		depth: 0,
		where: { or: [
			...(keyword.length > 0 ? [{ name: { like: keyword } }] : []),
			...(selectedIds.length > 0 ? [{ id: { in: selectedIds } }] : [])
		] }
	});
	return result.docs.map(doc => ({ id: doc.id, label: doc.name }));
}
