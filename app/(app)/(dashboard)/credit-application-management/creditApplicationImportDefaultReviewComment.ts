import type { CreditApplicationImport } from "@/payload-types";

export type CreditApplicationImportReviewComment = NonNullable<CreditApplicationImport["reviewComment"]>;

export const defaultCreditApplicationImportReviewComment: CreditApplicationImportReviewComment = {
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
