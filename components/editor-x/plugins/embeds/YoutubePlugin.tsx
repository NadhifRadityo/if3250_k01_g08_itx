import { useEffect, type JSX } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
	createCommand,
	COMMAND_PRIORITY_EDITOR,
	type LexicalCommand
} from "lexical";

import {
	YouTubeNode,
	$createYouTubeNode
} from "../../nodes/embeds/YoutubeNode";

export const INSERT_YOUTUBE_COMMAND: LexicalCommand<string> = createCommand(
	"INSERT_YOUTUBE_COMMAND"
);

export function YouTubePlugin(): JSX.Element | null {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if(!editor.hasNodes([YouTubeNode]))
			throw new Error("YouTubePlugin: YouTubeNode not registered on editor");

		return editor.registerCommand<string>(
			INSERT_YOUTUBE_COMMAND,
			payload => {
				const youTubeNode = $createYouTubeNode(payload);
				$insertNodeToNearestRoot(youTubeNode);

				return true;
			},
			COMMAND_PRIORITY_EDITOR
		);
	}, [editor]);

	return null;
}
