import { APIError, CollectionConfig } from "payload";

import { buildAccesses, buildAccessMasks } from "./AccessCollection";

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
					throw new APIError("Login logs are append only");
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
		}
	]
});

export const defaultLoginLogAccessMaskId = "e95dde24-a1cc-4c50-86f2-46069b2b5c26";
export const LoginLogAccesses = () => buildAccesses({
	collection: "login-logs",
	defaultMaskId: defaultLoginLogAccessMaskId
});
export const LoginLogAccessMasks = () => buildAccessMasks({
	collection: "login-logs",
	maskFields: [
		{
			name: "maskCreatedAt",
			label: "Mask Created At",
			type: "date"
		},
		{
			name: "maskIpAddress",
			label: "Mask IP Address",
			type: "text"
		},
		{
			name: "maskUser",
			label: "Mask User",
			type: "generic"
		},
		{
			name: "maskEvent",
			label: "Mask Event",
			type: "generic"
		},
		{
			name: "maskOutcome",
			label: "Mask Outcome",
			type: "generic"
		}
	]
});
