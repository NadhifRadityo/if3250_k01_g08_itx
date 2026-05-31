import { sql } from "@payloadcms/db-postgres";
import { PostgresSchemaHook } from "@payloadcms/drizzle/postgres";
import { APIError, CollectionConfig } from "payload";
import { check } from "drizzle-orm/pg-core";

import { getRelationshipId } from "@/utils/payload";

import { ReviewRichTextEditor } from "./shared";

export const CreditApplicationAssignments = (): CollectionConfig => ({
	slug: "credit-application-assignments",
	labels: {
		singular: "Credit Application Assignment",
		plural: "Credit Application Assignments"
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
	admin: {
		useAsTitle: "creditApplication",
		listSearchableFields: ["reviewComment"],
		defaultColumns: ["creditApplication", "officer", "updatedAt", "reviewedBy", "reviewComment"]
	},
	hooks: {
		beforeChange: [
			({ req, operation, data, originalDoc }) => {
				if(req.user == null)
					return data;
				if(data.deletedAt != null)
					data = { deletedBy: req.user.id, ...data };
				if(operation == "create")
					data = { createdBy: req.user.id, updatedBy: req.user.id, ...data };
				if(operation == "update")
					data = { updatedBy: req.user.id, ...data };
				if(operation == "update" && originalDoc != null && data.creditApplication != null) {
					const previousCreditApplicationId = getRelationshipId(originalDoc.creditApplication);
					const nextCreditApplicationId = getRelationshipId(data.creditApplication);
					if(previousCreditApplicationId != null && nextCreditApplicationId != null && previousCreditApplicationId != nextCreditApplicationId)
						throw new APIError("Credit application cannot be modified after the assignment is created", 400, undefined, true);
				}
				return data;
			},
			async ({ req, req: { payload }, operation, data, originalDoc }) => {
				const isActive = data.deletedAt == null && (
					operation == "create" ||
					(operation == "update" && (data.deletedAt != undefined ? data.deletedAt == null : originalDoc?.deletedAt == null))
				);
				if(!isActive)
					return data;
				const creditApplicationId = getRelationshipId(data.creditApplication ?? originalDoc?.creditApplication);
				if(creditApplicationId == null)
					return data;
				const conflictWhere: any = { and: [
					{ creditApplication: { equals: creditApplicationId } },
					{ deletedAt: { exists: false } }
				] };
				if(operation == "update" && originalDoc?.id != null)
					conflictWhere.and.push({ id: { not_equals: originalDoc.id } });
				const conflict = await payload.find({
					req: req,
					overrideAccess: true,
					collection: "credit-application-assignments",
					trash: true,
					pagination: false,
					depth: 0,
					limit: 1,
					where: conflictWhere,
					select: {}
				});
				if(conflict.docs.length > 0)
					throw new APIError("Another active credit application assignment already exists for this credit application", 400, undefined, true);
				return data;
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a credit application assignment", 400, undefined, true);
			}
		]
	},
	indexes: [
		{
			fields: ["creditApplication", "officer"],
			unique: true
		}
	],
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
			name: "creditApplication",
			label: "Credit Application",
			type: "relationship",
			relationTo: "credit-applications",
			required: true,
			index: true
		},
		{
			name: "officer",
			label: "Officer",
			type: "relationship",
			relationTo: "users",
			required: true,
			index: true,
			filterOptions: { "role.level": { equals: "officer" } }
		},
		{
			name: "survey",
			label: "Survey",
			type: "relationship",
			relationTo: "surveys",
			required: true
		},
		{
			name: "satisfactionSurvey",
			label: "Satisfaction Survey",
			type: "relationship",
			relationTo: "satisfaction-surveys",
			required: true
		},
		{
			name: "assignedDate",
			label: "Assigned Date",
			type: "date"
		},
		{
			name: "dueDate",
			label: "Due Date",
			type: "date"
		},
		{
			name: "geofenceRegions",
			label: "Geofence Regions",
			type: "json"
		},
		{
			name: "changeRequestType",
			label: "Change Request Type",
			type: "select",
			required: true,
			dbName: "enum_change_request_type",
			options: [
				{ value: "create", label: "Create" },
				{ value: "update", label: "Update" },
				{ value: "delete", label: "Delete" }
			]
		},
		{
			name: "changeRequestComment",
			label: "Change Request Comment",
			type: "richText",
			editor: ReviewRichTextEditor()
		},
		{
			name: "reviewedAt",
			label: "Reviewed At",
			type: "date"
		},
		{
			name: "reviewedBy",
			label: "Reviewed By",
			type: "relationship",
			relationTo: "users"
		},
		{
			name: "reviewApproved",
			label: "Review Approved",
			type: "checkbox"
		},
		{
			name: "reviewComment",
			label: "Review Comment",
			type: "richText",
			editor: ReviewRichTextEditor()
		}
	]
});
export const CreditApplicationAssignmentsSchemaHook = (): PostgresSchemaHook => ({ schema, extendTable }) => {
	extendTable({
		table: schema.tables["credit_application_assignments"],
		extraConfig: () => ({
			creditApplicationAssignmentsReviewedAtNotNullImpliesReviewApprovedNotNull: check(
				"credit_application_assignments_reviewed_at_not_null_implies_review_approved_not_null",
				sql`"reviewed_at" IS NULL OR "review_approved" IS NOT NULL`
			)
		})
	});
	return schema;
};
