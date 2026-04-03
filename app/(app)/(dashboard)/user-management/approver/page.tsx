"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import * as userActions from "../layout.actions";
import { UserActiveFiltersSummary } from "../layout.components";
import { UserColumnConfigCard } from "../layout.components";
import { UserRequestFilterCard } from "../layout.components";
import { UserRequestReviewDrawer } from "../layout.components";
import { UserRequestsTable } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useUserCellRenderer } from "../layout.components";
import { useUserColumnPreferences } from "../layout.components";
import { useUserFilterColumnConfig } from "../layout.components";
import { useUserManagementQueryState } from "../layout.components";
import { useUserRelations } from "../layout.components";
import { useUserRequestFilters } from "../layout.components";
import { useUserRequestsQuery } from "../layout.components";
import {
	type ActionError,
	type StagedUserTableRow,
	type UserRequestReviewDiff
} from "../layout.components";

export default function UserManagementApproverPage() {
	const [reviewError, setReviewError] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [reviewDrawerState, setReviewDrawerState] = useState<{ row: StagedUserTableRow, diff: UserRequestReviewDiff | null } | null>(null);
	const [isReviewDiffLoading, setIsReviewDiffLoading] = useState(false);
	const [reviewReason, setReviewReason] = useState("");
	const [isMutating, startMutationTransition] = useTransition();
	const columnPreferences = useUserColumnPreferences();
	const queryState = useUserManagementQueryState();
	const { getResolvedFilterColumnConfig } = useUserFilterColumnConfig();
	const filters = useUserRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useUserRequestsQuery({
		queryScope: "approver",
		queryAction: userActions.queryStagedUsersApproverAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		includeSoftDeleted: false
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useUserRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderUserCell = useUserCellRenderer({ relationValuesByRowId, isRelationLoading });
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
					await queryClient.invalidateQueries({ queryKey: ["user-management"] });
				} catch(error) {
					setReviewError(resolveActionError(error, "Failed to submit review."));
				}
			})();
		});
	};

	const openReviewDrawer = (row: StagedUserTableRow) => {
		setReviewReason("");
		setReviewError(null);
		setReviewDrawerState({ row, diff: null });
		setIsReviewDiffLoading(true);
		void (async () => {
			try {
				const diff = await userActions.getStagedUserRequestReviewDiffAction(row.id);
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
			await userActions.reviewStagedUserRequestAction({
				stagedUserId: reviewDrawerState.row.id,
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
				title="User Management"
				description="Review pending staged user requests before syncing into users collection."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search staged users by name, email, or employee ID"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<UserRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<UserColumnConfigCard
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

				<UserActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<UserRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					renderUserCell={renderUserCell}
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

			<UserRequestReviewDrawer
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
		</>
	);
}
