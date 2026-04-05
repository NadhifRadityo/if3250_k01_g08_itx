"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon, CheckIcon, GripVerticalIcon, HistoryIcon, PlusIcon, XIcon } from "lucide-react";

import cn from "@/utils/cn";
import { Link } from "@/components/Link";
import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Calendar } from "@/components/radix/Calendar";
import { Checkbox } from "@/components/radix/Checkbox";
import { Collapsible, CollapsibleContent } from "@/components/radix/Collapsible";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/radix/Popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/radix/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/radix/Table";
import { Textarea } from "@/components/radix/Textarea";

import * as accountAssignmentActions from "./layout.actions";

export type CreditApplicationAssignmentRow = {
	assignmentId: string | null;
	assignmentStatus: accountAssignmentActions.AssignmentStatus;
	applyId: string;
	accountName: string;
	officerName: string | null;
	address: string;
	productCode: string;
	userId: string | null;
	createdById: string | null;
	updatedById: string | null;
	deletedById: string | null;
	reviewedById: string | null;
	requestedAt: string | null;
};

export type CreditApplicationAssignmentSortField =
	| "applyId"
	| "accountName"
	| "officerName"
	| "address"
	| "productCode"
	| "assignmentStatus";

export type CreditApplicationAssignmentColumnId =
	| "applyId"
	| "accountName"
	| "officerName"
	| "address"
	| "productCode"
	| "assignmentStatus";

export type CreditApplicationAssignmentColumnConfig = {
	id: CreditApplicationAssignmentColumnId;
	label: string;
	sortField?: CreditApplicationAssignmentSortField;
	headClassName?: string;
	cellClassName?: string;
};

export type CreditApplicationAssignmentFilterColumn = CreditApplicationAssignmentColumnId;
export type CreditApplicationAssignmentFilterOperator = "equals" | "not_equals" | "contains" | "not_contains" | "in" | "not_in" | "exists";
export type CreditApplicationAssignmentFilterCombinator = "and" | "or";

export type CreditApplicationAssignmentFilterCondition = {
	column: CreditApplicationAssignmentFilterColumn;
	operator: CreditApplicationAssignmentFilterOperator;
	joinWithPrevious: CreditApplicationAssignmentFilterCombinator;
	value: string;
	values: string[];
	existsValue: "true" | "false";
};

export type CreditApplicationAssignmentFilterColumnOption = {
	value: CreditApplicationAssignmentFilterColumn;
	label: string;
	operators: CreditApplicationAssignmentFilterOperator[];
	placeholder?: string;
	selectOptions?: Array<{ value: string; label: string }>;
	searchOptionsAction?: (keyword: string, selectedValues: string[]) => Promise<SearchableSelectOption[]>;
};

export type CreditApplicationAssignmentFilterSummaryItem = {
	combinator: string | null;
	columnLabel: string;
	operatorLabel: string;
	valueLabel: string;
};

export type CreditApplicationAssignmentFormState = {
	assignmentId?: string;
	applyId: string;
	officerIds: string[];
	notes: string;
};

export type CreditApplicationAssignmentReviewState = {
	assignmentId: string;
	reviewReason: string;
};

export type CreditApplicationRelationNavigation = {
	getHrefBase: (managementKey: "user-management" | "role-management" | "team-management" | "credit-application-assignment") => string | null;
	onRelationLinkClick: (event: MouseEvent<HTMLAnchorElement>, request: {
		targetManagementKey: "user-management" | "role-management" | "team-management" | "credit-application-assignment";
		hrefBase: string;
		relationFilters: unknown;
		relationContext?: string;
	}) => void;
	onOpenSummary: (request: {
		type: "user" | "role" | "team";
		id: string;
		fallbackTitle: string;
		fallbackDescription?: string;
		fallbackMeta?: Array<{ label: string; value: string }>;
	}) => void;
};

export type CreditApplicationCellRenderContext = {
	hasEditorAccess: boolean;
	hasAuditorAccess: boolean;
	relationNavigation?: CreditApplicationRelationNavigation;
};

export type CreditApplicationAssignmentQueryInput = {
	mode: "viewer" | "editor" | "approver";
	debouncedKeyword: string;
	sortTokens: string[];
	appliedFilters: accountAssignmentActions.AccountAssignmentFilterInput[];
	isFilterStateReady: boolean;
	page: number;
	limit: number;
	enabled?: boolean;
};

type CreditApplicationAssignmentQueryMode = CreditApplicationAssignmentQueryInput["mode"];
type CreditApplicationAssignmentQueryResult = accountAssignmentActions.AccountAssignmentEditorListOutput;

export const CREDIT_APPLICATION_ASSIGNMENT_PAGE_SIZE = 20;
export const CREDIT_APPLICATION_ASSIGNMENT_COLUMN_PREFERENCES_KEY = "credit-application-assignment-columns-v1";

export const creditApplicationAssignmentColumns: CreditApplicationAssignmentColumnConfig[] = [
	{ id: "applyId", label: "Apply ID", sortField: "applyId", cellClassName: "font-mono text-xs" },
	{ id: "accountName", label: "Account Name", sortField: "accountName", cellClassName: "font-medium" },
	{ id: "officerName", label: "Officer Name", sortField: "officerName" },
	{ id: "address", label: "Address", sortField: "address", cellClassName: "max-w-[320px] overflow-hidden text-ellipsis whitespace-nowrap" },
	{ id: "productCode", label: "Product Code", sortField: "productCode" },
	{ id: "assignmentStatus", label: "Status", sortField: "assignmentStatus" }
];

export const defaultCreditApplicationAssignmentColumnOrder = creditApplicationAssignmentColumns.map(column => column.id);
export const defaultCreditApplicationAssignmentVisibleColumns: CreditApplicationAssignmentColumnId[] = ["applyId", "accountName", "officerName", "productCode", "assignmentStatus"];
export const defaultCreditApplicationAssignmentHiddenColumns = defaultCreditApplicationAssignmentColumnOrder.filter(
	columnId => !defaultCreditApplicationAssignmentVisibleColumns.includes(columnId)
);

export const creditApplicationAssignmentFilterColumns: CreditApplicationAssignmentFilterColumnOption[] = [
	{ value: "applyId", label: "Apply ID", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter apply ID" },
	{ value: "accountName", label: "Account Name", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter account name" },
	{ value: "officerName", label: "Officer Name", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter officer name" },
	{ value: "address", label: "Address", operators: ["contains", "not_contains", "exists"], placeholder: "Enter address" },
	{ value: "productCode", label: "Product Code", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter product code" },
	{
		value: "assignmentStatus",
		label: "Status",
		operators: ["equals", "not_equals", "in", "not_in", "exists"],
		selectOptions: [
			{ value: "pending_approval", label: "Pending Approval" },
			{ value: "approved", label: "Approved" },
			{ value: "rejected", label: "Rejected" }
		]
	}
];

export function parseErrorMessage(error: unknown, fallbackMessage: string): string {
	if(error instanceof Error && error.message.trim().length > 0)
		return error.message;
	return fallbackMessage;
}

export function createCreditApplicationAssignmentFilterCondition(
	column: CreditApplicationAssignmentFilterColumn = creditApplicationAssignmentFilterColumns[0].value
): CreditApplicationAssignmentFilterCondition {
	const columnConfig = creditApplicationAssignmentFilterColumns.find(option => option.value == column) ?? creditApplicationAssignmentFilterColumns[0];
	return {
		column,
		operator: columnConfig.operators[0],
		joinWithPrevious: "and",
		value: "",
		values: [],
		existsValue: "true"
	};
}

export function reorderCreditApplicationAssignmentColumns(
	order: CreditApplicationAssignmentColumnId[],
	sourceId: CreditApplicationAssignmentColumnId,
	targetId: CreditApplicationAssignmentColumnId
): CreditApplicationAssignmentColumnId[] {
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

export function getCreditApplicationAssignmentRowKey(row: Pick<CreditApplicationAssignmentRow, "assignmentId" | "applyId">): string {
	return row.assignmentId ?? row.applyId;
}

export function mapCreditApplicationAssignmentFiltersToAppliedFilters(filters: CreditApplicationAssignmentFilterCondition[]): accountAssignmentActions.AccountAssignmentFilterInput[] {
	const applied: accountAssignmentActions.AccountAssignmentFilterInput[] = [];

	for(let index = 0; index < filters.length; index++) {
		const filter = filters[index];
		const joinWithPrevious = index == 0 ? undefined : filter.joinWithPrevious;

		if(filter.operator == "exists") {
			applied.push({
				column: filter.column,
				operator: filter.operator,
				value: filter.existsValue == "true",
				joinWithPrevious
			});
			continue;
		}

		if(filter.operator == "in" || filter.operator == "not_in") {
			const values = filter.value
				.split(",")
				.map(value => value.trim())
				.filter(value => value.length > 0);
			if(values.length == 0)
				continue;
			applied.push({
				column: filter.column,
				operator: filter.operator,
				value: values,
				joinWithPrevious
			});
			continue;
		}

		const value = filter.value.trim();
		if(value.length == 0)
			continue;

		applied.push({
			column: filter.column,
			operator: filter.operator,
			value,
			joinWithPrevious
		});
	}

	return applied;
}

export function getCreditApplicationAssignmentFilterColumnConfig(column: CreditApplicationAssignmentFilterColumn): CreditApplicationAssignmentFilterColumnOption {
	return creditApplicationAssignmentFilterColumns.find(option => option.value == column) ?? creditApplicationAssignmentFilterColumns[0];
}

export function useCreditApplicationAssignmentFilterColumnConfig() {
	const getResolvedFilterColumnConfig = useCallback((column: CreditApplicationAssignmentFilterColumn) => (
		getCreditApplicationAssignmentFilterColumnConfig(column)
	), []);

	return {
		getResolvedFilterColumnConfig
	};
}

export function useCreditApplicationAssignmentColumnPreferences() {
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<CreditApplicationAssignmentColumnId[]>(defaultCreditApplicationAssignmentColumnOrder);
	const [hiddenColumnIds, setHiddenColumnIds] = useState<CreditApplicationAssignmentColumnId[]>(defaultCreditApplicationAssignmentHiddenColumns);
	const [draggedColumnId, setDraggedColumnId] = useState<CreditApplicationAssignmentColumnId | null>(null);

	const columnById = useMemo(() => Object.fromEntries(
		creditApplicationAssignmentColumns.map(column => [column.id, column])
	) as Record<CreditApplicationAssignmentColumnId, CreditApplicationAssignmentColumnConfig>, []);

	const orderedColumns = useMemo(() => {
		const normalizedOrder = [
			...columnOrder.filter(columnId => columnById[columnId] != null),
			...defaultCreditApplicationAssignmentColumnOrder.filter(columnId => !columnOrder.includes(columnId))
		];
		return normalizedOrder.map(columnId => columnById[columnId]);
	}, [columnById, columnOrder]);

	const visibleColumns = useMemo(() => (
		orderedColumns.filter(column => !hiddenColumnIds.includes(column.id))
	), [hiddenColumnIds, orderedColumns]);

	useEffect(() => {
		if(typeof window == "undefined")
			return;

		const rawPreferences = window.localStorage.getItem(CREDIT_APPLICATION_ASSIGNMENT_COLUMN_PREFERENCES_KEY);
		if(rawPreferences == null)
			return;

		try {
			const parsed = JSON.parse(rawPreferences) as { order?: unknown, hidden?: unknown };
			const parsedOrder = Array.isArray(parsed.order) ? parsed.order.filter((value): value is CreditApplicationAssignmentColumnId => (
				typeof value == "string" && defaultCreditApplicationAssignmentColumnOrder.includes(value as CreditApplicationAssignmentColumnId)
			)) : [];
			const deduplicatedOrder = parsedOrder.filter((columnId, index) => parsedOrder.indexOf(columnId) == index);
			setColumnOrder([
				...deduplicatedOrder,
				...defaultCreditApplicationAssignmentColumnOrder.filter(columnId => !deduplicatedOrder.includes(columnId))
			]);

			const parsedHidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((value): value is CreditApplicationAssignmentColumnId => (
				typeof value == "string" && defaultCreditApplicationAssignmentColumnOrder.includes(value as CreditApplicationAssignmentColumnId)
			)) : [];
			const deduplicatedHidden = parsedHidden.filter((columnId, index) => parsedHidden.indexOf(columnId) == index);
			setHiddenColumnIds(deduplicatedHidden.slice(0, Math.max(defaultCreditApplicationAssignmentColumnOrder.length - 1, 0)));
		} catch{
			setColumnOrder(defaultCreditApplicationAssignmentColumnOrder);
			setHiddenColumnIds(defaultCreditApplicationAssignmentHiddenColumns);
		}
	}, []);

	useEffect(() => {
		if(typeof window == "undefined")
			return;

		window.localStorage.setItem(CREDIT_APPLICATION_ASSIGNMENT_COLUMN_PREFERENCES_KEY, JSON.stringify({
			order: columnOrder,
			hidden: hiddenColumnIds
		}));
	}, [columnOrder, hiddenColumnIds]);

	const toggleColumnVisibility = (columnId: CreditApplicationAssignmentColumnId, checked: boolean) => {
		setHiddenColumnIds(previous => {
			const isHidden = previous.includes(columnId);
			if(checked)
				return isHidden ? previous.filter(value => value != columnId) : previous;
			if(isHidden)
				return previous;
			const visibleCount = creditApplicationAssignmentColumns.length - previous.length;
			if(visibleCount <= 1)
				return previous;
			return [...previous, columnId];
		});
	};

	const resetColumnPreferences = () => {
		setColumnOrder(defaultCreditApplicationAssignmentColumnOrder);
		setHiddenColumnIds(defaultCreditApplicationAssignmentHiddenColumns);
	};

	const handleColumnDragStart = (columnId: CreditApplicationAssignmentColumnId) => {
		setDraggedColumnId(columnId);
	};

	const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: CreditApplicationAssignmentColumnId) => {
		event.preventDefault();
		if(draggedColumnId == null || draggedColumnId == targetColumnId)
			return;
		setColumnOrder(previous => reorderCreditApplicationAssignmentColumns(previous, draggedColumnId, targetColumnId));
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

type UseCreditApplicationAssignmentFiltersOptions = {
	getResolvedFilterColumnConfig: (column: CreditApplicationAssignmentFilterColumn) => CreditApplicationAssignmentFilterColumnOption;
};

export type UseCreditApplicationAssignmentFiltersResult = {
	isFilterOpen: boolean;
	isFilterStateReady: boolean;
	setIsFilterOpen: (open: boolean) => void;
	toggleFilterPanel: () => void;
	clearFilter: () => void;
	appliedFilters: accountAssignmentActions.AccountAssignmentFilterInput[];
	filterSummaryItems: CreditApplicationAssignmentFilterSummaryItem[];
	filters: CreditApplicationAssignmentFilterCondition[];
	updateFilter: (index: number, update: Partial<CreditApplicationAssignmentFilterCondition>) => void;
	addFilter: () => void;
	removeFilter: (index: number) => void;
};

function resolveCreditApplicationAssignmentFilterValueLabel(
	filter: CreditApplicationAssignmentFilterCondition,
	columnConfig: CreditApplicationAssignmentFilterColumnOption
): string {
	if(filter.operator == "exists")
		return filter.existsValue;

	if(filter.operator == "in" || filter.operator == "not_in") {
		const values = filter.value
			.split(",")
			.map(value => value.trim())
			.filter(value => value.length > 0);
		if(values.length == 0)
			return "(empty)";
		if(columnConfig.selectOptions == null)
			return values.join(", ");
		return values.map(value => columnConfig.selectOptions?.find(option => option.value == value)?.label ?? value).join(", ");
	}

	if(filter.value.trim().length == 0)
		return "(empty)";

	if(columnConfig.selectOptions == null)
		return filter.value;

	return columnConfig.selectOptions.find(option => option.value == filter.value)?.label ?? filter.value;
}

export function useCreditApplicationAssignmentFilters({
	getResolvedFilterColumnConfig
}: UseCreditApplicationAssignmentFiltersOptions): UseCreditApplicationAssignmentFiltersResult {
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters] = useState<CreditApplicationAssignmentFilterCondition[]>([]);

	const appliedFilters = useMemo(() => mapCreditApplicationAssignmentFiltersToAppliedFilters(filters), [filters]);

	const filterSummaryItems = useMemo(() => (
		filters.map((filter, index) => {
			const columnConfig = getResolvedFilterColumnConfig(filter.column);
			return {
				combinator: index == 0 ? null : filter.joinWithPrevious.toUpperCase(),
				columnLabel: columnConfig.label,
				operatorLabel: filter.operator,
				valueLabel: resolveCreditApplicationAssignmentFilterValueLabel(filter, columnConfig)
			};
		})
	), [filters, getResolvedFilterColumnConfig]);

	const updateFilter = (index: number, update: Partial<CreditApplicationAssignmentFilterCondition>) => {
		setFilters(previous => previous.map((filter, filterIndex) => {
			if(filterIndex != index)
				return filter;

			let nextFilter: CreditApplicationAssignmentFilterCondition = {
				...filter,
				...update
			};

			if(update.column != null) {
				const columnConfig = getResolvedFilterColumnConfig(update.column);
				nextFilter.operator = columnConfig.operators.includes(nextFilter.operator) ? nextFilter.operator : columnConfig.operators[0];
				if(update.column != filter.column) {
					nextFilter.value = "";
					nextFilter.values = [];
					nextFilter.existsValue = "true";
				}
			}

			if(update.operator != null && update.operator != filter.operator) {
				nextFilter.value = "";
				nextFilter.values = [];
				nextFilter.existsValue = "true";
			}

			return nextFilter;
		}));
	};

	const addFilter = () => {
		setFilters(previous => [...previous, createCreditApplicationAssignmentFilterCondition()]);
	};

	const removeFilter = (index: number) => {
		setFilters(previous => previous.filter((_, filterIndex) => filterIndex != index));
	};

	const clearFilter = () => {
		setFilters([]);
	};

	const toggleFilterPanel = () => {
		setIsFilterOpen(previous => !previous);
	};

	return {
		isFilterOpen,
		isFilterStateReady: true,
		setIsFilterOpen,
		toggleFilterPanel,
		clearFilter,
		appliedFilters,
		filterSummaryItems,
		filters,
		updateFilter,
		addFilter,
		removeFilter
	};
}

type UseCreditApplicationAssignmentQueryStateOptions = {
	debounceMs?: number;
	defaultSortField?: CreditApplicationAssignmentSortField | null;
	defaultSortDirection?: "asc" | "desc";
};

export function useCreditApplicationAssignmentQueryState({
	debounceMs = 250,
	defaultSortField = null,
	defaultSortDirection = "desc"
}: UseCreditApplicationAssignmentQueryStateOptions = {}) {
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [sortState, setSortState] = useState<Array<{ field: CreditApplicationAssignmentSortField, direction: "asc" | "desc" }>>(
		defaultSortField == null ? [] : [{ field: defaultSortField, direction: defaultSortDirection }]
	);

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

	const getSortDirection = (field: CreditApplicationAssignmentSortField): "asc" | "desc" | null => {
		const activeSort = sortState.find(sortItem => sortItem.field == field);
		return activeSort?.direction ?? null;
	};

	const toggleSortField = (field: CreditApplicationAssignmentSortField) => {
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

export function useCreditApplicationAssignmentsQuery(input: Omit<CreditApplicationAssignmentQueryInput, "mode"> & { mode: CreditApplicationAssignmentQueryMode }) {
	const { mode, debouncedKeyword, sortTokens, appliedFilters, isFilterStateReady, page, limit, enabled = true } = input;
	return useQuery<CreditApplicationAssignmentQueryResult, Error>({
		queryKey: ["credit-application-assignment", "query", {
			mode,
			debouncedKeyword,
			sortTokens,
			appliedFilters,
			page,
			limit
		}],
		enabled: enabled && isFilterStateReady,
		queryFn: async () => {
			if(mode == "approver")
				return await accountAssignmentActions.queryApproverAssignmentsAction({
					keyword: debouncedKeyword,
					sort: sortTokens,
					filters: appliedFilters,
					page,
					limit
				});
			if(mode == "viewer")
				return await accountAssignmentActions.queryViewerAssignmentsAction({
					keyword: debouncedKeyword,
					sort: sortTokens,
					filters: appliedFilters,
					page,
					limit
				});
			return await accountAssignmentActions.queryEditorAssignmentsAction({
				keyword: debouncedKeyword,
				sort: sortTokens,
				filters: appliedFilters,
				page,
				limit
			});
		},
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});
}

type UseCreditApplicationAssignmentRelationsOptions = {
	docs: CreditApplicationAssignmentRow[];
	visibleColumns: CreditApplicationAssignmentColumnConfig[];
};

const assignmentRelationColumnByTableColumn: Partial<Record<CreditApplicationAssignmentColumnId, accountAssignmentActions.AccountAssignmentRelationColumn>> = {
	applyId: "account",
	accountName: "account",
	officerName: "user"
};

export function useCreditApplicationAssignmentRelations({ docs, visibleColumns }: UseCreditApplicationAssignmentRelationsOptions) {
	const visibleRelationColumns = useMemo(() => {
		const columns = new Set<accountAssignmentActions.AccountAssignmentRelationColumn>([
			"createdBy",
			"updatedBy",
			"deletedBy",
			"reviewedBy"
		]);

		for(const column of visibleColumns) {
			const relationColumn = assignmentRelationColumnByTableColumn[column.id];
			if(relationColumn != null)
				columns.add(relationColumn);
		}

		return [...columns];
	}, [visibleColumns]);

	const relationRows = useMemo(() => docs.map(row => ({
		assignmentId: row.assignmentId,
		applyId: row.applyId,
		userId: row.userId,
		createdById: row.createdById,
		updatedById: row.updatedById,
		deletedById: row.deletedById,
		reviewedById: row.reviewedById
	})), [docs]);

	const relationsQuery = useQuery({
		queryKey: ["credit-application-assignment", "relations", {
			rows: relationRows,
			columns: visibleRelationColumns
		}],
		enabled: relationRows.length > 0 && visibleRelationColumns.length > 0,
		queryFn: () => accountAssignmentActions.resolveAccountAssignmentRelationColumnsAction({
			rows: relationRows,
			columns: visibleRelationColumns
		}),
		refetchInterval: 10000,
		refetchOnWindowFocus: true
	});

	const relationValuesByRowId = useMemo(() => Object.fromEntries(
		(relationsQuery.data ?? []).map(item => [item.id, item.values])
	) as Record<string, accountAssignmentActions.AccountAssignmentRelationValues>, [relationsQuery.data]);

	return {
		relationValuesByRowId,
		isRelationLoading: relationsQuery.isPending || relationsQuery.isFetching
	};
}

type UseCreditApplicationAssignmentCellRendererOptions = CreditApplicationCellRenderContext & {
	relationValuesByRowId: Record<string, accountAssignmentActions.AccountAssignmentRelationValues>;
	isRelationLoading: boolean;
};

export function useCreditApplicationAssignmentCellRenderer({
	hasEditorAccess,
	hasAuditorAccess,
	relationNavigation,
	relationValuesByRowId,
	isRelationLoading
}: UseCreditApplicationAssignmentCellRendererOptions) {
	const renderRelationCell = ({
		label,
		value,
		type,
		id,
		targetManagementKey,
		relationFilters,
		relationContext
	}: {
		label: string;
		value: string;
		type?: "user" | "role" | "team";
		id: string | null;
		targetManagementKey: "user-management" | "role-management" | "team-management" | "credit-application-assignment";
		relationFilters?: unknown;
		relationContext?: string;
	}) => {
		if(id == null || value.trim().length == 0)
			return value;

		if(relationNavigation == null)
			return value;

		if(!hasEditorAccess && !hasAuditorAccess)
			return value;

		const hrefBase = relationNavigation.getHrefBase(targetManagementKey);
		if(hasEditorAccess && hrefBase != null && relationFilters != null) {
			const href = hrefBase;
			return (
				<Link
					href={href}
					onClick={event => {
						if(type != null && event.altKey) {
							event.preventDefault();
							relationNavigation.onOpenSummary({
								type,
								id,
								fallbackTitle: value,
								fallbackDescription: `${label} relation`
							});
							return;
						}
						relationNavigation.onRelationLinkClick(event, {
							targetManagementKey,
							hrefBase,
							relationFilters,
							relationContext
						});
					}}
					className="text-primary underline underline-offset-2 hover:opacity-80"
				>
					{value}
				</Link>
			);
		}

		if(type == null)
			return value;

		return (
			<Button
				type="button"
				variant="link"
				onClick={() => relationNavigation.onOpenSummary({ type, id, fallbackTitle: value, fallbackDescription: `${label} relation` })}
				className="h-auto p-0 text-primary"
			>
				{value}
			</Button>
		);
	};

	const renderCell = (columnId: CreditApplicationAssignmentColumnId, row: CreditApplicationAssignmentRow): ReactNode => {
		const rowKey = getCreditApplicationAssignmentRowKey(row);
		const relationValues = relationValuesByRowId[rowKey] ?? {};

		if(columnId == "applyId")
			return <span className="font-mono text-xs">{row.applyId}</span>;
		if(columnId == "accountName") {
			const accountLabel = relationValues.account ?? row.accountName;
			return renderRelationCell({
				label: "Credit Application",
				value: accountLabel,
				targetManagementKey: "credit-application-assignment",
				id: row.applyId.length > 0 ? row.applyId : null,
				relationFilters: row.applyId.length == 0 ? undefined : [{ column: "applyId", operator: "equals", value: row.applyId }],
				relationContext: "credit-application-assignment:account"
			});
		}
		if(columnId == "officerName") {
			if(isRelationLoading && relationValues.user == null && row.officerName == null)
				return "-";

			const label = relationValues.user ?? row.officerName ?? "-";
			return renderRelationCell({
				label: "Officer",
				value: label,
				type: "user",
				id: row.userId,
				targetManagementKey: "user-management",
				relationFilters: row.userId == null ? undefined : [{ column: "id", operator: "equals", value: row.userId }],
				relationContext: "credit-application-assignment:user"
			});
		}
		if(columnId == "address")
			return row.address;
		if(columnId == "productCode")
			return row.productCode;
		const status = row.assignmentStatus;
		if(status == "approved")
			return <Badge variant="default">Approved</Badge>;
		if(status == "rejected")
			return <Badge variant="destructive">Rejected</Badge>;
		if(status == "pending_approval")
			return <Badge variant="secondary">Pending Approval</Badge>;
		return <Badge variant="outline">-</Badge>;
	};

	return {
		renderCell,
		renderRelationCell
	};
}

export function CreditApplicationActiveFiltersSummary({
	items
}: {
	items: Array<{ combinator: string | null; columnLabel: string; operatorLabel: string; valueLabel: string }>;
}) {
	if(items.length == 0)
		return null;

	return (
		<div className="rounded-lg border border-dashed px-3 py-2 text-xs">
			<p className="text-muted-foreground font-medium">Active filters</p>
			<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
				{items.map((item, index) => (
					<span key={index} className="inline-flex items-center gap-1.5">
						{item.combinator != null ? <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">{item.combinator}</span> : null}
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

export function CreditApplicationColumnConfigCard({
	isOpen,
	onOpenChange,
	orderedColumns,
	hiddenColumnIds,
	onToggleColumnVisibility,
	onReset,
	onColumnDragStart,
	onColumnDragOver,
	onColumnDragEnd
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	orderedColumns: CreditApplicationAssignmentColumnConfig[];
	hiddenColumnIds: CreditApplicationAssignmentColumnId[];
	onToggleColumnVisibility: (columnId: CreditApplicationAssignmentColumnId, checked: boolean) => void;
	onReset: () => void;
	onColumnDragStart: (columnId: CreditApplicationAssignmentColumnId) => void;
	onColumnDragOver: (event: DragEvent<HTMLDivElement>, targetColumnId: CreditApplicationAssignmentColumnId) => void;
	onColumnDragEnd: () => void;
}) {
	return (
		<Collapsible open={isOpen} onOpenChange={onOpenChange}>
			<CollapsibleContent>
				<div className="space-y-3 rounded-xl border p-4">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Configure Columns</h3>
							<p className="text-muted-foreground text-sm">Toggle visibility and drag cards to reorder columns.</p>
						</div>
						<Button type="button" variant="outline" size="sm" onClick={onReset}>Reset</Button>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						{orderedColumns.map(column => {
							const isVisible = !hiddenColumnIds.includes(column.id);
							const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= orderedColumns.length - 1;
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
									<Checkbox checked={isVisible} disabled={isOnlyVisibleColumn} onCheckedChange={checked => onToggleColumnVisibility(column.id, checked == true)} />
									<div className="min-w-0 flex-1"><p className="text-sm font-medium">{column.label}</p></div>
								</div>
							);
						})}
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export function CreditApplicationAssignmentFilterCard({
	isOpen,
	onOpenChange,
	filters,
	getResolvedFilterColumnConfig,
	onUpdateFilter,
	onAddFilter,
	onRemoveFilter,
	onClearFilters,
	isLoading,
	isMutating
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	filters: CreditApplicationAssignmentFilterCondition[];
	getResolvedFilterColumnConfig: (column: CreditApplicationAssignmentFilterColumn) => CreditApplicationAssignmentFilterColumnOption;
	onUpdateFilter: (index: number, update: Partial<CreditApplicationAssignmentFilterCondition>) => void;
	onAddFilter: () => void;
	onRemoveFilter: (index: number) => void;
	onClearFilters: () => void;
	isLoading: boolean;
	isMutating: boolean;
}) {
	return (
		<Collapsible open={isOpen} onOpenChange={onOpenChange}>
			<CollapsibleContent>
				<div className="space-y-3 rounded-xl border p-4">
					<div className="flex items-center justify-between gap-2">
						<div className="space-y-1">
							<h3 className="text-sm font-semibold">Configure Filters</h3>
							<p className="text-muted-foreground text-sm">Build multiple filters and combine them with AND or OR.</p>
						</div>
						{filters.length > 0 ? <Button type="button" variant="outline" size="sm" onClick={onClearFilters} disabled={isLoading || isMutating}>Clear Filter</Button> : null}
					</div>
					{filters.map((filter, index) => {
						const columnConfig = getResolvedFilterColumnConfig(filter.column);
						return (
							<div key={index} className="space-y-3 rounded-lg border p-3">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium">Filter {index + 1}</p>
									<Button type="button" variant="ghost" size="sm" onClick={() => onRemoveFilter(index)} disabled={isMutating}><XIcon />Remove</Button>
								</div>
								<div className="grid gap-3 sm:grid-cols-2">
									<Select value={filter.column} onValueChange={value => onUpdateFilter(index, { column: value as CreditApplicationAssignmentFilterColumn })}>
										<SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
										<SelectContent>
											{creditApplicationAssignmentFilterColumns.map(column => <SelectItem key={column.value} value={column.value}>{column.label}</SelectItem>)}
										</SelectContent>
									</Select>
									<Select value={filter.operator} onValueChange={value => onUpdateFilter(index, { operator: value as CreditApplicationAssignmentFilterOperator })}>
										<SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger>
										<SelectContent>
											{columnConfig.operators.map(operator => <SelectItem key={operator} value={operator}>{operator}</SelectItem>)}
										</SelectContent>
									</Select>
								</div>
								{filter.operator == "exists" ? (
									<Select value={filter.existsValue} onValueChange={value => onUpdateFilter(index, { existsValue: value as "true" | "false" })}>
										<SelectTrigger><SelectValue placeholder="Select value" /></SelectTrigger>
										<SelectContent>
											<SelectItem value="true">True</SelectItem>
											<SelectItem value="false">False</SelectItem>
										</SelectContent>
									</Select>
								) : columnConfig.selectOptions != null ? (
									<SearchableSelect
										value={filter.value}
										onValueChange={value => onUpdateFilter(index, { value })}
										options={columnConfig.selectOptions.map(option => ({ value: option.value, label: option.label }))}
										onSearch={columnConfig.searchOptionsAction}
										placeholder="Select value"
									/>
								) : (
									<Input value={filter.value} onChange={event => onUpdateFilter(index, { value: event.target.value })} placeholder={columnConfig.placeholder ?? "Enter value"} />
								)}
							</div>
						);
					})}
					<Button type="button" variant="outline" onClick={onAddFilter} disabled={isMutating}><PlusIcon />Add Filter</Button>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export function CreditApplicationAssignmentTable({
	rows,
	visibleColumns,
	isLoading,
	isMutating,
	includeActions = true,
	getSortDirection,
	onToggleSortField,
	onOpenDetails,
	renderCell,
	renderActions
}: {
	rows: CreditApplicationAssignmentRow[];
	visibleColumns: CreditApplicationAssignmentColumnConfig[];
	isLoading: boolean;
	isMutating: boolean;
	includeActions?: boolean;
	getSortDirection: (field: CreditApplicationAssignmentSortField) => "asc" | "desc" | null;
	onToggleSortField: (field: CreditApplicationAssignmentSortField) => void;
	onOpenDetails: (row: CreditApplicationAssignmentRow) => void;
	renderCell: (columnId: CreditApplicationAssignmentColumnId, row: CreditApplicationAssignmentRow) => ReactNode;
	renderActions: (row: CreditApplicationAssignmentRow) => ReactNode;
}) {
	const renderSortIcon = (field: CreditApplicationAssignmentSortField) => {
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
						{visibleColumns.map(column => column.sortField != null ? (
							<TableHead key={column.id} className={column.headClassName}>
								<Button type="button" variant="ghost" size="sm" onClick={() => onToggleSortField(column.sortField!)} disabled={isLoading || isMutating} className="-ml-2 h-7 gap-1 px-2">
									{column.label}
									{renderSortIcon(column.sortField)}
								</Button>
							</TableHead>
						) : (
							<TableHead key={column.id} className={column.headClassName}>{column.label}</TableHead>
						))}
						{includeActions ? <TableHead className="w-65">Actions</TableHead> : null}
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						<TableRow><TableCell colSpan={visibleColumns.length + (includeActions ? 1 : 0)} className="text-muted-foreground py-8 text-center">Loading assignments...</TableCell></TableRow>
					) : null}
					{!isLoading && rows.length == 0 ? (
						<TableRow><TableCell colSpan={visibleColumns.length + (includeActions ? 1 : 0)} className="text-muted-foreground py-8 text-center">No assignment rows found.</TableCell></TableRow>
					) : null}
					{rows.map(row => (
						<TableRow key={`${row.assignmentId ?? "new"}-${row.applyId}`}>
							{visibleColumns.map(column => (
								<TableCell key={`${row.applyId}-${column.id}`} className={column.cellClassName}>
									<Button type="button" variant="link" onClick={() => onOpenDetails(row)} className={cn("text-primary h-auto p-0 text-left whitespace-normal", column.id != "applyId" && "no-underline text-foreground")}>{renderCell(column.id, row)}</Button>
								</TableCell>
							))}
							{includeActions ? <TableCell><div className="flex flex-wrap gap-2">{renderActions(row)}</div></TableCell> : null}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

export function CreditApplicationAssignmentDetailsDrawer({
	open,
	onOpenChange,
	row,
	relationValues,
	renderActions,
	hasAuditorAccess,
	onOpenHistory
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: CreditApplicationAssignmentRow | null;
	relationValues?: accountAssignmentActions.AccountAssignmentRelationValues | null;
	renderActions: (row: CreditApplicationAssignmentRow) => ReactNode;
	hasAuditorAccess: boolean;
	onOpenHistory?: (row: CreditApplicationAssignmentRow) => void;
}) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Assignment Details</DrawerTitle>
					<DrawerDescription>Review assignment data and perform available actions.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
					{row == null ? <p className="text-muted-foreground text-sm">No assignment selected.</p> : (
						<>
							<div className="grid gap-2 sm:grid-cols-2">
								<div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">Apply ID</p><p className="font-mono text-xs">{row.applyId}</p></div>
								<div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">Account Name</p><p className="text-sm font-medium">{relationValues?.account ?? row.accountName}</p></div>
								<div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">Officer</p><p className="text-sm">{relationValues?.user ?? row.officerName ?? "-"}</p></div>
								<div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">Status</p><p className="text-sm">{row.assignmentStatus}</p></div>
								<div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">Created By</p><p className="text-sm">{relationValues?.createdBy ?? "-"}</p></div>
								<div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">Updated By</p><p className="text-sm">{relationValues?.updatedBy ?? "-"}</p></div>
								<div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">Deleted By</p><p className="text-sm">{relationValues?.deletedBy ?? "-"}</p></div>
								<div className="rounded-md border p-2"><p className="text-muted-foreground text-xs">Reviewed By</p><p className="text-sm">{relationValues?.reviewedBy ?? "-"}</p></div>
							</div>
							<div className="flex flex-wrap gap-2">{renderActions(row)}</div>
							{hasAuditorAccess && onOpenHistory != null ? <Button type="button" variant="outline" onClick={() => onOpenHistory(row)}><HistoryIcon className="mr-2 size-4" />History</Button> : null}
						</>
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function CreditApplicationAssignmentReviewDrawer({
	open,
	onOpenChange,
	state,
	error,
	isMutating,
	onReviewReasonChange,
	onApprove,
	onReject
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	state: CreditApplicationAssignmentReviewState | null;
	error: string | null;
	isMutating: boolean;
	onReviewReasonChange: (value: string) => void;
	onApprove: () => void;
	onReject: () => void;
}) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Review Assignment</DrawerTitle>
					<DrawerDescription>Approve or reject pending assignment request.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
					<p className="text-sm">Assignment ID: <span className="font-mono text-xs">{state?.assignmentId ?? "-"}</span></p>
					<div className="space-y-2">
						<label className="text-sm font-medium">Review Reason (optional)</label>
						<Textarea value={state?.reviewReason ?? ""} onChange={event => onReviewReasonChange(event.target.value)} placeholder="Provide review reason" />
					</div>
					{error != null ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isMutating}>Cancel</Button>
					<Button type="button" variant="default" onClick={onApprove} disabled={isMutating}>Approve</Button>
					<Button type="button" variant="destructive" onClick={onReject} disabled={isMutating}>Reject</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function CreditApplicationAssignmentPreviewDrawer({
	open,
	onOpenChange,
	row
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: CreditApplicationAssignmentRow | null;
}) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-xl">
				<DrawerHeader>
					<DrawerTitle>Preview Assignment Request</DrawerTitle>
					<DrawerDescription>Quick preview before submit or review.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
					{row == null ? <p className="text-muted-foreground text-sm">No data selected.</p> : (
						<>
							<p className="text-sm"><span className="font-medium">Apply ID:</span> {row.applyId}</p>
							<p className="text-sm"><span className="font-medium">Account:</span> {row.accountName}</p>
							<p className="text-sm"><span className="font-medium">Officer:</span> {row.officerName ?? "-"}</p>
							<p className="text-sm"><span className="font-medium">Status:</span> {row.assignmentStatus ?? "-"}</p>
						</>
					)}
				</div>
				<DrawerFooter className="border-t sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

export function CreditApplicationAssignmentFormDrawer({
	open,
	onOpenChange,
	formState,
	officerOptions,
	isMutating,
	formError,
	onApplyIdChange,
	onOfficerIdsChange,
	onNotesChange,
	onSubmit
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	formState: CreditApplicationAssignmentFormState;
	officerOptions: Array<{ id: string; name: string }>;
	isMutating: boolean;
	formError: string | null;
	onApplyIdChange: (value: string) => void;
	onOfficerIdsChange: (value: string[]) => void;
	onNotesChange: (value: string) => void;
	onSubmit: () => void;
}) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
				<DrawerHeader>
					<DrawerTitle>Assignment Form</DrawerTitle>
					<DrawerDescription>Create or update credit application assignment request.</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto px-4 pb-4">
					<div className="space-y-3">
						<div className="space-y-2">
							<label className="text-sm font-medium">Apply ID</label>
							<Input value={formState.applyId} onChange={event => onApplyIdChange(event.target.value)} placeholder="Enter apply ID" />
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between"><label className="text-sm font-medium">Officer</label><Badge variant="outline">{formState.officerIds.length} selected</Badge></div>
							<div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border p-2">
								{officerOptions.map(officer => {
									const selected = formState.officerIds.includes(officer.id);
									return (
										<Button
											key={officer.id}
											type="button"
											variant={selected ? "secondary" : "outline"}
											onClick={() => onOfficerIdsChange(selected ? formState.officerIds.filter(id => id != officer.id) : [...formState.officerIds, officer.id])}
											className="h-auto w-full justify-between py-2"
										>
											<span className="text-left text-sm">{officer.name}</span>
											{selected ? <CheckIcon className="size-4" /> : null}
										</Button>
									);
								})}
							</div>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Notes</label>
							<Textarea value={formState.notes} onChange={event => onNotesChange(event.target.value)} placeholder="Optional notes" />
						</div>
						{formError != null ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert> : null}
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

export function CreditApplicationAssignmentDeleteDialog({
	open,
	onOpenChange,
	onConfirm,
	isMutating
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isMutating: boolean;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete</AlertDialogTitle>
					<AlertDialogDescription>
						Delete does not hard-delete data. It creates a pending request and requires approver review.
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

export function CreditApplicationAssignmentCancelDialog({
	open,
	onOpenChange,
	onConfirm,
	isMutating
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isMutating: boolean;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Cancel</AlertDialogTitle>
					<AlertDialogDescription>
						This will cancel the pending request and keep the last approved data unchanged.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isMutating}>Back</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm} disabled={isMutating}>Cancel Request</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
