/* eslint-disable no-restricted-syntax */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { useRef, useState, useEffect, type JSX } from "react";
import {
	$isLinkNode,
	$isAutoLinkNode,
	TOGGLE_LINK_COMMAND,
	type LinkNode
} from "@lexical/link";
import { mergeRegister, $wrapNodeInElement } from "@lexical/utils";
import {
	$insertNodes,
	DROP_COMMAND,
	$getSelection,
	$setSelection,
	createCommand,
	isHTMLElement,
	defineExtension,
	$isNodeSelection,
	DRAGOVER_COMMAND,
	DRAGSTART_COMMAND,
	$findMatchingParent,
	$isRootOrShadowRoot,
	$createParagraphNode,
	COMMAND_PRIORITY_LOW,
	$createRangeSelection,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_EDITOR,
	getDOMSelectionFromTarget,
	type LexicalEditor,
	type LexicalCommand
} from "lexical";
import { CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "../../radix/Alert";
import { Button } from "../../radix/Button";
import { DialogFooter } from "../../radix/Dialog";
import { Field, FieldGroup, FieldLabel } from "../../radix/Field";
import { Input } from "../../radix/Input";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "../../radix/Tabs";
import {
	ImageNode,
	$isImageNode,
	$createImageNode,
	type ImagePayload
} from "../nodes/ImageNode";

export type InsertImagePayload = Readonly<ImagePayload>;

export interface UploadedImage {
	altText: string;
	height?: number;
	src: string;
	width?: number;
}

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
	createCommand("INSERT_IMAGE_COMMAND");

export function InsertImageUriDialogBody({
	onClick
}: {
	onClick: (payload: InsertImagePayload) => void;
}) {
	const [src, setSrc] = useState("");
	const [altText, setAltText] = useState("");

	const isDisabled = src === "";

	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor="image-url">Image URL</FieldLabel>
				<Input
					id="image-url"
					placeholder="i.e. https://source.unsplash.com/random"
					onChange={e => setSrc(e.target.value)}
					value={src}
					data-test-id="image-modal-url-input"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="alt-text">Alt Text</FieldLabel>
				<Input
					id="alt-text"
					placeholder="Random unsplash image"
					onChange={e => setAltText(e.target.value)}
					value={altText}
					data-test-id="image-modal-alt-text-input"
				/>
			</Field>
			<DialogFooter>
				<Button
					type="submit"
					disabled={isDisabled}
					onClick={() => onClick({ altText, src })}
					data-test-id="image-modal-confirm-btn"
				>
					Confirm
				</Button>
			</DialogFooter>
		</FieldGroup>
	);
}

export function InsertImageUploadedDialogBody({
	onClick,
	onUpload
}: {
	onClick: (payload: InsertImagePayload) => void;
	onUpload: (formData: FormData) => Promise<UploadedImage>;
}) {
	const [error, setError] = useState<any>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [altText, setAltText] = useState("");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const inputFileRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		const dataTransfer = new DataTransfer();
		if(selectedFile != null)
			dataTransfer.items.add(selectedFile);
		inputFileRef.current!.files = dataTransfer.files;
	}, [selectedFile]);

	return (
		<>
			{error != null ? (
				<Alert variant="destructive" className="mb-2">
					<CircleAlertIcon />
					<AlertTitle>{error.name ?? "Error"}</AlertTitle>
					<AlertDescription>{error.message ?? "Unable to upload image"}</AlertDescription>
				</Alert>
			) : null}
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="image-upload">Image Upload</FieldLabel>
					<Input
						ref={inputFileRef}
						id="image-upload"
						type="file"
						onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
						disabled={isUploading}
						accept="image/*"
						data-test-id="image-modal-file-upload"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="alt-text">Alt Text</FieldLabel>
					<Input
						id="alt-text"
						placeholder="Descriptive alternative text"
						onChange={e => setAltText(e.target.value)}
						value={altText}
						disabled={isUploading}
						data-test-id="image-modal-alt-text-input"
					/>
				</Field>
				<DialogFooter>
					<Button
						type="submit"
						disabled={selectedFile == null || isUploading}
						onClick={async () => {
							if(selectedFile == null) return;
							try {
								setIsUploading(true);
								const formData = new FormData();
								formData.set("altText", altText);
								formData.set("image", selectedFile);
								const uploadedImage = await onUpload(formData);
								onClick({
									altText: uploadedImage.altText,
									height: uploadedImage.height,
									src: uploadedImage.src,
									width: uploadedImage.width
								});
							} catch(e) {
								setError(e);
							} finally {
								setIsUploading(false);
							}
						}}
						data-test-id="image-modal-file-upload-btn"
					>
						Confirm
					</Button>
				</DialogFooter>
			</FieldGroup>
		</>
	);
}

export function InsertImageDialog({
	activeEditor,
	onClose,
	onUpload
}: {
	activeEditor: LexicalEditor;
	onClose: () => void;
	onUpload: (formData: FormData) => Promise<UploadedImage>;
}): JSX.Element {
	const hasModifier = useRef(false);

	useEffect(() => {
		hasModifier.current = false;
		const handler = (e: KeyboardEvent) => {
			hasModifier.current = e.altKey;
		};
		document.addEventListener("keydown", handler);
		return () => {
			document.removeEventListener("keydown", handler);
		};
	}, [activeEditor]);

	const onClick = (payload: InsertImagePayload) => {
		activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
		onClose();
	};

	return (
		<Tabs defaultValue="url">
			<TabsList className="w-full">
				<TabsTrigger value="url">URL</TabsTrigger>
				<TabsTrigger value="file">File</TabsTrigger>
			</TabsList>
			<TabsContent value="url">
				<InsertImageUriDialogBody onClick={onClick} />
			</TabsContent>
			<TabsContent value="file">
				<InsertImageUploadedDialogBody onClick={onClick} onUpload={onUpload} />
			</TabsContent>
		</Tabs>
	);
}

export const ImagesExtension = defineExtension({
	name: "@shadcn-editor/Images",
	nodes: [ImageNode],
	register: editor =>
		mergeRegister(
			editor.registerCommand<InsertImagePayload>(
				INSERT_IMAGE_COMMAND,
				payload => {
					const imageNode = $createImageNode(payload);
					$insertNodes([imageNode]);
					if($isRootOrShadowRoot(imageNode.getParentOrThrow()))
						$wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();

					return true;
				},
				COMMAND_PRIORITY_EDITOR
			),
			editor.registerCommand<DragEvent>(
				DRAGSTART_COMMAND,
				event => $onDragStart(event),
				COMMAND_PRIORITY_HIGH
			),
			editor.registerCommand<DragEvent>(
				DRAGOVER_COMMAND,
				event => $onDragover(event),
				COMMAND_PRIORITY_LOW
			),
			editor.registerCommand<DragEvent>(
				DROP_COMMAND,
				event => $onDrop(event, editor),
				COMMAND_PRIORITY_HIGH
			)
		)
});

let TRANSPARENT_IMAGE = null as HTMLImageElement | null;

function $onDragStart(event: DragEvent): boolean {
	const node = $getImageNodeInSelection();
	if(!node)
		return false;

	const dataTransfer = event.dataTransfer;
	if(!dataTransfer)
		return false;

	if(TRANSPARENT_IMAGE == null) {
		TRANSPARENT_IMAGE = document.createElement("img");
		TRANSPARENT_IMAGE.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
	}
	dataTransfer.setData("text/plain", "_");
	dataTransfer.setDragImage(TRANSPARENT_IMAGE, 0, 0);
	dataTransfer.setData(
		"application/x-lexical-drag",
		JSON.stringify({
			data: {
				altText: node.__altText,
				height: node.__height,
				key: node.getKey(),
				maxWidth: node.__maxWidth,
				src: node.__src,
				width: node.__width
			},
			type: "image"
		})
	);

	return true;
}

function $onDragover(event: DragEvent): boolean {
	const node = $getImageNodeInSelection();
	if(!node)
		return false;

	if(!canDropImage(event))
		event.preventDefault();

	return false;
}

function $onDrop(event: DragEvent, editor: LexicalEditor): boolean {
	const node = $getImageNodeInSelection();
	if(!node)
		return false;

	const data = getDragImageData(event);
	if(!data)
		return false;

	const existingLink = $findMatchingParent(
		node,
		(parent): parent is LinkNode =>
			!$isAutoLinkNode(parent) && $isLinkNode(parent)
	);
	event.preventDefault();
	if(canDropImage(event)) {
		const range = getDragSelection(event);
		node.remove();
		const rangeSelection = $createRangeSelection();
		if(range !== null && range !== undefined)
			rangeSelection.applyDOMRange(range);

		$setSelection(rangeSelection);
		editor.dispatchCommand(INSERT_IMAGE_COMMAND, data);
		if(existingLink)
			editor.dispatchCommand(TOGGLE_LINK_COMMAND, existingLink.getURL());
	}
	return true;
}

function $getImageNodeInSelection(): ImageNode | null {
	const selection = $getSelection();
	if(!$isNodeSelection(selection))
		return null;

	const nodes = selection.getNodes();
	const node = nodes[0];
	return $isImageNode(node) ? node : null;
}

function getDragImageData(event: DragEvent): null | InsertImagePayload {
	const dragData = event.dataTransfer?.getData("application/x-lexical-drag");
	if(!dragData)
		return null;

	const { type, data } = JSON.parse(dragData);
	if(type !== "image")
		return null;

	return data;
}

declare global {
	interface DragEvent {
		rangeOffset?: number;
		rangeParent?: Node;
	}
}

function canDropImage(event: DragEvent): boolean {
	const target = event.target;
	return !!(
		isHTMLElement(target) &&
		!target.closest("code, span.editor-image") &&
		isHTMLElement(target.parentElement) &&
		target.parentElement.closest("div.ContentEditable__root")
	);
}

function getDragSelection(event: DragEvent): Range | null | undefined {
	let range;
	const domSelection = getDOMSelectionFromTarget(event.target);
	if(document.caretRangeFromPoint)
		range = document.caretRangeFromPoint(event.clientX, event.clientY);
	else if(event.rangeParent && domSelection !== null) {
		domSelection.collapse(event.rangeParent, event.rangeOffset || 0);
		range = domSelection.getRangeAt(0);
	} else
		throw Error("Cannot get the selection when dragging");

	return range;
}
