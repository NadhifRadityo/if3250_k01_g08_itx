"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { GripVerticalIcon, XIcon } from "lucide-react";

import cn from "@/utils/cn";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Card } from "@/components/radix/Card";
import { Checkbox } from "@/components/radix/Checkbox";
import { Collapsible, CollapsibleContent } from "@/components/radix/Collapsible";
import { Input } from "@/components/radix/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/radix/Select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/radix/Table";

import type {
	OTPLogRow,
	OTPLogResponse,
} from "./layout.action";

export type OTPLogColumnId =
	| "id"
	| "requestDate"
	| "officerName"
	| "applyId"
	| "waNumber"
	| "smsNumber"
	| "email"
	| "content"
	| "waResponse"
	| "smsResponse"
	| "emailResponse";

export type OTPLogFilterColumn = OTPLogColumnId;

export type OTPLogFilterOperator =
	| "equals"
	| "not_equals"
	| "contains"
	| "not_contains"
	| "greater_than"
	| "less_than";

export type OTPLogFilterCombinator = "and" | "or";

export type FilterColumnOption = {
	value: OTPLogFilterColumn;
	label: string;
	valueType: "text" | "date" | "select";
	operators: OTPLogFilterOperator[];
	selectOptions?: Array<{ value: string; label: string }>;
};

export type FilterCondition = {
	column: OTPLogFilterColumn;
	operator: OTPLogFilterOperator;
	joinWithPrevious: OTPLogFilterCombinator;
	value: string;
	dateText: string;
	timeText: string;
};

export type OTPLogColumnConfig = {
	id: OTPLogColumnId;
	label: string;
	headClassName?: string;
	cellClassName?: string;
};

const OTP_LOG_COLUMN_PREFERENCES_KEY = "monitoring-log-otp-columns-v1";

export const otpLogColumns: OTPLogColumnConfig[] = [
	{ id: "id", label: "Log ID", cellClassName: "font-mono text-xs" },
	{ id: "requestDate", label: "Request Date" },
	{ id: "officerName", label: "Officer Name", cellClassName: "font-medium" },
	{ id: "applyId", label: "Apply ID", cellClassName: "font-mono text-xs" },
	{ id: "waNumber", label: "WA No" },
	{ id: "smsNumber", label: "SMS No" },
	{ id: "email", label: "Email" },
	{ id: "content", label: "Content", cellClassName: "max-w-[260px] truncate" },
	{ id: "waResponse", label: "WA Respond" },
	{ id: "smsResponse", label: "SMS Respond" },
	{ id: "emailResponse", label: "Email Respond" },
];

export const defaultOTPLogColumnOrder: OTPLogColumnId[] = otpLogColumns.map(column => column.id);

export const defaultOTPLogVisibleColumns: OTPLogColumnId[] = [
	"requestDate",
	"officerName",
	"applyId",
	"waNumber",
	"smsNumber",
	"email",
	"content",
	"waResponse",
	"smsResponse",
	"emailResponse",
];

export const defaultOTPLogHiddenColumns: OTPLogColumnId[] = defaultOTPLogColumnOrder.filter(
	columnId => !defaultOTPLogVisibleColumns.includes(columnId),
);

export const filterOperatorOptions: Array<{ value: OTPLogFilterOperator; label: string }> = [
	{ value: "equals", label: "Equals" },
	{ value: "not_equals", label: "Not Equals" },
	{ value: "contains", label: "Contains" },
	{ value: "not_contains", label: "Does Not Contain" },
	{ value: "greater_than", label: "Is Greater Than" },
	{ value: "less_than", label: "Is Less Than" },
];

export const otpLogFilterColumns: FilterColumnOption[] = [
	{ value: "id", label: "Log ID", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "requestDate", label: "Request Date", valueType: "date", operators: ["equals", "not_equals", "greater_than", "less_than"] },
	{ value: "officerName", label: "Officer Name", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "applyId", label: "Apply ID", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "waNumber", label: "WA No", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "smsNumber", label: "SMS No", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "email", label: "Email", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "content", label: "Content", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{
		value: "waResponse",
		label: "WA Respond",
		valueType: "select",
		operators: ["equals", "not_equals"],
		selectOptions: [
			{ value: "Sent", label: "Sent" },
			{ value: "Failed", label: "Failed" },
			{ value: "Pending", label: "Pending" },
			{ value: "NA", label: "NA" },
		],
	},
	{
		value: "smsResponse",
		label: "SMS Respond",
		valueType: "select",
		operators: ["equals", "not_equals"],
		selectOptions: [
			{ value: "Sent", label: "Sent" },
			{ value: "Failed", label: "Failed" },
			{ value: "Pending", label: "Pending" },
			{ value: "NA", label: "NA" },
		],
	},
	{
		value: "emailResponse",
		label: "Email Respond",
		valueType: "select",
		operators: ["equals", "not_equals"],
		selectOptions: [
			{ value: "Sent", label: "Sent" },
			{ value: "Failed", label: "Failed" },
			{ value: "Pending", label: "Pending" },
			{ value: "NA", label: "NA" },
		],
	},
];

function getFilterColumnConfig(column: OTPLogFilterColumn): FilterColumnOption {
	return otpLogFilterColumns.find(option => option.value == column) ?? otpLogFilterColumns[0];
}

export function createOTPLogFilterCondition(column: OTPLogFilterColumn = otpLogFilterColumns[0].value): FilterCondition {
	const columnConfig = getFilterColumnConfig(column);
	return {
		column,
		operator: columnConfig.operators[0],
		joinWithPrevious: "and",
		value: "",
		dateText: "",
		timeText: "00:00",
	};
}

function parseFilterDate(dateText: string, timeText: string): Date | null {
	if (dateText.trim().length == 0) return null;
	const normalizedTime = timeText.trim().length == 0 ? "00:00" : timeText.trim();
	const normalized = `${dateText.trim()}T${normalizedTime}`;
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function matchStringOperator(value: string, operator: OTPLogFilterOperator, compareValue: string): boolean {
	const source = value.toLowerCase();
	const needle = compareValue.toLowerCase();
	if (operator == "equals") return source == needle;
	if (operator == "not_equals") return source != needle;
	if (operator == "contains") return source.includes(needle);
	if (operator == "not_contains") return !source.includes(needle);
	return true;
}

function matchDateOperator(value: Date, operator: OTPLogFilterOperator, compareValue: Date): boolean {
	if (operator == "equals") return value.getTime() == compareValue.getTime();
	if (operator == "not_equals") return value.getTime() != compareValue.getTime();
	if (operator == "greater_than") return value.getTime() > compareValue.getTime();
	if (operator == "less_than") return value.getTime() < compareValue.getTime();
	return true;
}

function evaluateOTPLogFilter(row: OTPLogRow, condition: FilterCondition): boolean {
	const columnConfig = getFilterColumnConfig(condition.column);
	if (columnConfig.valueType == "text") {
		if (condition.value.trim().length == 0) return true;
		const value =
			condition.column == "id" ? row.id :
			condition.column == "requestDate" ? row.requestDate :
			condition.column == "officerName" ? row.officerName :
			condition.column == "applyId" ? row.applyId :
			condition.column == "waNumber" ? row.waNumber :
			condition.column == "smsNumber" ? row.smsNumber :
			condition.column == "email" ? row.email :
			condition.column == "content" ? row.content :
			condition.column == "waResponse" ? row.waResponse :
			condition.column == "smsResponse" ? row.smsResponse :
			condition.column == "emailResponse" ? row.emailResponse :
			"";
		return matchStringOperator(value, condition.operator, condition.value);
	}
	if (columnConfig.valueType == "select") {
		if (condition.value.trim().length == 0) return true;
		const value = condition.column == "waResponse" ? row.waResponse
			: condition.column == "smsResponse" ? row.smsResponse
			: row.emailResponse;
		return matchStringOperator(value, condition.operator, condition.value);
	}
	if (columnConfig.valueType == "date") {
		const compareDate = parseFilterDate(condition.dateText, condition.timeText);
		if (compareDate == null || row.requestDateRaw == null) return true;
		const rowDate = new Date(row.requestDateRaw);
		if (Number.isNaN(rowDate.getTime())) return true;
		return matchDateOperator(rowDate, condition.operator, compareDate);
	}
	return true;
}

export function applyOTPLogFilters(rows: OTPLogRow[], filters: FilterCondition[]): OTPLogRow[] {
	if (filters.length == 0) return rows;
	return rows.filter(row => {
		return filters.reduce<boolean | null>((result, condition, index) => {
			const matches = evaluateOTPLogFilter(row, condition);
			if (index == 0 || result == null) return matches;
			return condition.joinWithPrevious == "and" ? result && matches : result || matches;
		}, null) ?? true;
	});
}

export function reorderColumns(order: OTPLogColumnId[], sourceId: OTPLogColumnId, targetId: OTPLogColumnId): OTPLogColumnId[] {
	if (sourceId == targetId) return order;
	const sourceIndex = order.indexOf(sourceId);
	const targetIndex = order.indexOf(targetId);
	if (sourceIndex == -1 || targetIndex == -1) return order;
	const nextOrder = [...order];
	const [moved] = nextOrder.splice(sourceIndex, 1);
	nextOrder.splice(targetIndex, 0, moved);
	return nextOrder;
}

export function useOTPLogColumnPreferences() {
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<OTPLogColumnId[]>(defaultOTPLogColumnOrder);
	const [hiddenColumns, setHiddenColumns] = useState<OTPLogColumnId[]>(defaultOTPLogHiddenColumns);
	const [draggingColumnId, setDraggingColumnId] = useState<OTPLogColumnId | null>(null);

	useEffect(() => {
		const raw = window.localStorage.getItem(OTP_LOG_COLUMN_PREFERENCES_KEY);
		if (raw == null) return;
		try {
			const parsed = JSON.parse(raw) as { order?: OTPLogColumnId[]; hidden?: OTPLogColumnId[] };
			if (Array.isArray(parsed.order) && parsed.order.length > 0) setColumnOrder(parsed.order);
			if (Array.isArray(parsed.hidden)) setHiddenColumns(parsed.hidden);
		} catch {
			return;
		}
	}, []);

	useEffect(() => {
		const payload = JSON.stringify({ order: columnOrder, hidden: hiddenColumns });
		window.localStorage.setItem(OTP_LOG_COLUMN_PREFERENCES_KEY, payload);
	}, [columnOrder, hiddenColumns]);

	const orderedColumns = useMemo(() => {
		const lookup = new Map(otpLogColumns.map(column => [column.id, column]));
		return columnOrder.map(columnId => lookup.get(columnId)).filter((value): value is OTPLogColumnConfig => value != null);
	}, [columnOrder]);

	const visibleColumns = orderedColumns.filter(column => !hiddenColumns.includes(column.id));

	const onToggleColumnVisibility = (columnId: OTPLogColumnId, checked: boolean) => {
		setHiddenColumns(prev => {
			if (checked) return prev.filter(id => id != columnId);
			return prev.includes(columnId) ? prev : [...prev, columnId];
		});
	};

	const onResetColumns = () => {
		setColumnOrder(defaultOTPLogColumnOrder);
		setHiddenColumns(defaultOTPLogHiddenColumns);
	};

	const onColumnDragStart = (columnId: OTPLogColumnId) => {
		setDraggingColumnId(columnId);
	};

	const onColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: OTPLogColumnId) => {
		event.preventDefault();
		if (draggingColumnId == null || draggingColumnId == targetColumnId) return;
		setColumnOrder(prev => reorderColumns(prev, draggingColumnId, targetColumnId));
		setDraggingColumnId(targetColumnId);
	};

	const onColumnDragEnd = () => {
		setDraggingColumnId(null);
	};

	return {
		isColumnOpen,
		setIsColumnOpen,
		orderedColumns,
		visibleColumns,
		hiddenColumns,
		onToggleColumnVisibility,
		onResetColumns,
		onColumnDragStart,
		onColumnDragOver,
		onColumnDragEnd,
	};
}

export function useOTPLogFilters() {
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters] = useState<FilterCondition[]>([createOTPLogFilterCondition()]);

	const appliedFilters = useMemo(() => {
		return filters.filter(condition => {
			const columnConfig = getFilterColumnConfig(condition.column);
			if (columnConfig.valueType == "date") return condition.dateText.trim().length > 0;
			return condition.value.trim().length > 0;
		});
	}, [filters]);

	const addFilter = () => setFilters(prev => [...prev, createOTPLogFilterCondition()]);

	const removeFilter = (index: number) => setFilters(prev => prev.filter((_, idx) => idx != index));

	const clearFilters = () => setFilters([createOTPLogFilterCondition()]);

	const updateFilter = (index: number, next: Partial<FilterCondition>) => {
		setFilters(prev => prev.map((filter, idx) => (idx == index ? { ...filter, ...next } : filter)));
	};

	const handleFilterColumnChange = (index: number, column: OTPLogFilterColumn) => {
		const columnConfig = getFilterColumnConfig(column);
		setFilters(prev => prev.map((filter, idx) => (idx == index ? {
			...filter,
			column,
			operator: columnConfig.operators[0],
			value: "",
			dateText: "",
			timeText: "00:00",
		} : filter)));
	};

	return {
		isFilterOpen,
		setIsFilterOpen,
		filters,
		appliedFilters,
		addFilter,
		removeFilter,
		clearFilters,
		updateFilter,
		handleFilterColumnChange,
	};
}

type OTPLogFiltersCardProps = {
	isLoading: boolean;
	isMutating: boolean;
	filters: ReturnType<typeof useOTPLogFilters>;
};

export function OTPLogFiltersCard({ isLoading, isMutating, filters }: OTPLogFiltersCardProps) {
	return (
		<Collapsible open={filters.isFilterOpen} onOpenChange={filters.setIsFilterOpen}>
			<CollapsibleContent>
				<div className="space-y-3 rounded-xl border p-4">
					<div className="flex items-center justify-between gap-2">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Configure Filters</h3>
							<p className="text-muted-foreground text-sm">Build filters and combine them with AND or OR.</p>
						</div>
						{filters.appliedFilters.length > 0 ? (
							<Button type="button" variant="outline" size="sm" onClick={filters.clearFilters} disabled={isLoading || isMutating}>Clear Filter</Button>
						) : null}
					</div>
					{filters.filters.map((filterCondition, index) => {
						const columnConfig = getFilterColumnConfig(filterCondition.column);
						return (
							<div key={index} className="space-y-3">
								{index > 0 ? (
									<div className="rounded-lg border border-dashed p-2">
										<label className="text-sm font-medium">Combinator with previous filter</label>
										<Select
											value={filterCondition.joinWithPrevious}
											onValueChange={value => filters.updateFilter(index, { joinWithPrevious: value as OTPLogFilterCombinator })}
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
											<Select value={filterCondition.column} onValueChange={value => filters.handleFilterColumnChange(index, value as OTPLogFilterColumn)}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select column" /></SelectTrigger>
												<SelectContent>
													{otpLogFilterColumns.map(column => (
														<SelectItem key={column.value} value={column.value}>{column.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium">Operator</label>
											<Select value={filterCondition.operator} onValueChange={value => filters.updateFilter(index, { operator: value as OTPLogFilterOperator })}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select operator" /></SelectTrigger>
												<SelectContent>
													{filterOperatorOptions.filter(operator => columnConfig.operators.includes(operator.value)).map(operator => (
														<SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className={cn("space-y-2", columnConfig.valueType == "date" ? "sm:col-span-2" : "")}>
											<label className="text-sm font-medium">Value</label>
											{columnConfig.valueType == "select" ? (
												<Select value={filterCondition.value} onValueChange={value => filters.updateFilter(index, { value })}>
													<SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
													<SelectContent>
														{columnConfig.selectOptions?.map(option => (
															<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : columnConfig.valueType == "date" ? (
												<div className="grid gap-3 sm:grid-cols-2">
													<Input
														type="date"
														value={filterCondition.dateText}
														onChange={event => filters.updateFilter(index, { dateText: event.target.value })}
													/>
													<Input
														type="time"
														value={filterCondition.timeText}
														onChange={event => filters.updateFilter(index, { timeText: event.target.value })}
													/>
												</div>
											) : (
												<Input
													type="text"
													value={filterCondition.value}
													onChange={event => filters.updateFilter(index, { value: event.target.value })}
													placeholder="Enter value"
												/>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
					<div className="flex items-center gap-2">
						<Button type="button" variant="outline" size="sm" onClick={filters.addFilter} disabled={isMutating}>Add filter</Button>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

type OTPLogColumnConfigCardProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	orderedColumns: OTPLogColumnConfig[];
	hiddenColumnIds: OTPLogColumnId[];
	visibleColumnCount: number;
	onToggleColumnVisibility: (columnId: OTPLogColumnId, checked: boolean) => void;
	onReset: () => void;
	onColumnDragStart: (columnId: OTPLogColumnId) => void;
	onColumnDragOver: (event: DragEvent<HTMLDivElement>, targetColumnId: OTPLogColumnId) => void;
	onColumnDragEnd: () => void;
};

export function OTPLogColumnConfigCard({
	isOpen,
	onOpenChange,
	orderedColumns,
	hiddenColumnIds,
	visibleColumnCount,
	onToggleColumnVisibility,
	onReset,
	onColumnDragStart,
	onColumnDragOver,
	onColumnDragEnd,
}: OTPLogColumnConfigCardProps) {
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
							<p className="text-muted-foreground text-sm">Visible {visibleColumnCount} of {otpLogColumns.length}</p>
							<Button type="button" variant="outline" size="sm" onClick={onReset}>Reset</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{orderedColumns.map(column => {
							const isVisible = !hiddenColumnIds.includes(column.id);
							const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= otpLogColumns.length - 1;
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

function renderResponseBadge(value: OTPLogResponse) {
	if (value === "NA") {
		return <span className="text-muted-foreground">na</span>;
	}

	return (
		<Badge variant={value === "Failed" ? "outline" : "default"}>
			{value}
		</Badge>
	);
}

function renderOTPLogCell(row: OTPLogRow, columnId: OTPLogColumnId) {
	if (columnId == "id")
		return <span className="font-mono text-xs">{row.id}</span>;
	if (columnId == "requestDate")
		return row.requestDate;
	if (columnId == "officerName")
		return <span className="font-medium">{row.officerName}</span>;
	if (columnId == "applyId")
		return <span className="font-mono text-xs">{row.applyId}</span>;
	if (columnId == "waNumber")
		return row.waNumber;
	if (columnId == "smsNumber")
		return row.smsNumber;
	if (columnId == "email")
		return row.email;
	if (columnId == "content")
		return row.content;
	if (columnId == "waResponse")
		return renderResponseBadge(row.waResponse);
	if (columnId == "smsResponse")
		return renderResponseBadge(row.smsResponse);
	if (columnId == "emailResponse")
		return renderResponseBadge(row.emailResponse);

	return "-";
}

type OTPLogTableProps = {
	rows: OTPLogRow[];
	columns: OTPLogColumnConfig[];
	isLoading: boolean;
};

export function OTPLogTable({
	rows,
	columns,
	isLoading,
}: OTPLogTableProps) {
	return (
		<Card>
			<Table>
				<TableHeader>
					<TableRow>
						{columns.map(column => (
							<TableHead key={column.id} className={column.headClassName}>{column.label}</TableHead>
						))}
					</TableRow>
				</TableHeader>

				<TableBody>
					{isLoading ? (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="py-8 text-center text-sm text-muted-foreground"
							>
								Loading OTP logs...
							</TableCell>
						</TableRow>
					) : rows.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="py-8 text-center text-sm text-muted-foreground"
							>
								No OTP logs found.
							</TableCell>
						</TableRow>
					) : (
						rows.map(row => (
							<TableRow key={row.id}>
								{columns.map(column => (
									<TableCell key={column.id} className={column.cellClassName}>
										{renderOTPLogCell(row, column.id)}
									</TableCell>
								))}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</Card>
	);
}
