import { lexicalEditor, UploadFeature } from "@payloadcms/richtext-lexical";
import { CollectionConfig } from "payload";

import { buildAccesses, dateMaskOptions, textMaskOptions, buildAccessMasks, genericMaskOptions } from "./AccessCollection";
import { MultiLineFeature, AllFormatsFeature, ReviewRichTextEditor } from "./shared";

const SurveyRichTextEditor = () => lexicalEditor({
	features: [
		...AllFormatsFeature(),
		...MultiLineFeature(),
		UploadFeature({
			enabledCollections: ["generic-richtext-uploads"]
		})
	]
});

export const Surveys = (): CollectionConfig => ({
	slug: "surveys",
	labels: {
		singular: "Survey",
		plural: "Surveys"
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
			editor: SurveyRichTextEditor()
		},
		{
			name: "content",
			label: "Content",
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

export const defaultSurveyAccessMaskId = "a1b2c3d4-9999-4aaa-bbbb-000000000009";
export const SurveyAccesses = () => buildAccesses({
	collection: "surveys",
	defaultMaskId: defaultSurveyAccessMaskId
});
export const SurveyAccessMasks = () => buildAccessMasks({
	collection: "surveys",
	fields: [
		{
			name: "maskCreatedAt",
			label: "Mask Created At",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: dateMaskOptions
		},
		{
			name: "maskCreatedBy",
			label: "Mask Created By",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskUpdatedAt",
			label: "Mask Updated At",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: dateMaskOptions
		},
		{
			name: "maskUpdatedBy",
			label: "Mask Updated By",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskDeletedAt",
			label: "Mask Deleted At",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: dateMaskOptions
		},
		{
			name: "maskDeletedBy",
			label: "Mask Deleted By",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskTitle",
			label: "Mask Title",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: textMaskOptions
		},
		{
			name: "maskDescription",
			label: "Mask Description",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskContent",
			label: "Mask Content",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskReviewedAt",
			label: "Mask Reviewed At",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: dateMaskOptions
		},
		{
			name: "maskReviewedBy",
			label: "Mask Reviewed By",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskReviewApproved",
			label: "Mask Review Approved",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskReviewComment",
			label: "Mask Review Comment",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		}
	]
});
