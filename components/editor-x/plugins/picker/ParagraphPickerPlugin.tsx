import { $setBlocksType } from "@lexical/selection";
import {
	$getSelection,
	$isRangeSelection,
	$createParagraphNode
} from "lexical";
import { TextIcon } from "lucide-react";

import { ComponentPickerOption } from ".//ComponentPickerOption";

export function ParagraphPickerPlugin() {
	return new ComponentPickerOption("Paragraph", {
		icon: <TextIcon className="size-4" />,
		keywords: ["normal", "paragraph", "p", "text"],
		onSelect: (_, editor) =>
			editor.update(() => {
				const selection = $getSelection();
				if($isRangeSelection(selection))
					$setBlocksType(selection, () => $createParagraphNode());
			})
	});
}
