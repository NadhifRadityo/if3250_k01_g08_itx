import { APIError, GlobalConfig, CollectionConfig } from "payload";

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
		listSearchableFields: ["filename", "description"],
		defaultColumns: ["filename", "filesize", "updatedAt"]
	},
	hooks: {
		beforeChange: [
			({ req, operation, data }) => {
				if(req.user == null) return;
				if(data.deletedAt != null)
					data = { ...data, deletedBy: req.user.id };
				if(operation == "create")
					data = { ...data, createdBy: req.user.id, updatedBy: req.user.id };
				if(operation == "update")
					data = { ...data, updatedBy: req.user.id };
				return data;
			},
			({ req, operation, data, originalDoc }) => {
				if(operation == "update" && originalDoc != null) {
					const resolvedDeletedAt = "deletedAt" in data ? data.deletedAt : originalDoc.deletedAt;
					const resolvedReviewedAt = "reviewedAt" in data ? data.reviewedAt : originalDoc.reviewedAt;
					const resolvedReviewApproved = "reviewApproved" in data ? data.reviewApproved : originalDoc.reviewApproved;
					if(resolvedDeletedAt != null && resolvedReviewedAt != null && resolvedReviewApproved == true)
						throw new APIError("Approved imports cannot be deleted.", 400, undefined, true);
					if(originalDoc.reviewedAt != null && "description" in data) {
						const nextDescription = (data as Record<string, unknown>).description;
						const previousDescription = (originalDoc as Record<string, unknown>).description;
						if(JSON.stringify(nextDescription) != JSON.stringify(previousDescription))
							throw new APIError("Cannot modify 'description' after import review.", 400, undefined, true);
					}
				}
				if(operation == "update" && originalDoc != null && data.deletedAt == null) {
					for(const field of ["filename", "filesize", "mimeType", "url"]) {
						if(!(field in data))
							continue;
						const nextValue = (data as Record<string, unknown>)[field];
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
			type: "richText"
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
			type: "richText"
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
		listSearchableFields: ["name", "email", "addresses", "phoneNumbers", "whatsappNumber", "smsNumber", "collateralRegistryName", "collateralName", "collateralDescription", "assetName", "assetDescription", "remarks"],
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
			relationTo: "credit-application-imports",
			required: true
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
			label: "Whatsapp Number",
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
			type: "richText"
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
			type: "richText"
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
			type: "richText"
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
			type: "richText"
		}
	]
});

export const CreditApplicationFieldMasks = (): CollectionConfig => ({
	slug: "credit-application-field-masks",
	labels: {
		singular: "Credit Application Field Mask",
		plural: "Credit Application Field Masks"
	},
	versions: {
		maxPerDoc: 0,
		drafts: {
			autosave: {
				showSaveDraftButton: true
			},
			validate: true
		}
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
			name: "creditApplication",
			label: "Credit Application",
			type: "relationship",
			relationTo: "credit-applications",
			required: true
		},
		{
			name: "maskName",
			label: "Mask Name",
			type: "checkbox"
		},
		{
			name: "maskEmail",
			label: "Mask Email",
			type: "checkbox"
		},
		{
			name: "maskAddresses",
			label: "Mask Addresses",
			type: "checkbox"
		},
		{
			name: "maskPhoneNumbers",
			label: "Mask Phone Numbers",
			type: "checkbox"
		},
		{
			name: "maskWhatsappNumber",
			label: "Mask Whatsapp Number",
			type: "checkbox"
		},
		{
			name: "maskSmsNumber",
			label: "Mask SMS Number",
			type: "checkbox"
		},
		{
			name: "maskRemarks",
			label: "Mask Remarks",
			type: "checkbox"
		},
		{
			name: "maskOtherText1",
			label: "Mask Other Text 1",
			type: "checkbox"
		},
		{
			name: "maskOtherText2",
			label: "Mask Other Text 2",
			type: "checkbox"
		},
		{
			name: "maskOtherNumber1",
			label: "Mask Other Number 1",
			type: "checkbox"
		},
		{
			name: "maskOtherNumber2",
			label: "Mask Other Number 2",
			type: "checkbox"
		},
		{
			name: "maskOtherDate1",
			label: "Mask Other Date 1",
			type: "checkbox"
		},
		{
			name: "maskOtherDate2",
			label: "Mask Other Date 2",
			type: "checkbox"
		}
	]
});

export const CreditApplicationDefaultFieldMask = (): GlobalConfig => ({
	slug: "credit-application-default-field-mask",
	label: "Credit Application Default Field Mask",
	versions: {
		max: 0,
		drafts: {
			autosave: {
				showSaveDraftButton: true
			},
			validate: true
		}
	},
	hooks: {
		beforeChange: [
			({ req, data }) => {
				data = { updatedAt: new Date(), ...data };
				if(req.user != null)
					data = { updatedBy: req.user.id, ...data };
				return data;
			}
		]
	},
	fields: [
		// timestamps: updatedAt
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
			name: "maskName",
			label: "Mask Name",
			type: "checkbox",
			required: true,
			defaultValue: false
		},
		{
			name: "maskEmail",
			label: "Mask Email",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskAddresses",
			label: "Mask Addresses",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskPhoneNumbers",
			label: "Mask Phone Numbers",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskWhatsappNumber",
			label: "Mask Whatsapp Number",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskSmsNumber",
			label: "Mask SMS Number",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskRemarks",
			label: "Mask Remarks",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskOtherText1",
			label: "Mask Other Text 1",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskOtherText2",
			label: "Mask Other Text 2",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskOtherNumber1",
			label: "Mask Other Number 1",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskOtherNumber2",
			label: "Mask Other Number 2",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskOtherDate1",
			label: "Mask Other Date 1",
			type: "checkbox",
			required: true,
			defaultValue: true
		},
		{
			name: "maskOtherDate2",
			label: "Mask Other Date 2",
			type: "checkbox",
			required: true,
			defaultValue: true
		}
	]
});
