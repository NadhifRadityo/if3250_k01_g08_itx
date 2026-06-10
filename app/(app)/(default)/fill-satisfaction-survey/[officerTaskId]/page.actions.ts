"use server";

import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa } from "@/utils/actions";
import { getRelationshipId } from "@/utils/payload";

async function ensureOfficerTaskIsEligible(
	{ payload, officerTaskId }:
	{ payload: Payload, officerTaskId: string }
) {
	const officerTask = await payload.findByID({
		overrideAccess: true,
		collection: "officer-tasks",
		id: officerTaskId,
		trash: true,
		depth: 1,
		select: { creditApplicationAssignment: true, settledAt: true, settlementStatus: true },
		populate: { "credit-application-assignments": { satisfactionSurvey: true } }
	});
	if(officerTask.settledAt == null || officerTask.settlementStatus != "finished")
		throw new Error("Officer task is not in finished state.");
	return officerTask;
}

export const getContextAction = wsa(async (
	{ officerTaskId }:
	{ officerTaskId: string }
) => {
	const payload = await getPayload({ config: payloadConfig });

	const officerTask = await payload.findByID({
		overrideAccess: true,
		collection: "officer-tasks",
		id: officerTaskId,
		trash: true,
		depth: 1,
		select: { creditApplicationAssignment: true, settledAt: true, settlementStatus: true },
		populate: { "credit-application-assignments": { satisfactionSurvey: true } }
	});
	if(officerTask.settledAt == null || officerTask.settlementStatus != "finished")
		throw new Error("Officer task is not in finished state.");
	const satisfactionSurveyId = getRelationshipId((officerTask.creditApplicationAssignment as any).satisfactionSurvey)!;
	const satisfactionSurvey = await payload.findByID({
		overrideAccess: true,
		collection: "satisfaction-surveys",
		id: satisfactionSurveyId,
		draft: true,
		trash: true,
		depth: 0,
		select: { id: true, title: true, content: true }
	});
	const satisfactionSurveyVersion = (await payload.findVersions({
		overrideAccess: true,
		collection: "satisfaction-surveys",
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: satisfactionSurveyId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {}
	})).docs[0];
	if(satisfactionSurveyVersion == null)
		throw new Error("Satisfaction survey has no published version.");
	const existing = await payload.find({
		overrideAccess: true,
		collection: "satisfaction-survey-results",
		pagination: false,
		limit: 1,
		depth: 0,
		where: { officerTask: { equals: officerTaskId } },
		select: { answers: true }
	});
	return {
		officerTaskId: officerTaskId,
		satisfactionSurveyId: satisfactionSurvey.id,
		satisfactionSurveyVersionId: satisfactionSurveyVersion.id,
		satisfactionSurveyTitle: satisfactionSurvey.title,
		satisfactionSurveyContent: satisfactionSurvey.content,
		existingSatisfactionSurveyResultId: existing.docs[0]?.id ?? null,
		existingAnswers: existing.docs[0]?.answers ?? null,
		alreadySubmitted: existing.docs[0] != null
	};
});

export const partialSubmitAction = wsa(async (
	{ officerTaskId, answers }:
	{ officerTaskId: string, answers: any }
) => {
	const payload = await getPayload({ config: payloadConfig });

	const officerTask = await ensureOfficerTaskIsEligible({ payload, officerTaskId });
	const satisfactionSurveyId = getRelationshipId((officerTask.creditApplicationAssignment as any).satisfactionSurvey)!;
	const satisfactionSurveyVersion = (await payload.findVersions({
		overrideAccess: true,
		collection: "satisfaction-surveys",
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: satisfactionSurveyId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {}
	})).docs[0];
	if(satisfactionSurveyVersion == null)
		throw new Error("Satisfaction survey has no published version.");
	const existing = await payload.find({
		overrideAccess: true,
		collection: "satisfaction-survey-results",
		pagination: false,
		limit: 1,
		depth: 0,
		where: { officerTask: { equals: officerTaskId } },
		select: {}
	});
	if(existing.docs.length > 0) {
		await payload.update({
			overrideAccess: true,
			collection: "satisfaction-survey-results",
			id: existing.docs[0].id,
			draft: true,
			trash: true,
			data: { _status: "draft", updatedAt: new Date().toISOString(), updatedBy: null, answers: answers }
		});
		return { id: existing.docs[0].id };
	}
	const created = await payload.create({
		overrideAccess: true,
		collection: "satisfaction-survey-results",
		draft: true,
		data: {
			_status: "draft",
			createdAt: new Date().toISOString(),
			createdBy: null,
			updatedAt: new Date().toISOString(),
			updatedBy: null,
			satisfactionSurvey: satisfactionSurveyId,
			satisfactionSurveyVersion: satisfactionSurveyVersion.id,
			officerTask: officerTaskId,
			answers: answers
		}
	});
	return { id: created.id };
});

export const submitAction = wsa(async (
	{ officerTaskId, answers }:
	{ officerTaskId: string, answers: any }
) => {
	const payload = await getPayload({ config: payloadConfig });

	const officerTask = await ensureOfficerTaskIsEligible({ payload, officerTaskId });
	const satisfactionSurveyId = getRelationshipId((officerTask.creditApplicationAssignment as any).satisfactionSurvey)!;
	const satisfactionSurveyVersion = (await payload.findVersions({
		overrideAccess: true,
		collection: "satisfaction-surveys",
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: satisfactionSurveyId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {}
	})).docs[0];
	if(satisfactionSurveyVersion == null)
		throw new Error("Satisfaction survey has no published version.");
	const existing = await payload.find({
		overrideAccess: true,
		collection: "satisfaction-survey-results",
		pagination: false,
		limit: 1,
		depth: 0,
		where: { officerTask: { equals: officerTaskId } },
		select: {}
	});
	if(existing.docs.length > 0) {
		await payload.update({
			overrideAccess: true,
			collection: "satisfaction-survey-results",
			id: existing.docs[0].id,
			trash: true,
			data: { _status: "published", updatedAt: new Date().toISOString(), updatedBy: null, answers: answers }
		});
		return { id: existing.docs[0].id };
	}
	const created = await payload.create({
		overrideAccess: true,
		collection: "satisfaction-survey-results",
		data: {
			_status: "published",
			createdAt: new Date().toISOString(),
			createdBy: null,
			updatedAt: new Date().toISOString(),
			updatedBy: null,
			satisfactionSurvey: satisfactionSurveyId,
			satisfactionSurveyVersion: satisfactionSurveyVersion.id,
			officerTask: officerTaskId,
			answers: answers
		}
	});
	return { id: created.id };
});
