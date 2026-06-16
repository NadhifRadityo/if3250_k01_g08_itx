"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import { buildFilterWhere, lexicalPlainText, getRelationshipId, leixcalPreprendPlainText } from "@/utils/payload";
import { StagedUser, User } from "@/payload-types";

import { compileAccesses } from "../access-management/layout.actions";
import { MenuFilterState } from "../layout.components";
import { resolveRelationRoles, resolveRelationUsers } from "../relation-navigation.actions";
import { RelationRole, RelationUser } from "../relation-navigation.shared";
import { FormState } from "./layout.components";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`roles:${string}`, RelationRole>>;

async function resolveRelations(
	{ payload, user, docs }:
	{ payload?: Payload, user: User, docs: StagedUser[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const roleIds = new Set<string>();
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
		const role = getRelationshipId(doc.role);
		if(role != null)
			roleIds.add(role);
		const supervisor = getRelationshipId(doc.supervisor);
		if(supervisor != null)
			userIds.add(supervisor);
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		if(reviewedBy != null)
			userIds.add(reviewedBy);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await uwsa(resolveRelationUsers)({ payload, user, ids: [...userIds] }));
	Object.assign(relations, await uwsa(resolveRelationRoles)({ payload, user, ids: [...roleIds] }));
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
		collection: "staged-users",
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
				{ email: { like: keyword } },
				{ employeeId: { like: keyword } },
				{ "role.name": { like: keyword } },
				{ "supervisor.name": { like: keyword } },
				{ "supervisor.email": { like: keyword } }
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
		collection: "staged-users",
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
			email: true,
			name: true,
			employeeId: true,
			role: true,
			supervisor: true,
			initialPassword: true,
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
		collection: "staged-users",
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
				email: true,
				name: true,
				employeeId: true,
				role: true,
				supervisor: true,
				initialPassword: true,
				changeRequestType: true,
				changeRequestComment: true
			}
		}
	})).docs[0];
	const requestedVersion = requestedDoc?.version;
	if(requestedVersion == null)
		throw new Error("Draft staged user request could not be found.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "staged-users",
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
				email: true,
				name: true,
				employeeId: true,
				role: true,
				supervisor: true,
				initialPassword: true,
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
		collection: "staged-users",
		trash: true,
		pagination: false,
		limit: 100,
		depth: 0,
		sort: "-updatedAt",
		where: { parent: { equals: id } },
		select: {
			updatedAt: true,
			version: {
				createdAt: true,
				createdBy: true,
				updatedAt: true,
				updatedBy: true,
				deletedAt: true,
				deletedBy: true,
				email: true,
				name: true,
				employeeId: true,
				role: true,
				supervisor: true,
				initialPassword: true,
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

	if(formState.email == null || formState.email.trim().length == 0)
		throw new Error("Email is required.");
	if(formState.name == null || formState.name.trim().length == 0)
		throw new Error("Name is required.");
	if(formState.employeeId == null || formState.employeeId.trim().length == 0)
		throw new Error("Employee ID is required.");
	if(formState.role == null || formState.role.trim().length == 0)
		throw new Error("Role is required.");
	if(formState.initialPassword != null && formState.initialPassword.trim().length > 0 && formState.initialPassword.trim().length < 8)
		throw new Error("Initial password must be at least 8 characters.");

	const email = formState.email.trim();
	const name = formState.name.trim();
	const employeeId = formState.employeeId.trim();
	const role = formState.role.trim();
	const supervisor = formState.supervisor?.trim() ?? "";
	const initialPassword = formState.initialPassword?.trim() ?? "";

	await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "roles",
		id: role,
		depth: 0
	});

	if(formState.id == null) {
		if(initialPassword.length < 8)
			throw new Error("Initial password is required for new staged user requests and must be at least 8 characters.");
		const created = await payload.create({
			user: user,
			overrideAccess: false,
			collection: "staged-users",
			draft: true,
			data: {
				_status: "draft",
				createdAt: new Date().toISOString(),
				createdBy: user.id,
				updatedAt: new Date().toISOString(),
				updatedBy: user.id,
				deletedAt: null,
				deletedBy: null,
				email: email,
				name: name,
				employeeId: employeeId,
				role: role,
				supervisor: supervisor.length > 0 ? supervisor : null,
				initialPassword: initialPassword,
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

	const existingStagedUser = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "staged-users",
		id: formState.id,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	const linkedUser = (await payload.find({
		user: user,
		overrideAccess: false,
		collection: "users",
		trash: true,
		pagination: false,
		depth: 0,
		limit: 1,
		where: { stagedUser: { equals: formState.id } }
	})).docs[0] ?? null;
	let nextInitialPassword = initialPassword;
	if(nextInitialPassword.length == 0 && linkedUser == null)
		nextInitialPassword = (existingStagedUser.initialPassword ?? "").trim();
	if(linkedUser == null && nextInitialPassword.length < 8)
		throw new Error("Initial password is required for create requests and must be at least 8 characters.");

	await payload.update({
		user: user,
		overrideAccess: false,
		collection: "staged-users",
		id: formState.id,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			deletedAt: null,
			deletedBy: null,
			email: email,
			name: name,
			employeeId: employeeId,
			role: role,
			supervisor: supervisor.length > 0 ? supervisor : null,
			initialPassword: nextInitialPassword.length > 0 ? nextInitialPassword : null,
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
		collection: "staged-users",
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

	const stagedUser = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "staged-users",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(stagedUser.reviewedAt != null && stagedUser.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "staged-users",
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
				email: true,
				name: true,
				employeeId: true,
				role: true,
				supervisor: true,
				initialPassword: true,
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
			collection: "staged-users",
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
		overrideAccess: false,
		collection: "staged-users",
		id: id,
		trash: true,
		data: {
			_status: "published",
			deletedAt: approvedVersion.deletedAt,
			deletedBy: approvedVersion.deletedBy,
			email: approvedVersion.email,
			name: approvedVersion.name,
			employeeId: approvedVersion.employeeId,
			role: approvedVersion.role,
			supervisor: approvedVersion.supervisor,
			initialPassword: approvedVersion.initialPassword,
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

	const stagedUser = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "staged-users",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(stagedUser.deletedAt == null)
		throw new Error("User request is not deleted.");
	await payload.update({
		user: user,
		overrideAccess: false,
		collection: "staged-users",
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

	const stagedUser = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "staged-users",
		id: id,
		draft: true,
		trash: true,
		depth: 1,
		showHiddenFields: true
	});
	if(stagedUser.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision == "reject") {
		await payload.update({
			user: user,
			overrideAccess: false,
			collection: "staged-users",
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
		await uwsa(compileAccesses)({ payload });
		return { id: id };
	}

	const linkedUser = (await payload.find({
		user: user,
		overrideAccess: false,
		collection: "users",
		trash: true,
		pagination: false,
		depth: 0,
		limit: 1,
		where: { stagedUser: { equals: id } }
	})).docs[0] ?? null;
	if(stagedUser.deletedAt != null) {
		if(linkedUser != null) {
			await payload.update({
				user: user,
				overrideAccess: false,
				collection: "users",
				id: linkedUser.id,
				trash: true,
				data: {
					deletedAt: stagedUser.deletedAt,
					deletedBy: user.id,
					stagedUser: stagedUser.id
				}
			});
		}
	} else {
		const role = getRelationshipId(stagedUser.role);
		if(role == null)
			throw new Error("Cannot approve request without a valid role.");
		const supervisor = getRelationshipId(stagedUser.supervisor);
		const upsertData = {
			email: stagedUser.email,
			name: stagedUser.name,
			employeeId: stagedUser.employeeId,
			role: role,
			supervisor: supervisor,
			deletedAt: null,
			deletedBy: null,
			stagedUser: stagedUser.id
		};
		const initialPassword = (stagedUser.initialPassword ?? "").trim();
		if(linkedUser == null) {
			if(initialPassword.length < 8)
				throw new Error("Cannot approve create request without an initial password of at least 8 characters.");
			await payload.create({
				user: user,
				overrideAccess: false,
				collection: "users",
				draft: false,
				data: {
					...upsertData,
					enableAPIKey: false,
					sessions: [],
					password: initialPassword
				}
			});
		} else {
			await payload.update({
				user: user,
				overrideAccess: false,
				collection: "users",
				id: linkedUser.id,
				trash: true,
				data: {
					...upsertData,
					...(initialPassword.length > 0 ? { password: initialPassword } : {})
				}
			});
		}
	}

	await payload.update({
		user: user,
		overrideAccess: false,
		collection: "staged-users",
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
	await uwsa(compileAccesses)({ payload });
	return { id: id };
});
