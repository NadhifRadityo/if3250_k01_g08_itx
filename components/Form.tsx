"use client";

/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import * as React from "react";
import { useForm, useWatch, Controller, type Control, type ControllerFieldState } from "react-hook-form";
import {
	StarIcon,
	CheckIcon,
	HeartIcon,
	ImageIcon,
	UploadIcon,
	ArrowLeftIcon,
	ArrowRightIcon,
	RefreshCcwIcon,
	AlertCircleIcon
} from "lucide-react";

import cn from "@/utils/cn";

import { DatetimeInput } from "./DatetimeInput";
import { Alert, AlertTitle, AlertDescription } from "./radix/Alert";
import { Button } from "./radix/Button";
import {
	Card,
	CardTitle,
	CardFooter,
	CardHeader,
	CardContent,
	CardDescription
} from "./radix/Card";
import { Checkbox } from "./radix/Checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldTitle,
	FieldDescription
} from "./radix/Field";
import { Input } from "./radix/Input";
import {
	InputGroup,
	InputGroupText,
	InputGroupAddon,
	InputGroupInput,
	InputGroupTextarea
} from "./radix/InputGroup";
import { Label } from "./radix/Label";
import { NativeSelect, NativeSelectOption } from "./radix/NativeSelect";
import { Progress } from "./radix/Progress";
import { RadioGroup, RadioGroupItem } from "./radix/RadioGroup";
import {
	Select,
	SelectItem,
	SelectValue,
	SelectContent,
	SelectTrigger
} from "./radix/Select";
import { Separator } from "./radix/Separator";

type JsonPrimitive = string | number | boolean | null;
type JsonSerializable = JsonPrimitive | JsonSerializable[] | { [key: string]: JsonSerializable };

export type JsonBindingSource =
	"constant" |
	"field" |
	"form" |
	"localStorage" |
	"searchParam" |
	"slide" |
	"url";

export type JsonBinding = {
	source: JsonBindingSource;
	key?: string;
	value?: JsonSerializable;
	fallback?: JsonSerializable;
};

export type JsonBindingToken = {
	bind: JsonBinding;
};

export type JsonResolvableValue =
	JsonSerializable |
	JsonBinding |
	JsonBindingToken |
	{ [key: string]: JsonResolvableValue } |
	JsonResolvableValue[];

export type JsonRenderableText =
	string |
	number |
	JsonBinding |
	JsonBindingToken |
	Array<string | number | JsonBinding | JsonBindingToken>;

export type JsonComparison = {
	left: JsonResolvableValue;
	right: JsonResolvableValue;
};

export type JsonCondition =
	{ all: JsonCondition[] } |
	{ any: JsonCondition[] } |
	{ not: JsonCondition } |
	{ eq: JsonComparison } |
	{ ne: JsonComparison } |
	{ gt: JsonComparison } |
	{ gte: JsonComparison } |
	{ lt: JsonComparison } |
	{ lte: JsonComparison } |
	{ includes: JsonComparison } |
	{ in: JsonComparison } |
	{ matches: JsonComparison } |
	{ truthy: JsonResolvableValue } |
	{ falsy: JsonResolvableValue } |
	{ isEmpty: JsonResolvableValue } |
	{
		field: string;
		equals?: JsonResolvableValue;
		notEquals?: JsonResolvableValue;
		greaterThan?: JsonResolvableValue;
		greaterThanOrEqual?: JsonResolvableValue;
		lessThan?: JsonResolvableValue;
		lessThanOrEqual?: JsonResolvableValue;
		includes?: JsonResolvableValue;
		matches?: string;
	};

export type JsonConditionConfig = JsonCondition | {
	condition: JsonCondition;
	dependencies?: string[];
};

export type JsonAttribute =
	{
		name: string;
		value: JsonResolvableValue;
	} |
	Record<string, JsonResolvableValue>;

export type JsonFieldType =
	"text" |
	"email" |
	"url" |
	"tel" |
	"password" |
	"number" |
	"select" |
	"choice" |
	"pictureChoice" |
	"rating" |
	"opinionScale" |
	"datetime" |
	"date" |
	"time" |
	"file";

export type JsonSlideKind = "slide" | "start" | "end";
export type JsonSlidePostMode = "every-change" | "slide-progress";
export type JsonPageMode = "form-slides" | "single" | "slides";
export type JsonToggleSetting = "hide" | "show";
export type JsonPageProgressMode = "decorative" | "hide" | "show";
export type JsonRoundedMode = "default" | "none" | "pill";
export type JsonVerticalAlignment = "center" | "end" | "start";
export type JsonButtonAlignment = "center" | "end" | "start" | "stretch";
export type JsonColorScheme = "dark" | "light" | "system";

export type JsonLocalizationDictionary = Partial<{
	back: string;
	chooseMany: string;
	chooseOne: string;
	continue: string;
	endDescription: string;
	endTitle: string;
	fileCurrent: string;
	filePrompt: string;
	fileTooLarge: string;
	imageOnly: string;
	next: string;
	phoneCountry: string;
	required: string;
	restart: string;
	selectPlaceholder: string;
	start: string;
	submit: string;
}>;

export type JsonThemeConfig = Record<string, string>;

export type JsonFormSettings = {
	buttonAlignment?: JsonButtonAlignment;
	colorScheme?: JsonColorScheme;
	footer?: JsonRenderableText | JsonToggleSetting;
	formsmdBranding?: JsonToggleSetting;
	getHeaders?: JsonResolvableValue;
	isFullPage?: boolean;
	localization?: JsonLocalizationDictionary | string;
	page?: JsonPageMode;
	pageProgress?: JsonPageProgressMode;
	placeholders?: JsonToggleSetting;
	postData?: JsonResolvableValue;
	postHeaders?: JsonResolvableValue;
	postSheetName?: JsonRenderableText;
	postUrl?: JsonRenderableText;
	restartButton?: JsonToggleSetting;
	rounded?: JsonRoundedMode;
	sanitize?: boolean;
	saveState?: boolean;
	slideControls?: JsonToggleSetting;
	startSlide?: number;
	submitButtonText?: JsonRenderableText;
	themeDark?: JsonThemeConfig;
	themeLight?: JsonThemeConfig;
	verticalAlignment?: JsonVerticalAlignment;
};

export type JsonFormOptions = JsonFormSettings;

type JsonBlockBase = {
	attrs?: JsonAttribute[];
	autofocus?: boolean;
	classNames?: string | string[];
	disabled?: boolean;
	displayCondition?: JsonConditionConfig;
	hidden?: boolean;
	id?: string;
	meta?: Record<string, unknown>;
	required?: boolean;
};

type JsonContentBase = JsonBlockBase & {
	align?: "center" | "end" | "start";
};

export type JsonHeadingBlock = JsonContentBase & {
	level?: 1 | 2 | 3;
	text?: JsonRenderableText;
	type: "heading";
};

export type JsonCopyBlock = JsonContentBase & {
	content?: JsonRenderableText;
	text?: JsonRenderableText;
	type: "copy" | "text";
};

export type JsonDescriptionBlock = JsonContentBase & {
	content?: JsonRenderableText;
	text?: JsonRenderableText;
	type: "description";
};

export type JsonHelperBlock = JsonContentBase & {
	content?: JsonRenderableText;
	text?: JsonRenderableText;
	type: "helper";
};

export type JsonDividerBlock = JsonContentBase & {
	label?: JsonRenderableText;
	type: "divider";
};

export type JsonMediaBlock = JsonContentBase & {
	alt?: JsonRenderableText;
	aspectRatio?: number;
	caption?: JsonRenderableText;
	fit?: "contain" | "cover";
	poster?: JsonRenderableText;
	src: JsonRenderableText;
	type: "media";
	mediaType?: "image" | "video";
};

type JsonFieldBlockBase = JsonBlockBase & {
	attrs?: JsonAttribute[];
	classNames?: string | string[];
	description?: JsonRenderableText;
	fieldSize?: "default" | "lg" | "sm";
	fieldType?: JsonFieldType;
	id?: string;
	labelStyle?: "classic" | "default" | "muted";
	name: string;
	question?: JsonRenderableText;
	subfield?: boolean;
};

type JsonTextLikeField = JsonFieldBlockBase & {
	maxlength?: number;
	pattern?: string;
	placeholder?: JsonRenderableText;
	value?: string;
};

export type JsonTextFieldBlock = JsonTextLikeField & {
	multiline?: boolean;
	type: "field" | "text";
	fieldType?: "text";
};

export type JsonEmailFieldBlock = JsonTextLikeField & {
	type: "email";
};

export type JsonUrlFieldBlock = JsonTextLikeField & {
	type: "url";
};

export type JsonTelephoneFieldBlock = JsonTextLikeField & {
	availableCountries?: string[];
	country?: string;
	type: "tel";
};

export type JsonPasswordFieldBlock = JsonTextLikeField & {
	type: "password";
};

export type JsonNumberFieldBlock = JsonFieldBlockBase & {
	max?: number;
	min?: number;
	placeholder?: JsonRenderableText;
	step?: number;
	type: "number";
	unit?: JsonRenderableText;
	unitEnd?: JsonRenderableText;
	value?: number | string;
};

export type JsonSelectOption = string | {
	label: JsonRenderableText;
	value?: string;
};

export type JsonSelectFieldBlock = JsonFieldBlockBase & {
	options: JsonSelectOption[];
	placeholder?: JsonRenderableText;
	selected?: string;
	type: "select";
};

export type JsonChoiceOption = string | {
	label: JsonRenderableText;
	value?: string;
};

export type JsonChoiceFieldBlock = JsonFieldBlockBase & {
	checked?: string | string[];
	choices: JsonChoiceOption[];
	hideFormText?: boolean;
	horizontal?: boolean;
	multiple?: boolean;
	type: "choice";
};

export type JsonPictureChoiceOption = {
	image: JsonRenderableText;
	label: JsonRenderableText;
	value?: string;
};

export type JsonPictureChoiceFieldBlock = JsonFieldBlockBase & {
	checked?: string | string[];
	choices: JsonPictureChoiceOption[];
	hideFormText?: boolean;
	hideLabels?: boolean;
	multiple?: boolean;
	supersize?: boolean;
	type: "pictureChoice";
};

export type JsonRatingFieldBlock = JsonFieldBlockBase & {
	icon?: "heart" | "star";
	outOf?: number;
	type: "rating";
	value?: number;
};

export type JsonOpinionScaleFieldBlock = JsonFieldBlockBase & {
	hideLabelEnd?: boolean;
	hideLabelStart?: boolean;
	labelEnd?: JsonRenderableText;
	labelStart?: JsonRenderableText;
	outOf?: number;
	startAt?: 0 | 1;
	type: "opinionScale";
	value?: number;
};

type JsonDateLikeField = JsonFieldBlockBase & {
	max?: string;
	min?: string;
	placeholder?: JsonRenderableText;
	step?: number;
	value?: string;
};

export type JsonDatetimeFieldBlock = JsonDateLikeField & {
	type: "datetime";
};

export type JsonDateFieldBlock = JsonDateLikeField & {
	type: "date";
};

export type JsonTimeFieldBlock = JsonDateLikeField & {
	type: "time";
};

export type JsonCurrentFile = string | {
	name?: string;
	size?: number;
	type?: string;
	url?: string;
};

export type JsonFileFieldBlock = JsonFieldBlockBase & {
	currentFile?: JsonCurrentFile;
	imageOnly?: boolean;
	sizeLimit?: number;
	type: "file";
};

export type JsonFieldBlock =
	JsonChoiceFieldBlock |
	JsonDateFieldBlock |
	JsonDatetimeFieldBlock |
	JsonEmailFieldBlock |
	JsonFileFieldBlock |
	JsonNumberFieldBlock |
	JsonOpinionScaleFieldBlock |
	JsonPasswordFieldBlock |
	JsonPictureChoiceFieldBlock |
	JsonRatingFieldBlock |
	JsonSelectFieldBlock |
	JsonTelephoneFieldBlock |
	JsonTextFieldBlock |
	JsonTimeFieldBlock |
	JsonUrlFieldBlock;

export type JsonContentBlock =
	JsonCopyBlock |
	JsonDescriptionBlock |
	JsonDividerBlock |
	JsonHeadingBlock |
	JsonHelperBlock |
	JsonMediaBlock;

export type JsonFormBlock = JsonContentBlock | JsonFieldBlock;

export type JsonFormSlide = {
	blocks?: JsonFormBlock[];
	buttonAlignment?: JsonButtonAlignment;
	buttonText?: JsonRenderableText;
	description?: JsonRenderableText;
	disablePrevious?: boolean;
	hidden?: boolean;
	id?: string;
	jumpCondition?: JsonConditionConfig;
	kind?: JsonSlideKind;
	meta?: Record<string, unknown>;
	pageProgress?: JsonRenderableText;
	post?: JsonSlidePostMode;
	redirectUrl?: JsonRenderableText;
	title?: JsonRenderableText;
	type?: JsonSlideKind;
};

export type JsonFormDefinition = {
	description?: JsonRenderableText;
	id?: string;
	options?: JsonFormOptions;
	settings?: JsonFormSettings;
	slides: JsonFormSlide[];
	title?: JsonRenderableText;
};

export type FormRequestPayload = {
	body: FormData | string | null;
	headers: Record<string, string>;
	method: "POST";
	url: string | null;
};

export type FormSubmitPayload = {
	data: Record<string, unknown>;
	form: JsonFormDefinition;
	kind: "final" | "partial";
	request: FormRequestPayload;
	slide: JsonFormSlide | null;
	slideIndex: number;
	values: Record<string, unknown>;
	visibleSlideIndex: number;
};

export type FormProps = {
	className?: string;
	form: JsonFormDefinition;
	initialValues?: Record<string, unknown>;
	onPartialSubmit?: (payload: FormSubmitPayload) => Promise<void> | void;
	onSubmit?: (payload: FormSubmitPayload) => Promise<void> | void;
};

type InternalSlide = {
	blocks: JsonFormBlock[];
	id: string;
	isVirtual?: boolean;
	kind: JsonSlideKind;
	sourceIndex: number;
	slide: JsonFormSlide;
};

type ResolutionContext = {
	form: JsonFormDefinition;
	options: ResolvedFormOptions;
	slide: JsonFormSlide | null;
	values: Record<string, unknown>;
};

type ResolvedFormOptions = Required<Pick<JsonFormSettings,
	"buttonAlignment" |
	"colorScheme" |
	"formsmdBranding" |
	"isFullPage" |
	"page" |
	"pageProgress" |
	"placeholders" |
	"restartButton" |
	"rounded" |
	"sanitize" |
	"saveState" |
	"slideControls" |
	"verticalAlignment">> &
	Omit<JsonFormSettings,
	"buttonAlignment" |
	"colorScheme" |
	"formsmdBranding" |
	"isFullPage" |
	"page" |
	"pageProgress" |
	"placeholders" |
	"restartButton" |
	"rounded" |
	"sanitize" |
	"saveState" |
	"slideControls" |
	"verticalAlignment"> & {
		localization: Required<JsonLocalizationDictionary>;
	};

const DEFAULT_LOCALIZATION: Required<JsonLocalizationDictionary> = {
	back: "Previous",
	chooseMany: "Choose one or more",
	chooseOne: "Choose one",
	continue: "Continue",
	endDescription: "Your answers have been recorded.",
	endTitle: "Thanks for your response",
	fileCurrent: "Current file",
	filePrompt: "Choose a file",
	fileTooLarge: "This file exceeds the size limit.",
	imageOnly: "Please choose an image file.",
	next: "Next",
	phoneCountry: "Country",
	required: "This field is required.",
	restart: "Start over",
	selectPlaceholder: "Select an option",
	start: "Start",
	submit: "Submit"
};

const ID_LOCALIZATION: Required<JsonLocalizationDictionary> = {
	back: "Kembali",
	chooseMany: "Pilih satu atau lebih",
	chooseOne: "Pilih satu",
	continue: "Lanjutkan",
	endDescription: "Jawaban Anda sudah tersimpan.",
	endTitle: "Terima kasih",
	fileCurrent: "File saat ini",
	filePrompt: "Pilih file",
	fileTooLarge: "Ukuran file melebihi batas.",
	imageOnly: "Silakan pilih file gambar.",
	next: "Lanjut",
	phoneCountry: "Negara",
	required: "Bagian ini wajib diisi.",
	restart: "Ulangi",
	selectPlaceholder: "Pilih salah satu",
	start: "Mulai",
	submit: "Kirim"
};

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
const AUTO_END_SLIDE_ID = "__json_form_auto_end__";
const COUNTRY_FIELD_SUFFIX = "__country";

const COUNTRY_DIAL_CODES: Record<string, string> = {
	AE: "+971",
	AU: "+61",
	BR: "+55",
	CA: "+1",
	CH: "+41",
	CN: "+86",
	DE: "+49",
	DK: "+45",
	ES: "+34",
	FI: "+358",
	FR: "+33",
	GB: "+44",
	HK: "+852",
	ID: "+62",
	IN: "+91",
	IT: "+39",
	JP: "+81",
	KR: "+82",
	MX: "+52",
	MY: "+60",
	NG: "+234",
	NL: "+31",
	NO: "+47",
	NZ: "+64",
	PH: "+63",
	SA: "+966",
	SE: "+46",
	SG: "+65",
	TH: "+66",
	TR: "+90",
	US: "+1",
	ZA: "+27"
};

const THEME_TOKEN_MAP: Record<string, string> = {
	accent: "--accent",
	accentForeground: "--accent-foreground",
	background: "--background",
	backgroundColor: "--background",
	border: "--border",
	card: "--card",
	cardForeground: "--card-foreground",
	foreground: "--foreground",
	input: "--input",
	muted: "--muted",
	mutedForeground: "--muted-foreground",
	popover: "--popover",
	popoverForeground: "--popover-foreground",
	primary: "--primary",
	primaryForeground: "--primary-foreground",
	ring: "--ring",
	secondary: "--secondary",
	secondaryForeground: "--secondary-foreground"
};

type ComparisonOperator =
	"eq" |
	"ne" |
	"gt" |
	"gte" |
	"lt" |
	"lte" |
	"includes" |
	"in" |
	"matches";

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) == "[object Object]";
}

function isBindingToken(value: unknown): value is JsonBindingToken {
	return isPlainObject(value) && isPlainObject(value.bind);
}

function isBinding(value: unknown): value is JsonBinding {
	return isPlainObject(value) && typeof value.source == "string";
}

function asBindingToken(value: unknown): JsonBindingToken | null {
	if(isBindingToken(value))
		return value;
	if(isBinding(value))
		return { bind: value };
	return null;
}

function getPathValue(source: unknown, path?: string): unknown {
	if(path == null || path.trim().length == 0)
		return source;

	return path
		.split(".")
		.filter(Boolean)
		.reduce<unknown>((current, segment) => {
			if(Array.isArray(current)) {
				const index = Number(segment);
				return Number.isNaN(index) ? undefined : current[index];
			}

			if(isPlainObject(current))
				return current[segment];

			return undefined;
		}, source);
}

function normalizeRenderableParts(value: JsonRenderableText | undefined): Array<string | number | JsonBinding | JsonBindingToken> {
	if(value == null)
		return [];

	return Array.isArray(value) ? value : [value];
}

function stringifyValue(value: unknown): string {
	if(value == null)
		return "";
	if(typeof value == "string")
		return value;
	if(typeof value == "number" || typeof value == "boolean")
		return String(value);
	if(Array.isArray(value))
		return value.map(item => stringifyValue(item)).join(", ");
	if(isPlainObject(value))
		return JSON.stringify(value);
	return "";
}

function resolveBindingValue(binding: JsonBindingToken, context: ResolutionContext): unknown {
	const { bind } = binding;

	switch(bind.source) {
		case "constant":
			return bind.value ?? bind.fallback ?? null;
		case "field":
			return getPathValue(context.values, bind.key) ?? bind.fallback ?? null;
		case "form":
			return getPathValue(context.form, bind.key) ?? bind.fallback ?? null;
		case "slide":
			return getPathValue(context.slide, bind.key) ?? bind.fallback ?? null;
		case "searchParam":
			if(typeof window == "undefined")
				return bind.fallback ?? null;
			return new URLSearchParams(window.location.search).get(bind.key ?? "") ?? bind.fallback ?? null;
		case "localStorage":
			if(typeof window == "undefined")
				return bind.fallback ?? null;
			try {
				const storedValue = window.localStorage.getItem(bind.key ?? "");
				return storedValue ?? bind.fallback ?? null;
			} catch{
				return bind.fallback ?? null;
			}
		case "url":
			if(typeof window == "undefined")
				return bind.fallback ?? null;
			if(bind.key == "pathname")
				return window.location.pathname;
			if(bind.key == "origin")
				return window.location.origin;
			if(bind.key == "hash")
				return window.location.hash;
			return window.location.href;
		default:
			return bind.fallback ?? null;
	}
}

function resolveDynamicValue(value: JsonResolvableValue | undefined, context: ResolutionContext): unknown {
	if(value == null)
		return value;

	const binding = asBindingToken(value);
	if(binding)
		return resolveBindingValue(binding, context);

	if(Array.isArray(value))
		return value.map(item => resolveDynamicValue(item, context));

	if(isPlainObject(value)) {
		const resolvedEntries = Object.entries(value).map(([key, item]) => [key, resolveDynamicValue(item, context)]);
		return Object.fromEntries(resolvedEntries);
	}

	return value;
}

function resolveText(value: JsonRenderableText | undefined, context: ResolutionContext): string {
	return normalizeRenderableParts(value)
		.map(part => {
			const binding = asBindingToken(part);
			if(binding)
				return stringifyValue(resolveBindingValue(binding, context));
			return stringifyValue(part);
		})
		.join("");
}

function normalizeCondition(condition: JsonConditionConfig | undefined): JsonCondition | null {
	if(condition == null)
		return null;

	if(isPlainObject(condition) && "condition" in condition && condition.condition)
		return condition.condition;

	return condition as JsonCondition;
}

function isEmptyValue(value: unknown): boolean {
	if(value == null)
		return true;
	if(typeof value == "string")
		return value.trim().length == 0;
	if(Array.isArray(value))
		return value.length == 0;
	return false;
}

function compareWithOperator(operator: ComparisonOperator, comparison: JsonComparison, context: ResolutionContext): boolean {
	const left = resolveDynamicValue(comparison.left, context);
	const right = resolveDynamicValue(comparison.right, context);

	switch(operator) {
		case "eq":
			return left == right;
		case "ne":
			return left != right;
		case "gt":
			return Number(left) > Number(right);
		case "gte":
			return Number(left) >= Number(right);
		case "lt":
			return Number(left) < Number(right);
		case "lte":
			return Number(left) <= Number(right);
		case "includes":
			if(Array.isArray(left))
				return left.includes(right);
			return stringifyValue(left).includes(stringifyValue(right));
		case "in":
			if(Array.isArray(right))
				return right.includes(left);
			return stringifyValue(right).includes(stringifyValue(left));
		case "matches":
			try {
				return new RegExp(String(right)).test(stringifyValue(left));
			} catch{
				return false;
			}
		default:
			return false;
	}
}

function evaluateCondition(condition: JsonConditionConfig | undefined, context: ResolutionContext): boolean {
	const normalized = normalizeCondition(condition);
	if(normalized == null)
		return true;

	if("all" in normalized)
		return normalized.all.every(entry => evaluateCondition(entry, context));

	if("any" in normalized)
		return normalized.any.some(entry => evaluateCondition(entry, context));

	if("not" in normalized)
		return !evaluateCondition(normalized.not, context);

	if("eq" in normalized)
		return compareWithOperator("eq", normalized.eq, context);

	if("ne" in normalized)
		return compareWithOperator("ne", normalized.ne, context);

	if("gt" in normalized)
		return compareWithOperator("gt", normalized.gt, context);

	if("gte" in normalized)
		return compareWithOperator("gte", normalized.gte, context);

	if("lt" in normalized)
		return compareWithOperator("lt", normalized.lt, context);

	if("lte" in normalized)
		return compareWithOperator("lte", normalized.lte, context);

	if("includes" in normalized && isPlainObject(normalized.includes) && "left" in normalized.includes)
		return compareWithOperator("includes", normalized.includes as JsonComparison, context);

	if("in" in normalized)
		return compareWithOperator("in", normalized.in, context);

	if("matches" in normalized && isPlainObject(normalized.matches))
		return compareWithOperator("matches", normalized.matches, context);

	if("truthy" in normalized)
		return !isEmptyValue(resolveDynamicValue(normalized.truthy, context));

	if("falsy" in normalized)
		return isEmptyValue(resolveDynamicValue(normalized.falsy, context));

	if("isEmpty" in normalized)
		return isEmptyValue(resolveDynamicValue(normalized.isEmpty, context));

	if("field" in normalized) {
		const left = resolveDynamicValue({ bind: { source: "field", key: normalized.field } }, context);
		if("equals" in normalized)
			return left == resolveDynamicValue(normalized.equals, context);
		if("notEquals" in normalized)
			return left != resolveDynamicValue(normalized.notEquals, context);
		if("greaterThan" in normalized)
			return Number(left) > Number(resolveDynamicValue(normalized.greaterThan, context));
		if("greaterThanOrEqual" in normalized)
			return Number(left) >= Number(resolveDynamicValue(normalized.greaterThanOrEqual, context));
		if("lessThan" in normalized)
			return Number(left) < Number(resolveDynamicValue(normalized.lessThan, context));
		if("lessThanOrEqual" in normalized)
			return Number(left) <= Number(resolveDynamicValue(normalized.lessThanOrEqual, context));
		if("includes" in normalized) {
			const target = resolveDynamicValue(normalized.includes, context);
			return Array.isArray(left) ? left.includes(target) : stringifyValue(left).includes(stringifyValue(target));
		}
		if("matches" in normalized && typeof normalized.matches == "string") {
			try {
				return new RegExp(normalized.matches).test(stringifyValue(left));
			} catch{
				return false;
			}
		}
	}

	return true;
}

function normalizeLocalization(localization: JsonFormSettings["localization"]): Required<JsonLocalizationDictionary> {
	if(typeof localization == "string") {
		if(localization.toLowerCase().startsWith("id"))
			return { ...DEFAULT_LOCALIZATION, ...ID_LOCALIZATION };
		return DEFAULT_LOCALIZATION;
	}

	return { ...DEFAULT_LOCALIZATION, ...(localization ?? {}) };
}

function resolveOptions(form: JsonFormDefinition): ResolvedFormOptions {
	const merged = {
		...(form.settings ?? {}),
		...(form.options ?? {})
	};

	return {
		buttonAlignment: merged.buttonAlignment ?? "start",
		colorScheme: merged.colorScheme ?? "system",
		footer: merged.footer,
		formsmdBranding: merged.formsmdBranding ?? "hide",
		getHeaders: merged.getHeaders,
		isFullPage: merged.isFullPage ?? true,
		localization: normalizeLocalization(merged.localization),
		page: merged.page ?? "form-slides",
		pageProgress: merged.pageProgress ?? "show",
		placeholders: merged.placeholders ?? "show",
		postData: merged.postData,
		postHeaders: merged.postHeaders,
		postSheetName: merged.postSheetName,
		postUrl: merged.postUrl,
		restartButton: merged.restartButton ?? "show",
		rounded: merged.rounded ?? "default",
		sanitize: merged.sanitize ?? true,
		saveState: merged.saveState ?? false,
		slideControls: merged.slideControls ?? "show",
		startSlide: merged.startSlide,
		submitButtonText: merged.submitButtonText,
		themeDark: merged.themeDark,
		themeLight: merged.themeLight,
		verticalAlignment: merged.verticalAlignment ?? "center"
	};
}

function getSlideKind(slide: JsonFormSlide): JsonSlideKind {
	return slide.kind ?? slide.type ?? "slide";
}

function getFieldType(block: JsonFormBlock): JsonFieldType | null {
	if(!isPlainObject(block))
		return null;

	if("name" in block && typeof block.name == "string") {
		const rawType = block.type;
		if(typeof block.fieldType == "string" && FIELD_TYPES.has(block.fieldType))
			return block.fieldType;
		if(typeof rawType == "string" && FIELD_TYPE_ALIASES.has(rawType))
			return "text";
		if(typeof rawType == "string" && FIELD_TYPES.has(rawType as JsonFieldType))
			return rawType as JsonFieldType;
	}

	return null;
}

function isFieldBlock(block: JsonFormBlock): block is JsonFieldBlock {
	return getFieldType(block) != null;
}

function resolveClassNames(value: string | string[] | undefined): string {
	if(Array.isArray(value))
		return value.join(" ");
	return value ?? "";
}

function mapAttributeName(name: string): string {
	const mapped: Record<string, string> = {
		autocomplete: "autoComplete",
		inputmode: "inputMode",
		maxlength: "maxLength",
		minlength: "minLength",
		readonly: "readOnly",
		tabindex: "tabIndex"
	};

	return mapped[name.toLowerCase()] ?? name;
}

function sanitizeUrl(url: string, allowRelative: boolean): string {
	const trimmed = url.trim();
	if(trimmed.length == 0)
		return "";
	if(trimmed.startsWith("#"))
		return trimmed;
	if(trimmed.startsWith("/") && allowRelative)
		return trimmed;

	try {
		const parsed = new URL(trimmed, typeof window != "undefined" ? window.location.origin : "https://example.com");
		if(parsed.protocol == "http:" || parsed.protocol == "https:")
			return trimmed;
		return "";
	} catch{
		return "";
	}
}

function resolveAttributes(attrs: JsonAttribute[] | undefined, context: ResolutionContext, sanitize: boolean): Record<string, unknown> {
	if(!attrs?.length)
		return {};

	const resolvedEntries: Array<[string, unknown]> = [];

	for(const item of attrs) {
		if(isPlainObject(item) && "name" in item && typeof item.name == "string") {
			resolvedEntries.push([item.name, resolveDynamicValue(item.value, context)]);
			continue;
		}

		if(isPlainObject(item)) {
			for(const [name, value] of Object.entries(item))
				resolvedEntries.push([name, resolveDynamicValue(value, context)]);
		}
	}

	return Object.fromEntries(
		resolvedEntries
			.filter(([name]) => {
				const normalized = name.toLowerCase();
				if(normalized == "class" || normalized == "classname" || normalized == "style")
					return false;
				if(normalized.startsWith("on"))
					return false;
				return true;
			})
			.map(([name, value]) => {
				const mappedName = mapAttributeName(name);
				if(typeof value == "string" && sanitize && (mappedName == "href" || mappedName == "src"))
					return [mappedName, sanitizeUrl(value, mappedName == "href")];
				return [mappedName, value];
			})
	);
}

function getRoundedClass(mode: JsonRoundedMode, target: "action" | "control" | "surface"): string {
	if(mode == "none")
		return "rounded-none";

	if(mode == "pill") {
		if(target == "action")
			return "rounded-full";
		if(target == "control")
			return "rounded-3xl";
		return "rounded-[2rem]";
	}

	if(target == "action")
		return "rounded-2xl";
	if(target == "control")
		return "rounded-2xl";
	return "rounded-3xl";
}

function getButtonAlignmentClass(alignment: JsonButtonAlignment): string {
	switch(alignment) {
		case "center":
			return "justify-center";
		case "end":
			return "justify-end";
		case "stretch":
			return "justify-stretch";
		default:
			return "justify-start";
	}
}

function getVerticalAlignmentClass(alignment: JsonVerticalAlignment): string {
	switch(alignment) {
		case "end":
			return "justify-end";
		case "start":
			return "justify-start";
		default:
			return "justify-center";
	}
}

function getTextAlignmentClass(align?: "center" | "end" | "start"): string {
	if(align == "center")
		return "text-center";
	if(align == "end")
		return "text-right";
	return "text-left";
}

function getQuestionClass(block: JsonFieldBlock, rounded: JsonRoundedMode): string {
	if(block.subfield || block.labelStyle == "classic")
		return "text-sm font-semibold tracking-wide text-foreground";

	if(block.labelStyle == "muted")
		return "text-sm font-medium text-muted-foreground";

	return cn(
		"text-balance font-sans text-2xl leading-tight sm:text-3xl",
		rounded == "none" && "rounded-none"
	);
}

function getDescriptionClass(block: JsonFieldBlock): string {
	if(block.subfield || block.labelStyle == "classic")
		return "text-sm";
	return "text-base";
}

function getControlSizeClass(size: JsonFieldBlock["fieldSize"], rounded: JsonRoundedMode): string {
	if(size == "sm")
		return cn("h-10 text-sm", getRoundedClass(rounded, "control"));
	if(size == "lg")
		return cn("h-14 px-5 text-lg", getRoundedClass(rounded, "control"));
	return cn("h-12 px-4 text-base sm:text-lg", getRoundedClass(rounded, "control"));
}

function normalizeOption(option: JsonSelectOption | JsonChoiceOption): { label: string, value: string } {
	if(typeof option == "string")
		return { label: option, value: option };

	const label = typeof option.label == "string" ? option.label : "";
	return {
		label,
		value: option.value ?? label
	};
}

function buildFieldDefaults(blocks: JsonFieldBlock[], initialValues: Record<string, unknown>): Record<string, unknown> {
	const defaults: Record<string, unknown> = { ...initialValues };

	for(const block of blocks) {
		const fieldType = getFieldType(block);
		if(!fieldType)
			continue;

		if(defaults[block.name] == undefined) {
			switch(fieldType) {
				case "choice":
				case "pictureChoice":
					defaults[block.name] = isChoiceLikeBlock(block) && block.multiple ?
						normalizeCheckedValues(block.checked) :
						normalizeSingleCheckedValue(isChoiceLikeBlock(block) ? block.checked : undefined);
					break;
				case "number":
					defaults[block.name] = isNumberBlock(block) && block.value != null ? String(block.value) : "";
					break;
				case "rating":
				case "opinionScale":
					defaults[block.name] = isRatingLikeBlock(block) ? (block.value ?? null) : null;
					break;
				case "select":
					defaults[block.name] = isSelectBlock(block) ? (block.selected ?? "") : "";
					break;
				case "file":
					defaults[block.name] = null;
					break;
				default:
					defaults[block.name] = "value" in block && block.value != null ? block.value : "";
					break;
			}
		}

		if(fieldType == "tel") {
			const countryField = `${block.name}${COUNTRY_FIELD_SUFFIX}`;
			if(defaults[countryField] == undefined)
				defaults[countryField] = isTelephoneBlock(block) ? (block.country?.toUpperCase() ?? "US") : "US";
		}
	}

	return defaults;
}

function normalizeCheckedValues(value: string | string[] | undefined): string[] {
	if(Array.isArray(value))
		return value;
	if(typeof value == "string" && value.length > 0)
		return [value];
	return [];
}

function normalizeSingleCheckedValue(value: string | string[] | undefined): string {
	if(Array.isArray(value))
		return value[0] ?? "";
	return value ?? "";
}

function getAllFieldBlocks(form: JsonFormDefinition): JsonFieldBlock[] {
	return form.slides.flatMap(slide => (slide.blocks ?? []).filter(isFieldBlock));
}

function hashString(value: string): string {
	let hash = 0;
	for(const character of value)
		hash = ((hash << 5) - hash) + character.charCodeAt(0);
	return Math.abs(hash).toString(36);
}

function buildStorageKey(form: JsonFormDefinition): string {
	if(form.id?.trim())
		return `json-slide-form:${form.id.trim()}`;

	const signature = form.slides
		.map((slide, index) => `${slide.id ?? `slide-${index}`}:${getSlideKind(slide)}`)
		.join("|");

	return `json-slide-form:${hashString(signature)}`;
}

function stripNonSerializable(value: unknown): unknown {
	if(value instanceof File)
		return undefined;

	if(Array.isArray(value)) {
		return value
			.map(item => stripNonSerializable(item))
			.filter(item => item != undefined);
	}

	if(isPlainObject(value)) {
		const entries = Object.entries(value)
			.map(([key, item]) => [key, stripNonSerializable(item)] as const)
			.filter(([, item]) => item != undefined);
		return Object.fromEntries(entries);
	}

	return value;
}

function containsFile(value: unknown): boolean {
	if(value instanceof File)
		return true;
	if(Array.isArray(value))
		return value.some(item => containsFile(item));
	if(isPlainObject(value))
		return Object.values(value).some(item => containsFile(item));
	return false;
}

function appendFormData(formData: FormData, value: unknown, key: string): void {
	if(value == null)
		return;

	if(value instanceof File) {
		formData.append(key, value);
		return;
	}

	if(Array.isArray(value)) {
		for(const entry of value)
			appendFormData(formData, entry, `${key}[]`);
		return;
	}

	if(isPlainObject(value)) {
		for(const [childKey, childValue] of Object.entries(value))
			appendFormData(formData, childValue, key.length > 0 ? `${key}[${childKey}]` : childKey);
		return;
	}

	formData.append(key, String(value));
}

function deepMergeObjects(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
	const output = { ...target };
	for(const [key, value] of Object.entries(source)) {
		if(isPlainObject(value) && isPlainObject(output[key])) {
			output[key] = deepMergeObjects(output[key], value);
			continue;
		}
		output[key] = value;
	}
	return output;
}

function parsePattern(pattern: string | undefined): RegExp | null {
	if(pattern == null || pattern.length == 0)
		return null;
	try {
		return new RegExp(pattern);
	} catch{
		return null;
	}
}

function isChoiceBlock(block: JsonFieldBlock): block is JsonChoiceFieldBlock {
	return getFieldType(block) == "choice";
}

function isPictureChoiceBlock(block: JsonFieldBlock): block is JsonPictureChoiceFieldBlock {
	return getFieldType(block) == "pictureChoice";
}

function isChoiceLikeBlock(block: JsonFieldBlock): block is JsonChoiceFieldBlock | JsonPictureChoiceFieldBlock {
	return isChoiceBlock(block) || isPictureChoiceBlock(block);
}

function isNumberBlock(block: JsonFieldBlock): block is JsonNumberFieldBlock {
	return getFieldType(block) == "number";
}

function isSelectBlock(block: JsonFieldBlock): block is JsonSelectFieldBlock {
	return getFieldType(block) == "select";
}

function isRatingLikeBlock(block: JsonFieldBlock): block is JsonRatingFieldBlock | JsonOpinionScaleFieldBlock {
	const fieldType = getFieldType(block);
	return fieldType == "rating" || fieldType == "opinionScale";
}

function isTelephoneBlock(block: JsonFieldBlock): block is JsonTelephoneFieldBlock {
	return getFieldType(block) == "tel";
}

function isFileBlock(block: JsonFieldBlock): block is JsonFileFieldBlock {
	return getFieldType(block) == "file";
}

function isTextInputBlock(block: JsonFieldBlock): block is JsonTextFieldBlock {
	return getFieldType(block) == "text";
}

function formatBytes(bytes: number): string {
	if(bytes < 1024)
		return `${bytes} B`;
	if(bytes < 1024 * 1024)
		return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildThemeStyle(options: ResolvedFormOptions, resolvedColorScheme: "dark" | "light"): React.CSSProperties {
	const sourceTheme = resolvedColorScheme == "dark" ? options.themeDark : options.themeLight;
	if(!sourceTheme)
		return {};

	return Object.fromEntries(
		Object.entries(sourceTheme).map(([key, value]) => [THEME_TOKEN_MAP[key] ?? (key.startsWith("--") ? key : `--${key}`), value])
	);
}

function normalizeVisibleSlides(form: JsonFormDefinition, options: ResolvedFormOptions, values: Record<string, unknown>, includeAutoEnd: boolean): InternalSlide[] {
	const slides: InternalSlide[] = [];

	for(const [index, slide] of form.slides.entries()) {
		const slideContext: ResolutionContext = {
			form,
			options,
			slide,
			values
		};

		if(slide.hidden)
			continue;

		if(!evaluateCondition(slide.jumpCondition, slideContext))
			continue;

		const blocks = (slide.blocks ?? []).filter(block => {
			if(block.hidden)
				return false;
			return evaluateCondition(block.displayCondition, {
				form,
				options,
				slide,
				values
			});
		});

		slides.push({
			blocks,
			id: slide.id ?? `slide-${index}`,
			kind: getSlideKind(slide),
			sourceIndex: index,
			slide
		});
	}

	if(includeAutoEnd && !slides.some(slide => slide.kind == "end")) {
		slides.push({
			blocks: [
				{
					align: "center",
					text: DEFAULT_LOCALIZATION.endTitle,
					type: "heading"
				},
				{
					align: "center",
					text: DEFAULT_LOCALIZATION.endDescription,
					type: "description"
				}
			],
			id: AUTO_END_SLIDE_ID,
			isVirtual: true,
			kind: "end",
			sourceIndex: form.slides.length,
			slide: {
				id: AUTO_END_SLIDE_ID,
				kind: "end"
			}
		});
	}

	return slides;
}

function collectFieldNames(blocks: JsonFormBlock[]): string[] {
	return blocks
		.filter(isFieldBlock)
		.filter(block => !block.disabled)
		.map(block => block.name);
}

function getActionableSlides(slides: InternalSlide[]): InternalSlide[] {
	return slides.filter(slide => slide.kind == "slide");
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function parseProgressOverride(value: string): { label: string, percent: number | null } {
	const trimmed = value.trim();
	if(trimmed.endsWith("%")) {
		const percent = Number(trimmed.replace("%", ""));
		return {
			label: trimmed,
			percent: Number.isNaN(percent) ? null : clamp(percent, 0, 100)
		};
	}

	const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
	if(fractionMatch) {
		const current = Number(fractionMatch[1]);
		const total = Number(fractionMatch[2]);
		if(total > 0) {
			return {
				label: trimmed,
				percent: clamp((current / total) * 100, 0, 100)
			};
		}
	}

	return { label: trimmed, percent: null };
}

function getProgressState(currentSlide: InternalSlide | null, visibleSlides: InternalSlide[], options: ResolvedFormOptions, context: ResolutionContext): { label: string, percent: number } {
	if(!currentSlide)
		return { label: "", percent: 0 };

	const slideOverride = resolveText(currentSlide.slide.pageProgress, context);
	if(slideOverride.trim().length > 0) {
		const parsed = parseProgressOverride(slideOverride);
		return {
			label: parsed.label,
			percent: parsed.percent ?? 0
		};
	}

	const actionableSlides = getActionableSlides(visibleSlides);
	if(actionableSlides.length == 0)
		return { label: "", percent: currentSlide.kind == "end" ? 100 : 0 };

	if(currentSlide.kind == "start")
		return { label: "Start", percent: 0 };

	if(currentSlide.kind == "end")
		return { label: "Complete", percent: 100 };

	const currentIndex = actionableSlides.findIndex(slide => slide.id == currentSlide.id);
	const currentStep = currentIndex >= 0 ? currentIndex + 1 : actionableSlides.length;

	return {
		label: `Step ${currentStep} of ${actionableSlides.length}`,
		percent: clamp((currentStep / actionableSlides.length) * 100, 0, 100)
	};
}

function getCurrentFileSummary(file: JsonCurrentFile | undefined): { href?: string, label: string } | null {
	if(file == null)
		return null;
	if(typeof file == "string")
		return { label: file };
	return {
		href: file.url,
		label: file.name ?? file.url ?? "Attached file"
	};
}

function resolveChoiceItems(block: JsonChoiceFieldBlock, context: ResolutionContext): Array<{ label: string, value: string }> {
	return block.choices.map(choice => {
		if(typeof choice == "string")
			return { label: choice, value: choice };

		const label = resolveText(choice.label, context);
		return {
			label,
			value: choice.value ?? label
		};
	});
}

function resolvePictureChoiceItems(block: JsonPictureChoiceFieldBlock, context: ResolutionContext): Array<{ image: string, label: string, value: string }> {
	return block.choices.map(choice => {
		const label = resolveText(choice.label, context);
		return {
			image: resolveText(choice.image, context),
			label,
			value: choice.value ?? label
		};
	});
}

function getTelephoneCountries(block: JsonTelephoneFieldBlock): string[] {
	if(block.availableCountries?.length)
		return block.availableCountries.map(country => country.toUpperCase());
	return Object.keys(COUNTRY_DIAL_CODES);
}

function getTelephoneCountryLabel(country: string): string {
	return `${country} ${COUNTRY_DIAL_CODES[country] ?? ""}`.trim();
}

function serializeDateTimeValue(value: unknown): string {
	if(typeof value != "string" || value.trim().length == 0)
		return "";

	const [datePart, timePart] = value.split("T");
	if(!datePart || !timePart)
		return value;

	const date = new Date(`${datePart}T${timePart}`);
	if(Number.isNaN(date.getTime()))
		return value;

	const offsetMinutes = -date.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
	const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
	return `${value}${sign}${hours}:${minutes}`;
}

function serializeTelephoneValue(value: unknown, country: unknown): string {
	if(typeof value != "string" || value.trim().length == 0)
		return "";

	const trimmed = value.trim();
	if(trimmed.startsWith("+"))
		return trimmed;

	const normalizedCountry = typeof country == "string" && country.trim().length > 0 ? country.toUpperCase() : "US";
	const dialCode = COUNTRY_DIAL_CODES[normalizedCountry] ?? COUNTRY_DIAL_CODES.US;
	return `${dialCode} ${trimmed}`.trim();
}

function buildSubmissionData(
	values: Record<string, unknown>,
	fieldBlocks: JsonFieldBlock[],
	allowedNames?: Set<string>
): Record<string, unknown> {
	const output: Record<string, unknown> = {};

	for(const block of fieldBlocks) {
		const fieldType = getFieldType(block);
		if(!fieldType)
			continue;
		if(allowedNames && !allowedNames.has(block.name))
			continue;

		const value = values[block.name];

		switch(fieldType) {
			case "number":
				output[block.name] = value == null || value == "" ? null : Number(value);
				break;
			case "rating":
			case "opinionScale":
				output[block.name] = value == null || value == "" ? null : Number(value);
				break;
			case "choice":
			case "pictureChoice":
				output[block.name] = isChoiceLikeBlock(block) && block.multiple ?
					(Array.isArray(value) ? value : normalizeCheckedValues(typeof value == "string" ? value : undefined)) :
					(typeof value == "string" ? value : "");
				break;
			case "datetime":
				output[block.name] = serializeDateTimeValue(value);
				break;
			case "tel":
				output[block.name] = serializeTelephoneValue(value, values[`${block.name}${COUNTRY_FIELD_SUFFIX}`]);
				break;
			case "file":
				output[block.name] = value instanceof File ? value : null;
				break;
			default:
				output[block.name] = value ?? "";
				break;
		}
	}

	return output;
}

function getSubmitFieldNamesForSlide(visibleSlides: InternalSlide[], currentIndex: number): string[] {
	const names = new Set<string>();

	for(const slide of visibleSlides.slice(0, currentIndex + 1)) {
		for(const name of collectFieldNames(slide.blocks))
			names.add(name);
	}

	return [...names];
}

function buildRequestPayload(
	form: JsonFormDefinition,
	options: ResolvedFormOptions,
	slide: JsonFormSlide | null,
	values: Record<string, unknown>,
	data: Record<string, unknown>
): FormRequestPayload {
	const context: ResolutionContext = {
		form,
		options,
		slide,
		values
	};

	const resolvedHeaders = resolveDynamicValue(options.postHeaders, context);
	const resolvedPostData = resolveDynamicValue(options.postData, context);
	const resolvedPostUrl = sanitizeUrl(resolveText(options.postUrl, context), true);
	const resolvedPostSheetName = resolveText(options.postSheetName, context);

	let mergedData: Record<string, unknown> = { ...data };

	if(isPlainObject(resolvedPostData))
		mergedData = deepMergeObjects(mergedData, resolvedPostData);
	else if(resolvedPostData != null)
		mergedData.postData = resolvedPostData;

	if(resolvedPostSheetName.trim().length > 0)
		mergedData.postSheetName = resolvedPostSheetName;

	const headers = isPlainObject(resolvedHeaders) ?
		Object.fromEntries(
			Object.entries(resolvedHeaders).map(([key, value]) => [key, stringifyValue(value)])
		) :
		{};

	if(!resolvedPostUrl) {
		return {
			body: null,
			headers,
			method: "POST",
			url: null
		};
	}

	if(containsFile(mergedData)) {
		const formData = new FormData();
		appendFormData(formData, mergedData, "");
		delete headers["Content-Type"];
		delete headers["content-type"];
		return {
			body: formData,
			headers,
			method: "POST",
			url: resolvedPostUrl
		};
	}

	if(!Object.keys(headers).some(header => header.toLowerCase() == "content-type"))
		headers["Content-Type"] = "application/json";

	return {
		body: JSON.stringify(mergedData),
		headers,
		method: "POST",
		url: resolvedPostUrl
	};
}

async function performRequest(request: FormRequestPayload): Promise<void> {
	if(!request.url)
		return;

	const response = await fetch(request.url, {
		body: request.body,
		headers: request.headers,
		method: request.method
	});

	if(!response.ok)
		throw new Error(`Request failed with status ${response.status}.`);
}

function getSlideActionLabel(currentSlide: InternalSlide | null, nextSlide: InternalSlide | null, options: ResolvedFormOptions): string {
	if(!currentSlide)
		return options.localization.next;

	if(currentSlide.kind == "start") {
		return resolveText(currentSlide.slide.buttonText, {
			form: { slides: [] },
			options,
			slide: currentSlide.slide,
			values: {}
		}) || options.localization.start;
	}

	if(nextSlide?.kind == "end" || nextSlide == null) {
		return resolveText(options.submitButtonText, {
			form: { slides: [] },
			options,
			slide: currentSlide.slide,
			values: {}
		}) || options.localization.submit;
	}

	return resolveText(currentSlide.slide.buttonText, {
		form: { slides: [] },
		options,
		slide: currentSlide.slide,
		values: {}
	}) || options.localization.next;
}

function getContentBlockText(block: JsonContentBlock, context: ResolutionContext): string {
	if(block.type == "media")
		return "";

	if("text" in block && block.text != null)
		return resolveText(block.text, context);

	if("content" in block && block.content != null)
		return resolveText(block.content, context);

	return "";
}

function validateFieldValue(
	block: JsonFieldBlock,
	fieldType: JsonFieldType,
	value: unknown,
	values: Record<string, unknown>,
	localization: Required<JsonLocalizationDictionary>
): true | string {
	if(block.disabled)
		return true;

	if(fieldType == "choice" || fieldType == "pictureChoice") {
		const choiceBlock = isChoiceLikeBlock(block) ? block : null;
		if(block.required) {
			if(choiceBlock?.multiple) {
				if(!Array.isArray(value) || value.length == 0)
					return localization.required;
			} else if(typeof value != "string" || value.trim().length == 0)
				return localization.required;
		}
		return true;
	}

	if(fieldType == "file") {
		const fileBlock = isFileBlock(block) ? block : null;
		if(block.required && !(value instanceof File))
			return localization.required;

		if(value instanceof File) {
			const sizeLimitMb = fileBlock?.sizeLimit ?? 10;
			if(value.size > sizeLimitMb * 1024 * 1024)
				return localization.fileTooLarge;
			if(fileBlock?.imageOnly && !value.type.startsWith("image/"))
				return localization.imageOnly;
		}

		return true;
	}

	if(block.required && isEmptyValue(value))
		return localization.required;

	if(fieldType == "number") {
		const numberBlock = isNumberBlock(block) ? block : null;
		if(value == null || value == "")
			return true;
		const numericValue = Number(value);
		if(Number.isNaN(numericValue))
			return localization.required;
		if(numberBlock?.min != null && numericValue < numberBlock.min)
			return `Must be at least ${numberBlock.min}.`;
		if(numberBlock?.max != null && numericValue > numberBlock.max)
			return `Must be at most ${numberBlock.max}.`;
		return true;
	}

	if(fieldType == "rating" || fieldType == "opinionScale") {
		if(value == null || value == "")
			return block.required ? localization.required : true;
		return true;
	}

	if("pattern" in block) {
		const pattern = parsePattern(block.pattern);
		if(pattern && typeof value == "string" && value.length > 0 && !pattern.test(value))
			return "Please match the requested format.";
	}

	if(fieldType == "tel" && typeof values[`${block.name}${COUNTRY_FIELD_SUFFIX}`] != "string")
		return localization.phoneCountry;

	return true;
}

function renderResolvedQuestion(
	block: JsonFieldBlock,
	controlId: string,
	context: ResolutionContext,
	rounded: JsonRoundedMode
): React.ReactNode {
	const question = resolveText(block.question, context);
	if(question.trim().length == 0)
		return null;

	if(block.subfield || block.labelStyle == "classic") {
		return (
			<FieldLabel htmlFor={controlId} className={getQuestionClass(block, rounded)}>
				{question}
				{block.required ? <span className="text-destructive">*</span> : null}
			</FieldLabel>
		);
	}

	return (
		<FieldTitle className={getQuestionClass(block, rounded)}>
			{question}
			{block.required ? <span className="text-destructive">*</span> : null}
		</FieldTitle>
	);
}

function renderFieldDescription(block: JsonFieldBlock, context: ResolutionContext): React.ReactNode {
	const description = resolveText(block.description, context);
	if(description.trim().length == 0)
		return null;

	return (
		<FieldDescription className={getDescriptionClass(block)}>
			{description}
		</FieldDescription>
	);
}

function FieldWrapper({
	block,
	children,
	context,
	error,
	rounded
}: {
	block: JsonFieldBlock;
	children: React.ReactNode;
	context: ResolutionContext;
	error: ControllerFieldState["error"];
	rounded: JsonRoundedMode;
}) {
	const controlId = block.id ?? `${block.name}-control`;

	return (
		<Field
			data-disabled={block.disabled ? "true" : undefined}
			data-form-block-id={block.id}
			className={cn("gap-4", resolveClassNames(block.classNames))}
		>
			{renderResolvedQuestion(block, controlId, context, rounded)}
			{renderFieldDescription(block, context)}
			{children}
			{error ? <FieldError errors={[error]} /> : null}
		</Field>
	);
}

function renderSimpleInput({
	block,
	control,
	context,
	options,
	fieldType,
	inputType
}: {
	block: JsonEmailFieldBlock | JsonPasswordFieldBlock | JsonTelephoneFieldBlock | JsonTextFieldBlock | JsonUrlFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
	fieldType: JsonFieldType;
	inputType: React.ComponentProps<"input">["type"];
}) {
	const placeholder = options.placeholders == "hide" ? undefined : resolveText(block.placeholder, context);
	const roundedClass = getControlSizeClass(block.fieldSize, options.rounded);
	const elementAttrs = resolveAttributes(block.attrs, context, options.sanitize);
	const pattern = "pattern" in block ? block.pattern : undefined;
	const telephoneBlock = fieldType == "tel" && isTelephoneBlock(block) ? block : null;
	const multiline = fieldType == "text" && isTextInputBlock(block) ? !!block.multiline : false;

	return (
		<Controller
			control={control}
			name={block.name}
			rules={{
				validate: value => validateFieldValue(block, fieldType, value, context.values, options.localization)
			}}
			render={({ field, fieldState }) => (
				<FieldWrapper block={block} context={context} error={fieldState.error} rounded={options.rounded}>
					{fieldType == "tel" ? (
						<InputGroup className={cn("h-12 bg-background", getRoundedClass(options.rounded, "control"))}>
							<Controller
								control={control}
								name={`${block.name}${COUNTRY_FIELD_SUFFIX}`}
								render={({ field: countryField }) => (
									<InputGroupAddon align="inline-start" className="pr-0">
										<NativeSelect
											aria-label={options.localization.phoneCountry}
											className="min-w-[7rem]"
											value={typeof countryField.value == "string" ? countryField.value : "US"}
											onChange={event => countryField.onChange(event.target.value)}
										>
											{getTelephoneCountries(telephoneBlock ?? {
												name: block.name,
												type: "tel"
											}).map(country => (
												<NativeSelectOption key={country} value={country}>
													{getTelephoneCountryLabel(country)}
												</NativeSelectOption>
											))}
										</NativeSelect>
									</InputGroupAddon>
								)}
							/>
							<InputGroupInput
								{...field}
								{...elementAttrs}
								aria-invalid={fieldState.invalid}
								autoFocus={block.autofocus}
								data-form-autofocus={block.autofocus ? "true" : undefined}
								disabled={block.disabled}
								id={block.id ?? `${block.name}-control`}
								maxLength={block.maxlength}
								onChange={event => field.onChange(event.target.value)}
								pattern={pattern}
								placeholder={placeholder}
								type="tel"
								value={typeof field.value == "string" ? field.value : ""}
							/>
						</InputGroup>
					) : multiline ? (
						<InputGroup className={cn("min-h-32 h-auto bg-background", getRoundedClass(options.rounded, "control"))}>
							<InputGroupTextarea
								{...field}
								{...elementAttrs}
								aria-invalid={fieldState.invalid}
								autoFocus={block.autofocus}
								className="min-h-32 px-4 py-3 text-base sm:text-lg"
								data-form-autofocus={block.autofocus ? "true" : undefined}
								disabled={block.disabled}
								id={block.id ?? `${block.name}-control`}
								maxLength={block.maxlength}
								onChange={event => field.onChange(event.target.value)}
								placeholder={placeholder}
								value={typeof field.value == "string" ? field.value : ""}
							/>
						</InputGroup>
					) : (
						<Input
							{...field}
							{...elementAttrs}
							aria-invalid={fieldState.invalid}
							autoFocus={block.autofocus}
							className={cn("bg-background", roundedClass)}
							data-form-autofocus={block.autofocus ? "true" : undefined}
							disabled={block.disabled}
							id={block.id ?? `${block.name}-control`}
							maxLength={block.maxlength}
							onChange={event => field.onChange(event.target.value)}
							pattern={pattern}
							placeholder={placeholder}
							type={inputType}
							value={typeof field.value == "string" ? field.value : ""}
						/>
					)}
				</FieldWrapper>
			)}
		/>
	);
}

function SelectField({
	block,
	control,
	context,
	options
}: {
	block: JsonSelectFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	const placeholder = options.placeholders == "hide" ? undefined : resolveText(block.placeholder, context) || options.localization.selectPlaceholder;
	const items = block.options.map(option => {
		if(typeof option == "string")
			return { label: option, value: option };

		const label = resolveText(option.label, context);
		return {
			label,
			value: option.value ?? label
		};
	});

	return (
		<Controller
			control={control}
			name={block.name}
			rules={{
				validate: value => validateFieldValue(block, "select", value, context.values, options.localization)
			}}
			render={({ field, fieldState }) => (
				<FieldWrapper block={block} context={context} error={fieldState.error} rounded={options.rounded}>
					<Select
						disabled={block.disabled}
						value={typeof field.value == "string" && field.value.length > 0 ? field.value : undefined}
						onValueChange={field.onChange}
					>
						<SelectTrigger
							aria-invalid={fieldState.invalid}
							className={cn("bg-background w-full px-4 text-left", getControlSizeClass(block.fieldSize, options.rounded))}
						>
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
			)}
		/>
	);
}

function ChoiceField({
	block,
	control,
	context,
	options
}: {
	block: JsonChoiceFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	const items = resolveChoiceItems(block, context);
	const helperText = block.hideFormText ? "" : (block.multiple ? options.localization.chooseMany : options.localization.chooseOne);

	return (
		<Controller
			control={control}
			name={block.name}
			rules={{
				validate: value => validateFieldValue(block, "choice", value, context.values, options.localization)
			}}
			render={({ field, fieldState }) => {
				const selectedValues = block.multiple ? (Array.isArray(field.value) ? field.value as string[] : []) : [];
				const selectedValue = !block.multiple && typeof field.value == "string" ? field.value : "";

				return (
					<FieldWrapper block={block} context={context} error={fieldState.error} rounded={options.rounded}>
						{helperText ? (
							<FieldDescription className="text-sm text-muted-foreground">
								{helperText}
							</FieldDescription>
						) : null}
						{block.multiple ? (
							<div
								className={cn(
									"grid gap-3",
									block.horizontal ? "sm:grid-flow-col sm:auto-cols-fr" : "sm:grid-cols-2"
								)}
							>
								{items.map(item => {
									const checked = selectedValues.includes(item.value);
									return (
										<Label
											key={item.value}
											className={cn(
												"border-border bg-background hover:border-primary/40 hover:bg-primary/5 flex min-h-16 items-center gap-3 border p-4 transition-colors",
												getRoundedClass(options.rounded, "control"),
												checked && "border-primary bg-primary/5 text-foreground"
											)}
										>
											<Checkbox
												checked={checked}
												disabled={block.disabled}
												onCheckedChange={nextValue => {
													const normalized = nextValue == true ?
														[...selectedValues, item.value] :
														selectedValues.filter(value => value != item.value);
													field.onChange([...new Set(normalized)]);
												}}
											/>
											<span className="leading-snug">{item.label}</span>
										</Label>
									);
								})}
							</div>
						) : (
							<RadioGroup
								className={cn("grid gap-3", block.horizontal ? "sm:grid-flow-col sm:auto-cols-fr" : "sm:grid-cols-2")}
								disabled={block.disabled}
								value={selectedValue}
								onValueChange={field.onChange}
							>
								{items.map(item => {
									const checked = selectedValue == item.value;
									return (
										<Label
											key={item.value}
											className={cn(
												"border-border bg-background hover:border-primary/40 hover:bg-primary/5 flex min-h-16 items-center gap-3 border p-4 transition-colors",
												getRoundedClass(options.rounded, "control"),
												checked && "border-primary bg-primary/5"
											)}
										>
											<RadioGroupItem value={item.value} />
											<span className="leading-snug">{item.label}</span>
										</Label>
									);
								})}
							</RadioGroup>
						)}
					</FieldWrapper>
				);
			}}
		/>
	);
}

function PictureChoiceField({
	block,
	control,
	context,
	options
}: {
	block: JsonPictureChoiceFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	const items = resolvePictureChoiceItems(block, context);
	const helperText = block.hideFormText ? "" : (block.multiple ? options.localization.chooseMany : options.localization.chooseOne);

	return (
		<Controller
			control={control}
			name={block.name}
			rules={{
				validate: value => validateFieldValue(block, "pictureChoice", value, context.values, options.localization)
			}}
			render={({ field, fieldState }) => {
				const selectedValues = block.multiple ? (Array.isArray(field.value) ? field.value as string[] : []) : [];
				const selectedValue = !block.multiple && typeof field.value == "string" ? field.value : "";

				return (
					<FieldWrapper block={block} context={context} error={fieldState.error} rounded={options.rounded}>
						{helperText ? (
							<FieldDescription className="text-sm text-muted-foreground">
								{helperText}
							</FieldDescription>
						) : null}
						<div className={cn("grid gap-4", block.supersize ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
							{items.map(item => {
								const checked = block.multiple ? selectedValues.includes(item.value) : selectedValue == item.value;
								const imageUrl = options.sanitize ? sanitizeUrl(item.image, true) : item.image;

								return (
									<button
										key={item.value}
										type="button"
										className={cn(
											"border-border bg-background hover:border-primary/40 hover:bg-primary/5 overflow-hidden border text-left transition-colors",
											getRoundedClass(options.rounded, "surface"),
											checked && "border-primary bg-primary/5 ring-primary/20 ring-4"
										)}
										onClick={() => {
											if(block.disabled)
												return;

											if(block.multiple) {
												const nextValues = checked ?
													selectedValues.filter(value => value != item.value) :
													[...selectedValues, item.value];
												field.onChange([...new Set(nextValues)]);
												return;
											}

											field.onChange(item.value);
										}}
									>
										<div className={cn("bg-muted/40 relative overflow-hidden", block.supersize ? "aspect-[4/3]" : "aspect-square")}>
											{imageUrl ? (
												<img
													alt={item.label}
													className="h-full w-full object-cover"
													src={imageUrl}
												/>
											) : (
												<div className="text-muted-foreground flex h-full items-center justify-center">
													<ImageIcon className="size-6" />
												</div>
											)}
											<div className="absolute top-3 right-3 rounded-full bg-background/90 p-1 shadow-sm">
												{checked ? (
													<CheckIcon className="text-primary size-4" />
												) : (
													<span className="border-border block size-4 rounded-full border" />
												)}
											</div>
										</div>
										{!block.hideLabels ? (
											<div className="p-4">
												<p className="text-sm font-medium leading-snug">{item.label}</p>
											</div>
										) : null}
									</button>
								);
							})}
						</div>
					</FieldWrapper>
				);
			}}
		/>
	);
}

function RatingField({
	block,
	control,
	context,
	options
}: {
	block: JsonRatingFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	const outOf = clamp(block.outOf ?? 5, 1, 10);

	return (
		<Controller
			control={control}
			name={block.name}
			rules={{
				validate: value => validateFieldValue(block, "rating", value, context.values, options.localization)
			}}
			render={({ field, fieldState }) => {
				const currentValue = typeof field.value == "number" ? field.value : Number(field.value ?? 0);
				const Icon = block.icon == "heart" ? HeartIcon : StarIcon;

				return (
					<FieldWrapper block={block} context={context} error={fieldState.error} rounded={options.rounded}>
						<div className="flex flex-wrap gap-2">
							{Array.from({ length: outOf }, (_, index) => index + 1).map(value => {
								const active = value <= currentValue;
								return (
									<button
										key={value}
										type="button"
										className={cn(
											"border-border bg-background hover:border-primary/40 hover:bg-primary/5 flex size-12 items-center justify-center border transition-colors",
											getRoundedClass(options.rounded, "control"),
											active && "border-primary bg-primary/10 text-primary"
										)}
										onClick={() => field.onChange(value)}
									>
										<Icon className={cn("size-5", active && "fill-current")} />
									</button>
								);
							})}
						</div>
					</FieldWrapper>
				);
			}}
		/>
	);
}

function OpinionScaleField({
	block,
	control,
	context,
	options
}: {
	block: JsonOpinionScaleFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	const startAt = block.startAt ?? 0;
	const outOf = Math.max(block.outOf ?? 10, startAt == 0 ? 0 : 1);
	const values = Array.from({ length: outOf - startAt + 1 }, (_, index) => startAt + index);

	return (
		<Controller
			control={control}
			name={block.name}
			rules={{
				validate: value => validateFieldValue(block, "opinionScale", value, context.values, options.localization)
			}}
			render={({ field, fieldState }) => {
				const currentValue = typeof field.value == "number" ? field.value : Number(field.value ?? NaN);
				const labelStart = resolveText(block.labelStart, context);
				const labelEnd = resolveText(block.labelEnd, context);

				return (
					<FieldWrapper block={block} context={context} error={fieldState.error} rounded={options.rounded}>
						<div className="grid grid-cols-5 gap-2 sm:grid-cols-11">
							{values.map(value => {
								const active = currentValue == value;
								return (
									<button
										key={value}
										type="button"
										className={cn(
											"border-border bg-background hover:border-primary/40 hover:bg-primary/5 min-h-12 border text-sm font-medium transition-colors",
											getRoundedClass(options.rounded, "control"),
											active && "border-primary bg-primary text-primary-foreground"
										)}
										onClick={() => field.onChange(value)}
									>
										{value}
									</button>
								);
							})}
						</div>
						{(!block.hideLabelStart || !block.hideLabelEnd) && (labelStart || labelEnd) ? (
							<div className="text-muted-foreground flex items-center justify-between gap-4 text-sm">
								<span>{block.hideLabelStart ? "" : labelStart}</span>
								<span>{block.hideLabelEnd ? "" : labelEnd}</span>
							</div>
						) : null}
					</FieldWrapper>
				);
			}}
		/>
	);
}

function NumberField({
	block,
	control,
	context,
	options
}: {
	block: JsonNumberFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	const placeholder = options.placeholders == "hide" ? undefined : resolveText(block.placeholder, context);
	const startAdornment = resolveText(block.unit, context);
	const endAdornment = resolveText(block.unitEnd, context);

	return (
		<Controller
			control={control}
			name={block.name}
			rules={{
				validate: value => validateFieldValue(block, "number", value, context.values, options.localization)
			}}
			render={({ field, fieldState }) => (
				<FieldWrapper block={block} context={context} error={fieldState.error} rounded={options.rounded}>
					<InputGroup className={cn("h-12 bg-background", getRoundedClass(options.rounded, "control"))}>
						{startAdornment ? (
							<InputGroupAddon align="inline-start">
								<InputGroupText>{startAdornment}</InputGroupText>
							</InputGroupAddon>
						) : null}
						<InputGroupInput
							aria-invalid={fieldState.invalid}
							autoFocus={block.autofocus}
							className={getControlSizeClass(block.fieldSize, options.rounded)}
							data-form-autofocus={block.autofocus ? "true" : undefined}
							disabled={block.disabled}
							id={block.id ?? `${block.name}-control`}
							max={block.max}
							min={block.min}
							onChange={event => field.onChange(event.target.value)}
							placeholder={placeholder}
							step={block.step}
							type="number"
							value={typeof field.value == "string" || typeof field.value == "number" ? field.value : ""}
						/>
						{endAdornment ? (
							<InputGroupAddon align="inline-end">
								<InputGroupText>{endAdornment}</InputGroupText>
							</InputGroupAddon>
						) : null}
					</InputGroup>
				</FieldWrapper>
			)}
		/>
	);
}

function DateLikeField({
	block,
	control,
	context,
	options,
	mode
}: {
	block: JsonDateFieldBlock | JsonDatetimeFieldBlock | JsonTimeFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
	mode: "date" | "datetime" | "time";
}) {
	const placeholder = options.placeholders == "hide" ? undefined : resolveText(block.placeholder, context);
	const precision = block.step != null && block.step < 60 ? "second" : "minute";

	return (
		<Controller
			control={control}
			name={block.name}
			rules={{
				validate: value => validateFieldValue(block, block.type, value, context.values, options.localization)
			}}
			render={({ field, fieldState }) => (
				<FieldWrapper block={block} context={context} error={fieldState.error} rounded={options.rounded}>
					<DatetimeInput
						aria-invalid={fieldState.invalid}
						autoFocus={block.autofocus}
						className={cn("bg-background", getControlSizeClass(block.fieldSize, options.rounded))}
						data-form-autofocus={block.autofocus ? "true" : undefined}
						disabled={block.disabled}
						id={block.id ?? `${block.name}-control`}
						max={block.max}
						min={block.min}
						mode={mode}
						onBlur={field.onBlur}
						onChange={field.onChange}
						placeholder={placeholder}
						precision={precision}
						step={block.step}
						value={typeof field.value == "string" ? field.value : ""}
					/>
				</FieldWrapper>
			)}
		/>
	);
}

function FileField({
	block,
	control,
	context,
	options
}: {
	block: JsonFileFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	const currentFile = getCurrentFileSummary(block.currentFile);

	return (
		<Controller
			control={control}
			name={block.name}
			rules={{
				validate: value => validateFieldValue(block, "file", value, context.values, options.localization)
			}}
			render={({ field, fieldState }) => (
				<FieldWrapper block={block} context={context} error={fieldState.error} rounded={options.rounded}>
					<label
						className={cn(
							"border-border bg-background hover:border-primary/40 hover:bg-primary/5 flex cursor-pointer flex-col gap-3 border border-dashed p-5 transition-colors",
							getRoundedClass(options.rounded, "surface"),
							block.disabled && "pointer-events-none opacity-50"
						)}
					>
						<div className="flex items-center gap-3">
							<div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
								<UploadIcon className="size-5" />
							</div>
							<div className="space-y-1">
								<p className="font-medium">{options.localization.filePrompt}</p>
								<p className="text-muted-foreground text-sm">
									{block.imageOnly ? "Images only" : "Any file type"} • Max {block.sizeLimit ?? 10} MB
								</p>
							</div>
						</div>
						<input
							accept={block.imageOnly ? "image/*" : undefined}
							className="sr-only"
							disabled={block.disabled}
							id={block.id ?? `${block.name}-control`}
							onBlur={field.onBlur}
							onChange={event => {
								const file = event.target.files?.[0] ?? null;
								field.onChange(file);
							}}
							type="file"
						/>
						{field.value instanceof File ? (
							<div className="bg-muted/60 flex items-center justify-between gap-3 border px-4 py-3 text-sm">
								<span className="truncate">{field.value.name}</span>
								<span className="text-muted-foreground shrink-0">{formatBytes(field.value.size)}</span>
							</div>
						) : currentFile ? (
							<div className="bg-muted/60 flex flex-wrap items-center gap-2 border px-4 py-3 text-sm">
								<span className="font-medium">{options.localization.fileCurrent}:</span>
								{currentFile.href ? (
									<a
										className="text-primary underline-offset-4 hover:underline"
										href={options.sanitize ? sanitizeUrl(currentFile.href, true) : currentFile.href}
										rel="noreferrer"
										target="_blank"
									>
										{currentFile.label}
									</a>
								) : (
									<span>{currentFile.label}</span>
								)}
							</div>
						) : null}
					</label>
				</FieldWrapper>
			)}
		/>
	);
}

function renderFieldBlock({
	block,
	control,
	context,
	options
}: {
	block: JsonFieldBlock;
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	const fieldType = getFieldType(block);
	if(!fieldType)
		return null;

	switch(fieldType) {
		case "email":
			return renderSimpleInput({ block: block as JsonEmailFieldBlock, context, control, fieldType, inputType: "email", options });
		case "password":
			return renderSimpleInput({ block: block as JsonPasswordFieldBlock, context, control, fieldType, inputType: "password", options });
		case "tel":
			return renderSimpleInput({ block: block as JsonTelephoneFieldBlock, context, control, fieldType, inputType: "tel", options });
		case "text":
			return renderSimpleInput({ block: block as JsonTextFieldBlock, context, control, fieldType, inputType: "text", options });
		case "url":
			return renderSimpleInput({ block: block as JsonUrlFieldBlock, context, control, fieldType, inputType: "url", options });
		case "number":
			return <NumberField block={block as JsonNumberFieldBlock} context={context} control={control} options={options} />;
		case "select":
			return <SelectField block={block as JsonSelectFieldBlock} context={context} control={control} options={options} />;
		case "choice":
			return <ChoiceField block={block as JsonChoiceFieldBlock} context={context} control={control} options={options} />;
		case "pictureChoice":
			return <PictureChoiceField block={block as JsonPictureChoiceFieldBlock} context={context} control={control} options={options} />;
		case "rating":
			return <RatingField block={block as JsonRatingFieldBlock} context={context} control={control} options={options} />;
		case "opinionScale":
			return <OpinionScaleField block={block as JsonOpinionScaleFieldBlock} context={context} control={control} options={options} />;
		case "datetime":
			return <DateLikeField block={block as JsonDatetimeFieldBlock} context={context} control={control} options={options} mode="datetime" />;
		case "date":
			return <DateLikeField block={block as JsonDateFieldBlock} context={context} control={control} options={options} mode="date" />;
		case "time":
			return <DateLikeField block={block as JsonTimeFieldBlock} context={context} control={control} options={options} mode="time" />;
		case "file":
			return <FileField block={block as JsonFileFieldBlock} context={context} control={control} options={options} />;
		default:
			return null;
	}
}

function renderContentBlock(block: JsonContentBlock, context: ResolutionContext, options: ResolvedFormOptions): React.ReactNode {
	const className = cn(
		getTextAlignmentClass(block.align),
		resolveClassNames(block.classNames)
	);
	const commonProps = {
		className,
		...resolveAttributes(block.attrs, context, options.sanitize)
	};

	switch(block.type) {
		case "heading": {
			const level = block.level ?? 2;
			const text = resolveText(block.text, context);
			if(text.trim().length == 0)
				return null;

			const headingClass = level == 1 ?
				"font-sans text-4xl leading-tight sm:text-5xl" :
				level == 2 ?
					"font-sans text-2xl leading-tight sm:text-3xl" :
					"text-lg font-semibold";

			return React.createElement(
				level == 1 ? "h1" : level == 2 ? "h2" : "h3",
				{
					...commonProps,
					className: cn(commonProps.className, headingClass)
				},
				text
			);
		}
		case "description":
			return (
				<p {...commonProps} className={cn(commonProps.className, "text-muted-foreground text-base leading-relaxed sm:text-lg")}>
					{getContentBlockText(block, context)}
				</p>
			);
		case "helper":
			return (
				<p {...commonProps} className={cn(commonProps.className, "text-muted-foreground text-sm leading-relaxed")}>
					{getContentBlockText(block, context)}
				</p>
			);
		case "divider":
			return (
				<div {...commonProps} className={cn(commonProps.className, "py-2")}>
					<Separator className="mb-3" />
					{block.label ? (
						<p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
							{resolveText(block.label, context)}
						</p>
					) : null}
				</div>
			);
		case "media": {
			const source = resolveText(block.src, context);
			const mediaUrl = options.sanitize ? sanitizeUrl(source, true) : source;
			const caption = resolveText(block.caption, context);
			const alt = resolveText(block.alt, context);

			return (
				<figure {...commonProps} className={cn(commonProps.className, "overflow-hidden", getRoundedClass(options.rounded, "surface"))}>
					<div
						className="bg-muted/40 overflow-hidden"
						style={block.aspectRatio ? { aspectRatio: String(block.aspectRatio) } : undefined}
					>
						{block.mediaType == "video" ? (
							<video
								className={cn("h-full w-full", block.fit == "contain" ? "object-contain" : "object-cover")}
								controls
								poster={block.poster ? resolveText(block.poster, context) : undefined}
								src={mediaUrl}
							/>
						) : mediaUrl ? (
							<img
								alt={alt}
								className={cn("h-full w-full", block.fit == "contain" ? "object-contain" : "object-cover")}
								src={mediaUrl}
							/>
						) : (
							<div className="text-muted-foreground flex min-h-48 items-center justify-center">
								<ImageIcon className="size-7" />
							</div>
						)}
					</div>
					{caption ? (
						<figcaption className="text-muted-foreground bg-muted px-4 py-3 text-sm">
							{caption}
						</figcaption>
					) : null}
				</figure>
			);
		}
		case "copy":
		case "text":
		default:
			return (
				<p {...commonProps} className={cn(commonProps.className, "text-base leading-relaxed sm:text-lg")}>
					{getContentBlockText(block, context)}
				</p>
			);
	}
}

function SlideBlocks({
	blocks,
	control,
	context,
	options
}: {
	blocks: JsonFormBlock[];
	control: Control<Record<string, unknown>>;
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	return (
		<FieldGroup className="gap-6">
			{blocks.map((block, index) => {
				const animationStyle = { animationDelay: `${index * 20}ms` } as React.CSSProperties;
				const key = block.id ?? (isFieldBlock(block) ? block.name : `${block.type}-${index}`);

				return (
					<div key={key} style={animationStyle} className="animate-in fill-mode-[backwards] fade-in-0 slide-in-from-bottom-2 duration-300">
						{isFieldBlock(block) ?
							renderFieldBlock({ block, context, control, options }) :
							renderContentBlock(block, context, options)}
					</div>
				);
			})}
		</FieldGroup>
	);
}

function SlideChrome({
	currentSlide,
	context,
	control,
	options
}: {
	currentSlide: InternalSlide;
	context: ResolutionContext;
	control: Control<Record<string, unknown>>;
	options: ResolvedFormOptions;
}) {
	const title = resolveText(currentSlide.slide.title, context);
	const description = resolveText(currentSlide.slide.description, context);

	return (
		<div className="space-y-8">
			{title || description ? (
				<div className={cn("space-y-3", currentSlide.kind == "start" || currentSlide.kind == "end" ? "text-center" : "text-left")}>
					{title ? (
						<h1 className="font-sans text-4xl leading-tight text-balance sm:text-5xl">
							{title}
						</h1>
					) : null}
					{description ? (
						<p className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed sm:text-lg">
							{description}
						</p>
					) : null}
				</div>
			) : null}
			<SlideBlocks blocks={currentSlide.blocks} context={context} control={control} options={options} />
		</div>
	);
}

function BrandingFooter({
	context,
	options
}: {
	context: ResolutionContext;
	options: ResolvedFormOptions;
}) {
	const footerText = typeof options.footer == "string" && (options.footer == "show" || options.footer == "hide") ?
		"" :
		resolveText(options.footer, context);
	const shouldShowBranding = options.formsmdBranding == "show";

	if(!shouldShowBranding && footerText.trim().length == 0)
		return null;

	return (
		<div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 px-2 text-sm">
			{footerText.trim().length > 0 ? <span>{footerText}</span> : <span />}
			{shouldShowBranding ? <span>JSON slide form runtime</span> : null}
		</div>
	);
}

export function Form({
	className,
	form,
	initialValues = {},
	onPartialSubmit,
	onSubmit
}: FormProps) {
	const options = React.useMemo(() => resolveOptions(form), [form]);
	const fieldBlocks = React.useMemo(() => getAllFieldBlocks(form), [form]);
	const defaultValues = React.useMemo(() => buildFieldDefaults(fieldBlocks, initialValues), [fieldBlocks, initialValues]);
	const formApi = useForm<Record<string, unknown>>({
		defaultValues,
		mode: "onBlur"
	});
	const watchedValues = useWatch({
		control: formApi.control
	}) ?? defaultValues;
	const values = React.useMemo(() => ({ ...defaultValues, ...watchedValues }), [defaultValues, watchedValues]);
	const storageKey = React.useMemo(() => buildStorageKey(form), [form]);
	const [activeSlideId, setActiveSlideId] = React.useState<string | null>(null);
	const [navigationDirection, setNavigationDirection] = React.useState<"backward" | "forward">("forward");
	const [systemPrefersDark, setSystemPrefersDark] = React.useState(false);
	const [submissionError, setSubmissionError] = React.useState<string | null>(null);
	const [hasSubmitted, setHasSubmitted] = React.useState(false);
	const [isPosting, setIsPosting] = React.useState(false);
	const slideViewportRef = React.useRef<HTMLDivElement | null>(null);
	const hasHydratedSavedState = React.useRef(false);
	const previousVisibleIndexRef = React.useRef(0);
	const everyChangeSnapshotRef = React.useRef<string | null>(null);

	React.useEffect(() => {
		if(typeof window == "undefined")
			return undefined;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const syncPreference = () => setSystemPrefersDark(mediaQuery.matches);
		syncPreference();

		mediaQuery.addEventListener("change", syncPreference);
		return () => mediaQuery.removeEventListener("change", syncPreference);
	}, []);

	const resolvedColorScheme = options.colorScheme == "system" ?
		(systemPrefersDark ? "dark" : "light") :
		options.colorScheme;

	const visibleSlides = React.useMemo(
		() => normalizeVisibleSlides(form, options, values, hasSubmitted),
		[form, hasSubmitted, options, values]
	);

	const currentSlide = React.useMemo(
		() => visibleSlides.find(slide => slide.id == activeSlideId) ?? null,
		[activeSlideId, visibleSlides]
	);
	const currentVisibleIndex = currentSlide ? visibleSlides.findIndex(slide => slide.id == currentSlide.id) : -1;
	const nextSlide = currentVisibleIndex >= 0 ? visibleSlides[currentVisibleIndex + 1] ?? null : visibleSlides[0] ?? null;
	const previousSlide = currentVisibleIndex > 0 ? visibleSlides[currentVisibleIndex - 1] ?? null : null;

	React.useEffect(() => {
		if(currentVisibleIndex >= 0)
			previousVisibleIndexRef.current = currentVisibleIndex;
	}, [currentVisibleIndex]);

	React.useEffect(() => {
		if(hasHydratedSavedState.current)
			return;

		hasHydratedSavedState.current = true;

		if(options.saveState && typeof window != "undefined") {
			try {
				const rawState = window.localStorage.getItem(storageKey);
				if(rawState) {
					const parsedState = JSON.parse(rawState) as {
						activeSlideId?: string;
						hasSubmitted?: boolean;
						values?: Record<string, unknown>;
					};

					if(parsedState.values && isPlainObject(parsedState.values))
						formApi.reset(deepMergeObjects(defaultValues, parsedState.values));

					if(typeof parsedState.activeSlideId == "string")
						setActiveSlideId(parsedState.activeSlideId);

					if(parsedState.hasSubmitted == true)
						setHasSubmitted(true);
				}
			} catch{
				// Ignore invalid saved state snapshots.
			}
		}
	}, [defaultValues, formApi, options.saveState, storageKey]);

	React.useEffect(() => {
		if(visibleSlides.length == 0) {
			setActiveSlideId(null);
			return;
		}

		if(activeSlideId && visibleSlides.some(slide => slide.id == activeSlideId))
			return;

		const startIndex = clamp(options.startSlide ?? previousVisibleIndexRef.current, 0, visibleSlides.length - 1);
		setActiveSlideId(visibleSlides[startIndex]?.id ?? visibleSlides[0].id);
	}, [activeSlideId, options.startSlide, visibleSlides]);

	React.useEffect(() => {
		if(!options.saveState || typeof window == "undefined")
			return;

		const snapshot = stripNonSerializable({
			activeSlideId,
			hasSubmitted,
			values: formApi.getValues()
		});

		try {
			window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
		} catch{
			// Ignore storage write failures.
		}
	}, [activeSlideId, formApi, hasSubmitted, options.saveState, storageKey, values]);

	React.useEffect(() => {
		if(!currentSlide || !slideViewportRef.current)
			return;

		const frame = window.requestAnimationFrame(() => {
			const focusTarget = slideViewportRef.current?.querySelector<HTMLElement>(
				"[data-form-autofocus='true'], input:not([type='hidden']):not([disabled]), textarea:not([disabled]), button:not([disabled]), [role='radio']:not([data-disabled='true'])"
			);
			focusTarget?.focus();
		});

		return () => window.cancelAnimationFrame(frame);
	}, [currentSlide?.id]);

	const resolutionContext = React.useMemo<ResolutionContext>(() => ({
		form,
		options,
		slide: currentSlide?.slide ?? null,
		values
	}), [currentSlide?.slide, form, options, values]);
	const progressState = React.useMemo(
		() => getProgressState(currentSlide, visibleSlides, options, resolutionContext),
		[currentSlide, options, resolutionContext, visibleSlides]
	);

	const goToSlide = React.useCallback((targetSlideId: string, direction: "backward" | "forward") => {
		setSubmissionError(null);
		setNavigationDirection(direction);
		React.startTransition(() => {
			setActiveSlideId(targetSlideId);
		});
	}, []);

	const restartForm = React.useCallback(() => {
		formApi.reset(defaultValues);
		setHasSubmitted(false);
		setSubmissionError(null);

		if(options.saveState && typeof window != "undefined")
			window.localStorage.removeItem(storageKey);

		const firstSlide = visibleSlides[clamp(options.startSlide ?? 0, 0, Math.max(visibleSlides.length - 1, 0))];
		if(firstSlide)
			goToSlide(firstSlide.id, "backward");
	}, [defaultValues, formApi, goToSlide, options.saveState, options.startSlide, storageKey, visibleSlides]);

	const submitValues = React.useCallback(async (kind: "final" | "partial", slide: JsonFormSlide | null) => {
		const rawValues = formApi.getValues();
		const allowedNames = kind == "partial" && currentVisibleIndex >= 0 ?
			new Set(getSubmitFieldNamesForSlide(visibleSlides, currentVisibleIndex)) :
			undefined;
		const serializedData = buildSubmissionData(rawValues, fieldBlocks, allowedNames);
		const request = buildRequestPayload(form, options, slide, rawValues, serializedData);
		const payload: FormSubmitPayload = {
			data: serializedData,
			form,
			kind,
			request,
			slide,
			slideIndex: currentSlide?.sourceIndex ?? -1,
			values: rawValues,
			visibleSlideIndex: currentVisibleIndex
		};

		setIsPosting(true);
		try {
			await performRequest(request);
			if(kind == "partial")
				await onPartialSubmit?.(payload);
			else
				await onSubmit?.(payload);
		} finally {
			setIsPosting(false);
		}
	}, [currentSlide?.sourceIndex, currentVisibleIndex, fieldBlocks, form, formApi, onPartialSubmit, onSubmit, options, visibleSlides]);

	React.useEffect(() => {
		if(!currentSlide || currentSlide.kind != "slide") {
			everyChangeSnapshotRef.current = null;
			return;
		}

		if(currentSlide.slide.post != "every-change") {
			everyChangeSnapshotRef.current = null;
			return;
		}

		const fieldNames = collectFieldNames(currentSlide.blocks);
		const snapshot = JSON.stringify(
			fieldNames.map(name => {
				const value = values[name];
				if(value instanceof File) {
					return {
						lastModified: value.lastModified,
						name: value.name,
						size: value.size,
						type: value.type
					};
				}
				return value;
			})
		);

		if(everyChangeSnapshotRef.current == null) {
			everyChangeSnapshotRef.current = snapshot;
			return;
		}

		if(everyChangeSnapshotRef.current == snapshot)
			return;

		everyChangeSnapshotRef.current = snapshot;
		setSubmissionError(null);
		void submitValues("partial", currentSlide.slide).catch(error => {
			setSubmissionError(error instanceof Error ? error.message : "Something went wrong while submitting the form.");
		});
	}, [currentSlide, submitValues, values]);

	const handleAdvance = React.useCallback(async () => {
		if(!currentSlide) {
			if(nextSlide)
				goToSlide(nextSlide.id, "forward");
			return;
		}

		setSubmissionError(null);

		if(currentSlide.kind == "start") {
			if(nextSlide)
				goToSlide(nextSlide.id, "forward");
			return;
		}

		if(currentSlide.kind == "end") {
			const redirectUrl = resolveText(currentSlide.slide.redirectUrl, resolutionContext);
			if(redirectUrl && typeof window != "undefined") {
				window.location.assign(options.sanitize ? sanitizeUrl(redirectUrl, true) : redirectUrl);
				return;
			}
			if(options.restartButton == "show")
				restartForm();
			return;
		}

		const currentFieldNames = collectFieldNames(currentSlide.blocks);
		const isSlideValid = currentFieldNames.length > 0 ? await formApi.trigger(currentFieldNames) : true;
		if(!isSlideValid) {
			const firstFieldName = currentFieldNames.find(name => formApi.getFieldState(name).invalid);
			if(firstFieldName)
				formApi.setFocus(firstFieldName);
			return;
		}

		try {
			if(currentSlide.slide.post == "slide-progress" && nextSlide?.kind != "end" && nextSlide != null)
				await submitValues("partial", currentSlide.slide);

			if(nextSlide?.kind == "end" || nextSlide == null) {
				await submitValues("final", currentSlide.slide);
				setHasSubmitted(true);

				if(nextSlide)
					goToSlide(nextSlide.id, "forward");
				else
					goToSlide(AUTO_END_SLIDE_ID, "forward");
				return;
			}

			goToSlide(nextSlide.id, "forward");
		} catch(error) {
			setSubmissionError(error instanceof Error ? error.message : "Something went wrong while submitting the form.");
		}
	}, [currentSlide, formApi, goToSlide, nextSlide, options.restartButton, options.sanitize, resolutionContext, restartForm, submitValues]);

	const handlePrevious = React.useCallback(() => {
		if(!previousSlide)
			return;
		goToSlide(previousSlide.id, "backward");
	}, [goToSlide, previousSlide]);

	const actionLabel = getSlideActionLabel(currentSlide, nextSlide, options);
	const showProgress = options.pageProgress != "hide";
	const showProgressLabel = options.pageProgress == "show";
	const canGoBack = !!previousSlide && currentSlide?.kind == "slide";
	const isPreviousDisabled = currentSlide?.slide.disablePrevious || isPosting || !canGoBack;
	const buttonAlignment = currentSlide?.slide.buttonAlignment ?? options.buttonAlignment;
	const pageThemeStyle = buildThemeStyle(options, resolvedColorScheme);

	if(visibleSlides.length == 0) {
		return (
			<div
				className={cn("bg-background text-foreground flex min-h-80 items-center justify-center", className)}
				data-theme={resolvedColorScheme}
				style={pageThemeStyle}
			>
				<Card className="mx-auto max-w-xl">
					<CardHeader>
						<CardTitle>No Visible Slides</CardTitle>
						<CardDescription>All slides are currently hidden by conditions or configuration.</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"bg-background text-foreground relative isolate w-full overflow-hidden",
				options.isFullPage && "min-h-svh",
				className
			)}
			data-theme={resolvedColorScheme}
			style={pageThemeStyle}
		>
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="bg-primary/8 absolute top-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl" />
				<div className="bg-accent/40 absolute right-[-6rem] bottom-[-4rem] h-72 w-72 rounded-full blur-3xl" />
			</div>
			<div
				className={cn(
					"relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 md:px-8",
					options.isFullPage ? "min-h-svh" : "py-4",
					getVerticalAlignmentClass(options.verticalAlignment)
				)}
			>
				{showProgress ? (
					<div className="mx-auto w-full max-w-3xl space-y-2">
						<Progress value={progressState.percent} />
						{showProgressLabel ? (
							<div className="text-muted-foreground flex items-center justify-between text-sm">
								<span>{progressState.label}</span>
								<span>{Math.round(progressState.percent)}%</span>
							</div>
						) : null}
					</div>
				) : null}
				<form
					className="mx-auto w-full max-w-3xl"
					onSubmit={event => {
						event.preventDefault();
						void handleAdvance();
					}}
				>
					<Card
						className={cn(
							"border-white/40 bg-background/90 backdrop-blur-sm shadow-[0_30px_80px_rgba(15,23,42,0.08)]",
							getRoundedClass(options.rounded, "surface"),
							options.page == "slides" && "bg-transparent ring-0 shadow-none backdrop-blur-0"
						)}
					>
						<CardContent className={cn("px-0", options.page == "slides" ? "pt-0" : "pt-6")}>
							<div
								ref={slideViewportRef}
								className={cn(
									"px-5 sm:px-8",
									currentSlide?.kind == "start" || currentSlide?.kind == "end" ? "py-10" : "py-6",
									"animate-in fade-in-0 duration-300",
									navigationDirection == "forward" ? "slide-in-from-right-5" : "slide-in-from-left-5"
								)}
								key={currentSlide?.id}
							>
								{submissionError ? (
									<Alert variant="destructive" className="mb-6">
										<AlertCircleIcon />
										<AlertTitle>Submission failed</AlertTitle>
										<AlertDescription>{submissionError}</AlertDescription>
									</Alert>
								) : null}
								{currentSlide ? (
									<SlideChrome
										context={resolutionContext}
										control={formApi.control}
										currentSlide={currentSlide}
										options={options}
									/>
								) : null}
							</div>
						</CardContent>
						<CardFooter className={cn(
							"bg-background/70 flex flex-col gap-3 border-t px-5 py-4 sm:px-8 sm:flex-row sm:items-center",
							options.page == "slides" && "px-0"
						)}
						>
							{currentSlide?.kind == "end" ? (
								<div className={cn("flex w-full flex-wrap gap-3", buttonAlignment == "stretch" ? "sm:grid sm:grid-cols-2" : getButtonAlignmentClass(buttonAlignment))}>
									{options.restartButton == "show" ? (
										<Button
											className={cn("gap-2", getRoundedClass(options.rounded, "action"), buttonAlignment == "stretch" && "w-full")}
											onClick={restartForm}
											type="button"
											variant="outline"
										>
											<RefreshCcwIcon className="size-4" />
											{options.localization.restart}
										</Button>
									) : null}
									{currentSlide.slide.redirectUrl ? (
										<Button
											className={cn("gap-2", getRoundedClass(options.rounded, "action"), buttonAlignment == "stretch" && "w-full")}
											disabled={isPosting}
											type="submit"
										>
											{resolveText(currentSlide.slide.buttonText, resolutionContext) || options.localization.continue}
											<ArrowRightIcon className="size-4" />
										</Button>
									) : null}
								</div>
							) : (
								<>
									{options.slideControls == "show" && currentSlide?.kind == "slide" ? (
										<Button
											className={cn("gap-2", getRoundedClass(options.rounded, "action"))}
											disabled={isPreviousDisabled}
											onClick={handlePrevious}
											type="button"
											variant="outline"
										>
											<ArrowLeftIcon className="size-4" />
											{options.localization.back}
										</Button>
									) : null}
									<div className={cn(
										"flex w-full gap-3",
										buttonAlignment == "stretch" ? "sm:grid sm:grid-cols-1" : "sm:flex",
										getButtonAlignmentClass(buttonAlignment)
									)}
									>
										<Button
											className={cn(
												"gap-2 shadow-sm",
												getRoundedClass(options.rounded, "action"),
												buttonAlignment == "stretch" && "w-full",
												currentSlide?.kind == "start" && "px-6"
											)}
											disabled={isPosting}
											type="submit"
										>
											{actionLabel}
											<ArrowRightIcon className="size-4" />
										</Button>
									</div>
								</>
							)}
						</CardFooter>
					</Card>
				</form>
				<BrandingFooter context={resolutionContext} options={options} />
			</div>
		</div>
	);
}

export default Form;
