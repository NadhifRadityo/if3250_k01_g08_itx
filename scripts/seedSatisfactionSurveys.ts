import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";

const BASE_TIMESTAMP = new Date("2026-05-16T00:00:00.000Z");

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

const SATISFACTION_SURVEY_SEEDS = [
	{
		key: "post-service",
		title: "Post Service Satisfaction Survey",
		description: "Customer satisfaction form sent after a service interaction.",
		content: createFormDefinition({
			formId: "post-service",
			formTitle: "Post Service Satisfaction Survey",
			startTitle: "Customer Satisfaction",
			startDescription: "Please tell us how the service felt from your side.",
			questionName: "service_feedback",
			questionText: "What should we improve in the next interaction?",
			endTitle: "Thanks for the feedback"
		})
	},
	{
		key: "post-disbursement",
		title: "Post Disbursement Satisfaction Survey",
		description: "Follow-up survey after the disbursement process is completed.",
		content: createFormDefinition({
			formId: "post-disbursement",
			formTitle: "Post Disbursement Satisfaction Survey",
			startTitle: "Disbursement Experience",
			startDescription: "We want to learn how smooth the disbursement process felt for you.",
			questionName: "disbursement_feedback",
			questionText: "What was the most memorable part of the process?",
			endTitle: "Feedback recorded"
		})
	}
];

function isoAt(minutesOffset: number): string {
	const value = new Date(BASE_TIMESTAMP);
	value.setUTCMinutes(value.getUTCMinutes() + minutesOffset);
	return value.toISOString();
}

const payload = await getPayload({ config: payloadConfig });

console.log("[seedSatisfactionSurveys] Starting satisfaction survey seeding...");

// Get acting user (admin)
console.log("[seedSatisfactionSurveys] Looking up admin user...");
const actingUser = (await payload.find({
	collection: "users",
	overrideAccess: true,
	where: {
		email: { equals: "seed.admin@local.local" }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
})).docs[0];
if(actingUser == null) throw new Error("Seed admin user is missing. Run 'payload run ./scripts/seedUsers.ts' first.");

// Seed satisfaction surveys
for(const [index, seed] of SATISFACTION_SURVEY_SEEDS.entries()) {
	const publishedAt = isoAt(700 + index * 6);
	const pendingAt = isoAt(700 + index * 6 + 2);

	console.log(`[seedSatisfactionSurveys] Checking existing satisfaction survey '${seed.title}'...`);
	const existing = (await payload.find({
		collection: "satsifaction-surveys",
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
		reviewComment: lexicalPlainText(`Seed approved baseline for satisfaction survey '${seed.title}'.`)
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
		console.log(`[seedSatisfactionSurveys] Creating satisfaction survey '${seed.title}' as draft...`);
		const created = await payload.create({
			collection: "satsifaction-surveys",
			user: actingUser,
			overrideAccess: true,
			data: pendingData,
			draft: true
		});
		id = created.id;
	} else {
		console.log(`[seedSatisfactionSurveys] Updating existing satisfaction survey '${seed.title}' (id: ${existing.id})...`);
		id = existing.id;
		await payload.update({
			collection: "satsifaction-surveys",
			user: actingUser,
			overrideAccess: true,
			trash: true,
			id,
			data: pendingData,
			draft: true
		});
	}

	console.log(`[seedSatisfactionSurveys] Publishing satisfaction survey '${seed.title}'...`);
	await payload.update({
		collection: "satsifaction-surveys",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: publishedData,
		draft: false
	});

	console.log(`[seedSatisfactionSurveys] Setting satisfaction survey '${seed.title}' back to draft...`);
	await payload.update({
		collection: "satsifaction-surveys",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: pendingData,
		draft: true
	});
}

console.log(`[seedSatisfactionSurveys] Done. Seeded ${SATISFACTION_SURVEY_SEEDS.length} satisfaction surveys with pending drafts.`);
