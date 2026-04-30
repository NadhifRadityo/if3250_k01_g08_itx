"use client";

/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import * as React from "react";
import {
	EyeIcon,
	CopyIcon,
	PlusIcon,
	Trash2Icon,
	ArrowUpIcon,
	ArrowDownIcon,
	RefreshCcwIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	GripVerticalIcon,
	ClipboardPasteIcon,
	LayoutTemplateIcon
} from "lucide-react";

import cn from "@/utils/cn";

import Form, {
	type FormProps,
	type JsonPageMode,
	type JsonFieldType,
	type JsonFormBlock,
	type JsonFormSlide,
	type JsonSlideKind,
	type JsonFieldBlock,
	type JsonColorScheme,
	type JsonRoundedMode,
	type JsonContentBlock,
	type JsonFormSettings,
	type FormSubmitPayload,
	type JsonSlidePostMode,
	type JsonFormDefinition,
	type JsonRenderableText,
	type JsonButtonAlignment,
	type JsonConditionConfig,
	type JsonChoiceFieldBlock,
	type JsonPageProgressMode,
	type JsonVerticalAlignment,
	type JsonPictureChoiceFieldBlock
} from "./Form";
import { Badge } from "./radix/Badge";
import { Button } from "./radix/Button";
import {
	Card,
	CardTitle,
	CardAction,
	CardHeader,
	CardContent,
	CardDescription
} from "./radix/Card";
import { Collapsible, CollapsibleContent } from "./radix/Collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./radix/HoverCard";
import { Input } from "./radix/Input";
import {
	Select,
	SelectItem,
	SelectValue,
	SelectContent,
	SelectTrigger
} from "./radix/Select";
import { Switch } from "./radix/Switch";
import { Textarea } from "./radix/Textarea";

export type FormEditorProps = {
	className?: string;
	defaultValue?: JsonFormDefinition;
	mode?: "edit" | "readonly";
	onChange?: (value: JsonFormDefinition) => void;
	onPreviewPartialSubmit?: (payload: FormSubmitPayload) => Promise<void> | void;
	onPreviewSubmit?: (payload: FormSubmitPayload) => Promise<void> | void;
	previewClassName?: string;
	previewInitialValues?: FormProps["initialValues"];
	value?: JsonFormDefinition;
};

type EditorBlock = JsonFormBlock & {
	editorId: string;
};

type EditorSlide = Omit<JsonFormSlide, "blocks"> & {
	blocks: EditorBlock[];
	editorId: string;
};

type EditorForm = Omit<JsonFormDefinition, "slides"> & {
	slides: EditorSlide[];
};

type ClipboardState =
	| {
		scope: "block";
		block: EditorBlock;
	} |
	{
		scope: "slide";
		slide: EditorSlide;
	} |
	null;

type DragState =
	| {
		draggedId: string;
		scope: "slide";
	} |
	{
		draggedId: string;
		scope: "block";
		slideId: string;
	} |
	null;

type AddItem<TValue extends string> = {
	description?: string;
	label: string;
	value: TValue;
};

type SimpleConditionOperator =
	"equals" |
	"notEquals" |
	"greaterThan" |
	"greaterThanOrEqual" |
	"lessThan" |
	"lessThanOrEqual" |
	"includes" |
	"matches";

type EditableCondition = {
	field: string;
	operator: SimpleConditionOperator;
	value: string;
};

type FieldReference = {
	label: string;
	name: string;
};

const EMPTY_SELECT_VALUE = "__empty__";

const FIELD_TYPES = new Set<JsonFieldType>([
	"text",
	"email",
	"url",
	"tel",
	"password",
	"number",
	"select",
	"choice",
	"pictureChoice",
	"rating",
	"opinionScale",
	"datetime",
	"date",
	"time",
	"file"
]);

const FIELD_TYPE_ALIASES = new Set(["field", "text"]);

const SLIDE_KIND_ITEMS: Array<AddItem<JsonSlideKind>> = [
	{
		description: "A welcome or intro screen.",
		label: "Intro Screen",
		value: "start"
	},
	{
		description: "A regular question screen.",
		label: "Question Screen",
		value: "slide"
	},
	{
		description: "A completion or thank-you screen.",
		label: "Finish Screen",
		value: "end"
	}
];

const BLOCK_TYPE_ITEMS: Array<AddItem<JsonFormBlock["type"]>> = [
	{
		description: "A large headline for the screen.",
		label: "Heading",
		value: "heading"
	},
	{
		description: "Paragraph-style body copy.",
		label: "Paragraph",
		value: "copy"
	},
	{
		description: "Muted supporting text.",
		label: "Description",
		value: "description"
	},
	{
		description: "Short helper guidance.",
		label: "Helper Note",
		value: "helper"
	},
	{
		description: "A divider with an optional label.",
		label: "Divider",
		value: "divider"
	},
	{
		description: "An image or video block.",
		label: "Media",
		value: "media"
	},
	{
		description: "A one-line or multiline text answer.",
		label: "Text Question",
		value: "text"
	},
	{
		description: "Collect an email address.",
		label: "Email Question",
		value: "email"
	},
	{
		description: "Collect a website or link.",
		label: "URL Question",
		value: "url"
	},
	{
		description: "Collect a phone number.",
		label: "Phone Question",
		value: "tel"
	},
	{
		description: "Collect a password-style answer.",
		label: "Password Question",
		value: "password"
	},
	{
		description: "Collect a numeric answer.",
		label: "Number Question",
		value: "number"
	},
	{
		description: "Let people pick from a dropdown.",
		label: "Dropdown Question",
		value: "select"
	},
	{
		description: "Let people choose one or more options.",
		label: "Choice Question",
		value: "choice"
	},
	{
		description: "Choose from image-based options.",
		label: "Picture Choice",
		value: "pictureChoice"
	},
	{
		description: "Collect a star or heart rating.",
		label: "Rating Question",
		value: "rating"
	},
	{
		description: "Collect a numbered opinion score.",
		label: "Opinion Scale",
		value: "opinionScale"
	},
	{
		description: "Pick a date and time.",
		label: "Date & Time",
		value: "datetime"
	},
	{
		description: "Pick a date only.",
		label: "Date",
		value: "date"
	},
	{
		description: "Pick a time only.",
		label: "Time",
		value: "time"
	},
	{
		description: "Upload a file.",
		label: "File Upload",
		value: "file"
	}
];

const BLOCK_LABELS: Record<string, string> = {
	choice: "Choice Question",
	copy: "Paragraph",
	date: "Date",
	description: "Description",
	datetime: "Date & Time",
	divider: "Divider",
	email: "Email Question",
	file: "File Upload",
	heading: "Heading",
	helper: "Helper Note",
	media: "Media",
	number: "Number Question",
	opinionScale: "Opinion Scale",
	password: "Password Question",
	pictureChoice: "Picture Choice",
	rating: "Rating Question",
	select: "Dropdown Question",
	tel: "Phone Question",
	text: "Text Question",
	time: "Time",
	url: "URL Question"
};

const CONDITION_OPERATOR_ITEMS: Array<AddItem<SimpleConditionOperator>> = [
	{ label: "is", value: "equals" },
	{ label: "is not", value: "notEquals" },
	{ label: "is greater than", value: "greaterThan" },
	{ label: "is at least", value: "greaterThanOrEqual" },
	{ label: "is less than", value: "lessThan" },
	{ label: "is at most", value: "lessThanOrEqual" },
	{ label: "includes", value: "includes" },
	{ label: "matches pattern", value: "matches" }
];

const COLOR_SCHEME_ITEMS: Array<AddItem<JsonColorScheme>> = [
	{ label: "Light", value: "light" },
	{ label: "Dark", value: "dark" },
	{ label: "Follow device", value: "system" }
];

const PAGE_MODE_ITEMS: Array<AddItem<JsonPageMode>> = [
	{ label: "Standard form", value: "form-slides" },
	{ label: "Single page", value: "single" },
	{ label: "Frameless slides", value: "slides" }
];

const PAGE_PROGRESS_ITEMS: Array<AddItem<JsonPageProgressMode>> = [
	{ label: "Show progress", value: "show" },
	{ label: "Progress bar only", value: "decorative" },
	{ label: "Hide progress", value: "hide" }
];

const ROUNDED_ITEMS: Array<AddItem<JsonRoundedMode>> = [
	{ label: "Default corners", value: "default" },
	{ label: "Pill corners", value: "pill" },
	{ label: "Square corners", value: "none" }
];

const BUTTON_ALIGNMENT_ITEMS: Array<AddItem<JsonButtonAlignment>> = [
	{ label: "Left", value: "start" },
	{ label: "Center", value: "center" },
	{ label: "Right", value: "end" },
	{ label: "Stretch", value: "stretch" }
];

const VERTICAL_ALIGNMENT_ITEMS: Array<AddItem<JsonVerticalAlignment>> = [
	{ label: "Top", value: "start" },
	{ label: "Center", value: "center" },
	{ label: "Bottom", value: "end" }
];

const SLIDE_POST_ITEMS: Array<AddItem<JsonSlidePostMode | "none">> = [
	{ label: "Don’t auto-save", value: "none" },
	{ label: "Save when continuing", value: "slide-progress" },
	{ label: "Save on every answer", value: "every-change" }
];

const LANG_ITEMS: Array<AddItem<string>> = [
	{ label: "English", value: "en-US" },
	{ label: "Bahasa Indonesia", value: "id-ID" }
];

function createEditorId(): string {
	if(typeof crypto != "undefined" && typeof crypto.randomUUID == "function")
		return crypto.randomUUID();

	return `editor-${Math.random().toString(36).slice(2, 10)}`;
}

function createToken(prefix: string): string {
	return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneJson<TValue>(value: TValue): TValue {
	if(typeof structuredClone == "function")
		return structuredClone(value);

	return JSON.parse(JSON.stringify(value)) as TValue;
}

function insertAt<TValue>(items: TValue[], index: number, item: TValue): TValue[] {
	const nextItems = [...items];
	nextItems.splice(index, 0, item);
	return nextItems;
}

function moveItem<TValue>(items: TValue[], fromIndex: number, toIndex: number): TValue[] {
	if(fromIndex == toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length)
		return items;

	const nextItems = [...items];
	const [item] = nextItems.splice(fromIndex, 1);
	nextItems.splice(toIndex, 0, item);
	return nextItems;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) == "[object Object]";
}

function withOptionalString<TValue extends Record<string, unknown>>(value: TValue, key: string, next: string): TValue {
	const normalized = next.trim();
	const output = { ...value } as Record<string, unknown>;

	if(normalized.length == 0)
		delete output[key];
	else
		output[key] = next;

	return output as TValue;
}

function withOptionalNumber<TValue extends Record<string, unknown>>(value: TValue, key: string, next: string): TValue {
	const normalized = next.trim();
	const output = { ...value } as Record<string, unknown>;

	if(normalized.length == 0) {
		delete output[key];
		return output as TValue;
	}

	const parsed = Number(normalized);
	if(Number.isNaN(parsed))
		return output as TValue;

	output[key] = parsed;
	return output as TValue;
}

function getSlideKind(slide: JsonFormSlide | EditorSlide): JsonSlideKind {
	return slide.kind ?? slide.type ?? "slide";
}

function getEditorFieldType(block: JsonFormBlock | EditorBlock): JsonFieldType | null {
	if(!isPlainObject(block))
		return null;

	if("name" in block && typeof block.name == "string") {
		if(typeof block.fieldType == "string" && FIELD_TYPES.has(block.fieldType))
			return block.fieldType;
		if(typeof block.type == "string" && FIELD_TYPE_ALIASES.has(block.type))
			return "text";
		if(typeof block.type == "string" && FIELD_TYPES.has(block.type as JsonFieldType))
			return block.type as JsonFieldType;
	}

	return null;
}

function isFieldBlock(block: JsonFormBlock | EditorBlock): block is JsonFieldBlock | EditorBlock {
	return getEditorFieldType(block) != null;
}

function getPlainRenderableText(value: JsonRenderableText | undefined): string {
	if(value == null)
		return "";

	if(typeof value == "string" || typeof value == "number")
		return String(value);

	if(Array.isArray(value) && value.every(part => typeof part == "string" || typeof part == "number"))
		return value.join("");

	return "";
}

function summarizeRenderableText(value: JsonRenderableText | undefined, fallback: string): string {
	const plainText = getPlainRenderableText(value).trim();
	if(plainText.length > 0)
		return plainText;

	if(value != null)
		return fallback;

	return "";
}

function getLocalizationCode(localization: JsonFormSettings["localization"]): string {
	return typeof localization == "string" ? localization : "en-US";
}

function getSlideBadgeLabel(kind: JsonSlideKind): string {
	if(kind == "start")
		return "Intro Screen";
	if(kind == "end")
		return "Finish Screen";
	return "Question Screen";
}

function getBlockBadgeLabel(block: EditorBlock): string {
	const fieldType = getEditorFieldType(block);
	if(fieldType != null)
		return BLOCK_LABELS[fieldType] ?? BLOCK_LABELS[block.type] ?? "Question";

	return BLOCK_LABELS[block.type] ?? "Content";
}

function getSlideSummary(slide: EditorSlide, index: number): string {
	const title = summarizeRenderableText(slide.title, "");
	if(title)
		return title;

	return `${getSlideBadgeLabel(getSlideKind(slide))} ${index + 1}`;
}

function getBlockSummary(block: EditorBlock, index: number): string {
	if(isFieldBlock(block)) {
		const question = summarizeRenderableText(block.question, "");
		if(question)
			return question;

		return `${getBlockBadgeLabel(block)} ${index + 1}`;
	}

	switch(block.type) {
		case "heading":
			return summarizeRenderableText(block.text, "Heading");
		case "description":
		case "helper":
			return summarizeRenderableText(block.text ?? block.content, getBlockBadgeLabel(block));
		case "divider":
			return summarizeRenderableText(block.label, "Divider");
		case "media":
			return summarizeRenderableText(block.caption ?? block.alt ?? block.src, "Media");
		case "copy":
		case "text":
		default:
			return summarizeRenderableText(block.text ?? block.content, getBlockBadgeLabel(block));
	}
}

function splitNonEmptyLines(value: string): string[] {
	return value
		.split(/\r?\n/u)
		.map(item => item.trim())
		.filter(Boolean);
}

function parseStringList(value: string): string[] {
	return value
		.split(",")
		.map(item => item.trim())
		.filter(Boolean);
}

function serializeStringList(values: string[] | undefined): string {
	return (values ?? []).join(", ");
}

function serializeOptionsText(options: Array<string | { label: JsonRenderableText, value?: string }> | undefined): string {
	return (options ?? [])
		.map(option => {
			if(typeof option == "string")
				return option;

			const label = summarizeRenderableText(option.label, "Option");
			return option.value && option.value != label ? `${label} | ${option.value}` : label;
		})
		.join("\n");
}

function parseOptionsText(value: string): Array<string | { label: string, value?: string }> {
	return splitNonEmptyLines(value).map(line => {
		const [label = "", rawValue = ""] = line.split("|").map(item => item.trim());
		if(rawValue.length == 0)
			return label;

		return {
			label,
			value: rawValue
		};
	});
}

function serializePictureChoicesText(choices: JsonPictureChoiceFieldBlock["choices"] | undefined): string {
	return (choices ?? [])
		.map(choice => {
			const label = summarizeRenderableText(choice.label, "Choice");
			return `${label} | ${choice.value ?? ""} | ${summarizeRenderableText(choice.image, "")}`;
		})
		.join("\n");
}

function parsePictureChoicesText(value: string): JsonPictureChoiceFieldBlock["choices"] {
	return splitNonEmptyLines(value).map(line => {
		const [label = "", rawValue = "", image = ""] = line.split("|").map(item => item.trim());
		return {
			image,
			label,
			value: rawValue.length > 0 ? rawValue : undefined
		};
	});
}

function serializeCheckedValue(value: string | string[] | undefined): string {
	if(Array.isArray(value))
		return value.join(", ");

	return value ?? "";
}

function parseCheckedValue(value: string, multiple: boolean): string | string[] | undefined {
	const normalized = value.trim();
	if(normalized.length == 0)
		return undefined;

	return multiple ? parseStringList(value) : normalized;
}

function stringifyConditionValue(value: unknown): string {
	if(value == null)
		return "";
	if(typeof value == "string" || typeof value == "number" || typeof value == "boolean")
		return String(value);
	return JSON.stringify(value);
}

function parseConditionValue(value: string, operator: SimpleConditionOperator): unknown {
	if(operator == "matches")
		return value;

	const trimmed = value.trim();
	if(trimmed == "true")
		return true;
	if(trimmed == "false")
		return false;

	const numericValue = Number(trimmed);
	if(trimmed.length > 0 && !Number.isNaN(numericValue))
		return numericValue;

	return value;
}

function unwrapSimpleCondition(condition: JsonConditionConfig | undefined): {
	draft: EditableCondition | null;
	hasUnsupportedCondition: boolean;
} {
	if(condition == null) {
		return {
			draft: null,
			hasUnsupportedCondition: false
		};
	}

	const candidate = isPlainObject(condition) && "condition" in condition ? condition.condition : condition;
	if(!isPlainObject(candidate) || typeof candidate.field != "string") {
		return {
			draft: null,
			hasUnsupportedCondition: true
		};
	}

	const operatorMap: Array<[SimpleConditionOperator, string]> = [
		["equals", "equals"],
		["notEquals", "notEquals"],
		["greaterThan", "greaterThan"],
		["greaterThanOrEqual", "greaterThanOrEqual"],
		["lessThan", "lessThan"],
		["lessThanOrEqual", "lessThanOrEqual"],
		["includes", "includes"],
		["matches", "matches"]
	];

	for(const [operator, key] of operatorMap) {
		if(key in candidate) {
			return {
				draft: {
					field: candidate.field,
					operator,
					value: stringifyConditionValue(candidate[key])
				},
				hasUnsupportedCondition: false
			};
		}
	}

	return {
		draft: null,
		hasUnsupportedCondition: true
	};
}

function buildSimpleCondition(draft: EditableCondition): JsonConditionConfig | undefined {
	const field = draft.field.trim();
	const value = draft.value.trim();

	if(field.length == 0 || value.length == 0)
		return undefined;

	const parsedValue = parseConditionValue(value, draft.operator);
	switch(draft.operator) {
		case "equals":
			return { field, equals: parsedValue };
		case "notEquals":
			return { field, notEquals: parsedValue };
		case "greaterThan":
			return { field, greaterThan: parsedValue };
		case "greaterThanOrEqual":
			return { field, greaterThanOrEqual: parsedValue };
		case "lessThan":
			return { field, lessThan: parsedValue };
		case "lessThanOrEqual":
			return { field, lessThanOrEqual: parsedValue };
		case "includes":
			return { field, includes: parsedValue };
		case "matches":
			return { field, matches: String(parsedValue) };
		default:
			return undefined;
	}
}

function ensureFieldName(block: JsonFormBlock): JsonFormBlock {
	if(!isFieldBlock(block))
		return block;

	if(typeof block.name == "string" && block.name.trim().length > 0)
		return block;

	return {
		...block,
		name: createToken(getEditorFieldType(block) ?? "field")
	};
}

function ensureSlideIdentity(slide: JsonFormSlide): JsonFormSlide {
	return {
		...slide,
		id: typeof slide.id == "string" && slide.id.trim().length > 0 ? slide.id : createToken("slide"),
		blocks: (slide.blocks ?? []).map(block => ensureFieldName(block))
	};
}

function normalizeBlock(block: JsonFormBlock): EditorBlock {
	return {
		...cloneJson(ensureFieldName(block)),
		editorId: createEditorId()
	};
}

function normalizeSlide(slide: JsonFormSlide): EditorSlide {
	const normalizedSlide = ensureSlideIdentity(cloneJson(slide));
	const {
		blocks = [],
		...slideRest
	} = normalizedSlide;

	return {
		...slideRest,
		blocks: blocks.map(block => normalizeBlock(block)),
		editorId: createEditorId()
	};
}

function normalizeForm(form: JsonFormDefinition): EditorForm {
	const normalizedForm = cloneJson(form);
	return {
		...normalizedForm,
		slides: normalizedForm.slides.map(slide => normalizeSlide(slide))
	};
}

function serializeBlock(block: EditorBlock): JsonFormBlock {
	const {
		editorId: _editorId,
		...blockRest
	} = cloneJson(block);

	return ensureFieldName(blockRest);
}

function serializeSlide(slide: EditorSlide): JsonFormSlide {
	const {
		editorId: _editorId,
		blocks,
		...slideRest
	} = cloneJson(slide);

	return ensureSlideIdentity({
		...slideRest,
		blocks: blocks.map(block => serializeBlock(block))
	});
}

function serializeForm(form: EditorForm): JsonFormDefinition {
	const {
		slides,
		...formRest
	} = cloneJson(form);

	return {
		...formRest,
		slides: slides.map(slide => serializeSlide(slide))
	};
}

function cloneEditorBlock(block: EditorBlock): EditorBlock {
	const rawBlock = serializeBlock(block);
	const fieldType = getEditorFieldType(rawBlock);
	const nextBlock = cloneJson(rawBlock);

	if(fieldType != null) {
		nextBlock.name = createToken(fieldType);
		nextBlock.id = createToken(fieldType);
	} else if(typeof nextBlock.id == "string")
		nextBlock.id = createToken(nextBlock.type);

	return normalizeBlock(nextBlock);
}

function cloneEditorSlide(slide: EditorSlide): EditorSlide {
	const rawSlide = serializeSlide(slide);
	const nextSlide = cloneJson(rawSlide);
	nextSlide.id = createToken("slide");
	nextSlide.blocks = (nextSlide.blocks ?? []).map(block => {
		const fieldType = getEditorFieldType(block);
		if(fieldType != null) {
			return {
				...block,
				id: createToken(fieldType),
				name: createToken(fieldType)
			};
		}

		if(typeof block.id == "string")
			return { ...block, id: createToken(block.type) };

		return block;
	});

	return normalizeSlide(nextSlide);
}

function createDefaultBlock(type: JsonFormBlock["type"]): JsonFormBlock {
	switch(type) {
		case "heading":
			return {
				level: 2,
				text: "Section heading",
				type
			};
		case "description":
			return {
				text: "Add supporting detail for this screen.",
				type
			};
		case "helper":
			return {
				text: "Use this space for a quick hint or note.",
				type
			};
		case "divider":
			return {
				label: "Section label",
				type
			};
		case "media":
			return {
				alt: "Preview media",
				aspectRatio: 1.7,
				caption: "Replace this with your own image or video.",
				fit: "cover",
				mediaType: "image",
				src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
				type
			};
		case "email":
			return {
				name: createToken("email"),
				placeholder: "name@example.com",
				question: "What is your email address?",
				type
			};
		case "url":
			return {
				name: createToken("url"),
				placeholder: "https://example.com",
				question: "Share a helpful link",
				type
			};
		case "tel":
			return {
				availableCountries: ["ID", "SG", "US"],
				country: "ID",
				name: createToken("phone"),
				placeholder: "812-3456-7890",
				question: "What is your phone number?",
				type
			};
		case "password":
			return {
				name: createToken("password"),
				placeholder: "Enter a password",
				question: "Set a password",
				type
			};
		case "number":
			return {
				max: 100,
				min: 0,
				name: createToken("number"),
				placeholder: "0",
				question: "Enter a number",
				step: 1,
				type
			};
		case "select":
			return {
				name: createToken("select"),
				options: ["Option A", "Option B", "Option C"],
				placeholder: "Choose one",
				question: "Pick one option",
				type
			};
		case "choice":
			return {
				choices: ["Choice A", "Choice B", "Choice C"],
				name: createToken("choice"),
				question: "Choose one or more options",
				type
			};
		case "pictureChoice":
			return {
				choices: [
					{
						image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80",
						label: "Desktop workspace",
						value: "desktop"
					},
					{
						image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80",
						label: "Mobile workflow",
						value: "mobile"
					}
				],
				name: createToken("picture"),
				question: "Which visual direction fits best?",
				type
			};
		case "rating":
			return {
				icon: "star",
				name: createToken("rating"),
				outOf: 5,
				question: "How would you rate this?",
				type
			};
		case "opinionScale":
			return {
				labelEnd: "Very likely",
				labelStart: "Not likely",
				name: createToken("opinion"),
				outOf: 10,
				question: "How likely are you to recommend this?",
				startAt: 0,
				type
			};
		case "datetime":
			return {
				name: createToken("datetime"),
				question: "Pick a date and time",
				type
			};
		case "date":
			return {
				name: createToken("date"),
				question: "Pick a date",
				type
			};
		case "time":
			return {
				name: createToken("time"),
				question: "Pick a time",
				type
			};
		case "file":
			return {
				name: createToken("file"),
				question: "Upload a file",
				sizeLimit: 5,
				type
			};
		case "copy":
			return {
				text: "Add paragraph copy here.",
				type
			};
		case "text":
		default:
			return {
				name: createToken("text"),
				placeholder: "Type your answer",
				question: "Ask a text question",
				type: "text"
			};
	}
}

function createDefaultSlide(kind: JsonSlideKind): JsonFormSlide {
	if(kind == "start") {
		return {
			blocks: [
				{
					align: "center",
					level: 1,
					text: "Welcome to your form",
					type: "heading"
				},
				{
					align: "center",
					text: "Use this first screen to introduce the survey or explain what happens next.",
					type: "description"
				}
			],
			buttonText: "Start",
			id: createToken("start"),
			kind,
			title: "Welcome"
		};
	}

	if(kind == "end") {
		return {
			blocks: [
				{
					align: "center",
					level: 1,
					text: "Thanks for your response",
					type: "heading"
				},
				{
					align: "center",
					text: "Use this final screen to confirm submission or guide people to the next step.",
					type: "description"
				}
			],
			id: createToken("end"),
			kind,
			title: "All done"
		};
	}

	return {
		blocks: [
			{
				level: 2,
				text: "New question screen",
				type: "heading"
			},
			{
				name: createToken("text"),
				placeholder: "Type your answer",
				question: "What should this screen ask?",
				required: true,
				type: "text"
			}
		],
		id: createToken("slide"),
		kind,
		title: "New question"
	};
}

function createDefaultForm(): JsonFormDefinition {
	return {
		description: "Build your form by arranging screens and questions.",
		id: createToken("form"),
		settings: {
			buttonAlignment: "start",
			colorScheme: "light",
			formsmdBranding: "hide",
			isFullPage: false,
			localization: "en-US",
			page: "form-slides",
			pageProgress: "show",
			placeholders: "show",
			restartButton: "show",
			rounded: "default",
			sanitize: true,
			saveState: false,
			slideControls: "show",
			verticalAlignment: "start"
		},
		slides: [
			createDefaultSlide("start"),
			createDefaultSlide("slide"),
			createDefaultSlide("end")
		],
		title: "Untitled Form"
	};
}

function ActionButton({
	children,
	className,
	disabled = false,
	onClick,
	title,
	variant = "ghost"
}: {
	children: React.ReactNode;
	className?: string;
	disabled?: boolean;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	title: string;
	variant?: "destructive" | "ghost";
}) {
	return (
		<Button
			aria-label={title}
			className={className}
			disabled={disabled}
			onClick={onClick}
			size="icon-xs"
			title={title}
			type="button"
			variant={variant}
		>
			{children}
		</Button>
	);
}

function ToggleField({
	checked,
	label,
	onCheckedChange
}: {
	checked: boolean;
	label: string;
	onCheckedChange: (value: boolean) => void;
}) {
	return (
		<label className="flex items-center gap-2 text-sm cursor-pointer">
			<Switch checked={checked} onCheckedChange={onCheckedChange} />
			<span className="text-muted-foreground">{label}</span>
		</label>
	);
}

function FieldWrapper({
	children,
	className,
	description,
	label
}: {
	children: React.ReactNode;
	className?: string;
	description?: string;
	label: string;
}) {
	return (
		<div className={cn("space-y-1.5", className)}>
			<div className="space-y-0.5">
				<div className="text-sm font-medium">{label}</div>
				{description ? (
					<p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
				) : null}
			</div>
			{children}
		</div>
	);
}

function SimpleSelectField<TValue extends string>({
	className,
	items,
	label,
	onValueChange,
	placeholder,
	value
}: {
	className?: string;
	items: Array<AddItem<TValue>>;
	label: string;
	onValueChange: (value: TValue) => void;
	placeholder?: string;
	value: TValue;
}) {
	return (
		<FieldWrapper className={className} label={label}>
			<Select onValueChange={nextValue => onValueChange(nextValue as TValue)} value={value}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{items.map(item => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldWrapper>
	);
}

function AddInsertControl<TValue extends string>({
	canPaste,
	items,
	label,
	onAdd,
	onPaste
}: {
	canPaste?: boolean;
	items: Array<AddItem<TValue>>;
	label: string;
	onAdd: (value: TValue) => void;
	onPaste?: (clear: boolean) => void;
}) {
	const [open, setOpen] = React.useState(false);

	return (
		<div className="relative h-6 flex items-center justify-center group">
			<div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border transition-opacity" />
			<HoverCard closeDelay={50} onOpenChange={setOpen} open={open} openDelay={50}>
				<HoverCardTrigger asChild>
					<button
						className={cn(
							"relative z-10 bg-background text-muted-foreground hover:text-foreground hover:border-primary flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs transition-all",
							"group-hover:opacity-100 group-hover:scale-100",
							open ? "opacity-100 scale-100 text-foreground border-primary" : "opacity-0 scale-95"
						)}
						type="button"
					>
						<PlusIcon className="size-3" />
						<span>{label}</span>
					</button>
				</HoverCardTrigger>
				<HoverCardContent align="center" className="w-56 p-1.5">
					<div className="space-y-1">
						{items.map(item => (
							<Button
								className="w-full justify-start text-left h-auto py-2"
								key={item.value}
								onClick={() => onAdd(item.value)}
								size="sm"
								type="button"
								variant="ghost"
							>
								<div className="space-y-0.5">
									<div className="text-sm">{item.label}</div>
									{item.description ? (
										<div className="text-muted-foreground text-xs leading-relaxed">
											{item.description}
										</div>
									) : null}
								</div>
							</Button>
						))}
						{onPaste ? (
							<Button
								className="w-full justify-start"
								disabled={!canPaste}
								onClick={event => onPaste(!event.altKey)}
								size="sm"
								type="button"
								variant="ghost"
							>
								<ClipboardPasteIcon className="size-3 mr-2" />
								Paste
							</Button>
						) : null}
					</div>
				</HoverCardContent>
			</HoverCard>
		</div>
	);
}

function BlockActions({
	canPaste,
	disabledDown,
	disabledUp,
	isCollapsed,
	onCopy,
	onDelete,
	onMoveDown,
	onMoveUp,
	onPaste,
	onToggleCollapse
}: {
	canPaste: boolean;
	disabledDown: boolean;
	disabledUp: boolean;
	isCollapsed: boolean;
	onCopy: () => void;
	onDelete: () => void;
	onMoveDown: () => void;
	onMoveUp: () => void;
	onPaste: (clear: boolean) => void;
	onToggleCollapse: () => void;
}) {
	return (
		<div className="flex items-center gap-0.5">
			<ActionButton onClick={onToggleCollapse} title={isCollapsed ? "Expand" : "Collapse"}>
				{isCollapsed ? <ChevronRightIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
			</ActionButton>
			<ActionButton disabled={disabledUp} onClick={onMoveUp} title="Move up">
				<ArrowUpIcon className="size-3.5" />
			</ActionButton>
			<ActionButton disabled={disabledDown} onClick={onMoveDown} title="Move down">
				<ArrowDownIcon className="size-3.5" />
			</ActionButton>
			<ActionButton onClick={onCopy} title="Copy">
				<CopyIcon className="size-3.5" />
			</ActionButton>
			<ActionButton disabled={!canPaste} onClick={event => onPaste(!event.altKey)} title="Paste">
				<ClipboardPasteIcon className="size-3.5" />
			</ActionButton>
			<ActionButton onClick={onDelete} title="Delete" variant="destructive">
				<Trash2Icon className="size-3.5" />
			</ActionButton>
		</div>
	);
}

function ConditionEditor({
	availableFields,
	description,
	label,
	onChange,
	value
}: {
	availableFields: FieldReference[];
	description: string;
	label: string;
	onChange: (value: JsonConditionConfig | undefined) => void;
	value: JsonConditionConfig | undefined;
}) {
	const parsedCondition = React.useMemo(() => unwrapSimpleCondition(value), [value]);
	const draft = parsedCondition.draft ?? {
		field: "",
		operator: "equals" as SimpleConditionOperator,
		value: ""
	};
	const fieldItems = React.useMemo(() => {
		if(draft.field.trim().length > 0 && !availableFields.some(item => item.name == draft.field)) {
			return [
				{
					label: draft.field,
					name: draft.field
				},
				...availableFields
			];
		}

		return availableFields;
	}, [availableFields, draft.field]);

	function applyDraft(nextDraft: EditableCondition): void {
		onChange(buildSimpleCondition(nextDraft));
	}

	return (
		<div className="rounded-xl border bg-muted/20 p-3 space-y-3">
			<div className="space-y-1">
				<div className="text-sm font-medium">{label}</div>
				<p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
				{parsedCondition.hasUnsupportedCondition ? (
					<p className="text-muted-foreground text-xs">
						This item already has a saved rule. Editing here will replace it.
					</p>
				) : null}
			</div>
			<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)]">
				<FieldWrapper label="Question">
					<Select
						onValueChange={nextValue => {
							applyDraft({
								...draft,
								field: nextValue == EMPTY_SELECT_VALUE ? "" : nextValue
							});
						}}
						value={draft.field || EMPTY_SELECT_VALUE}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Always show" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={EMPTY_SELECT_VALUE}>Always show</SelectItem>
							{fieldItems.map(item => (
								<SelectItem key={item.name} value={item.name}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FieldWrapper>
				<FieldWrapper label="Rule">
					<Select
						onValueChange={nextValue => {
							applyDraft({
								...draft,
								operator: nextValue as SimpleConditionOperator
							});
						}}
						value={draft.operator}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CONDITION_OPERATOR_ITEMS.map(item => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FieldWrapper>
				<FieldWrapper label="Value">
					<Input
						onChange={event => {
							applyDraft({
								...draft,
								value: event.target.value
							});
						}}
						placeholder={draft.operator == "matches" ? "Pattern" : "Expected value"}
						value={draft.value}
					/>
				</FieldWrapper>
			</div>
		</div>
	);
}

function BlockContentEditor({
	availableFields,
	block,
	onChange
}: {
	availableFields: FieldReference[];
	block: EditorBlock;
	onChange: (block: EditorBlock) => void;
}) {
	const fieldType = getEditorFieldType(block);

	if(fieldType != null) {
		const fieldBlock = block as JsonFieldBlock & EditorBlock;
		const multipleChoice = ("multiple" in fieldBlock ? fieldBlock.multiple : false) ?? false;

		return (
			<div className="space-y-4 px-3 pb-3">
				<div className="grid gap-4 md:grid-cols-2">
					<FieldWrapper className="md:col-span-2" label="Question">
						<Textarea
							className="min-h-20"
							onChange={event => onChange(withOptionalString(fieldBlock, "question", event.target.value))}
							placeholder="Ask your question here"
							value={getPlainRenderableText(fieldBlock.question)}
						/>
					</FieldWrapper>
					<FieldWrapper className="md:col-span-2" label="Supporting text">
						<Textarea
							className="min-h-20"
							onChange={event => onChange(withOptionalString(fieldBlock, "description", event.target.value))}
							placeholder="Add extra detail or guidance"
							value={getPlainRenderableText(fieldBlock.description)}
						/>
					</FieldWrapper>
					{"placeholder" in fieldBlock ? (
						<FieldWrapper className="md:col-span-2" label="Placeholder">
							<Input
								onChange={event => onChange(withOptionalString(fieldBlock, "placeholder", event.target.value))}
								placeholder="Example answer"
								value={getPlainRenderableText(fieldBlock.placeholder)}
							/>
						</FieldWrapper>
					) : null}
				</div>
				<div className="flex flex-wrap gap-4 rounded-xl border bg-muted/20 px-3 py-2">
					<ToggleField checked={fieldBlock.required ?? false} label="Required" onCheckedChange={nextValue => onChange({ ...fieldBlock, required: nextValue })} />
					<ToggleField checked={fieldBlock.disabled ?? false} label="Disabled" onCheckedChange={nextValue => onChange({ ...fieldBlock, disabled: nextValue })} />
					<ToggleField checked={fieldBlock.hidden ?? false} label="Hidden" onCheckedChange={nextValue => onChange({ ...fieldBlock, hidden: nextValue })} />
					{fieldType == "text" ? (
						<ToggleField checked={("multiline" in fieldBlock ? fieldBlock.multiline : false) ?? false} label="Use multiple lines" onCheckedChange={nextValue => onChange({ ...fieldBlock, multiline: nextValue } as EditorBlock)} />
					) : null}
					{fieldType == "choice" ? (
						<>
							<ToggleField checked={("multiple" in fieldBlock ? fieldBlock.multiple : false) ?? false} label="Allow multiple answers" onCheckedChange={nextValue => onChange({ ...(fieldBlock as JsonChoiceFieldBlock), multiple: nextValue } as EditorBlock)} />
							<ToggleField checked={("horizontal" in fieldBlock ? fieldBlock.horizontal : false) ?? false} label="Arrange side by side" onCheckedChange={nextValue => onChange({ ...(fieldBlock as JsonChoiceFieldBlock), horizontal: nextValue } as EditorBlock)} />
							<ToggleField checked={("hideFormText" in fieldBlock ? fieldBlock.hideFormText : false) ?? false} label="Hide helper text" onCheckedChange={nextValue => onChange({ ...(fieldBlock as JsonChoiceFieldBlock), hideFormText: nextValue } as EditorBlock)} />
						</>
					) : null}
					{fieldType == "pictureChoice" ? (
						<>
							<ToggleField checked={("multiple" in fieldBlock ? fieldBlock.multiple : false) ?? false} label="Allow multiple answers" onCheckedChange={nextValue => onChange({ ...(fieldBlock as JsonPictureChoiceFieldBlock), multiple: nextValue } as EditorBlock)} />
							<ToggleField checked={("hideLabels" in fieldBlock ? fieldBlock.hideLabels : false) ?? false} label="Hide labels" onCheckedChange={nextValue => onChange({ ...(fieldBlock as JsonPictureChoiceFieldBlock), hideLabels: nextValue } as EditorBlock)} />
							<ToggleField checked={("hideFormText" in fieldBlock ? fieldBlock.hideFormText : false) ?? false} label="Hide helper text" onCheckedChange={nextValue => onChange({ ...(fieldBlock as JsonPictureChoiceFieldBlock), hideFormText: nextValue } as EditorBlock)} />
							<ToggleField checked={("supersize" in fieldBlock ? fieldBlock.supersize : false) ?? false} label="Use larger cards" onCheckedChange={nextValue => onChange({ ...(fieldBlock as JsonPictureChoiceFieldBlock), supersize: nextValue } as EditorBlock)} />
						</>
					) : null}
					{fieldType == "file" ? (
						<ToggleField checked={("imageOnly" in fieldBlock ? fieldBlock.imageOnly : false) ?? false} label="Images only" onCheckedChange={nextValue => onChange({ ...fieldBlock, imageOnly: nextValue } as EditorBlock)} />
					) : null}
					{fieldType == "opinionScale" ? (
						<>
							<ToggleField checked={("hideLabelStart" in fieldBlock ? fieldBlock.hideLabelStart : false) ?? false} label="Hide left label" onCheckedChange={nextValue => onChange({ ...fieldBlock, hideLabelStart: nextValue } as EditorBlock)} />
							<ToggleField checked={("hideLabelEnd" in fieldBlock ? fieldBlock.hideLabelEnd : false) ?? false} label="Hide right label" onCheckedChange={nextValue => onChange({ ...fieldBlock, hideLabelEnd: nextValue } as EditorBlock)} />
						</>
					) : null}
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					{("maxlength" in fieldBlock) ? (
						<FieldWrapper label="Maximum characters">
							<Input
								onChange={event => onChange(withOptionalNumber(fieldBlock, "maxlength", event.target.value))}
								type="number"
								value={String(fieldBlock.maxlength ?? "")}
							/>
						</FieldWrapper>
					) : null}
					{("pattern" in fieldBlock) ? (
						<FieldWrapper label="Validation pattern">
							<Input
								onChange={event => onChange(withOptionalString(fieldBlock, "pattern", event.target.value))}
								placeholder="e.g. ^[A-Z].*$"
								value={fieldBlock.pattern ?? ""}
							/>
						</FieldWrapper>
					) : null}
					{fieldType == "number" ? (
						<>
							<FieldWrapper label="Minimum">
								<Input
									onChange={event => onChange(withOptionalNumber(fieldBlock, "min", event.target.value))}
									type="number"
									value={String(("min" in fieldBlock ? fieldBlock.min : "") ?? "")}
								/>
							</FieldWrapper>
							<FieldWrapper label="Maximum">
								<Input
									onChange={event => onChange(withOptionalNumber(fieldBlock, "max", event.target.value))}
									type="number"
									value={String(("max" in fieldBlock ? fieldBlock.max : "") ?? "")}
								/>
							</FieldWrapper>
							<FieldWrapper label="Step">
								<Input
									onChange={event => onChange(withOptionalNumber(fieldBlock, "step", event.target.value))}
									type="number"
									value={String(("step" in fieldBlock ? fieldBlock.step : "") ?? "")}
								/>
							</FieldWrapper>
							<FieldWrapper label="Unit before answer">
								<Input
									onChange={event => onChange(withOptionalString(fieldBlock, "unit", event.target.value))}
									placeholder="USD"
									value={getPlainRenderableText("unit" in fieldBlock ? fieldBlock.unit : undefined)}
								/>
							</FieldWrapper>
							<FieldWrapper label="Unit after answer">
								<Input
									onChange={event => onChange(withOptionalString(fieldBlock, "unitEnd", event.target.value))}
									placeholder="minutes"
									value={getPlainRenderableText("unitEnd" in fieldBlock ? fieldBlock.unitEnd : undefined)}
								/>
							</FieldWrapper>
						</>
					) : null}
					{fieldType == "select" ? (
						<>
							<FieldWrapper className="md:col-span-2" description="Use one option per line. Add `Label | saved value` if you want a different stored value." label="Dropdown options">
								<Textarea
									className="min-h-28 font-mono text-xs"
									onChange={event => onChange({
										...fieldBlock,
										options: parseOptionsText(event.target.value)
									} as EditorBlock)}
									spellCheck={false}
									value={serializeOptionsText(("options" in fieldBlock ? fieldBlock.options : []))}
								/>
							</FieldWrapper>
							<FieldWrapper label="Default selected value">
								<Input
									onChange={event => onChange(withOptionalString(fieldBlock, "selected", event.target.value))}
									placeholder="Leave blank for none"
									value={("selected" in fieldBlock ? fieldBlock.selected : "") ?? ""}
								/>
							</FieldWrapper>
						</>
					) : null}
					{fieldType == "choice" ? (
						<>
							<FieldWrapper className="md:col-span-2" description="Use one option per line. Add `Label | saved value` if you want a different stored value." label="Choices">
								<Textarea
									className="min-h-28 font-mono text-xs"
									onChange={event => onChange({
										...(fieldBlock as JsonChoiceFieldBlock),
										choices: parseOptionsText(event.target.value)
									} as EditorBlock)}
									spellCheck={false}
									value={serializeOptionsText(("choices" in fieldBlock ? fieldBlock.choices : []))}
								/>
							</FieldWrapper>
							<FieldWrapper className="md:col-span-2" description={multipleChoice ? "Use commas to preselect several answers." : "Enter one saved value to preselect an answer."} label="Default selected value">
								<Input
									onChange={event => onChange({
										...(fieldBlock as JsonChoiceFieldBlock),
										checked: parseCheckedValue(event.target.value, multipleChoice)
									} as EditorBlock)}
									placeholder={multipleChoice ? "value_a, value_b" : "value_a"}
									value={serializeCheckedValue(("checked" in fieldBlock ? fieldBlock.checked : undefined))}
								/>
							</FieldWrapper>
						</>
					) : null}
					{fieldType == "pictureChoice" ? (
						<>
							<FieldWrapper className="md:col-span-2" description="Use one choice per line in the format `Label | saved value | image URL`." label="Picture choices">
								<Textarea
									className="min-h-32 font-mono text-xs"
									onChange={event => onChange({
										...(fieldBlock as JsonPictureChoiceFieldBlock),
										choices: parsePictureChoicesText(event.target.value)
									} as EditorBlock)}
									spellCheck={false}
									value={serializePictureChoicesText(("choices" in fieldBlock ? fieldBlock.choices : []) as JsonPictureChoiceFieldBlock["choices"])}
								/>
							</FieldWrapper>
							<FieldWrapper className="md:col-span-2" description={multipleChoice ? "Use commas to preselect several answers." : "Enter one saved value to preselect an answer."} label="Default selected value">
								<Input
									onChange={event => onChange({
										...(fieldBlock as JsonPictureChoiceFieldBlock),
										checked: parseCheckedValue(event.target.value, multipleChoice)
									} as EditorBlock)}
									placeholder={multipleChoice ? "desktop, mobile" : "desktop"}
									value={serializeCheckedValue(("checked" in fieldBlock ? fieldBlock.checked : undefined))}
								/>
							</FieldWrapper>
						</>
					) : null}
					{fieldType == "rating" ? (
						<>
							<FieldWrapper label="Number of icons">
								<Input
									onChange={event => onChange(withOptionalNumber(fieldBlock, "outOf", event.target.value))}
									type="number"
									value={String(("outOf" in fieldBlock ? fieldBlock.outOf : "") ?? "")}
								/>
							</FieldWrapper>
							<SimpleSelectField
								items={[
									{ label: "Stars", value: "star" },
									{ label: "Hearts", value: "heart" }
								]}
								label="Icon style"
								onValueChange={nextValue => onChange({ ...fieldBlock, icon: nextValue } as EditorBlock)}
								value={(("icon" in fieldBlock ? fieldBlock.icon : "star") ?? "star")}
							/>
							<FieldWrapper label="Default rating">
								<Input
									onChange={event => onChange(withOptionalNumber(fieldBlock, "value", event.target.value))}
									type="number"
									value={String(("value" in fieldBlock ? fieldBlock.value : "") ?? "")}
								/>
							</FieldWrapper>
						</>
					) : null}
					{fieldType == "opinionScale" ? (
						<>
							<FieldWrapper label="Starts at">
								<Select
									onValueChange={nextValue => onChange({ ...fieldBlock, startAt: Number(nextValue) as 0 | 1 } as EditorBlock)}
									value={String(("startAt" in fieldBlock ? fieldBlock.startAt : 0) ?? 0)}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="0">0</SelectItem>
										<SelectItem value="1">1</SelectItem>
									</SelectContent>
								</Select>
							</FieldWrapper>
							<FieldWrapper label="Ends at">
								<Input
									onChange={event => onChange(withOptionalNumber(fieldBlock, "outOf", event.target.value))}
									type="number"
									value={String(("outOf" in fieldBlock ? fieldBlock.outOf : "") ?? "")}
								/>
							</FieldWrapper>
							<FieldWrapper label="Left label">
								<Input
									onChange={event => onChange(withOptionalString(fieldBlock, "labelStart", event.target.value))}
									value={getPlainRenderableText("labelStart" in fieldBlock ? fieldBlock.labelStart : undefined)}
								/>
							</FieldWrapper>
							<FieldWrapper label="Right label">
								<Input
									onChange={event => onChange(withOptionalString(fieldBlock, "labelEnd", event.target.value))}
									value={getPlainRenderableText("labelEnd" in fieldBlock ? fieldBlock.labelEnd : undefined)}
								/>
							</FieldWrapper>
							<FieldWrapper label="Default score">
								<Input
									onChange={event => onChange(withOptionalNumber(fieldBlock, "value", event.target.value))}
									type="number"
									value={String(("value" in fieldBlock ? fieldBlock.value : "") ?? "")}
								/>
							</FieldWrapper>
						</>
					) : null}
					{(fieldType == "datetime" || fieldType == "date" || fieldType == "time") ? (
						<>
							<FieldWrapper label="Earliest allowed">
								<Input
									onChange={event => onChange(withOptionalString(fieldBlock, "min", event.target.value))}
									value={("min" in fieldBlock ? fieldBlock.min : "") ?? ""}
								/>
							</FieldWrapper>
							<FieldWrapper label="Latest allowed">
								<Input
									onChange={event => onChange(withOptionalString(fieldBlock, "max", event.target.value))}
									value={("max" in fieldBlock ? fieldBlock.max : "") ?? ""}
								/>
							</FieldWrapper>
							<FieldWrapper label="Step">
								<Input
									onChange={event => onChange(withOptionalNumber(fieldBlock, "step", event.target.value))}
									type="number"
									value={String(("step" in fieldBlock ? fieldBlock.step : "") ?? "")}
								/>
							</FieldWrapper>
							<FieldWrapper label="Default value">
								<Input
									onChange={event => onChange(withOptionalString(fieldBlock, "value", event.target.value))}
									value={("value" in fieldBlock ? String(fieldBlock.value ?? "") : "")}
								/>
							</FieldWrapper>
						</>
					) : null}
					{fieldType == "tel" ? (
						<>
							<FieldWrapper label="Default country">
								<Input
									onChange={event => onChange(withOptionalString(fieldBlock, "country", event.target.value.toUpperCase()))}
									placeholder="ID"
									value={("country" in fieldBlock ? fieldBlock.country : "") ?? ""}
								/>
							</FieldWrapper>
							<FieldWrapper label="Available countries">
								<Input
									onChange={event => onChange({
										...fieldBlock,
										availableCountries: parseStringList(event.target.value).map(item => item.toUpperCase())
									} as EditorBlock)}
									placeholder="ID, SG, US"
									value={serializeStringList(("availableCountries" in fieldBlock ? fieldBlock.availableCountries : undefined))}
								/>
							</FieldWrapper>
						</>
					) : null}
					{fieldType == "file" ? (
						<>
							<FieldWrapper label="Maximum file size (MB)">
								<Input
									onChange={event => onChange(withOptionalNumber(fieldBlock, "sizeLimit", event.target.value))}
									type="number"
									value={String(("sizeLimit" in fieldBlock ? fieldBlock.sizeLimit : "") ?? "")}
								/>
							</FieldWrapper>
						</>
					) : null}
				</div>
				<ConditionEditor
					availableFields={availableFields.filter(item => item.name != fieldBlock.name)}
					description="Leave this blank if the question should always appear."
					label="Show this question only when"
					onChange={nextValue => onChange({
						...fieldBlock,
						displayCondition: nextValue
					})}
					value={fieldBlock.displayCondition}
				/>
			</div>
		);
	}

	const contentBlock = block as JsonContentBlock & EditorBlock;

	return (
		<div className="space-y-4 px-3 pb-3">
			<div className="grid gap-4 md:grid-cols-2">
				{contentBlock.type == "heading" ? (
					<>
						<FieldWrapper className="md:col-span-2" label="Heading text">
							<Textarea
								className="min-h-20"
								onChange={event => onChange(withOptionalString(contentBlock, "text", event.target.value))}
								placeholder="Write your heading"
								value={getPlainRenderableText(contentBlock.text)}
							/>
						</FieldWrapper>
						<FieldWrapper label="Heading size">
							<Select
								onValueChange={nextValue => onChange({ ...contentBlock, level: Number(nextValue) as 1 | 2 | 3 })}
								value={String(contentBlock.level ?? 2)}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">Large</SelectItem>
									<SelectItem value="2">Medium</SelectItem>
									<SelectItem value="3">Small</SelectItem>
								</SelectContent>
							</Select>
						</FieldWrapper>
					</>
				) : null}
				{(contentBlock.type == "copy" || contentBlock.type == "text" || contentBlock.type == "description" || contentBlock.type == "helper") ? (
					<FieldWrapper className="md:col-span-2" label="Text">
						<Textarea
							className="min-h-24"
							onChange={event => {
								if("content" in contentBlock)
									onChange(withOptionalString(contentBlock, "content", event.target.value));
								else
									onChange(withOptionalString(contentBlock, "text", event.target.value));
							}}
							placeholder="Write your content"
							value={getPlainRenderableText(contentBlock.text ?? contentBlock.content)}
						/>
					</FieldWrapper>
				) : null}
				{contentBlock.type == "divider" ? (
					<FieldWrapper className="md:col-span-2" label="Label">
						<Input
							onChange={event => onChange(withOptionalString(contentBlock, "label", event.target.value))}
							placeholder="Optional section label"
							value={getPlainRenderableText(contentBlock.label)}
						/>
					</FieldWrapper>
				) : null}
				{contentBlock.type == "media" ? (
					<>
						<FieldWrapper className="md:col-span-2" label="Media URL">
							<Input
								onChange={event => onChange(withOptionalString(contentBlock, "src", event.target.value))}
								placeholder="https://..."
								value={getPlainRenderableText(contentBlock.src)}
							/>
						</FieldWrapper>
						<SimpleSelectField
							items={[
								{ label: "Image", value: "image" },
								{ label: "Video", value: "video" }
							]}
							label="Media type"
							onValueChange={nextValue => onChange({ ...contentBlock, mediaType: nextValue })}
							value={(contentBlock.mediaType ?? "image")}
						/>
						<SimpleSelectField
							items={[
								{ label: "Cover", value: "cover" },
								{ label: "Contain", value: "contain" }
							]}
							label="Fit"
							onValueChange={nextValue => onChange({ ...contentBlock, fit: nextValue })}
							value={(contentBlock.fit ?? "cover")}
						/>
						<FieldWrapper label="Aspect ratio">
							<Input
								onChange={event => onChange(withOptionalNumber(contentBlock, "aspectRatio", event.target.value))}
								type="number"
								value={String(contentBlock.aspectRatio ?? "")}
							/>
						</FieldWrapper>
						<FieldWrapper label="Alt text">
							<Input
								onChange={event => onChange(withOptionalString(contentBlock, "alt", event.target.value))}
								value={getPlainRenderableText(contentBlock.alt)}
							/>
						</FieldWrapper>
						<FieldWrapper className="md:col-span-2" label="Caption">
							<Textarea
								className="min-h-20"
								onChange={event => onChange(withOptionalString(contentBlock, "caption", event.target.value))}
								value={getPlainRenderableText(contentBlock.caption)}
							/>
						</FieldWrapper>
						<FieldWrapper className="md:col-span-2" label="Poster image">
							<Input
								onChange={event => onChange(withOptionalString(contentBlock, "poster", event.target.value))}
								placeholder="Optional poster image URL"
								value={getPlainRenderableText(contentBlock.poster)}
							/>
						</FieldWrapper>
					</>
				) : null}
				<SimpleSelectField
					className={contentBlock.type == "media" ? "" : "md:col-span-2"}
					items={[
						{ label: "Left", value: "start" },
						{ label: "Center", value: "center" },
						{ label: "Right", value: "end" }
					]}
					label="Alignment"
					onValueChange={nextValue => onChange({ ...contentBlock, align: nextValue })}
					value={(contentBlock.align ?? "start")}
				/>
			</div>
			<div className="flex flex-wrap gap-4 rounded-xl border bg-muted/20 px-3 py-2">
				<ToggleField checked={contentBlock.hidden ?? false} label="Hidden" onCheckedChange={nextValue => onChange({ ...contentBlock, hidden: nextValue })} />
				<ToggleField checked={contentBlock.disabled ?? false} label="Disabled" onCheckedChange={nextValue => onChange({ ...contentBlock, disabled: nextValue })} />
			</div>
			<ConditionEditor
				availableFields={availableFields}
				description="Leave this blank if the content should always appear."
				label="Show this content only when"
				onChange={nextValue => onChange({
					...contentBlock,
					displayCondition: nextValue
				})}
				value={contentBlock.displayCondition}
			/>
		</div>
	);
}

function BlockCard({
	availableFields,
	block,
	canPaste,
	index,
	isCollapsed,
	onChange,
	onCopy,
	onDelete,
	onDragEnd,
	onDragStart,
	onMoveDown,
	onMoveUp,
	onPaste,
	onToggleCollapse,
	total
}: {
	availableFields: FieldReference[];
	block: EditorBlock;
	canPaste: boolean;
	index: number;
	isCollapsed: boolean;
	onChange: (block: EditorBlock) => void;
	onCopy: () => void;
	onDelete: () => void;
	onDragEnd: () => void;
	onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
	onMoveDown: () => void;
	onMoveUp: () => void;
	onPaste: (clear: boolean) => void;
	onToggleCollapse: () => void;
	total: number;
}) {
	return (
		<div className="border rounded-xl bg-background">
			<div className="flex items-center gap-2 px-3 py-2">
				<button
					aria-label="Drag block"
					className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
					draggable
					onDragEnd={onDragEnd}
					onDragStart={onDragStart}
					type="button"
				>
					<GripVerticalIcon className="size-4" />
				</button>
				<Badge className="text-[11px]" variant="outline">{getBlockBadgeLabel(block)}</Badge>
				<div className="min-w-0 flex-1">
					<div className="truncate text-sm font-medium">{getBlockSummary(block, index)}</div>
				</div>
				<BlockActions
					canPaste={canPaste}
					disabledDown={index == total - 1}
					disabledUp={index == 0}
					isCollapsed={isCollapsed}
					onCopy={onCopy}
					onDelete={onDelete}
					onMoveDown={onMoveDown}
					onMoveUp={onMoveUp}
					onPaste={onPaste}
					onToggleCollapse={onToggleCollapse}
				/>
			</div>
			<Collapsible open={!isCollapsed}>
				<CollapsibleContent>
					<BlockContentEditor availableFields={availableFields} block={block} onChange={onChange} />
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

function SlideSettingsPanel({
	availableFields,
	slide,
	onChange
}: {
	availableFields: FieldReference[];
	onChange: (slide: EditorSlide) => void;
	slide: EditorSlide;
}) {
	return (
		<div className="space-y-4 px-3 pb-3">
			<div className="grid gap-4 md:grid-cols-2">
				<FieldWrapper className="md:col-span-2" label="Screen title">
					<Input
						onChange={event => onChange(withOptionalString(slide, "title", event.target.value))}
						placeholder="Give this screen a title"
						value={getPlainRenderableText(slide.title)}
					/>
				</FieldWrapper>
				<FieldWrapper className="md:col-span-2" label="Supporting text">
					<Textarea
						className="min-h-20"
						onChange={event => onChange(withOptionalString(slide, "description", event.target.value))}
						placeholder="Explain this screen or add context"
						value={getPlainRenderableText(slide.description)}
					/>
				</FieldWrapper>
				<SimpleSelectField
					items={SLIDE_KIND_ITEMS}
					label="Screen type"
					onValueChange={nextValue => onChange({ ...slide, kind: nextValue })}
					value={getSlideKind(slide)}
				/>
				<FieldWrapper label="Continue button text">
					<Input
						onChange={event => onChange(withOptionalString(slide, "buttonText", event.target.value))}
						placeholder={getSlideKind(slide) == "end" ? "Continue" : "Next"}
						value={getPlainRenderableText(slide.buttonText)}
					/>
				</FieldWrapper>
				{getSlideKind(slide) == "slide" ? (
					<SimpleSelectField
						items={SLIDE_POST_ITEMS}
						label="Auto-save"
						onValueChange={nextValue => {
							if(nextValue == "none") {
								const nextSlide = { ...slide };
								delete nextSlide.post;
								onChange(nextSlide);
								return;
							}

							onChange({
								...slide,
								post: nextValue
							});
						}}
						value={(slide.post ?? "none")}
					/>
				) : null}
				<FieldWrapper label="Progress label">
					<Input
						onChange={event => onChange(withOptionalString(slide, "pageProgress", event.target.value))}
						placeholder="Optional custom progress label"
						value={getPlainRenderableText(slide.pageProgress)}
					/>
				</FieldWrapper>
				{getSlideKind(slide) == "end" ? (
					<FieldWrapper className="md:col-span-2" label="Continue to URL">
						<Input
							onChange={event => onChange(withOptionalString(slide, "redirectUrl", event.target.value))}
							placeholder="https://example.com/next-step"
							value={getPlainRenderableText(slide.redirectUrl)}
						/>
					</FieldWrapper>
				) : null}
			</div>
			<div className="flex flex-wrap gap-4 rounded-xl border bg-muted/20 px-3 py-2">
				<ToggleField checked={!slide.disablePrevious} label="Allow going back" onCheckedChange={nextValue => onChange({ ...slide, disablePrevious: !nextValue })} />
				<ToggleField checked={slide.hidden ?? false} label="Hidden" onCheckedChange={nextValue => onChange({ ...slide, hidden: nextValue })} />
			</div>
			<ConditionEditor
				availableFields={availableFields}
				description="Leave this blank if the screen should always appear."
				label="Show this screen only when"
				onChange={nextValue => onChange({
					...slide,
					jumpCondition: nextValue
				})}
				value={slide.jumpCondition}
			/>
		</div>
	);
}

function SlideCard({
	availableFields,
	canPasteBlock,
	canPasteSlide,
	blockCollapsedMap,
	blockDragTargetId,
	onBlockDragEnd,
	onBlockDragStart,
	onBlockDrop,
	onBlockHover,
	onChange,
	onCopyBlock,
	onCopy,
	onDelete,
	onDragEnd,
	onDragStart,
	onInsertBlock,
	onMoveDown,
	onMoveUp,
	onPasteBlock,
	onPasteSlide,
	onToggleBlockCollapse,
	onToggleCollapse,
	slide,
	slideIndex,
	slideTotal,
	isCollapsed
}: {
	availableFields: FieldReference[];
	canPasteBlock: boolean;
	canPasteSlide: boolean;
	blockCollapsedMap: Record<string, boolean>;
	blockDragTargetId: string | null;
	isCollapsed: boolean;
	onBlockDragEnd: () => void;
	onBlockDragStart: (event: React.DragEvent<HTMLButtonElement>, blockId: string) => void;
	onBlockDrop: (targetBlockId: string) => void;
	onBlockHover: (event: React.DragEvent<HTMLDivElement>, targetBlockId: string) => void;
	onChange: (slide: EditorSlide) => void;
	onCopyBlock: (block: EditorBlock) => void;
	onCopy: () => void;
	onDelete: () => void;
	onDragEnd: () => void;
	onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
	onInsertBlock: (index: number, type: JsonFormBlock["type"]) => void;
	onMoveDown: () => void;
	onMoveUp: () => void;
	onPasteBlock: (index: number, clear: boolean) => void;
	onPasteSlide: (clear: boolean) => void;
	onToggleBlockCollapse: (blockId: string, value: boolean) => void;
	onToggleCollapse: () => void;
	slide: EditorSlide;
	slideIndex: number;
	slideTotal: number;
}) {
	return (
		<div className="border rounded-2xl bg-background">
			<div className="flex items-center gap-2 px-3 py-2">
				<button
					aria-label="Drag screen"
					className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
					draggable
					onDragEnd={onDragEnd}
					onDragStart={onDragStart}
					type="button"
				>
					<GripVerticalIcon className="size-4" />
				</button>
				<Badge variant="outline">{getSlideBadgeLabel(getSlideKind(slide))}</Badge>
				<div className="min-w-0 flex-1">
					<div className="truncate text-sm font-medium">{getSlideSummary(slide, slideIndex)}</div>
					<div className="text-muted-foreground text-xs">
						{slide.blocks.length} block{slide.blocks.length == 1 ? "" : "s"}
					</div>
				</div>
				<BlockActions
					canPaste={canPasteSlide}
					disabledDown={slideIndex == slideTotal - 1}
					disabledUp={slideIndex == 0}
					isCollapsed={isCollapsed}
					onCopy={onCopy}
					onDelete={onDelete}
					onMoveDown={onMoveDown}
					onMoveUp={onMoveUp}
					onPaste={onPasteSlide}
					onToggleCollapse={onToggleCollapse}
				/>
			</div>
			<Collapsible open={!isCollapsed}>
				<CollapsibleContent>
					<SlideSettingsPanel availableFields={availableFields} onChange={onChange} slide={slide} />
					<div className="px-3 pb-3">
						<div className="rounded-xl border bg-muted/10 p-3 space-y-2">
							<div className="text-sm font-medium">Blocks</div>
							<AddInsertControl
								canPaste={canPasteBlock}
								items={BLOCK_TYPE_ITEMS}
								label="Add block"
								onAdd={type => onInsertBlock(0, type)}
								onPaste={clear => onPasteBlock(0, clear)}
							/>
							<div className="space-y-1">
								{slide.blocks.map((block, blockIndex) => (
									<React.Fragment key={block.editorId}>
										{blockIndex > 0 ? (
											<AddInsertControl
												canPaste={canPasteBlock}
												items={BLOCK_TYPE_ITEMS}
												label="Insert block"
												onAdd={type => onInsertBlock(blockIndex, type)}
												onPaste={clear => onPasteBlock(blockIndex, clear)}
											/>
										) : null}
										<div
											className={cn(
												"transition-shadow ring-2 ring-transparent ring-offset-2 rounded-xl",
												blockDragTargetId == block.editorId && "ring-primary"
											)}
											onDragOver={event => onBlockHover(event, block.editorId)}
											onDrop={() => onBlockDrop(block.editorId)}
										>
												<BlockCard
													availableFields={availableFields}
													block={block}
													canPaste={canPasteBlock}
													index={blockIndex}
													isCollapsed={blockCollapsedMap[block.editorId] ?? true}
												onChange={nextBlock => {
													onChange({
														...slide,
														blocks: slide.blocks.map(currentBlock =>
															currentBlock.editorId == block.editorId ? nextBlock : currentBlock
														)
													});
												}}
												onCopy={() => onCopyBlock(block)}
												onDelete={() => {
													onChange({
														...slide,
														blocks: slide.blocks.filter(currentBlock => currentBlock.editorId != block.editorId)
													});
												}}
												onDragEnd={onBlockDragEnd}
												onDragStart={event => onBlockDragStart(event, block.editorId)}
												onMoveDown={() => {
													onChange({
														...slide,
														blocks: moveItem(slide.blocks, blockIndex, blockIndex + 1)
													});
												}}
												onMoveUp={() => {
													onChange({
														...slide,
														blocks: moveItem(slide.blocks, blockIndex, blockIndex - 1)
													});
												}}
												onPaste={clear => onPasteBlock(blockIndex + 1, clear)}
												onToggleCollapse={() => onToggleBlockCollapse(block.editorId, !(blockCollapsedMap[block.editorId] ?? true))}
												total={slide.blocks.length}
											/>
										</div>
									</React.Fragment>
								))}
							</div>
							{slide.blocks.length == 0 ? (
								<div className="text-center py-6 text-sm text-muted-foreground">
									No blocks yet. Add one to start building this screen.
								</div>
							) : (
								<AddInsertControl
									canPaste={canPasteBlock}
									items={BLOCK_TYPE_ITEMS}
									label="Add block"
									onAdd={type => onInsertBlock(slide.blocks.length, type)}
									onPaste={clear => onPasteBlock(slide.blocks.length, clear)}
								/>
							)}
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

function OverviewPanel({
	form,
	onChange
}: {
	form: EditorForm;
	onChange: (form: EditorForm) => void;
}) {
	const settings = form.settings ?? {};

	return (
		<Card className="rounded-3xl">
			<CardHeader className="border-b">
				<CardTitle>Form Details</CardTitle>
				<CardDescription>
					Set the overall look and feel here, then build the screens below.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 py-4">
				<div className="grid gap-4 md:grid-cols-2">
					<FieldWrapper className="md:col-span-2" label="Form title">
						<Input
							onChange={event => onChange(withOptionalString(form, "title", event.target.value))}
							placeholder="Untitled form"
							value={getPlainRenderableText(form.title)}
						/>
					</FieldWrapper>
					<FieldWrapper className="md:col-span-2" label="Form description">
						<Textarea
							className="min-h-24"
							onChange={event => onChange(withOptionalString(form, "description", event.target.value))}
							placeholder="Describe what this form is about"
							value={getPlainRenderableText(form.description)}
						/>
					</FieldWrapper>
					<SimpleSelectField
						items={LANG_ITEMS}
						label="Language"
						onValueChange={nextValue => onChange({
							...form,
							settings: {
								...(form.settings ?? {}),
								localization: nextValue as JsonFormSettings["localization"]
							}
						})}
						value={getLocalizationCode(settings.localization)}
					/>
					<SimpleSelectField
						items={COLOR_SCHEME_ITEMS}
						label="Color scheme"
						onValueChange={nextValue => onChange({
							...form,
							settings: {
								...(form.settings ?? {}),
								colorScheme: nextValue
							}
						})}
						value={(settings.colorScheme ?? "light")}
					/>
					<SimpleSelectField
						items={PAGE_MODE_ITEMS}
						label="Layout"
						onValueChange={nextValue => onChange({
							...form,
							settings: {
								...(form.settings ?? {}),
								page: nextValue
							}
						})}
						value={(settings.page ?? "form-slides")}
					/>
					<SimpleSelectField
						items={PAGE_PROGRESS_ITEMS}
						label="Progress display"
						onValueChange={nextValue => onChange({
							...form,
							settings: {
								...(form.settings ?? {}),
								pageProgress: nextValue
							}
						})}
						value={(settings.pageProgress ?? "show")}
					/>
					<SimpleSelectField
						items={BUTTON_ALIGNMENT_ITEMS}
						label="Button alignment"
						onValueChange={nextValue => onChange({
							...form,
							settings: {
								...(form.settings ?? {}),
								buttonAlignment: nextValue
							}
						})}
						value={(settings.buttonAlignment ?? "start")}
					/>
					<SimpleSelectField
						items={ROUNDED_ITEMS}
						label="Corner style"
						onValueChange={nextValue => onChange({
							...form,
							settings: {
								...(form.settings ?? {}),
								rounded: nextValue
							}
						})}
						value={(settings.rounded ?? "default")}
					/>
					<SimpleSelectField
						items={VERTICAL_ALIGNMENT_ITEMS}
						label="Vertical alignment"
						onValueChange={nextValue => onChange({
							...form,
							settings: {
								...(form.settings ?? {}),
								verticalAlignment: nextValue
							}
						})}
						value={(settings.verticalAlignment ?? "start")}
					/>
					<FieldWrapper label="Footer note">
						<Input
							onChange={event => onChange({
								...form,
								settings: withOptionalString(settings as Record<string, unknown>, "footer", event.target.value)
							})}
							placeholder="Optional footer note"
							value={getPlainRenderableText(settings.footer)}
						/>
					</FieldWrapper>
					<FieldWrapper label="Submit button text">
						<Input
							onChange={event => onChange({
								...form,
								settings: withOptionalString(settings as Record<string, unknown>, "submitButtonText", event.target.value)
							})}
							placeholder="Submit"
							value={getPlainRenderableText(settings.submitButtonText)}
						/>
					</FieldWrapper>
				</div>
				<div className="flex flex-wrap gap-4 rounded-xl border bg-muted/20 px-3 py-3">
					<ToggleField checked={settings.isFullPage ?? false} label="Use full-page layout" onCheckedChange={nextValue => onChange({ ...form, settings: { ...(form.settings ?? {}), isFullPage: nextValue } })} />
					<ToggleField checked={(settings.placeholders ?? "show") == "show"} label="Show placeholders" onCheckedChange={nextValue => onChange({ ...form, settings: { ...(form.settings ?? {}), placeholders: nextValue ? "show" : "hide" } })} />
					<ToggleField checked={(settings.slideControls ?? "show") == "show"} label="Show back button" onCheckedChange={nextValue => onChange({ ...form, settings: { ...(form.settings ?? {}), slideControls: nextValue ? "show" : "hide" } })} />
					<ToggleField checked={(settings.restartButton ?? "show") == "show"} label="Show restart button" onCheckedChange={nextValue => onChange({ ...form, settings: { ...(form.settings ?? {}), restartButton: nextValue ? "show" : "hide" } })} />
					<ToggleField checked={settings.saveState ?? false} label="Remember progress" onCheckedChange={nextValue => onChange({ ...form, settings: { ...(form.settings ?? {}), saveState: nextValue } })} />
				</div>
			</CardContent>
		</Card>
	);
}

export function FormEditor({
	className,
	defaultValue,
	mode = "edit",
	onChange,
	onPreviewPartialSubmit,
	onPreviewSubmit,
	previewClassName,
	previewInitialValues,
	value
}: FormEditorProps) {
	const isReadonly = mode == "readonly";
	const initialRawForm = React.useMemo(() => value ?? defaultValue ?? createDefaultForm(), [defaultValue, value]);
	const [editorForm, setEditorForm] = React.useState<EditorForm>(() => normalizeForm(initialRawForm));
	const [collapsedMap, setCollapsedMap] = React.useState<Record<string, boolean>>({});
	const [clipboard, setClipboard] = React.useState<ClipboardState>(null);
	const [dragState, setDragState] = React.useState<DragState>(null);
	const [dragTargetId, setDragTargetId] = React.useState<string | null>(null);
	const [focusedSlideId, setFocusedSlideId] = React.useState<string | null>(null);
	const [previewNonce, setPreviewNonce] = React.useState(0);
	const updateTimeoutRef = React.useRef<NodeJS.Timeout>();
	const lastExternalSignatureRef = React.useRef<string | null>(null);

	const serializedForm = React.useMemo(() => serializeForm(editorForm), [editorForm]);
	const serializedSignature = React.useMemo(() => JSON.stringify(serializedForm), [serializedForm]);
	const focusedSlideIndex = React.useMemo(() => {
		if(focusedSlideId == null)
			return null;

		const index = editorForm.slides.findIndex(slide => slide.editorId == focusedSlideId);
		return index >= 0 ? index : null;
	}, [editorForm.slides, focusedSlideId]);
	const previewForm = React.useMemo(() => {
		if(focusedSlideIndex == null)
			return serializedForm;

		return {
			...serializedForm,
			settings: {
				...(serializedForm.settings ?? {}),
				startSlide: focusedSlideIndex
			}
		};
	}, [focusedSlideIndex, serializedForm]);
	const previewSignature = React.useMemo(() => JSON.stringify(previewForm), [previewForm]);

	React.useEffect(() => {
		lastExternalSignatureRef.current = serializedSignature;
	}, [serializedSignature]);

	React.useEffect(() => {
		if(value == null)
			return;

		const nextSignature = JSON.stringify(value);
		if(lastExternalSignatureRef.current == nextSignature)
			return;

		setEditorForm(normalizeForm(value));
		lastExternalSignatureRef.current = nextSignature;
	}, [value]);

	const onChangeRef = React.useRef(onChange);
	onChangeRef.current = onChange;
	React.useEffect(() => {
		if(updateTimeoutRef.current)
			clearTimeout(updateTimeoutRef.current);

		updateTimeoutRef.current = setTimeout(() => {
			lastExternalSignatureRef.current = serializedSignature;
			onChangeRef.current?.(serializedForm);
		}, 80);

		return () => {
			if(updateTimeoutRef.current)
				clearTimeout(updateTimeoutRef.current);
		};
	}, [serializedForm, serializedSignature]);

	const fieldReferences = React.useMemo<FieldReference[]>(() => {
		const items: FieldReference[] = [];
		let fallbackIndex = 1;

		for(const slide of editorForm.slides) {
			for(const block of slide.blocks) {
				if(!isFieldBlock(block))
					continue;

				const label = summarizeRenderableText(block.question, "").trim() || `Question ${fallbackIndex}`;
				items.push({
					label,
					name: block.name
				});
				fallbackIndex += 1;
			}
		}

		return items;
	}, [editorForm.slides]);

	function updateForm(updater: (form: EditorForm) => EditorForm): void {
		setEditorForm(currentForm => updater(currentForm));
	}

	function updateSlide(slideId: string, updater: (slide: EditorSlide) => EditorSlide): void {
		updateForm(currentForm => ({
			...currentForm,
			slides: currentForm.slides.map(slide => slide.editorId == slideId ? updater(slide) : slide)
		}));
	}

	function insertSlide(index: number, kind: JsonSlideKind): void {
		updateForm(currentForm => ({
			...currentForm,
			slides: insertAt(currentForm.slides, index, normalizeSlide(createDefaultSlide(kind)))
		}));
	}

	function pasteSlide(index: number): void {
		if(clipboard?.scope != "slide")
			return;

		updateForm(currentForm => ({
			...currentForm,
			slides: insertAt(currentForm.slides, index, cloneEditorSlide(clipboard.slide))
		}));
	}

	function insertBlock(slideId: string, index: number, type: JsonFormBlock["type"]): void {
		updateSlide(slideId, slide => ({
			...slide,
			blocks: insertAt(slide.blocks, index, normalizeBlock(createDefaultBlock(type)))
		}));
	}

	function pasteBlock(slideId: string, index: number): void {
		if(clipboard?.scope != "block")
			return;

		updateSlide(slideId, slide => ({
			...slide,
			blocks: insertAt(slide.blocks, index, cloneEditorBlock(clipboard.block))
		}));
	}

	function handleSlideDrop(targetSlideId: string): void {
		if(dragState?.scope != "slide")
			return;

		updateForm(currentForm => {
			const fromIndex = currentForm.slides.findIndex(slide => slide.editorId == dragState.draggedId);
			const toIndex = currentForm.slides.findIndex(slide => slide.editorId == targetSlideId);
			if(fromIndex < 0 || toIndex < 0)
				return currentForm;

			return {
				...currentForm,
				slides: moveItem(currentForm.slides, fromIndex, toIndex)
			};
		});

		setDragState(null);
		setDragTargetId(null);
	}

	function handleBlockDrop(slideId: string, targetBlockId: string): void {
		if(dragState?.scope != "block" || dragState.slideId != slideId)
			return;

		updateSlide(slideId, slide => {
			const fromIndex = slide.blocks.findIndex(block => block.editorId == dragState.draggedId);
			const toIndex = slide.blocks.findIndex(block => block.editorId == targetBlockId);
			if(fromIndex < 0 || toIndex < 0)
				return slide;

			return {
				...slide,
				blocks: moveItem(slide.blocks, fromIndex, toIndex)
			};
		});

		setDragState(null);
		setDragTargetId(null);
	}

	return (
		<div
			aria-disabled={isReadonly}
			className={cn("grid gap-4 md:h-full md:grid-cols-[minmax(380px,560px)_minmax(0,1fr)]", isReadonly && "pointer-events-none select-none opacity-75", className)}
		>
			<Card className="flex h-full flex-col overflow-hidden rounded-3xl">
				<CardHeader className="border-b">
					<CardTitle className="flex items-center gap-2">
						<LayoutTemplateIcon className="size-4" />
						Form Builder
					</CardTitle>
					<CardDescription>
						Arrange screens, add content blocks, and shape each question directly in place.
					</CardDescription>
					<CardAction className="flex items-center gap-2">
						<Button
							onClick={() => {
								setEditorForm(normalizeForm(createDefaultForm()));
								setCollapsedMap({});
								setClipboard(null);
								setPreviewNonce(current => current + 1);
							}}
							size="sm"
							type="button"
							variant="outline"
						>
							<RefreshCcwIcon />
							Start fresh
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent className="min-h-0 flex-1 overflow-auto p-0">
					<div className="space-y-4 p-4">
						<OverviewPanel form={editorForm} onChange={setEditorForm} />
						<Card className="rounded-3xl">
							<CardHeader className="border-b">
								<CardTitle>Screens</CardTitle>
								<CardDescription>
									Build the flow of the form from intro to finish.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2 py-4">
								<AddInsertControl
									canPaste={clipboard?.scope == "slide"}
									items={SLIDE_KIND_ITEMS}
									label="Add screen"
									onAdd={kind => insertSlide(0, kind)}
									onPaste={clear => {
										pasteSlide(0);
										if(clear)
											setClipboard(null);
									}}
								/>
								<div className="space-y-2">
									{editorForm.slides.map((slide, slideIndex) => (
										<React.Fragment key={slide.editorId}>
											{slideIndex > 0 ? (
												<AddInsertControl
													canPaste={clipboard?.scope == "slide"}
													items={SLIDE_KIND_ITEMS}
													label="Insert screen"
													onAdd={kind => insertSlide(slideIndex, kind)}
													onPaste={clear => {
														pasteSlide(slideIndex);
														if(clear)
															setClipboard(null);
													}}
												/>
											) : null}
											<div
													className={cn(
														"transition-shadow ring-2 ring-transparent ring-offset-2 rounded-2xl",
														dragTargetId == slide.editorId && "ring-primary"
													)}
													onFocusCapture={() => setFocusedSlideId(slide.editorId)}
													onDragOver={event => {
														if(dragState?.scope != "slide")
															return;

													event.preventDefault();
													setDragTargetId(slide.editorId);
												}}
												onDrop={() => handleSlideDrop(slide.editorId)}
											>
													<SlideCard
														availableFields={fieldReferences}
														canPasteBlock={clipboard?.scope == "block"}
														canPasteSlide={clipboard?.scope == "slide"}
														blockCollapsedMap={collapsedMap}
														blockDragTargetId={dragTargetId}
														isCollapsed={collapsedMap[slide.editorId] ?? true}
														onBlockDragEnd={() => {
															setDragState(null);
															setDragTargetId(null);
													}}
													onBlockDragStart={(event, blockId) => {
														event.dataTransfer.effectAllowed = "move";
														setDragState({
															draggedId: blockId,
															scope: "block",
															slideId: slide.editorId
														});
													}}
													onBlockDrop={targetBlockId => handleBlockDrop(slide.editorId, targetBlockId)}
													onBlockHover={(event, targetBlockId) => {
														if(dragState?.scope != "block" || dragState.slideId != slide.editorId)
															return;

														event.preventDefault();
														setDragTargetId(targetBlockId);
													}}
													onChange={nextSlide => updateSlide(slide.editorId, () => nextSlide)}
													onCopyBlock={block => setClipboard({ block: cloneEditorBlock(block), scope: "block" })}
													onCopy={() => setClipboard({ scope: "slide", slide: cloneEditorSlide(slide) })}
													onDelete={() => {
														updateForm(currentForm => ({
															...currentForm,
															slides: currentForm.slides.filter(currentSlide => currentSlide.editorId != slide.editorId)
														}));
													}}
													onDragEnd={() => {
														setDragState(null);
														setDragTargetId(null);
													}}
													onDragStart={event => {
														event.dataTransfer.effectAllowed = "move";
														setDragState({
															draggedId: slide.editorId,
															scope: "slide"
														});
													}}
													onInsertBlock={(index, type) => insertBlock(slide.editorId, index, type)}
													onMoveDown={() => {
														updateForm(currentForm => ({
															...currentForm,
															slides: moveItem(currentForm.slides, slideIndex, slideIndex + 1)
														}));
													}}
													onMoveUp={() => {
														updateForm(currentForm => ({
															...currentForm,
															slides: moveItem(currentForm.slides, slideIndex, slideIndex - 1)
														}));
													}}
													onPasteBlock={(index, clear) => {
														pasteBlock(slide.editorId, index);
														if(clear)
															setClipboard(null);
													}}
														onPasteSlide={clear => {
															pasteSlide(slideIndex + 1);
															if(clear)
																setClipboard(null);
														}}
													onToggleBlockCollapse={(blockId, nextValue) => {
														setCollapsedMap(currentMap => ({
															...currentMap,
															[blockId]: nextValue
														}));
													}}
														onToggleCollapse={() => {
															setCollapsedMap(currentMap => ({
																...currentMap,
																[slide.editorId]: !(currentMap[slide.editorId] ?? true)
															}));
														}}
													slide={slide}
													slideIndex={slideIndex}
													slideTotal={editorForm.slides.length}
												/>
											</div>
										</React.Fragment>
									))}
								</div>
								{editorForm.slides.length == 0 ? (
									<div className="text-center py-8 text-sm text-muted-foreground">
										No screens yet. Add one above to start building the flow.
									</div>
								) : (
									<AddInsertControl
										canPaste={clipboard?.scope == "slide"}
										items={SLIDE_KIND_ITEMS}
										label="Add screen"
										onAdd={kind => insertSlide(editorForm.slides.length, kind)}
										onPaste={clear => {
											pasteSlide(editorForm.slides.length);
											if(clear)
												setClipboard(null);
										}}
									/>
								)}
							</CardContent>
						</Card>
					</div>
				</CardContent>
			</Card>
			<Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl">
				<CardHeader className="border-b">
					<CardTitle className="flex items-center gap-2">
						<EyeIcon className="size-4" />
						Live Preview
					</CardTitle>
					<CardDescription>
						The preview updates as you edit. Reset it if you want to replay the form flow from the beginning.
					</CardDescription>
					<CardAction className="flex items-center gap-2">
						<Button
							onClick={() => {
								setFocusedSlideId(null);
								setPreviewNonce(current => current + 1);
							}}
							size="sm"
							type="button"
							variant="outline"
						>
							<RefreshCcwIcon />
							Reset preview
						</Button>
					</CardAction>
				</CardHeader>
					<CardContent className="min-h-0 flex-1 overflow-auto p-0">
						<div className={cn("bg-muted/20 min-h-full p-4", previewClassName)}>
							<Form
								className="rounded-3xl"
								form={previewForm}
								initialValues={previewInitialValues}
								key={`${previewSignature}:${previewNonce}`}
								onPartialSubmit={onPreviewPartialSubmit}
								onSubmit={onPreviewSubmit}
							/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default FormEditor;
