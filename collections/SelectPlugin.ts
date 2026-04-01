import { Config, SelectMode, SelectType, FlattenedField, PayloadRequest, deepMergeSimple, CollectionCustom, flattenAllFields, SelectExcludeType, SelectIncludeType, CollectionBeforeOperationHook } from "payload";
import { getSelectMode } from "payload/shared";

declare module "payload" {
	export interface RequestContext {
		internalForceSelectDeleteMap?: WeakMap<PayloadRequest, string[]>;
	}
	export interface GlobalCustom {
		internalForceSelect?: SelectIncludeType;
		bindSelect?: Record<string, Record<string, SelectIncludeType | true>>;
	}
	export interface CollectionCustom {
		internalForceSelect?: SelectIncludeType;
		bindSelect?: Record<string, Record<string, SelectIncludeType | true>>;
	}
}

export const InternalForceSelectPlugin = () => {
	return (config: Config) => {
		type FlattenedFieldInner = Extract<FlattenedField, { flattenedFields: any }>;
		const mergeSelectsAndOverridenPaths = (flattenedFields: FlattenedField[], select1: SelectIncludeType, select2: SelectIncludeType) =>
			[...new Set([...Object.keys(select1), ...Object.keys(select2)])].map<[string, true | SelectIncludeType, string[]]>(k =>
				select1[k] == null || JSON.stringify(select1[k]) == JSON.stringify(select2[k]) ? [k, select2[k], []] :
					select1[k] == true ? [k, true, select2[k] == null ? [k] : [...new Set((flattenedFields.find(f => f.name == k)! as FlattenedFieldInner)
						.flattenedFields.map(f => f.name)).difference(new Set(Object.keys(select2[k])))]] :
						select2[k] == true ? [k, true, []] : (([s, ps]) => [k, s, ps.map(p => `${k}.${p}`)])(mergeSelectsAndOverridenPaths(
							(flattenedFields.find(f => f.name == k)! as FlattenedFieldInner).flattenedFields, select1[k], select2[k])))
				.reduce<[SelectIncludeType, string[]]>(([s, ps1], [k, v, ps2]) => [{ ...s, [k]: v }, [...ps1, ...ps2]], [{}, []]);
		const findOverridenPaths = (select: SelectType | null, selectMode: SelectMode, targetPaths: string[]) =>
			selectMode == "include" ? targetPaths.filter(p => p.split(".").reduce((c, k) => c?.[k], select) != true) :
				targetPaths.filter(p => p.split(".").reduce((c, k) => c?.[k], select) == false);
		type OperationArgs = Parameters<CollectionBeforeOperationHook>[0]["args"];
		const trackSelection = (
			{ args, req, req: { context }, internalForceSelectPaths }:
			{ args: OperationArgs, req: PayloadRequest, internalForceSelectPaths: string[] }
		) => {
			const internalForceSelectDeleteMap = context.internalForceSelectDeleteMap ??= new WeakMap();
			const select = "select" in args ? args.select ?? null : null;
			const selectMode = select != null ? getSelectMode(select) : "exclude";
			const toDelete = findOverridenPaths(select, selectMode, internalForceSelectPaths);
			internalForceSelectDeleteMap.set(req, toDelete);
		};
		const deleteTrackedSelection = ({ doc, req, req: { context } }: { doc: any, req: PayloadRequest }) => {
			const toDelete = context.internalForceSelectDeleteMap?.get(req);
			if(toDelete == null) return;
			for(const fieldName of toDelete)
				delete doc[fieldName];
		};
		if(config.globals != null) {
			for(const global of config.globals) {
				if(global.custom?.internalForceSelect == null)
					continue;
				const [forceSelect, internalForceSelectPaths] = mergeSelectsAndOverridenPaths(
					flattenAllFields(global),
					global.custom.internalForceSelect,
					global.forceSelect ?? {}
				);
				global.forceSelect = forceSelect;
				global.hooks = {
					...global.hooks,
					beforeOperation: [
						({ args, req }) => trackSelection({ args, req, internalForceSelectPaths: [...internalForceSelectPaths] }),
						...(global.hooks?.beforeOperation ?? [])
					],
					beforeRead: [
						({ doc, req }) => deleteTrackedSelection({ doc, req })
					]
				};
			}
		}
		if(config.collections != null) {
			for(const collection of config.collections) {
				if(collection.custom?.internalForceSelect == null)
					continue;
				const [forceSelect, internalForceSelectPaths] = mergeSelectsAndOverridenPaths(
					flattenAllFields(collection),
					collection.custom.internalForceSelect,
					collection.forceSelect ?? {}
				);
				collection.forceSelect = forceSelect;
				collection.hooks = {
					...collection.hooks,
					beforeOperation: [
						({ args, req }) => trackSelection({ args, req, internalForceSelectPaths: [...internalForceSelectPaths] }),
						...(collection.hooks?.beforeOperation ?? [])
					],
					beforeRead: [
						({ doc, req }) => deleteTrackedSelection({ doc, req })
					]
				};
			}
		}
		return config;
	};
};

export const BindSelectPlugin = () => {
	return (config: Config) => {
		type FlattenedFieldInner = Extract<FlattenedField, { flattenedFields: any }>;
		const createExcludeSelection = (flattenedFields: FlattenedField[], against: SelectIncludeType) =>
			Object.fromEntries(flattenedFields.map(f => f.name).map<[string, SelectExcludeType]>(k => against[k] == true ? null : against[k] == null ? [k, false] :
				[k, createExcludeSelection((flattenedFields.find(f2 => f2.name == k)! as FlattenedFieldInner).flattenedFields, against[k])])
				.filter(e => e != null));
		const deleteExcludeSelection = (flattenedFields: FlattenedField[], select: SelectExcludeType, against: SelectIncludeType) =>
			Object.fromEntries(Object.keys(select).map<[string, SelectExcludeType] | null>(k =>
				against[k] == true ? null : against[k] == null ? [k, select[k]] :
					select[k] == false ? [k, createExcludeSelection((flattenedFields.find(f => f.name == k)! as FlattenedFieldInner).flattenedFields, against[k])] :
						[k, deleteExcludeSelection((flattenedFields.find(f => f.name == k)! as FlattenedFieldInner).flattenedFields, select[k], against[k])])
				.filter(e => e != null));
		type OperationArgs = Parameters<CollectionBeforeOperationHook>[0]["args"];
		const bindSelection = (
			{ args, bindSelect, flattenedFields }:
			{ args: OperationArgs, bindSelect: NonNullable<CollectionCustom["bindSelect"]>, flattenedFields: FlattenedField[] }
		) => {
			const select = "select" in args ? args.select : null;
			if(select == null) return;
			const selectMode = getSelectMode(select);
			if(selectMode == "include") {
				let previousSelect = JSON.stringify((args as any).select);
				let toSelects = Object.entries(bindSelect).filter(([p]) => p.split(".").reduce((c, k) => c?.[k], select) == true).map(([_, s]) => s);
				while(true) {
					for(const toSelect of toSelects)
						(args as any).select = deepMergeSimple((args as any).select, toSelect);
					const currentSelect = JSON.stringify((args as any).select);
					if(previousSelect == currentSelect) break;
					previousSelect = currentSelect;
					toSelects = Object.entries(bindSelect).filter(([p]) => p.split(".").reduce((c, k) => c?.[k], select) == true).map(([_, s]) => s);
				}
			} else {
				let previousSelect = JSON.stringify((args as any).select);
				let toSelects = Object.entries(bindSelect).filter(([p]) => p.split(".").reduce((c, k) => c?.[k], select) == false).map(([_, s]) => s);
				while(true) {
					for(const toSelect of toSelects)
						(args as any).select = deleteExcludeSelection(flattenedFields, (args as any).select, toSelect);
					const currentSelect = JSON.stringify((args as any).select);
					if(previousSelect == currentSelect) break;
					previousSelect = currentSelect;
					toSelects = Object.entries(bindSelect).filter(([p]) => p.split(".").reduce((c, k) => c?.[k], select) == false).map(([_, s]) => s);
				}
			}
		};
		if(config.globals != null) {
			for(const global of config.globals) {
				if(global.custom?.bindSelect == null)
					continue;
				const bindSelect = global.custom.bindSelect;
				const flattenedFields = flattenAllFields(global);
				global.hooks = {
					...global.hooks,
					beforeOperation: [
						({ args }) => bindSelection({ args, bindSelect, flattenedFields }),
						...(global.hooks?.beforeOperation ?? [])
					]
				};
			}
		}
		if(config.collections != null) {
			for(const collection of config.collections) {
				if(collection.custom?.bindSelect == null)
					continue;
				const bindSelect = collection.custom.bindSelect;
				const flattenedFields = flattenAllFields(collection);
				collection.hooks = {
					...collection.hooks,
					beforeOperation: [
						({ args }) => bindSelection({ args, bindSelect, flattenedFields }),
						...(collection.hooks?.beforeOperation ?? [])
					]
				};
			}
		}
		return config;
	};
};
