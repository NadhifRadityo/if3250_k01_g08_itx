"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { createEmptyReviewComment, type ReviewCommentRichText } from "@/utils/reviewCommentRichText";
import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as surveyActions from "../layout.actions";
import { SurveyActiveFiltersSummary } from "../layout.components";
import { SurveyColumnConfigCard } from "../layout.components";
import { SurveyRequestDetailsDrawer } from "../layout.components";
import { SurveyRequestChangePreviewDrawer } from "../layout.components";
import { SurveyRequestFilterCard } from "../layout.components";
import { SurveyRequestReviewDrawer } from "../layout.components";
import { SurveyRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerSurveyColumnId } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useSurveyCellRenderer } from "../layout.components";
import { useSurveyColumnPreferences } from "../layout.components";
import { useSurveyFilterColumnConfig } from "../layout.components";
import { useSurveyManagementQueryState } from "../layout.components";
import { useSurveyRequestFilters } from "../layout.components";
import { useSurveyRequestsQuery } from "../layout.components";
import {
	type ActionError,
	type SurveyTableRow,
	type SurveyRequestReviewDiff
} from "../layout.components";

export default function SurveyManagementApproverPage() {
	const [reviewError, setReviewError] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [reviewDrawerState, setReviewDrawerState] = useState<{ row: SurveyTableRow, diff: SurveyRequestReviewDiff | null } | null>(null);
	const [isReviewDiffLoading, setIsReviewDiffLoading] = useState(false);
	const [reviewComment, setReviewComment] = useState<ReviewCommentRichText>(() => createEmptyReviewComment());
	const [detailRow, setDetailRow] = useState<SurveyTableRow | null>(null);
	const [requestChangeRow, setRequestChangeRow] = useState<SurveyTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useSurveyColumnPreferences();
	const queryState = useSurveyManagementQueryState();
	const { getResolvedFilterColumnConfig } = useSurveyFilterColumnConfig();
	const filters = useSurveyRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useSurveyRequestsQuery({
		queryScope: "approver",
		queryAction: surveyActions.querySurveysApproverAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});
	const renderSurveyCell = useSurveyCellRenderer({
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
	const detailTriggerColumnId = getEligibleDetailTriggerSurveyColumnId(columnPreferences.visibleColumns);

	const runMutation = (action: () => Promise<void>) => {
		startMutationTransition(() => {
			void (async () => {
				setReviewError(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["survey-management"] });
				} catch(error) {
					setReviewError(resolveActionError(error, "Failed to submit review."));
				}
			})();
		});
	};

	const openReviewDrawer = (row: SurveyTableRow) => {
		setReviewComment(createEmptyReviewComment());
		setReviewError(null);
		setReviewDrawerState({ row, diff: null });
		setIsReviewDiffLoading(true);
		void (async () => {
			try {
				const diff = await surveyActions.getSurveyRequestReviewDiffAction(row.id);
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
			await surveyActions.reviewSurveyRequestAction({
				surveyId: reviewDrawerState.row.id,
				decision,
				reviewComment
			});
			setReviewDrawerState(null);
			setReviewComment(createEmptyReviewComment());
		});
	};

	const renderSurveyActions = (row: SurveyTableRow) => {
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
				title="Survey Management"
				description="Review pending survey requests before publication."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search surveys by title or ID"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<SurveyRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<SurveyColumnConfigCard
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

				<SurveyActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<SurveyRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderSurveyCell={renderSurveyCell}
					renderActions={renderSurveyActions}
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

			<SurveyRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderSurveyActions}
				onOpenRequestChanges={setRequestChangeRow}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<SurveyRequestReviewDrawer
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

			<SurveyRequestChangePreviewDrawer
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
