import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const payload = await getPayload({ config: payloadConfig });

const SEED_DIR = path.join(process.cwd(), ".seed-files");


async function ensureSeedFiles() {
	await mkdir(SEED_DIR, { recursive: true });

	const audioPath = path.join(SEED_DIR, "sample-recording.wav");
	const textPath = path.join(SEED_DIR, "sample-transcript.txt");

	await writeFile(audioPath, Buffer.from("RIFF....WAVEfmt "));

	await writeFile(
		textPath,
		"Sample speech to text transcript for seeded recording log.",
	);

	return {
		audioPath,
		textPath,
	};
}

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

async function seedRecordingLogs() {
	console.log("Seeding recording logs...");

	const applicationId = await getFirstCreditApplicationId();

	const { audioPath, textPath } = await ensureSeedFiles();

	const audioFile = await payload.create({
		overrideAccess: true,
		collection: "audio-files",
		filePath: audioPath,
		data: {
		}
	});

	const textFile = await payload.create({
		overrideAccess: true,
		collection: "text-files",
		filePath: textPath,
		data: {
		},
	});

	const records = [
		{
			recordingId: "REC-SEED-001",
			date: "2026-05-10T08:30:00.000Z",
			officerName: "Nadia Putri",
			phoneNumber: "081234567890",
			duration: 321,
		},
		{
			recordingId: "REC-SEED-002",
			date: "2026-05-10T09:10:00.000Z",
			officerName: "Bagus Wicaksono",
			phoneNumber: "082211223344",
			duration: 187,
		},
		{
			recordingId: "REC-SEED-003",
			date: "2026-05-10T10:05:00.000Z",
			officerName: "Rani Puspita",
			phoneNumber: "085612341234",
			duration: 452,
		},
	];

	for (const record of records) {
		const existing = await payload.find({
			collection: "recording-logs",
			where: {
				recordingId: {
					equals: record.recordingId,
				},
			},
			limit: 1,
			overrideAccess: true,
		});

		const data = {
			...record,

			application: applicationId,

			recording: audioFile.id,
			speechToText: textFile.id,
		};

		if (existing.docs.length > 0) {
			await payload.update({
				collection: "recording-logs",
				id: existing.docs[0].id,
				overrideAccess: true,
				data,
			});

			console.log(`Updated ${record.recordingId}`);
		} else {
			await payload.create({
				collection: "recording-logs",
				overrideAccess: true,
				draft:true,
				data,
			});

			console.log(`Created ${record.recordingId}`);
		}
	}

	console.log("Recording logs seeded.");
	process.exit(0);
}

await seedRecordingLogs();
