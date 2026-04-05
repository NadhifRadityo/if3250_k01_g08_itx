import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { getPayload } from "payload";

import payloadConfig from "@payload-config";

const MANAGER_EMAIL = "manager1@local.local";
const SUPERVISOR_EMAIL = "supervisor1@local.local";
const OFFICER_EMAILS = ["officer01@local.local", "officer02@local.local", "officer03@local.local"];
const SAMPLE_PREFIX = "AA Seed";
const MIN_ACCOUNTS = 6;

async function findUserByEmail(payload: any, email: string): Promise<any> {
	const { docs } = await payload.find({
		collection: "users",
		overrideAccess: true,
		trash: true,
		where: {
			email: { equals: email }
		},
		limit: 1,
		depth: 1
	});

	if(docs.length == 0)
		throw new Error(`User '${email}' was not found. Run pnpm run seed:example first.`);

	return docs[0];
}

async function createCreditApplicationFixture(payload: any, actor: any, index: number): Promise<any> {
	const tag = `${Date.now()}_${index}`;
	const uploadPath = join(process.cwd(), `scripts/_tmp_aa_seed_${tag}.csv`);
	writeFileSync(uploadPath, "id,name\nfixture,fixture\n", "utf8");

	const importDoc = await payload.create({
		collection: "credit-application-imports",
		user: actor,
		overrideAccess: true,
		filePath: uploadPath,
		data: {
			reviewComment: null,
			reviewApproved: null,
			reviewedAt: null,
			reviewedBy: null,
			deletedAt: null,
			deletedBy: null
		}
	});

	const created = await payload.create({
		collection: "credit-applications",
		user: actor,
		overrideAccess: true,
		data: {
			import: String(importDoc.id),
			name: `${SAMPLE_PREFIX} ${index + 1}`,
			email: `aa-seed-${index + 1}@example.local`,
			addresses: [`${100 + index} Sample Avenue`],
			phoneNumbers: [`08123${String(100000 + index)}`],
			whatsappNumber: `08123${String(200000 + index)}`,
			smsNumber: `08123${String(300000 + index)}`,
			assetId: `ASSET-${index + 1}`
		}
	});

	return created;
}

async function ensureSampleAccounts(payload: any, manager: any, supervisor: any): Promise<any[]> {
	const existing = await payload.find({
		collection: "credit-applications",
		overrideAccess: true,
		trash: true,
		pagination: false,
		where: {
			name: { like: SAMPLE_PREFIX }
		},
		sort: "name"
	});

	const docs = [...existing.docs];
	let counter = docs.length;
	while(counter < MIN_ACCOUNTS) {
		const actor = counter % 2 == 0 ? manager : supervisor;
		const created = await createCreditApplicationFixture(payload, actor, counter);
		docs.push(created);
		counter++;
	}

	return docs;
}

async function upsertAssignmentForAccount(payload: any, input: {
	accountId: string;
	createdBy: string;
	user: string;
	status: "pending_approval" | "approved" | "rejected";
	reviewedBy: string | null;
	message: string | null;
}): Promise<void> {
	const { docs } = await payload.find({
		collection: "credit-application-assignments",
		overrideAccess: true,
		trash: true,
		pagination: false,
		where: {
			account: { equals: input.accountId }
		},
		limit: 1,
		depth: 0
	});

	const data = {
		account: input.accountId,
		user: input.user,
		status: input.status,
		createdBy: input.createdBy,
		reviewedBy: input.reviewedBy,
		reviewedAt: input.reviewedBy != null ? new Date().toISOString() : null,
		reviewApproved: input.status == "approved" ? true : input.status == "rejected" ? false : null,
		reviewComment: null
	};

	if(docs.length == 0) {
		await payload.create({
			collection: "credit-application-assignments",
			overrideAccess: true,
			data
		});
		return;
	}

	await payload.update({
		collection: "credit-application-assignments",
		id: String(docs[0].id),
		overrideAccess: true,
		data
	});
}

const payload = await getPayload({ config: payloadConfig });

const manager = await findUserByEmail(payload, MANAGER_EMAIL);
const supervisor = await findUserByEmail(payload, SUPERVISOR_EMAIL);
const officers = await Promise.all(OFFICER_EMAILS.map(email => findUserByEmail(payload, email)));

const sampleAccounts = await ensureSampleAccounts(payload, manager, supervisor);

await upsertAssignmentForAccount(payload, {
	accountId: String(sampleAccounts[0].id),
	createdBy: String(manager.id),
	user: String(officers[0].id),
	status: "pending_approval",
	reviewedBy: null,
	message: null
});

await upsertAssignmentForAccount(payload, {
	accountId: String(sampleAccounts[1].id),
	createdBy: String(supervisor.id),
	user: String(officers[1].id),
	status: "pending_approval",
	reviewedBy: null,
	message: null
});

await upsertAssignmentForAccount(payload, {
	accountId: String(sampleAccounts[2].id),
	createdBy: String(manager.id),
	user: String(officers[0].id),
	status: "approved",
	reviewedBy: String(manager.id),
	message: "Data has changed"
});

await upsertAssignmentForAccount(payload, {
	accountId: String(sampleAccounts[3].id),
	createdBy: String(supervisor.id),
	user: String(officers[2].id),
	status: "rejected",
	reviewedBy: String(manager.id),
	message: "Rejected for revision"
});

await upsertAssignmentForAccount(payload, {
	accountId: String(sampleAccounts[4].id),
	createdBy: String(manager.id),
	user: String(officers[1].id),
	status: "approved",
	reviewedBy: String(manager.id),
	message: "Data has changed"
});

await upsertAssignmentForAccount(payload, {
	accountId: String(sampleAccounts[5].id),
	createdBy: String(supervisor.id),
	user: String(officers[0].id),
	status: "pending_approval",
	reviewedBy: null,
	message: null
});

const accountCount = await payload.count({
	collection: "credit-applications",
	overrideAccess: true,
	where: {
		name: { like: SAMPLE_PREFIX }
	}
});

const assignmentSummary = await payload.find({
	collection: "credit-application-assignments",
	overrideAccess: true,
	pagination: false,
	where: {
		account: {
			in: sampleAccounts.map(account => String(account.id))
		}
	},
	select: {
		id: true,
		status: true,
		account: true,
		createdBy: true,
		user: true
	}
});

const pending = assignmentSummary.docs.filter((doc: any) => doc.status == "pending_approval").length;
const approved = assignmentSummary.docs.filter((doc: any) => doc.status == "approved").length;
const rejected = assignmentSummary.docs.filter((doc: any) => doc.status == "rejected").length;

console.log("[DONE] Account assignment seed prepared.");
console.log(`[INFO] Sample credit applications: ${accountCount.totalDocs}`);
console.log(`[INFO] Sample assignments: total=${assignmentSummary.docs.length}, pending=${pending}, approved=${approved}, rejected=${rejected}`);
console.log(`[INFO] Manager user: ${MANAGER_EMAIL}`);
console.log(`[INFO] Supervisor user: ${SUPERVISOR_EMAIL}`);
console.log(`[INFO] Officers: ${OFFICER_EMAILS.join(", ")}`);
