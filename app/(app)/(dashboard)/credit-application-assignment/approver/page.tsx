"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementPageFrame, DashboardManagementPagination, DashboardManagementToolbar } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as assignmentActions from "../layout.actions";
import {
	CREDIT_APPLICATION_ASSIGNMENT_PAGE_SIZE,
	CreditApplicationActiveFiltersSummary,
	CreditApplicationAssignmentDetailsDrawer,
	CreditApplicationAssignmentFilterCard,
	CreditApplicationAssignmentReviewDrawer,
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
	type CreditApplicationAssignmentReviewState,
	type CreditApplicationAssignmentRow,
	type CreditApplicationAssignmentSortField
} from "../layout.components";

const emptyQueryResult: assignmentActions.AccountAssignmentApproverListOutput = {
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

type ApproverTableRow = CreditApplicationAssignmentRow & {
	requestorId: string;
	requestorName: string | null;
	requestedAt: string;
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

export default function CreditApplicationAssignmentApproverPage() {
	const queryClient = useQueryClient();
	const relationNavigation = useDashboardRelationNavigation();

	const [keyword, setKeyword] = useState("");
	const [debouncedKeyword, setDebouncedKeyword] = useState("");
	const [pageIndex, setPageIndex] = useState(1);
	const [sortState, setSortState] = useState<SortState>(null);

	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [filters, setFilters] = useState<CreditApplicationAssignmentFilterCondition[]>([]);

	const [isColumnOpen, setIsColumnOpen] = useState(false);
	const [columnOrder, setColumnOrder] = useState<CreditApplicationAssignmentColumnId[]>(defaultCreditApplicationAssignmentColumnOrder);
	const [hiddenColumnIds, setHiddenColumnIds] = useState<CreditApplicationAssignmentColumnId[]>(defaultCreditApplicationAssignmentHiddenColumns);
	const [draggingColumnId, setDraggingColumnId] = useState<CreditApplicationAssignmentColumnId | null>(null);

	const [detailRow, setDetailRow] = useState<CreditApplicationAssignmentRow | null>(null);
	const [reviewRow, setReviewRow] = useState<CreditApplicationAssignmentRow | null>(null);
	const [reviewReason, setReviewReason] = useState("");
	const [reviewError, setReviewError] = useState<string | null>(null);

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
		mode: "approver",
		search: debouncedKeyword,
		page: pageIndex,
		limit: CREDIT_APPLICATION_ASSIGNMENT_PAGE_SIZE
	});

	const relationHelpers = useCreditApplicationAssignmentRelations({
		hasEditorAccess: false,
		hasAuditorAccess: false,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const cellRenderer = useCreditApplicationAssignmentCellRenderer({
		hasEditorAccess: false,
		hasAuditorAccess: false,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const reviewMutation = useMutation({
		mutationFn: async (decision: "approve" | "reject") => {
			if(reviewRow == null)
				throw new Error("No assignment selected for review.");

			if(decision == "approve") {
				await assignmentActions.approveAssignmentAction({ assignmentId: reviewRow.assignmentId ?? "", notes: reviewReason });
				return;
			}
			await assignmentActions.rejectAssignmentAction({ assignmentId: reviewRow.assignmentId ?? "", notes: reviewReason });
		},
		onSuccess: async () => {
			setReviewRow(null);
			setReviewReason("");
			setReviewError(null);
			await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment", "query"] });
		},
		onError: error => {
			setReviewError(parseErrorMessage(error, "Failed to submit assignment review."));
		}
	});

	const groupedResult = queryResult.data ?? emptyQueryResult;
	const queryRows = useMemo(() => {
		const rows: ApproverTableRow[] = [];
		for(const group of groupedResult.docs) {
			for(const request of group.requests) {
				rows.push({
					assignmentId: request.assignmentId,
					assignmentStatus: "pending_approval",
					applyId: request.applyId,
					accountName: request.accountName,
					officerName: request.officerName,
					address: request.address,
					productCode: request.productCode,
					requestorId: group.createdBy.id,
					requestorName: group.createdBy.name,
					requestedAt: request.requestedAt
				});
			}
		}
		return rows;
	}, [groupedResult.docs]);

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

	const queryErrorMessage = queryResult.error != null ? parseErrorMessage(queryResult.error, "Failed to load pending approval rows.") : null;
	const displayErrorMessage = reviewError ?? queryErrorMessage;
	const isLoading = queryResult.isLoading;
	const isMutating = reviewMutation.isPending;

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

	const openReviewDrawer = (row: CreditApplicationAssignmentRow) => {
		if(row.assignmentId == null)
			return;
		setReviewError(null);
		setReviewReason("");
		setReviewRow(row);
	};

	const reviewDrawerState: CreditApplicationAssignmentReviewState | null = reviewRow == null ? null : {
		assignmentId: reviewRow.assignmentId ?? "",
		reviewReason
	};

	const renderApproverActions = (row: CreditApplicationAssignmentRow) => (
		<Button
			type="button"
			size="sm"
			onClick={() => openReviewDrawer(row)}
			disabled={isMutating || row.assignmentId == null || row.assignmentStatus != "pending_approval"}
		>
			<CheckIcon />
			Review
		</Button>
	);

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Assignment"
				description="Review pending assignment requests one-by-one before publication."
			>
				<DashboardManagementToolbar
					keyword={keyword}
					onKeywordChange={setKeyword}
					searchPlaceholder="Search pending assignment requests"
					filterCount={filters.length}
					onToggleFilter={() => setIsFilterOpen(previous => !previous)}
					onToggleColumns={() => setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
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
					renderActions={renderApproverActions}
				/>

				<DashboardManagementPagination
					pageIndex={pageIndex}
					totalRequests={groupedResult.totalDocs}
					hasPreviousPage={groupedResult.hasPreviousPage}
					hasNextPage={groupedResult.hasNextPage}
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
				renderActions={renderApproverActions}
				hasAuditorAccess={relationHelpers.hasAuditorAccess}
			/>

			<CreditApplicationAssignmentReviewDrawer
				open={reviewDrawerState != null}
				onOpenChange={open => {
					if(!open) {
						setReviewRow(null);
						setReviewReason("");
						setReviewError(null);
					}
				}}
				state={reviewDrawerState}
				error={reviewError}
				isMutating={isMutating}
				onReviewReasonChange={setReviewReason}
				onApprove={() => reviewMutation.mutate("approve")}
				onReject={() => reviewMutation.mutate("reject")}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
