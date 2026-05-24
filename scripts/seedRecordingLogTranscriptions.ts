import fs from "fs/promises";
import path from "path";
import url from "url";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const SCRIPT_DIRECTORY = path.dirname(url.fileURLToPath(import.meta.url));
const TRANSCRIPT_SOURCE_PATH = path.join(SCRIPT_DIRECTORY, "Saphir-Whorf Hypothesis.txt");

const payload = await getPayload({ config: payloadConfig });

const filename = path.basename(TRANSCRIPT_SOURCE_PATH);

console.log(`[seedRecordingLogTranscriptions] Checking existing transcription '${filename}'...`);
const existing = (await payload.find({
	collection: "recording-log-transcriptions",
	overrideAccess: true,
	where: {
		filename: { equals: filename }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
})).docs[0];

if(existing == null) {
	console.log(`[seedRecordingLogTranscriptions] Creating transcription '${filename}'...`);
	await payload.create({
		collection: "recording-log-transcriptions",
		overrideAccess: true,
		file: {
			name: filename,
			data: await fs.readFile(TRANSCRIPT_SOURCE_PATH),
			mimetype: "text/plain",
			size: (await fs.stat(TRANSCRIPT_SOURCE_PATH)).size
		},
		overwriteExistingFiles: true,
		data: {}
	});
} else
	console.log(`[seedRecordingLogTranscriptions] Transcription '${filename}' already exists (id: ${existing.id}), skipping.`);

console.log(`[seedRecordingLogTranscriptions] Done. Seeded recording log transcription '${filename}'.`);
