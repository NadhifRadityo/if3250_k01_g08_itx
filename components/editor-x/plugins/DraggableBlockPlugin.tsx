/* eslint-disable no-restricted-syntax */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import {
	useRef,
	useMemo,
	useState,
	useEffect,
	useCallback,
	type JSX
} from "react";
import * as ReactDOM from "react-dom";
import { Presence } from "@radix-ui/react-presence";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { DraggableBlockPlugin_EXPERIMENTAL } from "@lexical/react/LexicalDraggableBlockPlugin";
import {
	$isTextNode,
	$getNodeByKey,
	$createTextNode,
	$isParagraphNode,
	$createParagraphNode,
	$getNearestNodeFromDOMNode,
	type NodeKey
} from "lexical";
import { PlusIcon, GripVerticalIcon } from "lucide-react";

import cn from "@/utils/cn";

import { Button } from "../../radix/Button";
import {
	Command,
	CommandItem,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandInput
} from "../../radix/Command";
import { useEditorModal } from "../editor-hooks/UseModal";
import { ComponentPickerOption } from "./picker/ComponentPickerOption";

const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

type PickerState = {
	insertBefore: boolean;
	targetNodeKey: NodeKey;
};

function isOnMenu(element: HTMLElement): boolean {
	return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

export function DraggableBlockPlugin({
	anchorElem,
	baseOptions = [],
	dynamicOptionsFn
}: {
	anchorElem: HTMLElement | null;
	baseOptions?: Array<ComponentPickerOption>;
	dynamicOptionsFn?: ({
		queryString
	}: {
		queryString: string;
	}) => Array<ComponentPickerOption>;
}): JSX.Element | null {
	const [editor] = useLexicalComposerContext();
	const [modal, showModal] = useEditorModal();
	const menuRef = useRef<HTMLDivElement>(null);
	const pickerRef = useRef<HTMLDivElement>(null);
	const targetLineRef = useRef<HTMLDivElement>(null);
	const [draggableElement, setDraggableElement] = useState<HTMLElement | null>(
		null
	);
	const [pickerState, setPickerState] = useState<PickerState | null>(null);
	const [isPickerOpen, setIsPickerOpen] = useState(false);
	const [queryString, setQueryString] = useState("");
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	const [pickerPosition, setPickerPosition] = useState<{
		left: number;
		top: number;
	} | null>(null);

	const options = useMemo(() => {
		if(!queryString)
			return baseOptions;

		const regex = new RegExp(queryString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
		return [
			...(dynamicOptionsFn?.({ queryString }) ?? []),
			...baseOptions.filter(
				option =>
					regex.test(option.title) ||
					option.keywords.some(keyword => regex.test(keyword))
			)
		];
	}, [baseOptions, dynamicOptionsFn, queryString]);

	useEffect(() => {
		if(!isPickerOpen) return;
		setHighlightedIndex(current =>
			Math.min(current, Math.max(options.length - 1, 0))
		);
	}, [isPickerOpen, options.length]);

	useEffect(() => {
		if(!isPickerOpen) return;
		let timeoutHandle = setTimeout(() => {
			if(menuRef.current != null)
				menuRef.current.style.display = "none";
			pickerRef.current?.querySelector("input")?.focus({ focusVisible: true });
			timeoutHandle = setTimeout(() => {
				if(menuRef.current != null)
					menuRef.current.style.display = "flex";
			});
		});
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node | null;
			if(
				(pickerRef.current && pickerRef.current.contains(target)) ||
				(menuRef.current && menuRef.current.contains(target))
			)
				return;

			setIsPickerOpen(false);
			setPickerState(null);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			clearTimeout(timeoutHandle);
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isPickerOpen]);

	const selectOption = useCallback(
		(option: ComponentPickerOption) => {
			if(!pickerState) {
				setIsPickerOpen(false);
				return;
			}
			setIsPickerOpen(false);
			editor.update(() => {
				const node = $getNodeByKey(pickerState.targetNodeKey);
				if(!node) return;
				const placeholder = $createParagraphNode();
				const textNode = $createTextNode("");
				placeholder.append(textNode);
				if(pickerState.insertBefore)
					node.insertBefore(placeholder);
				else
					node.insertAfter(placeholder);

				textNode.select();
				option.onSelect(queryString, editor, showModal);
				const latestPlaceholder = placeholder.getLatest();
				if($isParagraphNode(latestPlaceholder)) {
					const onlyChild = latestPlaceholder.getFirstChild();
					if(
						$isTextNode(onlyChild) &&
						onlyChild.getTextContent().length === 0 &&
						latestPlaceholder.getChildrenSize() === 1
					)
						latestPlaceholder.remove();
				}
			});
		},
		[editor, pickerState, queryString, showModal]
	);

	function openComponentPicker(e: React.MouseEvent) {
		if(!draggableElement || !editor) return;

		let targetNodeKey: NodeKey | null = null;
		editor.read(() => {
			const resolvedNode = $getNearestNodeFromDOMNode(draggableElement);
			if(resolvedNode)
				targetNodeKey = resolvedNode.getKey();
		});

		if(!targetNodeKey) return;

		const insertBefore = e.altKey || e.ctrlKey;
		const rect = menuRef.current?.getBoundingClientRect();
		setPickerPosition(
			rect ?
				{
					left: rect.left + rect.width + window.scrollX + 8,
					top: rect.top + window.scrollY
				} :
				null
		);
		setPickerState({ insertBefore, targetNodeKey });
		setQueryString("");
		setHighlightedIndex(0);
		setIsPickerOpen(true);
	}

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if(e.key != "Escape") return;
			if(!(e.target instanceof Node)) return;
			if(
				(pickerRef.current && pickerRef.current.contains(e.target)) ||
				(menuRef.current && menuRef.current.contains(e.target))
			) {
				e.stopImmediatePropagation();
				e.stopPropagation();
				e.preventDefault();
				setIsPickerOpen(false);
				setPickerState(null);
				editor.focus();
			}
		};
		globalThis.addEventListener("keydown", onKeyDown, { capture: true });
		return () => {
			globalThis.removeEventListener("keydown", onKeyDown);
		};
	}, [editor, setIsPickerOpen, setPickerState]);

	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
	useEffect(() => {
		if(highlightedIndex !== null && itemRefs.current[highlightedIndex]) {
			itemRefs.current[highlightedIndex]?.scrollIntoView({
				block: "nearest",
				behavior: "auto"
			});
		}
	}, [highlightedIndex]);

	if(!anchorElem) return null;

	return (
		<>
			{modal}
			{ReactDOM.createPortal((
				<Presence present={isPickerOpen && pickerPosition != null}>
					<div
						ref={pickerRef}
						className={cn(
							"absolute z-50 w-56 rounded-md shadow-md pointer-events-auto duration-100",
							isPickerOpen && pickerPosition != null ? "animate-in fade-in-0 zoom-in-95 slide-in-from-left-2" : "animate-out fade-out-0 zoom-out-95 slide-out-to-left-2"
						)}
						style={{
							left: pickerPosition?.left,
							top: pickerPosition?.top
						}}
					>
						<Command
							value={options[highlightedIndex ?? 0]?.title}
							onKeyDown={e => {
								if(e.key === "ArrowUp") {
									e.preventDefault();
									setHighlightedIndex((highlightedIndex - 1 + options.length) % options.length);
								} else if(e.key === "ArrowDown") {
									e.preventDefault();
									setHighlightedIndex((highlightedIndex + 1) % options.length);
								}
							}}
						>
							<CommandInput
								placeholder="Filter blocks..."
								value={queryString}
								onValueChange={setQueryString}
							/>
							<CommandList>
								<CommandEmpty>No results found.</CommandEmpty>
								<CommandGroup>
									{options.map((option, i) => (
										<CommandItem
											key={option.key}
											ref={el => {
												itemRefs.current[i] = el;
											}}
											value={option.title}
											onSelect={() => {
												setHighlightedIndex(i);
												selectOption(option);
											}}
											onMouseEnter={() => setHighlightedIndex(i)}
											className="flex items-center gap-2 whitespace-nowrap"
										>
											{option.icon}
											{option.title}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</div>
				</Presence>
			), document.body)}
			<DraggableBlockPlugin_EXPERIMENTAL
				anchorElem={anchorElem}
				menuRef={menuRef}
				targetLineRef={targetLineRef}
				menuComponent={(
					<div
						ref={menuRef}
						className="draggable-block-menu absolute top-0 left-0 flex items-center opacity-0 will-change-transform [translate:-4px_0]"
					>
						<Button
							variant="ghost"
							size="icon-xs"
							title="Click to add below (Alt/Ctrl: add above)"
							className="cursor-pointer rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
							onClick={openComponentPicker}
						>
							<PlusIcon />
						</Button>
						<Button
							variant="ghost"
							size="icon-xs"
							className="cursor-grab rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
							tabIndex={-1}
						>
							<GripVerticalIcon className="opacity-60" />
						</Button>
					</div>
				)}
				targetLineComponent={(
					<div
						ref={targetLineRef}
						className="bg-[linear-gradient(to_right,transparent_48px,var(--primary)_48px)] pointer-events-none absolute top-0 left-0 h-0.5 opacity-0 will-change-transform"
					/>
				)}
				isOnMenu={isOnMenu}
				onElementChanged={setDraggableElement}
			/>
		</>
	);
}
