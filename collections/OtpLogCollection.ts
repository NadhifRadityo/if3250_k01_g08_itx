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
				if(operation != "update")
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
				{ label: "Sent", value: "Sent" },
				{ label: "Failed", value: "Failed" },
				{ label: "Pending", value: "Pending" }
			]
		},
		{
			name: "whatsappDeliveryStatus",
			label: "WhatsApp Delivery Status",
			type: "select",
			options: [
				{ label: "Sent", value: "Sent" },
				{ label: "Failed", value: "Failed" },
				{ label: "Pending", value: "Pending" }
			]
		},
		{
			name: "smsDeliveryStatus",
			label: "SMS Delivery Status",
			type: "select",
			options: [
				{ label: "Sent", value: "Sent" },
				{ label: "Failed", value: "Failed" },
				{ label: "Pending", value: "Pending" }
			]
		}
	]
});
