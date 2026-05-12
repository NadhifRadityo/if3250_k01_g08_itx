import { SerializedEditorState } from "lexical";

export function createEmptyReviewComment(): SerializedEditorState {
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
					children: []
				}
			]
		}
	};
}
