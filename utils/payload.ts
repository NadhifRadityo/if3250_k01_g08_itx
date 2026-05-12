export function getRelationshipId(value: unknown): string | null {
	if(typeof value == "string")
		return value;
	if(value != null && typeof value == "object" && "id" in value && typeof value.id == "string")
		return value.id;
	return null;
}
export function getRelationshipIds(value: unknown): string[] {
	if(!Array.isArray(value))
		return [];
	return value.map(getRelationshipId).filter((id): id is string => id != null);
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
