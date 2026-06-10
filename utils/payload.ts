import { Where } from "payload";

export function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}

export const buildFilterWhere = (filters: { columnKey: string, operator: string, combinator: "and" | "or", value: any }[]) => ({ or:
	filters.map(filter => ([{ [filter.columnKey]: { [filter.operator]: filter.value } }, filter.combinator ?? "and"] as const))
		.reduce((termGroups, [unit, combinator], i) => i == 0 || combinator == "and" ?
			[...termGroups.slice(0, -1), [...termGroups.at(-1)!, unit]] :
			[...termGroups, [unit]], [[]] as Where[][])
		.filter(termGroups => termGroups.length > 0)
		.map(termGroups => ({ and: termGroups }))
});

const negateOperatorMap: Record<string, string> = {
	equals: "not_equals",
	not_equals: "equals",
	in: "not_in",
	not_in: "in",
	greater_than: "less_than_equal",
	greater_than_equal: "less_than",
	less_than: "greater_than_equal",
	less_than_equal: "greater_than",
	like: "not_like",
	not_like: "like",
	contains: "not_contains",
	not_contains: "contains"
};
export function negateWhere(where: Where): Where {
	if("and" in where && where.and != null)
		return { or: where.and.map(w => negateWhere(w)) };
	if("or" in where && where.or != null)
		return { and: where.or.map(w => negateWhere(w)) };
	const result = {} as Where;
	for(const [field, condition] of Object.entries(where)) {
		const negatedCondition = result[field] = {} as Record<string, any>;
		for(const [operator, value] of Object.entries(condition)) {
			if(operator == "exists") {
				negatedCondition.exists = !(value as boolean);
				continue;
			}
			const negated = negateOperatorMap[operator];
			if(negated == null)
				throw new Error(`Unsupported operator: ${operator}`);
			negatedCondition[negated] = value;
		}
	}
	return result;
}

export function leixcalPreprendPlainText(state: any, value: string) {
	value = value.trim();
	state = structuredClone(state);
	if(value.length == 0)
		return state;
	const paragraphNode = {
		type: "paragraph",
		version: 1,
		direction: null,
		format: "",
		indent: 0,
		children: [
			{
				type: "text",
				version: 1,
				text: value,
				detail: 0,
				format: 0,
				mode: "normal",
				style: ""
			}
		]
	};
	state.root.children.unshift(paragraphNode);
	return state;
}
export function lexicalPlainText(value: string): any {
	value = value.trim();
	return {
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
					direction: null,
					children: value.length > 0 ?
						[{
							type: "text",
							version: 1,
							text: value,
							format: 0,
							detail: 0,
							mode: "normal",
							style: ""
						}] :
						[]
				}
			]
		}
	};
}
