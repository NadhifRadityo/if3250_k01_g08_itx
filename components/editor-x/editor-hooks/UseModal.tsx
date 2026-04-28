import { useState, useCallback, type JSX } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import {
	Dialog,
	DialogTitle,
	DialogHeader,
	DialogContent
} from "../../radix/Dialog";

export function useEditorModal(): [
  JSX.Element | null,
  (title: string, showModal: (onClose: () => void) => JSX.Element) => void
] {
	const [editor] = useLexicalComposerContext();
	const [open, setOpen] = useState(false);
	const [modalContent, setModalContent] = useState<null | {
		title: string;
		content: JSX.Element;
	}>(null);

	const onClose = () => {
		setOpen(false);
		editor.focus();
	};

	const modal = (
		<Dialog open={open && modalContent != null} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{modalContent?.title}</DialogTitle>
				</DialogHeader>
				{modalContent?.content}
			</DialogContent>
		</Dialog>
	);

	const showModal = useCallback(
		(
			title: string,
			getContent: (onClose: () => void) => JSX.Element
		) => {
			setOpen(true);
			setModalContent({
				title,
				content: getContent(onClose)
			});
		},
		[]
	);

	return [modal, showModal];
}
