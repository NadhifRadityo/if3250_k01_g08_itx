"use client";

import { useMemo, useState, useEffect, useCallback, type DragEvent, type ReactNode, type MouseEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { XIcon, PlusIcon, ArrowUpIcon, HistoryIcon, ArrowDownIcon, ArrowUpDownIcon, CircleAlertIcon, GripVerticalIcon } from "lucide-react";

import cn from "@/utils/cn";
import type { ReviewCommentRichText } from "@/utils/reviewCommentRichText";
import { DatetimeInput } from "@/components/DatetimeInput";
import { Link } from "@/components/Link";
import { ReviewCommentInput } from "@/components/ReviewCommentInput";
import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Checkbox } from "@/components/radix/Checkbox";
import { Collapsible, CollapsibleContent } from "@/components/radix/Collapsible";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import { Textarea } from "@/components/radix/Textarea";

import { consumePendingRelationFilterNavigation } from "../relation-navigation.components";
import * as surveyActions from "./layout.actions";

export const PAGE_SIZE = 20;

export type SortDirection = "asc" | "desc";
export type SortField = surveyActions.SurveyManagementSortField;
export type FilterColumn = surveyActions.SurveyManagementFilterColumn;
export type FilterOperator = surveyActions.SurveyManagementFilterOperator;
export type FilterCombinator = surveyActions.SurveyManagementFilterCombinator;
export type FilterInput = surveyActions.SurveyManagementFilterInput;
export type QuerySurveysOutput = Awaited<ReturnType<typeof surveyActions.querySurveysAction>>;
export type SurveyTableRow = QuerySurveysOutput["docs"][number];
export type SurveyManagementTabMode = "viewer" | Parameters<typeof surveyActions.querySurveysAction>[0]["mode"];
export type SurveyRelationColumn = surveyActions.SurveyRelationColumn;
export type SurveyRequestReviewDiff = Awaited<ReturnType<typeof surveyActions.getSurveyRequestReviewDiffAction>>;
export type SurveyRequestHistory = Awaited<ReturnType<typeof surveyActions.getSurveyRequestHistoryAction>>;
export type FilterValueType = "text" | "date" | "select" | "boolean";
export type FilterSelectSearchAction = (keyword: string, selectedValues: string[]) => Promise<SearchableSelectOption[]>;
export type ActionError = {
	title: string;
	message: string;
};

export const resolveActionError = (error: unknown, fallbackMessage: string): ActionError => {
	if(error instanceof Error) {
		return {
			title: error.name.length > 0 ? error.name : "Error",
			message: error.message.length > 0 ? error.message : fallbackMessage
		};
	}
	return {
		title: "Error",
		message: fallbackMessage
	};
};

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
	listDateValue: Date | null;
	dateText: string;
	listDateText: string;
};

export type SurveyTableColumnId = "title" |
	"id" |
	"descriptionText" |
	"contentText" |
	"createdBy" |
	"updatedBy" |
	"deletedBy" |
	"createdAt" |
	"updatedAt" |
	"deletedAt" |
	"requestType" |
	"status" |
	"reviewedAt" |
	"reviewedBy" |
	"reviewApproved" |
	"reviewCommentText";

export type SurveyTableColumnConfig = {
	id: SurveyTableColumnId;
	label: string;
	sortField?: SortField;
	headClassName?: string;
	cellClassName?: string;
};

export type FormState = {
	surveyId?: string;
	title: string;
	description: string;
	content: string;
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

export const emptyQueryResult: QuerySurveysOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};

export const defaultFormState: FormState = {
	title: "",
	description: "",
	content: "{\n  \"slides\": []\n}"
};

export const SURVEY_COLUMN_PREFERENCES_KEY = "satisfaction-survey-management-columns-v1";
export const RELATION_FILTER_QUERY_PARAM = "relationFilters";

export const surveyTableColumns: SurveyTableColumnConfig[] = [
	{ id: "id", label: "ID", sortField: "id", cellClassName: "font-mono text-xs" },
	{ id: "title", label: "Title", sortField: "title", cellClassName: "font-medium" },
	{ id: "descriptionText", label: "Description", sortField: "descriptionText", cellClassName: "max-w-[360px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ id: "contentText", label: "Content", sortField: "contentText", cellClassName: "max-w-[360px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs" },
	{ id: "createdBy", label: "Created By" },
	{ id: "updatedBy", label: "Updated By" },
	{ id: "deletedBy", label: "Deleted By" },
	{ id: "createdAt", label: "Created At", sortField: "createdAt" },
	{ id: "updatedAt", label: "Updated At", sortField: "updatedAt" },
	{ id: "deletedAt", label: "Deleted At", sortField: "deletedAt" },
	{ id: "requestType", label: "Request", sortField: "requestType" },
	{ id: "status", label: "Status", sortField: "status" },
	{ id: "reviewedAt", label: "Reviewed At", sortField: "reviewedAt" },
	{ id: "reviewedBy", label: "Reviewed By", sortField: "reviewedBy" },
	{ id: "reviewApproved", label: "Review Approved", sortField: "reviewApproved" },
	{ id: "reviewCommentText", label: "Review Comment", sortField: "reviewCommentText", cellClassName: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" }
];

function getSurveyDrawerValueClassName(columnId: string): string {
	if(columnId == "id")
		return "text-xs font-mono";
	if(columnId == "title")
		return "text-sm font-medium";
	if(columnId == "contentText")
		return "text-xs font-mono";
	return "text-sm";
}

export const defaultSurveyColumnOrder: SurveyTableColumnId[] = surveyTableColumns.map(column => column.id);
export const defaultSurveyVisibleColumns: SurveyTableColumnId[] = ["title", "descriptionText", "requestType", "status", "updatedAt", "reviewCommentText"];
export const defaultSurveyHiddenColumns: SurveyTableColumnId[] = defaultSurveyColumnOrder.filter(columnId => !defaultSurveyVisibleColumns.includes(columnId));

export const surveyRelationColumnSet = new Set<SurveyRelationColumn>([
	"reviewedBy",
	"createdBy",
	"updatedBy",
	"deletedBy"
]);

const surveyNonEligibleColumnSet = new Set<string>([
	"actions",
	"status",
	"requestType",
	"reviewedBy",
	"createdBy",
	"updatedBy",
	"deletedBy"
]);

export function getEligibleDetailTriggerSurveyColumnId(visibleColumns: SurveyTableColumnConfig[]): SurveyTableColumnId | null {
	const triggerColumn = visibleColumns.find(column => !surveyNonEligibleColumnSet.has(column.id));
	return triggerColumn?.id ?? null;
}

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

export const surveyFilterColumns: FilterColumnOption[] = [
	{ value: "id", label: "ID", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "title", label: "Title", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter satisfaction survey title" },
	{ value: "descriptionText", label: "Description", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter description text" },
	{ value: "contentText", label: "Content", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter content text" },
	{ value: "createdAt", label: "Created At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "createdBy", label: "Created By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "updatedAt", label: "Updated At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "updatedBy", label: "Updated By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "deletedAt", label: "Deleted At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "deletedBy", label: "Deleted By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "reviewedAt", label: "Reviewed At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "reviewedBy", label: "Reviewed By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "status", label: "Status", valueType: "select", operators: ["equals", "not_equals", "in", "not_in"], selectOptions: reviewStatusOptions },
	{ value: "reviewApproved", label: "Review Approved", valueType: "boolean", operators: ["equals", "not_equals", "exists"] }
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

export function getFilterColumnConfig(column: FilterColumn): FilterColumnOption {
	return surveyFilterColumns.find(option => option.value == column) ?? surveyFilterColumns[0];
}

export function getResolvedSurveyFilterColumnConfig(
	column: FilterColumn,
	idSelectOptions: Array<{ value: string, label: string }>,
	reviewedBySelectOptions: Array<{ value: string, label: string }>,
	searchSurveyOptions?: FilterSelectSearchAction,
	searchAuditUserOptions?: FilterSelectSearchAction
): FilterColumnOption {
	const config = getFilterColumnConfig(column);
	switch(column) {
		case "id":
			return {
				...config,
				selectOptions: idSelectOptions,
				searchOptionsAction: searchSurveyOptions
			};
		case "createdBy":
		case "updatedBy":
		case "deletedBy":
		case "reviewedBy":
			return {
				...config,
				selectOptions: reviewedBySelectOptions,
				searchOptionsAction: searchAuditUserOptions
			};
		default:
			return config;
	}
}

export function createFilterCondition(column: FilterColumn = surveyFilterColumns[0].value): FilterCondition {
	const columnConfig = getFilterColumnConfig(column);
	return {
		column,
		operator: columnConfig.operators[0],
		joinWithPrevious: defaultFilterCombinator,
		value: "",
		values: [],
		existsValue: "true",
		dateValue: null,
		listDateValue: null,
		dateText: "",
		listDateText: ""
	};
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

export function getReviewStatus(row: SurveyTableRow): { label: string, variant: "default" | "secondary" | "destructive" } {
	if(row.reviewedAt == null)
		return { label: "Pending", variant: "secondary" };
	if(row.reviewApproved == true)
		return { label: "Approved", variant: "default" };
	return { label: "Rejected", variant: "destructive" };
}

function renderRequestTypeTrigger({
	row,
	onOpenRequestChanges,
	className
}: {
	row: SurveyTableRow;
	onOpenRequestChanges?: (row: SurveyTableRow) => void;
	className?: string;
}): ReactNode {
	if(onOpenRequestChanges == null)
		return row.requestType;

	return (
		<Button
			type="button"
			variant="link"
			onClick={() => onOpenRequestChanges(row)}
			className={cn("text-primary h-auto p-0 select-auto", className)}
		>
			{row.requestType}
		</Button>
	);
}

export function reorderColumns(order: SurveyTableColumnId[], sourceId: SurveyTableColumnId, targetId: SurveyTableColumnId): SurveyTableColumnId[] {
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

type SurveyActiveFiltersSummaryProps = {
	items: FilterSummaryItem[];
};

export function SurveyActiveFiltersSummary({ items }: SurveyActiveFiltersSummaryProps) {
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

type SurveyColumnConfigCardProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	orderedColumns: SurveyTableColumnConfig[];
	hiddenColumnIds: SurveyTableColumnId[];
	visibleColumnCount: number;
	onToggleColumnVisibility: (columnId: SurveyTableColumnId, checked: boolean) => void;
	onReset: () => void;
	onColumnDragStart: (columnId: SurveyTableColumnId) => void;
	onColumnDragOver: (event: DragEvent<HTMLDivElement>, targetColumnId: SurveyTableColumnId) => void;
	onColumnDragEnd: () => void;
};

export function SurveyColumnConfigCard({
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
}: SurveyColumnConfigCardProps) {
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
							<p className="text-muted-foreground text-sm">Visible {visibleColumnCount} of {surveyTableColumns.length}</p>
							<Button type="button" variant="outline" size="sm" onClick={onReset}>Reset</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{orderedColumns.map(column => {
							const isVisible = !hiddenColumnIds.includes(column.id);
							const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= surveyTableColumns.length - 1;
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

type SurveyRequestDeleteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isMutating: boolean;
};

export function SurveyRequestDeleteDialog({
	open,
	onOpenChange,
	onConfirm,
	isMutating
}: SurveyRequestDeleteDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete</AlertDialogTitle>
					<AlertDialogDescription>
						Delete does not hard-delete data. It creates a pending delete request by setting deletedAt, and requires approver review.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isMutating}>Delete</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

type SurveyRequestCancelDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isMutating: boolean;
};

export function SurveyRequestCancelDialog({
	open,
	onOpenChange,
	onConfirm,
	isMutating
}: SurveyRequestCancelDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Cancel</AlertDialogTitle>
					<AlertDialogDescription>
						This will cancel the pending request and keep the last approved version unchanged.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Cancel</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

type SurveyRequestFilterCardProps = {
	isLoading: boolean;
	isMutating: boolean;
	filters: UseSurveyRequestFiltersResult;
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption;
};

export function SurveyRequestFilterCard({
	isLoading,
	isMutating,
	filters,
	getResolvedFilterColumnConfig
}: SurveyRequestFilterCardProps) {
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
						const isListOperator = filterCondition.operator == "in" || filterCondition.operator == "not_in";

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
													{surveyFilterColumns.map(column => (
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
										) : isListOperator ? (
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<p className="text-muted-foreground text-xs">Define one or more values.</p>
													<Button type="button" variant="outline" onClick={() => filters.addFilterListValue(index)}><PlusIcon />Add Value</Button>
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
																			<SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
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
																	<Button type="button" variant="outline" onClick={() => filters.removeFilterListValue(index, valueIndex)} className="shrink-0"><XIcon />Remove</Button>
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
												<SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
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

type SurveyRequestFormDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formState: FormState;
	formError: { title: string, message: string } | null;
	isMutating: boolean;
	onTitleChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
	onContentChange: (value: string) => void;
	onSubmit: () => void;
};

export function SurveyRequestFormDrawer({
	open,
	onOpenChange,
	formState,
	formError,
	isMutating,
	onTitleChange,
	onDescriptionChange,
	onContentChange,
	onSubmit
}: SurveyRequestFormDrawerProps) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>{formState.surveyId == null ? "Add Satisfaction Survey" : "Edit Satisfaction Survey"}</DrawerTitle>
					<DrawerDescription>Changes in editor mode create pending satisfaction survey requests that require approver review before publication.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-3 pb-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Satisfaction Survey Title</label>
							<Input value={formState.title} onChange={event => onTitleChange(event.target.value)} placeholder="Customer Satisfaction Survey" />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Description</label>
							<Textarea
								value={formState.description}
								onChange={event => onDescriptionChange(event.target.value)}
								placeholder="Short survey description"
								className="min-h-28"
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Content JSON</label>
								<Badge variant="outline">Required</Badge>
							</div>
							<Textarea
								value={formState.content}
								onChange={event => onContentChange(event.target.value)}
								placeholder='{"slides":[]}'
								className="min-h-72 font-mono text-xs"
							/>
							<p className="text-muted-foreground text-xs">Use valid JSON for the survey schema or block content.</p>
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
					<Button type="button" onClick={onSubmit} disabled={isMutating}>Save</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

type SurveyRequestReviewDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reviewDrawerState: { row: SurveyTableRow, diff: SurveyRequestReviewDiff | null } | null;
	reviewError: { title: string, message: string } | null;
	isReviewDiffLoading: boolean;
	reviewComment: ReviewCommentRichText;
	onReviewCommentChange: (value: ReviewCommentRichText) => void;
	onApprove: () => void;
	onReject: () => void;
	isMutating: boolean;
	onOpenRequestChanges?: (row: SurveyTableRow) => void;
};

export function SurveyRequestReviewDrawer({
	open,
	onOpenChange,
	reviewDrawerState,
	reviewError,
	isReviewDiffLoading,
	reviewComment,
	onReviewCommentChange,
	onApprove,
	onReject,
	isMutating,
	onOpenRequestChanges
}: SurveyRequestReviewDrawerProps) {
	return (
		<Drawer
			open={open}
			onOpenChange={openState => {
				onOpenChange(openState);
			}}
			direction="right"
		>
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Review</DrawerTitle>
					<DrawerDescription>Review the differences between the last approved version and the current pending request before making a decision.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					<div className="bg-muted/30 rounded-lg border p-3 text-sm">
						<p>
							<span className="font-medium">Request Type:</span>{" "}
							{reviewDrawerState?.row != null ? renderRequestTypeTrigger({
								row: {
									...reviewDrawerState.row,
									requestType: reviewDrawerState.diff?.requestType ?? reviewDrawerState.row.requestType
								},
								onOpenRequestChanges,
								className: "align-baseline"
							}) : "-"}
						</p>
						<p className="text-muted-foreground">
							{reviewDrawerState?.diff != null ? `${reviewDrawerState.diff.changedCount} changed field(s)` : "Loading differences..."}
						</p>
					</div>

					{isReviewDiffLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : reviewDrawerState?.diff == null ? (
						<p className="text-muted-foreground text-sm">No diff is available for this request.</p>
					) : (
						<div className="space-y-2">
							{reviewDrawerState.diff.items.map(item => (
								<div key={item.field} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{item.label}</p>
										<Badge variant={item.changed ? "default" : "secondary"}>{item.changed ? "Changed" : "Unchanged"}</Badge>
									</div>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Last Approved</p>
											<div className={cn("bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word", getSurveyDrawerValueClassName(item.field))}>{item.previousValue}</div>
										</div>
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Requested</p>
											<div className={cn("bg-muted/10 min-h-9 rounded border px-2 py-1.5 wrap-break-word", getSurveyDrawerValueClassName(item.field))}>{item.requestedValue}</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{reviewError != null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>{reviewError.title}</AlertTitle>
							<AlertDescription>{reviewError.message}</AlertDescription>
						</Alert>
					) : null}

					<div className="space-y-2">
						<label className="text-sm font-medium">Review Comment (optional)</label>
						<ReviewCommentInput value={reviewComment} onChange={onReviewCommentChange} />
					</div>
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
					<Button type="button" variant="default" onClick={onApprove} disabled={isMutating || reviewDrawerState?.diff == null}>Approve</Button>
					<Button type="button" variant="destructive" onClick={onReject} disabled={isMutating || reviewDrawerState?.diff == null}>Reject</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

type SurveyRequestChangePreviewDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: SurveyTableRow | null;
};

export function SurveyRequestChangePreviewDrawer({
	open,
	onOpenChange,
	row
}: SurveyRequestChangePreviewDrawerProps) {
	const diffQuery = useQuery({
		queryKey: ["satisfaction-survey-management", "request-change-preview", row?.id ?? null],
		enabled: open && row != null,
		queryFn: () => surveyActions.getSurveyRequestReviewDiffAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Request Changes</DrawerTitle>
					<DrawerDescription>Review the differences between the last approved version and the selected request.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					<div className="bg-muted/30 rounded-lg border p-3 text-sm">
						<p><span className="font-medium">Request Type:</span> {diffQuery.data?.requestType ?? row?.requestType ?? "-"}</p>
						<p className="text-muted-foreground">{diffQuery.data != null ? `${diffQuery.data.changedCount} changed field(s)` : "Loading differences..."}</p>
					</div>

					{row == null ? (
						<p className="text-muted-foreground text-sm">No request selected.</p>
					) : diffQuery.isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : diffQuery.isError || diffQuery.data == null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>Unable to load request changes.</AlertDescription>
						</Alert>
					) : (
						<div className="space-y-2">
							{diffQuery.data.items.map(item => (
								<div key={item.field} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{item.label}</p>
										<Badge variant={item.changed ? "default" : "secondary"}>{item.changed ? "Changed" : "Unchanged"}</Badge>
									</div>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Last Approved</p>
											<div className={cn("bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word", getSurveyDrawerValueClassName(item.field))}>{item.previousValue}</div>
										</div>
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Requested</p>
											<div className={cn("bg-muted/10 min-h-9 rounded border px-2 py-1.5 wrap-break-word", getSurveyDrawerValueClassName(item.field))}>{item.requestedValue}</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

type SurveyRequestsTableProps = {
	queryResult: QuerySurveysOutput;
	visibleColumns: SurveyTableColumnConfig[];
	visibleColumnCount: number;
	includeActions?: boolean;
	detailTriggerColumnId: SurveyTableColumnId | null;
	isLoading: boolean;
	isMutating: boolean;
	getSortDirection: (field: SortField) => SortDirection | null;
	onToggleSortField: (field: SortField) => void;
	onOpenDetails: (row: SurveyTableRow) => void;
	renderSurveyCell: (columnId: SurveyTableColumnConfig["id"], row: SurveyTableRow) => ReactNode;
	renderActions: (row: SurveyTableRow) => ReactNode;
};

export function SurveyRequestsTable({
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
	renderSurveyCell,
	renderActions
}: SurveyRequestsTableProps) {
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
							<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">Loading satisfaction survey requests...</TableCell>
						</TableRow>
					) : null}
					{!isLoading && queryResult.docs.length == 0 ? (
						<TableRow>
							<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">No satisfaction survey requests found.</TableCell>
						</TableRow>
					) : null}
					{queryResult.docs.map(row => {
						return (
							<TableRow key={row.id}>
								{visibleColumns.map(column => {
									const cellValue = renderSurveyCell(column.id, row);
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

type SurveyRequestDetailsDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: SurveyTableRow | null;
	renderActions: (row: SurveyTableRow) => ReactNode;
	relationNavigation?: SurveyRelationNavigation;
	onOpenRequestChanges?: (row: SurveyTableRow) => void;
};

type SurveyRelationNavigation = {
	getHrefBase: (managementKey: string) => string | null;
	onRelationLinkClick: (event: MouseEvent<HTMLAnchorElement>, request: {
		targetManagementKey: string;
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

function getSurveyRelationSummaryLabel(column: SurveyRelationColumn): string {
	if(column == "reviewedBy")
		return "Reviewed By";
	if(column == "createdBy")
		return "Created By";
	if(column == "updatedBy")
		return "Updated By";
	return "Deleted By";
}

function renderSurveyUserRelationValue({
	column,
	value,
	relationId,
	relationNavigation,
	stagedUserIdByUserId
}: {
	column: SurveyRelationColumn;
	value: string;
	relationId: string | null;
	relationNavigation?: SurveyRelationNavigation;
	stagedUserIdByUserId?: Record<string, string>;
}): ReactNode {
	const normalizedValue = value.trim();
	if(relationId == null || normalizedValue.length == 0 || normalizedValue == "-")
		return value;

	const summaryLabel = getSurveyRelationSummaryLabel(column);
	const hrefBase = relationNavigation?.getHrefBase("user-management");
	if(hrefBase != null && relationNavigation != null) {
		const stagedUserId = stagedUserIdByUserId?.[relationId] ?? null;
		if(stagedUserId == null || stagedUserId.trim().length == 0)
			return value;

		const relationFilters = [{ column: "id", operator: "equals", value: stagedUserId }];
		const searchParams = new URLSearchParams();
		searchParams.set(RELATION_FILTER_QUERY_PARAM, JSON.stringify(relationFilters));
		searchParams.set("relationContext", `satisfaction-survey-management:${column}`);
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
						relationContext: `satisfaction-survey-management:${column}`
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

export function SurveyRequestDetailsDrawer({
	open,
	onOpenChange,
	row,
	renderActions,
	relationNavigation,
	onOpenRequestChanges
}: SurveyRequestDetailsDrawerProps) {
	const [historyOpen, setHistoryOpen] = useState(false);

	useEffect(() => {
		if(!open)
			setHistoryOpen(false);
	}, [open]);

	const detailsQuery = useQuery({
		queryKey: ["satisfaction-survey-management", "details", row?.id ?? null],
		enabled: open && row != null,
		queryFn: () => surveyActions.getSurveyRequestDetailsAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const historyAccessQuery = useQuery({
		queryKey: ["satisfaction-survey-management", "history-access"],
		queryFn: () => surveyActions.canAccessSurveyRequestHistoryAction(),
		staleTime: 60_000,
		refetchOnWindowFocus: true
	});

	const canAccessHistory = historyAccessQuery.data == true;

	const historyQuery = useQuery({
		queryKey: ["satisfaction-survey-management", "history", row?.id ?? null],
		enabled: historyOpen && row != null && canAccessHistory,
		queryFn: () => surveyActions.getSurveyRequestHistoryAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const details = detailsQuery.data;
	const actionRow = details?.row ?? row;

	const renderDetailColumnValue = (columnId: SurveyTableColumnId, value: ReactNode) => {
		return <div className={cn(getSurveyDrawerValueClassName(columnId), "wrap-break-word")}>{value}</div>;
	};

	const renderDetailValue = (columnId: SurveyTableColumnId, data: surveyActions.SurveyRequestDetailsOutput) => {
		switch(columnId) {
			case "id":
				return renderDetailColumnValue(columnId, data.row.id);
			case "title":
				return renderDetailColumnValue(columnId, data.row.title);
			case "descriptionText":
				return renderDetailColumnValue(columnId, data.row.descriptionText.length > 0 ? data.row.descriptionText : "-");
			case "contentText":
				return renderDetailColumnValue(columnId, data.row.contentText.length > 0 ? data.row.contentText : "-");
			case "createdBy":
				return renderDetailColumnValue(columnId, renderSurveyUserRelationValue({ column: "createdBy", value: data.relationValues.createdBy ?? "-", relationId: data.row.createdById, relationNavigation, stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId }));
			case "updatedBy":
				return renderDetailColumnValue(columnId, renderSurveyUserRelationValue({ column: "updatedBy", value: data.relationValues.updatedBy ?? "-", relationId: data.row.updatedById, relationNavigation, stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId }));
			case "deletedBy":
				return renderDetailColumnValue(columnId, renderSurveyUserRelationValue({ column: "deletedBy", value: data.relationValues.deletedBy ?? "-", relationId: data.row.deletedById, relationNavigation, stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId }));
			case "createdAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.createdAt));
			case "updatedAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.updatedAt));
			case "deletedAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.deletedAt));
			case "requestType":
				return renderDetailColumnValue(columnId, renderRequestTypeTrigger({ row: data.row, onOpenRequestChanges, className: "text-left whitespace-normal" }));
			case "status": {
				const status = getReviewStatus(data.row);
				return <Badge variant={status.variant}>{status.label}</Badge>;
			}
			case "reviewedAt":
				return renderDetailColumnValue(columnId, formatDateTime(data.row.reviewedAt));
			case "reviewedBy":
				return renderDetailColumnValue(columnId, renderSurveyUserRelationValue({ column: "reviewedBy", value: data.relationValues.reviewedBy ?? "-", relationId: data.row.reviewedById, relationNavigation, stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId }));
			case "reviewApproved":
				return renderDetailColumnValue(columnId, data.row.reviewApproved == null ? "-" : data.row.reviewApproved ? "True" : "False");
			case "reviewCommentText":
				return renderDetailColumnValue(columnId, data.row.reviewCommentText.length > 0 ? data.row.reviewCommentText : "-");
			default:
				return renderDetailColumnValue(columnId, "-");
		}
	};

	return (
		<>
			<Drawer open={open} onOpenChange={onOpenChange} direction="right">
				<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
					<DrawerHeader>
						<DrawerTitle>Satisfaction Survey Request Details</DrawerTitle>
						<DrawerDescription>Review all available columns for this satisfaction survey request entry.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
						{row == null ? (
							<p className="text-muted-foreground text-sm">No satisfaction survey request selected.</p>
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
								<AlertDescription>Unable to load satisfaction survey request details.</AlertDescription>
							</Alert>
						) : (
							surveyTableColumns.map(column => (
								<div key={`${details.row.id}-details-${column.id}`} className="space-y-1 rounded-lg border p-3">
									<p className="text-muted-foreground text-xs font-medium">{column.label}</p>
									{renderDetailValue(column.id, details)}
								</div>
							))
						)}
					</div>
					<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
						{!historyAccessQuery.isPending && canAccessHistory ? (
							<Button type="button" variant="secondary" onClick={() => setHistoryOpen(true)} disabled={row == null}><HistoryIcon />History</Button>
						) : null}
						{actionRow != null ? (
							renderActions(actionRow)
						) : null}
					</DrawerFooter>
				</DrawerContent>
			</Drawer>

			<Drawer open={historyOpen} onOpenChange={setHistoryOpen} direction="right">
				<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-3xl">
					<DrawerHeader>
						<DrawerTitle>Satisfaction Survey Request History</DrawerTitle>
						<DrawerDescription>Changes are shown from the most recent version to the earliest version.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
						{row == null ? (
							<p className="text-muted-foreground text-sm">No satisfaction survey request selected.</p>
						) : historyAccessQuery.isPending ? (
							<div className="space-y-2">
								<Skeleton className="h-28 w-full" />
								<Skeleton className="h-28 w-full" />
							</div>
						) : !canAccessHistory ? (
							<Alert variant="destructive">
								<CircleAlertIcon />
								<AlertTitle>Unauthorized</AlertTitle>
								<AlertDescription>You need Survey Management auditor access to view satisfaction survey history.</AlertDescription>
							</Alert>
						) : historyQuery.isPending ? (
							<div className="space-y-2">
								<Skeleton className="h-28 w-full" />
								<Skeleton className="h-28 w-full" />
							</div>
						) : historyQuery.isError || historyQuery.data == null ? (
							<Alert variant="destructive">
								<CircleAlertIcon />
								<AlertTitle>Error</AlertTitle>
								<AlertDescription>Unable to load satisfaction survey request history.</AlertDescription>
							</Alert>
						) : historyQuery.data.entries.length == 0 ? (
							<p className="text-muted-foreground text-sm">No history entries found for this satisfaction survey request.</p>
						) : (
							historyQuery.data.entries.map(entry => (
								<div key={entry.versionId} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-semibold">{formatDateTime(entry.changedAt)}</p>
										<Badge variant="outline">{entry.changedCount} change(s)</Badge>
									</div>
									<div className="space-y-1">
										{entry.changes.map(change => (
											<div key={`${entry.versionId}-${change.column}`} className={cn("space-y-0.5 rounded-md border p-2 text-xs", change.changed ? "border-primary/30 bg-primary/5" : "opacity-70")}>
												<p className="font-medium">{change.label}</p>
												<p className="text-muted-foreground">From: {change.previousValue}</p>
												<p>To: {change.nextValue}</p>
											</div>
										))}
									</div>
								</div>
							))
						)}
					</div>
					<DrawerFooter className="border-t sm:flex-row sm:items-center sm:justify-end">
						<Button type="button" variant="outline" onClick={() => setHistoryOpen(false)}>Close</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</>
	);
}

type UseSurveyCellRendererOptions = {
	relationValuesByRowId: Record<string, surveyActions.SurveyRelationValues>;
	isRelationLoading: boolean;
	relationNavigation?: SurveyRelationNavigation;
	onOpenRequestChanges?: (row: SurveyTableRow) => void;
};

export function useSurveyCellRenderer({ relationValuesByRowId, isRelationLoading, relationNavigation, onOpenRequestChanges }: UseSurveyCellRendererOptions) {
	return useCallback((columnId: SurveyTableColumnId, row: SurveyTableRow) => {
		const resolvedValues = relationValuesByRowId[row.id] ?? {};
		switch(columnId) {
			case "id":
				return row.id;
			case "title":
				return row.title;
			case "descriptionText":
				return row.descriptionText.length > 0 ? row.descriptionText : "-";
			case "contentText":
				return row.contentText.length > 0 ? row.contentText : "-";
			case "createdBy":
				if(isRelationLoading && resolvedValues.createdBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderSurveyUserRelationValue({ column: "createdBy", value: resolvedValues.createdBy ?? "-", relationId: row.createdById, relationNavigation, stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId });
			case "updatedBy":
				if(isRelationLoading && resolvedValues.updatedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderSurveyUserRelationValue({ column: "updatedBy", value: resolvedValues.updatedBy ?? "-", relationId: row.updatedById, relationNavigation, stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId });
			case "deletedBy":
				if(isRelationLoading && resolvedValues.deletedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderSurveyUserRelationValue({ column: "deletedBy", value: resolvedValues.deletedBy ?? "-", relationId: row.deletedById, relationNavigation, stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId });
			case "createdAt":
				return formatDateTime(row.createdAt);
			case "updatedAt":
				return formatDateTime(row.updatedAt);
			case "deletedAt":
				return formatDateTime(row.deletedAt);
			case "requestType":
				return renderRequestTypeTrigger({ row, onOpenRequestChanges, className: "text-left whitespace-normal" });
			case "status": {
				const status = getReviewStatus(row);
				return <Badge variant={status.variant}>{status.label}</Badge>;
			}
			case "reviewedAt":
				return formatDateTime(row.reviewedAt);
			case "reviewedBy":
				if(isRelationLoading && resolvedValues.reviewedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderSurveyUserRelationValue({ column: "reviewedBy", value: resolvedValues.reviewedBy ?? "-", relationId: row.reviewedById, relationNavigation, stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId });
			case "reviewApproved":
				return row.reviewApproved == null ? "-" : row.reviewApproved ? "True" : "False";
			case "reviewCommentText":
				return row.reviewCommentText.length > 0 ? row.reviewCommentText : "-";
			default:
				return "-";
		}
	}, [isRelationLoading, onOpenRequestChanges, relationValuesByRowId, relationNavigation]);
}

export function useSurveyColumnPreferences() {
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<SurveyTableColumnId[]>(defaultSurveyColumnOrder);
	const [hiddenColumnIds, setHiddenColumnIds] = useState<SurveyTableColumnId[]>(defaultSurveyHiddenColumns);
	const [draggedColumnId, setDraggedColumnId] = useState<SurveyTableColumnId | null>(null);

	const columnById = useMemo(() => Object.fromEntries(
		surveyTableColumns.map(column => [column.id, column])
	) as Record<SurveyTableColumnId, SurveyTableColumnConfig>, []);

	const orderedColumns = useMemo(() => {
		const normalizedOrder = [
			...columnOrder.filter(columnId => columnById[columnId] != null),
			...defaultSurveyColumnOrder.filter(columnId => !columnOrder.includes(columnId))
		];
		return normalizedOrder.map(columnId => columnById[columnId]);
	}, [columnById, columnOrder]);

	const visibleColumns = useMemo(() => (
		orderedColumns.filter(column => !hiddenColumnIds.includes(column.id))
	), [hiddenColumnIds, orderedColumns]);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		const rawPreferences = window.localStorage.getItem(SURVEY_COLUMN_PREFERENCES_KEY);
		if(rawPreferences == null)
			return;

		try {
			const parsed = JSON.parse(rawPreferences) as { order?: unknown, hidden?: unknown };
			const parsedOrder = Array.isArray(parsed.order) ? parsed.order.filter((value): value is SurveyTableColumnId =>
				typeof value == "string" && defaultSurveyColumnOrder.includes(value as SurveyTableColumnId)
			) : [];
			const deduplicatedOrder = parsedOrder.filter((columnId, index) => parsedOrder.indexOf(columnId) == index);
			setColumnOrder([
				...deduplicatedOrder,
				...defaultSurveyColumnOrder.filter(columnId => !deduplicatedOrder.includes(columnId))
			]);

			const parsedHidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((value): value is SurveyTableColumnId =>
				typeof value == "string" && defaultSurveyColumnOrder.includes(value as SurveyTableColumnId)
			) : [];
			const deduplicatedHidden = parsedHidden.filter((columnId, index) => parsedHidden.indexOf(columnId) == index);
			setHiddenColumnIds(deduplicatedHidden.slice(0, Math.max(defaultSurveyColumnOrder.length - 1, 0)));
		} catch{
			setColumnOrder(defaultSurveyColumnOrder);
			setHiddenColumnIds(defaultSurveyHiddenColumns);
		}
	}, []);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		window.localStorage.setItem(SURVEY_COLUMN_PREFERENCES_KEY, JSON.stringify({
			order: columnOrder,
			hidden: hiddenColumnIds
		}));
	}, [columnOrder, hiddenColumnIds]);

	const toggleColumnVisibility = (columnId: SurveyTableColumnId, checked: boolean) => {
		setHiddenColumnIds(previous => {
			const isHidden = previous.includes(columnId);
			if(checked)
				return isHidden ? previous.filter(value => value != columnId) : previous;
			if(isHidden)
				return previous;
			const visibleCount = surveyTableColumns.length - previous.length;
			if(visibleCount <= 1)
				return previous;
			return [...previous, columnId];
		});
	};

	const resetColumnPreferences = () => {
		setColumnOrder(defaultSurveyColumnOrder);
		setHiddenColumnIds(defaultSurveyHiddenColumns);
	};

	const handleColumnDragStart = (columnId: SurveyTableColumnId) => {
		setDraggedColumnId(columnId);
	};

	const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: SurveyTableColumnId) => {
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

export function useSurveyFilterColumnConfig() {
	const searchSurveyOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const surveys = await surveyActions.searchSurveyOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(surveys.map(survey => ({
			value: survey.id,
			label: `${survey.title} (${survey.id})`,
			renderLabel: <span>{survey.title} (<span className="font-mono">{survey.id}</span>)</span>,
			keywords: `${survey.id} ${survey.title}`
		})));
	}, []);

	const searchAuditUserOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const users = await surveyActions.searchSurveyAuditUserOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(users.map(user => ({
			value: user.id,
			label: `${user.name} (${user.email})`,
			keywords: `${user.name} ${user.email}`
		})));
	}, []);

	const getResolvedFilterColumnConfig = useCallback((column: FilterColumn): FilterColumnOption => (
		getResolvedSurveyFilterColumnConfig(column, [], [], searchSurveyOptions, searchAuditUserOptions)
	), [searchAuditUserOptions, searchSurveyOptions]);

	return {
		getResolvedFilterColumnConfig
	};
}

type UseSurveyManagementQueryStateOptions = {
	debounceMs?: number;
	defaultSortField?: SortField;
	defaultSortDirection?: SortDirection;
};

export function useSurveyManagementQueryState({
	debounceMs = 250,
	defaultSortField = "updatedAt",
	defaultSortDirection = "desc"
}: UseSurveyManagementQueryStateOptions = {}) {
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

type UseSurveyRelationsOptions = {
	docs: SurveyTableRow[];
	visibleColumns: SurveyTableColumnConfig[];
};

export function useSurveyRelations({ docs, visibleColumns }: UseSurveyRelationsOptions) {
	const visibleRelationColumns = useMemo(() => (
		visibleColumns
			.map(column => column.id)
			.filter((columnId): columnId is SurveyRelationColumn => surveyRelationColumnSet.has(columnId as SurveyRelationColumn))
	), [visibleColumns]);

	const relationRows = useMemo(() => docs.map(row => ({
		id: row.id,
		reviewedById: row.reviewedById,
		createdById: row.createdById,
		updatedById: row.updatedById,
		deletedById: row.deletedById
	})), [docs]);

	const relationsQuery = useQuery({
		queryKey: ["satisfaction-survey-management", "relations", { rows: relationRows, columns: visibleRelationColumns }],
		enabled: relationRows.length > 0 && visibleRelationColumns.length > 0,
		queryFn: () => surveyActions.resolveSurveyRelationColumnsAction({
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

type UseSurveyRequestFiltersOptions = {
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption;
};

export type UseSurveyRequestFiltersResult = {
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

function mapAppliedFilterToCondition(
	filter: FilterInput,
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption
): FilterCondition {
	const columnConfig = getResolvedFilterColumnConfig(filter.column);
	const values = Array.isArray(filter.value) ? filter.value.map(value => {
		if(columnConfig.valueType != "date")
			return String(value);
		const parsed = parseFilterDateValue(String(value));
		return parsed == null ? String(value) : formatFilterDateInput(parsed);
	}) : [];
	const parsedDate = !Array.isArray(filter.value) && columnConfig.valueType == "date" && typeof filter.value == "string" ? parseFilterDateValue(filter.value) : null;

	return {
		column: filter.column,
		operator: filter.operator,
		joinWithPrevious: filter.joinWithPrevious ?? defaultFilterCombinator,
		value: Array.isArray(filter.value) || filter.value == null ? "" : String(filter.value),
		values,
		existsValue: filter.value == false ? "false" : "true",
		dateValue: parsedDate,
		listDateValue: null,
		dateText: formatFilterDateOnlyInput(parsedDate),
		listDateText: ""
	};
}

function createFilterConditionsFromAppliedFilters(
	appliedFilters: FilterInput[],
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption
): FilterCondition[] {
	if(appliedFilters.length == 0)
		return [];

	return appliedFilters.map(filter => mapAppliedFilterToCondition(filter, getResolvedFilterColumnConfig));
}

declare global {
	interface Window {
		__satisfactionSurveyDashboardFilters?: string;
	}
}

export function useSurveyRequestFilters({ getResolvedFilterColumnConfig }: UseSurveyRequestFiltersOptions): UseSurveyRequestFiltersResult {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const searchParamsKey = searchParams.toString();
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters0] = useState<FilterCondition[]>([]);
	const setFilters = useCallback((v: FilterCondition[] | ((o: FilterCondition[]) => FilterCondition[])) => {
		if(typeof v != "function") {
			window.__satisfactionSurveyDashboardFilters = JSON.stringify(v);
			setFilters0(v);
			return;
		}
		setFilters0(o => {
			const n = v(o);
			window.__satisfactionSurveyDashboardFilters = JSON.stringify(n);
			return n;
		});
	}, [setFilters0]);
	const [isFilterStateHydrated, setIsFilterStateHydrated] = useState(false);

	useEffect(() => {
		const nextSearchParams = new URLSearchParams(searchParamsKey);
		const pendingNavigation = consumePendingRelationFilterNavigation("satisfaction-survey-management");
		const relationFilters = pendingNavigation?.relationFiltersJson ?? nextSearchParams.get(RELATION_FILTER_QUERY_PARAM) ?? window.__satisfactionSurveyDashboardFilters ?? null;
		if(relationFilters != null) {
			try {
				const parsed = JSON.parse(relationFilters) as unknown;
				const parsedFilters = Array.isArray(parsed) ? parsed.filter((filter): filter is FilterInput => (
					filter != null &&
					typeof filter == "object" &&
					typeof (filter as { column?: unknown }).column == "string" &&
					typeof (filter as { operator?: unknown }).operator == "string"
				)) : [];
				const restoredFilters = createFilterConditionsFromAppliedFilters(parsedFilters, getResolvedFilterColumnConfig);
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
	}, [getResolvedFilterColumnConfig, searchParamsKey]);

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
		if(columnConfig.valueType == "date")
			return "";
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
	}, [filters]);

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

	const filterSummaryItems = useMemo(() => (
		appliedFilters.map((filter, index) => {
			const columnConfig = getResolvedFilterColumnConfig(filter.column);
			const operatorLabel = filterOperatorOptions.find(operator => operator.value == filter.operator)?.label ?? filter.operator;
			const valueLabel = (() => {
				if(filter.operator == "exists")
					return filter.value == true ? "true" : "false";
				if(Array.isArray(filter.value)) {
					return filter.value.map(value => {
						if(columnConfig.valueType == "boolean")
							return value == true ? "True" : "False";
						if(columnConfig.valueType == "date")
							return formatFilterDateValue(typeof value == "string" ? parseFilterDateValue(value) : null);
						if(columnConfig.valueType == "select")
							return columnConfig.selectOptions?.find(option => option.value == String(value))?.label ?? String(value);
						return String(value);
					}).join(", ");
				}
				if(columnConfig.valueType == "date")
					return formatFilterDateValue(typeof filter.value == "string" ? parseFilterDateValue(filter.value) : null);
				if(columnConfig.valueType == "boolean")
					return filter.value == true ? "True" : "False";
				if(columnConfig.valueType == "select")
					return columnConfig.selectOptions?.find(option => option.value == String(filter.value))?.label ?? String(filter.value ?? "");
				return String(filter.value ?? "");
			})();

			return {
				combinator: index == 0 ? null : (filter.joinWithPrevious ?? defaultFilterCombinator).toUpperCase(),
				columnLabel: columnConfig.label,
				operatorLabel,
				valueLabel
			};
		})
	), [appliedFilters, getResolvedFilterColumnConfig]);

	const toggleFilterPanel = () => {
		if(isFilterOpen) {
			setIsFilterOpen(false);
			return;
		}
		setIsFilterOpen(true);
	};

	const clearFilter = () => {
		setFilters([]);
	};

	const updateFilterJoinWithPrevious = (filterIndex: number, combinator: FilterCombinator) => {
		setFilters(previous => previous.map((filter, index) => index == filterIndex ? { ...filter, joinWithPrevious: combinator } : filter));
	};

	const updateFilter = (filterIndex: number, updater: (filterCondition: FilterCondition) => FilterCondition) => {
		setFilters(previous => previous.map((filterCondition, index) => index == filterIndex ? updater(filterCondition) : filterCondition));
	};

	const handleFilterColumnChange = (filterIndex: number, column: FilterColumn) => {
		const nextColumnConfig = getResolvedFilterColumnConfig(column);
		updateFilter(filterIndex, filterCondition => ({
			...filterCondition,
			column,
			operator: nextColumnConfig.operators.includes(filterCondition.operator) ? filterCondition.operator : nextColumnConfig.operators[0],
			value: "",
			values: [],
			dateValue: null,
			listDateValue: null,
			existsValue: "true",
			dateText: "",
			listDateText: ""
		}));
	};

	const handleFilterOperatorChange = (filterIndex: number, operator: FilterColumnOption["operators"][number]) => {
		updateFilter(filterIndex, filterCondition => ({
			...filterCondition,
			operator,
			value: "",
			values: [],
			dateValue: null,
			listDateValue: null,
			existsValue: "true",
			dateText: "",
			listDateText: ""
		}));
	};

	const addFilter = () => {
		setFilters(previous => [...previous, createFilterCondition(surveyFilterColumns[0].value)]);
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

	const isFilterStateReady = isFilterStateHydrated;

	return {
		isFilterOpen,
		isFilterStateReady,
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

type SurveyQueryActionInput = Parameters<typeof import("./layout.actions").querySurveysEditorAction>[0];

type UseSurveyRequestsQueryOptions = {
	queryScope: string;
	queryAction: (input: SurveyQueryActionInput) => Promise<QuerySurveysOutput>;
	debouncedKeyword: string;
	sortTokens: string[];
	appliedFilters: FilterInput[];
	isFilterStateReady: boolean;
	includeSoftDeleted: boolean;
};

export function useSurveyRequestsQuery({
	queryScope,
	queryAction,
	debouncedKeyword,
	sortTokens,
	appliedFilters,
	isFilterStateReady,
	includeSoftDeleted
}: UseSurveyRequestsQueryOptions) {
	const [pageIndex, setPageIndex] = useState(1);

	const surveysQuery = useQuery({
		enabled: isFilterStateReady,
		queryKey: ["satisfaction-survey-management", "surveys", {
			queryScope,
			debouncedKeyword,
			sortTokens,
			appliedFilters,
			pageIndex,
			includeSoftDeleted
		}],
		queryFn: () => queryAction({
			keyword: debouncedKeyword,
			sort: sortTokens,
			filters: appliedFilters,
			page: pageIndex,
			limit: PAGE_SIZE,
			includeSoftDeleted
		}),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	useEffect(() => {
		setPageIndex(1);
	}, [appliedFilters, debouncedKeyword, includeSoftDeleted, sortTokens]);

	useEffect(() => {
		if(surveysQuery.data == null || surveysQuery.isFetching)
			return;
		if(surveysQuery.data.page != pageIndex)
			setPageIndex(surveysQuery.data.page);
	}, [pageIndex, surveysQuery.data, surveysQuery.isFetching]);

	const queryResult = surveysQuery.data ?? emptyQueryResult;
	const isLoading = !isFilterStateReady || surveysQuery.isPending;
	const queryErrorMessage = surveysQuery.error instanceof Error ? surveysQuery.error.message : surveysQuery.error != null ? "Failed to load satisfaction survey requests." : null;

	return {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	};
}
