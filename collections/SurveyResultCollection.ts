import { APIError, CollectionConfig } from "payload";

export const SurveyResults = (): CollectionConfig => ({
	slug: "survey-results",
	labels: {
		singular: "Survey Result",
		plural: "Survey Results"
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
		useAsTitle: "createdAt",
		defaultColumns: ["survey", "surveyVersion", "createdAt"]
	},
	hooks: {
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a survey result", 400, undefined, true);
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
			name: "survey",
			label: "Survey",
			type: "relationship",
			relationTo: "surveys",
			required: true,
			index: true
		},
		{
			name: "surveyVersion",
			label: "Survey Version",
			type: "text",
			required: true,
			hooks: {
				beforeChange: [
					async ({ value, previousValue, data, originalDoc, req, req: { payload } }) => {
						const version = await payload.findVersionByID({
							req: req,
							disableErrors: true,
							overrideAccess: true,
							collection: "surveys",
							id: value ?? previousValue,
							depth: 0,
							select: { parent: true }
						});
						if(version == null || version.parent != (data?.survey ?? originalDoc.survey))
							throw new APIError("Invalid survey version", 400, undefined, true);
					}
				]
			}
		},
		{
			name: "officerTask",
			label: "Officer Task",
			type: "relationship",
			relationTo: "officer-tasks",
			unique: true
		},
		{
			name: "answers",
			label: "Answers",
			type: "json",
			required: true
		}
	]
});
