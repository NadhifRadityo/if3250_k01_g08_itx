import { lexicalEditor, UploadFeature } from "@payloadcms/richtext-lexical";
import { Field, CollectionSlug, CollectionConfig } from "payload";

import { MultiLineFeature, AllFormatsFeature, ReviewRichTextEditor } from "./shared";

export const genericMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "show", label: "Show" }
];
export const nameMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showFirstNameOnly", label: "Show First Name Only" },
	{ value: "showMiddleNameOnly", label: "Show Middle Name Only" },
	{ value: "showLastNameOnly", label: "Show Last Name Only" },
	{ value: "showFirstNameAndLastNameOnly", label: "Show First Name and Last Name Only" },
	{ value: "showFirstNameAndMiddleNameOnly", label: "Show First Name and Middle Name Only" },
	{ value: "showMiddleNameAndLastNameOnly", label: "Show Middle Name and Last Name Only" },
	{ value: "show1CharacterFirstName", label: "Show 1 Character of First Name" },
	{ value: "show2CharactersFirstName", label: "Show 2 Characters of First Name" },
	{ value: "show3CharactersFirstName", label: "Show 3 Characters of First Name" },
	{ value: "show1CharacterMiddleName", label: "Show 1 Character of Middle Name" },
	{ value: "show2CharactersMiddleName", label: "Show 2 Characters of Middle Name" },
	{ value: "show3CharactersMiddleName", label: "Show 3 Characters of Middle Name" },
	{ value: "show1CharacterLastName", label: "Show 1 Character of Last Name" },
	{ value: "show2CharactersLastName", label: "Show 2 Characters of Last Name" },
	{ value: "show3CharactersLastName", label: "Show 3 Characters of Last Name" },
	{ value: "showFirstNameAnd1CharacterLastName", label: "Show First Name and 1 Character of Last Name" },
	{ value: "showFirstNameAnd2CharactersLastName", label: "Show First Name and 2 Characters of Last Name" },
	{ value: "showFirstNameAnd3CharactersLastName", label: "Show First Name and 3 Characters of Last Name" },
	{ value: "show1CharacterFirstNameAndLastName", label: "Show 1 Character of First Name and Last Name" },
	{ value: "show2CharactersFirstNameAndLastName", label: "Show 2 Characters of First Name and Last Name" },
	{ value: "show3CharactersFirstNameAndLastName", label: "Show 3 Characters of First Name and Last Name" },
	{ value: "show", label: "Show" }
];
export const emailMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showUsernameOnly", label: "Show Username Only" },
	{ value: "showDomainOnly", label: "Show Domain Only" },
	{ value: "show1CharacterUsername", label: "Show 1 Character of Username" },
	{ value: "show2CharactersUsername", label: "Show 2 Characters of Username" },
	{ value: "show3CharactersUsername", label: "Show 3 Characters of Username" },
	{ value: "showLast1CharacterUsername", label: "Show Last 1 Character of Username" },
	{ value: "showLast2CharactersUsername", label: "Show Last 2 Characters of Username" },
	{ value: "showLast3CharactersUsername", label: "Show Last 3 Characters of Username" },
	{ value: "show1CharacterDomain", label: "Show 1 Character of Domain" },
	{ value: "show2CharactersDomain", label: "Show 2 Characters of Domain" },
	{ value: "show3CharactersDomain", label: "Show 3 Characters of Domain" },
	{ value: "showLast1CharacterDomain", label: "Show Last 1 Character of Domain" },
	{ value: "showLast2CharactersDomain", label: "Show Last 2 Characters of Domain" },
	{ value: "showLast3CharactersDomain", label: "Show Last 3 Characters of Domain" },
	{ value: "show1CharacterUsernameAndDomain", label: "Show 1 Character of Username and Domain" },
	{ value: "show2CharactersUsernameAndDomain", label: "Show 2 Characters of Username and Domain" },
	{ value: "show3CharactersUsernameAndDomain", label: "Show 3 Characters of Username and Domain" },
	{ value: "show", label: "Show" }
];
export const textMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showFirst1Character", label: "Show First 1 Character" },
	{ value: "showFirst2Characters", label: "Show First 2 Characters" },
	{ value: "showFirst3Characters", label: "Show First 3 Characters" },
	{ value: "showFirst5Characters", label: "Show First 5 Characters" },
	{ value: "showFirst10Characters", label: "Show First 10 Characters" },
	{ value: "showLast1Character", label: "Show Last 1 Character" },
	{ value: "showLast2Characters", label: "Show Last 2 Characters" },
	{ value: "showLast3Characters", label: "Show Last 3 Characters" },
	{ value: "showLast5Characters", label: "Show Last 5 Characters" },
	{ value: "showLast10Characters", label: "Show Last 10 Characters" },
	{ value: "showFirst1CharacterAndLast1Character", label: "Show First 1 Character and Last 1 Character" },
	{ value: "showFirst2CharactersAndLast2Characters", label: "Show First 2 Characters and Last 2 Characters" },
	{ value: "showFirst3CharactersAndLast3Characters", label: "Show First 3 Characters and Last 3 Characters" },
	{ value: "showFirst5CharactersAndLast5Characters", label: "Show First 5 Characters and Last 5 Characters" },
	{ value: "showFirst10CharactersAndLast10Characters", label: "Show First 10 Characters and Last 10 Characters" },
	{ value: "showFirstWordOnly", label: "Show First Word Only" },
	{ value: "showLastWordOnly", label: "Show Last Word Only" },
	{ value: "showFirst2Words", label: "Show First 2 Words" },
	{ value: "showLast2Words", label: "Show Last 2 Words" },
	{ value: "showFirst3Words", label: "Show First 3 Words" },
	{ value: "showLast3Words", label: "Show Last 3 Words" },
	{ value: "showFirst5Words", label: "Show First 5 Words" },
	{ value: "showLast5Words", label: "Show Last 5 Words" },
	{ value: "showFirst10Words", label: "Show First 10 Words" },
	{ value: "showLast10Words", label: "Show Last 10 Words" },
	{ value: "showCharacterCountOnly", label: "Show Character Count Only" },
	{ value: "showWordCountOnly", label: "Show Word Count Only" },
	{ value: "showFirstSentenceOnly", label: "Show First Sentence Only" },
	{ value: "showLastSentenceOnly", label: "Show Last Sentence Only" },
	{ value: "show", label: "Show" }
];
export const numberMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showFirst1Digit", label: "Show First 1 Digit" },
	{ value: "showFirst2Digits", label: "Show First 2 Digits" },
	{ value: "showFirst3Digits", label: "Show First 3 Digits" },
	{ value: "showLast1Digit", label: "Show Last 1 Digit" },
	{ value: "showLast2Digits", label: "Show Last 2 Digits" },
	{ value: "showLast3Digits", label: "Show Last 3 Digits" },
	{ value: "showRoundedTens", label: "Show Rounded Tens" },
	{ value: "showRoundedHundreds", label: "Show Rounded Hundreds" },
	{ value: "showRoundedThousands", label: "Show Rounded Thousands" },
	{ value: "showDigitCountOnly", label: "Show Digit Count Only" },
	{ value: "show", label: "Show" }
];
export const phoneNumberMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showFirst3Digits", label: "Show First 3 Digits" },
	{ value: "showFirst4Digits", label: "Show First 4 Digits" },
	{ value: "showFirst5Digits", label: "Show First 5 Digits" },
	{ value: "showLast3Digits", label: "Show Last 3 Digits" },
	{ value: "showLast4Digits", label: "Show Last 4 Digits" },
	{ value: "showLast5Digits", label: "Show Last 5 Digits" },
	{ value: "showCountryCodeOnly", label: "Show Country Code Only" },
	{ value: "showCountryCodeAndLast3Digits", label: "Show Country Code and Last 3 Digits" },
	{ value: "showCountryCodeAndLast4Digits", label: "Show Country Code and Last 4 Digits" },
	{ value: "showCountryCodeAndFirst3Digits", label: "Show Country Code and First 3 Digits" },
	{ value: "showCountryCodeAndFirst4Digits", label: "Show Country Code and First 4 Digits" },
	{ value: "show", label: "Show" }
];
export const dateMaskOptions = [
	{ value: "hide", label: "Hide" },
	{ value: "showYearOnly", label: "Show Year Only" },
	{ value: "showMonthOnly", label: "Show Month Only" },
	{ value: "showDayOnly", label: "Show Day Only" },
	{ value: "showMonthAndYear", label: "Show Month and Year" },
	{ value: "showDayAndMonth", label: "Show Day and Month" },
	{ value: "showQuarterOnly", label: "Show Quarter Only" },
	{ value: "showWeekOnly", label: "Show Week Only" },
	{ value: "showAgeOnly", label: "Show Age Only" },
	{ value: "showYearsOnly", label: "Show Years Only" },
	{ value: "show", label: "Show" }
];

const AccessRichTextEditor = () => lexicalEditor({
	features: [
		...AllFormatsFeature(),
		...MultiLineFeature(),
		UploadFeature({
			enabledCollections: ["generic-richtext-uploads"]
		})
	]
});

export const Accesses = (
	{ collection, defaultMaskId }:
	{ collection: CollectionSlug, defaultMaskId: string }
): CollectionConfig => ({
	slug: `${collection}-accesses`,
	labels: {
		singular: `${collection} Access`,
		plural: `${collection} Accesses`
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
		listSearchableFields: ["name", "description", "reviewComment"],
		defaultColumns: ["name", "description"]
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
			name: "name",
			label: "Name",
			type: "text",
			required: true
		},
		{
			name: "description",
			label: "Description",
			type: "richText",
			editor: AccessRichTextEditor()
		},
		{
			name: "subjectUsers",
			label: "Subject Users",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "subjectTeams",
			label: "Subject Teams",
			type: "relationship",
			relationTo: "teams",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "subjectRoles",
			label: "Subject Roles",
			type: "relationship",
			relationTo: "roles",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "subjectLevels",
			label: "Subject Levels",
			type: "select",
			options: [
				{ value: "admin", label: "Admin" },
				{ value: "manager", label: "Manager" },
				{ value: "supervisor", label: "Supervisor" },
				{ value: "officer", label: "Officer" }
			],
			required: true,
			hasMany: true,
			defaultValue: []
		},
		{
			name: "defaultShowAll",
			label: "Default Show All",
			type: "checkbox",
			required: true,
			defaultValue: false
		},
		{
			name: "forceShow",
			label: "Force Show",
			type: "relationship",
			relationTo: collection,
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "forceHide",
			label: "Force Hide",
			type: "relationship",
			relationTo: collection,
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "mask",
			label: "Mask",
			type: "relationship",
			relationTo: `${collection}-access-masks` as any,
			required: true,
			defaultValue: defaultMaskId
		},
		{
			name: "showIfCreatedByUsers",
			label: "Show If Created By Users",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "hideIfCreatedByUsers",
			label: "Hide If Created By Users",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "showIfUpdatedByUsers",
			label: "Show If Updated By Users",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "hideIfUpdatedByUsers",
			label: "Hide If Updated By Users",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "showIfDeletedByUsers",
			label: "Show If Deleted By Users",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "hideIfDeletedByUsers",
			label: "Hide If Deleted By Users",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "showIfReviewedByUsers",
			label: "Show If Reviewed By Users",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "hideIfReviewedByUsers",
			label: "Hide If Reviewed By Users",
			type: "relationship",
			relationTo: "users",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "showIfCreatedByRoles",
			label: "Show If Created By Roles",
			type: "relationship",
			relationTo: "roles",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "hideIfCreatedByRoles",
			label: "Hide If Created By Roles",
			type: "relationship",
			relationTo: "roles",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "showIfUpdatedByRoles",
			label: "Show If Updated By Roles",
			type: "relationship",
			relationTo: "roles",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "hideIfUpdatedByRoles",
			label: "Hide If Updated By Roles",
			type: "relationship",
			relationTo: "roles",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "showIfDeletedByRoles",
			label: "Show If Deleted By Roles",
			type: "relationship",
			relationTo: "roles",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "hideIfDeletedByRoles",
			label: "Hide If Deleted By Roles",
			type: "relationship",
			relationTo: "roles",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "showIfReviewedByRoles",
			label: "Show If Reviewed By Roles",
			type: "relationship",
			relationTo: "roles",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
		},
		{
			name: "hideIfReviewedByRoles",
			label: "Hide If Reviewed By Roles",
			type: "relationship",
			relationTo: "roles",
			required: true,
			hasMany: true,
			minRows: 0,
			defaultValue: []
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

export const AccessMasks = (
	{ collection, fields }:
	{ collection: CollectionSlug, fields: Field[] }
): CollectionConfig => ({
	slug: `${collection}-access-masks`,
	labels: {
		singular: `${collection} Access Mask`,
		plural: `${collection} Access Masks`
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
	}, admin: {
		useAsTitle: "name",
		listSearchableFields: ["name", "description", "reviewComment"],
		defaultColumns: ["name", "description"]
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
			name: "name",
			label: "Name",
			type: "text",
			required: true
		},
		{
			name: "description",
			label: "Description",
			type: "richText",
			editor: AccessRichTextEditor()
		},
		...fields,
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
