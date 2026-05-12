"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { AutoFocusExtension, ClearEditorExtension, DecoratorTextExtension, HorizontalRuleExtension, SelectionAlwaysOnDisplayExtension } from "@lexical/extension";
import { HistoryExtension } from "@lexical/history";
import { LinkExtension, AutoLinkExtension, ClickableLinkExtension, createLinkMatcherWithRegExp } from "@lexical/link";
import { ListExtension, CheckListExtension } from "@lexical/list";
import { CHECK_LIST, ELEMENT_TRANSFORMERS, TEXT_MATCH_TRANSFORMERS, TEXT_FORMAT_TRANSFORMERS, MULTILINE_ELEMENT_TRANSFORMERS } from "@lexical/markdown";
import { OverflowNode } from "@lexical/overflow";
import { CharacterLimitPlugin } from "@lexical/react/LexicalCharacterLimitPlugin";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { RichTextExtension } from "@lexical/rich-text";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { LexicalEditor, configExtension, defineExtension, KEY_DOWN_COMMAND, COMMAND_PRIORITY_HIGH, type EditorState, type SerializedEditorState, $getRoot } from "lexical";

import cn from "@/utils/cn";
import useIsMobile from "@/utils/useIsMobile";

import { ContentEditable } from "./editor-x/editor-ui/ContentEditable";
import { DateTimeExtension } from "./editor-x/extensions/DateTimeExtension";
import { EmojisExtension } from "./editor-x/extensions/EmojisExtension";
import { UploadedImage, ImagesExtension } from "./editor-x/extensions/ImagesExtension";
import { MarkdownShortcutsExtension } from "./editor-x/extensions/MarkdownShortcutsExtension";
import { MaxLengthExtension } from "./editor-x/extensions/MaxLengthExtension";
import { AutocompleteNode } from "./editor-x/nodes/AutocompleteNode";
import { TweetNode } from "./editor-x/nodes/embeds/TweetNode";
import { YouTubeNode } from "./editor-x/nodes/embeds/YoutubeNode";
import { EmojiNode } from "./editor-x/nodes/EmojiNode";
import { LayoutContainerNode } from "./editor-x/nodes/LayoutContainerNode";
import { LayoutItemNode } from "./editor-x/nodes/LayoutItemNode";
import { MentionNode } from "./editor-x/nodes/MentionNode";
import { SpecialTextNode } from "./editor-x/nodes/SpecialTextNode";
import { ActionsPlugin } from "./editor-x/plugins/actions/ActionsPlugin";
import { CounterCharacterPlugin } from "./editor-x/plugins/actions/CounterCharacterPlugin";
import { MarkdownTogglePlugin } from "./editor-x/plugins/actions/MarkdownTogglePlugin";
import { AutoCompletePlugin } from "./editor-x/plugins/AutoCompletePlugin";
import { CodeActionMenuPlugin } from "./editor-x/plugins/CodeActionMenuPlugin";
import { CodeHighlightPlugin } from "./editor-x/plugins/CodeHighlightPlugin";
import { ComponentPickerMenuPlugin } from "./editor-x/plugins/ComponentPickerMenuPlugin";
import { ContextMenuPlugin } from "./editor-x/plugins/ContextMenuPlugin";
import { DraggableBlockPlugin } from "./editor-x/plugins/DraggableBlockPlugin";
import { AutoEmbedPlugin } from "./editor-x/plugins/embeds/AutoEmbedPlugin";
import { TwitterPlugin } from "./editor-x/plugins/embeds/TwitterPlugin";
import { YouTubePlugin } from "./editor-x/plugins/embeds/YoutubePlugin";
import { EmojiPickerPlugin } from "./editor-x/plugins/EmojiPickerPlugin";
import { FloatingLinkEditorPlugin } from "./editor-x/plugins/FloatingLinkEditorPlugin";
import { FloatingTextFormatToolbarPlugin } from "./editor-x/plugins/FloatingTextFormatPlugin";
import { LayoutPlugin } from "./editor-x/plugins/LayoutPlugin";
import { MentionsPlugin } from "./editor-x/plugins/MentionsPlugin";
import { AlignmentPickerPlugin } from "./editor-x/plugins/picker/AlignmentPickerPlugin";
import { BulletedListPickerPlugin } from "./editor-x/plugins/picker/BulletedListPickerPlugin";
import { CheckListPickerPlugin } from "./editor-x/plugins/picker/CheckListPickerPlugin";
import { CodePickerPlugin } from "./editor-x/plugins/picker/CodePickerPlugin";
import { ColumnsLayoutPickerPlugin } from "./editor-x/plugins/picker/ColumnsLayoutPickerPlugin";
import { DateTimePickerPlugin } from "./editor-x/plugins/picker/DateTimePickerPlugin";
import { DividerPickerPlugin } from "./editor-x/plugins/picker/DividerPickerPlugin";
import { EmbedsPickerPlugin } from "./editor-x/plugins/picker/EmbedsPickerPlugin";
import { HeadingPickerPlugin } from "./editor-x/plugins/picker/HeadingPickerPlugin";
import { ImagePickerPlugin } from "./editor-x/plugins/picker/ImagePickerPlugin";
import { NumberedListPickerPlugin } from "./editor-x/plugins/picker/NumberedListPickerPlugin";
import { ParagraphPickerPlugin } from "./editor-x/plugins/picker/ParagraphPickerPlugin";
import { QuotePickerPlugin } from "./editor-x/plugins/picker/QuotePickerPlugin";
import { TablePickerPlugin } from "./editor-x/plugins/picker/TablePickerPlugin";
import SpecialTextPlugin from "./editor-x/plugins/SpecialTextPlugin";
import { TabFocusPlugin } from "./editor-x/plugins/TabFocusPlugin";
import { FormatBulletedList } from "./editor-x/plugins/toolbar/block-format/FormatBulletedList";
import { FormatCheckList } from "./editor-x/plugins/toolbar/block-format/FormatCheckList";
import { FormatCodeBlock } from "./editor-x/plugins/toolbar/block-format/FormatCodeBlock";
import { FormatHeading } from "./editor-x/plugins/toolbar/block-format/FormatHeading";
import { FormatNumberedList } from "./editor-x/plugins/toolbar/block-format/FormatNumberedList";
import { FormatParagraph } from "./editor-x/plugins/toolbar/block-format/FormatParagraph";
import { FormatQuote } from "./editor-x/plugins/toolbar/block-format/FormatQuote";
import { InsertColumnsLayout } from "./editor-x/plugins/toolbar/block-insert/InsertColumnsLayout";
import { InsertEmbeds } from "./editor-x/plugins/toolbar/block-insert/InsertEmbeds";
import { InsertHorizontalRule } from "./editor-x/plugins/toolbar/block-insert/InsertHorizontalRule";
import { InsertImage } from "./editor-x/plugins/toolbar/block-insert/InsertImage";
import { InsertTable } from "./editor-x/plugins/toolbar/block-insert/InsertTable";
import { BlockFormatDropDown } from "./editor-x/plugins/toolbar/BlockFormatToolbarPlugin";
import { BlockInsertPlugin } from "./editor-x/plugins/toolbar/BlockInsertPlugin";
import { ClearFormattingToolbarPlugin } from "./editor-x/plugins/toolbar/ClearFormattingToolbarPlugin";
import { CodeLanguageToolbarPlugin } from "./editor-x/plugins/toolbar/CodeLanguageToolbarPlugin";
import { ElementFormatToolbarPlugin } from "./editor-x/plugins/toolbar/ElementFormatToolbarPlugin";
import { FontBackgroundToolbarPlugin } from "./editor-x/plugins/toolbar/FontBackgroundToolbarPlugin";
import { FontColorToolbarPlugin } from "./editor-x/plugins/toolbar/FontColorToolbarPlugin";
import { FontFamilyToolbarPlugin } from "./editor-x/plugins/toolbar/FontFamilyToolbarPlugin";
import { FontFormatToolbarPlugin } from "./editor-x/plugins/toolbar/FontFormatToolbarPlugin";
import { FontSizeToolbarPlugin } from "./editor-x/plugins/toolbar/FontSizeToolbarPlugin";
import { HistoryToolbarPlugin } from "./editor-x/plugins/toolbar/HistoryToolbarPlugin";
import { LinkToolbarPlugin } from "./editor-x/plugins/toolbar/LinkToolbarPlugin";
import { SubSuperToolbarPlugin } from "./editor-x/plugins/toolbar/SubsuperToolbarPlugin";
import { ToolbarPlugin } from "./editor-x/plugins/toolbar/ToolbarPlugin";
import { editorTheme } from "./editor-x/themes/EditorTheme";
import { EMOJI } from "./editor-x/transformers/MarkdownEmojiTransformer";
import { HR } from "./editor-x/transformers/MarkdownHrTransformer";
import { IMAGE } from "./editor-x/transformers/MarkdownImageTransformer";
import { TABLE } from "./editor-x/transformers/MarkdownTableTransformer";
import { TWEET } from "./editor-x/transformers/MarkdownTweetTransformer";
import { validateUrl } from "./editor-x/utils/Url";
import { ScrollBar, ScrollArea } from "./radix/ScrollArea";
import { Separator } from "./radix/Separator";
import { TooltipProvider } from "./radix/Tooltip";

export const RichTextInput = ({
	initialEditorState,
	serializedState,
	onSerializedStateChange,
	onImageUpload,
	placeholder = "Provide a value",
	className,
	children
}: {
	initialEditorState?: EditorState;
	serializedState?: SerializedEditorState;
	onSerializedStateChange?: (editorSerializedState: SerializedEditorState) => void;
	onImageUpload: (formData: FormData) => Promise<UploadedImage>;
	placeholder?: string;
	className?: string;
	children?: React.ReactNode;
}) => {
	const isMobile = useIsMobile();
	const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
	const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);
	const onRef = (_floatingAnchorElem: HTMLDivElement) => {
		if(_floatingAnchorElem != null)
			setFloatingAnchorElem(_floatingAnchorElem);
	};

	const editorRef = useRef<LexicalEditor>(null);
	const AppExtension = useMemo(() => defineExtension({
		dependencies: [
			RichTextExtension,
			AutoFocusExtension,
			SelectionAlwaysOnDisplayExtension,
			HistoryExtension,
			configExtension(LinkExtension, {
				validateUrl,
				attributes: { rel: "noopener noreferrer", target: "_blank" }
			}),
			configExtension(AutoLinkExtension, {
				matchers: [
					createLinkMatcherWithRegExp(
						/((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)(?<![-.+():%])/,
						text => text.startsWith("http") ? text : `https://${text}`
					),
					createLinkMatcherWithRegExp(
						/(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/,
						text => `mailto:${text}`
					),
					createLinkMatcherWithRegExp(
						/\b(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){2,4}\d{2,4}\b/,
						text => `tel:${text.replace(/[^\d+]/g, "")}`
					)
				]
			}),
			configExtension(ClickableLinkExtension, { newTab: true }),
			configExtension(MaxLengthExtension, { disabled: false, maxLength: 8000 }),
			configExtension(MarkdownShortcutsExtension, {
				transformers: [
					TABLE, HR, IMAGE, EMOJI, TWEET, CHECK_LIST,
					...ELEMENT_TRANSFORMERS,
					...MULTILINE_ELEMENT_TRANSFORMERS,
					...TEXT_FORMAT_TRANSFORMERS,
					...TEXT_MATCH_TRANSFORMERS
				]
			}),
			ClearEditorExtension,
			EmojisExtension,
			DecoratorTextExtension,
			configExtension(ListExtension, { shouldPreserveNumbering: false }),
			CheckListExtension,
			HorizontalRuleExtension,
			ImagesExtension,
			DateTimeExtension
		],
		name: "rich-text-input",
		namespace: "rich-text-input",
		nodes: [
			OverflowNode,
			EmojiNode,
			MentionNode,
			AutocompleteNode,
			SpecialTextNode,
			CodeNode,
			CodeHighlightNode,
			TableNode,
			TableCellNode,
			TableRowNode,
			LayoutContainerNode,
			LayoutItemNode,
			TweetNode,
			YouTubeNode
		],
		$initialEditorState(editor) {
			editorRef.current = editor;
			if(serializedState != null)
				editor.setEditorState(editor.parseEditorState(serializedState));
			else if(initialEditorState != null)
				editor.setEditorState(initialEditorState);
			editor.registerCommand(
				KEY_DOWN_COMMAND,
				event => {
					if(event.ctrlKey || event.metaKey) {
						const key = event.key.toLowerCase();
						if(["b", "i", "u", "k"].includes(key)) {
							event.stopPropagation();
							return false;
						}
					}
					return false;
				},
				COMMAND_PRIORITY_HIGH
			);
		},
		theme: editorTheme
	}), []);

	const serializedStateString = useMemo(() => JSON.stringify(serializedState), [serializedState]);
	const lastSerializedStateString = useRef(serializedStateString);
	useEffect(() => {
		const editor = editorRef.current;
		if(editor == null)
			return;
		if(serializedStateString == lastSerializedStateString.current)
			return;
		lastSerializedStateString.current = serializedStateString;
		const serializedState = JSON.parse(serializedStateString ?? "null");
		if(serializedState != null)
			editor.setEditorState(editor.parseEditorState(serializedState));
		else {
			editor.update(() => {
				$getRoot().clear();
			});
		}
	}, [serializedState]);

	useEffect(() => {
		if(floatingAnchorElem == null)
			return;
		const onKeyDown = (e: KeyboardEvent) => {
			if(e.key != "Escape") return;
			if(!(e.target instanceof Node)) return;
			if(!floatingAnchorElem.contains(e.target)) return;
			e.stopImmediatePropagation();
			e.stopPropagation();
			e.preventDefault();
		};
		globalThis.addEventListener("keydown", onKeyDown, { capture: true });
		return () => {
			globalThis.removeEventListener("keydown", onKeyDown);
		};
	}, [floatingAnchorElem]);

	return (
		<div className={cn("bg-background overflow-hidden rounded-lg border shadow w-full", className)}>
			<LexicalExtensionComposer extension={AppExtension} contentEditable={null}>
				<TooltipProvider>
					<div className="relative">
						<ToolbarPlugin>
							{({ blockType }) => (
								<ScrollArea>
									<div className="vertical-align-middle sticky top-0 z-10 flex items-center gap-2 overflow-auto border-b p-1">
										<HistoryToolbarPlugin />
										<Separator orientation="vertical" className="h-7!" />
										<BlockFormatDropDown>
											<FormatParagraph />
											<FormatHeading levels={["h1", "h2", "h3"]} />
											<FormatNumberedList />
											<FormatBulletedList />
											<FormatCheckList />
											<FormatCodeBlock />
											<FormatQuote />
										</BlockFormatDropDown>
										{blockType == "code" ? (
											<CodeLanguageToolbarPlugin />
										) : (
											<>
												<FontFamilyToolbarPlugin />
												<FontSizeToolbarPlugin />
												<Separator orientation="vertical" className="h-7!" />
												<FontFormatToolbarPlugin />
												<Separator orientation="vertical" className="h-7!" />
												<SubSuperToolbarPlugin />
												<LinkToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
												<Separator orientation="vertical" className="h-7!" />
												<ClearFormattingToolbarPlugin />
												<Separator orientation="vertical" className="h-7!" />
												<FontColorToolbarPlugin />
												<FontBackgroundToolbarPlugin />
												<Separator orientation="vertical" className="h-7!" />
												<ElementFormatToolbarPlugin />
												<Separator orientation="vertical" className="h-7!" />
												<BlockInsertPlugin>
													<InsertHorizontalRule />
													<InsertImage onUpload={onImageUpload} />
													<InsertTable />
													<InsertColumnsLayout />
													<InsertEmbeds />
												</BlockInsertPlugin>
											</>
										)}
									</div>
									<ScrollBar orientation="horizontal" className="z-10 opacity-60" />
								</ScrollArea>
							)}
						</ToolbarPlugin>
						<div className="relative">
							<div
								className={cn(
									!isMobile ? "after:absolute after:top-0 after:left-12 after:bottom-0 after:w-px after:bg-border" : ""
								)}
							>
								<div className="" ref={onRef}>
									<ContentEditable
										placeholder={placeholder}
										className={cn("min-h-32 max-h-[calc(100svh-280px)]", !isMobile ? "pl-14" : "")}
										placeholderClassName={cn(!isMobile ? "pl-14" : "")}
									/>
								</div>
							</div>
							<ComponentPickerMenuPlugin baseOptions={[
								ParagraphPickerPlugin(),
								HeadingPickerPlugin({ n: 1 }),
								HeadingPickerPlugin({ n: 2 }),
								HeadingPickerPlugin({ n: 3 }),
								TablePickerPlugin(),
								CheckListPickerPlugin(),
								NumberedListPickerPlugin(),
								BulletedListPickerPlugin(),
								QuotePickerPlugin(),
								CodePickerPlugin(),
								DividerPickerPlugin(),
								EmbedsPickerPlugin({ embed: "tweet" }),
								EmbedsPickerPlugin({ embed: "youtube-video" }),
								ImagePickerPlugin({ onUpload: onImageUpload }),
								ColumnsLayoutPickerPlugin(),
								DateTimePickerPlugin(),
								AlignmentPickerPlugin({ alignment: "left" }),
								AlignmentPickerPlugin({ alignment: "center" }),
								AlignmentPickerPlugin({ alignment: "right" }),
								AlignmentPickerPlugin({ alignment: "justify" })
							]}
							/>
							<EmojiPickerPlugin />
							<AutoEmbedPlugin />
							<MentionsPlugin />
							<AutoCompletePlugin />
							<ContextMenuPlugin />
							<SpecialTextPlugin />
							<TabFocusPlugin />
							<TabIndentationPlugin />
							<CodeHighlightPlugin />
							<TablePlugin />
							<LayoutPlugin />
							<TwitterPlugin />
							<YouTubePlugin />
							{!isMobile ? (
								<DraggableBlockPlugin
									anchorElem={floatingAnchorElem}
									baseOptions={[
										ParagraphPickerPlugin(),
										HeadingPickerPlugin({ n: 1 }),
										HeadingPickerPlugin({ n: 2 }),
										HeadingPickerPlugin({ n: 3 }),
										TablePickerPlugin(),
										CheckListPickerPlugin(),
										NumberedListPickerPlugin(),
										BulletedListPickerPlugin(),
										QuotePickerPlugin(),
										CodePickerPlugin(),
										DividerPickerPlugin(),
										EmbedsPickerPlugin({ embed: "tweet" }),
										EmbedsPickerPlugin({ embed: "youtube-video" }),
										ImagePickerPlugin({ onUpload: onImageUpload }),
										ColumnsLayoutPickerPlugin(),
										DateTimePickerPlugin(),
										AlignmentPickerPlugin({ alignment: "left" }),
										AlignmentPickerPlugin({ alignment: "center" }),
										AlignmentPickerPlugin({ alignment: "right" }),
										AlignmentPickerPlugin({ alignment: "justify" })
									]}
								/>
							) : null}
							<FloatingTextFormatToolbarPlugin anchorElem={floatingAnchorElem} setIsLinkEditMode={setIsLinkEditMode} />
							<FloatingLinkEditorPlugin anchorElem={floatingAnchorElem} isLinkEditMode={isLinkEditMode} setIsLinkEditMode={setIsLinkEditMode} />
							<CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
						</div>
						<ActionsPlugin>
							<div className="clear-both flex items-center justify-between gap-2 overflow-auto border-t p-1">
								<div className="flex flex-1 justify-start text-xs text-gray-500">
									<CharacterLimitPlugin maxLength={8000} charset="UTF-16" renderer={({ remainingCharacters }) => <>{!isMobile ? "Remaining Characters: " : "-"}{remainingCharacters}</>} />
								</div>
								<div className="flex flex-1 justify-end">
									<CounterCharacterPlugin charset="UTF-16" />
									<MarkdownTogglePlugin
										shouldPreserveNewLinesInMarkdown={true}
										transformers={[
											TABLE, HR, IMAGE, EMOJI, TWEET, CHECK_LIST,
											...ELEMENT_TRANSFORMERS,
											...MULTILINE_ELEMENT_TRANSFORMERS,
											...TEXT_FORMAT_TRANSFORMERS,
											...TEXT_MATCH_TRANSFORMERS
										]}
									/>
								</div>
							</div>
						</ActionsPlugin>
					</div>
					<OnChangePlugin
						ignoreSelectionChange={true}
						onChange={editorState => {
							const editorSerializedState = editorState.toJSON();
							lastSerializedStateString.current = JSON.stringify(editorSerializedState);
							onSerializedStateChange?.(editorSerializedState);
						}}
					/>
					{children}
				</TooltipProvider>
			</LexicalExtensionComposer>
		</div>
	);
};

export const RichTextPreview = ({
	initialEditorState,
	serializedState,
	placeholder = "No value provided",
	className,
	contentClassName,
	placeholderClassName,
	children
}: {
	initialEditorState?: EditorState;
	serializedState?: SerializedEditorState;
	placeholder?: string;
	className?: string;
	contentClassName?: string;
	placeholderClassName?: string;
	children?: React.ReactNode;
}) => {
	const editorRef = useRef<LexicalEditor>(null);
	const AppExtension = useMemo(() => defineExtension({
		dependencies: [
			RichTextExtension,
			AutoFocusExtension,
			HistoryExtension,
			configExtension(LinkExtension, {
				validateUrl,
				attributes: { rel: "noopener noreferrer", target: "_blank" }
			}),
			configExtension(AutoLinkExtension, {
				matchers: [
					createLinkMatcherWithRegExp(
						/((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)(?<![-.+():%])/,
						text => text.startsWith("http") ? text : `https://${text}`
					),
					createLinkMatcherWithRegExp(
						/(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/,
						text => `mailto:${text}`
					),
					createLinkMatcherWithRegExp(
						/\b(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){2,4}\d{2,4}\b/,
						text => `tel:${text.replace(/[^\d+]/g, "")}`
					)
				]
			}),
			configExtension(ClickableLinkExtension, { newTab: true }),
			configExtension(MaxLengthExtension, { disabled: false, maxLength: 8000 }),
			configExtension(MarkdownShortcutsExtension, {
				transformers: [
					TABLE, HR, IMAGE, EMOJI, TWEET, CHECK_LIST,
					...ELEMENT_TRANSFORMERS,
					...MULTILINE_ELEMENT_TRANSFORMERS,
					...TEXT_FORMAT_TRANSFORMERS,
					...TEXT_MATCH_TRANSFORMERS
				]
			}),
			ClearEditorExtension,
			EmojisExtension,
			DecoratorTextExtension,
			configExtension(ListExtension, { shouldPreserveNumbering: false }),
			CheckListExtension,
			HorizontalRuleExtension,
			ImagesExtension,
			DateTimeExtension
		],
		name: "rich-text-input",
		namespace: "rich-text-input",
		nodes: [
			OverflowNode,
			EmojiNode,
			MentionNode,
			AutocompleteNode,
			SpecialTextNode,
			CodeNode,
			CodeHighlightNode,
			TableNode,
			TableCellNode,
			TableRowNode,
			LayoutContainerNode,
			LayoutItemNode,
			TweetNode,
			YouTubeNode
		],
		$initialEditorState(editor) {
			editorRef.current = editor;
			if(serializedState != null)
				editor.setEditorState(editor.parseEditorState(serializedState));
			else if(initialEditorState != null)
				editor.setEditorState(initialEditorState);
			editor.setEditable(false);
			editor.registerCommand(
				KEY_DOWN_COMMAND,
				event => {
					if(event.ctrlKey || event.metaKey) {
						const key = event.key.toLowerCase();
						if(["b", "i", "u", "k"].includes(key)) {
							event.stopPropagation();
							return false;
						}
					}
					return false;
				},
				COMMAND_PRIORITY_HIGH
			);
		},
		theme: editorTheme
	}), []);

	const serializedStateString = useMemo(() => JSON.stringify(serializedState), [serializedState]);
	const lastSerializedStateString = useRef(serializedStateString);
	useEffect(() => {
		const editor = editorRef.current;
		if(editor == null)
			return;
		if(serializedStateString == lastSerializedStateString.current)
			return;
		lastSerializedStateString.current = serializedStateString;
		const serializedState = JSON.parse(serializedStateString ?? "null");
		if(serializedState != null)
			editor.setEditorState(editor.parseEditorState(serializedState));
		else {
			editor.update(() => {
				$getRoot().clear();
			});
		}
	}, [serializedState]);

	return (
		<div className={cn("bg-background overflow-hidden rounded-lg border shadow w-full", className)}>
			<LexicalExtensionComposer extension={AppExtension} contentEditable={null}>
				<TooltipProvider>
					<div className="relative">
						<div className="">
							<ContentEditable
								placeholder={placeholder}
								className={cn("min-h-32 max-h-[calc(100svh-280px)]", contentClassName)}
								placeholderClassName={cn("max-w-full", placeholderClassName)}
							/>
						</div>
					</div>
					{children}
				</TooltipProvider>
			</LexicalExtensionComposer>
		</div>
	);
};
