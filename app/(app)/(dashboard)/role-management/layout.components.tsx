"use client";

import { useMemo, useState, useEffect, useCallback, type DragEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { XIcon, PlusIcon, CheckIcon, ArrowUpIcon, CalendarIcon, ArrowDownIcon, ArrowUpDownIcon, CircleAlertIcon, GripVerticalIcon } from "lucide-react";

import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
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

import * as roleActions from "./layout.actions";

export const PAGE_SIZE = 20;

export type SortDirection = "asc" | "desc";
export type SortField = roleActions.RoleManagementSortField;
export type FilterColumn = roleActions.RoleManagementFilterColumn;
export type FilterOperator = roleActions.RoleManagementFilterOperator;
export type FilterCombinator = roleActions.RoleManagementFilterCombinator;
export type FilterInput = roleActions.RoleManagementFilterInput;
export type QueryRolesOutput = Awaited<ReturnType<typeof roleActions.queryRolesAction>>;
export type RoleTableRow = QueryRolesOutput["docs"][number];
export type RoleManagementTabMode = "viewer" | Parameters<typeof roleActions.queryRolesAction>[0]["mode"];
export type RoleRelationColumn = roleActions.RoleRelationColumn;
export type RoleRequestReviewDiff = Awaited<ReturnType<typeof roleActions.getRoleRequestReviewDiffAction>>;
export type RoleLevel = roleActions.RoleLevel;
export type RoleMenu = roleActions.RoleMenu;
export type FilterValueType = "text" | "date" | "select" | "boolean";
export type FilterSelectSearchAction = (keyword: string) => Promise<SearchableSelectOption[]>;
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

export type FilterDraft = {
	id: string;
	column: FilterColumn;
	operator: FilterOperator;
	value: string;
	values: string[];
	existsValue: "true" | "false";
	dateValue: Date | null;
	listDateValue: Date | null;
	dateText: string;
	listDateText: string;
};

export type RoleTableColumnId = "name" |
	"level" |
	"menus" |
	"createdBy" |
	"updatedBy" |
	"deletedBy" |
	"createdAt" |
	"updatedAt" |
	"deletedAt" |
	"requestType" |
	"status" |
	"reviewedAt" |
	"reviewedByName" |
	"reviewApproved" |
	"reviewCommentText";

export type RoleTableColumnConfig = {
	id: RoleTableColumnId;
	label: string;
	sortField?: SortField;
	headClassName?: string;
	cellClassName?: string;
};

export type FormState = {
	roleId?: string;
	name: string;
	level: RoleLevel;
	menus: RoleMenu[];
};

export type FilterSummaryItem = {
	id: string;
	combinator: string | null;
	columnLabel: string;
	operatorLabel: string;
	valueLabel: string;
};

export const roleLevelOptions: Array<{ value: RoleLevel, label: string }> = [
	{ value: "admin", label: "Admin" },
	{ value: "manager", label: "Manager" },
	{ value: "supervisor", label: "Supervisor" },
	{ value: "officer", label: "Officer" }
];

export const roleMenuOptions: Array<{ value: RoleMenu, label: string }> = [
	{ value: "user-management-viewer", label: "User Management - Viewer" },
	{ value: "user-management-editor", label: "User Management - Editor" },
	{ value: "user-management-approver", label: "User Management - Approver" },
	{ value: "role-management-viewer", label: "Role Management - Viewer" },
	{ value: "role-management-editor", label: "Role Management - Editor" },
	{ value: "role-management-approver", label: "Role Management - Approver" },
	{ value: "team-management-viewer", label: "Team Management - Viewer" },
	{ value: "team-management-editor", label: "Team Management - Editor" },
	{ value: "team-management-approver", label: "Team Management - Approver" }
];

export const emptyQueryResult: QueryRolesOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};

export const defaultFormState: FormState = {
	name: "",
	level: "officer",
	menus: []
};

export const ROLE_COLUMN_PREFERENCES_KEY = "role-management-columns-v1";
export const ROLE_FILTER_PREFERENCES_KEY = "role-management-filters-v1";

export const roleTableColumns: RoleTableColumnConfig[] = [
	{ id: "name", label: "Name", sortField: "name", cellClassName: "font-medium" },
	{ id: "level", label: "Level", sortField: "level" },
	{ id: "menus", label: "Menus", sortField: "menus", cellClassName: "max-w-[360px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ id: "createdBy", label: "Created By" },
	{ id: "updatedBy", label: "Updated By" },
	{ id: "deletedBy", label: "Deleted By" },
	{ id: "createdAt", label: "Created", sortField: "createdAt" },
	{ id: "updatedAt", label: "Updated", sortField: "updatedAt" },
	{ id: "deletedAt", label: "Deleted", sortField: "deletedAt" },
	{ id: "requestType", label: "Request", sortField: "requestType" },
	{ id: "status", label: "Status", sortField: "status" },
	{ id: "reviewedAt", label: "Reviewed At", sortField: "reviewedAt" },
	{ id: "reviewedByName", label: "Reviewed By", sortField: "reviewedByName" },
	{ id: "reviewApproved", label: "Review Approved", sortField: "reviewApproved" },
	{ id: "reviewCommentText", label: "Review Comment", sortField: "reviewCommentText", cellClassName: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" }
];

export const defaultRoleColumnOrder: RoleTableColumnId[] = roleTableColumns.map(column => column.id);
export const defaultRoleVisibleColumns: RoleTableColumnId[] = ["name", "level", "menus", "requestType", "status", "updatedAt", "reviewCommentText"];
export const defaultRoleHiddenColumns: RoleTableColumnId[] = defaultRoleColumnOrder.filter(columnId => !defaultRoleVisibleColumns.includes(columnId));

export const roleRelationColumnSet = new Set<RoleRelationColumn>([
	"reviewedByName",
	"createdBy",
	"updatedBy",
	"deletedBy"
]);

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

export const roleFilterColumns: FilterColumnOption[] = [
	{ value: "name", label: "Name", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter role name" },
	{ value: "level", label: "Level", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: roleLevelOptions.map(option => ({ value: option.value, label: option.label })) },
	{ value: "menus", label: "Menus", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: roleMenuOptions.map(option => ({ value: option.value, label: option.label })) },
	{ value: "createdAt", label: "Created At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "createdBy", label: "Created By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "updatedAt", label: "Updated At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "updatedBy", label: "Updated By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "deletedAt", label: "Deleted At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "deletedBy", label: "Deleted By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
	{ value: "reviewedAt", label: "Reviewed At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "reviewedBy", label: "Reviewed By", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
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
	return roleFilterColumns.find(option => option.value == column) ?? roleFilterColumns[0];
}

export function getResolvedRoleFilterColumnConfig(
	column: FilterColumn,
	reviewedBySelectOptions: Array<{ value: string, label: string }>,
	searchReviewedByOptions?: FilterSelectSearchAction
): FilterColumnOption {
	const config = getFilterColumnConfig(column);
	switch(column) {
		case "createdBy":
		case "updatedBy":
		case "deletedBy":
		case "reviewedBy":
			return {
				...config,
				selectOptions: reviewedBySelectOptions,
				searchOptionsAction: searchReviewedByOptions
			};
		default:
			return config;
	}
}

export function createFilterDraft(column: FilterColumn = roleFilterColumns[0].value): FilterDraft {
	const columnConfig = getFilterColumnConfig(column);
	return {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
		column,
		operator: columnConfig.operators[0],
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

export function getReviewStatus(row: RoleTableRow): { label: string, variant: "default" | "secondary" | "destructive" } {
	if(row.reviewedAt == null)
		return { label: "Pending", variant: "secondary" };
	if(row.reviewApproved == true)
		return { label: "Approved", variant: "default" };
	return { label: "Rejected", variant: "destructive" };
}

export function reorderColumns(order: RoleTableColumnId[], sourceId: RoleTableColumnId, targetId: RoleTableColumnId): RoleTableColumnId[] {
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

export function serializeFilterDraftForStorage(draft: FilterDraft) {
	return {
		...draft,
		dateValue: draft.dateValue?.toISOString() ?? null,
		listDateValue: draft.listDateValue?.toISOString() ?? null
	};
}

export function parseStoredFilterDraft(rawDraft: unknown): FilterDraft | null {
	if(rawDraft == null || typeof rawDraft != "object")
		return null;

	const candidate = rawDraft as Partial<{
		id: string;
		column: FilterColumn;
		operator: FilterOperator;
		value: string;
		values: string[];
		existsValue: "true" | "false";
		dateValue: string | null;
		listDateValue: string | null;
		dateText: string;
		listDateText: string;
	}>;

	const column = typeof candidate.column == "string" ? candidate.column : roleFilterColumns[0].value;
	const columnConfig = getFilterColumnConfig(column);
	const operator = typeof candidate.operator == "string" && columnConfig.operators.includes(candidate.operator) ? candidate.operator : columnConfig.operators[0];
	const parsedDateValue = typeof candidate.dateValue == "string" ? parseFilterDateValue(candidate.dateValue) : null;
	const parsedListDateValue = typeof candidate.listDateValue == "string" ? parseFilterDateValue(candidate.listDateValue) : null;

	return {
		id: typeof candidate.id == "string" && candidate.id.length > 0 ? candidate.id : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
		column,
		operator,
		value: typeof candidate.value == "string" ? candidate.value : "",
		values: Array.isArray(candidate.values) ? candidate.values.filter((value): value is string => typeof value == "string") : [],
		existsValue: candidate.existsValue == "false" ? "false" : "true",
		dateValue: parsedDateValue,
		listDateValue: parsedListDateValue,
		dateText: typeof candidate.dateText == "string" ? candidate.dateText : formatFilterDateOnlyInput(parsedDateValue),
		listDateText: typeof candidate.listDateText == "string" ? candidate.listDateText : formatFilterDateOnlyInput(parsedListDateValue)
	};
}

type RoleActiveFiltersSummaryProps = {
	items: FilterSummaryItem[];
};

export function RoleActiveFiltersSummary({ items }: RoleActiveFiltersSummaryProps) {
	if(items.length == 0)
		return null;

	return (
		<div className="rounded-lg border border-dashed px-3 py-2 text-xs">
			<p className="text-muted-foreground font-medium">Active filters</p>
			<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
				{items.map(item => (
					<span key={item.id} className="inline-flex items-center gap-1.5">
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

type RoleColumnConfigCardProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	orderedColumns: RoleTableColumnConfig[];
	hiddenColumnIds: RoleTableColumnId[];
	visibleColumnCount: number;
	onToggleColumnVisibility: (columnId: RoleTableColumnId, checked: boolean) => void;
	onReset: () => void;
	onColumnDragStart: (columnId: RoleTableColumnId) => void;
	onColumnDragOver: (event: DragEvent<HTMLDivElement>, targetColumnId: RoleTableColumnId) => void;
	onColumnDragEnd: () => void;
};

export function RoleColumnConfigCard({
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
}: RoleColumnConfigCardProps) {
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
							<p className="text-muted-foreground text-sm">Visible {visibleColumnCount} of {roleTableColumns.length}</p>
							<Button type="button" variant="outline" size="sm" onClick={onReset}>Reset</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{orderedColumns.map(column => {
							const isVisible = !hiddenColumnIds.includes(column.id);
							const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= roleTableColumns.length - 1;
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

type RoleRequestDeleteDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isMutating: boolean;
};

export function RoleRequestDeleteDialog({
	open,
	onOpenChange,
	onConfirm,
	isMutating
}: RoleRequestDeleteDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Request Delete</AlertDialogTitle>
					<AlertDialogDescription>
						Delete does not hard-delete data. It creates a pending delete request by setting deletedAt, and requires approver review.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isMutating}>Request Delete</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

type RoleRequestFilterCardProps = {
	isLoading: boolean;
	isMutating: boolean;
	filters: UseRoleRequestFiltersResult;
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption;
};

export function RoleRequestFilterCard({
	isLoading,
	isMutating,
	filters,
	getResolvedFilterColumnConfig
}: RoleRequestFilterCardProps) {
	return (
		<Collapsible open={filters.isFilterOpen} onOpenChange={filters.setIsFilterOpen}>
			<CollapsibleContent>
				<div className="space-y-3 rounded-xl border p-4">
					<div className="flex items-center justify-between gap-2">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Filter Role Requests</h3>
							<p className="text-muted-foreground text-sm">Build multiple filters and combine them with AND or OR.</p>
						</div>
						{filters.appliedFilters.length > 0 ? (
							<Button type="button" variant="outline" size="sm" onClick={filters.clearFilter} disabled={isLoading || isMutating}>Clear Filter</Button>
						) : null}
					</div>
					{filters.filterDrafts.map((draft, index) => {
						const columnConfig = getResolvedFilterColumnConfig(draft.column);
						const isListOperator = draft.operator == "in" || draft.operator == "not_in";

						return (
							<div key={draft.id} className="space-y-3">
								{index > 0 ? (
									<div className="rounded-lg border border-dashed p-2">
										<label className="text-sm font-medium">Combinator with previous filter</label>
										<Select
											value={filters.filterDraftCombinators[index - 1] ?? defaultFilterCombinator}
											onValueChange={value => filters.updateFilterCombinator(index - 1, value as FilterCombinator)}
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
										<Button type="button" variant="ghost" size="sm" onClick={() => filters.removeFilterDraft(draft.id)} disabled={isMutating}>
											<XIcon />
											Remove
										</Button>
									</div>
									<div className="grid gap-3 sm:grid-cols-2">
										<div className="space-y-2">
											<label className="text-sm font-medium">Column</label>
											<Select value={draft.column} onValueChange={value => filters.handleFilterColumnChange(draft.id, value as FilterColumn)}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select column" /></SelectTrigger>
												<SelectContent>
													{roleFilterColumns.map(column => (
														<SelectItem key={column.value} value={column.value}>{column.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium">Operator</label>
											<Select value={draft.operator} onValueChange={value => filters.handleFilterOperatorChange(draft.id, value as FilterColumnOption["operators"][number])}>
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
										{draft.operator == "exists" ? (
											<Select value={draft.existsValue} onValueChange={value => filters.updateFilterDraft(draft.id, previous => ({ ...previous, existsValue: value as "true" | "false" }))}>
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
													<Button type="button" variant="outline" onClick={() => filters.addFilterListValue(draft.id)}><PlusIcon />Add Value</Button>
												</div>
												{draft.values.length == 0 ? (
													<p className="text-muted-foreground text-xs">Click Add Value to create rows.</p>
												) : (
													<div className="space-y-2">
														{draft.values.map((value, valueIndex) => {
															const listDate = columnConfig.valueType == "date" ? splitFilterDateValue(value) : null;
															return (
																<div key={`${draft.id}-${valueIndex}`} className="flex items-start gap-2">
																	{columnConfig.valueType == "boolean" ? (
																		<Select value={value.length > 0 ? value : "true"} onValueChange={nextValue => filters.updateFilterListValue(draft.id, valueIndex, nextValue)}>
																			<SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
																			<SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
																		</Select>
																	) : columnConfig.valueType == "select" ? (
																		<SearchableSelect
																			value={value.length > 0 ? value : (columnConfig.selectOptions?.[0]?.value ?? "")}
																			onValueChange={nextValue => filters.updateFilterListValue(draft.id, valueIndex, nextValue)}
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
																						onChange={event => filters.updateFilterListValue(draft.id, valueIndex, buildFilterDateValue(event.target.value, listDate?.timeText ?? "00:00"))}
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
																						onSelect={date => filters.updateFilterListValue(draft.id, valueIndex, date == null ? "" : buildFilterDateValue(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`, listDate?.timeText ?? "00:00"))}
																					/>
																				</PopoverContent>
																			</Popover>
																			<Input type="time" value={listDate?.timeText ?? "00:00"} onChange={event => filters.updateFilterListValue(draft.id, valueIndex, buildFilterDateValue(listDate?.dateText ?? "", event.target.value))} />
																		</div>
																	) : (
																		<Input value={value} onChange={event => filters.updateFilterListValue(draft.id, valueIndex, event.target.value)} placeholder={columnConfig.placeholder ?? "Enter value"} className="flex-1" />
																	)}
																	<Button type="button" variant="outline" onClick={() => filters.removeFilterListValue(draft.id, valueIndex)} className="shrink-0"><XIcon />Remove</Button>
																</div>
															);
														})}
													</div>
												)}
											</div>
										) : columnConfig.valueType == "select" ? (
											<SearchableSelect
												value={draft.value.length > 0 ? draft.value : ""}
												onValueChange={value => filters.updateFilterDraft(draft.id, previous => ({ ...previous, value }))}
												options={(columnConfig.selectOptions ?? []).map(option => ({ value: option.value, label: option.label }))}
												onSearch={columnConfig.searchOptionsAction}
												placeholder="Select value"
												searchPlaceholder="Type to filter values"
											/>
										) : columnConfig.valueType == "boolean" ? (
											<Select value={draft.value.length > 0 ? draft.value : ""} onValueChange={value => filters.updateFilterDraft(draft.id, previous => ({ ...previous, value }))}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
												<SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
											</Select>
										) : columnConfig.valueType == "date" ? (
											<div className="grid grid-cols-2 gap-2">
												<Popover>
													<InputGroup>
														<InputGroupInput
															value={draft.dateText}
															onChange={event => filters.updateFilterDraft(draft.id, previous => {
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
															selected={draft.dateValue ?? parseFilterDateOnlyValue(draft.dateText) ?? undefined}
															onSelect={date => filters.updateFilterDraft(draft.id, previous => {
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
													value={getFilterTimeInput(draft.dateValue)}
													onChange={event => filters.updateFilterDraft(draft.id, previous => {
														const baseDate = previous.dateValue ?? parseFilterDateOnlyValue(previous.dateText);
														if(baseDate == null)
															return previous;
														const nextDate = applyTimeToDate(baseDate, event.target.value);
														return { ...previous, dateValue: nextDate, dateText: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}` };
													})}
												/>
											</div>
										) : (
											<Input value={draft.value} onChange={event => filters.updateFilterDraft(draft.id, previous => ({ ...previous, value: event.target.value }))} placeholder={columnConfig.placeholder ?? "Enter value"} />
										)}
									</div>
								</div>
							</div>
						);
					})}

					<Button type="button" variant="outline" onClick={filters.addFilterDraft} disabled={isMutating}>
						<PlusIcon />
						Add Filter
					</Button>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

type RoleRequestFormDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formState: FormState;
	formError: { title: string, message: string } | null;
	selectedMenuLabels: string[];
	isMutating: boolean;
	onNameChange: (value: string) => void;
	onLevelChange: (value: RoleLevel) => void;
	onToggleMenu: (menu: RoleMenu) => void;
	onSubmit: () => void;
};

export function RoleRequestFormDrawer({
	open,
	onOpenChange,
	formState,
	formError,
	selectedMenuLabels,
	isMutating,
	onNameChange,
	onLevelChange,
	onToggleMenu,
	onSubmit
}: RoleRequestFormDrawerProps) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>{formState.roleId == null ? "Add Role Request" : "Edit Role Request"}</DrawerTitle>
					<DrawerDescription>Changes in editor mode create pending role requests that require approver review before publication.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4">
					<div className="grid gap-3 pb-4 sm:grid-cols-2">
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Role Name</label>
							<Input value={formState.name} onChange={event => onNameChange(event.target.value)} placeholder="Credit Approval Supervisor" />
						</div>
						<div className="space-y-2 sm:col-span-2">
							<label className="text-sm font-medium">Level</label>
							<Select value={formState.level} onValueChange={value => onLevelChange(value as RoleLevel)}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select level" />
								</SelectTrigger>
								<SelectContent>
									{roleLevelOptions.map(option => (
										<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2 sm:col-span-2">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium">Menus</label>
								<Badge variant="outline">{formState.menus.length} selected</Badge>
							</div>
							<div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border p-2">
								{roleMenuOptions.map(menu => {
									const selected = formState.menus.includes(menu.value);
									return (
										<Button
											key={menu.value}
											type="button"
											variant={selected ? "secondary" : "outline"}
											onClick={() => onToggleMenu(menu.value)}
											className="h-auto w-full justify-between py-2"
										>
											<span className="text-left text-sm">{menu.label}</span>
											{selected ? <CheckIcon className="size-4" /> : null}
										</Button>
									);
								})}
							</div>
							<p className="text-muted-foreground text-xs">{selectedMenuLabels.length > 0 ? selectedMenuLabels.join(", ") : "No menu selected."}</p>
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
					<Button type="button" onClick={onSubmit} disabled={isMutating}>Save Request</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

type RoleRequestReviewDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reviewDrawerState: { row: RoleTableRow, diff: RoleRequestReviewDiff | null } | null;
	reviewError: { title: string, message: string } | null;
	isReviewDiffLoading: boolean;
	reviewReason: string;
	onReviewReasonChange: (value: string) => void;
	onApprove: () => void;
	onReject: () => void;
	isMutating: boolean;
};

export function RoleRequestReviewDrawer({
	open,
	onOpenChange,
	reviewDrawerState,
	reviewError,
	isReviewDiffLoading,
	reviewReason,
	onReviewReasonChange,
	onApprove,
	onReject,
	isMutating
}: RoleRequestReviewDrawerProps) {
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
					<DrawerTitle>Review Request</DrawerTitle>
					<DrawerDescription>Review the differences between the last approved version and the current pending request before making a decision.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
					<div className="bg-muted/30 rounded-lg border p-3 text-sm">
						<p>
							<span className="font-medium">Request Type:</span> {reviewDrawerState?.diff?.requestType ?? "-"}
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
											<div className="bg-muted/50 min-h-9 rounded border px-2 py-1.5 text-sm wrap-break-word">{item.previousValue}</div>
										</div>
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Requested</p>
											<div className="bg-muted/10 min-h-9 rounded border px-2 py-1.5 text-sm wrap-break-word">{item.requestedValue}</div>
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
	);
}

type RoleRequestsTableProps = {
	queryResult: QueryRolesOutput;
	visibleColumns: RoleTableColumnConfig[];
	visibleColumnCount: number;
	isLoading: boolean;
	isMutating: boolean;
	getSortDirection: (field: SortField) => SortDirection | null;
	onToggleSortField: (field: SortField) => void;
	renderRoleCell: (columnId: RoleTableColumnConfig["id"], row: RoleTableRow) => ReactNode;
	renderActions: (row: RoleTableRow) => ReactNode;
};

export function RoleRequestsTable({
	queryResult,
	visibleColumns,
	visibleColumnCount,
	isLoading,
	isMutating,
	getSortDirection,
	onToggleSortField,
	renderRoleCell,
	renderActions
}: RoleRequestsTableProps) {
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
						<TableHead className="w-65">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						<TableRow>
							<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">Loading role requests...</TableCell>
						</TableRow>
					) : null}
					{!isLoading && queryResult.docs.length == 0 ? (
						<TableRow>
							<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">No role requests found.</TableCell>
						</TableRow>
					) : null}
					{queryResult.docs.map(row => {
						return (
							<TableRow key={row.id}>
								{visibleColumns.map(column => (
									<TableCell key={`${row.id}-${column.id}`} className={column.cellClassName}>
										{renderRoleCell(column.id, row)}
									</TableCell>
								))}
								<TableCell>
									<div className="flex flex-wrap gap-2">
										{renderActions(row)}
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

type UseRoleCellRendererOptions = {
	relationValuesByRowId: Record<string, Partial<Record<RoleRelationColumn, string>>>;
	isRelationLoading: boolean;
};

export function useRoleCellRenderer({ relationValuesByRowId, isRelationLoading }: UseRoleCellRendererOptions) {
	return useCallback((columnId: RoleTableColumnId, row: RoleTableRow) => {
		const resolvedValues = relationValuesByRowId[row.id] ?? {};
		switch(columnId) {
			case "name":
				return row.name;
			case "level":
				return roleLevelOptions.find(option => option.value == row.level)?.label ?? row.level;
			case "menus": {
				if(row.menus.length == 0)
					return "-";
				const labels = row.menus.map(menu => roleMenuOptions.find(option => option.value == menu)?.label ?? menu);
				return labels.join(", ");
			}
			case "createdBy":
				if(isRelationLoading && resolvedValues.createdBy == null)
					return <Skeleton className="h-4 w-28" />;
				return resolvedValues.createdBy ?? row.createdBy;
			case "updatedBy":
				if(isRelationLoading && resolvedValues.updatedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return resolvedValues.updatedBy ?? row.updatedBy;
			case "deletedBy":
				if(isRelationLoading && resolvedValues.deletedBy == null)
					return <Skeleton className="h-4 w-28" />;
				return resolvedValues.deletedBy ?? row.deletedBy;
			case "createdAt":
				return formatDateTime(row.createdAt);
			case "updatedAt":
				return formatDateTime(row.updatedAt);
			case "deletedAt":
				return formatDateTime(row.deletedAt);
			case "requestType":
				return row.requestType;
			case "status": {
				const status = getReviewStatus(row);
				return <Badge variant={status.variant}>{status.label}</Badge>;
			}
			case "reviewedAt":
				return formatDateTime(row.reviewedAt);
			case "reviewedByName":
				if(isRelationLoading && resolvedValues.reviewedByName == null)
					return <Skeleton className="h-4 w-28" />;
				return resolvedValues.reviewedByName ?? row.reviewedByName ?? "-";
			case "reviewApproved":
				return row.reviewApproved == null ? "-" : row.reviewApproved ? "True" : "False";
			case "reviewCommentText":
				return row.reviewCommentText.length > 0 ? row.reviewCommentText : "-";
			default:
				return "-";
		}
	}, [isRelationLoading, relationValuesByRowId]);
}

export function useRoleColumnPreferences() {
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<RoleTableColumnId[]>(defaultRoleColumnOrder);
	const [hiddenColumnIds, setHiddenColumnIds] = useState<RoleTableColumnId[]>(defaultRoleHiddenColumns);
	const [draggedColumnId, setDraggedColumnId] = useState<RoleTableColumnId | null>(null);

	const columnById = useMemo(() => Object.fromEntries(
		roleTableColumns.map(column => [column.id, column])
	) as Record<RoleTableColumnId, RoleTableColumnConfig>, []);

	const orderedColumns = useMemo(() => {
		const normalizedOrder = [
			...columnOrder.filter(columnId => columnById[columnId] != null),
			...defaultRoleColumnOrder.filter(columnId => !columnOrder.includes(columnId))
		];
		return normalizedOrder.map(columnId => columnById[columnId]);
	}, [columnById, columnOrder]);

	const visibleColumns = useMemo(() => (
		orderedColumns.filter(column => !hiddenColumnIds.includes(column.id))
	), [hiddenColumnIds, orderedColumns]);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		const rawPreferences = window.localStorage.getItem(ROLE_COLUMN_PREFERENCES_KEY);
		if(rawPreferences == null)
			return;

		try {
			const parsed = JSON.parse(rawPreferences) as { order?: unknown, hidden?: unknown };
			const parsedOrder = Array.isArray(parsed.order) ? parsed.order.filter((value): value is RoleTableColumnId =>
				typeof value == "string" && defaultRoleColumnOrder.includes(value as RoleTableColumnId)
			) : [];
			const deduplicatedOrder = parsedOrder.filter((columnId, index) => parsedOrder.indexOf(columnId) == index);
			setColumnOrder([
				...deduplicatedOrder,
				...defaultRoleColumnOrder.filter(columnId => !deduplicatedOrder.includes(columnId))
			]);

			const parsedHidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((value): value is RoleTableColumnId =>
				typeof value == "string" && defaultRoleColumnOrder.includes(value as RoleTableColumnId)
			) : [];
			const deduplicatedHidden = parsedHidden.filter((columnId, index) => parsedHidden.indexOf(columnId) == index);
			setHiddenColumnIds(deduplicatedHidden.slice(0, Math.max(defaultRoleColumnOrder.length - 1, 0)));
		} catch{
			setColumnOrder(defaultRoleColumnOrder);
			setHiddenColumnIds(defaultRoleHiddenColumns);
		}
	}, []);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		window.localStorage.setItem(ROLE_COLUMN_PREFERENCES_KEY, JSON.stringify({
			order: columnOrder,
			hidden: hiddenColumnIds
		}));
	}, [columnOrder, hiddenColumnIds]);

	const toggleColumnVisibility = (columnId: RoleTableColumnId, checked: boolean) => {
		setHiddenColumnIds(previous => {
			const isHidden = previous.includes(columnId);
			if(checked)
				return isHidden ? previous.filter(value => value != columnId) : previous;
			if(isHidden)
				return previous;
			const visibleCount = roleTableColumns.length - previous.length;
			if(visibleCount <= 1)
				return previous;
			return [...previous, columnId];
		});
	};

	const resetColumnPreferences = () => {
		setColumnOrder(defaultRoleColumnOrder);
		setHiddenColumnIds(defaultRoleHiddenColumns);
	};

	const handleColumnDragStart = (columnId: RoleTableColumnId) => {
		setDraggedColumnId(columnId);
	};

	const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: RoleTableColumnId) => {
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

export function useRoleFilterColumnConfig() {
	const searchReviewerOptions = useCallback(async (keyword: string): Promise<SearchableSelectOption[]> => {
		const users = await roleActions.searchRoleFilterUsersAction(keyword);
		return dedupeSelectOptions(users.map(user => ({
			value: user.id,
			label: `${user.name} (${user.email})`,
			keywords: `${user.name} ${user.email}`
		})));
	}, []);

	const getResolvedFilterColumnConfig = useCallback((column: FilterColumn): FilterColumnOption => (
		getResolvedRoleFilterColumnConfig(column, [], searchReviewerOptions)
	), [searchReviewerOptions]);

	return {
		getResolvedFilterColumnConfig
	};
}

type UseRoleManagementQueryStateOptions = {
	debounceMs?: number;
	defaultSortField?: SortField;
	defaultSortDirection?: SortDirection;
};

export function useRoleManagementQueryState({
	debounceMs = 250,
	defaultSortField = "updatedAt",
	defaultSortDirection = "desc"
}: UseRoleManagementQueryStateOptions = {}) {
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

type UseRoleRelationsOptions = {
	docs: RoleTableRow[];
	visibleColumns: RoleTableColumnConfig[];
};

export function useRoleRelations({ docs, visibleColumns }: UseRoleRelationsOptions) {
	const visibleRelationColumns = useMemo(() => (
		visibleColumns
			.map(column => column.id)
			.filter((columnId): columnId is RoleRelationColumn => roleRelationColumnSet.has(columnId as RoleRelationColumn))
	), [visibleColumns]);

	const relationRows = useMemo(() => docs.map(row => ({
		id: row.id,
		reviewedById: row.reviewedById,
		createdById: row.createdById,
		updatedById: row.updatedById,
		deletedById: row.deletedById
	})), [docs]);

	const relationsQuery = useQuery({
		queryKey: ["role-management", "relations", { rows: relationRows, columns: visibleRelationColumns }],
		enabled: relationRows.length > 0 && visibleRelationColumns.length > 0,
		queryFn: () => roleActions.resolveRoleRelationColumnsAction({
			rows: relationRows,
			columns: visibleRelationColumns
		}),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const relationValuesByRowId = useMemo(() => Object.fromEntries(
		(relationsQuery.data ?? []).map(item => [item.id, item.values])
	) as Record<string, Partial<Record<RoleRelationColumn, string>>>, [relationsQuery.data]);
	const isRelationLoading = relationsQuery.isPending || relationsQuery.isFetching;

	return {
		relationValuesByRowId,
		isRelationLoading
	};
}

type UseRoleRequestFiltersOptions = {
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption;
};

export type UseRoleRequestFiltersResult = {
	isFilterOpen: boolean;
	setIsFilterOpen: (open: boolean) => void;
	toggleFilterPanel: () => void;
	clearFilter: () => void;
	appliedFilters: FilterInput[];
	filterSummaryItems: FilterSummaryItem[];
	filterDrafts: FilterDraft[];
	filterDraftCombinators: FilterCombinator[];
	updateFilterCombinator: (index: number, combinator: FilterCombinator) => void;
	updateFilterDraft: (id: string, updater: (draft: FilterDraft) => FilterDraft) => void;
	handleFilterColumnChange: (id: string, column: FilterColumn) => void;
	handleFilterOperatorChange: (id: string, operator: FilterColumnOption["operators"][number]) => void;
	addFilterDraft: () => void;
	removeFilterDraft: (id: string) => void;
	addFilterListValue: (id: string) => void;
	updateFilterListValue: (id: string, valueIndex: number, nextValue: string) => void;
	removeFilterListValue: (id: string, valueIndex: number) => void;
};

export function useRoleRequestFilters({ getResolvedFilterColumnConfig }: UseRoleRequestFiltersOptions): UseRoleRequestFiltersResult {
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filterDrafts, setFilterDrafts] = useState<FilterDraft[]>([]);
	const [filterDraftCombinators, setFilterDraftCombinators] = useState<FilterCombinator[]>([]);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		const rawFilters = window.localStorage.getItem(ROLE_FILTER_PREFERENCES_KEY);
		if(rawFilters == null)
			return;

		try {
			const parsed = JSON.parse(rawFilters) as { drafts?: unknown, combinators?: unknown };
			const restoredDrafts = Array.isArray(parsed.drafts) ? parsed.drafts
				.map(parseStoredFilterDraft)
				.filter((draft): draft is FilterDraft => draft != null) : [];

			const restoredCombinators = Array.isArray(parsed.combinators) ? parsed.combinators
				.filter((value): value is FilterCombinator => value == "and" || value == "or") : [];

			if(restoredDrafts.length == 0) {
				setFilterDrafts([]);
				setFilterDraftCombinators([]);
				return;
			}

			setFilterDrafts(restoredDrafts);
			const combinatorCount = Math.max(restoredDrafts.length - 1, 0);
			setFilterDraftCombinators(Array.from({ length: combinatorCount }, (_, index) => (
				restoredCombinators[index] ?? defaultFilterCombinator
			)));
		} catch{
			setFilterDrafts([]);
			setFilterDraftCombinators([]);
		}
	}, []);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		window.localStorage.setItem(ROLE_FILTER_PREFERENCES_KEY, JSON.stringify({
			drafts: filterDrafts.map(serializeFilterDraftForStorage),
			combinators: filterDraftCombinators
		}));
	}, [filterDraftCombinators, filterDrafts]);

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

	const createListDraftValue = (columnConfig: FilterColumnOption): string => {
		if(columnConfig.valueType == "boolean")
			return "true";
		if(columnConfig.valueType == "select")
			return columnConfig.selectOptions?.[0]?.value ?? "";
		if(columnConfig.valueType == "date")
			return "";
		return "";
	};

	const buildFilterPayload = (draft: FilterDraft): FilterInput | null => {
		const columnConfig = getResolvedFilterColumnConfig(draft.column);
		if(draft.operator == "exists") {
			return {
				column: draft.column,
				operator: draft.operator,
				value: draft.existsValue == "true"
			};
		}

		if(draft.operator == "in" || draft.operator == "not_in") {
			const values = draft.values
				.map(value => normalizeFilterItemValue(columnConfig, value))
				.filter((value): value is string | boolean => value != null);
			if(values.length == 0)
				return null;
			return {
				column: draft.column,
				operator: draft.operator,
				value: values
			};
		}

		if(columnConfig.valueType == "date") {
			if(draft.dateValue == null)
				return null;
			return {
				column: draft.column,
				operator: draft.operator,
				value: draft.dateValue.toISOString()
			};
		}

		const scalar = normalizeFilterItemValue(columnConfig, draft.value);
		if(scalar == null)
			return null;

		return {
			column: draft.column,
			operator: draft.operator,
			value: scalar
		};
	};

	const appliedFilters = useMemo(() => {
		const nextFilters = filterDrafts
			.map(buildFilterPayload)
			.filter((value): value is FilterInput => value != null);
		return nextFilters.map((filter, index) => ({
			...filter,
			joinWithPrevious: index == 0 ? undefined : (filterDraftCombinators[index - 1] ?? defaultFilterCombinator)
		}));
	}, [filterDraftCombinators, filterDrafts]);

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
				id: `${filter.column}-${filter.operator}-${index}`,
				combinator: index == 0 ? null : (filter.joinWithPrevious ?? defaultFilterCombinator).toUpperCase(),
				columnLabel: columnConfig.label,
				operatorLabel,
				valueLabel
			};
		})
	), [appliedFilters, getResolvedFilterColumnConfig]);

	const openFilterDialog = () => {
		if(appliedFilters.length == 0) {
			setFilterDrafts([]);
			setFilterDraftCombinators([]);
			setIsFilterOpen(true);
			return;
		}

		setFilterDraftCombinators(appliedFilters.slice(1).map(filter => filter.joinWithPrevious ?? defaultFilterCombinator));
		setFilterDrafts(appliedFilters.map(filter => {
			const columnConfig = getResolvedFilterColumnConfig(filter.column);
			const values = Array.isArray(filter.value) ? filter.value.map(value => {
				if(columnConfig.valueType != "date")
					return String(value);
				const parsed = parseFilterDateValue(String(value));
				return parsed == null ? String(value) : formatFilterDateInput(parsed);
			}) : [];
			const parsedDate = !Array.isArray(filter.value) && columnConfig.valueType == "date" && typeof filter.value == "string" ? parseFilterDateValue(filter.value) : null;
			return {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
				column: filter.column,
				operator: filter.operator,
				value: Array.isArray(filter.value) || filter.value == null ? "" : String(filter.value),
				values,
				existsValue: filter.value == false ? "false" : "true",
				dateValue: parsedDate,
				listDateValue: null,
				dateText: formatFilterDateOnlyInput(parsedDate),
				listDateText: ""
			};
		}));
		setIsFilterOpen(true);
	};

	const toggleFilterPanel = () => {
		if(isFilterOpen) {
			setIsFilterOpen(false);
			return;
		}
		openFilterDialog();
	};

	const clearFilter = () => {
		setFilterDrafts([]);
		setFilterDraftCombinators([]);
	};

	const updateFilterCombinator = (index: number, combinator: FilterCombinator) => {
		setFilterDraftCombinators(previous => previous.map((value, valueIndex) => valueIndex == index ? combinator : value));
	};

	const updateFilterDraft = (id: string, updater: (draft: FilterDraft) => FilterDraft) => {
		setFilterDrafts(previous => previous.map(draft => draft.id == id ? updater(draft) : draft));
	};

	const handleFilterColumnChange = (id: string, column: FilterColumn) => {
		const nextColumnConfig = getResolvedFilterColumnConfig(column);
		updateFilterDraft(id, draft => ({
			...draft,
			column,
			operator: nextColumnConfig.operators.includes(draft.operator) ? draft.operator : nextColumnConfig.operators[0],
			value: "",
			values: [],
			dateValue: null,
			listDateValue: null,
			existsValue: "true",
			dateText: "",
			listDateText: ""
		}));
	};

	const handleFilterOperatorChange = (id: string, operator: FilterColumnOption["operators"][number]) => {
		updateFilterDraft(id, draft => ({
			...draft,
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

	const addFilterDraft = () => {
		setFilterDrafts(previous => [...previous, createFilterDraft()]);
		setFilterDraftCombinators(previous => [...previous, defaultFilterCombinator]);
	};

	const removeFilterDraft = (id: string) => {
		setFilterDrafts(previous => {
			const removeIndex = previous.findIndex(draft => draft.id == id);
			if(removeIndex == -1 || previous.length <= 1) {
				setFilterDraftCombinators([]);
				return [];
			}

			setFilterDraftCombinators(combinators => {
				if(removeIndex == 0)
					return combinators.slice(1);
				if(removeIndex == previous.length - 1)
					return combinators.slice(0, combinators.length - 1);
				return combinators.filter((_, index) => index != removeIndex);
			});

			return previous.filter(draft => draft.id != id);
		});
	};

	const addFilterListValue = (id: string) => {
		setFilterDrafts(previous => previous.map(draft => {
			if(draft.id != id)
				return draft;
			if(draft.operator != "in" && draft.operator != "not_in")
				return draft;

			const columnConfig = getResolvedFilterColumnConfig(draft.column);
			return {
				...draft,
				values: [...draft.values, createListDraftValue(columnConfig)]
			};
		}));
	};

	const updateFilterListValue = (id: string, valueIndex: number, nextValue: string) => {
		updateFilterDraft(id, draft => ({
			...draft,
			values: draft.values.map((value, index) => index == valueIndex ? nextValue : value)
		}));
	};

	const removeFilterListValue = (id: string, valueIndex: number) => {
		updateFilterDraft(id, draft => ({
			...draft,
			values: draft.values.filter((_, index) => index != valueIndex)
		}));
	};

	return {
		isFilterOpen,
		setIsFilterOpen,
		toggleFilterPanel,
		clearFilter,
		appliedFilters,
		filterSummaryItems,
		filterDrafts,
		filterDraftCombinators,
		updateFilterCombinator,
		updateFilterDraft,
		handleFilterColumnChange,
		handleFilterOperatorChange,
		addFilterDraft,
		removeFilterDraft,
		addFilterListValue,
		updateFilterListValue,
		removeFilterListValue
	};
}

type RoleQueryActionInput = Parameters<typeof import("./layout.actions").queryRolesEditorAction>[0];

type UseRoleRequestsQueryOptions = {
	queryScope: string;
	queryAction: (input: RoleQueryActionInput) => Promise<QueryRolesOutput>;
	debouncedKeyword: string;
	sortTokens: string[];
	appliedFilters: FilterInput[];
	includeSoftDeleted: boolean;
};

export function useRoleRequestsQuery({
	queryScope,
	queryAction,
	debouncedKeyword,
	sortTokens,
	appliedFilters,
	includeSoftDeleted
}: UseRoleRequestsQueryOptions) {
	const [pageIndex, setPageIndex] = useState(1);

	const rolesQuery = useQuery({
		queryKey: ["role-management", "roles", {
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
		if(rolesQuery.data == null || rolesQuery.isFetching)
			return;
		if(rolesQuery.data.page != pageIndex)
			setPageIndex(rolesQuery.data.page);
	}, [pageIndex, rolesQuery.data, rolesQuery.isFetching]);

	const queryResult = rolesQuery.data ?? emptyQueryResult;
	const isLoading = rolesQuery.isPending;
	const queryErrorMessage = rolesQuery.error instanceof Error ? rolesQuery.error.message : rolesQuery.error != null ? "Failed to load role requests." : null;

	return {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	};
}
