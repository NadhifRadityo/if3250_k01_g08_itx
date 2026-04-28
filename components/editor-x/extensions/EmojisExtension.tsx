/* eslint-disable no-restricted-syntax */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { TextNode, defineExtension } from "lexical";

import {
	EmojiNode,
	$createEmojiNode
} from "../nodes/EmojiNode";

const emojis: Map<string, [string, string]> = new Map([
	// Basic smiles
	[":)", ["emoji smile", "🙂"]],
	[":-)", ["emoji smile", "🙂"]],
	[":D", ["emoji grin", "😀"]],
	[":-D", ["emoji grin", "😀"]],
	["=)", ["emoji smile", "🙂"]],
	["=D", ["emoji grin", "😀"]],

	// Sad
	[":(", ["emoji sad", "🙁"]],
	[":-(", ["emoji sad", "🙁"]],
	["=(", ["emoji sad", "🙁"]],

	// Wink
	[";)", ["emoji wink", "😉"]],
	[";-)", ["emoji wink", "😉"]],

	// Tongue / playful
	[":P", ["emoji tongue", "😛"]],
	[":-P", ["emoji tongue", "😛"]],
	[";P", ["emoji playful wink", "😜"]],
	[";-P", ["emoji playful wink", "😜"]],

	// Laughing / XD style
	["XD", ["emoji laughing", "😆"]],
	["xD", ["emoji laughing", "😆"]],

	// Surprised / shocked
	[":O", ["emoji surprised", "😮"]],
	[":-O", ["emoji surprised", "😮"]],
	[":o", ["emoji surprised", "😮"]],

	// Kiss
	[":*", ["emoji kiss", "😘"]],
	[":-*", ["emoji kiss", "😘"]],

	// Crying
	[":'(", ["emoji crying", "😢"]],
	[":'-(", ["emoji crying", "😢"]],

	// Angry
	[">:(", ["emoji angry", "😠"]],
	[">:-(", ["emoji angry", "😠"]],

	// Cool
	["8)", ["emoji cool", "😎"]],
	["8-)", ["emoji cool", "😎"]],
	["B)", ["emoji cool", "😎"]],

	// Confused / unsure
	[":/", ["emoji confused", "😕"]],
	[":-/", ["emoji confused", "😕"]],
	[":\\", ["emoji confused", "😕"]],

	// Neutral / meh
	[":|", ["emoji neutral", "😐"]],
	[":-|", ["emoji neutral", "😐"]],

	// Embarrassed / shy
	[":$", ["emoji embarrassed", "😳"]],

	// Sleepy
	["-_-", ["emoji sleepy", "😑"]],

	// Dead / exhausted
	["x_x", ["emoji dead", "😵"]],
	["X_X", ["emoji dead", "😵"]],

	// Love / hearts
	["<3", ["emoji heart", "❤️"]],
	["</3", ["emoji broken heart", "💔"]],

	// Cat-style emoticons
	[":3", ["emoji cat smile", "😺"]],

	// Anime / expressive styles
	["^_^", ["emoji happy", "😊"]],
	["^.^", ["emoji happy", "😊"]],
	[">_<", ["emoji frustrated", "😣"]],
	["T_T", ["emoji crying", "😭"]],
	["-_-;", ["emoji awkward", "😅"]],

	// Shrug / gesture
	["¯\\_(ツ)_/¯", ["emoji shrug", "🤷"]],

	// Thinking
	[":?", ["emoji thinking", "🤔"]],

	// Hug
	[">:D<", ["emoji hug", "🤗"]]
]);

const emojisRegex = new RegExp(`(\\s)(${[...emojis.keys()].map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s`, "g");

function $findAndTransformEmoji(node: TextNode): null | TextNode {
	const text = node.getTextContent();

	emojisRegex.lastIndex = 0;
	let matcher: RegExpExecArray | null;
	while((matcher = emojisRegex.exec(text)) != null) {
		const emojiData = emojis.get(matcher[1]);
		if(emojiData !== undefined) {
			const [emojiStyle, emojiText] = emojiData;
			let targetNode;
			if(matcher.index === 0)
				[targetNode] = node.splitText(matcher.index + matcher[1].length + matcher[2].length);
			else
				[, targetNode] = node.splitText(matcher.index + matcher[1].length, matcher.index + matcher[1].length + matcher[2].length);

			const emojiNode = $createEmojiNode(emojiStyle, emojiText);
			targetNode.replace(emojiNode);
			return emojiNode;
		}
	}

	return null;
}

function $textNodeTransform(node: TextNode): void {
	let targetNode: TextNode | null = node;

	while(targetNode !== null) {
		if(!targetNode.isSimpleText())
			return;

		targetNode = $findAndTransformEmoji(targetNode);
	}
}

export const EmojisExtension = defineExtension({
	name: "@shadcn-editor/Emojis",
	nodes: [EmojiNode],
	register: editor =>
		editor.registerNodeTransform(TextNode, $textNodeTransform)
});
