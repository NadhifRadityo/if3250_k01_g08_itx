/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { useRef, useEffect } from "react";
import {
	$getSelection,
	SELECTION_CHANGE_COMMAND,
	COMMAND_PRIORITY_CRITICAL,
	type BaseSelection
} from "lexical";

import { useToolbarContext } from "../context/ToolbarContext";

export function useUpdateToolbarHandler(
	callback: (selection: BaseSelection) => void
) {
	const { activeEditor } = useToolbarContext();
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	useEffect(() => {
		return activeEditor.registerCommand(
			SELECTION_CHANGE_COMMAND,
			() => {
				const selection = $getSelection();
				if(selection)
					callbackRef.current(selection);

				return false;
			},
			COMMAND_PRIORITY_CRITICAL
		);
	}, [activeEditor]);

	useEffect(() => {
		activeEditor.getEditorState().read(() => {
			const selection = $getSelection();
			if(selection)
				callbackRef.current(selection);
		});
	}, [activeEditor]);
}
