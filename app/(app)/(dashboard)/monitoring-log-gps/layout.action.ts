"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import type { CreditApplication } from "@/payload-types";

export type GpsLogQueryInput = {
	keyword: string;
};

export type GpsLogRow = {
	id: string;
	officerName: string;
	applyId: string;
	coordinates: string;
	ip: string;
	recordedAt: string;
	recordedAtRaw: string | null;
	status: "Valid" | "Warning" | "Missing";
};

export type GpsLogQueryResult = {
	docs: GpsLogRow[];
	totalDocs: number;
};

function formatDate(value?: string | null): string {
	if (!value) return "-";

	const date = new Date(value);
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

function resolveApplyId(value: string | CreditApplication | null | undefined): string {
	if (value == null) return "-";
	if (typeof value === "string") return value;

	return value.name ?? value.id ?? "-";
}

function resolveCoordinates(latitude?: number | null, longitude?: number | null): string {
	if (typeof latitude !== "number" || typeof longitude !== "number") return "-";

	return `${latitude}, ${longitude}`;
}

function resolveStatus(latitude?: number | null, longitude?: number | null, ip?: string | null): GpsLogRow["status"] {
	if (typeof latitude !== "number" || typeof longitude !== "number") return "Missing";
	if (!ip) return "Warning";

	return "Valid";
}

function matchesKeyword(row: GpsLogRow, keyword: string): boolean {
	const normalized = keyword.trim().toLowerCase();

	if (normalized.length === 0) return true;

	return `${row.id} ${row.officerName} ${row.applyId} ${row.coordinates} ${row.ip} ${row.recordedAt} ${row.status}`
		.toLowerCase()
		.includes(normalized);
}

export async function queryGpsLogViewerAction({
	keyword,
}: GpsLogQueryInput): Promise<GpsLogQueryResult> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });

	const { user } = await payload.auth({ headers });

	if (user == null) unauthorized();

	const response = await payload.find({
		collection: "gps-request-logs",
		depth: 1,
		limit: 100,
		pagination: true,
		sort: "-time",
		user,
		overrideAccess: false,
	});

	const rows: GpsLogRow[] = response.docs.map(doc => {
		const latitude = doc.gpsCoordinate?.latitude;
		const longitude = doc.gpsCoordinate?.longitude;

		return {
			id: doc.id ?? "-",
			officerName: doc.officerName ?? "-",
			applyId: resolveApplyId(doc.apply as string | CreditApplication | null | undefined),
			coordinates: resolveCoordinates(latitude, longitude),
			ip: doc.ip ?? "-",
			recordedAt: formatDate(doc.time),
			recordedAtRaw: doc.time ?? null,
			status: resolveStatus(latitude, longitude, doc.ip),
		};
	});

	const filteredRows = rows.filter(row => matchesKeyword(row, keyword));

	return {
		docs: filteredRows,
		totalDocs: filteredRows.length,
	};
}
