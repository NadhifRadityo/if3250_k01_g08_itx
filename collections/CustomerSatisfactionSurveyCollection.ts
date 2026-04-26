import { lexicalEditor, UploadFeature } from "@payloadcms/richtext-lexical";
import { APIError, CollectionConfig } from "payload";

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
		useAsTitle: "csatId",
		listSearchableFields: ["csatId", "csatDescription", "reviewComment"],
		defaultColumns: ["csatId", "csatDescription", "sequence", "inputType", "isActive", "updatedAt"]
	},
	hooks: {
		beforeChange: [
			async ({ req, operation, data, originalDoc }) => {
				if(req.user != null) {
					if(data.deletedAt != null)
						data = { deletedBy: req.user.id, ...data };
					if(operation == "create")
						data = { createdBy: req.user.id, updatedBy: req.user.id, ...data };
					if(operation == "update")
						data = { updatedBy: req.user.id, ...data };
				}

				const isActive = data.isActive ?? originalDoc?.isActive ?? false;
				const inputType = String(data.inputType ?? originalDoc?.inputType ?? "free_text");
				const freeText = String(data.freeText1 ?? originalDoc?.freeText1 ?? "").trim();
				const optionValues = [
					String(data.option1Desc ?? originalDoc?.option1Desc ?? "").trim(),
					String(data.option2Desc ?? originalDoc?.option2Desc ?? "").trim(),
					String(data.option3Desc ?? originalDoc?.option3Desc ?? "").trim(),
					String(data.option4Desc ?? originalDoc?.option4Desc ?? "").trim(),
					String(data.option5Desc ?? originalDoc?.option5Desc ?? "").trim()
				];

				if(inputType == "free_text" && freeText.length == 0)
					throw new APIError("free_text_1 is mandatory for free_text questions.", 400, undefined, true);
				if(inputType == "option" && optionValues.some(value => value.length == 0))
					throw new APIError("option_1_desc until option_5_desc are mandatory for option questions.", 400, undefined, true);

				if(req.payload != null && req.user != null && isActive == true) {
					const existing = await req.payload.find({
						collection: "satisfaction-surveys",
						user: req.user,
						overrideAccess: true,
						trash: true,
						pagination: false,
						limit: 6,
						where: {
							and: [
								{ isActive: { equals: true } },
								{ deletedAt: { exists: false } },
								...(originalDoc?.id != null ? [{ id: { not_equals: String(originalDoc.id) } }] : [])
							]
						},
						select: {}
					});
					if(existing.docs.length >= 5)
						throw new APIError("Maximum 5 active CSAT questions are allowed.", 400, undefined, true);
				}

				return data;
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a satisfaction survey", 400, undefined, true);
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
			name: "isActive",
			label: "Active",
			type: "checkbox",
			defaultValue: true,
			index: true
		},
		{
			name: "csatId",
			label: "CSAT ID",
			type: "text",
			required: true,
			index: true,
			maxLength: 20
		},
		{
			name: "csatDescription",
			label: "Description",
			type: "text",
			required: true,
			maxLength: 120
		},
		{
			name: "sequence",
			label: "Sequence",
			type: "number",
			required: true,
			min: 1,
			max: 5,
			index: true
		},
		{
			name: "inputType",
			label: "Input Type",
			type: "select",
			required: true,
			options: [
				{ value: "free_text", label: "Free Text" },
				{ value: "option", label: "Option 1-5" }
			]
		},
		{
			name: "freeText1",
			label: "free_text_1",
			type: "text"
		},
		{
			name: "freeText2",
			label: "free_text_2",
			type: "text"
		},
		{
			name: "freeText3",
			label: "free_text_3",
			type: "text"
		},
		{
			name: "freeText4",
			label: "free_text_4",
			type: "text"
		},
		{
			name: "freeText5",
			label: "free_text_5",
			type: "text"
		},
		{
			name: "option1Desc",
			label: "option_1_desc",
			type: "text"
		},
		{
			name: "option2Desc",
			label: "option_2_desc",
			type: "text"
		},
		{
			name: "option3Desc",
			label: "option_3_desc",
			type: "text"
		},
		{
			name: "option4Desc",
			label: "option_4_desc",
			type: "text"
		},
		{
			name: "option5Desc",
			label: "option_5_desc",
			type: "text"
		},
		{
			name: "description",
			label: "Notes",
			type: "richText",
			editor: SatisfactionSurveyRichTextEditor()
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
