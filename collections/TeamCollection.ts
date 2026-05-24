import { APIError, CollectionConfig } from "payload";

import { buildAccesses, buildAccessMasks } from "./AccessCollection";
import { ReviewRichTextEditor } from "./shared";

export const Teams = (): CollectionConfig => ({
	slug: "teams",
	labels: {
		singular: "Team",
		plural: "Teams"
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
		listSearchableFields: ["name", "supervisor.email", "supervisor.name", "officers.email", "officers.name", "reviewComment"],
		defaultColumns: ["name", "supervisor", "officers", "updatedAt", "reviewedBy", "reviewComment"]
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
				throw new APIError("Cannot hard delete a team", 400, undefined, true);
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
			name: "supervisor",
			label: "Supervisor",
			type: "relationship",
			relationTo: "users",
			required: true,
			filterOptions: { "role.level": { equals: "supervisor" } }
		},
		{
			name: "officers",
			label: "Officers",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			filterOptions: { "role.level": { equals: "officer" } }
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

export const defaultTeamAccessMaskId = "d32481da-cd43-4471-9cc9-3097222970f4";
export const TeamAccesses = () => buildAccesses({
	collection: "teams",
	defaultMaskId: defaultTeamAccessMaskId
});
export const TeamAccessMasks = () => buildAccessMasks({
	collection: "teams",
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
			name: "maskName",
			label: "Mask Name",
			type: "text"
		},
		{
			name: "maskSupervisor",
			label: "Mask Supervisor",
			type: "generic"
		},
		{
			name: "maskOfficers",
			label: "Mask Officers",
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
