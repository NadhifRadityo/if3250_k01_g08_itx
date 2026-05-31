import { sql } from "@payloadcms/db-postgres";
import { PostgresSchemaHook } from "@payloadcms/drizzle/postgres";
import { APIError, TaskConfig, CollectionConfig } from "payload";
import { check, uniqueIndex } from "drizzle-orm/pg-core";

import { getRelationshipId } from "@/utils/payload";

import { ReviewRichTextEditor } from "./shared";

const ACTIVE_OFFICER_TASK_KV_TTL_MS = 12 * 60 * 60 * 1000;

export const OfficerTasks = (): CollectionConfig => ({
	slug: "officer-tasks",
	labels: {
		singular: "Officer Task",
		plural: "Officer Tasks"
	},
	trash: true,
	timestamps: true,
	versions: {
		maxPerDoc: 0,
		drafts: {
			autosave: {
				showSaveDraftButton: true
			},
			validate: true
		}
	},
	hooks: {
		beforeChange: [
			({ req, operation, data }) => {
				if(req.user == null) return;
				if(operation == "create")
					data = { createdBy: req.user.id, updatedBy: req.user.id, ...data };
				if(operation == "update")
					data = { updatedBy: req.user.id, ...data };
				return data;
			},
			async ({ req, req: { payload }, data, originalDoc }) => {
				const nextId = getRelationshipId(data.next ?? originalDoc?.next);
				if(nextId == null)
					return data;
				const creditApplicationAssignmentId = getRelationshipId(data.creditApplicationAssignment ?? originalDoc?.creditApplicationAssignment);
				if(creditApplicationAssignmentId == null)
					return data;
				if(originalDoc?.id != null && nextId == originalDoc.id)
					throw new APIError("Officer task cannot reference itself as next", 400, undefined, true);
				const next = await payload.findByID({
					req: req,
					overrideAccess: true,
					collection: "officer-tasks",
					id: nextId,
					draft: true,
					trash: true,
					depth: 0,
					select: { creditApplicationAssignment: true }
				});
				const nextCreditApplicationAssignmentId = getRelationshipId(next.creditApplicationAssignment);
				if(nextCreditApplicationAssignmentId != creditApplicationAssignmentId)
					throw new APIError("Next officer task must belong to the same credit application assignment", 400, undefined, true);
				return data;
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete an officer task", 400, undefined, true);
			}
		]
	},
	fields: [
		// timestamps: createdAt
		// timestamps: updatedAt
		{
			name: "createdAt",
			label: "Created At",
			type: "date",
			required: true,
			index: true,
			defaultValue: () => new Date(),
			admin: {
				hidden: true,
				disableBulkEdit: true,
				readOnly: true
			}
		},
		{
			name: "createdBy",
			label: "Created By",
			type: "relationship",
			relationTo: "users",
			admin: {
				hidden: true,
				disableBulkEdit: true,
				readOnly: true
			}
		},
		{
			name: "updatedAt",
			label: "Updated At",
			type: "date",
			required: true,
			index: true,
			defaultValue: () => new Date(),
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "updatedBy",
			label: "updated By",
			type: "relationship",
			relationTo: "users",
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "creditApplicationAssignment",
			label: "Credit Application Assignment",
			type: "relationship",
			relationTo: "credit-application-assignments",
			required: true
		},
		{
			name: "creditApplicationAssignmentVersion",
			label: "Credit Application Assignment Version",
			type: "text",
			required: true,
			hooks: {
				beforeChange: [
					async ({ value, previousValue, data, originalDoc, req, req: { payload } }) => {
						const version = await payload.findVersionByID({
							req: req,
							disableErrors: true,
							overrideAccess: true,
							collection: "credit-application-assignments",
							id: value ?? previousValue,
							depth: 0,
							select: { parent: true }
						});
						if(version == null || version.parent != (data?.creditApplicationAssignment ?? originalDoc.creditApplicationAssignment))
							throw new APIError("Invalid credit application assignment version", 400, undefined, true);
					}
				]
			}
		},
		{
			name: "next",
			label: "Next",
			type: "relationship",
			relationTo: "officer-tasks",
			unique: true
		},
		{
			name: "settledAt",
			label: "Settled At",
			type: "date"
		},
		{
			name: "settlementStatus",
			label: "Settlement Status",
			type: "select",
			options: [
				{ value: "finished", label: "Finished" },
				{ value: "cancelled", label: "Cancelled" }
			]
		},
		{
			name: "settlementComment",
			label: "Settlement Comment",
			type: "richText",
			editor: ReviewRichTextEditor()
		},
		{
			name: "evaluatedAt",
			label: "Evaluated At",
			type: "date"
		},
		{
			name: "evaluatedBy",
			label: "Evaluated By",
			type: "relationship",
			relationTo: "users"
		},
		{
			name: "evaluationApproved",
			label: "Evaluation Approved",
			type: "checkbox"
		},
		{
			name: "evaluationComment",
			label: "Evaluation Comment",
			type: "richText",
			editor: ReviewRichTextEditor()
		}
	]
});
export const OfficerTasksSchemaHook = (): PostgresSchemaHook => ({ schema, extendTable }) => {
	extendTable({
		table: schema.tables["officer_tasks"],
		extraConfig: t => ({
			officerTaskTailUniqueIdx: uniqueIndex("officer_tasks_credit_application_assignment_tail_idx")
				.on(t.creditApplicationAssignment)
				.where(sql`"next_id" IS NULL AND "settled_at" IS NULL`),
			officerTasksSettledAtNullImpliesNextIdNull: check(
				"officer_tasks_settled_at_null_implies_next_id_null",
				sql`"settled_at" IS NOT NULL OR "next_id" IS NULL`
			),
			officerTasksApprovedTrueImpliesNextIdNull: check(
				"officer_tasks_approved_true_implies_next_id_null",
				sql`"evaluation_approved" IS NOT TRUE OR "next_id" IS NULL`
			),
			officerTasksEvaluatedAtNotNullImpliesSettlementStatusFinished: check(
				"officer_tasks_evaluated_at_not_null_implies_settlement_status_finished",
				sql`"evaluated_at" IS NULL OR "settlement_status" = 'finished'`
			),
			officerTasksEvaluatedAtNotNullImpliesEvaluationApprovedNotNull: check(
				"officer_tasks_evaluated_at_not_null_implies_evaluation_approved_not_null",
				sql`"evaluated_at" IS NULL OR "evaluation_approved" IS NOT NULL`
			),
			officerTasksFinishedWithSuccessorRequiresRejectedCheck: check(
				"officer_tasks_finished_with_successor_requires_rejected_check",
				sql`"settlement_status" IS DISTINCT FROM 'finished' OR "next_id" IS NULL OR "evaluation_approved" IS FALSE`
			)
		})
	});
	return schema;
};

export const OfficerTasksClearActive = (): TaskConfig<"OfficerTasksClearActive"> => ({
	slug: "OfficerTasksClearActive",
	schedule: [
		{ cron: "0 */5 * * * *", queue: "every-minute" }
	],
	handler: async ({ req: { payload } }) => {
		const entries = (await payload.find({
			overrideAccess: true,
			collection: "payload-kv",
			pagination: false,
			where: { key: { contains: "officer-task:" } },
			select: { key: true, data: true }
		})).docs;
		const now = Date.now();
		const officerTasks = (await payload.find({
			overrideAccess: true,
			collection: "officer-tasks",
			trash: true,
			pagination: false,
			depth: 1,
			where: { id: { in: entries.map(entry => (entry.data as any).id) } },
			select: { creditApplicationAssignment: true, settledAt: true },
			populate: { "credit-application-assignments": { dueDate: true } }
		})).docs;
		const kvIdsToDelete: string[] = [];
		for(const entry of entries) {
			const data = entry.data as any;
			if((now - data.createdAt) >= ACTIVE_OFFICER_TASK_KV_TTL_MS) {
				kvIdsToDelete.push(entry.id);
				continue;
			}
			const officerTask = officerTasks.find(officerTask => officerTask.id == data.id);
			if(officerTask == null || officerTask.settledAt != null) {
				kvIdsToDelete.push(entry.id);
				continue;
			}
			const dueDate = (officerTask.creditApplicationAssignment as any).dueDate;
			if(dueDate != null && Date.parse(dueDate) <= now) {
				kvIdsToDelete.push(entry.id);
				continue;
			}
		}
		await payload.delete({
			overrideAccess: true,
			collection: "payload-kv",
			where: { id: { in: kvIdsToDelete } }
		});
		return { output: null };
	}
});
