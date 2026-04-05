import { APIError, CollectionConfig } from "payload";

export const CreditApplicationAssignments = (): CollectionConfig => ({
	slug: "credit-application-assignments",
	labels: {
		singular: "Credit Application Assignment",
		plural: "Credit Application Assignments"
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
		useAsTitle: "status",
		listSearchableFields: ["status", "reviewComment"],
		defaultColumns: ["account", "user", "status", "createdBy", "reviewedBy", "reviewedAt", "updatedAt"]
	},
	hooks: {
		beforeChange: [
			({ req, operation, data }) => {
				if(req.user == null)
					return data;

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
				throw new APIError("Cannot hard delete a credit application assignment", 400, undefined, true);
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
			name: "account",
			label: "Account",
			type: "relationship",
			relationTo: "credit-applications",
			required: true,
			unique: true,
			index: true
		},
		{
			name: "user",
			label: "user",
			type: "relationship",
			relationTo: "users",
			required: true,
			index: true
		},
		{
			name: "status",
			label: "Status",
			type: "select",
			options: [
				{ value: "pending_approval", label: "Pending Approval" },
				{ value: "approved", label: "Approved" },
				{ value: "rejected", label: "Rejected" }
			],
			required: true,
			defaultValue: "pending_approval",
			index: true
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
			type: "richText"
		}
	]
});
