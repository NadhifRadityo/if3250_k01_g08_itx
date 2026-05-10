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
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/radix/Table";
import type { RecordingLogRow } from "./layout.action";


export type RecordingLogColumnId =
	"id" |
	"officerName" |
	"applyId" |
	"phoneNumber" |
	"recordedAt" |
	"duration" |
	"recordingName" |
	"speechToTextName" 
	;
export type RecordingLogColumnConfig = {
	id: RecordingLogColumnId;
	label: string;
	headClassName?: string;
	cellClassName?: string;
};

export type RecordingLogFilterColumn =
	"id" |
	"officerName" |
	"applyId" |
	"phoneNumber" |
	"recordedAt" |
	"duration" |
	"recordingName" |
	"speechToTextName" 
	;export type RecordingLogFilterOperator = "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than";
export type RecordingLogFilterCombinator = "and" | "or";
export type FilterValueType = "text" | "number" | "date" | "select";

export type FilterColumnOption = {
	value: RecordingLogFilterColumn;
	label: string;
	valueType: FilterValueType;
	operators: RecordingLogFilterOperator[];
	selectOptions?: Array<{ value: string, label: string }>;
};

export type FilterCondition = {
	column: RecordingLogFilterColumn;
	operator: RecordingLogFilterOperator;
	joinWithPrevious: RecordingLogFilterCombinator;
	value: string;
	dateText: string;
	timeText: string;
};

export const RECORDING_LOG_COLUMN_PREFERENCES_KEY = "monitoring-log-recording-columns-v1";

export const recordingLogColumns: RecordingLogColumnConfig[] = [
	{ id: "id", label: "Log ID", cellClassName: "font-mono text-xs" },
	{ id: "officerName", label: "Officer", cellClassName: "font-medium" },
	{ id: "applyId", label: "Apply ID" },
	{ id: "phoneNumber", label: "Phone" },
	{ id: "recordingName", label: "Recording" },
	{ id: "speechToTextName", label: "Speech To Text" },
	{ id: "duration", label: "Duration" },
	{ id: "recordedAt", label: "Recorded At" }
];

export const defaultRecordingLogColumnOrder: RecordingLogColumnId[] = recordingLogColumns.map(column => column.id);
export const defaultRecordingLogVisibleColumns: RecordingLogColumnId[] = ["id", "officerName", "applyId", "phoneNumber", "recordingName", "speechToTextName", "duration", "recordedAt"];
export const defaultRecordingLogHiddenColumns: RecordingLogColumnId[] = defaultRecordingLogColumnOrder.filter(columnId => !defaultRecordingLogVisibleColumns.includes(columnId));

export const filterOperatorOptions: Array<{ value: RecordingLogFilterOperator, label: string }> = [
	{ value: "equals", label: "Equals" },
	{ value: "not_equals", label: "Not Equals" },
	{ value: "contains", label: "Contains" },
	{ value: "not_contains", label: "Does Not Contain" },
	{ value: "greater_than", label: "Is Greater Than" },
	{ value: "less_than", label: "Is Less Than" }
];

export const recordingLogFilterColumns: FilterColumnOption[] = [
	{ value: "id", label: "Log ID", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "officerName", label: "Officer", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "applyId", label: "Apply ID", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "phoneNumber", label: "Phone", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "recordingName", label: "Recording", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "speechToTextName", label: "Speech To Text", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "duration", label: "Duration (seconds)", valueType: "number", operators: ["equals", "not_equals", "greater_than", "less_than"] },
	{ value: "recordedAt", label: "Recorded At", valueType: "date", operators: ["equals", "not_equals", "greater_than", "less_than"] }

];

function getFilterColumnConfig(column: RecordingLogFilterColumn): FilterColumnOption {
	return recordingLogFilterColumns.find(option => option.value == column) ?? recordingLogFilterColumns[0];
}

export function createRecordingLogFilterCondition(column: RecordingLogFilterColumn = recordingLogFilterColumns[0].value): FilterCondition {
	const columnConfig = getFilterColumnConfig(column);
	return {
		column,
		operator: columnConfig.operators[0],
		joinWithPrevious: "and",
		value: "",
		dateText: "",
		timeText: "00:00"
	};
}

function parseFilterDate(dateText: string, timeText: string): Date | null {
	if(dateText.trim().length == 0)
		return null;
	const normalizedTime = timeText.trim().length == 0 ? "00:00" : timeText.trim();
	const normalized = `${dateText.trim()}T${normalizedTime}`;
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function matchStringOperator(value: string, operator: RecordingLogFilterOperator, compareValue: string): boolean {
	const source = value.toLowerCase();
	const needle = compareValue.toLowerCase();
	if(operator == "equals")
		return source == needle;
	if(operator == "not_equals")
		return source != needle;
	if(operator == "contains")
		return source.includes(needle);
	if(operator == "not_contains")
		return !source.includes(needle);
	return true;
}

function matchNumberOperator(value: number, operator: RecordingLogFilterOperator, compareValue: number): boolean {
	if(operator == "equals")
		return value == compareValue;
	if(operator == "not_equals")
		return value != compareValue;
	if(operator == "greater_than")
		return value > compareValue;
	if(operator == "less_than")
		return value < compareValue;
	return true;
}

function matchDateOperator(value: Date, operator: RecordingLogFilterOperator, compareValue: Date): boolean {
	if(operator == "equals")
		return value.getTime() == compareValue.getTime();
	if(operator == "not_equals")
		return value.getTime() != compareValue.getTime();
	if(operator == "greater_than")
		return value.getTime() > compareValue.getTime();
	if(operator == "less_than")
		return value.getTime() < compareValue.getTime();
	return true;
}

function evaluateRecordingLogFilter(row: RecordingLogRow, condition: FilterCondition): boolean {
	const columnConfig = getFilterColumnConfig(condition.column);
	if(columnConfig.valueType == "text") {
		if(condition.value.trim().length == 0)
			return true;
		const value = condition.column == "id" ? row.id
			: condition.column == "officerName" ? row.officerName
			: condition.column == "applyId" ? row.applyId
			: condition.column == "phoneNumber" ? row.phoneNumber
			: condition.column == "recordingName" ? row.recordingName
			: condition.column == "speechToTextName" ? row.speechToTextName
			: "-";
		return matchStringOperator(value, condition.operator, condition.value);
	}
	if(columnConfig.valueType == "select") {
		if(condition.value.trim().length == 0)
			return true;
		return matchStringOperator(row.status, condition.operator, condition.value);
	}
	if(columnConfig.valueType == "number") {
		const numericValue = Number(condition.value);
		if(!Number.isFinite(numericValue))
			return true;
		return matchNumberOperator(row.durationSeconds, condition.operator, numericValue);
	}
	if(columnConfig.valueType == "date") {
		const compareDate = parseFilterDate(condition.dateText, condition.timeText);
		if(compareDate == null || row.recordedAtRaw == null)
			return true;
		const rowDate = new Date(row.recordedAtRaw);
		if(Number.isNaN(rowDate.getTime()))
			return true;
		return matchDateOperator(rowDate, condition.operator, compareDate);
	}
	return true;
}

export function applyRecordingLogFilters(rows: RecordingLogRow[], filters: FilterCondition[]): RecordingLogRow[] {
	if(filters.length == 0)
		return rows;
	return rows.filter(row => {
		return filters.reduce<boolean | null>((result, condition, index) => {
			const matches = evaluateRecordingLogFilter(row, condition);
			if(index == 0 || result == null)
				return matches;
			return condition.joinWithPrevious == "and" ? result && matches : result || matches;
		}, null) ?? true;
	});
}

export function reorderColumns(order: RecordingLogColumnId[], sourceId: RecordingLogColumnId, targetId: RecordingLogColumnId): RecordingLogColumnId[] {
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

export function useRecordingLogColumnPreferences() {
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<RecordingLogColumnId[]>(defaultRecordingLogColumnOrder);
	const [hiddenColumns, setHiddenColumns] = useState<RecordingLogColumnId[]>(defaultRecordingLogHiddenColumns);
	const [draggingColumnId, setDraggingColumnId] = useState<RecordingLogColumnId | null>(null);

	useEffect(() => {
		const raw = window.localStorage.getItem(RECORDING_LOG_COLUMN_PREFERENCES_KEY);
		if(raw == null)
			return;
		try {
			const parsed = JSON.parse(raw) as { order?: RecordingLogColumnId[], hidden?: RecordingLogColumnId[] };
			if(Array.isArray(parsed.order) && parsed.order.length > 0)
				setColumnOrder(parsed.order);
			if(Array.isArray(parsed.hidden))
				setHiddenColumns(parsed.hidden);
		} catch {
			return;
		}
	}, []);

	useEffect(() => {
		const payload = JSON.stringify({ order: columnOrder, hidden: hiddenColumns });
		window.localStorage.setItem(RECORDING_LOG_COLUMN_PREFERENCES_KEY, payload);
	}, [columnOrder, hiddenColumns]);

	const orderedColumns = useMemo(() => {
		const lookup = new Map(recordingLogColumns.map(column => [column.id, column]));
		return columnOrder.map(columnId => lookup.get(columnId)).filter((value): value is RecordingLogColumnConfig => value != null);
	}, [columnOrder]);

	const visibleColumns = orderedColumns.filter(column => !hiddenColumns.includes(column.id));

	const onToggleColumnVisibility = (columnId: RecordingLogColumnId, checked: boolean) => {
		setHiddenColumns(prev => {
			if(checked)
				return prev.filter(id => id != columnId);
			return prev.includes(columnId) ? prev : [...prev, columnId];
		});
	};

	const onResetColumns = () => {
		setColumnOrder(defaultRecordingLogColumnOrder);
		setHiddenColumns(defaultRecordingLogHiddenColumns);
	};

	const onColumnDragStart = (columnId: RecordingLogColumnId) => {
		setDraggingColumnId(columnId);
	};

	const onColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: RecordingLogColumnId) => {
		event.preventDefault();
		if(draggingColumnId == null || draggingColumnId == targetColumnId)
			return;
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
		onColumnDragEnd
	};
}

export function useRecordingLogFilters() {
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters] = useState<FilterCondition[]>([createRecordingLogFilterCondition()]);

	const appliedFilters = useMemo(() => {
		return filters.filter(condition => {
			const columnConfig = getFilterColumnConfig(condition.column);
			if(columnConfig.valueType == "date")
				return condition.dateText.trim().length > 0;
			return condition.value.trim().length > 0;
		});
	}, [filters]);

	const addFilter = () => setFilters(prev => [...prev, createRecordingLogFilterCondition()]);

	const removeFilter = (index: number) => setFilters(prev => prev.filter((_, idx) => idx != index));

	const clearFilters = () => setFilters([createRecordingLogFilterCondition()]);

	const updateFilter = (index: number, next: Partial<FilterCondition>) => {
		setFilters(prev => prev.map((filter, idx) => idx == index ? { ...filter, ...next } : filter));
	};

	const handleFilterColumnChange = (index: number, column: RecordingLogFilterColumn) => {
		const columnConfig = getFilterColumnConfig(column);
		setFilters(prev => prev.map((filter, idx) => idx == index ? {
			...filter,
			column,
			operator: columnConfig.operators[0],
			value: "",
			dateText: "",
			timeText: "00:00"
		} : filter));
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
		handleFilterColumnChange
	};
}

type RecordingLogFiltersCardProps = {
	isLoading: boolean;
	isMutating: boolean;
	filters: ReturnType<typeof useRecordingLogFilters>;
};

export function RecordingLogFiltersCard({ isLoading, isMutating, filters }: RecordingLogFiltersCardProps) {
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
											onValueChange={value => filters.updateFilter(index, { joinWithPrevious: value as RecordingLogFilterCombinator })}
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
											<Select value={filterCondition.column} onValueChange={value => filters.handleFilterColumnChange(index, value as RecordingLogFilterColumn)}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select column" /></SelectTrigger>
												<SelectContent>
													{recordingLogFilterColumns.map(column => (
														<SelectItem key={column.value} value={column.value}>{column.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium">Operator</label>
											<Select value={filterCondition.operator} onValueChange={value => filters.updateFilter(index, { operator: value as RecordingLogFilterOperator })}>
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
													type={columnConfig.valueType == "number" ? "number" : "text"}
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

type RecordingLogColumnConfigCardProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	orderedColumns: RecordingLogColumnConfig[];
	hiddenColumnIds: RecordingLogColumnId[];
	visibleColumnCount: number;
	onToggleColumnVisibility: (columnId: RecordingLogColumnId, checked: boolean) => void;
	onReset: () => void;
	onColumnDragStart: (columnId: RecordingLogColumnId) => void;
	onColumnDragOver: (event: DragEvent<HTMLDivElement>, targetColumnId: RecordingLogColumnId) => void;
	onColumnDragEnd: () => void;
};

export function RecordingLogColumnConfigCard({
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
}: RecordingLogColumnConfigCardProps) {
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
							<p className="text-muted-foreground text-sm">Visible {visibleColumnCount} of {recordingLogColumns.length}</p>
							<Button type="button" variant="outline" size="sm" onClick={onReset}>Reset</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{orderedColumns.map(column => {
							const isVisible = !hiddenColumnIds.includes(column.id);
							const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= recordingLogColumns.length - 1;
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

type RecordingLogTableProps = {
	rows: RecordingLogRow[];
	columns: RecordingLogColumnConfig[];
};

function renderRecordingLogCell(row: RecordingLogRow, columnId: RecordingLogColumnId) {
	if(columnId == "id")
		return <span className="font-mono text-xs">{row.id}</span>;
	if(columnId == "officerName")
		return <span className="font-medium">{row.officerName}</span>;
	if(columnId == "applyId")
		return row.applyId;
	if(columnId == "phoneNumber")
		return row.phoneNumber;
	if(columnId == "recordingName")
		return row.recordingUrl ? (
			<a
				href={row.recordingUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="text-primary underline-offset-4 hover:underline"
			>
				{row.recordingName}
			</a>
		) : row.recordingName;

	if(columnId == "speechToTextName")
		return row.speechToTextUrl ? (
			<a
				href={row.speechToTextUrl}
				target="_blank"
				rel="noopener noreferrer"
				className="text-primary underline-offset-4 hover:underline"
			>
				{row.speechToTextName}
			</a>
		) : row.speechToTextName;
	if(columnId == "duration")
		return row.duration;
	if(columnId == "recordedAt")
		return row.recordedAt;
	if(columnId == "status")
		return <Badge variant={row.status == "Missing" ? "outline" : "default"}>{row.status}</Badge>;
	return "-";
}



export function RecordingLogTable({ rows, columns }: RecordingLogTableProps) {
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
					{rows.length == 0 ? (
						<TableRow>
							<TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
								No recording logs match this keyword.
							</TableCell>
						</TableRow>
					) : (
						rows.map(row => (
							<TableRow key={row.id}>
								{columns.map(column => (
									<TableCell key={column.id} className={column.cellClassName}>
										{renderRecordingLogCell(row, column.id)}
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
