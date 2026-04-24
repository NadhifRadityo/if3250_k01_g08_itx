"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as creditApplicationAssignmentActions from "../layout.actions";
import { CreditApplicationAssignmentActiveFiltersSummary } from "../layout.components";
import { CreditApplicationAssignmentColumnConfigCard } from "../layout.components";
import { CreditApplicationAssignmentRequestChangePreviewDrawer } from "../layout.components";
import { CreditApplicationAssignmentRequestDetailsDrawer } from "../layout.components";
import { CreditApplicationAssignmentRequestFilterCard } from "../layout.components";
import { CreditApplicationAssignmentRequestReviewDrawer } from "../layout.components";
import { CreditApplicationAssignmentRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerCreditApplicationAssignmentColumnId } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useCreditApplicationAssignmentCellRenderer } from "../layout.components";
import { useCreditApplicationAssignmentColumnPreferences } from "../layout.components";
import { useCreditApplicationAssignmentFilterColumnConfig } from "../layout.components";
import { useCreditApplicationAssignmentManagementQueryState } from "../layout.components";
import { useCreditApplicationAssignmentRelations } from "../layout.components";
import { useCreditApplicationAssignmentRequestFilters } from "../layout.components";
import { useCreditApplicationAssignmentRequestsQuery } from "../layout.components";
import {
	type ActionError,
	type CreditApplicationAssignmentTableRow,
	type CreditApplicationAssignmentRequestReviewDiff
} from "../layout.components";

export default function CreditApplicationAssignmentApproverPage() {
	const [reviewError, setReviewError] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [reviewDrawerState, setReviewDrawerState] = useState<{ row: CreditApplicationAssignmentTableRow, diff: CreditApplicationAssignmentRequestReviewDiff | null } | null>(null);
	const [isReviewDiffLoading, setIsReviewDiffLoading] = useState(false);
	const [reviewReason, setReviewReason] = useState("");
	const [detailRow, setDetailRow] = useState<CreditApplicationAssignmentTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<CreditApplicationAssignmentTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useCreditApplicationAssignmentColumnPreferences();
	const queryState = useCreditApplicationAssignmentManagementQueryState();
	const { getResolvedFilterColumnConfig } = useCreditApplicationAssignmentFilterColumnConfig();
	const filters = useCreditApplicationAssignmentRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useCreditApplicationAssignmentRequestsQuery({
		queryScope: "approver",
		queryAction: creditApplicationAssignmentActions.queryCreditApplicationAssignmentsApproverAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useCreditApplicationAssignmentRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderAssignmentCell = useCreditApplicationAssignmentCellRenderer({
		relationValuesByRowId,
		isRelationLoading,
		onOpenRequestChanges: setRequestChangeRow,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});
	const displayError = queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null;
	const detailTriggerColumnId = getEligibleDetailTriggerCreditApplicationAssignmentColumnId(columnPreferences.visibleColumns);

	const runMutation = (action: () => Promise<void>) => {
		startMutationTransition(() => {
			void (async () => {
				setReviewError(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["credit-application-assignment"] });
				} catch(error) {
					setReviewError(resolveActionError(error, "Failed to submit review."));
				}
			})();
		});
	};

	const openReviewDrawer = (row: CreditApplicationAssignmentTableRow) => {
		setReviewReason("");
		setReviewError(null);
		setReviewDrawerState({ row, diff: null });
		setIsReviewDiffLoading(true);
		void (async () => {
			try {
				const diff = await creditApplicationAssignmentActions.getCreditApplicationAssignmentRequestReviewDiffAction(row.id);
				setReviewDrawerState(previous => previous != null && previous.row.id == row.id ? { ...previous, diff } : previous);
			} catch(error) {
				setReviewDrawerState(null);
				setReviewError(resolveActionError(error, "Failed to load request diff."));
			} finally {
				setIsReviewDiffLoading(false);
			}
		})();
	};

	const submitReview = (decision: "approve" | "reject") => {
		if(reviewDrawerState == null)
			return;
		runMutation(async () => {
			await creditApplicationAssignmentActions.reviewCreditApplicationAssignmentRequestAction({
				assignmentId: reviewDrawerState.row.id,
				decision,
				reason: reviewReason
			});
			setReviewDrawerState(null);
			setReviewReason("");
		});
	};

	const renderAssignmentActions = (row: CreditApplicationAssignmentTableRow) => {
		const isPending = row.reviewedAt == null;
		return (
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
		);
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Assignment"
				description="Review pending credit application assignment requests before publication."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search assignments by application or officer"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<CreditApplicationAssignmentRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<CreditApplicationAssignmentColumnConfigCard
					isOpen={columnPreferences.isColumnOpen}
					onOpenChange={columnPreferences.setIsColumnOpen}
					orderedColumns={columnPreferences.orderedColumns}
					hiddenColumnIds={columnPreferences.hiddenColumnIds}
					visibleColumnCount={columnPreferences.visibleColumns.length}
					onToggleColumnVisibility={columnPreferences.toggleColumnVisibility}
					onReset={columnPreferences.resetColumnPreferences}
					onColumnDragStart={columnPreferences.handleColumnDragStart}
					onColumnDragOver={columnPreferences.handleColumnDragOver}
					onColumnDragEnd={columnPreferences.handleColumnDragEnd}
				/>

				<CreditApplicationAssignmentActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationAssignmentRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderCreditApplicationAssignmentCell={renderAssignmentCell}
					renderActions={renderAssignmentActions}
				/>

				<DashboardManagementPagination
					pageIndex={pageIndex}
					totalRequests={queryResult.totalDocs}
					hasPreviousPage={queryResult.hasPreviousPage}
					hasNextPage={queryResult.hasNextPage}
					isLoading={isLoading}
					isMutating={isMutating}
					onPrevious={() => setPageIndex(previous => Math.max(previous - 1, 1))}
					onNext={() => setPageIndex(previous => previous + 1)}
				/>
			</DashboardManagementPageFrame>

			<CreditApplicationAssignmentRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderAssignmentActions}
				onOpenRequestChanges={setRequestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<CreditApplicationAssignmentRequestReviewDrawer
				open={reviewDrawerState != null}
				onOpenChange={open => {
					if(!open) {
						setReviewDrawerState(null);
						setReviewError(null);
					}
				}}
				reviewDrawerState={reviewDrawerState}
				reviewError={reviewError}
				isReviewDiffLoading={isReviewDiffLoading}
				reviewReason={reviewReason}
				onReviewReasonChange={setReviewReason}
				onApprove={() => submitReview("approve")}
				onReject={() => submitReview("reject")}
				isMutating={isMutating}
				onOpenRequestChanges={setRequestChangeRow}
			/>

			<CreditApplicationAssignmentRequestChangePreviewDrawer
				open={requestChangeRow != null}
				onOpenChange={open => {
					if(!open)
						setRequestChangeRow(null);
				}}
				row={requestChangeRow}
			/>

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
