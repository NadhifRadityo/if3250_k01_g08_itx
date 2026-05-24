import { APIError, type CollectionConfig } from "payload";

import { buildAccesses, buildAccessMasks } from "./AccessCollection";

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

export const defaultGpsLogAccessMaskId = "6a2a365c-4208-423d-a219-58b375fa826f";
export const GpsLogAccesses = () => buildAccesses({
	collection: "gps-logs",
	defaultMaskId: defaultGpsLogAccessMaskId
});
export const GpsLogAccessMasks = () => buildAccessMasks({
	collection: "gps-logs",
	maskFields: [
		{
			name: "maskCreatedAt",
			label: "Mask Created At",
			type: "date"
		},
		{
			name: "maskOfficer",
			label: "Mask Officer",
			type: "generic"
		},
		{
			name: "maskSessionId",
			label: "Mask Session Id",
			type: "text"
		},
		{
			name: "maskCreditApplication",
			label: "Mask Credit Application",
			type: "generic"
		},
		{
			name: "maskLatitude",
			label: "Mask Latitude",
			type: "number"
		},
		{
			name: "maskLongitude",
			label: "Mask Longitude",
			type: "number"
		}
	]
});
