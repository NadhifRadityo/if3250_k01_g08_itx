"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { Payload, getPayload } from "payload";

import payloadConfig from "@payload-config";
import { buildFilterWhere, getRelationshipId } from "@/utils/payload";
import { RecordingLog } from "@/payload-types";

import { MenuFilterState } from "../layout.components";
import { resolveRelationUsers, resolveRelationCreditApplications, resolveRelationRecordingLogAudioFiles, resolveRelationRecordingLogTranscriptions } from "../relation-navigation.actions";
import { RelationUser, RelationCreditApplication, RelationRecordingLogAudioFile, RelationRecordingLogTranscription } from "../relation-navigation.shared";

const PAGE_LIMIT = 20;
export type RelationValues = Partial<Record<`users:${string}`, RelationUser>> &
	Partial<Record<`credit-applications:${string}`, RelationCreditApplication>> &
	Partial<Record<`recording-log-audio-files:${string}`, RelationRecordingLogAudioFile>> &
	Partial<Record<`recording-log-transcriptions:${string}`, RelationRecordingLogTranscription>>;

async function resolveRelations(
	{ payload, docs }:
	{ payload?: Payload, docs: RecordingLog[] }
) {
	payload ??= await getPayload({ config: payloadConfig });
	const userIds = new Set<string>();
	const creditApplicationIds = new Set<string>();
	const audioFileIds = new Set<string>();
	const transcriptionIds = new Set<string>();
	for(const doc of docs) {
		const creditApplication = getRelationshipId(doc.creditApplication);
		if(creditApplication != null)
			creditApplicationIds.add(creditApplication);
		const officer = getRelationshipId(doc.officer);
		if(officer != null)
			userIds.add(officer);
		const audioFile = getRelationshipId(doc.audioFile);
		if(audioFile != null)
			audioFileIds.add(audioFile);
		const transcription = getRelationshipId(doc.transcription);
		if(transcription != null)
			transcriptionIds.add(transcription);
	}
	const relations = {} as RelationValues;
	Object.assign(relations, await resolveRelationUsers({ payload, ids: [...userIds] }));
	Object.assign(relations, await resolveRelationCreditApplications({ payload, ids: [...creditApplicationIds] }));
	Object.assign(relations, await resolveRelationRecordingLogAudioFiles({ payload, ids: [...audioFileIds] }));
	Object.assign(relations, await resolveRelationRecordingLogTranscriptions({ payload, ids: [...transcriptionIds] }));
	return relations;
}

async function queryAction(
	{ mode, keyword, filters, columnsSort, pageIndex }:
	{ mode: "monitoring" | "reporting", keyword: string, filters: MenuFilterState[], columnsSort: [string, boolean][], pageIndex: number }
) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();
	const result = await payload.find({
		user: user,
		overrideAccess: false,
		collection: "recording-logs",
		depth: 0,
		page: pageIndex,
		limit: PAGE_LIMIT,
		sort: columnsSort.map(([columnKey, ascending]) => `${!ascending ? "-" : ""}${columnKey}`),
		where: { and: [
			...(mode == "monitoring" ? [
				{ createdAt: { greater_than_equal: new Date(new Date().setHours(0, 0, 0, 0)).toISOString() } },
				{ createdAt: { less_than_equal: new Date(new Date().setHours(23, 59, 59, 999)).toISOString() } }
			] : []),
			...(keyword.length > 0 ? [{ or: [
				{ id: { like: keyword } },
				{ "creditApplication.name": { like: keyword } },
				{ "creditApplication.email": { like: keyword } },
				{ "officer.name": { like: keyword } },
				{ "officer.email": { like: keyword } },
				{ phoneNumber: { like: keyword } },
				{ "audioFile.filename": { like: keyword } },
				{ "transcription.filename": { like: keyword } }
			] }] : []),
			buildFilterWhere(filters)
		] }
	});
	const relations = await resolveRelations({ payload, docs: result.docs });
	return { ...result, relations };
}

export async function queryReportingAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "reporting" });
}
export async function queryMonitoringAction(p: Omit<Parameters<typeof queryAction>[0], "mode">) {
	return await queryAction({ ...p, mode: "monitoring" });
}

export async function getDetailsAction(id: string) {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });
	const { user } = await payload.auth({ headers });
	if(user == null) return unauthorized();

	const result = await payload.findByID({
		user: user,
		overrideAccess: false,
		collection: "recording-logs",
		id: id,
		depth: 0,
		select: {
			createdAt: true,
			creditApplication: true,
			officer: true,
			phoneNumber: true,
			audioFile: true,
			transcription: true
		}
	});
	const relations = await resolveRelations({ payload, docs: [result] });
	return { row: result, relations };
}
