import { APIError, CollectionConfig } from "payload";

import { buildAccesses, buildAccessMasks } from "./AccessCollection";

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
		useAsTitle: "creditApplication",
		defaultColumns: ["survey", "creditApplication", "officer", "createdAt"]
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
			name: "answers",
			label: "Answers",
			type: "json",
			required: true
		}
	]
});

export const defaultSurveyResultAccessMaskId = "7dc0594f-f01d-4caa-bf9d-02bd20464f4f";
export const SurveyResultAccesses = () => buildAccesses({
	collection: "survey-results",
	defaultMaskId: defaultSurveyResultAccessMaskId
});
export const SurveyResultAccessMasks = () => buildAccessMasks({
	collection: "survey-results",
	maskFields: [
		{
			name: "maskCreatedAt",
			label: "Mask Created At",
			type: "date"
		},
		{
			name: "maskCreatedBy",
			label: "Mask Created By",
			type: "generic"
		},
		{
			name: "maskUpdatedAt",
			label: "Mask Updated At",
			type: "date"
		},
		{
			name: "maskUpdatedBy",
			label: "Mask Updated By",
			type: "generic"
		},
		{
			name: "maskDeletedAt",
			label: "Mask Deleted At",
			type: "date"
		},
		{
			name: "maskDeletedBy",
			label: "Mask Deleted By",
			type: "generic"
		},
		{
			name: "maskSurvey",
			label: "Mask Survey",
			type: "generic"
		},
		{
			name: "maskSurveyVersion",
			label: "Mask Survey Version",
			type: "generic"
		},
		{
			name: "maskCreditApplication",
			label: "Mask Credit Application",
			type: "generic"
		},
		{
			name: "maskOfficer",
			label: "Mask Officer",
			type: "generic"
		},
		{
			name: "maskAnswers",
			label: "Mask Answers",
			type: "generic"
		},
		{
			name: "maskReviewedAt",
			label: "Mask Reviewed At",
			type: "date"
		},
		{
			name: "maskReviewedBy",
			label: "Mask Reviewed By",
			type: "generic"
		},
		{
			name: "maskReviewApproved",
			label: "Mask Review Approved",
			type: "generic"
		},
		{
			name: "maskReviewComment",
			label: "Mask Review Comment",
			type: "generic"
		}
	]
});
