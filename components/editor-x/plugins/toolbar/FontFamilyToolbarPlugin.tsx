/* eslint-disable no-restricted-syntax */

import { useState, useCallback } from "react";
import {
	$patchStyleText,
	$getSelectionStyleValueForProperty
} from "@lexical/selection";
import { $getSelection, $isRangeSelection, type BaseSelection } from "lexical";
import { TypeIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "../../../radix/Button";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from "../../../radix/DropdownMenu";
import { useToolbarContext } from "../../context/ToolbarContext";
import { useUpdateToolbarHandler } from "../../editor-hooks/UseUpdateToolbar";

const FONT_FAMILY_OPTIONS = [
	"Arial",
	"Verdana",
	"Times New Roman",
	"Georgia",
	"Courier New",
	"Trebuchet MS"
];

export function FontFamilyToolbarPlugin() {
	const style = "font-family";
	const [fontFamily, setFontFamily] = useState("Arial");

	const { activeEditor } = useToolbarContext();

	const $updateToolbar = useCallback((selection: BaseSelection) => {
		if($isRangeSelection(selection)) {
			setFontFamily(
				$getSelectionStyleValueForProperty(selection, "font-family", "Arial")
			);
		}
	}, []);

	useUpdateToolbarHandler($updateToolbar);

	const handleClick = useCallback(
		(option: string) => {
			activeEditor.update(() => {
				const selection = $getSelection();
				if(selection !== null) {
					$patchStyleText(selection, {
						[style]: option
					});
				}
			});
			// Selection doesn't move when only inline styles change, so
			// SELECTION_CHANGE_COMMAND won't run — sync label here.
			setFontFamily(option);
		},
		[activeEditor, style]
	);

	const buttonAriaLabel = "Formatting options for font family";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className="w-min gap-1 px-2"
					size="sm"
					aria-label={buttonAriaLabel}
				>
					<TypeIcon className="size-4" />
					<span style={{ fontFamily }}>{fontFamily}</span>
					<ChevronDownIcon className="size-3" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-40" align="start">
				{FONT_FAMILY_OPTIONS.map(option => (
					<DropdownMenuItem
						key={option}
						style={{ fontFamily: option }}
						onClick={() => handleClick(option)}
					>
						{option}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
