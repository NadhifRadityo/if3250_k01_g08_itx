"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { wsa, uwsa } from "@/utils/actions";
import { getRelationshipId } from "@/utils/payload";
import { User } from "@/payload-types";

import { isUserInsideGeofenceRegions } from "../../../(dashboard)/officer-task/executor.actions";
import { GEOFENCE_VALIDATION_WINDOW_CLIENT_MS, GEOFENCE_VALIDATION_WINDOW_SERVER_MS, type ActiveOfficerTaskKvData } from "../../../(dashboard)/officer-task/layout.shared";

async function ensureOfficerOwnsAndOtpEntered(
	{ payload, user, officerTaskId, windowMs }:
	{ payload: Payload, user: User, officerTaskId: string, windowMs: number }
) {
	const officerTask = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		id: officerTaskId,
		draft: true,
		trash: true,
		depth: 1,
		select: {
			creditApplicationAssignment: true,
			creditApplicationAssignmentVersion: true,
			settledAt: true,
			next: true
		},
		populate: { "credit-application-assignments": { officer: true, geofenceRegions: true, survey: true } }
	});
	const creditApplicationAssignment = officerTask.creditApplicationAssignment;
	const officerId = getRelationshipId((creditApplicationAssignment as any).officer);
	if(officerId != user.id)
		throw new Error("This officer task is not assigned to you.");
	if(officerTask.settledAt != null)
		throw new Error("Officer task is already settled.");
	if(getRelationshipId(officerTask.next) != null)
		throw new Error("Cannot fill survey for an officer task that is not the latest in the chain.");
	const activeKv = await payload.kv.get<ActiveOfficerTaskKvData>(`officer-task:${user.id}`);
	if(activeKv?.id != officerTaskId)
		throw new Error("This officer task is not active.");
	if(!activeKv.otpEntered)
		throw new Error("OTP has not been entered for this officer task.");
	const geofenceRegions = (creditApplicationAssignment as any).geofenceRegions ?? null;
	if(geofenceRegions != null) {
		const inside = await uwsa(isUserInsideGeofenceRegions)({
			payload: payload,
			user: user,
			geofenceRegions: geofenceRegions,
			windowMs: windowMs
		});
		if(!inside)
			throw new Error("Officer location is not within the geofence regions. Please enable your location and try again.");
	}
	return officerTask;
}

export const getContextAction = wsa(async (
	{ officerTaskId }:
	{ officerTaskId: string }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		id: officerTaskId,
		draft: true,
		trash: true,
		depth: 1,
		select: {
			creditApplicationAssignment: true,
			creditApplicationAssignmentVersion: true,
			settledAt: true,
			next: true
		},
		populate: { "credit-application-assignments": { officer: true, survey: true } }
	});
	const creditApplicationAssignment = officerTask.creditApplicationAssignment;
	const officerId = getRelationshipId((creditApplicationAssignment as any).officer);
	if(officerId != user.id)
		throw new Error("This officer task is not assigned to you.");
	const surveyId = getRelationshipId((creditApplicationAssignment as any).survey)!;
	const survey = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		id: surveyId,
		draft: true,
		trash: true,
		depth: 0,
		select: { id: true, title: true, content: true }
	});
	const surveyVersion = (await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: surveyId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {}
	})).docs[0];
	if(surveyVersion == null)
		throw new Error("Survey has no published version.");
	const existing = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "survey-results",
		pagination: false,
		limit: 1,
		depth: 0,
		where: { officerTask: { equals: officerTaskId } },
		select: { answers: true }
	});
	return {
		officerTaskId: officerTaskId,
		surveyId: survey.id,
		surveyVersionId: surveyVersion.id,
		surveyTitle: survey.title,
		surveyContent: survey.content,
		existingSurveyResultId: existing.docs[0]?.id ?? null,
		existingAnswers: existing.docs[0]?.answers ?? null
	};
});

export const checkGeofenceAction = wsa(async (
	{ officerTaskId }:
	{ officerTaskId: string }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		id: officerTaskId,
		draft: true,
		trash: true,
		depth: 1,
		select: { creditApplicationAssignment: true },
		populate: { "credit-application-assignments": { officer: true, geofenceRegions: true } }
	});
	const creditApplicationAssignment = officerTask.creditApplicationAssignment;
	const officerId = getRelationshipId((creditApplicationAssignment as any).officer);
	if(officerId != user.id)
		throw new Error("This officer task is not assigned to you.");
	const geofenceRegions = (creditApplicationAssignment as any).geofenceRegions ?? null;
	if(geofenceRegions == null)
		return { isInsideGeofence: true };
	const isInsideGeofence = await uwsa(isUserInsideGeofenceRegions)({
		payload: payload,
		user: user,
		geofenceRegions: geofenceRegions,
		windowMs: GEOFENCE_VALIDATION_WINDOW_CLIENT_MS
	});
	return { isInsideGeofence };
});

export const partialSubmitAction = wsa(async (
	{ officerTaskId, answers }:
	{ officerTaskId: string, answers: any }
) => {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await ensureOfficerOwnsAndOtpEntered({ payload, user, officerTaskId, windowMs: GEOFENCE_VALIDATION_WINDOW_SERVER_MS });
	const surveyId = getRelationshipId((officerTask.creditApplicationAssignment as any).survey)!;
	const surveyVersion = (await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: surveyId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {}
	})).docs[0];
	if(surveyVersion == null)
		throw new Error("Survey has no published version.");
	const existing = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "survey-results",
		pagination: false,
		limit: 1,
		depth: 0,
		where: { officerTask: { equals: officerTaskId } },
		select: {}
	});
	if(existing.docs.length > 0) {
		await payload.update({
			user: user,
			overrideAccess: false,
			collection: "survey-results",
			id: existing.docs[0].id,
			draft: true,
			trash: true,
			data: { _status: "draft", updatedAt: new Date().toISOString(), updatedBy: user.id, answers: answers }
		});
		return { id: existing.docs[0].id };
	}
	const created = await payload.create({
		user: user,
		overrideAccess: false,
		collection: "survey-results",
		draft: true,
		data: {
			_status: "draft",
			createdAt: new Date().toISOString(),
			createdBy: user.id,
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			survey: surveyId,
			surveyVersion: surveyVersion.id,
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
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await ensureOfficerOwnsAndOtpEntered({ payload, user, officerTaskId, windowMs: GEOFENCE_VALIDATION_WINDOW_SERVER_MS });
	const surveyId = getRelationshipId((officerTask.creditApplicationAssignment as any).survey)!;
	const surveyVersion = (await payload.findVersions({
		user: user,
		overrideAccess: false,
		collection: "surveys",
		pagination: false,
		limit: 1,
		depth: 0,
		sort: "-updatedAt",
		where: { and: [
			{ parent: { equals: surveyId } },
			{ "version._status": { equals: "published" } }
		] },
		select: {}
	})).docs[0];
	if(surveyVersion == null)
		throw new Error("Survey has no published version.");
	const existing = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "survey-results",
		pagination: false,
		limit: 1,
		depth: 0,
		where: { officerTask: { equals: officerTaskId } },
		select: {}
	});
	if(existing.docs.length > 0) {
		await payload.update({
			user: user,
			overrideAccess: false,
			collection: "survey-results",
			id: existing.docs[0].id,
			trash: true,
			data: { _status: "published", updatedAt: new Date().toISOString(), updatedBy: user.id, answers: answers }
		});
		return { id: existing.docs[0].id };
	}
	const created = await payload.create({
		user: user,
		overrideAccess: false,
		collection: "survey-results",
		data: {
			_status: "published",
			createdAt: new Date().toISOString(),
			createdBy: user.id,
			updatedAt: new Date().toISOString(),
			updatedBy: user.id,
			survey: surveyId,
			surveyVersion: surveyVersion.id,
			officerTask: officerTaskId,
			answers: answers
		}
	});
	return { id: created.id };
});
