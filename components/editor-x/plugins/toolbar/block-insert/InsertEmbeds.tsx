import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin";

import { DropdownMenuItem } from "../../../../radix/DropdownMenu";
import { useToolbarContext } from "../../../context/ToolbarContext";
import { EmbedConfigs } from "../../embeds/AutoEmbedPlugin";

export function InsertEmbeds() {
	const { activeEditor } = useToolbarContext();
	return EmbedConfigs.map(embedConfig => (
		<DropdownMenuItem
			key={embedConfig.type}
			onClick={() => {
				activeEditor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type);
			}}
		>
			<div className="flex items-center gap-1">
				{embedConfig.icon}
				<span>{embedConfig.contentName}</span>
			</div>
		</DropdownMenuItem>
	));
}
