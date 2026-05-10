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

export type GpsLogRow = {
	id: string;
	officerName: string;
	applyId: string;
	coordinates: string;
	ip: string;
	recordedAt: string;
	recordedAtRaw?: string | null;
	status: "Valid" | "Warning" | "Missing";
};

export type GpsLogColumnId =
	| "id"
	| "officerName"
	| "applyId"
	| "coordinates"
	| "ip"
	| "recordedAt"
	| "status";

export type GpsLogFilterColumn = GpsLogColumnId;

export type GpsLogFilterOperator =
	| "equals"
	| "not_equals"
	| "contains"
	| "not_contains"
	| "greater_than"
	| "less_than";

export type GpsLogFilterCombinator = "and" | "or";

export type FilterColumnOption = {
	value: GpsLogFilterColumn;
	label: string;
	valueType: "text" | "date" | "select";
	operators: GpsLogFilterOperator[];
	selectOptions?: Array<{
		value: string;
		label: string;
	}>;
};

export type FilterCondition = {
	column: GpsLogFilterColumn;
	operator: GpsLogFilterOperator;
	joinWithPrevious: GpsLogFilterCombinator;
	value: string;
	dateText: string;
	timeText: string;
};

export type GpsLogColumnConfig = {
	id: GpsLogColumnId;
	label: string;
	headClassName?: string;
	cellClassName?: string;
};

const GPS_LOG_COLUMN_PREFERENCES_KEY = "gps-log-column-preferences";

export const defaultGpsLogColumnOrder: GpsLogColumnId[] = [
	"id",
	"officerName",
	"applyId",
	"coordinates",
	"ip",
	"recordedAt",
	"status",
];

export const defaultGpsLogHiddenColumns: GpsLogColumnId[] = [];

export const gpsLogColumns: GpsLogColumnConfig[] = [
	{ id: "id", label: "Log ID", cellClassName: "font-mono text-xs" },
	{ id: "officerName", label: "Officer", cellClassName: "font-medium" },
	{ id: "applyId", label: "Apply ID", cellClassName: "font-mono text-xs" },
	{ id: "coordinates", label: "GPS Coordinate", cellClassName: "font-mono text-xs" },
	{ id: "ip", label: "IP" },
	{ id: "recordedAt", label: "Time" },
	{ id: "status", label: "Status" },
];

export const defaultGpsLogVisibleColumns: GpsLogColumnId[] = [
	"id",
	"officerName",
	"applyId",
	"coordinates",
	"ip",
	"recordedAt",
	"status",
]

export const filterOperatorOptions: Array<{ value: GpsLogFilterOperator, label: string }> = [
	{ value: "equals", label: "Equals" },
	{ value: "not_equals", label: "Not Equals" },
	{ value: "contains", label: "Contains" },
	{ value: "not_contains", label: "Does Not Contain" },
	{ value: "greater_than", label: "Is Greater Than" },
	{ value: "less_than", label: "Is Less Than" }
];

export const gpsLogFilterColumns: FilterColumnOption[] = [
	{ value: "id", label: "Log ID", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "officerName", label: "Officer", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "coordinates", label: "Coordinates", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "recordedAt", label: "Recorded At", valueType: "date", operators: ["equals", "not_equals", "greater_than", "less_than"] },
	{ value: "status", label: "Status", valueType: "select", operators: ["equals", "not_equals"], selectOptions: [
		{ value: "Valid", label: "Valid" },
		{ value: "Warning", label: "Warning" },
		{ value: "Missing", label: "Missing" }
	] }
];

function getFilterColumnConfig(column: GpsLogFilterColumn): FilterColumnOption {
	return gpsLogFilterColumns.find(option => option.value == column) ?? gpsLogFilterColumns[0];
}

export function createGpsLogFilterCondition(column: GpsLogFilterColumn = gpsLogFilterColumns[0].value): FilterCondition {
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

function matchStringOperator(value: string, operator: GpsLogFilterOperator, compareValue: string): boolean {
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

function matchDateOperator(value: Date, operator: GpsLogFilterOperator, compareValue: Date): boolean {
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

function evaluateGpsLogFilter(row: GpsLogRow, condition: FilterCondition): boolean {
	const columnConfig = getFilterColumnConfig(condition.column);
	if(columnConfig.valueType == "text") {
		if(condition.value.trim().length == 0)
			return true;
		const value = condition.column == "id" ? row.id
			: condition.column == "officerName" ? row.officerName
			: condition.column == "applyId" ? row.applyId
			: condition.column == "coordinates" ? row.coordinates
			: condition.column == "ip" ? row.ip
			: row.recordedAt;
		return matchStringOperator(value, condition.operator, condition.value);
	}
	if(columnConfig.valueType == "select") {
		if(condition.value.trim().length == 0)
			return true;
		return matchStringOperator(row.status, condition.operator, condition.value);
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

export function applyGpsLogFilters(rows: GpsLogRow[], filters: FilterCondition[]): GpsLogRow[] {
	if(filters.length == 0)
		return rows;
	return rows.filter(row => {
		return filters.reduce<boolean | null>((result, condition, index) => {
			const matches = evaluateGpsLogFilter(row, condition);
			if(index == 0 || result == null)
				return matches;
			return condition.joinWithPrevious == "and" ? result && matches : result || matches;
		}, null) ?? true;
	});
}

export function reorderColumns(order: GpsLogColumnId[], sourceId: GpsLogColumnId, targetId: GpsLogColumnId): GpsLogColumnId[] {
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

export function useGpsLogColumnPreferences() {
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<GpsLogColumnId[]>(defaultGpsLogColumnOrder);
	const [hiddenColumns, setHiddenColumns] = useState<GpsLogColumnId[]>(defaultGpsLogHiddenColumns);
	const [draggingColumnId, setDraggingColumnId] = useState<GpsLogColumnId | null>(null);

	useEffect(() => {
		const raw = window.localStorage.getItem(GPS_LOG_COLUMN_PREFERENCES_KEY);
		if(raw == null)
			return;
		try {
			const parsed = JSON.parse(raw) as { order?: GpsLogColumnId[], hidden?: GpsLogColumnId[] };
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
		window.localStorage.setItem(GPS_LOG_COLUMN_PREFERENCES_KEY, payload);
	}, [columnOrder, hiddenColumns]);

	const orderedColumns = useMemo(() => {
		const lookup = new Map(gpsLogColumns.map(column => [column.id, column]));
		return columnOrder.map(columnId => lookup.get(columnId)).filter((value): value is GpsLogColumnConfig => value != null);
	}, [columnOrder]);

	const visibleColumns = orderedColumns.filter(column => !hiddenColumns.includes(column.id));

	const onToggleColumnVisibility = (columnId: GpsLogColumnId, checked: boolean) => {
		setHiddenColumns(prev => {
			if(checked)
				return prev.filter(id => id != columnId);
			return prev.includes(columnId) ? prev : [...prev, columnId];
		});
	};

	const onResetColumns = () => {
		setColumnOrder(defaultGpsLogColumnOrder);
		setHiddenColumns(defaultGpsLogHiddenColumns);
	};

	const onColumnDragStart = (columnId: GpsLogColumnId) => {
		setDraggingColumnId(columnId);
	};

	const onColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: GpsLogColumnId) => {
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

export function useGpsLogFilters() {
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters] = useState<FilterCondition[]>([createGpsLogFilterCondition()]);

	const appliedFilters = useMemo(() => {
		return filters.filter(condition => {
			const columnConfig = getFilterColumnConfig(condition.column);
			if(columnConfig.valueType == "date")
				return condition.dateText.trim().length > 0;
			return condition.value.trim().length > 0;
		});
	}, [filters]);

	const addFilter = () => setFilters(prev => [...prev, createGpsLogFilterCondition()]);

	const removeFilter = (index: number) => setFilters(prev => prev.filter((_, idx) => idx != index));

	const clearFilters = () => setFilters([createGpsLogFilterCondition()]);

	const updateFilter = (index: number, next: Partial<FilterCondition>) => {
		setFilters(prev => prev.map((filter, idx) => idx == index ? { ...filter, ...next } : filter));
	};

	const handleFilterColumnChange = (index: number, column: GpsLogFilterColumn) => {
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

type GpsLogFiltersCardProps = {
	isLoading: boolean;
	isMutating: boolean;
	filters: ReturnType<typeof useGpsLogFilters>;
};

export function GpsLogFiltersCard({ isLoading, isMutating, filters }: GpsLogFiltersCardProps) {
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
											onValueChange={value => filters.updateFilter(index, { joinWithPrevious: value as GpsLogFilterCombinator })}
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
											<Select value={filterCondition.column} onValueChange={value => filters.handleFilterColumnChange(index, value as GpsLogFilterColumn)}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select column" /></SelectTrigger>
												<SelectContent>
													{gpsLogFilterColumns.map(column => (
														<SelectItem key={column.value} value={column.value}>{column.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium">Operator</label>
											<Select value={filterCondition.operator} onValueChange={value => filters.updateFilter(index, { operator: value as GpsLogFilterOperator })}>
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

type GpsLogColumnConfigCardProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	orderedColumns: GpsLogColumnConfig[];
	hiddenColumnIds: GpsLogColumnId[];
	visibleColumnCount: number;
	onToggleColumnVisibility: (columnId: GpsLogColumnId, checked: boolean) => void;
	onReset: () => void;
	onColumnDragStart: (columnId: GpsLogColumnId) => void;
	onColumnDragOver: (event: DragEvent<HTMLDivElement>, targetColumnId: GpsLogColumnId) => void;
	onColumnDragEnd: () => void;
};

export function GpsLogColumnConfigCard({
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
}: GpsLogColumnConfigCardProps) {
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
							<p className="text-muted-foreground text-sm">Visible {visibleColumnCount} of {gpsLogColumns.length}</p>
							<Button type="button" variant="outline" size="sm" onClick={onReset}>Reset</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{orderedColumns.map(column => {
							const isVisible = !hiddenColumnIds.includes(column.id);
							const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= gpsLogColumns.length - 1;
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

type GpsLogTableProps = {
	rows: GpsLogRow[];
	columns: GpsLogColumnConfig[];
};

function renderGpsLogCell(row: GpsLogRow, columnId: GpsLogColumnId) {
	if (columnId == "id")
		return <span className="font-mono text-xs">{row.id}</span>;
	if (columnId == "officerName")
		return <span className="font-medium">{row.officerName}</span>;
	if (columnId == "applyId")
		return <span className="font-mono text-xs">{row.applyId}</span>;
	if (columnId == "coordinates")
		return <span className="font-mono text-xs">{row.coordinates}</span>;
	if (columnId == "ip")
		return row.ip;
	if (columnId == "recordedAt")
		return row.recordedAt;
	if (columnId == "status")
		return <Badge variant={row.status == "Missing" ? "outline" : "default"}>{row.status}</Badge>;

	return "-";
}

export function GpsLogTable({ rows, columns }: GpsLogTableProps) {
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
								No GPS logs match this keyword.
							</TableCell>
						</TableRow>
					) : (
						rows.map(row => (
							<TableRow key={row.id}>
								{columns.map(column => (
									<TableCell key={column.id} className={column.cellClassName}>
										{renderGpsLogCell(row, column.id)}
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
