"use server";

import { createHash } from "crypto";
import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, extractJWT, getPayload } from "payload";
import * as turf from "@turf/turf";

import payloadConfig from "@payload-config";
import { buildFilterWhere, lexicalPlainText, getRelationshipId } from "@/utils/payload";
import { OfficerTask, CreditApplication, CreditApplicationAssignment } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationOfficerTasks, resolveRelationCreditApplicationAssignments } from "../relation-navigation.actions";
import { RelationUser, RelationOfficerTask, RelationCreditApplicationAssignment } from "../relation-navigation.shared";
import { OTP_PERIOD_MS, GEOFENCE_MAX_ACCURACY_METERS, chainAndCreateNextOfficerTask, GEOFENCE_VALIDATION_WINDOW_CLIENT_MS, GEOFENCE_VALIDATION_WINDOW_SERVER_MS, type ActiveOfficerTaskKvData } from "./layout.shared";

const PAGE_LIMIT = 20;

export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`credit-application-assignments:${string}`, RelationCreditApplicationAssignment>> &
	Partial<Record<`officer-tasks:${string}`, RelationOfficerTask>>;

type GeofenceRegion = {
	id: string;
	operation: "union" | "difference" | "intersect" | "exclusion";
	type: "circle";
	latitude: number;
	longitude: number;
	radius: number;
} | {
	id: string;
	operation: "union" | "difference" | "intersect" | "exclusion";
	type: "polygon";
	positions: [number, number][];
} | {
	id: string;
	operation: "union" | "difference" | "intersect" | "exclusion";
	type: "rectangle";
	latitudeA: number;
	longitudeA: number;
	latitudeB: number;
	longitudeB: number;
};

function buildPolygonForGeofence(region: GeofenceRegion) {
	if(region.type == "circle")
		return turf.circle([region.longitude, region.latitude], region.radius, { steps: 64, units: "meters" });
	if(region.type == "rectangle") {
		return turf.polygon([[
			[region.longitudeA, region.latitudeA],
			[region.longitudeB, region.latitudeA],
			[region.longitudeB, region.latitudeB],
			[region.longitudeA, region.latitudeB],
			[region.longitudeA, region.latitudeA]
		]]);
	}
	if(region.type == "polygon") {
		return turf.polygon([[
			...region.positions.map(([lat, lng]) => [lng, lat]),
			[region.positions[0][1], region.positions[0][0]]
		] as [number, number][]]);
	}
	throw new Error("Unknown region type");
}

function combineGeofencePolygons(regions: GeofenceRegion[]) {
	let currentPolygon: any | null = null;
	for(let i = regions.length - 1; i >= 0; i--) {
		const region = regions[i];
		const polygon = buildPolygonForGeofence(region);
		if(currentPolygon == null) {
			currentPolygon = polygon;
			continue;
		}
		if(region.operation == "union")
			currentPolygon = turf.union(turf.featureCollection([currentPolygon, polygon])) ?? currentPolygon;
		else if(region.operation == "difference")
			currentPolygon = turf.difference(turf.featureCollection([currentPolygon, polygon])) ?? currentPolygon;
		else if(region.operation == "intersect")
			currentPolygon = turf.intersect(turf.featureCollection([currentPolygon, polygon])) ?? currentPolygon;
		else if(region.operation == "exclusion") {
			const union = turf.union(turf.featureCollection([currentPolygon, polygon]));
			const intersection = turf.intersect(turf.featureCollection([currentPolygon, polygon]));
			if(union != null && intersection != null)
				currentPolygon = turf.difference(turf.featureCollection([union, intersection])) ?? union;
			else if(union != null)
				currentPolygon = union;
		}
	}
	return currentPolygon;
}

function isPointInGeofenceRegions(
	{ latitude, longitude, geofenceRegions }:
	{ latitude: number, longitude: number, geofenceRegions: GeofenceRegion[] | null | undefined }
): boolean {
	if(geofenceRegions == null || geofenceRegions.length == 0)
		return true;
	const combined = combineGeofencePolygons(geofenceRegions);
	if(combined == null)
		return false;
	return turf.booleanPointInPolygon([longitude, latitude], combined);
}

export async function isOfficerInsideGeofenceRegions(
	{ payload, officerId, geofenceRegions, windowMs, at = Date.now() }:
	{ payload: Payload, officerId: string, geofenceRegions: GeofenceRegion[] | null | undefined, windowMs: number, at?: number }
): Promise<boolean> {
	if(geofenceRegions == null || geofenceRegions.length == 0)
		return true;
	const since = new Date(at - windowMs).toISOString();
	const result = await payload.find({
		overrideAccess: true,
		collection: "gps-logs",
		pagination: false,
		depth: 0,
		sort: "-createdAt",
		where: { and: [
			{ user: { equals: officerId } },
			{ createdAt: { greater_than_equal: since } },
			{ accuracy: { less_than_equal: GEOFENCE_MAX_ACCURACY_METERS } }
		] },
		select: { latitude: true, longitude: true, accuracy: true }
	});
	for(const log of result.docs) {
		if(typeof log.latitude != "number" || typeof log.longitude != "number")
			continue;
		if(typeof log.accuracy == "number" && log.accuracy > GEOFENCE_MAX_ACCURACY_METERS)
			continue;
		if(isPointInGeofenceRegions({
			latitude: log.latitude,
			longitude: log.longitude,
			geofenceRegions: geofenceRegions
		}))
			return true;
	}
	return false;
}

function generateTotp(
	{ creditApplicationAssignmentId, secret, at = Date.now() }:
	{ creditApplicationAssignmentId: string, secret: string, at?: number }
): string {
	const counter = Math.floor(at / OTP_PERIOD_MS);
	const seed = `${secret}:${creditApplicationAssignmentId}:${counter}`;
	const digest = createHash("sha256").update(seed).digest();
	const offset = digest[digest.length - 1] & 0x0f;
	const code = ((digest[offset] & 0x7f) << 24) |
		((digest[offset + 1] & 0xff) << 16) |
		((digest[offset + 2] & 0xff) << 8) |
		(digest[offset + 3] & 0xff);
	return (code % 1_000_000).toString().padStart(6, "0");
}

function verifyTotp(
	{ creditApplicationAssignmentId, secret, otp, at = Date.now() }:
	{ creditApplicationAssignmentId: string, secret: string, otp: string, at?: number }
): boolean {
	if(otp == null || otp.length != 6)
		return false;
	return generateTotp({ creditApplicationAssignmentId, secret, at }) == otp;
}

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: OfficerTask[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const creditApplicationAssignmentIds = new Set<string>();
	const officerTaskIds = new Set<string>();
	for(const doc of docs) {
		const createdBy = getRelationshipId(doc.createdBy);
		if(createdBy != null)
			userIds.add(createdBy);
		const updatedBy = getRelationshipId(doc.updatedBy);
		if(updatedBy != null)
			userIds.add(updatedBy);
		const creditApplicationAssignment = getRelationshipId(doc.creditApplicationAssignment);
		if(creditApplicationAssignment != null)
			creditApplicationAssignmentIds.add(creditApplicationAssignment);
		const next = getRelationshipId(doc.next);
		if(next != null)
			officerTaskIds.add(next);
		const evaluatedBy = getRelationshipId(doc.evaluatedBy);
		if(evaluatedBy != null)
			userIds.add(evaluatedBy);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: [...userIds] }));
	Object.assign(relations, await resolveRelationCreditApplicationAssignments({ payload, ids: [...creditApplicationAssignmentIds] }));
	Object.assign(relations, await resolveRelationOfficerTasks({ payload, ids: [...officerTaskIds] }));
	return relations;
}

async function annotateRows(
	{ payload, docs }:
	{ payload: Payload, docs: OfficerTask[] }
) {
	const previousDocs = (await payload.find({
		overrideAccess: true,
		collection: "officer-tasks",
		trash: true,
		pagination: false,
		depth: 0,
		where: { next: { in: docs.map(doc => doc.id) } },
		select: { next: true }
	})).docs.map(d => ({ ...d, next: getRelationshipId(d.next) }));
	const creditApplicationAssignments = (await payload.find({
		overrideAccess: true,
		collection: "credit-application-assignments",
		draft: true,
		trash: true,
		pagination: false,
		depth: 0,
		where: { id: { in: [...new Set(docs.map(d => getRelationshipId(d.creditApplicationAssignment)))] } },
		select: { dueDate: true }
	})).docs;
	const surveyResults = (await payload.find({
		overrideAccess: true,
		collection: "survey-results",
		pagination: false,
		depth: 0,
		where: { officerTask: { in: docs.map(doc => doc.id) } },
		select: { officerTask: true }
	})).docs.map(d => getRelationshipId(d.officerTask));
	const satisfactionSurveyResults = (await payload.find({
		overrideAccess: true,
		collection: "satisfaction-survey-results",
		pagination: false,
		depth: 0,
		where: { officerTask: { in: docs.map(doc => doc.id) } },
		select: { officerTask: true }
	})).docs.map(d => getRelationshipId(d.officerTask));
	return docs.map(doc => ({
		...doc,
		previous: previousDocs.find(d => d.next == doc.id)?.id,
		creditApplicationAssignmentDueDate: creditApplicationAssignments.find(c => c.id == getRelationshipId(doc.creditApplicationAssignment))?.dueDate,
		hasSurveyResult: surveyResults.includes(doc.id),
		hasSatisfactionSurveyResult: satisfactionSurveyResults.includes(doc.id)
	}));
}

export async function getActiveAction() {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	return await payload.kv.get<ActiveOfficerTaskKvData>(`officer-task:${user.id}`);
}

export async function queryAction(
	{ keyword, filters, columnsSort, pageIndex }:
	{ keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], pageIndex: number }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const result = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		page: pageIndex,
		limit: PAGE_LIMIT,
		depth: 0,
		sort: columnsSort.map(([columnKey, ascending]) => `${!ascending ? "-" : ""}${columnKey}`),
		where: { and: [
			{ next: { exists: false } },
			{ "creditApplicationAssignment.assignedDate": { less_than_equal: new Date().toISOString() } },
			{ "creditApplicationAssignment.deletedAt": { exists: false } },
			{ "creditApplicationAssignment.officer": { equals: user.id } },
			...(keyword.length > 0 ? [{ or: [
				{ id: { like: keyword } },
				{ "creditApplicationAssignment.creditApplication.name": { like: keyword } },
				{ "creditApplicationAssignment.creditApplication.email": { like: keyword } },
				{ "creditApplicationAssignment.officer.name": { like: keyword } },
				{ "creditApplicationAssignment.officer.email": { like: keyword } },
				{ "creditApplicationAssignment.survey.title": { like: keyword } },
				{ "creditApplicationAssignment.satisfactionSurvey.title": { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const annotatedDocs = await annotateRows({ payload, docs: result.docs });
	const relations = await resolveRelations({ payload, docs: result.docs });
	return { ...result, docs: annotatedDocs, relations };
}

export async function getDetailsAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "officer-tasks",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			createdBy: true,
			updatedAt: true,
			updatedBy: true,
			creditApplicationAssignment: true,
			creditApplicationAssignmentVersion: true,
			next: true,
			settledAt: true,
			settlementStatus: true,
			settlementComment: true,
			evaluatedAt: true,
			evaluatedBy: true,
			evaluationApproved: true,
			evaluationComment: true
		}
	});
	const annotatedDocs = await annotateRows({ payload, docs: [result] });
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: annotatedDocs[0], relations };
}

async function ensureOfficerOwnsOfficerTask(
	{ payload, userId, officerTaskId }:
	{ payload: Payload, userId: string, officerTaskId: string }
) {
	const officerTask = await payload.findByID({
		overrideAccess: true,
		collection: "officer-tasks",
		id: officerTaskId,
		draft: true,
		trash: true,
		depth: 1,
		select: { creditApplicationAssignment: true, settledAt: true, next: true },
		populate: { "credit-application-assignments": { officer: true, geofenceRegions: true } }
	});
	const creditApplicationAssignment = officerTask.creditApplicationAssignment;
	const officerId = getRelationshipId((creditApplicationAssignment as CreditApplicationAssignment).officer);
	if(officerId != userId)
		throw new Error("This officer task is not assigned to you.");
	return officerTask;
}

export async function activateAction(
	{ id }:
	{ id: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await ensureOfficerOwnsOfficerTask({ payload, userId: user.id, officerTaskId: id });
	if(officerTask.settledAt != null)
		throw new Error("Cannot activate a settled officer task.");
	if(getRelationshipId(officerTask.next) != null)
		throw new Error("Cannot activate an officer task that is not the latest in the chain.");
	await payload.kv.set(`officer-task:${user.id}`, {
		id: id,
		createdAt: Date.now(),
		otpEntered: false
	} satisfies ActiveOfficerTaskKvData);
	return { id: id };
}

export async function clearActiveAction() {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await payload.kv.delete(`officer-task:${user.id}`);
	return { ok: true };
}

export async function appendGpsLogAction(
	{ latitude, longitude, accuracy }:
	{ latitude: number, longitude: number, accuracy: number }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const sessionId = JSON.parse(Buffer.from(extractJWT({ payload, headers })!.split(".")[1], "base64url").toString("utf-8")).sid;
	const activeKv = await payload.kv.get<ActiveOfficerTaskKvData>(`officer-task:${user.id}`);
	await payload.create({
		overrideAccess: true,
		collection: "gps-logs",
		data: {
			user: user.id,
			sessionId: sessionId,
			officerTask: activeKv?.id,
			latitude: latitude,
			longitude: longitude,
			accuracy: accuracy
		}
	});
	let isInsideGeofence = true;
	if(activeKv?.id != null) {
		const officerTask = await payload.findByID({
			overrideAccess: true,
			collection: "officer-tasks",
			id: activeKv.id,
			trash: true,
			depth: 1,
			select: { creditApplicationAssignment: true },
			populate: { "credit-application-assignments": { geofenceRegions: true } }
		});
		const geofenceRegions = (officerTask.creditApplicationAssignment as CreditApplicationAssignment)?.geofenceRegions;
		if(geofenceRegions != null) {
			isInsideGeofence = await isOfficerInsideGeofenceRegions({
				payload: payload,
				officerId: user.id,
				geofenceRegions: geofenceRegions as any,
				windowMs: GEOFENCE_VALIDATION_WINDOW_CLIENT_MS
			});
		}
	}
	return { ok: true, isInsideGeofence };
}

export async function sendOtpMessageAction(
	{ id }:
	{ id: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const activeKv = await payload.kv.get<ActiveOfficerTaskKvData>(`officer-task:${user.id}`);
	if(activeKv?.id != id)
		throw new Error("This officer task is not active.");
	if(activeKv.otpEntered)
		throw new Error("OTP has already been entered for this officer task.");
	const officerTask = await ensureOfficerOwnsOfficerTask({ payload, userId: user.id, officerTaskId: id });
	const creditApplicationAssignmentId = getRelationshipId(officerTask.creditApplicationAssignment)!;
	const creditApplicationAssignment = await payload.findByID({
		overrideAccess: true,
		collection: "credit-application-assignments",
		id: creditApplicationAssignmentId,
		draft: true,
		trash: true,
		depth: 1,
		select: { creditApplication: true },
		populate: { "credit-applications": { whatsappNumber: true } }
	});
	const whatsappNumber = (creditApplicationAssignment.creditApplication as CreditApplication).whatsappNumber;
	const content = `Your OTP code is: ${generateTotp({ creditApplicationAssignmentId, secret: payload.secret })}. It is valid for 30 minutes.`;
	let deliveryStatus: "pending" | "failed" | "sent";
	try {
		const response = await fetch(new URL("/api/v1/messages", process.env.MESSAGING_ENDPOINT), {
			method: "POST",
			headers: {
				"X-API-Key": process.env.MESSAGING_API_KEY!,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				to: whatsappNumber,
				type: "text",
				content: content
			})
		});
		deliveryStatus = response.ok ? "sent" : "failed";
	} catch(_) {
		deliveryStatus = "failed";
	}
	await payload.create({
		overrideAccess: true,
		collection: "message-logs",
		data: {
			officerTask: id,
			content: content,
			whatsappNumber: whatsappNumber,
			whatsappDeliveryStatus: deliveryStatus
		}
	});
	return { ok: true };
}

export async function inputOtpAction(
	{ id, otp }:
	{ id: string, otp: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const activeKv = await payload.kv.get<ActiveOfficerTaskKvData>(`officer-task:${user.id}`);
	if(activeKv?.id != id)
		throw new Error("This officer task is not active.");
	if(activeKv.otpEntered)
		throw new Error("OTP has already been entered for this officer task.");
	const officerTask = await ensureOfficerOwnsOfficerTask({ payload, userId: user.id, officerTaskId: id });
	const creditApplicationAssignmentId = getRelationshipId(officerTask.creditApplicationAssignment)!;
	const geofenceRegions = (officerTask.creditApplicationAssignment as CreditApplicationAssignment).geofenceRegions;
	if(geofenceRegions != null) {
		const inside = await isOfficerInsideGeofenceRegions({
			payload: payload,
			officerId: user.id,
			geofenceRegions: geofenceRegions as any,
			windowMs: GEOFENCE_VALIDATION_WINDOW_SERVER_MS
		});
		if(!inside)
			throw new Error("Officer location is not within the geofence regions. Please enable your location and try again.");
	}
	const isValid = verifyTotp({ creditApplicationAssignmentId, secret: payload.secret, otp });
	if(!isValid)
		throw new Error("Invalid OTP code.");
	await payload.kv.set(`officer-task:${user.id}`, {
		...activeKv,
		otpEntered: true
	} satisfies ActiveOfficerTaskKvData);
	return { ok: true };
}

export async function finishAction(
	{ id, settlementComment }:
	{ id: string, settlementComment?: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await ensureOfficerOwnsOfficerTask({ payload, userId: user.id, officerTaskId: id });
	if(officerTask.settledAt != null)
		throw new Error("Officer task is already settled.");
	if(getRelationshipId(officerTask.next) != null)
		throw new Error("Cannot finish an officer task that is not the latest in the chain.");
	const surveyResult = await payload.find({
		overrideAccess: true,
		collection: "survey-results",
		pagination: false,
		limit: 1,
		depth: 0,
		where: { officerTask: { equals: id } },
		select: {}
	});
	if(surveyResult.docs.length == 0)
		throw new Error("Officer task has no submitted survey result.");
	await payload.update({
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		trash: true,
		data: {
			settledAt: new Date().toISOString(),
			settlementStatus: "finished",
			settlementComment: settlementComment ?? lexicalPlainText("")
		}
	});
	await payload.delete({
		overrideAccess: true,
		collection: "payload-kv",
		where: { and: [
			{ key: { contains: "officer-task:" } },
			{ "data.id": { equals: id } }
		] }
	});
	return { id: id };
}

export async function undoFinishAction(
	{ id }:
	{ id: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	await ensureOfficerOwnsOfficerTask({ payload, userId: user.id, officerTaskId: id });
	const fullOfficerTask = await payload.findByID({
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		trash: true,
		depth: 0
	});
	if(fullOfficerTask.settlementStatus != "finished")
		throw new Error("Officer task is not in 'finished' settlement status.");
	if(fullOfficerTask.evaluatedAt != null)
		throw new Error("Cannot undo finish on an evaluated officer task.");
	await payload.update({
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		trash: true,
		data: {
			settledAt: null,
			settlementStatus: null
		}
	});
	return { id: id };
}

export async function cancelAction(
	{ id, settlementComment }:
	{ id: string, settlementComment?: any }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await ensureOfficerOwnsOfficerTask({ payload, userId: user.id, officerTaskId: id });
	if(officerTask.settledAt != null)
		throw new Error("Officer task is already settled.");
	if(getRelationshipId(officerTask.next) != null)
		throw new Error("Cannot cancel an officer task that is not the latest in the chain.");
	await payload.update({
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		trash: true,
		data: {
			settledAt: new Date().toISOString(),
			settlementStatus: "cancelled",
			settlementComment: settlementComment ?? lexicalPlainText("Cancelled by officer")
		}
	});
	await payload.delete({
		overrideAccess: true,
		collection: "payload-kv",
		where: { and: [
			{ key: { contains: "officer-task:" } },
			{ "data.id": { equals: id } }
		] }
	});
	await chainAndCreateNextOfficerTask({ payload, previousOfficerTaskId: id, userId: user.id });
	return { id: id };
}

export async function sendSatisfactionSurveyMessageAction(
	{ id }:
	{ id: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await ensureOfficerOwnsOfficerTask({ payload, userId: user.id, officerTaskId: id });
	const creditApplicationAssignmentId = getRelationshipId(officerTask.creditApplicationAssignment)!;
	const fullOfficerTask = await payload.findByID({
		overrideAccess: true,
		collection: "officer-tasks",
		id: id,
		trash: true,
		depth: 0,
		select: { settlementStatus: true }
	});
	if(fullOfficerTask.settlementStatus != "finished")
		throw new Error("Officer task is not in 'finished' settlement status.");
	const existingSatisfaction = await payload.find({
		overrideAccess: true,
		collection: "satisfaction-survey-results",
		pagination: false,
		limit: 1,
		depth: 0,
		where: { officerTask: { equals: id } },
		select: {}
	});
	if(existingSatisfaction.docs.length > 0)
		throw new Error("Satisfaction survey has already been submitted for this officer task.");
	const creditApplicationAssignment = await payload.findByID({
		overrideAccess: true,
		collection: "credit-application-assignments",
		id: creditApplicationAssignmentId,
		draft: true,
		trash: true,
		depth: 1,
		select: { creditApplication: true },
		populate: { "credit-applications": { whatsappNumber: true } }
	});
	const whatsappNumber = (creditApplicationAssignment.creditApplication as CreditApplication).whatsappNumber;
	const content = `Please fill our satisfaction survey: ${payload.config.serverURL ?? ""}/fill-satisfaction-survey/${id}`;
	let deliveryStatus: "pending" | "failed" | "sent";
	try {
		const response = await fetch(new URL("/api/v1/messages", process.env.MESSAGING_ENDPOINT), {
			method: "POST",
			headers: {
				"X-API-Key": process.env.MESSAGING_API_KEY!,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				to: whatsappNumber,
				type: "text",
				content: content
			})
		});
		deliveryStatus = response.ok ? "sent" : "failed";
	} catch(_) {
		deliveryStatus = "failed";
	}
	await payload.create({
		overrideAccess: true,
		collection: "message-logs",
		data: {
			officerTask: id,
			content: content,
			whatsappNumber: whatsappNumber,
			whatsappDeliveryStatus: deliveryStatus
		}
	});
	return { ok: true };
}
