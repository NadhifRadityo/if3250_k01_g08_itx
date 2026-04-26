"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";
import payloadConfig from "@payload-config";
import type { User, Survey } from "@/payload-types";

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const RELATION_SEARCH_LIMIT = 20;

type ReviewCommentValue = NonNullable<Survey["reviewComment"]>;
const defaultReviewComment: ReviewCommentValue = { root: { type: "root", version: 1, format: "", indent: 0, direction: null, children: [{ type: "paragraph", version: 1, format: "", indent: 0, direction: null, children: [] }] } };

export type SurveyHeaderTableRow = {
	id: string;
	parentDescription: string;
	product: string;
	isActive: string;
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

export type SurveyHeaderFormState = {
	headerId: string | null;
	parentDescription: string;
	product: string;
	isActive: "yes" | "no";
};

export type SurveyHeaderRelationValues = Partial<Record<"createdBy" | "updatedBy" | "deletedBy" | "reviewedBy", string>>;

export type QuerySurveyHeadersOutput = {
	docs: SurveyHeaderTableRow[];
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type QuerySurveyHeadersInput = {
	keyword: string;
	page: number;
	limit?: number;
	mode: "maker" | "checker";
	includeSoftDeleted?: boolean;
};

export type ReviewSurveyHeaderInput = {
	headerId: string;
	decision: "approve" | "reject";
	reason: string;
};

export type SurveyHeaderReviewDiffItem = {
	field: string;
	label: string;
	previousValue: string;
	requestedValue: string;
	changed: boolean;
};

export type SurveyHeaderReviewDiff = {
	requestId: string;
	requestType: string;
	items: SurveyHeaderReviewDiffItem[];
	changedCount: number;
};

export type SurveyHeaderDetailsOutput = {
	row: SurveyHeaderTableRow;
	relationValues: SurveyHeaderRelationValues;
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

function docToRow(doc: Record<string, unknown>): SurveyHeaderTableRow {
	const createdById = getRelationshipId(doc.createdBy);
	const updatedById = getRelationshipId(doc.updatedBy);
	const deletedById = getRelationshipId(doc.deletedBy);
	const reviewedById = getRelationshipId(doc.reviewedBy);
	return {
		id: String(doc.id),
		parentDescription: typeof doc.title == "string" ? doc.title : "",
		product: typeof doc.product == "string" ? doc.product : "",
		isActive: doc.isActive === "no" ? "no" : "yes",
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

export async function querySurveyHeadersMakerAction(input: Omit<QuerySurveyHeadersInput, "mode">): Promise<QuerySurveyHeadersOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const pageSize = clampPageSize(input.limit);
	const pageNumber = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page)) : 1;
	const normalizedKeyword = input.keyword.trim();
	const includeSoftDeleted = input.includeSoftDeleted ?? true;

	const where: Where = {
		and: [
			...(includeSoftDeleted ? [] : [{ or: [{ deletedAt: { exists: false } }, { _status: { equals: "draft" } }] }] as Where[]),
			...(normalizedKeyword.length > 0 ? [{ or: [{ title: { like: normalizedKeyword } }, { product: { like: normalizedKeyword } }] }] as Where[] : [])
		]
	};

	const result = await payload.find({ collection: "surveys", user, overrideAccess: false, draft: true, trash: true, page: pageNumber, limit: pageSize, sort: "-updatedAt", depth: 0, where, select: { title: true, product: true, isActive: true, createdBy: true, updatedBy: true, deletedBy: true, createdAt: true, updatedAt: true, deletedAt: true, _status: true, reviewedAt: true, reviewedBy: true, reviewApproved: true, reviewComment: true } });

	const docs = result.docs.map(doc => docToRow(doc as unknown as Record<string, unknown>));
	return { docs, totalDocs: result.totalDocs, page: result.page ?? pageNumber, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPrevPage };
}

export async function querySurveyHeadersCheckerAction(input: Omit<QuerySurveyHeadersInput, "mode">): Promise<QuerySurveyHeadersOutput> {
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
			...(normalizedKeyword.length > 0 ? [{ or: [{ title: { like: normalizedKeyword } }, { product: { like: normalizedKeyword } }] }] as Where[] : [])
		]
	};

	const result = await payload.find({ collection: "surveys", user, overrideAccess: false, draft: true, trash: true, page: pageNumber, limit: pageSize, sort: "-updatedAt", depth: 0, where, select: { title: true, product: true, isActive: true, createdBy: true, updatedBy: true, deletedBy: true, createdAt: true, updatedAt: true, deletedAt: true, _status: true, reviewedAt: true, reviewedBy: true, reviewApproved: true, reviewComment: true } });

	const docs = result.docs.map(doc => docToRow(doc as unknown as Record<string, unknown>));
	return { docs, totalDocs: result.totalDocs, page: result.page ?? pageNumber, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPrevPage };
}

export async function resolveSurveyHeaderRelationColumnsAction(rows: Array<Pick<SurveyHeaderTableRow, "id" | "createdById" | "updatedById" | "deletedById" | "reviewedById">>): Promise<Array<{ id: string; values: SurveyHeaderRelationValues }>> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	if(rows.length == 0) return [];
	const userIds = new Set<string>();
	for(const row of rows) {
		if(row.createdById != null) userIds.add(row.createdById);
		if(row.updatedById != null) userIds.add(row.updatedById);
		if(row.deletedById != null) userIds.add(row.deletedById);
		if(row.reviewedById != null) userIds.add(row.reviewedById);
	}
	const usersById = await findUsersByIds(payload, user, [...userIds]);
	return rows.map(row => ({
		id: row.id,
		values: {
			createdBy: row.createdById != null ? (usersById.get(row.createdById)?.name ?? "-") : "-",
			updatedBy: row.updatedById != null ? (usersById.get(row.updatedById)?.name ?? "-") : "-",
			deletedBy: row.deletedById != null ? (usersById.get(row.deletedById)?.name ?? "-") : "-",
			reviewedBy: row.reviewedById != null ? (usersById.get(row.reviewedById)?.name ?? "-") : "-"
		}
	}));
}

export async function upsertSurveyHeaderAction(input: SurveyHeaderFormState) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const parentDescription = input.parentDescription.trim();
	const product = input.product.trim();
	if(parentDescription.length == 0) throw new Error("Parent Description is required.");
	if(product.length == 0) throw new Error("Product is required.");
	const data = { _status: "draft" as const, title: parentDescription, product, isActive: input.isActive, deletedAt: null, deletedBy: null, reviewedAt: null, reviewedBy: null, reviewApproved: null, reviewComment: null, blocks: [] };
	if(input.headerId == null) {
		const created = await payload.create({ collection: "surveys", user, overrideAccess: true, data: { ...data, createdBy: user.id, updatedBy: user.id } });
		return { headerId: created.id };
	}
	await payload.update({ collection: "surveys", user, overrideAccess: true, trash: true, id: input.headerId, data: { ...data, updatedBy: user.id } });
	return { headerId: input.headerId };
}

export async function requestDeleteSurveyHeaderAction(headerId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	await payload.update({ collection: "surveys", user, overrideAccess: true, trash: true, id: headerId, data: { _status: "draft", deletedAt: new Date().toISOString(), deletedBy: user.id, reviewedAt: null, reviewedBy: null, reviewApproved: null, reviewComment: null } });
	return { headerId };
}

export async function cancelSurveyHeaderRequestAction(headerId: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const doc = await payload.findByID({ collection: "surveys", user, overrideAccess: true, trash: true, id: headerId, depth: 0, showHiddenFields: true });
	if((doc.reviewedAt != null) && doc.reviewApproved != false) throw new Error("Cannot cancel an approved request.");
	const approvedVersions = await payload.findVersions({ user, collection: "surveys", overrideAccess: true, trash: true, pagination: false, limit: 1, sort: "-updatedAt", where: { and: [{ parent: { equals: headerId } }, { "version._status": { equals: "published" } }] }, select: { version: { title: true, product: true, isActive: true, deletedAt: true, deletedBy: true, reviewedAt: true, reviewedBy: true, reviewApproved: true, reviewComment: true, _status: true, blocks: true } } });
	const approvedVersion = approvedVersions.docs[0]?.version;
	if(approvedVersion == null) {
		await payload.update({ collection: "surveys", user, overrideAccess: true, trash: true, id: headerId, data: { _status: "draft", deletedAt: new Date().toISOString(), deletedBy: user.id, reviewedAt: null, reviewedBy: null, reviewApproved: null, reviewComment: null } });
		return { headerId, softDeleted: true };
	}
	const approvedDeletedBy = getRelationshipId(approvedVersion.deletedBy);
	const approvedReviewedBy = getRelationshipId(approvedVersion.reviewedBy);
	await payload.update({ collection: "surveys", user, overrideAccess: true, trash: true, id: headerId, data: { _status: "published", title: approvedVersion.title, product: (approvedVersion as unknown as Record<string, unknown>).product as string ?? "", isActive: (approvedVersion as unknown as Record<string, unknown>).isActive as "yes" | "no" ?? "yes", blocks: (approvedVersion.blocks as any[] | undefined) ?? [], deletedAt: approvedVersion.deletedAt ?? null, deletedBy: approvedDeletedBy, reviewedAt: approvedVersion.reviewedAt ?? null, reviewedBy: approvedReviewedBy, reviewApproved: approvedVersion.reviewApproved ?? null, reviewComment: approvedVersion.reviewComment ?? defaultReviewComment } });
	return { headerId, softDeleted: false };
}

export async function reviewSurveyHeaderAction({ headerId, decision, reason }: ReviewSurveyHeaderInput) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const doc = await payload.findByID({ collection: "surveys", user, overrideAccess: true, trash: true, id: headerId, depth: 0, showHiddenFields: true });
	if(doc.reviewedAt != null) throw new Error("This request has already been reviewed.");
	const now = new Date().toISOString();
	const reviewComment = plainTextToReviewComment(reason);
	await payload.update({ collection: "surveys", user, overrideAccess: true, trash: true, id: headerId, data: { _status: decision == "approve" ? "published" : "draft", reviewedAt: now, reviewedBy: user.id, reviewApproved: decision == "approve", reviewComment } });
	return { headerId, decision };
}

export async function getSurveyHeaderReviewDiffAction(headerId: string): Promise<SurveyHeaderReviewDiff> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const doc = await payload.findByID({ collection: "surveys", user, overrideAccess: true, trash: true, id: headerId, depth: 0, showHiddenFields: true });
	const approvedVersions = await payload.findVersions({ collection: "surveys", user, overrideAccess: true, trash: true, pagination: false, limit: 1, sort: "-updatedAt", where: { and: [{ parent: { equals: headerId } }, { "version._status": { equals: "published" } }] }, select: { version: { title: true, product: true, isActive: true, deletedAt: true } } });
	const approvedVersion = approvedVersions.docs[0]?.version as unknown as Record<string, unknown> | undefined;
	const requestType = doc.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update";
	const baseItems = [
		{ field: "parentDescription", label: "Parent Description", previousValue: (approvedVersion?.title as string | undefined) ?? "-", requestedValue: doc.title ?? "" },
		{ field: "product", label: "Product", previousValue: (approvedVersion?.product as string | undefined) ?? "-", requestedValue: (doc as unknown as Record<string, unknown>).product as string ?? "" },
		{ field: "isActive", label: "Is Active", previousValue: (approvedVersion?.isActive as string | undefined) ?? "-", requestedValue: (doc as unknown as Record<string, unknown>).isActive as string ?? "yes" },
		{ field: "deletedAt", label: "Deleted At", previousValue: formatReviewDateValue(approvedVersion?.deletedAt as string | undefined), requestedValue: formatReviewDateValue(doc.deletedAt) },
	];
	const items: SurveyHeaderReviewDiffItem[] = baseItems.map(item => ({ ...item, changed: item.previousValue != item.requestedValue }));
	return { requestId: headerId, requestType, items, changedCount: items.filter(i => i.changed).length };
}

export async function getSurveyHeaderDetailsAction(headerId: string): Promise<SurveyHeaderDetailsOutput> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const doc = await payload.findByID({ collection: "surveys", user, overrideAccess: false, draft: true, trash: true, id: headerId, depth: 0, select: { title: true, product: true, isActive: true, createdBy: true, updatedBy: true, deletedBy: true, createdAt: true, updatedAt: true, deletedAt: true, _status: true, reviewedAt: true, reviewedBy: true, reviewApproved: true, reviewComment: true } });
	const row = docToRow(doc as unknown as Record<string, unknown>);
	const userIds = [row.createdById, row.updatedById, row.deletedById, row.reviewedById].filter((id): id is string => id != null);
	const usersById = await findUsersByIds(payload, user, [...new Set(userIds)]);
	const relationValues: SurveyHeaderRelationValues = {
		createdBy: row.createdById != null ? (usersById.get(row.createdById)?.name ?? "-") : "-",
		updatedBy: row.updatedById != null ? (usersById.get(row.updatedById)?.name ?? "-") : "-",
		deletedBy: row.deletedById != null ? (usersById.get(row.deletedById)?.name ?? "-") : "-",
		reviewedBy: row.reviewedById != null ? (usersById.get(row.reviewedById)?.name ?? "-") : "-"
	};
	return { row, relationValues };
}

export async function searchSurveyHeaderOptionsAction(keyword: string, selectedIds: string[] = []): Promise<Array<{ id: string; title: string }>> {
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
