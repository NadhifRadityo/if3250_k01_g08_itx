"use server";

import { headers as nextHeaders } from "next/headers";
import { forbidden, unauthorized } from "next/navigation";
import { getPayload, createLocalReq } from "payload";

import payloadConfig from "@payload-config";
import { PaginationScroll, scrollStagedUsers, searchStagedUsers } from "@/app/payload-rsc";
import { userManager } from "@/collections/shared";
import type { StagedUser } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
type ReviewCommentValue = NonNullable<StagedUser["reviewComment"]>;
const defaultReviewComment: ReviewCommentValue = {
	root: {
		type: "root",
		version: 1,
		format: "",
		indent: 0,
		direction: null,
		children: [
			{
				type: "paragraph",
				version: 1,
				format: "",
				indent: 0,
				direction: null,
				children: []
			}
		]
	}
};
const sortableFields = new Set([
	"createdAt",
	"updatedAt",
	"deletedAt",
	"email",
	"name",
	"reviewedAt"
]);

export type UserManagementTabMode = "editor" | "approver";
export type UserManagementSortToken = `${"+" | "-"}${"createdAt" | "updatedAt" | "deletedAt" | "email" | "name" | "reviewedAt"}`;

export type QueryStagedUsersInput = {
	keyword: string;
	sort: string[];
	page: number;
	limit: number;
	mode: UserManagementTabMode;
};

export type StagedUserTableRow = {
	id: string;
	paginationCursor: string;
	linkedUserId: string | null;
	email: string;
	name: string;
	employeeId: string;
	role: "admin" | "manager" | "supervisor" | "officer";
	supervisorId: string | null;
	supervisorName: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	deletedById: string | null;
	reviewedAt: string | null;
	reviewedByName: string | null;
	reviewApproved: boolean | null;
	reviewCommentText: string;
	initialPassword: boolean;
};

export type CursorStagedUsersOutput = {
	docs: StagedUserTableRow[];
	totalDocs: number;
	hasNextPage: boolean;
	startCursor: string | null;
	endCursor: string | null;
};

export type CursorStagedUsersInput = {
	keyword: string;
	sort: string[];
	limit: number;
	mode: UserManagementTabMode;
	cursor?: string;
	scroll?: PaginationScroll;
};

export type UpsertStagedUserInput = {
	stagedUserId?: string;
	email: string;
	name: string;
	employeeId: string;
	role: string;
	supervisorId?: string | null;
	initialPassword?: string;
};

export type ReviewStagedUserInput = {
	stagedUserId: string;
	decision: "approve" | "reject";
	reason?: string;
};

function normalizeSortTokens(sort: string[]): UserManagementSortToken[] {
	const prefixed = sort
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1))) as UserManagementSortToken[];
	const deduplicated = prefixed.filter((token, index, source) =>
		index == source.findIndex(candidate => candidate.slice(1) == token.slice(1))
	);
	if(!deduplicated.some(token => token.slice(1) == "updatedAt"))
		deduplicated.push("-updatedAt");
	return deduplicated;
}

function richTextToPlainText(value: unknown): string {
	if(value == null || typeof value != "object") return "";
	const nodes: unknown[] = [];
	const collectNodes = (node: unknown) => {
		if(node == null || typeof node != "object") return;
		nodes.push(node);
		if("children" in node && Array.isArray(node.children))
			node.children.forEach(collectNodes);
	};
	collectNodes((value as { root?: unknown }).root);
	return nodes
		.filter((node): node is { text: string } => node != null && typeof node == "object" && "text" in node && typeof node.text == "string")
		.map(node => node.text)
		.join(" ")
		.replace(/\s+/g, " ");
}

function plainTextToReviewComment(value: string | null | undefined) {
	return {
		root: {
			type: "root",
			version: 1,
			format: "",
			indent: 0,
			direction: null,
			children: [
				{
					type: "paragraph",
					version: 1,
					format: "",
					indent: 0,
					direction: null,
					children: [
						{
							type: "text",
							version: 1,
							text: value,
							format: 0,
							detail: 0,
							mode: "normal",
							style: ""
						}
					]
				}
			]
		}
	} as ReviewCommentValue;
}

export async function searchUserSupervisorsAction(keyword: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();
	const userFindResult = await payload.find({
		collection: "users",
		user: user,
		overrideAccess: false,
		pagination: false,
		limit: 50,
		sort: "name",
		select: { name: true, email: true },
		where: { and: [
			{ role: { in: ["admin", "manager", "supervisor"] } },
			...(keyword.length > 0 ? [{ or: [
				{ email: { like: keyword } },
				{ name: { like: keyword } },
				{ employeeId: { like: keyword } }
			] }] : [])
		] }
	});
	return userFindResult.docs.map(doc => ({
		id: doc.id,
		name: doc.name,
		email: doc.email
	}));
}

export async function queryStagedUsersAction({ keyword, sort, limit, mode, cursor, scroll }: CursorStagedUsersInput): Promise<CursorStagedUsersOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();
	const pageSize = Number.isFinite(limit) ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(limit))) : MAX_PAGE_SIZE;
	const sortTokens = normalizeSortTokens(sort);
	const currentResult = cursor == null ?
		await searchStagedUsers({
			payload,
			user,
			keyword: keyword,
			sort: sortTokens,
			itemLimit: pageSize,
			trash: mode == "approver",
			where: mode == "approver" ? { reviewedAt: { exists: false } } : null
		}) :
		await scrollStagedUsers({
			payload,
			user,
			cursor,
			scroll: scroll ?? { next: pageSize },
			withTotalCount: true,
			itemLimit: pageSize,
			trash: mode == "approver",
			where: mode == "approver" ? { reviewedAt: { exists: false } } : null
		});

	const docsForPage = currentResult.result;
	const totalDocs = currentResult.total;
	const hasNextPage = currentResult.resultRemaining > currentResult.result.length;
	const startCursor = currentResult.result[0]?.paginationCursor ?? null;
	const endCursor = currentResult.result.at(-1)?.paginationCursor ?? null;

	const stagedUserIds = [...new Set(docsForPage.map(doc => String(doc.id)))];
	const linkedUsersResult = stagedUserIds.length > 0 ? await payload.find({
		collection: "users",
		user: user,
		overrideAccess: false,
		trash: true,
		pagination: false,
		where: {
			stagedUser: {
				in: stagedUserIds
			}
		},
		select: {
			stagedUser: true
		}
	}) : { docs: [] as Array<{ id: string, stagedUser?: string | { id: string } | null }> };
	const docs: StagedUserTableRow[] = docsForPage.map(doc => ({
		id: String(doc.id),
		paginationCursor: doc.paginationCursor,
		linkedUserId: linkedUsersResult.docs.find(d => d.stagedUser?.id == doc.id)?.id,
		email: doc.email,
		name: doc.name,
		employeeId: doc.employeeId,
		role: doc.role,
		supervisorId: doc.supervisor?.id,
		supervisorName: doc.supervisor?.name,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
		deletedAt: doc.deletedAt ?? null,
		deletedById: doc.deletedBy?.id,
		reviewedAt: doc.reviewedAt ?? null,
		reviewedByName: doc.reviewedBy?.name,
		reviewApproved: doc.reviewAprroved,
		reviewCommentText: richTextToPlainText(doc.reviewComment),
		initialPassword: doc.initialPassword
	}));

	return {
		docs,
		totalDocs,
		hasNextPage,
		startCursor,
		endCursor
	};
}

export async function upsertStagedUserRequestAction(input: UpsertStagedUserInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();
	if(input.email.length == 0)
		throw new Error("Email is required.");
	if(input.name.length == 0)
		throw new Error("Name is required.");
	if(input.employeeId.length == 0)
		throw new Error("Employee ID is required.");
	if(input.stagedUserId == null) {
		const created = await payload.create({
			user: user,
			collection: "staged-users",
			overrideAccess: true,
			data: {
				_status: "draft",
				email: input.email,
				name: input.name,
				employeeId: input.employeeId,
				role: input.role,
				supervisor: input.supervisorId,
				initialPassword: input.initialPassword,
				reviewedAt: null,
				reviewedBy: null,
				reviewAprroved: null,
				reviewComment: null
			}
		});
		return { stagedUserId: created.id };
	}
	await payload.findByID({
		user: user,
		collection: "staged-users",
		id: input.stagedUserId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});
	await payload.update({
		user: user,
		collection: "staged-users",
		id: input.stagedUserId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "draft",
			email: input.email,
			name: input.name,
			employeeId: input.employeeId,
			role: input.role,
			supervisor: input.supervisorId,
			...(input.initialPassword != null ? {
				initialPassword: input.initialPassword
			} : {}),
			reviewedAt: null,
			reviewedBy: null,
			reviewAprroved: null,
			reviewComment: null
		}
	});
	return { stagedUserId: input.stagedUserId };
}

export async function requestDeleteStagedUserAction(stagedUserId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();
	const now = new Date().toISOString();
	await payload.findByID({
		user: user,
		collection: "staged-users",
		id: stagedUserId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});
	await payload.update({
		user: user,
		collection: "staged-users",
		id: stagedUserId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: now,
			deletedBy: user.id,
			reviewedAt: null,
			reviewedBy: null,
			reviewAprroved: null,
			reviewComment: null
		}
	});
	return { stagedUserId };
}

export async function cancelStagedUserRequestAction(stagedUserId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();
	const stagedUser = await payload.findByID({
		user: user,
		collection: "staged-users",
		id: stagedUserId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(stagedUser.reviewedAt != null)
		throw new Error("Cannot cancel a request that has already been reviewed.");
	const linkedUsers = await payload.find({
		user: user,
		collection: "users",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		showHiddenFields: true,
		where: {
			stagedUser: {
				equals: stagedUserId
			}
		}
	});
	const req = await createLocalReq({}, payload);
	const linkedUser = linkedUsers.docs[0] ?? null;
	if(linkedUser == null) {
		await payload.delete({
			user: user,
			collection: "staged-users",
			id: stagedUserId,
			overrideAccess: true
		});
		return { stagedUserId, removed: true };
	}
	await payload.db.updateOne({
		collection: "staged-users",
		id: stagedUserId,
		req,
		data: {
			_status: "published",
			createdAt: linkedUser.createdAt,
			createdBy: linkedUser.createdBy?.id,
			updatedAt: linkedUser.updatedAt,
			updatedBy: linkedUser.updatedBy?.id,
			deletedAt: linkedUser.deletedAt ?? null,
			deletedBy: linkedUser.deletedBy?.id,
			email: linkedUser.email,
			role: linkedUser.role,
			name: linkedUser.name,
			employeeId: linkedUser.employeeId,
			supervisor: linkedUser.supervisor?.id,
			reviewedAt: null,
			reviewedBy: null,
			reviewAprroved: null,
			reviewComment: null,
			initialPassword: null
		}
	});
	return { stagedUserId, removed: false };
}

export async function reviewStagedUserRequestAction({ stagedUserId, decision, reason }: ReviewStagedUserInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();
	const stagedUser = await payload.findByID({
		user: user,
		collection: "staged-users",
		id: stagedUserId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(stagedUser.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");
	const reviewComment = plainTextToReviewComment(reason);
	const now = new Date().toISOString();
	if(decision == "reject") {
		await payload.update({
			user: user,
			collection: "staged-users",
			id: stagedUserId,
			overrideAccess: true,
			trash: true,
			data: {
				_status: "published",
				deletedAt: null,
				deletedBy: null,
				reviewedAt: now,
				reviewedBy: user.id,
				reviewAprroved: false,
				reviewComment: reviewComment ?? defaultReviewComment
			}
		});
		return { stagedUserId, decision };
	}
	const linkedUsers = await payload.find({
		user: user,
		collection: "users",
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		showHiddenFields: true,
		where: {
			stagedUser: {
				equals: stagedUserId
			}
		}
	});
	const linkedUser = linkedUsers.docs[0] ?? null;
	const req = await createLocalReq({}, payload);
	if(linkedUser != null) {
		await payload.db.updateOne({
			collection: "users",
			id: linkedUser.id,
			req,
			data: {
				createdAt: stagedUser.createdAt,
				createdBy: stagedUser.createdBy?.id,
				updatedAt: stagedUser.updatedAt,
				updatedBy: stagedUser.updatedBy?.id,
				deletedAt: stagedUser.deletedAt ?? null,
				deletedBy: stagedUser.deletedBy?.id,
				email: stagedUser.email,
				role: stagedUser.role,
				name: stagedUser.name,
				employeeId: stagedUser.employeeId,
				supervisor: stagedUser.supervisor?.id,
				stagedUser: stagedUserId
			}
		});
	} else {
		const stagedPassword = typeof stagedUser.initialPassword == "string" ? stagedUser.initialPassword : "";
		if(stagedPassword.length == 0)
			throw new Error("Cannot approve a new user request without an initial password.");
		const createdUser = await payload.create({
			user: user,
			collection: "users",
			overrideAccess: true,
			data: {
				email: stagedUser.email,
				role: stagedUser.role,
				name: stagedUser.name,
				employeeId: stagedUser.employeeId,
				supervisor: stagedUser.supervisor?.id,
				stagedUser: stagedUserId,
				password: stagedPassword
			}
		} as any);
		await payload.db.updateOne({
			collection: "users",
			id: createdUser.id,
			req,
			data: {
				createdAt: stagedUser.createdAt,
				createdBy: stagedUser.createdBy?.id,
				updatedAt: stagedUser.updatedAt,
				updatedBy: stagedUser.updatedBy?.id,
				deletedAt: stagedUser.deletedAt ?? null,
				deletedBy: stagedUser.deletedBy?.id
			}
		});
	}
	await payload.update({
		user: user,
		collection: "staged-users",
		id: stagedUserId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			reviewedAt: now,
			reviewedBy: user.id,
			reviewAprroved: true,
			reviewComment: reviewComment ?? defaultReviewComment
		}
	});
	return { stagedUserId, decision };
}
