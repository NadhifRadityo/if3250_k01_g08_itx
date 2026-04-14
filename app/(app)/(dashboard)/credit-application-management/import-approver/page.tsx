"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertTitle, AlertDescription } from "@/components/radix/Alert";
import { Button } from "@/components/radix/Button";

import { DashboardManagementToolbar, DashboardManagementPageFrame, DashboardManagementPagination } from "../../layout.components";
import { EntrySummaryDrawer, useDashboardRelationNavigation } from "../../relation-navigation.components";
import * as importActions from "../import.actions";
import {
	resolveActionError,
	useCreditApplicationImportRelations,
	CreditApplicationImportRequestsTable,
	useCreditApplicationImportCellRenderer,
	CreditApplicationImportColumnConfigCard,
	useCreditApplicationImportRequestsQuery,
	CreditApplicationImportRequestFilterCard,
	useCreditApplicationImportRequestFilters,
	CreditApplicationImportRequestReviewDrawer,
	CreditApplicationImportActiveFiltersSummary,
	CreditApplicationImportRequestDetailsDrawer,
	useCreditApplicationImportColumnPreferences,
	useCreditApplicationImportFilterColumnConfig,
	useCreditApplicationImportManagementQueryState,
	getEligibleDetailTriggerCreditApplicationImportColumnId,
	type ActionError,
	type CreditApplicationImportTableRow
} from "../import.components";

export default function CreditApplicationImportApproverPage() {
	const [detailRow, setDetailRow] = useState<CreditApplicationImportTableRow | null>(null);
	const [reviewDrawerState, setReviewDrawerState] = useState<{ row: CreditApplicationImportTableRow } | null>(null);
	const [reviewReason, setReviewReason] = useState("");
	const [reviewError, setReviewError] = useState<ActionError | null>(null);
	const [pageError, setPageError] = useState<ActionError | null>(null);
	const [isMutating, startMutationTransition] = useTransition();

	const queryClient = useQueryClient();
	const relationNavigation = useDashboardRelationNavigation();
	const columnPreferences = useCreditApplicationImportColumnPreferences();
	const queryState = useCreditApplicationImportManagementQueryState();
	const { getResolvedFilterColumnConfig } = useCreditApplicationImportFilterColumnConfig();
	const filters = useCreditApplicationImportRequestFilters({ getResolvedFilterColumnConfig });

	const {
		pageIndex,
		setPageIndex,
		queryResult,
		isLoading,
		queryErrorMessage
	} = useCreditApplicationImportRequestsQuery({
		queryScope: "import-approver",
		queryAction: importActions.queryCreditApplicationImportApproverAction,
		debouncedKeyword: queryState.debouncedKeyword,
		sortTokens: queryState.sortTokens,
		appliedFilters: filters.appliedFilters,
		isFilterStateReady: filters.isFilterStateReady
	});

	const {
		relationValuesByRowId,
		isRelationLoading
	} = useCreditApplicationImportRelations({
		docs: queryResult.docs,
		visibleColumns: columnPreferences.visibleColumns
	});

	const renderCreditApplicationImportCell = useCreditApplicationImportCellRenderer({
		relationValuesByRowId,
		isRelationLoading,
		relationNavigation: {
			getHrefBase: relationNavigation.getTargetHrefBase,
			onRelationLinkClick: relationNavigation.onRelationLinkClick,
			onOpenSummary: relationNavigation.openSummary
		}
	});

	const detailTriggerColumnId = getEligibleDetailTriggerCreditApplicationImportColumnId(columnPreferences.visibleColumns);
	const displayError = pageError ?? (queryErrorMessage != null ? {
		title: "Error",
		message: queryErrorMessage
	} : null);

	const runMutation = (
		action: () => Promise<void>,
		options?: {
			onError?: (error: ActionError) => void;
			fallbackMessage?: string;
			clearPageError?: boolean;
		}
	) => {
		startMutationTransition(() => {
			void (async () => {
				if(options?.clearPageError ?? true)
					setPageError(null);
				try {
					await action();
					await queryClient.invalidateQueries({ queryKey: ["credit-application-management", "imports"] });
				} catch(error) {
					const actionError = resolveActionError(error, options?.fallbackMessage ?? "Operation failed.");
					if(options?.onError != null) {
						options.onError(actionError);
						return;
					}
					setPageError(actionError);
				}
			})();
		});
	};

	const submitReview = (decision: "approve" | "reject") => {
		if(reviewDrawerState == null)
			return;

		runMutation(async () => {
			await importActions.reviewCreditApplicationImportAction({
				importId: reviewDrawerState.row.id,
				decision,
				reason: reviewReason
			});
			setReviewDrawerState(null);
			setReviewReason("");
			setReviewError(null);
		}, {
			onError: setReviewError,
			fallbackMessage: "Failed to submit review.",
			clearPageError: false
		});
	};

	const renderCreditApplicationImportActions = (row: CreditApplicationImportTableRow) => {
		return (
			<Button
				type="button"
				size="sm"
				onClick={() => {
					setReviewReason("");
					setReviewError(null);
					setReviewDrawerState({ row });
				}}
				disabled={isMutating || row.reviewedAt != null}
			>
				<CheckIcon />
				Review
			</Button>
		);
	};

	return (
		<>
			<DashboardManagementPageFrame
				title="Credit Application Import"
				description="Approve or reject pending imports. Approval re-parses the uploaded file and publishes its rows into credit applications."
			>
				<DashboardManagementToolbar
					keyword={queryState.keyword}
					onKeywordChange={queryState.setKeyword}
					searchPlaceholder="Search pending imports by filename, id, or MIME type"
					filterCount={filters.appliedFilters.length}
					onToggleFilter={filters.toggleFilterPanel}
					onToggleColumns={() => columnPreferences.setIsColumnOpen(previous => !previous)}
					isLoading={isLoading}
					isMutating={isMutating}
				/>

				<CreditApplicationImportRequestFilterCard
					isLoading={isLoading}
					isMutating={isMutating}
					filters={filters}
					getResolvedFilterColumnConfig={getResolvedFilterColumnConfig}
				/>

				<CreditApplicationImportColumnConfigCard
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

				<CreditApplicationImportActiveFiltersSummary items={filters.filterSummaryItems} />

				{displayError != null ? (
					<Alert variant="destructive">
						<CircleAlertIcon />
						<AlertTitle>{displayError.title}</AlertTitle>
						<AlertDescription>{displayError.message}</AlertDescription>
					</Alert>
				) : null}

				<CreditApplicationImportRequestsTable
					queryResult={queryResult}
					visibleColumns={columnPreferences.visibleColumns}
					visibleColumnCount={columnPreferences.visibleColumns.length + 1}
					detailTriggerColumnId={detailTriggerColumnId}
					isLoading={isLoading}
					isMutating={isMutating}
					getSortDirection={queryState.getSortDirection}
					onToggleSortField={queryState.toggleSortField}
					onOpenDetails={setDetailRow}
					renderCreditApplicationImportCell={renderCreditApplicationImportCell}
					renderActions={renderCreditApplicationImportActions}
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

			<CreditApplicationImportRequestDetailsDrawer
				open={detailRow != null}
				onOpenChange={open => {
					if(!open)
						setDetailRow(null);
				}}
				row={detailRow}
				renderActions={renderCreditApplicationImportActions}
				relationNavigation={{
					getHrefBase: relationNavigation.getTargetHrefBase,
					onRelationLinkClick: relationNavigation.onRelationLinkClick,
					onOpenSummary: relationNavigation.openSummary
				}}
			/>

			<CreditApplicationImportRequestReviewDrawer
				open={reviewDrawerState != null}
				onOpenChange={open => {
					if(!open) {
						setReviewDrawerState(null);
						setReviewReason("");
						setReviewError(null);
					}
				}}
				reviewDrawerState={reviewDrawerState}
				reviewError={reviewError}
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
