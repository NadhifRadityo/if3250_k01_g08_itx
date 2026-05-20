import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import { lexicalPlainText } from "@/utils/payload";
import type { User } from "@/payload-types";

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

// Get acting user (admin)
const actingUserResult = await payload.find({
	collection: "users" as any,
	overrideAccess: true,
	where: {
		email: { equals: "seed.admin@local.local" }
	},
	limit: 1,
	sort: "-updatedAt",
	draft: false,
	trash: true,
	depth: 0
});
const actingUser = (actingUserResult.docs[0] as User | undefined) ?? null;
if(actingUser == null) throw new Error("Seed admin user is missing. Run 'payload run ./scripts/seedUsers.ts' first.");

// Seed satisfaction surveys
for(const [index, seed] of SATISFACTION_SURVEY_SEEDS.entries()) {
	const publishedAt = isoAt(700 + index * 6);
	const pendingAt = isoAt(700 + index * 6 + 2);

	const existingResult = await payload.find({
		collection: "satsifaction-surveys" as any,
		overrideAccess: true,
		where: {
			title: { equals: seed.title }
		},
		limit: 1,
		sort: "-updatedAt",
		draft: true,
		trash: true,
		depth: 0
	});
	const existing = (existingResult.docs[0] as { id: string } | undefined) ?? null;

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
		const created = await payload.create({
			collection: "satsifaction-surveys",
			user: actingUser,
			overrideAccess: true,
			data: pendingData,
			draft: true
		});
		id = created.id;
	} else {
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

	await payload.update({
		collection: "satsifaction-surveys",
		user: actingUser,
		overrideAccess: true,
		trash: true,
		id,
		data: publishedData,
		draft: false
	});

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

console.log(`Seeded ${SATISFACTION_SURVEY_SEEDS.length} satisfaction surveys with pending drafts.`);
