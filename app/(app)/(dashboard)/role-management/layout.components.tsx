"use client";

import { useMemo, useState, useEffect, useCallback, type DragEvent, type ReactNode, type MouseEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { XIcon, PlusIcon, CheckIcon, ArrowUpIcon, HistoryIcon, ArrowDownIcon, ArrowUpDownIcon, CircleAlertIcon, GripVerticalIcon } from "lucide-react";

import cn from "@/utils/cn";
import type { ReviewCommentRichText } from "@/utils/reviewCommentRichText";
import { DatetimeInput } from "@/components/DatetimeInput";
import { Link } from "@/components/Link";
import { ReviewCommentInput, ReviewCommentPreview } from "@/components/ReviewCommentInput";
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

import { uploadGenericRichtextImage } from "../../editor-x.actions";
import { consumePendingRelationFilterNavigation } from "../relation-navigation.components";
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
export type RoleRequestReviewDiff = Awaited<ReturnType<typeof roleActions.getRoleRequestReviewDiffAction>>;
export type RoleRequestHistory = Awaited<ReturnType<typeof roleActions.getRoleRequestHistoryAction>>;
export type RoleLevel = roleActions.RoleLevel;
export type RoleMenu = roleActions.RoleMenu;
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

export type RoleTableColumnId = "name" |
	"id" |
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
	"reviewedBy" |
	"reviewApproved" |
	"reviewComment";

export type RoleTableColumnConfig = {
	id: RoleTableColumnId;
	label: string;
	sortField?: SortField;
	headClassName?: string;
	cellClassName?: string;
};

export type FormState = {
	role?: string;
	name: string;
	level: RoleLevel;
	menus: RoleMenu[];
};

export type FilterSummaryItem = {
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
	{ value: "user-management-auditor", label: "User Management - Auditor" },
	{ value: "user-management-editor", label: "User Management - Editor" },
	{ value: "user-management-approver", label: "User Management - Approver" },
	{ value: "role-management-viewer", label: "Role Management - Viewer" },
	{ value: "role-management-auditor", label: "Role Management - Auditor" },
	{ value: "role-management-editor", label: "Role Management - Editor" },
	{ value: "role-management-approver", label: "Role Management - Approver" },
	{ value: "team-management-viewer", label: "Team Management - Viewer" },
	{ value: "team-management-auditor", label: "Team Management - Auditor" },
	{ value: "team-management-editor", label: "Team Management - Editor" },
	{ value: "team-management-approver", label: "Team Management - Approver" },
	{ value: "credit-application-management-viewer", label: "Credit Application Management - Viewer" },
	{ value: "credit-application-management-auditor", label: "Credit Application Management - Auditor" },
	{ value: "credit-application-management-editor", label: "Credit Application Management - Editor" },
	{ value: "credit-application-management-approver", label: "Credit Application Management - Approver" },
	{ value: "credit-application-management-import-viewer", label: "Credit Application Management - Import Viewer" },
	{ value: "credit-application-management-import-editor", label: "Credit Application Management - Import Editor" },
	{ value: "credit-application-management-import-approver", label: "Credit Application Management - Import Approver" },
	{ value: "credit-application-assignment-viewer", label: "Credit Application Assignment - Viewer" },
	{ value: "credit-application-assignment-auditor", label: "Credit Application Assignment - Auditor" },
	{ value: "credit-application-assignment-editor", label: "Credit Application Assignment - Editor" },
	{ value: "credit-application-assignment-approver", label: "Credit Application Assignment - Approver" },
	{ value: "officer-task-reporting-viewer", label: "Officer Task Reporting - Viewer" },
	{ value: "officer-task-monitoring-viewer", label: "Officer Task Monitoring - Viewer" },
	{ value: "survey-management-viewer", label: "Survey Management - Viewer" },
	{ value: "survey-management-auditor", label: "Survey Management - Auditor" },
	{ value: "survey-management-editor", label: "Survey Management - Editor" },
	{ value: "survey-management-approver", label: "Survey Management - Approver" },
	{ value: "satisfaction-survey-management-viewer", label: "Satisfaction Survey Management - Viewer" },
	{ value: "satisfaction-survey-management-auditor", label: "Satisfaction Survey Management - Auditor" },
	{ value: "satisfaction-survey-management-editor", label: "Satisfaction Survey Management - Editor" },
	{ value: "satisfaction-survey-management-approver", label: "Satisfaction Survey Management - Approver" },
	{ value: "monitoring-officer-tracking-viewer", label: "Monitoring - Officer Tracking" },
	{ value: "monitoring-log-gps-viewer", label: "Monitoring - Log GPS" },
	{ value: "monitoring-log-recording-viewer", label: "Monitoring - Log Recording" },
	{ value: "monitoring-log-otp-viewer", label: "Monitoring - Log OTP" },
	{ value: "survey-result-monitoring", label: "Survey Result - Monitoring" },
	{ value: "survey-result-reporting", label: "Survey Result - Reporting" }
];

export const reviewStatusOptions: Array<{ value: string, label: string }> = [
	{ value: "pending", label: "Pending" },
	{ value: "approved", label: "Approved" },
	{ value: "rejected", label: "Rejected" }
];

export const emptyQueryResult: QueryRolesOutput = {
	docs: [],
	relations: {},
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
export const RELATION_FILTER_QUERY_PARAM = "relationFilters";

export const roleTableColumns: RoleTableColumnConfig[] = [
	{ id: "id", label: "ID", sortField: "id", cellClassName: "font-mono text-xs" },
	{ id: "name", label: "Name", sortField: "name", cellClassName: "font-medium" },
	{ id: "level", label: "Level", sortField: "level" },
	{ id: "menus", label: "Menus", sortField: "menus", cellClassName: "max-w-[360px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ id: "createdBy", label: "Created By" },
	{ id: "updatedBy", label: "Updated By" },
	{ id: "deletedBy", label: "Deleted By" },
	{ id: "createdAt", label: "Created At", sortField: "createdAt" },
	{ id: "updatedAt", label: "Updated At", sortField: "updatedAt" },
	{ id: "deletedAt", label: "Deleted At", sortField: "deletedAt" },
	{ id: "requestType", label: "Request" },
	{ id: "status", label: "Status" },
	{ id: "reviewedAt", label: "Reviewed At", sortField: "reviewedAt" },
	{ id: "reviewedBy", label: "Reviewed By", sortField: "reviewedBy" },
	{ id: "reviewApproved", label: "Review Approved", sortField: "reviewApproved" },
	{ id: "reviewComment", label: "Review Comment", cellClassName: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" }
];

function getRoleDrawerValueClassName(columnId: string): string {
	if(columnId == "id")
		return "text-xs font-mono";
	if(columnId == "name")
		return "text-sm font-medium";
	if(columnId == "reviewComment")
		return "text-sm leading-relaxed";
	return "text-sm";
}

export const defaultRoleColumnOrder: RoleTableColumnId[] = roleTableColumns.map(column => column.id);
export const defaultRoleVisibleColumns: RoleTableColumnId[] = ["name", "level", "menus", "requestType", "status", "updatedAt", "reviewComment"];
export const defaultRoleHiddenColumns: RoleTableColumnId[] = defaultRoleColumnOrder.filter(columnId => !defaultRoleVisibleColumns.includes(columnId));

const roleNonEligibleColumnSet = new Set<string>([
	"actions",
	"status",
	"requestType",
	"reviewedBy",
	"createdBy",
	"updatedBy",
	"deletedBy"
]);

export function getEligibleDetailTriggerRoleColumnId(visibleColumns: RoleTableColumnConfig[]): RoleTableColumnId | null {
	const triggerColumn = visibleColumns.find(column => !roleNonEligibleColumnSet.has(column.id));
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

export const roleFilterColumns: FilterColumnOption[] = [
	{ value: "id", label: "ID", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [] },
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
	return roleFilterColumns.find(option => option.value == column) ?? roleFilterColumns[0];
}

export function getResolvedRoleFilterColumnConfig(
	column: FilterColumn,
	idSelectOptions: Array<{ value: string, label: string }>,
	reviewedBySelectOptions: Array<{ value: string, label: string }>,
	searchRoleOptions?: FilterSelectSearchAction,
	searchAuditUserOptions?: FilterSelectSearchAction
): FilterColumnOption {
	const config = getFilterColumnConfig(column);
	switch(column) {
		case "id":
			return {
				...config,
				selectOptions: idSelectOptions,
				searchOptionsAction: searchRoleOptions
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

export function createFilterCondition(column: FilterColumn = roleFilterColumns[0].value): FilterCondition {
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

export function getReviewStatus(row: RoleTableRow): { label: string, variant: "default" | "secondary" | "destructive" } {
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
	row: RoleTableRow;
	onOpenRequestChanges?: (row: RoleTableRow) => void;
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

type RoleRequestCancelDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isMutating: boolean;
};

export function RoleRequestCancelDialog({
	open,
	onOpenChange,
	onConfirm,
	isMutating
}: RoleRequestCancelDialogProps) {
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
													{roleFilterColumns.map(column => (
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
					<DrawerTitle>{formState.role == null ? "Add Role" : "Edit Role"}</DrawerTitle>
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
					<Button type="button" onClick={onSubmit} disabled={isMutating}>Save</Button>
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
	reviewComment: ReviewCommentRichText;
	onReviewCommentChange: (value: ReviewCommentRichText) => void;
	onApprove: () => void;
	onReject: () => void;
	isMutating: boolean;
	onOpenRequestChanges?: (row: RoleTableRow) => void;
};

export function RoleRequestReviewDrawer({
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
}: RoleRequestReviewDrawerProps) {
	const diff = reviewDrawerState?.diff;
	const diffEntries = diff == null ? [] : [
		{
			field: "name" as const,
			label: "Role Name",
			previousRaw: diff.name[0],
			requestedRaw: diff.name[1],
			previousValue: diff.name[0] ?? "-",
			requestedValue: diff.name[1] ?? "-"
		},
		{
			field: "level" as const,
			label: "Level",
			previousRaw: diff.level[0],
			requestedRaw: diff.level[1],
			previousValue: roleLevelOptions.find(option => option.value == diff.level[0])?.label ?? diff.level[0],
			requestedValue: roleLevelOptions.find(option => option.value == diff.level[1])?.label ?? diff.level[1]
		},
		{
			field: "menus" as const,
			label: "Menus",
			previousRaw: diff.menus[0],
			requestedRaw: diff.menus[1],
			previousValue: diff.menus[0].length == 0 ? "-" : diff.menus[0].map(menu => roleMenuOptions.find(option => option.value == menu)?.label ?? menu).join(", "),
			requestedValue: diff.menus[1].length == 0 ? "-" : diff.menus[1].map(menu => roleMenuOptions.find(option => option.value == menu)?.label ?? menu).join(", ")
		},
		{
			field: "deletedAt" as const,
			label: "Deleted At",
			previousRaw: diff.deletedAt[0],
			requestedRaw: diff.deletedAt[1],
			previousValue: formatDateTime(diff.deletedAt[0]),
			requestedValue: formatDateTime(diff.deletedAt[1])
		}
	];

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
						<p className="text-muted-foreground">{diff != null ? `${diffEntries.filter(item => JSON.stringify(item.previousRaw) != JSON.stringify(item.requestedRaw)).length} changed field(s)` : "Loading differences..."}</p>
					</div>

					{isReviewDiffLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : diff == null ? (
						<p className="text-muted-foreground text-sm">No diff is available for this request.</p>
					) : (
						<div className="space-y-2">
							{diffEntries.map(item => (
								<div key={item.field} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{item.label}</p>
										<Badge variant={JSON.stringify(item.previousRaw) != JSON.stringify(item.requestedRaw) ? "default" : "secondary"}>{JSON.stringify(item.previousRaw) != JSON.stringify(item.requestedRaw) ? "Changed" : "Unchanged"}</Badge>
									</div>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Last Approved</p>
											<div className={cn("bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word", getRoleDrawerValueClassName(item.field))}>{item.previousValue}</div>
										</div>
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Requested</p>
											<div className={cn("bg-muted/10 min-h-9 rounded border px-2 py-1.5 wrap-break-word", getRoleDrawerValueClassName(item.field))}>{item.requestedValue}</div>
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
						<ReviewCommentInput serializedState={reviewComment} onSerializedStateChange={onReviewCommentChange} onImageUpload={uploadGenericRichtextImage} />
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

type RoleRequestChangePreviewDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: RoleTableRow | null;
};

export function RoleRequestChangePreviewDrawer({
	open,
	onOpenChange,
	row
}: RoleRequestChangePreviewDrawerProps) {
	const diffQuery = useQuery({
		queryKey: ["role-management", "request-change-preview", row?.id ?? null],
		enabled: open && row != null,
		queryFn: () => roleActions.getRoleRequestReviewDiffAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
	const diff = diffQuery.data;
	const diffEntries = diff == null ? [] : [
		{
			field: "name" as const,
			label: "Role Name",
			previousRaw: diff.name[0],
			requestedRaw: diff.name[1],
			previousValue: diff.name[0] ?? "-",
			requestedValue: diff.name[1] ?? "-"
		},
		{
			field: "level" as const,
			label: "Level",
			previousRaw: diff.level[0],
			requestedRaw: diff.level[1],
			previousValue: roleLevelOptions.find(option => option.value == diff.level[0])?.label ?? diff.level[0],
			requestedValue: roleLevelOptions.find(option => option.value == diff.level[1])?.label ?? diff.level[1]
		},
		{
			field: "menus" as const,
			label: "Menus",
			previousRaw: diff.menus[0],
			requestedRaw: diff.menus[1],
			previousValue: diff.menus[0].length == 0 ? "-" : diff.menus[0].map(menu => roleMenuOptions.find(option => option.value == menu)?.label ?? menu).join(", "),
			requestedValue: diff.menus[1].length == 0 ? "-" : diff.menus[1].map(menu => roleMenuOptions.find(option => option.value == menu)?.label ?? menu).join(", ")
		},
		{
			field: "deletedAt" as const,
			label: "Deleted At",
			previousRaw: diff.deletedAt[0],
			requestedRaw: diff.deletedAt[1],
			previousValue: formatDateTime(diff.deletedAt[0]),
			requestedValue: formatDateTime(diff.deletedAt[1])
		}
	];

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
						<p className="text-muted-foreground">{diff != null ? `${diffEntries.filter(item => JSON.stringify(item.previousRaw) != JSON.stringify(item.requestedRaw)).length} changed field(s)` : "Loading differences..."}</p>
					</div>

					{row == null ? (
						<p className="text-muted-foreground text-sm">No request selected.</p>
					) : diffQuery.isPending ? (
						<div className="space-y-2">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</div>
					) : diffQuery.isError || diff == null ? (
						<Alert variant="destructive">
							<CircleAlertIcon />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>Unable to load request changes.</AlertDescription>
						</Alert>
					) : (
						<div className="space-y-2">
							{diffEntries.map(item => (
								<div key={item.field} className="space-y-2 rounded-lg border p-3">
									<div className="flex items-center justify-between gap-2">
										<p className="text-sm font-medium">{item.label}</p>
										<Badge variant={JSON.stringify(item.previousRaw) != JSON.stringify(item.requestedRaw) ? "default" : "secondary"}>{JSON.stringify(item.previousRaw) != JSON.stringify(item.requestedRaw) ? "Changed" : "Unchanged"}</Badge>
									</div>
									<div className="grid gap-2 sm:grid-cols-2">
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Last Approved</p>
											<div className={cn("bg-muted/50 min-h-9 rounded border px-2 py-1.5 wrap-break-word", getRoleDrawerValueClassName(item.field))}>{item.previousValue}</div>
										</div>
										<div className="space-y-1">
											<p className="text-muted-foreground text-xs font-medium">Requested</p>
											<div className={cn("bg-muted/10 min-h-9 rounded border px-2 py-1.5 wrap-break-word", getRoleDrawerValueClassName(item.field))}>{item.requestedValue}</div>
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

type RoleRequestsTableProps = {
	queryResult: QueryRolesOutput;
	visibleColumns: RoleTableColumnConfig[];
	visibleColumnCount: number;
	includeActions?: boolean;
	detailTriggerColumnId: RoleTableColumnId | null;
	isLoading: boolean;
	isMutating: boolean;
	getSortDirection: (field: SortField) => SortDirection | null;
	onToggleSortField: (field: SortField) => void;
	onOpenDetails: (row: RoleTableRow) => void;
	renderRoleCell: (columnId: RoleTableColumnConfig["id"], row: RoleTableRow) => ReactNode;
	renderActions: (row: RoleTableRow) => ReactNode;
};

export function RoleRequestsTable({
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
						{includeActions ? <TableHead className="w-65">Actions</TableHead> : null}
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
								{visibleColumns.map(column => {
									const cellValue = renderRoleCell(column.id, row);
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

type RoleRequestDetailsDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: RoleTableRow | null;
	renderActions: (row: RoleTableRow) => ReactNode;
	relationNavigation?: RoleRelationNavigation;
	onOpenRequestChanges?: (row: RoleTableRow) => void;
};

type RoleRelationNavigation = {
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

function renderRoleUserRelationValue({
	column,
	relation,
	relationId,
	relationNavigation,
	fallbackValue
}: {
	column: string;
	relation: { name: string, email?: string, stagedUserId?: string | null } | null;
	relationId: string | null;
	relationNavigation?: RoleRelationNavigation;
	fallbackValue?: string;
}): ReactNode {
	const displayValue = relation?.name ?? relation?.email ?? fallbackValue ?? "-";
	const normalizedValue = displayValue.trim();
	if(relationId == null || normalizedValue.length == 0 || normalizedValue == "-")
		return displayValue;

	const summaryLabel = {
		"reviewedBy": "Reviewed By",
		"createdBy": "Created By",
		"updatedBy": "Updated By",
		"deletedBy": "Deleted By"
	};
	const hrefBase = relationNavigation?.getHrefBase("user-management");
	if(hrefBase != null && relationNavigation != null) {
		const stagedUserId = relation?.stagedUserId ?? null;
		if(stagedUserId == null || stagedUserId.trim().length == 0)
			return displayValue;

		const relationFilters = [{ column: "id", operator: "equals", value: stagedUserId }];
		const searchParams = new URLSearchParams();
		searchParams.set(RELATION_FILTER_QUERY_PARAM, JSON.stringify(relationFilters));
		searchParams.set("relationContext", `role-management:${column}`);
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
							fallbackTitle: displayValue,
							fallbackDescription: `${summaryLabel} user`
						});
						return;
					}
					relationNavigation.onRelationLinkClick(event, {
						targetManagementKey: "user-management",
						hrefBase,
						relationFilters,
						relationContext: `role-management:${column}`
					});
				}}
				className="text-primary underline underline-offset-2 hover:opacity-80"
			>
				{displayValue}
			</Link>
		);
	}

	if(relationNavigation == null)
		return displayValue;

	return (
		<Button
			type="button"
			variant="link"
			onClick={() => relationNavigation.onOpenSummary({
				type: "user",
				id: relationId,
				fallbackTitle: displayValue,
				fallbackDescription: `${summaryLabel} user`
			})}
			className="h-auto p-0 text-primary select-auto"
		>
			{displayValue}
		</Button>
	);
}

type RoleRequestHistoryEntry = RoleRequestHistory["entries"][number];
type RoleRequestHistoryField = Exclude<keyof RoleRequestHistoryEntry, "versionId">;

const roleRequestHistoryFields: RoleRequestHistoryField[] = [
	"id",
	"name",
	"level",
	"menus",
	"createdBy",
	"updatedBy",
	"deletedBy",
	"createdAt",
	"updatedAt",
	"deletedAt",
	"requestType",
	"status",
	"reviewedAt",
	"reviewedBy",
	"reviewApproved",
	"reviewComment"
];

const roleRequestHistoryFieldLabelMap: Record<RoleRequestHistoryField, string> = {
	id: "ID",
	name: "Name",
	level: "Level",
	menus: "Menus",
	createdBy: "Created By",
	updatedBy: "Updated By",
	deletedBy: "Deleted By",
	createdAt: "Created At",
	updatedAt: "Updated At",
	deletedAt: "Deleted At",
	requestType: "Request",
	status: "Status",
	reviewedAt: "Reviewed At",
	reviewedBy: "Reviewed By",
	reviewApproved: "Review Approved",
	reviewComment: "Review Comment"
};

function renderRoleRequestHistoryValue(
	field: RoleRequestHistoryField,
	value: any,
	relations: roleActions.RoleRelationValues = {},
	relationNavigation?: RoleRelationNavigation
) {
	switch(field) {
		case "reviewComment":
			return <ReviewCommentPreview serializedState={value} className="w-full" contentClassName="min-h-9 max-h-44" />;
		case "reviewApproved":
			return value == null ? "-" : value as boolean ? "True" : "False";
		case "status": {
			if(value == null || String(value).length == 0)
				return "-";
			const normalizedStatus = String(value).toLowerCase();
			if(normalizedStatus == "pending")
				return <Badge variant="secondary">Pending</Badge>;
			if(normalizedStatus == "approved")
				return <Badge variant="default">Approved</Badge>;
			if(normalizedStatus == "rejected")
				return <Badge variant="destructive">Rejected</Badge>;
			return <Badge variant="outline">{String(value)}</Badge>;
		}
		case "createdBy":
		case "updatedBy":
		case "deletedBy":
		case "reviewedBy":
			return renderRoleUserRelationValue({
				column: field,
				relation: value == null ? null : relations[`users:${value}`] ?? null,
				relationId: value ?? null,
				relationNavigation,
				fallbackValue: value == null ? "-" : String(value)
			});
		case "createdAt":
		case "updatedAt":
		case "deletedAt":
		case "reviewedAt":
			return formatDateTime(value);
		case "menus":
			return value == null || value.length == 0 ? "-" : value.map(menu => roleMenuOptions.find(option => option.value == menu)?.label ?? menu).join(", ");
		case "level":
			return value == null ? "-" : roleLevelOptions.find(option => option.value == value)?.label ?? value;
		default:
			return value == null || String(value).length == 0 ? "-" : String(value);
	}
}

export function RoleRequestDetailsDrawer({
	open,
	onOpenChange,
	row,
	renderActions,
	relationNavigation,
	onOpenRequestChanges
}: RoleRequestDetailsDrawerProps) {
	const [historyOpen, setHistoryOpen] = useState(false);

	useEffect(() => {
		if(!open)
			setHistoryOpen(false);
	}, [open]);

	const detailsQuery = useQuery({
		queryKey: ["role-management", "details", row?.id ?? null],
		enabled: open && row != null,
		queryFn: () => roleActions.getRoleRequestDetailsAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const historyAccessQuery = useQuery({
		queryKey: ["role-management", "history-access"],
		queryFn: () => roleActions.canAccessRoleRequestHistoryAction(),
		staleTime: 60_000,
		refetchOnWindowFocus: true
	});

	const canAccessHistory = historyAccessQuery.data == true;

	const historyQuery = useQuery({
		queryKey: ["role-management", "history", row?.id ?? null],
		enabled: historyOpen && row != null && canAccessHistory,
		queryFn: () => roleActions.getRoleRequestHistoryAction(row!.id),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const details = detailsQuery.data;
	const actionRow = details?.row ?? row;

	const renderDetailColumnValue = (columnId: RoleTableColumnId, value: ReactNode) => {
		return <div className={cn(getRoleDrawerValueClassName(columnId), "wrap-break-word")}>{value}</div>;
	};

	const renderDetailValue = (columnId: RoleTableColumnId, data: roleActions.RoleRequestDetailsOutput) => {
		switch(columnId) {
			case "id":
				return renderDetailColumnValue(columnId, data.row.id);
			case "name":
				return renderDetailColumnValue(columnId, data.row.name);
			case "level":
				return renderDetailColumnValue(columnId, roleLevelOptions.find(option => option.value == data.row.level)?.label ?? data.row.level);
			case "menus": {
				const labels = data.row.menus.map(menu => roleMenuOptions.find(option => option.value == menu)?.label ?? menu);
				return renderDetailColumnValue(columnId, labels.length > 0 ? labels.join(", ") : "-");
			}
			case "createdBy":
				return renderDetailColumnValue(columnId, renderRoleUserRelationValue({ column: "createdBy", relation: data.row.createdBy == null ? null : data.relations[`users:${data.row.createdBy}`] ?? null, relationId: data.row.createdBy, relationNavigation, fallbackValue: data.row.createdBy ?? "-" }));
			case "updatedBy":
				return renderDetailColumnValue(columnId, renderRoleUserRelationValue({ column: "updatedBy", relation: data.row.updatedBy == null ? null : data.relations[`users:${data.row.updatedBy}`] ?? null, relationId: data.row.updatedBy, relationNavigation, fallbackValue: data.row.updatedBy ?? "-" }));
			case "deletedBy":
				return renderDetailColumnValue(columnId, renderRoleUserRelationValue({ column: "deletedBy", relation: data.row.deletedBy == null ? null : data.relations[`users:${data.row.deletedBy}`] ?? null, relationId: data.row.deletedBy, relationNavigation, fallbackValue: data.row.deletedBy ?? "-" }));
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
				return renderDetailColumnValue(columnId, renderRoleUserRelationValue({ column: "reviewedBy", relation: data.row.reviewedBy == null ? null : data.relations[`users:${data.row.reviewedBy}`] ?? null, relationId: data.row.reviewedBy, relationNavigation, fallbackValue: data.row.reviewedBy ?? "-" }));
			case "reviewApproved":
				return renderDetailColumnValue(columnId, data.row.reviewApproved == null ? "-" : data.row.reviewApproved ? "True" : "False");
			case "reviewComment":
				return renderDetailColumnValue(columnId, <ReviewCommentPreview serializedState={data.row.reviewComment ?? undefined} className="w-full bg-transparent shadow-none border-none rounded-none" contentClassName="min-h-5 max-h-44 p-0" placeholderClassName="p-0" />);
			default:
				return renderDetailColumnValue(columnId, "-");
		}
	};

	return (
		<>
			<Drawer open={open} onOpenChange={onOpenChange} direction="right">
				<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
					<DrawerHeader>
						<DrawerTitle>Role Request Details</DrawerTitle>
						<DrawerDescription>Review all available columns for this role request entry.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
						{row == null ? (
							<p className="text-muted-foreground text-sm">No role request selected.</p>
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
								<AlertDescription>Unable to load role request details.</AlertDescription>
							</Alert>
						) : (
							roleTableColumns.map(column => (
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
						<DrawerTitle>Role Request History</DrawerTitle>
						<DrawerDescription>Changes are shown from the most recent version to the earliest version.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
						{row == null ? (
							<p className="text-muted-foreground text-sm">No role request selected.</p>
						) : historyAccessQuery.isPending ? (
							<div className="space-y-2">
								<Skeleton className="h-28 w-full" />
								<Skeleton className="h-28 w-full" />
							</div>
						) : !canAccessHistory ? (
							<Alert variant="destructive">
								<CircleAlertIcon />
								<AlertTitle>Unauthorized</AlertTitle>
								<AlertDescription>You need Role Management auditor access to view history.</AlertDescription>
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
								<AlertDescription>Unable to load role request history.</AlertDescription>
							</Alert>
						) : historyQuery.data.entries.length == 0 ? (
							<p className="text-muted-foreground text-sm">No history entries found for this role request.</p>
						) : (
							historyQuery.data.entries.map((entry, entryIndex, historyEntries) => {
								const previousEntry = historyEntries[entryIndex + 1] ?? null;
								const changes = roleRequestHistoryFields.flatMap(field => {
									const nextValue = entry[field];
									const previousValue = previousEntry?.[field] ?? null;
									if(JSON.stringify(nextValue) == JSON.stringify(previousValue))
										return [];
									return [{
										field,
										label: roleRequestHistoryFieldLabelMap[field],
										previousValue,
										nextValue
									}];
								});

								return (
									<div key={entry.versionId} className="space-y-2 rounded-lg border p-3">
										<div className="flex items-center justify-between gap-2">
											<p className="text-sm font-semibold">{formatDateTime(entry.updatedAt)}</p>
											<Badge variant="outline">{changes.length} change(s)</Badge>
										</div>
										<div className="space-y-1">
											{changes.length == 0 ? (
												<p className="text-muted-foreground text-xs">No field changes detected.</p>
											) : changes.map(change => (
												<div key={`${entry.versionId}-${change.field}`} className="space-y-0.5 rounded-md border p-2 text-xs">
													<div className="font-medium">{change.label}</div>
													<div className="text-muted-foreground">From: {renderRoleRequestHistoryValue(change.field, change.previousValue, historyQuery.data.relations, relationNavigation)}</div>
													<div>To: {renderRoleRequestHistoryValue(change.field, change.nextValue, historyQuery.data.relations, relationNavigation)}</div>
												</div>
											))}
										</div>
									</div>
								);
							})
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

type UseRoleCellRendererOptions = {
	relations: roleActions.RoleRelationValues;
	relationNavigation?: RoleRelationNavigation;
	onOpenRequestChanges?: (row: RoleTableRow) => void;
};

export function useRoleCellRenderer({ relations, relationNavigation, onOpenRequestChanges }: UseRoleCellRendererOptions) {
	return useCallback((columnId: RoleTableColumnId, row: RoleTableRow) => {
		switch(columnId) {
			case "id":
				return row.id;
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
				return renderRoleUserRelationValue({ column: "createdBy", relation: row.createdBy == null ? null : relations[`users:${row.createdBy}`] ?? null, relationId: row.createdBy, relationNavigation, fallbackValue: row.createdBy ?? "-" });
			case "updatedBy":
				return renderRoleUserRelationValue({ column: "updatedBy", relation: row.updatedBy == null ? null : relations[`users:${row.updatedBy}`] ?? null, relationId: row.updatedBy, relationNavigation, fallbackValue: row.updatedBy ?? "-" });
			case "deletedBy":
				return renderRoleUserRelationValue({ column: "deletedBy", relation: row.deletedBy == null ? null : relations[`users:${row.deletedBy}`] ?? null, relationId: row.deletedBy, relationNavigation, fallbackValue: row.deletedBy ?? "-" });
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
				return renderRoleUserRelationValue({ column: "reviewedBy", relation: row.reviewedBy == null ? null : relations[`users:${row.reviewedBy}`] ?? null, relationId: row.reviewedBy, relationNavigation, fallbackValue: row.reviewedBy ?? "-" });
			case "reviewApproved":
				return row.reviewApproved == null ? "-" : row.reviewApproved ? "True" : "False";
			case "reviewComment":
				return <ReviewCommentPreview serializedState={row.reviewComment ?? undefined} className="bg-transparent shadow-none border-none rounded-none" contentClassName="line-clamp-2 min-h-5 max-h-28 p-0" placeholderClassName="p-0" />;
			default:
				return "-";
		}
	}, [onOpenRequestChanges, relationNavigation, relations]);
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
	const searchRoleOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const roles = await roleActions.searchRoleOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(roles.map(role => ({
			value: role.id,
			label: `${role.name} (${role.id})`,
			renderLabel: <span>{role.name} (<span className="font-mono">{role.id}</span>)</span>,
			keywords: `${role.id} ${role.name} ${role.level}`
		})));
	}, []);

	const searchAuditUserOptions = useCallback(async (keyword: string, selectedValues: string[]): Promise<SearchableSelectOption[]> => {
		const users = await roleActions.searchRoleAuditUserOptionsAction(keyword, selectedValues);
		return dedupeSelectOptions(users.map(user => ({
			value: user.id,
			label: `${user.name} (${user.email})`,
			keywords: `${user.name} ${user.email}`
		})));
	}, []);

	const getResolvedFilterColumnConfig = useCallback((column: FilterColumn): FilterColumnOption => (
		getResolvedRoleFilterColumnConfig(column, [], [], searchRoleOptions, searchAuditUserOptions)
	), [searchAuditUserOptions, searchRoleOptions]);

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

type UseRoleRequestFiltersOptions = {
	getResolvedFilterColumnConfig: (column: FilterColumn) => FilterColumnOption;
};

export type UseRoleRequestFiltersResult = {
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
		__roleDashboardFilters?: string;
	}
}

export function useRoleRequestFilters({ getResolvedFilterColumnConfig }: UseRoleRequestFiltersOptions): UseRoleRequestFiltersResult {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const searchParamsKey = searchParams.toString();
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters0] = useState<FilterCondition[]>([]);
	const setFilters = useCallback((v: FilterCondition[] | ((o: FilterCondition[]) => FilterCondition[])) => {
		if(typeof v != "function") {
			window.__roleDashboardFilters = JSON.stringify(v);
			setFilters0(v);
			return;
		}
		setFilters0(o => {
			const n = v(o);
			window.__roleDashboardFilters = JSON.stringify(n);
			return n;
		});
	}, [setFilters0]);
	const [isFilterStateHydrated, setIsFilterStateHydrated] = useState(false);

	useEffect(() => {
		const nextSearchParams = new URLSearchParams(searchParamsKey);
		const pendingNavigation = consumePendingRelationFilterNavigation("role-management");
		const relationFilters = pendingNavigation?.relationFiltersJson ?? nextSearchParams.get(RELATION_FILTER_QUERY_PARAM) ?? window.__roleDashboardFilters ?? null;
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
		setFilters(previous => [...previous, createFilterCondition(roleFilterColumns[0].value)]);
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

type RoleQueryActionInput = Parameters<typeof import("./layout.actions").queryRolesEditorAction>[0];

type UseRoleRequestsQueryOptions = {
	queryScope: string;
	queryAction: (input: RoleQueryActionInput) => Promise<QueryRolesOutput>;
	debouncedKeyword: string;
	sortTokens: string[];
	appliedFilters: FilterInput[];
	isFilterStateReady: boolean;
	includeSoftDeleted: boolean;
};

export function useRoleRequestsQuery({
	queryScope,
	queryAction,
	debouncedKeyword,
	sortTokens,
	appliedFilters,
	isFilterStateReady,
	includeSoftDeleted
}: UseRoleRequestsQueryOptions) {
	const [pageIndex, setPageIndex] = useState(1);

	const rolesQuery = useQuery({
		enabled: isFilterStateReady,
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
	const isLoading = !isFilterStateReady || rolesQuery.isPending;
	const queryErrorMessage = rolesQuery.error instanceof Error ? rolesQuery.error.message : rolesQuery.error != null ? "Failed to load role requests." : null;

	return {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	};
}
