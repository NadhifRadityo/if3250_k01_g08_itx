import { lexicalEditor, UploadFeature } from "@payloadcms/richtext-lexical";
import { APIError, CollectionConfig } from "payload";

import { MultiLineFeature, AllFormatsFeature, ReviewRichTextEditor } from "./shared";

const CreditApplicationRichTextEditor = () => lexicalEditor({
	features: [
		...AllFormatsFeature(),
		...MultiLineFeature(),
		UploadFeature({
			enabledCollections: ["generic-richtext-uploads"]
		})
	]
});

export const CreditApplications = (): CollectionConfig => ({
	slug: "credit-applications",
	labels: {
		singular: "Credit Application",
		plural: "Credit Applications"
	},
	trash: true,
	timestamps: true,
	versions: {
		maxPerDoc: 0,
		drafts: {
			autosave: {
				showSaveDraftButton: true
			},
			validate: true
		}
	},
	admin: {
		useAsTitle: "name",
		listSearchableFields: ["name", "email", "addresses", "phoneNumbers", "whatsappNumber", "smsNumber", "collateralRegistryName", "collateralName", "collateralDescription", "assetName", "assetDescription", "remarks", "reviewComment"],
		defaultColumns: ["import", "name", "email", "addresses", "phoneNumbers", "whatsappNumber", "smsNumber", "collateralRegistryName", "collateralName", "collateralDescription", "assetName", "assetDescription", "period", "installment", "downPayment", "plafond", "vendor", "remarks"]
	},
	hooks: {
		beforeChange: [
			({ req, operation, data }) => {
				if(req.user == null) return;
				if(data.deletedAt != null)
					data = { deletedBy: req.user.id, ...data };
				if(operation == "create")
					data = { createdBy: req.user.id, updatedBy: req.user.id, ...data };
				if(operation == "update")
					data = { updatedBy: req.user.id, ...data };
				return data;
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a credit application", 400, undefined, true);
			}
		]
	},
	fields: [
		// timestamps: createdAt
		// timestamps: updatedAt
		// timestamps: deletedAt
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
			name: "createdBy",
			label: "Created By",
			type: "relationship",
			relationTo: "users",
			admin: {
				hidden: true,
				disableBulkEdit: true,
				readOnly: true
			}
		},
		{
			name: "updatedAt",
			label: "Updated At",
			type: "date",
			required: true,
			index: true,
			defaultValue: () => new Date(),
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "updatedBy",
			label: "updated By",
			type: "relationship",
			relationTo: "users",
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "deletedAt",
			label: "Deleted At",
			type: "date",
			index: true,
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "deletedBy",
			label: "deleted By",
			type: "relationship",
			relationTo: "users",
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "import",
			label: "Import",
			type: "relationship",
			relationTo: "credit-application-imports"
		},
		{
			name: "name",
			label: "Name",
			type: "text",
			required: true
		},
		{
			name: "email",
			label: "Email",
			type: "text"
		},
		{
			name: "addresses",
			label: "Addresses",
			type: "text",
			required: true,
			hasMany: true
		},
		{
			name: "phoneNumbers",
			label: "Phone Numbers",
			type: "text",
			required: true,
			hasMany: true
		},
		{
			name: "whatsappNumber",
			label: "WhatsApp Number",
			type: "text",
			required: true
		},
		{
			name: "smsNumber",
			label: "SMS Number",
			type: "text"
		},
		{
			name: "collateralRegistryName",
			label: "Collateral Registry Name",
			type: "text"
		},
		{
			name: "collateralName",
			label: "Collateral Name",
			type: "text"
		},
		{
			name: "collateralDescription",
			label: "Collateral Description",
			type: "richText",
			editor: CreditApplicationRichTextEditor()
		},
		{
			name: "assetId",
			label: "Asset Id",
			type: "text"
		},
		{
			name: "assetName",
			label: "Asset Name",
			type: "text"
		},
		{
			name: "assetDescription",
			label: "Asset Description",
			type: "richText",
			editor: CreditApplicationRichTextEditor()
		},
		{
			name: "period",
			label: "Period",
			type: "number"
		},
		{
			name: "installment",
			label: "Installment",
			type: "number"
		},
		{
			name: "downPayment",
			label: "Down Payment",
			type: "number"
		},
		{
			name: "plafond",
			label: "Plafond",
			type: "number"
		},
		{
			name: "vendor",
			label: "Vendor",
			type: "text"
		},
		{
			name: "remarks",
			label: "Remarks",
			type: "richText",
			editor: CreditApplicationRichTextEditor()
		},
		{
			name: "otherText1",
			label: "Other Text 1",
			type: "text"
		},
		{
			name: "otherText2",
			label: "Other Text 2",
			type: "text"
		},
		{
			name: "otherNumber1",
			label: "Other Number 1",
			type: "number"
		},
		{
			name: "otherNumber2",
			label: "Other Number 2",
			type: "number"
		},
		{
			name: "otherDate1",
			label: "Other Date 1",
			type: "date"
		},
		{
			name: "otherDate2",
			label: "Other Date 2",
			type: "date"
		},
		{
			name: "others",
			label: "Others",
			type: "json"
		},
		{
			name: "changeRequestType",
			label: "Change Request Type",
			type: "select",
			required: true,
			dbName: "enum_change_request_type",
			options: [
				{ value: "create", label: "Create" },
				{ value: "update", label: "Update" },
				{ value: "delete", label: "Delete" }
			]
		},
		{
			name: "changeRequestComment",
			label: "Change Request Comment",
			type: "richText",
			editor: ReviewRichTextEditor()
		},
		{
			name: "reviewedAt",
			label: "Reviewed At",
			type: "date"
		},
		{
			name: "reviewedBy",
			label: "Reviewed By",
			type: "relationship",
			relationTo: "users"
		},
		{
			name: "reviewApproved",
			label: "Review Approved",
			type: "checkbox"
		},
		{
			name: "reviewComment",
			label: "Review Comment",
			type: "richText",
			editor: ReviewRichTextEditor()
		}
	]
});

export const CreditApplicationImports = (): CollectionConfig => ({
	slug: "credit-application-imports",
	labels: {
		singular: "Credit Application Import",
		plural: "Credit Application Imports"
	},
	trash: true,
	timestamps: true,
	upload: {
		staticDir: "uploads/credit-application-imports"
	},
	admin: {
		useAsTitle: "filename",
		listSearchableFields: ["filename", "description", "reviewComment"],
		defaultColumns: ["filename", "filesize", "updatedAt"]
	},
	hooks: {
		beforeChange: [
			({ req, operation, data }) => {
				if(req.user == null) return;
				if(data.deletedAt != null)
					data = { deletedBy: req.user.id, ...data };
				if(operation == "create")
					data = { createdBy: req.user.id, updatedBy: req.user.id, ...data };
				if(operation == "update")
					data = { updatedBy: req.user.id, ...data };
				return data;
			},
			({ operation, data, originalDoc }) => {
				if(operation == "update" && originalDoc != null) {
					const resolvedDeletedAt = "deletedAt" in data ? data.deletedAt : originalDoc.deletedAt;
					const resolvedReviewedAt = "reviewedAt" in data ? data.reviewedAt : originalDoc.reviewedAt;
					const resolvedReviewApproved = "reviewApproved" in data ? data.reviewApproved : originalDoc.reviewApproved;
					if(resolvedDeletedAt != null && resolvedReviewedAt != null && resolvedReviewApproved == true)
						throw new APIError("Approved imports cannot be deleted.", 400, undefined, true);
					if(originalDoc.reviewedAt != null && "description" in data) {
						const nextDescription = (data).description;
						const previousDescription = (originalDoc as Record<string, unknown>).description;
						if(JSON.stringify(nextDescription) != JSON.stringify(previousDescription))
							throw new APIError("Cannot modify 'description' after import review.", 400, undefined, true);
					}
					for(const field of ["filename", "filesize", "mimeType", "url"]) {
						if(!(field in data))
							continue;
						const nextValue = (data)[field];
						const previousValue = (originalDoc as Record<string, unknown>)[field];
						if(JSON.stringify(nextValue) != JSON.stringify(previousValue))
							throw new APIError(`Cannot modify '${field}' after import upload. Create a new import instead.`, 400, undefined, true);
					}
				}
			}
		],
		beforeDelete: [
			() => {
				throw new APIError("Cannot hard delete a credit application import", 400, undefined, true);
			}
		]
	},
	fields: [
		// timestamps: createdAt
		// timestamps: updatedAt
		// timestamps: deletedAt
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
			name: "createdBy",
			label: "Created By",
			type: "relationship",
			relationTo: "users",
			admin: {
				hidden: true,
				disableBulkEdit: true,
				readOnly: true
			}
		},
		{
			name: "updatedAt",
			label: "Updated At",
			type: "date",
			required: true,
			index: true,
			defaultValue: () => new Date(),
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "updatedBy",
			label: "updated By",
			type: "relationship",
			relationTo: "users",
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "deletedAt",
			label: "Deleted At",
			type: "date",
			index: true,
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "deletedBy",
			label: "deleted By",
			type: "relationship",
			relationTo: "users",
			admin: {
				hidden: true,
				disableBulkEdit: true
			}
		},
		{
			name: "description",
			label: "Description",
			type: "richText",
			editor: CreditApplicationRichTextEditor()
		},
		{
			name: "reviewedAt",
			label: "Reviewed At",
			type: "date"
		},
		{
			name: "reviewedBy",
			label: "Reviewed By",
			type: "relationship",
			relationTo: "users"
		},
		{
			name: "reviewApproved",
			label: "Review Approved",
			type: "checkbox"
		},
		{
			name: "reviewComment",
			label: "Review Comment",
			type: "richText",
			editor: ReviewRichTextEditor()
		},
		{
			name: "creditApplications",
			label: "Credit Applications",
			type: "join",
			collection: "credit-applications",
			on: "import"
		}
	]
});
