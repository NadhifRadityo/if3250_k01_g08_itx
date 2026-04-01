import { APIError, CollectionConfig } from "payload";

import { userAdmin, userManager, effectiveDoc, userSupervisor, roleLowerOrEqual, extractEmailDomain } from "./shared";

export const UserTeams = (): CollectionConfig => ({
	slug: "user-teams",
	labels: {
		singular: "User Team",
		plural: "User Teams"
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
	access: {
		create: ({ req: { user } }) => userManager(user),
		read: ({ req: { user } }) => userManager(user) ? true : { or: [{ supervisor: { equals: user.id } }, { officers: { contains: user.id } }] },
		readVersions: ({ req: { user } }) => userManager(user),
		update: ({ req: { user } }) => userManager(user),
		delete: ({ req: { user } }) => userManager(user)
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
				throw new APIError("Cannot hard delete a user team", 400, undefined, true);
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
			filterOptions: { role: { equals: "supervisor" } }
		},
		{
			name: "officers",
			label: "Officers",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			filterOptions: { role: { equals: "officer" } }
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
