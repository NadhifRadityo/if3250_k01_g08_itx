import type { JSX } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TreeView } from "@lexical/react/LexicalTreeView";
import { NotebookPenIcon } from "lucide-react";

import { Button } from "../../../radix/Button";
import {
	Dialog,
	DialogTitle,
	DialogHeader,
	DialogContent,
	DialogTrigger
} from "../../../radix/Dialog";
import { ScrollBar, ScrollArea } from "../../../radix/ScrollArea";

export function TreeViewPlugin(): JSX.Element {
	const [editor] = useLexicalComposerContext();
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button size="sm" variant="ghost" className="p-2">
					<NotebookPenIcon className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Tree View</DialogTitle>
				</DialogHeader>
				<ScrollArea className="bg-foreground text-background h-96 overflow-hidden rounded-lg p-2">
					<TreeView
						viewClassName="tree-view-output"
						treeTypeButtonClassName="debug-treetype-button"
						timeTravelPanelClassName="debug-timetravel-panel"
						timeTravelButtonClassName="debug-timetravel-button"
						timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
						timeTravelPanelButtonClassName="debug-timetravel-panel-button"
						editor={editor}
					/>
					<ScrollBar orientation="vertical" />
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
