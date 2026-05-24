/* eslint-disable no-restricted-syntax */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { useState, useCallback } from "react";
import { $isCodeNode } from "@lexical/code";
import { normalizeCodeLanguage, getCodeLanguageOptions } from "@lexical/code-shiki";
import { $isListNode } from "@lexical/list";
import { $findMatchingParent } from "@lexical/utils";
import {
	$getNodeByKey,
	$isRangeSelection,
	$isRootOrShadowRoot,
	type BaseSelection
} from "lexical";

import {
	Select,
	SelectItem,
	SelectValue,
	SelectContent,
	SelectTrigger
} from "../../../radix/Select";
import { useToolbarContext } from "../../context/ToolbarContext";
import { useUpdateToolbarHandler } from "../../editor-hooks/UseUpdateToolbar";

const CODE_LANGUAGE_OPTIONS = getCodeLanguageOptions();

export function CodeLanguageToolbarPlugin() {
	const { activeEditor } = useToolbarContext();
	const [codeLanguage, setCodeLanguage] = useState<string>("");
	const [selectedElementKey, setSelectedElementKey] = useState<string | null>(
		null
	);

	const $updateToolbar = (selection: BaseSelection) => {
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
				setSelectedElementKey(elementKey);

				if(!$isListNode(element) && $isCodeNode(element)) {
					const language =
						element.getLanguage()!;
					setCodeLanguage(
						language ? normalizeCodeLanguage(language) : ""
					);
					return;
				}
			}
		}
	};

	useUpdateToolbarHandler($updateToolbar);

	const onCodeLanguageSelect = useCallback(
		(value: string) => {
			activeEditor.update(() => {
				if(selectedElementKey !== null) {
					const node = $getNodeByKey(selectedElementKey);
					if($isCodeNode(node))
						node.setLanguage(value);
				}
			});
		},
		[activeEditor, selectedElementKey]
	);

	return (
		<Select value={codeLanguage} onValueChange={onCodeLanguageSelect}>
			<SelectTrigger onMouseDown={e => e.stopPropagation()} size="sm">
				<SelectValue placeholder="Select Language" />
			</SelectTrigger>
			<SelectContent onCloseAutoFocus={e => e.preventDefault()}>
				{CODE_LANGUAGE_OPTIONS.map(([value, label]) => (
					<SelectItem key={value} value={value}>
						{label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
