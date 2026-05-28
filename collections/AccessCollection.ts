import { lexicalEditor, UploadFeature } from "@payloadcms/richtext-lexical";
import { CollectionConfig } from "payload";

import { MultiLineFeature, AllFormatsFeature, ReviewRichTextEditor } from "./shared";

const AccessRichTextEditor = () => lexicalEditor({
	features: [
		...AllFormatsFeature(),
		...MultiLineFeature(),
		UploadFeature({
			enabledCollections: ["generic-richtext-uploads"]
		})
	]
});

export const Accesses = (): CollectionConfig => ({
	slug: "accesses",
	labels: {
		singular: "Access",
		plural: "Accesses"
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
		useAsTitle: "name",
		listSearchableFields: ["name", "description", "reviewComment"],
		defaultColumns: ["name", "description"]
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
			name: "name",
			label: "Name",
			type: "text",
			required: true
		},
		{
			name: "description",
			label: "Description",
			type: "richText",
			editor: AccessRichTextEditor()
		},
		{
			name: "enabled",
			label: "Enabled",
			type: "checkbox",
			required: true
		},
		{
			name: "priority",
			label: "Priority",
			type: "number",
			required: true
		},
		{
			name: "operation",
			label: "Operation",
			type: "select",
			required: true,
			options: [
				{ value: "union", label: "Union" },
				{ value: "difference", label: "Difference" },
				{ value: "intersect", label: "Intersect" },
				{ value: "exclusion", label: "Exclusion" }
			]
		},
		{
			name: "subjectUserFilters",
			label: "SubjectUserFilters",
			type: "json"
		},
		{
			name: "subjectTeamFilters",
			label: "SubjectTeamFilters",
			type: "json"
		},
		{
			name: "subjectRoleFilters",
			label: "SubjectRoleFilters",
			type: "json"
		},
		{
			name: "collection",
			label: "Collection",
			type: "select",
			required: true,
			index: true,
			options: [
				{ value: "staged-users", label: "Users" },
				{ value: "roles", label: "Roles" },
				{ value: "teams", label: "Teams" },
				{ value: "accesses", label: "Accesses" },
				{ value: "credit-applications", label: "Credit Applications" },
				{ value: "credit-application-imports", label: "Credit Application Imports" },
				{ value: "credit-application-assignments", label: "Credit Application Assignments" },
				{ value: "officer-tasks", label: "Officer Tasks" },
				{ value: "surveys", label: "Surveys" },
				{ value: "survey-results", label: "Survey Results" },
				{ value: "satisfaction-surveys", label: "Satisfaction Surveys" },
				{ value: "satisfaction-survey-results", label: "Satisfaction Survey Results" },
				{ value: "login-logs", label: "Login Logs" },
				{ value: "gps-logs", label: "GPS Logs" },
				{ value: "otp-logs", label: "OTP Logs" },
				{ value: "recording-logs", label: "Recording Logs" }
			]
		},
		{
			name: "filters",
			label: "Filters",
			type: "json",
			required: true
		},
		{
			name: "masks",
			label: "Masks",
			type: "json",
			required: true
		},
		{
			name: "changeRequestType",
			label: "Change Request Type",
			type: "select",
			required: true,
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
