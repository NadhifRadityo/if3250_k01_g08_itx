import { APIError, type CollectionConfig } from "payload";

import { buildAccesses, dateMaskOptions, textMaskOptions, buildAccessMasks, emailMaskOptions, genericMaskOptions, phoneNumberMaskOptions } from "./AccessCollection";

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

export const defaultOtpLogAccessMaskId = "a1b2c3d4-5555-4aaa-bbbb-000000000005";
export const OtpLogAccesses = () => buildAccesses({
	collection: "otp-logs",
	defaultMaskId: defaultOtpLogAccessMaskId
});
export const OtpLogAccessMasks = () => buildAccessMasks({
	collection: "otp-logs",
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
			name: "maskContent",
			label: "Mask Content",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: textMaskOptions
		},
		{
			name: "maskEmail",
			label: "Mask Email",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: emailMaskOptions
		},
		{
			name: "maskWhatsappNumber",
			label: "Mask WhatsApp Number",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: phoneNumberMaskOptions
		},
		{
			name: "maskSmsNumber",
			label: "Mask SMS Number",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: phoneNumberMaskOptions
		},
		{
			name: "maskEmailDeliveryStatus",
			label: "Mask Email Delivery Status",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskWhatsappDeliveryStatus",
			label: "Mask WhatsApp Delivery Status",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskSmsDeliveryStatus",
			label: "Mask SMS Delivery Status",
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
