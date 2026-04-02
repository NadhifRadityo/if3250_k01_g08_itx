"use server";

import { headers as nextHeaders } from "next/headers";
import { forbidden, unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import { userManager } from "@/collections/shared";
import type { Team } from "@/payload-types";

const MAX_PAGE_SIZE = 20;
const sortableFields = new Set(["createdAt", "updatedAt", "deletedAt", "name", "reviewedAt", "supervisorName"]);

type ReviewCommentValue = NonNullable<Team["reviewComment"]>;
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

export type TeamManagementTabMode = "editor" | "approver";
export type TeamManagementSortToken = `${"+" | "-"}${"createdAt" | "updatedAt" | "deletedAt" | "name" | "reviewedAt" | "supervisorName"}`;

export type TeamTableRow = {
	id: string;
	name: string;
	supervisorId: string | null;
	supervisorName: string;
	officerIds: string[];
	officerNames: string[];
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	reviewedAt: string | null;
	reviewedByName: string | null;
	reviewApproved: boolean | null;
	reviewCommentText: string;
	requestType: "Create" | "Update" | "Delete";
};

export type QueryTeamsInput = {
	keyword: string;
	sort: string[];
	page: number;
	limit: number;
	mode: TeamManagementTabMode;
};

export type QueryTeamsOutput = {
	docs: TeamTableRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type SearchTeamAssignableUsersOutput = {
	supervisors: Array<{ id: string, name: string, email: string }>;
	officers: Array<{ id: string, name: string, email: string }>;
};

export type UpsertTeamRequestInput = {
	teamId?: string;
	name: string;
	supervisorId: string;
	officerIds: string[];
};

export type ReviewTeamRequestInput = {
	teamId: string;
	decision: "approve" | "reject";
	reason?: string;
};

type SortFieldKey = TeamManagementSortToken extends `${"+" | "-"}${infer T}` ? T : never;

function normalizeSortTokens(sort: string[]): TeamManagementSortToken[] {
	const prefixed = sort
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1))) as TeamManagementSortToken[];
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
		.replace(/\s+/g, " ")
		.trim();
}

function plainTextToReviewComment(value: string | null | undefined): ReviewCommentValue {
	const text = (value ?? "").trim();
	if(text.length == 0)
		return defaultReviewComment;
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
							text,
							format: 0,
							detail: 0,
							mode: "normal",
							style: ""
						}
					]
				}
			]
		}
	};
}

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string") return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function getRelationshipName(value: unknown): string | null {
	if(value != null && typeof value == "object" && "name" in value && typeof value.name == "string")
		return value.name;
	return null;
}

function compareNullableStrings(a: string | null, b: string | null, direction: "asc" | "desc") {
	if(a == null && b == null) return 0;
	if(a == null) return direction == "asc" ? 1 : -1;
	if(b == null) return direction == "asc" ? -1 : 1;
	const left = a.toLowerCase();
	const right = b.toLowerCase();
	if(left == right) return 0;
	if(direction == "asc")
		return left > right ? 1 : -1;
	return left < right ? 1 : -1;
}

function compareRowsBySort(left: TeamTableRow, right: TeamTableRow, sort: TeamManagementSortToken[]) {
	for(const token of sort) {
		const direction = token.startsWith("-") ? "desc" : "asc";
		const field = token.slice(1) as SortFieldKey;
		const leftValue = field == "supervisorName" ? left.supervisorName : left[field];
		const rightValue = field == "supervisorName" ? right.supervisorName : right[field];
		const comparison = compareNullableStrings(leftValue, rightValue, direction);
		if(comparison != 0) return comparison;
	}
	return 0;
}

export async function searchTeamAssignableUsersAction(keyword: string): Promise<SearchTeamAssignableUsersOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();
	const normalizedKeyword = keyword.trim();
	const keywordFilters: Where[] = normalizedKeyword.length > 0 ? [
		{ email: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ employeeId: { like: normalizedKeyword } }
	] : [];
	const [supervisorResult, officerResult] = await Promise.all([
		payload.find({
			collection: "users",
			user,
			overrideAccess: false,
			pagination: false,
			limit: 100,
			sort: "name",
			select: { name: true, email: true },
			where: { and: [
				{ role: { equals: "supervisor" } },
				...(keywordFilters.length > 0 ? [{ or: keywordFilters }] : [])
			] }
		}),
		payload.find({
			collection: "users",
			user,
			overrideAccess: false,
			pagination: false,
			limit: 200,
			sort: "name",
			select: { name: true, email: true },
			where: { and: [
				{ role: { equals: "officer" } },
				...(keywordFilters.length > 0 ? [{ or: keywordFilters }] : [])
			] }
		})
	]);
	return {
		supervisors: supervisorResult.docs.map(doc => ({
			id: String(doc.id),
			name: doc.name,
			email: doc.email
		})),
		officers: officerResult.docs.map(doc => ({
			id: String(doc.id),
			name: doc.name,
			email: doc.email
		}))
	};
}

export async function queryTeamsAction({ keyword, sort, page, limit, mode }: QueryTeamsInput): Promise<QueryTeamsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();

	const pageSize = Number.isFinite(limit) ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(limit))) : MAX_PAGE_SIZE;
	const pageNumber = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
	const normalizedKeyword = keyword.trim();
	const sortTokens = normalizeSortTokens(sort);

	const teamFindResult = await payload.find({
		collection: "teams",
		user,
		overrideAccess: false,
		trash: true,
		pagination: false,
		depth: 1,
		where: { and: [
			...(mode == "approver" ? [{ reviewedAt: { exists: false } }] : []),
			...(normalizedKeyword.length > 0 ? [{ or: [
				{ name: { like: normalizedKeyword } },
				{ "supervisor.name": { like: normalizedKeyword } },
				{ "supervisor.email": { like: normalizedKeyword } },
				{ "officers.name": { like: normalizedKeyword } },
				{ "officers.email": { like: normalizedKeyword } }
			] }] : [])
		] },
		select: {
			name: true,
			supervisor: true,
			officers: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true,
			reviewedAt: true,
			reviewedBy: true,
			reviewApproved: true,
			reviewComment: true
		}
	});

	const mappedRows: TeamTableRow[] = teamFindResult.docs.map(doc => {
		const supervisorId = getRelationshipId(doc.supervisor);
		const supervisorName = getRelationshipName(doc.supervisor) ?? "-";
		const officers = Array.isArray(doc.officers) ? doc.officers : [];
		const officerIds = officers.map(getRelationshipId).filter((id): id is string => id != null);
		const officerNames = officers.map(officer => getRelationshipName(officer) ?? "-");
		const reviewCommentText = richTextToPlainText(doc.reviewComment);
		const reviewedByName = getRelationshipName(doc.reviewedBy);
		const requestType = doc.deletedAt != null ? "Delete" : doc.createdAt == doc.updatedAt ? "Create" : "Update";
		return {
			id: String(doc.id),
			name: doc.name,
			supervisorId,
			supervisorName,
			officerIds,
			officerNames,
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			deletedAt: doc.deletedAt ?? null,
			reviewedAt: doc.reviewedAt ?? null,
			reviewedByName,
			reviewApproved: doc.reviewApproved ?? null,
			reviewCommentText,
			requestType
		};
	});

	const sortedRows = mappedRows.sort((left, right) => compareRowsBySort(left, right, sortTokens));
	const totalDocs = sortedRows.length;
	const totalPages = Math.max(1, Math.ceil(totalDocs / pageSize));
	const safePage = Math.min(pageNumber, totalPages);
	const pageStart = (safePage - 1) * pageSize;
	const docs = sortedRows.slice(pageStart, pageStart + pageSize);

	return {
		docs,
		totalDocs,
		page: safePage,
		hasNextPage: safePage < totalPages,
		hasPreviousPage: safePage > 1
	};
}

export async function upsertTeamRequestAction(input: UpsertTeamRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();

	const name = input.name.trim();
	const supervisorId = input.supervisorId.trim();
	const officerIds = [...new Set(input.officerIds.map(id => id.trim()).filter(id => id.length > 0))];

	if(name.length == 0)
		throw new Error("Team name is required.");
	if(supervisorId.length == 0)
		throw new Error("Supervisor is required.");
	if(officerIds.length == 0)
		throw new Error("At least one officer is required.");

	if(input.teamId == null) {
		const created = await payload.create({
			user,
			collection: "teams",
			overrideAccess: true,
			data: {
				_status: "draft",
				name,
				supervisor: supervisorId,
				officers: officerIds,
				deletedAt: null,
				deletedBy: null,
				reviewedAt: null,
				reviewedBy: null,
				reviewApproved: null,
				reviewComment: null
			}
		});
		return { teamId: created.id };
	}

	await payload.findByID({
		user,
		collection: "teams",
		id: input.teamId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "teams",
		id: input.teamId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "draft",
			name,
			supervisor: supervisorId,
			officers: officerIds,
			deletedAt: null,
			deletedBy: null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});

	return { teamId: input.teamId };
}

export async function requestDeleteTeamAction(teamId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();

	await payload.findByID({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		trash: true,
		depth: 0
	});

	await payload.update({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
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

	return { teamId };
}

export async function cancelTeamRequestAction(teamId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();

	const team = await payload.findByID({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(team.reviewedAt != null)
		throw new Error("Cannot cancel a request that has already been reviewed.");

	await payload.update({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: null,
			deletedBy: null,
			reviewedAt: new Date().toISOString(),
			reviewedBy: user.id,
			reviewApproved: false,
			reviewComment: plainTextToReviewComment("Request cancelled by editor.")
		}
	});

	return { teamId };
}

export async function reviewTeamRequestAction({ teamId, decision, reason }: ReviewTeamRequestInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(!userManager(user)) return forbidden();

	const team = await payload.findByID({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});
	if(team.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision != "approve" && decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	const reviewComment = plainTextToReviewComment(reason);

	if(decision == "reject") {
		await payload.update({
			user,
			collection: "teams",
			id: teamId,
			overrideAccess: true,
			trash: true,
			data: {
				_status: "draft",
				deletedAt: null,
				deletedBy: null,
				reviewedAt: now,
				reviewedBy: user.id,
				reviewApproved: false,
				reviewComment
			}
		});
		return { teamId, decision };
	}

	await payload.update({
		user,
		collection: "teams",
		id: teamId,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			reviewedAt: now,
			reviewedBy: user.id,
			reviewApproved: true,
			reviewComment
		}
	});

	return { teamId, decision };
}
