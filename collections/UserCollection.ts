import { APIError, CollectionConfig } from "payload";

import { userAdmin, userManager, effectiveDoc, userSupervisor, roleLowerOrEqual, extractEmailDomain } from "./shared";

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
	access: {
		// Allow admin users to create/read/update/delete/admin admin/manager/supervisor/officer users
		// Allow manager users to create/read/update/delete/admin manager/supervisor/officer users (can only delete local users)
		// Allow supervisor users to read/admin supervisor/officer
		// Allow officer users to read/update their own
		create: ({ req: { user } }) =>
			userManager(user) ?
				{ role: { in: roleLowerOrEqual(user.role) } } :
				false,
		read: ({ req: { user } }) =>
			userSupervisor(user) ?
				{ role: { in: roleLowerOrEqual(user.role) } } :
				user != null ?
					{ id: { equals: user.id } } :
					false,
		update: ({ req: { user } }) =>
			userManager(user) ?
				{ role: { in: roleLowerOrEqual(user.role) } } :
				user != null ?
					{ id: { equals: user.id } } :
					false,
		delete: ({ req: { user } }) =>
			userManager(user) ?
				{ role: { in: roleLowerOrEqual(user.role) } } :
				false,
		admin: ({ req: { user } }) => userSupervisor(user)
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
				if(data.deletedAt)
					data = { ...data, deletedBy: req.user.id };
				if(operation == "create")
					data = { ...data, createdBy: req.user.id, updatedBy: req.user.id };
				if(operation == "update")
					data = { ...data, updatedBy: req.user.id };
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
			access: {
				// Make field read-only, except internal API
				update: () => false
			},
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
			access: {
				// Make field read-only, except internal API
				update: () => false,
			},
			admin: {
				hidden: true,
				disableBulkEdit: true,
				readOnly: true
			},
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
			access: {
				// Only allow operation from manager users
				update: ({ req: { user } }) => userManager(user)
			},
			admin: {
				hidden: true,
				disableBulkEdit: true
			},
			hooks: {
				beforeChange: [
					// Prevent admin user self-trash
					({ previousValue, value, data, originalDoc, req: { user } }) => {
						const doc = effectiveDoc(originalDoc, data);
						if(doc.id == user?.id && doc.role == "admin" && previousValue == null && value != null)
							throw new APIError("Cannot trash admin user by itself", 400, undefined, true);
					}
				]
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
			type: "select",
			options: [
				{ value: "admin", label: "Admin" },
				{ value: "manager", label: "Manager" },
				{ value: "supervisor", label: "Supervisor" },
				{ value: "officer", label: "Officer" }
			],
			required: true,
			index: true,
			defaultValue: "officer",
			access: {
				create: ({ data, doc: originalDoc, req: { user } }) => user == null ? false : (doc => doc.role != null ? roleLowerOrEqual(user.role).includes(doc.role) : false)(effectiveDoc(originalDoc, data)),
				read: ({ data, doc: originalDoc, req: { user } }) => user == null ? false : (doc => doc.role != null ? roleLowerOrEqual(user.role).includes(doc.role) : false)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => user == null ? false : (doc => doc.role != null ? roleLowerOrEqual(user.role).includes(doc.role) : false)(effectiveDoc(originalDoc, data))
			},
			hooks: {
				beforeChange: [
					async ({ req, req: { payload, context } }) => {
						const { totalDocs: adminUserCount } = await payload.db.count({
							req: req,
							collection: "users",
							where: { role: { equals: "admin" } }
						});
						context.isFirstUser = adminUserCount == 0;
					},
					// Prevent promotion higher than current user role
					({ value, req: { user, context } }) => {
						if(context.isFirstUser == false && !roleLowerOrEqual(user?.role).includes(value))
							throw new APIError("Cannot promote higher than current user", 400, undefined, true);
					},
					// Prevent admin user self-demotion
					({ previousValue, value, data, originalDoc, req: { user } }) => {
						const doc = effectiveDoc(originalDoc, data);
						if(doc.id == user?.id && previousValue == "admin" && value != "admin")
							throw new APIError("Cannot demote admin user by itself", 400, undefined, true);
					},
					// Ensure first user is admin
					({ value, req: { context } }) => {
						if(context.isFirstUser == true && value != "admin")
							throw new APIError("First user must be admin", 400, undefined, true);
					}
				]
			}
		},
		// {
		// 	name: "salt",
		// 	label: "Salt",
		// 	type: "text",
		// 	access: {
		// 		// Allow create/read/update access if it's user owned or if user is admin
		// 		create: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
		// 		read: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
		// 		update: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
		// 	}
		// },
		// {
		// 	name: "hash",
		// 	label: "Hash",
		// 	type: "text",
		// 	access: {
		// 		// Allow create/read/update access if it's user owned or if user is admin
		// 		create: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
		// 		read: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
		// 		update: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
		// 	}
		// },
		{
			name: "enableAPIKey",
			label: "Enable API Key",
			type: "checkbox",
			required: true,
			defaultValue: false,
			access: {
				// Allow create/read/update access if it's user owned or if user is admin
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				read: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
			},
			admin: {
				disableBulkEdit: true
			}
		},
		{
			name: "apiKey",
			label: "API Key",
			type: "text",
			index: true,
			access: {
				// Allow create/read/update access if it's user owned or if user is admin
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				read: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
			},
			admin: {
				disableBulkEdit: true
			}
		},
		{
			name: "apiKeyIndex",
			type: "text",
			index: true,
			access: {
				// Allow create/read/update access if it's user owned or if user is admin
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				read: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
			}
		},
		{
			name: "sessions",
			label: "Sessions",
			type: "array",
			required: true,
			minRows: 0,
			defaultValue: [],
			access: {
				// Allow create/read access if it's user owned or if user is admin
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				read: ({ data, doc: originalDoc, req: { user } }) => (doc => userAdmin(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: () => false
			},
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
			type: "number",
			access: {
				// Allow create/read/update access if it's user owned or if user is manager
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				read: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
			}
		},
		{
			name: "lockUntil",
			label: "Lock Until",
			type: "date",
			access: {
				// Allow create/read/update access if it's user owned or if user is manager
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				read: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
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
			name: "reviewedAt",
			label: "Reviewed At",
			type: "date",
			access: {
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
			},
			admin: {
				condition: (_, __, { user }) => userManager(user)
			}
		},
		{
			name: "reviewedBy",
			label: "Reviewed By",
			type: "relationship",
			relationTo: "users",
			access: {
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
			},
			admin: {
				condition: (_, __, { user }) => userManager(user)
			}
		},
		{
			name: "reviewAprroved",
			label: "Review Aprroved",
			type: "checkbox",
			access: {
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
			},
			admin: {
				condition: (_, __, { user }) => userManager(user)
			}
		},
		{
			name: "reviewComment",
			label: "Review Comment",
			type: "richText",
			access: {
				create: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data)),
				update: ({ data, doc: originalDoc, req: { user } }) => (doc => userManager(user) || doc.id == user?.id)(effectiveDoc(originalDoc, data))
			},
			admin: {
				condition: (_, __, { user }) => userManager(user)
			}
		}
	]
});
