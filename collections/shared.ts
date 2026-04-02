import "payload";
import { BoldFeature, LinkFeature, validateUrl, ItalicFeature, ChecklistFeature, ParagraphFeature, SubscriptFeature, UnderlineFeature, InlineCodeFeature, OrderedListFeature, SuperscriptFeature, InlineToolbarFeature, StrikethroughFeature, UnorderedListFeature } from "@payloadcms/richtext-lexical";
import { Field, Option, Payload, CollectionSlug, PayloadRequest } from "payload";

export { validate as isUuidValid } from "uuid";

export const effectiveDoc = (doc?: any, data?: any) => Object.assign({}, doc, data);
export const shouldRevalidateDoc = (doc: { _status: "draft" | "published" }, previousDoc: { _status: "draft" | "published" }) =>
	doc._status == "published" || previousDoc._status == "published";
export const getRequestTransaction = async ({ payload, transactionID }: { payload: Payload, transactionID?: PayloadRequest["transactionID"] }) => {
	const awaitedTransactionId = await transactionID;
	if(awaitedTransactionId == null) return null;
	return payload.db.sessions![awaitedTransactionId].db as Parameters<typeof payload.db.execute>[0]["db"];
};

export const defaultLinkableCollections: CollectionSlug[] = [];
export const defaultLinkFields = (
	{ enabledCollections, maxDepth }:
	{ enabledCollections?: CollectionSlug[], maxDepth?: number }
) => {
	return [
		{
			name: "linkType",
			label: "Link Type",
			type: "radio",
			required: true,
			defaultValue: "custom",
			options: [
				{ value: "custom", label: "Custom" },
				...(enabledCollections != null && enabledCollections.length > 0 ? [
					{ value: "internal", label: "Internal Link" }
				] as Option[] : [])
			],
			enumName: "default_link_fields_link_type"
		},
		{
			name: "url",
			label: "Enter a URL",
			type: "text",
			required: true,
			...(enabledCollections != null && enabledCollections.length > 0 ? {
				admin: {
					condition: (_, siblingData) => {
						return siblingData.linkType != "internal";
					}
				}
			} : {}),
			validate: (value, options) => {
				if(options?.siblingData?.linkType == "internal")
					return true;
				if(!validateUrl(value))
					return "Invalid URL";
				return true;
			},
			hooks: {
				beforeChange: [
					({ value }) => {
						if(typeof value != "string" || value.length == 0)
							return;
						return new URL(value).href;
					}
				]
			}
		},
		...(enabledCollections != null && enabledCollections.length > 0 ? [
			{
				name: "doc",
				label: "Choose a document to link to",
				type: "relationship",
				required: true,
				relationTo: enabledCollections,
				maxDepth: maxDepth,
				admin: {
					condition: (_, siblingData) => {
						return siblingData.linkType == "internal";
					}
				},
				filterOptions: async ({ relationTo, req, user }) => {
					const config = req.payload.config;
					const admin = config.collections.find(({ slug }) => slug == relationTo)?.admin;
					const hidden = admin?.hidden;
					if(typeof hidden == "boolean" && hidden)
						return false;
					if(typeof hidden == "function" && hidden({ user: user as any }))
						return false;
					const baseFilter = admin?.baseFilter;
					return (await baseFilter?.({ limit: 0, page: 1, req, sort: "id" })) ?? true;
				}
			}
		] as Field[] : []),
		{
			name: "newTab",
			label: "Open in new tab",
			type: "checkbox"
		}
	] as Field[];
};

export const AllFormatsFeature = () => [
	BoldFeature(),
	ItalicFeature(),
	UnderlineFeature(),
	StrikethroughFeature(),
	SubscriptFeature(),
	SuperscriptFeature(),
	InlineCodeFeature(),
	InlineToolbarFeature()
];
export const MultiLineFeature = () => [
	ParagraphFeature(),
	ChecklistFeature(),
	OrderedListFeature(),
	UnorderedListFeature()
];
export const LinkableFeature = ({
	enabledCollections = defaultLinkableCollections
}: {
	enabledCollections?: CollectionSlug[];
} = {}) => [
	LinkFeature({
		enabledCollections
	})
];

export const defaultEmptyRichText = Object.freeze({
	root: {
		type: "root",
		version: 1,
		format: "",
		indent: 0,
		direction: null,
		children: [
			{
				type: "paragraph",
				version: 1,
				format: "",
				indent: 0,
				children: []
			}
		]
	}
});
