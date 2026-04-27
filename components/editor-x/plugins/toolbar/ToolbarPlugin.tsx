import { useState, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { SELECTION_CHANGE_COMMAND, COMMAND_PRIORITY_CRITICAL } from "lexical";

import { ToolbarContext } from "../../context/ToolbarContext";
import { useEditorModal } from "../../editor-hooks/UseModal";

export function ToolbarPlugin({
	children
}: {
	children: (props: { blockType: string }) => React.ReactNode;
}) {
	const [editor] = useLexicalComposerContext();

	const [activeEditor, setActiveEditor] = useState(editor);
	const [blockType, setBlockType] = useState<string>("paragraph");

	const [modal, showModal] = useEditorModal();

	const $updateToolbar = () => {};

	useEffect(() => {
		return activeEditor.registerCommand(
			SELECTION_CHANGE_COMMAND,
			(_payload, newEditor) => {
				setActiveEditor(newEditor);
				return false;
			},
			COMMAND_PRIORITY_CRITICAL
		);
	}, [activeEditor]);

	return (
		<ToolbarContext
			activeEditor={activeEditor}
			$updateToolbar={$updateToolbar}
			blockType={blockType}
			setBlockType={setBlockType}
			showModal={showModal}
		>
			{modal}

			{children({ blockType })}
		</ToolbarContext>
	);
}
