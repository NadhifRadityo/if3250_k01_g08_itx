import { lexicalEditor, UploadFeature } from "@payloadcms/richtext-lexical";
import { CollectionConfig } from "payload";

import { MultiLineFeature, AllFormatsFeature, ReviewRichTextEditor } from "./shared";

const SatisfactionSurveyRichTextEditor = () => lexicalEditor({
	features: [
		...AllFormatsFeature(),
		...MultiLineFeature(),
		UploadFeature({
			enabledCollections: ["generic-richtext-uploads"]
		})
	]
});

export const SatisfactionSurveys = (): CollectionConfig => ({
	slug: "satisfaction-surveys",
	labels: {
		singular: "Satisfaction Survey",
		plural: "Satisfaction Surveys"
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
		useAsTitle: "title",
		listSearchableFields: ["title", "description", "reviewComment"],
		defaultColumns: ["title"]
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
			name: "title",
			label: "Title",
			type: "text",
			required: true
		},
		{
			name: "description",
			label: "Description",
			type: "richText",
			editor: SatisfactionSurveyRichTextEditor()
		},
		{
			name: "content",
			label: "Content",
			type: "json",
			required: true
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
