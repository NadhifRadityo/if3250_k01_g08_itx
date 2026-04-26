"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";
import payloadConfig from "@payload-config";
import type { User, SurveyQuestionDetail } from "@/payload-types";

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const RELATION_SEARCH_LIMIT = 20;

type ReviewCommentValue = NonNullable<SurveyQuestionDetail["reviewComment"]>;
const defaultReviewComment: ReviewCommentValue = { root: { type: "root", version: 1, format: "", indent: 0, direction: null, children: [{ type: "paragraph", version: 1, format: "", indent: 0, direction: null, children: [] }] } };

export type SurveyDetailTableRow = {
	id: string;
	headerId: string | null;
	headerTitle: string;
	questionId: string;
	description: string;
	typeOfAnswer: "freetext" | "option";
	valueFreeText: string;
	valueOptions: string[];
	isSoftDeleted: boolean;
	createdById: string | null;
	updatedById: string | null;
	deletedById: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	reviewedAt: string | null;
	reviewedById: string | null;
	reviewApproved: boolean | null;
	reviewCommentText: string;
};

export type SurveyDetailFormState = {
	detailId: string | null;
	headerId: string | null;
	questionId: string;
	description: string;
	typeOfAnswer: "freetext" | "option";
	valueFreeText: string;
	valueOptions: string[];
};

export type SurveyDetailRelationValues = Partial<Record<"createdBy" | "updatedBy" | "deletedBy" | "reviewedBy" | "questionHeader", string>>;

export type QuerySurveyDetailsOutput = {
	docs: SurveyDetailTableRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type QuerySurveyDetailsInput = {
	keyword: string;
	page: number;
	limit?: number;
	mode: "maker" | "checker";
};

export type ReviewSurveyDetailInput = {
	detailId: string;
	decision: "approve" | "reject";
	reason: string;
};

export type SurveyDetailReviewDiffItem = {
	field: string;
	label: string;
	previousValue: string;
	requestedValue: string;
	changed: boolean;
};

export type SurveyDetailReviewDiff = {
	requestId: string;
	requestType: string;
	items: SurveyDetailReviewDiffItem[];
	changedCount: number;
};

export type SurveyDetailDetailsOutput = {
	row: SurveyDetailTableRow;
	relationValues: SurveyDetailRelationValues;
};

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string") return value;
	if(value != null && typeof value == "object" && "id" in value && typeof (value as { id: unknown }).id == "string") return (value as { id: string }).id;
	return null;
}

function clampPageSize(limit?: number): number {
	if(limit == null || !Number.isFinite(limit)) return PAGE_SIZE;
	return Math.min(Math.max(1, Math.floor(limit)), MAX_PAGE_SIZE);
}

function richTextToPlainText(value: unknown): string {
	if(value == null || typeof value != "object") return "";
	const root = (value as { root?: { children?: unknown[] } }).root;
	if(root == null) return "";
	const extractText = (children: unknown[]): string =>
		children.map(child => {
			if(child == null || typeof child != "object") return "";
			const node = child as { text?: string; children?: unknown[] };
			if(typeof node.text == "string") return node.text;
			if(Array.isArray(node.children)) return extractText(node.children);
			return "";
		}).join("");
	return extractText(root.children ?? []);
}

function plainTextToReviewComment(text: string): ReviewCommentValue {
	const trimmed = text.trim();
	if(trimmed.length == 0) return defaultReviewComment;
	return { root: { type: "root", version: 1, format: "", indent: 0, direction: null, children: [{ type: "paragraph", version: 1, format: "", indent: 0, direction: null, children: [{ type: "text", version: 1, text: trimmed, format: 0, style: "", mode: "normal", detail: 0 }] }] } };
}

function formatReviewDateValue(value: string | null | undefined): string {
	if(value == null) return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime())) return value;
	return `${date.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })} ${date.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", hour12: false })}`;
}

async function findUsersByIds(payload: Payload, user: User, ids: string[]): Promise<Map<string, { name: string; email: string }>> {
	if(ids.length == 0) return new Map();
	const result = await payload.find({ collection: "users", user, overrideAccess: false, pagination: false, depth: 0, limit: Math.max(ids.length, 1), where: { id: { in: ids } }, select: { name: true, email: true } });
	const map = new Map<string, { name: string; email: string }>();
	for(const doc of result.docs) map.set(String(doc.id), { name: doc.name, email: doc.email });
	return map;
}

async function findSurveyTitles(payload: Payload, user: User, ids: string[]): Promise<Map<string, string>> {
	if(ids.length == 0) return new Map();
	const result = await payload.find({ collection: "surveys", user, overrideAccess: false, pagination: false, depth: 0, limit: Math.max(ids.length, 1), where: { id: { in: ids } }, select: { title: true } });
	const map = new Map<string, string>();
	for(const doc of result.docs) map.set(String(doc.id), typeof doc.title == "string" ? doc.title : String(doc.id));
	return map;
}

function docToRow(doc: Record<string, unknown>, surveyTitlesById: Map<string, string>): SurveyDetailTableRow {
	const headerId = getRelationshipId(doc.questionHeader);
	const createdById = getRelationshipId(doc.createdBy);
	const updatedById = getRelationshipId(doc.updatedBy);
	const deletedById = getRelationshipId(doc.deletedBy);
	const reviewedById = getRelationshipId(doc.reviewedBy);
	const typeOfAnswer = doc.typeOfAnswer == "option" ? "option" : "freetext";
	const rawOptions = Array.isArray(doc.valueOptions) ? doc.valueOptions : [];
	const valueOptions = rawOptions.map(opt => {
		if(typeof opt == "object" && opt != null && "value" in opt) return String((opt as { value: unknown }).value);
		return String(opt);
	}).filter(v => v.length > 0);
	return {
		id: String(doc.id),
		headerId,
		headerTitle: headerId != null ? (surveyTitlesById.get(headerId) ?? headerId) : "-",
		questionId: typeof doc.questionId == "string" ? doc.questionId : "",
		description: typeof doc.description == "string" ? doc.description : "",
		typeOfAnswer,
		valueFreeText: typeof doc.valueFreeText == "string" ? doc.valueFreeText : "",
		valueOptions,
		isSoftDeleted: doc.deletedAt != null && doc._status == "published",
		createdById,
		updatedById,
		deletedById,
		createdAt: typeof doc.createdAt == "string" ? doc.createdAt : "",
		updatedAt: typeof doc.updatedAt == "string" ? doc.updatedAt : "",
		deletedAt: typeof doc.deletedAt == "string" ? doc.deletedAt : null,
		reviewedAt: typeof doc.reviewedAt == "string" ? doc.reviewedAt : null,
		reviewedById,
		reviewApproved: typeof doc.reviewApproved == "boolean" ? doc.reviewApproved : null,
		reviewCommentText: richTextToPlainText(doc.reviewComment)
	};
}

const DETAIL_SELECT = { questionHeader: true, questionId: true, description: true, typeOfAnswer: true, valueFreeText: true, valueOptions: true, createdBy: true, updatedBy: true, deletedBy: true, createdAt: true, updatedAt: true, deletedAt: true, _status: true, reviewedAt: true, reviewedBy: true, reviewApproved: true, reviewComment: true } as const;

async function docsToRows(payload: Payload, user: User, docs: Record<string, unknown>[]): Promise<SurveyDetailTableRow[]> {
	const headerIds = [...new Set(docs.map(d => getRelationshipId(d.questionHeader)).filter((id): id is string => id != null))];
	const surveyTitlesById = await findSurveyTitles(payload, user, headerIds);
	return docs.map(doc => docToRow(doc, surveyTitlesById));
}

export async function querySurveyDetailsMakerAction(input: Omit<QuerySurveyDetailsInput, "mode">): Promise<QuerySurveyDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const pageSize = clampPageSize(input.limit);
	const pageNumber = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page)) : 1;
	const normalizedKeyword = input.keyword.trim();

	const where: Where = {
		and: [
			...(normalizedKeyword.length > 0 ? [{ or: [{ questionId: { like: normalizedKeyword } }, { description: { like: normalizedKeyword } }] }] as Where[] : [])
		]
	};

	const result = await payload.find({ collection: "survey-question-details", user, overrideAccess: false, draft: true, trash: true, page: pageNumber, limit: pageSize, sort: "-updatedAt", depth: 0, where, select: DETAIL_SELECT });
	const docs = await docsToRows(payload, user, result.docs as unknown as Record<string, unknown>[]);
	return { docs, totalDocs: result.totalDocs, page: result.page ?? pageNumber, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPrevPage };
}

export async function querySurveyDetailsCheckerAction(input: Omit<QuerySurveyDetailsInput, "mode">): Promise<QuerySurveyDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const pageSize = clampPageSize(input.limit);
	const pageNumber = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page)) : 1;
	const normalizedKeyword = input.keyword.trim();

	const where: Where = {
		and: [
			{ reviewedAt: { exists: false } },
			{ _status: { equals: "draft" } },
			...(normalizedKeyword.length > 0 ? [{ or: [{ questionId: { like: normalizedKeyword } }, { description: { like: normalizedKeyword } }] }] as Where[] : [])
		]
	};

	const result = await payload.find({ collection: "survey-question-details", user, overrideAccess: false, draft: true, trash: true, page: pageNumber, limit: pageSize, sort: "-updatedAt", depth: 0, where, select: DETAIL_SELECT });
	const docs = await docsToRows(payload, user, result.docs as unknown as Record<string, unknown>[]);
	return { docs, totalDocs: result.totalDocs, page: result.page ?? pageNumber, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPrevPage };
}

export async function resolveSurveyDetailRelationColumnsAction(rows: Array<Pick<SurveyDetailTableRow, "id" | "headerId" | "createdById" | "updatedById" | "deletedById" | "reviewedById">>): Promise<Array<{ id: string; values: SurveyDetailRelationValues }>> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(rows.length == 0) return [];
	const userIds = new Set<string>();
	const headerIds = new Set<string>();
	for(const row of rows) {
		if(row.createdById != null) userIds.add(row.createdById);
		if(row.updatedById != null) userIds.add(row.updatedById);
		if(row.deletedById != null) userIds.add(row.deletedById);
		if(row.reviewedById != null) userIds.add(row.reviewedById);
		if(row.headerId != null) headerIds.add(row.headerId);
	}
	const [usersById, titlesById] = await Promise.all([findUsersByIds(payload, user, [...userIds]), findSurveyTitles(payload, user, [...headerIds])]);
	return rows.map(row => ({
		id: row.id,
		values: {
			questionHeader: row.headerId != null ? (titlesById.get(row.headerId) ?? "-") : "-",
			createdBy: row.createdById != null ? (usersById.get(row.createdById)?.name ?? "-") : "-",
			updatedBy: row.updatedById != null ? (usersById.get(row.updatedById)?.name ?? "-") : "-",
			deletedBy: row.deletedById != null ? (usersById.get(row.deletedById)?.name ?? "-") : "-",
			reviewedBy: row.reviewedById != null ? (usersById.get(row.reviewedById)?.name ?? "-") : "-"
		}
	}));
}

export async function upsertSurveyDetailAction(input: SurveyDetailFormState) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const questionId = input.questionId.trim();
	const description = input.description.trim();
	if(questionId.length == 0) throw new Error("Question ID is required.");
	if(description.length == 0) throw new Error("Description is required.");
	if(input.headerId == null || input.headerId.trim().length == 0) throw new Error("Question Header is required.");
	const valueOptions = input.typeOfAnswer == "option" ? input.valueOptions.filter(v => v.trim().length > 0).slice(0, 10).map(v => ({ value: v })) : [];
	const valueFreeText = input.typeOfAnswer == "freetext" ? input.valueFreeText : "";
	const data = { _status: "draft" as const, questionHeader: input.headerId, questionId, description, typeOfAnswer: input.typeOfAnswer, valueFreeText, valueOptions, deletedAt: null, deletedBy: null, reviewedAt: null, reviewedBy: null, reviewApproved: null, reviewComment: null };
	if(input.detailId == null) {
		const created = await payload.create({ collection: "survey-question-details", user, overrideAccess: true, data: { ...data, createdBy: user.id, updatedBy: user.id } });
		return { detailId: created.id };
	}
	await payload.update({ collection: "survey-question-details", user, overrideAccess: true, trash: true, id: input.detailId, data: { ...data, updatedBy: user.id } });
	return { detailId: input.detailId };
}

export async function requestDeleteSurveyDetailAction(detailId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	await payload.update({ collection: "survey-question-details", user, overrideAccess: true, trash: true, id: detailId, data: { _status: "draft", deletedAt: new Date().toISOString(), deletedBy: user.id, reviewedAt: null, reviewedBy: null, reviewApproved: null, reviewComment: null } });
	return { detailId };
}

export async function cancelSurveyDetailRequestAction(detailId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const doc = await payload.findByID({ collection: "survey-question-details", user, overrideAccess: true, trash: true, id: detailId, depth: 0 });
	if((doc.reviewedAt != null) && doc.reviewApproved != false) throw new Error("Cannot cancel an approved request.");
	const approvedVersions = await payload.findVersions({ user, collection: "survey-question-details", overrideAccess: true, trash: true, pagination: false, limit: 1, sort: "-updatedAt", where: { and: [{ parent: { equals: detailId } }, { "version._status": { equals: "published" } }] }, select: { version: { questionHeader: true, questionId: true, description: true, typeOfAnswer: true, valueFreeText: true, valueOptions: true, deletedAt: true, deletedBy: true, reviewedAt: true, reviewedBy: true, reviewApproved: true, reviewComment: true, _status: true } } });
	const approvedVersion = approvedVersions.docs[0]?.version;
	if(approvedVersion == null) {
		await payload.update({ collection: "survey-question-details", user, overrideAccess: true, trash: true, id: detailId, data: { _status: "draft", deletedAt: new Date().toISOString(), deletedBy: user.id, reviewedAt: null, reviewedBy: null, reviewApproved: null, reviewComment: null } });
		return { detailId, softDeleted: true };
	}
	const av = approvedVersion as unknown as Record<string, unknown>;
	await payload.update({ collection: "survey-question-details", user, overrideAccess: true, trash: true, id: detailId, data: { _status: "published", questionHeader: getRelationshipId(av.questionHeader) ?? undefined, questionId: String(av.questionId ?? ""), description: String(av.description ?? ""), typeOfAnswer: av.typeOfAnswer as "freetext" | "option" ?? "freetext", valueFreeText: String(av.valueFreeText ?? ""), valueOptions: Array.isArray(av.valueOptions) ? av.valueOptions as { value: string }[] : [], deletedAt: av.deletedAt ? String(av.deletedAt) : null, deletedBy: getRelationshipId(av.deletedBy), reviewedAt: av.reviewedAt ? String(av.reviewedAt) : null, reviewedBy: getRelationshipId(av.reviewedBy), reviewApproved: typeof av.reviewApproved == "boolean" ? av.reviewApproved : null, reviewComment: av.reviewComment ?? defaultReviewComment } });
	return { detailId, softDeleted: false };
}

export async function reviewSurveyDetailAction({ detailId, decision, reason }: ReviewSurveyDetailInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const doc = await payload.findByID({ collection: "survey-question-details", user, overrideAccess: true, trash: true, id: detailId, depth: 0 });
	if(doc.reviewedAt != null) throw new Error("This request has already been reviewed.");
	const now = new Date().toISOString();
	const reviewComment = plainTextToReviewComment(reason);
	await payload.update({ collection: "survey-question-details", user, overrideAccess: true, trash: true, id: detailId, data: { _status: decision == "approve" ? "published" : "draft", reviewedAt: now, reviewedBy: user.id, reviewApproved: decision == "approve", reviewComment } });
	return { detailId, decision };
}

export async function getSurveyDetailReviewDiffAction(detailId: string): Promise<SurveyDetailReviewDiff> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const doc = await payload.findByID({ collection: "survey-question-details", user, overrideAccess: true, trash: true, id: detailId, depth: 0 });
	const approvedVersions = await payload.findVersions({ collection: "survey-question-details", user, overrideAccess: true, trash: true, pagination: false, limit: 1, sort: "-updatedAt", where: { and: [{ parent: { equals: detailId } }, { "version._status": { equals: "published" } }] }, select: { version: { questionId: true, description: true, typeOfAnswer: true, valueFreeText: true, valueOptions: true, deletedAt: true } } });
	const approvedVersion = approvedVersions.docs[0]?.version as unknown as Record<string, unknown> | undefined;
	const requestType = doc.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";
	const headerIds = [getRelationshipId(doc.questionHeader)].filter((id): id is string => id != null);
	const titlesById = await findSurveyTitles(payload, user, headerIds);
	const headerId = getRelationshipId(doc.questionHeader);
	const currentHeaderTitle = headerId != null ? (titlesById.get(headerId) ?? headerId) : "-";
	const approvedOptions = Array.isArray(approvedVersion?.valueOptions) ? (approvedVersion.valueOptions as { value?: string }[]).map(o => o?.value ?? "").filter(v => v.length > 0).join(", ") : "-";
	const currentOptions = Array.isArray(doc.valueOptions) ? (doc.valueOptions as { value?: string }[]).map(o => o?.value ?? "").filter(v => v.length > 0).join(", ") : "";
	const baseItems = [
		{ field: "questionHeader", label: "Question Header", previousValue: "-", requestedValue: currentHeaderTitle },
		{ field: "questionId", label: "Question ID", previousValue: (approvedVersion?.questionId as string | undefined) ?? "-", requestedValue: doc.questionId ?? "" },
		{ field: "description", label: "Description", previousValue: (approvedVersion?.description as string | undefined) ?? "-", requestedValue: doc.description ?? "" },
		{ field: "typeOfAnswer", label: "Type of Answer", previousValue: (approvedVersion?.typeOfAnswer as string | undefined) ?? "-", requestedValue: doc.typeOfAnswer ?? "" },
		{ field: "valueFreeText", label: "Value (Free Text)", previousValue: (approvedVersion?.valueFreeText as string | undefined) ?? "-", requestedValue: doc.valueFreeText ?? "" },
		{ field: "valueOptions", label: "Value Options", previousValue: approvedOptions, requestedValue: currentOptions },
		{ field: "deletedAt", label: "Deleted At", previousValue: formatReviewDateValue(approvedVersion?.deletedAt as string | undefined), requestedValue: formatReviewDateValue(doc.deletedAt) }
	];
	const items: SurveyDetailReviewDiffItem[] = baseItems.map(item => ({ ...item, changed: item.previousValue != item.requestedValue }));
	return { requestId: detailId, requestType, items, changedCount: items.filter(i => i.changed).length };
}

export async function getSurveyDetailDetailsAction(detailId: string): Promise<SurveyDetailDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const doc = await payload.findByID({ collection: "survey-question-details", user, overrideAccess: false, draft: true, trash: true, id: detailId, depth: 0, select: DETAIL_SELECT });
	const headerId = getRelationshipId((doc as unknown as Record<string, unknown>).questionHeader);
	const headerIds = headerId != null ? [headerId] : [];
	const surveyTitlesById = await findSurveyTitles(payload, user, headerIds);
	const row = docToRow(doc as unknown as Record<string, unknown>, surveyTitlesById);
	const userIds = [row.createdById, row.updatedById, row.deletedById, row.reviewedById].filter((id): id is string => id != null);
	const usersById = await findUsersByIds(payload, user, [...new Set(userIds)]);
	const relationValues: SurveyDetailRelationValues = {
		questionHeader: headerId != null ? (surveyTitlesById.get(headerId) ?? "-") : "-",
		createdBy: row.createdById != null ? (usersById.get(row.createdById)?.name ?? "-") : "-",
		updatedBy: row.updatedById != null ? (usersById.get(row.updatedById)?.name ?? "-") : "-",
		deletedBy: row.deletedById != null ? (usersById.get(row.deletedById)?.name ?? "-") : "-",
		reviewedBy: row.reviewedById != null ? (usersById.get(row.reviewedById)?.name ?? "-") : "-"
	};
	return { row, relationValues };
}

export async function searchSurveyDetailHeaderOptionsAction(keyword: string, selectedIds: string[] = []): Promise<Array<{ id: string; title: string }>> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = [...new Set(selectedIds.map(id => id.trim()).filter(id => id.length > 0))];
	const whereTerms: Where[] = [];
	if(normalizedKeyword.length > 0) whereTerms.push({ or: [{ id: { like: normalizedKeyword } }, { title: { like: normalizedKeyword } }] });
	if(normalizedSelectedIds.length > 0) whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? undefined : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };
	const result = await payload.find({ collection: "surveys", user, overrideAccess: false, pagination: false, depth: 0, limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length, sort: "title", select: { title: true }, ...(where != null ? { where } : {}) });
	return result.docs.map(doc => ({ id: String(doc.id), title: typeof doc.title == "string" ? doc.title : String(doc.id) }));
}
