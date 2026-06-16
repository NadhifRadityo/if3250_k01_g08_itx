"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import { buildFilterWhere, lexicalPlainText, getRelationshipId, leixcalPreprendPlainText } from "@/utils/payload";
import { User, Survey } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers } from "../relation-navigation.actions";
import { RelationUser } from "../relation-navigation.shared";
import { FormState } from "./layout.components";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>>;

async function resolveRelations(
	{ payload, user, docs }:
	{ payload?: Payload, user: User, docs: Survey[] }
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
	Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, user, ids: [...userIds] }));
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
		overrideAccess: false,
		collection: "surveys",
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
				{ title: { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, user, docs: result.docs });
	return { ...result, relations };
}

export const queryViewerAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "viewer" });
});
export const queryEditorAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "editor" });
});
export const queryApproverAction = wsa(async (p: Omit<Parameters<typeof queryAction>[0], "mode">) => {
	return await queryAction({ ...p, mode: "approver" });
});

export const getDetailsAction = wsa(async (id: string) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "surveys",
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
			title: true,
			description: true,
			content: true,
			changeRequestType: true,
			changeRequestComment: true,
			reviewedAt: true,
			reviewedBy: true,
			reviewApproved: true,
			reviewComment: true
		}
	});
	const relations = await resolveRelations({ payload, user, docs: [result] });
	return { row: result, relations };
});

export const getDifferenceAction = wsa(async (id: string) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const requestedDoc = (await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "surveys",
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
				title: true,
				description: true,
				content: true,
				changeRequestType: true,
				changeRequestComment: true
			}
		}
	})).docs[0];
	const requestedVersion = requestedDoc?.version;
	if(requestedVersion == null)
		throw new Error("Draft survey request could not be found.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "surveys",
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
				title: true,
				description: true,
				content: true,
				changeRequestType: true,
				changeRequestComment: true
			}
		}
	})).docs[0]?.version;
	if(approvedVersion != null)
		approvedVersion.id = id;
	requestedVersion.id = id;
	const relations = await resolveRelations({ payload, user, docs: [...(approvedVersion != null ? [approvedVersion] : []), requestedVersion] });
	return {
		approvedVersion: approvedVersion,
		requestedVersion: requestedVersion,
		relations: relations
	};
});

export const getHistoryAction = wsa(async (id: string) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const versionsResult = await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		trash: true,
		pagination: false,
		depth: 0,
		sort: "-updatedAt",
		where: { parent: { equals: id } },
		select: {
			version: {
				createdAt: true,
				createdBy: true,
				updatedAt: true,
				updatedBy: true,
				deletedAt: true,
				deletedBy: true,
				title: true,
				description: true,
				content: true,
				changeRequestType: true,
				changeRequestComment: true,
				reviewedAt: true,
				reviewedBy: true,
				reviewApproved: true,
				reviewComment: true
			}
		}
	});
	const entries = versionsResult.docs.map(v => ({ ...v.version, id: id, versionId: v.id }));
	const relations = await resolveRelations({ payload, user, docs: entries });
	return { entries, relations };
});

export const requestUpsertAction = wsa(async (formState: FormState) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	if(formState.title == null || formState.title.trim().length == 0)
		throw new Error("Title is required.");
	if(formState.content == null)
		throw new Error("Content is required.");
	if(formState.id == null) {
		const created = await payload.create({
			user: user,
			collection: "surveys",
			overrideAccess: false,
			draft: true,
			data: {
				_status: "draft",
				createdAt: new Date().toISOString(),
				createdBy: user.id,
				updatedAt: new Date().toISOString(),
				updatedBy: user.id,
				deletedAt: null,
				deletedBy: null,
				title: formState.title,
				description: formState.description as any,
				content: formState.content,
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
		collection: "surveys",
		id: formState.id,
		overrideAccess: false,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			deletedAt: null,
			deletedBy: null,
			title: formState.title,
			description: formState.description as any,
			content: formState.content,
			changeRequestType: "update",
			changeRequestComment: formState.changeRequestComment,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: formState.id };
});

export const requestDeleteAction = wsa(async (
	{ id, changeRequestComment }:
	{ id: string, changeRequestComment?: any }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.update({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		id: id,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
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
});

export const cancelRequestAction = wsa(async (
	{ id }:
	{ id: string }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const survey = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(survey.reviewedAt != null && survey.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "surveys",
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
				title: true,
				description: true,
				content: true,
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
			overrideAccess: false,
			collection: "surveys",
			id: id,
			draft: true,
			trash: true,
			data: {
				_status: "draft",
				updatedAt: new Date().toISOString(),
				updatedBy: user.id,
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
		collection: "surveys",
		id: id,
		overrideAccess: false,
		trash: true,
		data: {
			_status: "published",
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			deletedAt: approvedVersion.deletedAt,
			deletedBy: approvedVersion.deletedBy,
			title: approvedVersion.title,
			description: approvedVersion.description,
			content: approvedVersion.content,
			changeRequestType: approvedVersion.changeRequestType,
			changeRequestComment: approvedVersion.changeRequestComment,
			reviewedAt: approvedVersion.reviewedAt,
			reviewedBy: approvedVersion.reviewedBy,
			reviewApproved: approvedVersion.reviewApproved,
			reviewComment: leixcalPreprendPlainText(approvedVersion.reviewComment, `Auto-reviewed by system on behalf of ${JSON.stringify(approvedVersion.reviewedBy)} because the change request was cancelled before approval.`)
		}
	});
	return { id: id };
});

export const requestRestoreAction = wsa(async (
	{ id, changeRequestComment }:
	{ id: string, changeRequestComment?: any }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const survey = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(survey.deletedAt == null)
		throw new Error("Survey is not deleted.");
	await payload.update({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		id: id,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
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
});

export const reviewAction = wsa(async (
	{ id, decision, reviewComment }:
	{ id: string, decision: "approve" | "reject", reviewComment: any }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const survey = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(survey.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision == "reject") {
		await payload.update({
			user: user,
			overrideAccess: false,
			collection: "surveys",
			id: id,
			draft: true,
			trash: true,
			data: {
				_status: "draft",
				updatedAt: new Date().toISOString(),
				updatedBy: user.id,
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
		overrideAccess: false,
		collection: "surveys",
		id: id,
		trash: true,
		data: {
			_status: "published",
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			reviewedAt: new Date().toISOString(),
			reviewedBy: user.id,
			reviewApproved: true,
			reviewComment: reviewComment
		}
	});
	return { id: id };
});
