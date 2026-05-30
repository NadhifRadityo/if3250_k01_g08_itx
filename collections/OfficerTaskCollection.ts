import { APIError, CollectionConfig } from "payload";

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
			name: "next",
			label: "Next",
			type: "relationship",
			relationTo: "officer-tasks",
			unique: true
		},
		{
			name: "cancelledAt",
			label: "Cancelled At",
			type: "date"
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
