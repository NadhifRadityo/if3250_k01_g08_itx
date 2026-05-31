import { APIError, CollectionConfig } from "payload";

export const RecordingLogs = (): CollectionConfig => ({
	slug: "recording-logs",
	labels: {
		singular: "Recording Log",
		plural: "Recording Logs"
	},
	timestamps: false,
	admin: {
		useAsTitle: "officerTask",
		defaultColumns: ["createdAt", "officerTask", "phoneNumber", "audioUrl", "transcriptionUrl"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "create")
					throw new APIError("Recording logs are append only");
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
			name: "officerTask",
			label: "Officer Task",
			type: "relationship",
			relationTo: "officer-tasks"
		},
		{
			name: "phoneNumber",
			type: "text",
			required: true
		},
		{
			name: "audioUrl",
			type: "text"
		},
		{
			name: "transcriptionUrl",
			type: "text"
		}
	]
});
