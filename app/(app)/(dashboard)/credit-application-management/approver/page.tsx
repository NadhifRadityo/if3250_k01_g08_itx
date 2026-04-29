"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { createEmptyReviewComment, type ReviewCommentRichText } from "@/utils/reviewCommentRichText";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as creditApplicationActions from "../layout.actions";
import { CreditApplicationActiveFiltersSummary } from "../layout.components";
import { CreditApplicationColumnConfigCard } from "../layout.components";
import { CreditApplicationRequestDetailsDrawer } from "../layout.components";
import { CreditApplicationRequestChangePreviewDrawer } from "../layout.components";
import { CreditApplicationRequestFilterCard } from "../layout.components";
import { CreditApplicationRequestReviewDrawer } from "../layout.components";
import { CreditApplicationRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerCreditApplicationColumnId } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useCreditApplicationCellRenderer } from "../layout.components";
import { useCreditApplicationColumnPreferences } from "../layout.components";
import { useCreditApplicationFilterColumnConfig } from "../layout.components";
import { useCreditApplicationManagementQueryState } from "../layout.components";
import { useCreditApplicationRequestFilters } from "../layout.components";
import { useCreditApplicationRequestsQuery } from "../layout.components";
import {
	type ActionError,
	type CreditApplicationTableRow,
	type CreditApplicationRequestReviewDiff
} from "../layout.components";

export default function CreditApplicationManagementApproverPage() {
	const [reviewError, setReviewError] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [reviewDrawerState, setReviewDrawerState] = useState<{ row: CreditApplicationTableRow, diff: CreditApplicationRequestReviewDiff | null } | null>(null);
	const [isReviewDiffLoading, setIsReviewDiffLoading] = useState(false);
	const [reviewComment, setReviewComment] = useState<ReviewCommentRichText>(() => createEmptyReviewComment());
	const [detailRow, setDetailRow] = useState<CreditApplicationTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<CreditApplicationTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useCreditApplicationColumnPreferences();
	const queryState = useCreditApplicationManagementQueryState();
	const { getResolvedFilterColumnConfig } = useCreditApplicationFilterColumnConfig();
	const filters = useCreditApplicationRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useCreditApplicationRequestsQuery({
		queryScope: "approver",
		queryAction: creditApplicationActions.queryCreditApplicationsApproverAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});
	const renderCreditApplicationCell = useCreditApplicationCellRenderer({
		relations: queryResult.relations,
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
	const detailTriggerColumnId = getEligibleDetailTriggerCreditApplicationColumnId(columnPreferences.visibleColumns);

	const runMutation = (action: () => Promise<void>) => {
		startMutationTransition(() => {
			void (async () => {
				setReviewError(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["credit-application-management"] });
				} catch(error) {
					setReviewError(resolveActionError(error, "Failed to submit review."));
				}
			})();
		});
	};

	const openReviewDrawer = (row: CreditApplicationTableRow) => {
		setReviewComment(createEmptyReviewComment());
		setReviewError(null);
		setReviewDrawerState({ row, diff: null });
		setIsReviewDiffLoading(true);
		void (async () => {
			try {
				const diff = await creditApplicationActions.getCreditApplicationRequestReviewDiffAction(row.id);
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
			await creditApplicationActions.reviewCreditApplicationRequestAction({
				creditApplicationId: reviewDrawerState.row.id,
				decision,
				reviewComment
			});
			setReviewDrawerState(null);
			setReviewComment(createEmptyReviewComment());
		});
	};

	const rendercreditApplicationActions = (row: CreditApplicationTableRow) => {
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
				title="Credit Application Management"
				description="Review pending CreditApplication requests before publication."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search credit applications by name, email, or address"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<CreditApplicationRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<CreditApplicationColumnConfigCard
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

				<CreditApplicationActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderCreditApplicationCell={renderCreditApplicationCell}
					renderActions={rendercreditApplicationActions}
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

			<CreditApplicationRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={rendercreditApplicationActions}
				onOpenRequestChanges={setRequestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<CreditApplicationRequestReviewDrawer
				open={reviewDrawerState != null}
				onOpenChange={open => {
					if(!open) {
						setReviewDrawerState(null);
						setReviewError(null);
						setReviewComment(createEmptyReviewComment());
					}
				}}
				reviewDrawerState={reviewDrawerState}
				reviewError={reviewError}
				isReviewDiffLoading={isReviewDiffLoading}
				reviewComment={reviewComment}
				onReviewCommentChange={setReviewComment}
				onApprove={() => submitReview("approve")}
				onReject={() => submitReview("reject")}
				isMutating={isMutating}
				onOpenRequestChanges={setRequestChangeRow}
			/>

			<CreditApplicationRequestChangePreviewDrawer
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
