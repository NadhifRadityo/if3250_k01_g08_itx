import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const SURVEY_RESULTS_COLLECTION = "survey-results" as const;

function startOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

function addDays(date: Date, days: number): Date {
	const copy = new Date(date);
	copy.setDate(copy.getDate() + days);
	return copy;
}

const payload = await getPayload({ config: payloadConfig });

const todayStart = startOfDay(new Date());
const todayEnd = addDays(todayStart, 1);
const yesterdayStart = addDays(todayStart, -1);

const [monitoringResult, reportResult] = await Promise.all([
	payload.find({
		collection: SURVEY_RESULTS_COLLECTION,
		overrideAccess: true,
		trash: true,
		draft: true,
		limit: 50,
		sort: "-createdAt",
		where: {
			and: [
				{ deletedAt: { exists: false } },
				{ createdAt: { greater_than_equal: todayStart.toISOString(), less_than: todayEnd.toISOString() } }
			]
		}
	}),
	payload.find({
		collection: SURVEY_RESULTS_COLLECTION,
		overrideAccess: true,
		trash: true,
		draft: true,
		limit: 50,
		sort: "-createdAt",
		where: {
			and: [
				{ deletedAt: { exists: false } },
				{ createdAt: { greater_than_equal: yesterdayStart.toISOString(), less_than: todayEnd.toISOString() } }
			]
		}
	})
]);

console.log(`Monitoring window: ${todayStart.toISOString()} - ${todayEnd.toISOString()}`);
console.log(`Monitoring docs: ${monitoringResult.totalDocs}`);
console.log(`Report window: ${yesterdayStart.toISOString()} - ${todayEnd.toISOString()}`);
console.log(`Report docs: ${reportResult.totalDocs}`);

const first = reportResult.docs[0];
if(first == null) {
	console.log("No survey-results docs found to verify detail.");
	process.exit(0);
}

const detail = await payload.findByID({
	collection: SURVEY_RESULTS_COLLECTION,
	overrideAccess: true,
	trash: true,
	draft: true,
	id: String(first.id),
	depth: 0
});

console.log("Sample survey result:");
console.log({
	id: String(detail.id),
	survey: detail.survey,
	creditApplication: detail.creditApplication,
	officer: detail.officer,
	createdAt: detail.createdAt,
	answers: detail.answers
});
