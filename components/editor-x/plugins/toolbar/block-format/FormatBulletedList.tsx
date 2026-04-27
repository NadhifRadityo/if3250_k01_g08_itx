/* eslint-disable no-restricted-syntax */

import { INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import {
	$getSelection,
	$isRangeSelection,
	$createParagraphNode
} from "lexical";

import { DropdownMenuItem } from "../../../../radix/DropdownMenu";
import { useToolbarContext } from "../../../context/ToolbarContext";
import { blockTypeToBlockName } from ".//BlockFormatData";

const BLOCK_FORMAT_VALUE = "bullet";

export function FormatBulletedList() {
	const { activeEditor, blockType } = useToolbarContext();

	const formatParagraph = () => {
		activeEditor.update(() => {
			const selection = $getSelection();
			if($isRangeSelection(selection))
				$setBlocksType(selection, () => $createParagraphNode());
		});
	};

	const formatBulletedList = () => {
		if(blockType !== "bullet")
			activeEditor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
		else
			formatParagraph();
	};

	return (
		<DropdownMenuItem onClick={formatBulletedList}>
			<div className="flex items-center gap-1 font-normal">
				{blockTypeToBlockName[BLOCK_FORMAT_VALUE].icon}
				{blockTypeToBlockName[BLOCK_FORMAT_VALUE].label}
			</div>
		</DropdownMenuItem>
	);
}
