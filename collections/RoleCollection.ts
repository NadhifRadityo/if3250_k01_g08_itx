import { APIError, CollectionConfig } from "payload";

import { ReviewRichTextEditor } from "./shared";

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
		listSearchableFields: ["name", "level", "menus", "reviewComment"],
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
				{ value: "user-management#viewer", label: "User Management - Viewer" },
				{ value: "user-management#auditor", label: "User Management - Auditor" },
				{ value: "user-management#editor", label: "User Management - Editor" },
				{ value: "user-management#approver", label: "User Management - Approver" },
				{ value: "role-management#viewer", label: "Role Management - Viewer" },
				{ value: "role-management#auditor", label: "Role Management - Auditor" },
				{ value: "role-management#editor", label: "Role Management - Editor" },
				{ value: "role-management#approver", label: "Role Management - Approver" },
				{ value: "team-management#viewer", label: "Team Management - Viewer" },
				{ value: "team-management#auditor", label: "Team Management - Auditor" },
				{ value: "team-management#editor", label: "Team Management - Editor" },
				{ value: "team-management#approver", label: "Team Management - Approver" },
				{ value: "access-management#viewer", label: "Access Management - Viewer" },
				{ value: "access-management#auditor", label: "Access Management - Auditor" },
				{ value: "access-management#editor", label: "Access Management - Editor" },
				{ value: "access-management#approver", label: "Access Management - Approver" },
				{ value: "credit-application-management#viewer", label: "Credit Application Management - Viewer" },
				{ value: "credit-application-management#auditor", label: "Credit Application Management - Auditor" },
				{ value: "credit-application-management#editor", label: "Credit Application Management - Editor" },
				{ value: "credit-application-management#approver", label: "Credit Application Management - Approver" },
				{ value: "credit-application-management#import-viewer", label: "Credit Application Management - Import Viewer" },
				{ value: "credit-application-management#import-editor", label: "Credit Application Management - Import Editor" },
				{ value: "credit-application-management#import-approver", label: "Credit Application Management - Import Approver" },
				{ value: "credit-application-assignment#viewer", label: "Credit Application Assignment - Viewer" },
				{ value: "credit-application-assignment#auditor", label: "Credit Application Assignment - Auditor" },
				{ value: "credit-application-assignment#editor", label: "Credit Application Assignment - Editor" },
				{ value: "credit-application-assignment#approver", label: "Credit Application Assignment - Approver" },
				{ value: "survey-management#viewer", label: "Survey Management - Viewer" },
				{ value: "survey-management#auditor", label: "Survey Management - Auditor" },
				{ value: "survey-management#editor", label: "Survey Management - Editor" },
				{ value: "survey-management#approver", label: "Survey Management - Approver" },
				{ value: "survey-result#monitoring", label: "Survey Result - Monitoring" },
				{ value: "survey-result#reporting", label: "Survey Result - Reporting" },
				{ value: "satisfaction-survey-management#viewer", label: "Satisfaction Survey Management - Viewer" },
				{ value: "satisfaction-survey-management#auditor", label: "Satisfaction Survey Management - Auditor" },
				{ value: "satisfaction-survey-management#editor", label: "Satisfaction Survey Management - Editor" },
				{ value: "satisfaction-survey-management#approver", label: "Satisfaction Survey Management - Approver" },
				{ value: "satisfaction-survey-result#monitoring", label: "Satisfaction Survey Result - Monitoring" },
				{ value: "satisfaction-survey-result#reporting", label: "Satisfaction Survey Result - Reporting" },
				{ value: "officer-task#viewer", label: "Officer Task - Viewer" },
				{ value: "officer-task#monitoring", label: "Officer Task - Monitoring" },
				{ value: "officer-task#reporting", label: "Officer Task - Reporting" },
				{ value: "officer-tracking#monitoring", label: "Officer Tracking - Monitoring" },
				{ value: "officer-tracking#reporting", label: "Officer Tracking - Reporting" },
				{ value: "login-log#monitoring", label: "Login Log - Monitoring" },
				{ value: "login-log#reporting", label: "Login Log - Reporting" },
				{ value: "otp-log#monitoring", label: "OTP Log - Monitoring" },
				{ value: "otp-log#reporting", label: "OTP Log - Reporting" },
				{ value: "gps-log#monitoring", label: "GPS Log - Monitoring" },
				{ value: "gps-log#reporting", label: "GPS Log - Reporting" },
				{ value: "recording-log#monitoring", label: "Recording Log - Monitoring" },
				{ value: "recording-log#reporting", label: "Recording Log - Reporting" }
			],
			required: true,
			hasMany: true,
			defaultValue: []
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
