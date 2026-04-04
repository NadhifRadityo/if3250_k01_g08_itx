"use client";

import { useMemo, useState, useEffect, useCallback, type DragEvent, type ReactNode, type MouseEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { XIcon, PlusIcon, ArrowUpIcon, HistoryIcon, CalendarIcon, ArrowDownIcon, ArrowUpDownIcon, CircleAlertIcon, GripVerticalIcon } from "lucide-react";

import cn from "@/utils/cn";
import { Link } from "@/components/Link";
import { SearchableSelect, SearchableMultiSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Calendar } from "@/components/radix/Calendar";
import { Checkbox } from "@/components/radix/Checkbox";
import { Collapsible, CollapsibleContent } from "@/components/radix/Collapsible";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/radix/InputGroup";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/radix/Popover";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Skeleton } from "@/components/radix/Skeleton";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import { Textarea } from "@/components/radix/Textarea";

import {
	EntrySummaryDrawer,
	useEntrySummaryDrawer,
	RelationSummaryPickerDrawer,
	consumePendingRelationFilterNavigation,
	type RelationSummaryPickerState
} from "../relation-navigation.components";
import * as teamActions from "./layout.actions";

export const PAGE_SIZE = 20;

export type SortDirection = "asc" | "desc";
export type SortField = teamActions.TeamManagementSortField;
export type FilterColumn = teamActions.TeamManagementFilterColumn;
export type FilterOperator = teamActions.TeamManagementFilterOperator;
export type FilterCombinator = teamActions.TeamManagementFilterCombinator;
export type FilterInput = teamActions.TeamManagementFilterInput;
export type QueryTeamsOutput = Awaited<ReturnType<typeof teamActions.queryTeamsAction>>;
export type TeamTableRow = QueryTeamsOutput["docs"][number];
export type TeamManagementTabMode = "viewer" | Parameters<typeof teamActions.queryTeamsAction>[0]["mode"];
export type AssignableUsers = Awaited<ReturnType<typeof teamActions.searchTeamAssignableUsersAction>>;
export type TeamRelationColumn = teamActions.TeamRelationColumn;
export type TeamRequestReviewDiff = Awaited<ReturnType<typeof teamActions.getTeamRequestReviewDiffAction>>;
export type TeamRequestHistory = Awaited<ReturnType<typeof teamActions.getTeamRequestHistoryAction>>;
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

export type TeamTableColumnId = "name" |
	"id" |
	"supervisor" |
	"officers" |
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

export type TeamTableColumnConfig = {
	id: TeamTableColumnId;
	label: string;
	sortField?: SortField;
	headClassName?: string;
	cellClassName?: string;
};

export type FormState = {
	teamId?: string;
	name: string;
	supervisorId: string;
	officerIds: string[];
};

export type FilterSummaryItem = {
	combinator: string | null;
	columnLabel: string;
	operatorLabel: string;
	valueLabel: string;
};

export const emptyAssignableUsers: AssignableUsers = {
	supervisors: [],
	officers: []
};

export const emptyQueryResult: QueryTeamsOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};

export const defaultFormState: FormState = {
	name: "",
	supervisorId: "",
	officerIds: []
};

export const TEAM_COLUMN_PREFERENCES_KEY = "team-management-columns-v1";
export const RELATION_FILTER_QUERY_PARAM = "relationFilters";

export const reviewStatusOptions: Array<{ value: string, label: string }> = [
	{ value: "pending", label: "Pending" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" }
];

export const teamTableColumns: TeamTableColumnConfig[] = [
	{ id: "id", label: "ID", sortField: "id", cellClassName: "font-mono text-xs" },
	{ id: "name", label: "Name", sortField: "name", cellClassName: "font-medium" },
	{ id: "supervisor", label: "Supervisor", sortField: "supervisor" },
	{ id: "officers", label: "Officers", sortField: "officers", cellClassName: "max-w-55 overflow-hidden text-ellipsis whitespace-nowrap" },
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

function getTeamDrawerValueClassName(columnId: string): string {
	if(columnId == "id")
		return "text-xs font-mono";
	if(columnId == "name")
		return "text-sm font-medium";
	return "text-sm";
}

export const defaultTeamColumnOrder: TeamTableColumnId[] = teamTableColumns.map(column => column.id);
export const defaultTeamVisibleColumns: TeamTableColumnId[] = ["name", "supervisor", "officers", "requestType", "status", "updatedAt", "reviewCommentText"];
export const defaultTeamHiddenColumns: TeamTableColumnId[] = defaultTeamColumnOrder.filter(columnId => !defaultTeamVisibleColumns.includes(columnId));

export const teamRelationColumnSet = new Set<TeamRelationColumn>([
	"supervisor",
	"officers",
	"reviewedBy",
	"createdBy",
	"updatedBy",
	"deletedBy"
]);

const teamNonEligibleColumnSet = new Set<string>([
	"actions",
	"status",
	"requestType",
	"supervisor",
	"officers",
	"reviewedBy",
	"createdBy",
	"updatedBy",
	"deletedBy"
]);

export function getEligibleDetailTriggerTeamColumnId(visibleColumns: TeamTableColumnConfig[]): TeamTableColumnId | null {
	const triggerColumn = visibleColumns.find(column => !teamNonEligibleColumnSet.has(column.id));
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

export const teamFilterColumns: FilterColumnOption[] = [
	{ value: "id", label: "ID", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "name", label: "Name", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter team name" },
	{ value: "supervisor", label: "Supervisor", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "officers", label: "Officers", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
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
	return teamFilterColumns.find(option => option.value == column) ?? teamFilterColumns[0];
}

export function getResolvedTeamFilterColumnConfig(
	column: FilterColumn,
	idSelectOptions: Array<{ value: string, label: string }>,
	supervisorSelectOptions: Array<{ value: string, label: string }>,
	officerSelectOptions: Array<{ value: string, label: string }>,
	reviewedBySelectOptions: Array<{ value: string, label: string }>,
	searchTeamOptions?: FilterSelectSearchAction,
	searchSupervisorUserOptions?: FilterSelectSearchAction,
	searchOfficerUserOptions?: FilterSelectSearchAction,
	searchAuditUserOptions?: FilterSelectSearchAction
): FilterColumnOption {
	const config = getFilterColumnConfig(column);
	switch(column) {
		case "id":
			return {
				...config,
				selectOptions: idSelectOptions,
				searchOptionsAction: searchTeamOptions
			};
		case "supervisor":
			return {
				...config,
				selectOptions: supervisorSelectOptions,
				searchOptionsAction: searchSupervisorUserOptions
			};
		case "officers":
			return {
				...config,
				selectOptions: officerSelectOptions,
				searchOptionsAction: searchOfficerUserOptions
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

export function createFilterCondition(column: FilterColumn = teamFilterColumns[0].value): FilterCondition {
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
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}`;
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

export function formatDateTime(dateValue: string | null) {
	if(dateValue == null)
		return "-";
	const date = new Date(dateValue);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

export function getReviewStatus(row: TeamTableRow): { label: string, variant: "default" | "secondary" | "destructive" } {
	if(row.reviewedAt == null)
		return { label: "Pending", variant: "secondary" };
	if(row.reviewApproved == true)
		return { label: "Approved", variant: "default" };
	return { label: "Rejected", variant: "destructive" };
}

function renderRequestTypeTrigger({
	row,
	onOpenRequestChanges,
	className,
	requestTypeLabel
}: {
	row: TeamTableRow;
	onOpenRequestChanges?: (row: TeamTableRow) => void;
	className?: string;
	requestTypeLabel?: string;
}): ReactNode {
	const label = requestTypeLabel ?? row.requestType;
	if(onOpenRequestChanges == null)
		return label;

	return (
		<Button
			type="button"
			variant="link"
			onClick={() => onOpenRequestChanges(row)}
			className={cn("text-primary h-auto p-0", className)}
		>
			{label}
		</Button>
	);
}

export function reorderColumns(order: TeamTableColumnId[], sourceId: TeamTableColumnId, targetId: TeamTableColumnId): TeamTableColumnId[] {
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

type TeamActiveFiltersSummaryProps = {
	items: FilterSummaryItem[];
};

export function TeamActiveFiltersSummary({ items }: TeamActiveFiltersSummaryProps) {
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

type TeamColumnConfigCardProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	orderedColumns: TeamTableColumnConfig[];
	hiddenColumnIds: TeamTableColumnId[];
	visibleColumnCount: number;
	onToggleColumnVisibility: (columnId: TeamTableColumnId, checked: boolean) => void;
	onReset: () => void;
	onColumnDragStart: (columnId: TeamTableColumnId) => void;
	onColumnDragOver: (event: DragEvent<HTMLDivElement>, targetColumnId: TeamTableColumnId) => void;
	onColumnDragEnd: () => void;
};

export function TeamColumnConfigCard({
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
}: TeamColumnConfigCardProps) {
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
							<p className="text-muted-foreground text-sm">Visible {visibleColumnCount} of {teamTableColumns.length}</p>
							<Button type="button" variant="outline" size="sm" onClick={onReset}>Reset</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{orderedColumns.map(column => {
							const isVisible = !hiddenColumnIds.includes(column.id);
							const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= teamTableColumns.length - 1;
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

type TeamRequestDeleteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isMutating: boolean;
};

export function TeamRequestDeleteDialog({
	open,
	onOpenChange,
	onConfirm,
	isMutating
}: TeamRequestDeleteDialogProps) {
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

type TeamRequestCancelDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isMutating: boolean;
};

export function TeamRequestCancelDialog({
	open,
	onOpenChange,
	onConfirm,
	isMutating
}: TeamRequestCancelDialogProps) {
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

type TeamRequestFilterCardProps = {
	isLoading: boolean;
	isMutating: boolean;
	filters: UseTeamRequestFiltersResult;
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption;
};

export function TeamRequestFilterCard({
	isLoading,
	isMutating,
	filters,
	getResolvedFilterColumnConfig
}: TeamRequestFilterCardProps) {
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
													{teamFilterColumns.map(column => (
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
																<InputGroupButton type="button" variant="ghost" size="icon-xs" className="shrink-0"><CalendarIcon className="size-4" /></InputGroupButton>
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
																return { ...previous, dateValue: nextDate, dateText: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}` };
															})}
														/>
													</PopoverContent>
												</Popover>
												<Input
													type="time"
													value={getFilterTimeInput(filterCondition.dateValue)}
													onChange={event => filters.updateFilter(index, previous => {
														const baseDate = previous.dateValue ?? parseFilterDateOnlyValue(previous.dateText);
														if(baseDate == null)
															return previous;
														const nextDate = applyTimeToDate(baseDate, event.target.value);
														return { ...previous, dateValue: nextDate, dateText: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}` };
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

type TeamRequestFormDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formState: FormState;
	formError: { title: string, message: string } | null;
	onSearchSupervisors: FilterSelectSearchAction;
	onSearchOfficers: FilterSelectSearchAction;
	isMutating: boolean;
	onNameChange: (value: string) => void;
	onSupervisorChange: (value: string) => void;
	onOfficerIdsChange: (values: string[]) => void;
	onSubmit: () => void;
};

export function TeamRequestFormDrawer({
	open,
	onOpenChange,
	formState,
	formError,
	onSearchSupervisors,
	onSearchOfficers,
	isMutating,
	onNameChange,
	onSupervisorChange,
	onOfficerIdsChange,
	onSubmit
}: TeamRequestFormDrawerProps) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>{formState.teamId == null ? "Add Team" : "Edit Team"}</DrawerTitle>
					<DrawerDescription>Changes in editor mode create pending team requests that require approver review before publication.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-3 pb-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Team Name</label>
							<Input value={formState.name} onChange={event => onNameChange(event.target.value)} placeholder="Collection Team Alpha" />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Supervisor</label>
							<SearchableSelect
								value={formState.supervisorId}
								onValueChange={onSupervisorChange}
								options={[]}
								onSearch={onSearchSupervisors}
								placeholder="Select supervisor"
								searchPlaceholder="Type supervisor name or email"
							/>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Officers</label>
								<Badge variant="outline">{formState.officerIds.length} selected</Badge>
							</div>
							<SearchableMultiSelect
								values={formState.officerIds}
								onValuesChange={onOfficerIdsChange}
								options={[]}
								onSearch={onSearchOfficers}
								placeholder="Select officers"
								searchPlaceholder="Type officer name or email"
							/>
							<p className="text-muted-foreground text-xs">{formState.officerIds.length > 0 ? `${formState.officerIds.length} officer(s) selected.` : "No officers selected."}</p>
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

type TeamRequestReviewDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reviewDrawerState: { row: TeamTableRow, diff: TeamRequestReviewDiff | null } | null;
	reviewError: { title: string, message: string } | null;
	isReviewDiffLoading: boolean;
	reviewReason: string;
	onReviewReasonChange: (value: string) => void;
	onApprove: () => void;
	onReject: () => void;
	isMutating: boolean;
	onOpenRequestChanges?: (row: TeamTableRow) => void;
};

export function TeamRequestReviewDrawer({
	open,
	onOpenChange,
	reviewDrawerState,
	reviewError,
	isReviewDiffLoading,
	reviewReason,
	onReviewReasonChange,
	onApprove,
	onReject,
	isMutating,
	onOpenRequestChanges
}: TeamRequestReviewDrawerProps) {
	const entrySummary = useEntrySummaryDrawer();

	const renderReferenceValue = (
		value: string,
		references: Array<{ type: "user", id: string, label: string }> | undefined,
		sectionLabel: string,
		valueClassName: string
	) => {
		if(references == null || references.length == 0)
			return <div className={cn("bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word", valueClassName)}>{value}</div>;

		return (
			<div className={cn("bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word", valueClassName)}>
				<div className="flex flex-wrap gap-1.5">
					{references.map(reference => (
						<Button
							key={`${reference.type}-${reference.id}-${sectionLabel}`}
							type="button"
							variant="link"
							size="sm"
							onClick={() => entrySummary.openSummary({
								type: reference.type,
								id: reference.id,
								fallbackTitle: reference.label,
								fallbackDescription: sectionLabel
							})}
							className="h-auto px-0 py-0 text-left whitespace-normal wrap-break-word"
						>
							{reference.label}
						</Button>
					))}
				</div>
			</div>
		);
	};

	return (
		<>
			<Drawer open={open} onOpenChange={onOpenChange} direction="right">
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
									row: reviewDrawerState.row,
									onOpenRequestChanges,
									className: "align-baseline",
									requestTypeLabel: reviewDrawerState.diff?.requestType ?? reviewDrawerState.row.requestType
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
												{renderReferenceValue(item.previousValue, item.previousReferences, `Team ${item.label} (last approved)`, getTeamDrawerValueClassName(item.field))}
											</div>
											<div className="space-y-1">
												<p className="text-muted-foreground text-xs font-medium">Requested</p>
												{renderReferenceValue(item.requestedValue, item.requestedReferences, `Team ${item.label} (requested)`, getTeamDrawerValueClassName(item.field))}
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
							<label className="text-sm font-medium">Review Reason (optional)</label>
							<Textarea value={reviewReason} onChange={event => onReviewReasonChange(event.target.value)} placeholder="Provide a review reason" />
						</div>
					</div>
					<DrawerFooter className="border-t sm:flex-row sm:justify-end">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
						<Button type="button" variant="default" onClick={onApprove} disabled={isMutating || reviewDrawerState?.diff == null}>Approve</Button>
						<Button type="button" variant="destructive" onClick={onReject} disabled={isMutating || reviewDrawerState?.diff == null}>Reject</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>

			<EntrySummaryDrawer
				isOpen={entrySummary.isOpen}
				onOpenChange={entrySummary.onOpenChange}
				isLoading={entrySummary.isLoading}
				errorMessage={entrySummary.errorMessage}
				summary={entrySummary.summary}
			/>
		</>
	);
}

type TeamRequestChangePreviewDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: TeamTableRow | null;
};

export function TeamRequestChangePreviewDrawer({
	open,
	onOpenChange,
	row
}: TeamRequestChangePreviewDrawerProps) {
	const entrySummary = useEntrySummaryDrawer();
	const diffQuery = useQuery({
		queryKey: ["team-management", "request-change-preview", row?.id ?? null],
		enabled: open && row != null,
		queryFn: () => teamActions.getTeamRequestReviewDiffAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const renderReferenceValue = (
		value: string,
		references: Array<{ type: "user", id: string, label: string }> | undefined,
		sectionLabel: string,
		valueClassName: string
	) => {
		if(references == null || references.length == 0)
			return <div className={cn("bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word", valueClassName)}>{value}</div>;

		return (
			<div className={cn("bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word", valueClassName)}>
				<div className="flex flex-wrap gap-1.5">
					{references.map(reference => (
						<Button
							key={`${reference.type}-${reference.id}-${sectionLabel}`}
							type="button"
							variant="link"
							size="sm"
							onClick={() => entrySummary.openSummary({
								type: reference.type,
								id: reference.id,
								fallbackTitle: reference.label,
								fallbackDescription: sectionLabel
							})}
							className="h-auto px-0 py-0 text-left whitespace-normal wrap-break-word"
						>
							{reference.label}
						</Button>
					))}
				</div>
			</div>
		);
	};

	return (
		<>
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
												{renderReferenceValue(item.previousValue, item.previousReferences, `Team ${item.label} (last approved)`, getTeamDrawerValueClassName(item.field))}
											</div>
											<div className="space-y-1">
												<p className="text-muted-foreground text-xs font-medium">Requested</p>
												{renderReferenceValue(item.requestedValue, item.requestedReferences, `Team ${item.label} (requested)`, getTeamDrawerValueClassName(item.field))}
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

			<EntrySummaryDrawer
				isOpen={entrySummary.isOpen}
				onOpenChange={entrySummary.onOpenChange}
				isLoading={entrySummary.isLoading}
				errorMessage={entrySummary.errorMessage}
				summary={entrySummary.summary}
			/>
		</>
	);
}

type TeamRequestsTableProps = {
	queryResult: QueryTeamsOutput;
	visibleColumns: TeamTableColumnConfig[];
	visibleColumnCount: number;
	includeActions?: boolean;
	detailTriggerColumnId: TeamTableColumnId | null;
	isLoading: boolean;
	isMutating: boolean;
	getSortDirection: (field: SortField) => SortDirection | null;
	onToggleSortField: (field: SortField) => void;
	onOpenDetails: (row: TeamTableRow) => void;
	renderTeamCell: (columnId: TeamTableColumnConfig["id"], row: TeamTableRow) => ReactNode;
	renderActions: (row: TeamTableRow) => ReactNode;
};

export function TeamRequestsTable({
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
	renderTeamCell,
	renderActions
}: TeamRequestsTableProps) {
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
							<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">Loading team requests...</TableCell>
						</TableRow>
					) : null}
					{!isLoading && queryResult.docs.length == 0 ? (
						<TableRow>
							<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">No team requests found.</TableCell>
						</TableRow>
					) : null}
					{queryResult.docs.map(row => {
						return (
							<TableRow key={row.id}>
								{visibleColumns.map(column => {
									const cellValue = renderTeamCell(column.id, row);
									const isDetailTriggerColumn = detailTriggerColumnId != null && column.id == detailTriggerColumnId;
									return (
										<TableCell key={`${row.id}-${column.id}`} className={column.cellClassName}>
											{isDetailTriggerColumn ? (
												<Button type="button" variant="link" onClick={() => onOpenDetails(row)} className="text-primary h-auto p-0 text-left whitespace-normal">
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

type TeamRequestDetailsDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: TeamTableRow | null;
	renderActions: (row: TeamTableRow) => ReactNode;
	relationNavigation?: TeamRelationNavigation;
	onOpenRequestChanges?: (row: TeamTableRow) => void;
};

type TeamRelationNavigation = {
	getHrefBase: (managementKey: "user-management" | "role-management" | "team-management") => string | null;
	onRelationLinkClick: (event: MouseEvent<HTMLAnchorElement>, request: {
		targetManagementKey: "user-management" | "role-management" | "team-management";
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

function getTeamRelationFallbackLabel(column: TeamRelationColumn): string {
	if(column == "supervisor")
		return "Supervisor";
	if(column == "officers")
		return "Officer";
	if(column == "reviewedBy")
		return "Reviewed By";
	if(column == "createdBy")
		return "Created By";
	if(column == "updatedBy")
		return "Updated By";
	return "Deleted By";
}

function renderTeamRelationValue({
	column,
	value,
	relationIds,
	stagedUserIdByUserId,
	rowId,
	relationNavigation,
	onOpenRelationSummary
}: {
	column: TeamRelationColumn;
	value: string;
	relationIds: string[];
	stagedUserIdByUserId?: Record<string, string>;
	rowId: string;
	relationNavigation?: TeamRelationNavigation;
	onOpenRelationSummary?: (cellKey: string, normalizedValue: string, fallbackLabel: string, normalizedRelationIds: string[]) => void;
}): ReactNode {
	const normalizedRelationIds = [...new Set(
		relationIds.map(relationId => relationId.trim()).filter(relationId => relationId.length > 0)
	)];
	const normalizedValue = value.trim();
	if(normalizedRelationIds.length == 0 || normalizedValue.length == 0 || normalizedValue == "-")
		return value;

	const fallbackLabel = getTeamRelationFallbackLabel(column);
	const cellKey = `${rowId}:${column}`;

	const hrefBase = relationNavigation?.getHrefBase("user-management");
	if(hrefBase != null && relationNavigation != null) {
		const relationStagedUserIdByUserId = stagedUserIdByUserId ?? {};
		const mappedStagedUserIds = normalizedRelationIds
			.map(relationId => relationStagedUserIdByUserId[relationId])
			.filter((stagedUserId): stagedUserId is string => typeof stagedUserId == "string" && stagedUserId.trim().length > 0);
		if(mappedStagedUserIds.length != normalizedRelationIds.length)
			return value;

		const normalizedStagedUserIds = [...new Set(mappedStagedUserIds)];
		const filter: FilterInput = normalizedStagedUserIds.length == 1 ?
			{ column: "id", operator: "equals", value: normalizedStagedUserIds[0] } :
			{ column: "id", operator: "in", value: normalizedStagedUserIds };
		const relationFilters = [filter];
		const searchParams = new URLSearchParams();
		searchParams.set(RELATION_FILTER_QUERY_PARAM, JSON.stringify(relationFilters));
		searchParams.set("relationContext", `team-management:${column}`);
		const href = `${hrefBase}?${searchParams.toString()}`;
		return (
			<Link
				href={href}
				onClick={event => {
					if(event.altKey) {
						event.preventDefault();
						if(onOpenRelationSummary != null) {
							onOpenRelationSummary(cellKey, normalizedValue, fallbackLabel, normalizedRelationIds);
							return;
						}
						if(normalizedRelationIds.length == 1) {
							const relationId = normalizedRelationIds[0];
							relationNavigation.onOpenSummary({
								type: "user",
								id: relationId,
								fallbackTitle: value,
								fallbackDescription: `${fallbackLabel} user`,
								fallbackMeta: [{ label: "User ID", value: relationId }]
							});
						}
						return;
					}
					relationNavigation.onRelationLinkClick(event, {
						targetManagementKey: "user-management",
						hrefBase,
						relationFilters,
						relationContext: `team-management:${column}`
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

	if(onOpenRelationSummary != null) {
		return (
			<Button
				type="button"
				variant="link"
				onClick={() => onOpenRelationSummary(cellKey, normalizedValue, fallbackLabel, normalizedRelationIds)}
				className="h-auto p-0 text-primary"
			>
				{value}
			</Button>
		);
	}

	if(normalizedRelationIds.length != 1)
		return value;

	const relationId = normalizedRelationIds[0];
	return (
		<Button
			type="button"
			variant="link"
			onClick={() => relationNavigation.onOpenSummary({
				type: "user",
				id: relationId,
				fallbackTitle: value,
				fallbackDescription: `${fallbackLabel} user`,
				fallbackMeta: [{ label: "User ID", value: relationId }]
			})}
			className="h-auto p-0 text-primary"
		>
			{value}
		</Button>
	);
}

export function TeamRequestDetailsDrawer({
	open,
	onOpenChange,
	row,
	renderActions,
	relationNavigation,
	onOpenRequestChanges
}: TeamRequestDetailsDrawerProps) {
	const [historyOpen, setHistoryOpen] = useState(false);
	const [relationSummaryPickerOpen, setRelationSummaryPickerOpen] = useState(false);
	const [relationSummaryPicker, setRelationSummaryPicker] = useState<RelationSummaryPickerState | null>(null);

	useEffect(() => {
		if(!open)
			setHistoryOpen(false);
	}, [open]);

	const openRelationSummary = useCallback((cellKey: string, normalizedValue: string, fallbackLabel: string, normalizedRelationIds: string[]) => {
		if(relationNavigation == null || normalizedRelationIds.length == 0)
			return;

		const normalizedDisplayTokens = normalizedValue
			.split(",")
			.map(token => token.trim())
			.filter(token => token.length > 0);
		const hasAlignedTokens = normalizedDisplayTokens.length == normalizedRelationIds.length;
		const choices = normalizedRelationIds.map((relationId, index) => {
			const title = normalizedRelationIds.length == 1 ? normalizedValue :
				hasAlignedTokens ? normalizedDisplayTokens[index] :
					`${fallbackLabel} ${index + 1}`;
			return {
				id: relationId,
				title: title.length > 0 ? title : relationId,
				description: `${fallbackLabel} user`,
				meta: [{ label: "User ID", value: relationId }]
			};
		});

		if(choices.length == 1) {
			const choice = choices[0];
			relationNavigation.onOpenSummary({
				type: "user",
				id: choice.id,
				fallbackTitle: choice.title,
				fallbackDescription: choice.description,
				fallbackMeta: choice.meta
			});
			return;
		}

		setRelationSummaryPicker({ cellKey, sectionLabel: fallbackLabel, choices });
		setRelationSummaryPickerOpen(true);
	}, [relationNavigation]);

	const detailsQuery = useQuery({
		queryKey: ["team-management", "details", row?.id ?? null],
		enabled: open && row != null,
		queryFn: () => teamActions.getTeamRequestDetailsAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const historyAccessQuery = useQuery({
		queryKey: ["team-management", "history-access"],
		queryFn: () => teamActions.canAccessTeamRequestHistoryAction(),
		staleTime: 60_000,
		refetchOnWindowFocus: true
	});

	const canAccessHistory = historyAccessQuery.data == true;

	const historyQuery = useQuery({
		queryKey: ["team-management", "history", row?.id ?? null],
		enabled: historyOpen && row != null && canAccessHistory,
		queryFn: () => teamActions.getTeamRequestHistoryAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const details = detailsQuery.data;
	const actionRow = details?.row ?? row;

	const renderDetailColumnValue = (columnId: TeamTableColumnId, value: ReactNode) => {
		return <div className={cn(getTeamDrawerValueClassName(columnId), "wrap-break-word")}>{value}</div>;
	};

	const renderDetailValue = (columnId: TeamTableColumnId, data: teamActions.TeamRequestDetailsOutput) => {
		switch(columnId) {
			case "id":
				return renderDetailColumnValue(columnId, data.row.id);
			case "name":
				return renderDetailColumnValue(columnId, data.row.name);
			case "supervisor":
				return renderDetailColumnValue(columnId, renderTeamRelationValue({ column: "supervisor", value: data.relationValues.supervisor ?? "-", relationIds: data.row.supervisorId != null ? [data.row.supervisorId] : [], stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId, rowId: data.row.id, relationNavigation }));
			case "officers":
				return renderDetailColumnValue(columnId, renderTeamRelationValue({ column: "officers", value: data.relationValues.officers ?? "-", relationIds: data.row.officerIds, stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId, rowId: data.row.id, relationNavigation, onOpenRelationSummary: openRelationSummary }));
			case "createdBy":
				return renderDetailColumnValue(columnId, renderTeamRelationValue({ column: "createdBy", value: data.relationValues.createdBy ?? "-", relationIds: data.row.createdById != null ? [data.row.createdById] : [], stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId, rowId: data.row.id, relationNavigation }));
			case "updatedBy":
				return renderDetailColumnValue(columnId, renderTeamRelationValue({ column: "updatedBy", value: data.relationValues.updatedBy ?? "-", relationIds: data.row.updatedById != null ? [data.row.updatedById] : [], stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId, rowId: data.row.id, relationNavigation }));
			case "deletedBy":
				return renderDetailColumnValue(columnId, renderTeamRelationValue({ column: "deletedBy", value: data.relationValues.deletedBy ?? "-", relationIds: data.row.deletedById != null ? [data.row.deletedById] : [], stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId, rowId: data.row.id, relationNavigation }));
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
				return renderDetailColumnValue(columnId, renderTeamRelationValue({ column: "reviewedBy", value: data.relationValues.reviewedBy ?? "-", relationIds: data.row.reviewedById != null ? [data.row.reviewedById] : [], stagedUserIdByUserId: data.relationValues.stagedUserIdByUserId, rowId: data.row.id, relationNavigation }));
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
						<DrawerTitle>Team Request Details</DrawerTitle>
						<DrawerDescription>Review all available columns for this team request entry.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
						{row == null ? (
							<p className="text-muted-foreground text-sm">No team request selected.</p>
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
								<AlertDescription>Unable to load team request details.</AlertDescription>
							</Alert>
						) : (
							teamTableColumns.map(column => (
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
						<DrawerTitle>Team Request History</DrawerTitle>
						<DrawerDescription>Changes are shown from the most recent version to the earliest version.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
						{row == null ? (
							<p className="text-muted-foreground text-sm">No team request selected.</p>
						) : historyAccessQuery.isPending ? (
							<div className="space-y-2">
								<Skeleton className="h-28 w-full" />
								<Skeleton className="h-28 w-full" />
							</div>
						) : !canAccessHistory ? (
							<Alert variant="destructive">
								<CircleAlertIcon />
								<AlertTitle>Unauthorized</AlertTitle>
								<AlertDescription>You need Team Management auditor access to view history.</AlertDescription>
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
								<AlertDescription>Unable to load team request history.</AlertDescription>
							</Alert>
						) : historyQuery.data.entries.length == 0 ? (
							<p className="text-muted-foreground text-sm">No history entries found for this team request.</p>
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

			<RelationSummaryPickerDrawer
				isOpen={relationSummaryPickerOpen}
				onOpenChange={setRelationSummaryPickerOpen}
				picker={relationSummaryPicker}
				onOpenSummary={request => relationNavigation?.onOpenSummary(request)}
			/>
		</>
	);
}

type UseTeamCellRendererOptions = {
	relationValuesByRowId: Record<string, teamActions.TeamRelationValues>;
	isRelationLoading: boolean;
	relationNavigation?: TeamRelationNavigation;
	onOpenRequestChanges?: (row: TeamTableRow) => void;
};

export function useTeamCellRenderer({ relationValuesByRowId, isRelationLoading, relationNavigation, onOpenRequestChanges }: UseTeamCellRendererOptions) {
	const [relationSummaryPickerOpen, setRelationSummaryPickerOpen] = useState(false);
	const [relationSummaryPicker, setRelationSummaryPicker] = useState<RelationSummaryPickerState | null>(null);

	const openRelationSummary = useCallback((cellKey: string, normalizedValue: string, fallbackLabel: string, normalizedRelationIds: string[]) => {
		if(relationNavigation == null || normalizedRelationIds.length == 0)
			return;

		const normalizedDisplayTokens = normalizedValue
			.split(",")
			.map(token => token.trim())
			.filter(token => token.length > 0);
		const hasAlignedTokens = normalizedDisplayTokens.length == normalizedRelationIds.length;
		const choices = normalizedRelationIds.map((relationId, index) => {
			const title = normalizedRelationIds.length == 1 ? normalizedValue :
				hasAlignedTokens ? normalizedDisplayTokens[index] :
					`${fallbackLabel} ${index + 1}`;
			return {
				id: relationId,
				title: title.length > 0 ? title : relationId,
				description: `${fallbackLabel} user`,
				meta: [{ label: "User ID", value: relationId }]
			};
		});

		if(choices.length == 1) {
			const choice = choices[0];
			relationNavigation.onOpenSummary({
				type: "user",
				id: choice.id,
				fallbackTitle: choice.title,
				fallbackDescription: choice.description,
				fallbackMeta: choice.meta
			});
			return;
		}

		setRelationSummaryPicker({ cellKey, sectionLabel: fallbackLabel, choices });
		setRelationSummaryPickerOpen(true);
	}, [relationNavigation]);

	const relationSummaryPickerDrawer = (
		<RelationSummaryPickerDrawer
			isOpen={relationSummaryPickerOpen}
			onOpenChange={setRelationSummaryPickerOpen}
			picker={relationSummaryPicker}
			onOpenSummary={request => relationNavigation?.onOpenSummary(request)}
		/>
	);

	const result = useCallback((columnId: TeamTableColumnId, row: TeamTableRow) => {
		const resolvedValues = relationValuesByRowId[row.id] ?? {};
		switch(columnId) {
			case "id":
				return row.id;
			case "name":
				return row.name;
			case "supervisor":
				if(isRelationLoading && resolvedValues.supervisor == null)
					return <Skeleton className="h-4 w-28" />;
				return renderTeamRelationValue({ column: "supervisor", value: resolvedValues.supervisor ?? "-", relationIds: row.supervisorId != null ? [row.supervisorId] : [], stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId, rowId: row.id, relationNavigation, onOpenRelationSummary: openRelationSummary });
			case "officers":
				if(isRelationLoading && resolvedValues.officers == null)
					return <Skeleton className="h-4 w-36" />;
				return renderTeamRelationValue({ column: "officers", value: resolvedValues.officers ?? "-", relationIds: row.officerIds, stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId, rowId: row.id, relationNavigation, onOpenRelationSummary: openRelationSummary });
			case "createdBy":
				if(isRelationLoading && resolvedValues.createdBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderTeamRelationValue({ column: "createdBy", value: resolvedValues.createdBy ?? "-", relationIds: row.createdById != null ? [row.createdById] : [], stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId, rowId: row.id, relationNavigation, onOpenRelationSummary: openRelationSummary });
			case "updatedBy":
				if(isRelationLoading && resolvedValues.updatedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderTeamRelationValue({ column: "updatedBy", value: resolvedValues.updatedBy ?? "-", relationIds: row.updatedById != null ? [row.updatedById] : [], stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId, rowId: row.id, relationNavigation, onOpenRelationSummary: openRelationSummary });
			case "deletedBy":
				if(isRelationLoading && resolvedValues.deletedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return renderTeamRelationValue({ column: "deletedBy", value: resolvedValues.deletedBy ?? "-", relationIds: row.deletedById != null ? [row.deletedById] : [], stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId, rowId: row.id, relationNavigation, onOpenRelationSummary: openRelationSummary });
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
				return renderTeamRelationValue({ column: "reviewedBy", value: resolvedValues.reviewedBy ?? "-", relationIds: row.reviewedById != null ? [row.reviewedById] : [], stagedUserIdByUserId: resolvedValues.stagedUserIdByUserId, rowId: row.id, relationNavigation, onOpenRelationSummary: openRelationSummary });
			case "reviewApproved":
				return row.reviewApproved == null ? "-" : row.reviewApproved ? "True" : "False";
			case "reviewCommentText":
				return row.reviewCommentText.length > 0 ? row.reviewCommentText : "-";
			default:
				return "-";
		}
	}, [isRelationLoading, onOpenRequestChanges, openRelationSummary, relationNavigation, relationValuesByRowId]);
	const result2 = result as typeof result & { relationSummaryPickerDrawer: typeof relationSummaryPickerDrawer };
	result2.relationSummaryPickerDrawer = relationSummaryPickerDrawer;
	return result2;
}

export function useTeamColumnPreferences() {
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<TeamTableColumnId[]>(defaultTeamColumnOrder);
	const [hiddenColumnIds, setHiddenColumnIds] = useState<TeamTableColumnId[]>(defaultTeamHiddenColumns);
	const [draggedColumnId, setDraggedColumnId] = useState<TeamTableColumnId | null>(null);

	const columnById = useMemo(() => Object.fromEntries(
		teamTableColumns.map(column => [column.id, column])
	) as Record<TeamTableColumnId, TeamTableColumnConfig>, []);

	const orderedColumns = useMemo(() => {
		const normalizedOrder = [
			...columnOrder.filter(columnId => columnById[columnId] != null),
			...defaultTeamColumnOrder.filter(columnId => !columnOrder.includes(columnId))
		];
		return normalizedOrder.map(columnId => columnById[columnId]);
	}, [columnById, columnOrder]);

	const visibleColumns = useMemo(() => (
		orderedColumns.filter(column => !hiddenColumnIds.includes(column.id))
	), [hiddenColumnIds, orderedColumns]);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		const rawPreferences = window.localStorage.getItem(TEAM_COLUMN_PREFERENCES_KEY);
		if(rawPreferences == null)
			return;

		try {
			const parsed = JSON.parse(rawPreferences) as { order?: unknown, hidden?: unknown };
			const parsedOrder = Array.isArray(parsed.order) ? parsed.order.filter((value): value is TeamTableColumnId =>
				typeof value == "string" && defaultTeamColumnOrder.includes(value as TeamTableColumnId)
			) : [];
			const deduplicatedOrder = parsedOrder.filter((columnId, index) => parsedOrder.indexOf(columnId) == index);
			setColumnOrder([
				...deduplicatedOrder,
				...defaultTeamColumnOrder.filter(columnId => !deduplicatedOrder.includes(columnId))
			]);

			const parsedHidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((value): value is TeamTableColumnId =>
				typeof value == "string" && defaultTeamColumnOrder.includes(value as TeamTableColumnId)
			) : [];
			const deduplicatedHidden = parsedHidden.filter((columnId, index) => parsedHidden.indexOf(columnId) == index);
			setHiddenColumnIds(deduplicatedHidden.slice(0, Math.max(defaultTeamColumnOrder.length - 1, 0)));
		} catch{
			setColumnOrder(defaultTeamColumnOrder);
			setHiddenColumnIds(defaultTeamHiddenColumns);
		}
	}, []);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		window.localStorage.setItem(TEAM_COLUMN_PREFERENCES_KEY, JSON.stringify({
			order: columnOrder,
			hidden: hiddenColumnIds
		}));
	}, [columnOrder, hiddenColumnIds]);

	const toggleColumnVisibility = (columnId: TeamTableColumnId, checked: boolean) => {
		setHiddenColumnIds(previous => {
			const isHidden = previous.includes(columnId);
			if(checked)
				return isHidden ? previous.filter(value => value != columnId) : previous;
			if(isHidden)
				return previous;
			const visibleCount = teamTableColumns.length - previous.length;
			if(visibleCount <= 1)
				return previous;
			return [...previous, columnId];
		});
	};

	const resetColumnPreferences = () => {
		setColumnOrder(defaultTeamColumnOrder);
		setHiddenColumnIds(defaultTeamHiddenColumns);
	};

	const handleColumnDragStart = (columnId: TeamTableColumnId) => {
		setDraggedColumnId(columnId);
	};

	const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: TeamTableColumnId) => {
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

export function useTeamFilterColumnConfig() {
	const searchTeamOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const teams = await teamActions.searchTeamOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(teams.map(team => ({
			value: team.id,
			label: `${team.name} (${team.id})`,
			renderLabel: <span>{team.name} (<span className="font-mono">{team.id}</span>)</span>,
			keywords: `${team.id} ${team.name}`
		})));
	}, []);

	const searchSupervisorUserOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const users = await teamActions.searchTeamSupervisorUserOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(users.map(user => ({
			value: user.id,
			label: `${user.name} (${user.email})`,
			keywords: `${user.name} ${user.email}`
		})));
	}, []);

	const searchOfficerUserOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const users = await teamActions.searchTeamOfficerUserOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(users.map(user => ({
			value: user.id,
			label: `${user.name} (${user.email})`,
			keywords: `${user.name} ${user.email}`
		})));
	}, []);

	const searchAuditUserOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const users = await teamActions.searchTeamAuditUserOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(users.map(user => ({
			value: user.id,
			label: `${user.name} (${user.email})`,
			keywords: `${user.name} ${user.email}`
		})));
	}, []);

	const getResolvedFilterColumnConfig = useCallback((column: FilterColumn): FilterColumnOption => (
		getResolvedTeamFilterColumnConfig(column, [], [], [], [], searchTeamOptions, searchSupervisorUserOptions, searchOfficerUserOptions, searchAuditUserOptions)
	), [searchAuditUserOptions, searchOfficerUserOptions, searchSupervisorUserOptions, searchTeamOptions]);

	return {
		searchSupervisorUserOptions,
		searchOfficerUserOptions,
		getResolvedFilterColumnConfig
	};
}

type UseTeamManagementQueryStateOptions = {
	debounceMs?: number;
	defaultSortField?: SortField;
	defaultSortDirection?: SortDirection;
};

export function useTeamManagementQueryState({
	debounceMs = 250,
	defaultSortField = "updatedAt",
	defaultSortDirection = "desc"
}: UseTeamManagementQueryStateOptions = {}) {
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

type UseTeamRelationsOptions = {
	docs: TeamTableRow[];
	visibleColumns: TeamTableColumnConfig[];
};

export function useTeamRelations({ docs, visibleColumns }: UseTeamRelationsOptions) {
	const visibleRelationColumns = useMemo(() => (
		visibleColumns
			.map(column => column.id)
			.filter((columnId): columnId is TeamRelationColumn => teamRelationColumnSet.has(columnId as TeamRelationColumn))
	), [visibleColumns]);

	const relationRows = useMemo(() => docs.map(row => ({
		id: row.id,
		supervisorId: row.supervisorId,
		officerIds: row.officerIds,
		reviewedById: row.reviewedById,
		createdById: row.createdById,
		updatedById: row.updatedById,
		deletedById: row.deletedById
	})), [docs]);

	const relationsQuery = useQuery({
		queryKey: ["team-management", "relations", { rows: relationRows, columns: visibleRelationColumns }],
		enabled: relationRows.length > 0 && visibleRelationColumns.length > 0,
		queryFn: () => teamActions.resolveTeamRelationColumnsAction({
			rows: relationRows,
			columns: visibleRelationColumns
		}),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const relationValuesByRowId = useMemo(() => Object.fromEntries(
		(relationsQuery.data ?? []).map(item => [item.id, item.values])
	) as Record<string, teamActions.TeamRelationValues>, [relationsQuery.data]);
	const isRelationLoading = relationsQuery.isPending || relationsQuery.isFetching;

	return {
		relationValuesByRowId,
		isRelationLoading
	};
}

type UseTeamRequestFiltersOptions = {
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption;
};

export type UseTeamRequestFiltersResult = {
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
		__teamDashboardFilters?: string;
	}
}

export function useTeamRequestFilters({ getResolvedFilterColumnConfig }: UseTeamRequestFiltersOptions): UseTeamRequestFiltersResult {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const searchParamsKey = searchParams.toString();
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters0] = useState<FilterCondition[]>([]);
	const setFilters = useCallback((v: FilterCondition[] | ((o: FilterCondition[]) => FilterCondition[])) => {
		if(typeof v != "function") {
			window.__teamDashboardFilters = JSON.stringify(v);
			setFilters0(v);
			return;
		}
		setFilters0(o => {
			const n = v(o);
			window.__teamDashboardFilters = JSON.stringify(n);
			return n;
		});
	}, [setFilters0]);
	const [isFilterStateHydrated, setIsFilterStateHydrated] = useState(false);

	useEffect(() => {
		const nextSearchParams = new URLSearchParams(searchParamsKey);
		const pendingNavigation = consumePendingRelationFilterNavigation("team-management");
		const relationFilters = pendingNavigation?.relationFiltersJson ?? nextSearchParams.get(RELATION_FILTER_QUERY_PARAM) ?? window.__teamDashboardFilters ?? null;
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
		setFilters(previous => [...previous, createFilterCondition(teamFilterColumns[0].value)]);
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

type TeamQueryActionInput = Parameters<typeof import("./layout.actions").queryTeamsEditorAction>[0];

type UseTeamRequestsQueryOptions = {
	queryScope: string;
	queryAction: (input: TeamQueryActionInput) => Promise<QueryTeamsOutput>;
	debouncedKeyword: string;
	sortTokens: string[];
	appliedFilters: FilterInput[];
	isFilterStateReady: boolean;
	includeSoftDeleted: boolean;
};

export function useTeamRequestsQuery({
	queryScope,
	queryAction,
	debouncedKeyword,
	sortTokens,
	appliedFilters,
	isFilterStateReady,
	includeSoftDeleted
}: UseTeamRequestsQueryOptions) {
	const [pageIndex, setPageIndex] = useState(1);

	const teamsQuery = useQuery({
		enabled: isFilterStateReady,
		queryKey: ["team-management", "teams", {
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
		if(teamsQuery.data == null || teamsQuery.isFetching)
			return;
		if(teamsQuery.data.page != pageIndex)
			setPageIndex(teamsQuery.data.page);
	}, [pageIndex, teamsQuery.data, teamsQuery.isFetching]);

	const queryResult = teamsQuery.data ?? emptyQueryResult;
	const isLoading = !isFilterStateReady || teamsQuery.isPending;
	const queryErrorMessage = teamsQuery.error instanceof Error ? teamsQuery.error.message : teamsQuery.error != null ? "Failed to load team requests." : null;

	return {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	};
}
