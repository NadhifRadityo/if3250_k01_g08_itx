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
			name: "collection",
			label: "Collection",
			type: "select",
			required: true,
			index: true,
			options: [
				"staged-users",
				"roles",
				"teams",
				"accesses",
				"credit-applications",
				"credit-application-imports",
				"credit-application-assignments",
				"surveys",
				"survey-results",
				"satisfaction-surveys",
				"login-logs",
				"gps-logs",
				"otp-logs",
				"recording-logs"
			]
		},
		{
			name: "filter",
			label: "Filter",
			type: "json",
			required: true
		},
		{
			name: "mask",
			label: "Mask",
			type: "json",
			required: true
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
