/* eslint-disable no-restricted-syntax */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { ListNode, $isListNode } from "@lexical/list";
import { $isHeadingNode } from "@lexical/rich-text";
import { $findMatchingParent, $getNearestNodeOfType } from "@lexical/utils";
import {
	$isRangeSelection,
	$isRootOrShadowRoot,
	type BaseSelection
} from "lexical";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "../../../radix/Button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger
} from "../../../radix/DropdownMenu";
import { useToolbarContext } from "../../context/ToolbarContext";
import { useUpdateToolbarHandler } from "../../editor-hooks/UseUpdateToolbar";
import { blockTypeToBlockName } from "./block-format/BlockFormatData";

export function BlockFormatDropDown({
	children
}: {
	children: React.ReactNode;
}) {
	const { activeEditor, blockType, setBlockType } = useToolbarContext();

	function $updateToolbar(selection: BaseSelection) {
		if($isRangeSelection(selection)) {
			const anchorNode = selection.anchor.getNode();
			let element =
				anchorNode.getKey() === "root" ?
					anchorNode :
					$findMatchingParent(anchorNode, e => {
						const parent = e.getParent();
						return parent !== null && $isRootOrShadowRoot(parent);
					});

			if(element === null)
				element = anchorNode.getTopLevelElementOrThrow();

			const elementKey = element.getKey();
			const elementDOM = activeEditor.getElementByKey(elementKey);

			if(elementDOM !== null) {
				if($isListNode(element)) {
					const parentList = $getNearestNodeOfType<ListNode>(
						anchorNode,
						ListNode
					);
					const type = parentList ?
						parentList.getListType() :
						element.getListType();
					setBlockType(type);
				} else {
					const type = $isHeadingNode(element) ?
						element.getTag() :
						element.getType();
					if(type in blockTypeToBlockName)
						setBlockType(type);
				}
			}
		}
	}

	useUpdateToolbarHandler($updateToolbar);

	const { label, icon } =
		blockTypeToBlockName[blockType] ?? blockTypeToBlockName.paragraph;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="gap-1 px-2" size="sm">
					{icon}
					<span className="text-sm">{label}</span>
					<ChevronDownIcon className="size-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>{children}</DropdownMenuContent>
		</DropdownMenu>
	);
}
