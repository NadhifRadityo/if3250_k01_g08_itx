import { APIError, CollectionConfig } from "payload";

export const RecordingLogAudioFiles = (): CollectionConfig => ({
	slug: "recording-log-audio-files",
	labels: {
		singular: "Recording Log Audio File",
		plural: "Recording Log Audio Files"
	},
	upload: {
		mimeTypes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg"]
	},
	fields: []
});

export const RecordingLogTranscriptions = (): CollectionConfig => ({
	slug: "recording-log-transcriptions",
	labels: {
		singular: "Recording Log Transcription",
		plural: "Recording Log Transcriptions"
	},
	upload: {
		mimeTypes: ["text/plain"]
	},
	fields: []
});

export const RecordingLogs = (): CollectionConfig => ({
	slug: "recording-logs",
	admin: {
		useAsTitle: "creditApplication",
		defaultColumns: ["createdAt", "creditApplication", "officer", "phoneNumber", "audioFile", "transcription"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "update")
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
			name: "creditApplication",
			label: "Credit Application",
			type: "relationship",
			relationTo: "credit-applications",
			required: true
		},
		{
			name: "officer",
			label: "Officer",
			type: "relationship",
			relationTo: "users",
			required: true
		},
		{
			name: "phoneNumber",
			type: "text",
			required: true
		},
		{
			name: "audioFile",
			type: "relationship",
			relationTo: "recording-log-audio-files"
		},
		{
			name: "transcription",
			type: "relationship",
			relationTo: "recording-log-transcriptions"
		}
	]
});
