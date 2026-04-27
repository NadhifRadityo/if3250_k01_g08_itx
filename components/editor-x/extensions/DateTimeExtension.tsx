import { $wrapNodeInElement, $insertNodeIntoLeaf } from "@lexical/utils";
import {
	$getSelection,
	createCommand,
	defineExtension,
	$isRangeSelection,
	$isRootOrShadowRoot,
	$createParagraphNode,
	COMMAND_PRIORITY_EDITOR,
	type LexicalCommand
} from "lexical";

import { DateTimeNode, $createDateTimeNode } from "../nodes/DateTimeNode";

type CommandPayload = {
	dateTime: Date;
};

export const INSERT_DATETIME_COMMAND: LexicalCommand<CommandPayload> =
	createCommand("INSERT_DATETIME_COMMAND");

export const DateTimeExtension = defineExtension({
	name: "@shadcn-editor/DateTime",
	nodes: [DateTimeNode],
	register: editor =>
		editor.registerCommand<CommandPayload>(
			INSERT_DATETIME_COMMAND,
			payload => {
				const { dateTime } = payload;
				const dateTimeNode = $createDateTimeNode(dateTime);

				const selection = $getSelection();
				if($isRangeSelection(selection))
					dateTimeNode.setFormat(selection.format);

				$insertNodeIntoLeaf(dateTimeNode);
				if($isRootOrShadowRoot(dateTimeNode.getParent()))
					$wrapNodeInElement(dateTimeNode, $createParagraphNode).selectEnd();

				return true;
			},
			COMMAND_PRIORITY_EDITOR
		)
});
