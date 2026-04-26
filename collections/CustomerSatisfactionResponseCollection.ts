import { CollectionConfig } from "payload";

export const CustomerSatisfactionResponses = (): CollectionConfig => ({
	slug: "csat-responses",
	labels: {
		singular: "CSAT Response",
		plural: "CSAT Responses"
	},
	trash: true,
	timestamps: true,
	versions: {
		maxPerDoc: 0,
		drafts: false
	},
	admin: {
		useAsTitle: "assignment",
		defaultColumns: ["assignment", "submittedAt", "customerName", "scoreAverage"]
	},
	hooks: {
		beforeChange: [
			({ data, operation }) => {
				if(operation == "create" && data.submittedAt == null)
					return { submittedAt: new Date(), ...data };
				return data;
			}
		]
	},
	fields: [
		{
			name: "assignment",
			label: "Assignment",
			type: "relationship",
			relationTo: "credit-application-assignments",
			required: true,
			unique: true,
			index: true
		},
		{
			name: "customerName",
			label: "Customer Name",
			type: "text"
		},
		{
			name: "customerPhone",
			label: "Customer Phone",
			type: "text",
			index: true
		},
		{
			name: "submittedAt",
			label: "Submitted At",
			type: "date",
			required: true,
			index: true,
			defaultValue: () => new Date()
		},
		{
			name: "responses",
			label: "Responses",
			type: "array",
			required: true,
			minRows: 1,
			fields: [
				{
					name: "csatQuestion",
					label: "CSAT Question",
					type: "relationship",
					relationTo: "satisfaction-surveys",
					required: true
				},
				{
					name: "inputType",
					label: "Input Type",
					type: "select",
					required: true,
					options: [
						{ label: "Free Text", value: "free_text" },
						{ label: "Option", value: "option" }
					]
				},
				{
					name: "answerText",
					label: "Answer Text",
					type: "text"
				},
				{
					name: "answerOptionValue",
					label: "Answer Option Value",
					type: "number",
					min: 1,
					max: 5
				}
			]
		},
		{
			name: "scoreAverage",
			label: "Score Average",
			type: "number",
			min: 1,
			max: 5
		}
	]
});
