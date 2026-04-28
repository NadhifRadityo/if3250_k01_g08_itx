/* eslint-disable no-restricted-syntax */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	MenuOption,
	useBasicTypeaheadTriggerMatch
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { LexicalTypeaheadMenuPlugin } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import {
	TextNode,
	$getSelection,
	$createTextNode,
	$isRangeSelection
} from "lexical";

import {
	Command,
	CommandItem,
	CommandList,
	CommandGroup
} from "../../radix/Command";

// const LexicalTypeaheadMenuPlugin = dynamic(
//   () =>
//     import("@lexical/react/LexicalTypeaheadMenuPlugin").then(
//       (mod) => mod.LexicalTypeaheadMenuPlugin<EmojiOption>
//     ),
//   { ssr: false }
// )

class EmojiOption extends MenuOption {
	title: string;
	emoji: string;
	keywords: Array<string>;

	constructor(
		title: string,
		emoji: string,
		options: {
			keywords?: Array<string>;
		}
	) {
		super(title);
		this.title = title;
		this.emoji = emoji;
		this.keywords = options.keywords || [];
	}
}

type Emoji = {
	emoji: string;
	description: string;
	category: string;
	aliases: Array<string>;
	tags: Array<string>;
	unicode_version: string;
	ios_version: string;
	skin_tones?: boolean;
};

const MAX_EMOJI_SUGGESTION_COUNT = 10;

function ComponentPickerMenu({
	options,
	selectedIndex,
	selectOptionAndCleanUp,
	setHighlightedIndex
}: {
	options: Array<EmojiOption>;
	selectedIndex: number | null;
	selectOptionAndCleanUp: (option: EmojiOption) => void;
	setHighlightedIndex: (index: number) => void;
}) {
	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

	useEffect(() => {
		if(selectedIndex !== null && itemRefs.current[selectedIndex]) {
			itemRefs.current[selectedIndex]?.scrollIntoView({
				block: "nearest",
				behavior: "auto"
			});
		}
	}, [selectedIndex]);

	return (
		<div className="absolute z-50 min-w-36 rounded-md shadow-md pointer-events-auto">
			<Command
				value={options[selectedIndex ?? 0]?.title}
				onKeyDown={e => {
					if(e.key === "ArrowUp") {
						e.preventDefault();
						setHighlightedIndex(
							selectedIndex !== null ?
								(selectedIndex - 1 + options.length) % options.length :
								options.length - 1
						);
					} else if(e.key === "ArrowDown") {
						e.preventDefault();
						setHighlightedIndex(
							selectedIndex !== null ? (selectedIndex + 1) % options.length : 0
						);
					}
				}}
			>
				<CommandList>
					<CommandGroup>
						{options.map((option, index) => (
							<CommandItem
								key={option.key}
								ref={el => {
									itemRefs.current[index] = el;
								}}
								value={option.title}
								onSelect={() => {
									selectOptionAndCleanUp(option);
								}}
								className="flex items-center gap-2 whitespace-nowrap"
							>
								{option.emoji} {option.title}
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</Command>
		</div>
	);
}

export function EmojiPickerPlugin() {
	const [editor] = useLexicalComposerContext();
	const [queryString, setQueryString] = useState<string | null>(null);
	const [emojis, setEmojis] = useState<Array<Emoji>>([]);
	useEffect(() => {
		import("../utils/EmojiList").then(file => setEmojis(file.default));
	}, []);

	const emojiOptions = useMemo(
		() =>
			emojis != null ?
				emojis.map(
					({ emoji, aliases, tags }) =>
						new EmojiOption(aliases[0], emoji, {
							keywords: [...aliases, ...tags]
						})
				) :
				[],
		[emojis]
	);

	const checkForTriggerMatch = useBasicTypeaheadTriggerMatch(":", {
		minLength: 0
	});

	const options: Array<EmojiOption> = useMemo(() => {
		return emojiOptions
			.filter((option: EmojiOption) => {
				return queryString != null ?
					new RegExp(queryString, "gi").exec(option.title) ||
						option.keywords != null ?
						option.keywords.some((keyword: string) =>
							new RegExp(queryString, "gi").exec(keyword)
						) :
						false :
					emojiOptions;
			})
			.slice(0, MAX_EMOJI_SUGGESTION_COUNT);
	}, [emojiOptions, queryString]);

	const onSelectOption = useCallback(
		(
			selectedOption: EmojiOption,
			nodeToRemove: TextNode | null,
			closeMenu: () => void
		) => {
			editor.update(() => {
				const selection = $getSelection();

				if(!$isRangeSelection(selection) || selectedOption == null)
					return;

				if(nodeToRemove)
					nodeToRemove.remove();

				selection.insertNodes([$createTextNode(selectedOption.emoji)]);

				closeMenu();
			});
		},
		[editor]
	);

	return (
		<LexicalTypeaheadMenuPlugin
			onQueryChange={setQueryString}
			onSelectOption={onSelectOption}
			triggerFn={checkForTriggerMatch}
			options={options}
			menuRenderFn={(
				anchorElementRef,
				{ selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
			) => {
				return anchorElementRef.current && options.length ?
					createPortal(
						<ComponentPickerMenu
							options={options}
							selectedIndex={selectedIndex}
							selectOptionAndCleanUp={selectOptionAndCleanUp}
							setHighlightedIndex={setHighlightedIndex}
						/>,
						anchorElementRef.current
					) :
					null;
			}}
		/>
	);
}
