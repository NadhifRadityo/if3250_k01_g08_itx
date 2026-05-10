"use client";

import { useEffect, useMemo, useState, type DragEvent, ComponentType } from "react";
import { GripVerticalIcon, XIcon } from "lucide-react";

import cn from "@/utils/cn";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Card } from "@/components/radix/Card";
import { Checkbox } from "@/components/radix/Checkbox";
import { Collapsible, CollapsibleContent } from "@/components/radix/Collapsible";
import { Input } from "@/components/radix/Input";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/radix/Table";

import type { GPSPoint, OfficerTrackingRow } from "./layout.action";
import dynamic from "next/dynamic";

function formatPopupTime(value: string) {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return value;

	return `${date.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})} ${date.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	})}`;
}

type OfficerTrackingToolbarProps = {
	keyword: string;
	onKeywordChange: (value: string) => void;
};

export function OfficerTrackingToolbar({ keyword, onKeywordChange }: OfficerTrackingToolbarProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background p-4">
			<div className="min-w-[220px] flex-1">
				<Input
					value={keyword}
					onChange={event => onKeywordChange(event.target.value)}
					placeholder="Search officer by name, team, or location"
				/>
			</div>
		</div>
	);
}

type OfficerTrackingMapProps = {
	officer: OfficerTrackingRow | null;
};



const OfficerTrackingLeafletMap = dynamic(
	() => import("./officer-tracking-leaflet-map"),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				Loading map...
			</div>
		),
	},
);

export function OfficerTrackingMap({ officer }: OfficerTrackingMapProps) {
	const points = officer?.points ?? [];
	const latestPoint = points[points.length - 1];

	if (!officer || !latestPoint) {
		return (
			<Card>
				<div className="flex h-[420px] items-center justify-center p-4 text-sm text-muted-foreground">
					No GPS data available.
				</div>
			</Card>
		);
	}

	const positions = points.map(point => [
		point.latitude,
		point.longitude,
	]) as [number, number][];

	return (
		<Card>
			<div className="flex flex-col gap-3 p-4">
				<div>
					<p className="text-sm font-medium text-foreground">
						{officer.officerName} Tracking
					</p>
					<p className="text-xs text-muted-foreground">
						{points.length} GPS points recorded
					</p>
				</div>

				<div className="h-[420px] overflow-hidden rounded-md border border-border/60">
					<OfficerTrackingLeafletMap points={points} />
				</div>
			</div>
		</Card>
	);
}

export type OfficerTrackingColumnId = "teamName" | "officerName" | "status" | "lastSeen" | "location" | "tracking";

export type OfficerTrackingColumnConfig = {
	id: OfficerTrackingColumnId;
	label: string;
	headClassName?: string;
	cellClassName?: string;
};

export type OfficerTrackingFilterColumn = "teamName" | "officerName" | "status" | "lastSeen" | "location";
export type OfficerTrackingFilterOperator = "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than";
export type OfficerTrackingFilterCombinator = "and" | "or";
export type FilterValueType = "text" | "date" | "select";

export type FilterColumnOption = {
	value: OfficerTrackingFilterColumn;
	label: string;
	valueType: FilterValueType;
	operators: OfficerTrackingFilterOperator[];
	selectOptions?: Array<{ value: string, label: string }>;
};

export type FilterCondition = {
	column: OfficerTrackingFilterColumn;
	operator: OfficerTrackingFilterOperator;
	joinWithPrevious: OfficerTrackingFilterCombinator;
	value: string;
	dateText: string;
	timeText: string;
};

export const OFFICER_TRACKING_COLUMN_PREFERENCES_KEY = "monitoring-officer-tracking-columns-v1";

export const officerTrackingColumns: OfficerTrackingColumnConfig[] = [
	{ id: "teamName", label: "Team Name" },
	{ id: "officerName", label: "Officer Name", cellClassName: "font-medium" },
	{ id: "status", label: "Status" },
	{ id: "lastSeen", label: "Last Seen" },
	{ id: "location", label: "GPS Coordinate", cellClassName: "font-mono text-xs" },
	{ id: "tracking", label: "Tracking", headClassName: "text-right" }
];

export const defaultOfficerTrackingColumnOrder: OfficerTrackingColumnId[] = officerTrackingColumns.map(column => column.id);
export const defaultOfficerTrackingVisibleColumns: OfficerTrackingColumnId[] = ["teamName", "officerName", "status", "lastSeen", "location", "tracking"];
export const defaultOfficerTrackingHiddenColumns: OfficerTrackingColumnId[] = defaultOfficerTrackingColumnOrder.filter(columnId => !defaultOfficerTrackingVisibleColumns.includes(columnId));

export const filterOperatorOptions: Array<{ value: OfficerTrackingFilterOperator, label: string }> = [
	{ value: "equals", label: "Equals" },
	{ value: "not_equals", label: "Not Equals" },
	{ value: "contains", label: "Contains" },
	{ value: "not_contains", label: "Does Not Contain" },
	{ value: "greater_than", label: "Is Greater Than" },
	{ value: "less_than", label: "Is Less Than" }
];

export const officerTrackingFilterColumns: FilterColumnOption[] = [
	{ value: "teamName", label: "Team Name", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "officerName", label: "Officer Name", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] },
	{ value: "status", label: "Status", valueType: "select", operators: ["equals", "not_equals"], selectOptions: [
		{ value: "On Duty", label: "On Duty" },
		{ value: "Offline", label: "Offline" }
	] },
	{ value: "lastSeen", label: "Last Seen", valueType: "date", operators: ["equals", "not_equals", "greater_than", "less_than"] },
	{ value: "location", label: "GPS Coordinate", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains"] }
];

function getFilterColumnConfig(column: OfficerTrackingFilterColumn): FilterColumnOption {
	return officerTrackingFilterColumns.find(option => option.value == column) ?? officerTrackingFilterColumns[0];
}

export function createOfficerTrackingFilterCondition(column: OfficerTrackingFilterColumn = officerTrackingFilterColumns[0].value): FilterCondition {
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

function matchStringOperator(value: string, operator: OfficerTrackingFilterOperator, compareValue: string): boolean {
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

function matchDateOperator(value: Date, operator: OfficerTrackingFilterOperator, compareValue: Date): boolean {
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

function evaluateOfficerTrackingFilter(row: OfficerTrackingRow, condition: FilterCondition): boolean {
	const columnConfig = getFilterColumnConfig(condition.column);
	if(columnConfig.valueType == "text") {
		if(condition.value.trim().length == 0)
			return true;
		const value = condition.column == "teamName" ? row.teamName
			: condition.column == "officerName" ? row.officerName
			: row.location;
		return matchStringOperator(value, condition.operator, condition.value);
	}
	if(columnConfig.valueType == "select") {
		if(condition.value.trim().length == 0)
			return true;
		return matchStringOperator(row.status, condition.operator, condition.value);
	}
	if(columnConfig.valueType == "date") {
		const compareDate = parseFilterDate(condition.dateText, condition.timeText);
		if(compareDate == null)
			return true;
		const rowDate = new Date(row.lastSeenRaw);
		if(Number.isNaN(rowDate.getTime()))
			return true;
		return matchDateOperator(rowDate, condition.operator, compareDate);
	}
	return true;
}

export function applyOfficerTrackingFilters(rows: OfficerTrackingRow[], filters: FilterCondition[]): OfficerTrackingRow[] {
	if(filters.length == 0)
		return rows;
	return rows.filter(row => {
		return filters.reduce<boolean | null>((result, condition, index) => {
			const matches = evaluateOfficerTrackingFilter(row, condition);
			if(index == 0 || result == null)
				return matches;
			return condition.joinWithPrevious == "and" ? result && matches : result || matches;
		}, null) ?? true;
	});
}

export function reorderColumns(order: OfficerTrackingColumnId[], sourceId: OfficerTrackingColumnId, targetId: OfficerTrackingColumnId): OfficerTrackingColumnId[] {
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

export function useOfficerTrackingColumnPreferences() {
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<OfficerTrackingColumnId[]>(defaultOfficerTrackingColumnOrder);
	const [hiddenColumns, setHiddenColumns] = useState<OfficerTrackingColumnId[]>(defaultOfficerTrackingHiddenColumns);
	const [draggingColumnId, setDraggingColumnId] = useState<OfficerTrackingColumnId | null>(null);

	useEffect(() => {
		const raw = window.localStorage.getItem(OFFICER_TRACKING_COLUMN_PREFERENCES_KEY);
		if(raw == null)
			return;
		try {
			const parsed = JSON.parse(raw) as { order?: OfficerTrackingColumnId[], hidden?: OfficerTrackingColumnId[] };
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
		window.localStorage.setItem(OFFICER_TRACKING_COLUMN_PREFERENCES_KEY, payload);
	}, [columnOrder, hiddenColumns]);

	const orderedColumns = useMemo(() => {
		const lookup = new Map(officerTrackingColumns.map(column => [column.id, column]));
		return columnOrder.map(columnId => lookup.get(columnId)).filter((value): value is OfficerTrackingColumnConfig => value != null);
	}, [columnOrder]);

	const visibleColumns = orderedColumns.filter(column => !hiddenColumns.includes(column.id));

	const onToggleColumnVisibility = (columnId: OfficerTrackingColumnId, checked: boolean) => {
		setHiddenColumns(prev => {
			if(checked)
				return prev.filter(id => id != columnId);
			return prev.includes(columnId) ? prev : [...prev, columnId];
		});
	};

	const onResetColumns = () => {
		setColumnOrder(defaultOfficerTrackingColumnOrder);
		setHiddenColumns(defaultOfficerTrackingHiddenColumns);
	};

	const onColumnDragStart = (columnId: OfficerTrackingColumnId) => {
		setDraggingColumnId(columnId);
	};

	const onColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: OfficerTrackingColumnId) => {
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

export function useOfficerTrackingFilters() {
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters] = useState<FilterCondition[]>([createOfficerTrackingFilterCondition()]);

	const appliedFilters = useMemo(() => {
		return filters.filter(condition => {
			const columnConfig = getFilterColumnConfig(condition.column);
			if(columnConfig.valueType == "date")
				return condition.dateText.trim().length > 0;
			return condition.value.trim().length > 0;
		});
	}, [filters]);

	const addFilter = () => setFilters(prev => [...prev, createOfficerTrackingFilterCondition()]);

	const removeFilter = (index: number) => setFilters(prev => prev.filter((_, idx) => idx != index));

	const clearFilters = () => setFilters([createOfficerTrackingFilterCondition()]);

	const updateFilter = (index: number, next: Partial<FilterCondition>) => {
		setFilters(prev => prev.map((filter, idx) => idx == index ? { ...filter, ...next } : filter));
	};

	const handleFilterColumnChange = (index: number, column: OfficerTrackingFilterColumn) => {
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

type OfficerTrackingFiltersCardProps = {
	isLoading: boolean;
	isMutating: boolean;
	filters: ReturnType<typeof useOfficerTrackingFilters>;
};

export function OfficerTrackingFiltersCard({ isLoading, isMutating, filters }: OfficerTrackingFiltersCardProps) {
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
											onValueChange={value => filters.updateFilter(index, { joinWithPrevious: value as OfficerTrackingFilterCombinator })}
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
											<Select value={filterCondition.column} onValueChange={value => filters.handleFilterColumnChange(index, value as OfficerTrackingFilterColumn)}>
												<SelectTrigger className="w-full"><SelectValue placeholder="Select column" /></SelectTrigger>
												<SelectContent>
													{officerTrackingFilterColumns.map(column => (
														<SelectItem key={column.value} value={column.value}>{column.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<label className="text-sm font-medium">Operator</label>
											<Select value={filterCondition.operator} onValueChange={value => filters.updateFilter(index, { operator: value as OfficerTrackingFilterOperator })}>
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

type OfficerTrackingColumnConfigCardProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	orderedColumns: OfficerTrackingColumnConfig[];
	hiddenColumnIds: OfficerTrackingColumnId[];
	visibleColumnCount: number;
	onToggleColumnVisibility: (columnId: OfficerTrackingColumnId, checked: boolean) => void;
	onReset: () => void;
	onColumnDragStart: (columnId: OfficerTrackingColumnId) => void;
	onColumnDragOver: (event: DragEvent<HTMLDivElement>, targetColumnId: OfficerTrackingColumnId) => void;
	onColumnDragEnd: () => void;
};

export function OfficerTrackingColumnConfigCard({
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
}: OfficerTrackingColumnConfigCardProps) {
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
							<p className="text-muted-foreground text-sm">Visible {visibleColumnCount} of {officerTrackingColumns.length}</p>
							<Button type="button" variant="outline" size="sm" onClick={onReset}>Reset</Button>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{orderedColumns.map(column => {
							const isVisible = !hiddenColumnIds.includes(column.id);
							const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= officerTrackingColumns.length - 1;
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

type OfficerTrackingTableProps = {
	rows: OfficerTrackingRow[];
	isLoading: boolean;
	columns: OfficerTrackingColumnConfig[];
	selectedOfficerId?: string;
	onTrackOfficer: (row: OfficerTrackingRow) => void;
};

function renderOfficerTrackingCell(
	row: OfficerTrackingRow,
	columnId: OfficerTrackingColumnId,
	selectedOfficerId: string | undefined,
	onTrackOfficer: (row: OfficerTrackingRow) => void
) {
	if(columnId == "teamName")
		return row.teamName;
	if(columnId == "officerName")
		return <span className="font-medium">{row.officerName}</span>;
	if(columnId == "status")
		return (
			<Badge variant={row.status === "Offline" ? "outline" : "default"}>
				{row.status}
			</Badge>
		);
	if(columnId == "lastSeen")
		return row.lastSeen;
	if(columnId == "location")
		return <span className="font-mono text-xs">{row.location}</span>;
	if(columnId == "tracking")
		return (
			<Button
				size="sm"
				variant={selectedOfficerId === row.id ? "default" : "outline"}
				onClick={() => onTrackOfficer(row)}
			>
				Tracking
			</Button>
		);
	return "-";
}

export function OfficerTrackingTable({
	rows,
	isLoading,
	columns,
	selectedOfficerId,
	onTrackOfficer,
}: OfficerTrackingTableProps) {
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
							<TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
								Loading officer tracking data...
							</TableCell>
						</TableRow>
					) : rows.length === 0 ? (
						<TableRow>
							<TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
								No officers match this keyword.
							</TableCell>
						</TableRow>
					) : (
						rows.map(row => (
							<TableRow key={row.id}>
								{columns.map(column => (
									<TableCell key={column.id} className={column.cellClassName}>
										{renderOfficerTrackingCell(row, column.id, selectedOfficerId, onTrackOfficer)}
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
