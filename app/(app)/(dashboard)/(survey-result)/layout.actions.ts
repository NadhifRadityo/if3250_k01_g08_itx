"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload, type Where, type Payload } from "payload";

import payloadConfig from "@payload-config";
import ExcelJS from "@/utils/exceljs";
import type { RelationUser, RelationCreditApplication } from "@/utils/requestRelationValues";
import type { User } from "@/payload-types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const RELATION_SEARCH_LIMIT = 20;
const MAX_PAGE_SIZE = 100;
const SURVEY_RESULTS_COLLECTION = "survey-results" as const;

export type RelationSurvey = {
	title: string;
};

export type SurveyResultRelationValues =
	Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`credit-applications:${string}`, RelationCreditApplication>> &
	Partial<Record<`surveys:${string}`, RelationSurvey>>;

export type SurveyResultSortField = "id" |
	"createdAt" |
	"updatedAt" |
	"survey" |
	"creditApplication" |
	"officer";
export type SurveyResultSortToken = `${"+" | "-"}${SurveyResultSortField}`;

export type SurveyResultListInput = {
	keyword?: string;
	sort?: string[];
	page?: number;
	limit?: number;
	officerId?: string;
	surveyId?: string;
	creditApplicationId?: string;
	includeSoftDeleted?: boolean;
};

export type SurveyMonitoringListInput = SurveyResultListInput & {
	date?: string;
};

export type SurveyReportListInput = SurveyResultListInput & {
	from?: string;
	to?: string;
};

export type SurveyResultListRow = {
	id: string;
	survey: string | null;
	creditApplication: string | null;
	officer: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

export type SurveyResultListOutput = {
	docs: SurveyResultListRow[];
	relations: SurveyResultRelationValues;
	totalDocs: number;
	page: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	range: { from: string | null, to: string | null };
};

export type SurveyResultDetailRow = SurveyResultListRow & {
	createdBy: string | null;
	updatedBy: string | null;
	deletedBy: string | null;
	answers: any;
};

export type SurveyResultDetailOutput = {
	row: SurveyResultDetailRow;
	surveyTemplate: { id: string, title: string, content: any } | null;
	relations: SurveyResultRelationValues;
};

export type SurveyResultCreditApplicationDetail = {
	id: string;
	name: string;
	email: string;
	addresses: string[];
	phoneNumbers: string[];
	whatsappNumber: string;
	smsNumber: string;
	collateralRegistryName: string;
	collateralName: string;
	collateralDescription: any;
	assetId: string | null;
	assetName: string;
	assetDescription: any;
	period: number | null;
	installment: number | null;
	downPayment: number | null;
	plafond: number | null;
	vendor: string;
	remarks: any;
	others: any;
	otherText1: string;
	otherText2: string;
	otherNumber1: number | null;
	otherNumber2: number | null;
	otherDate1: string | null;
	otherDate2: string | null;
};

export type SurveyResultCreditApplicationAssignmentDetail = {
	id: string;
	creditApplication: string | null;
	officer: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
};

export type SurveyResultViewerDetailOutput = SurveyResultDetailOutput & {
	creditApplicationDetail: SurveyResultCreditApplicationDetail | null;
	creditApplicationAssignment: SurveyResultCreditApplicationAssignmentDetail | null;
};

export type SurveyReportSummaryOfficerItem = { officer: string, total: number };
export type SurveyReportSummarySurveyItem = { survey: string, total: number };
export type SurveyReportSummaryOfficerSurveyItem = { officer: string, survey: string, total: number };

export type SurveyReportSummaryOutput = {
	range: { from: string, to: string };
	totalResults: number;
	officerTotals: SurveyReportSummaryOfficerItem[];
	surveyTotals: SurveyReportSummarySurveyItem[];
	officerSurveyTotals: SurveyReportSummaryOfficerSurveyItem[];
	relations: SurveyResultRelationValues;
};

export type ExportFileOutput = {
	fileName: string;
	mimeType: string;
	base64: string;
};

const sortableFields = new Set<SurveyResultSortField>([
	"id",
	"createdAt",
	"updatedAt",
	"survey",
	"creditApplication",
	"officer"
]);

type SortFieldKey = SurveyResultSortToken extends `${"+" | "-"}${infer T}` ? T : never;

function clampPageSize(limit: number | undefined): number {
	const numericLimit = typeof limit == "number" ? limit : Number.NaN;
	if(Number.isFinite(numericLimit))
		return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(numericLimit)));
	return DEFAULT_LIMIT;
}

function normalizeOptionalTextValue(value: unknown): string {
	return typeof value == "string" ? value.trim() : "";
}

function normalizeOptionalTextArray(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];
	return value
		.filter((item): item is string => typeof item == "string")
		.map(item => item.trim())
		.filter(item => item.length > 0);
}

function normalizeOptionalNumberValue(value: unknown): number | null {
	if(typeof value == "number" && Number.isFinite(value))
		return value;
	if(typeof value == "string" && value.trim().length > 0) {
		const parsed = Number(value);
		if(Number.isFinite(parsed))
			return parsed;
	}
	return null;
}

function normalizeOptionalDateString(value: unknown): string | null {
	if(value == null)
		return null;
	if(value instanceof Date)
		return value.toISOString();
	if(typeof value == "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	return null;
}

function normalizeOptionalBooleanValue(value: unknown): boolean | undefined {
	if(typeof value == "boolean")
		return value;
	return undefined;
}

function normalizeSortTokens(sort: string[] | undefined): SurveyResultSortToken[] {
	const tokens = Array.isArray(sort) ? sort : [];
	const prefixed = tokens
		.map(token => token.trim())
		.filter(token => token.length > 0)
		.map(token => token.startsWith("+") || token.startsWith("-") ? token : `+${token}`)
		.filter(token => sortableFields.has(token.slice(1) as SurveyResultSortField)) as SurveyResultSortToken[];
	const deduplicated = prefixed.filter((token, index, source) =>
		index == source.findIndex(candidate => candidate.slice(1) == token.slice(1))
	);
	if(deduplicated.length == 0)
		return ["-createdAt"];
	return deduplicated;
}

function toPayloadSort(sort: SurveyResultSortToken[]): string {
	return sort.map(token => {
		const direction = token.startsWith("-") ? "-" : "";
		const field = token.slice(1) as SortFieldKey;
		let path: string;
		if(field == "survey")
			path = "survey.title";
		else if(field == "creditApplication")
			path = "creditApplication.name";
		else if(field == "officer")
			path = "officer.name";
		else
			path = field;
		return `${direction}${path}`;
	}).join(",");
}

function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	if(value != null && typeof value == "object" && "id" in value && typeof (value as any).id == "number")
		return String((value as any).id);
	if(typeof value == "number")
		return String(value);
	return null;
}

function startOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

function addDays(date: Date, days: number): Date {
	const copy = new Date(date);
	copy.setDate(copy.getDate() + days);
	return copy;
}

function parseDateInput(value: unknown): Date | null {
	if(typeof value != "string")
		return null;
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const parsed = new Date(trimmed);
	if(Number.isNaN(parsed.getTime()))
		return null;
	return parsed;
}

type DateRange = { from: Date, to: Date };

function resolveMonitoringRange(dateValue: string | undefined): DateRange {
	const parsed = parseDateInput(dateValue);
	const baseDate = parsed ?? new Date();
	const from = startOfDay(baseDate);
	const to = addDays(from, 1);
	return { from, to };
}

function resolveReportRange(fromValue: string | undefined, toValue: string | undefined): DateRange {
	const now = new Date();
	const todayStart = startOfDay(now);

	const parsedFrom = parseDateInput(fromValue);
	const parsedTo = parseDateInput(toValue);

	if(parsedFrom != null && parsedTo != null) {
		const from = parsedFrom;
		const to = parsedTo;
		if(from.getTime() < to.getTime())
			return { from, to };
	}

	if(parsedFrom != null && parsedTo == null) {
		const from = parsedFrom;
		const to = todayStart;
		if(from.getTime() < to.getTime())
			return { from, to };
	}

	if(parsedFrom == null && parsedTo != null) {
		const to = parsedTo;
		const from = addDays(to, -1);
		if(from.getTime() < to.getTime())
			return { from, to };
	}

	const from = addDays(todayStart, -1);
	const to = todayStart;
	return { from, to };
}

function buildSurveyResultsWhere({
	keyword,
	officerId,
	surveyId,
	creditApplicationId,
	includeSoftDeleted,
	range
}: {
	keyword: string;
	officerId: string;
	surveyId: string;
	creditApplicationId: string;
	includeSoftDeleted: boolean;
	range: DateRange | null;
}): Where | null {
	const terms: Where[] = [];

	if(!includeSoftDeleted)
		terms.push({ deletedAt: { exists: false } });

	if(officerId.length > 0)
		terms.push({ officer: { equals: officerId } });
	if(surveyId.length > 0)
		terms.push({ survey: { equals: surveyId } });
	if(creditApplicationId.length > 0)
		terms.push({ creditApplication: { equals: creditApplicationId } });

	if(range != null) {
		terms.push({
			createdAt: {
				greater_than_equal: range.from.toISOString(),
				less_than: range.to.toISOString()
			}
		});
	}

	if(keyword.length > 0) {
		terms.push({
			or: [
				{ id: { like: keyword } },
				{ "survey.title": { like: keyword } },
				{ "creditApplication.name": { like: keyword } },
				{ "creditApplication.email": { like: keyword } },
				{ "officer.name": { like: keyword } },
				{ "officer.email": { like: keyword } }
			]
		});
	}

	if(terms.length == 0)
		return null;
	if(terms.length == 1)
		return terms[0];
	return { and: terms };
}

async function requireAuthedPayload(): Promise<{ payload: Payload, user: User }> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null)
		return unauthorized();
	return { payload, user };
}

function normalizeSelectedIds(ids: string[]): string[] {
	if(!Array.isArray(ids))
		return [];
	return [...new Set(ids.map(id => (typeof id == "string" ? id.trim() : "")).filter(id => id.length > 0))];
}

async function findUsersByIds(payload: Payload, user: User, ids: string[]): Promise<Map<string, RelationUser>> {
	const normalizedIds = [...new Set(ids.map(id => id.trim()).filter(id => id.length > 0))];
	if(normalizedIds.length == 0)
		return new Map();

	const usersResult = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: normalizedIds.length,
		where: { id: { in: normalizedIds } },
		select: {
			name: true,
			email: true,
			stagedUser: true
		}
	});

	const map = new Map<string, RelationUser>();
	for(const doc of usersResult.docs) {
		map.set(String(doc.id), {
			name: normalizeOptionalTextValue(doc.name),
			email: normalizeOptionalTextValue(doc.email),
			stagedUserId: getRelationshipId(doc.stagedUser)
		});
	}

	return map;
}

export type SurveyResultOfficerOption = {
	id: string;
	name: string;
	email: string;
};

export async function searchSurveyResultOfficerOptionsAction(
	keyword: string,
	selectedIds: string[] = []
): Promise<SurveyResultOfficerOption[]> {
	const { payload, user } = await requireAuthedPayload();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = normalizedKeyword.length == 0 ? [] : [
		{ email: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ employeeId: { like: normalizedKeyword } }
	];
	const officerSearchTerms: Where[] = [{ "role.level": { equals: "officer" } }];
	if(keywordFilters.length > 0)
		officerSearchTerms.push({ or: keywordFilters });

	const where: Where = {
		and: [
			{ deletedAt: { exists: false } },
			{
				or: [
					officerSearchTerms.length == 1 ? officerSearchTerms[0] : { and: officerSearchTerms },
					...(normalizedSelectedIds.length > 0 ? [{ id: { in: normalizedSelectedIds } }] : [])
				]
			}
		]
	};

	const result = await payload.find({
		collection: "users",
		user,
		overrideAccess: false,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "name",
		where,
		select: {
			name: true,
			email: true
		}
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: normalizeOptionalTextValue(doc.name),
		email: normalizeOptionalTextValue(doc.email)
	}));
}

async function findCreditApplicationsByIds(
	payload: Payload,
	user: User,
	ids: string[]
): Promise<Map<string, RelationCreditApplication>> {
	const normalizedIds = [...new Set(ids.map(id => id.trim()).filter(id => id.length > 0))];
	if(normalizedIds.length == 0)
		return new Map();

	const result = await payload.find({
		collection: "credit-applications",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: normalizedIds.length,
		where: { id: { in: normalizedIds } },
		select: {
			assetId: true,
			name: true,
			email: true
		}
	});

	const map = new Map<string, RelationCreditApplication>();
	for(const doc of result.docs) {
		map.set(String(doc.id), {
			assetId: typeof (doc as any).assetId == "string" ? (doc as any).assetId : null,
			name: normalizeOptionalTextValue(doc.name),
			email: normalizeOptionalTextValue(doc.email)
		});
	}

	return map;
}

async function findCreditApplicationDetailById(
	payload: Payload,
	user: User,
	id: string
): Promise<SurveyResultCreditApplicationDetail | null> {
	const normalizedId = id.trim();
	if(normalizedId.length == 0)
		return null;

	const doc = await payload.findByID({
		collection: "credit-applications",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		id: normalizedId,
		depth: 0,
		select: {
			name: true,
			email: true,
			addresses: true,
			phoneNumbers: true,
			whatsappNumber: true,
			smsNumber: true,
			collateralRegistryName: true,
			collateralName: true,
			collateralDescription: true,
			assetId: true,
			assetName: true,
			assetDescription: true,
			period: true,
			installment: true,
			downPayment: true,
			plafond: true,
			vendor: true,
			remarks: true,
			others: true,
			otherText1: true,
			otherText2: true,
			otherNumber1: true,
			otherNumber2: true,
			otherDate1: true,
			otherDate2: true
		}
	});

	return {
		id: String(doc.id),
		name: normalizeOptionalTextValue(doc.name),
		email: normalizeOptionalTextValue((doc as any).email),
		addresses: normalizeOptionalTextArray((doc as any).addresses),
		phoneNumbers: normalizeOptionalTextArray((doc as any).phoneNumbers),
		whatsappNumber: normalizeOptionalTextValue((doc as any).whatsappNumber),
		smsNumber: normalizeOptionalTextValue((doc as any).smsNumber),
		collateralRegistryName: normalizeOptionalTextValue((doc as any).collateralRegistryName),
		collateralName: normalizeOptionalTextValue((doc as any).collateralName),
		collateralDescription: (doc as any).collateralDescription ?? null,
		assetId: typeof (doc as any).assetId == "string" ? (doc as any).assetId : null,
		assetName: normalizeOptionalTextValue((doc as any).assetName),
		assetDescription: (doc as any).assetDescription ?? null,
		period: normalizeOptionalNumberValue((doc as any).period),
		installment: normalizeOptionalNumberValue((doc as any).installment),
		downPayment: normalizeOptionalNumberValue((doc as any).downPayment),
		plafond: normalizeOptionalNumberValue((doc as any).plafond),
		vendor: normalizeOptionalTextValue((doc as any).vendor),
		remarks: (doc as any).remarks ?? null,
		others: (doc as any).others ?? null,
		otherText1: normalizeOptionalTextValue((doc as any).otherText1),
		otherText2: normalizeOptionalTextValue((doc as any).otherText2),
		otherNumber1: normalizeOptionalNumberValue((doc as any).otherNumber1),
		otherNumber2: normalizeOptionalNumberValue((doc as any).otherNumber2),
		otherDate1: normalizeOptionalDateString((doc as any).otherDate1),
		otherDate2: normalizeOptionalDateString((doc as any).otherDate2)
	};
}

async function findCreditApplicationAssignmentByCreditApplicationId(
	payload: Payload,
	user: User,
	creditApplicationId: string
): Promise<SurveyResultCreditApplicationAssignmentDetail | null> {
	const normalizedId = creditApplicationId.trim();
	if(normalizedId.length == 0)
		return null;

	const result = await payload.find({
		collection: "credit-application-assignments",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		limit: 1,
		sort: "-updatedAt",
		depth: 0,
		where: {
			and: [
				{ deletedAt: { exists: false } },
				{ creditApplication: { equals: normalizedId } }
			]
		},
		select: {
			creditApplication: true,
			officer: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true
		}
	});

	if(result.docs.length == 0)
		return null;

	const doc = result.docs[0] as any;
	return {
		id: String(doc.id),
		creditApplication: getRelationshipId(doc.creditApplication),
		officer: getRelationshipId(doc.officer),
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
		deletedAt: doc.deletedAt ?? null
	};
}

export type SurveyResultCreditApplicationOption = {
	id: string;
	name: string;
	email: string;
	assetId: string | null;
};

export async function searchSurveyResultCreditApplicationOptionsAction(
	keyword: string,
	selectedIds: string[] = []
): Promise<SurveyResultCreditApplicationOption[]> {
	const { payload, user } = await requireAuthedPayload();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = normalizedKeyword.length == 0 ? [] : [
		{ id: { like: normalizedKeyword } },
		{ name: { like: normalizedKeyword } },
		{ email: { like: normalizedKeyword } },
		{ assetId: { like: normalizedKeyword } }
	];
	const whereTerms: Where[] = [{ deletedAt: { exists: false } }];
	if(keywordFilters.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where: Where = whereTerms.length == 1 ? whereTerms[0] : { and: whereTerms };

	const result = await payload.find({
		collection: "credit-applications",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "name",
		where,
		select: {
			assetId: true,
			name: true,
			email: true
		}
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		name: normalizeOptionalTextValue(doc.name),
		email: normalizeOptionalTextValue(doc.email),
		assetId: typeof (doc as any).assetId == "string" ? (doc as any).assetId : null
	}));
}

async function findSurveysByIds(payload: Payload, user: User, ids: string[]): Promise<Map<string, RelationSurvey>> {
	const normalizedIds = [...new Set(ids.map(id => id.trim()).filter(id => id.length > 0))];
	if(normalizedIds.length == 0)
		return new Map();

	const result = await payload.find({
		collection: "surveys",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: normalizedIds.length,
		where: { id: { in: normalizedIds } },
		select: {
			title: true
		}
	});

	const map = new Map<string, RelationSurvey>();
	for(const doc of result.docs)
		map.set(String(doc.id), { title: normalizeOptionalTextValue(doc.title) });

	return map;
}

export type SurveyResultSurveyOption = {
	id: string;
	title: string;
};

export async function searchSurveyResultSurveyOptionsAction(
	keyword: string,
	selectedIds: string[] = []
): Promise<SurveyResultSurveyOption[]> {
	const { payload, user } = await requireAuthedPayload();

	const normalizedKeyword = keyword.trim();
	const normalizedSelectedIds = normalizeSelectedIds(selectedIds);
	const keywordFilters: Where[] = normalizedKeyword.length == 0 ? [] : [
		{ id: { like: normalizedKeyword } },
		{ title: { like: normalizedKeyword } }
	];
	const whereTerms: Where[] = [];
	if(keywordFilters.length > 0)
		whereTerms.push({ or: keywordFilters });
	if(normalizedSelectedIds.length > 0)
		whereTerms.push({ id: { in: normalizedSelectedIds } });
	const where = whereTerms.length == 0 ? null : whereTerms.length == 1 ? whereTerms[0] : { or: whereTerms };

	const result = await payload.find({
		collection: "surveys",
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		limit: RELATION_SEARCH_LIMIT + normalizedSelectedIds.length,
		sort: "-updatedAt",
		select: {
			title: true
		},
		...(where != null ? { where } : {})
	});

	return result.docs.map(doc => ({
		id: String(doc.id),
		title: normalizeOptionalTextValue(doc.title)
	}));
}

async function querySurveyResultsListAction(
	input: SurveyResultListInput,
	range: DateRange | null
): Promise<SurveyResultListOutput> {
	const { payload, user } = await requireAuthedPayload();

	const keyword = normalizeOptionalTextValue(input.keyword);
	const officerId = normalizeOptionalTextValue(input.officerId);
	const surveyId = normalizeOptionalTextValue(input.surveyId);
	const creditApplicationId = normalizeOptionalTextValue(input.creditApplicationId);
	const includeSoftDeleted = normalizeOptionalBooleanValue(input.includeSoftDeleted) ?? false;

	const pageSize = clampPageSize(input.limit);
	const pageNumber = Number.isFinite(input.page) ? Math.max(1, Math.floor(input.page ?? DEFAULT_PAGE)) : DEFAULT_PAGE;
	const sortTokens = normalizeSortTokens(input.sort);

	const where = buildSurveyResultsWhere({
		keyword,
		officerId,
		surveyId,
		creditApplicationId,
		includeSoftDeleted,
		range
	});

	const result = await payload.find({
		collection: SURVEY_RESULTS_COLLECTION,
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		page: pageNumber,
		limit: pageSize,
		sort: toPayloadSort(sortTokens),
		depth: 0,
		select: {
			survey: true,
			creditApplication: true,
			officer: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true
		},
		...(where != null ? { where } : {})
	});

	const docs: SurveyResultListRow[] = result.docs.map(doc => ({
		id: String(doc.id),
		survey: getRelationshipId((doc as any).survey),
		creditApplication: getRelationshipId((doc as any).creditApplication),
		officer: getRelationshipId((doc as any).officer),
		createdAt: (doc as any).createdAt,
		updatedAt: (doc as any).updatedAt,
		deletedAt: (doc as any).deletedAt ?? null
	}));

	const officerIds = docs.map(row => row.officer).filter((value): value is string => value != null);
	const creditApplicationIds = docs.map(row => row.creditApplication).filter((value): value is string => value != null);
	const surveyIds = docs.map(row => row.survey).filter((value): value is string => value != null);

	const [usersById, creditApplicationsById, surveysById] = await Promise.all([
		findUsersByIds(payload, user, officerIds),
		findCreditApplicationsByIds(payload, user, creditApplicationIds),
		findSurveysByIds(payload, user, surveyIds)
	]);

	const relations: SurveyResultRelationValues = {};
	for(const [id, relation] of usersById)
		relations[`users:${id}`] = relation;
	for(const [id, relation] of creditApplicationsById)
		relations[`credit-applications:${id}`] = relation;
	for(const [id, relation] of surveysById)
		relations[`surveys:${id}`] = relation;

	return {
		docs,
		relations,
		totalDocs: result.totalDocs,
		page: result.page ?? pageNumber,
		hasNextPage: result.hasNextPage,
		hasPreviousPage: result.hasPrevPage,
		range: {
			from: range == null ? null : range.from.toISOString(),
			to: range == null ? null : range.to.toISOString()
		}
	};
}

async function getSurveyResultDetailInternalAction(
	payload: Payload,
	user: User,
	surveyResultId: string
): Promise<{ row: SurveyResultDetailRow, surveyTemplate: SurveyResultDetailOutput["surveyTemplate"] }> {
	const result = await payload.findByID({
		collection: SURVEY_RESULTS_COLLECTION,
		user,
		overrideAccess: false,
		draft: true,
		trash: true,
		id: surveyResultId,
		depth: 0,
		select: {
			survey: true,
			creditApplication: true,
			officer: true,
			answers: true,
			createdBy: true,
			updatedBy: true,
			deletedBy: true,
			createdAt: true,
			updatedAt: true,
			deletedAt: true
		}
	});

	const surveyId = getRelationshipId((result as any).survey);
	let surveyTemplate: SurveyResultDetailOutput["surveyTemplate"] = null;
	if(surveyId != null) {
		const survey = await payload.findByID({
			collection: "surveys",
			user,
			overrideAccess: false,
			draft: true,
			trash: true,
			id: surveyId,
			depth: 0,
			select: {
				title: true,
				content: true
			}
		});

		surveyTemplate = {
			id: String(survey.id),
			title: normalizeOptionalTextValue((survey as any).title),
			content: (survey as any).content
		};
	}

	return {
		row: {
			id: String(result.id),
			survey: surveyId,
			creditApplication: getRelationshipId((result as any).creditApplication),
			officer: getRelationshipId((result as any).officer),
			createdBy: getRelationshipId((result as any).createdBy),
			updatedBy: getRelationshipId((result as any).updatedBy),
			deletedBy: getRelationshipId((result as any).deletedBy),
			createdAt: (result as any).createdAt,
			updatedAt: (result as any).updatedAt,
			deletedAt: (result as any).deletedAt ?? null,
			answers: (result as any).answers
		},
		surveyTemplate
	};
}

async function getSurveyResultViewerDetailInternalAction(
	payload: Payload,
	user: User,
	surveyResultId: string
): Promise<SurveyResultViewerDetailOutput> {
	const { row, surveyTemplate } = await getSurveyResultDetailInternalAction(payload, user, surveyResultId);

	const relationUserIds = [
		row.officer,
		row.createdBy,
		row.updatedBy,
		row.deletedBy
	].filter((value): value is string => value != null);
	const relationCreditApplicationIds = row.creditApplication != null ? [row.creditApplication] : [];
	const relationSurveyIds = row.survey != null && surveyTemplate == null ? [row.survey] : [];

	const creditApplicationId = row.creditApplication;

	const [
		usersById,
		creditApplicationsById,
		surveysById,
		creditApplicationDetail,
		creditApplicationAssignment
	] = await Promise.all([
		findUsersByIds(payload, user, relationUserIds),
		findCreditApplicationsByIds(payload, user, relationCreditApplicationIds),
		findSurveysByIds(payload, user, relationSurveyIds),
		creditApplicationId != null ? findCreditApplicationDetailById(payload, user, creditApplicationId) : Promise.resolve(null),
		creditApplicationId != null ? findCreditApplicationAssignmentByCreditApplicationId(payload, user, creditApplicationId) : Promise.resolve(null)
	]);

	const relations: SurveyResultRelationValues = {};
	for(const [id, relation] of usersById)
		relations[`users:${id}`] = relation;
	for(const [id, relation] of creditApplicationsById)
		relations[`credit-applications:${id}`] = relation;
	for(const [id, relation] of surveysById)
		relations[`surveys:${id}`] = relation;
	if(row.survey != null && surveyTemplate != null)
		relations[`surveys:${row.survey}`] = { title: surveyTemplate.title };

	return {
		row,
		surveyTemplate,
		relations,
		creditApplicationDetail,
		creditApplicationAssignment
	};
}

async function buildSurveyResultDetailRelations(
	payload: Payload,
	user: User,
	row: SurveyResultDetailRow,
	surveyTemplate: SurveyResultDetailOutput["surveyTemplate"]
): Promise<SurveyResultRelationValues> {
	const relationUserIds = [
		row.officer,
		row.createdBy,
		row.updatedBy,
		row.deletedBy
	].filter((value): value is string => value != null);
	const relationCreditApplicationIds = row.creditApplication != null ? [row.creditApplication] : [];
	const relationSurveyIds = row.survey != null && surveyTemplate == null ? [row.survey] : [];

	const [usersById, creditApplicationsById, surveysById] = await Promise.all([
		findUsersByIds(payload, user, relationUserIds),
		findCreditApplicationsByIds(payload, user, relationCreditApplicationIds),
		findSurveysByIds(payload, user, relationSurveyIds)
	]);

	const relations: SurveyResultRelationValues = {};
	for(const [id, relation] of usersById)
		relations[`users:${id}`] = relation;
	for(const [id, relation] of creditApplicationsById)
		relations[`credit-applications:${id}`] = relation;
	for(const [id, relation] of surveysById)
		relations[`surveys:${id}`] = relation;
	if(row.survey != null && surveyTemplate != null)
		relations[`surveys:${row.survey}`] = { title: surveyTemplate.title };

	return relations;
}

async function getSurveyResultDetailInternalWithRelations(
	payload: Payload,
	user: User,
	surveyResultId: string
): Promise<SurveyResultDetailOutput> {
	const { row, surveyTemplate } = await getSurveyResultDetailInternalAction(payload, user, surveyResultId);
	const relations = await buildSurveyResultDetailRelations(payload, user, row, surveyTemplate);
	return { row, surveyTemplate, relations };
}

function isWithinRange(createdAt: string, range: DateRange): boolean {
	const date = new Date(createdAt);
	if(Number.isNaN(date.getTime()))
		return false;
	const time = date.getTime();
	return time >= range.from.getTime() && time < range.to.getTime();
}

export async function getSurveyResultList(input: SurveyResultListInput = {}): Promise<SurveyResultListOutput> {
	return querySurveyResultsListAction(input, null);
}

export async function getSurveyMonitoringList(input: SurveyMonitoringListInput = {}): Promise<SurveyResultListOutput> {
	const range = resolveMonitoringRange(input.date);
	return querySurveyResultsListAction(input, range);
}

export async function getSurveyReportList(input: SurveyReportListInput = {}): Promise<SurveyResultListOutput> {
	const range = resolveReportRange(input.from, input.to);
	return querySurveyResultsListAction(input, range);
}

export async function getSurveyResultViewerDetail(surveyResultId: string): Promise<SurveyResultViewerDetailOutput> {
	const { payload, user } = await requireAuthedPayload();
	return getSurveyResultViewerDetailInternalAction(payload, user, surveyResultId);
}

export async function getSurveyResultDetail(surveyResultId: string): Promise<SurveyResultDetailOutput> {
	const { payload, user } = await requireAuthedPayload();
	return getSurveyResultDetailInternalWithRelations(payload, user, surveyResultId);
}

export async function getSurveyMonitoringDetail(surveyResultId: string, date?: string): Promise<SurveyResultDetailOutput> {
	const range = resolveMonitoringRange(date);
	const { payload, user } = await requireAuthedPayload();
	const { row, surveyTemplate } = await getSurveyResultDetailInternalAction(payload, user, surveyResultId);
	if(!isWithinRange(row.createdAt, range))
		throw new Error("Survey result is not within the monitoring date range.");
	const relations = await buildSurveyResultDetailRelations(payload, user, row, surveyTemplate);
	return { row, surveyTemplate, relations };
}

export async function getSurveyMonitoringViewerDetail(surveyResultId: string, date?: string): Promise<SurveyResultViewerDetailOutput> {
	const range = resolveMonitoringRange(date);
	const { payload, user } = await requireAuthedPayload();
	const detail = await getSurveyResultViewerDetailInternalAction(payload, user, surveyResultId);
	if(!isWithinRange(detail.row.createdAt, range))
		throw new Error("Survey result is not within the monitoring date range.");
	return detail;
}

export async function getSurveyReportViewerDetail(surveyResultId: string, from?: string, to?: string): Promise<SurveyResultViewerDetailOutput> {
	const range = resolveReportRange(from, to);
	const { payload, user } = await requireAuthedPayload();
	const detail = await getSurveyResultViewerDetailInternalAction(payload, user, surveyResultId);
	if(!isWithinRange(detail.row.createdAt, range))
		throw new Error("Survey result is not within the reporting date range.");
	return detail;
}

async function iterateSurveyResults(
	payload: Payload,
	user: User,
	where: Where | undefined,
	options: { includeAnswers: boolean }
): Promise<Array<{ id: string, survey: string | null, creditApplication: string | null, officer: string | null, createdAt: string, answers: any }>> {
	const collected: Array<{ id: string, survey: string | null, creditApplication: string | null, officer: string | null, createdAt: string, answers: any }> = [];
	let page = 1;
	const limit = 500;
	for(;;) {
		const result = await payload.find({
			collection: SURVEY_RESULTS_COLLECTION,
			user,
			overrideAccess: false,
			draft: true,
			trash: true,
			page,
			limit,
			sort: "-createdAt",
			depth: 0,
			select: {
				survey: true,
				creditApplication: true,
				officer: true,
				createdAt: true,
				...(options.includeAnswers ? { answers: true } : {})
			},
			...(where != null ? { where } : {})
		});

		for(const doc of result.docs) {
			collected.push({
				id: String(doc.id),
				survey: getRelationshipId((doc as any).survey),
				creditApplication: getRelationshipId((doc as any).creditApplication),
				officer: getRelationshipId((doc as any).officer),
				createdAt: (doc as any).createdAt,
				answers: options.includeAnswers ? (doc as any).answers : null
			});
		}

		if(!result.hasNextPage)
			break;
		page = (result.nextPage ?? (page + 1));
	}
	return collected;
}

export async function getSurveyReportSummary(input: SurveyReportListInput = {}): Promise<SurveyReportSummaryOutput> {
	const { payload, user } = await requireAuthedPayload();

	const keyword = normalizeOptionalTextValue(input.keyword);
	const officerId = normalizeOptionalTextValue(input.officerId);
	const surveyId = normalizeOptionalTextValue(input.surveyId);
	const creditApplicationId = normalizeOptionalTextValue(input.creditApplicationId);
	const includeSoftDeleted = normalizeOptionalBooleanValue(input.includeSoftDeleted) ?? false;
	const range = resolveReportRange(input.from, input.to);

	const where = buildSurveyResultsWhere({
		keyword,
		officerId,
		surveyId,
		creditApplicationId,
		includeSoftDeleted,
		range
	}) ?? undefined;

	const docs = await iterateSurveyResults(payload, user, where, { includeAnswers: false });

	const officerTotals = new Map<string, number>();
	const surveyTotals = new Map<string, number>();
	const officerSurveyTotals = new Map<string, number>();

	for(const doc of docs) {
		if(doc.officer != null)
			officerTotals.set(doc.officer, (officerTotals.get(doc.officer) ?? 0) + 1);
		if(doc.survey != null)
			surveyTotals.set(doc.survey, (surveyTotals.get(doc.survey) ?? 0) + 1);
		if(doc.officer != null && doc.survey != null) {
			const key = `${doc.officer}:${doc.survey}`;
			officerSurveyTotals.set(key, (officerSurveyTotals.get(key) ?? 0) + 1);
		}
	}

	const officerIds = [...officerTotals.keys()];
	const surveyIds = [...surveyTotals.keys()];

	const [usersById, surveysById] = await Promise.all([
		findUsersByIds(payload, user, officerIds),
		findSurveysByIds(payload, user, surveyIds)
	]);

	const relations: SurveyResultRelationValues = {};
	for(const [id, relation] of usersById)
		relations[`users:${id}`] = relation;
	for(const [id, relation] of surveysById)
		relations[`surveys:${id}`] = relation;

	const officerTotalsList = [...officerTotals.entries()]
		.map(([officer, total]) => ({ officer, total }))
		.sort((a, b) => b.total - a.total);
	const surveyTotalsList = [...surveyTotals.entries()]
		.map(([survey, total]) => ({ survey, total }))
		.sort((a, b) => b.total - a.total);
	const officerSurveyTotalsList = [...officerSurveyTotals.entries()]
		.map(([key, total]) => {
			const [officer, survey] = key.split(":");
			return { officer, survey, total };
		})
		.sort((a, b) => b.total - a.total);

	return {
		range: { from: range.from.toISOString(), to: range.to.toISOString() },
		totalResults: docs.length,
		officerTotals: officerTotalsList,
		surveyTotals: surveyTotalsList,
		officerSurveyTotals: officerSurveyTotalsList,
		relations
	};
}

function formatReportFileTimestamp(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export async function exportSurveyReport(input: SurveyReportListInput = {}): Promise<ExportFileOutput> {
	const { payload, user } = await requireAuthedPayload();

	const keyword = normalizeOptionalTextValue(input.keyword);
	const officerId = normalizeOptionalTextValue(input.officerId);
	const surveyId = normalizeOptionalTextValue(input.surveyId);
	const creditApplicationId = normalizeOptionalTextValue(input.creditApplicationId);
	const includeSoftDeleted = normalizeOptionalBooleanValue(input.includeSoftDeleted) ?? false;
	const range = resolveReportRange(input.from, input.to);

	const where = buildSurveyResultsWhere({
		keyword,
		officerId,
		surveyId,
		creditApplicationId,
		includeSoftDeleted,
		range
	}) ?? undefined;

	const docs = await iterateSurveyResults(payload, user, where, { includeAnswers: true });

	const officerIds = docs.map(doc => doc.officer).filter((value): value is string => value != null);
	const creditApplicationIds = docs.map(doc => doc.creditApplication).filter((value): value is string => value != null);
	const surveyIds = docs.map(doc => doc.survey).filter((value): value is string => value != null);

	const [usersById, creditApplicationsById, surveysById] = await Promise.all([
		findUsersByIds(payload, user, officerIds),
		findCreditApplicationsByIds(payload, user, creditApplicationIds),
		findSurveysByIds(payload, user, surveyIds)
	]);

	const workbook = new ExcelJS.Workbook();
	workbook.title = "Survey Result Report";
	workbook.creator = "Survey Result Report";
	workbook.created = new Date();
	workbook.modified = new Date();

	const worksheet = workbook.addWorksheet("Survey Results", { views: [{ state: "frozen", ySplit: 1 }] });
	worksheet.columns = [
		{ header: "ID", key: "id", width: 24 },
		{ header: "Created At", key: "createdAt", width: 22 },
		{ header: "Survey", key: "survey", width: 30 },
		{ header: "Credit Application", key: "creditApplication", width: 34 },
		{ header: "Officer", key: "officer", width: 26 },
		{ header: "Answers (JSON)", key: "answers", width: 70 }
	];

	for(const doc of docs) {
		const officerName = doc.officer != null ? (usersById.get(doc.officer)?.name ?? doc.officer) : "";
		const surveyTitle = doc.survey != null ? (surveysById.get(doc.survey)?.title ?? doc.survey) : "";
		const creditApplicationName = doc.creditApplication != null ? (creditApplicationsById.get(doc.creditApplication)?.name ?? doc.creditApplication) : "";
		worksheet.addRow({
			id: doc.id,
			createdAt: doc.createdAt,
			survey: surveyTitle,
			creditApplication: creditApplicationName,
			officer: officerName,
			answers: JSON.stringify(doc.answers ?? null)
		});
	}

	const buffer = await workbook.xlsx.writeBuffer();
	const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
	const fileName = `survey-report-${formatReportFileTimestamp(new Date())}.xlsx`;

	return {
		fileName,
		mimeType,
		base64: Buffer.from(buffer).toString("base64")
	};
}

export async function exportSurveyResultDetail(surveyResultId: string): Promise<ExportFileOutput> {
	const { payload, user } = await requireAuthedPayload();

	const { row, surveyTemplate } = await getSurveyResultDetailInternalAction(payload, user, surveyResultId);

	const answers = row.answers as unknown;
	const templateContent = surveyTemplate?.content;

	const workbook = new ExcelJS.Workbook();
	workbook.title = "Survey Result Detail";
	workbook.creator = "Survey Result Detail";
	workbook.created = new Date();
	workbook.modified = new Date();

	const worksheet = workbook.addWorksheet("Survey Result Answers");
	worksheet.columns = [
		{ header: "Question", key: "question", width: 60 },
		{ header: "Answer", key: "answer", width: 80 }
	];

	type ExportRow = { question: string, answer: string };

	const stringifyRenderableText = (value: unknown): string => {
		if(typeof value == "string" || typeof value == "number")
			return String(value).trim();
		if(Array.isArray(value))
			return value.map(part => stringifyRenderableText(part)).join("").trim();
		if(value == null)
			return "";
		try {
			return JSON.stringify(value);
		} catch{
			return String(value);
		}
	};

	const formatAnswerValue = (value: unknown): string => {
		if(value == null)
			return "";
		if(typeof value == "string")
			return value.trim();
		if(typeof value == "number" || typeof value == "boolean")
			return String(value);
		if(Array.isArray(value))
			return value.map(item => formatAnswerValue(item)).filter(item => item.length > 0).join(", ");
		try {
			return JSON.stringify(value, null, 2);
		} catch{
			return String(value);
		}
	};

	const extractAnswerValues = (value: unknown): Record<string, unknown> => {
		if(value == null || typeof value != "object")
			return {};
		if("values" in value && (value as any).values != null && typeof (value as any).values == "object" && !Array.isArray((value as any).values))
			return (value as any).values as Record<string, unknown>;
		if("data" in value && (value as any).data != null && typeof (value as any).data == "object" && !Array.isArray((value as any).data))
			return (value as any).data as Record<string, unknown>;

		const items = (value as any).items as unknown;
		if(Array.isArray(items)) {
			const mapped: Record<string, unknown> = {};
			for(const item of items) {
				if(item == null || typeof item != "object")
					continue;
				const questionId = typeof item.questionId == "string" ? item.questionId.trim() : "";
				if(questionId.length == 0)
					continue;
				mapped[questionId] = item.value;
			}
			return mapped;
		}

		if(items != null && typeof items == "object" && !Array.isArray(items))
			return items as Record<string, unknown>;

		return {};
	};

	const answerValues = extractAnswerValues(answers);

	const exportRows: ExportRow[] = [];

	const isFormTemplate = (content: unknown): content is { slides: Array<{ blocks?: any[] }> } => {
		return content != null && typeof content == "object" && Array.isArray((content as any).slides);
	};

	const walkFormBlocks = (blocks: unknown, out: Array<{ name: string, question: string }>) => {
		if(!Array.isArray(blocks))
			return;
		for(const block of blocks) {
			if(block == null || typeof block != "object")
				continue;
			const name = typeof block.name == "string" ? block.name.trim() : "";
			if(name.length > 0) {
				const question = stringifyRenderableText(block.question);
				out.push({ name, question: question.length > 0 ? question : name });
			}
		}
	};

	if(isFormTemplate(templateContent)) {
		const questions: Array<{ name: string, question: string }> = [];
		for(const slide of templateContent.slides)
			walkFormBlocks(slide?.blocks, questions);

		for(const question of questions) {
			exportRows.push({
				question: question.question,
				answer: formatAnswerValue(answerValues[question.name])
			});
		}
	} else if(Array.isArray(templateContent?.questions)) {
		for(const question of templateContent.questions) {
			const id = typeof question?.id == "string" ? question.id.trim() : "";
			if(id.length == 0)
				continue;
			const questionText = typeof question?.question == "string" ? question.question.trim() : "";
			exportRows.push({
				question: questionText.length > 0 ? questionText : id,
				answer: formatAnswerValue(answerValues[id])
			});
		}
	} else {
		for(const [key, value] of Object.entries(answerValues)) {
			const normalizedKey = key.trim();
			if(normalizedKey.length == 0)
				continue;
			exportRows.push({ question: normalizedKey, answer: formatAnswerValue(value) });
		}
	}

	if(exportRows.length == 0)
		exportRows.push({ question: "Answers (JSON)", answer: JSON.stringify(answers ?? null, null, 2) });

	for(const entry of exportRows)
		worksheet.addRow(entry);

	worksheet.getRow(1).font = { bold: true };
	worksheet.getColumn(1).alignment = { vertical: "top", wrapText: true };
	worksheet.getColumn(2).alignment = { vertical: "top", wrapText: true };

	const buffer = await workbook.xlsx.writeBuffer();
	const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
	const fileName = `survey-result-${row.id}-answers.xlsx`;

	return {
		fileName,
		mimeType,
		base64: Buffer.from(buffer).toString("base64")
	};
}
