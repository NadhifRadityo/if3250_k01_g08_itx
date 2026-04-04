import { APIError, CollectionConfig } from "payload";

export const AccountAssignments = (): CollectionConfig => ({
	slug: "account-assignments",
	labels: {
		singular: "Account Assignment",
		plural: "Account Assignments"
	},
	trash: true,
	timestamps: true,
	admin: {
		useAsTitle: "status",
		listSearchableFields: ["status", "notificationMessage"],
		defaultColumns: ["account", "currentUser", "status", "createdBy", "approvedBy", "approvedTime", "updatedAt"]
	},
	hooks: {
		beforeChange: [
			({ req, operation, data }) => {
				if(req.user == null)
					return data;

				if(operation == "create" && data.createdBy == null)
					data = { ...data, createdBy: req.user.id };

				return data;
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete an account assignment", 400, undefined, true);
			}
		]
	},
	fields: [
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
			name: "lastUser",
			label: "Last User",
			type: "relationship",
			relationTo: "users"
		},
		{
			name: "currentUser",
			label: "Current User",
			type: "relationship",
			relationTo: "users"
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
			name: "createdBy",
			label: "Created By",
			type: "relationship",
			relationTo: "users",
			required: true,
			index: true
		},
		{
			name: "approvedBy",
			label: "Approved By",
			type: "relationship",
			relationTo: "users"
		},
		{
			name: "approvedTime",
			label: "Approved Time",
			type: "date"
		},
		{
			name: "notificationMessage",
			label: "Notification Message",
			type: "text"
		}
	]
});
