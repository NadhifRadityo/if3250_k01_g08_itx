import type { CollectionConfig } from "payload";

export const OTPLogsCollection = (): CollectionConfig => ({
	slug: "otp-logs",

	labels: {
		singular: "OTP Log",
		plural: "OTP Logs",
	},

	admin: {
		useAsTitle: "officerName",
		defaultColumns: [
			"requestDate",
			"officerName",
			"applyId",
			"waNumber",
			"smsNumber",
			"email",
			"content",
			"waResponse",
			"smsResponse",
			"emailResponse",
		],
	},

	fields: [
		{
			name: "requestDate",
			label: "Request Date",
			type: "date",
			required: true,
			defaultValue: () => new Date().toISOString(),
			admin: {
				date: {
					pickerAppearance: "dayAndTime",
				},
			},
		},
		{
			name: "officerName",
			label: "Officer Name",
			type: "text",
			required: true,
		},
		{
			name: "applyId",
			label: "Apply ID",
			type: "relationship",
			relationTo: "credit-applications",
			required: false,
		},
		{
			name: "waNumber",
			label: "WA No",
			type: "text",
			defaultValue: "na",
		},
		{
			name: "smsNumber",
			label: "SMS No",
			type: "text",
			defaultValue: "na",
		},
		{
			name: "email",
			label: "Email",
			type: "email",
			required: false,
		},
		{
			name: "content",
			label: "Content",
			type: "textarea",
			required: false,
		},
		{
			name: "waResponse",
			label: "WA Respond",
			type: "select",
			required: true,
			defaultValue: "NA",
			options: [
				{ label: "Sent", value: "Sent" },
				{ label: "Failed", value: "Failed" },
				{ label: "Pending", value: "Pending" },
				{ label: "NA", value: "NA" },
			],
		},
		{
			name: "smsResponse",
			label: "SMS Respond",
			type: "select",
			required: true,
			defaultValue: "NA",
			options: [
				{ label: "Sent", value: "Sent" },
				{ label: "Failed", value: "Failed" },
				{ label: "Pending", value: "Pending" },
				{ label: "NA", value: "NA" },
			],
		},
		{
			name: "emailResponse",
			label: "Email Respond",
			type: "select",
			required: true,
			defaultValue: "NA",
			options: [
				{ label: "Sent", value: "Sent" },
				{ label: "Failed", value: "Failed" },
				{ label: "Pending", value: "Pending" },
				{ label: "NA", value: "NA" },
			],
		},
	],
});
