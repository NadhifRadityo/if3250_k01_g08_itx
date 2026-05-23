import { APIError, CollectionConfig } from "payload";

import { buildAccesses, dateMaskOptions, textMaskOptions, buildAccessMasks, genericMaskOptions } from "./AccessCollection";

export const LoginLogs = (): CollectionConfig => ({
	slug: "login-logs",
	labels: {
		singular: "Login Log",
		plural: "Login Logs"
	},
	timestamps: false,
	admin: {
		useAsTitle: "id",
		defaultColumns: ["createdAt", "ipAddress", "user", "event", "outcome"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "create")
					throw new APIError("Login logs are append only");
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
			name: "ipAddress",
			label: "IP Address",
			type: "text",
			required: true
		},
		{
			name: "user",
			label: "User",
			type: "relationship",
			relationTo: "users",
			index: true
		},
		{
			name: "event",
			label: "Event",
			type: "select",
			required: true,
			options: [
				{ value: "login", label: "Login" },
				{ value: "logout", label: "Logout" }
			],
			index: true
		},
		{
			name: "outcome",
			label: "Outcome",
			type: "select",
			required: false,
			options: [
				{ value: "success", label: "Success" },
				{ value: "failure", label: "Failure" }
			]
		}
	]
});

export const defaultLoginLogAccessMaskId = "a1b2c3d4-4444-4aaa-bbbb-000000000004";
export const LoginLogAccesses = () => buildAccesses({
	collection: "login-logs",
	defaultMaskId: defaultLoginLogAccessMaskId
});
export const LoginLogAccessMasks = () => buildAccessMasks({
	collection: "login-logs",
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
			name: "maskIpAddress",
			label: "Mask IP Address",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: textMaskOptions
		},
		{
			name: "maskUser",
			label: "Mask User",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskEvent",
			label: "Mask Event",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskOutcome",
			label: "Mask Outcome",
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
