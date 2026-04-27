/* eslint-disable no-restricted-syntax */

import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin";

import {
	EmbedConfigs
} from "../embeds/AutoEmbedPlugin";
import { ComponentPickerOption } from ".//ComponentPickerOption";

export function EmbedsPickerPlugin({
	embed
}: {
	embed: "tweet" | "youtube-video";
}) {
	const embedConfig = EmbedConfigs.find(
		config => config.type === embed
	)!;

	return new ComponentPickerOption(`Embed ${embedConfig.contentName}`, {
		icon: embedConfig.icon,
		keywords: [...embedConfig.keywords, "embed"],
		onSelect: (_, editor) =>
			editor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type)
	});
}
