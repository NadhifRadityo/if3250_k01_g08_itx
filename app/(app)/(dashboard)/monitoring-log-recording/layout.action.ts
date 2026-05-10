"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import type { AudioFile, CreditApplication, RecordingLog, TextFile } from "@/payload-types";

const DEFAULT_LIMIT = 100;

export type RecordingLogQueryInput = {
	keyword: string;
};

export type RecordingLogRow = {
	id: string;
	officerName: string;
	applyId: string;
	phoneNumber: string;
	recordingName: string;
	recordingUrl: string | null;
	speechToTextName: string;
	speechToTextUrl: string | null;
	fileName: string;
	duration: string;
	durationSeconds: number;
	recordedAt: string;
	recordedAtRaw: string | null;
	status: "Available" | "Processing" | "Missing";
};
export type RecordingLogQueryResult = {
	docs: RecordingLogRow[];
	totalDocs: number;
};

function formatDuration(durationSeconds?: number | null): string {
	if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
		return "-";
	}

	const totalSeconds = Math.floor(durationSeconds);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatRecordedAt(dateValue?: string | null): string {
	if (dateValue == null) return "-";

	const date = new Date(dateValue);

	if (Number.isNaN(date.getTime())) return "-";

	return `${date.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})} ${date.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	})}`;
}

function resolveFileName(value: string | AudioFile | TextFile | null | undefined): string {
	if (value == null) return "-";
	if (typeof value === "string") return value;

	return value.filename ?? value.id ?? "-";
}
function resolveFileUrl(value: string | AudioFile | TextFile | null | undefined): string | null {
	if (value == null) return null;
	if (typeof value === "string") return null;

	return value.url ?? null;
}

function resolveApplyId(value: string | CreditApplication | null | undefined): string {
	if (value == null) return "-";
	if (typeof value === "string") return value;

	return value.name ?? value.id ?? "-";
}

function resolveStatus(
	recording: RecordingLog["recording"],
	speechToText: RecordingLog["speechToText"],
): RecordingLogRow["status"] {
	if (recording == null) return "Missing";
	if (speechToText == null) return "Processing";

	return "Available";
}

function getApplyValue(doc: RecordingLog) {
	if ("applyId" in doc) return doc.applyId;
	if ("application" in doc) return doc.application;

	return null;
}

function matchesKeyword(doc: RecordingLog, keyword: string): boolean {
	const normalized = keyword.trim().toLowerCase();

	if (normalized.length === 0) return true;

	const applyId = resolveApplyId(
		getApplyValue(doc) as string | CreditApplication | null | undefined,
	).toLowerCase();

	const recordingName = resolveFileName(doc.recording).toLowerCase();
	const speechToTextName = resolveFileName(doc.speechToText).toLowerCase();

	return (
		(doc.id ?? "").toLowerCase().includes(normalized) ||
		(doc.officerName ?? "").toLowerCase().includes(normalized) ||
		(doc.phoneNumber ?? "").toLowerCase().includes(normalized) ||
		applyId.includes(normalized) ||
		recordingName.includes(normalized) ||
		speechToTextName.includes(normalized)
	);
}

export async function queryRecordingLogViewerAction({
	keyword,
}: RecordingLogQueryInput): Promise<RecordingLogQueryResult> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });

	const { user } = await payload.auth({ headers });

	if (user == null) unauthorized();

	const response = await payload.find({
		collection: "recording-logs",
		depth: 1,
		limit: DEFAULT_LIMIT,
		pagination: true,
		sort: "-date",
		user,
		overrideAccess: false,
	});

	const filteredDocs = response.docs.filter(doc => matchesKeyword(doc, keyword));

	const rows: RecordingLogRow[] = filteredDocs.map(doc => {
		const applyValue = getApplyValue(doc);
		const durationSeconds = typeof doc.duration === "number" ? doc.duration : 0;

		return {
			id: doc.id ?? "-",
			officerName: doc.officerName ?? "-",
			applyId: resolveApplyId(applyValue as string | CreditApplication | null | undefined),
			phoneNumber: doc.phoneNumber ?? "-",
			recordingName: resolveFileName(doc.recording),
			recordingUrl: resolveFileUrl(doc.recording),

			speechToTextName: resolveFileName(doc.speechToText),
			speechToTextUrl: resolveFileUrl(doc.speechToText),
			fileName: resolveFileName(doc.recording),
			duration: formatDuration(doc.duration),
			durationSeconds,
			recordedAt: formatRecordedAt(doc.date),
			recordedAtRaw: doc.date ?? null,
			status: resolveStatus(doc.recording, doc.speechToText),
		};
	});

	return {
		docs: rows,
		totalDocs: rows.length,
	};
}
