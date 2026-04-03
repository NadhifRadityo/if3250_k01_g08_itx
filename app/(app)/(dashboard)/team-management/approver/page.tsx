"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as teamActions from "../layout.actions";
import { TeamActiveFiltersSummary } from "../layout.components";
import { TeamColumnConfigCard } from "../layout.components";
import { TeamRequestFilterCard } from "../layout.components";
import { TeamRequestReviewDrawer } from "../layout.components";
import { TeamRequestsTable } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useTeamCellRenderer } from "../layout.components";
import { useTeamColumnPreferences } from "../layout.components";
import { useTeamFilterColumnConfig } from "../layout.components";
import { useTeamManagementQueryState } from "../layout.components";
import { useTeamRelations } from "../layout.components";
import { useTeamRequestFilters } from "../layout.components";
import { useTeamRequestsQuery } from "../layout.components";
import {
	type ActionError,
	type TeamTableRow,
	type TeamRequestReviewDiff
} from "../layout.components";

export default function TeamManagementApproverPage() {
	const [reviewError, setReviewError] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [reviewDrawerState, setReviewDrawerState] = useState<{ row: TeamTableRow, diff: TeamRequestReviewDiff | null } | null>(null);
	const [isReviewDiffLoading, setIsReviewDiffLoading] = useState(false);
	const [reviewReason, setReviewReason] = useState("");
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useTeamColumnPreferences();
	const queryState = useTeamManagementQueryState();
	const { getResolvedFilterColumnConfig } = useTeamFilterColumnConfig();
	const filters = useTeamRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useTeamRequestsQuery({
		queryScope: "approver",
		queryAction: teamActions.queryTeamsApproverAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useTeamRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderTeamCell = useTeamCellRenderer({
		relationValuesByRowId,
		isRelationLoading,
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

	const runMutation = (action: () => Promise<void>) => {
		startMutationTransition(() => {
			void (async () => {
				setReviewError(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["team-management"] });
				} catch(error) {
					setReviewError(resolveActionError(error, "Failed to submit review."));
				}
			})();
		});
	};

	const openReviewDrawer = (row: TeamTableRow) => {
		setReviewReason("");
		setReviewError(null);
		setReviewDrawerState({ row, diff: null });
		setIsReviewDiffLoading(true);
		void (async () => {
			try {
				const diff = await teamActions.getTeamRequestReviewDiffAction(row.id);
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
			await teamActions.reviewTeamRequestAction({
				teamId: reviewDrawerState.row.id,
				decision,
				reason: reviewReason
			});
			setReviewDrawerState(null);
			setReviewReason("");
		});
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Team Management"
				description="Review pending team structure requests before syncing into teams collection."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search teams by team name, supervisor, or officer"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<TeamRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<TeamColumnConfigCard
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

				<TeamActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<TeamRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					renderTeamCell={renderTeamCell}
					renderActions={row => {
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
					}}
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

			<TeamRequestReviewDrawer
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
			/>

			{renderTeamCell.relationSummaryPickerDrawer}

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
