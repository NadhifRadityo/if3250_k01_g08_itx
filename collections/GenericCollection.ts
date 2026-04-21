import { APIError, CollectionConfig } from "payload";

export const GenericRichtextUploads = (): CollectionConfig => ({
	slug: "generic-richtext-uploads",
	labels: {
		singular: "Generic Richtext Upload",
		plural: "Generic Richtext Uploads"
	},
	trash: true,
	timestamps: true,
	upload: {
		staticDir: "uploads/generic-richtext-uploads"
	},
	admin: {
		useAsTitle: "filename",
		listSearchableFields: ["filename"],
		defaultColumns: ["filename", "filesize"]
	},
	hooks: {
		beforeChange: [
			({ operation, originalDoc, data }) => {
				if(operation == "update" && originalDoc != null) {
					for(const field of ["filename", "filesize", "mimeType", "url"]) {
						if(!(field in data))
							continue;
						const nextValue = (data as Record<string, unknown>)[field];
						const previousValue = (originalDoc as Record<string, unknown>)[field];
						if(JSON.stringify(nextValue) != JSON.stringify(previousValue))
							throw new APIError(`Cannot modify '${field}' after upload. Create a new upload instead.`, 400, undefined, true);
					}
				}
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a generic richtext upload", 400, undefined, true);
			}
		]
	},
	fields: []
});
