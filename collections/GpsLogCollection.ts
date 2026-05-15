import { APIError, type CollectionConfig } from "payload";

export const GpsLogs = (): CollectionConfig => ({
	slug: "gps-logs",
	labels: {
		singular: "GPS Log",
		plural: "GPS Logs"
	},
	admin: {
		useAsTitle: "createdAt",
		defaultColumns: ["createdAt", "officer", "sessionId", "creditApplication", "latitude", "longitude"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "update")
					throw new APIError("GPS logs are append only");
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
			name: "officer",
			label: "Officer",
			type: "relationship",
			relationTo: "users",
			required: true
		},
		{
			name: "sessionId",
			label: "Session Id",
			type: "text",
			required: true
		},
		{
			name: "creditApplication",
			label: "Credit Application",
			type: "relationship",
			relationTo: "credit-applications"
		},
		{
			name: "latitude",
			label: "Latitude",
			type: "number",
			required: true
		},
		{
			name: "longitude",
			label: "Longitude",
			type: "number",
			required: true
		}
	]
});
