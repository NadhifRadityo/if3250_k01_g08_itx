import type { JSX } from "react";
import { ContentEditable as LexicalContentEditable } from "@lexical/react/LexicalContentEditable";

import cn from "@/utils/cn";

type Props = {
	placeholder: string;
	className?: string;
	placeholderClassName?: string;
};

export function ContentEditable({
	placeholder,
	className,
	placeholderClassName
}: Props): JSX.Element {
	return (
		<LexicalContentEditable
			className={cn("ContentEditable__root relative block min-h-72 overflow-auto px-4 py-2 focus:outline-none", className)}
			aria-placeholder={placeholder}
			placeholder={(
				<div
					className={cn("text-muted-foreground pointer-events-none absolute top-0 left-0 overflow-hidden px-4 py-2 text-ellipsis select-none", placeholderClassName)}
				>
					{placeholder}
				</div>
			)}
		/>
	);
}
