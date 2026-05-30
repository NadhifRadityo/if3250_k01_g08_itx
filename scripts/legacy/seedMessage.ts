import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const payload = await getPayload({
	config: payloadConfig,
});

async function getOrCreateCreditApplicationId() {
	const existing = await payload.find({
		collection: "credit-applications",
		limit: 1,
		overrideAccess: true,
	});

	if (existing.docs[0]) {
		return existing.docs[0].id;
	}

	const created = await payload.create({
		overrideAccess: true,
		collection: "credit-applications",
		draft: true,
		data: {
			name: "CA-2026-OTP-0001",
		},
	});

	return created.id;
}

async function seedMessageLogs() {
	console.log("Seeding message logs...");

	const applicationId = await getOrCreateCreditApplicationId();

	const baseDate = new Date("2026-05-10T08:00:00.000Z");

	const logs = [
		{
			officerName: "Nadia Putri",
			waNumber: "081234567890",
			smsNumber: "na",
			email: "nadia@example.com",
			content: "Your OTP code has been sent for application verification.",
			waResponse: "Sent",
			smsResponse: "NA",
			emailResponse: "Sent",
			offsetMinutes: 0,
		},
		{
			officerName: "Bagus Wicaksono",
			waNumber: "082211223344",
			smsNumber: "082211223344",
			email: "bagus@example.com",
			content: "Your OTP code has been sent for login verification.",
			waResponse: "Failed",
			smsResponse: "Sent",
			emailResponse: "Sent",
			offsetMinutes: 5,
		},
		{
			officerName: "Rani Puspita",
			waNumber: "085612341234",
			smsNumber: "085612341234",
			email: "na@example.com",
			content: "Your OTP verification request has expired.",
			waResponse: "Sent",
			smsResponse: "Failed",
			emailResponse: "NA",
			offsetMinutes: 10,
		},
	] as const;

	for (const log of logs) {
		const time = new Date(
			baseDate.getTime() + log.offsetMinutes * 60 * 1000,
		).toISOString();

		await payload.create({
			collection: "message-logs",
			overrideAccess: true,
			data: {
				requestDate: time,
				officerName: log.officerName,
				applyId: applicationId,

				waNumber: log.waNumber,
				smsNumber: log.smsNumber,
				email: log.email,

				content: log.content,

				waResponse: log.waResponse,
				smsResponse: log.smsResponse,
				emailResponse: log.emailResponse,
			},
		});

	}

	console.log("Message logs seeded.");
	process.exit(0);
}

await seedMessageLogs();
