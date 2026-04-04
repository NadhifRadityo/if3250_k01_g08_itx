import { APIError, CollectionConfig } from "payload";

export const Roles = (): CollectionConfig => ({
	slug: "roles",
	labels: {
		singular: "Role",
		plural: "Roles"
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
		listSearchableFields: ["name", "level", "menus"],
		defaultColumns: ["name", "level", "menus", "updatedAt"]
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
				throw new APIError("Cannot hard delete a role", 400, undefined, true);
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
			name: "level",
			label: "Level",
			type: "select",
			options: [
				{ value: "admin", label: "Admin" },
				{ value: "manager", label: "Manager" },
				{ value: "supervisor", label: "Supervisor" },
				{ value: "officer", label: "Officer" }
			],
			required: true,
			index: true
		},
		{
			name: "menus",
			label: "Menus",
			type: "select",
			options: [
				{ value: "user-management-viewer", label: "User Management - Viewer" },
				{ value: "user-management-auditor", label: "User Management - Auditor" },
				{ value: "user-management-editor", label: "User Management - Editor" },
				{ value: "user-management-approver", label: "User Management - Approver" },
				{ value: "role-management-viewer", label: "Role Management - Viewer" },
				{ value: "role-management-auditor", label: "Role Management - Auditor" },
				{ value: "role-management-editor", label: "Role Management - Editor" },
				{ value: "role-management-approver", label: "Role Management - Approver" },
				{ value: "team-management-viewer", label: "Team Management - Viewer" },
				{ value: "team-management-auditor", label: "Team Management - Auditor" },
				{ value: "team-management-editor", label: "Team Management - Editor" },
				{ value: "team-management-approver", label: "Team Management - Approver" },
				{ value: "credit-application-import-viewer", label: "Credit Application - Import Viewer" },
				{ value: "credit-application-import-editor", label: "Credit Application — Import" },
				{ value: "credit-application-import-approver", label: "Credit Application — Import Approver" },
				{ value: "credit-application-entry-viewer", label: "Credit Application - Entry Viewer" },
				{ value: "credit-application-entry-auditor", label: "Credit Application - Entry Auditor" },
				{ value: "credit-application-entry-editor", label: "Credit Application — Entry Editor" },
				{ value: "credit-application-entry-approver", label: "Credit Application — Entry Approver" }
			],
			required: true,
			hasMany: true,
			defaultValue: []
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
