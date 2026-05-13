import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPayload } from "payload";

import payloadConfig from "@payload-config";
import type { User, Survey, CreditApplication } from "@/payload-types";

const SURVEY_RESULTS_COLLECTION = "survey-results" as const;
const DEFAULT_ADMIN_EMAIL = "admin@local.local";
const SEEDED_SURVEY_TITLE = "Seeded Survey Template - Survey Result Report";
const SEEDED_SURVEY_REVIEW_COMMENT = "Seeded survey template for survey result monitoring/reporting.";
const SEEDED_IMPORT_FILENAME = "placeholder-credit-application-import.xlsx";
const SEEDED_CUSTOMER_EMAIL_SUFFIX = "@survey-result-seed.local";
const PLACEHOLDER_IMPORT_RELATIVE_PATH = "uploads/credit-application-imports/placeholder-credit-application-import.xlsx";

type RichTextValue = NonNullable<Survey["reviewComment"]>;

function plainTextToRichText(value: string): RichTextValue {
	const text = value.trim();
	return {
		root: {
			type: "root",
			version: 1,
			format: "",
			indent: 0,
			direction: null,
			children: [
				{
					type: "paragraph",
					version: 1,
					format: "",
					indent: 0,
					direction: null,
					children: text.length == 0 ? [] : [
						{
							type: "text",
							version: 1,
							text,
							format: 0,
							detail: 0,
							mode: "normal",
							style: ""
						}
					]
				}
			]
		}
	};
}

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

function addMinutes(date: Date, minutes: number): Date {
	const copy = new Date(date);
	copy.setMinutes(copy.getMinutes() + minutes);
	return copy;
}

const payload = await getPayload({ config: payloadConfig });

async function ensureSeedImportDocument(): Promise<string> {
	const existing = await payload.find({
		collection: "credit-application-imports",
		where: { filename: { equals: SEEDED_IMPORT_FILENAME } },
		limit: 1,
		sort: "-updatedAt",
		overrideAccess: true,
		draft: true,
		trash: true
	});

	if(existing.docs.length > 0)
		return String(existing.docs[0].id);

	const absolutePath = path.resolve(process.cwd(), PLACEHOLDER_IMPORT_RELATIVE_PATH);
	let data: Buffer;
	try {
		data = await readFile(absolutePath);
	} catch{
		await mkdir(path.dirname(absolutePath), { recursive: true });
		await writeFile(absolutePath, "placeholder");
		data = await readFile(absolutePath);
	}

	if(data.byteLength == 0)
		throw new Error(`Placeholder import file is empty: ${PLACEHOLDER_IMPORT_RELATIVE_PATH}`);

	const created = await payload.create({
		collection: "credit-application-imports",
		overrideAccess: true,
		file: {
			name: SEEDED_IMPORT_FILENAME,
			data,
			size: data.byteLength,
			mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		},
		data: {
			description: plainTextToRichText("Seeded placeholder import for survey result report."),
			reviewedAt: null,
			reviewedBy: null,
			reviewApproved: null,
			reviewComment: plainTextToRichText("Seeded placeholder import refreshed by seedSurveyResultReport script."),
			deletedAt: null,
			deletedBy: null
		}
	});

	console.log(`Created credit application import '${SEEDED_IMPORT_FILENAME}'.`);
	return String(created.id);
}

async function resolveAdminUser(): Promise<User> {
	const result = await payload.find({
		collection: "users",
		where: { email: { equals: DEFAULT_ADMIN_EMAIL } },
		limit: 1,
		overrideAccess: true,
		trash: true
	});

	if(result.docs.length == 0)
		throw new Error(`Admin user '${DEFAULT_ADMIN_EMAIL}' not found. Run 'pnpm seed:admin' first.`);

	return result.docs[0];
}

async function resolveOfficerUsers(limit: number): Promise<User[]> {
	const result = await payload.find({
		collection: "users",
		where: {
			and: [
				{ deletedAt: { exists: false } },
				{ "role.level": { equals: "officer" } }
			]
		},
		limit,
		sort: "email",
		overrideAccess: true,
		trash: true
	});

	if(result.docs.length == 0)
		throw new Error("No officer users found. Run 'pnpm seed:user-role-team' first.");

	return result.docs;
}

async function resolveSeedCreditApplications(limit: number): Promise<CreditApplication[]> {
	const result = await payload.find({
		collection: "credit-applications",
		where: {
			email: { like: SEEDED_CUSTOMER_EMAIL_SUFFIX }
		},
		limit,
		sort: "email",
		overrideAccess: true,
		draft: true,
		trash: true
	});

	if(result.docs.length >= limit)
		return result.docs;

	const importId = await ensureSeedImportDocument();

	const existing = result.docs;
	const existingEmails = new Set(existing.map(doc => typeof doc.email == "string" ? doc.email : ""));
	const toCreateCount = Math.max(0, limit - existing.length);
	const created: CreditApplication[] = [];

	for(let index = 0; index < toCreateCount; index++) {
		const number = existing.length + index + 1;
		const email = `customer${String(number).padStart(2, "0")}${SEEDED_CUSTOMER_EMAIL_SUFFIX}`;
		if(existingEmails.has(email))
			continue;

		const createdDoc = await payload.create({
			collection: "credit-applications",
			overrideAccess: true,
			draft: false,
			data: {
				_status: "published",
				import: importId,
				name: `Seed Customer ${String(number).padStart(2, "0")}`,
				email,
				addresses: [`Seed Address ${number}`],
				phoneNumbers: [`08120000${String(number).padStart(4, "0")}`],
				whatsappNumber: `08120000${String(number).padStart(4, "0")}`,
				smsNumber: `08120000${String(number).padStart(4, "0")}`,
				deletedAt: null,
				deletedBy: null,
				reviewedAt: null,
				reviewedBy: null,
				reviewApproved: null,
				reviewComment: null
			}
		});

		created.push(createdDoc);
		existingEmails.add(email);
		console.log(`Created credit application '${email}'.`);
	}

	if(existing.length + created.length < limit)
		console.log(`Warning: only resolved ${existing.length + created.length} credit applications for seeding.`);

	return [...existing, ...created].slice(0, limit);
}

async function ensureSeedSurveyTemplate(adminUser: User): Promise<Survey> {
	const existing = await payload.find({
		collection: "surveys",
		where: { title: { equals: SEEDED_SURVEY_TITLE } },
		limit: 1,
		overrideAccess: true,
		draft: true,
		trash: true
	});

	const now = new Date().toISOString();
	const reviewComment = plainTextToRichText(SEEDED_SURVEY_REVIEW_COMMENT);
	const content = {
		version: 1,
		questions: [
			{ id: "q1", question: "How is the customer profile?", type: "text" },
			{ id: "q2", question: "Does the customer meet requirements?", type: "boolean" },
			{ id: "q3", question: "Additional notes", type: "textarea" }
		]
	};

	const data = {
		_status: "published",
		title: SEEDED_SURVEY_TITLE,
		description: null,
		content,
		reviewedAt: now,
		reviewedBy: adminUser.id,
		reviewApproved: true,
		reviewComment,
		deletedAt: null,
		deletedBy: null
	};

	if(existing.docs.length > 0) {
		const doc = existing.docs[0];
		const updated = await payload.update({
			collection: "surveys",
			id: doc.id,
			overrideAccess: true,
			trash: true,
			draft: false,
			data
		});
		console.log(`Normalized survey template '${SEEDED_SURVEY_TITLE}'.`);
		return updated;
	}

	const created = await payload.create({
		collection: "surveys",
		overrideAccess: true,
		draft: false,
		data
	});

	console.log(`Created survey template '${SEEDED_SURVEY_TITLE}'.`);
	return created;
}

async function upsertSurveyResult(args: {
	adminUserId: string;
	surveyId: string;
	creditApplicationId: string;
	officerId: string;
	createdAt: string;
	answers: any;
}) {
	const existing = await payload.find({
		collection: SURVEY_RESULTS_COLLECTION,
		where: {
			and: [
				{ deletedAt: { exists: false } },
				{ survey: { equals: args.surveyId } },
				{ creditApplication: { equals: args.creditApplicationId } },
				{ officer: { equals: args.officerId } },
				{ createdAt: { equals: args.createdAt } }
			]
		},
		limit: 1,
		overrideAccess: true,
		trash: true
	});

	const baseData = {
		survey: args.surveyId,
		creditApplication: args.creditApplicationId,
		officer: args.officerId,
		answers: args.answers,
		createdAt: args.createdAt,
		updatedAt: args.createdAt,
		deletedAt: null,
		deletedBy: null,
		createdBy: args.adminUserId,
		updatedBy: args.adminUserId
	};

	if(existing.docs.length > 0) {
		const docId = String(existing.docs[0].id);
		await payload.update({
			collection: SURVEY_RESULTS_COLLECTION,
			id: docId,
			overrideAccess: true,
			trash: true,
			data: baseData
		});
		console.log(`Updated survey result for creditApplication=${args.creditApplicationId} officer=${args.officerId} createdAt=${args.createdAt}`);
		return;
	}

	await payload.create({
		collection: SURVEY_RESULTS_COLLECTION,
		overrideAccess: true,
		data: baseData
	});
	console.log(`Created survey result for creditApplication=${args.creditApplicationId} officer=${args.officerId} createdAt=${args.createdAt}`);
}

const adminUser = await resolveAdminUser();
const officers = await resolveOfficerUsers(2);
const creditApplications = await resolveSeedCreditApplications(3);
const survey = await ensureSeedSurveyTemplate(adminUser);

const todayStart = startOfDay(new Date());
const yesterdayStart = addDays(todayStart, -1);

const seeds = [
	{
		when: addMinutes(todayStart, 60),
		officer: officers[0],
		creditApplication: creditApplications[0]
	},
	{
		when: addMinutes(todayStart, 120),
		officer: officers[1] ?? officers[0],
		creditApplication: creditApplications[1] ?? creditApplications[0]
	},
	{
		when: addMinutes(yesterdayStart, 180),
		officer: officers[0],
		creditApplication: creditApplications[2] ?? creditApplications[0]
	}
];

for(const [index, seed] of seeds.entries()) {
	await upsertSurveyResult({
		adminUserId: adminUser.id,
		surveyId: survey.id,
		creditApplicationId: seed.creditApplication.id,
		officerId: seed.officer.id,
		createdAt: seed.when.toISOString(),
		answers: {
			version: 1,
			templateSurveyId: survey.id,
			submittedAt: seed.when.toISOString(),
			items: [
				{ questionId: "q1", value: `Seeded answer ${index + 1}` },
				{ questionId: "q2", value: index % 2 == 0 },
				{ questionId: "q3", value: `Notes for seeded answer ${index + 1}` }
			]
		}
	});
}

console.log("Seed survey results completed.");
