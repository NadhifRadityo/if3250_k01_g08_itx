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
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
	XIcon,
	PlusIcon,
	CheckIcon,
	UploadIcon,
	ArrowUpIcon,
	CalendarIcon,
	DownloadIcon,
	ArrowDownIcon,
	ArrowUpDownIcon,
	CircleAlertIcon,
	GripVerticalIcon,
	FileSpreadsheetIcon
} from "lucide-react";

import cn from "@/utils/cn";
import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Calendar } from "@/components/radix/Calendar";
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
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/radix/InputGroup";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/radix/Popover";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import { Textarea } from "@/components/radix/Textarea";

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
export type CreditApplicationImportRelationColumn = importActions.CreditApplicationImportRelationColumn;
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
	"descriptionText" |
	"reviewCommentText" |
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
	description: string;
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
	{ id: "descriptionText", label: "Description", cellClassName: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ id: "reviewCommentText", label: "Review Comment", cellClassName: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
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
	{ value: "createdBy", label: "Created By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "updatedBy", label: "Updated By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "deletedBy", label: "Deleted By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "createdAt", label: "Created At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "updatedAt", label: "Updated At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "deletedAt", label: "Deleted At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "reviewedAt", label: "Reviewed At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "reviewedBy", label: "Reviewed By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "reviewApproved", label: "Review Approved", valueType: "boolean", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: booleanFilterOptions },
	{ value: "status", label: "Status", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: reviewStatusOptions }
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
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

export function parseFilterDateValue(value: string): Date | null {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed) ? trimmed.replace(" ", "T") : trimmed;
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
	return `${formatFilterDateOnlyInput(date)} ${getFilterTimeInput(date)}`;
}

export function applyTimeToDate(date: Date, timeValue: string): Date {
	const [rawHours, rawMinutes] = timeValue.split(":");
	const hours = Number(rawHours);
	const minutes = Number(rawMinutes);
	const nextDate = new Date(date);
	if(Number.isInteger(hours) && Number.isInteger(minutes))
		nextDate.setHours(hours, minutes, 0, 0);
	return nextDate;
}

export function getFilterTimeInput(date: Date | null): string {
	if(date == null)
		return "00:00";
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
}

export function splitFilterDateValue(value: string): { dateText: string, timeText: string } {
	const parsed = parseFilterDateValue(value);
	if(parsed == null)
		return { dateText: "", timeText: "00:00" };
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

const CREDIT_APPLICATION_IMPORT_COLUMN_PREFERENCES_KEY = "credit-application-management-import-columns-v1";

function formatTextValue(value: string | null | undefined): string {
	const normalized = (value ?? "").trim();
	return normalized.length > 0 ? normalized : "-";
}

export function formatDateTime(value: string | null): string {
	if(value == null)
		return "-";
	const date = new Date(value);
	if(Number.isNaN(date.getTime()))
		return value;
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
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

function getCreditApplicationImportDrawerValueClassName(columnId: string): string {
	if(columnId == "id")
		return "text-xs font-mono";
	if(columnId == "filename")
		return "text-sm font-medium";
	if(columnId == "descriptionText" || columnId == "reviewCommentText")
		return "text-sm whitespace-pre-wrap";
	return "text-sm";
}

export const defaultCreditApplicationImportColumnOrder: CreditApplicationImportTableColumnId[] = creditApplicationImportTableColumns.map(column => column.id);
export const defaultCreditApplicationImportVisibleColumns: CreditApplicationImportTableColumnId[] = ["filename", "filesize", "status", "updatedAt", "reviewCommentText"];
export const defaultCreditApplicationImportHiddenColumns: CreditApplicationImportTableColumnId[] = defaultCreditApplicationImportColumnOrder.filter(columnId => !defaultCreditApplicationImportVisibleColumns.includes(columnId));

export const creditApplicationImportRelationColumnSet = new Set<CreditApplicationImportRelationColumn>([
	"reviewedBy",
	"createdBy",
	"updatedBy",
	"deletedBy"
]);

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

function getCreditApplicationImportRelationSummaryLabel(column: CreditApplicationImportRelationColumn): string {
	if(column == "reviewedBy")
		return "Reviewed By";
	if(column == "createdBy")
		return "Created By";
	if(column == "updatedBy")
		return "Updated By";
	return "Deleted By";
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
	value,
	relationId,
	relationNavigation,
	stagedUserIdByUserId
}: {
	column: CreditApplicationImportRelationColumn;
	value: string;
	relationId: string | null;
	relationNavigation?: CreditApplicationImportRelationNavigation;
	stagedUserIdByUserId?: Record<string, string>;
}): ReactNode {
	const normalizedValue = value.trim();
	if(relationId == null || normalizedValue.length == 0 || normalizedValue == "-")
		return value;

	const summaryLabel = getCreditApplicationImportRelationSummaryLabel(column);
	const hrefBase = relationNavigation?.getHrefBase("user-management");
	if(hrefBase != null && relationNavigation != null) {
		const stagedUserId = stagedUserIdByUserId?.[relationId] ?? null;
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
			className="h-auto p-0 text-primary"
		>
			{value}
		</Button>
	);
}

function CreditApplicationImportFileBox({
	fileName,
	fileSize,
	href
}: {
	fileName: string;
	fileSize: number;
	href: string | null;
}) {
	if(href == null || href.length == 0) {
		return (
			<div className="rounded-lg border p-3">
				<div className="flex items-center gap-2 text-sm">
					<FileSpreadsheetIcon className="size-4" />
					<span className="font-medium">{fileName}</span>
				</div>
				<p className="text-muted-foreground mt-1 text-xs">{formatFileSize(fileSize)}</p>
			</div>
		);
	}

	return (
		<Button asChild variant="outline" className="h-auto w-full justify-start p-3">
			<a href={href} download={fileName} target="_blank" rel="noreferrer">
				<div className="flex w-full items-center gap-3">
					<FileSpreadsheetIcon className="size-4 shrink-0" />
					<div className="min-w-0 flex-1 text-left">
						<p className="truncate text-sm font-medium">{fileName}</p>
						<p className="text-muted-foreground text-xs">{formatFileSize(fileSize)}</p>
					</div>
					<DownloadIcon className="size-4 shrink-0" />
				</div>
			</a>
		</Button>
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
			case "descriptionText":
				return renderDetailColumnValue(columnId, formatTextValue(data.row.descriptionText));
			case "reviewCommentText":
				return renderDetailColumnValue(columnId, formatTextValue(data.row.reviewCommentText));
			case "createdBy":
				return renderDetailColumnValue(columnId, renderCreditApplicationImportUserRelationValue({ column: "createdBy", value: data.relationValues.createdBy ?? "-", relationId: data.row.createdById, relationNavigation, stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId }));
			case "updatedBy":
				return renderDetailColumnValue(columnId, renderCreditApplicationImportUserRelationValue({ column: "updatedBy", value: data.relationValues.updatedBy ?? "-", relationId: data.row.updatedById, relationNavigation, stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId }));
			case "deletedBy":
				return renderDetailColumnValue(columnId, renderCreditApplicationImportUserRelationValue({ column: "deletedBy", value: data.relationValues.deletedBy ?? "-", relationId: data.row.deletedById, relationNavigation, stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId }));
			case "createdAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.createdAt));
			case "updatedAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.updatedAt));
			case "deletedAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.deletedAt));
			case "status":
				return <Badge variant={getStatusBadgeVariant(data.row.status)}>{data.row.status}</Badge>;
			case "reviewedAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.reviewedAt));
			case "reviewedBy":
				return renderDetailColumnValue(columnId, renderCreditApplicationImportUserRelationValue({ column: "reviewedBy", value: data.relationValues.reviewedBy ?? "-", relationId: data.row.reviewedById, relationNavigation, stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId }));
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
					<DrawerTitle>CreditApplication Import Request Details</DrawerTitle>
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
							<CreditApplicationImportFileBox fileName={details.row.filename} fileSize={details.row.filesize} href={details.row.fileUrl} />
							{creditApplicationImportTableColumns.map(column => (
								<div key={`${details.row.id}-details-${column.id}`} className="space-y-1 rounded-lg border p-3">
									<p className="text-muted-foreground text-xs font-medium">{column.label}</p>
									{renderDetailValue(column.id, details)}
								</div>
							))}
						</>
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
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

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>{isEditMode ? "Edit Import Description" : "Add CreditApplication Import"}</DrawerTitle>
					<DrawerDescription>
						{isEditMode ? "Description can be edited only while this import has not been reviewed." : "Upload one Excel file that follows the credit application import template."}
					</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					<div className="space-y-2">
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
					</div>

					{resolvedFileName.trim().length > 0 ? (
						<CreditApplicationImportFileBox
							fileName={resolvedFileName}
							fileSize={resolvedFileSize}
							href={resolvedFileHref}
						/>
					) : (
						<p className="text-muted-foreground text-xs">No file selected.</p>
					)}

					<div className="space-y-2">
						<label className="text-sm font-medium">Description</label>
						<Textarea
							value={formState.description}
							onChange={event => onFormStateChange(previous => ({ ...previous, description: event.target.value }))}
							rows={8}
							placeholder="Optional import description"
							disabled={isMutating}
						/>
					</div>

					{formError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{formError.title}</AlertTitle>
							<AlertDescription>{formError.message}</AlertDescription>
						</Alert>
					) : null}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
					<Button type="button" onClick={onSubmit} disabled={isMutating || (!isEditMode && formState.file == null)}>
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
	reviewReason: string;
	onReviewReasonChange: (value: string) => void;
	onApprove: () => void;
	onReject: () => void;
	isMutating: boolean;
};

export function CreditApplicationImportRequestReviewDrawer({
	open,
	onOpenChange,
	reviewDrawerState,
	reviewError,
	reviewReason,
	onReviewReasonChange,
	onApprove,
	onReject,
	isMutating
}: CreditApplicationImportRequestReviewDrawerProps) {
	const row = reviewDrawerState?.row ?? null;

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
				<DrawerHeader>
					<DrawerTitle>Review Import Request</DrawerTitle>
					<DrawerDescription>Approving will parse the uploaded file again and create credit applications from its rows.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					{row == null ? (
						<p className="text-muted-foreground text-sm">No import request selected.</p>
					) : (
						<>
							<CreditApplicationImportFileBox fileName={row.filename} fileSize={row.filesize} href={row.fileUrl} />
							<div className="bg-muted/30 rounded-lg border p-3 text-sm">
								<p>
									<span className="font-medium">Current Status:</span> <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
								</p>
								<p className="text-muted-foreground mt-1">Description can no longer be modified after this review action.</p>
							</div>
							<div className="space-y-1 rounded-md border p-3">
								<p className="text-muted-foreground text-xs font-medium">Description</p>
								<p className="text-sm whitespace-pre-wrap">{formatTextValue(row.descriptionText)}</p>
							</div>
						</>
					)}

					<div className="space-y-2">
						<label className="text-sm font-medium">Review Reason (optional)</label>
						<Textarea value={reviewReason} onChange={event => onReviewReasonChange(event.target.value)} placeholder="Provide a review reason" />
					</div>

					{reviewError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{reviewError.title}</AlertTitle>
							<AlertDescription>{reviewError.message}</AlertDescription>
						</Alert>
					) : null}
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

	const emptyRowColSpan = visibleColumnCount + (includeActions ? 1 : 0);

	return (
		<div className="rounded-xl border">
			<Table>
				<TableHeader>
					<TableRow>
						{visibleColumns.map(column => (
							<TableHead key={column.id} className={column.headClassName}>
								{column.sortField != null ? (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="-ml-2 h-8 gap-1 px-2"
										onClick={() => onToggleSortField(column.sortField!)}
										disabled={isLoading || isMutating}
									>
										{column.label}
										{renderSortIcon(column.sortField)}
									</Button>
								) : column.label}
							</TableHead>
						))}
						{includeActions ? (
							<TableHead className="w-[1%] whitespace-nowrap">Actions</TableHead>
						) : null}
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						<TableRow>
							<TableCell colSpan={emptyRowColSpan} className="text-muted-foreground text-center text-sm">Loading import requests...</TableCell>
						</TableRow>
					) : null}
					{!isLoading && queryResult.docs.length == 0 ? (
						<TableRow>
							<TableCell colSpan={emptyRowColSpan} className="text-muted-foreground text-center text-sm">No import requests found.</TableCell>
						</TableRow>
					) : null}
					{queryResult.docs.map(row => (
						<TableRow key={row.id}>
							{visibleColumns.map(column => {
								const renderedCell = renderCreditApplicationImportCell(column.id, row);
								if(detailTriggerColumnId == column.id) {
									return (
										<TableCell key={`${row.id}-${column.id}`} className={column.cellClassName}>
											<Button
												type="button"
												variant="link"
												onClick={() => onOpenDetails(row)}
												className="h-auto p-0 text-left"
												disabled={isMutating}
											>
												{renderedCell}
											</Button>
										</TableCell>
									);
								}

								return (
									<TableCell key={`${row.id}-${column.id}`} className={column.cellClassName}>
										{renderedCell}
									</TableCell>
								);
							})}
							{includeActions ? <TableCell className="space-x-2 whitespace-nowrap">{renderActions(row)}</TableCell> : null}
						</TableRow>
					))}
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
																		<div className="grid flex-1 grid-cols-2 gap-2">
																			<Popover>
																				<InputGroup>
																					<InputGroupInput
																						value={listDate?.dateText ?? ""}
																						onChange={event => filters.updateFilterListValue(index, valueIndex, buildFilterDateValue(event.target.value, listDate?.timeText ?? "00:00"))}
																						placeholder="YYYY-MM-DD"
																					/>
																					<InputGroupAddon align="inline-end">
																						<PopoverTrigger asChild>
																							<InputGroupButton type="button" variant="ghost" size="icon-xs" className="shrink-0"><CalendarIcon className="size-4" /></InputGroupButton>
																						</PopoverTrigger>
																					</InputGroupAddon>
																				</InputGroup>
																				<PopoverContent className="w-auto">
																					<Calendar
																						mode="single"
																						captionLayout="dropdown"
																						selected={parseFilterDateOnlyValue(listDate?.dateText ?? "") ?? undefined}
																						onSelect={date => filters.updateFilterListValue(index, valueIndex, date == null ? "" : buildFilterDateValue(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`, listDate?.timeText ?? "00:00"))}
																					/>
																				</PopoverContent>
																			</Popover>
																			<Input type="time" value={listDate?.timeText ?? "00:00"} onChange={event => filters.updateFilterListValue(index, valueIndex, buildFilterDateValue(listDate?.dateText ?? "", event.target.value))} />
																		</div>
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
											<div className="grid grid-cols-2 gap-2">
												<Popover>
													<InputGroup>
														<InputGroupInput
															value={filterCondition.dateText}
															onChange={event => filters.updateFilter(index, previous => {
																const nextDateText = event.target.value;
																const parsedDate = parseFilterDateOnlyValue(nextDateText);
																const preservedTime = getFilterTimeInput(previous.dateValue);
																return {
																	...previous,
																	dateText: nextDateText,
																	dateValue: parsedDate == null ? null : applyTimeToDate(parsedDate, preservedTime)
																};
															})}
															placeholder="YYYY-MM-DD"
														/>
														<InputGroupAddon align="inline-end">
															<PopoverTrigger asChild>
																<InputGroupButton type="button" variant="ghost" size="icon-xs" className="shrink-0">
																	<CalendarIcon className="size-4" />
																</InputGroupButton>
															</PopoverTrigger>
														</InputGroupAddon>
													</InputGroup>
													<PopoverContent className="w-auto">
														<Calendar
															mode="single"
															captionLayout="dropdown"
															selected={filterCondition.dateValue ?? parseFilterDateOnlyValue(filterCondition.dateText) ?? undefined}
															onSelect={date => filters.updateFilter(index, previous => {
																if(date == null)
																	return { ...previous, dateValue: null, dateText: "" };
																const nextDate = applyTimeToDate(date, getFilterTimeInput(previous.dateValue));
																return { ...previous, dateValue: nextDate, dateText: formatFilterDateOnlyInput(nextDate) };
															})}
														/>
													</PopoverContent>
												</Popover>
												<Input
													type="time"
													value={getFilterTimeInput(filterCondition.dateValue)}
													onChange={event => filters.updateFilter(index, previous => {
														if(previous.dateValue == null)
															return previous;
														return {
															...previous,
															dateValue: applyTimeToDate(previous.dateValue, event.target.value)
														};
													})}
												/>
											</div>
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
	relationValuesByRowId: Record<string, importActions.CreditApplicationImportRelationValues>;
	isRelationLoading: boolean;
	relationNavigation?: CreditApplicationImportRelationNavigation;
};

export function useCreditApplicationImportCellRenderer({ relationValuesByRowId, isRelationLoading, relationNavigation }: useCreditApplicationImportCellRendererOptions) {
	return useCallback((columnId: CreditApplicationImportTableColumnId, row: CreditApplicationImportTableRow) => {
		const resolvedValues = relationValuesByRowId[row.id] ?? {};
		switch(columnId) {
			case "id":
				return row.id;
			case "filename":
				return row.filename;
			case "filesize":
				return formatFileSize(row.filesize);
			case "mimeType":
				return formatTextValue(row.mimeType);
			case "descriptionText":
				return formatTextValue(row.descriptionText);
			case "reviewCommentText":
				return formatTextValue(row.reviewCommentText);
			case "createdBy":
				if(isRelationLoading && resolvedValues.createdBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderCreditApplicationImportUserRelationValue({ column: "createdBy", value: resolvedValues.createdBy ?? "-", relationId: row.createdById, relationNavigation, stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId });
			case "updatedBy":
				if(isRelationLoading && resolvedValues.updatedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderCreditApplicationImportUserRelationValue({ column: "updatedBy", value: resolvedValues.updatedBy ?? "-", relationId: row.updatedById, relationNavigation, stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId });
			case "deletedBy":
				if(isRelationLoading && resolvedValues.deletedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderCreditApplicationImportUserRelationValue({ column: "deletedBy", value: resolvedValues.deletedBy ?? "-", relationId: row.deletedById, relationNavigation, stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId });
			case "createdAt":
				return formatDateTime(row.createdAt);
			case "updatedAt":
				return formatDateTime(row.updatedAt);
			case "deletedAt":
				return formatDateTime(row.deletedAt);
			case "status":
				return <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>;
			case "reviewedAt":
				return formatDateTime(row.reviewedAt);
			case "reviewedBy":
				if(isRelationLoading && resolvedValues.reviewedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderCreditApplicationImportUserRelationValue({ column: "reviewedBy", value: resolvedValues.reviewedBy ?? "-", relationId: row.reviewedById, relationNavigation, stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId });
			case "reviewApproved":
				return row.reviewApproved == null ? "-" : row.reviewApproved ? "True" : "False";
			default:
				return "-";
		}
	}, [isRelationLoading, relationNavigation, relationValuesByRowId]);
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

type useCreditApplicationImportRelationsOptions = {
	docs: CreditApplicationImportTableRow[];
	visibleColumns: CreditApplicationImportTableColumnConfig[];
};

export function useCreditApplicationImportRelations({ docs, visibleColumns }: useCreditApplicationImportRelationsOptions) {
	const visibleRelationColumns = useMemo(() => (
		visibleColumns
			.map(column => column.id)
			.filter((columnId): columnId is CreditApplicationImportRelationColumn => creditApplicationImportRelationColumnSet.has(columnId as CreditApplicationImportRelationColumn))
	), [visibleColumns]);

	const relationRows = useMemo(() => docs.map(row => ({
		id: row.id,
		reviewedById: row.reviewedById,
		createdById: row.createdById,
		updatedById: row.updatedById,
		deletedById: row.deletedById
	})), [docs]);

	const relationsQuery = useQuery({
		queryKey: ["credit-application-management", "imports", "relations", { rows: relationRows, columns: visibleRelationColumns }],
		enabled: relationRows.length > 0 && visibleRelationColumns.length > 0,
		queryFn: () => importActions.resolveCreditApplicationImportRelationColumnsAction({
			rows: relationRows,
			columns: visibleRelationColumns
		}),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const relationValuesByRowId = useMemo(() => Object.fromEntries(
		(relationsQuery.data ?? []).map(item => [item.id, item.values])
	), [relationsQuery.data]);
	const isRelationLoading = relationsQuery.isPending || relationsQuery.isFetching;

	return {
		relationValuesByRowId,
		isRelationLoading
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
};

export function useCreditApplicationImportRequestsQuery({
	queryScope,
	queryAction,
	debouncedKeyword,
	sortTokens,
	appliedFilters,
	isFilterStateReady
}: useCreditApplicationImportRequestsQueryOptions) {
	const [pageIndex, setPageIndex] = useState(1);

	useEffect(() => {
		setPageIndex(1);
	}, [appliedFilters, debouncedKeyword, sortTokens]);

	const queryResult = useQuery({
		queryKey: ["credit-application-management", "imports", queryScope, debouncedKeyword, sortTokens, appliedFilters, pageIndex],
		enabled: isFilterStateReady,
		queryFn: () => queryAction({
			keyword: debouncedKeyword,
			sort: sortTokens,
			filters: appliedFilters,
			filterCombinator: "and",
			page: pageIndex,
			limit: PAGE_SIZE
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
	description: ""
};

export const emptyQueryData: importActions.QueryCreditApplicationImportsOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};
