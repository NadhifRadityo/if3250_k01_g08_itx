import { APIError, type CollectionConfig } from "payload";

import { buildAccesses, dateMaskOptions, textMaskOptions, buildAccessMasks, numberMaskOptions, genericMaskOptions } from "./AccessCollection";

export const GpsLogs = (): CollectionConfig => ({
	slug: "gps-logs",
	labels: {
		singular: "GPS Log",
		plural: "GPS Logs"
	},
	timestamps: false,
	admin: {
		useAsTitle: "createdAt",
		defaultColumns: ["createdAt", "officer", "sessionId", "creditApplication", "latitude", "longitude"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "create")
					throw new APIError("GPS logs are append only");
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
			name: "officer",
			label: "Officer",
			type: "relationship",
			relationTo: "users",
			required: true
		},
		{
			name: "sessionId",
			label: "Session Id",
			type: "text",
			required: true
		},
		{
			name: "creditApplication",
			label: "Credit Application",
			type: "relationship",
			relationTo: "credit-applications"
		},
		{
			name: "latitude",
			label: "Latitude",
			type: "number",
			required: true
		},
		{
			name: "longitude",
			label: "Longitude",
			type: "number",
			required: true
		}
	]
});

export const defaultGpsLogAccessMaskId = "a1b2c3d4-3333-4aaa-bbbb-000000000003";
export const GpsLogAccesses = () => buildAccesses({
	collection: "gps-logs",
	defaultMaskId: defaultGpsLogAccessMaskId
});
export const GpsLogAccessMasks = () => buildAccessMasks({
	collection: "gps-logs",
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
			name: "maskOfficer",
			label: "Mask Officer",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: genericMaskOptions
		},
		{
			name: "maskSessionId",
			label: "Mask Session Id",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: textMaskOptions
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
			name: "maskLatitude",
			label: "Mask Latitude",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: numberMaskOptions
		},
		{
			name: "maskLongitude",
			label: "Mask Longitude",
			type: "select",
			required: true,
			defaultValue: "hide",
			options: numberMaskOptions
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
