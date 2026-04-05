"use client";

import { useEffect, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
	getCreditApplicationAssignmentRowKey,
	parseErrorMessage,
	useCreditApplicationAssignmentCellRenderer,
	useCreditApplicationAssignmentColumnPreferences,
	useCreditApplicationAssignmentFilterColumnConfig,
	useCreditApplicationAssignmentFilters,
	useCreditApplicationAssignmentQueryState,
	useCreditApplicationAssignmentRelations,
	useCreditApplicationAssignmentsQuery,
	type CreditApplicationAssignmentReviewState,
	type CreditApplicationAssignmentRow
} from "../layout.components";

const emptyQueryResult: assignmentActions.AccountAssignmentApproverListOutput = {
	docs: [],
	totalDocs: 0,
	page: 1,
	hasNextPage: false,
	hasPreviousPage: false
};

export default function CreditApplicationAssignmentApproverPage() {
	const queryClient = useQueryClient();
	const relationNavigation = useDashboardRelationNavigation();
	const queryState = useCreditApplicationAssignmentQueryState();
	const columnPreferences = useCreditApplicationAssignmentColumnPreferences();
	const filterColumnConfig = useCreditApplicationAssignmentFilterColumnConfig();
	const filters = useCreditApplicationAssignmentFilters({
		getResolvedFilterColumnConfig: filterColumnConfig.getResolvedFilterColumnConfig
	});
	const [isMutating, startMutationTransition] = useTransition();

	const [pageIndex, setPageIndex] = useState(1);

	const [detailRow, setDetailRow] = useState<CreditApplicationAssignmentRow | null>(null);
	const [reviewRow, setReviewRow] = useState<CreditApplicationAssignmentRow | null>(null);
	const [reviewReason, setReviewReason] = useState("");
	const [reviewError, setReviewError] = useState<string | null>(null);

	useEffect(() => {
		setPageIndex(1);
	}, [filters.appliedFilters, queryState.debouncedKeyword, queryState.sortTokens]);

	const queryResult = useCreditApplicationAssignmentsQuery({
		mode: "approver",
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		page: pageIndex,
		limit: CREDIT_APPLICATION_ASSIGNMENT_PAGE_SIZE
	});

	useEffect(() => {
		if(queryResult.data == null || queryResult.isFetching)
			return;
		if(queryResult.data.page != pageIndex)
			setPageIndex(queryResult.data.page);
	}, [pageIndex, queryResult.data, queryResult.isFetching]);

	const queryData = queryResult.data ?? emptyQueryResult;
	const tableRows = queryData.docs;

	const relationQuery = useCreditApplicationAssignmentRelations({
		docs: tableRows,
		visibleColumns: columnPreferences.visibleColumns
	});

	const cellRenderer = useCreditApplicationAssignmentCellRenderer({
		hasEditorAccess: false,
		hasAuditorAccess: false,
		relationValuesByRowId: relationQuery.relationValuesByRowId,
		isRelationLoading: relationQuery.isRelationLoading,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const runMutation = (action: () => Promise<void>) => {
		startMutationTransition(() => {
			void (async () => {
				setReviewError(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment", "query"] });
				} catch(error) {
					setReviewError(parseErrorMessage(error, "Failed to submit assignment review."));
				}
			})();
		});
	};

	const queryErrorMessage = queryResult.error != null ? parseErrorMessage(queryResult.error, "Failed to load pending approval rows.") : null;
	const displayErrorMessage = reviewError ?? queryErrorMessage;
	const isLoading = queryResult.isLoading;

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

	const submitReview = (decision: "approve" | "reject") => {
		if(reviewRow == null || reviewRow.assignmentId == null)
			return;
		const assignmentId = reviewRow.assignmentId;

		runMutation(async () => {
			await assignmentActions.reviewAssignmentAction({
				assignmentId,
				decision,
				notes: reviewReason
			});
			setReviewRow(null);
			setReviewReason("");
		});
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
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search pending assignment requests"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<CreditApplicationAssignmentFilterCard
					isOpen={filters.isFilterOpen}
					onOpenChange={filters.setIsFilterOpen}
					filters={filters.filters}
					getResolvedFilterColumnConfig={filterColumnConfig.getResolvedFilterColumnConfig}
					onUpdateFilter={filters.updateFilter}
					onAddFilter={filters.addFilter}
					onRemoveFilter={filters.removeFilter}
					onClearFilters={filters.clearFilter}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<CreditApplicationColumnConfigCard
					isOpen={columnPreferences.isColumnOpen}
					onOpenChange={columnPreferences.setIsColumnOpen}
					orderedColumns={columnPreferences.orderedColumns}
					hiddenColumnIds={columnPreferences.hiddenColumnIds}
					onToggleColumnVisibility={columnPreferences.toggleColumnVisibility}
					onReset={columnPreferences.resetColumnPreferences}
					onColumnDragStart={columnPreferences.handleColumnDragStart}
					onColumnDragOver={columnPreferences.handleColumnDragOver}
					onColumnDragEnd={columnPreferences.handleColumnDragEnd}
				/>

				<CreditApplicationActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayErrorMessage != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{displayErrorMessage}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationAssignmentTable
					rows={tableRows}
					visibleColumns={columnPreferences.visibleColumns}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderCell={cellRenderer.renderCell}
					renderActions={renderApproverActions}
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
				relationValues={detailRow == null ? null : relationQuery.relationValuesByRowId[getCreditApplicationAssignmentRowKey(detailRow)] ?? null}
				renderActions={renderApproverActions}
				hasAuditorAccess={false}
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
				onApprove={() => submitReview("approve")}
				onReject={() => submitReview("reject")}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
