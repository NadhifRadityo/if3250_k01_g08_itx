/* eslint-disable no-restricted-syntax */

import { $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getSelection } from "lexical";

import { DropdownMenuItem } from "../../../../radix/DropdownMenu";
import { useToolbarContext } from "../../../context/ToolbarContext";
import { blockTypeToBlockName } from ".//BlockFormatData";

const BLOCK_FORMAT_VALUE = "quote";

export function FormatQuote() {
	const { activeEditor, blockType } = useToolbarContext();

	const formatQuote = () => {
		if(blockType !== "quote") {
			activeEditor.update(() => {
				const selection = $getSelection();
				$setBlocksType(selection, () => $createQuoteNode());
			});
		}
	};

	return (
		<DropdownMenuItem onClick={formatQuote}>
			<div className="flex items-center gap-1 font-normal">
				{blockTypeToBlockName[BLOCK_FORMAT_VALUE].icon}
				{blockTypeToBlockName[BLOCK_FORMAT_VALUE].label}
			</div>
		</DropdownMenuItem>
	);
}
