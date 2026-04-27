import { $setBlocksType } from "@lexical/selection";
import {
	$getSelection,
	$isRangeSelection,
	$createParagraphNode
} from "lexical";

import { DropdownMenuItem } from "../../../../radix/DropdownMenu";
import { useToolbarContext } from "../../../context/ToolbarContext";
import { blockTypeToBlockName } from ".//BlockFormatData";

const BLOCK_FORMAT_VALUE = "paragraph";

export function FormatParagraph() {
	const { activeEditor } = useToolbarContext();

	const formatParagraph = () => {
		activeEditor.update(() => {
			const selection = $getSelection();
			if($isRangeSelection(selection))
				$setBlocksType(selection, () => $createParagraphNode());
		});
	};

	return (
		<DropdownMenuItem onClick={formatParagraph}>
			<div className="flex items-center gap-1 font-normal">
				{blockTypeToBlockName[BLOCK_FORMAT_VALUE].icon}
				{blockTypeToBlockName[BLOCK_FORMAT_VALUE].label}
			</div>
		</DropdownMenuItem>
	);
}
