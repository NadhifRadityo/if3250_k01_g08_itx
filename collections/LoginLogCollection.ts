import { CollectionConfig } from "payload";

export const LoginLogs = (): CollectionConfig => ({
	slug: "login-logs",
	labels: {
		singular: "Login Log",
		plural: "Login Logs"
	},
	admin: {
		useAsTitle: "id",
		defaultColumns: ["occurredAt", "user", "event", "outcome", "ip"],
		group: "System"
	},
	access: {
		create: () => false,
		read: () => false,
		update: () => false,
		delete: () => false
	},
	fields: [
		{
			name: "user",
			label: "User",
			type: "relationship",
			relationTo: "users",
			required: false,
			index: true
		},
		{
			name: "occurredAt",
			label: "Occurred At",
			type: "date",
			required: true,
			index: true
		},
		{
			name: "ip",
			label: "IP",
			type: "text",
			required: true
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
				{ value: "success", label: "Success (S)" },
				{ value: "failure", label: "Failure (F)" }
			]
		}
	]
});
