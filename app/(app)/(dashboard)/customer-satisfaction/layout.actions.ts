"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import type { User } from "@/payload-types";

const COLLECTION = "satisfaction-surveys" as const;
const MAX_PAGE_SIZE = 20;

const EDITOR_ACCESS_MENUS = new Set([
	"customer-satisfaction-editor",
	"customer-satisfaction-viewer",
	"customer-satisfaction-auditor"
]);
const APPROVER_ACCESS_MENUS = new Set(["customer-satisfaction-approver"]);

export type SatisfactionRespondType = "free_text" | "option";

export type CustomerSatisfactionTabMode = "editor" | "approver";

export type CustomerSatisfactionSurveyRow = {
	id: string;
	csatId: string;
	title: string;
	sequence: number | null;
	questionPrompt: string;
	internalDescription: string;
	respondType: string;
	updatedAt: string;
	updatedByLabel: string;
	reviewedAt: string | null;
	reviewedByLabel: string;
	approvalState: "pending" | "approved" | "rejected" | "none";
	_status: "draft" | "published" | null;
	isSoftDeleted: boolean;
};

export type QueryCustomerSatisfactionSurveysInput = {
	keyword: string;
	page: number;
	limit: number;
	mode: CustomerSatisfactionTabMode;
	includeSoftDeleted?: boolean;
};

export type QueryCustomerSatisfactionSurveysOutput = {
	docs: CustomerSatisfactionSurveyRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type UpsertCustomerSatisfactionSurveyInput = {
	id?: string | null;
	csatId: string;
	title: string;
	sequence: string;
	questionPrompt: string;
	internalDescription: string;
	respondType: SatisfactionRespondType | "";
};

export type ReviewCustomerSatisfactionSurveyInput = {
	surveyId: string;
	decision: "approve" | "reject";
	reason: string;
};

type ReviewCommentValue = {
	root: {
		type: string;
		version: number;
		format: string;
		indent: number;
		direction: "ltr" | "rtl" | null;
		children: unknown[];
	};
};

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

function normalizeRoleMenus(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];
	return [...new Set(value
		.filter((menu): menu is string => typeof menu == "string")
		.map(menu => menu.trim().toLowerCase())
		.filter(menu => menu.length > 0))];
}

async function resolveUserRoleMenus(
	payload: Awaited<ReturnType<typeof getPayload>>,
	user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>
): Promise<string[]> {
	const rawRole = user.role;
	if(rawRole != null && typeof rawRole == "object" && "menus" in rawRole)
		return normalizeRoleMenus(rawRole.menus);

	const roleId = getRelationshipId(rawRole);
	if(roleId == null)
		return [];

	const role = await payload.findByID({
		collection: "roles",
		id: roleId,
		user,
		overrideAccess: true,
		trash: true,
		depth: 0,
		select: {
			menus: true
		}
	});

	return normalizeRoleMenus(role.menus);
}

function hasAnyMenu(menus: string[], allowed: Set<string>): boolean {
	return menus.some(menu => allowed.has(menu));
}

async function assertEditorCustomerSatisfactionAccess(
	payload: Awaited<ReturnType<typeof getPayload>>,
	user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>
): Promise<void> {
	const menus = await resolveUserRoleMenus(payload, user);
	if(!hasAnyMenu(menus, EDITOR_ACCESS_MENUS))
		unauthorized();
}

async function assertApproverCustomerSatisfactionAccess(
	payload: Awaited<ReturnType<typeof getPayload>>,
	user: NonNullable<Awaited<ReturnType<typeof payload.auth>>["user"]>
): Promise<void> {
	const menus = await resolveUserRoleMenus(payload, user);
	if(!hasAnyMenu(menus, APPROVER_ACCESS_MENUS))
		unauthorized();
}

type SatisfactionSurveyDoc = {
	id: string;
	csatId?: string | null;
	csatDescription?: string | null;
	sequence?: number | null;
	inputType?: string | null;
	freeText1?: string | null;
	description?: unknown;
	option1Desc?: string | null;
	option2Desc?: string | null;
	option3Desc?: string | null;
	option4Desc?: string | null;
	option5Desc?: string | null;
	isActive?: boolean | null;
	updatedAt: string;
	updatedBy?: unknown;
	reviewedAt?: string | null;
	reviewedBy?: unknown;
	reviewApproved?: boolean | null;
	_status?: "draft" | "published" | null;
	deletedAt?: string | null;
	reviewComment?: ReviewCommentValue | null;
};

function plainTextToReviewComment(value: string): ReviewCommentValue {
	const text = value.trim();
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
					children: text.length == 0 ? [] : [
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

async function findUsersByIds(
	payload: Awaited<ReturnType<typeof getPayload>>,
	user: User,
	ids: string[]
): Promise<Map<string, Pick<User, "name" | "email">>> {
	if(ids.length == 0)
		return new Map();

	const users = await payload.find({
		collection: "users",
		user,
		overrideAccess: true,
		pagination: false,
		depth: 0,
		limit: Math.max(ids.length, 1),
		where: {
			id: {
				in: ids
			}
		},
		select: {
			name: true,
			email: true
		}
	});

	const map = new Map<string, Pick<User, "name" | "email">>();
	for(const doc of users.docs)
		map.set(String(doc.id), { name: doc.name, email: doc.email });
	return map;
}

async function assertSequenceAvailability(
	payload: Awaited<ReturnType<typeof getPayload>>,
	user: User,
	sequence: number,
	currentId?: string
) {
	const existing = await payload.find({
		collection: COLLECTION,
		user,
		overrideAccess: true,
		trash: true,
		pagination: false,
		limit: 1,
		where: {
			and: [
				{ sequence: { equals: sequence } },
				{ isActive: { equals: true } },
				{ deletedAt: { exists: false } },
				...(currentId != null ? [{ id: { not_equals: currentId } }] : [])
			]
		},
		select: { id: true }
	});

	if(existing.docs.length > 0)
		throw new Error(`Sequence ${sequence} is already used by another active question.`);
}

function resolveApprovalState(doc: SatisfactionSurveyDoc): CustomerSatisfactionSurveyRow["approvalState"] {
	if(doc.reviewedAt == null)
		return "pending";
	if(doc.reviewApproved == true)
		return "approved";
	if(doc.reviewApproved == false)
		return "rejected";
	return "none";
}

export async function queryCustomerSatisfactionSurveysAction(
	input: QueryCustomerSatisfactionSurveysInput
): Promise<QueryCustomerSatisfactionSurveysOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	if(input.mode == "approver")
		await assertApproverCustomerSatisfactionAccess(payload, user);
	else
		await assertEditorCustomerSatisfactionAccess(payload, user);

	const pageSize = Number.isFinite(input.limit) ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(input.limit))) : MAX_PAGE_SIZE;
	const pageNumber = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page)) : 1;
	const normalizedKeyword = input.keyword.trim();
	const includeSoftDeleted = input.includeSoftDeleted ?? false;

	const whereClauses: Where[] = [];

	if(input.mode == "approver") {
		whereClauses.push({ reviewedAt: { exists: false } });
		whereClauses.push({ _status: { equals: "draft" } });
	}

	if(!includeSoftDeleted) {
		whereClauses.push({
			or: [
				{ deletedAt: { exists: false } },
				{ _status: { equals: "draft" } }
			]
		});
	}

	if(normalizedKeyword.length > 0) {
		whereClauses.push({
			or: [
				{ csatId: { like: normalizedKeyword } },
				{ csatDescription: { like: normalizedKeyword } },
				{ freeText1: { like: normalizedKeyword } }
			]
		});
	}

	let where: Where | undefined;
	if(whereClauses.length == 1)
		where = whereClauses[0];
	else if(whereClauses.length > 1)
		where = { and: whereClauses };

	const result = await payload.find({
		collection: COLLECTION,
		user,
		overrideAccess: true,
		draft: true,
		trash: true,
		page: pageNumber,
		limit: pageSize,
		sort: "-updatedAt",
		depth: 0,
		...(where != null ? { where } : {}),
		select: {
			csatId: true,
			csatDescription: true,
			sequence: true,
			inputType: true,
			freeText1: true,
			option1Desc: true,
			option2Desc: true,
			option3Desc: true,
			option4Desc: true,
			option5Desc: true,
			isActive: true,
			updatedAt: true,
			updatedBy: true,
			reviewedAt: true,
			reviewedBy: true,
			reviewApproved: true,
			_status: true,
			deletedAt: true
		}
	});

	const userIds = new Set<string>();
	for(const doc of result.docs) {
		const u = getRelationshipId(doc.updatedBy);
		const r = getRelationshipId(doc.reviewedBy);
		if(u != null)
			userIds.add(u);
		if(r != null)
			userIds.add(r);
	}
	const usersById = await findUsersByIds(payload, user, [...userIds]);

	const docs: CustomerSatisfactionSurveyRow[] = result.docs.map(rawDoc => {
		const doc = rawDoc as unknown as SatisfactionSurveyDoc;
		const csatId = doc.csatId != null && doc.csatId.length > 0 ?
			doc.csatId :
			`CST-${String(doc.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`;
		const updatedById = getRelationshipId(doc.updatedBy);
		const reviewedById = getRelationshipId(doc.reviewedBy);
		const respondType = doc.inputType == "option" ? "option" : "free_text";
		const questionPrompt = doc.freeText1?.trim() ?? "";
		const optionValues = [doc.option1Desc, doc.option2Desc, doc.option3Desc, doc.option4Desc, doc.option5Desc]
			.map(value => value?.trim() ?? "")
			.filter(value => value.length > 0);
		return {
			id: String(doc.id),
			csatId,
			title: doc.csatDescription ?? "",
			sequence: doc.sequence ?? null,
			questionPrompt,
			internalDescription: optionValues.length > 0 ? optionValues.join(" | ") : "",
			respondType,
			updatedAt: doc.updatedAt,
			updatedByLabel: updatedById != null ? (usersById.get(updatedById)?.name ?? updatedById) : "-",
			reviewedAt: doc.reviewedAt ?? null,
			reviewedByLabel: reviewedById != null ? (usersById.get(reviewedById)?.name ?? reviewedById) : "-",
			approvalState: resolveApprovalState(doc),
			_status: doc._status ?? null,
			isSoftDeleted: doc.deletedAt != null && doc._status == "published"
		};
	});

	return {
		docs,
		totalDocs: result.totalDocs,
		page: result.page ?? pageNumber,
		hasNextPage: result.hasNextPage,
		hasPreviousPage: result.hasPrevPage ?? false
	};
}

export async function queryCustomerSatisfactionSurveysEditorAction(
	input: Omit<QueryCustomerSatisfactionSurveysInput, "mode">
): Promise<QueryCustomerSatisfactionSurveysOutput> {
	return queryCustomerSatisfactionSurveysAction({
		...input,
		mode: "editor"
	});
}

export async function queryCustomerSatisfactionSurveysApproverAction(
	input: Omit<QueryCustomerSatisfactionSurveysInput, "mode">
): Promise<QueryCustomerSatisfactionSurveysOutput> {
	return queryCustomerSatisfactionSurveysAction({
		...input,
		mode: "approver",
		includeSoftDeleted: false
	});
}

export async function upsertCustomerSatisfactionSurveyDraftAction(
	input: UpsertCustomerSatisfactionSurveyInput
): Promise<{ id: string }> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	await assertEditorCustomerSatisfactionAccess(payload, user);

	const title = input.title.trim();
	if(title.length == 0)
		throw new Error("Description is required.");
	const csatId = input.csatId.trim();
	if(csatId.length == 0)
		throw new Error("CSAT ID is required.");
	if(csatId.length > 20)
		throw new Error("CSAT ID must be at most 20 characters.");
	if(title.length > 120)
		throw new Error("Description must be at most 120 characters.");
	if(input.sequence.trim().length == 0)
		throw new Error("Sequence is required.");
	if(input.respondType.length == 0)
		throw new Error("Respond type is required.");
	if(input.respondType != "free_text" && input.respondType != "option")
		throw new Error("Only free_text and option are supported in this version.");

	const sequenceValue = Number.parseInt(input.sequence.trim(), 10);
	if(!Number.isFinite(sequenceValue) || sequenceValue < 1 || sequenceValue > 5)
		throw new Error("Sequence must be between 1 and 5.");
	await assertSequenceAvailability(payload, user, sequenceValue, input.id?.trim());

	if(input.id != null && input.id.trim().length > 0) {
		const existing = await payload.findByID({
			collection: COLLECTION,
			id: input.id.trim(),
			user,
			overrideAccess: true,
			trash: true,
			depth: 0,
			showHiddenFields: true
		});
		if(existing.reviewedAt != null && existing.reviewApproved != false)
			throw new Error("Cannot edit a survey that has already been approved.");

		await payload.update({
			collection: COLLECTION,
			id: input.id.trim(),
			user,
			overrideAccess: true,
			trash: true,
			data: {
				csatId,
				csatDescription: title,
				sequence: sequenceValue,
				inputType: input.respondType,
				freeText1: input.questionPrompt.trim(),
				option1Desc: input.respondType == "option" ? "1" : null,
				option2Desc: input.respondType == "option" ? "2" : null,
				option3Desc: input.respondType == "option" ? "3" : null,
				option4Desc: input.respondType == "option" ? "4" : null,
				option5Desc: input.respondType == "option" ? "5" : null,
				reviewedAt: null,
				reviewedBy: null,
				reviewApproved: null,
				reviewComment: null
			}
		});
		return { id: input.id.trim() };
	}

	const created = await payload.create({
		collection: COLLECTION,
		user,
		overrideAccess: true,
		data: {
			_status: "draft",
			isActive: true,
			csatId,
			csatDescription: title,
			sequence: sequenceValue,
			inputType: input.respondType,
			freeText1: input.questionPrompt.trim(),
			option1Desc: input.respondType == "option" ? "1" : null,
			option2Desc: input.respondType == "option" ? "2" : null,
			option3Desc: input.respondType == "option" ? "3" : null,
			option4Desc: input.respondType == "option" ? "4" : null,
			option5Desc: input.respondType == "option" ? "5" : null,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});

	return { id: String(created.id) };
}

export async function reviewCustomerSatisfactionSurveyAction(
	input: ReviewCustomerSatisfactionSurveyInput
): Promise<{ surveyId: string, decision: "approve" | "reject" }> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();

	await assertApproverCustomerSatisfactionAccess(payload, user);

	const surveyId = input.surveyId.trim();
	if(surveyId.length == 0)
		throw new Error("Survey is required.");

	const survey = await payload.findByID({
		collection: COLLECTION,
		id: surveyId,
		user,
		overrideAccess: true,
		trash: true,
		depth: 0,
		showHiddenFields: true
	});

	if(survey.reviewedAt != null)
		throw new Error("This survey has already been reviewed.");
	if(input.decision != "approve" && input.decision != "reject")
		throw new Error("Invalid review decision.");

	const now = new Date().toISOString();
	const reviewComment = plainTextToReviewComment(input.reason);

	if(input.decision == "reject") {
		await payload.update({
			collection: COLLECTION,
			id: surveyId,
			user,
			overrideAccess: true,
			trash: true,
			data: {
				_status: "draft",
				reviewedAt: now,
				reviewedBy: user.id,
				reviewApproved: false,
				reviewComment
			}
		});
		return { surveyId, decision: "reject" };
	}

	await payload.update({
		collection: COLLECTION,
		id: surveyId,
		user,
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

	return { surveyId, decision: "approve" };
}
