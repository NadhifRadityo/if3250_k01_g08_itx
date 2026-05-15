"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload, type Where } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText, getRelationshipId, leixcalPreprendPlainText } from "@/utils/payload";
import type { CreditApplication } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationCreditApplicationImports } from "../relation-navigation.actions";
import { RelationUser, RelationCreditApplicationImport } from "../relation-navigation.shared";
import { FormState } from "./layout.components";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`credit-application-imports:${string}`, RelationCreditApplicationImport>>;

const buildFilterWhere = (filters: MenuFilterState[]) => ({ or:
	filters.map(filter => ([{ [filter.columnKey]: { [filter.operator]: filter.value } }, filter.combinator ?? "and"] as const))
		.reduce((termGroups, [unit, combinator], i) => i == 0 || combinator == "and" ?
			[...termGroups.slice(0, -1), [...termGroups.at(-1)!, unit]] :
			[...termGroups, [unit]], [[]] as Where[][])
		.filter(termGroups => termGroups.length > 0)
		.map(termGroups => ({ and: termGroups }))
});

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: CreditApplication[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const creditApplicationImports = new Set<string>();
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
		const creditApplicationImport = getRelationshipId(doc.import);
		if(creditApplicationImport != null)
			creditApplicationImports.add(creditApplicationImport);
		const reviewedBy = getRelationshipId(doc.reviewedBy);
		if(reviewedBy != null)
			userIds.add(reviewedBy);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: [...userIds] }));
	Object.assign(relations, await resolveRelationCreditApplicationImports({ payload, ids: [...creditApplicationImports] }));
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
		collection: "credit-applications",
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
				{ addresses: { like: keyword } },
				{ phoneNumbers: { like: keyword } },
				{ whatsappNumber: { like: keyword } },
				{ smsNumber: { like: keyword } },
				{ collateralRegistryName: { like: keyword } },
				{ collateralName: { like: keyword } },
				{ assetId: { like: keyword } },
				{ assetName: { like: keyword } },
				{ vendor: { like: keyword } },
				{ otherText1: { like: keyword } },
				{ otherText2: { like: keyword } }
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
		collection: "credit-applications",
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
			import: true,
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
			otherText1: true,
			otherText2: true,
			otherNumber1: true,
			otherNumber2: true,
			otherDate1: true,
			otherDate2: true,
			others: true,
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
		collection: "credit-applications",
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
				import: true,
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
				otherText1: true,
				otherText2: true,
				otherNumber1: true,
				otherNumber2: true,
				otherDate1: true,
				otherDate2: true,
				others: true
			}
		}
	})).docs[0];
	const requestedVersion = requestedDoc?.version;
	if(requestedVersion == null)
		throw new Error("Draft credit application request could not be found.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "credit-applications",
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
				import: true,
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
				otherText1: true,
				otherText2: true,
				otherNumber1: true,
				otherNumber2: true,
				otherDate1: true,
				otherDate2: true,
				others: true
			}
		}
	})).docs[0]?.version;
	const relations = await resolveRelations({ payload, docs: [...(approvedVersion != null ? [approvedVersion] : []), requestedVersion] });
	return {
		requestType: requestedVersion.deletedAt != null ? "Delete" : approvedVersion == null ? "Create" : "Update",
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
		collection: "credit-applications",
		trash: true,
		pagination: false,
		depth: 0,
		sort: "-updatedAt",
		where: { parent: { equals: id } },
		select: {
			version: {
				_status: true,
				createdAt: true,
				createdBy: true,
				updatedAt: true,
				updatedBy: true,
				deletedAt: true,
				deletedBy: true,
				import: true,
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
				otherText1: true,
				otherText2: true,
				otherNumber1: true,
				otherNumber2: true,
				otherDate1: true,
				otherDate2: true,
				others: true,
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

	if(formState.name == null)
		throw new Error("Name is required");
	if(formState.addresses == null || formState.addresses.length == 0)
		throw new Error("Address is required");
	if(formState.phoneNumbers == null || formState.phoneNumbers.length == 0)
		throw new Error("Phone number is required");
	if(formState.whatsappNumber == null)
		throw new Error("WhatsApp number is required");

	if(formState.id == null) {
		const created = await payload.create({
			user: user,
			collection: "credit-applications",
			overrideAccess: true,
			draft: true,
			data: {
				_status: "draft",
				deletedAt: null,
				deletedBy: null,
				name: formState.name,
				email: formState.email,
				addresses: formState.addresses,
				phoneNumbers: formState.phoneNumbers,
				whatsappNumber: formState.whatsappNumber,
				smsNumber: formState.smsNumber,
				collateralRegistryName: formState.collateralRegistryName,
				collateralName: formState.collateralName,
				collateralDescription: formState.collateralDescription as any,
				assetId: formState.assetId,
				assetName: formState.assetName,
				assetDescription: formState.assetDescription as any,
				period: formState.period,
				installment: formState.installment,
				downPayment: formState.downPayment,
				plafond: formState.plafond,
				vendor: formState.vendor,
				remarks: formState.remarks as any,
				otherText1: formState.otherText1,
				otherText2: formState.otherText2,
				otherNumber1: formState.otherNumber1,
				otherNumber2: formState.otherNumber2,
				otherDate1: formState.otherDate1,
				otherDate2: formState.otherDate2,
				others: formState.others,
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
		collection: "credit-applications",
		id: formState.id,
		overrideAccess: true,
		draft: true,
		trash: true,
		data: {
			_status: "draft",
			deletedAt: null,
			deletedBy: null,
			name: formState.name,
			email: formState.email,
			addresses: formState.addresses,
			phoneNumbers: formState.phoneNumbers,
			whatsappNumber: formState.whatsappNumber,
			smsNumber: formState.smsNumber,
			collateralRegistryName: formState.collateralRegistryName,
			collateralName: formState.collateralName,
			collateralDescription: formState.collateralDescription as any,
			assetId: formState.assetId,
			assetName: formState.assetName,
			assetDescription: formState.assetDescription as any,
			period: formState.period,
			installment: formState.installment,
			downPayment: formState.downPayment,
			plafond: formState.plafond,
			vendor: formState.vendor,
			remarks: formState.remarks as any,
			otherText1: formState.otherText1,
			otherText2: formState.otherText2,
			otherNumber1: formState.otherNumber1,
			otherNumber2: formState.otherNumber2,
			otherDate1: formState.otherDate1,
			otherDate2: formState.otherDate2,
			others: formState.others,
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: null
		}
	});
	return { id: formState.id };
}

export async function requestDeleteAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "credit-applications",
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

export async function cancelRequestAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplication = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-applications",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(creditApplication.reviewedAt != null && creditApplication.reviewApproved != false)
		throw new Error("Cannot restore an approved request.");
	const approvedVersion = (await payload.findVersions({
		user: user,
		overrideAccess: true,
		collection: "credit-applications",
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
				import: true,
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
				otherText1: true,
				otherText2: true,
				otherNumber1: true,
				otherNumber2: true,
				otherDate1: true,
				otherDate2: true,
				others: true,
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
			collection: "credit-applications",
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
		collection: "credit-applications",
		id: id,
		overrideAccess: true,
		trash: true,
		data: {
			_status: "published",
			deletedAt: approvedVersion.deletedAt,
			deletedBy: getRelationshipId(approvedVersion.deletedBy),
			import: approvedVersion.import,
			name: approvedVersion.name,
			email: approvedVersion.email,
			addresses: approvedVersion.addresses,
			phoneNumbers: approvedVersion.phoneNumbers,
			whatsappNumber: approvedVersion.whatsappNumber,
			smsNumber: approvedVersion.smsNumber,
			collateralRegistryName: approvedVersion.collateralRegistryName,
			collateralName: approvedVersion.collateralName,
			collateralDescription: approvedVersion.collateralDescription,
			assetId: approvedVersion.assetId,
			assetName: approvedVersion.assetName,
			assetDescription: approvedVersion.assetDescription,
			period: approvedVersion.period,
			installment: approvedVersion.installment,
			downPayment: approvedVersion.downPayment,
			plafond: approvedVersion.plafond,
			vendor: approvedVersion.vendor,
			remarks: approvedVersion.remarks,
			otherText1: approvedVersion.otherText1,
			otherText2: approvedVersion.otherText2,
			otherNumber1: approvedVersion.otherNumber1,
			otherNumber2: approvedVersion.otherNumber2,
			otherDate1: approvedVersion.otherDate1,
			otherDate2: approvedVersion.otherDate2,
			others: approvedVersion.others,
			reviewedAt: approvedVersion.reviewedAt,
			reviewedBy: getRelationshipId(approvedVersion.reviewedBy),
			reviewApproved: approvedVersion.reviewApproved,
			reviewComment: leixcalPreprendPlainText(approvedVersion.reviewComment, `Auto-reviewed by system on behalf of ${JSON.stringify(approvedVersion.reviewedBy)} because the change request was cancelled before approval.`)
		}
	});
	return { id: id };
}

export async function requestRestoreAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplication = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-applications",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(creditApplication.deletedAt == null)
		throw new Error("Credit application is not deleted.");
	await payload.update({
		user: user,
		overrideAccess: true,
		collection: "credit-applications",
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

export async function reviewAction(
	{ id, decision, reviewComment }:
	{ id: string, decision: "approve" | "reject", reviewComment: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const creditApplication = await payload.findByID({
		user: user,
		overrideAccess: true,
		collection: "credit-applications",
		id: id,
		draft: true,
		trash: true,
		depth: 0
	});
	if(creditApplication.reviewedAt != null)
		throw new Error("This request has already been reviewed.");
	if(decision == "reject") {
		await payload.update({
			user: user,
			overrideAccess: true,
			collection: "credit-applications",
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
		collection: "credit-applications",
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
