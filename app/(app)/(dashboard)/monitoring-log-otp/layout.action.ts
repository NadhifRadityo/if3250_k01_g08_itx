"use server";

import { headers as nextHeaders } from "next/headers";
import { unauthorized } from "next/navigation";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import type { CreditApplication } from "@/payload-types";

export type OTPLogResponse = "Sent" | "Failed" | "Pending" | "NA";

export type OTPLogRow = {
	id: string;
	requestDate: string;
	requestDateRaw: string | null;
	officerName: string;
	applyId: string;
	waNumber: string;
	smsNumber: string;
	email: string;
	content: string;
	waResponse: OTPLogResponse;
	smsResponse: OTPLogResponse;
	emailResponse: OTPLogResponse;
};

export type OTPLogQueryInput = {
	keyword: string;
};

export type OTPLogQueryResult = {
	docs: OTPLogRow[];
	totalDocs: number;
};

function formatDate(value?: string | null) {
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

function resolveApplyId(value: string | CreditApplication | null | undefined) {
	if (value == null) return "-";
	if (typeof value === "string") return value;

	return value.name ?? value.id ?? "-";
}

function normalizeResponse(value?: string | null): OTPLogResponse {
	if (value === "Sent" || value === "Failed" || value === "Pending" || value === "NA") {
		return value;
	}

	return "NA";
}

export async function queryOTPLogViewerAction({
	keyword,
}: OTPLogQueryInput): Promise<OTPLogQueryResult> {
	const headers = await nextHeaders();
	const payload = await getPayload({ config: payloadConfig });

	const { user } = await payload.auth({ headers });

	if (user == null) unauthorized();

	const response = await payload.find({
		collection: "otp-logs",
		depth: 1,
		limit: 100,
		sort: "-requestDate",
		user,
		overrideAccess: false,
	});

	const rows: OTPLogRow[] = response.docs.map(doc => ({
		id: doc.id ?? "-",
		requestDate: formatDate(doc.requestDate),
		requestDateRaw: doc.requestDate ?? null,
		officerName: doc.officerName ?? "-",
		applyId: resolveApplyId(doc.applyId as string | CreditApplication | null | undefined),
		waNumber: doc.waNumber ?? "na",
		smsNumber: doc.smsNumber ?? "na",
		email: doc.email ?? "na",
		content: doc.content ?? "-",
		waResponse: normalizeResponse(doc.waResponse),
		smsResponse: normalizeResponse(doc.smsResponse),
		emailResponse: normalizeResponse(doc.emailResponse),
	}));

	const normalizedKeyword = keyword.trim().toLowerCase();

	const filteredRows = normalizedKeyword
		? rows.filter(row =>
				`${row.id} ${row.requestDate} ${row.officerName} ${row.applyId} ${row.waNumber} ${row.smsNumber} ${row.email} ${row.content} ${row.waResponse} ${row.smsResponse} ${row.emailResponse}`
					.toLowerCase()
					.includes(normalizedKeyword),
			)
		: rows;

	return {
		docs: filteredRows,
		totalDocs: filteredRows.length,
	};
}
