"use client";

import {
	useMemo,
	useState,
	useEffect,
	useCallback,
	type DragEvent,
	type ReactNode,
	type MouseEvent
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
	XIcon,
	PlusIcon,
	CheckIcon,
	UploadIcon,
	ArrowUpIcon,
	DownloadIcon,
	ArrowDownIcon,
	ArrowUpDownIcon,
	CircleAlertIcon,
	GripVerticalIcon,
	FileSpreadsheetIcon
} from "lucide-react";

import cn from "@/utils/cn";
import { createEmptyReviewComment, type ReviewCommentRichText } from "@/utils/reviewCommentRichText";
import { DatetimeInput } from "@/components/DatetimeInput";
import { Link } from "@/components/Link";
import { ReviewCommentInput } from "@/components/ReviewCommentInput";
import { ReviewCommentPreview } from "@/components/ReviewCommentInput";
import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Checkbox } from "@/components/radix/Checkbox";
import { Collapsible, CollapsibleContent } from "@/components/radix/Collapsible";
import {
	Drawer,
	DrawerTitle,
	DrawerFooter,
	DrawerHeader,
	DrawerContent,
	DrawerDescription
} from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import importTemplateLogo from "@/app/_static/favicons/logo.png";

import { uploadGenericRichtextImage } from "../../editor-x.actions";
import { consumePendingRelationFilterNavigation } from "../relation-navigation.components";
import * as importActions from "./import.actions";
import { RELATION_FILTER_QUERY_PARAM } from "./layout.components";

export const PAGE_SIZE = 20;

export type SortDirection = "asc" | "desc";
export type SortField = importActions.CreditApplicationImportSortField;
export type FilterColumn = importActions.CreditApplicationImportFilterColumn;
export type FilterOperator = importActions.CreditApplicationImportFilterOperator;
export type FilterCombinator = importActions.CreditApplicationImportFilterCombinator;
export type FilterInput = importActions.CreditApplicationImportFilterInput;
export type queryCreditApplicationImportsOutput = Awaited<ReturnType<typeof importActions.queryCreditApplicationImportViewerAction>>;
export type CreditApplicationImportTableRow = queryCreditApplicationImportsOutput["docs"][number];
export type CreditApplicationImportPreviewOutput = Awaited<ReturnType<typeof importActions.parseCreditApplicationImportPreviewAction>>;
export type ActionError = {
	title: string;
	message: string;
};

export const resolveActionError = (error: unknown, fallbackMessage: string): ActionError => {
	if(error instanceof Error) {
		const title = error.name?.trim().length > 0 ? error.name : "Error";
		const message = error.message?.trim().length > 0 ? error.message : fallbackMessage;
		return { title, message };
	}
	return {
		title: "Error",
		message: fallbackMessage
	};
};

export type CreditApplicationImportTableColumnId = "id" |
	"filename" |
	"filesize" |
	"mimeType" |
	"description" |
	"reviewComment" |
	"createdBy" |
	"updatedBy" |
	"deletedBy" |
	"createdAt" |
	"updatedAt" |
	"deletedAt" |
	"status" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved";

export type CreditApplicationImportTableColumnConfig = {
	id: CreditApplicationImportTableColumnId;
	label: string;
	sortField?: SortField;
	headClassName?: string;
	cellClassName?: string;
};

export type CreditApplicationImportFormState = {
	importId?: string;
	file: File | null;
	filename: string;
	filesize: number;
	fileUrl: string | null;
	description: ReviewCommentRichText;
};

export type FilterValueType = "text" | "date" | "select" | "boolean";
export type FilterSelectSearchAction = (keyword: string, selectedValues: string[]) => Promise<SearchableSelectOption[]>;

export type FilterColumnOption = {
	value: FilterColumn;
	label: string;
	valueType: FilterValueType;
	operators: FilterOperator[];
	placeholder?: string;
	selectOptions?: Array<{ value: string, label: string }>;
	searchOptionsAction?: FilterSelectSearchAction;
};

export type FilterCondition = {
	column: FilterColumn;
	operator: FilterOperator;
	joinWithPrevious: FilterCombinator;
	value: string;
	values: string[];
	existsValue: "true" | "false";
	dateValue: Date | null;
	dateText: string;
};

export type FilterSummaryItem = {
	combinator: string | null;
	columnLabel: string;
	operatorLabel: string;
	valueLabel: string;
};

type CreditApplicationImportTemplateColumn = {
	key: string;
	label: string;
	width: number;
	required?: boolean;
	multiline?: boolean;
	type: "text" | "email" | "number" | "date" | "json";
	example: string;
	promptTitle: string;
	prompt: string;
	error?: string;
};

export const reviewStatusOptions: Array<{ value: string, label: string }> = [
	{ value: "pending", label: "Pending" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" }
];

export const booleanFilterOptions: Array<{ value: string, label: string }> = [
	{ value: "true", label: "True" },
	{ value: "false", label: "False" }
];

export const filterOperatorOptions: Array<{ value: FilterOperator, label: string }> = [
	{ value: "equals", label: "Equals" },
	{ value: "not_equals", label: "Not Equals" },
	{ value: "contains", label: "Contains" },
	{ value: "not_contains", label: "Does Not Contain" },
	{ value: "in", label: "Is In" },
	{ value: "not_in", label: "Is Not In" },
	{ value: "exists", label: "Exists" },
	{ value: "greater_than", label: "Is Greater Than" },
	{ value: "less_than", label: "Is Less Than" },
	{ value: "greater_than_equal", label: "Is Greater Than Or Equal To" },
	{ value: "less_than_equal", label: "Is Less Than Or Equal To" }
];

export const creditApplicationImportTableColumns: CreditApplicationImportTableColumnConfig[] = [
	{ id: "id", label: "ID", sortField: "id", cellClassName: "font-mono text-xs" },
	{ id: "filename", label: "Filename", sortField: "filename", cellClassName: "font-medium" },
	{ id: "filesize", label: "Size", sortField: "filesize" },
	{ id: "mimeType", label: "MIME Type", sortField: "mimeType", cellClassName: "max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ id: "description", label: "Description", cellClassName: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ id: "reviewComment", label: "Review Comment", cellClassName: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ id: "createdBy", label: "Created By" },
	{ id: "updatedBy", label: "Updated By" },
	{ id: "deletedBy", label: "Deleted By" },
	{ id: "createdAt", label: "Created At", sortField: "createdAt" },
	{ id: "updatedAt", label: "Updated At", sortField: "updatedAt" },
	{ id: "deletedAt", label: "Deleted At", sortField: "deletedAt" },
	{ id: "status", label: "Status" },
	{ id: "reviewedAt", label: "Reviewed At", sortField: "reviewedAt" },
	{ id: "reviewedBy", label: "Reviewed By", sortField: "reviewedBy" },
	{ id: "reviewApproved", label: "Review Approved", sortField: "reviewApproved" }
];

export const creditApplicationImportFilterColumns: FilterColumnOption[] = [
	{ value: "id", label: "ID", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "filename", label: "Filename", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Filename" },
	{ value: "mimeType", label: "MIME Type", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "MIME type" },
	{ value: "filesize", label: "Size", valueType: "text", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"], placeholder: "File size in bytes" },
	{ value: "createdAt", label: "Created At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "createdBy", label: "Created By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "updatedAt", label: "Updated At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "updatedBy", label: "Updated By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "deletedAt", label: "Deleted At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "deletedBy", label: "Deleted By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "reviewedAt", label: "Reviewed At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "reviewedBy", label: "Reviewed By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "status", label: "Status", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: reviewStatusOptions },
	{ value: "reviewApproved", label: "Review Approved", valueType: "boolean", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: booleanFilterOptions }
];

export const defaultFilterCombinator: FilterCombinator = "and";

export function dedupeSelectOptions(options: SearchableSelectOption[]): SearchableSelectOption[] {
	const seen = new Set<string>();
	const deduplicated: SearchableSelectOption[] = [];
	for(const option of options) {
		const normalizedValue = option.value.trim();
		if(normalizedValue.length == 0)
			continue;
		const dedupeKey = normalizedValue.toLowerCase();
		if(seen.has(dedupeKey))
			continue;
		seen.add(dedupeKey);
		deduplicated.push({
			...option,
			value: normalizedValue
		});
	}
	return deduplicated;
}

export function formatFilterDateValue(date: Date | null): string {
	if(date == null)
		return "Select date and time";
	return `${date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}`;
}

export function parseFilterDateValue(value: string): Date | null {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const normalized = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(trimmed) ? trimmed.replace(" ", "T") : trimmed;
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseFilterDateOnlyValue(value: string): Date | null {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00` : trimmed;
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatFilterDateOnlyInput(date: Date | null): string {
	if(date == null)
		return "";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function formatFilterDateInput(date: Date | null): string {
	if(date == null)
		return "";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function applyTimeToDate(date: Date, timeValue: string): Date {
	const [rawHours, rawMinutes, rawSeconds = "0"] = timeValue.split(":");
	const hours = Number(rawHours);
	const minutes = Number(rawMinutes);
	const seconds = Number(rawSeconds);
	const nextDate = new Date(date);
	if(Number.isInteger(hours) && Number.isInteger(minutes) && Number.isInteger(seconds))
		nextDate.setHours(hours, minutes, seconds, 0);
	return nextDate;
}

export function getFilterTimeInput(date: Date | null): string {
	if(date == null)
		return "00:00:00";
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	return `${hours}:${minutes}:${seconds}`;
}

export function splitFilterDateValue(value: string): { dateText: string, timeText: string } {
	const parsed = parseFilterDateValue(value);
	if(parsed == null)
		return { dateText: "", timeText: "00:00:00" };
	return {
		dateText: formatFilterDateOnlyInput(parsed),
		timeText: getFilterTimeInput(parsed)
	};
}

export function buildFilterDateValue(dateText: string, timeText: string): string {
	const parsedDate = parseFilterDateOnlyValue(dateText);
	if(parsedDate == null)
		return "";
	return formatFilterDateInput(applyTimeToDate(parsedDate, timeText));
}

export function formatDateTime(dateValue: string | null) {
	if(dateValue == null)
		return "-";
	const date = new Date(dateValue);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

const CREDIT_APPLICATION_IMPORT_COLUMN_PREFERENCES_KEY = "credit-application-management-import-columns-v1";

function formatTextValue(value: string | null | undefined): string {
	const normalized = (value ?? "").trim();
	return normalized.length > 0 ? normalized : "-";
}

export function formatFileSize(bytes: number): string {
	if(!Number.isFinite(bytes) || bytes <= 0)
		return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / (1024 ** exponent);
	return `${value.toFixed(value >= 10 || exponent == 0 ? 0 : 1)} ${units[exponent]}`;
}

export function getStatusBadgeVariant(status: importActions.CreditApplicationImportStatus): "secondary" | "default" | "destructive" {
	if(status == "approved")
		return "default";
	if(status == "rejected")
		return "destructive";
	return "secondary";
}

export function getReviewStatus(row: Pick<CreditApplicationImportTableRow, "status" | "reviewedAt" | "reviewApproved">): {
	label: string;
	variant: "default" | "secondary" | "destructive";
} {
	if(row.reviewedAt == null || row.status == "pending")
		return { label: "Pending", variant: "secondary" };
	if(row.reviewApproved == true || row.status == "approved")
		return { label: "Approved", variant: "default" };
	return { label: "Rejected", variant: "destructive" };
}

function getCreditApplicationImportDrawerValueClassName(columnId: string): string {
	if(columnId == "id")
		return "text-xs font-mono";
	if(columnId == "filename")
		return "text-sm font-medium";
	if(columnId == "description" || columnId == "reviewComment")
		return "text-sm leading-relaxed whitespace-pre-wrap";
	return "text-sm";
}

export const defaultCreditApplicationImportColumnOrder: CreditApplicationImportTableColumnId[] = creditApplicationImportTableColumns.map(column => column.id);
export const defaultCreditApplicationImportVisibleColumns: CreditApplicationImportTableColumnId[] = ["filename", "filesize", "status", "updatedAt", "reviewComment"];
export const defaultCreditApplicationImportHiddenColumns: CreditApplicationImportTableColumnId[] = defaultCreditApplicationImportColumnOrder.filter(columnId => !defaultCreditApplicationImportVisibleColumns.includes(columnId));

export const creditApplicationImportTemplateColumns: CreditApplicationImportTemplateColumn[] = [
	{ key: "name", label: "Name", width: 28, required: true, type: "text", example: "Example Applicant", promptTitle: "Name", prompt: "Enter a non-empty applicant name.", error: "Name is required." },
	{ key: "email", label: "Email", width: 30, type: "email", example: "example@applicant.test", promptTitle: "Email", prompt: "Optional. When filled, enter a valid email address.", error: "Enter a valid email address or leave it blank." },
	{ key: "addresses", label: "Addresses", width: 34, required: true, multiline: true, type: "text", example: "Jl. Sudirman No. 1\nJakarta", promptTitle: "Addresses", prompt: "Enter at least one address. Use a new line for each additional address.", error: "Addresses must contain at least one non-empty line." },
	{ key: "phoneNumbers", label: "Phone Numbers", width: 24, required: true, multiline: true, type: "text", example: "081234567890\n0215551234", promptTitle: "Phone Numbers", prompt: "Enter at least one phone number. Use a new line for each additional phone number.", error: "Phone numbers must contain at least one non-empty line." },
	{ key: "whatsappNumber", label: "WhatsApp Number", width: 20, required: true, type: "text", example: "081234567890", promptTitle: "WhatsApp Number", prompt: "Enter the main WhatsApp number.", error: "WhatsApp number is required." },
	{ key: "smsNumber", label: "SMS Number", width: 20, type: "text", example: "081234567890", promptTitle: "SMS Number", prompt: "Optional. Enter the SMS number when available." },
	{ key: "collateralRegistryName", label: "Collateral Registry Name", width: 24, type: "text", example: "BPKB", promptTitle: "Collateral Registry Name", prompt: "Optional. Enter the collateral registry name." },
	{ key: "collateralName", label: "Collateral Name", width: 24, type: "text", example: "Toyota Avanza 2022", promptTitle: "Collateral Name", prompt: "Optional. Enter the collateral name." },
	{ key: "collateralDescription", label: "Collateral Description", width: 30, multiline: true, type: "text", example: "Black car\nPolice number B 1234 CD", promptTitle: "Collateral Description", prompt: "Optional. Use line breaks for multi-line descriptions." },
	{ key: "assetId", label: "Asset ID", width: 20, type: "text", example: "AST-001", promptTitle: "Asset ID", prompt: "Optional. Enter the asset identifier." },
	{ key: "assetName", label: "Asset Name", width: 24, type: "text", example: "Operational Vehicle", promptTitle: "Asset Name", prompt: "Optional. Enter the asset name." },
	{ key: "assetDescription", label: "Asset Description", width: 30, multiline: true, type: "text", example: "Company-owned vehicle\nUsed for field surveys", promptTitle: "Asset Description", prompt: "Optional. Use line breaks for multi-line descriptions." },
	{ key: "period", label: "Period", width: 14, type: "number", example: "24", promptTitle: "Period", prompt: "Optional. Enter a numeric period value.", error: "Period must be numeric or blank." },
	{ key: "installment", label: "Installment", width: 16, type: "number", example: "1500000", promptTitle: "Installment", prompt: "Optional. Enter a numeric installment value.", error: "Installment must be numeric or blank." },
	{ key: "downPayment", label: "Down Payment", width: 18, type: "number", example: "5000000", promptTitle: "Down Payment", prompt: "Optional. Enter a numeric down payment value.", error: "Down payment must be numeric or blank." },
	{ key: "plafond", label: "Plafond", width: 18, type: "number", example: "120000000", promptTitle: "Plafond", prompt: "Optional. Enter a numeric plafond value.", error: "Plafond must be numeric or blank." },
	{ key: "vendor", label: "Vendor", width: 24, type: "text", example: "PT Vendor Nusantara", promptTitle: "Vendor", prompt: "Optional. Enter the vendor name." },
	{ key: "remarks", label: "Remarks", width: 32, multiline: true, type: "text", example: "Priority customer\nRequested fast processing", promptTitle: "Remarks", prompt: "Optional. Use line breaks for multi-line remarks." },
	{ key: "otherText1", label: "Other Text 1", width: 18, type: "text", example: "Referral A", promptTitle: "Other Text 1", prompt: "Optional. Enter an additional text value." },
	{ key: "otherText2", label: "Other Text 2", width: 18, type: "text", example: "Referral B", promptTitle: "Other Text 2", prompt: "Optional. Enter an additional text value." },
	{ key: "otherNumber1", label: "Other Number 1", width: 16, type: "number", example: "12", promptTitle: "Other Number 1", prompt: "Optional. Enter a numeric value.", error: "Other Number 1 must be numeric or blank." },
	{ key: "otherNumber2", label: "Other Number 2", width: 16, type: "number", example: "34", promptTitle: "Other Number 2", prompt: "Optional. Enter a numeric value.", error: "Other Number 2 must be numeric or blank." },
	{ key: "otherDate1", label: "Other Date 1", width: 16, type: "date", example: "2026-04-25", promptTitle: "Other Date 1", prompt: "Optional. Enter a valid date in YYYY-MM-DD format or use Excel's date picker.", error: "Other Date 1 must be a valid date or blank." },
	{ key: "otherDate2", label: "Other Date 2", width: 16, type: "date", example: "2026-05-01", promptTitle: "Other Date 2", prompt: "Optional. Enter a valid date in YYYY-MM-DD format or use Excel's date picker.", error: "Other Date 2 must be a valid date or blank." },
	{ key: "others", label: "Others", width: 32, multiline: true, type: "json", example: "{\"source\":\"expo\",\"priority\":true}", promptTitle: "Others", prompt: "Optional. Enter plain text or valid JSON." }
];
export const creditApplicationImportPreviewColumns = creditApplicationImportTemplateColumns.map(column => ({
	id: column.key,
	label: column.label
}));

const creditApplicationImportTemplateTableName = "CreditApplicationImports";
const creditApplicationImportTemplateHeaderRow = 4;
const creditApplicationImportTemplateDataStartRow = creditApplicationImportTemplateHeaderRow + 1;
const creditApplicationImportTemplateDataEndRow = 256;

function getTemplateColumnLetter(columnIndex: number): string {
	let current = columnIndex;
	let output = "";
	while(current > 0) {
		const remainder = (current - 1) % 26;
		output = String.fromCharCode(65 + remainder) + output;
		current = Math.floor((current - 1) / 26);
	}
	return output;
}

function formatTemplateTimestamp(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function cssColorToArgb(value: string): string {
	if(typeof window == "undefined" || typeof document == "undefined")
		return "FF000000";

	const probe = document.createElement("div");
	probe.style.color = value;
	probe.style.position = "absolute";
	probe.style.pointerEvents = "none";
	probe.style.opacity = "0";
	document.body.appendChild(probe);
	const canvasContext = document.createElement("canvas").getContext("2d")!;

	try {
		const computedColor = window.getComputedStyle(probe).color.trim();
		canvasContext.fillStyle = computedColor;
		canvasContext.fillRect(0, 0, 1, 1);
		const data = canvasContext.getImageData(0, 0, 1, 1, { colorSpace: "srgb", pixelFormat: "rgba-unorm8" }).data;
		return [data[3], data[0], data[1], data[2]]
			.map(channel => Math.round(channel).toString(16).padStart(2, "0").toUpperCase())
			.join("");
	} finally {
		document.body.removeChild(probe);
	}
}

function resolveCssVarArgb(variableName: string): string {
	return cssColorToArgb(`var(${variableName})`);
}

function createTemplateValidationFormula(column: CreditApplicationImportTemplateColumn, cellRef: string): string | null {
	if(column.required == true && column.multiline == true)
		return `LEN(TRIM(SUBSTITUTE(${cellRef}&"",CHAR(10)," ")))>0`;
	if(column.required == true)
		return `LEN(TRIM(${cellRef}&""))>0`;
	if(column.type == "email")
		return `OR(LEN(TRIM(${cellRef}&""))=0,AND(ISNUMBER(SEARCH("@",${cellRef}&"")),ISNUMBER(SEARCH(".",${cellRef}&"",SEARCH("@",${cellRef}&"")+2))))`;
	if(column.type == "number")
		return `OR(LEN(TRIM(${cellRef}&""))=0,ISNUMBER(${cellRef}),NOT(ISERROR(VALUE(${cellRef}&""))))`;
	if(column.type == "date")
		return `OR(LEN(TRIM(${cellRef}&""))=0,ISNUMBER(${cellRef}),NOT(ISERROR(DATEVALUE(${cellRef}&""))))`;
	return null;
}

function triggerCreditApplicationImportFileDownload(href: string, fileName: string) {
	const anchor = document.createElement("a");
	anchor.href = href;
	anchor.download = fileName;
	anchor.target = "_blank";
	anchor.rel = "noreferrer";
	anchor.style.display = "none";
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
}

function formatCreditApplicationImportPreviewCellValue(
	row: importActions.ParsedCreditApplicationImportRow,
	columnId: typeof creditApplicationImportPreviewColumns[number]["id"]
): string {
	const value = row[columnId];
	if(Array.isArray(value))
		return value.length > 0 ? value.join("\n") : "-";
	if(value == null)
		return "-";
	if(typeof value == "number")
		return String(value);
	if(typeof value == "string")
		return value.trim().length > 0 ? value : "-";
	if(typeof value == "boolean")
		return value ? "True" : "False";
	return JSON.stringify(value, null, 2);
}

const creditApplicationImportNonEligibleColumnSet = new Set<string>([
	"status",
	"reviewApproved",
	"reviewedBy",
	"createdBy",
	"updatedBy",
	"deletedBy"
]);

export function getEligibleDetailTriggerCreditApplicationImportColumnId(visibleColumns: CreditApplicationImportTableColumnConfig[]): CreditApplicationImportTableColumnId | null {
	const triggerColumn = visibleColumns.find(column => !creditApplicationImportNonEligibleColumnSet.has(column.id));
	return triggerColumn?.id ?? null;
}

export function getFilterColumnConfig(column: FilterColumn): FilterColumnOption {
	return creditApplicationImportFilterColumns.find(option => option.value == column) ?? creditApplicationImportFilterColumns[0];
}

export function getResolvedCreditApplicationImportFilterColumnConfig(
	column: FilterColumn,
	idSelectOptions: Array<{ value: string, label: string }>,
	auditUserSelectOptions: Array<{ value: string, label: string }>,
	searchImportOptions?: FilterSelectSearchAction,
	searchAuditUserOptions?: FilterSelectSearchAction
): FilterColumnOption {
	const config = getFilterColumnConfig(column);
	switch(column) {
		case "id":
			return {
				...config,
				selectOptions: idSelectOptions,
				searchOptionsAction: searchImportOptions
			};
		case "createdBy":
		case "updatedBy":
		case "deletedBy":
		case "reviewedBy":
			return {
				...config,
				selectOptions: auditUserSelectOptions,
				searchOptionsAction: searchAuditUserOptions
			};
		default:
			return config;
	}
}

export function createFilterCondition(column: FilterColumn = creditApplicationImportFilterColumns[0].value): FilterCondition {
	const columnConfig = getFilterColumnConfig(column);
	return {
		column,
		operator: columnConfig.operators[0],
		joinWithPrevious: defaultFilterCombinator,
		value: "",
		values: [],
		existsValue: "true",
		dateValue: null,
		dateText: ""
	};
}

export function reorderColumns(order: CreditApplicationImportTableColumnId[], sourceId: CreditApplicationImportTableColumnId, targetId: CreditApplicationImportTableColumnId): CreditApplicationImportTableColumnId[] {
	if(sourceId == targetId)
		return order;
	const sourceIndex = order.indexOf(sourceId);
	const targetIndex = order.indexOf(targetId);
	if(sourceIndex == -1 || targetIndex == -1)
		return order;
	const nextOrder = [...order];
	const [moved] = nextOrder.splice(sourceIndex, 1);
	nextOrder.splice(targetIndex, 0, moved);
	return nextOrder;
}

export type CreditApplicationImportRelationNavigation = {
	getHrefBase: (managementKey: "user-management" | "credit-application-management" | "team-management") => string | null;
	onRelationLinkClick: (event: MouseEvent<HTMLAnchorElement>, request: {
		targetManagementKey: "user-management" | "credit-application-management" | "team-management";
		hrefBase: string;
		relationFilters: unknown;
		relationContext?: string;
	}) => void;
	onOpenSummary: (request: {
		type: "user";
		id: string;
		fallbackTitle: string;
		fallbackDescription?: string;
		fallbackMeta?: Array<{ label: string, value: string }>;
	}) => void;
};

function renderCreditApplicationImportUserRelationValue({
	column,
	relation,
	relationId,
	relationNavigation
}: {
	column: string;
	relation: { name: string, email: string, stagedUserId: string | null } | null;
	relationId: string | null;
	relationNavigation?: CreditApplicationImportRelationNavigation;
}): ReactNode {
	const value = relation?.name ?? relation?.email ?? "-";
	if(relationId == null || value.trim().length == 0 || value == "-")
		return value;

	const summaryLabel = {
		"reviewedBy": "Reviewed By",
		"createdBy": "Created By",
		"updatedBy": "Updated By",
		"deletedBy": "Deleted By"
	}[column];
	const hrefBase = relationNavigation?.getHrefBase("user-management");
	if(hrefBase != null && relationNavigation != null) {
		const stagedUserId = relation?.stagedUserId ?? null;
		if(stagedUserId == null || stagedUserId.trim().length == 0)
			return value;

		const relationFilters = [{ column: "id", operator: "equals", value: stagedUserId }];
		const searchParams = new URLSearchParams();
		searchParams.set(RELATION_FILTER_QUERY_PARAM, JSON.stringify(relationFilters));
		searchParams.set("relationContext", `credit-application-management-import:${column}`);
		const href = `${hrefBase}?${searchParams.toString()}`;

		return (
			<Link
				href={href}
				onClick={event => {
					if(event.altKey) {
						event.preventDefault();
						relationNavigation.onOpenSummary({
							type: "user",
							id: relationId,
							fallbackTitle: value,
							fallbackDescription: `${summaryLabel} user`
						});
						return;
					}
					relationNavigation.onRelationLinkClick(event, {
						targetManagementKey: "user-management",
						hrefBase,
						relationFilters,
						relationContext: `credit-application-management-import:${column}`
					});
				}}
				className="text-primary underline underline-offset-2 hover:opacity-80"
			>
				{value}
			</Link>
		);
	}

	if(relationNavigation == null)
		return value;

	return (
		<Button
			type="button"
			variant="link"
			onClick={() => relationNavigation.onOpenSummary({
				type: "user",
				id: relationId,
				fallbackTitle: value,
				fallbackDescription: `${summaryLabel} user`
			})}
			className="h-auto p-0 text-primary select-auto"
		>
			{value}
		</Button>
	);
}

function CreditApplicationImportFileBox({
	fileName,
	fileSize,
	href,
	importId,
	file
}: {
	fileName: string;
	fileSize: number;
	href: string | null;
	importId?: string;
	file?: File | null;
}) {
	const [previewOpen, setPreviewOpen] = useState(false);
	const normalizedImportId = importId?.trim() ?? "";
	const canParse = normalizedImportId.length > 0 || file != null;
	const downloadHref = href != null && href.length > 0 ? href : null;
	const canDownload = downloadHref != null;
	const parsePreviewQuery = useQuery({
		queryKey: ["credit-application-management", "imports", "file-preview", normalizedImportId, file?.name ?? null, file?.size ?? null, file?.lastModified ?? null],
		enabled: canParse,
		queryFn: async () => {
			const formData = new FormData();
			if(file != null)
				formData.set("file", file);
			else
				formData.set("importId", normalizedImportId);
			return importActions.parseCreditApplicationImportPreviewAction(formData);
		},
		refetchOnWindowFocus: true
	});

	const handleBoxClick = (event: MouseEvent<HTMLButtonElement>) => {
		if(event.altKey && canDownload) {
			triggerCreditApplicationImportFileDownload(downloadHref, fileName);
			return;
		}
		if(canParse)
			setPreviewOpen(true);
	};

	const previewStatusText = (() => {
		if(parsePreviewQuery.isPending)
			return "Parsing import file...";
		if(parsePreviewQuery.isError)
			return parsePreviewQuery.error instanceof Error ? parsePreviewQuery.error.message : "Unable to parse import file.";
		if(parsePreviewQuery.data != null)
			return `${parsePreviewQuery.data.rowCount} parsed row(s)`;
		if(canDownload)
			return "Alt+Click to download";
		return "Preview unavailable";
	})();
	const isError = parsePreviewQuery.isError;
	const isInteractive = canParse || canDownload;

	return (
		<>
			{isInteractive ? (
				<Button asChild type="button" variant="outline" className="h-auto w-full justify-start p-3" onClick={handleBoxClick}>
					<div className="flex w-full items-center gap-3">
						<FileSpreadsheetIcon className="size-4 shrink-0" />
						<div className="min-w-0 flex-1 text-left">
							<p className="truncate text-sm font-medium">{fileName}</p>
							<p className="text-muted-foreground text-xs">{formatFileSize(fileSize)}</p>
							<p className={cn("mt-1 text-xs", isError ? "text-destructive" : "text-muted-foreground")}>{previewStatusText}</p>
						</div>
						{canDownload ? <Button variant="ghost" onClick={e => { e.stopPropagation(); triggerCreditApplicationImportFileDownload(downloadHref, fileName); }}><DownloadIcon className="size-4 shrink-0" /></Button> : null}
					</div>
				</Button>
			) : (
				<div className="rounded-lg border p-3">
					<div className="flex items-center gap-2 text-sm">
						<FileSpreadsheetIcon className="size-4" />
						<span className="font-medium">{fileName}</span>
					</div>
					<p className="text-muted-foreground mt-1 text-xs">{formatFileSize(fileSize)}</p>
				</div>
			)}

			<Drawer open={previewOpen} onOpenChange={setPreviewOpen} direction="right">
				<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-3xl">
					<DrawerHeader>
						<DrawerTitle>Import File Preview</DrawerTitle>
						<DrawerDescription>Preview the rows parsed by the server from this import file before using it in the workflow.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
						<div className="bg-muted/30 rounded-lg border p-3 text-sm">
							<p><span className="font-medium">File:</span> {fileName}</p>
							<p><span className="font-medium">Size:</span> {formatFileSize(fileSize)}</p>
							<p>
								<span className="font-medium">Parsed Rows:</span>{" "}
								{parsePreviewQuery.data != null ? parsePreviewQuery.data.rowCount : parsePreviewQuery.isPending ? "Parsing..." : "-"}
							</p>
						</div>

						<div className="rounded-xl border">
							<Table>
								<TableHeader>
									<TableRow>
										{creditApplicationImportPreviewColumns.map(column => (
											<TableHead key={column.id}>{column.label}</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{parsePreviewQuery.isPending ? (
										<TableRow>
											<TableCell colSpan={creditApplicationImportPreviewColumns.length} className="text-muted-foreground py-8 text-center">Parsing import file...</TableCell>
										</TableRow>
									) : null}
									{parsePreviewQuery.isError ? (
										<TableRow>
											<TableCell colSpan={creditApplicationImportPreviewColumns.length} className="py-4">
												<Alert variant="destructive">
													<CircleAlertIcon />
													<AlertTitle>Parse Error</AlertTitle>
													<AlertDescription>
														{parsePreviewQuery.error instanceof Error ? parsePreviewQuery.error.message : "Unable to parse import file."}
													</AlertDescription>
												</Alert>
											</TableCell>
										</TableRow>
									) : null}
									{!parsePreviewQuery.isPending && !parsePreviewQuery.isError && parsePreviewQuery.data?.rows.length == 0 ? (
										<TableRow>
											<TableCell colSpan={creditApplicationImportPreviewColumns.length} className="text-muted-foreground py-8 text-center">No parsed rows found.</TableCell>
										</TableRow>
									) : null}
									{parsePreviewQuery.data?.rows.map((row, index) => (
										<TableRow key={`${fileName}-${index}`}>
											{creditApplicationImportPreviewColumns.map(column => (
												<TableCell key={`${fileName}-${index}-${column.id}`} className="max-w-[260px] whitespace-pre-wrap wrap-break-word">
													{formatCreditApplicationImportPreviewCellValue(row, column.id)}
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
					<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
						<Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
						{canDownload ? (
							<Button type="button" variant="secondary" onClick={() => triggerCreditApplicationImportFileDownload(downloadHref, fileName)}>
								<DownloadIcon />
								Download
							</Button>
						) : null}
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</>
	);
}

type CreditApplicationImportRequestDetailsDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: CreditApplicationImportTableRow | null;
	renderActions: (row: CreditApplicationImportTableRow) => ReactNode;
	relationNavigation?: CreditApplicationImportRelationNavigation;
};

export function CreditApplicationImportRequestDetailsDrawer({
	open,
	onOpenChange,
	row,
	renderActions,
	relationNavigation
}: CreditApplicationImportRequestDetailsDrawerProps) {
	const detailsQuery = useQuery({
		queryKey: ["credit-application-management", "imports", "details", row?.id ?? null],
		enabled: open && row != null,
		queryFn: () => importActions.getCreditApplicationImportRequestDetailsAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const details = detailsQuery.data;
	const actionRow = details?.row ?? row;

	const renderDetailColumnValue = (columnId: CreditApplicationImportTableColumnId, value: ReactNode) => {
		return <div className={cn(getCreditApplicationImportDrawerValueClassName(columnId), "wrap-break-word")}>{value}</div>;
	};

	const renderDetailValue = (columnId: CreditApplicationImportTableColumnId, data: importActions.CreditApplicationImportRequestDetailsOutput) => {
		switch(columnId) {
			case "id":
				return renderDetailColumnValue(columnId, data.row.id);
			case "filename":
				return renderDetailColumnValue(columnId, data.row.filename);
			case "filesize":
				return renderDetailColumnValue(columnId, formatFileSize(data.row.filesize));
			case "mimeType":
				return renderDetailColumnValue(columnId, formatTextValue(data.row.mimeType));
			case "description":
				return renderDetailColumnValue(columnId, <ReviewCommentPreview serializedState={data.row.description ?? undefined} className="w-full bg-transparent shadow-none border-none rounded-none" contentClassName="min-h-5 max-h-44 p-0" placeholderClassName="p-0" />);
			case "reviewComment":
				return renderDetailColumnValue(columnId, <ReviewCommentPreview serializedState={data.row.reviewComment ?? undefined} className="w-full bg-transparent shadow-none border-none rounded-none" contentClassName="min-h-5 max-h-44 p-0" placeholderClassName="p-0" />);
			case "createdBy":
				return renderDetailColumnValue(columnId, renderCreditApplicationImportUserRelationValue({ column: "createdBy", relation: data.row.createdBy == null ? null : data.relations[`users:${data.row.createdBy}`] ?? null, relationId: data.row.createdBy, relationNavigation }));
			case "updatedBy":
				return renderDetailColumnValue(columnId, renderCreditApplicationImportUserRelationValue({ column: "updatedBy", relation: data.row.updatedBy == null ? null : data.relations[`users:${data.row.updatedBy}`] ?? null, relationId: data.row.updatedBy, relationNavigation }));
			case "deletedBy":
				return renderDetailColumnValue(columnId, renderCreditApplicationImportUserRelationValue({ column: "deletedBy", relation: data.row.deletedBy == null ? null : data.relations[`users:${data.row.deletedBy}`] ?? null, relationId: data.row.deletedBy, relationNavigation }));
			case "createdAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.createdAt));
			case "updatedAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.updatedAt));
			case "deletedAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.deletedAt));
			case "status": {
				const status = getReviewStatus(data.row);
				return <Badge variant={status.variant}>{status.label}</Badge>;
			}
			case "reviewedAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.reviewedAt));
			case "reviewedBy":
				return renderDetailColumnValue(columnId, renderCreditApplicationImportUserRelationValue({ column: "reviewedBy", relation: data.row.reviewedBy == null ? null : data.relations[`users:${data.row.reviewedBy}`] ?? null, relationId: data.row.reviewedBy, relationNavigation }));
			case "reviewApproved":
				return renderDetailColumnValue(columnId, data.row.reviewApproved == null ? "-" : data.row.reviewApproved ? "True" : "False");
			default:
				return renderDetailColumnValue(columnId, "-");
		}
	};

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Credit Application Import Request Details</DrawerTitle>
					<DrawerDescription>Review all available columns for this import request entry.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">No import request selected.</p>
					) : detailsQuery.isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : detailsQuery.isError || details == null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>Unable to load import request details.</AlertDescription>
						</Alert>
					) : (
						<>
							<CreditApplicationImportFileBox fileName={details.row.filename} fileSize={details.row.filesize} href={details.row.fileUrl} importId={details.row.id} />
							{creditApplicationImportTableColumns.map(column => (
								<div key={`${details.row.id}-details-${column.id}`} className="space-y-1 rounded-lg border p-3">
									<p className="text-muted-foreground text-xs font-medium">{column.label}</p>
									{renderDetailValue(column.id, details)}
								</div>
							))}
						</>
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
					{actionRow != null ? renderActions(actionRow) : null}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

type CreditApplicationImportRequestFormDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formState: CreditApplicationImportFormState;
	formError: ActionError | null;
	isMutating: boolean;
	onFormStateChange: (updater: (previous: CreditApplicationImportFormState) => CreditApplicationImportFormState) => void;
	onSubmit: () => void;
};

export function CreditApplicationImportRequestFormDrawer({
	open,
	onOpenChange,
	formState,
	formError,
	isMutating,
	onFormStateChange,
	onSubmit
}: CreditApplicationImportRequestFormDrawerProps) {
	const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
	const [isTemplateDownloading, setIsTemplateDownloading] = useState(false);

	useEffect(() => {
		if(formState.file == null) {
			setLocalObjectUrl(null);
			return;
		}

		const nextObjectUrl = URL.createObjectURL(formState.file);
		setLocalObjectUrl(nextObjectUrl);
		return () => URL.revokeObjectURL(nextObjectUrl);
	}, [formState.file]);

	const isEditMode = formState.importId != null;
	const resolvedFileName = formState.file?.name ?? formState.filename;
	const resolvedFileSize = formState.file?.size ?? formState.filesize;
	const resolvedFileHref = formState.file != null ? localObjectUrl : formState.fileUrl;
	const handleDownloadTemplate = useCallback(() => {
		if(isTemplateDownloading)
			return;

		void (async () => {
			setIsTemplateDownloading(true);
			const ExcelJS = (await import("@/utils/exceljs")).default;
			const workbook = new ExcelJS.Workbook();
			const worksheet = workbook.addWorksheet("Credit Applications", {
				pageSetup: {
					fitToWidth: 1,
					fitToHeight: 0,
					orientation: "landscape",
					paperSize: 9,
					margins: {
						top: 0.4,
						right: 0.4,
						bottom: 0.4,
						left: 0.4,
						header: 0.2,
						footer: 0.2
					}
				}
			});
			const backgroundArgb = resolveCssVarArgb("--background");
			const foregroundArgb = resolveCssVarArgb("--foreground");
			const accentArgb = resolveCssVarArgb("--accent");
			const accentForegroundArgb = resolveCssVarArgb("--accent-foreground");
			const lastColumnLetter = getTemplateColumnLetter(creditApplicationImportTemplateColumns.length);
			const documentTitle = document.title.trim().length > 0 ? document.title : "Mobile Survey Intelix";
			const titleRange = `B1:${lastColumnLetter}1`;
			const promptRange = `B2:${lastColumnLetter}2`;
			const rowCountLabelCell = "A3";
			const rowCountValueCell = "B3";

			workbook.title = "Credit Application Import Template";
			workbook.creator = documentTitle;
			workbook.lastModifiedBy = documentTitle;
			workbook.created = new Date();
			workbook.modified = new Date();

			worksheet.properties.defaultRowHeight = 22;
			worksheet.columns = creditApplicationImportTemplateColumns.map(column => ({
				key: column.key,
				width: column.width,
				style: {
					fill: { type: "pattern", pattern: "solid", fgColor: { argb: backgroundArgb } },
					font: { name: "Inter", size: 10, color: { argb: foregroundArgb } },
					alignment: {
						vertical: "top",
						wrapText: column.multiline == true
					}
				}
			}));

			worksheet.getRow(1).height = 104;
			worksheet.getRow(2).height = 44;

			for(let rowNumber = 1; rowNumber <= creditApplicationImportTemplateDataStartRow; rowNumber++) {
				for(let columnNumber = 1; columnNumber <= creditApplicationImportTemplateColumns.length; columnNumber++) {
					const cell = worksheet.getCell(`${getTemplateColumnLetter(columnNumber)}${rowNumber}`);
					cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: backgroundArgb } };
					cell.font = { name: "Inter", size: 10, color: { argb: foregroundArgb } };
				}
			}

			worksheet.mergeCells(titleRange);
			worksheet.mergeCells(promptRange);

			for(let rowNumber = 1; rowNumber <= 2; rowNumber++) {
				for(let columnNumber = 1; columnNumber <= creditApplicationImportTemplateColumns.length; columnNumber++) {
					const cell = worksheet.getCell(`${getTemplateColumnLetter(columnNumber)}${rowNumber}`);
					cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accentArgb } };
					cell.font = { name: "Inter", size: 10, color: { argb: accentForegroundArgb } };
				}
			}

			worksheet.getCell("B1").value = "Credit Application Import Template";
			worksheet.getCell("B1").font = { name: "Inter", size: 20, bold: true, color: { argb: accentForegroundArgb } };
			worksheet.getCell("B1").alignment = { horizontal: "left", vertical: "middle" };
			worksheet.getCell("B2").value = "Fill the table below and upload the workbook as-is. Use line breaks inside addresses and phone numbers cells for multiple entries, then replace or remove the sample row before importing.";
			worksheet.getCell("B2").font = { name: "Inter", size: 11, color: { argb: accentForegroundArgb } };
			worksheet.getCell("B2").alignment = { horizontal: "left", vertical: "middle", wrapText: true };

			const logoResponse = await fetch(importTemplateLogo.src);
			const logoImage = workbook.addImage({
				base64: btoa(String.fromCharCode(...new Uint8Array(await logoResponse.arrayBuffer()))),
				extension: "png"
			});
			worksheet.addImage(logoImage, {
				tl: { col: 0.25, row: 0.1 },
				ext: { width: 180, height: 180 },
				hyperlinks: {
					hyperlink: location.href,
					tooltip: document.title
				}
			});

			worksheet.getCell(rowCountLabelCell).value = "Total Rows";
			worksheet.getCell(rowCountValueCell).value = { formula: `MAX(COUNTA(A${creditApplicationImportTemplateDataStartRow}:A${creditApplicationImportTemplateDataEndRow}),0)` };
			worksheet.getCell(rowCountLabelCell).font = { name: "Inter", size: 10, bold: true, color: { argb: foregroundArgb } };
			worksheet.getCell(rowCountValueCell).font = { name: "Inter", size: 10, bold: true, color: { argb: foregroundArgb } };

			worksheet.addTable({
				name: creditApplicationImportTemplateTableName,
				displayName: creditApplicationImportTemplateTableName,
				ref: `A${creditApplicationImportTemplateHeaderRow}`,
				headerRow: true,
				style: {
					theme: null as any,
					showRowStripes: false
				},
				columns: creditApplicationImportTemplateColumns.map(column => ({
					name: column.label,
					filterButton: true
				})),
				rows: [
					creditApplicationImportTemplateColumns.map(column => column.example)
				]
			});

			const headerRow = worksheet.getRow(creditApplicationImportTemplateHeaderRow);
			headerRow.height = 24;
			for(let index = 0; index < creditApplicationImportTemplateColumns.length; index++) {
				const column = creditApplicationImportTemplateColumns[index];
				const columnIndex = index + 1;
				const columnLetter = getTemplateColumnLetter(columnIndex);
				const headerCell = worksheet.getCell(`${columnLetter}${creditApplicationImportTemplateHeaderRow}`);
				const sampleCell = worksheet.getCell(`${columnLetter}${creditApplicationImportTemplateDataStartRow}`);
				const validationFormula = createTemplateValidationFormula(column, `${columnLetter}${creditApplicationImportTemplateDataStartRow}`);

				headerCell.font = { name: "Inter", size: 10, bold: true, color: { argb: accentForegroundArgb } };
				headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accentArgb } };
				headerCell.alignment = { vertical: "middle", wrapText: true };

				sampleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: backgroundArgb } };
				sampleCell.font = { name: "Inter", size: 10, color: { argb: foregroundArgb } };
				sampleCell.alignment = { vertical: "top", wrapText: column.multiline == true };
				if(column.type == "date")
					worksheet.getColumn(columnIndex).numFmt = "yyyy-mm-dd";

				(worksheet as any).dataValidations.add(`${columnLetter}${creditApplicationImportTemplateDataStartRow}:${columnLetter}${creditApplicationImportTemplateDataEndRow}`, {
					type: "custom",
					allowBlank: column.required != true,
					formulae: [validationFormula ?? "TRUE"],
					showInputMessage: true,
					promptTitle: column.promptTitle,
					prompt: column.prompt,
					showErrorMessage: validationFormula != null,
					errorTitle: "Invalid value",
					error: column.error ?? `${column.label} contains an invalid value.`
				});
			}

			for(let i = creditApplicationImportTemplateColumns.length; i <= 16384; i++)
				worksheet.getColumn(i).hidden = true;

			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
			const blobUrl = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = blobUrl;
			anchor.download = `credit-application-import-template-${formatTemplateTimestamp(new Date())}.xlsx`;
			anchor.style.display = "none";
			document.body.appendChild(anchor);
			anchor.click();
			document.body.removeChild(anchor);
			URL.revokeObjectURL(blobUrl);

			setIsTemplateDownloading(false);
		})();
	}, [isTemplateDownloading]);

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>{isEditMode ? "Edit Import Description" : "Add Credit Application Import"}</DrawerTitle>
					<DrawerDescription>
						{isEditMode ? "Description can be edited only while this import has not been reviewed." : "Upload one Excel file that follows the credit application import template."}
					</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-3 pb-4 sm:grid-cols-2">
						{!isEditMode ? (
							<div className="bg-muted/40 space-y-2 sm:col-span-2 rounded-lg border p-3">
								<p className="text-sm font-medium">Need a starter workbook?</p>
								<p className="text-muted-foreground text-xs">Download the XLSX template with every supported column, built-in validation rules, and the same layout used by the importer.</p>
								<Button
									type="button"
									variant="link"
									className="h-auto px-0"
									onClick={handleDownloadTemplate}
									disabled={isMutating || isTemplateDownloading}
								>
									<DownloadIcon />
									{isTemplateDownloading ? "Generating template..." : "Download import template"}
								</Button>
							</div>
						) : null}

						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Excel File</label>
							<Input
								type="file"
								accept=".xlsx,.xls"
								onChange={event => {
									const selectedFile = event.target.files?.[0] ?? null;
									onFormStateChange(previous => ({ ...previous, file: selectedFile }));
								}}
								disabled={isEditMode || isMutating}
							/>
							{isEditMode ? (
								<p className="text-muted-foreground text-xs">File is immutable after upload. Create a new import to change the file.</p>
							) : null}
							{resolvedFileName.trim().length == 0 ? (
								<p className="text-muted-foreground text-xs">No file selected.</p>
							) : null}
						</div>

						{resolvedFileName.trim().length > 0 ? (
							<div className="space-y-2 sm:col-span-2">
								<CreditApplicationImportFileBox
									fileName={resolvedFileName}
									fileSize={resolvedFileSize}
									href={resolvedFileHref}
									importId={formState.importId}
									file={formState.file}
								/>
							</div>
						) : null}

						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Description</label>
							<ReviewCommentInput serializedState={formState.description} onSerializedStateChange={value => onFormStateChange(previous => ({ ...previous, description: value as ReviewCommentRichText }))} onImageUpload={uploadGenericRichtextImage} />
						</div>

						{formError != null ? (
							<Alert variant="destructive" className="sm:col-span-2">
								<CircleAlertIcon />
								<AlertTitle>{formError.title}</AlertTitle>
								<AlertDescription>{formError.message}</AlertDescription>
							</Alert>
						) : null}
					</div>
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
					<Button type="button" onClick={onSubmit} disabled={isMutating || isTemplateDownloading || (!isEditMode && formState.file == null)}>
						{isEditMode ? <CheckIcon /> : <UploadIcon />}
						{isEditMode ? "Save Description" : "Upload"}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

type CreditApplicationImportRequestReviewDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reviewDrawerState: { row: CreditApplicationImportTableRow } | null;
	reviewError: ActionError | null;
	reviewComment: ReviewCommentRichText;
	onReviewCommentChange: (value: ReviewCommentRichText) => void;
	onApprove: () => void;
	onReject: () => void;
	isMutating: boolean;
};

export function CreditApplicationImportRequestReviewDrawer({
	open,
	onOpenChange,
	reviewDrawerState,
	reviewError,
	reviewComment,
	onReviewCommentChange,
	onApprove,
	onReject,
	isMutating
}: CreditApplicationImportRequestReviewDrawerProps) {
	const row = reviewDrawerState?.row ?? null;
	const reviewStatus = row == null ? null : getReviewStatus(row);

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Review</DrawerTitle>
					<DrawerDescription>Review the selected import request before making a decision. Approval parses the uploaded file again and creates credit applications from its rows.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-3 pb-4 sm:grid-cols-2">
						{row == null ? (
							<p className="text-muted-foreground text-sm sm:col-span-2">No import request selected.</p>
						) : (
							<>
								<div className="space-y-2 sm:col-span-2">
									<CreditApplicationImportFileBox fileName={row.filename} fileSize={row.filesize} href={row.fileUrl} importId={row.id} />
								</div>
								<div className="sm:col-span-2 bg-muted/30 rounded-lg border p-3 text-sm">
									<p>
										<span className="font-medium">Current Status:</span>{" "}
										{reviewStatus != null ? <Badge variant={reviewStatus.variant}>{reviewStatus.label}</Badge> : "-"}
									</p>
									<p className="text-muted-foreground mt-1">Description can no longer be modified after this review action.</p>
								</div>
								<div className="space-y-1 sm:col-span-2 rounded-lg border p-3">
									<p className="text-muted-foreground text-xs font-medium">Description</p>
									<div className={cn("wrap-break-word", getCreditApplicationImportDrawerValueClassName("description"))}>
										<ReviewCommentPreview serializedState={row.description ?? undefined} className="w-full bg-transparent shadow-none border-none rounded-none" contentClassName="min-h-5 max-h-44 p-0" placeholderClassName="p-0" />
									</div>
								</div>
							</>
						)}

						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Review Comment (optional)</label>
							<ReviewCommentInput serializedState={reviewComment} onSerializedStateChange={onReviewCommentChange} onImageUpload={uploadGenericRichtextImage} />
						</div>

						{reviewError != null ? (
							<Alert variant="destructive" className="sm:col-span-2">
								<CircleAlertIcon />
								<AlertTitle>{reviewError.title}</AlertTitle>
								<AlertDescription>{reviewError.message}</AlertDescription>
							</Alert>
						) : null}
					</div>
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
					<Button type="button" variant="default" onClick={onApprove} disabled={isMutating || row == null}>Approve</Button>
					<Button type="button" variant="destructive" onClick={onReject} disabled={isMutating || row == null}>Reject</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

type CreditApplicationImportRequestsTableProps = {
	queryResult: queryCreditApplicationImportsOutput;
	visibleColumns: CreditApplicationImportTableColumnConfig[];
	visibleColumnCount: number;
	includeActions?: boolean;
	detailTriggerColumnId: CreditApplicationImportTableColumnId | null;
	isLoading: boolean;
	isMutating: boolean;
	getSortDirection: (field: SortField) => SortDirection | null;
	onToggleSortField: (field: SortField) => void;
	onOpenDetails: (row: CreditApplicationImportTableRow) => void;
	renderCreditApplicationImportCell: (columnId: CreditApplicationImportTableColumnConfig["id"], row: CreditApplicationImportTableRow) => ReactNode;
	renderActions: (row: CreditApplicationImportTableRow) => ReactNode;
};

export function CreditApplicationImportRequestsTable({
	queryResult,
	visibleColumns,
	visibleColumnCount,
	includeActions = true,
	detailTriggerColumnId,
	isLoading,
	isMutating,
	getSortDirection,
	onToggleSortField,
	onOpenDetails,
	renderCreditApplicationImportCell,
	renderActions
}: CreditApplicationImportRequestsTableProps) {
	const renderSortIcon = (field: SortField) => {
		const direction = getSortDirection(field);
		if(direction == "asc")
			return <ArrowUpIcon className="size-3.5" />;
		if(direction == "desc")
			return <ArrowDownIcon className="size-3.5" />;
		return <ArrowUpDownIcon className="text-muted-foreground size-3.5" />;
	};

	return (
		<div className="rounded-xl border">
			<Table>
				<TableHeader>
					<TableRow>
						{visibleColumns.map(column => (
							column.sortField != null ? (
								<TableHead key={column.id} className={column.headClassName}>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => onToggleSortField(column.sortField!)}
										disabled={isLoading || isMutating}
										className="-ml-2 h-7 gap-1 px-2"
									>
										{column.label}
										{renderSortIcon(column.sortField)}
									</Button>
								</TableHead>
							) : (
								<TableHead key={column.id} className={column.headClassName}>{column.label}</TableHead>
							)
						))}
						{includeActions ? <TableHead className="w-65">Actions</TableHead> : null}
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						<TableRow>
							<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">Loading import requests...</TableCell>
						</TableRow>
					) : null}
					{!isLoading && queryResult.docs.length == 0 ? (
						<TableRow>
							<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">No import requests found.</TableCell>
						</TableRow>
					) : null}
					{queryResult.docs.map(row => {
						return (
							<TableRow key={row.id}>
								{visibleColumns.map(column => {
									const cellValue = renderCreditApplicationImportCell(column.id, row);
									const isDetailTriggerColumn = detailTriggerColumnId != null && column.id == detailTriggerColumnId;
									return (
										<TableCell key={`${row.id}-${column.id}`} className={column.cellClassName}>
											{isDetailTriggerColumn ? (
												<Button type="button" variant="link" onClick={() => onOpenDetails(row)} className="text-primary h-auto p-0 text-left whitespace-normal select-auto">
													{cellValue}
												</Button>
											) : cellValue}
										</TableCell>
									);
								})}
								{includeActions ? (
									<TableCell>
										<div className="flex flex-wrap gap-2">
											{renderActions(row)}
										</div>
									</TableCell>
								) : null}
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

type CreditApplicationImportColumnConfigCardProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	orderedColumns: CreditApplicationImportTableColumnConfig[];
	hiddenColumnIds: CreditApplicationImportTableColumnId[];
	visibleColumnCount: number;
	onToggleColumnVisibility: (columnId: CreditApplicationImportTableColumnId, checked: boolean) => void;
	onReset: () => void;
	onColumnDragStart: (columnId: CreditApplicationImportTableColumnId) => void;
	onColumnDragOver: (event: DragEvent<HTMLDivElement>, targetColumnId: CreditApplicationImportTableColumnId) => void;
	onColumnDragEnd: () => void;
};

export function CreditApplicationImportColumnConfigCard({
	isOpen,
	onOpenChange,
	orderedColumns,
	hiddenColumnIds,
	visibleColumnCount,
	onToggleColumnVisibility,
	onReset,
	onColumnDragStart,
	onColumnDragOver,
	onColumnDragEnd
}: CreditApplicationImportColumnConfigCardProps) {
	return (
		<Collapsible open={isOpen} onOpenChange={onOpenChange}>
			<CollapsibleContent>
				<div className="space-y-3 rounded-xl border p-4">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Configure Columns</h3>
							<p className="text-muted-foreground text-sm">Toggle visibility and drag cards to reorder columns.</p>
						</div>
						<div className="flex items-center gap-2">
							<p className="text-muted-foreground text-sm">Visible {visibleColumnCount} of {creditApplicationImportTableColumns.length}</p>
							<Button type="button" variant="outline" size="sm" onClick={onReset}>Reset</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{orderedColumns.map(column => {
							const isVisible = !hiddenColumnIds.includes(column.id);
							const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= creditApplicationImportTableColumns.length - 1;
							return (
								<div
									key={column.id}
									draggable
									onDragStart={() => onColumnDragStart(column.id)}
									onDragOver={event => onColumnDragOver(event, column.id)}
									onDragEnd={onColumnDragEnd}
									onDrop={onColumnDragEnd}
									className="hover:bg-muted/60 flex h-full min-h-14 items-center gap-3 rounded-lg border px-3 py-1.5 text-left"
								>
									<GripVerticalIcon className="text-muted-foreground size-4 shrink-0" />
									<Checkbox
										checked={isVisible}
										disabled={isOnlyVisibleColumn}
										onCheckedChange={checked => onToggleColumnVisibility(column.id, checked == true)}
									/>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium">{column.label}</p>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

type CreditApplicationImportRequestFilterCardProps = {
	isLoading: boolean;
	isMutating: boolean;
	filters: useCreditApplicationImportRequestFiltersResult;
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption;
};

export function CreditApplicationImportRequestFilterCard({
	isLoading,
	isMutating,
	filters,
	getResolvedFilterColumnConfig
}: CreditApplicationImportRequestFilterCardProps) {
	return (
		<Collapsible open={filters.isFilterOpen} onOpenChange={filters.setIsFilterOpen}>
			<CollapsibleContent>
				<div className="space-y-3 rounded-xl border p-4">
					<div className="flex items-center justify-between gap-2">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Configure Filters</h3>
							<p className="text-muted-foreground text-sm">Build multiple filters and combine them with AND or OR.</p>
						</div>
						{filters.appliedFilters.length > 0 ? (
							<Button type="button" variant="outline" size="sm" onClick={filters.clearFilter} disabled={isLoading || isMutating}>Clear Filter</Button>
						) : null}
					</div>
					{filters.filters.map((filterCondition, index) => {
						const columnConfig = getResolvedFilterColumnConfig(filterCondition.column);

						return (
							<div key={index} className="space-y-3">
								{index > 0 ? (
									<div className="rounded-lg border border-dashed p-2">
										<label className="text-sm font-medium">Combinator with previous filter</label>
										<Select
											value={filterCondition.joinWithPrevious}
											onValueChange={value => filters.updateFilterJoinWithPrevious(index, value as FilterCombinator)}
										>
											<SelectTrigger className="w-full"><SelectValue placeholder="Select combinator" /></SelectTrigger>
											<SelectContent>
												<SelectItem value="and">AND</SelectItem>
												<SelectItem value="or">OR</SelectItem>
											</SelectContent>
										</Select>
									</div>
								) : null}
								<div className="space-y-3 rounded-lg border p-3">
									<div className="flex items-center justify-between">
										<p className="text-sm font-medium">Filter {index + 1}</p>
										<Button type="button" variant="ghost" size="sm" onClick={() => filters.removeFilter(index)} disabled={isMutating}>
											<XIcon />
											Remove
										</Button>
									</div>
									<div className="grid gap-3 sm:grid-cols-2">
										<div className="space-y-2">
											<label className="text-sm font-medium">Column</label>
											<Select value={filterCondition.column} onValueChange={value => filters.handleFilterColumnChange(index, value as FilterColumn)}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select column" /></SelectTrigger>
												<SelectContent>
													{creditApplicationImportFilterColumns.map(column => (
														<SelectItem key={column.value} value={column.value}>{column.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium">Operator</label>
											<Select value={filterCondition.operator} onValueChange={value => filters.handleFilterOperatorChange(index, value as FilterColumnOption["operators"][number])}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select operator" /></SelectTrigger>
												<SelectContent>
													{filterOperatorOptions.filter(operator => columnConfig.operators.includes(operator.value)).map(operator => (
														<SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
									<div className="space-y-2">
										<label className="text-sm font-medium">Filter Value</label>
										{filterCondition.operator == "exists" ? (
											<Select value={filterCondition.existsValue} onValueChange={value => filters.updateFilter(index, previous => ({ ...previous, existsValue: value as "true" | "false" }))}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select exists value" /></SelectTrigger>
												<SelectContent>
													<SelectItem value="true">True</SelectItem>
													<SelectItem value="false">False</SelectItem>
												</SelectContent>
											</Select>
										) : filterCondition.operator == "in" || filterCondition.operator == "not_in" ? (
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<p className="text-muted-foreground text-xs">Define one or more values.</p>
													<Button type="button" variant="outline" onClick={() => filters.addFilterListValue(index)} disabled={isMutating}><PlusIcon />Add Value</Button>
												</div>
												{filterCondition.values.length == 0 ? (
													<p className="text-muted-foreground text-xs">Click Add Value to create rows.</p>
												) : (
													<div className="space-y-2">
														{filterCondition.values.map((value, valueIndex) => {
															const listDate = columnConfig.valueType == "date" ? splitFilterDateValue(value) : null;
															return (
																<div key={`${index}-${valueIndex}`} className="flex items-start gap-2">
																	{columnConfig.valueType == "boolean" ? (
																		<Select value={value.length > 0 ? value : "true"} onValueChange={nextValue => filters.updateFilterListValue(index, valueIndex, nextValue)}>
																			<SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
																			<SelectContent>
																				<SelectItem value="true">True</SelectItem>
																				<SelectItem value="false">False</SelectItem>
																			</SelectContent>
																		</Select>
																	) : columnConfig.valueType == "select" ? (
																		<SearchableSelect
																			value={value.length > 0 ? value : (columnConfig.selectOptions?.[0]?.value ?? "")}
																			onValueChange={nextValue => filters.updateFilterListValue(index, valueIndex, nextValue)}
																			options={(columnConfig.selectOptions ?? []).map(option => ({ value: option.value, label: option.label }))}
																			onSearch={columnConfig.searchOptionsAction}
																			placeholder="Select value"
																			searchPlaceholder="Type to filter values"
																			className="min-w-0 flex-1"
																		/>
																	) : columnConfig.valueType == "date" ? (
																		<DatetimeInput
																			className="flex-1"
																			mode="datetime"
																			onChange={nextValue => {
																				const parsedDate = parseFilterDateValue(nextValue);
																				filters.updateFilterListValue(index, valueIndex, parsedDate == null ? "" : formatFilterDateInput(parsedDate));
																			}}
																			placeholder="Select date and time"
																			precision="second"
																			value={listDate == null || listDate.dateText.length == 0 ? "" : `${listDate.dateText}T${listDate.timeText}`}
																		/>
																	) : (
																		<Input value={value} onChange={event => filters.updateFilterListValue(index, valueIndex, event.target.value)} placeholder={columnConfig.placeholder ?? "Enter value"} className="flex-1" />
																	)}
																	<Button type="button" variant="outline" onClick={() => filters.removeFilterListValue(index, valueIndex)} className="shrink-0" disabled={isMutating}><XIcon />Remove</Button>
																</div>
															);
														})}
													</div>
												)}
											</div>
										) : columnConfig.valueType == "select" ? (
											<SearchableSelect
												value={filterCondition.value.length > 0 ? filterCondition.value : ""}
												onValueChange={value => filters.updateFilter(index, previous => ({ ...previous, value }))}
												options={(columnConfig.selectOptions ?? []).map(option => ({ value: option.value, label: option.label }))}
												onSearch={columnConfig.searchOptionsAction}
												placeholder="Select value"
												searchPlaceholder="Type to filter values"
											/>
										) : columnConfig.valueType == "boolean" ? (
											<Select value={filterCondition.value.length > 0 ? filterCondition.value : ""} onValueChange={value => filters.updateFilter(index, previous => ({ ...previous, value }))}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
												<SelectContent>
													<SelectItem value="true">True</SelectItem>
													<SelectItem value="false">False</SelectItem>
												</SelectContent>
											</Select>
										) : columnConfig.valueType == "date" ? (
											<DatetimeInput
												mode="datetime"
												onChange={nextValue => filters.updateFilter(index, previous => {
													const parsedDate = parseFilterDateValue(nextValue);
													return {
														...previous,
														dateText: formatFilterDateOnlyInput(parsedDate),
														dateValue: parsedDate
													};
												})}
												placeholder="Select date and time"
												precision="second"
												value={filterCondition.dateValue == null ? "" : formatFilterDateInput(filterCondition.dateValue).replace(" ", "T")}
											/>
										) : (
											<Input value={filterCondition.value} onChange={event => filters.updateFilter(index, previous => ({ ...previous, value: event.target.value }))} placeholder={columnConfig.placeholder ?? "Enter value"} />
										)}
									</div>
								</div>
							</div>
						);
					})}

					<Button type="button" variant="outline" onClick={filters.addFilter} disabled={isMutating}>
						<PlusIcon />
						Add Filter
					</Button>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

type CreditApplicationImportActiveFiltersSummaryProps = {
	items: FilterSummaryItem[];
};

export function CreditApplicationImportActiveFiltersSummary({ items }: CreditApplicationImportActiveFiltersSummaryProps) {
	if(items.length == 0)
		return null;

	return (
		<div className="rounded-lg border border-dashed px-3 py-2 text-xs">
			<p className="text-muted-foreground font-medium">Active filters</p>
			<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
				{items.map((item, index) => (
					<span key={index} className="inline-flex items-center gap-1.5">
						{item.combinator != null ? (
							<span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">{item.combinator}</span>
						) : null}
						<span className="bg-background rounded border px-2 py-0.5">
							<span className="font-semibold">{item.columnLabel}</span>
							<span className="text-muted-foreground mx-1 italic">{item.operatorLabel}</span>
							<span className="font-mono text-[11px]">{item.valueLabel}</span>
						</span>
					</span>
				))}
			</div>
		</div>
	);
}

type useCreditApplicationImportCellRendererOptions = {
	relations: importActions.CreditApplicationImportRelationValues;
	relationNavigation?: CreditApplicationImportRelationNavigation;
};

export function useCreditApplicationImportCellRenderer({ relations, relationNavigation }: useCreditApplicationImportCellRendererOptions) {
	return useCallback((columnId: CreditApplicationImportTableColumnId, row: CreditApplicationImportTableRow) => {
		switch(columnId) {
			case "id":
				return row.id;
			case "filename":
				return row.filename;
			case "filesize":
				return formatFileSize(row.filesize);
			case "mimeType":
				return formatTextValue(row.mimeType);
			case "description":
				return <ReviewCommentPreview serializedState={row.description ?? undefined} className="bg-transparent shadow-none border-none rounded-none" contentClassName="line-clamp-2 min-h-5 max-h-28 p-0" placeholderClassName="p-0" />;
			case "reviewComment":
				return <ReviewCommentPreview serializedState={row.reviewComment ?? undefined} className="bg-transparent shadow-none border-none rounded-none" contentClassName="line-clamp-2 min-h-5 max-h-28 p-0" placeholderClassName="p-0" />;
			case "createdBy":
				return renderCreditApplicationImportUserRelationValue({ column: "createdBy", relation: row.createdBy == null ? null : relations[`users:${row.createdBy}`] ?? null, relationId: row.createdBy, relationNavigation });
			case "updatedBy":
				return renderCreditApplicationImportUserRelationValue({ column: "updatedBy", relation: row.updatedBy == null ? null : relations[`users:${row.updatedBy}`] ?? null, relationId: row.updatedBy, relationNavigation });
			case "deletedBy":
				return renderCreditApplicationImportUserRelationValue({ column: "deletedBy", relation: row.deletedBy == null ? null : relations[`users:${row.deletedBy}`] ?? null, relationId: row.deletedBy, relationNavigation });
			case "createdAt":
				return formatDateTime(row.createdAt);
			case "updatedAt":
				return formatDateTime(row.updatedAt);
			case "deletedAt":
				return formatDateTime(row.deletedAt);
			case "status": {
				const status = getReviewStatus(row);
				return <Badge variant={status.variant}>{status.label}</Badge>;
			}
			case "reviewedAt":
				return formatDateTime(row.reviewedAt);
			case "reviewedBy":
				return renderCreditApplicationImportUserRelationValue({ column: "reviewedBy", relation: row.reviewedBy == null ? null : relations[`users:${row.reviewedBy}`] ?? null, relationId: row.reviewedBy, relationNavigation });
			case "reviewApproved":
				return row.reviewApproved == null ? "-" : row.reviewApproved ? "True" : "False";
			default:
				return "-";
		}
	}, [relationNavigation, relations]);
}

export function useCreditApplicationImportColumnPreferences() {
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<CreditApplicationImportTableColumnId[]>(defaultCreditApplicationImportColumnOrder);
	const [hiddenColumnIds, setHiddenColumnIds] = useState<CreditApplicationImportTableColumnId[]>(defaultCreditApplicationImportHiddenColumns);
	const [draggedColumnId, setDraggedColumnId] = useState<CreditApplicationImportTableColumnId | null>(null);

	const columnById = useMemo(() => Object.fromEntries(
		creditApplicationImportTableColumns.map(column => [column.id, column])
	) as Record<CreditApplicationImportTableColumnId, CreditApplicationImportTableColumnConfig>, []);

	const orderedColumns = useMemo(() => {
		const normalizedOrder = [
			...columnOrder.filter(columnId => columnById[columnId] != null),
			...defaultCreditApplicationImportColumnOrder.filter(columnId => !columnOrder.includes(columnId))
		];
		return normalizedOrder.map(columnId => columnById[columnId]);
	}, [columnById, columnOrder]);

	const visibleColumns = useMemo(() => (
		orderedColumns.filter(column => !hiddenColumnIds.includes(column.id))
	), [hiddenColumnIds, orderedColumns]);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		const rawPreferences = window.localStorage.getItem(CREDIT_APPLICATION_IMPORT_COLUMN_PREFERENCES_KEY);
		if(rawPreferences == null)
			return;

		try {
			const parsed = JSON.parse(rawPreferences) as { order?: unknown, hidden?: unknown };
			const parsedOrder = Array.isArray(parsed.order) ? parsed.order.filter((value): value is CreditApplicationImportTableColumnId =>
				typeof value == "string" && defaultCreditApplicationImportColumnOrder.includes(value as CreditApplicationImportTableColumnId)
			) : [];
			const deduplicatedOrder = parsedOrder.filter((columnId, index) => parsedOrder.indexOf(columnId) == index);
			setColumnOrder([
				...deduplicatedOrder,
				...defaultCreditApplicationImportColumnOrder.filter(columnId => !deduplicatedOrder.includes(columnId))
			]);

			const parsedHidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((value): value is CreditApplicationImportTableColumnId =>
				typeof value == "string" && defaultCreditApplicationImportColumnOrder.includes(value as CreditApplicationImportTableColumnId)
			) : [];
			const deduplicatedHidden = parsedHidden.filter((columnId, index) => parsedHidden.indexOf(columnId) == index);
			setHiddenColumnIds(deduplicatedHidden.slice(0, Math.max(defaultCreditApplicationImportColumnOrder.length - 1, 0)));
		} catch{
			setColumnOrder(defaultCreditApplicationImportColumnOrder);
			setHiddenColumnIds(defaultCreditApplicationImportHiddenColumns);
		}
	}, []);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		window.localStorage.setItem(CREDIT_APPLICATION_IMPORT_COLUMN_PREFERENCES_KEY, JSON.stringify({
			order: columnOrder,
			hidden: hiddenColumnIds
		}));
	}, [columnOrder, hiddenColumnIds]);

	const toggleColumnVisibility = (columnId: CreditApplicationImportTableColumnId, checked: boolean) => {
		setHiddenColumnIds(previous => {
			const isHidden = previous.includes(columnId);
			if(checked)
				return isHidden ? previous.filter(value => value != columnId) : previous;
			if(isHidden)
				return previous;
			const visibleCount = creditApplicationImportTableColumns.length - previous.length;
			if(visibleCount <= 1)
				return previous;
			return [...previous, columnId];
		});
	};

	const resetColumnPreferences = () => {
		setColumnOrder(defaultCreditApplicationImportColumnOrder);
		setHiddenColumnIds(defaultCreditApplicationImportHiddenColumns);
	};

	const handleColumnDragStart = (columnId: CreditApplicationImportTableColumnId) => {
		setDraggedColumnId(columnId);
	};

	const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: CreditApplicationImportTableColumnId) => {
		event.preventDefault();
		if(draggedColumnId == null || draggedColumnId == targetColumnId)
			return;
		setColumnOrder(previous => reorderColumns(previous, draggedColumnId, targetColumnId));
	};

	const handleColumnDragEnd = () => {
		setDraggedColumnId(null);
	};

	return {
		isColumnOpen,
		setIsColumnOpen,
		orderedColumns,
		visibleColumns,
		hiddenColumnIds,
		toggleColumnVisibility,
		resetColumnPreferences,
		handleColumnDragStart,
		handleColumnDragOver,
		handleColumnDragEnd
	};
}

export function useCreditApplicationImportFilterColumnConfig() {
	const searchImportOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const imports = await importActions.searchCreditApplicationImportOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(imports.map(item => ({
			value: item.id,
			label: `${item.filename} (${item.id})`,
			renderLabel: <span>{item.filename} (<span className="font-mono">{item.id}</span>)</span>,
			keywords: `${item.id} ${item.filename} ${item.mimeType}`
		})));
	}, []);

	const searchAuditUserOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const users = await importActions.searchCreditApplicationImportAuditUserOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(users.map(user => ({
			value: user.id,
			label: `${user.name} (${user.email})`,
			keywords: `${user.name} ${user.email}`
		})));
	}, []);

	const getResolvedFilterColumnConfig = useCallback((column: FilterColumn): FilterColumnOption => (
		getResolvedCreditApplicationImportFilterColumnConfig(column, [], [], searchImportOptions, searchAuditUserOptions)
	), [searchAuditUserOptions, searchImportOptions]);

	return {
		getResolvedFilterColumnConfig
	};
}

type useCreditApplicationImportManagementQueryStateOptions = {
	debounceMs?: number;
	defaultSortField?: SortField;
	defaultSortDirection?: SortDirection;
};

export function useCreditApplicationImportManagementQueryState({
	debounceMs = 250,
	defaultSortField = "updatedAt",
	defaultSortDirection = "desc"
}: useCreditApplicationImportManagementQueryStateOptions = {}) {
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [sortState, setSortState] = useState<Array<{ field: SortField, direction: SortDirection }>>([
		{ field: defaultSortField, direction: defaultSortDirection }
	]);

	const sortTokens = useMemo(() => (
		sortState.map(sortItem => `${sortItem.direction == "desc" ? "-" : "+"}${sortItem.field}`)
	), [sortState]);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedKeyword(keyword.trim());
		}, debounceMs);
		return () => {
			window.clearTimeout(timeout);
		};
	}, [debounceMs, keyword]);

	const getSortDirection = (field: SortField): SortDirection | null => {
		const activeSort = sortState.find(sortItem => sortItem.field == field);
		return activeSort?.direction ?? null;
	};

	const toggleSortField = (field: SortField) => {
		setSortState(previous => {
			const current = previous.find(sortItem => sortItem.field == field);
			if(current == null)
				return [{ field, direction: "asc" }];
			if(current.direction == "asc")
				return [{ field, direction: "desc" }];
			return [];
		});
	};

	return {
		keyword,
		setKeyword,
		debouncedKeyword,
		sortTokens,
		getSortDirection,
		toggleSortField
	};
}

type useCreditApplicationImportRequestFiltersOptions = {
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption;
};

export type useCreditApplicationImportRequestFiltersResult = {
	isFilterOpen: boolean;
	isFilterStateReady: boolean;
	setIsFilterOpen: (open: boolean) => void;
	toggleFilterPanel: () => void;
	clearFilter: () => void;
	appliedFilters: FilterInput[];
	filterSummaryItems: FilterSummaryItem[];
	filters: FilterCondition[];
	updateFilterJoinWithPrevious: (filterIndex: number, combinator: FilterCombinator) => void;
	updateFilter: (filterIndex: number, updater: (filterCondition: FilterCondition) => FilterCondition) => void;
	handleFilterColumnChange: (filterIndex: number, column: FilterColumn) => void;
	handleFilterOperatorChange: (filterIndex: number, operator: FilterColumnOption["operators"][number]) => void;
	addFilter: () => void;
	removeFilter: (filterIndex: number) => void;
	addFilterListValue: (filterIndex: number) => void;
	updateFilterListValue: (filterIndex: number, valueIndex: number, nextValue: string) => void;
	removeFilterListValue: (filterIndex: number, valueIndex: number) => void;
};

function mapAppliedImportFilterToCondition(
	filter: FilterInput,
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption
): FilterCondition {
	const columnConfig = getResolvedFilterColumnConfig(filter.column);
	const baseCondition = createFilterCondition(filter.column);
	const values = Array.isArray(filter.value) ? filter.value.map(value => {
		if(columnConfig.valueType != "date")
			return String(value);
		const parsed = parseFilterDateValue(String(value));
		return parsed == null ? String(value) : formatFilterDateInput(parsed);
	}) : [];
	const parsedDate = !Array.isArray(filter.value) && columnConfig.valueType == "date" && typeof filter.value == "string" ? parseFilterDateValue(filter.value) : null;
	const scalarValue = Array.isArray(filter.value) || filter.value == null ? "" : (
		columnConfig.valueType == "date" && typeof filter.value == "string" && parsedDate != null ? formatFilterDateInput(parsedDate) : String(filter.value)
	);

	return {
		...baseCondition,
		operator: columnConfig.operators.includes(filter.operator) ? filter.operator : baseCondition.operator,
		joinWithPrevious: filter.joinWithPrevious ?? defaultFilterCombinator,
		value: scalarValue,
		values,
		existsValue: filter.value == false ? "false" : "true",
		dateValue: parsedDate,
		dateText: formatFilterDateOnlyInput(parsedDate)
	};
}

function createImportFilterConditionsFromAppliedFilters(
	appliedFilters: FilterInput[],
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption
): FilterCondition[] {
	if(appliedFilters.length == 0)
		return [];

	return appliedFilters.map(filter => mapAppliedImportFilterToCondition(filter, getResolvedFilterColumnConfig));
}

declare global {
	interface Window {
		__CreditApplicationImportDashboardFilters?: string;
	}
}

export function useCreditApplicationImportRequestFilters({ getResolvedFilterColumnConfig }: useCreditApplicationImportRequestFiltersOptions): useCreditApplicationImportRequestFiltersResult {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const searchParamsKey = searchParams.toString();
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters0] = useState<FilterCondition[]>([]);
	const setFilters = useCallback((nextValue: FilterCondition[] | ((previous: FilterCondition[]) => FilterCondition[])) => {
		if(typeof nextValue != "function") {
			window.__CreditApplicationImportDashboardFilters = JSON.stringify(nextValue);
			setFilters0(nextValue);
			return;
		}

		setFilters0(previous => {
			const resolved = nextValue(previous);
			window.__CreditApplicationImportDashboardFilters = JSON.stringify(resolved);
			return resolved;
		});
	}, [setFilters0]);
	const [isFilterStateHydrated, setIsFilterStateHydrated] = useState(false);

	useEffect(() => {
		const nextSearchParams = new URLSearchParams(searchParamsKey);
		const pendingNavigation = consumePendingRelationFilterNavigation("credit-application-management");
		const relationFilters = pendingNavigation?.relationFiltersJson ?? nextSearchParams.get(RELATION_FILTER_QUERY_PARAM) ?? window.__CreditApplicationImportDashboardFilters ?? null;

		if(relationFilters != null) {
			try {
				const parsed = JSON.parse(relationFilters) as unknown;
				const parsedFilters = Array.isArray(parsed) ? parsed.filter((filter): filter is FilterInput => (
					filter != null &&
					typeof filter == "object" &&
					typeof (filter as { column?: unknown }).column == "string" &&
					typeof (filter as { operator?: unknown }).operator == "string"
				)) : [];
				const restoredFilters = createImportFilterConditionsFromAppliedFilters(parsedFilters, getResolvedFilterColumnConfig);
				setFilters(restoredFilters);
				if(restoredFilters.length > 0)
					setIsFilterOpen(true);
				setIsFilterStateHydrated(true);
				return;
			} catch{
				setFilters([]);
				setIsFilterOpen(false);
				setIsFilterStateHydrated(true);
				return;
			}
		}

		setFilters([]);
		setIsFilterOpen(false);
		setIsFilterStateHydrated(true);
	}, [getResolvedFilterColumnConfig, searchParamsKey, setFilters]);

	const normalizeFilterItemValue = (columnConfig: FilterColumnOption, rawValue: string): string | boolean | null => {
		if(columnConfig.valueType == "boolean")
			return rawValue == "true" ? true : rawValue == "false" ? false : null;
		if(columnConfig.valueType == "date") {
			const dateValue = parseFilterDateValue(rawValue);
			return dateValue == null ? null : dateValue.toISOString();
		}
		const trimmed = rawValue.trim();
		return trimmed.length > 0 ? trimmed : null;
	};

	const createFilterListValue = (columnConfig: FilterColumnOption): string => {
		if(columnConfig.valueType == "boolean")
			return "true";
		if(columnConfig.valueType == "select")
			return columnConfig.selectOptions?.[0]?.value ?? "";
		return "";
	};

	const buildFilterPayload = (filterCondition: FilterCondition): FilterInput | null => {
		const columnConfig = getResolvedFilterColumnConfig(filterCondition.column);
		if(filterCondition.operator == "exists") {
			return {
				column: filterCondition.column,
				operator: filterCondition.operator,
				value: filterCondition.existsValue == "true"
			};
		}

		if(filterCondition.operator == "in" || filterCondition.operator == "not_in") {
			const values = filterCondition.values
				.map(value => normalizeFilterItemValue(columnConfig, value))
				.filter((value): value is string | boolean => value != null);
			if(values.length == 0)
				return null;
			return {
				column: filterCondition.column,
				operator: filterCondition.operator,
				value: values
			};
		}

		if(columnConfig.valueType == "date") {
			if(filterCondition.dateValue == null)
				return null;
			return {
				column: filterCondition.column,
				operator: filterCondition.operator,
				value: filterCondition.dateValue.toISOString()
			};
		}

		const scalar = normalizeFilterItemValue(columnConfig, filterCondition.value);
		if(scalar == null)
			return null;

		return {
			column: filterCondition.column,
			operator: filterCondition.operator,
			value: scalar
		};
	};

	const appliedFilters = useMemo(() => {
		const nextFilters: FilterInput[] = [];
		for(const filter of filters) {
			const payload = buildFilterPayload(filter);
			if(payload == null)
				continue;
			nextFilters.push({
				...payload,
				joinWithPrevious: nextFilters.length == 0 ? undefined : (filter.joinWithPrevious ?? defaultFilterCombinator)
			});
		}
		return nextFilters;
	}, [filters, getResolvedFilterColumnConfig]);

	useEffect(() => {
		if(!isFilterStateHydrated)
			return;

		const currentSearchKey = searchParamsKey;
		const nextSearchParams = new URLSearchParams(currentSearchKey);
		if(appliedFilters.length > 0)
			nextSearchParams.set(RELATION_FILTER_QUERY_PARAM, JSON.stringify(appliedFilters));
		else
			nextSearchParams.delete(RELATION_FILTER_QUERY_PARAM);

		const nextSearch = nextSearchParams.toString();
		if(nextSearch == currentSearchKey)
			return;

		const nextUrl = `${pathname}${nextSearch.length > 0 ? `?${nextSearch}` : ""}`;
		const handle = window.setTimeout(() => {
			router.replace(nextUrl);
		});
		return () => {
			window.clearTimeout(handle);
		};
	}, [appliedFilters, isFilterStateHydrated, pathname, router, searchParamsKey]);

	const filterSummaryItems = useMemo(() => {
		return appliedFilters.map((filter, index) => {
			const config = getResolvedFilterColumnConfig(filter.column);
			const operatorLabel = filterOperatorOptions.find(option => option.value == filter.operator)?.label ?? filter.operator;
			const combinator = index == 0 ? null : (filter.joinWithPrevious == "or" ? "OR" : "AND");
			const valueLabel = (() => {
				if(filter.operator == "exists")
					return filter.value == true ? "True" : "False";
				if(Array.isArray(filter.value)) {
					return filter.value.map(value => {
						if(config.valueType == "boolean")
							return value == true ? "True" : "False";
						if(config.valueType == "date")
							return formatFilterDateValue(typeof value == "string" ? parseFilterDateValue(value) : null);
						if(config.valueType == "select")
							return config.selectOptions?.find(option => option.value == String(value))?.label ?? String(value);
						return String(value);
					}).join(", ");
				}
				if(config.valueType == "date")
					return formatFilterDateValue(typeof filter.value == "string" ? parseFilterDateValue(filter.value) : null);
				if(config.valueType == "boolean")
					return filter.value == true ? "True" : "False";
				if(config.valueType == "select")
					return config.selectOptions?.find(option => option.value == String(filter.value))?.label ?? String(filter.value ?? "");
				return String(filter.value ?? "");
			})();

			return {
				combinator,
				columnLabel: config.label,
				operatorLabel,
				valueLabel
			};
		});
	}, [appliedFilters, getResolvedFilterColumnConfig]);

	const updateFilterJoinWithPrevious = (filterIndex: number, combinator: FilterCombinator) => {
		setFilters(previous => previous.map((filterCondition, index) => index != filterIndex ? filterCondition : ({
			...filterCondition,
			joinWithPrevious: combinator
		})));
	};

	const updateFilter = (filterIndex: number, updater: (filterCondition: FilterCondition) => FilterCondition) => {
		setFilters(previous => previous.map((filterCondition, index) => index != filterIndex ? filterCondition : updater(filterCondition)));
	};

	const handleFilterColumnChange = (filterIndex: number, column: FilterColumn) => {
		setFilters(previous => previous.map((filterCondition, index) => {
			if(index != filterIndex)
				return filterCondition;
			const nextConfig = getResolvedFilterColumnConfig(column);
			return {
				...filterCondition,
				column,
				operator: nextConfig.operators.includes(filterCondition.operator) ? filterCondition.operator : nextConfig.operators[0],
				value: "",
				values: [],
				existsValue: "true",
				dateValue: null,
				dateText: ""
			};
		}));
	};

	const handleFilterOperatorChange = (filterIndex: number, operator: FilterColumnOption["operators"][number]) => {
		setFilters(previous => previous.map((filterCondition, index) => index != filterIndex ? filterCondition : ({
			...filterCondition,
			operator,
			value: "",
			values: [],
			existsValue: "true",
			dateValue: null,
			dateText: ""
		})));
	};

	const addFilter = () => {
		setFilters(previous => ([...previous, createFilterCondition()]));
	};

	const removeFilter = (filterIndex: number) => {
		setFilters(previous => previous.filter((_, index) => index != filterIndex));
	};

	const addFilterListValue = (filterIndex: number) => {
		setFilters(previous => previous.map((filterCondition, index) => {
			if(index != filterIndex)
				return filterCondition;
			if(filterCondition.operator != "in" && filterCondition.operator != "not_in")
				return filterCondition;

			const columnConfig = getResolvedFilterColumnConfig(filterCondition.column);
			return {
				...filterCondition,
				values: [...filterCondition.values, createFilterListValue(columnConfig)]
			};
		}));
	};

	const updateFilterListValue = (filterIndex: number, valueIndex: number, nextValue: string) => {
		updateFilter(filterIndex, filterCondition => ({
			...filterCondition,
			values: filterCondition.values.map((value, index) => index == valueIndex ? nextValue : value)
		}));
	};

	const removeFilterListValue = (filterIndex: number, valueIndex: number) => {
		updateFilter(filterIndex, filterCondition => ({
			...filterCondition,
			values: filterCondition.values.filter((_, index) => index != valueIndex)
		}));
	};

	const clearFilter = () => {
		setFilters([]);
	};

	const toggleFilterPanel = () => {
		setIsFilterOpen(previous => !previous);
	};

	return {
		isFilterOpen,
		isFilterStateReady: isFilterStateHydrated,
		setIsFilterOpen,
		toggleFilterPanel,
		clearFilter,
		appliedFilters,
		filterSummaryItems,
		filters,
		updateFilterJoinWithPrevious,
		updateFilter,
		handleFilterColumnChange,
		handleFilterOperatorChange,
		addFilter,
		removeFilter,
		addFilterListValue,
		updateFilterListValue,
		removeFilterListValue
	};
}

type CreditApplicationImportQueryActionInput = Parameters<typeof import("./import.actions").queryCreditApplicationImportViewerAction>[0];

type useCreditApplicationImportRequestsQueryOptions = {
	queryScope: string;
	queryAction: (input: CreditApplicationImportQueryActionInput) => Promise<queryCreditApplicationImportsOutput>;
	debouncedKeyword: string;
	sortTokens: string[];
	appliedFilters: FilterInput[];
	isFilterStateReady: boolean;
	includeSoftDeleted: boolean;
};

export function useCreditApplicationImportRequestsQuery({
	queryScope,
	queryAction,
	debouncedKeyword,
	sortTokens,
	appliedFilters,
	isFilterStateReady,
	includeSoftDeleted
}: useCreditApplicationImportRequestsQueryOptions) {
	const [pageIndex, setPageIndex] = useState(1);

	useEffect(() => {
		setPageIndex(1);
	}, [appliedFilters, debouncedKeyword, includeSoftDeleted, sortTokens]);

	const queryResult = useQuery({
		queryKey: ["credit-application-management", "imports", queryScope, debouncedKeyword, sortTokens, appliedFilters, pageIndex, includeSoftDeleted],
		enabled: isFilterStateReady,
		queryFn: () => queryAction({
			keyword: debouncedKeyword,
			sort: sortTokens,
			filters: appliedFilters,
			filterCombinator: "and",
			page: pageIndex,
			limit: PAGE_SIZE,
			includeSoftDeleted
		}),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	useEffect(() => {
		if(queryResult.isFetching || queryResult.data == null)
			return;
		if(queryResult.data.page != pageIndex)
			setPageIndex(queryResult.data.page);
	}, [pageIndex, queryResult.data, queryResult.isFetching]);

	const isLoading = !isFilterStateReady || queryResult.isPending;
	const queryErrorMessage = queryResult.error instanceof Error ? queryResult.error.message : queryResult.error != null ? "Failed to load import requests." : null;

	return {
		pageIndex,
		setPageIndex,
		queryResult: queryResult.data ?? emptyQueryData,
		isLoading,
		queryErrorMessage
	};
}

export const defaultCreditApplicationImportFormState: CreditApplicationImportFormState = {
	file: null,
	filename: "",
	filesize: 0,
	fileUrl: null,
	description: createEmptyReviewComment()
};

export const emptyQueryData: importActions.QueryCreditApplicationImportsOutput = {
	docs: [],
	relations: {},
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};
