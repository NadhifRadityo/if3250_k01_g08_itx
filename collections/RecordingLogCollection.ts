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
		defaultColumns: ["createdAt", "officerTask", "phoneNumber", "recordingUrl", "transcriptionUrl"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "create")
					throw new APIError("Recording logs are append only", 400, undefined, true);
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a recording log", 400, undefined, true);
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
			name: "recordingUrl",
			type: "text"
		},
		{
			name: "transcriptionUrl",
			type: "text"
		}
	]
});
