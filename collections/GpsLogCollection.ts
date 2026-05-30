import { APIError, type CollectionConfig } from "payload";

import { getRelationshipId } from "@/utils/payload";

import { effectiveDoc } from "./shared";

export const GpsLogs = (): CollectionConfig => ({
	slug: "gps-logs",
	labels: {
		singular: "GPS Log",
		plural: "GPS Logs"
	},
	timestamps: false,
	admin: {
		useAsTitle: "createdAt",
		defaultColumns: ["createdAt", "sessionId", "user", "officerTask", "latitude", "longitude", "accuracy"]
	},
	hooks: {
		beforeChange: [
			({ operation }) => {
				if(operation != "create")
					throw new APIError("GPS logs are append only");
			},
			async ({ data, originalDoc, req, req: { payload } }) => {
				const doc = effectiveDoc(originalDoc, data);
				if(doc.officerTask != null) {
					const creditApplicationAssignment = (await payload.findByID({
						req: req,
						overrideAccess: true,
						disableErrors: true,
						collection: "officer-tasks",
						id: getRelationshipId(doc.officerTask)!,
						depth: 1,
						select: { creditApplicationAssignment: true },
						populate: { "credit-application-assignments": { officer: true } }
					}))?.creditApplicationAssignment;
					if(creditApplicationAssignment == null)
						throw new Error("Invalid credit application assignment");
					const officer = getRelationshipId((creditApplicationAssignment as Extract<typeof creditApplicationAssignment, object>).officer)!;
					if(officer != getRelationshipId(doc.user)!)
						throw new Error("Officer task must be the same as user");
				}
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
			name: "user",
			label: "User",
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
			name: "officerTask",
			label: "Officer Task",
			type: "relationship",
			relationTo: "officer-tasks"
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
		},
		{
			name: "accuracy",
			label: "Accuracy",
			type: "number",
			required: true
		}
	]
});
