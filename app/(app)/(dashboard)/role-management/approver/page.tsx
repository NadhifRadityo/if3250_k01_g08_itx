"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as roleActions from "../layout.actions";
import { RoleActiveFiltersSummary } from "../layout.components";
import { RoleColumnConfigCard } from "../layout.components";
import { RoleRequestDetailsDrawer } from "../layout.components";
import { RoleRequestFilterCard } from "../layout.components";
import { RoleRequestReviewDrawer } from "../layout.components";
import { RoleRequestsTable } from "../layout.components";
import { getEligibleDetailTriggerRoleColumnId } from "../layout.components";
import { resolveActionError } from "../layout.components";
import { useRoleCellRenderer } from "../layout.components";
import { useRoleColumnPreferences } from "../layout.components";
import { useRoleFilterColumnConfig } from "../layout.components";
import { useRoleManagementQueryState } from "../layout.components";
import { useRoleRelations } from "../layout.components";
import { useRoleRequestFilters } from "../layout.components";
import { useRoleRequestsQuery } from "../layout.components";
import {
	type ActionError,
	type RoleTableRow,
	type RoleRequestReviewDiff
} from "../layout.components";

export default function RoleManagementApproverPage() {
	const [reviewError, setReviewError] = useState<ActionError | null>(null);
	const queryClient = useQueryClient();

	const [reviewDrawerState, setReviewDrawerState] = useState<{ row: RoleTableRow, diff: RoleRequestReviewDiff | null } | null>(null);
	const [isReviewDiffLoading, setIsReviewDiffLoading] = useState(false);
	const [reviewReason, setReviewReason] = useState("");
	const [detailRow, setDetailRow] = useState<RoleTableRow | null>(null);
	const [isMutating, startMutationTransition] = useTransition();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useRoleColumnPreferences();
	const queryState = useRoleManagementQueryState();
	const { getResolvedFilterColumnConfig } = useRoleFilterColumnConfig();
	const filters = useRoleRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useRoleRequestsQuery({
		queryScope: "approver",
		queryAction: roleActions.queryRolesApproverAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady,
		includeSoftDeleted: false
	});
	const {
		relationValuesByRowId,
		isRelationLoading
	} = useRoleRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});
	const renderRoleCell = useRoleCellRenderer({
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
	const detailTriggerColumnId = getEligibleDetailTriggerRoleColumnId(columnPreferences.visibleColumns);

	const runMutation = (action: () => Promise<void>) => {
		startMutationTransition(() => {
			void (async () => {
				setReviewError(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["role-management"] });
				} catch(error) {
					setReviewError(resolveActionError(error, "Failed to submit review."));
				}
			})();
		});
	};

	const openReviewDrawer = (row: RoleTableRow) => {
		setReviewReason("");
		setReviewError(null);
		setReviewDrawerState({ row, diff: null });
		setIsReviewDiffLoading(true);
		void (async () => {
			try {
				const diff = await roleActions.getRoleRequestReviewDiffAction(row.id);
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
			await roleActions.reviewRoleRequestAction({
				roleId: reviewDrawerState.row.id,
				decision,
				reason: reviewReason
			});
			setReviewDrawerState(null);
			setReviewReason("");
		});
	};

	const renderRoleActions = (row: RoleTableRow) => {
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
				title="Role Management"
				description="Review pending role requests before publication."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search roles by name, level, or menu"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<RoleRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<RoleColumnConfigCard
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

				<RoleActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<RoleRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderRoleCell={renderRoleCell}
					renderActions={renderRoleActions}
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

			<RoleRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderRoleActions}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<RoleRequestReviewDrawer
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

			<EntrySummaryDrawer {...relationNavigation.summaryDrawerProps} />
		</>
	);
}
