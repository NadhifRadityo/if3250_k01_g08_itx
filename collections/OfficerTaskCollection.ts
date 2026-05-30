import { sql } from "@payloadcms/db-postgres";
import { PostgresSchemaHook } from "@payloadcms/drizzle/postgres";
import { APIError, CollectionConfig } from "payload";
import { check, uniqueIndex } from "drizzle-orm/pg-core";

import { getRelationshipId } from "@/utils/payload";

import { ReviewRichTextEditor } from "./shared";

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
				if(data.deletedAt != null)
					data = { deletedBy: req.user.id, ...data };
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
		// timestamps: deletedAt
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
			name: "deletedAt",
			label: "Deleted At",
			type: "date",
			index: true,
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "deletedBy",
			label: "deleted By",
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
				.where(sql`"next_id" IS NULL`),
			officerTaskActiveImpliesTailCheck: check(
				"officer_tasks_active_implies_tail_check",
				sql`"settled_at" IS NOT NULL OR "next_id" IS NULL`
			),
			officerTaskApprovedImpliesTailCheck: check(
				"officer_tasks_approved_implies_tail_check",
				sql`"evaluation_approved" IS NOT TRUE OR "next_id" IS NULL`
			),
			officerTaskEvaluatedRequiresFinishedCheck: check(
				"officer_tasks_evaluated_requires_finished_check",
				sql`"evaluated_at" IS NULL OR "settlement_status" = 'finished'`
			),
			officerTaskFinishedWithSuccessorRequiresRejectedCheck: check(
				"officer_tasks_finished_with_successor_requires_rejected_check",
				sql`"settlement_status" IS DISTINCT FROM 'finished' OR "next_id" IS NULL OR "evaluation_approved" IS FALSE`
			)
		})
	});
	return schema;
};
