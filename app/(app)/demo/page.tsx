"use client";

import { useState } from "react";

import {
	createEmptyReviewComment,
	type ReviewCommentRichText
} from "@/utils/reviewCommentRichText";
import ReviewCommentInput from "@/components/ReviewCommentInput";

export default function EditorXDemoPage() {
	const [value, setValue] = useState<ReviewCommentRichText>(
		createEmptyReviewComment()
	);

	return (
		<div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Editor-X Richtext Demo
				</h1>
				<p className="text-sm text-muted-foreground">
					Try these features: image upload, emoji picker with <code>:</code>,
					emoji keyboard shortcuts like <code>:)</code>, mentions with <code>@</code>,
					and autocomplete via <code>Tab</code>.
				</p>
			</div>

			<ReviewCommentInput
				value={value}
				onChange={setValue}
				placeholder="Type a comment here. Use @ for mentions and : for emojis."
				autoFocus={true}
			/>

			<div className="rounded-lg border bg-muted/40 p-4">
				<div className="mb-2 text-sm font-medium">Serialized Output</div>
				<pre className="max-h-80 overflow-auto rounded bg-background p-3 text-xs">
					{JSON.stringify(value, null, 2)}
				</pre>
			</div>
		</div>
	);
}
