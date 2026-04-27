/* eslint-disable no-restricted-syntax */

import { useState, useCallback } from "react";
import { $isTableSelection } from "@lexical/table";
import {
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	type BaseSelection
} from "lexical";
import {
	BoldIcon,
	ItalicIcon,
	UnderlineIcon,
	StrikethroughIcon
} from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "../../../radix/ToggleGroup";
import { useToolbarContext } from "../../context/ToolbarContext";
import { useUpdateToolbarHandler } from "../../editor-hooks/UseUpdateToolbar";

const FORMATS = [
	{ format: "bold", icon: BoldIcon, label: "Bold" },
	{ format: "italic", icon: ItalicIcon, label: "Italic" },
	{ format: "underline", icon: UnderlineIcon, label: "Underline" },
	{ format: "strikethrough", icon: StrikethroughIcon, label: "Strikethrough" }
] as const;

export function FontFormatToolbarPlugin() {
	const { activeEditor } = useToolbarContext();
	const [activeFormats, setActiveFormats] = useState<string[]>([]);

	const $updateToolbar = useCallback((selection: BaseSelection) => {
		if($isRangeSelection(selection) || $isTableSelection(selection)) {
			const formats: string[] = [];
			FORMATS.forEach(({ format }) => {
				if(selection.hasFormat(format))
					formats.push(format);
			});
			setActiveFormats(prev => {
				// Only update if formats have changed
				if(
					prev.length !== formats.length ||
					!formats.every(f => prev.includes(f))
				)
					return formats;

				return prev;
			});
		}
	}, []);

	useUpdateToolbarHandler($updateToolbar);

	return (
		<ToggleGroup
			type="multiple"
			value={activeFormats}
			onValueChange={setActiveFormats}
			variant="outline"
			size="sm"
		>
			{FORMATS.map(({ format, icon: Icon, label }) => (
				<ToggleGroupItem
					key={format}
					value={format}
					aria-label={label}
					onClick={() => {
						activeEditor.dispatchCommand(
							FORMAT_TEXT_COMMAND,
							format
						);
					}}
				>
					<Icon className="size-4" />
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
