import { APIError, type CollectionConfig } from "payload";

export const OtpLogs = (): CollectionConfig => ({
	slug: "otp-logs",
	labels: {
		singular: "OTP Log",
		plural: "OTP Logs"
	},
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
