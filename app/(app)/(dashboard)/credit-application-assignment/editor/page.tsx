"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon, EyeIcon, PencilIcon, PlusIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementPageFrame, DashboardManagementPagination, DashboardManagementToolbar } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as assignmentActions from "../layout.actions";
import {
	CREDIT_APPLICATION_ASSIGNMENT_PAGE_SIZE,
	CreditApplicationActiveFiltersSummary,
	CreditApplicationAssignmentCancelDialog,
	CreditApplicationAssignmentDeleteDialog,
	CreditApplicationAssignmentDetailsDrawer,
	CreditApplicationAssignmentFilterCard,
	CreditApplicationAssignmentFormDrawer,
	CreditApplicationAssignmentPreviewDrawer,
	CreditApplicationAssignmentTable,
	CreditApplicationColumnConfigCard,
	createCreditApplicationAssignmentFilterCondition,
	creditApplicationAssignmentColumns,
	creditApplicationAssignmentFilterColumns,
	defaultCreditApplicationAssignmentColumnOrder,
	defaultCreditApplicationAssignmentHiddenColumns,
	parseErrorMessage,
	reorderCreditApplicationAssignmentColumns,
	useCreditApplicationAssignmentCellRenderer,
	useCreditApplicationAssignmentRelations,
	useCreditApplicationAssignmentsQuery,
	type CreditApplicationAssignmentColumnId,
	type CreditApplicationAssignmentFilterCondition,
	type CreditApplicationAssignmentFormState,
	type CreditApplicationAssignmentRow,
	type CreditApplicationAssignmentSortField
} from "../layout.components";

const emptyQueryResult: assignmentActions.AccountAssignmentEditorListOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};

type SortDirection = "asc" | "desc";

type SortState = {
	field: CreditApplicationAssignmentSortField;
	direction: SortDirection;
} | null;

const defaultFormState: CreditApplicationAssignmentFormState = {
	applyId: "",
	officerIds: [],
	notes: ""
};

function getRowFieldValue(row: CreditApplicationAssignmentRow, column: CreditApplicationAssignmentFilterCondition["column"]): string {
	if(column == "applyId")
		return row.applyId;
	if(column == "accountName")
		return row.accountName;
	if(column == "officerName")
		return row.officerName ?? "";
	if(column == "address")
		return row.address;
	if(column == "productCode")
		return row.productCode;
	return row.assignmentStatus ?? "";
}

function evaluateFilterCondition(row: CreditApplicationAssignmentRow, condition: CreditApplicationAssignmentFilterCondition): boolean {
	const rawValue = getRowFieldValue(row, condition.column);
	const value = rawValue.toLowerCase();
	const single = condition.value.trim().toLowerCase();
	const list = single.split(",").map(token => token.trim()).filter(token => token.length > 0);

	if(condition.operator == "exists")
		return condition.existsValue == "true" ? value.length > 0 : value.length == 0;
	if(condition.operator == "equals")
		return value == single;
	if(condition.operator == "not_equals")
		return value != single;
	if(condition.operator == "contains")
		return value.includes(single);
	if(condition.operator == "not_contains")
		return !value.includes(single);
	if(condition.operator == "in")
		return list.includes(value);
	return !list.includes(value);
}

function applyFilterConditions(rows: CreditApplicationAssignmentRow[], filters: CreditApplicationAssignmentFilterCondition[]): CreditApplicationAssignmentRow[] {
	if(filters.length == 0)
		return rows;

	return rows.filter(row => {
		let result = evaluateFilterCondition(row, filters[0]);
		for(let index = 1; index < filters.length; index++) {
			const nextResult = evaluateFilterCondition(row, filters[index]);
			result = filters[index].joinWithPrevious == "or" ? (result || nextResult) : (result && nextResult);
		}
		return result;
	});
}

function sortRows(rows: CreditApplicationAssignmentRow[], sortState: SortState): CreditApplicationAssignmentRow[] {
	if(sortState == null)
		return rows;

	const sortedRows = [...rows];
	sortedRows.sort((a, b) => {
		const left = getRowFieldValue(a, sortState.field).toLowerCase();
		const right = getRowFieldValue(b, sortState.field).toLowerCase();
		if(left == right)
			return 0;
		const base = left > right ? 1 : -1;
		return sortState.direction == "asc" ? base : -base;
	});
	return sortedRows;
}

export default function CreditApplicationAssignmentEditorPage() {
	const queryClient = useQueryClient();
	const relationNavigation = useDashboardRelationNavigation();

	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);
	const [sortState, setSortState] = useState<SortState>(null);
	const [pageError, setPageError] = useState<string | null>(null);

	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters] = useState<CreditApplicationAssignmentFilterCondition[]>([]);

	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<CreditApplicationAssignmentColumnId[]>(defaultCreditApplicationAssignmentColumnOrder);
	const [hiddenColumnIds, setHiddenColumnIds] = useState<CreditApplicationAssignmentColumnId[]>(defaultCreditApplicationAssignmentHiddenColumns);
	const [draggingColumnId, setDraggingColumnId] = useState<CreditApplicationAssignmentColumnId | null>(null);

	const [detailRow, setDetailRow] = useState<CreditApplicationAssignmentRow | null>(null);
	const [previewRow, setPreviewRow] = useState<CreditApplicationAssignmentRow | null>(null);

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [formState, setFormState] = useState<CreditApplicationAssignmentFormState>(defaultFormState);
	const [formError, setFormError] = useState<string | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<CreditApplicationAssignmentRow | null>(null);
	const [cancelTarget, setCancelTarget] = useState<CreditApplicationAssignmentRow | null>(null);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setDebouncedKeyword(keyword.trim());
		}, 300);
		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [keyword]);

	useEffect(() => {
		setPageIndex(1);
	}, [debouncedKeyword]);

	const queryResult = useCreditApplicationAssignmentsQuery({
		mode: "editor",
		search: debouncedKeyword,
		page: pageIndex,
		limit: CREDIT_APPLICATION_ASSIGNMENT_PAGE_SIZE
	});

	const officerOptionsResult = useQuery({
		queryKey: ["credit-application-assignment", "officer-options"],
		queryFn: assignmentActions.listAssignmentOfficerOptionsAction,
		staleTime: 60_000
	});

	const relationHelpers = useCreditApplicationAssignmentRelations({
		hasEditorAccess: true,
		hasAuditorAccess: false,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const cellRenderer = useCreditApplicationAssignmentCellRenderer({
		hasEditorAccess: true,
		hasAuditorAccess: false,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const assignmentMutation = useMutation({
		mutationFn: async (input: CreditApplicationAssignmentFormState) => {
			const applyId = input.applyId.trim();
			if(applyId.length == 0)
				throw new Error("Apply ID is required.");
			if(input.officerIds.length != 1)
				throw new Error("Please select exactly one officer.");

			if(input.assignmentId == null) {
				await assignmentActions.createAssignmentRequestsAction({
					applyIds: [applyId],
					officerIds: input.officerIds
				});
				return;
			}

			await assignmentActions.reassignAssignmentRequestAction({
				assignmentId: input.assignmentId,
				officerIds: input.officerIds
			});
		},
		onSuccess: async () => {
			setIsFormOpen(false);
			setFormError(null);
			setFormState(defaultFormState);
			await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment", "query"] });
		},
		onError: error => {
			setFormError(parseErrorMessage(error, "Failed to submit assignment request."));
		}
	});

	const queryData = queryResult.data ?? emptyQueryResult;
	const queryRows = queryData.docs;
	const filteredRows = useMemo(() => applyFilterConditions(queryRows, filters), [queryRows, filters]);
	const tableRows = useMemo(() => sortRows(filteredRows, sortState), [filteredRows, sortState]);

	const orderedColumns = useMemo(() => {
		const byId = new Map(creditApplicationAssignmentColumns.map(column => [column.id, column]));
		return columnOrder
			.map(columnId => byId.get(columnId) ?? null)
			.filter((column): column is (typeof creditApplicationAssignmentColumns)[number] => column != null);
	}, [columnOrder]);

	const visibleColumns = useMemo(() => orderedColumns.filter(column => !hiddenColumnIds.includes(column.id)), [hiddenColumnIds, orderedColumns]);

	const filterSummaryItems = useMemo(() => {
		return filters.map((filter, index) => {
			const columnOption = creditApplicationAssignmentFilterColumns.find(column => column.value == filter.column);
			const valueLabel = filter.operator == "exists" ? filter.existsValue : filter.value;
			return {
				combinator: index == 0 ? null : filter.joinWithPrevious.toUpperCase(),
				columnLabel: columnOption?.label ?? filter.column,
				operatorLabel: filter.operator,
				valueLabel: valueLabel.length > 0 ? valueLabel : "(empty)"
			};
		});
	}, [filters]);

	const queryErrorMessage = queryResult.error != null ? parseErrorMessage(queryResult.error, "Failed to load assignment data.") : null;
	const displayErrorMessage = pageError ?? queryErrorMessage;
	const isLoading = queryResult.isLoading;
	const isMutating = assignmentMutation.isPending;

	const getSortDirection = (field: CreditApplicationAssignmentSortField): SortDirection | null => {
		if(sortState == null || sortState.field != field)
			return null;
		return sortState.direction;
	};

	const toggleSortField = (field: CreditApplicationAssignmentSortField) => {
		setSortState(previous => {
			if(previous == null || previous.field != field)
				return { field, direction: "asc" };
			if(previous.direction == "asc")
				return { field, direction: "desc" };
			return null;
		});
	};

	const toggleColumnVisibility = (columnId: CreditApplicationAssignmentColumnId, checked: boolean) => {
		setHiddenColumnIds(previous => {
			if(checked)
				return previous.filter(id => id != columnId);
			if(previous.includes(columnId))
				return previous;
			return [...previous, columnId];
		});
	};

	const handleColumnDragStart = (columnId: CreditApplicationAssignmentColumnId) => {
		setDraggingColumnId(columnId);
	};

	const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, targetColumnId: CreditApplicationAssignmentColumnId) => {
		event.preventDefault();
		setColumnOrder(previous => {
			if(draggingColumnId == null)
				return previous;
			return reorderCreditApplicationAssignmentColumns(previous, draggingColumnId, targetColumnId);
		});
	};

	const handleColumnDragEnd = () => {
		setDraggingColumnId(null);
	};

	const openCreateDialog = () => {
		setFormError(null);
		setFormState(defaultFormState);
		setIsFormOpen(true);
	};

	const openAssignDialog = (row: CreditApplicationAssignmentRow) => {
		setFormError(null);
		setFormState({
			assignmentId: row.assignmentId ?? undefined,
			applyId: row.applyId,
			officerIds: [],
			notes: ""
		});
		setIsFormOpen(true);
	};

	const submitForm = () => {
		setPageError(null);
		setFormError(null);
		assignmentMutation.mutate(formState);
	};

	const renderAssignmentActions = (row: CreditApplicationAssignmentRow) => {
		return (
			<>
				<Button type="button" size="sm" variant="outline" onClick={() => setPreviewRow(row)} disabled={isMutating}>
					<EyeIcon />
					Preview
				</Button>
				<Button type="button" size="sm" variant="outline" onClick={() => openAssignDialog(row)} disabled={isMutating}>
					<PencilIcon />
					{row.assignmentId == null ? "Assign" : "Reassign"}
				</Button>
				{row.assignmentStatus == "pending_approval" ? (
					<Button type="button" size="sm" variant="secondary" onClick={() => setCancelTarget(row)} disabled={isMutating}>
						Cancel Request
					</Button>
				) : null}
				{row.assignmentId != null ? (
					<Button type="button" size="sm" variant="destructive" onClick={() => setDeleteTarget(row)} disabled={isMutating}>
						Delete
					</Button>
				) : null}
			</>
		);
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Assignment"
				description="Manage assignment requests with editor workflows for assigning and reassigning officers."
			>
				<DashboardManagementToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search by apply ID or account name"
					filterCount={filters.length}
					onToggleFilter={() => setIsFilterOpen(previous => !previous)}
					onToggleColumns={() => setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
					rightSlot={(
						<Button type="button" onClick={openCreateDialog} disabled={isLoading || isMutating}>
							<PlusIcon />
							Add
						</Button>
					)}
				/>

				<CreditApplicationAssignmentFilterCard
					isOpen={isFilterOpen}
					onOpenChange={setIsFilterOpen}
					filters={filters}
					onUpdateFilter={(index, update) => {
						setFilters(previous => previous.map((filter, filterIndex) => filterIndex == index ? { ...filter, ...update } : filter));
					}}
					onAddFilter={() => setFilters(previous => [...previous, createCreditApplicationAssignmentFilterCondition()])}
					onRemoveFilter={index => setFilters(previous => previous.filter((_, filterIndex) => filterIndex != index))}
					onClearFilters={() => setFilters([])}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<CreditApplicationColumnConfigCard
					isOpen={isColumnOpen}
					onOpenChange={setIsColumnOpen}
					orderedColumns={orderedColumns}
					hiddenColumnIds={hiddenColumnIds}
					onToggleColumnVisibility={toggleColumnVisibility}
					onReset={() => {
						setColumnOrder(defaultCreditApplicationAssignmentColumnOrder);
						setHiddenColumnIds(defaultCreditApplicationAssignmentHiddenColumns);
					}}
					onColumnDragStart={handleColumnDragStart}
					onColumnDragOver={handleColumnDragOver}
					onColumnDragEnd={handleColumnDragEnd}
				/>

				<CreditApplicationActiveFiltersSummary items={filterSummaryItems} />

				{displayErrorMessage != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{displayErrorMessage}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationAssignmentTable
					rows={tableRows}
					visibleColumns={visibleColumns}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={getSortDirection}
					onToggleSortField={toggleSortField}
					onOpenDetails={setDetailRow}
					renderCell={cellRenderer.renderCell}
					renderActions={renderAssignmentActions}
				/>

				<DashboardManagementPagination
					pageIndex={pageIndex}
					totalRequests={queryData.totalDocs}
					hasPreviousPage={queryData.hasPreviousPage}
					hasNextPage={queryData.hasNextPage}
					isLoading={isLoading}
					isMutating={isMutating}
					onPrevious={() => setPageIndex(previous => Math.max(previous - 1, 1))}
					onNext={() => setPageIndex(previous => previous + 1)}
				/>
			</DashboardManagementPageFrame>

			<CreditApplicationAssignmentDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderAssignmentActions}
				hasAuditorAccess={relationHelpers.hasAuditorAccess}
			/>

			<CreditApplicationAssignmentPreviewDrawer
				open={previewRow != null}
				onOpenChange={open => {
					if(!open)
						setPreviewRow(null);
				}}
				row={previewRow}
			/>

			<CreditApplicationAssignmentFormDrawer
				open={isFormOpen}
				onOpenChange={open => {
					setIsFormOpen(open);
					if(!open)
						setFormError(null);
				}}
				formState={formState}
				officerOptions={officerOptionsResult.data ?? []}
				isMutating={isMutating}
				formError={formError}
				onApplyIdChange={value => setFormState(previous => ({ ...previous, applyId: value }))}
				onOfficerIdsChange={value => setFormState(previous => ({ ...previous, officerIds: value }))}
				onNotesChange={value => setFormState(previous => ({ ...previous, notes: value }))}
				onSubmit={submitForm}
			/>

			<CreditApplicationAssignmentDeleteDialog
				open={deleteTarget != null}
				onOpenChange={open => {
					if(!open)
						setDeleteTarget(null);
				}}
				onConfirm={() => {
					setDeleteTarget(null);
					setPageError("Delete request action is not available yet.");
				}}
				isMutating={isMutating}
			/>

			<CreditApplicationAssignmentCancelDialog
				open={cancelTarget != null}
				onOpenChange={open => {
					if(!open)
						setCancelTarget(null);
				}}
				onConfirm={() => {
					setCancelTarget(null);
					setPageError("Cancel request action is not available yet.");
				}}
				isMutating={isMutating}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
