import { APIError, type CollectionConfig } from "payload";

import { buildAccesses, buildAccessMasks } from "./AccessCollection";

export const OtpLogs = (): CollectionConfig => ({
	slug: "otp-logs",
	labels: {
		singular: "OTP Log",
		plural: "OTP Logs"
	},
	timestamps: false,
	admin: {
		useAsTitle: "creditApplication",
		defaultColumns: ["createdAt", "creditApplication", "content", "email", "whatsappNumber", "smsNumber", "emailDeliveryStatus", "whatsappDeliveryStatus", "smsDeliveryStatus"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "create")
					throw new APIError("OTP logs are append only");
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
			name: "content",
			label: "Content",
			type: "textarea",
			required: true
		},
		{
			name: "email",
			label: "Email",
			type: "text"
		},
		{
			name: "whatsappNumber",
			label: "WhatsApp Number",
			type: "text"
		},
		{
			name: "smsNumber",
			label: "SMS Number",
			type: "text"
		},
		{
			name: "emailDeliveryStatus",
			label: "Email Delivery Status",
			type: "select",
			options: [
				{ label: "Sent", value: "sent" },
				{ label: "Failed", value: "failed" },
				{ label: "Pending", value: "pending" }
			]
		},
		{
			name: "whatsappDeliveryStatus",
			label: "WhatsApp Delivery Status",
			type: "select",
			options: [
				{ label: "Sent", value: "sent" },
				{ label: "Failed", value: "failed" },
				{ label: "Pending", value: "pending" }
			]
		},
		{
			name: "smsDeliveryStatus",
			label: "SMS Delivery Status",
			type: "select",
			options: [
				{ label: "Sent", value: "sent" },
				{ label: "Failed", value: "failed" },
				{ label: "Pending", value: "pending" }
			]
		}
	]
});

export const defaultOtpLogAccessMaskId = "e86187eb-42e3-47df-9d60-1a1721da639b";
export const OtpLogAccesses = () => buildAccesses({
	collection: "otp-logs",
	defaultMaskId: defaultOtpLogAccessMaskId
});
export const OtpLogAccessMasks = () => buildAccessMasks({
	collection: "otp-logs",
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
			name: "maskContent",
			label: "Mask Content",
			type: "text"
		},
		{
			name: "maskEmail",
			label: "Mask Email",
			type: "email"
		},
		{
			name: "maskWhatsappNumber",
			label: "Mask WhatsApp Number",
			type: "phoneNumber"
		},
		{
			name: "maskSmsNumber",
			label: "Mask SMS Number",
			type: "phoneNumber"
		},
		{
			name: "maskEmailDeliveryStatus",
			label: "Mask Email Delivery Status",
			type: "generic"
		},
		{
			name: "maskWhatsappDeliveryStatus",
			label: "Mask WhatsApp Delivery Status",
			type: "generic"
		},
		{
			name: "maskSmsDeliveryStatus",
			label: "Mask SMS Delivery Status",
			type: "generic"
		}
	]
});
