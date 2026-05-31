import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const payload = await getPayload({ config: payloadConfig });

async function getFirstCreditApplicationId() {
	const result = await payload.find({
		collection: "credit-applications",
		limit: 1,
		overrideAccess: true,
	});

	const application = result.docs[0];

	if (application == null) {
		throw new Error("No credit application found.");
	}

	return application.id;
}

async function seedGPSRequestLogs() {
	console.log("Seeding GPS request logs...");

	const applicationId = await getFirstCreditApplicationId();

	const baseDate = new Date("2026-05-10T08:00:00.000Z");

	const officers = [
		{
			officerName: "Nadia Putri",
			teamName: "Team Bandung",
			ip: "36.88.120.10",
			points: [
				[-6.914744, 107.60981],
				[-6.915201, 107.61112],
				[-6.916422, 107.61244],
				[-6.917801, 107.61401],
				[-6.918933, 107.61555],
			],
		},
		{
			officerName: "Bagus Wicaksono",
			teamName: "Team Jakarta",
			ip: "182.253.10.22",
			points: [
				[-6.21462, 106.84513],
				[-6.21555, 106.84602],
				[-6.21621, 106.84711],
				[-6.21704, 106.84873],
				[-6.21818, 106.85042],
			],
		},
	];

	for (const officer of officers) {
		for (const [index, point] of officer.points.entries()) {
			const [latitude, longitude] = point;

			const time = new Date(
				baseDate.getTime() + index * 5 * 60 * 1000,
			).toISOString();

			await payload.create({
				collection: "gps-request-logs",
				overrideAccess: true,
				data: {
					officerName: officer.officerName,
					teamName: officer.teamName,
					time,

					apply: applicationId,

					gpsCoordinate: {
						latitude,
						longitude,
					},

					ip: officer.ip,
				},
			});

			console.log(
				`Created GPS log ${officer.officerName} ${latitude},${longitude}`,
			);
		}
	}

	console.log("GPS request logs seeded.");
	process.exit(0);
}

await seedGPSRequestLogs();
