"use server";

import { getPayload } from "payload";

import configPromise from "@payload-config";

export type GPSPoint = {
	latitude: number;
	longitude: number;
	time: string;
	ip?: string | null;
};

export type OfficerTrackingRow = {
	id: string;
	officerName: string;
	teamName: string;
	status: "On Duty" | "Offline";
	lastSeen: string;
	lastSeenRaw: string;
	location: string;
	latestCoordinate: {
		latitude: number;
		longitude: number;
	};
	points: GPSPoint[];
};

export type OfficerTrackingQueryResult = {
	docs: OfficerTrackingRow[];
	totalDocs: number;
};

function formatLastSeen(value: string) {
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short"
	}).format(new Date(value));
}

function getStatus(time: string): "On Duty" | "Offline" {
	const diffMs = Date.now() - new Date(time).getTime();
	const diffMinutes = diffMs / 1000 / 60;

	return diffMinutes <= 30 ? "On Duty" : "Offline";
}

export async function queryOfficerTrackingViewerAction(): Promise<OfficerTrackingQueryResult> {
	const payload = await getPayload({ config: configPromise });

	const result = await payload.find({
		collection: "gps-request-logs",
		limit: 1000,
		sort: "-time",
		depth: 1
	});

	const grouped = new Map<string, OfficerTrackingRow>();

	for(const log of result.docs as any[]) {
		const officerName = log.officerName ?? "-";
		const teamName = log.teamName ?? "-";
		const latitude = log.gpsCoordinate?.latitude;
		const longitude = log.gpsCoordinate?.longitude;

		if(typeof latitude !== "number" || typeof longitude !== "number") continue;

		const point: GPSPoint = {
			latitude,
			longitude,
			time: log.time,
			ip: log.ip
		};

		const existing = grouped.get(officerName);

		if(!existing) {
			grouped.set(officerName, {
				id: officerName,
				officerName,
				teamName,
				status: getStatus(log.time),
				lastSeen: formatLastSeen(log.time),
				lastSeenRaw: log.time,
				location: `${latitude}, ${longitude}`,
				latestCoordinate: {
					latitude,
					longitude
				},
				points: [point]
			});
		} else
			existing.points.push(point);
	}

	const docs = Array.from(grouped.values()).map(row => ({
		...row,
		points: row.points.sort(
			(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
		)
	}));

	return {
		docs,
		totalDocs: docs.length
	};
}
