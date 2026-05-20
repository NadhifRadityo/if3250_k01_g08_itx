import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");

type SeedSurvey = {
	content: any;
	description: string;
	key: string;
	title: string;
};

function createFormDefinition({
	formId,
	formTitle,
	startTitle,
	startDescription,
	questionName,
	questionText,
	endTitle
}: {
	endTitle: string;
	formId: string;
	formTitle: string;
	questionName: string;
	questionText: string;
	startDescription: string;
	startTitle: string;
}) {
	return {
		id: `form_${formId}`,
		title: formTitle,
		description: startDescription,
		settings: {
			buttonAlignment: "start",
			colorScheme: "light",
			formsmdBranding: "hide",
			isFullPage: false,
			localization: "id-ID",
			page: "form-slides",
			pageProgress: "show",
			placeholders: "show",
			restartButton: "show",
			rounded: "default",
			sanitize: true,
			saveState: false,
			slideControls: "show",
			verticalAlignment: "start"
		},
		slides: [
			{
				id: `start_${formId}`,
				kind: "start",
				title: startTitle,
				buttonText: "Mulai",
				blocks: [
					{ type: "heading", level: 1, align: "center", text: startTitle },
					{ type: "description", align: "center", text: startDescription }
				]
			},
			{
				id: `slide_${formId}`,
				kind: "slide",
				title: "Pertanyaan utama",
				blocks: [
					{ type: "heading", level: 2, text: "Catatan utama" },
					{
						type: "text",
						name: questionName,
						question: questionText,
						placeholder: "Tulis jawaban di sini",
						required: true
					}
				]
			},
			{
				id: `end_${formId}`,
				kind: "end",
				title: endTitle,
				blocks: [
					{ type: "heading", level: 1, align: "center", text: endTitle },
					{ type: "description", align: "center", text: "Respons berhasil dicatat." }
				]
			}
		]
	};
}

const SURVEY_SEEDS: SeedSurvey[] = [
	{
		key: "field-visit",
		title: "Field Visit Survey",
		description: "Operational survey used by officers during field visits.",
		content: createFormDefinition({
			formId: "field-visit",
			formTitle: "Field Visit Survey",
			startTitle: "Field Visit Checklist",
			startDescription: "Use this checklist to capture the key facts during the visit.",
			questionName: "visit_summary",
			questionText: "What is the most important finding from the visit?",
			endTitle: "Checklist completed"
		})
	},
	{
		key: "document-completeness",
		title: "Document Completeness Survey",
		description: "Back-office survey to verify document readiness before approval.",
		content: createFormDefinition({
			formId: "document-completeness",
			formTitle: "Document Completeness Survey",
			startTitle: "Document Review",
			startDescription: "Confirm each required document before the application moves forward.",
			questionName: "document_gap",
			questionText: "Which document needs the most attention?",
			endTitle: "Document review submitted"
		})
	}
];

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedSurveys] Starting survey seeding...");

// Get acting user (admin)
console.log("[seedSurveys] Looking up admin user...");
const actingUser = (await payload.find({
	collection: "users",
	overrideAccess: true,
	where: {
		email: { equals: "admin@local.local" }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
})).docs[0];
if(actingUser == null) throw new Error("Seed admin user is missing. Run 'payload run ./scripts/seedUsers.ts' first.");

// Seed surveys
for(const [index, seed] of SURVEY_SEEDS.entries()) {
	const publishedAt = isoAt(650 + index * 6);
	const pendingAt = isoAt(650 + index * 6 + 2);

	console.log(`[seedSurveys] Checking existing survey '${seed.title}'...`);
	const existing = (await payload.find({
		collection: "surveys",
		overrideAccess: true,
		where: {
			title: { equals: seed.title }
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		depth: 0
	})).docs[0];

	const publishedData = {
		title: seed.title,
		description: lexicalPlainText(seed.description),
		content: seed.content,
		createdAt: publishedAt,
		updatedAt: publishedAt,
		deletedAt: null,
		deletedBy: null,
		_status: "published" as const,
		reviewedAt: publishedAt,
		reviewedBy: actingUser.id,
		reviewApproved: true,
		reviewComment: lexicalPlainText(`Seed approved baseline for survey '${seed.title}'.`)
	};

	const pendingData = {
		title: seed.title,
		description: lexicalPlainText(seed.description),
		content: seed.content,
		createdAt: publishedAt,
		updatedAt: pendingAt,
		deletedAt: null,
		deletedBy: null,
		_status: "draft" as const,
		reviewedAt: null,
		reviewedBy: null,
		reviewApproved: null,
		reviewComment: null
	};

	let id: string;
	if(existing == null) {
		console.log(`[seedSurveys] Creating survey '${seed.title}' as draft...`);
		const created = await payload.create({
			collection: "surveys",
			user: actingUser,
			overrideAccess: true,
			data: pendingData,
			draft: true
		});
		id = created.id;
	} else {
		console.log(`[seedSurveys] Updating existing survey '${seed.title}' (id: ${existing.id})...`);
		id = existing.id;
		await payload.update({
			collection: "surveys",
			user: actingUser,
			overrideAccess: true,
			trash: true,
			id,
			data: pendingData,
			draft: true
		});
	}

	console.log(`[seedSurveys] Publishing survey '${seed.title}'...`);
	await payload.update({
		collection: "surveys",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: publishedData,
		draft: false
	});

	console.log(`[seedSurveys] Setting survey '${seed.title}' back to draft...`);
	await payload.update({
		collection: "surveys",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: pendingData,
		draft: true
	});
}

console.log(`[seedSurveys] Done. Seeded ${SURVEY_SEEDS.length} surveys with pending drafts.`);
