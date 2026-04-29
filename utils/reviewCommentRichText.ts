import type { Role } from "@/payload-types";

export type ReviewCommentRichText = NonNullable<Role["reviewComment"]>;

export function createEmptyReviewComment(): ReviewCommentRichText {
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

export function createPlainTextRichText(value: string | null | undefined): ReviewCommentRichText {
	const text = (value ?? "").trim();
	if(text.length == 0)
		return createEmptyReviewComment();

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
					children: [
						{
							type: "text",
							version: 1,
							text,
							format: 0,
							detail: 0,
							mode: "normal",
							style: ""
						}
					]
				}
			]
		}
	};
}

export function serializeReviewComment(value: ReviewCommentRichText): string {
	return JSON.stringify(value);
}
