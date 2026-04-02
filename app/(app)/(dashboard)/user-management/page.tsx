"use client";

import { useRef, useMemo, useState, useEffect, useCallback, useTransition, type DragEvent } from "react";
import { XIcon, Trash2Icon, SearchIcon, PlusIcon, PencilIcon, HistoryIcon, FilterIcon, CheckIcon, ArrowUpIcon, ArrowUpDownIcon, ArrowDownIcon, CalendarIcon, Columns3Icon, GripVerticalIcon } from "lucide-react";

import { AlertDialog, AlertDialogTitle, AlertDialogAction, AlertDialogCancel, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogDescription } from "@/components/radix/AlertDialog";
import { Badge } from "@/components/radix/Badge";
import { Button } from "@/components/radix/Button";
import { Card, CardContent } from "@/components/radix/Card";
import { Checkbox } from "@/components/radix/Checkbox";
import { Collapsible, CollapsibleContent } from "@/components/radix/Collapsible";
import { Drawer, DrawerTitle, DrawerFooter, DrawerHeader, DrawerContent, DrawerDescription } from "@/components/radix/Drawer";
import { Input } from "@/components/radix/Input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/radix/InputGroup";
import { Calendar } from "@/components/radix/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/radix/Popover";
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from "@/components/radix/Select";
import { Skeleton } from "@/components/radix/Skeleton";
import { Switch } from "@/components/radix/Switch";
import { Table, TableRow, TableBody, TableCell, TableHead, TableHeader } from "@/components/radix/Table";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/radix/Tabs";
import { Textarea } from "@/components/radix/Textarea";

import * as userActions from "./page.actions";

const PAGE_SIZE = 20;
type SortDirection = "asc" | "desc";
type SortField = userActions.UserManagementSortField;
type FilterColumn = userActions.UserManagementFilterColumn;
type FilterOperator = userActions.UserManagementFilterOperator;
type FilterCombinator = userActions.UserManagementFilterCombinator;
type FilterInput = userActions.UserManagementFilterInput;
type QueryStagedUsersOutput = Awaited<ReturnType<typeof userActions.queryStagedUsersAction>>;
type StagedUserTableRow = QueryStagedUsersOutput["docs"][number];
type UserManagementTabMode = Parameters<typeof userActions.queryStagedUsersAction>[0]["mode"];
type UserRelationColumn = userActions.UserRelationColumn;
type RoleValue = "admin" | "manager" | "supervisor" | "officer";
type SupervisorOption = Awaited<ReturnType<typeof userActions.searchUserSupervisorsAction>>[number];
type UserRequestReviewDiff = Awaited<ReturnType<typeof userActions.getStagedUserRequestReviewDiffAction>>;
type FilterValueType = "text" | "date" | "select" | "boolean";
type FilterColumnOption = {
	value: FilterColumn;
	label: string;
	valueType: FilterValueType;
	operators: FilterOperator[];
	placeholder?: string;
	selectOptions?: Array<{ value: string, label: string }>;
};
type FilterDraft = {
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
type UserTableColumnId =
	| "name"
	| "email"
	| "employeeId"
	| "role"
	| "supervisorName"
	| "createdBy"
	| "updatedBy"
	| "deletedBy"
	| "createdAt"
	| "updatedAt"
	| "deletedAt"
	| "requestType"
	| "status"
	| "reviewedAt"
	| "reviewedByName"
	| "reviewApproved"
	| "reviewCommentText";
type UserTableColumnConfig = {
	id: UserTableColumnId;
	label: string;
	sortField?: SortField;
	headClassName?: string;
	cellClassName?: string;
};

type FormState = {
	stagedUserId?: string;
	email: string;
	name: string;
	employeeId: string;
	role: RoleValue;
	supervisorId: string;
	initialPassword: string;
};

const emptyQueryResult: QueryStagedUsersOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};

const defaultFormState: FormState = {
	email: "",
	name: "",
	employeeId: "",
	role: "officer",
	supervisorId: "",
	initialPassword: ""
};
const USER_COLUMN_PREFERENCES_KEY = "user-management-columns-v1";
const USER_FILTER_PREFERENCES_KEY = "user-management-filters-v1";
const userTableColumns: UserTableColumnConfig[] = [
	{ id: "name", label: "Name", sortField: "name", cellClassName: "font-medium" },
	{ id: "email", label: "Email", sortField: "email" },
	{ id: "employeeId", label: "Employee ID", sortField: "employeeId" },
	{ id: "role", label: "Role", sortField: "role" },
	{ id: "supervisorName", label: "Supervisor", sortField: "supervisorName" },
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
const defaultUserColumnOrder: UserTableColumnId[] = userTableColumns.map(column => column.id);
const defaultUserVisibleColumns: UserTableColumnId[] = ["name", "email", "employeeId", "role", "requestType", "status", "updatedAt", "reviewCommentText"];
const defaultUserHiddenColumns: UserTableColumnId[] = defaultUserColumnOrder.filter(columnId => !defaultUserVisibleColumns.includes(columnId));
const userRelationColumnSet = new Set<UserRelationColumn>([
	"supervisorName",
	"reviewedByName",
	"createdBy",
	"updatedBy",
	"deletedBy"
]);

const filterOperatorOptions: Array<{ value: FilterOperator, label: string }> = [
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

const userFilterColumns: FilterColumnOption[] = [
	{ value: "name", label: "Name", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter name" },
	{ value: "email", label: "Email", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter email" },
	{ value: "employeeId", label: "Employee ID", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter employee ID" },
	{ value: "role", label: "Role", valueType: "select", operators: ["equals", "not_equals", "in", "not_in", "exists"], selectOptions: [
		{ value: "admin", label: "Admin" },
		{ value: "manager", label: "Manager" },
		{ value: "supervisor", label: "Supervisor" },
		{ value: "officer", label: "Officer" }
	] },
	{ value: "supervisor.name", label: "Supervisor Name", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter supervisor name" },
	{ value: "supervisor.email", label: "Supervisor Email", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter supervisor email" },
	{ value: "createdAt", label: "Created At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "updatedAt", label: "Updated At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "deletedAt", label: "Deleted At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "reviewedAt", label: "Reviewed At", valueType: "date", operators: ["equals", "not_equals", "in", "not_in", "exists", "greater_than", "less_than", "greater_than_equal", "less_than_equal"] },
	{ value: "reviewedBy.name", label: "Reviewed By Name", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter reviewer name" },
	{ value: "reviewedBy.email", label: "Reviewed By Email", valueType: "text", operators: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "exists"], placeholder: "Enter reviewer email" },
	{ value: "reviewApproved", label: "Review Approved", valueType: "boolean", operators: ["equals", "not_equals", "exists"] }
];

const defaultFilterCombinator: FilterCombinator = "and";

function getFilterColumnConfig(column: FilterColumn): FilterColumnOption {
	return userFilterColumns.find(option => option.value == column) ?? userFilterColumns[0];
}

function createFilterDraft(column: FilterColumn = userFilterColumns[0].value): FilterDraft {
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

function formatFilterDateValue(date: Date | null): string {
	if(date == null)
		return "Select date and time";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function parseFilterDateValue(value: string): Date | null {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed) ? trimmed.replace(" ", "T") : trimmed;
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseFilterDateOnlyValue(value: string): Date | null {
	const trimmed = value.trim();
	if(trimmed.length == 0)
		return null;
	const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00` : trimmed;
	const parsed = new Date(normalized);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatFilterDateOnlyInput(date: Date | null): string {
	if(date == null)
		return "";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatFilterDateInput(date: Date | null): string {
	if(date == null)
		return "";
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function applyTimeToDate(date: Date, timeValue: string): Date {
	const [rawHours, rawMinutes] = timeValue.split(":");
	const hours = Number(rawHours);
	const minutes = Number(rawMinutes);
	const nextDate = new Date(date);
	if(Number.isInteger(hours) && Number.isInteger(minutes))
		nextDate.setHours(hours, minutes, 0, 0);
	return nextDate;
}

function getFilterTimeInput(date: Date | null): string {
	if(date == null)
		return "00:00";
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
}

function splitFilterDateValue(value: string): { dateText: string, timeText: string } {
	const parsed = parseFilterDateValue(value);
	if(parsed == null)
		return { dateText: "", timeText: "00:00" };
	return {
		dateText: formatFilterDateOnlyInput(parsed),
		timeText: getFilterTimeInput(parsed)
	};
}

function buildFilterDateValue(dateText: string, timeText: string): string {
	const parsedDate = parseFilterDateOnlyValue(dateText);
	if(parsedDate == null)
		return "";
	return formatFilterDateInput(applyTimeToDate(parsedDate, timeText));
}

function formatDateTime(dateValue: string | null) {
	if(dateValue == null)
		return "-";
	const date = new Date(dateValue);
	if(Number.isNaN(date.getTime()))
		return "-";
	return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function getRequestType(row: StagedUserTableRow) {
	if(row.linkedUserId == null) return "Create";
	if(row.deletedAt != null) return "Delete";
	return "Update";
}

function getReviewStatus(row: StagedUserTableRow): { label: string, variant: "default" | "secondary" | "destructive" } {
	if(row.reviewedAt == null)
		return { label: "Pending", variant: "secondary" };
	if(row.reviewApproved == true)
		return { label: "Approved", variant: "default" };
	return { label: "Rejected", variant: "destructive" };
}

function reorderColumns(order: UserTableColumnId[], sourceId: UserTableColumnId, targetId: UserTableColumnId): UserTableColumnId[] {
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

function serializeFilterDraftForStorage(draft: FilterDraft) {
	return {
		...draft,
		dateValue: draft.dateValue?.toISOString() ?? null,
		listDateValue: draft.listDateValue?.toISOString() ?? null
	};
}

function parseStoredFilterDraft(rawDraft: unknown): FilterDraft | null {
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

	const column = typeof candidate.column == "string" ? candidate.column as FilterColumn : userFilterColumns[0].value;
	const columnConfig = getFilterColumnConfig(column);
	const operator = typeof candidate.operator == "string" && columnConfig.operators.includes(candidate.operator as FilterOperator) ? candidate.operator as FilterOperator : columnConfig.operators[0];
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

export default function Page() {
	const [mode, setMode] = useState<UserManagementTabMode>("editor");
	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [sortState, setSortState] = useState<Array<{ field: SortField, direction: SortDirection }>>([
		{ field: "updatedAt", direction: "desc" }
	]);
	const [showSoftDeleted, setShowSoftDeleted] = useState(false);
	const [pageIndex, setPageIndex] = useState(1);
	const [queryResult, setQueryResult] = useState<QueryStagedUsersOutput>(emptyQueryResult);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const requestSequence = useRef(0);

	const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<FormState>(defaultFormState);
	const [formError, setFormError] = useState<string | null>(null);
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [appliedFilters, setAppliedFilters] = useState<FilterInput[]>([]);
	const [filterDrafts, setFilterDrafts] = useState<FilterDraft[]>([]);
	const [filterDraftCombinators, setFilterDraftCombinators] = useState<FilterCombinator[]>([]);

	const [deleteTarget, setDeleteTarget] = useState<StagedUserTableRow | null>(null);
	const [reviewDrawerState, setReviewDrawerState] = useState<{ row: StagedUserTableRow, diff: UserRequestReviewDiff | null } | null>(null);
	const [isReviewDiffLoading, setIsReviewDiffLoading] = useState(false);
	const [reviewReason, setReviewReason] = useState("");
	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<UserTableColumnId[]>(defaultUserColumnOrder);
	const [hiddenColumnIds, setHiddenColumnIds] = useState<UserTableColumnId[]>(defaultUserHiddenColumns);
	const [draggedColumnId, setDraggedColumnId] = useState<UserTableColumnId | null>(null);
	const [relationValuesByRowId, setRelationValuesByRowId] = useState<Record<string, Partial<Record<UserRelationColumn, string>>>>({});
	const [isRelationLoading, setIsRelationLoading] = useState(false);
	const [isMutating, startMutationTransition] = useTransition();

	const sortTokens = useMemo(() => (
		sortState.map(sortItem => `${sortItem.direction == "desc" ? "-" : "+"}${sortItem.field}`)
	), [sortState]);

	const columnById = useMemo(() => Object.fromEntries(
		userTableColumns.map(column => [column.id, column])
	) as Record<UserTableColumnId, UserTableColumnConfig>, []);

	const orderedColumns = useMemo(() => {
		const normalizedOrder = [
			...columnOrder.filter(columnId => columnById[columnId] != null),
			...defaultUserColumnOrder.filter(columnId => !columnOrder.includes(columnId))
		];
		return normalizedOrder.map(columnId => columnById[columnId]);
	}, [columnById, columnOrder]);

	const visibleColumns = useMemo(() => (
		orderedColumns.filter(column => !hiddenColumnIds.includes(column.id))
	), [hiddenColumnIds, orderedColumns]);

	const visibleRelationColumns = useMemo(() => (
		visibleColumns
			.map(column => column.id)
			.filter((columnId): columnId is UserRelationColumn => userRelationColumnSet.has(columnId as UserRelationColumn))
	), [visibleColumns]);

	const visibleColumnCount = visibleColumns.length + 1;

	const getFilterSummaryValue = useCallback((filter: FilterInput) => {
		const columnConfig = getFilterColumnConfig(filter.column);
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
	}, []);

	const filterSummaryItems = useMemo(() => (
		appliedFilters.map((filter, index) => ({
			id: `${filter.column}-${filter.operator}-${index}`,
			combinator: index == 0 ? null : (filter.joinWithPrevious ?? defaultFilterCombinator).toUpperCase(),
			columnLabel: getFilterColumnConfig(filter.column).label,
			operatorLabel: filterOperatorOptions.find(operator => operator.value == filter.operator)?.label ?? filter.operator,
			valueLabel: getFilterSummaryValue(filter)
		}))
	), [appliedFilters, getFilterSummaryValue]);

	const loadStagedUsersPage = useCallback(async (targetPage: number) => {
		const requestId = ++requestSequence.current;
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const response = await userActions.queryStagedUsersAction({
				keyword: debouncedKeyword,
				sort: sortTokens,
				filters: appliedFilters,
				page: targetPage,
				limit: PAGE_SIZE,
				mode,
				includeSoftDeleted: mode == "editor" ? showSoftDeleted : false
			});
			if(requestId != requestSequence.current) return;
			setQueryResult(response);
			setPageIndex(response.page);
		} catch(error) {
			console.error(error);
			if(requestId != requestSequence.current) return;
			setQueryResult(emptyQueryResult);
			setPageIndex(1);
			setErrorMessage(error instanceof Error ? error.message : "Failed to load staged users.");
		} finally {
			if(requestId == requestSequence.current)
				setIsLoading(false);
		}
	}, [appliedFilters, debouncedKeyword, mode, showSoftDeleted, sortTokens]);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedKeyword(keyword.trim());
		}, 250);
		return () => {
			window.clearTimeout(timeout);
		};
	}, [keyword]);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		const rawPreferences = window.localStorage.getItem(USER_COLUMN_PREFERENCES_KEY);
		if(rawPreferences == null)
			return;
		try {
			const parsed = JSON.parse(rawPreferences) as { order?: unknown, hidden?: unknown };
			const parsedOrder = Array.isArray(parsed.order) ? parsed.order.filter((value): value is UserTableColumnId =>
				typeof value == "string" && defaultUserColumnOrder.includes(value as UserTableColumnId)
			) : [];
			const deduplicatedOrder = parsedOrder.filter((columnId, index) => parsedOrder.indexOf(columnId) == index);
			setColumnOrder([
				...deduplicatedOrder,
				...defaultUserColumnOrder.filter(columnId => !deduplicatedOrder.includes(columnId))
			]);

			const parsedHidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((value): value is UserTableColumnId =>
				typeof value == "string" && defaultUserColumnOrder.includes(value as UserTableColumnId)
			) : [];
			const deduplicatedHidden = parsedHidden.filter((columnId, index) => parsedHidden.indexOf(columnId) == index);
			setHiddenColumnIds(deduplicatedHidden.slice(0, Math.max(defaultUserColumnOrder.length - 1, 0)));
		} catch {
			setColumnOrder(defaultUserColumnOrder);
			setHiddenColumnIds(defaultUserHiddenColumns);
		}
	}, []);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		window.localStorage.setItem(USER_COLUMN_PREFERENCES_KEY, JSON.stringify({
			order: columnOrder,
			hidden: hiddenColumnIds
		}));
	}, [columnOrder, hiddenColumnIds]);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		const rawFilters = window.localStorage.getItem(USER_FILTER_PREFERENCES_KEY);
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
		} catch {
			setFilterDrafts([]);
			setFilterDraftCombinators([]);
		}
	}, []);

	useEffect(() => {
		if(typeof window == "undefined")
			return;
		window.localStorage.setItem(USER_FILTER_PREFERENCES_KEY, JSON.stringify({
			drafts: filterDrafts.map(serializeFilterDraftForStorage),
			combinators: filterDraftCombinators
		}));
	}, [filterDraftCombinators, filterDrafts]);

	useEffect(() => {
		void loadStagedUsersPage(1);
	}, [loadStagedUsersPage]);

	useEffect(() => {
		if(queryResult.docs.length == 0 || visibleRelationColumns.length == 0) {
			setIsRelationLoading(false);
			return;
		}

		let cancelled = false;
		void (async () => {
			setIsRelationLoading(true);
			try {
				const rows = queryResult.docs.map(row => ({
					id: row.id,
					supervisorId: row.supervisorId,
					reviewedById: row.reviewedById,
					createdById: row.createdById,
					updatedById: row.updatedById,
					deletedById: row.deletedById
				}));

				const resolved = await userActions.resolveStagedUserRelationColumnsAction({
					rows,
					columns: visibleRelationColumns
				});

				if(cancelled)
					return;

				setRelationValuesByRowId(previous => ({
					...previous,
					...Object.fromEntries(resolved.map(item => [item.id, item.values]))
				}));
			} catch(error) {
				if(!cancelled)
					console.error(error);
			} finally {
				if(!cancelled)
					setIsRelationLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [queryResult.docs, visibleRelationColumns]);

	useEffect(() => {
		void (async () => {
			try {
				const results = await userActions.searchUserSupervisorsAction("");
				setSupervisors(results);
			} catch(_error) {
				setSupervisors([]);
			}
		})();
	}, []);

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

	const renderSortIcon = (field: SortField) => {
		const direction = getSortDirection(field);
		if(direction == "asc")
			return <ArrowUpIcon className="size-3.5" />;
		if(direction == "desc")
			return <ArrowDownIcon className="size-3.5" />;
		return <ArrowUpDownIcon className="text-muted-foreground size-3.5" />;
	};

	const renderSortableTableHead = (columnId: UserTableColumnId, label: string, field: SortField, className?: string) => (
		<TableHead key={columnId} className={className}>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => toggleSortField(field)}
				disabled={isLoading || isMutating}
				className="-ml-2 h-7 gap-1 px-2"
			>
				{label}
				{renderSortIcon(field)}
			</Button>
		</TableHead>
	);

	const toggleColumnVisibility = (columnId: UserTableColumnId, checked: boolean) => {
		setHiddenColumnIds(previous => {
			const isHidden = previous.includes(columnId);
			if(checked)
				return isHidden ? previous.filter(value => value != columnId) : previous;
			if(isHidden)
				return previous;
			const visibleCount = userTableColumns.length - previous.length;
			if(visibleCount <= 1)
				return previous;
			return [...previous, columnId];
		});
	};

	const resetColumnPreferences = () => {
		setColumnOrder(defaultUserColumnOrder);
		setHiddenColumnIds(defaultUserHiddenColumns);
	};

	const handleColumnDragStart = (columnId: UserTableColumnId) => {
		setDraggedColumnId(columnId);
	};

	const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: UserTableColumnId) => {
		event.preventDefault();
		if(draggedColumnId == null || draggedColumnId == targetColumnId)
			return;
		setColumnOrder(previous => reorderColumns(previous, draggedColumnId, targetColumnId));
	};

	const handleColumnDragEnd = () => {
		setDraggedColumnId(null);
	};

	const openFilterDialog = () => {
		if(appliedFilters.length == 0) {
			setFilterDrafts([]);
			setFilterDraftCombinators([]);
			setIsFilterOpen(true);
			return;
		}

		setFilterDraftCombinators(appliedFilters.slice(1).map(filter => filter.joinWithPrevious ?? defaultFilterCombinator));
		setFilterDrafts(appliedFilters.map(filter => {
			const columnConfig = getFilterColumnConfig(filter.column);
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
		setAppliedFilters([]);
		setFilterDraftCombinators([]);
		setFilterDrafts([]);
	};

	const updateFilterDraft = (id: string, updater: (draft: FilterDraft) => FilterDraft) => {
		setFilterDrafts(previous => previous.map(draft => draft.id == id ? updater(draft) : draft));
	};

	const handleFilterColumnChange = (id: string, column: FilterColumn) => {
		const nextColumnConfig = getFilterColumnConfig(column);
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

	const handleFilterOperatorChange = (id: string, operator: FilterOperator) => {
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

	const normalizeFilterItemValue = (
		columnConfig: FilterColumnOption,
		rawValue: string
	): string | boolean | null => {
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

	const addFilterListValue = (id: string) => {
		setFilterDrafts(previous => previous.map(draft => {
			if(draft.id != id)
				return draft;
			if(draft.operator != "in" && draft.operator != "not_in")
				return draft;

			const columnConfig = getFilterColumnConfig(draft.column);
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

	const buildFilterPayload = (draft: FilterDraft): FilterInput | null => {
		const columnConfig = getFilterColumnConfig(draft.column);
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

	const autoAppliedFilters = useMemo(() => {
		const nextFilters = filterDrafts
			.map(buildFilterPayload)
			.filter((value): value is FilterInput => value != null);
		return nextFilters.map((filter, index) => ({
			...filter,
			joinWithPrevious: index == 0 ? undefined : (filterDraftCombinators[index - 1] ?? defaultFilterCombinator)
		}));
	}, [filterDraftCombinators, filterDrafts]);

	useEffect(() => {
		setAppliedFilters(autoAppliedFilters);
	}, [autoAppliedFilters]);

	const runMutation = (action: () => Promise<void>) => {
		startMutationTransition(() => {
			void (async () => {
				setErrorMessage(null);
				try {
					await action();
					await loadStagedUsersPage(pageIndex);
				} catch(error) {
					setErrorMessage(error instanceof Error ? error.message : "Operation failed.");
				}
			})();
		});
	};

	const openCreateDialog = () => {
		setFormError(null);
		setFormState(defaultFormState);
		setIsFormOpen(true);
	};

	const openEditDialog = (row: StagedUserTableRow) => {
		setFormError(null);
		setFormState({
			stagedUserId: row.id,
			email: row.email,
			name: row.name,
			employeeId: row.employeeId,
			role: row.role,
			supervisorId: row.supervisorId ?? "",
			initialPassword: row.initialPassword
		});
		setIsFormOpen(true);
	};

	const submitForm = () => {
		setFormError(null);
		if(formState.email.trim().length == 0)
			return setFormError("Email is required.");
		if(formState.name.trim().length == 0)
			return setFormError("Name is required.");
		if(formState.employeeId.trim().length == 0)
			return setFormError("Employee ID is required.");
		if(formState.stagedUserId == null && formState.initialPassword.trim().length < 8)
			return setFormError("Initial password is required for new requests and must be at least 8 characters.");
		runMutation(async () => {
			await userActions.upsertStagedUserRequestAction({
				stagedUserId: formState.stagedUserId,
				email: formState.email,
				name: formState.name,
				employeeId: formState.employeeId,
				role: formState.role,
				supervisorId: formState.supervisorId.length > 0 ? formState.supervisorId : null,
				initialPassword: formState.initialPassword
			});
			setIsFormOpen(false);
		});
	};

	const requestDelete = (row: StagedUserTableRow) => {
		runMutation(async () => {
			await userActions.requestDeleteStagedUserAction(row.id);
			setDeleteTarget(null);
		});
	};

	const cancelRequest = (row: StagedUserTableRow) => {
		runMutation(async () => {
			await userActions.cancelStagedUserRequestAction(row.id);
		});
	};

	const requestRestore = (row: StagedUserTableRow) => {
		runMutation(async () => {
			await userActions.requestRestoreStagedUserAction(row.id);
		});
	};

	const openReviewDrawer = (row: StagedUserTableRow) => {
		setReviewReason("");
		setReviewDrawerState({ row, diff: null });
		setIsReviewDiffLoading(true);
		void (async () => {
			try {
				const diff = await userActions.getStagedUserRequestReviewDiffAction(row.id);
				setReviewDrawerState(previous => previous != null && previous.row.id == row.id ? { ...previous, diff } : previous);
			} catch(error) {
				setReviewDrawerState(null);
				setErrorMessage(error instanceof Error ? error.message : "Failed to load request diff.");
			} finally {
				setIsReviewDiffLoading(false);
			}
		})();
	};

	const submitReview = (decision: "approve" | "reject") => {
		if(reviewDrawerState == null) return;
		runMutation(async () => {
			await userActions.reviewStagedUserRequestAction({
				stagedUserId: reviewDrawerState.row.id,
				decision,
				reason: reviewReason
			});
			setReviewDrawerState(null);
			setReviewReason("");
		});
	};

	const renderUserCell = (columnId: UserTableColumnId, row: StagedUserTableRow) => {
		const resolvedValues = relationValuesByRowId[row.id] ?? {};
		switch(columnId) {
			case "name":
				return row.name;
			case "email":
				return row.email;
			case "employeeId":
				return row.employeeId;
			case "role":
				return row.role;
			case "supervisorName":
				if(isRelationLoading && resolvedValues.supervisorName == null)
					return <Skeleton className="h-4 w-28" />;
				return resolvedValues.supervisorName ?? row.supervisorName;
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
				return getRequestType(row);
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
	};

	return (
		<main className="bg-muted/30 p-4 md:p-6">
			<div className="mb-4 space-y-1">
				<h1 className="text-2xl font-semibold font-serif">User Management</h1>
				<p className="text-muted-foreground text-sm">Manage staged user requests with editor and approver workflows, including review comments and approval syncing into the users collection.</p>
			</div>
			<Card>
				<CardContent className="space-y-4">
					<Tabs value={mode} onValueChange={value => setMode(value as UserManagementTabMode)}>
						<TabsList>
							<TabsTrigger value="editor">Editor</TabsTrigger>
							<TabsTrigger value="approver">Approver</TabsTrigger>
						</TabsList>
						<TabsContent value={mode} className="space-y-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center">
									<div className="relative w-full">
										<SearchIcon className="text-muted-foreground absolute top-2 left-2.5 size-4" />
										<Input
											value={keyword}
											onChange={event => setKeyword(event.target.value)}
											placeholder="Search staged users by name, email, or employee ID"
											className="pl-8"
										/>
									</div>
									<Button variant="outline" type="button" className="shrink-0" onClick={toggleFilterPanel} disabled={isLoading || isMutating}>
										<FilterIcon />
										Filter
										{appliedFilters.length > 0 ? <Badge variant="outline">{appliedFilters.length}</Badge> : null}
									</Button>
									<Button variant="outline" type="button" className="shrink-0" onClick={() => setIsColumnOpen(previous => !previous)} disabled={isMutating}>
										<Columns3Icon />
										Columns
									</Button>
								</div>
								<div className="flex items-center gap-3">
									{mode == "editor" ? (
										<div className="flex items-center gap-2">
											<label htmlFor="user-show-deleted" className="text-sm">Show Deleted</label>
											<Switch
												id="user-show-deleted"
												checked={showSoftDeleted}
												onCheckedChange={checked => setShowSoftDeleted(checked)}
												disabled={isLoading || isMutating}
											/>
										</div>
									) : null}
									{mode == "editor" ? (
										<Button type="button" onClick={openCreateDialog} disabled={isLoading || isMutating}>
											<PlusIcon />
											Add Request
										</Button>
									) : null}
								</div>
							</div>

							<Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
								<CollapsibleContent>
									<div className="space-y-3 rounded-xl border p-4">
										<div className="flex items-center justify-between gap-2">
											<div className="space-y-1">
												<h3 className="text-sm font-semibold">Filter Staged Users</h3>
												<p className="text-muted-foreground text-sm">Build multiple filters and combine them with AND or OR.</p>
											</div>
											{appliedFilters.length > 0 ? (
												<Button type="button" variant="outline" size="sm" onClick={clearFilter} disabled={isLoading || isMutating}>Clear Filter</Button>
											) : null}
										</div>
										{filterDrafts.map((draft, index) => {
											const columnConfig = getFilterColumnConfig(draft.column);
											const isListOperator = draft.operator == "in" || draft.operator == "not_in";

											return (
												<div key={draft.id} className="space-y-3">
													{index > 0 ? (
														<div className="rounded-lg border border-dashed p-2">
															<label className="text-sm font-medium">Combinator with previous filter</label>
															<Select
																value={filterDraftCombinators[index - 1] ?? defaultFilterCombinator}
																onValueChange={value => setFilterDraftCombinators(previous => previous.map((combinator, combinatorIndex) => combinatorIndex == index - 1 ? value as FilterCombinator : combinator))}
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
															<Button type="button" variant="ghost" size="sm" onClick={() => removeFilterDraft(draft.id)} disabled={isMutating}>
																<XIcon />
																Remove
															</Button>
														</div>
														<div className="grid gap-3 sm:grid-cols-2">
															<div className="space-y-2">
																<label className="text-sm font-medium">Column</label>
																<Select value={draft.column} onValueChange={value => handleFilterColumnChange(draft.id, value as FilterColumn)}>
																	<SelectTrigger className="w-full"><SelectValue placeholder="Select column" /></SelectTrigger>
																	<SelectContent>
																		{userFilterColumns.map(column => (
																			<SelectItem key={column.value} value={column.value}>{column.label}</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
															<div className="space-y-2">
																<label className="text-sm font-medium">Operator</label>
																<Select value={draft.operator} onValueChange={value => handleFilterOperatorChange(draft.id, value as FilterOperator)}>
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
																<Select value={draft.existsValue} onValueChange={value => updateFilterDraft(draft.id, previous => ({ ...previous, existsValue: value as "true" | "false" }))}>
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
																		<Button type="button" variant="outline" onClick={() => addFilterListValue(draft.id)}><PlusIcon />Add Value</Button>
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
																							<Select value={value.length > 0 ? value : "true"} onValueChange={nextValue => updateFilterListValue(draft.id, valueIndex, nextValue)}>
																								<SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
																								<SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
																							</Select>
																						) : columnConfig.valueType == "select" ? (
																							<Select value={value.length > 0 ? value : (columnConfig.selectOptions?.[0]?.value ?? "")} onValueChange={nextValue => updateFilterListValue(draft.id, valueIndex, nextValue)}>
																								<SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
																								<SelectContent>
																									{columnConfig.selectOptions?.map(option => (
																										<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
																									))}
																								</SelectContent>
																							</Select>
																						) : columnConfig.valueType == "date" ? (
																							<div className="grid flex-1 grid-cols-2 gap-2">
																								<Popover>
																									<InputGroup>
																										<InputGroupInput
																											value={listDate?.dateText ?? ""}
																											onChange={event => updateFilterListValue(draft.id, valueIndex, buildFilterDateValue(event.target.value, listDate?.timeText ?? "00:00"))}
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
																											onSelect={date => updateFilterListValue(draft.id, valueIndex, date == null ? "" : buildFilterDateValue(formatFilterDateOnlyInput(date), listDate?.timeText ?? "00:00"))}
																										/>
																									</PopoverContent>
																								</Popover>
																								<Input type="time" value={listDate?.timeText ?? "00:00"} onChange={event => updateFilterListValue(draft.id, valueIndex, buildFilterDateValue(listDate?.dateText ?? "", event.target.value))} />
																							</div>
																						) : (
																							<Input value={value} onChange={event => updateFilterListValue(draft.id, valueIndex, event.target.value)} placeholder={columnConfig.placeholder ?? "Enter value"} className="flex-1" />
																						)}
																						<Button type="button" variant="outline" onClick={() => removeFilterListValue(draft.id, valueIndex)} className="shrink-0"><XIcon />Remove</Button>
																					</div>
																				);
																			})}
																		</div>
																	)}
																</div>
															) : columnConfig.valueType == "select" ? (
																<Select value={draft.value.length > 0 ? draft.value : ""} onValueChange={value => updateFilterDraft(draft.id, previous => ({ ...previous, value }))}>
																	<SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
																	<SelectContent>
																		{columnConfig.selectOptions?.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
																	</SelectContent>
																</Select>
															) : columnConfig.valueType == "boolean" ? (
																<Select value={draft.value.length > 0 ? draft.value : ""} onValueChange={value => updateFilterDraft(draft.id, previous => ({ ...previous, value }))}>
																	<SelectTrigger className="w-full"><SelectValue placeholder="Select value" /></SelectTrigger>
																	<SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
																</Select>
															) : columnConfig.valueType == "date" ? (
																<div className="grid grid-cols-2 gap-2">
																	<Popover>
																		<InputGroup>
																			<InputGroupInput
																				value={draft.dateText}
																				onChange={event => updateFilterDraft(draft.id, previous => {
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
																				onSelect={date => updateFilterDraft(draft.id, previous => {
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
																		value={getFilterTimeInput(draft.dateValue)}
																		onChange={event => updateFilterDraft(draft.id, previous => {
																			const baseDate = previous.dateValue ?? parseFilterDateOnlyValue(previous.dateText);
																			if(baseDate == null)
																				return previous;
																			const nextDate = applyTimeToDate(baseDate, event.target.value);
																			return { ...previous, dateValue: nextDate, dateText: formatFilterDateOnlyInput(nextDate) };
																		})}
																	/>
																</div>
															) : (
																<Input value={draft.value} onChange={event => updateFilterDraft(draft.id, previous => ({ ...previous, value: event.target.value }))} placeholder={columnConfig.placeholder ?? "Enter value"} />
															)}
														</div>
													</div>
												</div>
											);
										})}

										<Button type="button" variant="outline" onClick={addFilterDraft} disabled={isMutating}>
											<PlusIcon />
											Add Filter
										</Button>
									</div>
								</CollapsibleContent>
							</Collapsible>

							<Collapsible open={isColumnOpen} onOpenChange={setIsColumnOpen}>
								<CollapsibleContent>
									<div className="space-y-3 rounded-xl border p-4">
										<div className="flex items-center justify-between">
											<div className="space-y-1">
												<h3 className="text-sm font-semibold">Configure Columns</h3>
												<p className="text-muted-foreground text-sm">Toggle visibility and drag cards to reorder columns.</p>
											</div>
											<div className="flex items-center gap-2">
												<p className="text-muted-foreground text-sm">Visible {visibleColumns.length} of {userTableColumns.length}</p>
												<Button type="button" variant="outline" size="sm" onClick={resetColumnPreferences}>Reset</Button>
											</div>
										</div>
										<div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-6">
											{orderedColumns.map(column => {
												const isVisible = !hiddenColumnIds.includes(column.id);
												const isOnlyVisibleColumn = isVisible && hiddenColumnIds.length >= userTableColumns.length - 1;
												return (
													<div
														key={column.id}
														draggable
														onDragStart={() => handleColumnDragStart(column.id)}
														onDragOver={event => handleColumnDragOver(event, column.id)}
														onDragEnd={handleColumnDragEnd}
														onDrop={handleColumnDragEnd}
														className="hover:bg-muted/60 flex h-full min-h-14 items-center gap-3 rounded-lg border px-3 py-1.5 text-left"
													>
														<GripVerticalIcon className="text-muted-foreground size-4 shrink-0" />
														<Checkbox
															checked={isVisible}
															disabled={isOnlyVisibleColumn}
															onCheckedChange={checked => toggleColumnVisibility(column.id, checked == true)}
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

							{appliedFilters.length > 0 ? (
								<div className="rounded-lg border border-dashed px-3 py-2 text-xs">
									<p className="text-muted-foreground font-medium">Active filters</p>
									<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
										{filterSummaryItems.map(item => (
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
							) : null}

							{errorMessage != null ? (
								<div className="text-destructive bg-destructive/10 rounded-lg border px-3 py-2 text-sm">{errorMessage}</div>
							) : null}

							<div className="rounded-xl border">
								<Table>
									<TableHeader>
										<TableRow>
											{visibleColumns.map(column => (
												column.sortField != null ?
													renderSortableTableHead(column.id, column.label, column.sortField, column.headClassName) :
													<TableHead key={column.id} className={column.headClassName}>{column.label}</TableHead>
											))}
											<TableHead className="w-65">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{isLoading ? (
											<TableRow>
												<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">Loading staged users...</TableCell>
											</TableRow>
										) : null}
										{!isLoading && queryResult.docs.length == 0 ? (
											<TableRow>
												<TableCell colSpan={visibleColumnCount} className="text-muted-foreground py-8 text-center">No staged users found.</TableCell>
											</TableRow>
										) : null}
										{queryResult.docs.map(row => {
											const isPending = row.reviewedAt == null;
											const isRejected = row.reviewedAt != null && row.reviewApproved == false;
											return (
												<TableRow key={row.id}>
													{visibleColumns.map(column => (
														<TableCell key={`${row.id}-${column.id}`} className={column.cellClassName}>
															{renderUserCell(column.id, row)}
														</TableCell>
													))}
													<TableCell>
														<div className="flex flex-wrap gap-2">
															{mode == "editor" ? (
																<>
																	<Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(row)} disabled={isMutating || row.isSoftDeleted}>
																		<PencilIcon />
																		Edit
																	</Button>
																	{row.isSoftDeleted ? (
																		<Button type="button" size="sm" variant="outline" onClick={() => requestRestore(row)} disabled={isMutating}>
																			<PlusIcon />
																			Request Restore
																		</Button>
																	) : row.deletedAt == null ? (
																		<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(row)} disabled={isMutating}>
																			<Trash2Icon />
																			Request Delete
																		</Button>
																	) : null}
																	{isPending && !row.isSoftDeleted ? (
																		<Button type="button" size="sm" variant="secondary" onClick={() => cancelRequest(row)} disabled={isMutating}>
																			<XIcon />
																			Cancel Request
																		</Button>
																	) : null}
																	{isRejected && !row.isSoftDeleted ? (
																		<Button type="button" size="sm" variant="secondary" onClick={() => cancelRequest(row)} disabled={isMutating}>
																			<HistoryIcon />
																			Restore Approved
																		</Button>
																	) : null}
																</>
															) : (
																<Button
																	type="button"
																	size="sm"
																	variant="default"
																	onClick={() => openReviewDrawer(row)}
																	disabled={!isPending || isMutating || isReviewDiffLoading}
																>
																	<CheckIcon />
																	Review
																</Button>
															)}
														</div>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-muted-foreground text-sm">Showing page {pageIndex} ({queryResult.totalDocs} request(s))</p>
								<div className="flex gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => void loadStagedUsersPage(pageIndex - 1)}
										disabled={pageIndex <= 1 || !queryResult.hasPreviousPage || isLoading || isMutating}
									>
										Previous
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => void loadStagedUsersPage(pageIndex + 1)}
										disabled={!queryResult.hasNextPage || isLoading || isMutating}
									>
										Next
									</Button>
								</div>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			<Drawer open={isFormOpen} onOpenChange={setIsFormOpen} direction="right">
				<DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
					<DrawerHeader>
						<DrawerTitle>{formState.stagedUserId == null ? "Add Staged User Request" : "Edit Staged User Request"}</DrawerTitle>
						<DrawerDescription>Changes in editor mode create pending requests and require approver review before the users collection is updated.</DrawerDescription>
					</DrawerHeader>
					<div className="flex-1 overflow-y-auto px-4">
						<div className="grid gap-3 pb-4 sm:grid-cols-2">
							<div className="space-y-2 sm:col-span-2">
								<label className="text-sm font-medium">Email</label>
								<Input value={formState.email} onChange={event => setFormState(previous => ({ ...previous, email: event.target.value }))} placeholder="user@example.com" />
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Name</label>
								<Input value={formState.name} onChange={event => setFormState(previous => ({ ...previous, name: event.target.value }))} placeholder="Full name" />
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Employee ID</label>
								<Input value={formState.employeeId} onChange={event => setFormState(previous => ({ ...previous, employeeId: event.target.value }))} placeholder="EMP-0001" />
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Role</label>
								<Select value={formState.role} onValueChange={value => setFormState(previous => ({ ...previous, role: value as RoleValue }))}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select role" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="admin">Admin</SelectItem>
										<SelectItem value="manager">Manager</SelectItem>
										<SelectItem value="supervisor">Supervisor</SelectItem>
										<SelectItem value="officer">Officer</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium">Supervisor</label>
								<Select value={formState.supervisorId.length > 0 ? formState.supervisorId : "none"} onValueChange={value => setFormState(previous => ({ ...previous, supervisorId: value == "none" ? "" : value }))}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="No supervisor" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">No supervisor</SelectItem>
										{supervisors.map(supervisor => (
											<SelectItem key={supervisor.id} value={supervisor.id}>{supervisor.name} ({supervisor.email})</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2 sm:col-span-2">
								<label className="text-sm font-medium">Initial Password {formState.stagedUserId == null ? "(required)" : "(optional reset)"}</label>
								<Input
									type="password"
									value={formState.initialPassword}
									onChange={event => setFormState(previous => ({ ...previous, initialPassword: event.target.value }))}
									placeholder={formState.stagedUserId == null ? "At least 8 characters" : "Leave blank to keep current password"}
								/>
							</div>
							{formError != null ? <p className="text-destructive text-sm sm:col-span-2">{formError}</p> : null}
						</div>
					</div>
					<DrawerFooter className="border-t sm:flex-row sm:justify-end">
						<Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isMutating}>Cancel</Button>
						<Button type="button" onClick={submitForm} disabled={isMutating}>Save Request</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>

			<AlertDialog open={deleteTarget != null} onOpenChange={open => !open ? setDeleteTarget(null) : null}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Request Delete</AlertDialogTitle>
						<AlertDialogDescription>
							Delete does not hard-delete data. It creates a pending delete request by setting deletedAt, and requires approver review.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={() => deleteTarget != null ? requestDelete(deleteTarget) : null} disabled={isMutating}>Request Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Drawer
				open={reviewDrawerState != null}
				onOpenChange={open => {
					if(open == false)
						setReviewDrawerState(null);
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

						<div className="space-y-2">
							<label className="text-sm font-medium">Review Reason (optional)</label>
							<Textarea value={reviewReason} onChange={event => setReviewReason(event.target.value)} placeholder="Provide a review reason" />
						</div>
					</div>
					<DrawerFooter className="border-t sm:flex-row sm:justify-end">
						<Button type="button" variant="outline" onClick={() => setReviewDrawerState(null)} disabled={isMutating}>Cancel</Button>
						<Button type="button" variant="default" onClick={() => submitReview("approve")} disabled={isMutating || reviewDrawerState?.diff == null}>Approve</Button>
						<Button type="button" variant="destructive" onClick={() => submitReview("reject")} disabled={isMutating || reviewDrawerState?.diff == null}>Reject</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</main>
	);
}
