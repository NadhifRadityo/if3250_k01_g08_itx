import { APIError, CollectionConfig } from "payload";

import { ReviewRichTextEditor } from "./shared";

export const Users = (): CollectionConfig => ({
	slug: "users",
	labels: {
		singular: "User",
		plural: "Users"
	},
	trash: true,
	timestamps: true,
	auth: {
		tokenExpiration: 7200,
		useAPIKey: true,
		useSessions: true,
		maxLoginAttempts: 5,
		lockTime: 5 * 60 * 1000
	},
	admin: {
		useAsTitle: "email",
		listSearchableFields: ["email", "name", "role"],
		defaultColumns: ["email", "name", "role", "updatedAt"]
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
				throw new APIError("Cannot hard delete a user", 400, undefined, true);
			}
		]
	},
	fields: [
		// timestamps: createdAt
		// timestamps: updatedAt
		// timestamps: deletedAt
		// email: email
		// auth: resetPasswordToken
		// auth: resetPasswordExpiration
		// auth: salt
		// auth: hash
		// apiKey: enableAPIKey
		// apiKey: apiKey
		// apiKey: apiKeyIndex
		// sessions: sessions (id, createdAt, expiresAt)
		// accountLock: loginAttempts
		// accountLock: lockUntil
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
			name: "email",
			label: "Email",
			type: "email",
			required: true,
			index: true,
			unique: true,
			admin: {
				disableBulkEdit: true,
				readOnly: true
			}
		},
		{
			name: "role",
			label: "Role",
			type: "relationship",
			relationTo: "roles",
			required: true
		},
		// {
		// 	name: "salt",
		// 	label: "Salt",
		// 	type: "text"
		// },
		// {
		// 	name: "hash",
		// 	label: "Hash",
		// 	type: "text"
		// },
		{
			name: "enableAPIKey",
			label: "Enable API Key",
			type: "checkbox",
			required: true,
			defaultValue: false,
			admin: {
				disableBulkEdit: true
			}
		},
		{
			name: "apiKey",
			label: "API Key",
			type: "text",
			index: true,
			admin: {
				disableBulkEdit: true
			}
		},
		{
			name: "apiKeyIndex",
			type: "text",
			index: true
		},
		{
			name: "sessions",
			label: "Sessions",
			type: "array",
			required: true,
			minRows: 0,
			defaultValue: [],
			fields: [
				{
					name: "id",
					type: "text",
					required: true,
					index: true,
					unique: true
				},
				{
					name: "createdAt",
					type: "date",
					required: true,
					defaultValue: () => new Date()
				},
				{
					name: "expiresAt",
					type: "date",
					required: true
				}
			]
		},
		{
			name: "loginAttempts",
			label: "Login Attempts",
			type: "number"
		},
		{
			name: "lockUntil",
			label: "Lock Until",
			type: "date"
		},
		{
			name: "name",
			label: "Name",
			type: "text",
			required: true
		},
		{
			name: "employeeId",
			label: "Employee ID",
			type: "text",
			required: true,
			unique: true
		},
		{
			name: "supervisor",
			label: "Supervisor",
			type: "relationship",
			relationTo: "users"
		},
		{
			name: "stagedUser",
			label: "Staged User",
			type: "relationship",
			relationTo: "staged-users",
			unique: true
		}
	]
});

export const StagedUsers = (): CollectionConfig => ({
	slug: "staged-users",
	labels: {
		singular: "Staged User",
		plural: "Staged Users"
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
		useAsTitle: "email",
		listSearchableFields: ["email", "name", "role", "reviewComment"],
		defaultColumns: ["email", "name", "role", "updatedAt", "reviewedBy", "reviewComment"]
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
				throw new APIError("Cannot hard delete a user", 400, undefined, true);
			}
		]
	},
	fields: [
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
			name: "email",
			label: "Email",
			type: "email",
			required: true,
			index: true,
			unique: true,
			admin: {
				disableBulkEdit: true,
				readOnly: true
			}
		},
		{
			name: "role",
			label: "Role",
			type: "relationship",
			relationTo: "roles",
			required: true
		},
		{
			name: "initialPassword",
			label: "Initial Password",
			type: "text",
			access: {
				read: () => false
			}
		},
		{
			name: "name",
			label: "Name",
			type: "text",
			required: true
		},
		{
			name: "employeeId",
			label: "Employee ID",
			type: "text",
			required: true,
			unique: true
		},
		{
			name: "supervisor",
			label: "Supervisor",
			type: "relationship",
			relationTo: "users"
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
