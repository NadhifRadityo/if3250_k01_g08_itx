import fs from "fs/promises";
import path from "path";
import url from "url";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const SCRIPT_DIRECTORY = path.dirname(url.fileURLToPath(import.meta.url));
const AUDIO_SOURCE_PATH = path.join(SCRIPT_DIRECTORY, "Saphir-Whorf Hypothesis.mp3");

const payload = await getPayload({ config: payloadConfig });

const filename = path.basename(AUDIO_SOURCE_PATH);

console.log(`[seedRecordingLogAudioFiles] Checking existing audio file '${filename}'...`);
const existing = (await payload.find({
	collection: "recording-log-audio-files",
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
	console.log(`[seedRecordingLogAudioFiles] Creating audio file '${filename}'...`);
	await payload.create({
		collection: "recording-log-audio-files",
		overrideAccess: true,
		file: {
			name: filename,
			data: await fs.readFile(AUDIO_SOURCE_PATH),
			mimetype: "audio/mpeg",
			size: (await fs.stat(AUDIO_SOURCE_PATH)).size
		},
		overwriteExistingFiles: true,
		data: {}
	});
} else
	console.log(`[seedRecordingLogAudioFiles] Audio file '${filename}' already exists (id: ${existing.id}), skipping.`);

console.log(`[seedRecordingLogAudioFiles] Done. Seeded recording log audio file '${filename}'.`);
