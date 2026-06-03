import { APIError, type CollectionConfig } from "payload";

export const MessageLogs = (): CollectionConfig => ({
	slug: "message-logs",
	labels: {
		singular: "Message Log",
		plural: "Message Logs"
	},
	timestamps: false,
	admin: {
		useAsTitle: "officerTask",
		defaultColumns: ["createdAt", "officerTask", "content", "email", "whatsappNumber", "smsNumber", "emailDeliveryStatus", "whatsappDeliveryStatus", "smsDeliveryStatus"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "create")
					throw new APIError("Message logs are append only", 400, undefined, true);
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a message log", 400, undefined, true);
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
