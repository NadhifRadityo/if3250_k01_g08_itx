import { lexicalEditor, UploadFeature } from "@payloadcms/richtext-lexical";
import { Block, CollectionConfig } from "payload";

import { ReviewRichTextEditor } from "./shared";
import { MultiLineFeature, AllFormatsFeature } from "./shared";

const SurveyRichTextEditor = () => lexicalEditor({
	features: [
		...AllFormatsFeature(),
		...MultiLineFeature(),
		UploadFeature({
			enabledCollections: ["generic-richtext-uploads"]
		})
	]
});

export const SurveyTextBlocks = (): Block => ({
	slug: "survey-text-blocks",
	labels: {
		singular: "Survey Text Block",
		plural: "Survey Text Blocks"
	},
	fields: [
		{
			name: "content",
			label: "Content",
			type: "richText",
			required: true,
			editor: SurveyRichTextEditor()
		}
	]
});
export const SurveyInputChoiceBlocks = (): Block => ({
	slug: "survey-input-choice-blocks",
	labels: {
		singular: "Survey Input Choice Block",
		plural: "Survey Input Choice Blocks"
	},
	fields: [
		{
			name: "choices",
			label: "Choices",
			type: "array",
			required: true,
			minRows: 0,
			defaultValue: [],
			fields: [
				{
					name: "content",
					label: "Content",
					type: "richText",
					required: true,
					editor: SurveyRichTextEditor()
				}
			]
		},
		{
			name: "minChoice",
			label: "Min Choice",
			type: "number",
			required: true,
			min: 0,
			defaultValue: 1
		},
		{
			name: "maxChoice",
			label: "Max Choice",
			type: "number",
			required: true,
			min: 0,
			defaultValue: Infinity
		},
		{
			name: "required",
			label: "Required",
			type: "checkbox",
			required: true,
			defaultValue: true
		}
	]
});
export const SurveyInputTextBlocks = (): Block => ({
	slug: "survey-input-text-blocks",
	labels: {
		singular: "Survey Input Text Block",
		plural: "Survey Input Text Blocks"
	},
	fields: [
		{
			name: "isTextArea",
			label: "Is Text Area",
			type: "checkbox",
			required: true,
			defaultValue: false
		},
		{
			name: "regexPattern",
			label: "Regex Pattern",
			type: "text",
			validate: v => {
				try {
					const [, pattern, flags] = v.match(/^\/(.+)\/([a-z]*)$/i) ?? [];
					new RegExp(pattern, flags);
					return true;
				} catch(e) {
					return e.message;
				}
			}
		},
		{
			name: "regexMode",
			label: "Regex Mode",
			type: "select",
			options: [
				{ value: "contains", label: "Contains" },
				{ value: "notContains", label: "Doesn't Contain" },
				{ value: "matches", label: "Matches" },
				{ value: "notMatches", label: "Doesn't Match" }
			]
		},
		{
			name: "required",
			label: "Required",
			type: "checkbox",
			required: true,
			defaultValue: true
		}
	]
});
export const SurveyInputUploadBlocks = (): Block => ({
	slug: "survey-input-upload-blocks",
	labels: {
		singular: "Survey Input Upload Block",
		plural: "Survey Input Upload Blocks"
	},
	fields: [
		{
			name: "maxSize",
			label: "Max Size",
			type: "number"
		},
		{
			name: "acceptTypes",
			label: "Accept Types",
			type: "text",
			hasMany: true
		},
		{
			name: "required",
			label: "Required",
			type: "checkbox",
			required: true,
			defaultValue: true
		}
	]
});
export const SurveyMultiInputBlocks = (): Block => ({
	slug: "survey-multi-input-blocks",
	labels: {
		singular: "Survey Multi Input Block",
		plural: "Survey Multi Input Blocks"
	},
	fields: [
		{
			name: "min",
			label: "Min",
			type: "number",
			required: true,
			min: 0,
			defaultValue: 1
		},
		{
			name: "max",
			label: "Max",
			type: "number",
			required: true,
			min: 0,
			defaultValue: Infinity
		},
		{
			name: "inputs",
			label: "Inputs",
			type: "blocks",
			required: true,
			minRows: 0,
			defaultValue: [],
			blocks: [
				SurveyInputChoiceBlocks(),
				SurveyInputTextBlocks(),
				SurveyInputUploadBlocks()
			]
		}
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
			name: "blocks",
			label: "Blocks",
			type: "blocks",
			required: true,
			minRows: 0,
			defaultValue: [],
			blocks: [
				SurveyTextBlocks(),
				SurveyInputChoiceBlocks(),
				SurveyInputTextBlocks(),
				SurveyInputUploadBlocks(),
				SurveyMultiInputBlocks()
			]
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
