import { APIError, CollectionConfig } from "payload";

import { buildAccesses, buildAccessMasks } from "./AccessCollection";

export const RecordingLogAudioFiles = (): CollectionConfig => ({
	slug: "recording-log-audio-files",
	labels: {
		singular: "Recording Log Audio File",
		plural: "Recording Log Audio Files"
	},
	upload: {
		staticDir: "uploads/recording-log-audio-files",
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
		staticDir: "uploads/recording-log-transcriptions",
		mimeTypes: ["text/plain"]
	},
	fields: []
});

export const RecordingLogs = (): CollectionConfig => ({
	slug: "recording-logs",
	labels: {
		singular: "Recording Log",
		plural: "Recording Logs"
	},
	timestamps: false,
	admin: {
		useAsTitle: "creditApplication",
		defaultColumns: ["createdAt", "creditApplication", "officer", "phoneNumber", "audioFile", "transcription"]
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

export const defaultRecordingLogAccessMaskId = "e00674d4-ee6f-4e48-8eba-b21eb49bf3d6";
export const RecordingLogAccesses = () => buildAccesses({
	collection: "recording-logs",
	defaultMaskId: defaultRecordingLogAccessMaskId
});
export const RecordingLogAccessMasks = () => buildAccessMasks({
	collection: "recording-logs",
	maskFields: [
		{
			name: "maskCreatedAt",
			label: "Mask Created At",
			type: "date"
		},
		{
			name: "maskCreditApplication",
			label: "Mask Credit Application",
			type: "generic"
		},
		{
			name: "maskOfficer",
			label: "Mask Officer",
			type: "generic"
		},
		{
			name: "maskPhoneNumber",
			label: "Mask Phone Number",
			type: "phoneNumber"
		},
		{
			name: "maskAudioFile",
			label: "Mask Audio File",
			type: "generic"
		},
		{
			name: "maskTranscription",
			label: "Mask Transcription",
			type: "generic"
		}
	]
});
