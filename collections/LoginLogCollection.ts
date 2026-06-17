import { APIError, CollectionConfig } from "payload";

export const LoginLogs = (): CollectionConfig => ({
	slug: "login-logs",
	labels: {
		singular: "Login Log",
		plural: "Login Logs"
	},
	timestamps: false,
	admin: {
		useAsTitle: "id",
		defaultColumns: ["createdAt", "ipAddress", "user", "event", "outcome"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "create")
					throw new APIError("Login logs are append only", 400, undefined, true);
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a login log", 400, undefined, true);
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
			name: "ipAddress",
			label: "IP Address",
			type: "text",
			required: true
		},
		{
			name: "user",
			label: "User",
			type: "relationship",
			relationTo: "users",
			index: true
		},
		{
			name: "event",
			label: "Event",
			type: "select",
			required: true,
			options: [
				{ value: "login", label: "Login" },
				{ value: "logout", label: "Logout" }
			],
			index: true
		},
		{
			name: "outcome",
			label: "Outcome",
			type: "select",
			required: false,
			options: [
				{ value: "success", label: "Success" },
				{ value: "failure", label: "Failure" }
			]
		},
		{
			name: "sessionId",
			label: "Session Id",
			type: "text"
		},
		{
			name: "forcedLogoutBy",
			label: "Forced Logout By",
			type: "relationship",
			relationTo: "users"
		},
		{
			name: "description",
			label: "Description",
			type: "text"
		}
	]
});
