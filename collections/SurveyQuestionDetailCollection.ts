import { APIError, CollectionConfig } from "payload";

import { ReviewRichTextEditor } from "./shared";

export const SurveyQuestionDetails = (): CollectionConfig => ({
	slug: "survey-question-details",
	labels: {
		singular: "Survey Question Detail",
		plural: "Survey Question Details"
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
		useAsTitle: "questionId",
		listSearchableFields: ["questionId", "description", "typeOfAnswer"],
		defaultColumns: ["questionHeader", "questionId", "description", "typeOfAnswer"]
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
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a survey question detail", 400, undefined, true);
			}
		]
	},
	fields: [
		{
			name: "createdBy",
			label: "Created By",
			type: "relationship",
			relationTo: "users",
			admin: { hidden: true, disableBulkEdit: true, readOnly: true }
		},
		{
			name: "updatedBy",
			label: "Updated By",
			type: "relationship",
			relationTo: "users",
			admin: { hidden: true, disableBulkEdit: true }
		},
		{
			name: "deletedAt",
			label: "Deleted At",
			type: "date",
			index: true,
			admin: { hidden: true, disableBulkEdit: true }
		},
		{
			name: "deletedBy",
			label: "Deleted By",
			type: "relationship",
			relationTo: "users",
			admin: { hidden: true, disableBulkEdit: true }
		},
		{
			name: "questionHeader",
			label: "Question Header",
			type: "relationship",
			relationTo: "surveys",
			required: true
		},
		{
			name: "questionId",
			label: "Question ID",
			type: "text",
			required: true
		},
		{
			name: "description",
			label: "Description",
			type: "text",
			required: true
		},
		{
			name: "typeOfAnswer",
			label: "Type of Answer",
			type: "select",
			required: true,
			defaultValue: "freetext",
			options: [
				{ value: "freetext", label: "Free Text" },
				{ value: "option", label: "Option" }
			]
		},
		{
			name: "valueFreeText",
			label: "Value (Free Text)",
			type: "text",
			admin: {
				condition: (_, siblingData) => siblingData?.typeOfAnswer === "freetext"
			}
		},
		{
			name: "valueOptions",
			label: "Value Options",
			type: "array",
			minRows: 0,
			maxRows: 10,
			defaultValue: [],
			admin: {
				condition: (_, siblingData) => siblingData?.typeOfAnswer === "option"
			},
			fields: [
				{
					name: "value",
					label: "Option Value",
					type: "text",
					required: true
				}
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
