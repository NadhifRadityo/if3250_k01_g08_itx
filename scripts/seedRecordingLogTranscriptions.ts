import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPT_SOURCE_PATH = path.join(SCRIPT_DIRECTORY, "Saphir-Whorf Hypothesis.txt");

const payload = await getPayload({ config: payloadConfig });

const filename = path.basename(TRANSCRIPT_SOURCE_PATH);
const existingResult = await payload.find({
	collection: "recording-log-transcriptions" as any,
	overrideAccess: true,
	where: {
		filename: { equals: filename }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
});
const existing = (existingResult.docs[0] as { id: string } | undefined) ?? null;

if(existing == null) {
	await payload.create({
		collection: "recording-log-transcriptions",
		overrideAccess: true,
		filePath: TRANSCRIPT_SOURCE_PATH,
		data: {}
	});
}

console.log(`Seeded recording log transcription '${filename}'.`);
