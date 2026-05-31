"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { getRelationshipId } from "@/utils/payload";
import { CreditApplication, CreditApplicationAssignment } from "@/payload-types";

async function ensureOfficerOwnsOfficerTask(
	{ payload, userId, officerTaskId }:
	{ payload: any, userId: string, officerTaskId: string }
) {
	const officerTask = await payload.findByID({
		overrideAccess: true,
		collection: "officer-tasks",
		id: officerTaskId,
		draft: true,
		trash: true,
		depth: 1,
		select: { creditApplicationAssignment: true },
		populate: { "credit-application-assignments": { officer: true } }
	});
	const officerId = getRelationshipId((officerTask.creditApplicationAssignment as CreditApplicationAssignment).officer);
	if(officerId != userId)
		throw new Error("This officer task is not assigned to you.");
	return officerTask;
}

export async function getContextAction(
	{ officerTaskId }:
	{ officerTaskId: string }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await ensureOfficerOwnsOfficerTask({ payload, userId: user.id, officerTaskId });
	const creditApplicationAssignmentId = getRelationshipId(officerTask.creditApplicationAssignment)!;
	const creditApplicationAssignment = await payload.findByID({
		overrideAccess: true,
		collection: "credit-application-assignments",
		id: creditApplicationAssignmentId,
		draft: true,
		trash: true,
		depth: 1,
		select: { creditApplication: true, dueDate: true },
		populate: { "credit-applications": { whatsappNumber: true } }
	});
	const dueDate = creditApplicationAssignment.dueDate;
	if(dueDate == null || Date.parse(dueDate) <= Date.now())
		throw new Error("Officer task is past its due date.");
	const whatsappNumber = (creditApplicationAssignment.creditApplication as CreditApplication).whatsappNumber;
	return {
		officerTaskId: officerTaskId,
		whatsappNumber: whatsappNumber,
		messagingEndpoint: process.env.MESSAGING_ENDPOINT!,
		messagingApiKey: process.env.MESSAGING_API_KEY!
	};
}

export async function appendRecordingLogsAction(
	{ officerTaskId, recordingUrls }:
	{ officerTaskId: string, recordingUrls: string[] }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const officerTask = await ensureOfficerOwnsOfficerTask({ payload, userId: user.id, officerTaskId });
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
	await payload.create({
		overrideAccess: true,
		collection: "recording-logs",
		data: {
			officerTask: officerTaskId,
			phoneNumber: whatsappNumber,
			recordingUrl: recordingUrls.join("\n")
		}
	});
	return { ok: true };
}
