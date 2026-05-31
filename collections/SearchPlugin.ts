import { searchPlugin } from "@payloadcms/plugin-search";
import { SearchPluginConfig } from "@payloadcms/plugin-search/types";
import { convertLexicalToPlaintext } from "@payloadcms/richtext-lexical/plaintext";
import { Field, Where, Config, executeAccess, PayloadRequest, SanitizedConfig } from "payload";

declare module "payload" {
	export interface RequestContext {
		searchPluginSyncedDocsSetMap?: Map<string, Set<string>>;
	}
}

const extractKeysAndValues = (input: any) => {
	const result = [] as string[];
	const recurse = (object: any) => {
		if(Array.isArray(object)) {
			for(const value of object)
				recurse(value);
			return;
		}
		if(typeof object == "object" && object != null) {
			for(const key in object) {
				result.push(key);
				recurse(object[key]);
			}
			return;
		}
		if(object == null)
			return;
		result.push(`${object}`);
	};
	recurse(input);
	return result;
};
export const getFlatStringFromField = (config: SanitizedConfig, fieldConfig: Field, _value: any): string[] | null => {
	if(
		_value == null ||
		("hidden" in fieldConfig && fieldConfig.hidden == true) ||
		("admin" in fieldConfig && fieldConfig.admin != null && "hidden" in fieldConfig.admin && fieldConfig.admin.hidden == true)
	)
		return null;
	if(fieldConfig.type == "text" || fieldConfig.type == "textarea" || fieldConfig.type == "select" || fieldConfig.type == "email" || fieldConfig.type == "code" || fieldConfig.type == "date") {
		const value = _value as string | string[];
		if(Array.isArray(value))
			return value.map(v => getFlatStringFromField(config, fieldConfig, v)).filter(c => c != null).flat();
		return [value];
	}
	if(fieldConfig.type == "number") {
		const value = _value as string | string[];
		if(Array.isArray(value))
			return value.map(v => getFlatStringFromField(config, fieldConfig, v)).filter(c => c != null).flat();
		return [`${value}`];
	}
	if(fieldConfig.type == "json") {
		const value = _value as string | string[];
		if(Array.isArray(value))
			return value.map(v => getFlatStringFromField(config, fieldConfig, v)).filter(c => c != null).flat();
		try { return extractKeysAndValues(JSON.parse(value)); } catch(_) { return null; }
	}
	if(fieldConfig.type == "group") {
		const value = _value;
		return fieldConfig.fields.filter((f): f is (typeof f) & { name: string } => "name" in f)
			.map(f => getFlatStringFromField(config, f, value[f.name])).filter(c => c != null).flat();
	}
	if(fieldConfig.type == "array") {
		const value = _value as any[];
		return value.map(item => fieldConfig.fields
			.filter((f): f is (typeof f) & { name: string } => "name" in f)
			.map(f => getFlatStringFromField(config, f, item[f.name])).filter(c => c != null).flat()
		).flat();
	}
	if(fieldConfig.type == "tabs") {
		const value = _value;
		return fieldConfig.tabs.filter((t): t is (typeof t) & { name: string } => "name" in t).map(t => t.fields
			.filter((f): f is (typeof f) & { name: string } => "name" in t)
			.map(f => getFlatStringFromField(config, f, value[t.name][f.name])).filter(c => c != null).flat()
		).flat();
	}
	if(fieldConfig.type == "blocks") {
		const value = _value as { id?: string, blockType: string, blockName?: string }[];
		return value.map(block => {
			const blockConfig = fieldConfig.blocks.find(bc => bc.slug == block.blockType);
			if(blockConfig == null) return null;
			return [
				`${block.blockType}:${block.id}:${block.blockName}`,
				...blockConfig.fields.filter((f): f is (typeof f) & { name: string } => "name" in f)
					.map(f => getFlatStringFromField(config, f, _value[f.name])).filter(c => c != null).flat()
			];
		}).filter(c => c != null).flat();
	}
	if(fieldConfig.type == "upload" || fieldConfig.type == "relationship") {
		type Relation = string | { relationTo: string, value: string | { id: string } };
		const value = _value as Relation | Relation[];
		if(Array.isArray(value))
			return value.map(v => getFlatStringFromField(config, fieldConfig, v)).filter(c => c != null).flat();
		const collectionSlug = typeof value == "object" ? value.relationTo : !Array.isArray(fieldConfig.relationTo) ? fieldConfig.relationTo : null;
		const collectionId = typeof value == "object" ? typeof value.value == "object" ? value.value.id : value.value : value;
		const collectionConfig = config.collections.find(c => c.slug == collectionSlug);
		if(collectionSlug == null || collectionConfig == null)
			return null;
		return [
			`${collectionSlug}:${collectionId}`,
			...collectionConfig.fields.filter((f): f is (typeof f) & { name: string } => "name" in f)
				.map(f => getFlatStringFromField(config, f, value[f.name])).filter(c => c != null).flat()
		];
	}
	if(fieldConfig.type == "richText") {
		const value = _value;
		return [convertLexicalToPlaintext({ data: value })];
	}
	return null;
};

export const SearchPlugin = (
	{ collections: enabledCollections = [], searchOverrides, flatRelation = true, ...pluginConfigs }:
	SearchPluginConfig & { flatRelation?: boolean }
) => (config: Config) => {
	// Intercept hooks to edit req.context.syncedDocsSet to allow multiple search plugins
	const overrideCollections = config?.collections?.map(collection => {
		if(!enabledCollections.includes(collection.slug)) return collection;
		const changeCurrentSyncedDocsSet = ({ req: { context } }: { req: PayloadRequest }) => {
			const collectionSlug = searchOverrides?.slug ?? "search";
			const syncedDocsSetMap = context.searchPluginSyncedDocsSetMap ??= new Map() as (typeof context["searchPluginSyncedDocsSetMap"]) & object;
			let syncedDocsSet = syncedDocsSetMap.get(collectionSlug);
			if(syncedDocsSet == null) {
				syncedDocsSet = new Set();
				syncedDocsSetMap.set(collectionSlug, syncedDocsSet);
			}
			context.syncedDocsSet = syncedDocsSet;
		};
		return {
			...collection,
			hooks: {
				...(collection.hooks ?? {}),
				afterChange: [
					...(collection.hooks?.afterChange ?? []),
					changeCurrentSyncedDocsSet
				],
				beforeDelete: [
					...(collection.hooks?.beforeDelete ?? []),
					changeCurrentSyncedDocsSet
				]
			}
		};
	});
	config = {
		...config,
		collections: overrideCollections
	};
	return searchPlugin({
		...pluginConfigs,
		collections: enabledCollections,
		searchOverrides: {
			...searchOverrides,
			fields: ({ defaultFields }) => {
				defaultFields = [
					...defaultFields,
					// Allow querying within the related doc
					...(flatRelation ? enabledCollections.map(c => ({
						name: `doc_${c}`,
						type: "relationship",
						relationTo: c,
						index: true,
						admin: {
							hidden: true,
							disableBulkEdit: true
						}
					} as Field)) : []),
					{
						name: "content",
						label: "Content",
						type: "text",
						required: true,
						index: true,
						defaultValue: "",
						access: {
							// Make field read-only, except internal API
							update: () => false
						},
						admin: {
							disableBulkEdit: true,
							readOnly: true
						}
					}
				];
				return searchOverrides?.fields?.({ defaultFields }) ?? defaultFields;
			},
			access: {
				read: async ({ req }) => ({ or:
					(await Promise.all(enabledCollections.map(async c => {
						const collectionConfig = req.payload.config.collections.find(cc => cc.slug == c);
						const accessRead = collectionConfig?.access.read;
						if(accessRead == null) return [c, req.user != null ? true : false] as const;
						return [c, await executeAccess({ req, isReadingStaticFile: false, disableErrors: true }, accessRead)] as const;
					}))).map(([c, access]) => {
						if(access == false) return null;
						if(!flatRelation) return { "doc.relationTo": c };
						if(access == true) return { [`doc_${c}`]: { exists: true } };
						const prependFields = (where: Where) => Object.fromEntries(Object.entries(where).map(([p, wf]) => {
							if(p == "and" && Array.isArray(wf))
								return [p, wf.map(w => prependFields(w))];
							if(p == "or" && Array.isArray(wf))
								return [p, wf.map(w => prependFields(w))];
							if(Array.isArray(wf))
								return [`doc_${c}.${p}`, wf.map(w => prependFields(w))];
							return [`doc_${c}.${p}`, wf];
						}));
						return prependFields(access);
					}).filter(w => w != null)
				}),
				...searchOverrides?.access
			},
			admin: {
				listSearchableFields: ["title", "content"],
				defaultColumns: ["title", "content"],
				...searchOverrides?.admin
			}
		},
		beforeSync: async options => {
			const { originalDoc, searchDoc, payload } = options;
			const collectionConfig = payload.config.collections.find(c => c.slug == searchDoc.doc.relationTo);
			if(collectionConfig == null)
				return pluginConfigs.beforeSync?.(options) ?? searchDoc;
			Object.assign(searchDoc, {
				...(flatRelation ? Object.fromEntries(enabledCollections.map(c =>
					[`doc_${c}`, c == collectionConfig.slug ? searchDoc.doc.value : null])) : {}),
				title: `${collectionConfig.slug}:${originalDoc.id}`,
				content: [
					`${collectionConfig.slug}:${originalDoc.id}`,
					...(collectionConfig.admin.listSearchableFields ?? []).map(sf => {
						let fieldConfig = collectionConfig as any as Field | null | undefined;
						let value = originalDoc;
						for(const property of sf.split(".")) {
							if(fieldConfig == null || !("fields" in fieldConfig)) {
								fieldConfig = null;
								break;
							}
							fieldConfig = fieldConfig.fields.find(f => "name" in f && f.name == property);
							value = value[property];
							if(fieldConfig == null || fieldConfig.type == "json" || fieldConfig.type == "richText")
								break;
						}
						if(fieldConfig == null)
							return null;
						return getFlatStringFromField(payload.config, fieldConfig, value);
					}).filter(c => c != null).flat()
				].join(" ")
			});
			return pluginConfigs.beforeSync?.(options) ?? searchDoc;
		}
	})(config);
};
