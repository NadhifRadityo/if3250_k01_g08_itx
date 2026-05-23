import { APIError, CollectionConfig } from "payload";

import { buildAccesses, dateMaskOptions, buildAccessMasks, genericMaskOptions, phoneNumberMaskOptions } from "./AccessCollection";

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

export const defaultRecordingLogAccessMaskId = "a1b2c3d4-6666-4aaa-bbbb-000000000006";
export const RecordingLogAccesses = () => buildAccesses({
	collection: "recording-logs",
	defaultMaskId: defaultRecordingLogAccessMaskId
});
export const RecordingLogAccessMasks = () => buildAccessMasks({
	collection: "recording-logs",
	fields: [
		{
			name: "maskCreatedAt",
			label: "Mask Created At",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: dateMaskOptions
		},
		{
			name: "maskCreatedBy",
			label: "Mask Created By",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskUpdatedAt",
			label: "Mask Updated At",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: dateMaskOptions
		},
		{
			name: "maskUpdatedBy",
			label: "Mask Updated By",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskDeletedAt",
			label: "Mask Deleted At",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: dateMaskOptions
		},
		{
			name: "maskDeletedBy",
			label: "Mask Deleted By",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskCreditApplication",
			label: "Mask Credit Application",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskOfficer",
			label: "Mask Officer",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskPhoneNumber",
			label: "Mask Phone Number",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: phoneNumberMaskOptions
		},
		{
			name: "maskAudioFile",
			label: "Mask Audio File",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskTranscription",
			label: "Mask Transcription",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskReviewedAt",
			label: "Mask Reviewed At",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: dateMaskOptions
		},
		{
			name: "maskReviewedBy",
			label: "Mask Reviewed By",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskReviewApproved",
			label: "Mask Review Approved",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskReviewComment",
			label: "Mask Review Comment",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		}
	]
});
