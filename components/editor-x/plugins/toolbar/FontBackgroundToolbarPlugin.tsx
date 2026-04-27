/* eslint-disable no-restricted-syntax */

import { useState, useCallback } from "react";
import {
	$patchStyleText,
	$getSelectionStyleValueForProperty
} from "@lexical/selection";
import { $getSelection, $isRangeSelection, type BaseSelection } from "lexical";
import { PaintBucketIcon } from "lucide-react";

import { Button } from "../../../radix/Button";
import { useToolbarContext } from "../../context/ToolbarContext";
import { useUpdateToolbarHandler } from "../../editor-hooks/UseUpdateToolbar";
import {
	ColorPicker,
	ColorPickerArea,
	ColorPickerInput,
	ColorPickerContent,
	ColorPickerTrigger,
	ColorPickerHueSlider,
	ColorPickerEyeDropper,
	ColorPickerAlphaSlider,
	ColorPickerFormatSelect
} from "../../editor-ui/ColorPicker";

export function FontBackgroundToolbarPlugin() {
	const { activeEditor } = useToolbarContext();

	const [bgColor, setBgColor] = useState("#fff");

	const $updateToolbar = (selection: BaseSelection) => {
		if($isRangeSelection(selection)) {
			setBgColor(
				$getSelectionStyleValueForProperty(
					selection,
					"background-color",
					"#fff"
				)
			);
		}
	};

	useUpdateToolbarHandler($updateToolbar);

	const applyStyleText = useCallback(
		(styles: Record<string, string>, _skipHistoryStack?: boolean) => {
			activeEditor.update(
				() => {
					const selection = $getSelection();
					activeEditor.setEditable(false);
					if(selection !== null)
						$patchStyleText(selection, styles);
				},
				{ tag: "historic" }
			);
		},
		[activeEditor]
	);

	const onBgColorSelect = useCallback(
		(value: string) => {
			applyStyleText({ "background-color": value }, true);
		},
		[applyStyleText]
	);

	return (
		<ColorPicker
			modal
			defaultFormat="hex"
			defaultValue={bgColor}
			onValueChange={onBgColorSelect}
			onOpenChange={open => {
				if(!open) {
					activeEditor.setEditable(true);
					activeEditor.focus();
				}
			}}
		>
			<ColorPickerTrigger asChild>
				<Button variant="outline" size="icon-sm">
					<PaintBucketIcon className="size-4" />
				</Button>
			</ColorPickerTrigger>
			<ColorPickerContent>
				<ColorPickerArea />
				<div className="flex items-center gap-2">
					<ColorPickerEyeDropper />
					<div className="flex flex-1 flex-col gap-2">
						<ColorPickerHueSlider />
						<ColorPickerAlphaSlider />
					</div>
				</div>
				<div className="flex items-center gap-2">
					<ColorPickerFormatSelect />
					<ColorPickerInput />
				</div>
			</ColorPickerContent>
		</ColorPicker>
	);
}
